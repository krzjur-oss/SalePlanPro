/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Ekran Odblokowania Zaszyfrowanej Bazy (UnlockScreen)
 * Opis: Monit o hasło główne przy zablokowanej sesji chroniący dane osobowe uczniów i nauczycieli przed niepowołanym dostępem.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Lock, Unlock, Key, Eye, EyeOff, AlertTriangle, 
  HelpCircle, X, FileUp, RefreshCw, Trash2, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  verifyStoragePassword, 
  setSessionStoragePassword,
  clearAllStorage,
  removeStorageEncryptionMeta,
  setStorageItem,
  STORAGE_KEYS
} from '../services/dbStorage';
import { persistAppStateAndSchedWithConflictCheck } from '../services/persistence';
import { decryptText, isEncryptedBackup } from '../lib/crypto';
import { sanitizeAppState } from '../utils/mergeEngine';

interface UnlockScreenProps {
  onUnlocked: () => void | Promise<void>;
  onResetDatabase?: () => void | Promise<void>;
}

export default function UnlockScreen({ onUnlocked, onResetDatabase }: UnlockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Rate limiting / exponential delay state (1s, 2s, 4s, 8s, 16s... do 30s)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // "Nie pamiętam hasła" modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeHelpTab, setActiveHelpTab] = useState<'info' | 'restore' | 'reset'>('info');

  // Emergency reset confirmation
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Backup restore in unlock screen
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreIsEncrypted, setRestoreIsEncrypted] = useState(false);
  const [restoreRawText, setRestoreRawText] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Automatyczne ustawienie fokusu na polu hasła
  useEffect(() => {
    if (lockoutSeconds === 0 && !showHelpModal) {
      inputRef.current?.focus();
    }
  }, [lockoutSeconds, showHelpModal]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const calculateDelay = (attempts: number): number => {
    // 1st failed attempt: 1s, 2nd: 2s, 3rd: 4s, 4th: 8s, 5th: 16s, 6th+: 30s
    return Math.min(30, Math.pow(2, Math.max(0, attempts - 1)));
  };

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutSeconds > 0 || isVerifying) return;

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage('Wprowadź hasło główne.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const isValid = await verifyStoragePassword(trimmed);
      if (isValid) {
        setSessionStoragePassword(trimmed);
        setErrorMessage('');
        setFailedAttempts(0);
        await onUnlocked();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        const delay = calculateDelay(nextAttempts);
        setLockoutSeconds(delay);
        setErrorMessage('Niepoprawne hasło');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Błąd podczas weryfikacji hasła:', err);
      setErrorMessage('Wystąpił błąd podczas sprawdzania hasła.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreRawText(content);
      const isEnc = isEncryptedBackup(content);
      setRestoreIsEncrypted(isEnc);
    };
    reader.readAsText(file);
  };

  const handleRestoreBackup = async () => {
    if (!restoreRawText) {
      setRestoreError('Wybierz plik kopii zapasowej.');
      return;
    }

    setIsRestoring(true);
    setRestoreError('');

    try {
      let jsonStr = restoreRawText;
      if (restoreIsEncrypted) {
        if (!restorePassword) {
          setRestoreError('Wprowadź hasło, którym zaszyfrowano ten plik kopii.');
          setIsRestoring(false);
          return;
        }
        jsonStr = await decryptText(restoreRawText, restorePassword);
      }

      const parsed = JSON.parse(jsonStr);
      if (!parsed || (!parsed.appState && !parsed.planLekcji && !parsed.classes)) {
        throw new Error('Wybrany plik nie zawiera prawidłowej struktury planu SalePlan Pro.');
      }

      // Reset old storage encryption meta & storage
      removeStorageEncryptionMeta();
      await clearAllStorage();

      const restoredState = sanitizeAppState(parsed.appState || parsed);
      const restoredSched = parsed.schedData || {};
      const restoredArchive = Array.isArray(parsed.archive) ? parsed.archive : [];
      const restoredSnapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];

      await persistAppStateAndSchedWithConflictCheck(restoredState, restoredSched, { forceOverwrite: true });
      await setStorageItem(STORAGE_KEYS.ARCHIVE, restoredArchive);
      await setStorageItem(STORAGE_KEYS.SNAPSHOTS, restoredSnapshots);

      // Successfully restored: reload page to start fresh with decrypted restored data
      window.location.reload();
    } catch (err: any) {
      setRestoreError(err.message || 'Nie udało się przywrócić danych z pliku kopii.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleQuickReset = async () => {
    if (window.confirm('Czy na pewno chcesz usunąć hasło blokady i otworzyć program z danymi demonstracyjnymi (demo)?')) {
      setIsResetting(true);
      try {
        removeStorageEncryptionMeta();
        await clearAllStorage();
        if (onResetDatabase) {
          await onResetDatabase();
        } else {
          window.location.reload();
        }
      } catch (e) {
        console.error('Błąd podczas resetowania:', e);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleEmergencyReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESETUJ') {
      return;
    }
    setIsResetting(true);
    try {
      removeStorageEncryptionMeta();
      await clearAllStorage();
      if (onResetDatabase) {
        await onResetDatabase();
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error('Błąd podczas resetowania bazy:', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 text-slate-100 p-4 select-none overflow-y-auto">
      {/* Subtle modern geometric background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Main card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 text-center z-10"
      >
        {/* Shield Icon Badge */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
          <Shield size={32} className="text-indigo-400" />
        </div>

        {/* Brand & Title */}
        <div className="inline-block px-3 py-1 mb-2 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-indigo-300">
          SalePlan Pro · Tarcza RODO
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          Baza danych jest zablokowana
        </h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Wprowadź hasło główne (AES-256 GCM), aby odszyfrować dane szkoły, planu lekcji i obsady sal.
        </p>

        {/* Error message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs font-bold text-rose-300 flex items-center justify-center gap-2 overflow-hidden"
            >
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lockout banner */}
        {lockoutSeconds > 0 && (
          <div className="p-3 mb-5 bg-amber-950/50 border border-amber-800/80 rounded-xl text-xs font-semibold text-amber-300 flex flex-col items-center gap-1">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" />
              Zbyt wiele nieudanych prób ({failedAttempts})
            </span>
            <span className="text-[11px] text-amber-400/90">
              Kolejna próba możliwa za <strong className="font-black text-white">{lockoutSeconds} s</strong>
            </span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative text-left">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
              Hasło główne
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={lockoutSeconds > 0 || isVerifying}
                placeholder="Wprowadź hasło do bazy..."
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 pr-11 font-mono transition disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="current-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={lockoutSeconds > 0 || isVerifying || !password.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Odszyfrowywanie bazy...</span>
              </>
            ) : lockoutSeconds > 0 ? (
              <span>Odczekaj {lockoutSeconds} s...</span>
            ) : (
              <>
                <Unlock size={16} />
                <span>Odblokuj aplikację</span>
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col items-center gap-2.5">
          <div className="flex items-center justify-center gap-3 text-xs font-semibold flex-wrap">
            <button
              type="button"
              onClick={() => {
                setShowHelpModal(true);
                setActiveHelpTab('info');
              }}
              className="text-indigo-400 hover:text-indigo-300 transition hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle size={13} />
              <span>Nie pamiętam hasła</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={handleQuickReset}
              disabled={isResetting}
              className="text-rose-400 hover:text-rose-300 transition hover:underline flex items-center gap-1 cursor-pointer font-bold"
              title="Usuwa hasło bazy i uruchamia program ze świeżymi danymi demonstracyjnymi"
            >
              <Trash2 size={13} />
              <span>{isResetting ? 'Resetowanie...' : 'Zresetuj blokadę i wejdź (Demo)'}</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            Dane zaszyfrowane lokalnie w pamięci przeglądarki kluczem AES-256 GCM.
          </span>
        </div>
      </motion.div>

      {/* "Nie pamiętam hasła" Help & Recovery Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 text-left text-slate-200"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800/50">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Odzyskiwanie dostępu do planu
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Zasady kryptograficzne i procedury przywracania danych
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs font-bold px-4">
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('info')}
                  className={`py-3 px-3 border-b-2 transition cursor-pointer ${
                    activeHelpTab === 'info'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dlaczego hasło jest wymagane?
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('restore')}
                  className={`py-3 px-3 border-b-2 transition cursor-pointer ${
                    activeHelpTab === 'restore'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Wczytaj z pliku kopii
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHelpTab('reset')}
                  className={`py-3 px-3 border-b-2 transition cursor-pointer ${
                    activeHelpTab === 'reset'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Awaryjny reset
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[65vh] overflow-y-auto space-y-4 text-xs">
                {activeHelpTab === 'info' && (
                  <div className="space-y-3 leading-relaxed text-slate-300">
                    <div className="p-3.5 bg-indigo-950/40 border border-indigo-900/50 rounded-2xl flex items-start gap-3">
                      <Shield className="shrink-0 text-indigo-400 mt-0.5" size={18} />
                      <div>
                        <strong className="text-white block mb-1">
                          Pełne szyfrowanie AES-256 GCM (Zero-Knowledge)
                        </strong>
                        <p className="text-[11px] text-slate-300">
                          SalePlan Pro działa w 100% lokalnie w Twojej przeglądarce i nie wysyła haseł na serwer. 
                          Klucz szyfrujący jest wyprowadzany bezpośrednio z Twojego hasła za pomocą 100 000 iteracji algorytmu PBKDF2.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p>
                        <strong>Co to oznacza?</strong> Bez podania właściwego hasła nikt nie jest w stanie odszyfrować zawartości bazy. Zabezpiecza to wrażliwe dane uczniów o specjalnych potrzebach edukacyjnych (SPE) i nauczycieli przed nieautoryzowanym odczytem w razie kradzieży sprzętu.
                      </p>
                      <p>
                        <strong>Jak możesz odzyskać plan?</strong>
                      </p>
                      <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                        <li>
                          Jeśli posiadasz wyeksportowaną wcześniej kopię zapasową (plik <code>.json</code> z menu <em>Kopia zapasowa</em>), możesz ją zaimportować w zakładce <strong>Wczytaj z pliku kopii</strong>.
                        </li>
                        <li>
                          Jeśli znasz inne hasło użyte przy tworzeniu tamtej kopii, odzyskasz cały plan bez utraty danych.
                        </li>
                        <li>
                          Jeżeli nie posiadasz kopii, możesz skorzystać z opcji <strong>Awaryjny reset</strong>, aby wyczyścić zablokowaną bazę i zacząć od nowa.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeHelpTab === 'restore' && (
                  <div className="space-y-3.5">
                    <p className="text-slate-300 leading-relaxed">
                      Wybierz wyeksportowany wcześniej plik kopii zapasowej (<code>.json</code>). Po poprawnym wczytaniu dotychczasowa zablokowana baza zostanie zastąpiona danymi z pliku.
                    </p>

                    <div className="p-4 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl bg-slate-950/40 text-center cursor-pointer transition"
                         onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                      <FileUp size={28} className="mx-auto text-indigo-400 mb-2" />
                      <div className="font-bold text-white mb-0.5">
                        {restoreFile ? restoreFile.name : 'Kliknij, aby wybrać plik kopii .json'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {restoreFile 
                          ? `${(restoreFile.size / 1024).toFixed(1)} KB ${restoreIsEncrypted ? '· [Plik zaszyfrowany]' : '· [Format jawny]'}` 
                          : 'Pliki JSON wyeksportowane z SalePlan Pro'}
                      </div>
                    </div>

                    {restoreIsEncrypted && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-300 uppercase">
                          Hasło do pliku kopii:
                        </label>
                        <input
                          type="password"
                          value={restorePassword}
                          onChange={(e) => setRestorePassword(e.target.value)}
                          placeholder="Wprowadź hasło kopii zapasowej..."
                          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    )}

                    {restoreError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs font-bold text-rose-300 flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                        <span>{restoreError}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!restoreFile || isRestoring}
                      onClick={handleRestoreBackup}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Przywracanie danych...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Zastąp bazę i przywróć z pliku</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeHelpTab === 'reset' && (
                  <div className="space-y-3.5">
                    <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex items-start gap-3">
                      <Trash2 className="shrink-0 text-rose-400 mt-0.5" size={18} />
                      <div>
                        <strong className="text-white block mb-1">
                          Bezpowrotne usunięcie lokalnej bazy
                        </strong>
                        <p className="text-[11px] text-rose-200/90 leading-relaxed">
                          Ta operacja wyczyści zaszyfrowany magazyn w przeglądarce i wyłączy blokadę hasłem. 
                          Wszystkie dotychczasowe niezapisane w zewnętrznych plikach dane zostaną trwale utracone.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Aby zapobiec przypadkowemu skasowaniu, wpisz słowo <span className="font-mono text-rose-400 font-black">RESETUJ</span> poniżej:
                      </label>
                      <input
                        type="text"
                        value={resetConfirmInput}
                        onChange={(e) => setResetConfirmInput(e.target.value)}
                        placeholder="Wpisz RESETUJ..."
                        className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono uppercase"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={resetConfirmInput.trim().toUpperCase() !== 'RESETUJ' || isResetting}
                      onClick={handleEmergencyReset}
                      className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isResetting ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Czyszczenie bazy...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={15} />
                          <span>Potwierdzam reset i wyczyszczenie bazy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-right">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Zamknij
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
