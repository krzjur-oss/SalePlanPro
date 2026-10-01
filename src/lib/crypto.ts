/**
 * High-Security Cryptographic Engine for SalePlan Pro.
 * 
 * Complies with Art. 32 GDPR (Security of Processing) for local educational databases.
 * - PBKDF2 with SHA-256 (600,000 iterations by default in 'encrypted-v2')
 * - AES-256 GCM authenticated encryption with unique 12-byte IV for every record
 * - In-memory CryptoKey (extractable=false) derived ONCE per session
 * - Zero storage of cleartext passwords in sessionStorage/localStorage
 * - Fast chunked Base64 encoding for massive 5MB+ payloads
 * - Full backward compatibility with 'encrypted-v1' payloads and automatic v2 migration
 * - Inactivity auto-lock mechanism
 */

export const PBKDF2_ITERATIONS_V1 = 100000;
export const PBKDF2_ITERATIONS_V2 = 600000;

export interface EncryptedBackupPayloadV1 {
  type: 'encrypted-v1';
  salt: string;       // Base64
  iv: string;         // Base64
  ciphertext: string; // Base64
}

export interface EncryptedBackupPayloadV2 {
  type: 'encrypted-v2';
  iterations: number; // e.g. 600000
  salt: string;       // Base64
  iv: string;         // Base64
  ciphertext: string; // Base64
}

export type EncryptedBackupPayload = EncryptedBackupPayloadV1 | EncryptedBackupPayloadV2;

function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as unknown as Crypto;
  }
  throw new Error('Web Cryptography API is not available in this environment');
}

/**
 * Fast Base64 encoding without 1-by-1 char concatenation.
 * Uses chunked String.fromCharCode.apply (32KB chunks) for extreme performance on multi-MB buffers.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32768 bytes
  const len = buffer.byteLength;
  const chunks: string[] = [];

  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, len);
    chunks.push(String.fromCharCode.apply(null, buffer.subarray(i, end) as unknown as number[]));
  }

  const binary = chunks.join('');
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(binary);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Fast Base64 decoding into Uint8Array.
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = typeof atob === 'function' ? atob(base64) : (window as any).atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a non-extractable AES-256 GCM CryptoKey from a password and salt using PBKDF2.
 * Done ONCE per session to eliminate CPU overhead during normal storage read/writes.
 */
export async function deriveCryptoKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS_V2
): Promise<CryptoKey> {
  if (!password) {
    throw new Error('Hasło jest wymagane do wyprowadzenia klucza szyfrowania.');
  }

  const cryptoObj = getCrypto();
  const enc = new TextEncoder();

  const passwordKey = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false (key cannot be exported from Crypto engine)
    ['encrypt', 'decrypt']
  );
}

/**
 * High-speed AES-256 GCM encryption using an already derived CryptoKey.
 * Generates a fresh, cryptographically secure 12-byte IV for every invocation.
 */
export async function encryptWithKey(
  text: string,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(text)
  );

  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(new Uint8Array(encryptedBuffer))
  };
}

/**
 * High-speed AES-256 GCM decryption using an already derived CryptoKey.
 */
export async function decryptWithKey(
  ivB64: string,
  ciphertextB64: string,
  key: CryptoKey
): Promise<string> {
  const cryptoObj = getCrypto();
  const iv = base64ToArrayBuffer(ivB64);
  const ciphertext = base64ToArrayBuffer(ciphertextB64);

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypts cleartext using a password for standalone backup files (defaults to encrypted-v2).
 */
export async function encryptText(
  text: string,
  password: string,
  iterations: number = PBKDF2_ITERATIONS_V2
): Promise<string> {
  if (!password) {
    throw new Error('Password is required for encryption');
  }

  const cryptoObj = getCrypto();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const key = await deriveCryptoKeyFromPassword(password, salt, iterations);
  const { iv, ciphertext } = await encryptWithKey(text, key);

  const payload: EncryptedBackupPayloadV2 = {
    type: 'encrypted-v2',
    iterations,
    salt: arrayBufferToBase64(salt),
    iv,
    ciphertext,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Decrypts a payload string (supports both 'encrypted-v1' and 'encrypted-v2') using a password.
 */
export async function decryptText(encryptedJsonStr: string, password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required for decryption');
  }

  let payload: any;
  try {
    payload = typeof encryptedJsonStr === 'string' ? JSON.parse(encryptedJsonStr) : encryptedJsonStr;
  } catch (e) {
    throw new Error('Niepoprawny format danych szyfrowanych.');
  }

  if (!payload || !payload.salt || !payload.iv || !payload.ciphertext) {
    throw new Error('Nieprawidłowy schemat zaszyfrowanego pliku.');
  }

  const iterations = payload.type === 'encrypted-v2' 
    ? (Number(payload.iterations) || PBKDF2_ITERATIONS_V2)
    : PBKDF2_ITERATIONS_V1;

  const salt = base64ToArrayBuffer(payload.salt);
  const key = await deriveCryptoKeyFromPassword(password, salt, iterations);

  try {
    return await decryptWithKey(payload.iv, payload.ciphertext, key);
  } catch (e) {
    throw new Error('Niepoprawne hasło lub uszkodzony plik.');
  }
}

/**
 * Checks whether a given raw string looks like an encrypted backup or storage payload.
 */
export function isEncryptedBackup(rawText: string): boolean {
  try {
    const parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    return !!parsed && (parsed.type === 'encrypted-v1' || parsed.type === 'encrypted-v2') && !!parsed.ciphertext;
  } catch {
    return false;
  }
}

// ── LOCAL STORAGE / DATABASE ENCRYPTION ENGINE (AES-256 GCM) ──

export const STORAGE_ENC_META_KEY = 'saleplan_v3_storage_enc_meta';
const VERIFICATION_MAGIC = 'SALEPLAN_MASTER_UNLOCK_VALID_V2';

// Pure in-memory state: NO PASSWORD IN SESSIONSTORAGE!
let inMemorySessionCryptoKey: CryptoKey | null = null;
let inMemoryMasterPassword: string | null = null;

export interface StorageEncMeta {
  enabled: boolean;
  version: 'v1' | 'v2';
  iterations: number;
  salt: string;               // Base64 master salt for database key derivation
  verificationToken: string;  // Serialized EncryptedBackupPayload
  autoLockMinutes?: number;   // 0 = disabled, default 15
  createdAt: string;
  updatedAt: string;
}

/**
 * Checks if local database encryption is currently activated on disk.
 */
export function isDatabaseEncryptionActive(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_ENC_META_KEY);
    if (!raw) return false;
    const meta: StorageEncMeta = JSON.parse(raw);
    return !!meta.enabled;
  } catch {
    return false;
  }
}

/**
 * Returns current StorageEncMeta or null.
 */
export function getStorageEncryptionMeta(): StorageEncMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_ENC_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * In-memory setter for session CryptoKey.
 */
export function setSessionCryptoKey(key: CryptoKey | null): void {
  inMemorySessionCryptoKey = key;
}

/**
 * In-memory getter for session CryptoKey.
 */
export function getSessionCryptoKey(): CryptoKey | null {
  return inMemorySessionCryptoKey;
}

/**
 * Sets session password in memory only (never written to sessionStorage or disk).
 */
export function setSessionPassword(password: string | null): void {
  inMemoryMasterPassword = password;
  if (!password) {
    inMemorySessionCryptoKey = null;
  }
}

/**
 * Retrieves session password from memory.
 */
export function getSessionPassword(): string | null {
  return inMemoryMasterPassword;
}

/**
 * Checks if the current session is unlocked and ready to read/write encrypted data.
 */
export function isSessionUnlocked(): boolean {
  if (!isDatabaseEncryptionActive()) return true;
  return inMemorySessionCryptoKey !== null || inMemoryMasterPassword !== null;
}

/**
 * Immediately locks the session: clears in-memory keys and notifies listeners.
 */
export function lockSession(): void {
  inMemorySessionCryptoKey = null;
  inMemoryMasterPassword = null;
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('saleplan-session-locked'));
    } catch {}
  }
}

// ── INACTIVITY AUTO-LOCK MECHANISM ──

let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
let autoLockListenersInitialized = false;

export function getAutoLockMinutes(): number {
  const meta = getStorageEncryptionMeta();
  if (meta && typeof meta.autoLockMinutes === 'number') {
    return meta.autoLockMinutes;
  }
  try {
    const saved = localStorage.getItem('saleplan_autolock_minutes');
    if (saved !== null) {
      return Number(saved);
    }
  } catch {}
  return 15; // default 15 minutes
}

export function setAutoLockMinutes(minutes: number): void {
  try {
    localStorage.setItem('saleplan_autolock_minutes', String(minutes));
    const meta = getStorageEncryptionMeta();
    if (meta) {
      meta.autoLockMinutes = minutes;
      meta.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_ENC_META_KEY, JSON.stringify(meta));
    }
  } catch {}
  resetAutoLockTimer();
}

export function resetAutoLockTimer(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }

  if (!isDatabaseEncryptionActive() || !isSessionUnlocked()) {
    return;
  }

  const mins = getAutoLockMinutes();
  if (mins <= 0) {
    // Auto-lock disabled
    return;
  }

  autoLockTimer = setTimeout(() => {
    if (isDatabaseEncryptionActive() && isSessionUnlocked()) {
      lockSession();
    }
  }, mins * 60 * 1000);
}

/**
 * Initializes global user activity listeners for inactivity auto-lock.
 */
export function initAutoLockListeners(): void {
  if (autoLockListenersInitialized || typeof window === 'undefined') return;
  autoLockListenersInitialized = true;

  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  const onActivity = () => {
    resetAutoLockTimer();
  };

  activityEvents.forEach(evt => {
    window.addEventListener(evt, onActivity, { passive: true });
  });

  resetAutoLockTimer();
}

// Initialize on module load if in browser
if (typeof window !== 'undefined') {
  initAutoLockListeners();
}

/**
 * Verifies a password against the stored encryption metadata.
 * Upon success, derives and sets the non-extractable session CryptoKey in module memory.
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const meta = getStorageEncryptionMeta();
  if (!meta || !meta.enabled) return true;
  if (!password) return false;

  try {
    // 1. If meta contains master salt & version v2, derive key with 600,000 iterations
    if (meta.salt) {
      const salt = base64ToArrayBuffer(meta.salt);
      const iterations = meta.iterations || PBKDF2_ITERATIONS_V2;
      const derivedKey = await deriveCryptoKeyFromPassword(password, salt, iterations);

      let decrypted = '';
      if (meta.verificationToken.includes('{')) {
        const tokenObj = JSON.parse(meta.verificationToken);
        if (tokenObj.type === 'encrypted-v2') {
          decrypted = await decryptWithKey(tokenObj.iv, tokenObj.ciphertext, derivedKey);
        } else {
          decrypted = await decryptText(meta.verificationToken, password);
        }
      } else {
        decrypted = await decryptText(meta.verificationToken, password);
      }

      if (decrypted === VERIFICATION_MAGIC || decrypted === 'SALEPLAN_MASTER_UNLOCK_VALID_V1') {
        setSessionCryptoKey(derivedKey);
        setSessionPassword(password);
        resetAutoLockTimer();
        return true;
      }
    }

    // 2. Fallback for legacy v1 metadata
    const decrypted = await decryptText(meta.verificationToken, password);
    if (decrypted === VERIFICATION_MAGIC || decrypted === 'SALEPLAN_MASTER_UNLOCK_VALID_V1') {
      setSessionPassword(password);
      resetAutoLockTimer();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Sets up and stores the database encryption metadata in 'encrypted-v2' format.
 * Generates master salt, derives CryptoKey, and creates verification token.
 */
export async function setupStorageEncryptionMeta(
  password: string,
  autoLockMinutes = 15
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const cryptoObj = getCrypto();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const saltB64 = arrayBufferToBase64(salt);

  // Derive master CryptoKey once with 600,000 iterations
  const key = await deriveCryptoKeyFromPassword(password, salt, PBKDF2_ITERATIONS_V2);
  const { iv, ciphertext } = await encryptWithKey(VERIFICATION_MAGIC, key);

  const verificationPayload: EncryptedBackupPayloadV2 = {
    type: 'encrypted-v2',
    iterations: PBKDF2_ITERATIONS_V2,
    salt: saltB64,
    iv,
    ciphertext
  };

  const meta: StorageEncMeta = {
    enabled: true,
    version: 'v2',
    iterations: PBKDF2_ITERATIONS_V2,
    salt: saltB64,
    verificationToken: JSON.stringify(verificationPayload),
    autoLockMinutes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_ENC_META_KEY, JSON.stringify(meta));
  setSessionCryptoKey(key);
  setSessionPassword(password);
  resetAutoLockTimer();

  return { key, salt };
}

/**
 * Disables database encryption and clears metadata and in-memory session keys.
 */
export function removeStorageEncryptionMeta(): void {
  try {
    localStorage.removeItem(STORAGE_ENC_META_KEY);
    lockSession();
  } catch {}
}
