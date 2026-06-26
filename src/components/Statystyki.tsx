import React, { useMemo, useState } from 'react';
import { AppState, SchedData, AppEventLog, DyzurEntry } from '../types';
import { 
  BarChart, Users, BookOpen, MapPin, Building, Shield, AlertTriangle, AlertCircle, TrendingUp, Info, HelpCircle,
  Clock, History, Search, Trash2, Activity, Camera, Upload, Undo2, Redo2, RotateCcw, RefreshCw, XCircle, ShieldAlert
} from 'lucide-react';

interface StatystykiProps {
  appState: AppState;
  schedData: SchedData;
  historyLogs: AppEventLog[];
  onClearHistoryLogs: () => void;
}

  export default function Statystyki({ appState, schedData, historyLogs = [], onClearHistoryLogs }: StatystykiProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'teachers' | 'rooms' | 'gaps' | 'audit' | 'history'>('audit');
  const [isScanning, setIsScanning] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState<string>('all');

  const pl = appState.planLekcji;
  const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

  const getHourLabel = (hIdx: number) => {
    const h = pl.hours[hIdx];
    return h ? `${h.num}. lekcja (${h.start}-${h.end})` : `${hIdx + 1}. lekcja`;
  };

  const filteredLogs = useMemo(() => {
    return historyLogs.filter(log => {
      if (!log) return false;
      const matchesSearch = 
        log.description.toLowerCase().includes(logSearch.toLowerCase()) || 
        (log.details && log.details.toLowerCase().includes(logSearch.toLowerCase()));
      const matchesType = logFilterType === 'all' || log.actionType === logFilterType;
      return matchesSearch && matchesType;
    });
  }, [historyLogs, logSearch, logFilterType]);

  const getLogIconAndColor = (type: string) => {
    switch (type) {
      case 'restore':
        return { icon: <RotateCcw size={15} className="text-emerald-600" />, bg: 'bg-emerald-100', text: 'Punkt przywracania', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'import':
        return { icon: <Upload size={15} className="text-blue-600" />, bg: 'bg-blue-100', text: 'Import / Kopia', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'reset':
        return { icon: <Trash2 size={15} className="text-red-500" />, bg: 'bg-red-100', text: 'Reset danych', badgeBg: 'bg-red-50 text-red-700 border-red-200' };
      case 'snapshot_create':
        return { icon: <Camera size={15} className="text-emerald-600" />, bg: 'bg-emerald-100', text: 'Utworzenie kopii', badgeBg: 'bg-emerald-50 text-emerald-750 border-emerald-200' };
      case 'snapshot_delete':
        return { icon: <Trash2 size={15} className="text-emerald-600" />, bg: 'bg-emerald-50', text: 'Usunięcie kopii', badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'undo':
        return { icon: <Undo2 size={15} className="text-slate-600" />, bg: 'bg-slate-100', text: 'Cofnij (Undo)', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'redo':
        return { icon: <Redo2 size={15} className="text-slate-600" />, bg: 'bg-slate-100', text: 'Ponów (Redo)', badgeBg: 'bg-slate-100 text-slate-750 border-slate-200' };
      default:
        return { icon: <Activity size={15} className="text-slate-600" />, bg: 'bg-slate-100', text: 'Inne', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

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

  // --- Calculation: Automatic Audit (Automatyczny audyt) ---
  const teacherConflicts = useMemo(() => {
    const conflicts: Array<{
      teacher: { name: string; abbr: string };
      dayIdx: number;
      hourIdx: number;
      lessons: Array<{ className: string; subjectName: string }>;
    }> = [];

    const groups: Record<string, typeof scheduledLessonsList> = {};
    scheduledLessonsList.forEach(l => {
      if (l.teacherId) {
        const key = `${l.teacherId}|${l.dayIdx}|${l.hourIdx}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(l);
      }
    });

    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const uniqueClasses = Array.from(new Set(list.map(l => l.classId)));
        if (uniqueClasses.length > 1) {
          const parts = key.split('|');
          const teacherId = parts[0];
          const dayIdx = parseInt(parts[1], 10);
          const hourIdx = parseInt(parts[2], 10);
          const teacher = teachersMap.get(teacherId);

          conflicts.push({
            teacher: teacher ? { name: `${teacher.first} ${teacher.last}`, abbr: teacher.abbr } : { name: 'Nieznany', abbr: '?' },
            dayIdx,
            hourIdx,
            lessons: list.map(l => {
              const cls = classesMap.get(l.classId);
              const sub = subjectsMap.get(l.subjectId);
              return {
                className: cls ? cls.name : '?',
                subjectName: sub ? sub.name : '?'
              };
            })
          });
        }
      }
    });

    return conflicts;
  }, [scheduledLessonsList, teachersMap, classesMap, subjectsMap]);

  const missingRoomLessons = useMemo(() => {
    const missing: Array<{
      className: string;
      dayIdx: number;
      hourIdx: number;
      subjectName: string;
      teacherAbbr: string;
    }> = [];

    scheduledLessonsList.forEach(l => {
      if (!l.roomId) {
        const cls = classesMap.get(l.classId);
        const sub = subjectsMap.get(l.subjectId);
        const teacher = l.teacherId ? teachersMap.get(l.teacherId) : null;
        missing.push({
          className: cls ? cls.name : '?',
          dayIdx: l.dayIdx,
          hourIdx: l.hourIdx,
          subjectName: sub ? sub.name : '?',
          teacherAbbr: teacher ? teacher.abbr : 'Brak'
        });
      }
    });

    return missing;
  }, [scheduledLessonsList, classesMap, subjectsMap, teachersMap]);

  const overlappingDuties = useMemo(() => {
    const overlaps: Array<{
      teacher: { name: string; abbr: string };
      dayIdx: number;
      breakIdx: number;
      breakName: string;
      places: string[];
    }> = [];

    const groups: Record<string, Array<{ miejsceId: string; entry: DyzurEntry }>> = {};
    
    Object.entries(appState.dyzury.harmonogram).forEach(([key, entry]) => {
      if (entry && entry.teacherAbbr) {
        const parts = key.split('|');
        if (parts.length >= 3) {
          const miejsceId = parts[0];
          const dayIdx = parseInt(parts[1], 10);
          const breakIdx = parseInt(parts[2], 10);

          const groupKey = `${entry.teacherAbbr}|${dayIdx}|${breakIdx}`;
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push({ miejsceId, entry });
        }
      }
    });

    const placesMap = new Map(appState.dyzury.miejsca.map(m => [m.id, m]));

    Object.entries(groups).forEach(([groupKey, list]) => {
      if (list.length > 1) {
        const parts = groupKey.split('|');
        const teacherAbbr = parts[0];
        const dayIdx = parseInt(parts[1], 10);
        const breakIdx = parseInt(parts[2], 10);

        const teacher = pl.teachers.find(t => t.abbr === teacherAbbr);
        const prw = appState.dyzury.przerwy[breakIdx];
        const breakLabel = prw ? `${prw.name} (${prw.start}-${prw.end})` : `Przerwa nr ${breakIdx + 1}`;

        const placeNames = list.map(item => {
          const p = placesMap.get(item.miejsceId);
          return p ? p.name : 'Nieznane miejsce';
        });

        overlaps.push({
          teacher: teacher ? { name: `${teacher.first} ${teacher.last}`, abbr: teacher.abbr } : { name: teacherAbbr, abbr: teacherAbbr },
          dayIdx,
          breakIdx,
          breakName: breakLabel,
          places: placeNames
        });
      }
    });

    return overlaps;
  }, [appState.dyzury, pl.teachers]);

  const classConflicts = useMemo(() => {
    const conflicts: Array<{
      className: string;
      dayIdx: number;
      hourIdx: number;
      lessons: Array<{ subjectName: string; teacherAbbr: string }>;
    }> = [];

    const groups: Record<string, typeof scheduledLessonsList> = {};
    scheduledLessonsList.forEach(l => {
      const key = `${l.classId}|${l.dayIdx}|${l.hourIdx}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });

    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const parts = key.split('|');
        const classId = parts[0];
        const dayIdx = parseInt(parts[1], 10);
        const hourIdx = parseInt(parts[2], 10);
        const cls = classesMap.get(classId);

        conflicts.push({
          className: cls ? cls.name : '?',
          dayIdx,
          hourIdx,
          lessons: list.map(l => {
            const sub = subjectsMap.get(l.subjectId);
            const teacher = l.teacherId ? teachersMap.get(l.teacherId) : null;
            return {
              subjectName: sub ? sub.name : '?',
              teacherAbbr: teacher ? teacher.abbr : 'Brak'
            };
          })
        });
      }
    });

    return conflicts;
  }, [scheduledLessonsList, classesMap, subjectsMap, teachersMap]);

  const roomConflicts = useMemo(() => {
    const conflicts: Array<{
      roomName: string;
      dayIdx: number;
      hourIdx: number;
      lessons: Array<{ className: string; subjectName: string; teacherAbbr: string }>;
    }> = [];

    const groups: Record<string, typeof scheduledLessonsList> = {};
    scheduledLessonsList.forEach(l => {
      if (l.roomId) {
        const key = `${l.roomId}|${l.dayIdx}|${l.hourIdx}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(l);
      }
    });

    Object.entries(groups).forEach(([key, list]) => {
      if (list.length > 1) {
        const parts = key.split('|');
        const roomId = parts[0];
        const dayIdx = parseInt(parts[1], 10);
        const hourIdx = parseInt(parts[2], 10);
        const room = roomsMap.get(roomId);

        conflicts.push({
          roomName: room ? room.name : '?',
          dayIdx,
          hourIdx,
          lessons: list.map(l => {
            const cls = classesMap.get(l.classId);
            const sub = subjectsMap.get(l.subjectId);
            const teacher = l.teacherId ? teachersMap.get(l.teacherId) : null;
            return {
              className: cls ? cls.name : '?',
              subjectName: sub ? sub.name : '?',
              teacherAbbr: teacher ? teacher.abbr : 'Brak'
            };
          })
        });
      }
    });

    return conflicts;
  }, [scheduledLessonsList, roomsMap, classesMap, subjectsMap, teachersMap]);

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
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'audit' ? 'border-red-600 text-red-700 bg-red-50/20 font-extrabold' : 'border-transparent text-slate-500 hover:text-red-650'
            }`}
          >
            🔍 Automatyczny Audyt ({teacherConflicts.length + missingRoomLessons.length + overlappingDuties.length + classConflicts.length + roomConflicts.length})
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === 'general' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Siatka Ogólna & Przedmioty
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === 'teachers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Praca & Dyżury Kadry ({totalOveloadedTeachers + totalOverassignedDuties} uwagi)
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === 'rooms' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Obłożenie Sal (Gabinety)
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === 'gaps' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Analiza Okienek ({gapsStats.classGaps.length + gapsStats.teacherGaps.length} wykrytych)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'history' ? 'border-indigo-600 text-indigo-700 animate-pulse' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History size={13} /> Dziennik Zdarzeń ({historyLogs.length})
          </button>
        </div>

        {/* ======================= TAB: AUTOMATIC AUDIT CONTENT ======================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Header / Control Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="text-red-550" size={18} />
                  Diagnostyka i Audyt Harmonogramu
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Inteligentny silnik analityczny skanuje plan pod kątem konfliktów godzinowych, braków lokalowych oraz błędów w dyżurach.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsScanning(true);
                  setTimeout(() => {
                    setIsScanning(false);
                  }, 600);
                }}
                disabled={isScanning}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer select-none shadow-xs shrink-0"
              >
                <RefreshCw size={14} className={`transition ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Skanowanie...' : 'Skanuj ponownie'}
              </button>
            </div>

            {isScanning ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-red-200 border-t-red-650 rounded-full animate-spin"></div>
                  <Search size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Trwa generowanie raportu audytu</h4>
                  <p className="text-[11px] text-slate-450 uppercase font-black tracking-widest font-mono">Przetwarzanie reguł poprawności...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Audit summary message */}
                {(teacherConflicts.length + missingRoomLessons.length + overlappingDuties.length + classConflicts.length + roomConflicts.length) === 0 ? (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
                    <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-2xl shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Brak wykrytych konfliktów!</h4>
                      <p className="text-xs text-emerald-750 font-medium leading-relaxed">
                        Gratulacje! Twój plan lekcji jest w pełni spójny i wolny od błędów. Wszyscy nauczyciele uczą tylko w jednym miejscu naraz, każda zaplanowana lekcja ma przydzielony gabinet, a dyżury nauczycieli nie nakładają się na siebie.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50/60 border border-red-200 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
                    <div className="p-3 bg-red-100 text-red-750 rounded-2xl shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-black text-red-950 uppercase tracking-wider">Wykryto niespójności w harmonogramie</h4>
                      <p className="text-xs text-red-800 font-medium leading-relaxed">
                        Znaleziono łącznie <strong className="font-extrabold">{teacherConflicts.length + missingRoomLessons.length + overlappingDuties.length + classConflicts.length + roomConflicts.length} błędy/ów</strong>, które wymagają Twojej uwagi w celu zapewnienia prawidłowego funkcjonowania szkoły.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {teacherConflicts.length > 0 && (
                          <span className="bg-red-100 text-red-800 font-bold font-mono px-2.5 py-1 rounded-md text-[10px] uppercase">
                            Nauczyciele: {teacherConflicts.length}
                          </span>
                        )}
                        {overlappingDuties.length > 0 && (
                          <span className="bg-amber-100 text-amber-950 font-bold font-mono px-2.5 py-1 rounded-md text-[10px] uppercase">
                            Nakładające się dyżury: {overlappingDuties.length}
                          </span>
                        )}
                        {missingRoomLessons.length > 0 && (
                          <span className="bg-blue-100 text-blue-800 font-bold font-mono px-2.5 py-1 rounded-md text-[10px] uppercase">
                            Klasy bez sali: {missingRoomLessons.length}
                          </span>
                        )}
                        {classConflicts.length > 0 && (
                          <span className="bg-orange-100 text-orange-950 font-bold font-mono px-2.5 py-1 rounded-md text-[10px] uppercase">
                            Klasy w dwóch miejscach: {classConflicts.length}
                          </span>
                        )}
                        {roomConflicts.length > 0 && (
                          <span className="bg-purple-100 text-purple-950 font-bold font-mono px-2.5 py-1 rounded-md text-[10px] uppercase">
                            Zajęte sale: {roomConflicts.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Grid Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* SECTION 1: TEACHER IN TWO PLACES */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={14} className="text-red-500" />
                          Nauczyciel w dwóch miejscach naraz
                        </h4>
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${teacherConflicts.length > 0 ? 'bg-red-100 text-red-805' : 'bg-emerald-100 text-emerald-800'}`}>
                          {teacherConflicts.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                        Sytuacje, w których ten sam nauczyciel ma zaplanowane zajęcia z różnymi klasami w tej samej godzinie lekcyjnej
                      </p>
                    </div>

                    {teacherConflicts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium italic">
                        Brak konfliktów. Wszyscy nauczyciele prowadzą maksymalnie jedną lekcję naraz.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {teacherConflicts.map((conf, idx) => (
                          <div key={idx} className="bg-red-50/40 border border-red-200/60 p-3.5 rounded-xl text-xs space-y-2">
                            <div className="flex justify-between items-center font-bold text-slate-900">
                              <span className="text-red-900 font-extrabold">
                                {conf.teacher.name} ({conf.teacher.abbr})
                              </span>
                              <span className="bg-red-100 text-red-950 font-mono font-black px-2 py-0.5 rounded text-[9.5px]">
                                {DAYS[conf.dayIdx]}, {getHourLabel(conf.hourIdx)}
                              </span>
                            </div>
                            <div className="border-t border-red-100 pt-2 text-[11px] text-slate-600 space-y-1">
                              <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-1">Nakładające się zajęcia:</p>
                              {conf.lessons.map((les, lidx) => (
                                <div key={lidx} className="flex justify-between items-center bg-white border border-red-100 rounded p-1.5">
                                  <span className="font-extrabold text-slate-800">Klasa {les.className}</span>
                                  <span className="text-slate-500 italic font-medium">{les.subjectName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: OVERLAPPING DUTIES */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield size={14} className="text-amber-500" />
                          Nakładające się dyżury
                        </h4>
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${overlappingDuties.length > 0 ? 'bg-amber-100 text-amber-950' : 'bg-emerald-100 text-emerald-800'}`}>
                          {overlappingDuties.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                        Konflikty polegające na przypisaniu nauczycielowi wielu dyżurów w różnych miejscach na tej samej przerwie
                      </p>
                    </div>

                    {overlappingDuties.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium italic">
                        Brak konfliktów dyżurów. Każdy nauczyciel ma maksymalnie jedno miejsce dyżurowania na danej przerwie.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {overlappingDuties.map((conf, idx) => (
                          <div key={idx} className="bg-amber-50/30 border border-amber-200/50 p-3.5 rounded-xl text-xs space-y-2">
                            <div className="flex justify-between items-center font-bold text-slate-900">
                              <span className="text-amber-900 font-extrabold">
                                {conf.teacher.name} ({conf.teacher.abbr})
                              </span>
                              <span className="bg-amber-100 text-amber-950 font-mono font-black px-2 py-0.5 rounded text-[9.5px]">
                                {DAYS[conf.dayIdx]}, {conf.breakName}
                              </span>
                            </div>
                            <div className="border-t border-amber-100 pt-2 text-[11px] text-slate-600 space-y-1">
                              <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-1">Kolidujące miejsca dyżurowania:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {conf.places.map((place, pidx) => (
                                  <span key={pidx} className="bg-white border border-amber-150 px-2 py-1 rounded font-bold text-amber-950">
                                    📍 {place}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: CLASS WITHOUT ROOM */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin size={14} className="text-blue-500" />
                          Lekcje klas bez przypisanej sali
                        </h4>
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${missingRoomLessons.length > 0 ? 'bg-blue-100 text-blue-805' : 'bg-emerald-100 text-emerald-800'}`}>
                          {missingRoomLessons.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                        Sytuacje, w których zaplanowano zajęcia lekcyjne, ale nie przydzielono im żadnego gabinetu (Etap 2)
                      </p>
                    </div>

                    {missingRoomLessons.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium italic">
                        Brak brakujących sal. Każda zaplanowana lekcja ma swój gabinet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {missingRoomLessons.map((m, idx) => (
                          <div key={idx} className="bg-blue-50/40 border border-blue-100 p-3 rounded-xl text-xs flex justify-between items-center">
                            <div>
                              <div className="font-extrabold text-slate-900">
                                Klasa <span className="text-blue-750">{m.className}</span> — {m.subjectName}
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase mt-0.5">
                                Nauczyciel: {m.teacherAbbr}
                              </span>
                            </div>
                            <span className="bg-blue-100 text-blue-900 font-mono font-black px-2 py-0.5 rounded text-[9px] shrink-0">
                              {DAYS[m.dayIdx]}, lekcja {m.hourIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: CLASS IN TWO PLACES (EXTRA VALUE) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-orange-500" />
                          Klasa w dwóch miejscach naraz
                        </h4>
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${classConflicts.length > 0 ? 'bg-orange-100 text-orange-950' : 'bg-emerald-100 text-emerald-800'}`}>
                          {classConflicts.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                        Wykryte błędy, w których jedna klasa ma zaplanowane kilka zajęć w tym samym czasie
                      </p>
                    </div>

                    {classConflicts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium italic">
                        Brak konfliktów klasowych. Żadna klasa nie ma nałożonych lekcji.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {classConflicts.map((conf, idx) => (
                          <div key={idx} className="bg-orange-50/40 border border-orange-200/50 p-3.5 rounded-xl text-xs space-y-2">
                            <div className="flex justify-between items-center font-bold text-slate-900">
                              <span className="text-orange-900 font-extrabold">
                                Klasa {conf.className}
                              </span>
                              <span className="bg-orange-100 text-orange-950 font-mono font-black px-2 py-0.5 rounded text-[9.5px]">
                                {DAYS[conf.dayIdx]}, {getHourLabel(conf.hourIdx)}
                              </span>
                            </div>
                            <div className="border-t border-orange-100 pt-2 text-[11px] text-slate-600 space-y-1">
                              <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mb-1">Nałożone lekcje:</p>
                              {conf.lessons.map((les, lidx) => (
                                <div key={lidx} className="flex justify-between items-center bg-white border border-orange-100 rounded p-1.5">
                                  <span className="font-extrabold text-slate-850">{les.subjectName}</span>
                                  <span className="text-slate-500 font-bold font-mono">Nauczyciel: {les.teacherAbbr}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: ROOM DOUBLE BOOKED (EXTRA VALUE) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4 lg:col-span-2">
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Building size={14} className="text-purple-500" />
                          Sala lekcyjna zajęta przez wiele lekcji naraz
                        </h4>
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${roomConflicts.length > 0 ? 'bg-purple-100 text-purple-950' : 'bg-emerald-100 text-emerald-800'}`}>
                          {roomConflicts.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">
                        Sytuacje podwójnego obłożenia, gdzie ta sama sala została przydzielona dwóm lub więcej klasom w tej samej godzinie lekcyjnej
                      </p>
                    </div>

                    {roomConflicts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium italic">
                        Brak konfliktów sal. Żaden gabinet nie jest zajęty przez więcej niż jedną klasę w tym samym czasie.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {roomConflicts.map((conf, idx) => (
                          <div key={idx} className="bg-purple-50/40 border border-purple-200/50 p-3.5 rounded-xl text-xs space-y-2">
                            <div className="flex justify-between items-center font-bold text-slate-900">
                              <span className="text-purple-950 font-black">
                                🏫 Sala {conf.roomName}
                              </span>
                              <span className="bg-purple-100 text-purple-950 font-mono font-black px-2 py-0.5 rounded text-[9.5px]">
                                {DAYS[conf.dayIdx]}, {getHourLabel(conf.hourIdx)}
                              </span>
                            </div>
                            <div className="border-t border-purple-100 pt-2 text-[11px] text-slate-600 space-y-1">
                              <p className="font-semibold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Lekcje zaplanowane w tej sali:</p>
                              {conf.lessons.map((les, lidx) => (
                                <div key={lidx} className="flex justify-between items-center bg-white border border-purple-100 rounded p-1.5">
                                  <span className="font-extrabold text-slate-800">Klasa {les.className}</span>
                                  <span className="text-slate-500 italic">{les.subjectName} ({les.teacherAbbr})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}
          </div>
        )}

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

        {/* ======================= TAB: HISTORY LOG CONTENT ======================= */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 select-none">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={15} className="text-indigo-600 animate-spin-slow" />
                  Dziennik Zdarzeń Systemowych
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Monitorowanie zmian, przywracania stanu i operacji na danych aplikacji
                </p>
              </div>

              {historyLogs.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Czy na pewno chcesz bezpowrotnie wyczyścić cały dziennik zdarzeń?')) {
                      onClearHistoryLogs();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold border border-red-200 hover:border-red-300 rounded-xl text-[10.5px] uppercase tracking-wide cursor-pointer transition select-none"
                >
                  <Trash2 size={12} />
                  Wyczyść dziennik
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Filtruj zdarzenia i opisy..."
                  className="w-full bg-slate-55 border border-slate-250 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 transition"
                />
              </div>

              <div className="w-full sm:w-56 shrink-0">
                <select
                  value={logFilterType}
                  onChange={e => setLogFilterType(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-250 rounded-xl py-2 px-3.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 cursor-pointer transition"
                >
                  <option value="all">Wszystkie rodzaje zdarzeń</option>
                  <option value="restore">Przywracanie stanu (Restore)</option>
                  <option value="import">Import planu / plików</option>
                  <option value="reset">Resety konfiguracji</option>
                  <option value="snapshot_create">Tworzenie snapshotów</option>
                  <option value="snapshot_delete">Usuwanie snapshotów</option>
                  <option value="undo">Cofanie zmian (Undo)</option>
                  <option value="redo">Ponawianie zmian (Redo)</option>
                  <option value="other">Inne operacje</option>
                </select>
              </div>
            </div>

            {/* List area */}
            {filteredLogs.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                <History size={36} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-bold select-none">Brak wpisów spełniających kryteria</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Wykonaj jakąś operację (np. undo/redo, zmiana planu, snapshot) lub zmień filtry.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredLogs.map(log => {
                  const meta = getLogIconAndColor(log.actionType);
                  const logDate = new Date(log.timestamp);
                  return (
                    <div 
                      key={log.id} 
                      className="border border-slate-200/85 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50 p-4 rounded-xl flex items-start gap-3.5 transition"
                    >
                      {/* Left icon badge */}
                      <div className={`p-2.5 rounded-xl ${meta.bg} shrink-0`}>
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-extrabold text-xs text-slate-900 leading-tight">
                            {log.description}
                          </span>
                          
                          {/* Beautiful Date & Time Badge */}
                          <div className="text-[10px] text-slate-400 font-semibold font-mono flex items-center gap-1 shrink-0">
                            <Clock size={10} />
                            {logDate.toLocaleDateString('pl-PL')} o {logDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>

                        {log.details && (
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-100/50 p-2 border border-slate-100 rounded-lg">
                            {log.details}
                          </p>
                        )}
                      </div>

                      {/* Right tag badge */}
                      <span className={`hidden sm:inline-block font-mono font-bold text-[9px] uppercase tracking-wider px-2 py-1 rounded-md border ${meta.badgeBg} shrink-0 align-middle`}>
                        {meta.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
