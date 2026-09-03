/**
 * Utility functions for optional client-side backup encryption using Web Crypto API (PBKDF2 + AES-GCM).
 */

export interface EncryptedBackupPayload {
  type: 'encrypted-v1';
  salt: string;       // Base64
  iv: string;         // Base64
  ciphertext: string; // Base64
}

/**
 * Encrypts cleartext using a password.
 */
export async function encryptText(text: string, password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required for encryption');
  }

  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Import the raw password key
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive an AES-GCM key from the password
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt the content
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    enc.encode(text)
  );

  // Convert binary buffers to Base64 strings safely
  const saltB64 = arrayBufferToBase64(salt);
  const ivB64 = arrayBufferToBase64(iv);
  const ciphertextB64 = arrayBufferToBase64(new Uint8Array(encryptedBuffer));

  const payload: EncryptedBackupPayload = {
    type: 'encrypted-v1',
    salt: saltB64,
    iv: ivB64,
    ciphertext: ciphertextB64,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Decrypts a payload string using a password.
 */
export async function decryptText(encryptedJsonStr: string, password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required for decryption');
  }

  let payload: EncryptedBackupPayload;
  try {
    payload = JSON.parse(encryptedJsonStr);
  } catch (e) {
    throw new Error('Niepoprawny format pliku kopii.');
  }

  if (payload.type !== 'encrypted-v1' || !payload.salt || !payload.iv || !payload.ciphertext) {
    throw new Error('Nieprawidłowy schemat zaszyfrowanego pliku kopii.');
  }

  const salt = base64ToArrayBuffer(payload.salt);
  const iv = base64ToArrayBuffer(payload.iv);
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);

  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      aesKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    throw new Error('Niepoprawne hasło lub uszkodzony plik kopii.');
  }
}

/**
 * Checks whether a given raw string looks like an encrypted backup file.
 */
export function isEncryptedBackup(rawText: string): boolean {
  try {
    const parsed = JSON.parse(rawText);
    return parsed && parsed.type === 'encrypted-v1' && !!parsed.ciphertext;
  } catch (e) {
    return false;
  }
}

// Helpers for Uint8Array <-> Base64 translation
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ── LOCAL STORAGE / DATABASE ENCRYPTION ENGINE (AES-256 GCM) ──

export const STORAGE_ENC_META_KEY = 'saleplan_v3_storage_enc_meta';
const SESSION_PWD_KEY = 'saleplan_session_pwd_v1';
const VERIFICATION_MAGIC = 'SALEPLAN_MASTER_UNLOCK_VALID_V1';

let inMemoryMasterPassword: string | null = null;

export interface StorageEncMeta {
  enabled: boolean;
  verificationToken: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Checks if local database encryption is currently activated.
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
 * Sets the active master password for this session (both in-memory and in sessionStorage).
 */
export function setSessionPassword(password: string | null): void {
  inMemoryMasterPassword = password;
  try {
    if (password) {
      sessionStorage.setItem(SESSION_PWD_KEY, password);
    } else {
      sessionStorage.removeItem(SESSION_PWD_KEY);
    }
  } catch {}
}

/**
 * Retrieves the session password (from memory or sessionStorage).
 */
export function getSessionPassword(): string | null {
  if (inMemoryMasterPassword) return inMemoryMasterPassword;
  try {
    const fromSession = sessionStorage.getItem(SESSION_PWD_KEY);
    if (fromSession) {
      inMemoryMasterPassword = fromSession;
      return fromSession;
    }
  } catch {}
  return null;
}

/**
 * Checks if the current session is unlocked and ready to read/write encrypted data.
 */
export function isSessionUnlocked(): boolean {
  if (!isDatabaseEncryptionActive()) return true;
  const pwd = getSessionPassword();
  return !!pwd;
}

/**
 * Verifies a password against the stored encryption metadata verification token.
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const meta = getStorageEncryptionMeta();
  if (!meta || !meta.enabled) return true;
  if (!password) return false;

  try {
    const decrypted = await decryptText(meta.verificationToken, password);
    return decrypted === VERIFICATION_MAGIC;
  } catch {
    return false;
  }
}

/**
 * Sets up and stores the database encryption metadata with a verification token.
 */
export async function setupStorageEncryptionMeta(password: string): Promise<void> {
  const verificationToken = await encryptText(VERIFICATION_MAGIC, password);
  const meta: StorageEncMeta = {
    enabled: true,
    verificationToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_ENC_META_KEY, JSON.stringify(meta));
  setSessionPassword(password);
}

/**
 * Disables database encryption and clears metadata and session keys.
 */
export function removeStorageEncryptionMeta(): void {
  try {
    localStorage.removeItem(STORAGE_ENC_META_KEY);
    setSessionPassword(null);
  } catch {}
}

