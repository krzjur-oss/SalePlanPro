import React from 'react';
import { PlanLekcjiState, SpecialStudent, Subject, Teacher } from '../../types';

export interface SpeSlotEditData {
  dayIdx: number;
  hourIdx: number;
  mode: 'class_regular' | 'class_support' | 'individual' | 'group_special' | 'exempt';
  supportTeacherId: string;
  specialAssignmentId: string;
  customSubjectId: string;
  customTeacherId: string;
  customRoomId: string;
  customType: 'ni' | 'rewa' | 'wsp' | 'korekta' | 'logopedia' | 'psycholog' | 'pedagog';
  exemptReason: string;
  isGroup?: boolean;
  groupName?: string;
  linkedStudentIds?: string[];
}

export interface PlanKlasSpeSlotModalProps {
  editingSpeSlot: SpeSlotEditData | null;
  setEditingSpeSlot: React.Dispatch<React.SetStateAction<SpeSlotEditData | null>>;
  currentStudent: SpecialStudent | null;
  pl: PlanLekcjiState;
  DAYS: string[];
  subjectsMap: Map<string, Subject>;
  teachersMap: Map<string, Teacher>;
  handleResetSpeSlot: (dayIdx: number, hourIdx: number) => void;
  handleSaveSpeSlot: (slot: SpeSlotEditData) => void;
}

export const PlanKlasSpeSlotModal: React.FC<PlanKlasSpeSlotModalProps> = ({
  editingSpeSlot,
  setEditingSpeSlot,
  currentStudent,
  pl,
  DAYS,
  subjectsMap,
  teachersMap,
  handleResetSpeSlot,
  handleSaveSpeSlot,
}) => {
  const classesMap = React.useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const roomsMap = React.useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);

  if (!editingSpeSlot || !currentStudent) return null;

  const dayName = DAYS[editingSpeSlot.dayIdx] || `Dzień ${editingSpeSlot.dayIdx + 1}`;
  const hourObj = pl.hours[editingSpeSlot.hourIdx];
  const classKey = currentStudent.classId ? `${currentStudent.classId}|${editingSpeSlot.dayIdx}|${editingSpeSlot.hourIdx}` : '';
  const classLesson = classKey ? pl.lessons[classKey] : null;
  const classAsg = classLesson ? pl.assignments.find(a => a.id === classLesson.assignmentId) : null;
  const classSubj = classAsg ? subjectsMap.get(classAsg.subjectId) : null;
  const classTeacher = classAsg?.teacherId ? teachersMap.get(classAsg.teacherId) : null;
  const available1to1 = pl.specialAssignments.filter(a => a.studentId === currentStudent.id && !a.withClass);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Nagłówek Modalu */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
              Konfiguracja trybu realizacji godziny SPE
            </span>
            <h3 className="text-base font-black flex items-center gap-2 mt-0.5">
              <span>{currentStudent.firstName} {currentStudent.lastName}</span>
              <span className="text-xs font-normal text-slate-300">
                • {dayName}, lekcja {hourObj?.num} ({hourObj?.start} - {hourObj?.end})
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setEditingSpeSlot(null)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Informacja o lekcji klasy macierzystej */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="text-indigo-900 font-bold flex items-center gap-1.5">
            🏫 Lekcja oddziału ({classesMap.get(currentStudent.classId || '')?.name || 'brak klasy'}):
          </span>
          <div className="font-bold text-slate-800">
            {classLesson && classAsg ? (
              <span className="flex items-center gap-1.5">
                <span className="text-indigo-700">{classSubj?.name}</span>
                <span className="text-slate-400 font-normal">({classTeacher ? `${classTeacher.first.charAt(0)}. ${classTeacher.last}` : 'Brak naucz.'})</span>
                {classAsg.roomId && <span className="bg-white px-1.5 py-0.2 rounded border text-[10px] text-slate-600">s. {roomsMap.get(classAsg.roomId)?.name}</span>}
              </span>
            ) : (
              <span className="text-slate-400 italic">Oddział nie ma zaplanowanej lekcji w tej godzinie</span>
            )}
          </div>
        </div>

        {/* Zawartość / Formularz wyboru trybu */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
            Wybierz sposób realizacji tej godziny:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Karta 1: Z klasą bez wsparcia */}
            <div
              onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_regular' })}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                editingSpeSlot.mode === 'class_regular'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  🏫 Z klasą (ogólna)
                </span>
                <input
                  type="radio"
                  name="spe_mode"
                  checked={editingSpeSlot.mode === 'class_regular'}
                  onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_regular' })}
                  className="text-indigo-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Uczeń realizuje lekcję wspólnie z oddziałem bez nauczyciela wspomagającego.
              </p>
            </div>

            {/* Karta 2: Z klasą ze wsparciem */}
            <div
              onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_support' })}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                editingSpeSlot.mode === 'class_support'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
                  🤝 Wsparcie w klasie
                </span>
                <input
                  type="radio"
                  name="spe_mode"
                  checked={editingSpeSlot.mode === 'class_support'}
                  onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_support' })}
                  className="text-emerald-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Uczeń jest na lekcji z klasą z obecnością nauczyciela wspomagającego.
              </p>
            </div>

            {/* Karta 3: Nauczanie indywidualne / 1:1 */}
            <div
              onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'individual' })}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                editingSpeSlot.mode === 'individual'
                  ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                  👤 Zajęcia 1:1 (NI/Rewa)
                </span>
                <input
                  type="radio"
                  name="spe_mode"
                  checked={editingSpeSlot.mode === 'individual'}
                  onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'individual' })}
                  className="text-purple-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Lekcja zostaje zastąpiona nauczaniem 1:1, rewalidacją lub terapią.
              </p>
            </div>

            {/* Karta 4: Zwolnienie z lekcji */}
            <div
              onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'exempt' })}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                editingSpeSlot.mode === 'exempt'
                  ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                  ⛔ Zwolnienie z lekcji
                </span>
                <input
                  type="radio"
                  name="spe_mode"
                  checked={editingSpeSlot.mode === 'exempt'}
                  onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'exempt' })}
                  className="text-amber-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Zwolnienie (np. z II języka, WF) lub pobyt w gabinecie / świetlicy.
              </p>
            </div>
          </div>

          {/* Sekcja szczegółowa w zależności od wybranego trybu */}
          {editingSpeSlot.mode === 'class_support' && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
              <label className="block text-[10.5px] font-black text-emerald-950 uppercase tracking-wider">
                Wybierz nauczyciela wspomagającego dla tej godziny:
              </label>
              <select
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                value={editingSpeSlot.supportTeacherId || ''}
                onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, supportTeacherId: e.target.value })}
              >
                <option value="">-- Wybierz nauczyciela --</option>
                {currentStudent.supportTeacherIds && currentStudent.supportTeacherIds.length > 0 && (
                  <optgroup label="⭐ Wyznaczona kadra ucznia">
                    {currentStudent.supportTeacherIds.map(tId => {
                      const t = teachersMap.get(tId);
                      if (!t) return null;
                      return <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>;
                    })}
                  </optgroup>
                )}
                <optgroup label="Pozostali nauczyciele">
                  {pl.teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {editingSpeSlot.mode === 'individual' && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-[10.5px] font-black text-purple-950 uppercase tracking-wider">
                  Zajęcia 1:1 dla ucznia:
                </label>
              </div>

              {available1to1.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-purple-900">
                    Wybierz ze zdefiniowanych przydziałów 1:1:
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    value={editingSpeSlot.specialAssignmentId || ''}
                    onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, specialAssignmentId: e.target.value })}
                  >
                    <option value="">-- Wybierz przydział 1:1 --</option>
                    {available1to1.map(asg => {
                      const s = subjectsMap.get(asg.subjectId);
                      const t = teachersMap.get(asg.teacherId || '');
                      return (
                        <option key={asg.id} value={asg.id}>
                          {s?.name} • Prow: {t ? `${t.first} ${t.last} (${t.abbr})` : 'Brak'} ({asg.supportType === 'rewa' ? 'Rewalidacja' : 'NI'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[10px] text-purple-800 font-bold bg-purple-100/60 p-2 rounded-lg">
                    💡 Brak wcześniej utworzonych przydziałów 1:1. Zdefiniuj zajęcia poniżej:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9.5px] font-bold text-purple-900 mb-1">Przedmiot</label>
                      <select
                        className="w-full px-2.5 py-1.5 border border-purple-200 rounded-lg text-xs bg-white font-bold"
                        value={editingSpeSlot.customSubjectId || ''}
                        onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, customSubjectId: e.target.value })}
                      >
                        {pl.subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-purple-900 mb-1">Nauczyciel</label>
                      <select
                        className="w-full px-2.5 py-1.5 border border-purple-200 rounded-lg text-xs bg-white font-bold"
                        value={editingSpeSlot.customTeacherId || ''}
                        onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, customTeacherId: e.target.value })}
                      >
                        {pl.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {editingSpeSlot.mode === 'exempt' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in">
              <label className="block text-[10.5px] font-black text-amber-950 uppercase tracking-wider">
                Powód zwolnienia z lekcji:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Zwolnienie z II języka obcego',
                  'Zwolnienie z wychowania fizycznego',
                  'Pobyt w gabinecie terapeutycznym',
                  'Pobyt w świetlicy szkolnej',
                  'Zalecenie orzeczenia PPP'
                ].map(template => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setEditingSpeSlot({ ...editingSpeSlot, exemptReason: template })}
                    className={`text-[9.5px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                      editingSpeSlot.exemptReason === template
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                value={editingSpeSlot.exemptReason || ''}
                onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, exemptReason: e.target.value })}
                placeholder="Wpisz lub wybierz powód zwolnienia..."
              />
            </div>
          )}
        </div>

        {/* Stopka Akcji Modalu */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              handleResetSpeSlot(editingSpeSlot.dayIdx, editingSpeSlot.hourIdx);
              setEditingSpeSlot(null);
            }}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
          >
            🔄 Przywróć stan domyślny
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingSpeSlot(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveSpeSlot(editingSpeSlot);
                setEditingSpeSlot(null);
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer"
            >
              Zapisz zmiany
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
