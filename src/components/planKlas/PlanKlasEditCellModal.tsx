import React from 'react';
import { AppState, PlanLekcjiState, SchoolGroup } from '../../types';
import { AssignRoomDropdown } from '../AssignRoomDropdown';
import { X, Trash2 } from 'lucide-react';

export interface PlanKlasEditCellModalProps {
  cellPickerTarget: {
    classId: string;
    dayIndex: number;
    hourIndex: number;
  } | null;
  setCellPickerTarget: React.Dispatch<React.SetStateAction<{
    classId: string;
    dayIndex: number;
    hourIndex: number;
  } | null>>;
  pl: PlanLekcjiState;
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  notify: (msg: string) => void;
  DAYS: string[];
  getSlotLessons: (classId: string, dayIndex: number, hourIndex: number) => any[];
  handleRemoveLesson: (key: string) => void;
  placeAssignmentOnCell: (assignmentId: string, dayIdx: number, hourIdx: number, classId: string) => void;
  groupsMap: Map<string, SchoolGroup>;
  placedHours: Record<string, number>;
}

export const PlanKlasEditCellModal: React.FC<PlanKlasEditCellModalProps> = ({
  cellPickerTarget,
  setCellPickerTarget,
  pl,
  appState,
  onChangeAppState,
  notify,
  DAYS,
  getSlotLessons,
  handleRemoveLesson,
  placeAssignmentOnCell,
  groupsMap,
  placedHours,
}) => {
  if (!cellPickerTarget) return null;

  const targetClass = pl.classes.find(c => c.id === cellPickerTarget.classId);
  const targetHour = pl.hours[cellPickerTarget.hourIndex];
  const dayName = DAYS[cellPickerTarget.dayIndex];
  const slotLessons = getSlotLessons(cellPickerTarget.classId, cellPickerTarget.dayIndex, cellPickerTarget.hourIndex);
  const classAssignments = pl.assignments.filter(a =>
    a.classId === cellPickerTarget.classId || (a.linkedClassIds || []).includes(cellPickerTarget.classId)
  );

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-200"
      onClick={() => setCellPickerTarget(null)}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek Modalu */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-base">
              📅
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Edycja komórki w planie lekcji
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  {targetClass?.name || 'Klasa'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                {dayName}, Lekcja {targetHour?.num || (cellPickerTarget.hourIndex + 1)} ({targetHour?.start} – {targetHour?.end})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCellPickerTarget(null)}
            className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Obecny stan komórki */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <span>📌</span> Aktualna lekcja w tej komórce
            </h4>
            {slotLessons.length > 0 ? (
              <div className="space-y-2">
                {slotLessons.map(({ key, lesson, asg, subj, teacher, room, group, confReasons, isConf }) => (
                  <div 
                    key={key} 
                    className={`p-3 rounded-xl border flex flex-col gap-2 ${
                      isConf ? 'border-red-300 bg-red-50/60' : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: subj?.color || '#cbd5e1' }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-slate-800">{subj?.name}</span>
                            {group && (
                              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                                👥 {group.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                            <span>👤 {teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Brak nauczyciela'}</span>
                            <span>•</span>
                            <span>🚪 {room ? `${room.name}` : 'Bez sali'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLesson(key)}
                        className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100/70 rounded-lg transition border border-rose-200 cursor-pointer flex items-center gap-1"
                        title="Usuń tę lekcję z wybranej komórki"
                      >
                        <Trash2 size={12} />
                        <span>Usuń</span>
                      </button>
                    </div>

                    {/* Nauczyciel wspomagający dla tej lekcji */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-bold text-slate-600 flex items-center gap-1">
                        <span>👥</span> Nauczyciel wspomagający:
                      </span>
                      <select
                        className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={lesson.supportTeacherId || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          const updatedLessons = { ...pl.lessons };
                          updatedLessons[key] = {
                            ...updatedLessons[key],
                            supportTeacherId: val
                          };
                          onChangeAppState({
                            ...appState,
                            planLekcji: {
                              ...pl,
                              lessons: updatedLessons
                            }
                          });
                          notify(val ? `Przypisano nauczyciela wspomagającego` : 'Usunięto nauczyciela wspomagającego');
                        }}
                      >
                        <option value="">-- Brak wspomagającego --</option>
                        {pl.teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.first} {t.last} ({t.abbr})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ręczna alokacja sali z sortowaniem po wolnych slotach w tej godzinie */}
                    <div className="pt-2 border-t border-slate-200/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                          <span>🚪</span> Przypisana sala (alokacja w tej godzinie):
                        </span>
                        {asg?.roomId && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedAssignments = pl.assignments.map(a =>
                                a.id === asg.id ? { ...a, roomId: null } : a
                              );
                              onChangeAppState({
                                ...appState,
                                planLekcji: {
                                  ...pl,
                                  assignments: updatedAssignments
                                }
                              });
                              notify('Odłączono salę od lekcji');
                            }}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                          >
                            Odłącz salę
                          </button>
                        )}
                      </div>
                      <AssignRoomDropdown
                        planLekcji={pl}
                        dayIdx={cellPickerTarget.dayIndex}
                        hourIdx={cellPickerTarget.hourIndex}
                        currentAssignmentId={asg?.id}
                        value={asg?.roomId}
                        onChange={(roomId) => {
                          if (!asg) return;
                          const targetRoom = pl.rooms.find(r => r.id === roomId);
                          const updatedAssignments = pl.assignments.map(a =>
                            a.id === asg.id ? { ...a, roomId: roomId || null } : a
                          );
                          onChangeAppState({
                            ...appState,
                            planLekcji: {
                              ...pl,
                              assignments: updatedAssignments
                            }
                          });
                          notify(roomId ? `Przypisano salę ${targetRoom?.name || ''}` : 'Usunięto przypisanie sali');
                        }}
                        placeholder="-- Wybierz salę dla tej godziny --"
                        showSortControl={true}
                      />
                    </div>

                    {isConf && (
                      <div className="text-xs text-red-700 bg-red-100/80 border border-red-200 rounded-lg p-2 font-bold">
                        ⚠️ Kolizja: {confReasons.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-semibold">
                Komórka jest obecnie pusta (brak zaplanowanej lekcji).
              </div>
            )}
          </div>

          {/* Wybór przydziału do wstawienia */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>✨</span> Wstaw lub zamień lekcję (przydziały klasy {targetClass?.name})
              </span>
              <span className="text-slate-400 font-normal">Kliknij przydział, aby wstawić</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {classAssignments.map(asg => {
                const subj = pl.subjects.find(s => s.id === asg.subjectId);
                const teacher = pl.teachers.find(t => t.id === asg.teacherId);
                const room = pl.rooms.find(r => r.id === asg.roomId);
                const group = asg.groupId ? groupsMap.get(asg.groupId) : null;
                const placed = placedHours[asg.id] || 0;
                const isLimitReached = placed >= asg.hoursPerWeek;

                return (
                  <button
                    key={asg.id}
                    type="button"
                    onClick={() => {
                      placeAssignmentOnCell(
                        asg.id,
                        cellPickerTarget.dayIndex,
                        cellPickerTarget.hourIndex,
                        cellPickerTarget.classId
                      );
                      setCellPickerTarget(null);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-left transition flex items-start justify-between gap-2 group cursor-pointer bg-white shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: subj?.color || '#64748b' }}
                        />
                        <span className="text-xs font-black text-slate-800 truncate group-hover:text-indigo-900">
                          {subj?.name}
                        </span>
                        {group && (
                          <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                            {group.name}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                        👤 {teacher ? `${teacher.first[0]}. ${teacher.last}` : 'Brak naucz.'}
                        {room ? ` • 🚪 ${room.name}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${
                        isLimitReached 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {placed}/{asg.hoursPerWeek}h
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stopka */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[10.5px] text-slate-400 font-medium">
            💡 Wskazówka: Możesz też wybrać przydział z dolnego paska i klikać kolejne komórki („pędzel”).
          </span>
          <button
            type="button"
            onClick={() => setCellPickerTarget(null)}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
