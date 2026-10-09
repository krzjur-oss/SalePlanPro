import React from 'react';
import { RefreshCw, X, Radio } from 'lucide-react';
import { Z_INDEX_CLASSES } from '../styles/zIndex';

interface MultiTabRefreshBannerProps {
  visible: boolean;
  remoteRevision: number;
  incomingTabName?: string;
  incomingSectionName?: string;
  onReload: () => void;
  onDismiss: () => void;
}

export function MultiTabRefreshBanner({
  visible,
  remoteRevision,
  incomingTabName,
  incomingSectionName,
  onReload,
  onDismiss
}: MultiTabRefreshBannerProps) {
  if (!visible) return null;

  const tabSource = incomingTabName || incomingSectionName || 'Inna karta';

  return (
    <div className={`relative ${Z_INDEX_CLASSES.STICKY} bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs select-none animate-fadeIn border-b border-indigo-500/50`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300"></span>
        </span>
        <div className="flex items-center gap-2 truncate">
          <span className="font-black text-white whitespace-nowrap">
            Aktualizacja z innej karty:
          </span>
          <span className="text-indigo-100 truncate">
            Zapisano nowszą wersję w: <strong className="text-white bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-400/40">{tabSource}</strong> (Rewizja #{remoteRevision}).
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onReload}
          className="px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-900 rounded-lg font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          title="Wczytaj najnowszą wersję planu zapisaną w innej karcie"
        >
          <RefreshCw size={12} className="text-indigo-600" />
          <span>Wczytaj zmiany</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-indigo-200 hover:text-white hover:bg-indigo-600/60 rounded-md transition cursor-pointer"
          title="Ukryj powiadomienie"
          aria-label="Ukryj powiadomienie"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
