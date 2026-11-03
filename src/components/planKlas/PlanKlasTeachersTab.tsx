import React from 'react';
import { PlanLekcjiState, Teacher, Subject } from '../../types';
import { subjectAbbr } from '../../utils';
import { PALETTE_COLORS } from '../kreator/constants';
import { User, BookOpen, MapPin, Edit3, Trash2, X } from 'lucide-react';

export interface PlanKlasTeachersTabProps {
  pl: PlanLekcjiState;
  newTeacherFirst: string;
  setNewTeacherFirst: React.Dispatch<React.SetStateAction<string>>;
  newTeacherLast: string;
  setNewTeacherLast: React.Dispatch<React.SetStateAction<string>>;
  newTeacherAbbr: string;
  setNewTeacherAbbr: React.Dispatch<React.SetStateAction<string>>;
  newTeacherMaxHours: number | '';
  setNewTeacherMaxHours: React.Dispatch<React.SetStateAction<number | ''>>;
  newTeacherOvertimeHours: number;
  setNewTeacherOvertimeHours: React.Dispatch<React.SetStateAction<number>>;
  newTeacherColor: string;
  setNewTeacherColor: React.Dispatch<React.SetStateAction<string>>;
  newTeacherAvailability: string[];
  setNewTeacherAvailability: React.Dispatch<React.SetStateAction<string[]>>;
  editingTeacherId: string | null;
  setIsTeacherAbbrManual: React.Dispatch<React.SetStateAction<boolean>>;
  updateTeacherAbbrAuto: (first: string, last: string) => void;
  setAllTeacherAvailability: (avail: boolean) => void;
  handleAddTeacher: (e: React.FormEvent) => void;
  handleStartEditTeacher: (t: Teacher) => void;
  handleCancelEditTeacher: () => void;
  handleRemoveTeacher: (id: string) => void;
  newSubjectName: string;
  setNewSubjectName: React.Dispatch<React.SetStateAction<string>>;
  newSubjectShort: string;
  setNewSubjectShort: React.Dispatch<React.SetStateAction<string>>;
  newSubjectColor: string;
  setNewSubjectColor: React.Dispatch<React.SetStateAction<string>>;
  newSubjectPattern: string;
  setNewSubjectPattern: React.Dispatch<React.SetStateAction<string>>;
  editingSubjectId: string | null;
  isSubjectShortManual: boolean;
  setIsSubjectShortManual: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddSubject: (e: React.FormEvent) => void;
  handleStartEditSubject: (s: Subject) => void;
  handleCancelEditSubject: () => void;
  newRoomName: string;
  setNewRoomName: React.Dispatch<React.SetStateAction<string>>;
  handleAddRoom: (e: React.FormEvent) => void;
}

export const PlanKlasTeachersTab: React.FC<PlanKlasTeachersTabProps> = ({
  pl,
  newTeacherFirst,
  setNewTeacherFirst,
  newTeacherLast,
  setNewTeacherLast,
  newTeacherAbbr,
  setNewTeacherAbbr,
  newTeacherMaxHours,
  setNewTeacherMaxHours,
  newTeacherOvertimeHours,
  setNewTeacherOvertimeHours,
  newTeacherColor,
  setNewTeacherColor,
  newTeacherAvailability,
  setNewTeacherAvailability,
  editingTeacherId,
  setIsTeacherAbbrManual,
  updateTeacherAbbrAuto,
  setAllTeacherAvailability,
  handleAddTeacher,
  handleStartEditTeacher,
  handleCancelEditTeacher,
  handleRemoveTeacher,
  newSubjectName,
  setNewSubjectName,
  newSubjectShort,
  setNewSubjectShort,
  newSubjectColor,
  setNewSubjectColor,
  newSubjectPattern,
  setNewSubjectPattern,
  editingSubjectId,
  isSubjectShortManual,
  setIsSubjectShortManual,
  handleAddSubject,
  handleStartEditSubject,
  handleCancelEditSubject,
  newRoomName,
  setNewRoomName,
  handleAddRoom
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Lista i dodawanie nauczycieli */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
          <User size={14} /> 👨‍🏫 {editingTeacherId ? 'Edytuj Nauczyciela' : 'Dodaj Nauczyciela'}
        </h3>
        <form onSubmit={handleAddTeacher} className="flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Imię" 
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
            value={newTeacherFirst}
            onChange={(e) => {
              const val = e.target.value;
              setNewTeacherFirst(val);
              updateTeacherAbbrAuto(val, newTeacherLast);
            }}
          />
          <input 
            type="text" 
            placeholder="Nazwisko *" 
            required
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
            value={newTeacherLast}
            onChange={(e) => {
              const val = e.target.value;
              setNewTeacherLast(val);
              updateTeacherAbbrAuto(newTeacherFirst, val);
            }}
          />
          <input 
            type="text" 
            placeholder="Skrót (np. JKOW) *" 
            required
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-bold"
            value={newTeacherAbbr}
            onChange={(e) => {
              setNewTeacherAbbr(e.target.value.toUpperCase());
              setIsTeacherAbbrManual(true);
            }}
          />
          <div className="grid grid-cols-2 gap-2 my-1">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Pensum (godz.)</label>
              <input 
                type="number" 
                required
                min={0}
                max={40}
                placeholder="18"
                className="w-full px-3 py-1 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 font-semibold text-slate-800"
                value={newTeacherMaxHours}
                onChange={(e) => setNewTeacherMaxHours(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-[10px] text-indigo-500 font-bold block mb-0.5">Nadgodziny</label>
              <input 
                type="number" 
                required
                min={0}
                max={40}
                placeholder="0"
                className="w-full px-3 py-1 border border-indigo-150 rounded-lg text-xs outline-none bg-indigo-50/20 font-semibold text-indigo-800"
                value={newTeacherOvertimeHours}
                onChange={(e) => setNewTeacherOvertimeHours(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm">
              {editingTeacherId ? 'Zapisz zmiany Nick' : 'Dodaj Nauczyciela'}
            </button>
            {editingTeacherId && (
              <button 
                type="button" 
                onClick={handleCancelEditTeacher}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
              >
                Anuluj
              </button>
            )}
          </div>
        </form>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {pl.teachers.map(t => {
            const teacherAssignedHours = pl.assignments.filter(a => a.teacherId === t.id).reduce((sum, a) => sum + a.hoursPerWeek, 0);
            const pensum = t.maxHours ?? 18;
            const assignedOvertime = Math.max(0, teacherAssignedHours - pensum);

            return (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs gap-1.5 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-700 truncate">{t.first} {t.last}</span>
                    <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[10px] font-black text-slate-500">{t.abbr}</span>
                    {t.inactive && (
                      <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black uppercase">Nieaktywny</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span>Pensum: {pensum}h {assignedOvertime > 0 ? `+ ${assignedOvertime}h nadg.` : t.overtimeHours ? `+ ${t.overtimeHours}h nadg.` : ''}</span>
                    {teacherAssignedHours > 0 && (
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        teacherAssignedHours > 40
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : teacherAssignedHours > pensum
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : teacherAssignedHours === pensum
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        Przydział: {teacherAssignedHours}h
                      </span>
                    )}
                    {t.inactive && t.inactiveComment && (
                      <span className="text-rose-600 font-semibold italic">({t.inactiveComment})</span>
                    )}
                    {!t.inactive && t.substitutions && t.substitutions.length > 0 && (
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">🔀 Zastępstwa: {t.substitutions.length} lekcji</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleStartEditTeacher(t)}
                    className="text-slate-400 hover:text-blue-600 p-1"
                    title="Edytuj dane"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeacher(t.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Usuń nauczyciela"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Słownik przedmiotów */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
          <BookOpen size={14} /> {editingSubjectId ? '📝 Edytuj przedmiot' : '📚 Przedmioty szkolne'}
        </h3>
        <form onSubmit={handleAddSubject} className="flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Nazwa przedmiotu *" 
            required
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
            value={newSubjectName}
            onChange={(e) => {
              const val = e.target.value;
              setNewSubjectName(val);
              if (!isSubjectShortManual) {
                setNewSubjectShort(subjectAbbr(val));
              }
            }}
          />
          <input 
            type="text" 
            placeholder="Skrót (np. MAT, POL)" 
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
            value={newSubjectShort}
            onChange={(e) => {
              setNewSubjectShort(e.target.value);
              setIsSubjectShortManual(true);
            }}
          />

          <div className="space-y-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase">Słowo kluczowe podgrupy (opcjonalnie)</label>
            <input 
              type="text" 
              placeholder="np. religia, ang, niem, wf" 
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-bold text-indigo-600"
              value={newSubjectPattern}
              onChange={(e) => setNewSubjectPattern(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 py-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kolor kafelka:</label>
            <div className="flex items-center gap-1.5">
              <input 
                type="color" 
                className="w-7 h-7 border border-slate-200 rounded cursor-pointer p-0 bg-transparent"
                value={newSubjectColor}
                onChange={(e) => setNewSubjectColor(e.target.value)}
              />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{newSubjectColor}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="grow py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition">
              {editingSubjectId ? 'Zapisz zmiany' : 'Dodaj Przedmiot'}
            </button>
            {editingSubjectId && (
              <button 
                type="button" 
                onClick={handleCancelEditSubject}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer transition"
              >
                Anuluj
              </button>
            )}
          </div>
        </form>

        <div className="divide-y divide-slate-100 max-h-90 overflow-y-auto">
          {pl.subjects.map(s => (
            <div key={s.id} className="py-2 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded px-1 transition duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 truncate">{s.name}</p>
                  {s.defaultGroupPattern && (
                    <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1 rounded uppercase tracking-wide inline-block mt-0.5">
                      Wzorzec gr: {s.defaultGroupPattern}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold font-mono text-[10px]" style={{ color: s.color }}>{s.short}</span>
                <button 
                  onClick={() => handleStartEditSubject(s)}
                  className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer select-none"
                  title="Edytuj przedmiot"
                >
                  <Edit3 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rekomendowane sale */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
          <MapPin size={14} /> 🚪 Sale lekcyjne (Etap 1)
        </h3>
        <form onSubmit={handleAddRoom} className="flex flex-col gap-2">
          <input 
            type="text" 
            placeholder="Nazwa/Nr Sali *" 
            required
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
            Dodaj Salę
          </button>
        </form>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {pl.rooms.map(r => (
            <div key={r.id} className="py-2 flex items-center justify-between text-xs text-slate-700 font-semibold">
              <span>Sala {r.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{r.desc || 'Klasyczna'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🧑‍🏫 Teacher Edit Modal Overlay over Planner */}
      {editingTeacherId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧑‍🏫</span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Edycja Profilu Nauczyciela</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Identyfikator: <span className="font-mono text-slate-600">{editingTeacherId}</span></p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCancelEditTeacher}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Form Details */}
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    👤 Informacje podstawowe
                  </h4>
                  
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold col-span-2">Imię</label>
                      <input 
                        type="text" 
                        required
                        placeholder="np. Jan"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                        value={newTeacherFirst}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTeacherFirst(val);
                          updateTeacherAbbrAuto(val, newTeacherLast);
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold col-span-2">Nazwisko</label>
                      <input 
                        type="text" 
                        required
                        placeholder="np. Kowalski"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                        value={newTeacherLast}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTeacherLast(val);
                          updateTeacherAbbrAuto(newTeacherFirst, val);
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold col-span-2">Inicjały (Skrót na planie)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="np. JKOW"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-bold text-slate-800 uppercase focus:border-blue-500"
                        value={newTeacherAbbr}
                        onChange={(e) => {
                          setNewTeacherAbbr(e.target.value.toUpperCase());
                          setIsTeacherAbbrManual(true);
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold col-span-2">Pensum (godz.)</label>
                        <input 
                          type="number" 
                          required
                          min={0}
                          max={40}
                          placeholder="18"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-semibold text-slate-800 focus:border-blue-500"
                          value={newTeacherMaxHours}
                          onChange={(e) => setNewTeacherMaxHours(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-indigo-600 font-bold col-span-2">Nadgodziny</label>
                        <input 
                          type="number" 
                          required
                          min={0}
                          max={40}
                          placeholder="0"
                          className="w-full px-3 py-1.5 border border-indigo-150 bg-indigo-50/20 rounded-lg text-xs outline-none font-semibold text-indigo-800 focus:border-indigo-500"
                          value={newTeacherOvertimeHours}
                          onChange={(e) => setNewTeacherOvertimeHours(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-slate-500 font-bold block col-span-2">Kolor profilu</label>
                      <div className="grid grid-cols-8 gap-0.5 p-1.5 border border-slate-200 bg-white rounded-lg max-h-24 overflow-y-auto">
                        {PALETTE_COLORS.map(c => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setNewTeacherColor(c)}
                            className={`w-4.5 h-4.5 rounded-full border shrink-0 transition ${
                              newTeacherColor === c ? 'ring-2 ring-blue-500 scale-110 shadow-sm' : 'border-slate-100 hover:scale-110'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Weekly Availability Grid */}
                <div className="lg:col-span-7 space-y-3 flex flex-col font-sans">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      📅 Godziny Dostępności Nauczyciela
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAllTeacherAvailability(true)}
                        className="text-[9px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold border border-emerald-200 transition"
                      >
                        Zaznacz wszystkie
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllTeacherAvailability(false)}
                        className="text-[9px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-0.5 rounded font-bold border border-slate-300 transition"
                      >
                        Odznacz wszystkie
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal">
                    Kliknij na poszczególne godziny na planie, aby przełączać status dostępności nauczyciela we wskazanych porach. Zielone komórki oznaczają gotowość do prowadzenia zajęć.
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white flex-1 min-h-[250px] overflow-y-auto max-h-[300px]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-white z-[10]">
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-2 font-bold text-slate-500 uppercase text-[9px] w-14 border-r border-slate-150 text-center">Lekcja</th>
                          {['Pn', 'Wt', 'Śr', 'Cz', 'Pt'].map((dayName, dayIndex) => (
                            <th key={dayIndex} className="p-2 font-bold text-slate-750 text-center uppercase tracking-wider text-[9px] border-r border-slate-100 last:border-r-0">
                              {dayName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {(pl.hours && pl.hours.length > 0 ? pl.hours : []).map((h) => (
                          <tr key={h.num} className="hover:bg-slate-55">
                            <td className="p-1 border-r border-slate-150 bg-slate-50 font-bold text-slate-600 text-center">
                              <div className="text-[9px]">Lekcja {h.num}</div>
                              <div className="text-[8px] text-slate-400 font-normal leading-none">{h.start}-{h.end}</div>
                            </td>
                            {[0, 1, 2, 3, 4].map((dayIndex) => {
                              const code = `${dayIndex}-${h.num}`;
                              const isAvailable = newTeacherAvailability.includes(code);
                              return (
                                <td 
                                  key={dayIndex} 
                                  onClick={() => {
                                    if (newTeacherAvailability.includes(code)) {
                                      setNewTeacherAvailability(newTeacherAvailability.filter(x => x !== code));
                                    } else {
                                      setNewTeacherAvailability([...newTeacherAvailability, code]);
                                    }
                                  }}
                                  className={`p-1.5 text-center cursor-pointer select-none transition-all border-r last:border-r-0 border-slate-100 ${
                                    isAvailable 
                                      ? 'bg-emerald-50 text-emerald-800' 
                                      : 'bg-rose-50 text-rose-500/80 line-through decoration-rose-300'
                                  }`}
                                >
                                  <div className="font-extrabold uppercase text-[8px] tracking-wider">
                                    {isAvailable ? '✓ Dostępny' : '✗ Zajęty'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleCancelEditTeacher}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
              >
                Anuluj
              </button>
              <button 
                type="button" 
                onClick={handleAddTeacher}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                Zapisz zmiany profilu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
