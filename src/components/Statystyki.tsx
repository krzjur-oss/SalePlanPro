import React, { useMemo, useState } from 'react';
import { AppState, SchedData } from '../types';
import { 
  BarChart, Users, BookOpen, MapPin, Building, Shield, AlertTriangle, AlertCircle, TrendingUp, Info, HelpCircle
} from 'lucide-react';

interface StatystykiProps {
  appState: AppState;
  schedData: SchedData;
}

export default function Statystyki({ appState, schedData }: StatystykiProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'teachers' | 'rooms' | 'gaps'>('general');
  const pl = appState.planLekcji;

  // --- Map and Lookups ---
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);

  const hoursList = useMemo(() => {
    return pl.hours || [];
  }, [pl.hours]);

  // --- Calculations for Lessons scheduled ---
  const scheduledLessonsList = useMemo(() => {
    // Collect all scheduled lessons in Plan Klas (Etap 1)
    const list: Array<{ classId: string; dayIdx: number; hourIdx: number; teacherId: string | null; subjectId: string; roomId: string | null }> = [];
    Object.entries(pl.lessons).forEach(([key, lesson]) => {
      const parts = key.split('|');
      if (parts.length >= 3) {
        const classId = parts[0];
        const dayIdx = parseInt(parts[1], 10);
        const hourIdx = parseInt(parts[2], 10);
        const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
        if (asg) {
          list.push({
            classId,
            dayIdx,
            hourIdx,
            teacherId: asg.teacherId,
            subjectId: asg.subjectId,
            roomId: asg.roomId
          });
        }
      }
    });
    return list;
  }, [pl.lessons, pl.assignments]);

  // --- Calculation: Teacher loads ---
  const teacherStats = useMemo(() => {
    const hoursScheduled: Record<string, number> = {};
    
    // Initialise all teachers to 0
    pl.teachers.forEach(t => {
      hoursScheduled[t.id] = 0;
    });

    scheduledLessonsList.forEach(l => {
      if (l.teacherId && hoursScheduled[l.teacherId] !== undefined) {
        hoursScheduled[l.teacherId] += 1;
      }
    });

    return pl.teachers.map(t => {
      const scheduled = hoursScheduled[t.id] || 0;
      const max = t.maxHours || 18;
      const ratio = max > 0 ? (scheduled / max) * 100 : 0;
      return {
        ...t,
        scheduled,
        max,
        ratio,
        isOverloaded: scheduled > max
      };
    }).sort((a, b) => b.scheduled - a.scheduled);
  }, [pl.teachers, scheduledLessonsList]);

  // --- Calculation: Room Occupancy ---
  const roomStats = useMemo(() => {
    // Theoretical maximum capacity is 5 days * number of timeslots
    const timeslotsCount = hoursList.length || 5;
    const maxCapacity = 5 * timeslotsCount;
    
    const usageCount: Record<string, number> = {};
    pl.rooms.forEach(r => {
      usageCount[r.id] = 0;
    });

    scheduledLessonsList.forEach(l => {
      if (l.roomId && usageCount[l.roomId] !== undefined) {
        usageCount[l.roomId] += 1;
      }
    });

    return pl.rooms.map(r => {
      const count = usageCount[r.id] || 0;
      const ratio = maxCapacity > 0 ? (count / maxCapacity) * 100 : 0;
      return {
        ...r,
        scheduledHours: count,
        capacityMax: maxCapacity,
        ratio
      };
    }).sort((a, b) => b.scheduledHours - a.scheduledHours);
  }, [pl.rooms, scheduledLessonsList, hoursList]);

  // --- Calculation: Subject Distribution ---
  const subjectStats = useMemo(() => {
    const countMap: Record<string, number> = {};
    pl.subjects.forEach(s => {
      countMap[s.id] = 0;
    });

    scheduledLessonsList.forEach(l => {
      if (l.subjectId && countMap[l.subjectId] !== undefined) {
        countMap[l.subjectId] += 1;
      }
    });

    const total = scheduledLessonsList.length || 1;

    return pl.subjects.map(s => {
      const count = countMap[s.id] || 0;
      const ratio = (count / total) * 100;
      return {
        ...s,
        count,
        ratio
      };
    }).sort((a, b) => b.count - a.count);
  }, [pl.subjects, scheduledLessonsList]);

  // --- Calculation: Duties statistics ---
  const teacherDutiesStats = useMemo(() => {
    const countMap: Record<string, number> = {};
    pl.teachers.forEach(t => {
      countMap[t.abbr] = 0;
    });

    Object.values(appState.dyzury.harmonogram).forEach(entry => {
      if (entry && entry.teacherAbbr) {
        // match by abbr
        const abbr = entry.teacherAbbr;
        countMap[abbr] = (countMap[abbr] || 0) + 1;
      }
    });

    const maxPerTeacher = appState.dyzury.settings.maxPerTeacher || 2;

    return pl.teachers.map(t => {
      const count = countMap[t.abbr] || 0;
      return {
        ...t,
        dutiesCount: count,
        limit: maxPerTeacher,
        isOverLimit: count > maxPerTeacher
      };
    }).sort((a, b) => b.dutiesCount - a.dutiesCount);
  }, [pl.teachers, appState.dyzury]);

  // --- Calculation: Schedule Gaps ("Okienka") ---
  const gapsStats = useMemo(() => {
    const classGaps: Array<{ className: string; dayName: string; missingHours: number[] }> = [];
    const teacherGaps: Array<{ teacherName: string; dayName: string; missingHours: number[] }> = [];

    const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

    // 1. Check Classes for gaps
    pl.classes.forEach(c => {
      for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
        // check scheduled hours for this class on this day
        const dayHours: Record<number, boolean> = {};
        let minHour = 999;
        let maxHour = -1;

        hoursList.forEach((_, hIdx) => {
          const key = `${c.id}|${dayIdx}|${hIdx}`;
          const lesson = pl.lessons[key];
          if (lesson) {
            dayHours[hIdx] = true;
            if (hIdx < minHour) minHour = hIdx;
            if (hIdx > maxHour) maxHour = hIdx;
          }
        });

        if (maxHour > minHour) {
          const missing: number[] = [];
          for (let i = minHour + 1; i < maxHour; i++) {
            if (!dayHours[i]) {
              const hourNumber = (pl.hours[i]?.num || (i + 1));
              missing.push(hourNumber);
            }
          }
          if (missing.length > 0) {
            classGaps.push({
              className: c.name,
              dayName: DAYS[dayIdx],
              missingHours: missing
            });
          }
        }
      }
    });

    // 2. Check Teachers for gaps
    pl.teachers.forEach(t => {
      for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
        // Collect scheduled hour indexes for this teacher from pl.lessons
        const teacherDayHours: Record<number, boolean> = {};
        let minHour = 999;
        let maxHour = -1;

        Object.entries(pl.lessons).forEach(([key, lesson]) => {
          const parts = key.split('|');
          const dIdx = parseInt(parts[1], 10);
          const hIdx = parseInt(parts[2], 10);
          
          if (dIdx === dayIdx) {
            const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
            if (asg && asg.teacherId === t.id) {
              teacherDayHours[hIdx] = true;
              if (hIdx < minHour) minHour = hIdx;
              if (hIdx > maxHour) maxHour = hIdx;
            }
          }
        });

        if (maxHour > minHour) {
          const missing: number[] = [];
          for (let i = minHour + 1; i < maxHour; i++) {
            if (!teacherDayHours[i]) {
              const hourNumber = (pl.hours[i]?.num || (i + 1));
              missing.push(hourNumber);
            }
          }
          if (missing.length > 0) {
            teacherGaps.push({
              teacherName: `${t.last} ${t.first} (${t.abbr})`,
              dayName: DAYS[dayIdx],
              missingHours: missing
            });
          }
        }
      }
    });

    return { classGaps, teacherGaps };
  }, [pl.classes, pl.teachers, pl.lessons, pl.assignments, hoursList, pl.hours]);

  // --- General Summary Statistics Metrics ---
  const totalClasses = pl.classes.length;
  const totalTeachers = pl.teachers.length;
  const totalRooms = pl.rooms.length;
  const totalHoursScheduled = scheduledLessonsList.length;
  
  const totalOveloadedTeachers = teacherStats.filter(t => t.isOverloaded).length;
  const totalOverassignedDuties = teacherDutiesStats.filter(t => t.isOverLimit).length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* --- TITLE CARD --- */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={22} className="text-indigo-400" />
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Statystyki & Diagnostyka Szkolna</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Analityka obciążenia kadry, współczynnika obłożenia gabinetów, rozkładu przedmiotów oraz automatyczne wykrywanie okienek w planie lekcji {appState.school.name}.
            </p>
          </div>
          <span className="hidden sm:inline-block bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/20 px-3 py-1.5 rounded-lg text-[10px] uppercase font-mono tracking-wider">
            Plan Lekcji V3
          </span>
        </div>

        {/* --- KPI TILES GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Oddziały</span>
              <span className="text-lg font-black text-slate-900 font-mono">{totalClasses}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Nauczyciele</span>
              <span className="text-lg font-black text-slate-900 font-mono">{totalTeachers}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Gabinety</span>
              <span className="text-lg font-black text-slate-900 font-mono">{totalRooms}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Suma godzin/tydz.</span>
              <span className="text-lg font-black text-slate-900 font-mono">{totalHoursScheduled}</span>
            </div>
          </div>
        </div>

        {/* ——— TAB BUTTONS ——— */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition ${
              activeTab === 'general' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Siatka Ogólna & Przedmioty
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition ${
              activeTab === 'teachers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Praca & Dyżury Kadry ({totalOveloadedTeachers + totalOverassignedDuties} uwagi)
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition ${
              activeTab === 'rooms' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Obłożenie Sal (Gabinety)
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition ${
              activeTab === 'gaps' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Analiza Okienek ({gapsStats.classGaps.length + gapsStats.teacherGaps.length} wykrytych)
          </button>
        </div>

        {/* ======================= TAB: GENERAL CONTENT ======================= */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Subject popularity charts */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Rozkład lekcji według przedmiotów</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Liczba przydzielonych godzin i ich udział procentowy w planie</p>
              </div>

              {totalHoursScheduled === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Brak zarejestrowanych godzin w planie lekcji.</div>
              ) : (
                <div className="space-y-3">
                  {subjectStats.map(sub => {
                    return (
                      <div key={sub.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color || '#ccc' }} />
                            <span className="font-semibold text-slate-700">{sub.name} ({sub.short})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{sub.count} h/tydz. ({sub.ratio.toFixed(1)}%)</span>
                        </div>
                        {/* Custom progress bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all" 
                            style={{ 
                              backgroundColor: sub.color || '#3b82f6',
                              width: `${sub.ratio}%`
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timetable compliance and warnings */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Walidacja & Higiena Planu</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Informacje kontrolne dla dyrektora</p>
              </div>

              <div className="space-y-4 text-xs font-medium text-slate-600">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-black text-slate-800 text-[10px] uppercase block">Dyrektorskie Limity:</span>
                  <p>Maksymalny kontrakt dyżurów: <strong className="text-slate-900">{appState.dyzury.settings.maxPerTeacher}</strong> na osobę.</p>
                  <p>Średni wymiar lekcyjny klasy: <strong className="text-slate-900">{(totalHoursScheduled / (totalClasses || 1)).toFixed(1)} h/tydz.</strong></p>
                </div>

                <div className="space-y-2">
                  <span className="font-black text-slate-800 text-[10px] uppercase block">Status Systemowy:</span>
                  
                  {totalOveloadedTeachers > 0 ? (
                    <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border-l-4 border-amber-500 p-2.5 rounded">
                      <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                      <div>
                        <strong>Nauczyciele przeciążeni: {totalOveloadedTeachers}</strong>
                        <span className="block text-[10px] mt-0.5">W niektórych przydziałach przekroczono zdefiniowane pensum godzin (maxHours).</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border-l-4 border-emerald-500 p-2.5 rounded">
                      <CheckCircle className="shrink-0" size={14} />
                      <span>Brak przeciążeń w pensum kadry!</span>
                    </div>
                  )}

                  {totalOverassignedDuties > 0 ? (
                    <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border-l-4 border-amber-500 p-2.5 rounded">
                      <AlertCircle className="shrink-0 mt-0.5" size={14} />
                      <div>
                        <strong>Przeciążenia dyżurów: {totalOverassignedDuties}</strong>
                        <span className="block text-[10px] mt-0.5">Część nauczycieli ma przypisane więcej dyżurów niż wprowadzony limit.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border-l-4 border-emerald-500 p-2.5 rounded">
                      <CheckCircle className="shrink-0" size={14} />
                      <span>Brak przeciążeń w harmonogramie dyżurów!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: TEACHERS CONTENT ======================= */}
        {activeTab === 'teachers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Lesson Loads */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Wymiar godzin lekcyjnych kadry</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Pensum kontraktowe (maxHours) vs zaplanowane lekcje</p>
              </div>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 divide-y divide-slate-100">
                {teacherStats.map(t => {
                  return (
                    <div key={t.id} className="pt-3 first:pt-0 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-900">{t.last} {t.first} (<span className="font-mono text-blue-600 font-bold">{t.abbr}</span>)</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={`font-bold ${t.isOverloaded ? 'text-red-600' : 'text-slate-900'}`}>{t.scheduled} h</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-500">{t.max} h max</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${t.isOverloaded ? 'bg-red-500' : t.ratio > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(t.ratio, 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-black font-mono w-10 text-right ${t.isOverloaded ? 'text-red-600' : 'text-slate-500'}`}>
                          {t.ratio.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duty Loads */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Obciążenie dyżurami nauczycielskimi</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Rozkład dyżurów na przerwach. Limit: {appState.dyzury.settings.maxPerTeacher} na nauczyciela.</p>
              </div>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 divide-y divide-slate-100">
                {teacherDutiesStats.map(t => {
                  const percent = t.limit > 0 ? (t.dutiesCount / t.limit) * 100 : 0;
                  return (
                    <div key={t.id} className="pt-3 first:pt-0 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-900">{t.last} {t.first} (<span className="font-mono text-purple-600 font-bold">{t.abbr}</span>)</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span className={`font-bold ${t.isOverLimit ? 'text-amber-600' : 'text-slate-900'}`}>{t.dutiesCount} dyżurów</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-400">{t.limit} lmt</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${t.isOverLimit ? 'bg-amber-500' : 'bg-purple-500'}`} 
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-black font-mono w-10 text-right ${t.isOverLimit ? 'text-amber-600 font-extrabold' : 'text-slate-500'}`}>
                          {percent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ======================= TAB: ROOMS CONTENT ======================= */}
        {activeTab === 'rooms' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Poziom eksploatacji gabinetów szkolnych</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wskaźnik wykorzystania sal oparty na 5-dniowej puli godzin lekcyjnych</p>
            </div>

            {roomStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Brak zdefiniowanych sal dla celów diagnostycznych.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomStats.map(room => {
                  return (
                    <div key={room.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="bg-slate-900 text-white font-mono text-[10.5px] font-black px-2 py-0.5 rounded">
                            Sala {room.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            {room.desc || 'Sala lekcyjna'}
                          </span>
                        </div>
                        <div className="mt-3 text-xs flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Użycie tygodniowe:</span>
                          <span className="font-extrabold text-slate-950 font-mono">{room.scheduledHours} / {room.capacityMax} godz.</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                          <span>Wskaźnik obłożenia:</span>
                          <span className={room.ratio > 80 ? 'text-amber-600' : 'text-slate-600'}>{room.ratio.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${room.ratio > 80 ? 'bg-amber-500' : room.ratio > 40 ? 'bg-blue-600' : 'bg-slate-400'}`} 
                            style={{ width: `${room.ratio}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: GAPS CONTENT ======================= */}
        {activeTab === 'gaps' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Class Timetable gaps */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Okienka Lekcyjne Oddziałów (Klasy)</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wykryto {gapsStats.classGaps.length} pustych slotów lekcyjnych rozdzielających lekcje</p>
                </div>
              </div>

              {gapsStats.classGaps.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border-l-4 border-emerald-500">
                  Wszystkie klasy mają ciągłe plany lekcji! Brak wykrytych okienek. Perfect!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-2">
                  {gapsStats.classGaps.map((gap, gIdx) => (
                    <div key={gIdx} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs hover:bg-slate-100 transition">
                      <div className="flex justify-between font-bold text-slate-800 mb-1">
                        <span>Klasa {gap.className}</span>
                        <span className="text-amber-700 font-black">{gap.dayName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Bariera wolnego czasu na lekcjach oznaczonych numerami:{' '}
                        <strong className="text-slate-900 font-mono">
                          {gap.missingHours.join(', ')}
                        </strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher gaps */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-purple-500" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Okienka Lekcyjne Nauczycieli</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wykryto {gapsStats.teacherGaps.length} przestojów między lekcjami w ciągu dnia</p>
                </div>
              </div>

              {gapsStats.teacherGaps.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border-l-4 border-emerald-500">
                  Nauczyciele mają ciągłe i zwięzłe plany lekcji! Brak okienek przestojowych.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-2">
                  {gapsStats.teacherGaps.map((gap, gIdx) => (
                    <div key={gIdx} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs hover:bg-slate-100 transition">
                      <div className="flex justify-between font-bold text-slate-800 mb-1">
                        <span>{gap.teacherName}</span>
                        <span className="text-purple-700 font-black">{gap.dayName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Przerwa lekcyjna (oczekiwanie na lekcję) w slocie o numerze:{' '}
                        <strong className="text-slate-900 font-mono">
                          {gap.missingHours.join(', ')}
                        </strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// Support function inside to avoid import needs
function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
