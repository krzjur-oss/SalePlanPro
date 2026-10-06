import { describe, it, expect, beforeEach } from 'vitest';
import {
  multiTabStateService,
  persistAppStateAndSchedWithConflictCheck,
  MULTI_TAB_STATE_CHANNEL
} from './multiTabStateService';
import type { AppState, SchedData } from '../types';
import { STORAGE_KEYS, setStorageItem, getStorageItem, cleanSchedDataMeta, hasSchedDataMeta } from './dbStorage';

describe('multiTabStateService Multi-Tab Conflict & Revision Tests', () => {
  beforeEach(() => {
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
  });

  it('assigns unique tabId and extracts revision and tabId correctly', () => {
    const tabId = multiTabStateService.getTabId();
    expect(tabId).toBeDefined();
    expect(tabId.startsWith('tab_')).toBe(true);

    const enriched = multiTabStateService.enrichWithRevision({ name: 'Test Plan' }, 5, 'tab_custom_1');
    expect(enriched.revision).toBe(5);
    expect(enriched.tabId).toBe('tab_custom_1');

    expect(multiTabStateService.extractRevision(enriched)).toBe(5);
    expect(multiTabStateService.extractTabId(enriched)).toBe('tab_custom_1');

    // Legacy fallback tolerance
    expect(multiTabStateService.extractRevision({ _revision: 9 })).toBe(9);
    expect(multiTabStateService.extractTabId({ _tabId: 'legacy_tab' })).toBe('legacy_tab');
  });

  it('duplikacja karty / ponowne załadowanie z persisted=true generuje nowe tabId (nie używa sessionStorage)', () => {
    const originalTabId = multiTabStateService.getTabId();
    expect(originalTabId).toBeDefined();

    // Verify sessionStorage is not populated with tabId
    expect(sessionStorage.getItem('saleplan_tab_id')).toBeNull();

    // Simulate pageshow with persisted=true (bfcache restore)
    const pageshowEvent = new Event('pageshow') as any;
    pageshowEvent.persisted = true;
    window.dispatchEvent(pageshowEvent);

    const refreshedTabId = multiTabStateService.getTabId();
    expect(refreshedTabId).not.toBe(originalTabId);
    expect(refreshedTabId.startsWith('tab_')).toBe(true);

    // Regenerate tabId produces another unique ID
    const manualRegen = multiTabStateService.regenerateTabId();
    expect(manualRegen).not.toBe(refreshedTabId);
    expect(manualRegen.startsWith('tab_')).toBe(true);
  });

  it('tracks local revision independently', () => {
    multiTabStateService.setLocalRevision(10, STORAGE_KEYS.APP_STATE);
    expect(multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE)).toBe(10);
  });

  it('detects save conflict when database has a newer revision saved by another tab', async () => {
    const myTabId = multiTabStateService.getTabId();
    const otherTabId = 'tab_other_window_999';

    // Simulate other tab saving revision 4 in IndexedDB/storage
    const otherTabState = {
      school: { name: 'Szkoła Po Zmianach w Karcie B' },
      revision: 4,
      tabId: otherTabId,
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, otherTabState);

    // My tab is at revision 2
    multiTabStateService.setLocalRevision(2, STORAGE_KEYS.APP_STATE);

    const check = await multiTabStateService.checkSaveConflict(STORAGE_KEYS.APP_STATE, 2);
    expect(check.hasConflict).toBe(true);
    expect(check.dbRevision).toBe(4);
    expect(check.dbTabId).toBe(otherTabId);
    expect(check.localRevision).toBe(2);
  });

  it('does NOT flag conflict when database revision is from the same tab', async () => {
    const myTabId = multiTabStateService.getTabId();

    const mySavedState = {
      school: { name: 'Szkoła Moja' },
      revision: 3,
      tabId: myTabId,
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, mySavedState);

    // My tab is saving next revision 4
    multiTabStateService.setLocalRevision(3, STORAGE_KEYS.APP_STATE);

    const check = await multiTabStateService.checkSaveConflict(STORAGE_KEYS.APP_STATE, 3);
    expect(check.hasConflict).toBe(false);
  });

  it('does NOT flag conflict when database revision is older or equal', async () => {
    const otherTabId = 'tab_older_window';

    const olderState = {
      school: { name: 'Starszy Stan' },
      revision: 1,
      tabId: otherTabId
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, olderState);

    multiTabStateService.setLocalRevision(2, STORAGE_KEYS.APP_STATE);

    const check = await multiTabStateService.checkSaveConflict(STORAGE_KEYS.APP_STATE, 2);
    expect(check.hasConflict).toBe(false);
  });

  // Wymóg testowy 1: zapis przez persistAppStateAndSchedWithConflictCheck -> getStorageItem(SCHED_DATA) zwraca pełny, niepusty plan (nie null)
  it('zapis przez persistAppStateAndSchedWithConflictCheck -> getStorageItem(SCHED_DATA) zwraca pełny, niepusty plan (nie null)', async () => {
    multiTabStateService.setLocalRevision(1, STORAGE_KEYS.APP_STATE);

    const sampleAppState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: { name: 'Liceum Ogólnokształcące Nr 1' },
      hours: ['08:00', '08:55'],
    };

    const sampleSchedData = {
      'y_2025_2026': {
        '1': {
          'h_1': {
            'r_101': {
              className: '1A',
              teacherAbbr: 'JK',
              subject: 'Matematyka'
            }
          }
        }
      }
    };

    const saved = await persistAppStateAndSchedWithConflictCheck(sampleAppState as unknown as AppState, sampleSchedData as unknown as SchedData);
    expect(saved).toBe(true);

    // getStorageItem for SCHED_DATA must return full non-null object passing SchedDataSchema
    const retrievedSched = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(retrievedSched).not.toBeNull();
    expect(retrievedSched['y_2025_2026']).toBeDefined();
    expect(retrievedSched['y_2025_2026']['1']['h_1']['r_101'].subject).toBe('Matematyka');

    // Ensure raw sched does NOT contain meta properties like revision or tabId
    expect(hasSchedDataMeta(retrievedSched)).toBe(false);
    expect(retrievedSched.revision).toBeUndefined();
    expect(retrievedSched.tabId).toBeUndefined();

    // Verify separate state_meta record was written
    const metaRecord = await getStorageItem<any>(STORAGE_KEYS.STATE_META);
    expect(metaRecord).not.toBeNull();
    expect(metaRecord.revision).toBe(2);
    expect(metaRecord.tabId).toBe(multiTabStateService.getTabId());
    expect(metaRecord.updatedAt).toBeDefined();
  });

  // Wymóg testowy 4: dwa „taby” (różne tabId) generują konflikt, a po „Wczytaj zmiany” plan sal jest kompletny
  it('dwa „taby” (różne tabId) generują konflikt, a po „Wczytaj zmiany” plan sal jest kompletny', async () => {
    const tabAId = multiTabStateService.getTabId();
    const tabBId = 'tab_other_browser_b';

    // Tab A is at revision 1
    multiTabStateService.setLocalRevision(1, STORAGE_KEYS.APP_STATE);
    const planA = {
      'y_2025_2026': {
        '1': {
          'h_1': {
            'r_101': { className: '1A', teacherAbbr: 'JK', subject: 'Matematyka' }
          }
        }
      }
    };
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, planA);

    // Tab B saves revision 2 with an updated plan containing 2B Fizyka
    const planB = {
      'y_2025_2026': {
        '1': {
          'h_2': {
            'r_102': { className: '2B', teacherAbbr: 'AN', subject: 'Fizyka' }
          }
        }
      }
    };
    await setStorageItem(STORAGE_KEYS.APP_STATE, {
      school: { name: 'Szkoła Po Zmianach w Karcie B' },
      revision: 2,
      tabId: tabBId
    });
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, planB);
    await setStorageItem(STORAGE_KEYS.STATE_META, {
      revision: 2,
      tabId: tabBId,
      updatedAt: new Date().toISOString()
    });

    // Tab A tries to save its older version without force
    const conflict = await multiTabStateService.checkSaveConflict(STORAGE_KEYS.APP_STATE, 1);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.dbRevision).toBe(2);
    expect(conflict.dbTabId).toBe(tabBId);

    // Tab A clicks "Wczytaj zmiany" (simulation of handleLoadIncomingFromConflict)
    const incomingSched = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(incomingSched).not.toBeNull();
    const cleanedSched = cleanSchedDataMeta(incomingSched);
    expect(cleanedSched).not.toBeNull();
    expect(hasSchedDataMeta(cleanedSched)).toBe(false);
    expect(cleanedSched['y_2025_2026']['1']['h_2']['r_102'].className).toBe('2B');
    expect(cleanedSched['y_2025_2026']['1']['h_2']['r_102'].subject).toBe('Fizyka');

    // Tab A updates local revision to match incoming version
    multiTabStateService.setLocalRevision(conflict.dbRevision, STORAGE_KEYS.APP_STATE);
    expect(multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE)).toBe(2);

    // Tab A can now save its next revision 3 without conflict
    const appStateA = { school: { name: 'Szkoła Zsynchronizowana' } };
    const saveSuccess = await persistAppStateAndSchedWithConflictCheck(appStateA as unknown as AppState, cleanedSched);
    expect(saveSuccess).toBe(true);

    const finalSched = await getStorageItem<any>(STORAGE_KEYS.SCHED_DATA);
    expect(finalSched['y_2025_2026']['1']['h_2']['r_102'].className).toBe('2B');
  });
});
