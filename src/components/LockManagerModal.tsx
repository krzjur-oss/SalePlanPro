import React, { useState, useMemo } from 'react';
import { 
  Lock, Unlock, Shield, ShieldCheck, X, Search, CheckCircle, 
  Users, UserCheck, GraduationCap, AlertCircle, Sparkles, Filter 
} from 'lucide-react';
import { AppState, Class, Teacher, SpecialStudent, Lesson, SpecialLesson } from '../types';

interface LockManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onBulkLockClass: (classId: string, lock: boolean) => void;
  onBulkLockTeacher: (teacherId: string, lock: boolean) => void;
  onBulkLockSPEStudent: (studentId: string, lock: boolean) => void;
  onBulkLockAllClasses: (lock: boolean) => void;
}

export default function LockManagerModal({
  isOpen,
  onClose,
  appState,
  onBulkLockClass,
  onBulkLockTeacher,
  onBulkLockSPEStudent,
  onBulkLockAllClasses
}: LockManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers' | 'spe'>('classes');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const pl = appState.planLekcji;

  // Compute stats per class
  const classLockStats = useMemo(() => {
    return pl.classes.map(c => {
      let total = 0;
      let locked = 0;
      Object.entries(pl.lessons).forEach(([key, l]) => {
        if (key.startsWith(`${c.id}|`)) {
          total++;
          if (l.locked) locked++;
        }
      });
      return {
        class: c,
        total,
        locked,
        isFullyLocked: total > 0 && locked === total,
        isPartiallyLocked: locked > 0 && locked < total
      };
    });
  }, [pl.classes, pl.lessons]);

  // Compute stats per teacher
  const teacherLockStats = useMemo(() => {
    return pl.teachers.map(t => {
      const teacherAsgIds = new Set(pl.assignments.filter(a => a.teacherId === t.id).map(a => a.id));
      let total = 0;
      let locked = 0;
      Object.values(pl.lessons).forEach(l => {
        if (teacherAsgIds.has(l.assignmentId)) {
          total++;
          if (l.locked) locked++;
        }
      });
      return {
        teacher: t,
        total,
        locked,
        isFullyLocked: total > 0 && locked === total,
        isPartiallyLocked: locked > 0 && locked < total
      };
    });
  }, [pl.teachers, pl.assignments, pl.lessons]);

  // Compute stats per SPE student
  const speLockStats = useMemo(() => {
    return (pl.specialStudents || []).map(s => {
      let total = 0;
      let locked = 0;
      Object.entries(pl.specialLessons || {}).forEach(([key, sl]) => {
        if (key.startsWith(`${s.id}|`)) {
          total++;
          if (sl.locked) locked++;
        }
      });
      return {
        student: s,
        total,
        locked,
        isFullyLocked: total > 0 && locked === total,
        isPartiallyLocked: locked > 0 && locked < total
      };
    });
  }, [pl.specialStudents, pl.specialLessons]);

  const totalLessonsInPlan = Object.keys(pl.lessons).length;
  const totalLockedLessons = Object.values(pl.lessons).filter(l => l.locked).length;

  // Filtered lists
  const filteredClasses = classLockStats.filter(item => 
    item.class.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeachers = teacherLockStats.filter(item => 
    `${item.teacher.first} ${item.teacher.last} ${item.teacher.abbr}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSPE = speLockStats.filter(item => 
    `${item.student.firstName} ${item.student.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        id="lock-manager-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-100 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Menedżer Kłódek i Ochrony Przed Generatorem
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Zamrażanie godzin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Zablokowane lekcje nie zostaną zmienione ani przesunięte przez generator automatyczny
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

        {/* OVERVIEW STATS BANNER */}
        <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-200/60 flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Stan zabezpieczeń: <strong>{totalLockedLessons}</strong> zablokowanych godzin na <strong>{totalLessonsInPlan}</strong> wszystkich w planie ({totalLessonsInPlan > 0 ? Math.round((totalLockedLessons / totalLessonsInPlan) * 100) : 0}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBulkLockAllClasses(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Lock size={12} />
              <span>Zablokuj całą szkołę</span>
            </button>
            <button
              type="button"
              onClick={() => onBulkLockAllClasses(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Unlock size={12} />
              <span>Odblokuj wszystko</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION & SEARCH */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'classes'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Klasy / Oddziały ({pl.classes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'teachers'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Nauczyciele ({pl.teachers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spe')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'spe'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Uczniowie SPE ({(pl.specialStudents || []).length})</span>
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Szukaj..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB: CLASSES */}
          {activeTab === 'classes' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredClasses.map(({ class: c, total, locked, isFullyLocked, isPartiallyLocked }) => (
                  <div 
                    key={c.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      isFullyLocked 
                        ? 'border-amber-300 bg-amber-50/50 shadow-xs' 
                        : isPartiallyLocked
                          ? 'border-indigo-200 bg-indigo-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-base text-slate-800">klasa {c.name}</span>
                        {isFullyLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Lock size={10} /> Zablokowana
                          </span>
                        ) : isPartiallyLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
                            {locked}/{total} zablokowane
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            Odblokowana
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Zaplanowanych lekcji: <strong className="text-slate-700">{total}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onBulkLockClass(c.id, true)}
                        disabled={total === 0 || isFullyLocked}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Zablokuj wszystkie godziny tej klasy"
                      >
                        <Lock size={12} />
                        <span>Zablokuj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onBulkLockClass(c.id, false)}
                        disabled={locked === 0}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Odblokuj godziny tej klasy"
                      >
                        <Unlock size={12} />
                        <span>Odblokuj</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: TEACHERS */}
          {activeTab === 'teachers' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredTeachers.map(({ teacher: t, total, locked, isFullyLocked, isPartiallyLocked }) => (
                  <div 
                    key={t.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      isFullyLocked 
                        ? 'border-amber-300 bg-amber-50/50 shadow-xs' 
                        : isPartiallyLocked
                          ? 'border-indigo-200 bg-indigo-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-slate-800 truncate" title={`${t.first} ${t.last}`}>
                          {t.first} {t.last} ({t.abbr})
                        </span>
                        {isFullyLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                            <Lock size={10} /> Zablokowany
                          </span>
                        ) : isPartiallyLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                            {locked}/{total}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            Wolny
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Zaplanowanych lekcji: <strong className="text-slate-700">{total}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onBulkLockTeacher(t.id, true)}
                        disabled={total === 0 || isFullyLocked}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Zablokuj wszystkie lekcje tego nauczyciela"
                      >
                        <Lock size={12} />
                        <span>Zablokuj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onBulkLockTeacher(t.id, false)}
                        disabled={locked === 0}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Odblokuj lekcje tego nauczyciela"
                      >
                        <Unlock size={12} />
                        <span>Odblokuj</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SPE */}
          {activeTab === 'spe' && (
            <div className="space-y-3">
              {filteredSPE.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Brak uczniów ze specjalnymi potrzebami edukacyjnymi (SPE).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredSPE.map(({ student: s, total, locked, isFullyLocked, isPartiallyLocked }) => (
                    <div 
                      key={s.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                        isFullyLocked 
                          ? 'border-amber-300 bg-amber-50/50 shadow-xs' 
                          : isPartiallyLocked
                            ? 'border-indigo-200 bg-indigo-50/30'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm text-slate-800 truncate" title={`${s.lastName} ${s.firstName}`}>
                            {s.lastName} {s.firstName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {s.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Zajęć specjalnych: <strong className="text-slate-700">{total}</strong> (zablokowano: {locked})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onBulkLockSPEStudent(s.id, true)}
                          disabled={total === 0 || isFullyLocked}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Zablokuj zajęcia specjalne tego ucznia"
                        >
                          <Lock size={12} />
                          <span>Zablokuj</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onBulkLockSPEStudent(s.id, false)}
                          disabled={locked === 0}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Odblokuj zajęcia tego ucznia"
                        >
                          <Unlock size={12} />
                          <span>Odblokuj</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-md"
          >
            Gotowe / Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
