/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Trwałości Bazy Danych E2E (Persistence Tests)
 * Opis: Weryfikacja zapisu i odczytu konfiguracji szkoły, planu klas i sal lekcyjnych.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { AppState, SchedData, PlanVariant, SnapshotEntry } from '../types';

describe('Persistence E2E Lifecycle Tests (Cycle: Zapis -> vi.resetModules -> Odczyt)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    const { clearAllStorage } = await import('./dbStorage');
    const { removeStorageEncryptionMeta, lockSession } = await import('../lib/crypto');
    removeStorageEncryptionMeta();
    lockSession();
    await clearAllStorage();
    vi.restoreAllMocks();
  });

  const createSampleAppState = (schoolName: string = 'Liceum E2E'): AppState => ({
    yearKey: 'y_2025_2026',
    yearLabel: '2025/2026',
    school: {
      name: schoolName,
      short: 'LO E2E',
      phone: '+48 22 555 01 99',
      web: 'lo@e2e.edu.pl'
    },
    hours: ['1', '2', '3'],
    timeslots: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' }
    ],
    buildings: [{ id: 'b1', name: 'Budynek Główny' }],
    floors: [{ id: 'f0', name: 'Parter', color: '#64748b', buildingIdx: 0, segments: [] }],
    classes: [{ id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] }],
    teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
    subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#10b981' }],
    homerooms: { r_101: { className: '1A' } },
    planLekcji: {
      meta: {
        schoolName,
        year: '2025/2026',
        modifiedAt: new Date().toISOString()
      },
      hours: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' }
      ],
      classes: [{ id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] }],
      teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
      rooms: [{ id: 'r_101', name: 'Sala 101' }],
      subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#10b981' }],
      schoolGroups: [],
      assignments: [{ id: 'a1', teacherId: 't1', subjectId: 's1', classId: 'c1', roomId: 'r_101', hoursPerWeek: 1, groupId: null }],
      lessons: {
        'c1|0|0': { assignmentId: 'a1', locked: false }
      },
      specialStudents: [],
      specialAssignments: [],
      specialLessons: {},
      specialAbsences: {}
    },
    dyzury: {
      miejsca: [],
      przerwy: [],
      harmonogram: {},
      settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] }
    }
  });

  const createSampleSchedData = (): SchedData => ({
    'y_2025_2026': {
      '0': {
        'h_0': {
          'r_101': {
            className: '1A',
            teacherAbbr: 'JK',
            subject: 'Matematyka',
            classes: []
          }
        }
      }
    }
  });

  const createSampleVariants = (schedData: SchedData): PlanVariant[] => [
    {
      id: 'var_semestr_1',
      name: 'Wariant Główny Semestr I',
      tag: 'semestr_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#3b82f6',
      data: {
        lessons: {},
        schedData,
        assignments: [],
        specialLessons: {},
        specialAbsences: {},
        spePlan: { slotAssignments: [] },
        dyzury: {}
      },
      stats: {
        totalLessons: 1,
        classesCount: 1,
        teachersCount: 1,
        roomsUsedCount: 1
      }
    }
  ];

  const createSampleSnapshots = (appState: AppState, schedData: SchedData): SnapshotEntry[] => [
    {
      id: 'snap_initial_e2e',
      name: 'Snapshot Testowy E2E',
      createdAt: new Date().toISOString(),
      appState,
      schedData
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIUSZ A: Baza niezaszyfrowana
  // AppState + SchedData (niepusty) + warianty + snapshoty
  // Cykl: zapis -> reset modułów (vi.resetModules) -> odczyt
  // ─────────────────────────────────────────────────────────────────────────────
  it('Scenariusz A: baza niezaszyfrowana (zapis -> reset modułów -> odczyt)', async () => {
    // 1. Zapis przy użyciu świeżych modułów
    const {
      persistAppStateAndSchedWithConflictCheck,
      setStorageItem,
      STORAGE_KEYS
    } = await import('./persistence');

    const testAppState = createSampleAppState('Szkoła Podstawowa E2E - Scenariusz A');
    const testSchedData = createSampleSchedData();
    const testVariants = createSampleVariants(testSchedData);
    const testSnapshots = createSampleSnapshots(testAppState, testSchedData);

    const savedStateAndSched = await persistAppStateAndSchedWithConflictCheck(testAppState, testSchedData);
    expect(savedStateAndSched).toBe(true);

    await setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, testVariants);
    await setStorageItem(STORAGE_KEYS.SNAPSHOTS, testSnapshots);

    // 2. Cykl: Reset modułów
    vi.resetModules();

    // 3. Odczyt przez nowo załadowaną instancję modułów
    const freshPersistence = await import('./persistence');

    const loadedAppState = await freshPersistence.getStorageItem<AppState>(freshPersistence.STORAGE_KEYS.APP_STATE);
    const loadedSchedData = await freshPersistence.getStorageItem<SchedData>(freshPersistence.STORAGE_KEYS.SCHED_DATA);
    const loadedVariants = await freshPersistence.getStorageItem<PlanVariant[]>(freshPersistence.STORAGE_KEYS.PLAN_VARIANTS);
    const loadedSnapshots = await freshPersistence.getStorageItem<SnapshotEntry[]>(freshPersistence.STORAGE_KEYS.SNAPSHOTS);

    // Asercje AppState
    expect(loadedAppState).not.toBeNull();
    expect(loadedAppState?.school?.name).toBe('Szkoła Podstawowa E2E - Scenariusz A');
    expect(loadedAppState?.classes?.[0]?.name).toBe('1A');

    // Asercje SchedData: niepusty, zawiera dokładnie przypisania, oczyszczony z metadanych
    expect(loadedSchedData).not.toBeNull();
    const cellA = (loadedSchedData?.['y_2025_2026']?.['0']?.['h_0']?.['r_101']) as any;
    expect(cellA).toBeDefined();
    expect(cellA?.subject).toBe('Matematyka');
    expect(cellA?.className).toBe('1A');
    expect((loadedSchedData as any).revision).toBeUndefined();
    expect((loadedSchedData as any).tabId).toBeUndefined();

    // Asercje Wariantów
    expect(loadedVariants).not.toBeNull();
    expect(Array.isArray(loadedVariants)).toBe(true);
    expect(loadedVariants?.length).toBe(1);
    expect(loadedVariants?.[0]?.id).toBe('var_semestr_1');
    expect(loadedVariants?.[0]?.name).toBe('Wariant Główny Semestr I');

    // Asercje Snapshotów
    expect(loadedSnapshots).not.toBeNull();
    expect(Array.isArray(loadedSnapshots)).toBe(true);
    expect(loadedSnapshots?.length).toBe(1);
    expect(loadedSnapshots?.[0]?.id).toBe('snap_initial_e2e');
    expect(loadedSnapshots?.[0]?.name).toBe('Snapshot Testowy E2E');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIUSZ B: Baza zaszyfrowana, sesja odblokowana
  // To samo + sprawdzenie że KAŻDY z kluczy w surowej bazie ma type 'encrypted-v2'
  // Cykl: zapis -> weryfikacja surowej bazy -> reset modułów -> odblokowanie -> odczyt
  // ─────────────────────────────────────────────────────────────────────────────
  it('Scenariusz B: baza zaszyfrowana, sesja odblokowana (zapis -> raw encrypted-v2 -> reset modułów -> odczyt)', async () => {
    const cryptoModule = await import('../lib/crypto');
    const masterPassword = 'MasterE2EPassword!2026';
    await cryptoModule.setupStorageEncryptionMeta(masterPassword);

    expect(cryptoModule.isDatabaseEncryptionActive()).toBe(true);
    expect(cryptoModule.isSessionUnlocked()).toBe(true);

    const {
      persistAppStateAndSchedWithConflictCheck,
      setStorageItem,
      getRawItem,
      STORAGE_KEYS
    } = await import('./persistence');

    const testAppState = createSampleAppState('Szkoła Podstawowa E2E - Scenariusz B');
    const testSchedData = createSampleSchedData();
    const testVariants = createSampleVariants(testSchedData);
    const testSnapshots = createSampleSnapshots(testAppState, testSchedData);

    const saved = await persistAppStateAndSchedWithConflictCheck(testAppState, testSchedData);
    expect(saved).toBe(true);

    await setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, testVariants);
    await setStorageItem(STORAGE_KEYS.SNAPSHOTS, testSnapshots);

    // WERYFIKACJA SUROWEJ BAZY: KAŻDY z kluczy w surowej bazie ma type 'encrypted-v2'
    const keysToCheck = [
      STORAGE_KEYS.APP_STATE,
      STORAGE_KEYS.SCHED_DATA,
      STORAGE_KEYS.PLAN_VARIANTS,
      STORAGE_KEYS.SNAPSHOTS
    ];

    for (const key of keysToCheck) {
      const rawRecord = await getRawItem<any>(key);
      expect(rawRecord, `Surowy rekord dla klucza "${key}" musi istnieć w bazie`).not.toBeNull();
      expect(typeof rawRecord).toBe('object');
      expect(rawRecord.type, `Klucz "${key}" musi mieć type "encrypted-v2"`).toBe('encrypted-v2');
      expect(rawRecord.ciphertext, `Klucz "${key}" musi zawierać ciphertext`).toBeDefined();
      expect(rawRecord.iv, `Klucz "${key}" musi zawierać iv`).toBeDefined();
      expect(rawRecord.salt, `Klucz "${key}" musi zawierać salt`).toBeDefined();
      expect(rawRecord.iterations).toBe(cryptoModule.PBKDF2_ITERATIONS_V2);
    }

    // 2. Cykl: Reset modułów
    vi.resetModules();

    // 3. Po resecie modułów: pamięć sesji jest zresetowana (baza zaszyfrowana, sesja zablokowana)
    const freshCrypto = await import('../lib/crypto');
    const freshPersistence = await import('./persistence');

    expect(freshCrypto.isDatabaseEncryptionActive()).toBe(true);
    expect(freshCrypto.isSessionUnlocked()).toBe(false);

    // Przed odblokowaniem próba odczytu zwraca null
    const lockedApp = await freshPersistence.getStorageItem(freshPersistence.STORAGE_KEYS.APP_STATE);
    const lockedSched = await freshPersistence.getStorageItem(freshPersistence.STORAGE_KEYS.SCHED_DATA);
    expect(lockedApp).toBeNull();
    expect(lockedSched).toBeNull();

    // 4. Odblokowanie sesji poprawnym hasłem
    const unlockOk = await freshCrypto.verifyMasterPassword(masterPassword);
    expect(unlockOk).toBe(true);
    expect(freshCrypto.isSessionUnlocked()).toBe(true);

    // 5. Odczyt po odblokowaniu: dane są w 100% odzyskane
    const loadedAppState = await freshPersistence.getStorageItem<AppState>(freshPersistence.STORAGE_KEYS.APP_STATE);
    const loadedSchedData = await freshPersistence.getStorageItem<SchedData>(freshPersistence.STORAGE_KEYS.SCHED_DATA);
    const loadedVariants = await freshPersistence.getStorageItem<PlanVariant[]>(freshPersistence.STORAGE_KEYS.PLAN_VARIANTS);
    const loadedSnapshots = await freshPersistence.getStorageItem<SnapshotEntry[]>(freshPersistence.STORAGE_KEYS.SNAPSHOTS);

    expect(loadedAppState).not.toBeNull();
    expect(loadedAppState?.school?.name).toBe('Szkoła Podstawowa E2E - Scenariusz B');

    expect(loadedSchedData).not.toBeNull();
    const cellB = (loadedSchedData?.['y_2025_2026']?.['0']?.['h_0']?.['r_101']) as any;
    expect(cellB?.subject).toBe('Matematyka');
    expect((loadedSchedData as any).revision).toBeUndefined();

    expect(loadedVariants?.length).toBe(1);
    expect(loadedVariants?.[0]?.name).toBe('Wariant Główny Semestr I');

    expect(loadedSnapshots?.length).toBe(1);
    expect(loadedSnapshots?.[0]?.name).toBe('Snapshot Testowy E2E');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIUSZ C: Dwa tabId zapisują naprzemiennie
  // Konflikt wykryty, brak utraty planu sal
  // Cykl: Tab 1 zapis -> reset -> Tab 2 zapis -> reset -> Tab 1 konflikt & merge
  // ─────────────────────────────────────────────────────────────────────────────
  it('Scenariusz C: dwa tabId zapisują naprzemiennie -> konflikt wykryty, brak utraty planu sal', async () => {
    // ── KROK 1: Karta 1 zapisuje stan początkowy (Rewizja 2) ──
    const persistenceTab1 = await import('./persistence');
    const { multiTabStateService } = await import('./multiTabStateService');

    const tab1Id = multiTabStateService.getTabId();
    expect(tab1Id).toBeDefined();

    const planTab1 = createSampleSchedData();
    // Sala 101: 1A Matematyka (godzina 0)
    planTab1['y_2025_2026']['0']['h_0']['r_101'] = {
      className: '1A',
      teacherAbbr: 'JK',
      subject: 'Matematyka',
      classes: []
    };

    const stateTab1 = createSampleAppState('Szkoła Tab 1 - Pierwotna');
    const savedTab1 = await persistenceTab1.persistAppStateAndSchedWithConflictCheck(stateTab1, planTab1);
    expect(savedTab1).toBe(true);
    expect(multiTabStateService.getLocalRevision()).toBe(2);

    // ── KROK 2: Karta 2 ładuje bazę i wprowadza swoje zmiany (Rewizja 3) ──
    // Symulacja nowej karty przez reset modułów
    vi.resetModules();

    const persistenceTab2 = await import('./persistence');
    const multiTab2 = await import('./multiTabStateService');

    const tab2Id = multiTab2.multiTabStateService.getTabId();
    expect(tab2Id).not.toBe(tab1Id); // Różne tabId

    // Karta 2 wczytuje stan i plan z bazy
    const loadedStateTab2 = await persistenceTab2.getStorageItem<AppState>(persistenceTab2.STORAGE_KEYS.APP_STATE);
    const loadedPlanTab2 = await persistenceTab2.getStorageItem<SchedData>(persistenceTab2.STORAGE_KEYS.SCHED_DATA);
    expect(loadedPlanTab2).not.toBeNull();

    // Karta 2 synchronizuje swoją lokalną rewizję z bazy (Rewizja 2)
    multiTab2.multiTabStateService.setLocalRevision(2);

    // Karta 2 dodaje nową lekcję do planu sal: Sala 102: 2B Fizyka (godzina 1)
    const updatedPlanTab2: SchedData = JSON.parse(JSON.stringify(loadedPlanTab2));
    if (!updatedPlanTab2['y_2025_2026']['0']['h_1']) {
      updatedPlanTab2['y_2025_2026']['0']['h_1'] = {};
    }
    updatedPlanTab2['y_2025_2026']['0']['h_1']['r_102'] = {
      className: '2B',
      teacherAbbr: 'AN',
      subject: 'Fizyka',
      classes: []
    };

    const updatedStateTab2: AppState = {
      ...loadedStateTab2!,
      school: {
        ...loadedStateTab2!.school,
        name: 'Szkoła Po Zmianach w Karcie 2'
      }
    };

    // Karta 2 zapisuje rewizję 3
    const savedTab2 = await persistenceTab2.persistAppStateAndSchedWithConflictCheck(updatedStateTab2, updatedPlanTab2);
    expect(savedTab2).toBe(true);
    expect(multiTab2.multiTabStateService.getLocalRevision()).toBe(3);

    // ── KROK 3: Karta 1 (mając nieświadomą, starszą lokalną rewizję 2) próbuje zapisać własne zmiany ──
    vi.resetModules();

    const persistenceTab1Retry = await import('./persistence');
    const multiTab1Retry = await import('./multiTabStateService');

    // Karta 1 uważa, że jej lokalna rewizja to nadal 2
    multiTab1Retry.multiTabStateService.setLocalRevision(2);

    // Karta 1 chce dopisać inną lekcję (Sala 103: 3C Chemia)
    const planTab1Diverged: SchedData = JSON.parse(JSON.stringify(planTab1));
    if (!planTab1Diverged['y_2025_2026']['0']['h_2']) {
      planTab1Diverged['y_2025_2026']['0']['h_2'] = {};
    }
    planTab1Diverged['y_2025_2026']['0']['h_2']['r_103'] = {
      className: '3C',
      teacherAbbr: 'CK',
      subject: 'Chemia',
      classes: []
    };

    let conflictReported = false;
    let conflictDbRevision = 0;
    let conflictConflictingSched: SchedData | null = null;

    // Próba zapisu przez Kartę 1 bez wymuszenia (forceOverwrite: false)
    const saveResultTab1Conflict = await persistenceTab1Retry.persistAppStateAndSchedWithConflictCheck(
      stateTab1,
      planTab1Diverged,
      {
        forceOverwrite: false,
        onConflict: (conflict, conflictingSched) => {
          conflictReported = true;
          conflictDbRevision = conflict.dbRevision;
          conflictConflictingSched = conflictingSched;
        }
      }
    );

    // Asercja: konflikt został wykryty, zapis został zablokowany
    expect(saveResultTab1Conflict).toBe(false);
    expect(conflictReported).toBe(true);
    expect(conflictDbRevision).toBe(3);
    expect(conflictConflictingSched).not.toBeNull();

    // Weryfikacja bazy danych: baza NIE została nadpisana! Nadal znajduje się w niej stan Karty 2
    const currentDbSched = await persistenceTab1Retry.getStorageItem<any>(persistenceTab1Retry.STORAGE_KEYS.SCHED_DATA);
    expect(currentDbSched['y_2025_2026']['0']['h_1']['r_102'].subject).toBe('Fizyka');
    expect(currentDbSched['y_2025_2026']['0']['h_1']['r_102'].className).toBe('2B');

    // ── KROK 4: Karta 1 rozwiązuje konflikt i łączy plany bez utraty danych ──
    // Karta 1 pobiera stan z bazy (lub z callbacka onConflict) i scala swoje zmiany
    const mergedPlan: SchedData = JSON.parse(JSON.stringify(conflictConflictingSched || currentDbSched));
    // Dopisanie lekcji Karty 1 do najnowszej wersji z bazy
    if (!mergedPlan['y_2025_2026']['0']['h_2']) {
      mergedPlan['y_2025_2026']['0']['h_2'] = {};
    }
    mergedPlan['y_2025_2026']['0']['h_2']['r_103'] = {
      className: '3C',
      teacherAbbr: 'CK',
      subject: 'Chemia',
      classes: []
    };

    // Karta 1 aktualizuje lokalną rewizję do bazy (3) i zapisuje z nową rewizją 4
    multiTab1Retry.multiTabStateService.setLocalRevision(conflictDbRevision);

    const mergedAppState = {
      ...stateTab1,
      school: {
        ...stateTab1.school,
        name: 'Szkoła Po Scaleniu Karty 1 i 2'
      }
    };

    const saveMergedSuccess = await persistenceTab1Retry.persistAppStateAndSchedWithConflictCheck(
      mergedAppState,
      mergedPlan,
      false
    );
    expect(saveMergedSuccess).toBe(true);
    expect(multiTab1Retry.multiTabStateService.getLocalRevision()).toBe(4);

    // ── KROK 5: Ostateczna weryfikacja bazy po ponownym resecie modułów ──
    vi.resetModules();

    const finalPersistence = await import('./persistence');
    const finalSched = await finalPersistence.getStorageItem<any>(finalPersistence.STORAGE_KEYS.SCHED_DATA);
    const finalState = await finalPersistence.getStorageItem<AppState>(finalPersistence.STORAGE_KEYS.APP_STATE);

    expect(finalState?.school?.name).toBe('Szkoła Po Scaleniu Karty 1 i 2');
    expect(finalSched).not.toBeNull();

    // Sprawdzenie, że ŻADNA lekcja nie została utracona:
    // 1. Lekcja początkowa (1A Matematyka w Sala 101)
    expect(finalSched['y_2025_2026']['0']['h_0']['r_101'].subject).toBe('Matematyka');
    expect(finalSched['y_2025_2026']['0']['h_0']['r_101'].className).toBe('1A');

    // 2. Lekcja dodana przez Kartę 2 (2B Fizyka w Sala 102)
    expect(finalSched['y_2025_2026']['0']['h_1']['r_102'].subject).toBe('Fizyka');
    expect(finalSched['y_2025_2026']['0']['h_1']['r_102'].className).toBe('2B');

    // 3. Lekcja dodana przez Kartę 1 po rozwiązaniu konfliktu (3C Chemia w Sala 103)
    expect(finalSched['y_2025_2026']['0']['h_2']['r_103'].subject).toBe('Chemia');
    expect(finalSched['y_2025_2026']['0']['h_2']['r_103'].className).toBe('3C');

    // Meta-rekord bazy odnotowuje rewizję 4
    const finalMeta = await finalPersistence.getStorageItem<any>(finalPersistence.STORAGE_KEYS.STATE_META);
    expect(finalMeta?.revision).toBe(4);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIUSZ D: Przedwczesne zamknięcie strony / beforeunload przy aktywnym szyfrowaniu
  // Wymóg: wywołanie handlera beforeunload nie powoduje, że w localStorage[APP_STATE]
  // i [SCHED_DATA] pojawia się jawny tekst (np. nazwa szkoły), a w IndexedDB rekord
  // nadal ma type 'encrypted-v2'.
  // ─────────────────────────────────────────────────────────────────────────────
  it('Scenariusz D: przy aktywnym szyfrowaniu wywołanie handlera beforeunload nie zapisuje jawnego tekstu do localStorage, a w IndexedDB rekord ma type "encrypted-v2"', async () => {
    const cryptoModule = await import('../lib/crypto');
    const masterPassword = 'MasterE2EPassword!2026';
    await cryptoModule.setupStorageEncryptionMeta(masterPassword);

    expect(cryptoModule.isDatabaseEncryptionActive()).toBe(true);
    expect(cryptoModule.isSessionUnlocked()).toBe(true);

    const persistence = await import('./persistence');
    const secretSchoolName = 'Liceum Ogólnokształcące Ściśle Tajne';
    const testAppState = createSampleAppState(secretSchoolName);
    const testSchedData = createSampleSchedData();

    // 1. Zapis początkowy
    const initialSaved = await persistence.persistAppStateAndSchedWithConflictCheck(testAppState, testSchedData);
    expect(initialSaved).toBe(true);

    // 2. Bezpośrednie wywołanie writeSyncMirror musi zostać odrzucone
    const mirrorStateRes = persistence.writeSyncMirror(persistence.STORAGE_KEYS.APP_STATE, testAppState);
    const mirrorSchedRes = persistence.writeSyncMirror(persistence.STORAGE_KEYS.SCHED_DATA, testSchedData);
    expect(mirrorStateRes).toBe(false);
    expect(mirrorSchedRes).toBe(false);

    // 3. Symulacja handlera beforeunload z App.tsx:
    // - Sprawdza czy szyfrowanie jest aktywne -> NIE zapisuje do localStorage jawnego tekstu
    // - Wykonuje asynchroniczny zapis persistAppStateAndSchedWithConflictCheck(..., { forceOverwrite: false })
    if (!cryptoModule.isDatabaseEncryptionActive()) {
      persistence.writeSyncMirror(persistence.STORAGE_KEYS.APP_STATE, testAppState);
      persistence.writeSyncMirror(persistence.STORAGE_KEYS.SCHED_DATA, testSchedData);
    }

    const unloadSaveSuccess = await persistence.persistAppStateAndSchedWithConflictCheck(
      testAppState,
      testSchedData,
      { forceOverwrite: false }
    );
    expect(unloadSaveSuccess).toBe(true);

    // 4. Weryfikacja localStorage: ŻADEN jawny tekst (nazwa szkoły, przedmioty) nie może tam trafić
    const localAppState = localStorage.getItem(persistence.STORAGE_KEYS.APP_STATE);
    const localSchedData = localStorage.getItem(persistence.STORAGE_KEYS.SCHED_DATA);

    if (localAppState !== null) {
      expect(localAppState).not.toContain(secretSchoolName);
      const parsedLocalState = JSON.parse(localAppState);
      expect(parsedLocalState.type).toBe('encrypted-v2');
      expect(parsedLocalState.ciphertext).toBeDefined();
    }
    if (localSchedData !== null) {
      expect(localSchedData).not.toContain('Matematyka');
      const parsedLocalSched = JSON.parse(localSchedData);
      expect(parsedLocalSched.type).toBe('encrypted-v2');
      expect(parsedLocalSched.ciphertext).toBeDefined();
    }

    // 5. Weryfikacja IndexedDB: rekord w bazie danych ma nadal type 'encrypted-v2' i nie zawiera jawnego tekstu
    const rawIdbState = await persistence.getRawItem<any>(persistence.STORAGE_KEYS.APP_STATE);
    expect(rawIdbState).not.toBeNull();
    expect(rawIdbState.type).toBe('encrypted-v2');
    expect(rawIdbState.ciphertext).toBeDefined();
    expect(JSON.stringify(rawIdbState)).not.toContain(secretSchoolName);

    const rawIdbSched = await persistence.getRawItem<any>(persistence.STORAGE_KEYS.SCHED_DATA);
    expect(rawIdbSched).not.toBeNull();
    expect(rawIdbSched.type).toBe('encrypted-v2');
    expect(rawIdbSched.ciphertext).toBeDefined();
    expect(JSON.stringify(rawIdbSched)).not.toContain('Matematyka');

    // 6. Odczyt po odszyfrowaniu zwraca pełne, poprawne dane
    const decryptedState = await persistence.getStorageItem<AppState>(persistence.STORAGE_KEYS.APP_STATE);
    expect(decryptedState?.school?.name).toBe(secretSchoolName);

    const decryptedSched = await persistence.getStorageItem<any>(persistence.STORAGE_KEYS.SCHED_DATA);
    expect(decryptedSched['y_2025_2026']['0']['h_0']['r_101'].subject).toBe('Matematyka');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIUSZ E: Import planu w karcie A -> karta B dostaje baner odświeżenia
  // Wymóg: Ścieżka importu/przywracania używa persistAppStateAndSchedWithConflictCheck
  // z { forceOverwrite: true }, co inkrementuje rewizję, aktualizuje STATE_META
  // i rozgłasza komunikat STATE_COMMITTED przez BroadcastChannel 'saleplan-state'.
  // Karta B z niższą rewizją otrzymuje powiadomienie i włącza baner odświeżenia (showRefreshBanner).
  // ─────────────────────────────────────────────────────────────────────────────
  it('Scenariusz E: import planu w karcie A -> karta B dostaje baner odświeżenia', async () => {
    // 1. Inicjalizacja Karta B (otwarta karta z lokalną rewizją 1)
    const { MultiTabStateService } = await import('./multiTabStateService');
    const persistence = await import('./persistence');

    const tabBService = new MultiTabStateService();
    tabBService.setLocalRevision(1);
    expect(tabBService.getLocalRevision()).toBe(1);

    // Karta B subskrybuje zdarzenia z magistrali 'saleplan-state' tak jak w App.tsx (useEffect)
    let showRefreshBannerInTabB = false;
    let remoteRevisionInTabB = 0;

    const unsubTabB = tabBService.subscribe((msg) => {
      if (msg.type === 'STATE_COMMITTED') {
        const localRev = tabBService.getLocalRevision();
        if (msg.revision > localRev) {
          remoteRevisionInTabB = msg.revision;
          showRefreshBannerInTabB = true;
        }
      }
    });

    // Przed importem baner nie jest widoczny
    expect(showRefreshBannerInTabB).toBe(false);

    // 2. Karta A wykonuje import planu (z { forceOverwrite: true })
    const importedSchoolName = 'Liceum Ogólnokształcące Po Nowym Imporcie';
    const importedAppState = createSampleAppState(importedSchoolName);
    const importedSchedData = createSampleSchedData();

    importedSchedData['y_2025_2026']['0']['h_2'] = {
      r_105: {
        className: '4A',
        teacherAbbr: 'MN',
        subject: 'Informatyka',
        classes: []
      }
    };

    const importSuccess = await persistence.persistAppStateAndSchedWithConflictCheck(
      importedAppState,
      importedSchedData,
      { forceOverwrite: true }
    );
    expect(importSuccess).toBe(true);

    // Oczekiwanie na rozgłoszenie wiadomości przez BroadcastChannel
    await new Promise(resolve => setTimeout(resolve, 50));

    // 3. Weryfikacja: Karta B dostała powiadomienie i włączyła baner odświeżenia!
    expect(showRefreshBannerInTabB).toBe(true);
    expect(remoteRevisionInTabB).toBeGreaterThan(1);

    // 4. Weryfikacja bazy danych: rewizja i STATE_META zostały zaktualizowane
    const stateMeta = await persistence.getStorageItem<any>(persistence.STORAGE_KEYS.STATE_META);
    expect(stateMeta).not.toBeNull();
    expect(stateMeta.revision).toBe(remoteRevisionInTabB);

    // 5. Karta B może teraz kliknąć „Wczytaj” i pobrać zaktualizowany plan bez żadnych strat
    const loadedState = await persistence.getStorageItem<AppState>(persistence.STORAGE_KEYS.APP_STATE);
    const loadedSched = await persistence.getStorageItem<any>(persistence.STORAGE_KEYS.SCHED_DATA);

    expect(loadedState?.school?.name).toBe(importedSchoolName);
    expect(loadedSched['y_2025_2026']['0']['h_2']['r_105'].subject).toBe('Informatyka');

    unsubTabB();
  });
});
