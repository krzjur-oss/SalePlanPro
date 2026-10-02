import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEYS,
  setStorageItem,
  getStorageItem,
  enableDatabaseEncryption,
  disableDatabaseEncryption,
  clearAllStorage,
  StorageLockedError,
  migrateAllStoredItemsToV2
} from './dbStorage';
import {
  setupStorageEncryptionMeta,
  removeStorageEncryptionMeta,
  verifyMasterPassword,
  lockSession,
  isDatabaseEncryptionActive,
  isSessionUnlocked,
  encryptText,
  PBKDF2_ITERATIONS_V1,
  PBKDF2_ITERATIONS_V2
} from '../lib/crypto';

describe('dbStorage Encryption & Rollback Tests', () => {
  beforeEach(async () => {
    // Mock minimal localStorage & sessionStorage in Node environment if missing
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

    removeStorageEncryptionMeta();
    lockSession();
    await clearAllStorage();
  });

  it('stores data encrypted as "encrypted-v2" and reads it back seamlessly when unlocked', async () => {
    const password = 'SchoolAdminPassword2026!';
    await setupStorageEncryptionMeta(password);

    const testState = {
      school: { name: 'Szkoła Testowa' },
      teachers: [{ id: 't1', first: 'Jan', last: 'Nowak', abbr: 'JN' }],
    };

    await setStorageItem(STORAGE_KEYS.APP_STATE, testState);

    // Verify raw stored item in localStorage is encrypted in v2 format
    const rawInStorage = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    expect(rawInStorage).toBeDefined();
    const parsedRaw = JSON.parse(rawInStorage!);
    expect(parsedRaw.type).toBe('encrypted-v2');
    expect(parsedRaw.iterations).toBe(PBKDF2_ITERATIONS_V2);
    expect(parsedRaw.ciphertext).toBeDefined();

    // Verify reading via getStorageItem returns cleartext
    const retrieved = await getStorageItem(STORAGE_KEYS.APP_STATE);
    expect(retrieved).toMatchObject(testState);

    // When locked, read returns null and write throws StorageLockedError
    lockSession();
    expect(isSessionUnlocked()).toBe(false);

    const readWhenLocked = await getStorageItem(STORAGE_KEYS.APP_STATE);
    expect(readWhenLocked).toBeNull();

    // Verify setStorageItem throws StorageLockedError AND does not mutate stored record
    await expect(setStorageItem(STORAGE_KEYS.APP_STATE, { school: { name: 'Zmutowana Szkoła' } }))
      .rejects.toThrow(StorageLockedError);
    expect(localStorage.getItem(STORAGE_KEYS.APP_STATE)).toBe(rawInStorage);

    // Verify unlocking session allows writing and saves encrypted v2
    const unlocked = await verifyMasterPassword(password);
    expect(unlocked).toBe(true);
    expect(isSessionUnlocked()).toBe(true);

    const updatedState = {
      school: { name: 'Szkoła Po Odblokowaniu' },
      teachers: [{ id: 't2', first: 'Anna', last: 'Kowalska', abbr: 'AK' }]
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, updatedState);

    const rawAfterUnlock = JSON.parse(localStorage.getItem(STORAGE_KEYS.APP_STATE)!);
    expect(rawAfterUnlock.type).toBe('encrypted-v2');
    expect(rawAfterUnlock.ciphertext).toBeDefined();

    const retrievedAfterUnlock = await getStorageItem(STORAGE_KEYS.APP_STATE);
    expect(retrievedAfterUnlock).toMatchObject(updatedState);
  });

  it('migrates legacy v1 stored records to v2 upon read/unlock', async () => {
    const password = 'MigrationPassword2026!';

    // Setup legacy v1 item in storage
    const testData = { name: 'Legacy Plan 2025' };
    const v1Json = await encryptText(JSON.stringify(testData), password, PBKDF2_ITERATIONS_V1);
    const parsedV1 = JSON.parse(v1Json);
    parsedV1.type = 'encrypted-v1';
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(parsedV1));

    // Setup v2 encryption meta and unlock
    await setupStorageEncryptionMeta(password);

    // Read item - should decrypt legacy v1
    const decrypted = await getStorageItem(STORAGE_KEYS.APP_STATE);
    expect(decrypted).toMatchObject(testData);

    // Migration function re-encrypts all items to v2
    const count = await migrateAllStoredItemsToV2();
    expect(count).toBeGreaterThanOrEqual(1);

    const updatedRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.APP_STATE)!);
    expect(updatedRaw.type).toBe('encrypted-v2');
    expect(updatedRaw.iterations).toBe(PBKDF2_ITERATIONS_V2);
  });

  it('enableDatabaseEncryption backs up data before migration and verifies every key', async () => {
    // 1. Initial plaintext data
    const originalAppState = { school: { name: 'Szkoła Przed Szyfrowaniem' } };
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(originalAppState));

    const password = 'NewEncryptionPassword2026!';

    // 2. Enable encryption
    await enableDatabaseEncryption(password);

    expect(isDatabaseEncryptionActive()).toBe(true);
    expect(isSessionUnlocked()).toBe(true);

    // Pre-encryption backup must be cleaned up after successful verification
    expect(localStorage.getItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP)).toBeNull();

    // Stored item is now encrypted in v2
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.APP_STATE)!);
    expect(raw.type).toBe('encrypted-v2');

    // Decrypted item matches original
    const read = await getStorageItem(STORAGE_KEYS.APP_STATE);
    expect(read).toMatchObject(originalAppState);
  });
});
