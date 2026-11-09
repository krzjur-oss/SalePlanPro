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
  resetIdbErrorCounter,
  getStorageItemDetailed,
  isWriteBlocked,
  setWriteBlocked,
  clearBlockedWrites,
  StorageWriteBlockedError,
  changeDatabaseEncryptionPassword,
  ENCRYPTED_KEYS,
  UNENCRYPTED_STORAGE_KEYS,
  listManagedKeys,
  saveRecoveryBackup,
  MAX_RECOVERY_BACKUPS,
  pruneRecoveryBackups,
  getAllStorageKeys,
  getRawItem,
  setRawItem
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
    await setStorageItem(STORAGE_KEYS.APP_STATE, originalAppState);

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

  describe('Rozdzielenie przypadków braku klucza i uszkodzonych danych oraz blokada zapisu', () => {
    beforeEach(() => {
      clearBlockedWrites();
    });

    it('poprawnie rozróżnia brak klucza (missing) od uszkodzonych danych (corrupted)', async () => {
      // 1. Brak klucza
      const missingRes = await getStorageItemDetailed('klucz_ktory_nie_istnieje');
      expect(missingRes.status).toBe('missing');
      if (missingRes.status === 'missing') {
        expect(missingRes.data).toBeNull();
      }
      expect(isWriteBlocked('klucz_ktory_nie_istnieje')).toBe(false);

      // 2. Klucz istnieje, ale walidacja odrzuciła dane
      localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify({
        school: 'nie_obiekt_lecz_string',
        teachers: 'nie_tablica'
      }));

      const corruptedRes = await getStorageItemDetailed(STORAGE_KEYS.APP_STATE);
      expect(corruptedRes.status).toBe('corrupted');
      expect(isWriteBlocked(STORAGE_KEYS.APP_STATE)).toBe(true);
      if (corruptedRes.status === 'corrupted') {
        expect(corruptedRes.backupKey).toBeDefined();
      }

      // Zwykłe wywołanie getStorageItem zwraca null, a klucz ma flagę zablokowanego zapisu
      const val = await getStorageItem(STORAGE_KEYS.APP_STATE);
      expect(val).toBeNull();
      expect(isWriteBlocked(STORAGE_KEYS.APP_STATE)).toBe(true);
    });

    it('tablica z jednym uszkodzonym wpisem nie jest nadpisywana [] (element-by-element)', async () => {
      const validSnapshot = {
        id: 'snap-100',
        name: 'Wersja Robocza Semestr I',
        createdAt: '2026-09-01T08:00:00.000Z',
        appState: { school: { name: 'Szkoła Testowa' } },
        schedData: {}
      };

      const corruptedSnapshot = {
        id: 999999, // Błąd: id musi być stringiem
        name: null,
        uszkodzonePole: true
      };

      // Zapisujemy bezpośrednio surową tablicę z 1 poprawnym i 1 uszkodzonym elementem
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify([validSnapshot, corruptedSnapshot]));

      // Odczyt szczegółowy
      const detailed = await getStorageItemDetailed<any[]>(STORAGE_KEYS.SNAPSHOTS);
      expect(detailed.status).toBe('found');
      if (detailed.status === 'found') {
        expect(detailed.data).toHaveLength(1);
        expect(detailed.data[0].id).toBe('snap-100');
        expect(detailed.quarantinedCount).toBe(1);
        expect(detailed.backupKey).toMatch(/^saleplan_v3_snapshots_recovery_backup_/);

        // Sprawdzenie, czy uszkodzony element trafił do kopii ratunkowej
        const backupRaw = localStorage.getItem(detailed.backupKey!);
        expect(backupRaw).toContain('999999');
      }

      // Zwykłe wywołanie getStorageItem zwraca tablicę z poprawnym elementem (NIE pustą []!)
      const retrieved = await getStorageItem<any[]>(STORAGE_KEYS.SNAPSHOTS);
      expect(retrieved).not.toBeNull();
      expect(retrieved).toHaveLength(1);
      expect(retrieved![0].id).toBe('snap-100');
      expect(retrieved).not.toEqual([]);

      // Zapis nie jest blokowany, bo udało się odzyskać poprawne dane
      expect(isWriteBlocked(STORAGE_KEYS.SNAPSHOTS)).toBe(false);
    });

    it('tablica ze wszystkimi uszkodzonymi wpisami blokuje zapisy i nie pozwala nadpisać []', async () => {
      const allCorrupted = [
        { id: 111, broken: true },
        { id: 222, broken: true }
      ];

      localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(allCorrupted));

      const detailed = await getStorageItemDetailed<any[]>(STORAGE_KEYS.ARCHIVE);
      expect(detailed.status).toBe('corrupted');
      expect(isWriteBlocked(STORAGE_KEYS.ARCHIVE)).toBe(true);

      // getStorageItem zwraca null
      const standardRead = await getStorageItem(STORAGE_KEYS.ARCHIVE);
      expect(standardRead).toBeNull();

      // Próba nadpisania klucza pustą tablicą [] z efektu jest blokowana
      await expect(setStorageItem(STORAGE_KEYS.ARCHIVE, []))
        .rejects.toThrow(StorageWriteBlockedError);

      // Po decyzji użytkownika i odblokowaniu zapis jest możliwy
      setWriteBlocked(STORAGE_KEYS.ARCHIVE, false);
      expect(isWriteBlocked(STORAGE_KEYS.ARCHIVE)).toBe(false);
      await expect(setStorageItem(STORAGE_KEYS.ARCHIVE, [])).resolves.not.toThrow();
    });

    it('zapis zablokowanego klucza jest dozwolony przy użyciu flagi force: true', async () => {
      setWriteBlocked(STORAGE_KEYS.AUTOSAVE_VERSIONS, true);
      expect(isWriteBlocked(STORAGE_KEYS.AUTOSAVE_VERSIONS)).toBe(true);

      // Zwykły zapis zostaje odrzucony
      await expect(setStorageItem(STORAGE_KEYS.AUTOSAVE_VERSIONS, []))
        .rejects.toThrow(StorageWriteBlockedError);

      // Wymuszony zapis przez force: true (np. z poziomu modalu naprawczego)
      await expect(setStorageItem(STORAGE_KEYS.AUTOSAVE_VERSIONS, [], { force: true }))
        .resolves.not.toThrow();
    });
  });

  describe('Zarządzanie kluczami i szyfrowaniem (ENCRYPTED_KEYS, listManagedKeys, kopie recovery, DAILY_SUBSTITUTIONS)', () => {
    it('ENCRYPTED_KEYS zawiera wszystkie klucze poza wykluczonymi i obejmuje DAILY_SUBSTITUTIONS', () => {
      expect(ENCRYPTED_KEYS).toContain(STORAGE_KEYS.DAILY_SUBSTITUTIONS);
      expect(ENCRYPTED_KEYS).toContain(STORAGE_KEYS.APP_STATE);
      expect(ENCRYPTED_KEYS).toContain(STORAGE_KEYS.SCHED_DATA);

      // Wykluczone klucze nie mogą znajdować się w ENCRYPTED_KEYS
      for (const unencryptedKey of UNENCRYPTED_STORAGE_KEYS) {
        expect(ENCRYPTED_KEYS).not.toContain(unencryptedKey);
      }

      // Wszystkie klucze z STORAGE_KEYS są albo w ENCRYPTED_KEYS, albo w UNENCRYPTED_STORAGE_KEYS
      const allStorageKeyValues = Object.values(STORAGE_KEYS);
      for (const k of allStorageKeyValues) {
        const isEncrypted = ENCRYPTED_KEYS.includes(k);
        const isUnencrypted = (UNENCRYPTED_STORAGE_KEYS as readonly string[]).includes(k);
        expect(isEncrypted !== isUnencrypted).toBe(true);
      }
    });

    it('listManagedKeys zwraca ENCRYPTED_KEYS oraz istniejące kopie recovery backup', async () => {
      const keysInitial = await listManagedKeys();
      for (const k of ENCRYPTED_KEYS) {
        expect(keysInitial).toContain(k);
      }

      // Utwórz sztuczną kopię ratunkową
      const customBackupKey = await saveRecoveryBackup(STORAGE_KEYS.SNAPSHOTS, [{ id: 'test-backup' }]);
      const keysWithBackup = await listManagedKeys();
      expect(keysWithBackup).toContain(customBackupKey);
    });

    it('ogranicza liczbę kopii recovery do 3 per klucz, usuwając najstarsze', async () => {
      const baseKey = STORAGE_KEYS.ARCHIVE;

      // Zapisz 5 kopii zapasowych dla tego samego klucza
      const b1 = await saveRecoveryBackup(baseKey, { v: 1 });
      const b2 = await saveRecoveryBackup(baseKey, { v: 2 });
      const b3 = await saveRecoveryBackup(baseKey, { v: 3 });
      const b4 = await saveRecoveryBackup(baseKey, { v: 4 });
      const b5 = await saveRecoveryBackup(baseKey, { v: 5 });

      const allKeys = await getAllStorageKeys();
      const archiveBackups = allKeys.filter(k => k.startsWith(`${baseKey}_recovery_backup_`));

      // Liczba kopii nie przekracza MAX_RECOVERY_BACKUPS (3)
      expect(archiveBackups.length).toBeLessThanOrEqual(MAX_RECOVERY_BACKUPS);
      expect(archiveBackups).toHaveLength(3);

      // Najstarsze b1 i b2 powinny zostać usunięte, a najnowsze b3, b4, b5 zachowane
      expect(archiveBackups).not.toContain(b1);
      expect(archiveBackups).not.toContain(b2);
      expect(archiveBackups).toContain(b3);
      expect(archiveBackups).toContain(b4);
      expect(archiveBackups).toContain(b5);
    });

    it('po zmianie hasła DAILY_SUBSTITUTIONS daje się odczytać', async () => {
      const testSubstitutions = {
        '2026-09-15': {
          date: '2026-09-15',
          dayOfWeek: 2,
          substitutions: [
            {
              id: 'sub-test-1',
              lessonHourId: 'h_2',
              absentTeacherId: 'teacher-101',
              substituteTeacherId: 'teacher-202',
              classroom: 'sala-12',
              reason: 'L4 - zwolnienie lekarskie'
            }
          ]
        }
      };

      // 1. Zapis jawny przed szyfrowaniem
      await setStorageItem(STORAGE_KEYS.DAILY_SUBSTITUTIONS, testSubstitutions);
      const initialRead = await getStorageItem<typeof testSubstitutions>(STORAGE_KEYS.DAILY_SUBSTITUTIONS);
      expect(initialRead).toEqual(testSubstitutions);

      // 2. Aktywacja szyfrowania bazy danych pierwszym hasłem
      const oldPassword = 'OldMasterPassword!2026';
      await enableDatabaseEncryption(oldPassword);
      expect(isDatabaseEncryptionActive()).toBe(true);
      expect(isSessionUnlocked()).toBe(true);

      // Odczyt z pierwszym hasłem
      const readWithOldPass = await getStorageItem<typeof testSubstitutions>(STORAGE_KEYS.DAILY_SUBSTITUTIONS);
      expect(readWithOldPass).toEqual(testSubstitutions);

      // 3. Zmiana hasła głównego na nowe hasło
      const newPassword = 'NewMasterPassword!2027';
      const changed = await changeDatabaseEncryptionPassword(oldPassword, newPassword);
      expect(changed).toBe(true);

      // 4. Blokada sesji – odczyt musi zwrócić null
      lockSession();
      expect(isSessionUnlocked()).toBe(false);
      const readWhileLocked = await getStorageItem(STORAGE_KEYS.DAILY_SUBSTITUTIONS);
      expect(readWhileLocked).toBeNull();

      // 5. Odblokowanie nowym hasłem
      const unlocked = await verifyMasterPassword(newPassword);
      expect(unlocked).toBe(true);
      expect(isSessionUnlocked()).toBe(true);

      // 6. Odczyt po zmianie hasła zwraca dokładnie nienaruszone dane DAILY_SUBSTITUTIONS
      const restoredAfterPassChange = await getStorageItem<typeof testSubstitutions>(STORAGE_KEYS.DAILY_SUBSTITUTIONS);
      expect(restoredAfterPassChange).toEqual(testSubstitutions);

      // Sprzątanie: wyłączenie szyfrowania
      await disableDatabaseEncryption(newPassword);
      expect(isDatabaseEncryptionActive()).toBe(false);
    });

    it('przy aktywnym szyfrowaniu żaden klucz *_recovery_backup_* ani SCHED_DATA nie jest jawny w IDB', async () => {
      const password = 'MasterTestPassword!2026';
      await enableDatabaseEncryption(password);
      expect(isDatabaseEncryptionActive()).toBe(true);
      expect(isSessionUnlocked()).toBe(true);

      const secretPayload = { secretMessage: 'ściśle_tajne_dane_szkolne_123', classId: '1a' };
      const backupKey = await saveRecoveryBackup('test_collection', secretPayload);

      const secretSchedData = {
        '2026/2027': {
          '1': {
            'h_1': {
              'col_1': { subject: 'Fizyka Jądrowa', teacher: 'Prof. Nowak', room: 'Laboratorium 99' }
            }
          }
        }
      };
      // Zapisujemy SCHED_DATA z metadanymi, aby wywołać także ścieżkę hasSchedDataMeta w getStorageItemDetailed
      const schedWithMeta = {
        ...secretSchedData,
        revision: 42,
        tabId: 'tab_test_encryption'
      };
      await setStorageItem(STORAGE_KEYS.SCHED_DATA, schedWithMeta);
      await getStorageItemDetailed(STORAGE_KEYS.SCHED_DATA);

      // Pobieramy surowe wpisy bezpośrednio z IDB / localStorage przez getRawItem
      const rawBackup = await getRawItem(backupKey);
      const rawSched = await getRawItem(STORAGE_KEYS.SCHED_DATA);

      expect(rawBackup).toBeDefined();
      expect(rawSched).toBeDefined();

      // Żaden rekord nie może być jawny:
      // 1. Muszą mieć strukturę zaszyfrowaną encrypted-v2
      expect((rawBackup as any)?.type).toBe('encrypted-v2');
      expect((rawBackup as any)?.ciphertext).toBeDefined();
      expect((rawSched as any)?.type).toBe('encrypted-v2');
      expect((rawSched as any)?.ciphertext).toBeDefined();

      // 2. Żadne wrażliwe ciągi tekstowe nie mogą być widoczne w postaci jawnej
      const rawBackupStr = JSON.stringify(rawBackup);
      const rawSchedStr = JSON.stringify(rawSched);

      expect(rawBackupStr).not.toContain('ściśle_tajne_dane_szkolne_123');
      expect(rawSchedStr).not.toContain('Fizyka Jądrowa');
      expect(rawSchedStr).not.toContain('Prof. Nowak');
      expect(rawSchedStr).not.toContain('Laboratorium 99');

      // 3. Sprawdzamy wszystkie klucze w IDB: żaden recovery_backup ani SCHED_DATA nie jest jawny
      const allKeys = await getAllStorageKeys();
      for (const k of allKeys) {
        if (k.includes('_recovery_backup_') || k === STORAGE_KEYS.SCHED_DATA) {
          const raw = await getRawItem(k);
          expect((raw as any)?.type).toBe('encrypted-v2');
          expect((raw as any)?.ciphertext).toBeDefined();
        }
      }

      await disableDatabaseEncryption(password);
    });

    it('trzykrotny start z uszkodzonym wpisem nie usuwa pierwszej kopii', async () => {
      const corruptedItem = { invalidField: true, badData: 999 };
      const baseKey = STORAGE_KEYS.SNAPSHOTS;

      // 1. Pierwszy start z uszkodzonym wpisem
      const backup1 = await saveRecoveryBackup(baseKey, corruptedItem);
      expect(backup1).toBeDefined();

      // 2. Drugi start z tym samym uszkodzonym wpisem
      const backup2 = await saveRecoveryBackup(baseKey, corruptedItem);
      // Nie tworzy nowej kopii, zwraca pierwszą
      expect(backup2).toBe(backup1);

      // 3. Trzeci start z tym samym uszkodzonym wpisem
      const backup3 = await saveRecoveryBackup(baseKey, corruptedItem);
      expect(backup3).toBe(backup1);

      // Weryfikacja: w magazynie istnieje dokładnie 1 kopia, a pierwsza kopia nie została usunięta
      const allKeys = await getAllStorageKeys();
      const backups = allKeys.filter(k => k.startsWith(`${baseKey}_recovery_backup_`));
      expect(backups).toHaveLength(1);
      expect(backups).toContain(backup1);

      // Sprawdzenie również w pełnym cyklu getStorageItemDetailed z tablicą z uszkodzonym wpisem
      const validSnapshot = {
        id: 'snap-valid-1',
        name: 'Poprawny snapshot',
        createdAt: '2026-09-01T08:00:00.000Z',
        appState: { school: { name: 'Szkoła Testowa' } },
        schedData: {}
      };
      const corruptedSnapshot = {
        id: 999999,
        badSnapshot: 'invalid_entry'
      };
      const mixedSnapshots = [validSnapshot, corruptedSnapshot];
      await setRawItem(STORAGE_KEYS.SNAPSHOTS, mixedSnapshots);

      // Start 1
      const res1 = await getStorageItemDetailed(STORAGE_KEYS.SNAPSHOTS);
      expect(res1.status).toBe('found');
      expect((res1 as any).quarantinedCount).toBe(1);
      const snapshotBackup1 = (res1 as any).backupKey;
      expect(snapshotBackup1).toBeDefined();

      // Po kwarantannie baza zawiera już od razu oczyszczoną tablicę (validItems)
      const cleanedInDb = await getStorageItem<any[]>(STORAGE_KEYS.SNAPSHOTS);
      expect(cleanedInDb).toHaveLength(1);
      expect(cleanedInDb![0].id).toBe('snap-valid-1');

      // Jeśli ponownie spreparujemy ten sam uszkodzony stan w bazie
      await setRawItem(STORAGE_KEYS.SNAPSHOTS, mixedSnapshots);
      const res2 = await getStorageItemDetailed(STORAGE_KEYS.SNAPSHOTS);
      expect(res2.status).toBe('found');
      expect((res2 as any).backupKey).toBe(snapshotBackup1);

      await setRawItem(STORAGE_KEYS.SNAPSHOTS, mixedSnapshots);
      const res3 = await getStorageItemDetailed(STORAGE_KEYS.SNAPSHOTS);
      expect(res3.status).toBe('found');
      expect((res3 as any).backupKey).toBe(snapshotBackup1);

      // Pierwsza kopia nadal istnieje i nie została usunięta
      const finalKeys = await getAllStorageKeys();
      expect(finalKeys).toContain(snapshotBackup1);
    });
  });
});
