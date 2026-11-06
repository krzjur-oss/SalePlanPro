import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SWUpdateBanner } from './SWUpdateBanner';

describe('SWUpdateBanner Component Tests', () => {
  let mockPostMessage: any;
  let mockRegistration: any;
  let controllerChangeListeners: ((evt: Event) => void)[] = [];
  let originalReload: any;

  beforeEach(() => {
    mockPostMessage = vi.fn();
    controllerChangeListeners = [];

    originalReload = window.location.reload;
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    mockRegistration = {
      waiting: {
        postMessage: mockPostMessage
      },
      installing: null,
      addEventListener: vi.fn()
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'controllerchange') {
            controllerChangeListeners.push(handler);
          }
        }),
        removeEventListener: vi.fn((event: string, handler: any) => {
          if (event === 'controllerchange') {
            controllerChangeListeners = controllerChangeListeners.filter(h => h !== handler);
          }
        }),
        controller: {}
      }
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { ...window.location, reload: originalReload }
    });
    vi.restoreAllMocks();
  });

  it('controllerchange NIE przeładowuje strony jeśli użytkownik nie kliknął aktualizacji', async () => {
    render(<SWUpdateBanner />);

    // Czekamy na pojawienie się banera
    await waitFor(() => {
      expect(screen.getByText(/Dostępna nowa wersja/i)).toBeDefined();
    });

    // Symulacja zdarzenia controllerchange (np. w tle lub z innej karty)
    for (const listener of controllerChangeListeners) {
      listener(new Event('controllerchange'));
    }

    // window.location.reload NIE powinien zostać wywołany
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('kliknięcie Odśwież wywołuje flush przed SKIP_WAITING, a po kliknięciu controllerchange przeładowuje stronę', async () => {
    let flushCalled = false;
    let postMessageCalledAfterFlush = false;

    const mockFlush = vi.fn().mockImplementation(async () => {
      flushCalled = true;
      // Krótkie opóźnienie, aby sprawdzić sekwencyjność
      await new Promise(r => setTimeout(r, 10));
    });

    mockPostMessage.mockImplementation((msg: any) => {
      if (flushCalled) {
        postMessageCalledAfterFlush = true;
      }
    });

    render(<SWUpdateBanner flush={mockFlush} />);

    await waitFor(() => {
      expect(screen.getByText(/Dostępna nowa wersja/i)).toBeDefined();
    });

    const refreshBtn = screen.getByRole('button', { name: /odśwież/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFlush).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalled();
      expect(postMessageCalledAfterFlush).toBe(true);
    });

    // Teraz, po kliknięciu użytkownika, controllerchange powinien przeładować stronę
    for (const listener of controllerChangeListeners) {
      listener(new Event('controllerchange'));
    }

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
