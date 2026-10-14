/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Inteligentny Asystent Optymalnych Zamian i Wolnych Sal (SwapAdvisorModal)
 * Opis: Automatyczne sugerowanie bezkolizyjnych terminów, likwidacja okienek nauczycieli i klas,
 *       analizator obłożenia sal oraz natychmiastowe zatwierdzanie zamian jednym kliknięciem.
 */

import React, { useState, useMemo } from 'react';
import { 
  Sparkles, ArrowLeftRight, DoorClosed, Calendar, Clock, 
  UserCheck, AlertTriangle, CheckCircle2, ChevronRight, Check, 
  X, Filter, Search, ShieldCheck, Flame, Zap, ArrowRight, CornerDownRight, RotateCcw
} from 'lucide-react';
import { 
  PlanLekcjiState, 
  Class, 
  Teacher, 
  Subject, 
  ClassRoom, 
  Assignment 
} from '../types';
import { SwapSlotItem } from './SwapAssistantModal';
import { 
  getFreeRoomsForSlot, 
  findSwapAndMoveSuggestions, 
  executeSwapOrMove, 
  SwapSuggestion, 
  RoomAvailabilityInfo,
  DAYS_NAMES 
} from '../services/swapAdvisorService';

interface SwapAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: SwapSlotItem;
  target?: SwapSlotItem | null;
  pl: PlanLekcjiState;
  onApplyPlanChange: (newPlan: PlanLekcjiState, logMessage: string) => void;
  onSelectManualTargetMode?: () => void;
}

export default function SwapAdvisorModal({
  isOpen,
  onClose,
  source,
  target,
  pl,
  onApplyPlanChange,
  onSelectManualTargetMode
}: SwapAdvisorModalProps) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'rooms' | 'manual'>('suggestions');
  const [roomFilter, setRoomFilter] = useState<'all' | 'free' | 'specialized'>('all');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const classesMap = useMemo(() => new Map<string, Class>(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const roomsMap = useMemo(() => new Map<string, ClassRoom>(pl.rooms.map(r => [r.id, r])), [pl.rooms]);

  const sourceClassName = classesMap.get(source.classId)?.name || source.classId;

  // 1. Obliczanie sugestii zamian i przeniesień
  const suggestions = useMemo(() => {
    if (!isOpen || !source.classId || source.day === undefined || source.hour === undefined) return [];
    return findSwapAndMoveSuggestions({ pl, source, maxSuggestions: 15 });
  }, [isOpen, pl, source]);

  // 2. Obliczanie dostępności sal w bieżącym slocie źródłowym
  const roomsAvailability = useMemo(() => {
    if (!isOpen || source.day === undefined || source.hour === undefined) return [];
    return getFreeRoomsForSlot(pl, source.day, source.hour, {
      subjectId: source.subject?.id,
      classId: source.classId,
      excludeKey: source.key
    });
  }, [isOpen, pl, source]);

  // Filtrowanie sal
  const filteredRooms = useMemo(() => {
    return roomsAvailability.filter(r => {
      if (roomFilter === 'free' && !r.isFree) return false;
      if (roomFilter === 'specialized' && !r.isSpecializedMatch) return false;
      if (roomSearch.trim()) {
        const query = roomSearch.toLowerCase().trim();
        const matchesName = r.room.name.toLowerCase().includes(query);
        const matchesDesc = (r.room.desc || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [roomsAvailability, roomFilter, roomSearch]);

  if (!isOpen) return null;

  // Obsługa zatwierdzenia wybranej sugestii
  const handleApplySuggestion = (sugg: SwapSuggestion) => {
    const { newPlan, logMessage } = executeSwapOrMove(pl, source, sugg);
    onApplyPlanChange(newPlan, logMessage);
    onClose();
  };

  // Obsługa przypisania sali do bieżącej lekcji
  const handleAssignRoom = (room: ClassRoom) => {
    if (!source.assignment) return;
    const updatedAssignments = pl.assignments.map(a => 
      a.id === source.assignment?.id ? { ...a, roomId: room.id } : a
    );
    const newPlan: PlanLekcjiState = {
      ...pl,
      assignments: updatedAssignments
    };
    onApplyPlanChange(
      newPlan, 
      `Przypisano salę ${room.name} do lekcji ${source.subject?.name || 'Przedmiot'} (${sourceClassName})`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        id="swap-advisor-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[92vh]"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-indigo-50/70 via-white to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Asystent Sugerowania Optymalnych Zamian i Wolnych Sal
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                  <Zap size={10} className="fill-indigo-600 text-indigo-600" /> Smart Advisor
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automatyczna analiza bezkolizyjnych slotów, eliminacja okienek i weryfikacja obłożenia sal
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

        {/* CURRENT LESSON CARD INFO BANNER */}
        <div className="px-6 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Wybrana lekcja:</span>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.subject?.color || '#3b82f6' }} />
              <strong className="text-slate-900">{source.subject?.name || 'Lekcja'}</strong>
              <span className="text-slate-300">•</span>
              <span className="text-indigo-700 font-bold">klasa {sourceClassName}</span>
              {source.groupName && (
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                  gr. {source.groupName}
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" /> {DAYS_NAMES[source.day]}, lekcja {source.hour + 1}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 flex items-center gap-1">
                <UserCheck size={12} className="text-slate-400" /> {source.teacher ? `${source.teacher.first[0]}. ${source.teacher.last} (${source.teacher.abbr})` : 'Brak nauczyciela'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 flex items-center gap-1">
                <DoorClosed size={12} className="text-slate-400" /> {source.room ? source.room.name : 'Bez sali'}
              </span>
            </div>
          </div>

          {onSelectManualTargetMode && (
            <button
              onClick={() => {
                onClose();
                onSelectManualTargetMode();
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-md transition border border-indigo-200/60 inline-flex items-center gap-1"
            >
              <ArrowLeftRight size={12} />
              Wskaż slot docelowy na siatce ręcznie
            </button>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-4 text-xs font-bold shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'suggestions'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'suggestions' ? 'text-indigo-600' : 'text-slate-400'} />
            Sugerowane zamiany i wolne sloty
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 ml-1">
              {suggestions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'rooms'
                ? 'border-indigo-600 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DoorClosed size={14} className={activeTab === 'rooms' ? 'text-indigo-600' : 'text-slate-400'} />
            Wolne sale w tym terminie ({DAYS_NAMES[source.day]}, g. {source.hour + 1})
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 ml-1">
              {roomsAvailability.filter(r => r.isFree).length} wolnych
            </span>
          </button>
        </div>

        {/* CONTENT PANELS */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <p>
                  Algorytm przeanalizował <strong>{pl.hours.length * 5} slotów</strong> tygodniowych pod kątem dostępności nauczyciela, obłożenia sal oraz ciągłości lekcji (redukcji okienek).
                </p>
                <span className="text-[11px] text-indigo-600 font-bold flex items-center gap-1">
                  <ShieldCheck size={13} />
                  Top optymalne warianty
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Brak bezkolizyjnych alternatywnych terminów</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Nauczyciel lub oddział mają zapełniony grafik w pozostałych terminach. Możesz spróbować ręcznej zamiany na siatce planu.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {suggestions.map((sugg) => {
                    const isPerfect = sugg.recommendationLevel === 'perfect';
                    const isGreat = sugg.recommendationLevel === 'great';
                    const isConflict = sugg.hasConflicts;

                    return (
                      <div
                        key={sugg.id}
                        className={`p-4 rounded-xl border transition-all text-left bg-white shadow-2xs hover:shadow-md flex flex-col justify-between ${
                          isConflict 
                            ? 'border-rose-200 bg-rose-50/20' 
                            : isPerfect 
                              ? 'border-indigo-300 ring-2 ring-indigo-100 bg-linear-to-b from-indigo-50/40 to-white' 
                              : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div>
                          {/* TOP BADGES */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isPerfect
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : isGreat
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : isConflict
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700'
                            }`}>
                              {isPerfect && <Flame size={11} className="fill-amber-300 text-amber-300" />}
                              {sugg.recommendationLabel}
                            </span>

                            <div className="flex items-center gap-1 text-[11px] font-black font-mono">
                              <span className="text-slate-400">Score:</span>
                              <span className={`${sugg.score >= 80 ? 'text-indigo-600' : sugg.score >= 60 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                {sugg.score}/100
                              </span>
                            </div>
                          </div>

                          {/* TARGET TIME INFO */}
                          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm mb-1.5">
                            <Calendar size={14} className="text-indigo-600" />
                            <span>{sugg.targetDayName}, lekcja {sugg.targetHour + 1}</span>
                            <span className="text-xs font-mono font-medium text-slate-400">({sugg.targetHourTime})</span>
                          </div>

                          {/* ACTION TYPE EXPLANATION */}
                          <div className="text-xs text-slate-600 mb-2">
                            {sugg.type === 'move_to_empty' ? (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                <Check size={12} className="stroke-[3]" />
                                <span>Przeniesienie do wolnego slotu (klasa ma wolną godzinę)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                <ArrowLeftRight size={12} />
                                <span>
                                  Zamiana z lekcją: <strong>{sugg.targetLesson?.subjectName}</strong> ({sugg.targetLesson?.teacherName})
                                </span>
                              </div>
                            )}
                          </div>

                          {/* REASONS / IMPACT LIST */}
                          <div className="space-y-1 mb-3 text-[11px]">
                            {sugg.reasons.map((r, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-600">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{r}</span>
                              </div>
                            ))}
                            {sugg.suggestedRoom && (
                              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                <DoorClosed size={12} className="text-slate-400" />
                                <span>Gabinet: <strong>{sugg.suggestedRoom.name}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* CONFLICT WARNING IF ANY */}
                          {sugg.hasConflicts && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1 mb-3">
                              {sugg.conflictDetails.map((c, idx) => (
                                <div key={idx} className="flex items-start gap-1">
                                  <AlertTriangle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* APPLY BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleApplySuggestion(sugg)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                            isPerfect
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                              : isConflict
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-slate-900 hover:bg-indigo-600 text-white'
                          }`}
                        >
                          <span>Zastosuj tę zamianę</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FREE ROOMS FOR THIS SLOT */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Pokaż sale:</span>
                  <button
                    onClick={() => setRoomFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      roomFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Wszystkie ({roomsAvailability.length})
                  </button>
                  <button
                    onClick={() => setRoomFilter('free')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      roomFilter === 'free'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tylko wolne ({roomsAvailability.filter(r => r.isFree).length})
                  </button>
                  <button
                    onClick={() => setRoomFilter('specialized')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      roomFilter === 'specialized'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Dedykowane pracownie ({roomsAvailability.filter(r => r.isSpecializedMatch).length})
                  </button>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Szukaj sali / numeru..."
                    value={roomSearch}
                    onChange={e => setRoomSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredRooms.map((rInfo) => {
                  const isCurrentAssigned = source.room?.id === rInfo.room.id;

                  return (
                    <div
                      key={rInfo.room.id}
                      className={`p-3.5 rounded-xl border bg-white shadow-2xs flex flex-col justify-between transition ${
                        isCurrentAssigned
                          ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/20'
                          : rInfo.isFree
                            ? 'border-slate-200 hover:border-emerald-300'
                            : 'border-slate-200 opacity-65 bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 font-mono">
                              🚪 {rInfo.room.name}
                            </div>
                            <div>
                              <div className="font-extrabold text-xs text-slate-900 leading-tight">
                                Sala {rInfo.room.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {rInfo.room.desc || 'Sala lekcyjna ogólna'}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                            rInfo.badge === 'ideal'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : rInfo.badge === 'free'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                          }`}>
                            {rInfo.badgeLabel}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-1 mb-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span>Pojemność:</span>
                            <strong className="text-slate-700">{rInfo.room.capacity || 30} miejsc</strong>
                          </div>
                          {rInfo.isFree ? (
                            <div className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>W 100% dostępna w tym slocie</span>
                            </div>
                          ) : (
                            <div className="text-rose-700 font-medium">
                              Zajęta przez: <strong>{rInfo.occupyingLesson?.className}</strong> ({rInfo.occupyingLesson?.subjectName})
                            </div>
                          )}
                        </div>
                      </div>

                      {isCurrentAssigned ? (
                        <div className="w-full py-1.5 px-3 rounded-lg text-center text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                          ✓ Aktualnie przypisana sala
                        </div>
                      ) : rInfo.isFree ? (
                        <button
                          type="button"
                          onClick={() => handleAssignRoom(rInfo.room)}
                          className="w-full py-1.5 px-3 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Check size={12} className="stroke-[3]" />
                          <span>Przypisz tę salę do lekcji</span>
                        </button>
                      ) : (
                        <div className="w-full py-1.5 px-3 rounded-lg text-center text-[10px] font-medium text-slate-400 bg-slate-100">
                          Niedostępna w tym slocie
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Optymalizator dynamiczny: automatycznie weryfikuje kolizje w czasie rzeczywistym</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Zamknij asystenta
          </button>
        </div>
      </div>
    </div>
  );
}
