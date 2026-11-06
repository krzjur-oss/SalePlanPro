/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Pamięci IndexedDB i Adapter Kryptograficzny (dbStorage)
 * 
 * Zapewnia nielimitowaną pamięć lokalną offline dla dużych szkół, migawek
 * oraz rozbudowanych planów bez ograniczenia 5 MB pamięci localStorage.
 * 
 * Funkcjonalności:
 * - Natywny asynchroniczny silnik IndexedDB oparty na Promises (brak zewnętrznych zależności)
 * - Automatyczna i bezstratna migracja danych z localStorage przy pierwszym uruchomieniu
 * - Szybkie szyfrowanie AES-256 GCM (format 'encrypted-v2' z 600 000 iteracji PBKDF2)
 * - Niewyodrębnialny sesyjny klucz CryptoKey w pamięci RAM (brak narzutu PBKDF2 przy zapisie)
 * - Pełna zgodność wsteczna z ładunkami 'encrypted-v1' i automatyczna migracja do v2
 * - Kopia zapasowa przed szyfrowaniem (pre-encryption backup) i automatyczny rollback
 * - Brak zapisywania haseł w sessionStorage
 * - Detekcja limitu pamięci za pomocą navigator.storage.estimate()
 */

const DB_NAME = 'SalePlanProDB';
const DB_VERSION = 1;
export const STORE_NAME = 'app_data';

import { 
  encryptText, 
  decryptText, 
  isEncryptedBackup, 
  getSessionPassword, 
  setSessionPassword, 
  isDatabaseEncryptionActive, 
  setupStorageEncryptionMeta, 
  removeStorageEncryptionMeta,
  verifyMasterPassword,
  STORAGE_ENC_META_KEY,
  getSessionCryptoKey,
  setSessionCryptoKey,
  deriveCryptoKeyFromPassword,
  encryptWithKey,
  decryptWithKey,
  base64ToArrayBuffer,
  getAutoLockMinutes,
  setAutoLockMinutes,
  lockSession,
  getStorageEncryptionMeta,
  PBKDF2_ITERATIONS_V1,
  PBKDF2_ITERATIONS_V2
} from '../lib/crypto';
import { getStorageSchemaForKey, getStorageItemSchemaForKey } from '../utils/validationSchemas';

export { 
  isDatabaseEncryptionActive,
  isDatabaseEncryptionActive as isStorageEncryptedOnDisk,
  isSessionUnlocked,
  verifyMasterPassword as verifyStoragePassword,
  setSessionPassword as setSessionStoragePassword,
  getSessionPassword,
  removeStorageEncryptionMeta,
  setupStorageEncryptionMeta,
  getAutoLockMinutes,
  setAutoLockMinutes,
  lockSession
} from '../lib/crypto';

// Znane klucze pamięci podręcznej programu
export const STORAGE_KEYS = {
  APP_STATE: 'saleplan_v3_app_state',
  SCHED_DATA: 'saleplan_v3_sched_data',
  STATE_META: 'saleplan_v3_state_meta',
  ARCHIVE: 'saleplan_v3_archive',
  SNAPSHOTS: 'saleplan_v3_snapshots',
  AUTOSAVE_VERSIONS: 'saleplan_v3_autosave_versions',
  HISTORY_LOGS: 'saleplan_v3_history_logs',
  ERROR_LOGS: 'saleplan_v3_error_logs',
  LAST_SEEN_VERSION: 'saleplan_last_seen_version',
  TERMS_ACCEPTED: 'saleplan_terms_accepted_v1',
  MIGRATION_DONE: 'saleplan_indexeddb_migrated_v1',
  STRUCTURE_TEMPLATES: 'saleplan_v3_structure_templates',
  PLAN_VARIANTS: 'saleplan_v3_plan_variants',
  ACTIVE_VARIANT_ID: 'saleplan_v3_active_variant_id',
  STORAGE_ENC_META: STORAGE_ENC_META_KEY,
  PRE_ENCRYPTION_BACKUP: 'saleplan_pre_encryption_backup',
  PENDING_CHANGES_BACKUP: 'saleplan_v3_pending_changes_backup',
  DAILY_SUBSTITUTIONS: 'saleplan_v3_daily_substitutions',
} as const;

export const UNENCRYPTED_STORAGE_KEYS = [
  STORAGE_KEYS.STORAGE_ENC_META,
  STORAGE_KEYS.MIGRATION_DONE,
  STORAGE_KEYS.LAST_SEEN_VERSION,
  STORAGE_KEYS.TERMS_ACCEPTED,
  STORAGE_KEYS.PRE_ENCRYPTION_BACKUP,
] as const;

export const ENCRYPTED_KEYS: readonly string[] = (Object.values(STORAGE_KEYS) as string[]).filter(
  (k) => !(UNENCRYPTED_STORAGE_KEYS as readonly string[]).includes(k)
);

export function isKeyEncrypted(key: string): boolean {
  return ENCRYPTED_KEYS.includes(key) || key.includes('_recovery_backup_') || key.startsWith('autosave_');
}

/**
 * Checks if a SchedData record contains legacy or extraneous meta fields (revision, tabId, _revision, _tabId).
 */
export function hasSchedDataMeta(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return 'revision' in data || 'tabId' in data || '_revision' in data || '_tabId' in data;
}

/**
 * Strips revision, tabId, _revision, _tabId from the top level of SchedData.
 * Guarantees SchedData passes strict SchedDataSchema validation without rejection.
 */
export function cleanSchedDataMeta<T = unknown>(data: T, key?: string): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  const isSched = !key || key === STORAGE_KEYS.SCHED_DATA || key === 'saleplan_v3_sched_data';
  if (!isSched) {
    return data;
  }

  const obj = data as Record<string, unknown>;
  if ('revision' in obj || 'tabId' in obj || '_revision' in obj || '_tabId' in obj) {
    const cleaned: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      if (k !== 'revision' && k !== 'tabId' && k !== '_revision' && k !== '_tabId') {
        cleaned[k] = obj[k];
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Synchronous mirror write to localStorage for fast initial render and unload resilience.
 * - Prohibits plaintext writes if database encryption is active.
 * - Strips revision/metadata if key is SchedData.
 * - Enforces the < 2.5 MB maximum payload size threshold.
 * 
 * @returns true if written to localStorage, false if skipped or rejected.
 */
export function writeSyncMirror(key: string, value: unknown): boolean {
  if (isDatabaseEncryptionActive()) {
    return false;
  }
  try {
    const cleaned = cleanSchedDataMeta(value, key);
    const serialized = typeof cleaned === 'string' ? cleaned : JSON.stringify(cleaned);
    if (serialized.length < 2.5 * 1024 * 1024) {
      localStorage.setItem(key, serialized);
      return true;
    } else {
      console.info(`Pominięto lustro localStorage dla "${key}" ze względu na rozmiar (${serialized.length} B >= 2.5 MB).`);
      return false;
    }
  } catch (err) {
    console.warn(`Błąd synchronicznego zapisu lustra localStorage dla "${key}":`, err);
    return false;
  }
}

function isEncryptedObject(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ((obj.type === 'encrypted-v1' || obj.type === 'encrypted-v2') && !!obj.ciphertext) {
      return true;
    }
  }
  if (typeof val === 'string' && (val.includes('"type":"encrypted-v1"') || val.includes('"type":"encrypted-v2"'))) {
    try {
      const p = JSON.parse(val);
      return p && (p.type === 'encrypted-v1' || p.type === 'encrypted-v2') && !!p.ciphertext;
    } catch {
      return false;
    }
  }
  return false;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let isIndexedDBAvailable = true;
let consecutiveIdbErrors = 0;
const MAX_CONSECUTIVE_IDB_ERRORS = 3;

/**
 * Reset error counters and re-allow IndexedDB connection attempt
 */
export function resetIdbErrorCounter(): void {
  consecutiveIdbErrors = 0;
  isIndexedDBAvailable = true;
  dbPromise = null;
}

export function getIsIndexedDBAvailable(): boolean {
  return isIndexedDBAvailable;
}

export function getConsecutiveIdbErrors(): number {
  return consecutiveIdbErrors;
}

/**
 * Open or initialize the IndexedDB database
 */
export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  if (typeof window === 'undefined' || !window.indexedDB) {
    isIndexedDBAvailable = false;
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        consecutiveIdbErrors = 0;
        isIndexedDBAvailable = true;
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        consecutiveIdbErrors++;
        dbPromise = null;
        if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
          console.warn('IndexedDB open request error (repeated), falling back to localStorage:', event);
          isIndexedDBAvailable = false;
        } else {
          console.warn(`IndexedDB open attempt failed (próba ${consecutiveIdbErrors}/${MAX_CONSECUTIVE_IDB_ERRORS}):`, event);
        }
        reject((event?.target as IDBOpenDBRequest)?.error || new Error('Nie udało się otworzyć bazy IndexedDB'));
      };
    } catch (err) {
      consecutiveIdbErrors++;
      dbPromise = null;
      if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
        console.warn('IndexedDB initialization failed (repeated):', err);
        isIndexedDBAvailable = false;
      }
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Internal raw read without decryption (used for rollback, migration, and raw checks)
 */
export async function getRawItem<T = unknown>(key: string): Promise<T | null> {
  if (isIndexedDBAvailable) {
    try {
      const db = await getDB();
      const dbResult = await new Promise<unknown>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      if (dbResult !== null) return dbResult as T;
    } catch {}
  }

  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Internal raw write without encryption (used for rollback, pre-encryption backups, and metadata)
 */
async function setRawItem(key: string, value: unknown): Promise<void> {
  if (isIndexedDBAvailable) {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);
          req.onsuccess = () => {
            consecutiveIdbErrors = 0;
            resolve();
          };
          req.onerror = () => {
            consecutiveIdbErrors++;
            dbPromise = null;
            if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
              isIndexedDBAvailable = false;
            }
            reject(req.error);
          };
        } catch (err) {
          consecutiveIdbErrors++;
          dbPromise = null;
          if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
            isIndexedDBAvailable = false;
          }
          reject(err);
        }
      });
    } catch {
      // Nie wyłączaj trwale IndexedDB po pojedynczym błędzie
    }
  }

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch {}
}

/**
 * Raw remove item from both IndexedDB and localStorage
 */
export async function removeRawItem(key: string): Promise<void> {
  if (isIndexedDBAvailable) {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => {
            consecutiveIdbErrors = 0;
            resolve();
          };
          req.onerror = () => {
            consecutiveIdbErrors++;
            dbPromise = null;
            if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
              isIndexedDBAvailable = false;
            }
            reject(req.error);
          };
        } catch (err) {
          consecutiveIdbErrors++;
          dbPromise = null;
          if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
            isIndexedDBAvailable = false;
          }
          reject(err);
        }
      });
    } catch {}
  }

  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Internal helper to retrieve all key names from IndexedDB and localStorage
 */
export async function getAllStorageKeys(): Promise<string[]> {
  const keysSet = new Set<string>();

  // 1. IndexedDB keys
  if (isIndexedDBAvailable) {
    try {
      const db = await getDB();
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAllKeys();
          req.onsuccess = () => {
            if (Array.isArray(req.result)) {
              for (const k of req.result) {
                keysSet.add(String(k));
              }
            }
            resolve();
          };
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    } catch {}
  }

  // 2. localStorage keys
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          keysSet.add(k);
        }
      }
    }
  } catch {}

  return Array.from(keysSet);
}

export const MAX_RECOVERY_BACKUPS = 3;

/**
 * Extracts numeric timestamp from a recovery backup key:
 * e.g. "saleplan_v3_snapshots_recovery_backup_1793824146325" -> 1793824146325
 */
export function getBackupTimestamp(key: string): number {
  const match = key.match(/_recovery_backup_(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * Prunes recovery backup keys so that at most MAX_RECOVERY_BACKUPS (3) copies exist per key.
 * Older backups are removed from both IndexedDB and localStorage.
 */
export async function pruneRecoveryBackups(baseKey?: string): Promise<void> {
  try {
    const allKeys = await getAllStorageKeys();
    const backupKeys = allKeys.filter(k => k.includes('_recovery_backup_'));

    // Group backup keys by baseKey prefix
    const groups = new Map<string, string[]>();
    for (const k of backupKeys) {
      const idx = k.indexOf('_recovery_backup_');
      const prefix = k.substring(0, idx);
      if (baseKey && prefix !== baseKey) {
        continue;
      }
      const list = groups.get(prefix) || [];
      list.push(k);
      groups.set(prefix, list);
    }

    for (const [, keys] of groups) {
      if (keys.length > MAX_RECOVERY_BACKUPS) {
        // Sort ascending: oldest timestamp first
        keys.sort((a, b) => {
          const tA = getBackupTimestamp(a);
          const tB = getBackupTimestamp(b);
          if (tA !== tB) return tA - tB;
          return a.localeCompare(b);
        });

        const excessCount = keys.length - MAX_RECOVERY_BACKUPS;
        const keysToDelete = keys.slice(0, excessCount);

        for (const k of keysToDelete) {
          await removeRawItem(k);
        }
      }
    }
  } catch (err) {
    console.warn('Błąd podczas czyszczenia starych kopii ratunkowych:', err);
  }
}

let lastBackupTimestamp = 0;

/**
 * Persists recovery backup data and enforces maximum 3 backup copies for the key.
 * Returns the generated backupKey.
 */
export async function saveRecoveryBackup(key: string, data: unknown): Promise<string> {
  let timestamp = Date.now();
  if (timestamp <= lastBackupTimestamp) {
    timestamp = lastBackupTimestamp + 1;
  }
  lastBackupTimestamp = timestamp;

  const backupKey = `${key}_recovery_backup_${timestamp}`;
  await setRawItem(backupKey, data);
  await pruneRecoveryBackups(key);
  return backupKey;
}

/**
 * Returns all keys managed by SalePlan Pro:
 * - All standard ENCRYPTED_KEYS
 * - Any dynamically generated recovery backup keys (*_recovery_backup_*)
 */
export async function listManagedKeys(): Promise<string[]> {
  await pruneRecoveryBackups();
  const managedSet = new Set<string>(ENCRYPTED_KEYS);

  try {
    const allKeys = await getAllStorageKeys();
    for (const k of allKeys) {
      if (k.includes('_recovery_backup_') || k.startsWith('autosave_')) {
        managedSet.add(k);
      }
    }
  } catch {}

  return Array.from(managedSet);
}

/**
 * Helper to process retrieved raw value, handling transparent AES-GCM decryption if encrypted.
 * - Uses in-memory CryptoKey for 'encrypted-v2' (sub-millisecond instant decryption)
 * - Seamlessly decrypts 'encrypted-v1' payloads (100,000 iterations)
 * - Auto-migrates decrypted v1 items to 'encrypted-v2' once session is unlocked
 */
async function processRetrievedValue<T>(rawVal: unknown, key?: string): Promise<T | null> {
  if (rawVal === null || rawVal === undefined) return null;

  if (isEncryptedObject(rawVal)) {
    const payload = (typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal) as {
      type?: string;
      ciphertext?: string;
      iv?: string;
      salt?: string;
      iterations?: number;
    };

    let sessionKey = getSessionCryptoKey();
    const pwd = getSessionPassword();

    if (!sessionKey && !pwd) {
      // Baza danych jest zaszyfrowana, a sesja zablokowana
      return null;
    }

    try {
      let decryptedStr = '';

      if (payload.type === 'encrypted-v2') {
        if (!sessionKey && pwd) {
          const meta = getStorageEncryptionMeta();
          const salt = base64ToArrayBuffer(payload.salt || meta?.salt || '');
          const iterations = payload.iterations || meta?.iterations || PBKDF2_ITERATIONS_V2;
          sessionKey = await deriveCryptoKeyFromPassword(pwd, salt, iterations);
          setSessionCryptoKey(sessionKey);
        }

        if (sessionKey && payload.iv && payload.ciphertext) {
          decryptedStr = await decryptWithKey(payload.iv, payload.ciphertext, sessionKey);
        } else if (pwd) {
          decryptedStr = await decryptText(JSON.stringify(payload), pwd);
        }
      } else if (payload.type === 'encrypted-v1') {
        // Starszy ładunek formatu v1 (100 000 iteracji)
        if (!pwd) {
          return null;
        }
        decryptedStr = await decryptText(JSON.stringify(payload), pwd);

        // Automatyczna migracja wpisu v1 do formatu encrypted-v2
        if (key && (sessionKey || pwd)) {
          try {
            const parsedData = JSON.parse(decryptedStr);
            setTimeout(() => {
              setStorageItem(key, parsedData).catch(err => {
                console.warn(`[SalePlan Pro] Auto-migration of key "${key}" to encrypted-v2:`, err);
              });
            }, 50);
          } catch {}
        }
      }

      let parsed = JSON.parse(decryptedStr);
      if (key === STORAGE_KEYS.SCHED_DATA && hasSchedDataMeta(parsed)) {
        parsed = cleanSchedDataMeta(parsed, key);
        setTimeout(() => {
          setStorageItem(STORAGE_KEYS.SCHED_DATA, parsed).catch(() => {});
        }, 20);
      }
      return parsed as T;
    } catch (e) {
      console.warn('Failed to decrypt storage item:', e);
      return null;
    }
  }

  return rawVal as T;
}

let blockedWrites: Record<string, boolean> = {};

export function isWriteBlocked(key: string): boolean {
  return !!blockedWrites[key];
}

export function setWriteBlocked(key: string, blocked: boolean): void {
  if (blocked) {
    blockedWrites[key] = true;
  } else {
    delete blockedWrites[key];
  }
}

export function getBlockedWrites(): Record<string, boolean> {
  return { ...blockedWrites };
}

export function clearBlockedWrites(): void {
  blockedWrites = {};
}

export class StorageWriteBlockedError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(`Zapis klucza "${key}" jest zablokowany z powodu wykrycia uszkodzonych danych.`);
    this.name = 'StorageWriteBlockedError';
    this.key = key;
  }
}

export type StorageReadResult<T = unknown> =
  | { status: 'missing'; data: null }
  | { status: 'found'; data: T; quarantinedCount?: number; backupKey?: string }
  | { status: 'corrupted'; rawContent: unknown; error: unknown; backupKey?: string };

/**
 * Detailed read from storage distinguishing between:
 * - 'missing': Key does not exist in IndexedDB or localStorage
 * - 'found': Key exists and data passed integrity/validation
 * - 'corrupted': Key exists, but data could not be decrypted, parsed, or failed Zod validation
 *
 * For array keys (SNAPSHOTS, ARCHIVE, AUTOSAVE_VERSIONS, PLAN_VARIANTS), validates element-by-element:
 * discards bad entries, saves them to a recovery backup, and returns valid entries.
 */
export async function getStorageItemDetailed<T = unknown>(key: string): Promise<StorageReadResult<T>> {
  let rawResult: unknown = undefined;
  let keyFound = false;

  if (isIndexedDBAvailable) {
    try {
      const db = await getDB();
      const idbResult = await new Promise<{ found: boolean; value: unknown }>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            if (req.result !== undefined && req.result !== null) {
              resolve({ found: true, value: req.result });
            } else {
              resolve({ found: false, value: undefined });
            }
          };
          req.onerror = () => resolve({ found: false, value: undefined });
        } catch {
          resolve({ found: false, value: undefined });
        }
      });

      if (idbResult.found) {
        keyFound = true;
        rawResult = idbResult.value;
      }
    } catch {
      // IndexedDB connection error, fall through to localStorage
    }
  }

  if (!keyFound) {
    try {
      const localVal = localStorage.getItem(key);
      if (localVal !== null) {
        keyFound = true;
        try {
          rawResult = JSON.parse(localVal);
        } catch {
          rawResult = localVal;
        }
      }
    } catch {}
  }

  // 1. Brak klucza w IndexedDB i localStorage
  if (!keyFound) {
    return { status: 'missing', data: null };
  }

  // 2. Obsługa bazy zaszyfrowanej
  if (isEncryptedObject(rawResult)) {
    const sessionKey = getSessionCryptoKey();
    const pwd = getSessionPassword();
    if (!sessionKey && !pwd) {
      // Baza jest zaszyfrowana, a sesja zablokowana – nie oznaczaj jako uszkodzenie
      return { status: 'missing', data: null };
    }
  }

  let val: unknown;
  try {
    val = await processRetrievedValue<T>(rawResult, key);
  } catch (decryptErr) {
    const backupKey = await saveRecoveryBackup(key, rawResult);
    setWriteBlocked(key, true);
    return {
      status: 'corrupted',
      rawContent: rawResult,
      error: decryptErr,
      backupKey
    };
  }

  if (val === null || val === undefined) {
    const backupKey = await saveRecoveryBackup(key, rawResult);
    setWriteBlocked(key, true);
    return {
      status: 'corrupted',
      rawContent: rawResult,
      error: new Error(`Nie udało się przetworzyć danych dla klucza "${key}"`),
      backupKey
    };
  }

  // Sanityzacja wsteczna dla SCHED_DATA
  if (key === STORAGE_KEYS.SCHED_DATA && hasSchedDataMeta(val)) {
    val = cleanSchedDataMeta(val, key);
    try {
      await setRawItem(key, val);
    } catch {}
  }

  // 3. Walidacja element po elemencie dla tablic (SNAPSHOTS, ARCHIVE, AUTOSAVE_VERSIONS, PLAN_VARIANTS)
  const itemSchema = getStorageItemSchemaForKey(key);
  if (itemSchema) {
    if (!Array.isArray(val)) {
      const backupKey = await saveRecoveryBackup(key, val);
      setWriteBlocked(key, true);
      return {
        status: 'corrupted',
        rawContent: val,
        error: new Error(`Klucz "${key}" powinien zawierać tablicę, znaleziono ${typeof val}`),
        backupKey
      };
    }

    const validItems: unknown[] = [];
    const invalidItems: unknown[] = [];

    for (const item of val) {
      const check = itemSchema.safeParse(item);
      if (check.success) {
        validItems.push(check.data);
      } else {
        invalidItems.push(item);
      }
    }

    let backupKey: string | undefined;
    if (invalidItems.length > 0) {
      backupKey = await saveRecoveryBackup(key, invalidItems);
      console.warn(`[dbStorage] Wykryto ${invalidItems.length} uszkodzonych elementów w kluczu "${key}". Zapisano kopię ratunkową w "${backupKey}".`);
    }

    if (val.length > 0 && validItems.length === 0) {
      // Tablica zawierała elementy, ale żaden nie spełnił schematu Zod
      setWriteBlocked(key, true);
      return {
        status: 'corrupted',
        rawContent: val,
        error: new Error(`Wszystkie wpisy w tablicy dla klucza "${key}" są uszkodzone.`),
        backupKey
      };
    }

    return {
      status: 'found',
      data: validItems as T,
      quarantinedCount: invalidItems.length,
      backupKey
    };
  }

  // 4. Walidacja Zod dla obiektów i pozostałych kluczy
  const schema = getStorageSchemaForKey(key);
  if (schema) {
    const parsed = schema.safeParse(val);
    if (!parsed.success) {
      const backupKey = await saveRecoveryBackup(key, val);
      setWriteBlocked(key, true);
      console.warn(`[dbStorage] Błąd walidacji danych ze storage dla klucza "${key}":`, parsed.error.issues);
      return {
        status: 'corrupted',
        rawContent: val,
        error: parsed.error,
        backupKey
      };
    }
    return {
      status: 'found',
      data: parsed.data as T
    };
  }

  return {
    status: 'found',
    data: val as T
  };
}

/**
 * Get an item from storage (tries IndexedDB first, falls back to localStorage or in-memory)
 */
export async function getStorageItem<T = unknown>(key: string): Promise<T | null> {
  const result = await getStorageItemDetailed<T>(key);
  if (result.status === 'found') {
    return result.data;
  }
  return null;
}

/**
 * Synchronous read fallback for initial React render (reads from localStorage or returns null).
 * Returns null if the stored value is encrypted and requires async decryption.
 */
export function getStorageItemSync<T = unknown>(key: string): T | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      if (val.includes('"type":"encrypted-v1"') || val.includes('"type":"encrypted-v2"') || isEncryptedObject(val)) {
        return null;
      }
      try {
        let parsed = JSON.parse(val);
        if (key === STORAGE_KEYS.SCHED_DATA && hasSchedDataMeta(parsed)) {
          parsed = cleanSchedDataMeta(parsed, key);
          try {
            localStorage.setItem(key, JSON.stringify(parsed));
          } catch {}
        }
        const itemSchema = getStorageItemSchemaForKey(key);
        if (itemSchema && Array.isArray(parsed)) {
          const valid = parsed.filter(item => itemSchema.safeParse(item).success);
          return valid as unknown as T;
        }
        return parsed as T;
      } catch {
        return val as unknown as T;
      }
    }
  } catch {}
  return null;
}

export class StorageLockedError extends Error {
  constructor(message = 'Baza danych jest zablokowana lub brak klucza sesji. Zapis został przerwany.') {
    super(message);
    this.name = 'StorageLockedError';
  }
}

export class StorageWriteError extends Error {
  constructor(message = 'Nie udało się zapisać danych w magazynie przeglądarki.') {
    super(message);
    this.name = 'StorageWriteError';
  }
}

/**
 * Prepares and encrypts a value for database storage outside of an IndexedDB transaction.
 * - Enforces write blocking on corrupted keys unless force=true
 * - Automatically strips sched meta keys
 * - Encrypts with AES-256 GCM if encryption is active and key is in ENCRYPTED_KEYS
 * - Preserves revision and tabId on the outer encrypted object for STATE_META for synchronous inspection
 */
export async function prepareValueForStorage(
  key: string,
  value: unknown,
  options?: { force?: boolean }
): Promise<unknown> {
  if (isWriteBlocked(key) && !options?.force) {
    console.warn(`[dbStorage] Zapis klucza "${key}" został zablokowany z powodu wykrycia uszkodzonych danych.`);
    throw new StorageWriteBlockedError(key);
  }

  let valueToStore: unknown = value;
  if (key === STORAGE_KEYS.SCHED_DATA) {
    valueToStore = cleanSchedDataMeta(value, key);
  }

  // Sprawdzenie, czy szyfrowanie jest aktywne i czy dany klucz podlega szyfrowaniu
  if (
    isDatabaseEncryptionActive() &&
    isKeyEncrypted(key)
  ) {
    let sessionKey = getSessionCryptoKey();
    const pwd = getSessionPassword();
    const meta = getStorageEncryptionMeta();

    if (!sessionKey && !pwd) {
      throw new StorageLockedError(`Baza danych jest zaszyfrowana, a sesja jest zablokowana. Próba zapisu klucza "${key}" została zablokowana.`);
    }

    if (!sessionKey && pwd && meta?.salt) {
      const salt = base64ToArrayBuffer(meta.salt);
      const iterations = meta.iterations || PBKDF2_ITERATIONS_V2;
      sessionKey = await deriveCryptoKeyFromPassword(pwd, salt, iterations);
      setSessionCryptoKey(sessionKey);
    }

    if (!sessionKey) {
      throw new StorageLockedError(`Brak aktywnego klucza sesji do zaszyfrowania rekordu "${key}".`);
    }

    try {
      const serialized = typeof valueToStore === 'string' ? valueToStore : JSON.stringify(valueToStore);
      // Szybkie, nieblokujące szyfrowanie AES-256 GCM przy użyciu klucza sesyjnego CryptoKey
      // Losowy 12-bajtowy wektor IV dla każdego zapisu
      const { iv, ciphertext } = await encryptWithKey(serialized, sessionKey);
      
      const payload: Record<string, unknown> = {
        type: 'encrypted-v2',
        iterations: meta?.iterations || PBKDF2_ITERATIONS_V2,
        salt: meta?.salt || '',
        iv,
        ciphertext
      };

      if (key === STORAGE_KEYS.STATE_META && valueToStore && typeof valueToStore === 'object') {
        const metaObj = valueToStore as Record<string, unknown>;
        if (typeof metaObj.revision === 'number') payload.revision = metaObj.revision;
        if (typeof metaObj.tabId === 'string') payload.tabId = metaObj.tabId;
      }

      return payload;
    } catch (err) {
      console.error(`Błąd szyfrowania dla klucza "${key}":`, err);
      throw new StorageLockedError(`Szyfrowanie dla klucza "${key}" nie powiodło się: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return valueToStore;
}

/**
 * Save an item to storage (persists to IndexedDB and syncs to localStorage when size permits).
 * If database encryption is active, encrypts data with AES-256 GCM using the session CryptoKey.
 * Eliminates PBKDF2 derivation overhead during normal writes.
 */
export async function setStorageItem<T = unknown>(
  key: string,
  value: T,
  options?: { force?: boolean }
): Promise<void> {
  const valueToStore = await prepareValueForStorage(key, value, options);

  let idbWriteSucceeded = false;

  // Aktualizacja bazy IndexedDB, jeśli jest dostępna
  if (isIndexedDBAvailable) {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(valueToStore, key);

          req.onsuccess = () => {
            consecutiveIdbErrors = 0;
            idbWriteSucceeded = true;
            resolve();
          };
          req.onerror = () => {
            consecutiveIdbErrors++;
            dbPromise = null;
            if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
              isIndexedDBAvailable = false;
            }
            reject(req.error);
          };
        } catch (err) {
          consecutiveIdbErrors++;
          dbPromise = null;
          if (consecutiveIdbErrors >= MAX_CONSECUTIVE_IDB_ERRORS) {
            isIndexedDBAvailable = false;
          }
          reject(err);
        }
      });
    } catch (err) {
      console.warn(`Could not save "${key}" to IndexedDB:`, err);
    }
  }

  // Utrzymywanie lustra w localStorage dla szybkiego pierwszego renderu
  let localStorageSaved = false;
  try {
    const serialized = typeof valueToStore === 'string' ? valueToStore : JSON.stringify(valueToStore);
    if (serialized.length < 2.5 * 1024 * 1024) {
      localStorage.setItem(key, serialized);
      localStorageSaved = true;
    } else {
      console.info(`Pominięto lustro localStorage dla "${key}" ze względu na rozmiar (${serialized.length} B >= 2.5 MB).`);
    }
  } catch (err) {
    console.warn(`Zapis lustra localStorage dla "${key}" nie powiódł się (np. QuotaExceeded):`, err);
  }

  // Gdy zapis do IndexedDB się nie uda ORAZ lustro localStorage jest pominięte -> rzuć StorageWriteError
  if (!idbWriteSucceeded && !localStorageSaved) {
    throw new StorageWriteError(`Błąd zapisu: nie udało się zapisać danych dla klucza "${key}" ani w bazie IndexedDB, ani w pamięci podręcznej localStorage.`);
  }
}

/**
 * Encrypts all existing database keys with a new master password in 'encrypted-v2' format.
 * - Creates pre-encryption backup in IndexedDB before starting
 * - Derives master key once (PBKDF2 600,000 iterations, extractable=false)
 * - Verifies decryption of every key after migration
 * - Automatically rolls back all data to plaintext on any verification failure
 */
export async function enableDatabaseEncryption(password: string): Promise<void> {
  const keysToEncrypt = await listManagedKeys();

  // 1. Pobranie wszystkich bieżących danych jawnych
  const currentData: Record<string, unknown> = {};
  for (const k of keysToEncrypt) {
    const rawRecord = await getRawItem(k);
    const val = await getStorageItem(k);

    // Traktuj brak wartości fizycznie istniejącego klucza jako błąd krytyczny -> przerwij i cofnij
    if (rawRecord !== null && rawRecord !== undefined && (val === null || val === undefined)) {
      throw new Error(`Klucz "${k}" fizycznie istnieje w bazie danych, ale nie mógł zostać poprawnie odczytany przez getStorageItem (błąd integralności lub walidacji schematu).`);
    }

    if (val !== null && val !== undefined) {
      currentData[k] = JSON.parse(JSON.stringify(val));
    }
  }

  // 2. Utworzenie kopii awaryjnej przed szyfrowaniem (rollback safety)
  const preEncryptionBackup = {
    timestamp: new Date().toISOString(),
    keys: Object.keys(currentData),
    data: currentData,
  };
  await setRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP, preEncryptionBackup);

  try {
    // 3. Zapisanie metadanych szyfrowania (v2, 600 000 iteracji) i aktywacja sesji
    await setupStorageEncryptionMeta(password);

    // 4. Zapisanie wszystkich elementów zaszyfrowanych nowym kluczem CryptoKey
    for (const [k, val] of Object.entries(currentData)) {
      await setStorageItem(k, val);
    }

    // 5. Krok weryfikacyjny: test odczytu i deszyfrowania każdego klucza
    for (const [k, originalVal] of Object.entries(currentData)) {
      const readBack = await getStorageItem(k);
      if (readBack === null || readBack === undefined) {
        throw new Error(`Klucz "${k}" zwrócił pusty wynik podczas weryfikacji odczytu.`);
      }
      const origStr = JSON.stringify(originalVal);
      const readStr = JSON.stringify(readBack);
      if (origStr !== readStr) {
        throw new Error(`Niezgodność danych dla klucza "${k}" po zaszyfrowaniu.`);
      }
    }

    // 6. Weryfikacja zakończona sukcesem! Usunięcie tymczasowej kopii zapasowej
    await removeRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
  } catch (err) {
    console.error('Błąd podczas aktywacji szyfrowania bazy. Rozpoczynanie bezpiecznego rollbacku...', err);
    // COFNIĘCIE (ROLLBACK): przywrócenie oryginalnych danych jawnych i wyłączenie szyfrowania
    try {
      removeStorageEncryptionMeta();
      for (const [k, val] of Object.entries(currentData)) {
        await setRawItem(k, val);
      }
      await removeRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
    } catch (rollbackErr) {
      console.error('Krytyczny błąd podczas rollbacku:', rollbackErr);
    }
    throw new Error(`Błąd podczas szyfrowania bazy: ${err instanceof Error ? err.message : String(err)}. Dane zostały bezpiecznie przywrócone do stanu pierwotnego.`);
  }
}

/**
 * Disables database encryption, decrypting all items back to standard storage format.
 */
export async function disableDatabaseEncryption(password: string): Promise<boolean> {
  const isValid = await verifyMasterPassword(password);
  if (!isValid) return false;

  const keysToDecrypt = await listManagedKeys();

  const currentData: Record<string, unknown> = {};
  for (const k of keysToDecrypt) {
    const rawRecord = await getRawItem(k);
    const val = await getStorageItem(k);
    if (rawRecord !== null && rawRecord !== undefined && (val === null || val === undefined)) {
      throw new Error(`Klucz "${k}" fizycznie istnieje w bazie danych, ale nie mógł zostać poprawnie odszyfrowany.`);
    }
    if (val !== null && val !== undefined) {
      currentData[k] = val;
    }
  }

  // Usunięcie metadanych szyfrowania i sesyjnych kluczy z pamięci RAM
  removeStorageEncryptionMeta();

  // Zapisanie wszystkich elementów w formie jawnej (niezaszyfrowanej)
  for (const [k, val] of Object.entries(currentData)) {
    await setRawItem(k, val);
  }

  return true;
}

/**
 * Changes the database master password, re-encrypting all stored items with the new password.
 */
export async function changeDatabaseEncryptionPassword(oldPass: string, newPass: string): Promise<boolean> {
  const isValid = await verifyMasterPassword(oldPass);
  if (!isValid) return false;

  const keys = await listManagedKeys();

  const currentData: Record<string, unknown> = {};
  for (const k of keys) {
    const rawRecord = await getRawItem(k);
    const val = await getStorageItem(k);
    if (rawRecord !== null && rawRecord !== undefined && (val === null || val === undefined)) {
      throw new Error(`Klucz "${k}" fizycznie istnieje w bazie danych, ale nie mógł zostać poprawnie odczytany.`);
    }
    if (val !== null && val !== undefined) {
      currentData[k] = val;
    }
  }

  // Zapisanie nowych metadanych szyfrowania (v2, 600 000 iteracji) i aktywacja sesji
  await setupStorageEncryptionMeta(newPass);

  // Zapisanie elementów ponownie zaszyfrowanych nowym hasłem
  for (const [k, val] of Object.entries(currentData)) {
    await setStorageItem(k, val);
  }

  return true;
}

/**
 * Migrates all stored items from 'encrypted-v1' to 'encrypted-v2' format.
 * Called automatically after unlocking the database.
 */
export async function migrateAllStoredItemsToV2(): Promise<number> {
  if (!isDatabaseEncryptionActive()) {
    return 0;
  }

  const keys = await listManagedKeys();

  let migrated = 0;
  for (const k of keys) {
    const raw = await getRawItem<Record<string, unknown> | string>(k);
    if (raw && ((typeof raw === 'object' && raw.type === 'encrypted-v1') || (typeof raw === 'string' && raw.includes('"type":"encrypted-v1"')))) {
      const val = await getStorageItem(k);
      if (val !== null) {
        await setStorageItem(k, val);
        migrated++;
      }
    }
  }

  return migrated;
}

/**
 * Remove an item from storage
 */
export async function removeStorageItem(key: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`Could not remove "${key}" from IndexedDB:`, err);
  }

  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Clear all application storage
 */
export async function clearAllStorage(): Promise<void> {
  clearBlockedWrites();
  const managedKeys = await listManagedKeys().catch(() => Array.from(ENCRYPTED_KEYS));
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err);
  }

  try {
    const allKeysToClear = new Set<string>([...Object.values(STORAGE_KEYS), ...managedKeys]);
    allKeysToClear.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.includes('_recovery_backup_')) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {}
}

/**
 * Automatic one-time migration from localStorage into IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<{ migratedCount: number }> {
  let migratedCount = 0;
  try {
    if (isDatabaseEncryptionActive() && !getSessionPassword() && !getSessionCryptoKey()) {
      return { migratedCount: 0 };
    }
    const migrationFlag = await getStorageItem<boolean>(STORAGE_KEYS.MIGRATION_DONE);
    if (migrationFlag) {
      return { migratedCount: 0 };
    }

    const keysToMigrate = [
      STORAGE_KEYS.APP_STATE,
      STORAGE_KEYS.SCHED_DATA,
      STORAGE_KEYS.STATE_META,
      STORAGE_KEYS.ARCHIVE,
      STORAGE_KEYS.SNAPSHOTS,
      STORAGE_KEYS.AUTOSAVE_VERSIONS,
      STORAGE_KEYS.HISTORY_LOGS,
      STORAGE_KEYS.ERROR_LOGS,
      STORAGE_KEYS.LAST_SEEN_VERSION,
      STORAGE_KEYS.TERMS_ACCEPTED,
    ];

    for (const key of keysToMigrate) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          let parsed: unknown = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {}
          if (key === STORAGE_KEYS.SCHED_DATA && hasSchedDataMeta(parsed)) {
            parsed = cleanSchedDataMeta(parsed, key);
          }
          await setStorageItem(key, parsed);
          migratedCount++;
        }
      } catch (e) {
        console.warn(`Migration skipped for key ${key}:`, e);
      }
    }

    await setStorageItem(STORAGE_KEYS.MIGRATION_DONE, true);
    if (migratedCount > 0) {
      console.info(`[SalePlan Pro] Pomyślnie zmigrowano ${migratedCount} obiektów z localStorage do bazy IndexedDB.`);
    }
  } catch (err) {
    console.warn('Migration to IndexedDB encountered an issue:', err);
  }
  return { migratedCount };
}

export interface StorageStatistics {
  usedBytes: number;
  quotaBytes: number;
  availableBytes: number;
  percentage: number;
  isIndexedDB: boolean;
  formattedUsed: string;
  formattedQuota: string;
}

/**
 * Get accurate storage size and available quota from IndexedDB and navigator.storage
 */
export async function getDetailedStorageStats(): Promise<StorageStatistics> {
  let usedBytes = 0;
  let quotaBytes = 1024 * 1024 * 1024; // Domyślnie 1 GB, jeśli API limitów nie jest wspierane
  let isIDB = isIndexedDBAvailable;

  // 1. Obliczenie przybliżonego rozmiaru zapisanych danych
  try {
    const db = await getDB();
    const allData = await new Promise<unknown[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const item of allData) {
      try {
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        usedBytes += str.length * 2;
      } catch {}
    }
  } catch {
    isIDB = false;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        usedBytes += (localStorage.getItem(key) || '').length * 2;
      }
    }
  }

  // 2. Zapytanie do przeglądarkowego API navigator.storage.estimate()
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined && estimate.usage > 0) {
        usedBytes = Math.max(usedBytes, estimate.usage);
      }
      if (estimate.quota !== undefined && estimate.quota > 0) {
        quotaBytes = estimate.quota;
      }
    } catch {}
  }

  const availableBytes = Math.max(0, quotaBytes - usedBytes);
  const percentage = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

  return {
    usedBytes,
    quotaBytes,
    availableBytes,
    percentage: Math.min(100, Math.max(0.1, percentage)),
    isIndexedDB: isIDB,
    formattedUsed: formatBytesFriendly(usedBytes),
    formattedQuota: formatBytesFriendly(quotaBytes),
  };
}

/**
 * Format bytes to readable string (B, KB, MB, GB)
 */
export function formatBytesFriendly(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
