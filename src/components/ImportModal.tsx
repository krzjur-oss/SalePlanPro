import React, { useState, useEffect } from 'react';
import { 
  Upload, Key, Lock, Unlock, Eye, EyeOff, CheckSquare, Square, 
  Calendar, Building2, Archive, Camera, History, AlertCircle, Check, 
  FileText, ShieldAlert, Sparkles, X, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, SchedData, ArchiveEntry, SnapshotEntry, AppEventLog } from '../types';
import { decryptText, isEncryptedBackup } from '../lib/crypto';

export interface ImportPayload {
  version?: string;
  timestamp?: string;
  appState?: AppState;
  schedData?: SchedData;
  archive?: ArchiveEntry[];
  snapshots?: SnapshotEntry[];
  historyLogs?: AppEventLog[];
  [key: string]: any;
}

export interface ImportSelectedOptions {
  importSchedData: boolean;
  importAppState: boolean;
  importArchive: boolean;
  archiveMode: 'merge' | 'replace';
  importSnapshots: boolean;
  snapshotsMode: 'merge' | 'replace';
  importHistoryLogs: boolean;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawFileContent: string | null;
  onExecuteImport: (payload: ImportPayload, options: ImportSelectedOptions) => void;
}

export default function ImportModal({
  isOpen,
  onClose,
  rawFileContent,
  onExecuteImport
}: ImportModalProps) {
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Parsed payload ready for selective import
  const [parsedData, setParsedData] = useState<ImportPayload | null>(null);

  // Checkboxes for selective import
  const [importSchedData, setImportSchedData] = useState(true);
  const [importAppState, setImportAppState] = useState(true);
  const [importArchive, setImportArchive] = useState(true);
  const [archiveMode, setArchiveMode] = useState<'merge' | 'replace'>('merge');
  const [importSnapshots, setImportSnapshots] = useState(true);
  const [snapshotsMode, setSnapshotsMode] = useState<'merge' | 'replace'>('merge');
  const [importHistoryLogs, setImportHistoryLogs] = useState(false);

  useEffect(() => {
    if (isOpen && rawFileContent) {
      setPassword('');
      setShowPassword(false);
      setDecryptError('');
      setIsDecrypting(false);

      if (isEncryptedBackup(rawFileContent)) {
        setIsEncrypted(true);
        setParsedData(null);
      } else {
        setIsEncrypted(false);
        try {
          const data = JSON.parse(rawFileContent);
          initParsedData(data);
        } catch (err) {
          setDecryptError('Plik nie jest poprawnym dokumentem JSON.');
          setParsedData(null);
        }
      }
    }
  }, [isOpen, rawFileContent]);

  const initParsedData = (data: ImportPayload) => {
    setParsedData(data);
    setImportSchedData(!!data.schedData);
    setImportAppState(!!data.appState);
    setImportArchive(Array.isArray(data.archive) && data.archive.length > 0);
    setImportSnapshots(Array.isArray(data.snapshots) && data.snapshots.length > 0);
    setImportHistoryLogs(false);
  };

  if (!isOpen) return null;

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawFileContent) return;
    if (!password.trim()) {
      setDecryptError('Wprowadź hasło, aby odszyfrować plik.');
      return;
    }

    setIsDecrypting(true);
    setDecryptError('');

    try {
      const decrypted = await decryptText(rawFileContent, password);
      const data = JSON.parse(decrypted);
      setIsEncrypted(false);
      initParsedData(data);
    } catch (err: any) {
      setDecryptError(err.message || 'Niepoprawne hasło lub błąd odszyfrowywania.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleConfirmImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData) return;

    const isSelected = 
      (importSchedData && !!parsedData.schedData) ||
      (importAppState && !!parsedData.appState) ||
      (importArchive && Array.isArray(parsedData.archive) && parsedData.archive.length > 0) ||
      (importSnapshots && Array.isArray(parsedData.snapshots) && parsedData.snapshots.length > 0) ||
      (importHistoryLogs && Array.isArray(parsedData.historyLogs) && parsedData.historyLogs.length > 0);

    if (!isSelected) {
      setDecryptError('Wybierz przynajmniej jeden element do zaimportowania.');
      return;
    }

    onExecuteImport(parsedData, {
      importSchedData: importSchedData && !!parsedData.schedData,
      importAppState: importAppState && !!parsedData.appState,
      importArchive: importArchive && Array.isArray(parsedData.archive) && parsedData.archive.length > 0,
      archiveMode,
      importSnapshots: importSnapshots && Array.isArray(parsedData.snapshots) && parsedData.snapshots.length > 0,
      snapshotsMode,
      importHistoryLogs: importHistoryLogs && Array.isArray(parsedData.historyLogs) && parsedData.historyLogs.length > 0,
    });
  };

  const selectAll = () => {
    if (!parsedData) return;
    setImportSchedData(!!parsedData.schedData);
    setImportAppState(!!parsedData.appState);
    setImportArchive(Array.isArray(parsedData.archive) && parsedData.archive.length > 0);
    setImportSnapshots(Array.isArray(parsedData.snapshots) && parsedData.snapshots.length > 0);
    setImportHistoryLogs(Array.isArray(parsedData.historyLogs) && parsedData.historyLogs.length > 0);
  };

  const selectPlanOnly = () => {
    if (!parsedData) return;
    setImportSchedData(!!parsedData.schedData);
    setImportAppState(false);
    setImportArchive(false);
    setImportSnapshots(false);
    setImportHistoryLogs(false);
  };

  const selectConfigOnly = () => {
    if (!parsedData) return;
    setImportSchedData(false);
    setImportAppState(!!parsedData.appState);
    setImportArchive(false);
    setImportSnapshots(false);
    setImportHistoryLogs(false);
  };

  // Inspect data
  const hasSched = !!parsedData?.schedData;
  const hasApp = !!parsedData?.appState;
  const hasArch = Array.isArray(parsedData?.archive) && parsedData.archive.length > 0;
  const hasSnaps = Array.isArray(parsedData?.snapshots) && parsedData.snapshots.length > 0;
  const hasLogs = Array.isArray(parsedData?.historyLogs) && parsedData.historyLogs.length > 0;

  // Count lessons in backup
  let lessonsInFile = 0;
  if (parsedData?.schedData) {
    Object.values(parsedData.schedData).forEach((year) => {
      Object.values(year || {}).forEach((day) => {
        Object.values(day || {}).forEach((hour) => {
          Object.values(hour || {}).forEach((cell) => {
            if (cell) {
              if (Array.isArray(cell)) lessonsInFile += cell.length;
              else lessonsInFile += 1;
            }
          });
        });
      });
    });
  }

  const schoolName = parsedData?.appState?.school?.name || 'Niezdefiniowana szkoła';
  const schoolShort = parsedData?.appState?.school?.short || '';
  const yearLabel = parsedData?.appState?.yearLabel || '';
  const classesCount = parsedData?.appState?.classes?.length || 0;
  const teachersCount = parsedData?.appState?.teachers?.length || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                {isEncrypted ? <Key size={20} /> : <Upload size={20} />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  {isEncrypted ? 'Odszyfrowanie Kopii Zapasowej' : 'Selektywny Import Danych'}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  {isEncrypted 
                    ? 'Wprowadź hasło, aby odblokować zawartość zaszyfrowanego pliku' 
                    : 'Wybierz, które moduły chcesz wczytać do programu'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* PHASE 1: Password decrypt form */}
          {isEncrypted ? (
            <form onSubmit={handleDecrypt} className="p-6 space-y-4 flex-1">
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <Lock size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Ten plik kopii jest zabezpieczony szyfrowaniem AES-256 GCM.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Podaj hasło zdefiniowane podczas eksportu, aby uzyskać dostęp do siatki zajęć i konfiguracji.
                  </p>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="import-password-input" className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Hasło do pliku:
                </label>
                <div className="relative">
                  <input
                    id="import-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (decryptError) setDecryptError('');
                    }}
                    placeholder="Wprowadź hasło odszyfrowania..."
                    autoComplete="current-password"
                    className="w-full text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 pr-11 focus:outline-hidden focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 transition shadow-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer z-10"
                    title={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Checkbox Pokaż hasło */}
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <label htmlFor="import-show-password-cb" className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      id="import-show-password-cb"
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold">Pokaż hasło</span>
                    {password && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono ml-1">
                        ({password.length} {password.length === 1 ? 'znak' : password.length < 5 ? 'znaki' : 'znaków'})
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Decrypt Error */}
              {decryptError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold"
                >
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{decryptError}</span>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={!password.trim() || isDecrypting}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Unlock size={15} />
                  {isDecrypting ? 'Odszyfrowywanie...' : 'Odszyfruj i Przejdź do Wyboru'}
                </button>
              </div>
            </form>
          ) : (
            /* PHASE 2: Selective Import checklist */
            <form onSubmit={handleConfirmImport} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* File Info summary card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-500" />
                    {schoolName} {schoolShort ? `(${schoolShort})` : ''}
                  </span>
                  {yearLabel && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md">
                      {yearLabel}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {classesCount > 0 && <span>Oddziały: <strong className="text-slate-700 dark:text-slate-300">{classesCount}</strong></span>}
                  {teachersCount > 0 && <span>Nauczyciele: <strong className="text-slate-700 dark:text-slate-300">{teachersCount}</strong></span>}
                  {lessonsInFile > 0 && <span>Lekcje w pliku: <strong className="text-slate-700 dark:text-slate-300">{lessonsInFile}</strong></span>}
                  {parsedData?.timestamp && (
                    <span>Utworzono: <strong className="text-slate-700 dark:text-slate-300">{new Date(parsedData.timestamp).toLocaleDateString()}</strong></span>
                  )}
                </div>
              </div>

              {/* Quick Selectors */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Wybierz elementy do wczytania:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Wszystko
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={selectPlanOnly}
                    className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Tylko plan
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={selectConfigOnly}
                    className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Tylko zasoby
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                {/* 1. SchedData */}
                <label 
                  className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                    !hasSched 
                      ? 'opacity-40 pointer-events-none bg-slate-100/50 border-dashed border-slate-200' 
                      : importSchedData 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 cursor-pointer text-slate-900 dark:text-slate-100' 
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 cursor-pointer text-slate-500'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      disabled={!hasSched}
                      checked={importSchedData && hasSched}
                      onChange={(e) => setImportSchedData(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <Calendar size={14} className="text-indigo-500" />
                        Plan Lekcji (Siatka zajęć)
                      </span>
                      {hasSched ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                          {lessonsInFile} lekcji
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Brak w pliku</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Zastąpi bieżący rozkład godzin i lekcji danymi z pliku kopii.
                    </p>
                  </div>
                </label>

                {/* 2. AppState */}
                <label 
                  className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                    !hasApp 
                      ? 'opacity-40 pointer-events-none bg-slate-100/50 border-dashed border-slate-200' 
                      : importAppState 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 cursor-pointer text-slate-900 dark:text-slate-100' 
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 cursor-pointer text-slate-500'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      disabled={!hasApp}
                      checked={importAppState && hasApp}
                      onChange={(e) => setImportAppState(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <Building2 size={14} className="text-emerald-500" />
                        Konfiguracja Szkoły i Zasobów
                      </span>
                      {hasApp ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          {classesCount} klas • {teachersCount} naucz.
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Brak w pliku</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Wykaz nauczycieli, gabinety, przedmioty, oddziały, dzwonki oraz dyżury.
                    </p>
                  </div>
                </label>

                {/* 3. Archive */}
                <div 
                  className={`p-3 rounded-xl border transition ${
                    !hasArch 
                      ? 'opacity-40 bg-slate-100/50 border-dashed border-slate-200' 
                      : importArchive 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        disabled={!hasArch}
                        checked={importArchive && hasArch}
                        onChange={(e) => setImportArchive(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Archive size={14} className="text-amber-500" />
                          Archiwum Roczne
                        </span>
                        {hasArch ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                            {parsedData.archive!.length} roczników
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Brak w pliku</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Archiwalne wersje planów z poprzednich lat.
                      </p>
                    </div>
                  </label>

                  {hasArch && importArchive && (
                    <div className="mt-2.5 ml-7 flex items-center gap-3 text-[11px] border-t border-slate-200/60 dark:border-slate-800 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="archiveMode"
                          value="merge"
                          checked={archiveMode === 'merge'}
                          onChange={() => setArchiveMode('merge')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Połącz z obecnymi</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="archiveMode"
                          value="replace"
                          checked={archiveMode === 'replace'}
                          onChange={() => setArchiveMode('replace')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Zastąp całe archiwum</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 4. Snapshots */}
                <div 
                  className={`p-3 rounded-xl border transition ${
                    !hasSnaps 
                      ? 'opacity-40 bg-slate-100/50 border-dashed border-slate-200' 
                      : importSnapshots 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        disabled={!hasSnaps}
                        checked={importSnapshots && hasSnaps}
                        onChange={(e) => setImportSnapshots(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Camera size={14} className="text-violet-500" />
                          Punkty Przywracania (Snapshoty)
                        </span>
                        {hasSnaps ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                            {parsedData.snapshots!.length} migawek
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Brak w pliku</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Zapisane punkty przywracania stanu prac nad planem.
                      </p>
                    </div>
                  </label>

                  {hasSnaps && importSnapshots && (
                    <div className="mt-2.5 ml-7 flex items-center gap-3 text-[11px] border-t border-slate-200/60 dark:border-slate-800 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="snapshotsMode"
                          value="merge"
                          checked={snapshotsMode === 'merge'}
                          onChange={() => setSnapshotsMode('merge')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Dołącz do obecnych</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="snapshotsMode"
                          value="replace"
                          checked={snapshotsMode === 'replace'}
                          onChange={() => setSnapshotsMode('replace')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Zastąp wszystkie</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 5. History logs */}
                {hasLogs && (
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                      importHistoryLogs 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={importHistoryLogs}
                        onChange={(e) => setImportHistoryLogs(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <History size={14} className="text-sky-500" />
                          Dziennik Zdarzeń (Logi audytu)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                          {parsedData.historyLogs!.length} wpisów
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Dołącz wpisy historii zdarzeń z importowanego pliku.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Error message */}
              {decryptError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{decryptError}</span>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Upload size={15} /> Wczytaj Wybrane Dane do Programu
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
