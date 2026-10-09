import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
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

describe('App Smoke & Security State Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    removeStorageEncryptionMeta();
    lockSession();
    await clearAllStorage();
    vi.restoreAllMocks();
    localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, JSON.stringify({ accepted: true, version: '3.9.9' }));
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, '3.9.9');
  });

  it('renders App cleanly in unencrypted mode (smoke test)', async () => {
    const rendered = render(<App />);
    expect(rendered.container).toBeDefined();
    const headerTitle = await screen.findByText(/SalePlan Pro/i);
    expect(headerTitle).toBeDefined();
  });

  it('przełączenie zakładki nie zapisuje przy zablokowanej bazie', async () => {
    // 1. Setup active encryption and then lock the session
    const password = 'TestMasterPassword2026!';
    await setupStorageEncryptionMeta(password);
    lockSession();

    expect(isDatabaseEncryptionActive()).toBe(true);
    expect(isSessionUnlocked()).toBe(false);

    // Spy on setStorageItem to verify NO state persistence occurs while locked
    const setStorageSpy = vi.spyOn(dbStorage, 'setStorageItem');

    // 2. Render App in locked state
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
      expect(screen.getByText(/Krytyczny błąd bazy danych/i)).toBeDefined();
      expect(screen.getByText(/Spróbuj ponownie/i)).toBeDefined();

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

    render(<App />);

    // Wait until storage is fully initialized and app ready
    await waitFor(() => {
      expect(document.querySelector('[data-storage-ready="true"]')).not.toBeNull();
    });

    const input = await screen.findByPlaceholderText(/np\. Szkoła Podstawowa nr 15/i, {}, { timeout: 5000 });
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

    // Wait for the locked screen to be rendered in the DOM
    await waitFor(() => {
      expect(screen.getByText(/Baza danych jest zablokowana/i)).toBeDefined();
    });

    // W storage powinna być zaktualizowana wartość dzięki flush przed blokadą
    const savedAfterFlush = await getStorageItem<any>(STORAGE_KEYS.APP_STATE);
    expect(savedAfterFlush?.school?.name).toBe('Szkoła Zapisana Przez Flush');
  });

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
});
