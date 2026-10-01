import React from 'react';
import { AlertTriangle, Download, ShieldCheck, Layers, Clock, ArrowRight } from 'lucide-react';
import { Z_INDEX_CLASSES } from '../styles/zIndex';

interface MultiTabConflictModalProps {
  isOpen: boolean;
  localRevision: number;
  incomingRevision: number;
  incomingTabId: string;
  onLoadIncoming: () => void;
  onKeepLocal: () => void;
}

export default function MultiTabConflictModal({
  isOpen,
  localRevision,
  incomingRevision,
  incomingTabId,
  onLoadIncoming,
  onKeepLocal
}: MultiTabConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL} bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn`}>
      <div 
        className="bg-white rounded-3xl max-w-xl w-full border border-amber-300 shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        {/* Header */}
        <div className="bg-amber-500 text-white p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/60 rounded-2xl border border-amber-400">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 bg-amber-600/70 px-2 py-0.5 rounded-full inline-block mb-1">
                Wykryto równoległą edycję
              </span>
              <h3 id="conflict-modal-title" className="text-lg font-black leading-tight text-white">
                Plan został zmieniony w innej karcie
              </h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-slate-700 text-xs">
          <p className="leading-relaxed text-slate-650 font-medium">
            Inna otwarta karta lub okno przeglądarki zapisało nowszą wersję planu lekcji w bazie danych. 
            Twoje zmiany w tej karcie bazują na starszej rewizji. Aby zapobiec bezpowrotnej utracie danych, 
            zapis został bezpiecznie wstrzymany.
          </p>

          {/* Porównanie rewizji */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Wersja w tej karcie:</span>
              <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm font-mono">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Rewizja #{localRevision}
              </div>
              <span className="text-[10px] text-slate-400">Bieżący stan edycji w oknie</span>
            </div>

            <div className="space-y-1 border-l border-slate-200 pl-3">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Nowsza wersja w bazie:</span>
              <div className="flex items-center gap-1.5 font-black text-amber-700 text-sm font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Rewizja #{incomingRevision}
              </div>
              <span className="text-[10px] text-slate-400 truncate block" title={incomingTabId}>
                Zapisana przez: {incomingTabId ? incomingTabId.substring(0, 16) + '...' : 'Inna karta'}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="font-extrabold text-slate-900 text-xs">
              Wybierz, jak chcesz rozwiązać ten konflikt:
            </p>

            {/* Opcja 1: Wczytaj zmiany */}
            <button
              type="button"
              onClick={onLoadIncoming}
              className="w-full text-left p-4 rounded-2xl border-2 border-indigo-200 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition cursor-pointer flex items-start gap-3.5 group shadow-xs"
            >
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Download size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-indigo-950 text-sm">
                    Wczytaj zmiany z innej karty
                  </span>
                  <ArrowRight size={15} className="text-indigo-600 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
                <p className="text-[11px] text-indigo-800/80 mt-1 leading-normal font-medium">
                  Zastępuje bieżący widok w tej karcie najnowszą wersją zapisaną w bazie (Rewizja #{incomingRevision}).
                </p>
              </div>
            </button>

            {/* Opcja 2: Zachowaj moją wersję */}
            <button
              type="button"
              onClick={onKeepLocal}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 transition cursor-pointer flex items-start gap-3.5 group shadow-xs"
            >
              <div className="p-2 rounded-xl bg-slate-800 text-white shrink-0 mt-0.5 group-hover:bg-amber-600 transition-colors">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900 text-sm group-hover:text-amber-950">
                    Zachowaj moją wersję
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Zapisze kopię do Snapshotów
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal font-medium">
                  Wersja z bazy zostanie bezpiecznie skopiowana do Punktów Przywracania (Snapshots), po czym Twoje zmiany zostaną zapisane jako kolejna rewizja.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock size={12} /> Ochrona integralności bazy SalePlan Pro
          </span>
          <span>BroadcastChannel: saleplan-state</span>
        </div>
      </div>
    </div>
  );
}
