import React from 'react';
import { 
  ArrowLeftRight, CheckCircle2, AlertTriangle, X, ShieldAlert, DoorClosed, 
  UserCheck, BookOpen, Clock, Calendar, Check, AlertCircle 
} from 'lucide-react';
import { Assignment, Class, ClassRoom, Lesson, Subject, Teacher } from '../types';

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export interface SwapSlotItem {
  key?: string;
  classId: string;
  day: number;
  hour: number;
  lesson?: Lesson;
  assignment?: Assignment;
  subject?: Subject;
  teacher?: Teacher;
  room?: ClassRoom;
  groupName?: string;
}

interface SwapAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: SwapSlotItem;
  target: SwapSlotItem;
  classesMap: Map<string, Class>;
  conflictsAtoB: string[];
  conflictsBtoA: string[];
  swapIncludeRooms: boolean;
  onToggleIncludeRooms: (val: boolean) => void;
  onConfirmSwap: () => void;
}

export default function SwapAssistantModal({
  isOpen,
  onClose,
  source,
  target,
  classesMap,
  conflictsAtoB,
  conflictsBtoA,
  swapIncludeRooms,
  onToggleIncludeRooms,
  onConfirmSwap
}: SwapAssistantModalProps) {
  if (!isOpen) return null;

  const totalConflicts = conflictsAtoB.length + conflictsBtoA.length;
  const isTargetEmpty = !target.lesson;

  const sourceClassName = classesMap.get(source.classId)?.name || source.classId;
  const targetClassName = classesMap.get(target.classId)?.name || target.classId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        id="swap-assistant-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Asystent Szybkiej Zamiany Lekcji
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Swap Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bezpieczna zamiana lub przeniesienie godzin z automatyczną kontrolą kolizji nauczycieli i sal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPARISON CARDS */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Source Card */}
            <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 relative">
              <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                Lekcja A (Źródłowa)
              </span>
              <div className="mt-1 space-y-2">
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{DAYS[source.day]}, lekcja {source.hour + 1}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-slate-700">kl. {sourceClassName}</span>
                </div>

                <div className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.subject?.color || '#3b82f6' }} />
                  <span>{source.subject?.name || 'Lekcja'}</span>
                  {source.groupName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 font-bold text-slate-700">
                      gr. {source.groupName}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={13} className="text-slate-400" />
                    <span>Nauczyciel: <strong>{source.teacher ? `${source.teacher.first} ${source.teacher.last} (${source.teacher.abbr})` : 'Brak'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DoorClosed size={13} className="text-slate-400" />
                    <span>Gabinet: <strong>{source.room ? `${source.room.name}` : 'Bez sali'}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Card */}
            <div className={`p-4 rounded-xl border-2 relative ${
              isTargetEmpty 
                ? 'border-dashed border-slate-300 bg-slate-50/60' 
                : 'border-emerald-200 bg-emerald-50/40'
            }`}>
              <span className={`absolute -top-2.5 left-4 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                isTargetEmpty ? 'bg-slate-500' : 'bg-emerald-600'
              }`}>
                {isTargetEmpty ? 'Slot B (Wolny termin)' : 'Lekcja B (Docelowa)'}
              </span>
              <div className="mt-1 space-y-2">
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{DAYS[target.day]}, lekcja {target.hour + 1}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-slate-700">kl. {targetClassName}</span>
                </div>

                {isTargetEmpty ? (
                  <div className="py-3 text-slate-400 font-bold text-sm flex items-center gap-2">
                    <Clock size={16} />
                    <span>Wolna godzina w planie lekcji</span>
                  </div>
                ) : (
                  <>
                    <div className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: target.subject?.color || '#10b981' }} />
                      <span>{target.subject?.name}</span>
                      {target.groupName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 font-bold text-slate-700">
                          gr. {target.groupName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-emerald-100">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-slate-400" />
                        <span>Nauczyciel: <strong>{target.teacher ? `${target.teacher.first} ${target.teacher.last} (${target.teacher.abbr})` : 'Brak'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DoorClosed size={13} className="text-slate-400" />
                        <span>Gabinet: <strong>{target.room ? `${target.room.name}` : 'Bez sali'}</strong></span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CONFLICT CHECK RESULTS */}
          <div className="rounded-xl border p-4 transition-all">
            {totalConflicts === 0 ? (
              <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                    Brak kolizji — bezpieczna zamiana!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Zarówno nauczyciele jak i przypisane sale są w pełni dyspozycyjni w nowych terminach.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                      Wykryto kolizje ({totalConflicts})
                    </h4>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Przeniesienie lekcji spowoduje nakładanie się planu poniższych osób lub sal:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                  {conflictsAtoB.map((c, i) => (
                    <div key={`a-${i}`} className="p-2.5 rounded-lg bg-slate-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                      <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Lekcja A w nowym slocie:</strong> {c}</span>
                    </div>
                  ))}
                  {conflictsBtoA.map((c, i) => (
                    <div key={`b-${i}`} className="p-2.5 rounded-lg bg-slate-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                      <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Lekcja B w nowym slocie:</strong> {c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ROOM OPTION */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={swapIncludeRooms}
                onChange={e => onToggleIncludeRooms(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Przenieś / zamień również gabinety lekcyjne
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Lekcje zachowają swoje sale w nowych godzinach (aktualizuje także Plan Sal)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirmSwap}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
              totalConflicts > 0
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>
              {totalConflicts > 0 ? 'Wymuś zamianę mimo kolizji' : 'Zastosuj zamianę miejscami'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
