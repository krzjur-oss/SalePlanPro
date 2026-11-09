/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Zunifikowana Warstwa Trwałości Danych (Persistence Layer)
 * Opis: Atomowy, bezpieczny zapis stanu (APP_STATE, SCHED_DATA, STATE_META)
 * w pojedynczej transakcji IndexedDB z porównaniem rewizji, szyfrowaniem poza transakcją,
 * kolejką zapisu (ostatni zapis wygrywa, pozostałe łączone) oraz blokadą navigator.locks.
 */

import {
  STORAGE_KEYS,
  setStorageItem,
  getStorageItem,
  getRawItem,
  cleanSchedDataMeta,
  writeSyncMirror,
  StorageLockedError,
  StorageWriteError,
  getDB,
  STORE_NAME,
  prepareValueForStorage
} from './dbStorage';
import {
  multiTabStateService,
  ConflictCheckResult
} from './multiTabStateService';
import { AppState, SchedData } from '../types';
import { StateMeta } from '../utils/validationSchemas';

export type CommitResult = {
  status: 'ok' | 'conflict' | 'error';
  error?: unknown;
};

export interface PersistOptions {
  forceOverwrite?: boolean;
  baseRevision?: number;
  onConflict?: (conflict: ConflictCheckResult, conflictingSched: SchedData | null) => void;
  tabLabel?: string;
  activeSection?: string;
  activeSectionName?: string;
}

export interface CommitStateOptions extends Partial<StateMeta> {
  forceOverwrite?: boolean;
  baseRevision?: number;
}

// ── KOLEJKA PROMISÓW DLA ZAPISU (Ostatni zapis wygrywa, pozostałe łączone) ──

interface QueuedTask {
  app: AppState;
  sched: SchedData;
  meta?: CommitStateOptions;
  resolvers: { resolve: (val: CommitResult) => void; reject: (err: unknown) => void }[];
}

let isProcessingQueue = false;
let pendingTask: QueuedTask | null = null;

/**
 * Przekazuje wywołanie zapisu przez pojedynczą kolejkę promisów.
 * Jeśli zapis jest w toku, nowe wywołanie aktualizuje oczekujący stan (ostatni zapis wygrywa)
 * a promisy oczekujących wywołań są łączone i rozstrzygane wspólnie po zakończeniu skonsolidowanego zapisu.
 */
function enqueueWrite(
  app: AppState,
  sched: SchedData,
  meta?: CommitStateOptions
): Promise<CommitResult> {
  return new Promise<CommitResult>((resolve, reject) => {
    if (!isProcessingQueue) {
      isProcessingQueue = true;
      executeWithLock(app, sched, meta)
        .then((res) => {
          resolve(res);
          processNextInQueue();
        })
        .catch((err) => {
          resolve({ status: 'error', error: err });
          processNextInQueue();
        });
    } else {
      if (!pendingTask) {
        pendingTask = {
          app,
          sched,
          meta,
          resolvers: [{ resolve, reject }]
        };
      } else {
        // Ostatni zapis wygrywa: nadpisanie danymi najnowszego stanu
        pendingTask.app = app;
        pendingTask.sched = sched;
        const forceOverwrite = pendingTask.meta?.forceOverwrite || meta?.forceOverwrite;
        pendingTask.meta = { ...pendingTask.meta, ...meta, forceOverwrite };
        // Połączenie oczekujących resolverów
        pendingTask.resolvers.push({ resolve, reject });
      }
    }
  });
}

function processNextInQueue() {
  if (!pendingTask) {
    isProcessingQueue = false;
    return;
  }

  const current = pendingTask;
  pendingTask = null;

  executeWithLock(current.app, current.sched, current.meta)
    .then((result) => {
      for (const r of current.resolvers) {
        r.resolve(result);
      }
      processNextInQueue();
    })
    .catch((err) => {
      for (const r of current.resolvers) {
        r.resolve({ status: 'error', error: err });
      }
      processNextInQueue();
    });
}

/**
 * Wykonuje zapis z koordynacją blokady navigator.locks ('saleplan-write') pomiędzy kartami.
 */
async function executeWithLock(
  app: AppState,
  sched: SchedData,
  meta?: CommitStateOptions
): Promise<CommitResult> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.locks &&
    typeof navigator.locks.request === 'function'
  ) {
    return navigator.locks.request('saleplan-write', async () => {
      return executeCommit(app, sched, meta);
    });
  }
  return executeCommit(app, sched, meta);
}

/**
 * Wewnętrzna realizacja commitState:
 * 1. Szyfrowanie danych poza transakcją IndexedDB
 * 2. Pojedyncza atomowa transakcja IndexedDB dla APP_STATE, SCHED_DATA i STATE_META
 *    z synchronicznym porównaniem rewizji wewnątrz transakcji
 * 3. Zapis pojedynczego lustra w localStorage oraz rozgłoszenie STATE_COMMITTED
 *
 * Zwraca obiekt { status: 'ok' | 'conflict' | 'error', error? }
 */
export async function executeCommit(
  app: AppState,
  sched: SchedData,
  meta?: CommitStateOptions
): Promise<CommitResult> {
  const ctx = multiTabStateService.getTabContext();
  const baseRev = meta?.baseRevision !== undefined
    ? meta.baseRevision
    : multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE);
  const nextRev = meta?.revision !== undefined ? meta.revision : baseRev + 1;
  const tabId = meta?.tabId || multiTabStateService.getTabId();
  const tabLabel = meta?.tabLabel || ctx.tabLabel;
  const activeSection = meta?.activeSection || ctx.section;
  const activeSectionName = meta?.activeSectionName || ctx.sectionName;
  const updatedAt = meta?.updatedAt || new Date().toISOString();

  const stateMetaRecord: StateMeta = {
    revision: nextRev,
    tabId,
    updatedAt,
    tabLabel,
    activeSection,
    activeSectionName,
    ...(meta?.changeSummary ? { changeSummary: meta.changeSummary } : {})
  };

  const enrichedApp = multiTabStateService.enrichWithRevision(app, nextRev, tabId);
  const cleanSched = cleanSchedDataMeta(sched);

  // 1. SZYFROWANIE POZA TRANSAKCJĄ (asynchroniczne WebCrypto przed otwarciem transakcji IDB)
  let preparedApp: unknown;
  let preparedSched: unknown;
  let preparedMeta: unknown;
  try {
    preparedApp = await prepareValueForStorage(STORAGE_KEYS.APP_STATE, enrichedApp, { force: meta?.forceOverwrite });
    preparedSched = await prepareValueForStorage(STORAGE_KEYS.SCHED_DATA, cleanSched, { force: meta?.forceOverwrite });
    preparedMeta = await prepareValueForStorage(STORAGE_KEYS.STATE_META, stateMetaRecord, { force: meta?.forceOverwrite });
  } catch (prepErr) {
    return { status: 'error', error: prepErr };
  }

  // 2. POJEDYNCZA TRANSAKCJA INDEXEDDB (APP_STATE, SCHED_DATA, STATE_META)
  let db: IDBDatabase;
  try {
    db = await getDB();
  } catch (dbErr) {
    // Błąd getDB() nie może kończyć się true - zwracamy status 'error'
    console.error('[persistence] Błąd połączenia getDB() w executeCommit:', dbErr);
    return { status: 'error', error: dbErr };
  }

  const txResult = await new Promise<CommitResult>((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const metaReq = store.get(STORAGE_KEYS.STATE_META);
      let hasConflict = false;

      metaReq.onsuccess = () => {
        const existingRecord = metaReq.result;
        const dbRev = multiTabStateService.extractRevision(existingRecord);
        const dbTabId = multiTabStateService.extractTabId(existingRecord);
        const myTabId = stateMetaRecord.tabId;

        // Porównanie rewizji w tej samej transakcji
        if (
          !meta?.forceOverwrite &&
          existingRecord &&
          dbTabId &&
          dbTabId !== myTabId &&
          dbRev > baseRev
        ) {
          hasConflict = true;
          return; // Brak zapisu w transakcji
        }

        // Atomowy zapis wszystkich 3 kluczy
        store.put(preparedApp, STORAGE_KEYS.APP_STATE);
        store.put(preparedSched, STORAGE_KEYS.SCHED_DATA);
        store.put(preparedMeta, STORAGE_KEYS.STATE_META);
      };

      metaReq.onerror = () => {
        resolve({ status: 'error', error: metaReq.error });
      };

      tx.oncomplete = () => {
        if (hasConflict) {
          resolve({ status: 'conflict' });
        } else {
          resolve({ status: 'ok' });
        }
      };

      tx.onerror = () => {
        const err = tx.error;
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          (err && String(err).includes('QuotaExceeded')) ||
          (err && String(err).toLowerCase().includes('quota'));
        if (isQuota) {
          resolve({
            status: 'error',
            error: new Error('Brak miejsca na dysku (QuotaExceededError)')
          });
        } else {
          resolve({ status: 'error', error: err });
        }
      };

      tx.onabort = () => {
        // tx.onabort z QuotaExceededError ma dawać error z komunikatem „brak miejsca”, a nie conflict
        const err = tx.error;
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          (err && String(err).includes('QuotaExceeded')) ||
          (err && String(err).toLowerCase().includes('quota'));
        if (isQuota) {
          resolve({
            status: 'error',
            error: new Error('Brak miejsca na dysku (QuotaExceededError)')
          });
        } else if (hasConflict) {
          resolve({ status: 'conflict' });
        } else if (err) {
          resolve({ status: 'error', error: err });
        } else {
          resolve({ status: 'error', error: new Error('Transakcja bazy danych została przerwana (abort)') });
        }
      };
    } catch (err) {
      resolve({ status: 'error', error: err });
    }
  });

  if (txResult.status !== 'ok') {
    return txResult;
  }

  // 3. Pojedynczy zapis lustra w localStorage (usunięto podwójne serializeAndSet)
  writeSyncMirror(STORAGE_KEYS.APP_STATE, preparedApp);
  writeSyncMirror(STORAGE_KEYS.SCHED_DATA, preparedSched);
  writeSyncMirror(STORAGE_KEYS.STATE_META, preparedMeta);

  // 4. Aktualizacja licznika rewizji i powiadomienie pozostałych kart
  multiTabStateService.setLocalRevision(nextRev, STORAGE_KEYS.APP_STATE);
  multiTabStateService.broadcastStateCommitted(STORAGE_KEYS.APP_STATE, nextRev, {
    tabLabel,
    activeSection,
    activeSectionName
  });

  // 5. Zgłoszenie żądania trwałego magazynu (navigator.storage.persist()) po pierwszym udanym zapisie
  maybeRequestStoragePersist();

  return { status: 'ok' };
}

let hasRequestedStoragePersist = false;

/**
 * Zgłasza do przeglądarki żądanie trwałego magazynu (persistent storage),
 * aby dane aplikacji nie były usuwane przy niskim stanie pamięci dyskowej urządzenia.
 */
export function maybeRequestStoragePersist(): void {
  if (hasRequestedStoragePersist) return;
  hasRequestedStoragePersist = true;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch(() => {});
    }
  } catch {}
}

export function resetStoragePersistFlag(): void {
  hasRequestedStoragePersist = false;
}

/**
 * Atomowo zatwierdza stan aplikacji (app, sched, meta) w pojedynczej transakcji IndexedDB.
 * Wszystkie wywołania zapisu przechodzą przez wspólną kolejkę promisów
 * z koordynacją blokady navigator.locks ('saleplan-write') pomiędzy kartami.
 * Zwraca obiekt { status: 'ok' | 'conflict' | 'error', error? }.
 */
export async function commitState(
  app: AppState,
  sched: SchedData,
  meta?: CommitStateOptions
): Promise<CommitResult> {
  return enqueueWrite(app, sched, meta);
}

/**
 * Zapisuje AppState oraz SchedData do bazy danych z weryfikacją konfliktów wielu kart.
 * Korzysta pod spodem z atomowego commitState.
 *
 * @returns obiekt CommitResult ({ status: 'ok' | 'conflict' | 'error', error? })
 */
export async function persistAppStateAndSchedWithConflictCheck(
  targetAppState: AppState,
  targetSchedData: SchedData,
  options?: PersistOptions | boolean
): Promise<CommitResult> {
  const opts: PersistOptions = typeof options === 'boolean'
    ? { forceOverwrite: options }
    : (options || {});

  const currentLocalRev = multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE);
  const baseRev = Math.max(currentLocalRev, opts.baseRevision || 0);
  const nextRev = baseRev + 1;

  const ctx = multiTabStateService.getTabContext();
  const meta: CommitStateOptions = {
    revision: nextRev,
    baseRevision: baseRev,
    forceOverwrite: opts.forceOverwrite,
    tabId: multiTabStateService.getTabId(),
    updatedAt: new Date().toISOString(),
    tabLabel: opts.tabLabel || ctx.tabLabel,
    activeSection: opts.activeSection || ctx.section,
    activeSectionName: opts.activeSectionName || ctx.sectionName
  };

  const result = await commitState(targetAppState, targetSchedData, meta);

  if (result.status === 'conflict' && !opts.forceOverwrite && opts.onConflict) {
    const conflict = await multiTabStateService.checkSaveConflict(STORAGE_KEYS.APP_STATE, currentLocalRev);
    let conflictingSched: SchedData | null = null;
    try {
      conflictingSched = await getStorageItem<SchedData>(STORAGE_KEYS.SCHED_DATA);
      if (conflictingSched) {
        conflictingSched = cleanSchedDataMeta(conflictingSched);
      }
    } catch {}

    opts.onConflict(conflict, conflictingSched);
  }

  return result;
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
