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
