/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Kryptograficzny Wysokiego Bezpieczeństwa (Crypto Engine)
 * 
 * Zgodność z art. 32 RODO (Bezpieczeństwo przetwarzania) dla lokalnych baz danych:
 * - PBKDF2 z SHA-256 (domyślnie 600 000 iteracji w formacie 'encrypted-v2')
 * - Szyfrowanie AES-256 GCM z unikalnym 12-bajtowym wektorem IV dla każdego rekordu
 * - Klucz sesyjny CryptoKey (extractable=false) derywowany JEDNOKROTNIE na sesję w pamięci RAM
 * - Całkowity brak przechowywania haseł w sessionStorage/localStorage
 * - Szybkie kodowanie Base64 porcjami dla dużych obiektów (> 5 MB)
 * - Pełna wsteczna kompatybilność z ładunkiem 'encrypted-v1' i migracja do v2
 * - Mechanizm automatycznej blokady sesji przy bezczynności (auto-lock)
 */

export const PBKDF2_ITERATIONS_V1 = 100000;
export const PBKDF2_ITERATIONS_V2 = 600000;

export interface EncryptedBackupPayloadV1 {
  type: 'encrypted-v1';
  salt: string;       // Format Base64
  iv: string;         // Format Base64
  ciphertext: string; // Format Base64
}

export interface EncryptedBackupPayloadV2 {
  type: 'encrypted-v2';
  iterations: number; // np. 600000
  salt: string;       // Format Base64
  iv: string;         // Format Base64
  ciphertext: string; // Format Base64
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
 * Szybkie kodowanie Base64 porcjami bez konkatenacji znak po znaku.
 * Używa String.fromCharCode.apply w blokach 32KB dla maksymalnej wydajności.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32768 bajtów
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
 * Szybkie dekodowanie Base64 do tablicy Uint8Array.
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = typeof atob === 'function' ? atob(base64) : window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derywuje niewyodrębnialny klucz AES-256 GCM CryptoKey z hasła i soli przy użyciu PBKDF2.
 * Wykonywane JEDNOKROTNIE na sesję, eliminując narzut procesora przy zapisie/odczycie.
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
    false, // extractable = false (klucz nie może zostać wyeksportowany z silnika Web Crypto)
    ['encrypt', 'decrypt']
  );
}

/**
 * Błyskawiczne szyfrowanie AES-256 GCM przy użyciu zdedukowanego klucza CryptoKey.
 * Generuje świeży, 12-bajtowy wektor IV dla każdego wywołania.
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
 * Błyskawiczne deszyfrowanie AES-256 GCM przy użyciu zdedukowanego klucza CryptoKey.
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
 * Szyfruje tekst jawny hasłem dla plików kopii zapasowej (domyślnie encrypted-v2).
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
 * Odszyfrowuje ciąg ładunku (wspiera encrypted-v1 oraz encrypted-v2) przy użyciu hasła.
 */
export async function decryptText(encryptedJsonStr: string, password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required for decryption');
  }

  let payload: {
    type?: string;
    salt?: string;
    iv?: string;
    ciphertext?: string;
    iterations?: number;
  };
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
 * Sprawdza, czy podany surowy ciąg znaków jest zaszyfrowanym ładunkiem kopii zapasowej lub bazy.
 */
export function isEncryptedBackup(rawText: string): boolean {
  try {
    const parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    return !!parsed && (parsed.type === 'encrypted-v1' || parsed.type === 'encrypted-v2') && !!parsed.ciphertext;
  } catch {
    return false;
  }
}

// ── SILNIK SZYFROWANIA LOKALNEJ BAZY DANYCH (AES-256 GCM) ──

export const STORAGE_ENC_META_KEY = 'saleplan_v3_storage_enc_meta';
const VERIFICATION_MAGIC = 'SALEPLAN_MASTER_UNLOCK_VALID_V2';

// Stan w pamięci RAM: CAŁKOWITY BRAK HASEŁ W SESSIONSTORAGE!
let inMemorySessionCryptoKey: CryptoKey | null = null;
let inMemoryMasterPassword: string | null = null;

export interface StorageEncMeta {
  enabled: boolean;
  version: 'v1' | 'v2';
  iterations: number;
  salt: string;               // Format Base64 master salt for database key derivation
  verificationToken: string;  // Zserializowany token weryfikacyjny EncryptedBackupPayload
  autoLockMinutes?: number;   // 0 = wyłączone, domyślnie 15 minut
  createdAt: string;
  updatedAt: string;
}

/**
 * Sprawdza, czy szyfrowanie lokalnej bazy danych jest aktywne na dysku.
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
 * Zwraca aktualne metadane szyfrowania StorageEncMeta lub null.
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
 * Ustawia klucz sesyjny CryptoKey w pamięci RAM.
 */
export function setSessionCryptoKey(key: CryptoKey | null): void {
  inMemorySessionCryptoKey = key;
}

/**
 * Pobiera klucz sesyjny CryptoKey z pamięci RAM.
 */
export function getSessionCryptoKey(): CryptoKey | null {
  return inMemorySessionCryptoKey;
}

/**
 * Zapisuje hasło sesyjne wyłącznie w pamięci RAM (brak zapisu na dysk lub sessionStorage).
 */
export function setSessionPassword(password: string | null): void {
  inMemoryMasterPassword = password;
  if (!password) {
    inMemorySessionCryptoKey = null;
  }
}

/**
 * Pobiera hasło sesyjne z pamięci RAM.
 */
export function getSessionPassword(): string | null {
  return inMemoryMasterPassword;
}

/**
 * Sprawdza, czy bieżąca sesja jest odblokowana i gotowa do operacji na zaszyfrowanych danych.
 */
export function isSessionUnlocked(): boolean {
  if (!isDatabaseEncryptionActive()) return true;
  return inMemorySessionCryptoKey !== null || inMemoryMasterPassword !== null;
}

export type BeforeLockHook = () => Promise<void> | void;
let beforeLockHook: BeforeLockHook | null = null;

/**
 * Rejestruje asynchroniczny hak wykonywany przed zablokowaniem sesji.
 * Używany do natychmiastowego zapisu pamięci (flush) do bazy przed zablokowaniem klucza.
 */
export function setBeforeLockHook(hook: BeforeLockHook | null): void {
  beforeLockHook = hook;
}

/**
 * Blokuje sesję programu:
 * 1. Wykonuje zarejestrowany hak przed blokadą (zapis niezapisanych zmian).
 * 2. Czyści klucze sesyjne i hasło z pamięci RAM.
 * 3. Emituje zdarzenie 'saleplan-session-locked' PO zakończeniu zapisu.
 */
export async function lockSession(): Promise<void> {
  if (beforeLockHook) {
    try {
      await beforeLockHook();
    } catch (e) {
      console.warn('Błąd podczas wykonywania flush przed zablokowaniem sesji:', e);
    }
  }
  inMemorySessionCryptoKey = null;
  inMemoryMasterPassword = null;
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('saleplan-session-locked'));
    } catch {}
  }
}

// ── MECHANIZM AUTOMATYCZNEJ BLOKADY SESJI PRZY BEZCZYNNOŚCI (AUTO-LOCK) ──

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
  return 15; // Domyślnie 15 minut bezczynności
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
    // Automatyczna blokada wyłączona
    return;
  }

  autoLockTimer = setTimeout(async () => {
    if (isDatabaseEncryptionActive() && isSessionUnlocked()) {
      await lockSession();
    }
  }, mins * 60 * 1000);
}

/**
 * Inicjalizuje globalne nasłuchiwacze aktywności na potrzeby automatycznej blokady.
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

// Inicjalizacja przy załadowaniu modułu w przeglądarce
if (typeof window !== 'undefined') {
  initAutoLockListeners();
}

/**
 * Weryfikuje hasło z zapisanymi metadanymi szyfrowania bazy.
 * Po sukcesie derywuje i zapisuje klucz CryptoKey w pamięci RAM sesji.
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const meta = getStorageEncryptionMeta();
  if (!meta || !meta.enabled) return true;
  if (!password) return false;

  try {
    // 1. Jeśli metadane zawierają sól główną i wersję v2, derywuj klucz z 600 000 iteracji
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

    // 2. Ścieżka awaryjna dla starszych metadanych v1 (100 000 iteracji)
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
 * Konfiguruje i zapisuje metadane szyfrowania bazy w formacie 'encrypted-v2'.
 * Generuje sól główną, derywuje klucz CryptoKey i tworzy token weryfikacyjny.
 */
export async function setupStorageEncryptionMeta(
  password: string,
  autoLockMinutes = 15
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const cryptoObj = getCrypto();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const saltB64 = arrayBufferToBase64(salt);

  // Derywuje główny klucz CryptoKey jednokrotnie z 600 000 iteracji
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
 * Wyłącza szyfrowanie bazy danych, czyści metadane oraz usuwa sesyjne klucze z pamięci RAM.
 */
export function removeStorageEncryptionMeta(): void {
  try {
    localStorage.removeItem(STORAGE_ENC_META_KEY);
    lockSession();
  } catch {}
}
