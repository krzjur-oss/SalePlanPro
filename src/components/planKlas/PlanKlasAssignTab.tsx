import React from 'react';
import { PlanLekcjiState, Class, Subject, Teacher, ClassRoom, Assignment } from '../../types';
import { AssignRoomDropdown } from '../AssignRoomDropdown';
import { Users, Edit3, Trash2 } from 'lucide-react';

export interface PlanKlasAssignTabProps {
  pl: PlanLekcjiState;
  classesMap: Map<string, Class>;
  subjectsMap: Map<string, Subject>;
  teachersMap: Map<string, Teacher>;
  roomsMap: Map<string, ClassRoom>;
  placedHours: Record<string, number>;
  assignClass: string;
  setAssignClass: React.Dispatch<React.SetStateAction<string>>;
  assignSubject: string;
  setAssignSubject: React.Dispatch<React.SetStateAction<string>>;
  assignTeacher: string;
  setAssignTeacher: React.Dispatch<React.SetStateAction<string>>;
  assignRoom: string;
  setAssignRoom: (roomId: string) => void;
  assignHours: number;
  setAssignHours: React.Dispatch<React.SetStateAction<number>>;
  assignGroup: string;
  setAssignGroup: React.Dispatch<React.SetStateAction<string>>;
  assignLinkedClasses: string[];
  setAssignLinkedClasses: React.Dispatch<React.SetStateAction<string[]>>;
  assignPreferredBlockSize: number;
  setAssignPreferredBlockSize: React.Dispatch<React.SetStateAction<number>>;
  editingAssignId: string | null;
  handleCancelEditAssignment: () => void;
  handleAddAssignment: (e: React.FormEvent) => void;
  handleStartEditAssignment: (a: Assignment) => void;
  handleRemoveAssignment: (id: string) => void;
  autoSelectGroupForAssignTab: (clsId: string, subjId: string) => void;
}

export const PlanKlasAssignTab: React.FC<PlanKlasAssignTabProps> = ({
  pl,
  classesMap,
  subjectsMap,
  teachersMap,
  roomsMap,
  placedHours,
  assignClass,
  setAssignClass,
  assignSubject,
  setAssignSubject,
  assignTeacher,
  setAssignTeacher,
  assignRoom,
  setAssignRoom,
  assignHours,
  setAssignHours,
  assignGroup,
  setAssignGroup,
  assignLinkedClasses,
  setAssignLinkedClasses,
  assignPreferredBlockSize,
  setAssignPreferredBlockSize,
  editingAssignId,
  handleCancelEditAssignment,
  handleAddAssignment,
  handleStartEditAssignment,
  handleRemoveAssignment,
  autoSelectGroupForAssignTab
}) => {
  return (
    <div className="space-y-6">
      <div className={`bg-white border rounded-xl p-6 shadow-sm transition-all ${editingAssignId ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 select-none">
            {editingAssignId ? '✏️ Edytuj przypisanie zajęć' : '📌 Dodaj nowe przypisanie (Kto, Czego, Ile, Gdzie)'}
          </h2>
          {editingAssignId && (
            <button 
              type="button" 
              onClick={handleCancelEditAssignment}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Anuluj edycję
            </button>
          )}
        </div>
        <form onSubmit={handleAddAssignment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Klasa Główna</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                value={assignClass}
                onChange={(e) => {
                  const clsId = e.target.value;
                  setAssignClass(clsId);
                  setAssignLinkedClasses(prev => prev.filter(id => id !== clsId));
                  autoSelectGroupForAssignTab(clsId, assignSubject);
                }}
              >
                <option value="">Wybierz klasę</option>
                {pl.classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.group ? `(${c.group})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Przedmiot</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                value={assignSubject}
                onChange={(e) => {
                  const subjId = e.target.value;
                  setAssignSubject(subjId);
                  autoSelectGroupForAssignTab(assignClass, subjId);
                }}
              >
                <option value="">Wybierz przedmiot</option>
                {pl.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.short})</option>
                ))}
              </select>
            </div>

            {assignClass && pl.schoolGroups.filter(g => g.classId === assignClass).length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Podgrupa (Wybór auto)</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-indigo-50/50 border-indigo-200 text-indigo-700 font-bold outline-none"
                  value={assignGroup}
                  onChange={(e) => setAssignGroup(e.target.value)}
                >
                  <option value="">Cała klasa</option>
                  {pl.schoolGroups.filter(g => g.classId === assignClass).map(g => (
                    <option key={g.id} value={g.id}>Grupa: {g.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Główny Nauczyciel</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                value={assignTeacher}
                onChange={(e) => setAssignTeacher(e.target.value)}
              >
                <option value="">Wybierz nauczyciela</option>
                {pl.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dedykowana Sala</label>
              <AssignRoomDropdown
                planLekcji={pl}
                value={assignRoom}
                onChange={(roomId) => setAssignRoom(roomId)}
                placeholder="-- Wybierz salę --"
                showSortControl={true}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rozkład lekcji (Bloki)</label>
              <select 
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-slate-700 bg-blue-50/45 focus:bg-white"
                value={assignPreferredBlockSize}
                onChange={(e) => setAssignPreferredBlockSize(Number(e.target.value))}
              >
                <option value={1}>Pojedyncze lekcje (1h)</option>
                <option value={2}>Bloki dwugodzinne (2h)</option>
                <option value={3}>Bloki trzygodzinne (3h)</option>
                <option value={0}>Dowolny układ lekcji / bloków</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Godzin/Tydz.</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-center"
                  value={assignHours}
                  onChange={(e) => setAssignHours(Number(e.target.value))}
                />
              </div>
              <button 
                type="submit" 
                className={`px-4 py-2 border border-transparent rounded-lg text-white font-bold text-xs self-end h-[34px] transition ${
                  editingAssignId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editingAssignId ? 'Zapisz' : 'Dodaj'}
              </button>
            </div>
          </div>

          {/* Sekcja łączenia oddziałów (Grupa międzyoddziałowa) */}
          {assignClass && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Users size={14} className="text-indigo-600" />
                  <span>Grupa międzyoddziałowa (Zajęcia łączone)</span>
                  <span className="text-[10px] font-normal text-indigo-700 ml-1">
                    — opcjonalnie zaznacz klasy, z których uczniowie łączą się na tej lekcji (np. język mniejszości, religia, WF)
                  </span>
                </div>
                {assignLinkedClasses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssignLinkedClasses([])}
                    className="text-[10px] text-red-600 hover:underline font-bold"
                  >
                    Wyczyść łączenie
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {pl.classes.filter(c => c.id !== assignClass).map(c => {
                  const isSelected = assignLinkedClasses.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setAssignLinkedClasses(prev => 
                          isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>Oddział {c.name}</span>
                    </button>
                  );
                })}
              </div>
              {assignLinkedClasses.length > 0 && (
                <div className="text-[11px] font-bold text-indigo-800 bg-white/80 border border-indigo-200/60 p-2 rounded-lg mt-1">
                  🔗 Utworzona zostanie jedna wspólna godzina lekcyjna dla oddziałów:{' '}
                  <span className="font-extrabold underline">
                    {[classesMap.get(assignClass)?.name, ...assignLinkedClasses.map(id => classesMap.get(id)?.name)].filter(Boolean).join(' + ')}
                  </span>
                  . U nauczyciela zaliczy się jako <strong className="font-black">{assignHours}h</strong> (bez podwójnego liczenia), a lekcja pojawi się automatycznie w planie każdej z połączonych klas!
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 select-none">📋 Aktywne Przypisania (Pracochłonność)</h3>
          <span className="text-xs text-slate-500 font-bold">Łącznie przydziałów: {pl.assignments.length}</span>
        </div>
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Klasa</th>
              <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Przedmiot</th>
              <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Nauczyciel</th>
              <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Dedykowana Sala</th>
              <th className="p-3 text-center text-xs font-bold text-slate-500 border-b border-slate-200">Godzin/Tydz</th>
              <th className="p-3 text-center text-xs font-bold text-slate-500 border-b border-slate-200">Umieszczone</th>
              <th className="p-3 text-center text-xs font-bold text-slate-500 border-b border-slate-200">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {pl.assignments.map(a => {
              const c = classesMap.get(a.classId);
              const s = subjectsMap.get(a.subjectId);
              const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
              const r = a.roomId ? roomsMap.get(a.roomId) : null;
              const placed = placedHours[a.id] || 0;
              const hasLinked = a.linkedClassIds && a.linkedClassIds.length > 0;

              return (
                <tr key={a.id} className={`hover:bg-slate-50/50 ${editingAssignId === a.id ? 'bg-indigo-50/30' : ''}`}>
                  <td className="p-3 text-xs font-bold text-slate-700 border-b border-slate-200">
                    <div>
                      {c ? `Oddział ${c.name}` : '?'}
                    </div>
                    {hasLinked && (
                      <div className="text-[9.5px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                        👥 Łączona: {[c?.name, ...a.linkedClassIds!.map(id => classesMap.get(id)?.name)].filter(Boolean).join(' + ')}
                      </div>
                    )}
                    {a.groupId && (() => {
                      const grp = pl.schoolGroups.find(g => g.id === a.groupId);
                      return grp ? (
                        <div className="text-[9.5px] text-indigo-600 font-bold mt-0.5">
                          👥 Grupa: {grp.name}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="p-3 text-xs border-b border-slate-200" style={{ color: s?.color }}>{s?.name}</td>
                  <td className="p-3 text-xs text-slate-600 border-b border-slate-200">
                    {t ? `${t.first} ${t.last} (${t.abbr})` : '—'}
                  </td>
                  <td className="p-3 text-xs text-slate-500 font-mono border-b border-slate-200">
                    {r ? r.name : 'Dowolna'}
                  </td>
                  <td className="p-3 text-xs text-center border-b border-slate-200">
                    <div className="font-semibold text-slate-800">{a.hoursPerWeek}h</div>
                    {a.preferredBlockSize !== undefined && (
                      <div className={`inline-block px-1 mt-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        a.preferredBlockSize === 2 
                          ? 'bg-purple-100 text-purple-700'
                          : a.preferredBlockSize === 3
                            ? 'bg-amber-100 text-amber-700'
                            : a.preferredBlockSize === 1
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {a.preferredBlockSize === 2 
                          ? 'blok 2h'
                          : a.preferredBlockSize === 3
                            ? 'blok 3h'
                            : a.preferredBlockSize === 1
                              ? 'poj. 1h'
                              : 'dowolny'}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-center border-b border-slate-200">
                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                      placed >= a.hoursPerWeek 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {placed} / {a.hoursPerWeek}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-center border-b border-slate-200">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleStartEditAssignment(a)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        title="Edytuj to przypisanie"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleRemoveAssignment(a.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Usuń przypisanie"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pl.assignments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">Brak aktywnych przypisań szkolnych. Dodaj je u góry.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
