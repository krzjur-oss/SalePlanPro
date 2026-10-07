// Multi-Tab State Synchronization & Conflict Detection Service for SalePlan Pro
// BroadcastChannel: 'saleplan-state' (separate from dual-screen channel)
// Guarantees that two tabs editing the same plan do not silently overwrite changes.

import { STORAGE_KEYS, getStorageItem, setStorageItem, cleanSchedDataMeta } from './dbStorage';
import { AppState, SchedData } from '../types';
import { StateMeta } from '../utils/validationSchemas';

export const MULTI_TAB_STATE_CHANNEL = 'saleplan-state';

export interface MultiTabStateMessage {
  type: 'STATE_COMMITTED' | 'REQUEST_SYNC' | 'ANNOUNCE_TAB';
  key: string;
  revision: number;
  tabId: string;
  timestamp: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  localRevision: number;
  dbRevision: number;
  dbTabId: string;
  dbRecord: unknown;
}

export class MultiTabStateService {
  private channel: BroadcastChannel | null = null;
  private tabId: string = '';
  private localRevisions: Map<string, number> = new Map();
  private subscribers: ((msg: MultiTabStateMessage) => void)[] = [];

  constructor() {
    this.initTabId();
    this.initChannel();
  }

  private generateNewTabId(): string {
    return 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  private initTabId() {
    // Generate fresh tabId kept strictly in module memory (no sessionStorage to avoid duplicate ID on duplicate tab)
    this.tabId = this.generateNewTabId();

    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // Page was restored from bfcache - generate a new unique tabId
          this.tabId = this.generateNewTabId();
        }
      });
    }
  }

  public regenerateTabId(): string {
    this.tabId = this.generateNewTabId();
    return this.tabId;
  }

  private initChannel() {
    const BC = (typeof window !== 'undefined' && (window as any).BroadcastChannel) ||
               (typeof globalThis !== 'undefined' && (globalThis as any).BroadcastChannel);
    if (BC) {
      try {
        const ch = new BC(MULTI_TAB_STATE_CHANNEL);
        ch.onmessage = (event: MessageEvent) => {
          this.handleIncoming(event.data);
        };
        this.channel = ch;
      } catch (e) {
        console.warn('Nie można zainicjalizować BroadcastChannel saleplan-state:', e);
      }
    }
  }

  public getTabId(): string {
    if (!this.tabId) {
      this.initTabId();
    }
    return this.tabId;
  }

  public getLocalRevision(key: string = STORAGE_KEYS.APP_STATE): number {
    return this.localRevisions.get(key) || 1;
  }

  public setLocalRevision(rev: number, key: string = STORAGE_KEYS.APP_STATE) {
    if (typeof rev === 'number' && !isNaN(rev)) {
      this.localRevisions.set(key, Math.max(1, Math.floor(rev)));
    }
  }

  /**
   * Enriches an object (e.g. AppState) with revision counter and tabId.
   */
  public enrichWithRevision<T extends object>(
    payload: T,
    revision: number,
    tabId?: string
  ): T & { revision: number; tabId: string } {
    const tid = tabId || this.getTabId();
    const rev = Math.max(1, Math.floor(revision));
    return {
      ...payload,
      revision: rev,
      tabId: tid
    };
  }

  /**
   * Extracts revision number from a stored record or state meta.
   */
  public extractRevision(record: unknown): number {
    if (!record || typeof record !== 'object') return 0;
    const rec = record as Record<string, unknown>;
    const rev = rec.revision ?? rec._revision;
    return typeof rev === 'number' && !isNaN(rev) ? rev : 0;
  }

  /**
   * Extracts tabId from a stored record or state meta.
   */
  public extractTabId(record: unknown): string {
    if (!record || typeof record !== 'object') return '';
    const rec = record as Record<string, unknown>;
    return String(rec.tabId ?? rec._tabId ?? '');
  }

  /**
   * Checks whether saving to IndexedDB would overwrite a newer version saved by another tab.
   * Checks dedicated 'saleplan_v3_state_meta' record, falling back to dbRecord.
   * If db has a higher revision saved by a different tabId -> returns hasConflict: true.
   */
  public async checkSaveConflict(
    key: string = STORAGE_KEYS.APP_STATE,
    localRev?: number
  ): Promise<ConflictCheckResult> {
    const localRevision = localRev !== undefined ? localRev : this.getLocalRevision(key);
    let stateMeta: StateMeta | null = null;
    let dbRecord: unknown = null;

    try {
      stateMeta = await getStorageItem<StateMeta>(STORAGE_KEYS.STATE_META);
      if (!stateMeta && typeof localStorage !== 'undefined') {
        const localMetaRaw = localStorage.getItem(STORAGE_KEYS.STATE_META);
        if (localMetaRaw) {
          try { stateMeta = JSON.parse(localMetaRaw); } catch {}
        }
      }
    } catch (e) {
      console.warn('[multiTabStateService] Nie udało się odczytać STATE_META:', e);
    }

    try {
      dbRecord = await getStorageItem<unknown>(key);
      if (!dbRecord && typeof localStorage !== 'undefined') {
        const localRaw = localStorage.getItem(key);
        if (localRaw) {
          try {
            dbRecord = JSON.parse(localRaw);
          } catch {
            dbRecord = localRaw;
          }
        }
      }
    } catch (e) {
      console.warn(`[multiTabStateService] Nie udało się odczytać bieżącego rekordu "${key}":`, e);
    }

    const dbRevision = (stateMeta && typeof stateMeta.revision === 'number')
      ? stateMeta.revision
      : this.extractRevision(dbRecord);

    const dbTabId = (stateMeta && typeof stateMeta.tabId === 'string' && stateMeta.tabId)
      ? stateMeta.tabId
      : this.extractTabId(dbRecord);

    const myTabId = this.getTabId();

    // Conflict condition: DB record or stateMeta exists, has a different tabId, and has a strictly higher revision than local
    const hasConflict = Boolean(
      (stateMeta || dbRecord) &&
      dbTabId &&
      dbTabId !== myTabId &&
      dbRevision > localRevision
    );

    return {
      hasConflict,
      localRevision,
      dbRevision,
      dbTabId,
      dbRecord
    };
  }

  /**
   * Broadcasts a notification that this tab has successfully committed a new revision.
   */
  public broadcastStateCommitted(key: string, revision: number) {
    if (!this.channel) return;
    const msg: MultiTabStateMessage = {
      type: 'STATE_COMMITTED',
      key,
      revision,
      tabId: this.getTabId(),
      timestamp: Date.now()
    };
    try {
      this.channel.postMessage(msg);
    } catch (e) {
      console.warn('[multiTabStateService] Błąd wysyłania komunikatu:', e);
    }
  }

  /**
   * Subscribe to messages from other tabs. Automatically filters out messages originating from this tab.
   */
  public subscribe(callback: (msg: MultiTabStateMessage) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private handleIncoming(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const msg = data as Partial<MultiTabStateMessage>;
    if (msg.tabId === this.getTabId()) return; // ignore self
    if (msg.type === 'STATE_COMMITTED') {
      this.subscribers.forEach(cb => {
        try {
          cb(data as MultiTabStateMessage);
        } catch (e) {
          console.error('[multiTabStateService] Błąd w subskrybencie wiadomości:', e);
        }
      });
    }
  }

  /**
   * Persists AppState and SchedData with multi-tab conflict checking.
   * - SchedData is strictly saved raw / stripped of meta keys (cleanSchedDataMeta).
   * - Revision and tabId are stored in AppState and in dedicated 'saleplan_v3_state_meta' key.
   * - Saves strictly in sequential order: 1. APP_STATE, 2. SCHED_DATA, 3. STATE_META.
   */
  public async persistAppStateAndSchedWithConflictCheck(
    targetAppState: AppState,
    targetSchedData: SchedData,
    forceOverwrite: boolean = false
  ): Promise<boolean> {
    const currentLocalRev = this.getLocalRevision(STORAGE_KEYS.APP_STATE);

    if (!forceOverwrite) {
      const conflict = await this.checkSaveConflict(STORAGE_KEYS.APP_STATE, currentLocalRev);
      if (conflict.hasConflict) {
        return false;
      }
    }

    const nextRev = currentLocalRev + 1;
    const enrichedState = this.enrichWithRevision(targetAppState, nextRev);
    const cleanSched = cleanSchedDataMeta(targetSchedData);

    // Save strictly in order: 1. APP_STATE, 2. SCHED_DATA, 3. STATE_META
    await setStorageItem(STORAGE_KEYS.APP_STATE, enrichedState);
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, cleanSched);
    await setStorageItem(STORAGE_KEYS.STATE_META, {
      revision: nextRev,
      tabId: this.getTabId(),
      updatedAt: new Date().toISOString()
    });
    this.setLocalRevision(nextRev, STORAGE_KEYS.APP_STATE);
    this.broadcastStateCommitted(STORAGE_KEYS.APP_STATE, nextRev);

    return true;
  }

  public destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.subscribers = [];
  }
}

export const multiTabStateService = new MultiTabStateService();

export const persistAppStateAndSchedWithConflictCheck = (
  targetAppState: AppState,
  targetSchedData: SchedData,
  forceOverwrite: boolean = false
): Promise<boolean> => {
  return multiTabStateService.persistAppStateAndSchedWithConflictCheck(targetAppState, targetSchedData, forceOverwrite);
};
