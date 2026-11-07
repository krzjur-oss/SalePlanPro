/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Integracyjne Aplikacji (App Smoke & Security Tests)
 * Opis: Weryfikacja zachowania aplikacji, odblokowania sesji, blokady bazy danych i migracji.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, within, act, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { 
  STORAGE_KEYS, 
  clearAllStorage, 
  setStorageItem,
  getStorageItem,
  getRawItem,
  setSessionStoragePassword
} from './services/dbStorage';
import * as dbStorage from './services/dbStorage';
import { 
  setupStorageEncryptionMeta, 
  removeStorageEncryptionMeta, 
  lockSession,
  isDatabaseEncryptionActive,
  isSessionUnlocked
} from './lib/crypto';
import { resetStoragePersistFlag } from './services/persistence';

describe('App Smoke & Security State Tests', () => {
  beforeEach(async () => {
    resetStoragePersistFlag();
    localStorage.clear();
    sessionStorage.clear();
    removeStorageEncryptionMeta();
    lockSession();
    await clearAllStorage();
    vi.restoreAllMocks();
    localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, JSON.stringify({ accepted: true, version: '3.12.0' }));
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, '3.12.0');
  });

  it('renders App cleanly in unencrypted mode (smoke test)', async () => {
    const rendered = render(<App />);
    expect(rendered.container).toBeDefined();
    const headerTitle = await screen.findByText(/SalePlan Pro/i);
    expect(headerTitle).toBeDefined();
  });

  it('przełączenie zakładki nie zapisuje przy zablokowanej bazie', async () => {
    // 1. Konfiguracja aktywnego szyfrowania i zablokowanie sesji
    const password = 'TestMasterPassword2026!';
    await setupStorageEncryptionMeta(password);
    lockSession();

    expect(isDatabaseEncryptionActive()).toBe(true);
    expect(isSessionUnlocked()).toBe(false);

    // Spy on setStorageItem to verify NO state persistence occurs while locked
    const setStorageSpy = vi.spyOn(dbStorage, 'setStorageItem');

    // 2. Renderowanie aplikacji w stanie zablokowanym
    render(<App />);

    // 3. UnlockScreen gate should be displayed
    const unlockHeading = await screen.findByText(/Baza danych jest zablokowana/i);
    expect(unlockHeading).toBeDefined();
    expect(screen.getByText(/Odblokuj aplikację/i)).toBeDefined();

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // 4. Verify that setStorageItem was NEVER called for APP_STATE or SCHED_DATA
    const appStateCalls = setStorageSpy.mock.calls.filter(
      call => call[0] === STORAGE_KEYS.APP_STATE || call[0] === STORAGE_KEYS.SCHED_DATA
    );
    expect(appStateCalls.length).toBe(0);

    // 5. Simulate attempting a tab switch event / session locked state
    await act(async () => {
      window.dispatchEvent(new CustomEvent('saleplan-session-locked'));
    });

    // Verify still no writes occurred
    const callsAfterEvent = setStorageSpy.mock.calls.filter(
      call => call[0] === STORAGE_KEYS.APP_STATE || call[0] === STORAGE_KEYS.SCHED_DATA
    );
    expect(callsAfterEvent.length).toBe(0);
  });

  // Wymóg zadania: wczytaj app z danymi, zmień jedną rzecz, przesuń zegar o 1,3 s -> w IndexedDB jest nowa wartość
  it('wczytaj app z danymi, zmień jedną rzecz, przesuń zegar o 1,3 s -> w IndexedDB jest nowa wartość', async () => {
    const initialAppState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: { name: 'Szkoła Przed Edycją', short: 'SPE' },
      hours: ['1', '2'],
      timeslots: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' }
      ],
      classes: [],
      teachers: [],
      subjects: [],
      homerooms: {},
      planLekcji: { classes: [], teachers: [], rooms: [], assignments: [], lessons: {} },
      dyzury: { miejsca: [], przerwy: [], harmonogram: {}, settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] } }
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, initialAppState);
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, {});

    await act(async () => {
      render(<App />);
    });

    // Wait for KreatorSzkoly lazy load and populate school name input
    const input = await screen.findByPlaceholderText(/np\. Szkoła Podstawowa nr 15/i, {}, { timeout: 5000 });
    expect((input as HTMLInputElement).value).toBe('Szkoła Przed Edycją');

    // Zmień jedną rzecz: wprowadź nową nazwę szkoły i kliknij Zapisz i Przejdź Dalej
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Liceum Po Edycji 2026' } });
    });

    const nextBtn = screen.getByText(/Zapisz i Przejdź Dalej/i);
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Przesuń zegar o 1,3 s (1300 ms) aby wyzwolić debounced save
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1300));
    });

    // W IndexedDB / storage jest nowa wartość
    const saved = await getStorageItem<any>(STORAGE_KEYS.APP_STATE);
    expect(saved?.school?.name).toBe('Liceum Po Edycji 2026');
  });

  // Wymóg zadania: po błędzie initStorage widoczny jest baner i brak zapisów
  it('po błędzie initStorage widoczny jest baner i brak zapisów', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Symulacja błędu podczas inicjalizacji bazy danych
    vi.spyOn(dbStorage, 'migrateFromLocalStorage').mockRejectedValueOnce(new Error('Krytyczny błąd bazy danych'));
    const setStorageSpy = vi.spyOn(dbStorage, 'setStorageItem');

    try {
      render(<App />);

      // Widoczny jest baner błędu z przyciskiem Spróbuj ponownie
      const banner = await screen.findByTestId('storage-init-error-banner');
      expect(banner).toBeDefined();
      expect(within(banner).getByText(/Krytyczny błąd bazy danych/i)).toBeDefined();
      expect(within(banner).getByText(/Spróbuj ponownie/i)).toBeDefined();

      // Brak zapisów do bazy danych
      const appStateWrites = setStorageSpy.mock.calls.filter(
        call => call[0] === STORAGE_KEYS.APP_STATE || call[0] === STORAGE_KEYS.SCHED_DATA
      );
      expect(appStateWrites.length).toBe(0);

      // Oczekiwanie na upłynięcie ewentualnych timerów - zapis nadal nie występuje
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });
      const appStateWritesAfter = setStorageSpy.mock.calls.filter(
        call => call[0] === STORAGE_KEYS.APP_STATE || call[0] === STORAGE_KEYS.SCHED_DATA
      );
      expect(appStateWritesAfter.length).toBe(0);
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });

  it('gdy baza nie jest zaszyfrowana a rekord jest uszkodzony, pokazuje modal i nie nadpisuje automatycznie', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Zapisz uszkodzony rekord SCHED_DATA bezpośrednio w localStorage (liczba zamiast recordu dni/godzin)
      localStorage.setItem(STORAGE_KEYS.SCHED_DATA, JSON.stringify({ invalidStructure: 12345 }));

      await act(async () => {
        render(<App />);
      });

      const modal = await screen.findByTestId('corrupt-data-modal');
      expect(modal).toBeDefined();
      expect(screen.getByText(/Wykryto uszkodzone dane w pamięci/i)).toBeDefined();
      expect(screen.getByText(/Eksportuj surowe dane/i)).toBeDefined();
      expect(screen.getByText(/Zastąp nowym stanem/i)).toBeDefined();
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });

  // Wymóg zadania 2: auto-blokada nie traci zmian z ostatniej sekundy
  it('auto-blokada przed lockSession wykonuje flush niezapisanych zmian z ostatniej sekundy', async () => {
    const initialAppState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: { name: 'Szkoła Przed Blokadą', short: 'SPB' },
      hours: ['1', '2'],
      timeslots: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' }
      ],
      classes: [],
      teachers: [],
      subjects: [],
      homerooms: {},
      planLekcji: { classes: [], teachers: [], rooms: [], assignments: [], lessons: {} },
      dyzury: { miejsca: [], przerwy: [], harmonogram: {}, settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] } }
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, initialAppState);
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, {});

    await act(async () => {
      render(<App />);
    });

    // Wait until storage is fully initialized and app ready
    await waitFor(() => {
      expect(document.querySelector('[data-storage-ready="true"]')).not.toBeNull();
    });

    const input = await screen.findByPlaceholderText(/np\. Szkoła Podstawowa nr 15/i, {}, { timeout: 10000 });
    expect((input as HTMLInputElement).value).toBe('Szkoła Przed Blokadą');

    // Edycja danych tuż przed blokadą (bez czekania na 1300 ms debounced save)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Szkoła Zapisana Przez Flush' } });
    });
    const nextBtn = screen.getByText(/Zapisz i Przejdź Dalej/i);
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Śledź emisję zdarzenia saleplan-session-locked
    let sessionLockedEventFired = false;
    window.addEventListener('saleplan-session-locked', () => {
      sessionLockedEventFired = true;
    }, { once: true });

    // Wywołaj lockSession() - powinien natychmiast wykonać flush stateRef.current i dopiero potem zablokować
    await act(async () => {
      await lockSession();
    });

    expect(sessionLockedEventFired).toBe(true);

    // Oczekiwanie na wyrenderowanie ekranu blokady w DOM
    await waitFor(() => {
      expect(screen.getByText(/Baza danych jest zablokowana/i)).toBeDefined();
    });

    // W storage powinna być zaktualizowana wartość dzięki flush przed blokadą
    const savedAfterFlush = await getStorageItem<any>(STORAGE_KEYS.APP_STATE);
    expect(savedAfterFlush?.school?.name).toBe('Szkoła Zapisana Przez Flush');
  }, 15000);

  // Wymóg zadania 4: PRE_ENCRYPTION_BACKUP
  it('PRE_ENCRYPTION_BACKUP: gdy szyfrowanie nieaktywne, pyta czy przywrócić z kopii i przywraca', async () => {
    const backupData = {
      [STORAGE_KEYS.APP_STATE]: {
        school: { name: 'Szkoła Z Przywróconej Kopii' }
      }
    };
    localStorage.setItem(
      STORAGE_KEYS.PRE_ENCRYPTION_BACKUP,
      JSON.stringify({ data: backupData, timestamp: new Date().toISOString() })
    );

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Wykryto kopię zapasową danych z nieukończonej próby szyfrowania')
      );
    });

    // Wait for storage ready after restoration
    await waitFor(() => {
      expect(document.querySelector('[data-storage-ready="true"]')).not.toBeNull();
    });

    // Kopia powinna zostać usunięta po przywróceniu
    await waitFor(async () => {
      const backupAfter = await getRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
      expect(backupAfter).toBeNull();
    });
  });

  it('beforeunload ustawia event.returnValue gdy saveStatus !== "saved", a visibilitychange wywołuje flushNow', async () => {
    const initialAppState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: { name: 'Szkoła Test Unload' },
      hours: ['1'],
      timeslots: [{ num: 1, start: '08:00', end: '08:45' }],
      classes: [],
      teachers: [],
      subjects: [],
      homerooms: {},
      planLekcji: { classes: [], teachers: [], rooms: [], assignments: [], lessons: {} },
      dyzury: { miejsca: [], przerwy: [], harmonogram: {}, settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] } }
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, initialAppState);
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, {});

    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-storage-ready="true"]')).not.toBeNull();
    });

    const input = await screen.findByPlaceholderText(/np\. Szkoła Podstawowa nr 15/i);

    // 1. Zmiana stanu powoduje przejście saveStatus do 'dirty'
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Szkoła Zmiana Nieutrwalona' } });
    });
    const nextBtn = screen.getByText(/Zapisz i Przejdź Dalej/i);
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // 2. Wysłanie zdarzenia beforeunload przy saveStatus !== 'saved'
    const beforeUnloadEvt = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvt);

    // W jsdom event.defaultPrevented jest ustawiane na true, a event.returnValue jest zdefiniowane
    expect(beforeUnloadEvt.defaultPrevented).toBe(true);
    expect(beforeUnloadEvt.returnValue).toBeDefined();

    // 3. Wywołanie visibilitychange (hidden) wywołuje flushNow natychmiast
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    });
    document.dispatchEvent(new Event('visibilitychange'));

    // Weryfikacja, że dane zostały zapisane
    await waitFor(async () => {
      const saved = await getStorageItem<any>(STORAGE_KEYS.APP_STATE);
      expect(saved?.school?.name).toBe('Szkoła Zmiana Nieutrwalona');
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });
  });

  it('wywołuje navigator.storage.persist() po pierwszym udanym zapisie', async () => {
    const persistMock = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', {
      value: {
        persist: persistMock,
        estimate: vi.fn().mockResolvedValue({ usage: 5000, quota: 10000000 })
      },
      configurable: true,
      writable: true
    });

    const initialAppState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: { name: 'Szkoła Test Persist', short: 'STP' },
      hours: ['1'],
      timeslots: [{ num: 1, start: '08:00', end: '08:45' }],
      classes: [],
      teachers: [],
      subjects: [],
      homerooms: {},
      planLekcji: { classes: [], teachers: [], rooms: [], assignments: [], lessons: {} },
      dyzury: { miejsca: [], przerwy: [], harmonogram: {}, settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] } }
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, initialAppState);
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, {});

    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-storage-ready="true"]')).not.toBeNull();
    });

    // Wymuszenie flushNow
    await act(async () => {
      if ((window as any).__saleplanFlushNow) {
        await (window as any).__saleplanFlushNow();
      }
    });

    expect(persistMock).toHaveBeenCalled();
  });

  it('przerzedza wersje autozapisu zachowując maksymalnie 3 z godziny oraz 1 ze starszych dób', async () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    const currentBase = new Date(now);
    currentBase.setMinutes(30, 0, 0);
    const hourBase = currentBase.getTime();

    // 1. Dodaj 5 wersji z tej samej godziny (minuty 30, 29, 28, 27, 26 - powinny zostać tylko 3 najnowsze)
    for (let i = 0; i < 5; i++) {
      const ts = hourBase - (i * 60 * 1000);
      await setStorageItem(`autosave_${ts}`, {
        id: `autosave-${ts}`,
        timestamp: new Date(ts).toISOString(),
        appState: { school: { name: `Wersja Godzina ${i}` } },
        schedData: {}
      });
    }

    // 2. Dodaj 3 wersje ze wczoraj (starsze niż 24h) - powinna zostać tylko 1 najnowsza
    const yesterdayBase = hourBase - oneDay - (2 * oneHour);
    for (let i = 0; i < 3; i++) {
      const ts = yesterdayBase - (i * 60 * 1000);
      await setStorageItem(`autosave_${ts}`, {
        id: `autosave-${ts}`,
        timestamp: new Date(ts).toISOString(),
        appState: { school: { name: `Wersja Wczoraj ${i}` } },
        schedData: {}
      });
    }

    render(<App />);

    await waitFor(async () => {
      const allKeys = await dbStorage.getAllStorageKeys();
      const autosaveKeys = allKeys.filter(k => k.startsWith('autosave_'));
      // Z bieżącej godziny zostają 3, a z doby wczorajszej zostaje 1 -> łącznie 4
      expect(autosaveKeys.length).toBe(4);
    });
  });
});
