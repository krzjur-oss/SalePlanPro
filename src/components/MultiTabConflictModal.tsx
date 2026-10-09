/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Okno Rozwiązywania Konfliktów Wielu Kart (MultiTabConflictModal)
 * Opis: Wskazanie karty dokonującej zapisu, porównanie rewizji oraz zaawansowany podgląd bilansu różnic (Conflict Diff).
 */

import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, Download, ShieldCheck, Clock, ArrowRight, Layers, 
  Calendar, Shield, Users, School, DoorOpen, CheckCircle2, ChevronRight, 
  Tag, Activity, Sparkles, Filter, Monitor
} from 'lucide-react';
import { Z_INDEX_CLASSES } from '../styles/zIndex';
import { AppState, SchedData } from '../types';
import { computeConflictDiff, DiffDetailItem } from '../utils/conflictDiff';

interface MultiTabConflictModalProps {
  isOpen: boolean;
  localRevision: number;
  incomingRevision: number;
  incomingTabId: string;
  incomingTabName?: string;
  incomingSectionName?: string;
  incomingUpdatedAt?: string;
  localAppState?: AppState;
  incomingAppState?: AppState;
  localSchedData?: SchedData;
  incomingSchedData?: SchedData;
  localTabName?: string;
  onLoadIncoming: () => void;
  onKeepLocal: () => void;
}

export default function MultiTabConflictModal({
  isOpen,
  localRevision,
  incomingRevision,
  incomingTabId,
  incomingTabName,
  incomingSectionName,
  incomingUpdatedAt,
  localAppState,
  incomingAppState,
  localSchedData,
  incomingSchedData,
  localTabName = 'Bieżący widok',
  onLoadIncoming,
  onKeepLocal
}: MultiTabConflictModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'lessons' | 'duties' | 'structure' | 'sched'>('all');

  // Compute precise diff between local and incoming states
  const diff = useMemo(() => {
    return computeConflictDiff(localAppState, incomingAppState, localSchedData, incomingSchedData);
  }, [localAppState, incomingAppState, localSchedData, incomingSchedData]);

  // Filter items
  const filteredItems: DiffDetailItem[] = useMemo(() => {
    if (selectedFilter === 'all') return diff.items;
    if (selectedFilter === 'lessons') return diff.categorized.lessons;
    if (selectedFilter === 'duties') return diff.categorized.duties;
    if (selectedFilter === 'structure') return diff.categorized.structure;
    if (selectedFilter === 'sched') return diff.categorized.sched;
    return diff.items;
  }, [diff, selectedFilter]);

  if (!isOpen) return null;

  // Format tab identification
  const resolvedIncomingTabName = incomingTabName || (incomingSectionName ? `Karta: ${incomingSectionName}` : 'Inna karta przeglądarki');
  const resolvedIncomingSection = incomingSectionName || 'Plan Lekcji / Dyżury';

  // Format timestamp
  const formatTimeInfo = (isoString?: string) => {
    if (!isoString) return 'przed chwilą';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'przed chwilą';
      const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
      let relStr = 'przed chwilą';
      if (diffSec >= 60) {
        const diffMin = Math.floor(diffSec / 60);
        relStr = `${diffMin} min temu`;
      } else if (diffSec > 0) {
        relStr = `${diffSec} s temu`;
      }
      return `${timeStr} (${relStr})`;
    } catch {
      return 'przed chwilą';
    }
  };

  const getSectionIcon = (sectionName?: string) => {
    const s = (sectionName || '').toLowerCase();
    if (s.includes('dyżur') || s.includes('dyzury')) return <Shield size={16} className="text-amber-600" />;
    if (s.includes('kreator')) return <School size={16} className="text-indigo-600" />;
    if (s.includes('sal')) return <DoorOpen size={16} className="text-emerald-600" />;
    if (s.includes('statystyk')) return <Activity size={16} className="text-purple-600" />;
    return <Calendar size={16} className="text-blue-600" />;
  };

  const activeMetrics = diff.metrics.filter(m => m.diff !== 0 || m.incomingCount > 0);

  return (
    <div className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL} bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn`}>
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full border border-amber-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-5 flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl border border-white/30 shadow-inner">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 bg-black/25 px-2.5 py-0.5 rounded-full inline-block">
                  Wykryto równoległą edycję
                </span>
                <span className="text-[10px] font-bold text-amber-200">
                  {formatTimeInfo(incomingUpdatedAt)}
                </span>
              </div>
              <h3 id="conflict-modal-title" className="text-lg font-black leading-tight text-white mt-0.5">
                Plan został zmieniony i zapisany w innej karcie
              </h3>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-slate-700 text-xs">
          
          {/* Box informacyjny: W jakiej karcie dokonano zmian */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50/40 to-slate-50 border-2 border-amber-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Monitor size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-700 tracking-wider block">
                    Karta, w której zapisano nowszą wersję:
                  </span>
                  <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                    {getSectionIcon(resolvedIncomingSection)}
                    <span>{resolvedIncomingTabName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg font-bold shadow-2xs flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-600" />
                  Zapisano: <strong>{formatTimeInfo(incomingUpdatedAt)}</strong>
                </span>
                <span className="px-2 py-1 bg-slate-200/70 text-slate-600 rounded-lg font-mono text-[10px]" title={incomingTabId}>
                  ID: #{incomingTabId ? incomingTabId.slice(-6) : 'karta'}
                </span>
              </div>
            </div>

            {/* Wizualne porównanie rewizji i kart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ta karta (Bieżąca):</span>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="font-black text-slate-800 text-sm font-mono">
                  Rewizja #{localRevision}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                  <span>Moduł:</span>
                  <strong className="text-slate-700">{localTabName}</strong>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border-2 border-amber-400 bg-amber-50/20 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Nowsza wersja w bazie:</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                </div>
                <div className="font-black text-amber-700 text-sm font-mono">
                  Rewizja #{incomingRevision}
                </div>
                <div className="text-[11px] text-amber-900 font-medium truncate flex items-center gap-1">
                  <span>Zapisano w:</span>
                  <strong className="text-amber-950">{resolvedIncomingSection}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Sekcja: Jakich zmian dokonano */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-600" />
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                  Jakich zmian dokonano w innej karcie:
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Łącznie wykrytych różnic: {diff.totalChangesCount}
              </span>
            </div>

            {/* Pigułki metryk (Bilans różnic) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {activeMetrics.map(metric => {
                const isDiff = metric.diff !== 0;
                return (
                  <div 
                    key={metric.key}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isDiff 
                        ? 'bg-amber-50/70 border-amber-300 shadow-2xs' 
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="text-base mb-0.5">{metric.icon}</div>
                    <div className="text-[10px] font-bold text-slate-500 truncate" title={metric.label}>
                      {metric.label}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="font-mono text-[11px] font-bold text-slate-600">
                        {metric.localCount}
                      </span>
                      <ArrowRight size={10} className="text-slate-400" />
                      <span className={`font-mono text-xs font-black ${isDiff ? 'text-amber-700' : 'text-slate-700'}`}>
                        {metric.incomingCount}
                      </span>
                    </div>
                    {isDiff && (
                      <span className={`inline-block mt-0.5 text-[9px] font-black px-1.5 rounded-sm ${metric.diff > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {metric.diff > 0 ? `+${metric.diff}` : metric.diff}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pasek zakładek / filtrów zmian */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  selectedFilter === 'all' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Wszystkie</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {diff.items.length}
                </span>
              </button>

              {diff.categorized.lessons.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('lessons')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    selectedFilter === 'lessons' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <span>📚 Lekcje</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'lessons' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'}`}>
                    {diff.categorized.lessons.length}
                  </span>
                </button>
              )}

              {diff.categorized.duties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('duties')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    selectedFilter === 'duties' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>🛡️ Dyżury</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'duties' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-800'}`}>
                    {diff.categorized.duties.length}
                  </span>
                </button>
              )}

              {diff.categorized.structure.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('structure')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    selectedFilter === 'structure' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <span>🏫 Struktura & Nauczyciele</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'structure' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-800'}`}>
                    {diff.categorized.structure.length}
                  </span>
                </button>
              )}

              {diff.categorized.sched.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('sched')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    selectedFilter === 'sched' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <span>🚪 Plan Sal</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedFilter === 'sched' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-800'}`}>
                    {diff.categorized.sched.length}
                  </span>
                </button>
              )}
            </div>

            {/* Lista szczegółowych różnic */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-56 sm:max-h-64 overflow-y-auto custom-scrollbar space-y-2">
              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-slate-300" />
                  <p className="font-bold text-xs text-slate-500">
                    Brak bezpośrednich różnic w wybranej kategorii.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Zmiany w bazie dotyczą rewizji metadanych lub innego modułu planu.
                  </p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const badgeClasses = 
                    item.badgeColor === 'emerald' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : item.badgeColor === 'amber'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : item.badgeColor === 'rose'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : item.badgeColor === 'indigo'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300';

                  return (
                    <div 
                      key={item.id}
                      className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-start justify-between gap-3 hover:border-slate-300 transition"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-xs">
                            {item.title}
                          </span>
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                            {item.badgeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.categoryLabel}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Opcje rozwiązania konfliktu */}
          <div className="space-y-3 pt-2">
            <p className="font-extrabold text-slate-900 text-xs">
              Wybierz, jak chcesz rozwiązać ten konflikt:
            </p>

            {/* Opcja 1: Wczytaj zmiany */}
            <button
              type="button"
              onClick={onLoadIncoming}
              className="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-200 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition cursor-pointer flex items-start gap-3.5 group shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-xs">
                <Download size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-indigo-950 text-sm">
                    Wczytaj zmiany z innej karty ({resolvedIncomingSection})
                  </span>
                  <ArrowRight size={15} className="text-indigo-600 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
                <p className="text-[11px] text-indigo-800/80 mt-1 leading-normal font-medium">
                  Zastępuje bieżący widok w tej karcie najnowszą wersją zapisaną w bazie (Rewizja #{incomingRevision} z {formatTimeInfo(incomingUpdatedAt)}).
                </p>
              </div>
            </button>

            {/* Opcja 2: Zachowaj moją wersję */}
            <button
              type="button"
              onClick={onKeepLocal}
              className="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 transition cursor-pointer flex items-start gap-3.5 group shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-slate-800 text-white shrink-0 mt-0.5 group-hover:bg-amber-600 transition-colors shadow-xs">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900 text-sm group-hover:text-amber-950">
                    Zachowaj moją wersję ({localTabName})
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Bezpieczna kopia do Snapshotów
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal font-medium">
                  Wersja z innej karty zostanie bezpiecznie zarchiwizowana w Punktach Przywracania (Snapshots), a Twoje bieżące zmiany zostaną zapisane jako kolejna rewizja.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2 shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock size={12} className="text-slate-400" />
            Ochrona integralności bazy SalePlan Pro • BroadcastChannel: <code className="font-mono text-slate-500">saleplan-state</code>
          </span>
          <span className="font-mono text-slate-500">
            Rewizja #{localRevision} ➔ #{incomingRevision}
          </span>
        </div>
      </div>
    </div>
  );
}
