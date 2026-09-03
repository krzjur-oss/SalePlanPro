import React, { useState } from 'react';
import { 
  Lock, Key, Download, X, Eye, EyeOff, CheckSquare, Square, 
  Calendar, Building2, Archive, Camera, History, Sparkles, AlertCircle, ShieldCheck,
  Shield, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, SchedData, ArchiveEntry, SnapshotEntry, AppEventLog } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  appState: AppState;
  schedData: SchedData;
  archive: ArchiveEntry[];
  snapshots: SnapshotEntry[];
  historyLogs: AppEventLog[];
}

export interface ExportOptions {
  includeSchedData: boolean;
  includeAppState: boolean;
  includeArchive: boolean;
  includeSnapshots: boolean;
  includeHistoryLogs: boolean;
  anonymizeData?: boolean;
  password?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  appState,
  schedData,
  archive,
  snapshots,
  historyLogs
}: ExportModalProps) {
  const [includeSchedData, setIncludeSchedData] = useState(true);
  const [includeAppState, setIncludeAppState] = useState(true);
  const [includeArchive, setIncludeArchive] = useState(archive.length > 0);
  const [includeSnapshots, setIncludeSnapshots] = useState(snapshots.length > 0);
  const [includeHistoryLogs, setIncludeHistoryLogs] = useState(false);
  const [anonymizeData, setAnonymizeData] = useState(false);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Calculate approximate stats
  const activeYearKey = appState.yearKey || 'default';
  const yearData = schedData[activeYearKey] || {};
  let totalAssignedLessons = 0;
  Object.values(yearData).forEach((day) => {
    Object.values(day || {}).forEach((hour) => {
      Object.values(hour || {}).forEach((cell) => {
        if (cell) {
          if (Array.isArray(cell)) totalAssignedLessons += cell.length;
          else totalAssignedLessons += 1;
        }
      });
    });
  });

  const totalClasses = appState.classes?.length || 0;
  const totalTeachers = appState.teachers?.length || 0;
  const totalRooms = appState.floors?.reduce((acc, f) => acc + (f.segments?.reduce((sAcc, s) => sAcc + (s.rooms?.length || 0), 0) || 0), 0) || 0;

  const isAnythingSelected = includeSchedData || includeAppState || includeArchive || includeSnapshots || includeHistoryLogs;

  const handleSelectAll = () => {
    setIncludeSchedData(true);
    setIncludeAppState(true);
    setIncludeArchive(true);
    setIncludeSnapshots(true);
    setIncludeHistoryLogs(true);
  };

  const handleSelectBasicOnly = () => {
    setIncludeSchedData(true);
    setIncludeAppState(true);
    setIncludeArchive(false);
    setIncludeSnapshots(false);
    setIncludeHistoryLogs(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnythingSelected) {
      setErrorMsg('Wybierz przynajmniej jeden element do wyeksportowania.');
      return;
    }
    setErrorMsg('');
    onExport({
      includeSchedData,
      includeAppState,
      includeArchive,
      includeSnapshots,
      includeHistoryLogs,
      anonymizeData,
      password: password.trim() ? password.trim() : undefined,
    });
  };

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
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Eksport i Kopia Zapasowa Danych
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Wybierz zakres danych oraz opcjonalne szyfrowanie hasłem
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

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {/* Quick selectors */}
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                1. Wybierz dane do eksportu:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Zaznacz wszystko
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleSelectBasicOnly}
                  className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Tylko bieżący plan
                </button>
              </div>
            </div>

            {/* Checklist options */}
            <div className="space-y-2">
              {/* Option 1: SchedData */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  includeSchedData 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                    : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={includeSchedData}
                    onChange={(e) => setIncludeSchedData(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-500" />
                      Aktualny Plan Lekcji (Siatka zajęć)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      {totalAssignedLessons} przydziałów
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Rozkład lekcji w siatce tygodniowej, godziny, przypisane gabinety i nauczyciele.
                  </p>
                </div>
              </label>

              {/* Option 2: AppState */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  includeAppState 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                    : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={includeAppState}
                    onChange={(e) => setIncludeAppState(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Building2 size={14} className="text-emerald-500" />
                      Konfiguracja Szkoły i Zasobów
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                      {totalClasses} klas • {totalTeachers} naucz. • {totalRooms} sal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Dane szkoły, struktura oddziałów, wykaz nauczycieli, gabinety przedmiotowe, dzwonki oraz harmonogram dyżurów.
                  </p>
                </div>
              </label>

              {/* Option 3: Archive */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  includeArchive 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                    : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={includeArchive}
                    onChange={(e) => setIncludeArchive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Archive size={14} className="text-amber-500" />
                      Archiwum Roczne i Poprzednie Wersje
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      {archive.length} roczników
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Zarchiwizowane konfiguracje i plany z ubiegłych lat lub wariantów roboczych.
                  </p>
                </div>
              </label>

              {/* Option 4: Snapshots */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  includeSnapshots 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                    : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={includeSnapshots}
                    onChange={(e) => setIncludeSnapshots(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Camera size={14} className="text-violet-500" />
                      Punkty Przywracania Planu (Snapshoty)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                      {snapshots.length} migawek
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Zapisane ręczne i automatyczne punkty przywracania stanu prac nad planem.
                  </p>
                </div>
              </label>

              {/* Option 5: History Logs */}
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  includeHistoryLogs 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100' 
                    : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={includeHistoryLogs}
                    onChange={(e) => setIncludeHistoryLogs(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <History size={14} className="text-sky-500" />
                      Dziennik Zdarzeń i Historia Operacji
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                      {historyLogs.length} wpisów
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Historia wykonanych operacji, importów, resetów i zmian w programie.
                  </p>
                </div>
              </label>
            </div>

            {/* RODO / Data Protection Anonymization Section */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserX size={13} className="text-violet-500" />
                  2. Anonimizacja danych RODO:
                </span>
                {anonymizeData && (
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                    <Shield size={12} /> Ochrona RODO aktywna
                  </span>
                )}
              </div>

              <label 
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  anonymizeData 
                    ? 'bg-violet-50/60 dark:bg-violet-950/20 border-violet-300 dark:border-violet-700/60' 
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="pt-0.5 text-violet-600 dark:text-violet-400 shrink-0">
                  {anonymizeData ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Wygeneruj zanonimizowaną kopię zapasową (SPE i nauczyciele)
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 uppercase">
                      RODO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Zastępuje nazwiska nauczycieli (np. Nauczyciel 1, N1) oraz maskuje dane uczniów SPE (imiona, orzeczenia, notatki wsparcia). Bezpieczna do celów audytu, wsparcia technicznego lub prezentacji.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={anonymizeData}
                  onChange={(e) => setAnonymizeData(e.target.checked)}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Password Security Section */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={13} className="text-indigo-500" />
                  3. Zabezpieczenie hasłem pliku kopii (opcjonalne):
                </span>
                {password.trim() ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={12} /> Szyfrowanie AES-256 GCM aktywne
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    Brak hasła = standardowy plik JSON
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    id="export-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Wpisz hasło, aby zaszyfrować plik kopii..."
                    autoComplete="new-password"
                    className="w-full text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 pr-11 focus:outline-hidden focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 transition shadow-xs"
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

                {/* Checkbox Pokaż hasło & Info */}
                <div className="flex items-center justify-between px-1">
                  <label htmlFor="export-show-password-cb" className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      id="export-show-password-cb"
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

                  {password.trim() && (
                    <span className="text-[10.5px] text-amber-600 dark:text-amber-400 font-bold">
                      ⚠️ Zapamiętaj lub zapisz to hasło!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 transition cursor-pointer text-center"
              >
                Anuluj
              </button>

              <button
                type="submit"
                disabled={!isAnythingSelected}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-sm text-white ${
                  !isAnythingSelected
                    ? 'opacity-40 pointer-events-none bg-slate-400'
                    : password.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700'
                }`}
              >
                {password.trim() ? (
                  <>
                    <Lock size={15} /> Zaszyfruj i Pobierz Kopię
                  </>
                ) : (
                  <>
                    <Download size={15} /> Pobierz Plik JSON (Bez hasła)
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
