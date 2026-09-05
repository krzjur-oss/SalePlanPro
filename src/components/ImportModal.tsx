import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, Key, Lock, Unlock, Eye, EyeOff, CheckSquare, Square, 
  Calendar, Building2, Archive, Camera, History, AlertCircle, Check, 
  FileText, ShieldAlert, Sparkles, X, Info, Plus, Trash2, Layers, 
  GitMerge, Shield, Users, BookOpen, Clock, ChevronDown, ChevronRight, 
  Filter, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AppState, 
  SchedData, 
  ArchiveEntry, 
  SnapshotEntry, 
  AppEventLog 
} from '../types';
import { decryptText, isEncryptedBackup } from '../lib/crypto';
import { 
  ImportPayload, 
  FileMergeConfig, 
  createDefaultFileMergeConfig, 
  inspectFilePayload, 
  applyFileMergeToState, 
  executeMultiFileMerge,
  normalizeImportPayload,
  sanitizeAppState,
  isClassGrade1_3,
  isClassGrade4_8,
  ClassScope,
  MergeStrategy
} from '../utils/mergeEngine';
import { validateImportJson } from '../utils/validationSchemas';

/**
 * Sprawdza czy plik .json posiada nagłówek wskazujący na szyfrowanie przed próbą zaimportowania do bazy danych.
 * Wykrywa standardowy format 'encrypted-v1' (PBKDF2 + AES-GCM 256) oraz inne nagłówki szyfrowania.
 */
export function checkIsEncryptedFile(rawContent: string): boolean {
  if (!rawContent || typeof rawContent !== 'string') return false;
  const trimmed = rawContent.trim();
  if (trimmed.includes('"type":"encrypted-v1"') || trimmed.includes('"type": "encrypted-v1"')) {
    return true;
  }
  if (isEncryptedBackup(trimmed)) {
    return true;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.type === 'encrypted-v1' && parsed.ciphertext) return true;
    if (parsed.ciphertext && (parsed.salt || parsed.iv || parsed.tag)) return true;
    if (parsed.encrypted === true || parsed.isEncrypted === true) return true;
    if (parsed.header && (parsed.header.type === 'encrypted-v1' || parsed.header.encrypted === true)) return true;
    if (parsed.security && (parsed.security.encrypted === true || parsed.security.type === 'encrypted-v1')) return true;
    return false;
  } catch {
    return false;
  }
}

interface LoadedFileItem {
  id: string;
  name: string;
  rawContent: string;
  isEncrypted: boolean;
  password?: string;
  decryptError?: string;
  payload: ImportPayload | null;
  config: FileMergeConfig | null;
  isValidSchema?: boolean;
  validationErrors?: string[];
  validationWarnings?: string[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRawFiles?: { name: string; content: string }[];
  currentAppState: AppState;
  currentSchedData: SchedData;
  currentArchive: ArchiveEntry[];
  currentSnapshots: SnapshotEntry[];
  currentHistoryLogs: AppEventLog[];
  onExecuteMultiImport: (result: {
    mergedState: AppState;
    mergedSched: SchedData;
    mergedArchive: ArchiveEntry[];
    mergedSnapshots: SnapshotEntry[];
    mergedLogs: AppEventLog[];
    overallReport: string[];
  }) => void;
}

export default function ImportModal({
  isOpen,
  onClose,
  initialRawFiles,
  currentAppState,
  currentSchedData,
  currentArchive,
  currentSnapshots,
  currentHistoryLogs,
  onExecuteMultiImport
}: ImportModalProps) {
  const [files, setFiles] = useState<LoadedFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isDecryptingId, setIsDecryptingId] = useState<string | null>(null);
  const [justDecryptedId, setJustDecryptedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'preview'>('files');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    base: true,
    planLekcji: true,
    planSal: true,
    dyzury: true,
    extra: false
  });

  // Initialize files on open or when initialRawFiles change
  useEffect(() => {
    if (isOpen && initialRawFiles && initialRawFiles.length > 0) {
      const loaded: LoadedFileItem[] = initialRawFiles.map((rf, idx) => {
        const fileId = `file_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
        const encrypted = checkIsEncryptedFile(rf.content);
        let parsedPayload: ImportPayload | null = null;
        let config: FileMergeConfig | null = null;
        let isValidSchema = true;
        let validationErrors: string[] = [];
        let validationWarnings: string[] = [];

        // Nie sprawdzamy schematu ani nie parsujemy payloadu dla zaszyfrowanych danych
        if (!encrypted) {
          const valRes = validateImportJson(rf.content);
          isValidSchema = valRes.isValid;
          validationErrors = valRes.errors;
          validationWarnings = valRes.warnings;

          if (valRes.data) {
            parsedPayload = valRes.data;
            config = createDefaultFileMergeConfig(fileId, rf.name, parsedPayload, idx === 0);
          } else {
            try {
              const raw = JSON.parse(rf.content);
              parsedPayload = normalizeImportPayload(raw);
              config = createDefaultFileMergeConfig(fileId, rf.name, parsedPayload, idx === 0);
            } catch (e) {}
          }
        }

        return {
          id: fileId,
          name: rf.name,
          rawContent: rf.content,
          isEncrypted: encrypted,
          payload: parsedPayload,
          config: config,
          isValidSchema: encrypted ? undefined : isValidSchema,
          validationErrors: encrypted ? undefined : validationErrors,
          validationWarnings: encrypted ? undefined : validationWarnings
        };
      });

      setFiles(loaded);
      if (loaded.length > 0) {
        setActiveFileId(loaded[0].id);
      }
    }
  }, [isOpen, initialRawFiles]);

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;
    e.target.value = '';

    selectedFiles.forEach((file: File, idx: number) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawContent = evt.target?.result as string;
        if (!rawContent) return;

        const fileId = `file_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
        const encrypted = checkIsEncryptedFile(rawContent);
        let parsedPayload: ImportPayload | null = null;
        let config: FileMergeConfig | null = null;
        let isValidSchema = true;
        let validationErrors: string[] = [];
        let validationWarnings: string[] = [];

        // Jeśli plik posiada nagłówek szyfrowania, nie parsować przed podaniem hasła
        if (!encrypted) {
          const valRes = validateImportJson(rawContent);
          isValidSchema = valRes.isValid;
          validationErrors = valRes.errors;
          validationWarnings = valRes.warnings;

          if (valRes.data) {
            parsedPayload = valRes.data;
            config = createDefaultFileMergeConfig(fileId, file.name, parsedPayload, files.length === 0);
          } else {
            try {
              const raw = JSON.parse(rawContent);
              parsedPayload = normalizeImportPayload(raw);
              config = createDefaultFileMergeConfig(fileId, file.name, parsedPayload, files.length === 0);
            } catch (e) {}
          }
        }

        setFiles(prev => {
          const next = [
            ...prev,
            {
              id: fileId,
              name: file.name,
              rawContent: rawContent,
              isEncrypted: encrypted,
              payload: parsedPayload,
              config: config,
              isValidSchema: encrypted ? undefined : isValidSchema,
              validationErrors: encrypted ? undefined : validationErrors,
              validationWarnings: encrypted ? undefined : validationWarnings
            }
          ];
          if (!activeFileId) setActiveFileId(fileId);
          return next;
        });
      };
      reader.readAsText(file);
    });
  };

  const handleDecryptFile = async (fileId: string, passwordInput: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !passwordInput.trim()) return;

    setIsDecryptingId(fileId);
    try {
      const decrypted = await decryptText(file.rawContent, passwordInput.trim());
      const valRes = validateImportJson(decrypted);
      const parsed: ImportPayload = valRes.data || normalizeImportPayload(JSON.parse(decrypted));
      const config = createDefaultFileMergeConfig(fileId, file.name, parsed, files.indexOf(file) === 0);

      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            isEncrypted: false,
            decryptError: undefined,
            payload: parsed,
            config: config,
            isValidSchema: valRes.isValid,
            validationErrors: valRes.errors,
            validationWarnings: valRes.warnings
          };
        }
        return f;
      }));
      setJustDecryptedId(fileId);
      setTimeout(() => setJustDecryptedId(null), 5000);
    } catch (err: any) {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            decryptError: err.message || 'Niepoprawne hasło lub błąd odszyfrowywania. Upewnij się, że wpisujesz hasło ustalone podczas eksportu.'
          };
        }
        return f;
      }));
    } finally {
      setIsDecryptingId(null);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const updateActiveConfig = (updater: (prev: FileMergeConfig) => FileMergeConfig) => {
    if (!activeFileId) return;
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId && f.config) {
        return {
          ...f,
          config: updater(f.config)
        };
      }
      return f;
    }));
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const activeConfig = activeFile?.config;
  const activePayload = activeFile?.payload;
  const activeStats = activePayload ? inspectFilePayload(activePayload, activeFile.name) : null;

  // Preset Handlers
  const applyRolePreset = (
    fileId: string, 
    role: 'all_replace' | 'plan_klas' | 'sal_1_3' | 'sal_4_8' | 'dyzury' | 'sal_all'
  ) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.payload || !f.config) return f;

      const isFirst = prev.indexOf(f) === 0;
      const base = createDefaultFileMergeConfig(f.id, f.name, f.payload, isFirst);

      if (role === 'all_replace') {
        base.importSchoolInfo = true;
        base.importBuildingsAndFloors = true;
        base.importRoomsList = true;
        base.teachersMode = 'replace';
        base.subjectsMode = 'replace';
        base.classesMode = 'replace';
        base.homeroomsMode = 'replace';
        base.planLekcjiScope = 'all';
        base.planLekcjiStrategy = 'replace';
        base.planSalScope = 'all';
        base.planSalStrategy = 'replace';
        base.dyzuryMode = 'all';
        base.dyzuryStrategy = 'replace';
      } else if (role === 'plan_klas') {
        base.importSchoolInfo = isFirst;
        base.importBuildingsAndFloors = isFirst;
        base.importRoomsList = isFirst;
        base.teachersMode = isFirst ? 'replace' : 'merge_new';
        base.subjectsMode = isFirst ? 'replace' : 'merge_new';
        base.classesMode = isFirst ? 'replace' : 'merge_new';
        base.homeroomsMode = 'none';
        base.planLekcjiScope = 'all';
        base.planLekcjiStrategy = isFirst ? 'replace' : 'merge';
        base.planSalScope = 'all'; // No room placements
        base.planSalStrategy = 'merge';
        base.dyzuryMode = 'none';
      } else if (role === 'sal_1_3') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'merge_new';
        base.classesMode = 'merge_new';
        base.homeroomsMode = 'merge';
        base.planLekcjiScope = 'grades_1_3';
        base.planLekcjiStrategy = 'merge';
        base.planSalScope = 'grades_1_3';
        base.planSalStrategy = 'merge';
        base.dyzuryMode = 'none';
      } else if (role === 'sal_4_8') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'merge_new';
        base.classesMode = 'merge_new';
        base.homeroomsMode = 'merge';
        base.planLekcjiScope = 'grades_4_8';
        base.planLekcjiStrategy = 'merge';
        base.planSalScope = 'grades_4_8';
        base.planSalStrategy = 'merge';
        base.dyzuryMode = 'none';
      } else if (role === 'sal_all') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'merge_new';
        base.classesMode = 'merge_new';
        base.homeroomsMode = 'merge';
        base.planLekcjiScope = 'all';
        base.planLekcjiStrategy = 'merge';
        base.planSalScope = 'all';
        base.planSalStrategy = 'merge';
        base.dyzuryMode = 'none';
      } else if (role === 'dyzury') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'none';
        base.classesMode = 'none';
        base.homeroomsMode = 'none';
        base.planLekcjiScope = 'all';
        base.planSalScope = 'all';
        base.dyzuryMode = 'all';
        base.dyzuryStrategy = 'merge';
      }

      return {
        ...f,
        config: base
      };
    }));
  };

  // Auto-Match All Files Smart Preset
  const applySmartAutoMatchAll = () => {
    setFiles(prev => prev.map((f, idx) => {
      if (!f.payload || !f.config) return f;
      const stats = inspectFilePayload(f.payload, f.name);
      
      let presetRole: 'all_replace' | 'plan_klas' | 'sal_1_3' | 'sal_4_8' | 'dyzury' | 'sal_all' = 'plan_klas';
      
      if (stats.detectedRole === 'dyzury') {
        presetRole = 'dyzury';
      } else if (stats.detectedRole === 'sal_1_3') {
        presetRole = 'sal_1_3';
      } else if (stats.detectedRole === 'sal_4_8') {
        presetRole = 'sal_4_8';
      } else if (idx === 0) {
        presetRole = 'all_replace';
      }

      const base = createDefaultFileMergeConfig(f.id, f.name, f.payload, idx === 0);
      if (presetRole === 'all_replace') {
        base.importSchoolInfo = true;
        base.importBuildingsAndFloors = true;
        base.importRoomsList = true;
        base.teachersMode = 'replace';
        base.subjectsMode = 'replace';
        base.classesMode = 'replace';
        base.homeroomsMode = 'replace';
        base.planLekcjiScope = 'all';
        base.planLekcjiStrategy = 'replace';
        base.planSalScope = 'all';
        base.planSalStrategy = 'replace';
        base.dyzuryMode = stats.dutyEntries > 0 ? 'all' : 'none';
        base.dyzuryStrategy = 'replace';
      } else if (presetRole === 'sal_1_3') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'merge_new';
        base.classesMode = 'merge_new';
        base.homeroomsMode = 'merge';
        base.planLekcjiScope = 'grades_1_3';
        base.planLekcjiStrategy = 'merge';
        base.planSalScope = 'grades_1_3';
        base.planSalStrategy = 'merge';
        base.dyzuryMode = 'none';
      } else if (presetRole === 'sal_4_8') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'merge_new';
        base.classesMode = 'merge_new';
        base.homeroomsMode = 'merge';
        base.planLekcjiScope = 'grades_4_8';
        base.planLekcjiStrategy = 'merge';
        base.planSalScope = 'grades_4_8';
        base.planSalStrategy = 'merge';
        base.dyzuryMode = 'none';
      } else if (presetRole === 'dyzury') {
        base.importSchoolInfo = false;
        base.importBuildingsAndFloors = false;
        base.importRoomsList = false;
        base.teachersMode = 'merge_new';
        base.subjectsMode = 'none';
        base.classesMode = 'none';
        base.homeroomsMode = 'none';
        base.planLekcjiScope = 'all';
        base.planSalScope = 'all';
        base.dyzuryMode = 'all';
        base.dyzuryStrategy = 'merge';
      }

      return {
        ...f,
        config: base
      };
    }));
  };

  // Calculate live preview of combined merge
  const previewSummary = useMemo(() => {
    if (!isOpen || files.length === 0) return null;
    try {
      const validConfigs = files.map(f => f.config).filter(Boolean) as FileMergeConfig[];
      if (validConfigs.length === 0) return null;

      let testState = sanitizeAppState(JSON.parse(JSON.stringify(currentAppState)));
      let testSched = JSON.parse(JSON.stringify(currentSchedData || {}));
      const stepReports: { fileName: string; reports: string[] }[] = [];

      validConfigs.forEach(cfg => {
        const { nextState, nextSched, report } = applyFileMergeToState(testState, testSched, cfg);
        testState = nextState;
        testSched = nextSched;
        stepReports.push({ fileName: cfg.fileName, reports: report });
      });

      const classesCount = (testState.classes || []).length;
      const teachersCount = (testState.teachers || []).length;
      const lessonsCount = Object.keys(testState.planLekcji?.lessons || {}).length;
      const dutiesCount = Object.keys(testState.dyzury?.harmonogram || {}).length;

      let schedPlacements1_3 = 0;
      let schedPlacements4_8 = 0;
      let schedTotal = 0;

      Object.values(testSched || {}).forEach((year: any) => {
        if (!year || typeof year !== 'object') return;
        Object.values(year).forEach((day: any) => {
          if (!day || typeof day !== 'object') return;
          Object.values(day).forEach((hour: any) => {
            if (!hour || typeof hour !== 'object') return;
            Object.values(hour).forEach((cell: any) => {
              if (cell) {
                const cellsArr = Array.isArray(cell) ? cell : [cell];
                cellsArr.forEach(c => {
                  if (c) {
                    schedTotal++;
                    const cNames = Array.isArray(c.classes) ? c.classes : (c.className ? [c.className] : []);
                    if (cNames.some((cn: string) => isClassGrade1_3(String(cn || '')))) schedPlacements1_3++;
                    if (cNames.some((cn: string) => isClassGrade4_8(String(cn || '')))) schedPlacements4_8++;
                  }
                });
              }
            });
          });
        });
      });

      return {
        classesCount,
        teachersCount,
        lessonsCount,
        dutiesCount,
        schedPlacements1_3,
        schedPlacements4_8,
        schedTotal,
        stepReports
      };
    } catch (err) {
      console.warn('Błąd podczas generowania podglądu scalania:', err);
      return null;
    }
  }, [isOpen, files, currentAppState, currentSchedData]);

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const encFile = files.find(f => f.isEncrypted);
    if (encFile) {
      setActiveFileId(encFile.id);
      setActiveTab('files');
      alert(`Plik "${encFile.name}" posiada nagłówek wskazujący na szyfrowanie i wymaga podania hasła. Odszyfruj go przed wykonaniem scalenia danych.`);
      return;
    }

    const validConfigs = files.map(f => f.config).filter(Boolean) as FileMergeConfig[];
    if (validConfigs.length === 0) {
      alert('Brak poprawnie skonfigurowanych plików do zaimportowania.');
      return;
    }

    const result = await executeMultiFileMerge(
      currentAppState,
      currentSchedData,
      currentArchive,
      currentSnapshots,
      currentHistoryLogs,
      validConfigs
    );

    onExecuteMultiImport(result);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Available classes in active file for custom checklist
  const activeAvailableClasses = activePayload?.appState?.classes || activePayload?.appState?.planLekcji?.classes || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs cursor-pointer"
        />

        {/* Main Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[94vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <GitMerge size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                    Centrum Scalania i Importu Danych (Wieloosobowe)
                  </h2>
                  <span className="bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                    {files.length} {files.length === 1 ? 'plik' : files.length < 5 ? 'pliki' : 'plików'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Łącz siatki zajęć, przydziały sal dla klas 1-3 oraz 4-8 i dyżury z kilku plików w jeden spójny plan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'files' 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers size={14} /> Konfiguracja Plików
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'preview' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 size={14} /> Podgląd Scalenia
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          {files.length > 0 && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <Sparkles size={15} className="text-indigo-600 shrink-0" />
                <span>Szybkie profile scalania:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={applySmartAutoMatchAll}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Automatycznie przypisuje role (np. Plan klas -> Baza, 1-3 -> Sale 1-3, 4-8 -> Sale 4-8, Dyżury -> Dyżury)"
                  >
                    🌟 Inteligentny podział ról dla wszystkich
                  </button>
                )}
                {activeFileId && (
                  activeFile?.isEncrypted ? (
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                      <Lock size={12} className="text-amber-600 shrink-0" />
                      Plik zaszyfrowany – wpisz hasło i kliknij „Odszyfruj”, aby odblokować profile
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => applyRolePreset(activeFileId, 'plan_klas')}
                        className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Ustaw ten plik jako źródło siatki lekcji klas"
                      >
                        🎓 Siatka lekcji
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset(activeFileId, 'sal_1_3')}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Ustaw ten plik jako przydział sal dla edukacji wczesnoszkolnej"
                      >
                        🧸 Sale klas 1-3
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset(activeFileId, 'sal_4_8')}
                        className="px-2 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Ustaw ten plik jako przydział sal dla klas 4-8"
                      >
                        🏫 Sale klas 4-8
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset(activeFileId, 'dyzury')}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Ustaw ten plik jako źródło dyżurów"
                      >
                        🛡️ Dyżury
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset(activeFileId, 'all_replace')}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Zastąp wszystko danymi z tego pliku"
                      >
                        🔄 Wszystko (Zastąp)
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {activeTab === 'files' ? (
              <>
                {/* Left Sidebar: Uploaded Files Queue */}
                <div className="w-full md:w-72 lg:w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 flex flex-col gap-3 overflow-y-auto shrink-0 custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Lista plików ({files.length}):
                    </span>
                    <label className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                      <Plus size={13} /> Dodaj plik
                      <input
                        type="file"
                        multiple
                        accept=".json"
                        className="hidden"
                        onChange={handleAddMoreFiles}
                      />
                    </label>
                  </div>

                  {files.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-2xl">
                        <Upload size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">Wybierz pliki JSON</p>
                        <p className="text-[10px] text-slate-400 mt-1">Możesz zaznaczyć kilka plików naraz do scalenia</p>
                      </div>
                      <label className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer shadow-xs">
                        Przeglądaj pliki
                        <input
                          type="file"
                          multiple
                          accept=".json"
                          className="hidden"
                          onChange={handleAddMoreFiles}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file, idx) => {
                        const isActive = file.id === activeFileId;
                        const stats = file.payload ? inspectFilePayload(file.payload, file.name) : null;

                        return (
                          <div
                            key={file.id}
                            onClick={() => setActiveFileId(file.id)}
                            className={`p-3 rounded-xl border transition cursor-pointer relative ${
                              isActive 
                                ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 shadow-md ring-1 ring-indigo-500/20' 
                                : 'bg-white/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                  file.isEncrypted 
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' 
                                    : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                                }`}>
                                  {file.isEncrypted ? <Lock size={14} /> : <FileText size={14} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                                    {idx + 1}. {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {file.isEncrypted ? '🔒 Plik zaszyfrowany' : (stats?.schoolName || 'Szkoła')}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFile(file.id);
                                }}
                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                                title="Usuń plik z listy"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Tags / mini stats */}
                            {!file.isEncrypted && stats && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {file.isValidSchema ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <Check size={10} /> Zod OK
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                    <AlertTriangle size={10} /> Ostrzeżenie
                                  </span>
                                )}
                                {stats.totalLessons > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900/40">
                                    {stats.totalLessons} lekcji
                                  </span>
                                )}
                                {stats.sched1_3 > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded border border-amber-100 dark:border-amber-900/40">
                                    1-3: {stats.sched1_3} sal
                                  </span>
                                )}
                                {stats.sched4_8 > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-100 dark:border-emerald-900/40">
                                    4-8: {stats.sched4_8} sal
                                  </span>
                                )}
                                {stats.dutyEntries > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 rounded border border-violet-100 dark:border-violet-900/40">
                                    {stats.dutyEntries} dyżurów
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Drop / Add bottom bar */}
                  <label className="p-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer bg-white/40 dark:bg-slate-900/40">
                    <Plus size={14} /> Dodaj kolejny plik JSON
                    <input
                      type="file"
                      multiple
                      accept=".json"
                      className="hidden"
                      onChange={handleAddMoreFiles}
                    />
                  </label>
                </div>

                {/* Right Area: Active File Detailed Configuration */}
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                  {activeFile ? (
                    activeFile.isEncrypted ? (
                      /* Dedykowany formularz odszyfrowywania */
                      <div className="max-w-xl mx-auto my-6 p-6 sm:p-8 bg-gradient-to-b from-amber-50/80 to-white dark:from-amber-950/30 dark:to-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-2xl shadow-xl space-y-6">
                        {/* Header z odznaką nagłówka AES-256 */}
                        <div className="flex items-start gap-4">
                          <div className="p-3.5 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/25 shrink-0 mt-0.5">
                            <Lock size={26} />
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                                Wykryto nagłówek szyfrowania (AES-256 GCM)
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                              Plik jest zaszyfrowany hasłem
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              Plik <span className="font-mono font-bold text-slate-800 dark:text-slate-200">"{activeFile.name}"</span> posiada nagłówek wskazujący na zaszyfrowanie kopii zapasowej. Przed weryfikacją struktury danych i scaleniem z bazą programu należy podać hasło i odszyfrować plik.
                            </p>
                          </div>
                        </div>

                        {/* Dedykowany Formularz z polem typu 'password' i przyciskiem 'Odszyfruj' */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleDecryptFile(activeFile.id, activeFile.password || '');
                          }}
                          className="space-y-4 pt-1"
                        >
                          <div className="space-y-1.5">
                            <label 
                              htmlFor="import-modal-password-input"
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between"
                            >
                              <span className="flex items-center gap-1.5">
                                <Key size={14} className="text-amber-600" />
                                Hasło deszyfrujące:
                              </span>
                              <span className="text-[11px] font-normal text-slate-500">
                                Wymagane przed scaleniem
                              </span>
                            </label>
                            
                            <div className="relative">
                              <input
                                id="import-modal-password-input"
                                type={showPassword[activeFile.id] ? 'text' : 'password'}
                                autoFocus
                                disabled={isDecryptingId === activeFile.id}
                                value={activeFile.password || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, password: val, decryptError: undefined } : f));
                                }}
                                placeholder="Wpisz hasło do odszyfrowania pliku..."
                                className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 pr-11 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition shadow-inner font-mono tracking-wide"
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword(p => ({ ...p, [activeFile.id]: !p[activeFile.id] }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer rounded-lg"
                                title={showPassword[activeFile.id] ? 'Ukryj hasło' : 'Pokaż hasło'}
                              >
                                {showPassword[activeFile.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          {activeFile.decryptError && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                              <div className="space-y-0.5">
                                <p className="font-bold">Błąd odszyfrowywania</p>
                                <p className="text-[11px] opacity-90">{activeFile.decryptError}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              type="submit"
                              disabled={!activeFile.password?.trim() || isDecryptingId === activeFile.id}
                              className="flex-1 py-3 px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded-xl text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
                            >
                              {isDecryptingId === activeFile.id ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  <span>Odszyfrowywanie...</span>
                                </>
                              ) : (
                                <>
                                  <Unlock size={16} />
                                  <span>Odszyfruj</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveFile(activeFile.id)}
                              className="py-3 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition cursor-pointer"
                              title="Usuń ten plik z listy importu"
                            >
                              Usuń plik
                            </button>
                          </div>
                        </form>

                        {/* Bezpieczeństwo Web Crypto API */}
                        <div className="pt-3 border-t border-amber-200/70 dark:border-amber-900/50 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>
                            Deszyfrowanie odbywa się w 100% lokalnie w przeglądarce za pomocą standardu Web Crypto API (PBKDF2 + AES-GCM 256-bit). Hasło ani odszyfrowane dane nie są przesyłane do zewnętrznych serwerów.
                          </span>
                        </div>
                      </div>
                    ) : activeConfig && activeStats ? (
                      /* Decrypted / Valid JSON Configurator */
                      <div className="space-y-4">
                        {/* Decryption Success Banner */}
                        {justDecryptedId === activeFile.id && (
                          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-xs">
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                            <span>Plik został pomyślnie odszyfrowany! Schemat został sprawdzony – możesz teraz zweryfikować dane i skonfigurować reguły scalenia z bazą danych.</span>
                          </div>
                        )}
                        {/* File Header Details */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                {activeFile.name}
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded">
                                {activeStats.schoolName}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Zawiera: {activeStats.classesCount} klas, {activeStats.teachersCount} nauczycieli, {activeStats.totalLessons} lekcji w planie, {activeStats.schedRoomsTotal} przypisań w planie sal, {activeStats.dutyEntries} dyżurów
                            </p>
                          </div>
                        </div>

                        {/* Security & Zod Schema Integrity Verification Badge */}
                        <div className={`p-3 rounded-xl border text-xs ${
                          activeFile.isValidSchema 
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                        }`}>
                          <div className="flex items-start gap-2.5">
                            <Shield className={`shrink-0 mt-0.5 ${activeFile.isValidSchema ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} size={16} />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black uppercase tracking-wider text-[10.5px]">
                                  Integralność pliku i bezpieczeństwo importu
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  activeFile.isValidSchema 
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                                }`}>
                                  {activeFile.isValidSchema ? 'Walidacja Zod: ZGODNA' : 'Uwagi do schematu'}
                                </span>
                              </div>
                              <p className="text-[11px] leading-snug opacity-90">
                                {activeFile.isValidSchema ? (
                                  <>Struktura pliku została zweryfikowana schematem Zod. Aktywna ochrona przed atakami <strong>Prototype Pollution</strong> (oczyszczono klucze obiektów).</>
                                ) : (
                                  <>Wykryto drobne niezgodności typów lub brakujące pola w schemacie Zod (zastosowano bezpieczne domyślne mapowanie).</>
                                )}
                              </p>
                              {activeFile.validationErrors && activeFile.validationErrors.length > 0 && (
                                <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 text-[10.5px] max-h-24 overflow-y-auto space-y-0.5">
                                  {activeFile.validationErrors.slice(0, 3).map((err, i) => (
                                    <div key={i} className="text-amber-800 dark:text-amber-300 font-mono">⚠️ {err}</div>
                                  ))}
                                  {activeFile.validationErrors.length > 3 && (
                                    <div className="text-amber-600 dark:text-amber-400 italic font-sans">+ {activeFile.validationErrors.length - 3} więcej uwag</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION 1: School Info & Infrastructure */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                          <div 
                            onClick={() => toggleSection('base')}
                            className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                              <Building2 size={15} className="text-indigo-500" />
                              <span>1. Dane Szkoły, Nauczyciele i Zasoby</span>
                            </div>
                            {expandedSections.base ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>

                          {expandedSections.base && (
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={activeConfig.importSchoolInfo}
                                    onChange={(e) => updateActiveConfig(c => ({ ...c, importSchoolInfo: e.target.checked }))}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Nazwa szkoły i godziny lekcyjne (Dzwonki)</span>
                                </label>

                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={activeConfig.importBuildingsAndFloors}
                                    onChange={(e) => updateActiveConfig(c => ({ ...c, importBuildingsAndFloors: e.target.checked }))}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Infrastruktura budynków i pięter</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                {/* Teachers mode */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Nauczyciele:</label>
                                  <select
                                    value={activeConfig.teachersMode}
                                    onChange={(e) => updateActiveConfig(c => ({ ...c, teachersMode: e.target.value as any }))}
                                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                                  >
                                    <option value="none">Nie importuj</option>
                                    <option value="merge_new">✓ Dołącz nowych / uzupełnij</option>
                                    <option value="replace">Zastąp całą listę</option>
                                  </select>
                                </div>

                                {/* Subjects mode */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Przedmioty:</label>
                                  <select
                                    value={activeConfig.subjectsMode}
                                    onChange={(e) => updateActiveConfig(c => ({ ...c, subjectsMode: e.target.value as any }))}
                                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                                  >
                                    <option value="none">Nie importuj</option>
                                    <option value="merge_new">✓ Dołącz nowe</option>
                                    <option value="replace">Zastąp całą listę</option>
                                  </select>
                                </div>

                                {/* Classes mode */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Oddziały (Klasy):</label>
                                  <select
                                    value={activeConfig.classesMode}
                                    onChange={(e) => updateActiveConfig(c => ({ ...c, classesMode: e.target.value as any }))}
                                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                                  >
                                    <option value="none">Nie importuj</option>
                                    <option value="merge_new">✓ Dołącz nowe</option>
                                    <option value="replace">Zastąp całą listę</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 2: Plan Lekcji (Etap 1 - Klasy i Nauczyciele) */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                          <div 
                            onClick={() => toggleSection('planLekcji')}
                            className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                              <Calendar size={15} className="text-blue-500" />
                              <span>2. Plan Lekcji (Siatka Zajęć Klas - Etap 1)</span>
                              <span className="text-[10px] font-normal text-slate-400 normal-case">
                                ({activeStats.totalLessons} lekcji w pliku)
                              </span>
                            </div>
                            {expandedSections.planLekcji ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>

                          {expandedSections.planLekcji && (
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Zakres klas do wczytania:</label>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planLekcjiScope: 'all' }))}
                                      className={`p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planLekcjiScope === 'all'
                                          ? 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                                          : 'border-slate-200 text-slate-600 dark:border-slate-700'
                                      }`}
                                    >
                                      Wszystkie oddziały
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planLekcjiScope: 'grades_1_3' }))}
                                      className={`p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planLekcjiScope === 'grades_1_3'
                                          ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                                          : 'border-slate-200 text-slate-600 dark:border-slate-700'
                                      }`}
                                    >
                                      🧸 Tylko klasy 1-3 ({activeStats.lessons1_3} lekcji)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planLekcjiScope: 'grades_4_8' }))}
                                      className={`p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planLekcjiScope === 'grades_4_8'
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                                          : 'border-slate-200 text-slate-600 dark:border-slate-700'
                                      }`}
                                    >
                                      🏫 Tylko klasy 4-8 ({activeStats.lessons4_8} lekcji)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planLekcjiScope: 'custom' }))}
                                      className={`p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planLekcjiScope === 'custom'
                                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200'
                                          : 'border-slate-200 text-slate-600 dark:border-slate-700'
                                      }`}
                                    >
                                      🎯 Wybrane oddziały
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Tryb scalania siatki lekcji:</label>
                                  <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-bold">
                                      <input
                                        type="radio"
                                        name={`plStrategy_${activeFile.id}`}
                                        checked={activeConfig.planLekcjiStrategy === 'merge'}
                                        onChange={() => updateActiveConfig(c => ({ ...c, planLekcjiStrategy: 'merge' }))}
                                        className="text-blue-600"
                                      />
                                      <span>Scal / Zastąp lekcje dla wybranych klas (zachowaj pozostałe)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-bold">
                                      <input
                                        type="radio"
                                        name={`plStrategy_${activeFile.id}`}
                                        checked={activeConfig.planLekcjiStrategy === 'replace'}
                                        onChange={() => updateActiveConfig(c => ({ ...c, planLekcjiStrategy: 'replace' }))}
                                        className="text-blue-600"
                                      />
                                      <span>Zastąp cały plan lekcji</span>
                                    </label>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-bold">
                                      <input
                                        type="checkbox"
                                        checked={activeConfig.planLekcjiIncludeSpecial}
                                        onChange={(e) => updateActiveConfig(c => ({ ...c, planLekcjiIncludeSpecial: e.target.checked }))}
                                        className="rounded border-slate-300 text-blue-600"
                                      />
                                      <span>Dołącz Nauczanie Indywidualne (NI) i Rewalidację</span>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* Custom Classes Checklist if custom scope is selected */}
                              {activeConfig.planLekcjiScope === 'custom' && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    <span>Zaznacz oddziały do zaimportowania:</span>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateActiveConfig(c => ({ ...c, planLekcjiCustomClasses: activeAvailableClasses.map(cl => cl.id) }))}
                                        className="text-indigo-600 hover:underline cursor-pointer"
                                      >
                                        Wszystkie
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateActiveConfig(c => ({ ...c, planLekcjiCustomClasses: [] }))}
                                        className="text-slate-400 hover:underline cursor-pointer"
                                      >
                                        Wyczyść
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                    {activeAvailableClasses.map(cl => {
                                      const isChecked = activeConfig.planLekcjiCustomClasses.includes(cl.id);
                                      return (
                                        <label
                                          key={cl.id}
                                          className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                            isChecked 
                                              ? 'bg-indigo-600 text-white border-indigo-600' 
                                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              updateActiveConfig(c => ({
                                                ...c,
                                                planLekcjiCustomClasses: checked 
                                                  ? [...c.planLekcjiCustomClasses, cl.id]
                                                  : c.planLekcjiCustomClasses.filter(id => id !== cl.id)
                                              }));
                                            }}
                                          />
                                          {cl.name}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SECTION 3: Plan Sal (Etap 2 - Obłożenie Gabinetów / schedData) */}
                        <div className="border border-emerald-200 dark:border-emerald-900/60 rounded-xl overflow-hidden bg-emerald-50/20 dark:bg-emerald-950/10">
                          <div 
                            onClick={() => toggleSection('planSal')}
                            className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                              <Building2 size={15} className="text-emerald-600" />
                              <span>3. Plan Sal (Płachta Obłożenia Gabinetów - Etap 2)</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded">
                                {activeStats.schedRoomsTotal} przypisań w pliku
                              </span>
                            </div>
                            {expandedSections.planSal ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>

                          {expandedSections.planSal && (
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                    Zakres sal / klas do wczytania z tego pliku:
                                  </label>
                                  <div className="space-y-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planSalScope: 'all' }))}
                                      className={`w-full p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planSalScope === 'all'
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700'
                                      }`}
                                    >
                                      Wszystkie sale i klasy ({activeStats.schedRoomsTotal} przypisań)
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planSalScope: 'grades_1_3' }))}
                                      className={`w-full p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planSalScope === 'grades_1_3'
                                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                                      }`}
                                    >
                                      ⭐ Tylko przydziały sal dla klas 1-3 ({activeStats.sched1_3} przypisań)
                                      <span className="block text-[10px] font-normal opacity-90">
                                        Wczytuje ułożone sale dla edukacji wczesnoszkolnej i zachowuje sale klas 4-8
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updateActiveConfig(c => ({ ...c, planSalScope: 'grades_4_8' }))}
                                      className={`w-full p-2 rounded-lg text-xs font-bold border text-left transition ${
                                        activeConfig.planSalScope === 'grades_4_8'
                                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                          : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200'
                                      }`}
                                    >
                                      ⭐ Tylko przydziały sal dla klas 4-8 ({activeStats.sched4_8} przypisań)
                                      <span className="block text-[10px] font-normal opacity-90">
                                        Wczytuje ułożone sale dla klas starszych i zachowuje sale klas 1-3
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                    Tryb scalania rozkładu sal:
                                  </label>
                                  <div className="space-y-2">
                                    <label className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-bold">
                                      <input
                                        type="radio"
                                        name={`salStrategy_${activeFile.id}`}
                                        checked={activeConfig.planSalStrategy === 'merge'}
                                        onChange={() => updateActiveConfig(c => ({ ...c, planSalStrategy: 'merge' }))}
                                        className="text-emerald-600 mt-0.5"
                                      />
                                      <div>
                                        <span>Połącz z obecnym planem sal (Zalecane)</span>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          Zachowuje sale przypisane dla pozostałych klas/gabinetów, aktualizując tylko wybrany zakres.
                                        </p>
                                      </div>
                                    </label>

                                    <label className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-bold">
                                      <input
                                        type="radio"
                                        name={`salStrategy_${activeFile.id}`}
                                        checked={activeConfig.planSalStrategy === 'replace'}
                                        onChange={() => updateActiveConfig(c => ({ ...c, planSalStrategy: 'replace' }))}
                                        className="text-emerald-600 mt-0.5"
                                      />
                                      <div>
                                        <span>Zastąp cały rozkład sal</span>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          Czyści wszystkie dotychczasowe gabinety i wstawia stan z tego pliku.
                                        </p>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 4: Plan Dyżurów */}
                        <div className="border border-violet-200 dark:border-violet-900/60 rounded-xl overflow-hidden bg-violet-50/20 dark:bg-violet-950/10">
                          <div 
                            onClick={() => toggleSection('dyzury')}
                            className="p-3 bg-violet-50/80 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-900/40 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-black text-violet-900 dark:text-violet-200 uppercase tracking-wide">
                              <Shield size={15} className="text-violet-600" />
                              <span>4. Plan Dyżurów Nauczycielskich</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200 rounded">
                                {activeStats.dutyEntries} wpisów dyżurów w pliku
                              </span>
                            </div>
                            {expandedSections.dyzury ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>

                          {expandedSections.dyzury && (
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Zakres dyżurów:</label>
                                  <select
                                    value={activeConfig.dyzuryMode}
                                    onChange={(e) => updateActiveConfig(c => ({ ...c, dyzuryMode: e.target.value as any }))}
                                    className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                                  >
                                    <option value="none">Nie importuj dyżurów</option>
                                    <option value="harmonogram_only">Tylko harmonogram przerw</option>
                                    <option value="all">✓ Całość (Miejsca, Przerwy i Harmonogram)</option>
                                  </select>
                                </div>

                                {activeConfig.dyzuryMode !== 'none' && (
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Tryb łączenia dyżurów:</label>
                                    <select
                                      value={activeConfig.dyzuryStrategy}
                                      onChange={(e) => updateActiveConfig(c => ({ ...c, dyzuryStrategy: e.target.value as any }))}
                                      className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                                    >
                                      <option value="merge">✓ Dołącz / Scal z obecnymi dyżurami</option>
                                      <option value="replace">Zastąp cały harmonogram dyżurów</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 5: Archive & Snapshots */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                          <div 
                            onClick={() => toggleSection('extra')}
                            className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                              <Archive size={15} className="text-slate-500" />
                              <span>5. Archiwum, Punkty Przywracania i Dziennik Zdarzeń</span>
                            </div>
                            {expandedSections.extra ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>

                          {expandedSections.extra && (
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={activeConfig.importArchive}
                                  onChange={(e) => updateActiveConfig(c => ({ ...c, importArchive: e.target.checked }))}
                                  className="rounded text-indigo-600"
                                />
                                <span>Archiwum ({activeStats.archiveCount})</span>
                              </label>

                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={activeConfig.importSnapshots}
                                  onChange={(e) => updateActiveConfig(c => ({ ...c, importSnapshots: e.target.checked }))}
                                  className="rounded text-indigo-600"
                                />
                                <span>Snapshoty ({activeStats.snapshotsCount})</span>
                              </label>

                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={activeConfig.importHistoryLogs}
                                  onChange={(e) => updateActiveConfig(c => ({ ...c, importHistoryLogs: e.target.checked }))}
                                  className="rounded text-indigo-600"
                                />
                                <span>Logi audytu ({activeStats.historyLogsCount})</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Error or invalid file state */
                      <div className="flex flex-col items-center justify-center p-8 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center my-6">
                        <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                          <AlertTriangle size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Nie udało się odczytać struktury pliku
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
                          Plik <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">"{activeFile?.name}"</span> nie zawiera poprawnego formatu JSON planu lekcji lub jest uszkodzony.
                        </p>
                        <button
                          type="button"
                          onClick={() => activeFile && handleRemoveFile(activeFile.id)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Trash2 size={14} />
                          Usuń ten plik z kolejki
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs font-semibold">
                      Wybierz plik z listy po lewej, aby dostosować reguły scalania.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* PREVIEW TAB */
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      Podsumowanie Wynikowe Scalenia
                    </h3>
                    <p className="text-xs text-slate-500">
                      Oto stan, jaki powstanie po połączeniu wybranych modułów ze wszystkich {files.length} plików:
                    </p>
                  </div>
                </div>

                {files.some(f => f.isEncrypted) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Lock size={16} className="text-amber-600 shrink-0" />
                      <span>
                        <strong>Uwaga:</strong> Część plików oczekuje na podanie hasła i odszyfrowanie. Nie są one jeszcze uwzględnione w podglądzie scalenia.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const enc = files.find(f => f.isEncrypted);
                        if (enc) {
                          setActiveFileId(enc.id);
                          setActiveTab('files');
                        }
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      Odszyfruj teraz
                    </button>
                  </div>
                )}

                {previewSummary && (
                  <>
                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Oddziały i Nauczyciele</span>
                        <p className="text-lg font-black text-blue-950 dark:text-blue-100">
                          {previewSummary.classesCount} <span className="text-xs font-normal text-blue-600">klas</span> • {previewSummary.teachersCount} <span className="text-xs font-normal text-blue-600">nauczycieli</span>
                        </p>
                      </div>

                      <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Siatka Lekcji (Plan Klas)</span>
                        <p className="text-lg font-black text-indigo-950 dark:text-indigo-100">
                          {previewSummary.lessonsCount} <span className="text-xs font-normal text-indigo-600">lekcji łącznie</span>
                        </p>
                      </div>

                      <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Plan Sal (Płachta)</span>
                        <p className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                          {previewSummary.schedTotal} <span className="text-xs font-normal text-emerald-600">sal</span>
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          1-3: {previewSummary.schedPlacements1_3} • 4-8: {previewSummary.schedPlacements4_8}
                        </p>
                      </div>

                      <div className="p-3.5 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider block">Plan Dyżurów</span>
                        <p className="text-lg font-black text-violet-950 dark:text-violet-100">
                          {previewSummary.dutiesCount} <span className="text-xs font-normal text-violet-600">dyżurów</span>
                        </p>
                      </div>
                    </div>

                    {/* Step-by-step Execution Log */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/50 space-y-2.5">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={14} className="text-indigo-500" />
                        Kolejność nakładania danych z plików:
                      </h4>

                      <div className="space-y-2">
                        {previewSummary.stepReports.map((sr, i) => (
                          <div key={i} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start gap-2.5">
                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 text-[10px] font-extrabold rounded">
                              Krok {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{sr.fileName}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {sr.reports.length > 0 ? sr.reports.join(' • ') : 'Brak wybranych modułów z tego pliku'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield size={14} className="text-emerald-500 shrink-0" />
              <span>Przed scaleniem program automatycznie utworzy punkt przywracania (Undo).</span>
            </div>

            <div className="flex items-center gap-3">
              {files.some(f => f.isEncrypted) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <Lock size={13} className="text-amber-600 shrink-0" />
                  <span>Wykryto plik zaszyfrowany (wymaga hasła)</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={files.length === 0 || files.every(f => f.isEncrypted)}
                onClick={handleFinalSubmit}
                title={files.some(f => f.isEncrypted) ? "Pliki zaszyfrowane muszą zostać odszyfrowane przed scaleniem" : undefined}
                className={`py-2.5 px-6 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-sm ${
                  files.every(f => f.isEncrypted)
                    ? 'bg-amber-600 hover:bg-amber-700 text-white opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <GitMerge size={16} /> 
                {files.every(f => f.isEncrypted) ? 'Wymaga odszyfrowania' : 'Scal i Zastosuj w Programie'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
