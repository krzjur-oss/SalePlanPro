import { describe, it, expect, beforeEach } from 'vitest';
import {
  multiTabStateService,
  MULTI_TAB_STATE_CHANNEL
} from './multiTabStateService';
import { STORAGE_KEYS, setStorageItem } from './dbStorage';

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
    expect(enriched._revision).toBe(5);
    expect(enriched._tabId).toBe('tab_custom_1');

    expect(multiTabStateService.extractRevision(enriched)).toBe(5);
    expect(multiTabStateService.extractTabId(enriched)).toBe('tab_custom_1');
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
      _revision: 4,
      _tabId: otherTabId
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
      _revision: 3,
      _tabId: myTabId
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
});
