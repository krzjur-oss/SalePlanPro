/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Zunifikowana Warstwa Trwałości Danych (Persistence Layer)
 * Opis: Sekwencyjny i bezpieczny zapis AppState oraz SchedData z detekcją konfliktów równoległej edycji.
 */

import {
  STORAGE_KEYS,
  setStorageItem,
  getStorageItem,
  getRawItem,
  cleanSchedDataMeta,
  writeSyncMirror,
  StorageLockedError,
  StorageWriteError
} from './dbStorage';
import {
  multiTabStateService,
  ConflictCheckResult
} from './multiTabStateService';
import { AppState, SchedData } from '../types';

export interface PersistOptions {
  forceOverwrite?: boolean;
  baseRevision?: number;
  onConflict?: (conflict: ConflictCheckResult, conflictingSched: SchedData | null) => void;
  tabLabel?: string;
  activeSection?: string;
  activeSectionName?: string;
}

/**
 * Zapisuje AppState oraz SchedData do bazy danych z weryfikacją konfliktów wielu kart.
 * - SchedData jest oczyszczana z wszelkich metadanych (_revision, _tabId itp.).
 * - AppState otrzymuje rosnący numer rewizji oraz identyfikator karty tabId.
 * - Ścisła kolejność zapisu: 1. APP_STATE, 2. SCHED_DATA, 3. STATE_META.
 * - Rozgłasza zatwierdzony stan do pozostałych otwartych kart.
 *
 * @returns true w przypadku sukcesu zapisu, false jeśli wykryto konflikt.
 */
export async function persistAppStateAndSchedWithConflictCheck(
  targetAppState: AppState,
  targetSchedData: SchedData,
  options?: PersistOptions | boolean
): Promise<boolean> {
  const opts: PersistOptions = typeof options === 'boolean'
    ? { forceOverwrite: options }
    : (options || {});

  const currentLocalRev = multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE);

  if (!opts.forceOverwrite) {
    const conflict = await multiTabStateService.checkSaveConflict(STORAGE_KEYS.APP_STATE, currentLocalRev);
    if (conflict.hasConflict) {
      let conflictingSched: SchedData | null = null;
      try {
        conflictingSched = await getStorageItem<SchedData>(STORAGE_KEYS.SCHED_DATA);
        if (conflictingSched) {
          conflictingSched = cleanSchedDataMeta(conflictingSched);
        }
      } catch {}

      if (opts.onConflict) {
        opts.onConflict(conflict, conflictingSched);
      }
      return false;
    }
  }

  const baseRev = Math.max(currentLocalRev, opts.baseRevision || 0);
  const nextRev = baseRev + 1;
  const enrichedState = multiTabStateService.enrichWithRevision(targetAppState, nextRev);
  const cleanSched = cleanSchedDataMeta(targetSchedData);

  const ctx = multiTabStateService.getTabContext();
  const tabLabel = opts.tabLabel || ctx.tabLabel;
  const activeSection = opts.activeSection || ctx.section;
  const activeSectionName = opts.activeSectionName || ctx.sectionName;

  // Save strictly in order: 1. APP_STATE, 2. SCHED_DATA, 3. STATE_META
  await setStorageItem(STORAGE_KEYS.APP_STATE, enrichedState);
  await setStorageItem(STORAGE_KEYS.SCHED_DATA, cleanSched);
  await setStorageItem(STORAGE_KEYS.STATE_META, {
    revision: nextRev,
    tabId: multiTabStateService.getTabId(),
    updatedAt: new Date().toISOString(),
    tabLabel,
    activeSection,
    activeSectionName
  });

  multiTabStateService.setLocalRevision(nextRev, STORAGE_KEYS.APP_STATE);
  multiTabStateService.broadcastStateCommitted(STORAGE_KEYS.APP_STATE, nextRev, {
    tabLabel,
    activeSection,
    activeSectionName
  });

  return true;
}

// Re-export common storage primitives for convenience
export {
  STORAGE_KEYS,
  setStorageItem,
  getStorageItem,
  getRawItem,
  cleanSchedDataMeta,
  writeSyncMirror,
  StorageLockedError,
  StorageWriteError
};
