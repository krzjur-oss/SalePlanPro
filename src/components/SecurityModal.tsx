import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Unlock, Key, CheckCircle2, AlertTriangle, X, ShieldAlert,
  Database, UserX, FileCheck, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isStorageEncryptedOnDisk, 
  isDatabaseEncryptionActive, 
  enableDatabaseEncryption, 
  disableDatabaseEncryption,
  verifyStoragePassword,
  setSessionStoragePassword
} from '../services/dbStorage';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshStorage?: () => void;
  onOpenExportAnonymized?: () => void;
}

export default function SecurityModal({
  isOpen,
  onClose,
  onRefreshStorage,
  onOpenExportAnonymized
}: SecurityModalProps) {
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // Form states
  const [mode, setMode] = useState<'view' | 'enable' | 'disable' | 'change'>('view');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsEncrypted(isStorageEncryptedOnDisk());
      setIsActive(isDatabaseEncryptionActive());
      setMode('view');
      setPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnableEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Wprowadź hasło zabezpieczające bazę danych.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Hasło powinno zawierać co najmniej 6 znaków.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Hasła nie są identyczne.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      await enableDatabaseEncryption(password.trim());
      setIsEncrypted(true);
      setIsActive(true);
      setSuccessMsg('Szyfrowanie bazy danych AES-256 GCM zostało pomyślnie aktywowane!');
      setMode('view');
      if (onRefreshStorage) onRefreshStorage();
    } catch (err: any) {
      setErrorMsg(err.message || 'Wystąpił błąd podczas szyfrowania bazy danych.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      setErrorMsg('Podaj aktualne hasło, aby wyłączyć szyfrowanie bazy.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const isValid = await verifyStoragePassword(currentPassword.trim());
      if (!isValid) {
        setErrorMsg('Podane hasło jest nieprawidłowe.');
        setIsProcessing(false);
        return;
      }

      await disableDatabaseEncryption(currentPassword.trim());
      setIsEncrypted(false);
      setIsActive(false);
      setSuccessMsg('Szyfrowanie bazy wyłączone. Dane zapisane w formacie jawnym.');
      setMode('view');
      if (onRefreshStorage) onRefreshStorage();
    } catch (err: any) {
      setErrorMsg(err.message || 'Błąd podczas odszyfrowywania bazy.');
    } finally {
      setIsProcessing(false);
    }
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
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Shield size={22} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Tarcza Bezpieczeństwa & RODO
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ochrona danych osobowych uczniów SPE i nauczycieli w SalePlan Pro
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Status alerts */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Database Encryption Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isEncrypted ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    {isEncrypted ? <Lock size={16} /> : <Unlock size={16} />}
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Szyfrowanie bazy w pamięci przeglądarki
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard AES-256 GCM (Web Cryptography API + PBKDF2 100 000 cykli)
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isEncrypted 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {isEncrypted ? 'Aktywne' : 'Wyłączone'}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Zgodnie z <strong>Art. 32 RODO</strong> (bezpieczeństwo przetwarzania), szyfrowanie zabezpiecza dane uczniów SPE, nauczycieli i przydziałów w magazynie przeglądarki (IndexedDB / localStorage) przed nieautoryzowanym dostępem osób trzecich w przypadku kradzieży sprzętu lub współdzielenia komputera szkolnego.
              </p>

              {/* Mode switch / buttons */}
              {mode === 'view' && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {!isEncrypted ? (
                    <button
                      type="button"
                      onClick={() => { setMode('enable'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Lock size={14} /> Włącz szyfrowanie bazy hasłem
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMode('disable'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="py-2 px-3.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock size={14} /> Wyłącz szyfrowanie bazy
                    </button>
                  )}
                </div>
              )}

              {/* Enable form */}
              {mode === 'enable' && (
                <form onSubmit={handleEnableEncryption} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ustaw hasło główne do szyfrowania bazy:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nowe hasło..."
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pr-8 font-mono"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Powtórz hasło..."
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                    >
                      {isProcessing ? 'Szyfrowanie...' : 'Zatwierdź i zaszyfruj bazę'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className="py-1.5 px-3 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Anuluj
                    </button>
                  </div>
                </form>
              )}

              {/* Disable form */}
              {mode === 'disable' && (
                <form onSubmit={handleDisableEncryption} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Podaj hasło główne, aby odszyfrować bazę do czystego tekstu:
                  </div>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Aktualne hasło..."
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                    >
                      {isProcessing ? 'Odszyfrowywanie...' : 'Wyłącz szyfrowanie bazy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className="py-1.5 px-3 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Anuluj
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 2. RODO Anonymized Backup Quick Action */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600">
                  <UserX size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Anonimizacja RODO dla kopii zapasowych
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Maskowanie danych nauczycieli i uczniów SPE do celów zewnętrznych
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Funkcja pozwala wygenerować kopię planu z zamienionymi nazwiskami kadry pedagogicznej na identyfikatory neutralne (np. Nauczyciel 1, N1) oraz zanonimizowanymi orzeczeniami i danymi uczniów SPE.
              </p>

              {onOpenExportAnonymized && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExportAnonymized();
                  }}
                  className="py-2 px-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserX size={14} /> Otwórz kreator eksportu kopii zanonimizowanej
                </button>
              )}
            </div>

            {/* 3. Input Sanitization & Prototype Pollution Shield Info */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <FileCheck size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Aktywna ochrona wejścia i szablonów wydruku
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Zod Schema Validation • Prototype Pollution Shield • Anti-XSS
                  </p>
                </div>
              </div>

              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Ścisła walidacja schematu importowanych plików JSON (Zod).</li>
                <li>Filtrowanie niebezpiecznych kluczy (<code className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">__proto__</code>, <code className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">constructor</code>) w silniku scalania.</li>
                <li>Sanityzacja notatek SPE i metryk wydruku przed renderowaniem.</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
