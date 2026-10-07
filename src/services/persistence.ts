// Unified Persistence & Multi-Tab State Synchronization Service
// Handles atomic-like persistence of AppState and SchedData with conflict detection

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
}

/**
 * Persists AppState and SchedData to storage with multi-tab conflict verification.
 * - SchedData is strictly cleaned of any metadata (_revision, _tabId, etc.).
 * - AppState is enriched with revision counter and tabId.
 * - Sequential write order: 1. APP_STATE, 2. SCHED_DATA, 3. STATE_META.
 * - Broadcasts committed state to other tabs.
 *
 * @returns true if saved successfully, false if conflict was detected and not forced.
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

  // Save strictly in order: 1. APP_STATE, 2. SCHED_DATA, 3. STATE_META
  await setStorageItem(STORAGE_KEYS.APP_STATE, enrichedState);
  await setStorageItem(STORAGE_KEYS.SCHED_DATA, cleanSched);
  await setStorageItem(STORAGE_KEYS.STATE_META, {
    revision: nextRev,
    tabId: multiTabStateService.getTabId(),
    updatedAt: new Date().toISOString()
  });

  multiTabStateService.setLocalRevision(nextRev, STORAGE_KEYS.APP_STATE);
  multiTabStateService.broadcastStateCommitted(STORAGE_KEYS.APP_STATE, nextRev);

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
