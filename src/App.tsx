/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Główny Komponent Aplikacji (App.tsx)
 * Opis: Centralny stan programu, nawigacja modułowa, automatyczny zapis z detekcją konfliktów wielu kart,
 * obsługa szyfrowania bazy danych oraz synchronizacja trybu dwuekranowego.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { 
  AppState, SchedData, ArchiveEntry, SnapshotEntry, SchedCell, Assignment, Teacher, Subject, ClassRoom, AppEventLog, AutosaveVersion, Lesson, PlanVariant
} from './types';
import { 
  getDemoAppState, getDemoSchedData, downloadFile, getStorageSize, formatBytes, mergeClassNames 
} from './utils';
import {
  STORAGE_KEYS, getStorageItem, getStorageItemDetailed, getStorageItemSync, setStorageItem, removeStorageItem,
  clearAllStorage, migrateFromLocalStorage, getDetailedStorageStats, StorageStatistics,
  isDatabaseEncryptionActive, isSessionUnlocked, StorageLockedError, StorageWriteBlockedError,
  isWriteBlocked, setWriteBlocked, getBlockedWrites, removeStorageEncryptionMeta,
  migrateAllStoredItemsToV2, cleanSchedDataMeta, writeSyncMirror, getRawItem, removeRawItem,
  saveRecoveryBackup, getAllStorageKeys
} from './services/dbStorage';
import {
  persistAppStateAndSchedWithConflictCheck as persistWithConflictCheck,
  maybeRequestStoragePersist,
  CommitResult
} from './services/persistence';
import UnlockScreen from './components/UnlockScreen';
import ExportModal, { ExportOptions } from './components/ExportModal';
import ImportModal from './components/ImportModal';
import SecurityModal from './components/SecurityModal';
import TermsModal from './components/TermsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { sanitizeAppState, ImportPayload } from './utils/mergeEngine';
import { StateMeta, AppStateSchema, SchedDataSchema } from './utils/validationSchemas';
import { anonymizeBackupPayload, AnonymizationSummary } from './utils/anonymization';
import { pruneSnapshots } from './utils/snapshotUtils';
import { SalePlanLogoMark } from './components/SalePlanLogo';
import { lazyWithRetry } from './utils/lazyWithRetry';

const PlanKlas = lazyWithRetry(() => import('./components/PlanKlas'));
const PlanSal = lazyWithRetry(() => import('./components/PlanSal'));
const KreatorSzkoly = lazyWithRetry(() => import('./components/KreatorSzkoly'));
const Wydruki = lazyWithRetry(() => import('./components/Wydruki'));
const Statystyki = lazyWithRetry(() => import('./components/Statystyki'));
const SnapshotManager = lazyWithRetry(() => import('./components/SnapshotManager'));
const Dyzury = lazyWithRetry(() => import('./components/Dyzury'));
const ZastepstwaDziennik = lazyWithRetry(() => import('./components/ZastepstwaDziennik'));
const AudytorHigienyMEN = lazyWithRetry(() => import('./components/AudytorHigienyMEN'));
const EksportIRaporty = lazyWithRetry(() => import('./components/EksportIRaporty'));
const MobilePlanViewer = lazyWithRetry(() => import('./components/MobilePlanViewer'));
const SplitScreenDiffViewer = lazyWithRetry(() => import('./components/SplitScreenDiffViewer'));
const OProgramie = lazyWithRetry(() => import('./components/OProgramie'));
const UstawieniaGeneratorow = lazyWithRetry(() => import('./components/UstawieniaGeneratorow'));
const PlanVariantsModal = lazyWithRetry(() => import('./components/PlanVariantsModal'));
const DualScreenMasterView = lazyWithRetry(() => import('./components/DualScreenMasterView'));
const CompanionWindowView = lazyWithRetry(() => import('./components/CompanionWindowView'));
import { SWUpdateBanner } from './components/SWUpdateBanner';
import { multiTabStateService } from './services/multiTabStateService';
import MultiTabConflictModal from './components/MultiTabConflictModal';
import { MultiTabRefreshBanner } from './components/MultiTabRefreshBanner';
import { dualScreenService, DualScreenMessage } from './services/dualScreenService';
import { encryptText, decryptText, isEncryptedBackup, setBeforeLockHook } from './lib/crypto';
import { Z_INDEX, Z_INDEX_CLASSES } from './styles/zIndex';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Layers, MapPin, Shield, Download, Upload, Trash2, RotateCcw, RotateCw, RefreshCw, Layers2, FileText, Sparkles, Menu, X, Printer, BarChart2,
  Maximize2, Minimize2, HelpCircle, History, Camera, Plus, Clock, Bookmark, AlertTriangle, Check, Search, Sliders, Eye, EyeOff, ChevronRight, ChevronDown, Database, Monitor, UserCheck, HeartHandshake,
  FileSpreadsheet, QrCode, Columns2
} from 'lucide-react';

export const APP_TAB_NAMES: Record<string, string> = {
  kreator: 'Kreator Szkoły',
  plan_klas: 'Plan Klas',
  plan_sal: 'Plan Sal',
  dyzury: 'Dyżury Nauczycielskie',
  zastepstwa: 'Zastępstwa Dzienne',
  higiena_men: 'Audytor Higieny MEN',
  eksport_raporty: 'Raporty i Kody QR',
  porownywarka_diff: 'Porównywarka (Diff)',
  wydruki: 'Wydruki i Publikacje',
  statystyki: 'Statystyki i Analiza',
  o_programie: 'O programie',
  ustawienia_generatorow: 'Ustawienia generatorów'
};

function sortAppState(rawInput: unknown): AppState {
  // Always sanitize first to ensure completely valid schema defaults
  const resolved = sanitizeAppState(rawInput);

  let nextClasses = resolved.classes;
  if (Array.isArray(nextClasses)) {
    nextClasses = [...nextClasses].filter(Boolean).sort((a, b) => 
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' })
    );
  }
  
  let nextPlanClasses = resolved.planLekcji?.classes;
  if (Array.isArray(nextPlanClasses)) {
    nextPlanClasses = [...nextPlanClasses].filter(Boolean).sort((a, b) => 
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  let nextTeachers = resolved.teachers;
  if (Array.isArray(nextTeachers)) {
    nextTeachers = [...nextTeachers].filter(Boolean).sort((a, b) => {
      const lA = String(a?.last || '');
      const lB = String(b?.last || '');
      const lCompare = lA.localeCompare(lB, undefined, { sensitivity: 'base' });
      if (lCompare !== 0) return lCompare;
      const fA = String(a?.first || '');
      const fB = String(b?.first || '');
      return fA.localeCompare(fB, undefined, { sensitivity: 'base' });
    });
  }

  let nextPlanTeachers = resolved.planLekcji?.teachers;
  if (Array.isArray(nextPlanTeachers)) {
    nextPlanTeachers = [...nextPlanTeachers].filter(Boolean).sort((a, b) => {
      const lA = String(a?.last || '');
      const lB = String(b?.last || '');
      const lCompare = lA.localeCompare(lB, undefined, { sensitivity: 'base' });
      if (lCompare !== 0) return lCompare;
      const fA = String(a?.first || '');
      const fB = String(b?.first || '');
      return fA.localeCompare(fB, undefined, { sensitivity: 'base' });
    });
  }

  let nextSubjects = resolved.subjects;
  if (Array.isArray(nextSubjects)) {
    nextSubjects = [...nextSubjects].filter(Boolean).sort((a, b) => 
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
    );
  }

  let nextPlanSubjects = resolved.planLekcji?.subjects;
  if (Array.isArray(nextPlanSubjects)) {
    nextPlanSubjects = [...nextPlanSubjects].filter(Boolean).sort((a, b) => 
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
    );
  }

  let nextSupportStaff = resolved.supportStaff;
  if (Array.isArray(nextSupportStaff)) {
    nextSupportStaff = [...nextSupportStaff].filter(Boolean).sort((a, b) => {
      const lA = String(a?.last || '');
      const lB = String(b?.last || '');
      const lCompare = lA.localeCompare(lB, undefined, { sensitivity: 'base' });
      if (lCompare !== 0) return lCompare;
      const fA = String(a?.first || '');
      const fB = String(b?.first || '');
      return fA.localeCompare(fB, undefined, { sensitivity: 'base' });
    });
  }

  return {
    ...resolved,
    classes: nextClasses || [],
    teachers: nextTeachers || [],
    supportStaff: nextSupportStaff || [],
    subjects: nextSubjects || [],
    planLekcji: {
      ...resolved.planLekcji,
      classes: nextPlanClasses || resolved.planLekcji?.classes || [],
      teachers: nextPlanTeachers || resolved.planLekcji?.teachers || [],
      subjects: nextPlanSubjects || resolved.planLekcji?.subjects || [],
    }
  };
}

/**
 * Przerzedzanie kopii autozapisu:
 * - Z ostatnich 24 godzin: zachowuje do 3 najnowszych wersji na godzinę
 * - Od 24 godzin do 14 dni wstecz: zachowuje 1 najnowszą wersję na dobę
 * - Starsze niż 14 dni: bezwzględnie usuwa z bazy danych
 * Wylistowanie kluczy autosave_* przez getAllStorageKeys() bez czytania zawartości (znacznik czasu brany z nazwy klucza).
 * W stanie Reacta trzymane są tylko metadane (lekki stan pamięci).
 * Nadmiarowe klucze są usuwane z bazy danych.
 */
export const pruneAutosaveVersions = async (): Promise<AutosaveVersion[]> => {
  try {
    const allKeys = await getAllStorageKeys();
    const autosaveKeys = allKeys.filter(k => k.startsWith('autosave_'));
    if (autosaveKeys.length === 0) return [];

    interface AutosaveKeyItem {
      key: string;
      ts: number;
    }
    const items: AutosaveKeyItem[] = [];

    // Wylistowanie kluczy bez czytania zawartości – znacznik czasu bierzemy bezpośrednio z nazwy klucza autosave_<ts>
    for (const k of autosaveKeys) {
      const rawTs = parseInt(k.replace('autosave_', ''), 10);
      if (!isNaN(rawTs) && rawTs > 0) {
        items.push({ key: k, ts: rawTs });
      }
    }

    // Sortowanie chronologicznie: od najnowszej do najstarszej
    items.sort((a, b) => b.ts - a.ts);

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const fourteenDaysAgo = now - 14 * oneDay;

    const hourlyCounts = new Map<number, number>();
    const dailyCounts = new Map<number, number>();

    const keptItems: AutosaveKeyItem[] = [];
    const keysToDelete: string[] = [];

    for (const item of items) {
      // Wersje starsze niż 14 dni: bezwzględnie usuwamy
      if (item.ts < fourteenDaysAgo) {
        keysToDelete.push(item.key);
        continue;
      }

      const ageMs = Math.max(0, now - item.ts);
      if (ageMs < oneDay) {
        // Ostatnie 24h (24 okna 1-godzinne): do 3 wersji na godzinę (maks. 72)
        const hourBucket = Math.floor(ageMs / oneHour);
        const count = hourlyCounts.get(hourBucket) || 0;
        if (count < 3) {
          hourlyCounts.set(hourBucket, count + 1);
          keptItems.push(item);
        } else {
          keysToDelete.push(item.key);
        }
      } else {
        // Od 24h do 14 dni wstecz (14 okien 24-godzinnych): 1 wersja na dobę (maks. 14)
        const dayBucket = Math.floor(ageMs / oneDay);
        if (dayBucket <= 14) {
          const count = dailyCounts.get(dayBucket) || 0;
          if (count < 1) {
            dailyCounts.set(dayBucket, count + 1);
            keptItems.push(item);
          } else {
            keysToDelete.push(item.key);
          }
        } else {
          keysToDelete.push(item.key);
        }
      }
    }

    // Usunięcie nadmiarowych kluczy
    for (const k of keysToDelete) {
      try {
        await removeStorageItem(k);
      } catch (err) {
        console.warn(`[Autosave] Błąd usuwania starej wersji ${k}:`, err);
      }
    }

    // Zwracaj wyłącznie lekkie metadane (appState/schedData wczytywane dopiero przy przywracaniu)
    return keptItems.map(i => ({
      id: `autosave-${i.ts}`,
      timestamp: new Date(i.ts).toISOString(),
      key: i.key
    }));
  } catch (e) {
    console.warn('[Autosave] Błąd procedury przerzedzania autozapisu:', e);
    return [];
  }
};

export default function App() {
  // ── HOOKS STATE ──
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = getStorageItemSync<AppState>(STORAGE_KEYS.APP_STATE);
    if (saved) {
      try { return sortAppState(saved); } catch (e) { console.error('Error loading state', e); }
    }
    return sortAppState(getDemoAppState());
  });

  const [schedData, setSchedData] = useState<SchedData>(() => {
    const saved = getStorageItemSync<SchedData>(STORAGE_KEYS.SCHED_DATA);
    if (saved) {
      try { return saved; } catch (e) { console.error('Error loading sched', e); }
    }
    return getDemoSchedData();
  });

  const [archive, setArchive] = useState<ArchiveEntry[]>(() => {
    const saved = getStorageItemSync<ArchiveEntry[]>(STORAGE_KEYS.ARCHIVE);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [];
  });

  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>(() => {
    const saved = getStorageItemSync<SnapshotEntry[]>(STORAGE_KEYS.SNAPSHOTS);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [];
  });

  const [autosaveVersions, setAutosaveVersions] = useState<AutosaveVersion[]>([]);

  const lastAutosaveTimeRef = useRef<number>(0);
  const editCountSinceAutosaveRef = useRef<number>(0);
  const lastAutosaveRevisionRef = useRef<number>(0);

  const [historyLogs, setHistoryLogs] = useState<AppEventLog[]>(() => {
    const saved = getStorageItemSync<AppEventLog[]>(STORAGE_KEYS.HISTORY_LOGS);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [
      {
        id: 'init-system',
        timestamp: new Date().toISOString(),
        actionType: 'other',
        description: 'Zainicjalizowano dziennik pracy programu (Baza IndexedDB)',
        details: 'System korzysta z wysokopojemnej bazy IndexedDB bez limitu 5 MB.'
      }
    ];
  });

  const [planVariants, setPlanVariants] = useState<PlanVariant[]>(() => {
    const saved = getStorageItemSync<PlanVariant[]>(STORAGE_KEYS.PLAN_VARIANTS);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return [];
  });

  const [activeVariantId, setActiveVariantId] = useState<string>(() => {
    const saved = getStorageItemSync<string>(STORAGE_KEYS.ACTIVE_VARIANT_ID);
    return saved || 'default_semestr_1';
  });

  const [showVariantsModal, setShowVariantsModal] = useState<boolean>(false);

  const [storageStats, setStorageStats] = useState<StorageStatistics>({
    usedBytes: getStorageSize(),
    quotaBytes: 1024 * 1024 * 1024,
    availableBytes: 1024 * 1024 * 1024,
    percentage: 0.1,
    isIndexedDB: true,
    formattedUsed: formatBytes(getStorageSize()),
    formattedQuota: 'Pojemność nieograniczona'
  });

  const statsDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStorageStats = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage ?? 0;
        const quotaBytes = estimate.quota ?? 1024 * 1024 * 1024;
        const availableBytes = Math.max(0, quotaBytes - usedBytes);
        const percentage = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
        setStorageStats({
          usedBytes,
          quotaBytes,
          availableBytes,
          percentage,
          isIndexedDB: true,
          formattedUsed: formatBytes(usedBytes),
          formattedQuota: formatBytes(quotaBytes)
        });
        return;
      }
      const stats = await getDetailedStorageStats();
      setStorageStats(stats);
    } catch (e) {
      console.warn('[Storage] Nie udało się odświeżyć statystyk pamięci:', e);
    }
  }, []);

  const refreshStorageStats = useCallback((immediate?: boolean) => {
    if (immediate === true) {
      if (statsDebounceTimerRef.current) {
        clearTimeout(statsDebounceTimerRef.current);
        statsDebounceTimerRef.current = null;
      }
      fetchStorageStats();
      return;
    }
    if (statsDebounceTimerRef.current) {
      clearTimeout(statsDebounceTimerRef.current);
    }
    statsDebounceTimerRef.current = setTimeout(() => {
      statsDebounceTimerRef.current = null;
      fetchStorageStats();
    }, 30000);
  }, [fetchStorageStats]);

  useEffect(() => {
    return () => {
      if (statsDebounceTimerRef.current) {
        clearTimeout(statsDebounceTimerRef.current);
        statsDebounceTimerRef.current = null;
      }
    };
  }, []);

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return isDatabaseEncryptionActive() && !isSessionUnlocked();
  });
  const [storageReady, setStorageReady] = useState<boolean>(false);
  const storageReadyRef = useRef<boolean>(false);
  const [storageInitError, setStorageInitError] = useState<string | null>(null);
  const [corruptDataModal, setCorruptDataModal] = useState<{
    key: string;
    rawContent: string;
  } | null>(null);
  const [blockedWrites, setBlockedWrites] = useState<Record<string, boolean>>(() => getBlockedWrites());

  // ── MULTI-TAB BROADCASTCHANNEL 'saleplan-state' & CONFLICT RESOLUTION ──
  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<{
    localRevision: number;
    incomingRevision: number;
    incomingTabId: string;
    incomingTabName?: string;
    incomingSectionName?: string;
    incomingUpdatedAt?: string;
    dbAppState: AppState;
    dbSchedData?: SchedData;
  } | null>(null);

  const [showRefreshBanner, setShowRefreshBanner] = useState<boolean>(false);
  const [remoteRevision, setRemoteRevision] = useState<number>(1);
  const [remoteTabInfo, setRemoteTabInfo] = useState<{ tabName?: string; sectionName?: string } | null>(null);

  const notify = (msg: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg ${Z_INDEX_CLASSES.TOAST} ${
      type === 'ok' ? 'border-emerald-500' : type === 'info' ? 'border-amber-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Hydrated state references for detecting genuine user edits (Task 2)
  const hydratedRef = useRef<{ appState: AppState; schedData: SchedData } | null>(null);
  const isFirstTabMount = useRef<boolean>(true);

  // Asynchronous storage migration and deep load on mount / unlock
  const initStorage = async () => {
    setStorageInitError(null);
    let success = false;
    try {
      await migrateFromLocalStorage();

      // Zabezpieczenie: gdy baza NIE jest zaszyfrowana, sprawdź czy fizycznie obecne rekordy nie są uszkodzone
      const isEncrypted = isDatabaseEncryptionActive();
      if (!isEncrypted) {
        const appStateResult = await getStorageItemDetailed<AppState>(STORAGE_KEYS.APP_STATE);
        if (appStateResult.status === 'error') {
          setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.APP_STATE]: true }));
          setStorageInitError(`Błąd odczytu bazy IndexedDB dla klucza APP_STATE: ${appStateResult.error}. Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.`);
          storageReadyRef.current = false;
          setStorageReady(false);
          return;
        }
        if (appStateResult.status === 'corrupted') {
          let migratedSuccessfully = false;
          const rawAppState = appStateResult.rawContent;
          if (rawAppState && typeof rawAppState === 'object' && !Array.isArray(rawAppState)) {
            const zodCheck = AppStateSchema.safeParse(rawAppState);
            if (!zodCheck.success) {
              console.warn('[App initStorage] Walidacja schematu APP_STATE nie powiodła się. Błędy Zod (parsed.error.issues):', zodCheck.error.issues);
            }

            try {
              const normalized = sanitizeAppState(rawAppState);
              const normalizedCheck = AppStateSchema.safeParse(normalized);
              if (normalizedCheck.success) {
                const backupKey = await saveRecoveryBackup(STORAGE_KEYS.APP_STATE, rawAppState).catch(() => `${STORAGE_KEYS.APP_STATE}_recovery_backup_${Date.now()}`);
                setWriteBlocked(STORAGE_KEYS.APP_STATE, false);
                await setStorageItem(STORAGE_KEYS.APP_STATE, normalizedCheck.data, { force: true });
                console.info('[App initStorage] Pomyślnie znormalizowano i zmigrowano strukturę APP_STATE. Kopia zapasowa:', backupKey);
                migratedSuccessfully = true;
              }
            } catch (migErr) {
              console.warn('[App initStorage] Próba automatycznej normalizacji APP_STATE nie powiodła się:', migErr);
            }
          }

          if (!migratedSuccessfully) {
            setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.APP_STATE]: true }));
            setCorruptDataModal({
              key: STORAGE_KEYS.APP_STATE,
              rawContent: typeof rawAppState === 'string' ? rawAppState : JSON.stringify(rawAppState, null, 2)
            });
            setStorageInitError('Wykryto uszkodzone dane konfiguracji (APP_STATE). Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.');
            storageReadyRef.current = false;
            setStorageReady(false);
            return;
          }
        }

        const schedResult = await getStorageItemDetailed<SchedData>(STORAGE_KEYS.SCHED_DATA);
        if (schedResult.status === 'error') {
          setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.SCHED_DATA]: true }));
          setStorageInitError(`Błąd odczytu bazy IndexedDB dla klucza SCHED_DATA: ${schedResult.error}. Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.`);
          storageReadyRef.current = false;
          setStorageReady(false);
          return;
        }
        if (schedResult.status === 'corrupted') {
          let schedMigratedSuccessfully = false;
          const rawSched = schedResult.rawContent;
          if (rawSched && typeof rawSched === 'object') {
            const zodSchedCheck = SchedDataSchema.safeParse(rawSched);
            if (!zodSchedCheck.success) {
              console.warn('[App initStorage] Walidacja schematu SCHED_DATA nie powiodła się. Błędy Zod (parsed.error.issues):', zodSchedCheck.error.issues);
            }

            try {
              const cleanedSched = cleanSchedDataMeta(rawSched as SchedData);
              const cleanedCheck = SchedDataSchema.safeParse(cleanedSched);
              if (cleanedCheck.success) {
                const backupKey = await saveRecoveryBackup(STORAGE_KEYS.SCHED_DATA, rawSched).catch(() => `${STORAGE_KEYS.SCHED_DATA}_recovery_backup_${Date.now()}`);
                setWriteBlocked(STORAGE_KEYS.SCHED_DATA, false);
                await setStorageItem(STORAGE_KEYS.SCHED_DATA, cleanedCheck.data, { force: true });
                console.info('[App initStorage] Pomyślnie znormalizowano i zmigrowano strukturę SCHED_DATA. Kopia zapasowa:', backupKey);
                schedMigratedSuccessfully = true;
              }
            } catch (migErr) {
              console.warn('[App initStorage] Próba automatycznej normalizacji SCHED_DATA nie powiodła się:', migErr);
            }
          }

          if (!schedMigratedSuccessfully) {
            setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.SCHED_DATA]: true }));
            setCorruptDataModal({
              key: STORAGE_KEYS.SCHED_DATA,
              rawContent: typeof rawSched === 'string' ? rawSched : JSON.stringify(rawSched, null, 2)
            });
            setStorageInitError('Wykryto uszkodzone dane planu sal (SCHED_DATA). Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.');
            storageReadyRef.current = false;
            setStorageReady(false);
            return;
          }
        }
      }
      
      // Sprawdzenie i obsługa kopii zapasowej przed szyfrowaniem (PRE_ENCRYPTION_BACKUP)
      const preBackup = await getRawItem<Record<string, any>>(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
      if (preBackup && typeof preBackup === 'object' && preBackup.data) {
        if (isDatabaseEncryptionActive()) {
          // Szyfrowanie aktywne: sprawdzenie czy wszystkie klucze w kopii dają się poprawnie odczytać i odszyfrować
          if (isSessionUnlocked()) {
            let allKeysReadable = true;
            const keysToCheck = Array.isArray(preBackup.keys) ? preBackup.keys : Object.keys(preBackup.data);
            for (const k of keysToCheck) {
              const val = await getStorageItem(k);
              if (val === null || val === undefined) {
                allKeysReadable = false;
                break;
              }
            }
            if (allKeysReadable) {
              await removeRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
            }
          }
        } else {
          // Encryption inactive: ask user whether to restore data from backup
          const shouldRestore = window.confirm(
            `Wykryto kopię zapasową danych z nieukończonej próby szyfrowania bazy danych. Czy chcesz przywrócić dane z tej kopii zapasowej?`
          );
          if (shouldRestore) {
            for (const [k, v] of Object.entries(preBackup.data)) {
              await setStorageItem(k, v);
            }
            await removeRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
            notify('Przywrócono dane z kopii zapasowej sprzed próby szyfrowania.', 'ok');
          } else {
            const shouldDiscard = window.confirm('Czy usunąć tę kopię zapasową?');
            if (shouldDiscard) {
              await removeRawItem(STORAGE_KEYS.PRE_ENCRYPTION_BACKUP);
            }
          }
        }
      }

      const stateMeta = await getStorageItem<StateMeta>(STORAGE_KEYS.STATE_META);
      const idbState = await getStorageItem<AppState>(STORAGE_KEYS.APP_STATE);
      const dbRev = (stateMeta && typeof stateMeta.revision === 'number')
        ? stateMeta.revision
        : (multiTabStateService.extractRevision(idbState) || 1);
      const currentLocalRev = multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE);

      let targetAppState = stateRef.current.appState;
      let targetSchedData = stateRef.current.schedData;

      // Task 2: Po odblokowaniu NIE nadpisuj stanu w pamięci starszym stanem z bazy, jeśli ma wyższą lub równą rewizję
      const isFirstBoot = !storageReadyRef.current && (hydratedRef.current === null);
      if (idbState && (isFirstBoot || dbRev > currentLocalRev)) {
        targetAppState = sortAppState(idbState);
        setAppState(targetAppState);
        multiTabStateService.setLocalRevision(dbRev);

        const idbSched = await getStorageItem<SchedData>(STORAGE_KEYS.SCHED_DATA);
        if (idbSched) {
          targetSchedData = cleanSchedDataMeta(idbSched);
          setSchedData(targetSchedData);
        }
      } else {
        // Keep current in-memory state
        targetAppState = stateRef.current.appState;
        targetSchedData = stateRef.current.schedData;
      }

      // Memorize loaded references as hydratedRef so debounced effect skips unedited initial state
      hydratedRef.current = {
        appState: targetAppState,
        schedData: targetSchedData
      };

      const archiveRes = await getStorageItemDetailed<ArchiveEntry[]>(STORAGE_KEYS.ARCHIVE);
      if (archiveRes.status === 'found') {
        if (Array.isArray(archiveRes.data)) {
          setArchive(archiveRes.data);
        }
        if (archiveRes.quarantinedCount && archiveRes.quarantinedCount > 0) {
          notify(`Zabezpieczono ${archiveRes.quarantinedCount} uszkodzonych wpisów archiwum w kopii ratunkowej.`, 'info');
        }
      } else if (archiveRes.status === 'error' || archiveRes.status === 'corrupted') {
        setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.ARCHIVE]: true }));
        setCorruptDataModal({
          key: STORAGE_KEYS.ARCHIVE,
          rawContent: archiveRes.status === 'error' ? String(archiveRes.error) : (typeof archiveRes.rawContent === 'string' ? archiveRes.rawContent : JSON.stringify(archiveRes.rawContent, null, 2))
        });
        setStorageInitError('Wykryto błąd odczytu lub uszkodzenie archiwum (ARCHIVE). Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.');
        storageReadyRef.current = false;
        setStorageReady(false);
        return;
      }

      const snapsRes = await getStorageItemDetailed<SnapshotEntry[]>(STORAGE_KEYS.SNAPSHOTS);
      if (snapsRes.status === 'found') {
        if (Array.isArray(snapsRes.data)) {
          setSnapshots(pruneSnapshots(snapsRes.data));
        }
        if (snapsRes.quarantinedCount && snapsRes.quarantinedCount > 0) {
          notify(`Zabezpieczono ${snapsRes.quarantinedCount} uszkodzonych punktów przywracania w kopii ratunkowej.`, 'info');
        }
      } else if (snapsRes.status === 'error' || snapsRes.status === 'corrupted') {
        setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.SNAPSHOTS]: true }));
        setCorruptDataModal({
          key: STORAGE_KEYS.SNAPSHOTS,
          rawContent: snapsRes.status === 'error' ? String(snapsRes.error) : (typeof snapsRes.rawContent === 'string' ? snapsRes.rawContent : JSON.stringify(snapsRes.rawContent, null, 2))
        });
        setStorageInitError('Wykryto błąd odczytu lub uszkodzenie punktów przywracania (SNAPSHOTS). Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.');
        storageReadyRef.current = false;
        setStorageReady(false);
        return;
      }

      const autosavesRes = await getStorageItemDetailed<AutosaveVersion[]>(STORAGE_KEYS.AUTOSAVE_VERSIONS);
      if (autosavesRes.status === 'found') {
        if (Array.isArray(autosavesRes.data) && autosavesRes.data.length > 0) {
          // Migracja istniejących wersji do formatu osobnych kluczy autosave_<ts>
          for (const item of autosavesRes.data) {
            if (item && item.timestamp) {
              const ts = new Date(item.timestamp).getTime();
              if (!isNaN(ts) && ts > 0) {
                await setStorageItem(`autosave_${ts}`, item);
              }
            }
          }
          // Po udanej migracji usuń stary zbiorczy klucz AUTOSAVE_VERSIONS
          await removeStorageItem(STORAGE_KEYS.AUTOSAVE_VERSIONS);
        }
        if (autosavesRes.quarantinedCount && autosavesRes.quarantinedCount > 0) {
          notify(`Zabezpieczono ${autosavesRes.quarantinedCount} uszkodzonych wersji autozapisu w kopii ratunkowej.`, 'info');
        }
      } else if (autosavesRes.status === 'error' || autosavesRes.status === 'corrupted') {
        setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.AUTOSAVE_VERSIONS]: true }));
        setCorruptDataModal({
          key: STORAGE_KEYS.AUTOSAVE_VERSIONS,
          rawContent: autosavesRes.status === 'error' ? String(autosavesRes.error) : (typeof autosavesRes.rawContent === 'string' ? autosavesRes.rawContent : JSON.stringify(autosavesRes.rawContent, null, 2))
        });
        setStorageInitError('Wykryto błąd odczytu lub uszkodzenie autozapisu (AUTOSAVE_VERSIONS). Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.');
        storageReadyRef.current = false;
        setStorageReady(false);
        return;
      }

      // Wczytanie z bazy danych wszystkich kluczy autosave_* z uwzględnieniem przerzedzania (3/godz, 1/doba)
      const prunedAutosaves = await pruneAutosaveVersions();
      if (prunedAutosaves.length > 0) {
        setAutosaveVersions(prunedAutosaves);
      }

      const idbLogs = await getStorageItem<AppEventLog[]>(STORAGE_KEYS.HISTORY_LOGS);
      if (idbLogs && Array.isArray(idbLogs) && idbLogs.length > 0) {
        setHistoryLogs(idbLogs);
      }

      const variantsRes = await getStorageItemDetailed<PlanVariant[]>(STORAGE_KEYS.PLAN_VARIANTS);
      if (variantsRes.status === 'found') {
        if (Array.isArray(variantsRes.data) && variantsRes.data.length > 0) {
          setPlanVariants(variantsRes.data);
        }
        if (variantsRes.quarantinedCount && variantsRes.quarantinedCount > 0) {
          notify(`Zabezpieczono ${variantsRes.quarantinedCount} uszkodzonych wariantów planu w kopii ratunkowej.`, 'info');
        }
      } else if (variantsRes.status === 'error' || variantsRes.status === 'corrupted') {
        setBlockedWrites(prev => ({ ...prev, [STORAGE_KEYS.PLAN_VARIANTS]: true }));
        setCorruptDataModal({
          key: STORAGE_KEYS.PLAN_VARIANTS,
          rawContent: variantsRes.status === 'error' ? String(variantsRes.error) : (typeof variantsRes.rawContent === 'string' ? variantsRes.rawContent : JSON.stringify(variantsRes.rawContent, null, 2))
        });
        setStorageInitError('Wykryto błąd odczytu lub uszkodzenie wariantów planu (PLAN_VARIANTS). Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.');
        storageReadyRef.current = false;
        setStorageReady(false);
        return;
      }

      const idbActiveVarId = await getStorageItem<string>(STORAGE_KEYS.ACTIVE_VARIANT_ID);
      if (idbActiveVarId) {
        setActiveVariantId(idbActiveVarId);
      }

      const stats = await getDetailedStorageStats();
      setStorageStats(stats);
      success = true;
    } catch (e: unknown) {
      console.warn('Inicjalizacja IndexedDB zakończona z błędem:', e);
      setStorageInitError(e instanceof Error ? e.message : 'Błąd połączenia z bazą IndexedDB.');
      storageReadyRef.current = false;
      setStorageReady(false);
    } finally {
      if (success) {
        storageReadyRef.current = true;
        setStorageReady(true);
      }
    }
  };

  useEffect(() => {
    if (!isLocked) {
      initStorage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initStorage runs on mount and lock transitions only
  }, [isLocked]);

  useEffect(() => {
    const handleSessionLocked = () => {
      setIsLocked(true);
      storageReadyRef.current = false;
      setStorageReady(false);
    };
    window.addEventListener('saleplan-session-locked', handleSessionLocked);
    return () => window.removeEventListener('saleplan-session-locked', handleSessionLocked);
  }, []);

  // Task 2: Auto-blokada - przed lockSession() wykonaj flush niezapisanych zmian
  useEffect(() => {
    setBeforeLockHook(async () => {
      if (!storageReadyRef.current || isLocked) return;
      try {
        const saved = await persistAppStateAndSchedWithConflictCheck(
          stateRef.current.appState,
          stateRef.current.schedData
        );
        if (saved) {
          await pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
          setSaveStatus('saved');
        } else {
          // Gdy persistAppStateAndSchedWithConflictCheck zwróci false,
          // zapisz bieżący stan do klucza kopii awaryjnej (zaszyfrowany)
          await setStorageItem(STORAGE_KEYS.PENDING_CHANGES_BACKUP, {
            appState: stateRef.current.appState,
            schedData: stateRef.current.schedData,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.warn('Flush przed blokadą nie powiódł się:', err);
      }
    });
    return () => {
      setBeforeLockHook(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- beforeLockHook registrations are managed by lock state
  }, [isLocked]);

  const handleUnlocked = async () => {
    setIsLocked(false);
    await initStorage();
    migrateAllStoredItemsToV2().catch(() => {});

    // Sprawdzenie czy przed zablokowaniem wykryto konflikt z ostatniej chwili
    try {
      const pendingBackup = await getStorageItem<{ appState: AppState; schedData: SchedData; timestamp: number }>(
        STORAGE_KEYS.PENDING_CHANGES_BACKUP
      );
      if (pendingBackup) {
        notify('Zmiany z ostatniej chwili wykryły konflikt – wybierz wersję', 'err');
        setConflictData(prev => {
          if (prev) return prev;
          return {
            localRevision: multiTabStateService.getLocalRevision(),
            incomingRevision: multiTabStateService.getLocalRevision() + 1,
            incomingTabId: 'inna_karta',
            dbAppState: pendingBackup.appState,
            dbSchedData: pendingBackup.schedData
          };
        });
        setShowConflictModal(true);
      }
    } catch (e) {
      console.warn('Błąd sprawdzania kopii awaryjnej po odblokowaniu:', e);
    }
  };

  const handleEmergencyReset = async () => {
    removeStorageEncryptionMeta();
    await clearAllStorage();
    setIsLocked(false);
    setStorageReady(false);
    handleUpdateAppState(getDemoAppState());
    setSchedData({});
    await setStorageItem(STORAGE_KEYS.APP_STATE, getDemoAppState());
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, {});
    refreshStorageStats();
    notify('Zresetowano blokadę bazy danych i wczytano dane demonstracyjne.', 'ok');
    try {
      window.location.reload();
    } catch {}
  };

  useEffect(() => {
    if (!storageReady || isLocked) return;
    setStorageItem(STORAGE_KEYS.HISTORY_LOGS, historyLogs).catch((err: unknown) => {
      console.warn('Nie udało się zapisać dziennika zdarzeń:', err);
    });
  }, [historyLogs, storageReady, isLocked]);

  const addEventLog = (actionType: AppEventLog['actionType'], description: string, details?: string) => {
    const newLog: AppEventLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now(),
      timestamp: new Date().toISOString(),
      actionType,
      description,
      details
    };
    setHistoryLogs(prev => [newLog, ...prev.slice(0, 99)]); // keep up to 100 entries for stability
  };

  const handleChangeSnapshots = (newSnaps: SnapshotEntry[]) => {
    const prunedSnaps = pruneSnapshots(newSnaps);
    if (prunedSnaps.length > snapshots.length) {
      const added = prunedSnaps.find(n => !snapshots.some(s => s && s.id === n.id));
      if (added) {
        addEventLog(
          'snapshot_create',
          'Utworzono punkt przywracania (Snapshot)',
          `Nazwa: "${added.name}".` + (added.comment ? ` Komentarz: "${added.comment}"` : '')
        );
      }
    } else if (prunedSnaps.length < snapshots.length) {
      const deleted = snapshots.find(s => s && !prunedSnaps.some(n => n.id === s.id));
      if (deleted) {
        addEventLog(
          'snapshot_delete',
          'Usunięto punkt przywracania (Snapshot)',
          `Nazwa: "${deleted.name}".`
        );
      }
    } else if (prunedSnaps.length === 0 && snapshots.length > 0) {
      addEventLog(
        'snapshot_delete',
        'Wyczyszczono wszystkie punkty przywracania',
        'Usunięto bezpowrotnie wszystkie zapisane kopie zapasowe planu.'
      );
    }
    setSnapshots(prunedSnaps);
  };

  /**
   * Zapisuje nową wersję autozapisu do osobnego klucza autosave_<ts>:
   * - Porównanie po numerze rewizji (zamiast JSON.stringify)
   * - Tworzy nową wersję co najwyżej co 5 minut LUB po 50 zmianach (lub wymuszenie force)
   * - Przeprowadza automatyczne przerzedzanie (3 z godziny, 1 z doby)
   */
  const pushAutosaveVersion = async (
    newAppState: AppState,
    newSchedData: SchedData,
    options?: { force?: boolean }
  ) => {
    if (!storageReadyRef.current || isLocked || blockedWrites[STORAGE_KEYS.AUTOSAVE_VERSIONS] || isWriteBlocked(STORAGE_KEYS.AUTOSAVE_VERSIONS)) {
      if (blockedWrites[STORAGE_KEYS.AUTOSAVE_VERSIONS] || isWriteBlocked(STORAGE_KEYS.AUTOSAVE_VERSIONS)) {
        console.warn('Pominięto autozapis – zapis klucza AUTOSAVE_VERSIONS jest zablokowany z powodu uszkodzonych danych.');
      }
      return;
    }

    try {
      // 1. Porównanie po numerze rewizji zamiast JSON.stringify
      const currentRev = (newAppState as any).revision ?? multiTabStateService.getLocalRevision(STORAGE_KEYS.APP_STATE);
      if (!options?.force && currentRev > 0 && currentRev === lastAutosaveRevisionRef.current) {
        return; // Brak nowej rewizji, nie powielaj
      }

      // 2. Wersja tworzona co najwyżej co 5 minut (300 000 ms) LUB po 50 zmianach
      const now = Date.now();
      const timeDiff = now - lastAutosaveTimeRef.current;
      const editCount = editCountSinceAutosaveRef.current;

      if (!options?.force && lastAutosaveTimeRef.current > 0 && timeDiff < 5 * 60 * 1000 && editCount < 50) {
        return;
      }

      // 3. Każda wersja jako osobny klucz autosave_<ts>
      const autosaveKey = `autosave_${now}`;
      const newVersion: AutosaveVersion = {
        id: `autosave-${now}`,
        timestamp: new Date(now).toISOString(),
        appState: JSON.parse(JSON.stringify(newAppState)),
        schedData: JSON.parse(JSON.stringify(newSchedData)),
        revision: currentRev
      };

      await setStorageItem(autosaveKey, newVersion);
      lastAutosaveTimeRef.current = now;
      editCountSinceAutosaveRef.current = 0;
      lastAutosaveRevisionRef.current = currentRev;

      // 4. Przerzedzanie (3 z godziny, 1 z doby)
      const nextVersions = await pruneAutosaveVersions();
      setAutosaveVersions(nextVersions);
    } catch (e) {
      if (e instanceof StorageWriteBlockedError) return;
      console.error('Błąd podczas wersjonowania autozapisu:', e);
    }
  };

  // Active variant memoized
  const activeVariant = useMemo(() => {
    return planVariants.find(v => v.id === activeVariantId) || planVariants[0] || null;
  }, [planVariants, activeVariantId]);

  // Sprawdzenie, czy bieżące okno przeglądarki zostało otwarte jako Ekran Towarzyszący (mode=companion)
  const isCompanionMode = useMemo(() => dualScreenService.isCompanionInstance(), []);

  // Zapewnienie domyślnego wariantu planu, jeśli magazyn był pusty
  useEffect(() => {
    if (!storageReady || isLocked || blockedWrites[STORAGE_KEYS.PLAN_VARIANTS] || isWriteBlocked(STORAGE_KEYS.PLAN_VARIANTS)) return;
    if (planVariants.length === 0 && appState.planLekcji) {
      const defaultVar: PlanVariant = {
        id: 'default_semestr_1',
        name: 'Wariant Główny (Semestr I)',
        tag: 'semestr_1',
        color: '#3b82f6',
        description: 'Podstawowy rozkład zajęć roku szkolnego (I semestr).',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          lessons: JSON.parse(JSON.stringify(appState.planLekcji.lessons || {})),
          schedData: JSON.parse(JSON.stringify(schedData || {})),
          assignments: JSON.parse(JSON.stringify(appState.planLekcji.assignments || [])),
          specialLessons: JSON.parse(JSON.stringify(appState.planLekcji.specialLessons || {})),
          specialAbsences: JSON.parse(JSON.stringify(appState.planLekcji.specialAbsences || {})),
          spePlan: JSON.parse(JSON.stringify(appState.planLekcji.spePlan || { slotAssignments: [] })),
          dyzury: JSON.parse(JSON.stringify(appState.dyzury?.harmonogram || {}))
        },
        stats: {
          totalLessons: Object.keys(appState.planLekcji.lessons || {}).length,
          classesCount: appState.planLekcji.classes?.length || 0,
          teachersCount: appState.planLekcji.teachers?.length || 0,
          roomsUsedCount: appState.planLekcji.rooms?.length || 0
        }
      };
      setPlanVariants([defaultVar]);
      setActiveVariantId(defaultVar.id);
      setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, [defaultVar]).catch(() => {});
      setStorageItem(STORAGE_KEYS.ACTIVE_VARIANT_ID, defaultVar.id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Default variant creation only triggers upon initial storage readiness or core structural changes
  }, [storageReady, isLocked, blockedWrites, appState.planLekcji.classes.length, appState.planLekcji.teachers.length]);

  // Opóźniony automatyczny zapis zmian roboczych do aktywnego wariantu
  useEffect(() => {
    if (!storageReady || isLocked || blockedWrites[STORAGE_KEYS.PLAN_VARIANTS] || isWriteBlocked(STORAGE_KEYS.PLAN_VARIANTS)) return;
    if (!activeVariantId || planVariants.length === 0) return;

    const timer = setTimeout(() => {
      setPlanVariants(prev => {
        const idx = prev.findIndex(v => v.id === activeVariantId);
        if (idx === -1) return prev;
        const cur = prev[idx];
        const updatedVariant: PlanVariant = {
          ...cur,
          updatedAt: new Date().toISOString(),
          data: {
            ...cur.data,
            lessons: appState.planLekcji.lessons || {},
            schedData: schedData || {},
            assignments: appState.planLekcji.assignments || [],
            specialLessons: appState.planLekcji.specialLessons || {},
            specialAbsences: appState.planLekcji.specialAbsences || {},
            spePlan: appState.planLekcji.spePlan || { slotAssignments: [] },
            dyzury: appState.dyzury?.harmonogram || {}
          },
          stats: {
            totalLessons: Object.keys(appState.planLekcji.lessons || {}).length,
            classesCount: appState.planLekcji.classes.length,
            teachersCount: appState.planLekcji.teachers.length,
            roomsUsedCount: appState.planLekcji.rooms.length
          }
        };
        const copy = [...prev];
        copy[idx] = updatedVariant;
        setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, copy).catch((e: unknown) => {
          setSaveStatus('error');
          notify('Błąd zapisu wariantu planu!', 'err');
        });
        return copy;
      });
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Debounce auto-save only responds to substantive schedule data changes without thrashing on structural lengths
  }, [storageReady, isLocked, blockedWrites, appState.planLekcji.lessons, appState.planLekcji.assignments, appState.dyzury?.harmonogram, schedData, activeVariantId]);

  const handleSwitchVariant = (targetVariantId: string) => {
    const target = planVariants.find(v => v.id === targetVariantId);
    if (!target) return;
    if (targetVariantId === activeVariantId) {
      notify(`Wariant „${target.name}” jest już aktualnie aktywny.`, 'info');
      return;
    }

    // 1. Snapshot active variant state before switching
    const updatedVariants = planVariants.map(v => {
      if (v.id === activeVariantId) {
        return {
          ...v,
          updatedAt: new Date().toISOString(),
          data: {
            lessons: JSON.parse(JSON.stringify(appState.planLekcji.lessons || {})),
            schedData: JSON.parse(JSON.stringify(schedData || {})),
            assignments: JSON.parse(JSON.stringify(appState.planLekcji.assignments || [])),
            specialLessons: JSON.parse(JSON.stringify(appState.planLekcji.specialLessons || {})),
            specialAbsences: JSON.parse(JSON.stringify(appState.planLekcji.specialAbsences || {})),
            spePlan: JSON.parse(JSON.stringify(appState.planLekcji.spePlan || { slotAssignments: [] })),
            dyzury: JSON.parse(JSON.stringify(appState.dyzury?.harmonogram || {}))
          }
        };
      }
      return v;
    });

    const refreshedTarget = updatedVariants.find(v => v.id === targetVariantId) || target;

    // 2. Commit target variant into current working state
    setAppState(prev => ({
      ...prev,
      planLekcji: {
        ...prev.planLekcji,
        lessons: refreshedTarget.data.lessons || {},
        assignments: refreshedTarget.data.assignments && refreshedTarget.data.assignments.length > 0
          ? refreshedTarget.data.assignments
          : prev.planLekcji.assignments,
        specialLessons: refreshedTarget.data.specialLessons || {},
        specialAbsences: refreshedTarget.data.specialAbsences || {},
        spePlan: refreshedTarget.data.spePlan || { slotAssignments: [] }
      },
      dyzury: {
        ...prev.dyzury,
        harmonogram: refreshedTarget.data.dyzury || {}
      }
    }));

    setSchedData(refreshedTarget.data.schedData || {});
    setActiveVariantId(refreshedTarget.id);
    setPlanVariants(updatedVariants);

    setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updatedVariants);
    setStorageItem(STORAGE_KEYS.ACTIVE_VARIANT_ID, refreshedTarget.id);

    setUndoStack([]);
    setRedoStack([]);

    addEventLog('other', `Przełączono na wariant: "${refreshedTarget.name}"`, `Kategoria: ${refreshedTarget.tag}`);
    notify(`Przełączono aktywny plan na wariant: „${refreshedTarget.name}”.`, 'ok');
  };

  const handleSaveVariants = (updated: PlanVariant[]) => {
    setPlanVariants(updated);
    setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updated);
  };

  const handleUpdateActiveVariant = (updatedVar: PlanVariant) => {
    setPlanVariants(prev => {
      const next = prev.map(v => v.id === updatedVar.id ? updatedVar : v);
      setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, next);
      return next;
    });
  };

  const handleApplySelectiveClassSync = (sourceVarId: string, targetVarId: string, classId: string) => {
    const sourceVar = planVariants.find(v => v.id === sourceVarId);
    const targetVar = planVariants.find(v => v.id === targetVarId);
    const targetClass = appState.planLekcji.classes.find(c => c.id === classId);

    if (!sourceVar || !targetVar || !targetClass) return;

    // 1. Synchronizacja siatki lekcji klasy
    const lessonsFrom = sourceVar.data.lessons || {};
    const newLessonsTo = { ...targetVar.data.lessons };

    // Usunięcie bieżących lekcji danej klasy z wariantu docelowego
    Object.keys(newLessonsTo).forEach(k => {
      if (k.startsWith(`${classId}|`)) {
        delete newLessonsTo[k];
      }
    });

    // Skopiowanie lekcji z wariantu źródłowego
    Object.entries(lessonsFrom).forEach(([k, l]) => {
      if (k.startsWith(`${classId}|`)) {
        newLessonsTo[k] = JSON.parse(JSON.stringify(l));
      }
    });

    // 2. Synchronizacja planu sal (schedData) dla danej klasy
    const sourceSched: Record<string, any> = (sourceVar.data.schedData || {}) as Record<string, any>;
    const targetSched: Record<string, any> = JSON.parse(JSON.stringify(targetVar.data.schedData || {}));

    // Czyszczenie starej alokacji sal dla tej klasy
    Object.keys(targetSched).forEach(yK => {
      const daysObj = targetSched[yK];
      if (daysObj && typeof daysObj === 'object') {
        Object.keys(daysObj).forEach(dK => {
          const hoursObj = daysObj[dK];
          if (hoursObj && typeof hoursObj === 'object') {
            Object.keys(hoursObj).forEach(hK => {
              const roomsObj = hoursObj[hK];
              if (roomsObj && typeof roomsObj === 'object') {
                Object.keys(roomsObj).forEach(rK => {
                  const cell = roomsObj[rK];
                  if (cell && (cell.k === targetClass.name || cell.k === targetClass.id)) {
                    delete roomsObj[rK];
                  }
                });
              }
            });
          }
        });
      }
    });

    // Kopiowanie alokacji sal z wariantu źródłowego
    Object.keys(sourceSched).forEach(yK => {
      const daysObj = sourceSched[yK];
      if (daysObj && typeof daysObj === 'object') {
        if (!targetSched[yK]) targetSched[yK] = {};
        Object.keys(daysObj).forEach(dK => {
          const hoursObj = daysObj[dK];
          if (hoursObj && typeof hoursObj === 'object') {
            if (!targetSched[yK][dK]) targetSched[yK][dK] = {};
            Object.keys(hoursObj).forEach(hK => {
              const roomsObj = hoursObj[hK];
              if (roomsObj && typeof roomsObj === 'object') {
                if (!targetSched[yK][dK][hK]) targetSched[yK][dK][hK] = {};
                Object.keys(roomsObj).forEach(rK => {
                  const cell = roomsObj[rK];
                  if (cell && (cell.k === targetClass.name || cell.k === targetClass.id)) {
                    targetSched[yK][dK][hK][rK] = JSON.parse(JSON.stringify(cell));
                  }
                });
              }
            });
          }
        });
      }
    });

    const updatedTargetVar: PlanVariant = {
      ...targetVar,
      data: {
        ...targetVar.data,
        lessons: newLessonsTo,
        schedData: targetSched as SchedData
      },
      updatedAt: new Date().toISOString()
    };

    const updatedVariants = planVariants.map(v => v.id === targetVar.id ? updatedTargetVar : v);
    setPlanVariants(updatedVariants);
    setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updatedVariants);

    if (targetVar.id === activeVariantId) {
      setAppState(prev => ({
        ...prev,
        planLekcji: {
          ...prev.planLekcji,
          lessons: newLessonsTo
        }
      }));
      setSchedData(targetSched as SchedData);
    }

    addEventLog('other', `Synchronizacja planu klasy i sal: ${targetClass.name}`, `Przeniesiono lekcje oraz przydziały sal z "${sourceVar.name}" do "${targetVar.name}".`);
    notify(`Przeniesiono plan lekcji i sal klasy ${targetClass.name} z „${sourceVar.name}” do „${targetVar.name}”.`, 'ok');
  };

  const handleApplyTeacherDutySync = (sourceVarId: string, targetVarId: string, teacherAbbr: string) => {
    const sourceVar = planVariants.find(v => v.id === sourceVarId);
    const targetVar = planVariants.find(v => v.id === targetVarId);
    const teacher = appState.planLekcji.teachers.find(t => t.abbr === teacherAbbr || t.id === teacherAbbr);

    if (!sourceVar || !targetVar || !teacher) return;

    const sourceDuties = sourceVar.data.dyzury || {};
    const targetDuties = { ...(targetVar.data.dyzury || {}) };

    // Usunięcie dotychczasowych dyżurów tego nauczyciela z wariantu docelowego
    Object.keys(targetDuties).forEach(k => {
      if (targetDuties[k]?.teacherAbbr === teacher.abbr) {
        delete targetDuties[k];
      }
    });

    // Skopiowanie dyżurów z wariantu źródłowego
    let copiedCount = 0;
    Object.entries(sourceDuties).forEach(([key, entry]) => {
      if (entry && entry.teacherAbbr === teacher.abbr) {
        targetDuties[key] = JSON.parse(JSON.stringify(entry));
        copiedCount++;
      }
    });

    const updatedTargetVar: PlanVariant = {
      ...targetVar,
      data: {
        ...targetVar.data,
        dyzury: targetDuties
      },
      updatedAt: new Date().toISOString()
    };

    const updatedVariants = planVariants.map(v => v.id === targetVar.id ? updatedTargetVar : v);
    setPlanVariants(updatedVariants);
    setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updatedVariants);

    if (targetVar.id === activeVariantId) {
      setAppState(prev => ({
        ...prev,
        dyzury: {
          ...prev.dyzury,
          harmonogram: targetDuties
        }
      }));
    }

    addEventLog('other', `Synchronizacja dyżurów: ${teacher.first} ${teacher.last}`, `Skopiowano ${copiedCount} dyżurów z "${sourceVar.name}" do "${targetVar.name}".`);
    notify(`Skopiowano ${copiedCount} dyżurów nauczyciela ${teacher.first} ${teacher.last} (${teacher.abbr}) do wariantu „${targetVar.name}”.`, 'ok');
  };

  const [currentTab, setCurrentTab] = useState<'plan_klas' | 'plan_sal' | 'dyzury' | 'zastepstwa' | 'higiena_men' | 'eksport_raporty' | 'porownywarka_diff' | 'kreator' | 'wydruki' | 'statystyki' | 'o_programie' | 'ustawienia_generatorow'>('kreator');
  const [oProgramieTab, setOProgramieTab] = useState<'info' | 'instructions' | 'changelog'>('info');

  // Bezpośredni podgląd planu mobilnego z kodu QR (?view=mobile_plan)
  const [isMobilePlanMode, setIsMobilePlanMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('view') === 'mobile_plan';
    }
    return false;
  });

  useEffect(() => {
    const sName = APP_TAB_NAMES[currentTab] || currentTab;
    multiTabStateService.setTabContext(currentTab, sName, `Karta: ${sName}`);
  }, [currentTab]);

  // ── DUAL SCREEN (DWA EKRANY) STATE & SYNC ──
  const [isMultiScreenAvailable, setIsMultiScreenAvailable] = useState<boolean>(() => dualScreenService.getIsMultiScreenAvailable());
  const [isCompanionActive, setIsCompanionActive] = useState<boolean>(() => dualScreenService.isCompanionWindowActive());
  const [isForcedDualScreen, setIsForcedDualScreen] = useState<boolean>(() => dualScreenService.isForcedMode());
  const lastSyncTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateScreens = () => {
      setIsMultiScreenAvailable(dualScreenService.updateMultiScreenStatus());
      setIsCompanionActive(dualScreenService.isCompanionWindowActive());
      setIsForcedDualScreen(dualScreenService.isForcedMode());
    };
    updateScreens();
    const interval = setInterval(updateScreens, 2500);
    return () => clearInterval(interval);
  }, []);

  // Dual Screen BroadcastChannel subscription for messages from companion
  useEffect(() => {
    const unsub = dualScreenService.subscribe((msg: DualScreenMessage<any>) => {
      if (msg.type === 'HANDSHAKE' || msg.type === 'PING') {
        setIsCompanionActive(true);
        const now = Date.now();
        lastSyncTimestampRef.current = now;
        dualScreenService.sendMessage({
          type: 'HANDSHAKE_ACK',
          payload: { appState, schedData, activeVariant, planVariants, currentTab },
          timestamp: now
        });
        return;
      }

      if (msg.type === 'COMPANION_CLOSED') {
        setIsCompanionActive(false);
        return;
      }

      // Etap 2: Weryfikacja konfliktu edycji (odrzucanie nieaktualnych zmian)
      if (msg.timestamp && msg.timestamp < lastSyncTimestampRef.current) {
        console.warn(`[dualScreen] Odrzucono przestarzałą wiadomość ${msg.type} (${msg.timestamp} < ${lastSyncTimestampRef.current})`);
        return;
      }
      if (msg.timestamp) {
        lastSyncTimestampRef.current = msg.timestamp;
      }

      if (msg.type === 'CREATE_VARIANT') {
        const { variant, activateImmediately } = msg.payload || {};
        if (variant) {
          setPlanVariants(prev => {
            const exists = prev.some(v => v.id === variant.id);
            const updated = exists ? prev.map(v => v.id === variant.id ? variant : v) : [...prev, variant];
            setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updated);
            return updated;
          });
          if (activateImmediately) {
            handleSwitchVariant(variant.id);
          }
          notify(`Utworzono nowy wariant: "${variant.name}" z Ekranu 2!`, 'ok');
        }
      } else if (msg.type === 'SWITCH_VARIANT') {
        const { variantId } = msg.payload || {};
        if (variantId) {
          handleSwitchVariant(variantId);
        }
      } else if (msg.type === 'UPDATE_LESSONS') {
        const { lessons } = msg.payload || {};
        if (lessons) {
          setAppState(prev => {
            const nextState = {
              ...prev,
              planLekcji: {
                ...prev.planLekcji,
                lessons
              }
            };
            setStorageItem(STORAGE_KEYS.APP_STATE, nextState);
            return nextState;
          });
        }
      } else if (msg.type === 'UPDATE_SCHED_DATA') {
        const { schedData: newSched } = msg.payload || {};
        if (newSched) {
          setSchedData(newSched);
          persistAppStateAndSchedWithConflictCheck(
            stateRef.current.appState,
            newSched,
            { forceOverwrite: true }
          ).catch((e) => {
            console.warn('Błąd zapisu planu z UPDATE_SCHED_DATA:', e);
          });
        }
      } else if (msg.type === 'UPDATE_DUTIES') {
        const { dyzury, appState: incomingState } = msg.payload || {};
        if (dyzury || incomingState) {
          setAppState(prev => {
            const nextState: AppState = incomingState ? incomingState : {
              ...prev,
              dyzury: dyzury || prev.dyzury
            };
            setStorageItem(STORAGE_KEYS.APP_STATE, nextState);
            return nextState;
          });
        }
      } else if (msg.type === 'ASSIGN_ROOM_CLICK') {
        const { dayIdx, hourIdx, classId, roomId, roomName } = msg.payload || {};
        if (dayIdx !== undefined && hourIdx !== undefined && roomId) {
          const targetClassId = classId || appState.planLekcji.classes[0]?.id;
          if (targetClassId) {
            setAppState(prev => {
              const pl = prev.planLekcji;
              // Wyszukanie pasującego klucza lekcji
              const matchEntry = Object.entries(pl.lessons).find(([k]) => {
                const parts = k.split('|');
                return parts[0] === targetClassId && parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hourIdx;
              });

              if (matchEntry) {
                const asgId = matchEntry[1].assignmentId;
                const updatedAssignments = pl.assignments.map(a => a.id === asgId ? { ...a, roomId } : a);
                const nextState = {
                  ...prev,
                  planLekcji: {
                    ...pl,
                    assignments: updatedAssignments
                  }
                };
                setStorageItem(STORAGE_KEYS.APP_STATE, nextState);
                notify(`Przypisano salę ${roomName || roomId} do lekcji (Klasa: ${targetClassId}, Godz: ${hourIdx + 1})`, 'ok');
                return nextState;
              }
              return prev;
            });
          }
        }
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Subscription to companion window messages
  }, [appState, schedData, activeVariant, planVariants, currentTab]);

  // Automatyczna synchronizacja zmiany widoku (zakładki) w oknie głównym na Ekran 2
  useEffect(() => {
    if (isCompanionActive) {
      dualScreenService.sendMessage({
        type: 'TAB_CHANGE',
        payload: { tab: currentTab },
        timestamp: Date.now()
      });
    }
  }, [currentTab, isCompanionActive]);

  // Synchronizacja stanu w czasie rzeczywistym z Ekranem 2
  useEffect(() => {
    if (isCompanionActive) {
      const now = Date.now();
      lastSyncTimestampRef.current = now;
      dualScreenService.sendMessage({
        type: 'STATE_SYNC',
        payload: {
          appState,
          schedData,
          activeVariant,
          planVariants,
          currentTab
        },
        timestamp: now
      });
    }
  }, [appState, schedData, activeVariant, planVariants, currentTab, isCompanionActive]);

  const handleToggleDualScreen = async () => {
    if (isCompanionActive) {
      dualScreenService.openCompanionWindow(currentTab);
      notify('Przeniesiono fokus na Drugi Ekran (Okno Towarzyszące).', 'info');
    } else {
      const win = await dualScreenService.openCompanionWindow(currentTab);
      if (win) {
        setIsCompanionActive(true);
        notify('Włączono tryb 2 ekranów! Drugie okno z Matrycą Sal i Płachtą zostało otwarte na drugim monitorze.', 'ok');
      } else {
        notify('Przeglądarka zablokowała otwarcie drugiego okna. Zezwól na pop-upy w pasku adresu.', 'err');
      }
    }
  };

  const CURRENT_VERSION = '3.13.0';
  const [showVersionToast, setShowVersionToast] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const checkTermsAndVersion = async () => {
      // 1. Sprawdzenie akceptacji regulaminu i licencji (wymagane przy 1. uruchomieniu)
      let needsTerms = false;
      try {
        const localDirect = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED) : null;
        if (localDirect) {
          try {
            const parsed = JSON.parse(localDirect);
            if (parsed && parsed.accepted) {
              needsTerms = false;
            } else {
              needsTerms = true;
            }
          } catch {
            needsTerms = true;
          }
        } else {
          const termsData = await getStorageItem<{ accepted?: boolean }>(STORAGE_KEYS.TERMS_ACCEPTED) || getStorageItemSync<{ accepted?: boolean }>(STORAGE_KEYS.TERMS_ACCEPTED);
          if (!termsData || !termsData.accepted) {
            setShowTermsModal(true);
            needsTerms = true;
          }
        }
      } catch (e) {
        console.warn('Weryfikacja akceptacji regulaminu:', e);
        setShowTermsModal(true);
        needsTerms = true;
      }

      // 2. Sprawdzenie wersji dla powiadomienia o nowościach
      // Nie uruchamiaj toastu wersji, dopóki użytkownik nie zaakceptuje regulaminu
      if (!needsTerms) {
        const lastSeen = await getStorageItem<string>(STORAGE_KEYS.LAST_SEEN_VERSION) || getStorageItemSync<string>(STORAGE_KEYS.LAST_SEEN_VERSION);
        if (lastSeen !== CURRENT_VERSION) {
          const timer = setTimeout(() => {
            setShowVersionToast(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    };
    checkTermsAndVersion();
  }, []);

  const handleAcceptTerms = async () => {
    const payload = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: CURRENT_VERSION
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, JSON.stringify(payload));
      }
      await setStorageItem(STORAGE_KEYS.TERMS_ACCEPTED, payload);
    } catch (e) {
      console.error('Błąd zapisu akceptacji regulaminu:', e);
    }
    setShowTermsModal(false);

    // Po zaakceptowaniu regulaminu: sprawdzenie i wyświetlenie toastu nowej wersji
    try {
      const lastSeen = await getStorageItem<string>(STORAGE_KEYS.LAST_SEEN_VERSION) || getStorageItemSync<string>(STORAGE_KEYS.LAST_SEEN_VERSION);
      if (lastSeen !== CURRENT_VERSION) {
        setTimeout(() => {
          setShowVersionToast(true);
        }, 1200);
      }
    } catch (e) {
      console.warn('Weryfikacja wersji po akceptacji regulaminu:', e);
    }
  };

  const handleDismissVersionToast = () => {
    setStorageItem(STORAGE_KEYS.LAST_SEEN_VERSION, CURRENT_VERSION);
    setShowVersionToast(false);
  };

  const handleOpenChangelog = () => {
    setStorageItem(STORAGE_KEYS.LAST_SEEN_VERSION, CURRENT_VERSION);
    setShowVersionToast(false);
    setOProgramieTab('changelog');
    setCurrentTab('o_programie');
  };
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [showSnapshotManager, setShowSnapshotManager] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Referencja przechowująca ostatnią zweryfikowaną migawkę do natychmiastowego cofnięcia
  const lastValidBackupRef = React.useRef<{
    appState: AppState;
    schedData: SchedData;
    archive: ArchiveEntry[];
    snapshots: SnapshotEntry[];
    historyLogs: AppEventLog[];
  }>({
    appState,
    schedData,
    archive,
    snapshots,
    historyLogs
  });

  // lastValidBackupRef jest aktualizowany TYLKO bezpośrednio przed operacjami importu lub przywracania danych

  // Safety watchdog timer for isRestoring: prevents infinite loading screens
  useEffect(() => {
    if (!isRestoring) return;

    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Watchdog: Przekroczono maksymalny czas operacji przywracania/importu (timeout). Następuje automatyczny rollback i odblokowanie.');
      handleRollbackToLastValid('Przekroczono maksymalny dopuszczalny czas przetwarzania danych (timeout).');
    }, 6000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Watchdog timer triggers specifically on restoration start
  }, [isRestoring]);

  const handleRollbackToLastValid = async (reason?: string) => {
    try {
      const backup = lastValidBackupRef.current;
      if (backup) {
        setAppState(sortAppState(backup.appState));
        setSchedData(backup.schedData);
        setArchive(backup.archive);
        setSnapshots(backup.snapshots);
        setHistoryLogs(backup.historyLogs);

        await Promise.all([
          persistAppStateAndSchedWithConflictCheck(backup.appState, backup.schedData, { forceOverwrite: true }),
          setStorageItem(STORAGE_KEYS.ARCHIVE, backup.archive),
          setStorageItem(STORAGE_KEYS.SNAPSHOTS, backup.snapshots),
          setStorageItem(STORAGE_KEYS.HISTORY_LOGS, backup.historyLogs)
        ]);
        refreshStorageStats();
      }
    } catch (e) {
      console.error('Błąd podczas procedury rollbacku:', e);
    } finally {
      setIsRestoring(false);
      const msg = reason 
        ? `Wykryto problem: ${reason} Automatycznie wycofano zmiany (Rollback) i przywrócono stabilny stan.`
        : 'Wystąpił błąd podczas przetwarzania danych. Automatycznie wycofano zmiany (Rollback).';
      notify(msg, 'err');
      addEventLog('other', 'Automatyczne wycofanie zmian (Rollback)', reason || 'Wystąpił błąd spójności danych.');
    }
  };

  // Stany selektywnego eksportu i importu danych
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pendingImportFiles, setPendingImportFiles] = useState<{ name: string; content: string }[]>([]);

  const handleUpdateAppState = (newState: AppState | ((prev: AppState) => AppState)) => {
    setAppState(prev => {
      const resolved = typeof newState === 'function' ? newState(prev) : newState;
      return sortAppState(resolved);
    });
  };

  const handleUpdateArchive = (newArchive: ArchiveEntry[]) => {
    setArchive(newArchive);
  };

  // Undo / Redo Stack for schedData
  const [undoStack, setUndoStack] = useState<SchedData[]>([]);
  const [redoStack, setRedoStack] = useState<SchedData[]>([]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // ── LOCALSTORAGE / INDEXEDDB PERSISTENCE EFFECTS (DEBOUNCED) ──
  const stateRef = React.useRef({ appState, schedData });
  stateRef.current = { appState, schedData };

  // Update stateRef on edits to ensure the latest values are captured 
  useEffect(() => {
    stateRef.current = { appState, schedData };
  }, [appState, schedData]);

  // ── MULTI-TAB BROADCASTCHANNEL 'saleplan-state' SUBSCRIPTION ──
  // Subscribe to BroadcastChannel 'saleplan-state' (odrębny od trybu 2 ekranów)
  useEffect(() => {
    const unsub = multiTabStateService.subscribe((msg) => {
      if (msg.type === 'STATE_COMMITTED') {
        const localRev = multiTabStateService.getLocalRevision();
        if (msg.revision > localRev) {
          setRemoteRevision(msg.revision);
          setRemoteTabInfo({
            tabName: msg.tabLabel,
            sectionName: msg.activeSectionName
          });
          setShowRefreshBanner(true);
        }
      }
    });
    return () => unsub();
  }, []);

  const persistAppStateAndSchedWithConflictCheck = async (
    targetAppState: AppState,
    targetSchedData: SchedData,
    forceOverwriteOrOptions: boolean | { forceOverwrite?: boolean } = false
  ): Promise<CommitResult> => {
    if (!storageReadyRef.current || isLocked) {
      return { status: 'error', error: new Error('Baza danych nie jest gotowa lub sesja jest zablokowana.') };
    }
    const forceOverwrite = typeof forceOverwriteOrOptions === 'boolean'
      ? forceOverwriteOrOptions
      : (forceOverwriteOrOptions?.forceOverwrite ?? false);

    const sName = APP_TAB_NAMES[currentTab] || currentTab;
    return persistWithConflictCheck(targetAppState, targetSchedData, {
      forceOverwrite,
      baseRevision: conflictData?.incomingRevision,
      tabLabel: `Karta: ${sName}`,
      activeSection: currentTab,
      activeSectionName: sName,
      onConflict: (conflict, conflictingSched) => {
        setConflictData({
          localRevision: conflict.localRevision,
          incomingRevision: conflict.dbRevision,
          incomingTabId: conflict.dbTabId,
          incomingTabName: conflict.incomingTabLabel || (conflict.incomingSectionName ? `Karta: ${conflict.incomingSectionName}` : undefined),
          incomingSectionName: conflict.incomingSectionName,
          incomingUpdatedAt: conflict.incomingUpdatedAt,
          dbAppState: conflict.dbRecord as unknown as AppState,
          dbSchedData: conflictingSched || undefined
        });
        setShowConflictModal(true);
        setSaveStatus('dirty');
      }
    });
  };

  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;

  /**
   * Wykonuje natychmiastowy zapis (flush) bieżącego stanu przez kolejkę z persistence (P3).
   */
  const flushNow = useCallback(async (): Promise<boolean> => {
    if (!storageReadyRef.current || isLocked) return false;
    try {
      setSaveStatus('saving');
      const res = await persistAppStateAndSchedWithConflictCheck(
        stateRef.current.appState,
        stateRef.current.schedData,
        { forceOverwrite: false }
      );
      if (res.status === 'ok') {
        await pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
        setSaveStatus('saved');
        refreshStorageStats();
        return true;
      } else if (res.status === 'error') {
        setSaveStatus('error');
        return false;
      } else {
        // conflict
        setSaveStatus('dirty');
        return false;
      }
    } catch (e: unknown) {
      console.error('Błąd zapisu flushNow:', e);
      setSaveStatus('error');
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Flush now reads latest data via stateRef and stable helper references
  }, [isLocked]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__saleplanFlushNow = flushNow;
    }
    return () => {
      if (typeof window !== 'undefined' && (window as any).__saleplanFlushNow === flushNow) {
        delete (window as any).__saleplanFlushNow;
      }
    };
  }, [flushNow]);

  const handleLoadIncomingFromConflict = async () => {
    try {
      if (conflictData?.dbAppState) {
        setAppState(sortAppState(conflictData.dbAppState));
        if (conflictData.dbSchedData) {
          setSchedData(cleanSchedDataMeta(conflictData.dbSchedData));
        }
        multiTabStateService.setLocalRevision(conflictData.incomingRevision);
      } else {
        const freshState = await getStorageItem<AppState>(STORAGE_KEYS.APP_STATE);
        const freshSched = await getStorageItem<SchedData>(STORAGE_KEYS.SCHED_DATA);
        if (freshState) {
          setAppState(sortAppState(freshState));
          const rev = multiTabStateService.extractRevision(freshState) || conflictData?.incomingRevision || 1;
          multiTabStateService.setLocalRevision(rev);
        }
        if (freshSched) {
          setSchedData(cleanSchedDataMeta(freshSched));
        }
      }
      setShowConflictModal(false);
      setShowRefreshBanner(false);
      setConflictData(null);
      setSaveStatus('saved');
      removeStorageItem(STORAGE_KEYS.PENDING_CHANGES_BACKUP).catch(() => {});
      notify('Wczytano najnowszą wersję planu z innej karty.', 'ok');
    } catch (e) {
      console.error('Błąd wczytywania zmian z innej karty:', e);
      notify('Błąd podczas wczytywania nowej wersji z bazy danych.', 'err');
    }
  };

  const handleKeepLocalFromConflict = async () => {
    if (!conflictData) return;

    // 1. Zapis kopii drugiej wersji do snapshotów przed nadpisaniem
    const otherTabRev = conflictData.incomingRevision;
    const otherTabId = conflictData.incomingTabId || 'inna_karta';
    const snapshotCopy: SnapshotEntry = {
      id: 'conflict_' + Date.now(),
      name: `Kopia z innej karty (przed nadpisaniem) - Rewizja #${otherTabRev}`,
      createdAt: new Date().toISOString(),
      isManual: false, // Automatyczna kopia robocza – podlega limitowi 30 kopii
      appState: conflictData.dbAppState,
      schedData: cleanSchedDataMeta(conflictData.dbSchedData || {}),
      comment: `Automatyczna kopia zapasowa utworzona podczas rozwiązywania konfliktu w wielu kartach. Karta "${otherTabId}" zapisała rewizję #${otherTabRev}, która została zastąpiona wersją z bieżącej karty.`,
      stats: {
        assignedLessonsCount: Object.keys(conflictData.dbAppState?.planLekcji?.lessons || {}).length,
        classesCount: conflictData.dbAppState?.planLekcji?.classes?.length || 0,
        teachersCount: conflictData.dbAppState?.planLekcji?.teachers?.length || 0
      }
    };

    setSnapshots(prev => {
      const updated = pruneSnapshots([snapshotCopy, ...prev]);
      setStorageItem(STORAGE_KEYS.SNAPSHOTS, updated).catch(() => {});
      return updated;
    });

    // 2. Bezpieczny zapis własnej wersji z nową rewizją
    setSaveStatus('saving');
    try {
      const res = await persistAppStateAndSchedWithConflictCheck(
        stateRef.current.appState,
        stateRef.current.schedData,
        true // force overwrite
      );
      if (res.status === 'ok') {
        await pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
        setSaveStatus('saved');
        refreshStorageStats();
        setShowConflictModal(false);
        setShowRefreshBanner(false);
        setConflictData(null);
        removeStorageItem(STORAGE_KEYS.PENDING_CHANGES_BACKUP).catch(() => {});
        notify('Zachowano Twoją wersję planu. Kopia z innej karty została bezpiecznie zapisana w Punktach Przywracania.', 'ok');
      } else if (res.status === 'error') {
        setSaveStatus('error');
        notify('Nie udało się zapisać własnej wersji planu.', 'err');
      }
    } catch (e) {
      console.error('Błąd zachowywania własnej wersji:', e);
      setSaveStatus('error');
      notify('Nie udało się zapisać własnej wersji planu.', 'err');
    }
  };

  const handleReloadFromBanner = async () => {
    try {
      const freshState = await getStorageItem<AppState>(STORAGE_KEYS.APP_STATE);
      const freshSched = await getStorageItem<SchedData>(STORAGE_KEYS.SCHED_DATA);
      if (freshState) {
        setAppState(sortAppState(freshState));
        const rev = multiTabStateService.extractRevision(freshState) || remoteRevision;
        multiTabStateService.setLocalRevision(rev);
      }
      if (freshSched) {
        setSchedData(cleanSchedDataMeta(freshSched));
      }
      setShowRefreshBanner(false);
      setSaveStatus('saved');
      notify(`Wczytano zaktualizowany plan z bazy danych (Rewizja #${remoteRevision}).`, 'ok');
    } catch (e) {
      console.error('Błąd wczytywania zmian z innej karty:', e);
      notify('Błąd podczas wczytywania nowej wersji planu.', 'err');
    }
  };

  // Unified debounced save effect for appState and schedData
  useEffect(() => {
    if (!storageReady || isLocked) return;
    // Skip changes where data references are identical to freshly hydrated state (Task 2)
    if (
      hydratedRef.current &&
      hydratedRef.current.appState === appState &&
      hydratedRef.current.schedData === schedData
    ) {
      return;
    }

    setSaveStatus('dirty');
    editCountSinceAutosaveRef.current += 1;

    let innerTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = setTimeout(() => {
      setSaveStatus('saving');
      // Elegant micro-delay to allow visual status feedback
      innerTimer = setTimeout(async () => {
        try {
          const res = await persistAppStateAndSchedWithConflictCheck(
            stateRef.current.appState,
            stateRef.current.schedData
          );
          if (res.status === 'ok') {
            await pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
            setSaveStatus('saved');
            refreshStorageStats();
          } else if (res.status === 'error') {
            setSaveStatus('error');
            const isLockedErr = res.error instanceof StorageLockedError || (res.error as { name?: string })?.name === 'StorageLockedError';
            notify(
              isLockedErr 
                ? 'Baza danych jest zablokowana. Wprowadź hasło, aby zapisać zmiany.' 
                : 'Błąd zapisu: Nie udało się utrwalić zmian w bazie danych!',
              'err'
            );
          } else {
            // conflict
            setSaveStatus('dirty');
          }
        } catch (e: unknown) {
          console.error('Błąd zapisu autozapisu', e);
          setSaveStatus('error');
          const isLockedErr = e instanceof StorageLockedError || (e as { name?: string })?.name === 'StorageLockedError';
          notify(
            isLockedErr 
              ? 'Baza danych jest zablokowana. Wprowadź hasło, aby zapisać zmiany.' 
              : 'Błąd zapisu: Nie udało się utrwalić zmian w bazie danych!',
            'err'
          );
        }
      }, 250);
    }, 1000);

    return () => {
      clearTimeout(handler);
      if (innerTimer) {
        clearTimeout(innerTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Debounced autosave effect triggers solely on substantive state/sched edits and storage status
  }, [appState, schedData, storageReady, isLocked]);

  // Force instant save on tab switch (skips first render mount via isFirstTabMount)
  useEffect(() => {
    if (isFirstTabMount.current) {
      isFirstTabMount.current = false;
      return;
    }
    if (!storageReady || isLocked) return;
    
    const saveOnTabSwitch = async () => {
      try {
        setSaveStatus('saving');
        const res = await persistAppStateAndSchedWithConflictCheck(
          stateRef.current.appState,
          stateRef.current.schedData
        );
        if (res.status === 'ok') {
          await pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
          setSaveStatus('saved');
          refreshStorageStats();
          addEventLog('other', 'Automatyczny zapis przy zmianie zakładki', `Zapisano stan programu w bazie IndexedDB przy przełączeniu na zakładkę "${currentTab}".`);
        } else if (res.status === 'error') {
          setSaveStatus('error');
        } else {
          setSaveStatus('dirty');
        }
      } catch (e: unknown) {
        console.error('Błąd natychmiastowego zapisu przy zmianie zakładki', e);
        setSaveStatus('error');
        const isLockedErr = e instanceof StorageLockedError || (e as { name?: string })?.name === 'StorageLockedError';
        notify(
          isLockedErr 
            ? 'Baza danych jest zablokowana. Zmiany nie zostały zapisane.' 
            : 'Błąd zapisu bazy danych przy zmianie zakładki!',
          'err'
        );
      }
    };
    saveOnTabSwitch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Instant save on tab switch triggers on currentTab transitions
  }, [currentTab, storageReady, isLocked]);

  // Unload & lifecycle fallback to secure drafts instantly on visibilitychange, pagehide, and beforeunload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushNow().catch((err) => {
          console.warn('Błąd flushNow przy visibilitychange (hidden):', err);
        });
      }
    };

    const handlePageHide = () => {
      if (!isDatabaseEncryptionActive()) {
        try {
          writeSyncMirror(STORAGE_KEYS.APP_STATE, stateRef.current.appState);
          writeSyncMirror(STORAGE_KEYS.SCHED_DATA, stateRef.current.schedData);
        } catch (e) {
          console.warn('Błąd synchronicznego zapisu lustra przy pagehide:', e);
        }
      }
      flushNow().catch((err) => {
        console.warn('Błąd flushNow przy pagehide:', err);
      });
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!storageReadyRef.current || isLocked) return;
      
      // 1 & 2. Synchroniczne lustro do localStorage tylko gdy szyfrowanie NIE jest aktywne
      if (!isDatabaseEncryptionActive()) {
        try {
          writeSyncMirror(STORAGE_KEYS.APP_STATE, stateRef.current.appState);
          writeSyncMirror(STORAGE_KEYS.SCHED_DATA, stateRef.current.schedData);
        } catch (e) {
          console.warn('Błąd synchronicznego zapisu lustra przy zamykaniu:', e);
        }
      }

      // 3. Asynchroniczny zapis przez flushNow (kolejka z P3)
      flushNow().catch((e) => {
        console.warn('Błąd zapisu asynchronicznego przy beforeunload:', e);
      });

      // 4. W beforeunload ustaw event.returnValue, gdy saveStatus !== 'saved'
      if (saveStatusRef.current !== 'saved') {
        event.preventDefault();
        event.returnValue = 'Wprowadzone zmiany nie zostały jeszcze trwale zapisane.';
        return 'Wprowadzone zmiany nie zostały jeszcze trwale zapisane.';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushNow, isLocked]);

  // Sync archive immediately (low frequency, separate key)
  useEffect(() => {
    if (!storageReady || isLocked || blockedWrites[STORAGE_KEYS.ARCHIVE] || isWriteBlocked(STORAGE_KEYS.ARCHIVE)) return;
    setStorageItem(STORAGE_KEYS.ARCHIVE, archive)
      .then(() => refreshStorageStats())
      .catch((e: unknown) => {
        if (e instanceof StorageWriteBlockedError) return;
        console.error('Błąd zapisu archiwum', e);
        setSaveStatus('error');
        notify('Nie udało się zapisać archiwum w bazie danych!', 'err');
      });
  }, [archive, storageReady, isLocked, blockedWrites, refreshStorageStats]);

  // Sync snapshots immediately
  useEffect(() => {
    if (!storageReady || isLocked || blockedWrites[STORAGE_KEYS.SNAPSHOTS] || isWriteBlocked(STORAGE_KEYS.SNAPSHOTS)) return;
    setStorageItem(STORAGE_KEYS.SNAPSHOTS, snapshots)
      .then(() => refreshStorageStats())
      .catch((e: unknown) => {
        if (e instanceof StorageWriteBlockedError) return;
        console.error('Błąd zapisu punktów przywracania', e);
        setSaveStatus('error');
        notify('Nie udało się zapisać punktów przywracania!', 'err');
      });
  }, [snapshots, storageReady, isLocked, blockedWrites, refreshStorageStats]);

  // ── UNDO / REDO STATE HANDLERS ──
  const pushToUndo = (stateToSave: SchedData) => {
    setUndoStack(prev => [...prev.slice(-39), JSON.parse(JSON.stringify(stateToSave))]);
    setRedoStack([]); // Clear redo
  };

  const handleUpdateSchedData = (newSched: SchedData) => {
    pushToUndo(schedData);
    setSchedData(newSched);
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(schedData))]);
    setSchedData(previous);
    setUndoStack(prev => prev.slice(0, -1));
    addEventLog('undo', 'Cofnięto zmianę planu (Undo)', 'Przywrócono poprzedni stan rozmieszczenia sal / dyżurów.');
  }, [undoStack, schedData]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(schedData))]);
    setSchedData(next);
    setRedoStack(prev => prev.slice(0, -1));
    addEventLog('redo', 'Ponowiono zmianę planu (Redo)', 'Zastosowano ponownie uprzednio cofniętą operację.');
  }, [redoStack, schedData]);

  // ── KEYBOARD SHORTCUTS FOR UNDO / REDO ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
        notify('Wyłączono tryb prezentacji', 'info');
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeEl.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo, isPresentationMode]);

  // ── BRIDGING/IMPORT SESSIONS FROM ETAP 1 TO ETAP 2 ──
  const handleImportFromPlanKlas = () => {
    if (!confirm('Czy chcesz przetransferować siatkę zajęć z Planu Klas do Planu Sal? Spowoduje to nadpisanie bieżącego układu sal dla wspólnych slotów lekcyjnych.')) return;

    pushToUndo(schedData);

    const yearKey = appState.yearKey;
    const pl = appState.planLekcji;

    // Budowa mapy dla szybkiego wyszukiwania przydziałów O(1)
    const assignmentsMap = new Map<string, Assignment>(pl.assignments.map(a => [a.id, a]));
    const teachersMap = new Map<string, Teacher>(pl.teachers.map(t => [t.id, t]));
    const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
    const roomsMap = new Map<string, ClassRoom>(pl.rooms.map(r => [r.id, r]));

    // SchedData deep structure for current state
    const nextSchedData = { ...schedData };
    if (!nextSchedData[yearKey]) nextSchedData[yearKey] = {};

    let countTransfer = 0;

    // Loop days 0..4
    for (let day = 0; day < 5; day++) {
      if (!nextSchedData[yearKey][day]) nextSchedData[yearKey][day] = {};

      appState.hours.forEach(hourKey => {
        if (!nextSchedData[yearKey][day][hourKey]) {
          nextSchedData[yearKey][day][hourKey] = {};
        }

        const colKeyCells = nextSchedData[yearKey][day][hourKey];

        // Wyszukanie wszystkich lekcji dla tego dnia i godziny w Planie Klas
        const currentHIdx = pl.hours.findIndex(h => String(h.num) === hourKey);
        pl.classes.forEach(cls => {
          const matchingLessons = (Object.entries(pl.lessons) as [string, Lesson | undefined][]).filter(([k]) => {
            const p = k.split('|');
            return p[0] === cls.id && parseInt(p[1], 10) === day && parseInt(p[2], 10) === currentHIdx;
          });

          matchingLessons.forEach(([lessonKey, lesson]) => {
            if (!lesson) return;

            const asg = assignmentsMap.get(lesson.assignmentId);
            if (!asg) return;

            // Deduplicate inter-class shared lessons: only process them for the primary class
            if (asg.linkedClassIds && asg.linkedClassIds.length > 0 && cls.id !== asg.classId) {
              return;
            }

            const subject = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
            const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
            const roomEtap1 = asg.roomId ? roomsMap.get(asg.roomId) : null;

            // Attempt to find a suitable room in the building layout
            let assignedColKey = '';
            appState.floors.forEach((floor, fi) => {
              floor.segments.forEach((seg, si) => {
                seg.rooms.forEach((rm, ri) => {
                  const targetKey = `f${fi}_s${si}_${rm.num}`;
                  
                  // Priorytetowe traktowanie sali zgodnej nazwą lub numerem
                  if (roomEtap1 && String(rm.num).trim() === String(roomEtap1.name).trim()) {
                    assignedColKey = targetKey;
                  }
                });
              });
            });

            // Przypisanie pierwszej wolnej sali odpowiedniego typu w przypadku braku ścisłego dopasowania
            if (!assignedColKey) {
              for (let fi = 0; fi < appState.floors.length; fi++) {
                const floor = appState.floors[fi];
                for (let si = 0; si < floor.segments.length; si++) {
                  const seg = floor.segments[si];
                  for (let ri = 0; ri < seg.rooms.length; ri++) {
                    const rm = seg.rooms[ri];
                    const keyCandidate = `f${fi}_s${si}_${rm.num}`;
                    
                    if (!colKeyCells[keyCandidate]) {
                      assignedColKey = keyCandidate;
                      break;
                    }
                  }
                  if (assignedColKey) break;
                }
                if (assignedColKey) break;
              }
            }

            // Force to first slot if unable to find empty
            if (!assignedColKey && appState.floors[0]?.segments[0]?.rooms[0]) {
              const firstRm = appState.floors[0].segments[0].rooms[0];
              assignedColKey = `f0_s0_${firstRm.num}`;
            }

            if (assignedColKey) {
              const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;
              const extraClasses = asg.linkedClassIds && asg.linkedClassIds.length > 0
                ? (asg.linkedClassIds.map(id => pl.classes.find(c => c.id === id)?.name).filter(Boolean) as string[])
                : [];
              
              const groupObj = asg.groupId ? pl.schoolGroups?.find(g => g.id === asg.groupId) : null;
              const combinedClasses = [cls.name, ...extraClasses];
              const displayClassName = groupObj 
                ? `${mergeClassNames(combinedClasses).join('+')} (${groupObj.name})`
                : mergeClassNames(combinedClasses).join('+');

              const newCell: SchedCell = {
                teacherAbbr: teacher?.abbr || '?',
                supportTeacherAbbr: suppTeacher?.abbr || undefined,
                classes: combinedClasses,
                className: displayClassName,
                subject: subject,
                note: roomEtap1 ? `(sugestia: ${roomEtap1.name})` : undefined,
                _bridgeMeta: {
                  classId: cls.id,
                  teacherId: asg.teacherId,
                  subjectId: asg.subjectId,
                  roomId: asg.roomId,
                  groupId: asg.groupId || null,
                  suggestedRoom: roomEtap1 ? roomEtap1.name : null
                }
              };

              // Gdy sala jest już zajęta, zgromadź w tablicy w celu detekcji kolizji
              const existing = colKeyCells[assignedColKey];
              if (existing) {
                const existingArr = Array.isArray(existing) ? existing : [existing];
                colKeyCells[assignedColKey] = [...existingArr, newCell];
              } else {
                colKeyCells[assignedColKey] = newCell;
              }
              countTransfer++;
            }
          });
        });
      });
    }

    setSchedData(nextSchedData);
    notify(`Zsynchronizowano lekcje! Przeniesiono pomyślnie ${countTransfer} jednostek lekcyjnych.`, 'ok');
    addEventLog(
      'import',
      'Import siatki z Planu Klas (Etap 1)',
      `Przeniesiono pomyślnie ${countTransfer} jednostek lekcyjnych i sal do gabinetów.`
    );
  };

  // ── INTEGRITY VALIDATION & DATA SANITIZATION ──
  const validateAndSanitizeDataIntegrity = (rawState: unknown, rawSched: unknown): { sanitizedState: AppState; sanitizedSched: SchedData } => {
    if (!rawState || typeof rawState !== 'object') {
      throw new Error('Nieprawidłowa struktura danych (obiekt stanu nie istnieje lub jest uszkodzony).');
    }
    if (!rawSched || typeof rawSched !== 'object') {
      throw new Error('Nieprawidłowa struktura siatki harmonogramu (schedData).');
    }

    // Sanitize state through comprehensive merge engine
    const sanitizedState = sanitizeAppState(rawState);
    const pl = sanitizedState.planLekcji;
    if (!pl) {
      throw new Error('Brak wymaganej sekcji planu lekcji (planLekcji).');
    }

    // 1. Validate Classes and build classId set
    const classIdSet = new Set<string>();
    const validClasses = (pl.classes || []).filter(c => {
      if (c && typeof c.id === 'string' && c.id.trim()) {
        classIdSet.add(c.id);
        return true;
      }
      return false;
    });
    if (validClasses.length === 0 && Array.isArray((rawState as Record<string, unknown>).classes) && ((rawState as Record<string, unknown>).classes as unknown[]).length > 0) {
      throw new Error('Wykryto uszkodzone identyfikatory (ID) klas.');
    }
    pl.classes = validClasses;

    // 2. Validate Teachers and build teacherId set
    const teacherIdSet = new Set<string>();
    const validTeachers = (pl.teachers || []).filter(t => {
      if (t && typeof t.id === 'string' && t.id.trim()) {
        teacherIdSet.add(t.id);
        return true;
      }
      return false;
    });
    pl.teachers = validTeachers;

    // 3. Validate Subjects and build subjectId set
    const subjectIdSet = new Set<string>();
    const validSubjects = (pl.subjects || []).filter(s => {
      if (s && typeof s.id === 'string' && s.id.trim()) {
        subjectIdSet.add(s.id);
        return true;
      }
      return false;
    });
    pl.subjects = validSubjects;

    // 4. Validate Assignments & Relations with graceful reconciliation
    const assignmentIdSet = new Set<string>();
    const validAssignments: Assignment[] = [];
    for (const a of pl.assignments || []) {
      if (!a || typeof a.id !== 'string' || !a.id.trim()) {
        continue;
      }
      // Jeśli wskazana klasa nie istnieje, zignoruj osierocony przydział
      if (!classIdSet.has(a.classId)) {
        console.warn(`[Integrity Check] Pominięto przydział "${a.id}" dla nieistniejącej klasy: "${a.classId}"`);
        continue;
      }
      // Jeśli wskazany przedmiot nie istnieje, użyj pierwszego dostępnego przedmiotu
      if (!subjectIdSet.has(a.subjectId)) {
        if (validSubjects.length > 0) {
          a.subjectId = validSubjects[0].id;
        } else {
          continue;
        }
      }
      // Jeśli wskazany nauczyciel nie istnieje, zresetuj identyfikator nauczyciela
      if (a.teacherId && !teacherIdSet.has(a.teacherId)) {
        a.teacherId = '';
      }
      assignmentIdSet.add(a.id);
      validAssignments.push(a);
    }
    pl.assignments = validAssignments;

    // 5. Clean lessons referencing invalid/missing assignments
    const cleanedLessons: Record<string, Lesson> = {};
    if (pl.lessons && typeof pl.lessons === 'object') {
      for (const [key, lesson] of Object.entries(pl.lessons)) {
        if (!lesson || typeof lesson !== 'object') continue;
        if (!lesson.assignmentId || !assignmentIdSet.has(lesson.assignmentId)) {
          console.warn(`[Integrity Check] Usunięto uszkodzoną lekcję "${key}" wskazującą na nieistniejące assignmentId: "${lesson.assignmentId}"`);
          continue;
        }
        cleanedLessons[key] = lesson;
      }
    }
    pl.lessons = cleanedLessons;

    // 6. Sprawdzenie integralności danych planu sal (SchedData)
    const sanitizedSched: SchedData = {};
    for (const [yearK, yData] of Object.entries(rawSched as Record<string, unknown>)) {
      if (!yData || typeof yData !== 'object') continue;
      sanitizedSched[yearK] = {};
      for (const [dayK, dData] of Object.entries(yData as Record<string, unknown>)) {
        if (!dData || typeof dData !== 'object') continue;
        const dayIdx = parseInt(dayK, 10);
        if (isNaN(dayIdx)) continue;
        sanitizedSched[yearK][dayIdx] = {};
        for (const [hourK, hData] of Object.entries(dData as Record<string, unknown>)) {
          if (!hData || typeof hData !== 'object') continue;
          sanitizedSched[yearK][dayIdx][hourK] = {};
          for (const [colK, cellVal] of Object.entries(hData as Record<string, SchedCell | SchedCell[]>)) {
            if (!cellVal) continue;
            sanitizedSched[yearK][dayIdx][hourK][colK] = cellVal;
          }
        }
      }
    }

    return {
      sanitizedState: sortAppState(sanitizedState),
      sanitizedSched
    };
  };

  const handleRestoreSnapshotState = async (restoredAppState: AppState, restoredSchedData: SchedData) => {
    const startTime = performance.now();

    // Aktualizacja lastValidBackupRef TYLKO przed importem/przywracaniem stanu
    lastValidBackupRef.current = {
      appState: JSON.parse(JSON.stringify(appState)),
      schedData: JSON.parse(JSON.stringify(schedData)),
      archive: JSON.parse(JSON.stringify(archive)),
      snapshots: JSON.parse(JSON.stringify(snapshots)),
      historyLogs: JSON.parse(JSON.stringify(historyLogs))
    };

    setIsRestoring(true);

    try {
      if (import.meta.env.DEV) {
        console.group('⏱️ Rozpoczęcie procedury przywracania stanu z punktu przywracania (Snapshot)');
      }
      
      const { sanitizedState, sanitizedSched } = validateAndSanitizeDataIntegrity(restoredAppState, restoredSchedData);

      // Save active schedule into undo history
      pushToUndo(schedData);
      handleUpdateAppState(sanitizedState);
      setSchedData(sanitizedSched);

      await persistAppStateAndSchedWithConflictCheck(sanitizedState, sanitizedSched, { forceOverwrite: true });

      refreshStorageStats();

      const duration = performance.now() - startTime;
      if (import.meta.env.DEV) {
        console.log(`✅ Synchronizacja stanów i struktur zakończona pomyślnie.`);
        console.log(`⏱️ Czas procesowania logicznego: ${duration.toFixed(2)} ms`);
        console.groupEnd();
      }

      notify('Przywrócono stan planu do wybranego punktu przywracania', 'ok');
      addEventLog(
        'restore',
        'Przywrócono plan z punktu przywracania',
        `Zaktualizowano całą konfigurację dla szkoły "${sanitizedState.school?.name || ''}" (${sanitizedState.yearLabel || ''}). Czas: ${duration.toFixed(2)} ms.`
      );
    } catch (err: unknown) {
      console.error('❌ Błąd podczas procedury przywracania punktu:', err);
      // Automatic rollback to lastValidBackupRef state
      const backup = lastValidBackupRef.current;
      if (backup) {
        setAppState(sortAppState(backup.appState));
        setSchedData(backup.schedData);
        setArchive(backup.archive);
        setSnapshots(backup.snapshots);
        setHistoryLogs(backup.historyLogs);

        await Promise.all([
          setStorageItem(STORAGE_KEYS.APP_STATE, backup.appState),
          setStorageItem(STORAGE_KEYS.SCHED_DATA, backup.schedData),
          setStorageItem(STORAGE_KEYS.ARCHIVE, backup.archive),
          setStorageItem(STORAGE_KEYS.SNAPSHOTS, backup.snapshots),
          setStorageItem(STORAGE_KEYS.HISTORY_LOGS, backup.historyLogs)
        ]);
        refreshStorageStats();
      }

      const errMsg = (err as Error)?.message || 'Nieprawidłowa struktura danych lub brak spójności ID.';
      notify(`Błąd przywracania: ${errMsg} Automatycznie wycofano zmiany (Rollback).`, 'err');
      addEventLog('other', 'Wycofano przywracanie planu (Rollback)', `Wykryto problem: ${errMsg}`);
      throw err;
    } finally {
      setTimeout(() => {
        setIsRestoring(false);
      }, 100);
    }
  };

  // ── JSON BACKUPS ACTIONS (SELECTIVE EXPORT & IMPORT) ──
  const handleExportBackup = () => {
    setShowExportModal(true);
  };

  const handleExecuteExport = async (options: ExportOptions) => {
    let backupObj: ImportPayload = {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString()
    };

    if (options.includeAppState) {
      backupObj.appState = appState;
      backupObj.planVariants = planVariants;
      backupObj.activeVariantId = activeVariantId;
    }
    if (options.includeSchedData) {
      backupObj.schedData = schedData;
    }
    if (options.includeArchive) {
      backupObj.archive = archive;
    }
    if (options.includeSnapshots) {
      backupObj.snapshots = snapshots;
    }
    if (options.includeHistoryLogs) {
      backupObj.historyLogs = historyLogs;
    }

    let isAnonymized = false;
    let anonSummary: AnonymizationSummary | null = null;

    if (options.anonymizeData) {
      const res = anonymizeBackupPayload(backupObj);
      backupObj = res.payload;
      isAnonymized = true;
      anonSummary = res.summary;
    }
    
    const rawJson = JSON.stringify(backupObj, null, 2);
    const schoolTag = isAnonymized ? 'rodo' : (appState.school.short?.toLowerCase() || 'szkola');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `saleplan-kopia-${schoolTag}${isAnonymized ? '-anonimowa' : ''}-${dateStr}`;

    try {
      if (options.password) {
        const encrypted = await encryptText(rawJson, options.password);
        downloadFile(encrypted, `${fileName}-secured.json`, 'application/json');
        notify(isAnonymized ? 'Wyeksportowano zabezpieczone hasłem zanonimizowane (RODO) archiwum JSON' : 'Wyeksportowano zabezpieczone hasłem archiwum JSON', 'ok');
        addEventLog('other', isAnonymized ? 'Wyeksportowano kopię RODO z hasłem' : 'Wyeksportowano zabezpieczoną kopię JSON', `Zaszyfrowano dane hasłem (AES-256 GCM).`);
      } else {
        downloadFile(rawJson, `${fileName}.json`, 'application/json');
        notify(isAnonymized ? `Wyeksportowano zanonimizowaną kopię RODO (${anonSummary?.teachersAnonymized || 0} n-li, ${anonSummary?.studentsAnonymized || 0} uczniów SPE)` : 'Wyeksportowano kopię JSON', 'ok');
        addEventLog('other', isAnonymized ? 'Wyeksportowano kopię RODO' : 'Wyeksportowano kopię JSON', isAnonymized ? 'Zanonimizowano dane osobowe nauczycieli i uczniów SPE do celów zewnętrznych.' : 'Pobrano plik konfiguracyjny bez hasła.');
      }
      setShowExportModal(false);
    } catch (err) {
      notify('Błąd podczas eksportowania kopii', 'err');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Reset so same files can be selected again
    e.target.value = '';

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      const file = oversized[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setPendingImportFiles([{
        name: file.name,
        content: JSON.stringify({
          error: `Rozmiar pliku "${file.name}" (${sizeMb} MB) przekracza maksymalny dopuszczalny limit 10 MB. Wybierz mniejszy plik.`
        })
      }]);
      setShowImportModal(true);
      return;
    }

    const loadedFiles: { name: string; content: string }[] = [];
    let readCount = 0;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawContent = evt.target?.result as string;
        if (rawContent) {
          loadedFiles.push({ name: file.name, content: rawContent });
        }
        readCount++;
        if (readCount === files.length) {
          setPendingImportFiles(loadedFiles);
          setShowImportModal(true);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleExecuteMultiImport = async (result: {
    mergedState: AppState;
    mergedSched: SchedData;
    mergedArchive: ArchiveEntry[];
    mergedSnapshots: SnapshotEntry[];
    mergedLogs: AppEventLog[];
    overallReport: string[];
  }) => {
    // Aktualizacja lastValidBackupRef TYLKO przed importem/przywracaniem stanu
    lastValidBackupRef.current = {
      appState: JSON.parse(JSON.stringify(appState)),
      schedData: JSON.parse(JSON.stringify(schedData)),
      archive: JSON.parse(JSON.stringify(archive)),
      snapshots: JSON.parse(JSON.stringify(snapshots)),
      historyLogs: JSON.parse(JSON.stringify(historyLogs))
    };

    setIsRestoring(true);

    try {
      // Validate and sanitize merged data before committing
      const { sanitizedState, sanitizedSched } = validateAndSanitizeDataIntegrity(result.mergedState, result.mergedSched);

      pushToUndo(schedData);

      handleUpdateAppState(sanitizedState);
      setSchedData(sanitizedSched);
      setArchive(result.mergedArchive);
      const prunedMergedSnapshots = pruneSnapshots(result.mergedSnapshots);
      setSnapshots(prunedMergedSnapshots);
      setHistoryLogs(result.mergedLogs);

      await Promise.all([
        persistAppStateAndSchedWithConflictCheck(sanitizedState, sanitizedSched, { forceOverwrite: true }),
        setStorageItem(STORAGE_KEYS.ARCHIVE, result.mergedArchive),
        setStorageItem(STORAGE_KEYS.SNAPSHOTS, prunedMergedSnapshots),
        setStorageItem(STORAGE_KEYS.HISTORY_LOGS, result.mergedLogs)
      ]);

      refreshStorageStats();
      setShowImportModal(false);
      setPendingImportFiles([]);

      const summaryText = result.overallReport.length > 0 
        ? result.overallReport.join(' | ') 
        : 'Pomyślnie scalono dane';

      notify('Pomyślnie scalono i zaktualizowano plan!', 'ok');
      addEventLog(
        'import',
        'Wieloosobowe scalanie i import danych (JSON)',
        `Wynik scalania: ${summaryText}`
      );
    } catch (err: unknown) {
      console.error('❌ Błąd podczas scalania i importu danych:', err);
      // Automatic rollback to lastValidBackupRef state
      const backup = lastValidBackupRef.current;
      if (backup) {
        setAppState(sortAppState(backup.appState));
        setSchedData(backup.schedData);
        setArchive(backup.archive);
        setSnapshots(backup.snapshots);
        setHistoryLogs(backup.historyLogs);

        await Promise.all([
          persistAppStateAndSchedWithConflictCheck(backup.appState, backup.schedData, { forceOverwrite: true }),
          setStorageItem(STORAGE_KEYS.ARCHIVE, backup.archive),
          setStorageItem(STORAGE_KEYS.SNAPSHOTS, backup.snapshots),
          setStorageItem(STORAGE_KEYS.HISTORY_LOGS, backup.historyLogs)
        ]);
        refreshStorageStats();
      }

      setShowImportModal(false);
      setPendingImportFiles([]);

      const errMsg = (err as Error)?.message || 'Błąd spójności danych lub nieprawidłowe ID.';
      notify(`Błąd importu: ${errMsg} Automatycznie wycofano zmiany (Rollback).`, 'err');
      addEventLog('other', 'Wycofano scalanie i import (Rollback)', `Wykryto problem: ${errMsg}`);
    } finally {
      setTimeout(() => {
        setIsRestoring(false);
      }, 100);
    }
  };

  const handleResetTimetable = async () => {
    if (!confirm('Czy jesteś PEWIEN, że chcesz zresetować cały plan lekcji, czyścić gabinety oraz dyżury?')) return;
    pushToUndo(schedData);
    handleUpdateAppState(getDemoAppState());
    setSchedData({});
    await clearAllStorage();
    await setStorageItem(STORAGE_KEYS.APP_STATE, getDemoAppState());
    await setStorageItem(STORAGE_KEYS.SCHED_DATA, {});
    refreshStorageStats();
    notify('Zresetowano całą konfigurację programu', 'ok');
    addEventLog(
      'reset',
      'Zresetowano konfigurację i wyczyszczono plan (Baza IndexedDB)',
      'Wycofano wszystkie dane do stanu demonstracyjnego (demo).'
    );
  };

  // Gdy szyfrowanie bazy jest aktywne a sesja zablokowana, wyświetl wyłącznie ekran odblokowania
  if (isLocked) {
    return (
      <UnlockScreen
        onUnlocked={handleUnlocked}
        onResetDatabase={handleEmergencyReset}
      />
    );
  }

  // W trybie bezpośredniego podglądu z kodu QR (?view=mobile_plan) renderuj natychmiast MobilePlanViewer
  if (isMobilePlanMode) {
    return (
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">Ładowanie planu mobilnego...</p>
          </div>
        </div>
      }>
        <MobilePlanViewer
          appState={appState}
          schedData={schedData}
          onBackToApp={() => {
            setIsMobilePlanMode(false);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('view');
              url.searchParams.delete('type');
              url.searchParams.delete('id');
              url.searchParams.delete('yk');
              window.history.pushState({}, '', url.toString());
            }
          }}
        />
      </Suspense>
    );
  }

  // W trybie okna towarzyszącego (?mode=companion) renderuj bezpośrednio CompanionWindowView
  if (isCompanionMode) {
    return (
      <>
        <SWUpdateBanner flush={flushNow} onBeforeUpdate={flushNow} />
        <Suspense fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100 font-sans">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold">Ładowanie okna pomocniczego...</p>
            </div>
          </div>
        }>
          <CompanionWindowView
            initialAppState={appState}
            initialSchedData={schedData}
            initialActiveVariant={activeVariant}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div data-storage-ready={storageReady ? 'true' : 'false'} className={`flex flex-col h-screen w-screen bg-slate-100 font-sans overflow-hidden print:h-auto print:w-full print:overflow-visible print:block print:static ${isRestoring ? 'pointer-events-none select-none' : ''}`}>
      <SWUpdateBanner flush={flushNow} onBeforeUpdate={flushNow} />
      <MultiTabRefreshBanner
        visible={showRefreshBanner}
        remoteRevision={remoteRevision}
        incomingTabName={remoteTabInfo?.tabName}
        incomingSectionName={remoteTabInfo?.sectionName}
        onReload={handleReloadFromBanner}
        onDismiss={() => setShowRefreshBanner(false)}
      />

      {storageInitError && (
        <div 
          data-testid="storage-init-error-banner"
          className="bg-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md z-50 text-xs sm:text-sm font-medium border-b border-amber-700 shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Problem z wczytaniem danych:</strong> {storageInitError} Zapisy bazy danych zostały wstrzymane dla bezpieczeństwa.
            </span>
          </div>
          <button
            type="button"
            onClick={() => initStorage()}
            className="px-3 py-1 bg-white text-amber-900 rounded font-semibold text-xs hover:bg-amber-100 transition shadow-xs cursor-pointer ml-3 shrink-0"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
      
      {/* ── PODSTAWOWY NAGŁÓWEK SYSTEMOWY (ORGANIZACJA DWUPOZIOMOWA DLA TABLETÓW I DESKTOPU) ── */}
      {!isPresentationMode && (
        <header className="relative z-50 bg-slate-900 text-slate-100 shadow-xl select-none shrink-0 border-b border-slate-800">
          {/* Poziom 1: Tożsamość szkoły, moduł nawigacji oraz narzędzia widoku */}
          <div className="px-3 sm:px-4 md:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-800/80">
            {/* Lewa strona: Logo + Nazwa programu + Nazwa szkoły */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SalePlanLogoMark size={34} className="shadow-xs rounded-xl shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-none whitespace-nowrap flex items-center gap-1" title="SalePlan Pro">
                    <span className="sr-only">SalePlan Pro</span>
                    <span aria-hidden="true">SalePlan</span>
                    <span aria-hidden="true" className="font-serif italic font-black text-amber-400 text-sm sm:text-base leading-none -ml-0.5 inline-block transform rotate-2" style={{ fontFamily: 'Georgia, cursive, serif' }}>
                      pro
                    </span>
                  </h1>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase font-mono tracking-wide hidden sm:inline-block leading-none">
                    PWA App
                  </span>
                </div>
                <p 
                  className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate max-w-[160px] sm:max-w-xs md:max-w-sm lg:max-w-md"
                  title={`${appState.school.name || 'Wersja Demonstracyjna'} • Rok szkolny ${appState.yearLabel}`}
                >
                  {appState.school.name || 'Wersja Demonstracyjna'} • {appState.yearLabel}
                </p>
              </div>
            </div>

            {/* Prawa strona: Nawigacja po modułach oraz Kontrola widoku i historii */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Dynamic Navigation Tabs configured as dropdown menu */}
              <div className="relative z-50">
                <button
                  onClick={() => setHamburgerOpen(!hamburgerOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl hover:bg-slate-900 text-xs text-slate-200 font-extrabold shadow-2xs transition select-none cursor-pointer"
                  id="hamburger-navigation-trigger"
                  title="Wybierz moduł programu"
                >
                  {hamburgerOpen ? <X size={14} className="text-red-400 animate-pulse" /> : <Menu size={14} className="text-blue-400" />}
                  <span className="text-slate-400 font-bold uppercase hidden md:inline text-[10px] tracking-wider pointer-events-none">Nawigacja:</span>
                  <span className="flex items-center gap-1 leading-none text-xs text-white">
                    {currentTab === 'kreator' && <><Sparkles size={13} className="text-amber-400 font-bold" /> <span className="hidden sm:inline">Kreator Szkoły</span><span className="sm:hidden">Kreator</span></>}
                    {currentTab === 'plan_klas' && <><Layers size={13} className="text-blue-400" /> <span className="hidden sm:inline">Etap 1: Plan Klas</span><span className="sm:hidden">Plan Klas</span></>}
                    {currentTab === 'plan_sal' && <><MapPin size={13} className="text-teal-400" /> <span className="hidden sm:inline">Etap 2: Plan Sal</span><span className="sm:hidden">Plan Sal</span></>}
                    {currentTab === 'dyzury' && <><Shield size={13} className="text-indigo-400" /> <span className="hidden sm:inline">Etap 3: Dyżury</span><span className="sm:hidden">Dyżury</span></>}
                    {currentTab === 'zastepstwa' && <><UserCheck size={13} className="text-amber-400" /> <span className="hidden sm:inline">Zastępstwa Dzienne</span><span className="sm:hidden">Zastępstwa</span></>}
                    {currentTab === 'higiena_men' && <><HeartHandshake size={13} className="text-emerald-400" /> <span className="hidden sm:inline">Audytor MEN</span><span className="sm:hidden">Higiena</span></>}
                    {currentTab === 'eksport_raporty' && <><FileSpreadsheet size={13} className="text-emerald-400" /> <span className="hidden sm:inline">Raporty & QR</span><span className="sm:hidden">Raporty</span></>}
                    {currentTab === 'porownywarka_diff' && <><Columns2 size={13} className="text-indigo-400" /> <span className="hidden sm:inline">Porównywarka Diff</span><span className="sm:hidden">Diff</span></>}
                    {currentTab === 'wydruki' && <><Printer size={13} className="text-emerald-400" /> <span className="hidden sm:inline">Wydruki</span><span className="sm:hidden">Druk</span></>}
                    {currentTab === 'statystyki' && <><BarChart2 size={13} className="text-rose-400" /> <span className="hidden sm:inline">Statystyki</span><span className="sm:hidden">Stats</span></>}
                    {currentTab === 'ustawienia_generatorow' && <><Sliders size={13} className="text-indigo-400 font-bold" /> <span className="hidden sm:inline">Generator</span><span className="sm:hidden">Algorytmy</span></>}
                    {currentTab === 'o_programie' && <><HelpCircle size={13} className="text-sky-400 font-bold" /> <span className="hidden sm:inline">O programie</span><span className="sm:hidden">Info</span></>}
                  </span>
                  <ChevronDown size={13} className="text-slate-400 ml-0.5" />
                </button>

                {hamburgerOpen && (
                  <>
                    <div 
                      className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40" 
                      onClick={() => setHamburgerOpen(false)} 
                    />
                    
                    <div className="absolute right-0 top-full mt-2 w-72 max-h-[calc(100vh-5rem)] overflow-y-auto bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-2xl z-50 text-left">
                      <div className="px-3.5 py-2 border-b border-slate-800 mb-2">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Główne moduły programu</span>
                      </div>

                      <div className="space-y-0.5">
                        <button
                          onClick={() => { setCurrentTab('kreator'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'kreator'
                              ? 'bg-amber-950/50 border-l-4 border-amber-500 text-amber-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Sparkles size={15} className={`shrink-0 mt-0.5 ${currentTab === 'kreator' ? 'text-amber-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">🧙‍♀️ Kreator Szkoły</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Klasy, nauczyciele, gabinety</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('plan_klas'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'plan_klas'
                              ? 'bg-blue-950/50 border-l-4 border-blue-500 text-blue-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Layers size={15} className={`shrink-0 mt-0.5 ${currentTab === 'plan_klas' ? 'text-blue-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">📚 Etap 1: Plan Klas</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Siatka godzin oddziałowych</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('plan_sal'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'plan_sal'
                              ? 'bg-teal-950/50 border-l-4 border-teal-500 text-teal-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <MapPin size={15} className={`shrink-0 mt-0.5 ${currentTab === 'plan_sal' ? 'text-teal-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">🎨 Etap 2: Plan Sal</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase font-mono">Lokalizacje & obłożenie sal</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('dyzury'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'dyzury'
                              ? 'bg-indigo-950/50 border-l-4 border-indigo-500 text-indigo-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Shield size={15} className={`shrink-0 mt-0.5 ${currentTab === 'dyzury' ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">🛡️ Etap 3: Dyżury</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Opieka na przerwach</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('zastepstwa'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'zastepstwa'
                              ? 'bg-amber-950/50 border-l-4 border-amber-500 text-amber-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <UserCheck size={15} className={`shrink-0 mt-0.5 ${currentTab === 'zastepstwa' ? 'text-amber-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">⚡ Zastępstwa Dzienne</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Nieobecności, wakaty i wydruki</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('higiena_men'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'higiena_men'
                              ? 'bg-emerald-950/50 border-l-4 border-emerald-500 text-emerald-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <HeartHandshake size={15} className={`shrink-0 mt-0.5 ${currentTab === 'higiena_men' ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">🌿 Audytor Higieny MEN</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Ergonomia & normy Sanepidu</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('eksport_raporty'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'eksport_raporty'
                              ? 'bg-emerald-950/50 border-l-4 border-emerald-500 text-emerald-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <FileSpreadsheet size={15} className={`shrink-0 mt-0.5 ${currentTab === 'eksport_raporty' ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">📊 Raporty Excel & Kody QR</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Arkusze .xlsx & plany mobilne</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('porownywarka_diff'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'porownywarka_diff'
                              ? 'bg-indigo-950/50 border-l-4 border-indigo-500 text-indigo-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Columns2 size={15} className={`shrink-0 mt-0.5 ${currentTab === 'porownywarka_diff' ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">⚖️ Porównywarka (Diff)</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Split-Screen & detekcja kolizji</span>
                          </div>
                        </button>

                        <div className="border-t border-slate-800 my-1 pb-1" />

                        <button
                          onClick={() => { setCurrentTab('wydruki'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'wydruki'
                              ? 'bg-emerald-950/50 border-l-4 border-emerald-500 text-emerald-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Printer size={15} className={`shrink-0 mt-0.5 ${currentTab === 'wydruki' ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">🖨️ Wydruki i Publikacje</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Plany klas, nauczycieli, sal</span>
                          </div>
                        </button>

                        <button
                          onClick={() => { setCurrentTab('statystyki'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'statystyki'
                              ? 'bg-rose-950/50 border-l-4 border-rose-500 text-rose-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <BarChart2 size={15} className={`shrink-0 mt-0.5 ${currentTab === 'statystyki' ? 'text-rose-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">📊 Statystyki i Diagnoza</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase font-mono">Okienka, limity, obciążenia</span>
                          </div>
                        </button>

                        <div className="border-t border-slate-800 my-1 pb-1" />

                        <button
                          onClick={() => { setCurrentTab('ustawienia_generatorow'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'ustawienia_generatorow'
                              ? 'bg-indigo-950/50 border-l-4 border-indigo-500 text-indigo-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Sliders size={15} className={`shrink-0 mt-0.5 ${currentTab === 'ustawienia_generatorow' ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">⚙️ Ustawienia generatorów</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase font-mono">Kryteria i wagi algorytmów</span>
                          </div>
                        </button>

                        <div className="border-t border-slate-800 my-1 pb-1" />

                        <button
                          onClick={() => { setCurrentTab('o_programie'); setOProgramieTab('info'); setHamburgerOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                            currentTab === 'o_programie'
                              ? 'bg-sky-950/50 border-l-4 border-sky-500 text-sky-200 font-extrabold pl-2'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <HelpCircle size={15} className={`shrink-0 mt-0.5 ${currentTab === 'o_programie' ? 'text-sky-400' : 'text-slate-400'}`} />
                          <div>
                            <span className="text-xs font-black block">ℹ️ O programie & regulamin</span>
                            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5 font-bold uppercase">Opis, instrukcja i licencja</span>
                          </div>
                        </button>

                        <div className="border-t border-slate-800 my-1 pb-1" />

                        {/* Opcja trybu 2 ekranów w menu (z możliwością symulacji) */}
                        <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Monitor size={15} className="text-indigo-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-xs font-black block text-slate-200 truncate">🖥️ Dwa ekrany (Dual-Screen)</span>
                                <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">
                                  {isMultiScreenAvailable ? 'Wykryto drugi monitor (aktywny)' : 'Tryb 2 okien (wymuszenie / test)'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const nextForced = !isForcedDualScreen;
                                dualScreenService.setForcedMode(nextForced);
                                setIsForcedDualScreen(nextForced);
                                setIsMultiScreenAvailable(dualScreenService.updateMultiScreenStatus());
                                notify(nextForced ? 'Wymuszono tryb 2 ekranów — przycisk pojawił się w nagłówku.' : 'Przywrócono automatyczne wykrywanie ekranów.', 'info');
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-extrabold transition cursor-pointer shrink-0 ${
                                isForcedDualScreen || isMultiScreenAvailable
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {isForcedDualScreen ? 'Wymuszone' : isMultiScreenAvailable ? 'Dostępne' : 'Włącz test'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Przełącznik trybu pracy: Standardowo 1 ekran, 2 ekrany w trybie podziału na dwa okna (widoczny tylko po wykryciu >1 ekranu) */}
              {isMultiScreenAvailable && (
                <button
                  id="dual-screen-header-toggle-btn"
                  onClick={handleToggleDualScreen}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition select-none cursor-pointer border shadow-2xs ${
                    isCompanionActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/50 ring-2 ring-indigo-400/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 hover:border-slate-700'
                  }`}
                  title={
                    isCompanionActive
                      ? "Tryb dwóch ekranów jest aktywny! Kliknij, aby przywołać Okno Towarzyszące (Ekran 2) na wierzch."
                      : "Wykryto 2 ekrany! Kliknij, aby podzielić program na dwa okna (Ekran 1: Plan Klas, Ekran 2: Matryca Sal i Płachta)."
                  }
                >
                  <Monitor size={14} className={isCompanionActive ? 'text-amber-300 animate-pulse' : 'text-indigo-400'} />
                  <span className="hidden xl:inline text-slate-400 font-medium">Tryb pracy:</span>
                  <span className="font-extrabold tracking-tight">
                    {isCompanionActive ? '2 Ekrany' : '1 Ekran'}
                  </span>
                  {isCompanionActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              )}

              {/* Segmented Controls: Wstecz / Ponów / Pełen ekran / Tryb czytania */}
              <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-xl p-0.5 shadow-2xs">
                <button 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition select-none cursor-pointer"
                  title="Cofnij ostatnie działanie (Undo) • Ctrl+Z"
                >
                  <RotateCcw size={14} />
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition select-none cursor-pointer"
                  title="Ponów cofnięte działanie (Redo) • Ctrl+Y"
                >
                  <RotateCw size={14} />
                </button>
                <div className="h-3.5 w-px bg-slate-800 mx-0.5" />
                <button 
                  onClick={handleToggleFullscreen}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition select-none cursor-pointer"
                  title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran (Fullscreen)"}
                >
                  {isFullscreen ? <Minimize2 size={14} className="text-amber-400" /> : <Maximize2 size={14} />}
                </button>
                <button 
                  onClick={() => {
                    setIsPresentationMode(!isPresentationMode);
                    notify(isPresentationMode ? 'Wyłączono tryb czytania' : 'Włączono tryb czytania / prezentacji (Esc aby wyjść)', 'info');
                  }}
                  className={`p-1.5 rounded-lg transition select-none cursor-pointer ${
                    isPresentationMode ? 'text-amber-300 bg-amber-950/50 hover:bg-amber-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isPresentationMode ? "Wyjdź z trybu czytania" : "Tryb czytania i prezentacji"}
                >
                  {isPresentationMode ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Poziom 2: Pasek operacyjny — Bezpieczeństwo & RODO, Punkty przywracania, Eksport i Import ze scalaniem */}
          <div className="px-3 sm:px-4 md:px-6 py-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Lewa grupa: Ochrona danych i historia migawek */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSecurityModal(true)}
                className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition text-xs font-bold flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer shadow-2xs"
                title="Tarcza Bezpieczeństwa & RODO (Szyfrowanie bazy AES-256, Anonimizacja)"
              >
                <Shield size={14} className="text-emerald-400 shrink-0" />
                <span className="leading-none">Bezpieczeństwo & RODO</span>
              </button>

              <button 
                onClick={() => setShowSnapshotManager(true)}
                className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition text-xs font-bold flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 cursor-pointer shadow-2xs"
                title="Zarządzaj punktami przywracania planu (Snapshots)"
              >
                <History size={14} className="text-violet-400 shrink-0" />
                <span className="leading-none">Punkty przywracania</span>
                {snapshots.length > 0 && (
                  <span className="bg-violet-600 font-black text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center">
                    {snapshots.length}
                  </span>
                )}
              </button>

              <button 
                id="toolbar-plan-variants-btn"
                onClick={() => setShowVariantsModal(true)}
                className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition text-xs font-bold flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 cursor-pointer shadow-2xs"
                title="Wariantowanie planu (Semestr I/II, warianty robocze, diff porównawczy)"
              >
                <Layers size={14} className="text-indigo-400 shrink-0" />
                <span className="leading-none text-slate-400 hidden sm:inline">Wariant:</span>
                <span className="text-indigo-300 font-bold max-w-[130px] truncate leading-none">
                  {activeVariant?.name || 'Domyślny'}
                </span>
                {planVariants.length > 1 && (
                  <span className="bg-indigo-600 font-black text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center">
                    {planVariants.length}
                  </span>
                )}
              </button>
            </div>

            {/* Prawa grupa: Eksport, Import ze scalaniem i Reset danych */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={handleExportBackup}
                className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition text-xs font-bold flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 cursor-pointer shadow-2xs"
                title="Pobierz pełny plik konfiguracyjny lub zanonimizowaną kopię RODO (JSON)"
              >
                <Download size={14} className="text-blue-400 shrink-0" />
                <span className="leading-none">Eksport</span>
              </button>
              
              <label 
                className="px-2.5 py-1.5 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-950/40 rounded-lg transition text-xs font-bold flex items-center gap-1.5 bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer shadow-2xs"
                title="Wczytaj kopię planu lub scal dane z wielu plików JSON"
              >
                <Upload size={14} className="text-emerald-400 shrink-0" />
                <span className="leading-none whitespace-nowrap">Import i scalanie</span>
                <input 
                  type="file" 
                  multiple
                  accept=".json,.xlsx,.xls" 
                  className="hidden" 
                  onChange={handleImportBackup} 
                />
              </label>

              <button 
                onClick={handleResetTimetable}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition border border-transparent hover:border-red-900/50 cursor-pointer"
                title="Resetuj dane i przywróć stan początkowy"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ── GŁÓWNA STREFA ZAKŁADEK (RENDER) ── */}
      <div 
        id="app-main-workspace"
        className="relative z-0 flex-1 flex overflow-hidden px-0 mx-0 min-h-0 print:h-auto print:w-full print:overflow-visible print:block print:static"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="flex-1 flex overflow-hidden min-h-0 print:h-auto print:w-full print:overflow-visible print:block print:static"
          >
            <Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                <RefreshCw size={24} className="animate-spin text-indigo-500" />
                <span className="text-xs font-semibold">Ładowanie modułu...</span>
              </div>
            }>
              <ErrorBoundary 
                onReset={() => handleRollbackToLastValid('Reset po błędzie widoku')}
                fallbackTitle="Wystąpił nieoczekiwany błąd w module planu"
              >
                {isCompanionActive ? (
                  <DualScreenMasterView
                    currentTab={currentTab}
                    appState={appState}
                    schedData={schedData}
                    activeVariant={activeVariant}
                    planVariants={planVariants}
                    onChangeAppState={handleUpdateAppState}
                    onChangeSchedData={handleUpdateSchedData}
                    onNavigateToTab={(tab) => setCurrentTab(tab)}
                    onSwitchVariant={handleSwitchVariant}
                    onToggleSingleScreen={() => setIsCompanionActive(false)}
                    onRecallCompanionWindow={() => handleToggleDualScreen()}
                  />
                ) : (
                  <>
                    {currentTab === 'kreator' && (
                      <KreatorSzkoly
                        appState={appState}
                        onChangeAppState={handleUpdateAppState}
                        onNavigateToTab={(tab) => setCurrentTab(tab)}
                        archive={archive}
                        onChangeArchive={handleUpdateArchive}
                      />
                    )}
                    {currentTab === 'plan_klas' && (
                      <PlanKlas 
                        appState={appState} 
                        onChangeAppState={handleUpdateAppState} 
                        onTransfer={() => {
                          handleImportFromPlanKlas();
                          setCurrentTab('plan_sal');
                        }}
                        presentationMode={isPresentationMode}
                        initialTab="plan"
                        activeVariant={activeVariant}
                        onOpenVariantsModal={() => setShowVariantsModal(true)}
                      />
                    )}
                    {currentTab === 'plan_sal' && (
                      <PlanSal 
                        appState={appState} 
                        schedData={schedData} 
                        onChangeAppState={handleUpdateAppState} 
                        onChangeSchedData={handleUpdateSchedData} 
                        onImportFromPlanKlas={handleImportFromPlanKlas}
                        presentationMode={isPresentationMode}
                      />
                    )}
                    {currentTab === 'dyzury' && (
                      <Dyzury 
                        appState={appState} 
                        onChangeAppState={handleUpdateAppState} 
                        schedData={schedData}
                        presentationMode={isPresentationMode}
                      />
                    )}
                    {currentTab === 'zastepstwa' && (
                      <ZastepstwaDziennik 
                        appState={appState} 
                        schedData={schedData} 
                        onChangeAppState={handleUpdateAppState} 
                      />
                    )}
                    {currentTab === 'higiena_men' && (
                      <AudytorHigienyMEN 
                        appState={appState} 
                        schedData={schedData} 
                        onNavigateToTab={(tab) => setCurrentTab(tab as any)} 
                      />
                    )}
                    {currentTab === 'eksport_raporty' && (
                      <EksportIRaporty 
                        appState={appState} 
                        schedData={schedData} 
                      />
                    )}
                    {currentTab === 'porownywarka_diff' && (
                      <SplitScreenDiffViewer
                        appState={appState}
                        planVariants={planVariants}
                        activeVariantId={activeVariantId}
                        onUpdateVariants={handleSaveVariants}
                        onApplyVariantToActive={(variant) => handleSwitchVariant(variant.id)}
                        onBackToMain={() => setCurrentTab('plan_klas')}
                      />
                    )}
                    {currentTab === 'wydruki' && (
                      <Wydruki 
                        appState={appState} 
                        schedData={schedData}
                        onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                      />
                    )}
                    {currentTab === 'statystyki' && (
                      <Statystyki 
                        appState={appState} 
                        schedData={schedData}
                        historyLogs={historyLogs}
                        onClearHistoryLogs={() => setHistoryLogs([])}
                        onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                      />
                    )}
                    {currentTab === 'ustawienia_generatorow' && (
                      <UstawieniaGeneratorow 
                        appState={appState} 
                        onChangeAppState={handleUpdateAppState} 
                      />
                    )}
                    {currentTab === 'o_programie' && (
                      <OProgramie initialTab={oProgramieTab} />
                    )}
                  </>
                )}
              </ErrorBoundary>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── STOPKA STATYSTYCZNA LICENCJI ── */}
      {!isPresentationMode && (
        <footer className="bg-slate-900 border-t border-slate-950 text-slate-500 py-3 px-6 flex flex-col md:flex-row justify-between items-center gap-3.5 text-[10px] select-none shrink-0 font-medium">
        <div className="flex items-center gap-3">
          <span>Licencja: Edukacyjna (Zastrzeżona) · Offline Client-side App</span>
          <span className="text-slate-750 font-bold">|</span>
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
            {saveStatus === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1 select-none">
                <RefreshCw size={10} className="animate-spin text-amber-400" /> Zapamiętywanie...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-indigo-400 flex items-center gap-1 select-none">
                ⌛ Oczekiwanie na zapis...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-500 flex items-center gap-1 select-none">
                ✓ Wszystkie zmiany zapisane w przeglądarce
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-400 flex items-center gap-1 select-none font-bold">
                <AlertTriangle size={11} className="text-rose-400 shrink-0" />
                Błąd zapisu bazy danych!
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Przebieg wykorzystania pamięci IndexedDB */}
          <div 
            className="flex items-center gap-2.5 w-full sm:w-auto bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 shadow-xs cursor-pointer hover:border-slate-700 transition"
            title="Aplikacja korzysta z lokalnej bazy IndexedDB zdejmującej limit 5 MB. Dane przechowywane są w 100% lokalnie na Twoim komputerze."
            onClick={() => refreshStorageStats(true)}
          >
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold shrink-0 text-xs">
              <Database size={13} className="text-indigo-400" />
              <span>Baza (IndexedDB):</span>
            </div>
            <div className="relative w-24 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  storageStats.percentage > 80 
                    ? 'bg-red-500' 
                    : storageStats.percentage > 50 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(8, storageStats.percentage))}%` }}
              />
            </div>
            <span className="text-slate-300 font-mono font-extrabold shrink-0 text-xs">
              {storageStats.formattedUsed}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>Pojemność: <strong className="font-extrabold text-emerald-400">Bez limitu 5MB</strong> ({storageStats.formattedQuota} wolne)</span>
            <span className="text-slate-700 font-bold">|</span>
            <span className="hidden sm:inline">Offline First (100% bezpieczeństwo danych)</span>
          </div>
        </div>
      </footer>
      )}

      {/* Floating Presentation Mode Exit Indicator */}
      {isPresentationMode && (
        <div className={`fixed bottom-6 right-6 ${Z_INDEX_CLASSES.TOAST} flex items-center gap-2.5 bg-slate-900/95 hover:bg-slate-900 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-slate-800 text-white animate-fade-in`}>
          <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Tryb Prezentacji</span>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => {
              setIsPresentationMode(false);
              notify('Wyłączono tryb prezentacji', 'info');
            }}
            className="flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 uppercase cursor-pointer"
          >
            <EyeOff size={14} /> Wyjdź (Esc)
          </button>
        </div>
      )}

      <Suspense fallback={null}>
        <SnapshotManager
          isOpen={showSnapshotManager}
          onClose={() => setShowSnapshotManager(false)}
          appState={appState}
          schedData={schedData}
          snapshots={snapshots}
          onChangeSnapshots={handleChangeSnapshots}
          onRestoreSnapshot={handleRestoreSnapshotState}
          isRestoring={isRestoring}
          onRestoringChange={setIsRestoring}
          autosaveVersions={autosaveVersions}
        />
      </Suspense>

      <Suspense fallback={null}>
        {showVariantsModal && (
          <PlanVariantsModal
            isOpen={showVariantsModal}
            onClose={() => setShowVariantsModal(false)}
            appState={appState}
            schedData={schedData}
            planVariants={planVariants}
            activeVariantId={activeVariantId}
            onSwitchVariant={handleSwitchVariant}
            onSaveVariants={handleSaveVariants}
            onUpdateActiveVariant={handleUpdateActiveVariant}
            onApplySelectiveClassSync={handleApplySelectiveClassSync}
            onApplyTeacherDutySync={handleApplyTeacherDutySync}
            onShowNotification={(text, type) => notify(text, type === 'success' ? 'ok' : type === 'err' ? 'err' : 'info')}
            onOpenSplitScreen={() => {
              setShowVariantsModal(false);
              setCurrentTab('porownywarka_diff');
            }}
          />
        )}
      </Suspense>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExecuteExport}
        appState={appState}
        schedData={schedData}
        archive={archive}
        snapshots={snapshots}
        historyLogs={historyLogs}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setPendingImportFiles([]);
        }}
        initialRawFiles={pendingImportFiles}
        currentAppState={appState}
        currentSchedData={schedData}
        currentArchive={archive}
        currentSnapshots={snapshots}
        currentHistoryLogs={historyLogs}
        onExecuteMultiImport={handleExecuteMultiImport}
      />

      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onRefreshStorage={refreshStorageStats}
        onOpenExportAnonymized={() => setShowExportModal(true)}
      />

      <TermsModal
        isOpen={showTermsModal}
        onAccept={handleAcceptTerms}
      />

      {conflictData && (
        <MultiTabConflictModal
          isOpen={showConflictModal}
          localRevision={conflictData.localRevision}
          incomingRevision={conflictData.incomingRevision}
          incomingTabId={conflictData.incomingTabId}
          incomingTabName={conflictData.incomingTabName}
          incomingSectionName={conflictData.incomingSectionName}
          incomingUpdatedAt={conflictData.incomingUpdatedAt}
          localAppState={appState}
          incomingAppState={conflictData.dbAppState}
          localSchedData={schedData}
          incomingSchedData={conflictData.dbSchedData}
          localTabName={APP_TAB_NAMES[currentTab] || currentTab}
          onLoadIncoming={handleLoadIncomingFromConflict}
          onKeepLocal={handleKeepLocalFromConflict}
        />
      )}

      {corruptDataModal && (
        <div 
          data-testid="corrupt-data-modal"
          className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        >
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 shadow-2xl max-w-lg w-full text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base">Wykryto uszkodzone dane w pamięci</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Klucz <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">{corruptDataModal.key}</code> istnieje w pamięci przeglądarki, ale nie przeszedł weryfikacji integralności i schematu.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Aby zapobiec utracie danych, <strong>program nie nadpisze ich stanem początkowym bez Twojej zgody</strong>. Możesz pobrać surową kopię awaryjną lub zdecydować o wyczyszczeniu.
            </p>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 max-h-36 overflow-y-auto font-mono text-[10px] text-slate-400 break-all select-all">
              {corruptDataModal.rawContent.slice(0, 1000)}...
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  try {
                    const blob = new Blob([corruptDataModal.rawContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `saleplan_corrupt_${corruptDataModal.key}_${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    notify('Pobrano kopię surowych danych.', 'ok');
                  } catch {
                    navigator.clipboard?.writeText(corruptDataModal.rawContent);
                    notify('Skopiowano surowe dane do schowka.', 'info');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download size={14} />
                Eksportuj surowe dane
              </button>
              <button
                type="button"
                onClick={() => {
                  setCorruptDataModal(null);
                  notify('Zapisy dla tego klucza pozostają zablokowane. Żadne dane nie zostaną nadpisane.', 'info');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
              >
                Zachowaj blokadę
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Czy na pewno chcesz zastąpić uszkodzone dane stanem początkowym? Ta operacja jest nieodwracalna.')) {
                    const keyToReset = corruptDataModal.key;
                    setCorruptDataModal(null);
                    setStorageInitError(null);
                    setWriteBlocked(keyToReset, false);
                    setBlockedWrites(prev => {
                      const next = { ...prev };
                      delete next[keyToReset];
                      return next;
                    });
                    storageReadyRef.current = true;
                    setStorageReady(true);
                    hydratedRef.current = { appState, schedData };

                    let fallbackVal: unknown = null;
                    if (keyToReset === STORAGE_KEYS.SCHED_DATA) fallbackVal = schedData;
                    else if (keyToReset === STORAGE_KEYS.APP_STATE) fallbackVal = appState;
                    else if (keyToReset === STORAGE_KEYS.PLAN_VARIANTS) fallbackVal = planVariants;
                    else if (keyToReset === STORAGE_KEYS.ARCHIVE) { fallbackVal = []; setArchive([]); }
                    else if (keyToReset === STORAGE_KEYS.SNAPSHOTS) { fallbackVal = []; setSnapshots([]); }
                    else if (keyToReset === STORAGE_KEYS.AUTOSAVE_VERSIONS) {
                      fallbackVal = [];
                      setAutosaveVersions([]);
                      const allStorageKeys = await getAllStorageKeys();
                      for (const k of allStorageKeys) {
                        if (k.startsWith('autosave_')) {
                          await removeStorageItem(k).catch(() => {});
                        }
                      }
                    }

                    if (fallbackVal !== null) {
                      await setStorageItem(keyToReset, fallbackVal, { force: true });
                    }
                    notify('Zastąpiono uszkodzone dane stanem początkowym.', 'ok');
                  }
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                Zastąp nowym stanem
              </button>
            </div>
          </div>
        </div>
      )}

      {isRestoring && (
        <div 
          className={`fixed inset-0 ${Z_INDEX_CLASSES.RESTORING_OVERLAY} bg-slate-950/60 backdrop-blur-xs select-none flex flex-col items-center justify-center text-white`}
          id="restoring-pointer-blocker"
        >
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 flex flex-col items-center shadow-2xl space-y-4 max-w-sm text-center">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <p className="font-extrabold text-sm tracking-tight font-sans text-slate-100">Przetwarzanie i weryfikacja danych...</p>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                Trwa bezpieczna podmiana stanów, sprawdzanie spójności relacji ID i przebudowa widoków planu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRollbackToLastValid('Przerwano ręcznie przez użytkownika')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm pointer-events-auto"
            >
              <RotateCcw size={13} />
              Anuluj i przywróć poprzedni stan
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST WYKRYCIA NOWEJ WERSJI (nie renderowany dopóki aktywny jest TermsModal) ── */}
      <AnimatePresence>
        {showVersionToast && !showTermsModal && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 ${Z_INDEX_CLASSES.TOAST} max-w-sm bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 font-sans`}
            id="version-changelog-toast"
          >
            <div className="flex gap-3">
              <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shrink-0 flex items-center justify-center h-10 w-10 shadow-lg shadow-amber-500/20">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-amber-500/25 text-amber-300 font-extrabold font-mono uppercase px-2 py-0.5 rounded-full tracking-wider">
                    Dostępna aktualizacja
                  </span>
                  <button 
                    onClick={handleDismissVersionToast}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                    title="Zamknij"
                  >
                    <X size={15} />
                  </button>
                </div>
                <h4 className="text-xs font-black tracking-tight text-slate-100">SalePlan Pro v3.13.0!</h4>
                <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed">
                  Czysty silnik detekcji konfliktów i partycje grup, inteligentny generator planu z salami, rotacja 30 migawek i bezpieczny dziennik błędów.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleOpenChangelog}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs hover:shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    Zobacz historię zmian <ChevronRight size={12} />
                  </button>
                  <button
                    onClick={handleDismissVersionToast}
                    className="text-slate-400 hover:text-slate-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition hover:bg-slate-800 cursor-pointer"
                  >
                    Pomiń
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
