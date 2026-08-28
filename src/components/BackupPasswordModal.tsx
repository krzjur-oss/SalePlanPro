import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff, ShieldAlert, Key, Download, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BackupPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'export' | 'import';
  onSubmit: (password: string) => void;
  onSkip?: () => void; // only for export
  errorMsg?: string;   // to display custom errors from parent
}

export default function BackupPasswordModal({
  isOpen,
  onClose,
  mode,
  onSubmit,
  onSkip,
  errorMsg: externalErrorMsg,
}: BackupPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clear state on open
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setErrorMsg(externalErrorMsg || '');
    }
  }, [isOpen, externalErrorMsg]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'import' && !password.trim()) {
      setErrorMsg('Hasło jest wymagane do odszyfrowania pliku.');
      return;
    }
    if (mode === 'export' && !password.trim()) {
      // If submitted with empty password on export, treat as skip/unencrypted
      if (onSkip) onSkip();
      return;
    }
    onSubmit(password);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                {mode === 'export' ? <Lock size={18} /> : <Key size={18} />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  {mode === 'export' ? 'Zabezpiecz kopię zapasową' : 'Podaj hasło odszyfrowania'}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {mode === 'export' ? 'Bezpieczny Eksport JSON' : 'Import zaszyfrowanego pliku'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
            {mode === 'export' ? (
              <div className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed space-y-2">
                <p>
                  Możesz opcjonalnie zabezpieczyć swój plik kopii zapasowej hasłem przy użyciu silnego standardu{' '}
                  <strong className="text-slate-700 dark:text-slate-250 font-bold">AES-GCM (256-bit)</strong>.
                </p>
                <p className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-2.5 rounded-xl text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
                  ⚠️ <strong className="font-extrabold">Ważne:</strong> Zapisz lub zapamiętaj hasło! Bez niego odzyskanie danych z pobranego pliku będzie niemożliwe. Pozostaw pole puste, by pobrać nieszyfrowany plik.
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed">
                <p>
                  Wybrany plik kopii zapasowej jest zaszyfrowany i chroniony hasłem. Wprowadź je poniżej, aby odszyfrować i wczytać dane planu lekcji.
                </p>
              </div>
            )}

            {/* Password input */}
            <div className="space-y-1.5">
              <label htmlFor="backup-password-input" className="text-[10.5px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                Hasło kopii zapasowej:
              </label>
              <div className="relative">
                <input
                  id="backup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={mode === 'export' ? 'Wpisz hasło (opcjonalne)' : 'Podaj hasło do pliku'}
                  autoComplete={mode === 'export' ? 'new-password' : 'current-password'}
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
                <label htmlFor="backup-show-password-cb" className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    id="backup-show-password-cb"
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

            {/* Error Message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-800 dark:text-red-400 rounded-xl text-xs font-semibold"
              >
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 transition cursor-pointer text-center"
              >
                Anuluj
              </button>

              {mode === 'export' ? (
                <>
                  {!password.trim() ? (
                    <button
                      type="button"
                      onClick={onSkip}
                      className="flex-1 py-2 px-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-xl text-xs font-black text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Download size={14} /> Pomiń hasło
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Lock size={14} /> Zaszyfruj i pobierz
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="submit"
                  disabled={!password.trim()}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Unlock size={14} /> Odszyfruj i wczytaj
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
