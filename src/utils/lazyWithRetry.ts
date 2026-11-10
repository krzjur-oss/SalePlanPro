/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Bezpieczne Leniwe Ładowanie Komponentów (lazyWithRetry)
 * Opis: Automatyczne ponawianie prób importu modułów dynamicznych w razie przerw w sieci
 * lub aktualizacji aplikacji w tle (zapobiega błędowi "Failed to fetch dynamically imported module").
 */

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';

const RELOAD_KEY = 'saleplan_chunk_reload_lock';

/**
 * Opakowuje React.lazy z mechanizmem automatycznego ponawiania prób pobrania modułu.
 * W przypadku awarii sieci lub przeładowania zasobów po wdrożeniu nowej wersji,
 * funkcja ponawia próbę lub jednokrotnie przeładowuje stronę, by pobrać świeże chunki.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 2,
  interval = 400
): LazyExoticComponent<T> {
  return lazy(async (): Promise<{ default: T }> => {
    let currentInterval = interval;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await componentImport();
        // Po udanym pobraniu czyścimy blokadę przeładowania
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(RELOAD_KEY);
        }
        return module;
      } catch (error: any) {
        const isLastAttempt = attempt === retries;
        const isChunkError =
          error?.message?.includes('Failed to fetch dynamically imported module') ||
          error?.message?.includes('Loading chunk') ||
          error?.message?.includes('error loading dynamically imported module') ||
          error?.name === 'ChunkLoadError';

        if (!isLastAttempt) {
          await new Promise((resolve) => setTimeout(resolve, currentInterval));
          currentInterval *= 1.5;
          continue;
        }

        // Jeśli wyczerpano próby, a błąd dotyczy nieaktualnego chunka po nowym buildzie/restarcie dev serwera:
        if (isChunkError && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
          const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
          if (!alreadyReloaded) {
            sessionStorage.setItem(RELOAD_KEY, 'true');
            console.warn('[SalePlan Pro] Wykryto brakujący chunk modułu po aktualizacji. Automatyczne odświeżenie strony...');
            window.location.reload();
            // Zwracamy oczekujący promise, aby React nie rzucał błędu w trakcie odświeżania okna
            return new Promise<{ default: T }>(() => {});
          }
        }

        console.error('[SalePlan Pro] Błąd dynamicznego importu modułu po próbach ponowienia:', error);
        throw error;
      }
    }
    throw new Error('[SalePlan Pro] Nieoczekiwany stan podczas ładowania modułu');
  });
}
