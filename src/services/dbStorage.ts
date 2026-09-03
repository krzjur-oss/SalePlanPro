/**
 * SalePlan Pro - High-Capacity IndexedDB Storage Engine & Migration Adapter
 * 
 * Provides unlimited offline storage for large schools, extensive snapshot histories,
 * and massive timetables without the 5MB localStorage limitation.
 * 
 * Features:
 * - Native Promise-based IndexedDB engine (zero dependencies, high performance)
 * - Automatic seamless migration of existing data from localStorage on first launch
 * - Storage quota detection via navigator.storage.estimate()
 * - Safe fallback to localStorage if IndexedDB is blocked in private browsing
 */

const DB_NAME = 'SalePlanProDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

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
  STORAGE_ENC_META_KEY
} from '../lib/crypto';

export { 
  isDatabaseEncryptionActive,
  isDatabaseEncryptionActive as isStorageEncryptedOnDisk,
  isSessionUnlocked,
  verifyMasterPassword as verifyStoragePassword,
  setSessionPassword as setSessionStoragePassword,
  getSessionPassword
} from '../lib/crypto';

// Known storage keys
export const STORAGE_KEYS = {
  APP_STATE: 'saleplan_v3_app_state',
  SCHED_DATA: 'saleplan_v3_sched_data',
  ARCHIVE: 'saleplan_v3_archive',
  SNAPSHOTS: 'saleplan_v3_snapshots',
  AUTOSAVE_VERSIONS: 'saleplan_v3_autosave_versions',
  HISTORY_LOGS: 'saleplan_v3_history_logs',
  ERROR_LOGS: 'saleplan_v3_error_logs',
  LAST_SEEN_VERSION: 'saleplan_last_seen_version',
  MIGRATION_DONE: 'saleplan_indexeddb_migrated_v1',
  STRUCTURE_TEMPLATES: 'saleplan_v3_structure_templates',
  STORAGE_ENC_META: STORAGE_ENC_META_KEY,
} as const;

function isEncryptedObject(val: any): boolean {
  if (!val) return false;
  if (typeof val === 'object' && val.type === 'encrypted-v1' && val.ciphertext && val.salt && val.iv) {
    return true;
  }
  if (typeof val === 'string' && val.includes('"type":"encrypted-v1"')) {
    try {
      const p = JSON.parse(val);
      return p && p.type === 'encrypted-v1' && !!p.ciphertext;
    } catch {
      return false;
    }
  }
  return false;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let isIndexedDBAvailable = true;

/**
 * Open or initialize the IndexedDB database
 */
function getDB(): Promise<IDBDatabase> {
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
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open request error, falling back to localStorage:', event);
        isIndexedDBAvailable = false;
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      console.warn('IndexedDB initialization failed:', err);
      isIndexedDBAvailable = false;
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Helper to process retrieved raw value, handling transparent AES-GCM decryption if encrypted.
 */
async function processRetrievedValue<T>(rawVal: any): Promise<T | null> {
  if (rawVal === null || rawVal === undefined) return null;

  if (isEncryptedObject(rawVal)) {
    const pwd = getSessionPassword();
    if (!pwd) {
      // Database is encrypted and session is locked
      return null;
    }
    try {
      const payloadStr = typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
      const decrypted = await decryptText(payloadStr, pwd);
      return JSON.parse(decrypted) as T;
    } catch (e) {
      console.warn('Failed to decrypt storage item with session password:', e);
      return null;
    }
  }

  return rawVal as T;
}

/**
 * Get an item from storage (tries IndexedDB first, falls back to localStorage or in-memory)
 */
export async function getStorageItem<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const rawResult = await new Promise<any>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result !== undefined && req.result !== null) {
            resolve(req.result);
          } else {
            // Check fallback in localStorage if not found in IndexedDB
            try {
              const localVal = localStorage.getItem(key);
              if (localVal !== null) {
                try {
                  const parsed = JSON.parse(localVal);
                  // Background migrate this item to IndexedDB
                  setStorageItem(key, parsed).catch(() => {});
                  resolve(parsed);
                  return;
                } catch {
                  resolve(localVal);
                  return;
                }
              }
            } catch {}
            resolve(null);
          }
        };

        req.onerror = () => {
          // Fallback to localStorage on request error
          try {
            const val = localStorage.getItem(key);
            resolve(val ? JSON.parse(val) : null);
          } catch {
            resolve(null);
          }
        };
      } catch (err) {
        console.warn(`Error reading key "${key}" from IndexedDB:`, err);
        try {
          const val = localStorage.getItem(key);
          resolve(val ? JSON.parse(val) : null);
        } catch {
          resolve(null);
        }
      }
    });

    return processRetrievedValue<T>(rawResult);
  } catch {
    // If IndexedDB unavailable, use localStorage
    try {
      const val = localStorage.getItem(key);
      const parsed = val ? JSON.parse(val) : null;
      return processRetrievedValue<T>(parsed);
    } catch {
      return null;
    }
  }
}

/**
 * Synchronous read fallback for initial React render (reads from localStorage or returns null).
 * Returns null if the stored value is encrypted and requires async decryption.
 */
export function getStorageItemSync<T = any>(key: string): T | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      if (val.includes('"type":"encrypted-v1"') || isEncryptedObject(val)) {
        // Encrypted data requires asynchronous decryption
        return null;
      }
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as unknown as T;
      }
    }
  } catch {}
  return null;
}

/**
 * Save an item to storage (persists to IndexedDB and syncs to localStorage when size permits).
 * If database encryption is active, encrypts data with AES-256 GCM using the session password.
 */
export async function setStorageItem<T = any>(key: string, value: T): Promise<void> {
  let valueToStore: any = value;

  // Check if encryption is active and key should be encrypted
  if (
    isDatabaseEncryptionActive() &&
    key !== STORAGE_KEYS.STORAGE_ENC_META &&
    key !== STORAGE_KEYS.MIGRATION_DONE &&
    key !== STORAGE_KEYS.LAST_SEEN_VERSION
  ) {
    const pwd = getSessionPassword();
    if (pwd) {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        const encryptedStr = await encryptText(serialized, pwd);
        valueToStore = JSON.parse(encryptedStr);
      } catch (err) {
        console.error(`Encryption failed for key "${key}", saving plain as fallback:`, err);
      }
    }
  }

  // Always update IndexedDB
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(valueToStore, key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`Could not save "${key}" to IndexedDB:`, err);
  }

  // Also maintain localStorage mirror for fast synchronous initial render if payload is reasonable
  try {
    const serialized = typeof valueToStore === 'string' ? valueToStore : JSON.stringify(valueToStore);
    // Only mirror to localStorage if below 2.5MB to avoid quota exceeded crashes
    if (serialized.length < 2.5 * 1024 * 1024) {
      localStorage.setItem(key, serialized);
    }
  } catch (err) {
    // If localStorage quota is exceeded, IndexedDB still holds the full data safely!
    if (import.meta.env.DEV) {
      console.info(`LocalStorage mirror skipped for "${key}" (safely stored in high-capacity IndexedDB).`);
    }
  }
}

/**
 * Encrypts all existing database keys with a new master password.
 */
export async function enableDatabaseEncryption(password: string): Promise<void> {
  const keysToEncrypt = [
    STORAGE_KEYS.APP_STATE,
    STORAGE_KEYS.SCHED_DATA,
    STORAGE_KEYS.ARCHIVE,
    STORAGE_KEYS.SNAPSHOTS,
    STORAGE_KEYS.AUTOSAVE_VERSIONS,
    STORAGE_KEYS.HISTORY_LOGS,
    STORAGE_KEYS.STRUCTURE_TEMPLATES,
  ];

  const currentData: Record<string, any> = {};
  for (const k of keysToEncrypt) {
    const val = await getStorageItem(k);
    if (val !== null && val !== undefined) {
      currentData[k] = val;
    }
  }

  // Set encryption metadata and activate session
  await setupStorageEncryptionMeta(password);

  // Store back all items (now encrypting)
  for (const [k, val] of Object.entries(currentData)) {
    await setStorageItem(k, val);
  }
}

/**
 * Disables database encryption, decrypting all items back to standard storage format.
 */
export async function disableDatabaseEncryption(password: string): Promise<boolean> {
  const isValid = await verifyMasterPassword(password);
  if (!isValid) return false;

  setSessionPassword(password);

  const keysToDecrypt = [
    STORAGE_KEYS.APP_STATE,
    STORAGE_KEYS.SCHED_DATA,
    STORAGE_KEYS.ARCHIVE,
    STORAGE_KEYS.SNAPSHOTS,
    STORAGE_KEYS.AUTOSAVE_VERSIONS,
    STORAGE_KEYS.HISTORY_LOGS,
    STORAGE_KEYS.STRUCTURE_TEMPLATES,
  ];

  const currentData: Record<string, any> = {};
  for (const k of keysToDecrypt) {
    const val = await getStorageItem(k);
    if (val !== null && val !== undefined) {
      currentData[k] = val;
    }
  }

  // Remove encryption meta and session password
  removeStorageEncryptionMeta();

  // Save all items back as unencrypted
  for (const [k, val] of Object.entries(currentData)) {
    await setStorageItem(k, val);
  }

  return true;
}

/**
 * Changes the database master password, re-encrypting all stored items with the new password.
 */
export async function changeDatabaseEncryptionPassword(oldPass: string, newPass: string): Promise<boolean> {
  const isValid = await verifyMasterPassword(oldPass);
  if (!isValid) return false;

  setSessionPassword(oldPass);

  const keys = [
    STORAGE_KEYS.APP_STATE,
    STORAGE_KEYS.SCHED_DATA,
    STORAGE_KEYS.ARCHIVE,
    STORAGE_KEYS.SNAPSHOTS,
    STORAGE_KEYS.AUTOSAVE_VERSIONS,
    STORAGE_KEYS.HISTORY_LOGS,
    STORAGE_KEYS.STRUCTURE_TEMPLATES,
  ];

  const currentData: Record<string, any> = {};
  for (const k of keys) {
    const val = await getStorageItem(k);
    if (val !== null && val !== undefined) {
      currentData[k] = val;
    }
  }

  // Set new encryption metadata and active session
  await setupStorageEncryptionMeta(newPass);

  // Store items back re-encrypted with new password
  for (const [k, val] of Object.entries(currentData)) {
    await setStorageItem(k, val);
  }

  return true;
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
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err);
  }

  try {
    Object.values(STORAGE_KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
  } catch {}
}

/**
 * Automatic one-time migration from localStorage into IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<{ migratedCount: number }> {
  let migratedCount = 0;
  try {
    const migrationFlag = await getStorageItem<boolean>(STORAGE_KEYS.MIGRATION_DONE);
    if (migrationFlag) {
      return { migratedCount: 0 };
    }

    const keysToMigrate = [
      STORAGE_KEYS.APP_STATE,
      STORAGE_KEYS.SCHED_DATA,
      STORAGE_KEYS.ARCHIVE,
      STORAGE_KEYS.SNAPSHOTS,
      STORAGE_KEYS.AUTOSAVE_VERSIONS,
      STORAGE_KEYS.HISTORY_LOGS,
      STORAGE_KEYS.ERROR_LOGS,
      STORAGE_KEYS.LAST_SEEN_VERSION,
    ];

    for (const key of keysToMigrate) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          let parsed: any = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {}
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
  let quotaBytes = 1024 * 1024 * 1024; // Default 1 GB display if quota API unsupported
  let isIDB = isIndexedDBAvailable;

  // 1. Calculate approximate size of stored data
  try {
    const db = await getDB();
    const allData = await new Promise<any[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const item of allData) {
      try {
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        usedBytes += str.length * 2; // UTF-16 approximate byte size
      } catch {}
    }
  } catch {
    // Fallback: sum localStorage sizes
    isIDB = false;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        usedBytes += (localStorage.getItem(key) || '').length * 2;
      }
    }
  }

  // 2. Query browser storage estimate API
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
