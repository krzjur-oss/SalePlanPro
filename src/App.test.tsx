import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';
import { 
  STORAGE_KEYS, 
  clearAllStorage, 
  setStorageItem
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
  });

  it('renders App cleanly in unencrypted mode (smoke test)', async () => {
    let rendered: ReturnType<typeof render> | undefined;
    await act(async () => {
      rendered = render(<App />);
    });

    expect(rendered?.container).toBeDefined();
    // App header or main title is present
    const headerTitle = screen.getByText(/SalePlan Pro/i);
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
    await act(async () => {
      render(<App />);
    });

    // 3. UnlockScreen gate should be displayed
    const unlockHeading = screen.getByText(/Baza danych jest zablokowana/i);
    expect(unlockHeading).toBeDefined();
    expect(screen.getByText(/Odblokuj aplikację/i)).toBeDefined();

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
});
