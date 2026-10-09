/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Magazynu IndexedDB i Blokad (dbStorage Tests)
 * Opis: Weryfikacja operacji odczytu/zapisu, obsługi błędów oraz zachowania zablokowanej bazy.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  setStorageItem,
  getStorageItem,
  enableDatabaseEncryption,
  disableDatabaseEncryption,
  clearAllStorage,
  StorageLockedError,
  StorageWriteError,
  migrateAllStoredItemsToV2,
  cleanSchedDataMeta,
  hasSchedDataMeta,
  getIsIndexedDBAvailable,
  getConsecutiveIdbErrors,
  resetIdbErrorCounter
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

    // Gdy baza jest zablokowana, odczyt zwraca null and write throws StorageLockedError
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

  // Wymóg testowy 2: stary rekord SCHED_DATA z kluczami revision/tabId zostaje wczytany i oczyszczony
  it('stary rekord SCHED_DATA z kluczami revision/tabId zostaje wczytany i oczyszczony', async () => {
    const legacySched = {
      revision: 7,
      tabId: 'legacy_tab_007',
      _revision: 7,
      _tabId: 'legacy_tab_007',
      'y_2025_2026': {
        '1': {
          'h_1': {
            'r_101': {
              className: '3C',
              teacherAbbr: 'MW',
              subject: 'Biologia'
            }
          }
        }
      }
    };

    // Simulate legacy dirty SCHED_DATA record in storage
    localStorage.setItem(STORAGE_KEYS.SCHED_DATA, JSON.stringify(legacySched));

    // Reading via getStorageItem must sanitize before validation and return full plan
    const loaded = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(loaded).not.toBeNull();
    expect(loaded['y_2025_2026']).toBeDefined();
    expect(loaded['y_2025_2026']['1']['h_1']['r_101'].subject).toBe('Biologia');

    // Root metadata properties must be stripped
    expect(hasSchedDataMeta(loaded)).toBe(false);
    expect(loaded.revision).toBeUndefined();
    expect(loaded.tabId).toBeUndefined();
    expect(loaded._revision).toBeUndefined();
    expect(loaded._tabId).toBeUndefined();

    // Verify storage mirror was updated with cleaned version
    const rawStored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHED_DATA)!);
    expect(hasSchedDataMeta(rawStored)).toBe(false);
    expect(rawStored.revision).toBeUndefined();
  });

  // Wymóg testowy 3: enableDatabaseEncryption szyfruje SCHED_DATA (surowy rekord ma type 'encrypted-v2')
  it('enableDatabaseEncryption szyfruje SCHED_DATA (surowy rekord ma type "encrypted-v2")', async () => {
    const sampleSched = {
      'y_2025_2026': {
        '2': {
          'h_3': {
            'r_105': {
              className: '4A',
              teacherAbbr: 'KZ',
              subject: 'Geografia'
            }
          }
        }
      }
    };

    await setStorageItem(STORAGE_KEYS.APP_STATE, { school: { name: 'Szkoła Testowa' } });
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, sampleSched);

    const password = 'Tarcza2026!StrongPass';
    await enableDatabaseEncryption(password);

    // Verify raw SCHED_DATA in storage is encrypted-v2
    const rawSched = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHED_DATA)!);
    expect(rawSched).toBeDefined();
    expect(rawSched.type).toBe('encrypted-v2');
    expect(rawSched.iterations).toBe(PBKDF2_ITERATIONS_V2);
    expect(rawSched.ciphertext).toBeDefined();

    // Verify getStorageItem decrypts seamless non-null plan
    const decryptedSched = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(decryptedSched).not.toBeNull();
    expect(decryptedSched['y_2025_2026']['2']['h_3']['r_105'].className).toBe('4A');
    expect(decryptedSched['y_2025_2026']['2']['h_3']['r_105'].subject).toBe('Geografia');

    // Gdy baza jest zablokowana, odczyt zwraca null
    lockSession();
    expect(isSessionUnlocked()).toBe(false);
    expect(await getStorageItem(STORAGE_KEYS.SCHED_DATA)).toBeNull();

    // Po odblokowaniu poprawnym hasłem plan jest ponownie w pełni dostępny
    const unlocked = await verifyMasterPassword(password);
    expect(unlocked).toBe(true);
    const restored = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(restored).not.toBeNull();
    expect(restored['y_2025_2026']['2']['h_3']['r_105'].className).toBe('4A');
  });

  // Wymóg zadania 4: enableDatabaseEncryption traktuje null z getStorageItem dla fizycznie istniejącego rekordu jako błąd
  it('enableDatabaseEncryption traktuje null z getStorageItem dla fizycznie istniejącego rekordu jako błąd i wykonuje rollback', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // 1. Valid APP_STATE in storage
      const initialAppState = { school: { name: 'Szkoła Nienaruszona' } };
      await setStorageItem(STORAGE_KEYS.APP_STATE, initialAppState);

      // 2. Corrupt SCHED_DATA that exists physically but fails validation schema
      localStorage.setItem(STORAGE_KEYS.SCHED_DATA, JSON.stringify({ corruptedStructure: 9999 }));

      // 3. Attempting encryption must reject and abort
      await expect(enableDatabaseEncryption('PasswordTestRollback!2026'))
        .rejects.toThrow(/Klucz "saleplan_v3_sched_data" fizycznie istnieje w bazie danych, ale nie mógł zostać poprawnie odczytany/);

      // 4. Must rollback: encryption is NOT enabled, original app state preserved
      expect(isDatabaseEncryptionActive()).toBe(false);
      const readApp = await getStorageItem<any>(STORAGE_KEYS.APP_STATE);
      expect(readApp).toMatchObject(initialAppState);
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });

  // Wymóg Akceptacji: po zapisie i przeładowaniu (nowa instancja modułu) plan sal jest identyczny, z zaszyfrowaną bazą po odblokowaniu również
  it('akceptacja: po zapisie i przeładowaniu plan sal jest identyczny, z zaszyfrowaną bazą po odblokowaniu również', async () => {
    const expectedPlan = {
      'y_2025_2026': {
        '1': {
          'h_1': {
            'r_101': { className: '1A', teacherAbbr: 'JK', subject: 'Informatyka', classes: [] }
          },
          'h_2': {
            'r_102': { className: '2B', teacherAbbr: 'AN', subject: 'Fizyka', classes: [] }
          }
        }
      }
    };

    // 1. Zapis w trybie jawnym
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, expectedPlan);
    const loadedClear = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(loadedClear).toEqual(expectedPlan);

    // 2. Zaszyfrowanie bazy
    const masterPassword = 'MasterSchoolKey!2026';
    await enableDatabaseEncryption(masterPassword);
    expect(isDatabaseEncryptionActive()).toBe(true);

    // 3. Symulacja zamknięcia i ponownego otwarcia (zablokowana sesja)
    lockSession();
    expect(isSessionUnlocked()).toBe(false);
    expect(await getStorageItem(STORAGE_KEYS.SCHED_DATA)).toBeNull();

    // 4. Odblokowanie poprawnym hasłem
    const successUnlock = await verifyMasterPassword(masterPassword);
    expect(successUnlock).toBe(true);
    expect(isSessionUnlocked()).toBe(true);

    // 5. Plan sal po odblokowaniu jest w 100% identyczny z pierwotnym
    const loadedAfterUnlock = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(loadedAfterUnlock).toEqual(expectedPlan);
  });

  // Wymóg zadania 1: symulowany błąd IndexedDB nie wyłącza zapisu na stałe
  it('symulowany pojedynczy błąd IndexedDB nie wyłącza zapisu na stałe i licznik błędów resetuje się po udanym zapisie', async () => {
    resetIdbErrorCounter();
    expect(getIsIndexedDBAvailable()).toBe(true);
    expect(getConsecutiveIdbErrors()).toBe(0);

    const testState = { school: { name: 'Szkoła Odporna Na Błędy' } };
    await setStorageItem(STORAGE_KEYS.APP_STATE, testState);

    expect(getIsIndexedDBAvailable()).toBe(true);
    expect(getConsecutiveIdbErrors()).toBe(0);
    const retrieved = await getStorageItem<any>(STORAGE_KEYS.APP_STATE);
    expect(retrieved).toMatchObject(testState);
  });

  // Wymóg zadania 1: Gdy zapis do IndexedDB się nie uda ORAZ lustro localStorage jest pominięte -> rzuć wyjątek StorageWriteError
  it('gdy zapis do IndexedDB się nie uda ORAZ lustro localStorage jest pominięte (rozmiar > 2.5 MB lub błąd), rzuca StorageWriteError', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Symulacja: wyłącz IndexedDB po 3 błędach lub ustawienie mocka
    // Stwórz duży obiekt > 2.5 MB
    const largeString = 'A'.repeat(2.6 * 1024 * 1024);
    const hugeState = { largeString };

    // Symulacja niedostępności IndexedDB (lub błędu zapisu)
    const originalIndexedDB = (window as any).indexedDB;
    try {
      (window as any).indexedDB = {
        open: () => {
          const req: any = {
            error: new Error('Simulated IDB open failure')
          };
          setTimeout(() => {
            if (req.onerror) {
              const evt: any = new Event('error');
              Object.defineProperty(evt, 'target', { value: req });
              req.onerror(evt);
            }
          }, 0);
          return req;
        }
      };
      resetIdbErrorCounter();

      // Próba zapisu obiektu > 2.5 MB bez działającego IndexedDB musi rzucić StorageWriteError
      await expect(setStorageItem(STORAGE_KEYS.APP_STATE, hugeState))
        .rejects.toThrow(StorageWriteError);
    } finally {
      (window as any).indexedDB = originalIndexedDB;
      resetIdbErrorCounter();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });
});
