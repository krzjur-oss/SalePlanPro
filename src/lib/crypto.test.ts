/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Jednostkowe Silnika Kryptograficznego (Crypto Engine Tests)
 * Opis: Weryfikacja szyfrowania AES-256-GCM, derywacji PBKDF2 600k oraz formatów v1 i v2.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptText,
  decryptText,
  deriveCryptoKeyFromPassword,
  encryptWithKey,
  decryptWithKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isEncryptedBackup,
  setupStorageEncryptionMeta,
  verifyMasterPassword,
  isDatabaseEncryptionActive,
  isSessionUnlocked,
  lockSession,
  getSessionPassword,
  getSessionCryptoKey,
  getAutoLockMinutes,
  setAutoLockMinutes,
  removeStorageEncryptionMeta,
  PBKDF2_ITERATIONS_V1,
  PBKDF2_ITERATIONS_V2
} from './crypto';

describe('Cryptographic Engine v2 & Session Key Cache Tests', () => {
  beforeEach(() => {
    // Atrapa localStorage i sessionStorage w środowisku Node / Vitest
    if (typeof localStorage === 'undefined') {
      const store: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = String(v); },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
      };
    } else {
      localStorage.clear();
    }

    if (typeof sessionStorage === 'undefined') {
      const sessionStore: Record<string, string> = {};
      (globalThis as any).sessionStorage = {
        getItem: (k: string) => sessionStore[k] ?? null,
        setItem: (k: string, v: string) => { sessionStore[k] = String(v); },
        removeItem: (k: string) => { delete sessionStore[k]; },
        clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]); }
      };
    } else {
      sessionStorage.clear();
    }

    lockSession();
    removeStorageEncryptionMeta();
  });

  describe('Fast Chunked Base64', () => {
    it('accurately encodes and decodes binary buffers with chunking', () => {
      const testBuffer = new Uint8Array([0, 1, 2, 255, 254, 128, 64, 32, 16, 8, 4, 2, 1]);
      const b64 = arrayBufferToBase64(testBuffer);
      const decoded = base64ToArrayBuffer(b64);
      expect(Array.from(decoded)).toEqual(Array.from(testBuffer));
    });

    it('handles large multi-kilobyte buffers exceeding single chunk threshold', () => {
      const largeBuffer = new Uint8Array(70000); // Exceeds 32KB chunk size
      for (let i = 0; i < largeBuffer.length; i++) {
        largeBuffer[i] = i % 256;
      }
      const b64 = arrayBufferToBase64(largeBuffer);
      const decoded = base64ToArrayBuffer(b64);
      expect(decoded.length).toBe(largeBuffer.length);
      expect(decoded[0]).toBe(largeBuffer[0]);
      expect(decoded[50000]).toBe(largeBuffer[50000]);
    });
  });

  describe('New "encrypted-v2" format & PBKDF2 600,000 iterations', () => {
    it('produces payload with type="encrypted-v2" and iterations=600000 recorded in header', async () => {
      const cleartext = 'Poufne dane orzeczenia SPE: Jan Kowalski, klasa 1A';
      const password = 'SuperSecurePassword2026!';
      const encryptedJson = await encryptText(cleartext, password, PBKDF2_ITERATIONS_V2);

      const parsed = JSON.parse(encryptedJson);
      expect(parsed.type).toBe('encrypted-v2');
      expect(parsed.iterations).toBe(600000);
      expect(parsed.salt).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.ciphertext).toBeDefined();

      const decrypted = await decryptText(encryptedJson, password);
      expect(decrypted).toBe(cleartext);
    });

    it('retains full backward compatibility with legacy "encrypted-v1" payloads (100000 iterations)', async () => {
      const cleartext = 'Zapis archiwalny w starym formacie v1';
      const password = 'LegacyPassword123!';

      // Manually create a genuine v1 payload using 100,000 iterations
      const cryptoObj = globalThis.crypto;
      const salt = cryptoObj.getRandomValues(new Uint8Array(16));
      const keyV1 = await deriveCryptoKeyFromPassword(password, salt, PBKDF2_ITERATIONS_V1);
      const { iv, ciphertext } = await encryptWithKey(cleartext, keyV1);

      const v1Payload = {
        type: 'encrypted-v1',
        salt: arrayBufferToBase64(salt),
        iv,
        ciphertext
      };

      const decrypted = await decryptText(JSON.stringify(v1Payload), password);
      expect(decrypted).toBe(cleartext);
    });

    it('rejects decryption with wrong password (zły hasło -> błąd) for both v1 and v2', async () => {
      const cleartext = 'Tajne dane do testu błędnego hasła';
      const correctPassword = 'PrawidloweHaslo#2026';
      const wrongPassword = 'ZleHaslo#9999';

      // v2 wrong password
      const encV2 = await encryptText(cleartext, correctPassword, PBKDF2_ITERATIONS_V2);
      await expect(decryptText(encV2, wrongPassword)).rejects.toThrow();

      // v1 wrong password
      const encV1 = await encryptText(cleartext, correctPassword, PBKDF2_ITERATIONS_V1);
      const parsedV1 = JSON.parse(encV1);
      parsedV1.type = 'encrypted-v1';
      await expect(decryptText(JSON.stringify(parsedV1), wrongPassword)).rejects.toThrow();
    });

    it('rejects decryption with corrupted ciphertext (uszkodzony ciphertext -> błąd)', async () => {
      const cleartext = 'Dane do testu uszkodzonego szyfrogramu';
      const password = 'DobreHaslo123!';
      const enc = await encryptText(cleartext, password, PBKDF2_ITERATIONS_V2);
      const parsed = JSON.parse(enc);

      // Celowe uszkodzenie bajtów szyfrogramu do testu odrzucenia
      const rawCipher = base64ToArrayBuffer(parsed.ciphertext);
      const corruptedBytes = new Uint8Array(rawCipher);
      corruptedBytes[0] ^= 0xff; // flip bits
      parsed.ciphertext = arrayBufferToBase64(corruptedBytes);

      await expect(decryptText(JSON.stringify(parsed), password)).rejects.toThrow();

      // Also test invalid base64 in ciphertext
      parsed.ciphertext = 'invalid-not-base-64!!!';
      await expect(decryptText(JSON.stringify(parsed), password)).rejects.toThrow();
    });
  });

  describe('Single-session CryptoKey (derive ONCE) & 5 MB speed requirement', () => {
    it('encrypts and decrypts 5 MB of data in less than 1 second after unlocking', async () => {
      const password = 'MasterPasswordForSchool2026!';
      const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));

      // Derive key ONCE per session
      const sessionKey = await deriveCryptoKeyFromPassword(password, salt, PBKDF2_ITERATIONS_V2);
      expect(sessionKey.extractable).toBe(false);

      // Wygenerowanie 5 MB realistycznych danych aplikacji w formacie JSON
      const fiveMbString = JSON.stringify({
        schoolName: 'Szkoła Podstawowa nr 15 z Oddziałami Integracyjnymi w Katowicach',
        notes: 'A'.repeat(5 * 1024 * 1024) // 5 MB payload
      });

      const startTime = performance.now();

      // 1. High-speed encryption with cached key
      const { iv, ciphertext } = await encryptWithKey(fiveMbString, sessionKey);

      // 2. High-speed decryption with cached key
      const decrypted = await decryptWithKey(iv, ciphertext, sessionKey);

      const endTime = performance.now();
      const elapsedMs = endTime - startTime;

      expect(decrypted.length).toBe(fiveMbString.length);
      expect(decrypted).toBe(fiveMbString);
      // Acceptance criteria: < 1000 ms (< 1 s)
      expect(elapsedMs).toBeLessThan(1000);
    });
  });

  describe('No password in sessionStorage & In-memory Lock', () => {
    it('never stores password in sessionStorage', async () => {
      const password = 'MyPassword123!';
      await setupStorageEncryptionMeta(password);

      expect(isDatabaseEncryptionActive()).toBe(true);
      expect(isSessionUnlocked()).toBe(true);

      // KRYTYCZNY TEST: sessionStorage nie może zawierać hasła
      expect(sessionStorage.getItem('saleplan_session_pwd_v1')).toBeNull();
      expect(sessionStorage.getItem('saleplan_session_password')).toBeNull();

      // In-memory getter works
      expect(getSessionPassword()).toBe(password);
      expect(getSessionCryptoKey()).toBeDefined();

      // Locking clears in-memory keys
      lockSession();
      expect(isSessionUnlocked()).toBe(false);
      expect(getSessionPassword()).toBeNull();
      expect(getSessionCryptoKey()).toBeNull();
    });

    it('allows unlocking with correct password and rejects invalid password', async () => {
      const correctPassword = 'StrongCorrectPassword#1';
      await setupStorageEncryptionMeta(correctPassword);

      lockSession();
      expect(isSessionUnlocked()).toBe(false);

      // Wrong password fails
      const failed = await verifyMasterPassword('WrongPassword');
      expect(failed).toBe(false);
      expect(isSessionUnlocked()).toBe(false);

      // Correct password unlocks session and restores CryptoKey
      const success = await verifyMasterPassword(correctPassword);
      expect(success).toBe(true);
      expect(isSessionUnlocked()).toBe(true);
      expect(getSessionCryptoKey()).toBeDefined();
    });
  });

  describe('Inactivity Auto-lock settings', () => {
    it('reads and updates autoLockMinutes', () => {
      expect(getAutoLockMinutes()).toBe(15); // default
      setAutoLockMinutes(30);
      expect(getAutoLockMinutes()).toBe(30);
      setAutoLockMinutes(0); // disabled
      expect(getAutoLockMinutes()).toBe(0);
    });
  });
});
