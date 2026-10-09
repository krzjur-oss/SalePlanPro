/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Baner Aktualizacji Aplikacji PWA (SWUpdateBanner)
 * Opis: Powiadomienie o dostępności nowej wersji kodu w Service Workerze z możliwością szybkiego przeładowania.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export const SWUpdateBanner: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleWaitingWorker = (worker: ServiceWorker) => {
      setWaitingWorker(worker);
      setShowBanner(true);
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        handleWaitingWorker(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleWaitingWorker(newWorker);
            }
          });
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      setIsUpdating(true);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!showBanner) return null;

  return (
    <div 
      role="alert"
      className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-2xl border-b border-blue-400/40 px-4 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="p-1 bg-white/20 rounded-md shrink-0">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        </span>
        <span className="font-bold truncate">
          Dostępna nowa wersja — odśwież
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-3 py-1 bg-white text-blue-900 font-extrabold text-xs rounded-lg hover:bg-blue-50 active:scale-95 shadow-md transition disabled:opacity-75 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Aktualizowanie...' : 'Odśwież'}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowBanner(false)}
          aria-label="Zamknij powiadomienie"
          className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
