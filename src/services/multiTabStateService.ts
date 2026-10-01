// Multi-Tab State Synchronization & Conflict Detection Service for SalePlan Pro
// BroadcastChannel: 'saleplan-state' (separate from dual-screen channel)
// Guarantees that two tabs editing the same plan do not silently overwrite changes.

import { STORAGE_KEYS, getStorageItem } from './dbStorage';

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
  dbRecord: any;
}

class MultiTabStateService {
  private channel: BroadcastChannel | null = null;
  private tabId: string = '';
  private localRevisions: Map<string, number> = new Map();
  private subscribers: ((msg: MultiTabStateMessage) => void)[] = [];

  constructor() {
    this.initTabId();
    this.initChannel();
  }

  private initTabId() {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('saleplan_tab_id');
        if (stored) {
          this.tabId = stored;
          return;
        }
      } catch {}
    }
    this.tabId = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('saleplan_tab_id', this.tabId);
      } catch {}
    }
  }

  private initChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(MULTI_TAB_STATE_CHANNEL);
        this.channel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
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
   * Enriches an object (AppState or SchedData) with revision counter and tabId.
   */
  public enrichWithRevision<T extends object>(
    payload: T,
    revision: number,
    tabId?: string
  ): T & { revision: number; tabId: string; _revision: number; _tabId: string } {
    const tid = tabId || this.getTabId();
    const rev = Math.max(1, Math.floor(revision));
    return {
      ...payload,
      revision: rev,
      tabId: tid,
      _revision: rev,
      _tabId: tid
    };
  }

  /**
   * Extracts revision number from a stored record.
   */
  public extractRevision(record: any): number {
    if (!record || typeof record !== 'object') return 0;
    const rev = record.revision ?? record._revision;
    return typeof rev === 'number' && !isNaN(rev) ? rev : 0;
  }

  /**
   * Extracts tabId from a stored record.
   */
  public extractTabId(record: any): string {
    if (!record || typeof record !== 'object') return '';
    return String(record.tabId ?? record._tabId ?? '');
  }

  /**
   * Checks whether saving to IndexedDB would overwrite a newer version saved by another tab.
   * If db has a higher revision saved by a different tabId -> returns hasConflict: true.
   */
  public async checkSaveConflict(
    key: string = STORAGE_KEYS.APP_STATE,
    localRev?: number
  ): Promise<ConflictCheckResult> {
    const localRevision = localRev !== undefined ? localRev : this.getLocalRevision(key);
    let dbRecord: any = null;

    try {
      dbRecord = await getStorageItem<any>(key);
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

    const dbRevision = this.extractRevision(dbRecord);
    const dbTabId = this.extractTabId(dbRecord);
    const myTabId = this.getTabId();

    // Conflict condition: DB record exists, has a different tabId, and has a strictly higher revision than local
    const hasConflict = Boolean(
      dbRecord &&
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

  private handleIncoming(data: any) {
    if (!data || typeof data !== 'object') return;
    if (data.tabId === this.getTabId()) return; // ignore self
    if (data.type === 'STATE_COMMITTED') {
      this.subscribers.forEach(cb => {
        try {
          cb(data as MultiTabStateMessage);
        } catch (e) {
          console.error('[multiTabStateService] Błąd w subskrybencie wiadomości:', e);
        }
      });
    }
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
