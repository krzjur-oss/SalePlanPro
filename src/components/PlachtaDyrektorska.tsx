import React, { useState, useMemo, useRef } from 'react';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom, SchoolGroup, SchedCell, PlanVariant } from '../types';
import { 
  Printer, ZoomIn, ZoomOut, Maximize2, Minimize2, Check, Sliders, Filter,
  FileSpreadsheet, ArrowLeft, Calendar, User, MapPin, Layers, Award, Sparkles, X, Eye, FileText
} from 'lucide-react';
import { flattenColumns as localFlattenColumns, colKey as localColKey, cleanFloorName as localCleanFloorName } from '../utils';

export interface PlachtaDyrektorskaProps {
  appState: AppState;
  schedData: SchedData;
  activeVariant?: PlanVariant | null;
  onClose?: () => void;
  isStandaloneModal?: boolean;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const DAYS_SHORT = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt'];

// Distinctive color palettes for subject categories in print view
const getSubjectCategoryColor = (subjectName: string = '', shortName: string = '', isMono: boolean = false) => {
  if (isMono) return { bg: '#ffffff', text: '#000000', border: '#cbd5e1' };
  
  const s = (subjectName + ' ' + shortName).toLowerCase();
  
  // Humanities: polski, historia, wos, filozofia, etyka, religia
  if (s.includes('pol') || s.includes('hist') || s.includes('wos') || s.includes('filoz') || s.includes('etyk') || s.includes('relig')) {
    return { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' }; // Rose
  }
  // Math & Sciences: mat, fiz, chem, bio, geo, przyr
  if (s.includes('mat') || s.includes('fiz') || s.includes('chem') || s.includes('bio') || s.includes('geo') || s.includes('przyr')) {
    return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }; // Blue
  }
  // Foreign Languages: ang, niem, hiszp, fran, ros, wł
  if (s.includes('ang') || s.includes('niem') || s.includes('hiszp') || s.includes('fran') || s.includes('ros') || s.includes('język') || s.includes('jezyk')) {
    return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }; // Green
  }
  // PE & Sports: wf, basen, gimn, sport
  if (s.includes('wf') || s.includes('wych. fiz') || s.includes('basen') || s.includes('gimn') || s.includes('sport')) {
    return { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' }; // Purple
  }
  // IT & Tech: inf, ti, tech, robot
  if (s.includes('inf') || s.includes('ti') || s.includes('tech') || s.includes('komp') || s.includes('robot')) {
    return { bg: '#ecfeff', text: '#155e75', border: '#a5f3fc' }; // Cyan
  }
  // Arts & Music: muz, plas, sztuk
  if (s.includes('muz') || s.includes('plas') || s.includes('sztuk') || s.includes('art')) {
    return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' }; // Amber
  }
  // Special / Support / Reval: rewa, terap, wsp, logop, psych, pedag
  if (s.includes('rewa') || s.includes('terap') || s.includes('wsp') || s.includes('logop') || s.includes('psych') || s.includes('pedag')) {
    return { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' }; // Pink
  }
  // General fallback
  return { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' }; // Slate
};

export default function PlachtaDyrektorska({
  appState,
  schedData,
  activeVariant,
  onClose,
  isStandaloneModal = false
}: PlachtaDyrektorskaProps) {
  const pl = appState.planLekcji;

  // View configuration states
  const [matrixType, setMatrixType] = useState<'classes' | 'teachers' | 'rooms'>('classes');
  const [scheduleVersion, setScheduleVersion] = useState<'etap1' | 'etap2'>(() => {
    const yk = appState.yearKey || 'default';
    const yearObj = schedData[yk];
    if (yearObj && typeof yearObj === 'object') {
      const hasAnyOccupiedSlots = Object.values(yearObj).some(dayObj => 
        dayObj && typeof dayObj === 'object' && Object.values(dayObj).some(hourObj => 
          hourObj && typeof hourObj === 'object' && Object.keys(hourObj).length > 0
        )
      );
      if (hasAnyOccupiedSlots) return 'etap2';
    }
    return 'etap1';
  });

  // Print paper format & sizing
  const [paperFormat, setPaperFormat] = useState<'A3' | 'A2' | 'A4'>('A3');
  const [cellDensity, setCellDensity] = useState<'compact' | 'normal' | 'large'>('compact');
  const [colorMode, setColorMode] = useState<'color' | 'mono'>('color');
  
  // Element visibility toggles
  const [showTeacherAbbr, setShowTeacherAbbr] = useState(true);
  const [showRoomNum, setShowRoomNum] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showStatsHeader, setShowStatsHeader] = useState(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [selectedClassStage, setSelectedClassStage] = useState<string>('all'); // all, 1-3, 4-8, LO/Technikum

  // Screen preview Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Maps for fast lookups
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);
  const groupsMap = useMemo(() => new Map((pl.schoolGroups || []).map(g => [g.id, g])), [pl.schoolGroups]);

  // Hours list resolved from pl.hours or appState defaults
  const hoursList = useMemo(() => {
    if (pl.hours && pl.hours.length > 0) {
      return [...pl.hours].sort((a, b) => a.num - b.num);
    }
    return [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:55', end: '11:40' },
      { num: 5, start: '11:50', end: '12:35' },
      { num: 6, start: '12:55', end: '13:40' },
      { num: 7, start: '13:50', end: '14:35' },
      { num: 8, start: '14:45', end: '15:30' }
    ];
  }, [pl.hours]);

  // Days to display
  const daysToDisplay = useMemo(() => {
    if (selectedDayFilter === 'all') {
      return [0, 1, 2, 3, 4];
    }
    return [selectedDayFilter];
  }, [selectedDayFilter]);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    let list = [...pl.classes];
    if (selectedClassStage === '1-3') {
      list = list.filter(c => /^[1-3]/i.test(c.name.trim()));
    } else if (selectedClassStage === '4-8') {
      list = list.filter(c => /^[4-8]/i.test(c.name.trim()));
    } else if (selectedClassStage === 'lo_tech') {
      list = list.filter(c => !/^[1-8]/i.test(c.name.trim()) || c.name.toLowerCase().includes('lo') || c.name.toLowerCase().includes('t'));
    }
    return list;
  }, [pl.classes, selectedClassStage]);

  // Filtered teachers list (active and sorted by last name)
  const filteredTeachers = useMemo(() => {
    return [...pl.teachers].filter(t => !t.inactive).sort((a, b) => 
      (a.last || '').localeCompare(b.last || '', 'pl', { sensitivity: 'base' })
    );
  }, [pl.teachers]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return [...pl.rooms].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'pl', { numeric: true, sensitivity: 'base' })
    );
  }, [pl.rooms]);

  // Etap 2 Room key resolver
  const flatColumns = useMemo(() => {
    return localFlattenColumns(appState.floors || []);
  }, [appState.floors]);

  const resolveRoomFromColKey = useMemo(() => {
    const cache = new Map<string, string>();
    flatColumns.forEach(c => {
      const ck = localColKey({
        floorIdx: c.floorIdx,
        segIdx: c.segIdx,
        room: c.room,
        roomIdx: c.roomIdx
      });
      cache.set(ck, c.room.name || c.room.num || 'Sala');
    });
    return (ck: string) => cache.get(ck) || '';
  }, [flatColumns]);

  // Compiled Etap 2 schedule matrix: [type][entityId][dayIdx][hourKey] = SchedCell[]
  const etap2Schedule = useMemo(() => {
    const yearKey = appState.yearKey || 'default';
    const yearData = schedData[yearKey] || {};
    const classMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const teacherMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const roomMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};

    Object.entries(yearData).forEach(([dayStr, hoursData]) => {
      const dayIdx = parseInt(dayStr, 10);
      if (isNaN(dayIdx)) return;
      Object.entries(hoursData || {}).forEach(([hourKey, cells]) => {
        Object.entries(cells || {}).forEach(([colKeyStr, cellVal]) => {
          const cellList = Array.isArray(cellVal) ? cellVal : [cellVal];
          cellList.forEach(cell => {
            if (!cell) return;
            const actualRoomName = resolveRoomFromColKey(colKeyStr);

            // By class
            if (cell.classes && cell.classes.length > 0) {
              cell.classes.forEach(clsName => {
                const clsId = pl.classes.find(c => c.name === clsName)?.id || clsName;
                if (!classMap[clsId]) classMap[clsId] = {};
                if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
                if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
                classMap[clsId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
              });
            } else if (cell.className) {
              const clsId = pl.classes.find(c => c.name === cell.className)?.id || cell.className;
              if (!classMap[clsId]) classMap[clsId] = {};
              if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
              if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
              classMap[clsId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
            }

            // By teacher
            if (cell.teacherAbbr) {
              const teacherId = pl.teachers.find(t => t.abbr === cell.teacherAbbr)?.id || cell.teacherAbbr;
              if (!teacherMap[teacherId]) teacherMap[teacherId] = {};
              if (!teacherMap[teacherId][dayIdx]) teacherMap[teacherId][dayIdx] = {};
              if (!teacherMap[teacherId][dayIdx][hourKey]) teacherMap[teacherId][dayIdx][hourKey] = [];
              teacherMap[teacherId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
            }

            // By room
            if (actualRoomName) {
              const roomId = pl.rooms.find(r => r.name === actualRoomName)?.id || actualRoomName;
              if (!roomMap[roomId]) roomMap[roomId] = {};
              if (!roomMap[roomId][dayIdx]) roomMap[roomId][dayIdx] = {};
              if (!roomMap[roomId][dayIdx][hourKey]) roomMap[roomId][dayIdx][hourKey] = [];
              roomMap[roomId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
            }
          });
        });
      });
    });

    return { classes: classMap, teachers: teacherMap, rooms: roomMap };
  }, [schedData, appState.yearKey, pl.classes, pl.teachers, pl.rooms, resolveRoomFromColKey]);

  // Helper to extract lesson cell contents for a given entity, day, hour
  const getCellEntries = (
    entityId: string,
    dayIdx: number,
    hourNum: number,
    hIdx: number
  ): Array<{
    subjectName: string;
    subjectShort: string;
    teacherAbbr: string;
    roomName: string;
    groupLabel?: string;
    fullClsName?: string;
  }> => {
    const results: Array<{
      subjectName: string;
      subjectShort: string;
      teacherAbbr: string;
      roomName: string;
      groupLabel?: string;
      fullClsName?: string;
    }> = [];

    if (matrixType === 'classes') {
      const cls = classesMap.get(entityId);
      if (!cls) return results;

      if (scheduleVersion === 'etap1') {
        // Etap 1: Scan pl.lessons
        Object.entries(pl.lessons || {}).forEach(([k, lesson]) => {
          const parts = k.split('|');
          if (parts[0] === cls.id && parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
            const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
            if (asg) {
              const subj = subjectsMap.get(asg.subjectId);
              const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
              const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
              const grp = asg.groupId ? groupsMap.get(asg.groupId) : null;
              results.push({
                subjectName: subj?.name || 'Przedmiot',
                subjectShort: subj?.short || subj?.name?.substring(0, 3)?.toUpperCase() || 'PRZ',
                teacherAbbr: teacher?.abbr || '',
                roomName: room?.name || '',
                groupLabel: grp ? grp.name : undefined
              });
            }
          }
        });
      } else {
        // Etap 2
        const cells = etap2Schedule.classes[cls.id]?.[dayIdx]?.[String(hourNum)] || [];
        cells.forEach(c => {
          results.push({
            subjectName: c.subject,
            subjectShort: c.subject.length > 5 ? c.subject.substring(0, 4) : c.subject,
            teacherAbbr: c.teacherAbbr || '',
            roomName: c.note || '',
            groupLabel: c.note?.includes('gr') ? c.note : undefined
          });
        });
      }
    } else if (matrixType === 'teachers') {
      const teacher = teachersMap.get(entityId);
      if (!teacher) return results;

      if (scheduleVersion === 'etap1') {
        Object.entries(pl.lessons || {}).forEach(([k, lesson]) => {
          const parts = k.split('|');
          if (parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
            const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
            if (asg && asg.teacherId === teacher.id) {
              const cls = classesMap.get(asg.classId);
              const subj = subjectsMap.get(asg.subjectId);
              const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
              const grp = asg.groupId ? groupsMap.get(asg.groupId) : null;
              results.push({
                subjectName: subj?.name || 'Przedmiot',
                subjectShort: subj?.short || subj?.name?.substring(0, 3)?.toUpperCase() || 'PRZ',
                teacherAbbr: teacher.abbr,
                roomName: room?.name || '',
                groupLabel: grp ? grp.name : undefined,
                fullClsName: cls?.name || asg.classId
              });
            }
          }
        });
      } else {
        const cells = etap2Schedule.teachers[teacher.id]?.[dayIdx]?.[String(hourNum)] || [];
        cells.forEach(c => {
          results.push({
            subjectName: c.subject,
            subjectShort: c.subject.length > 5 ? c.subject.substring(0, 4) : c.subject,
            teacherAbbr: teacher.abbr,
            roomName: c.note || '',
            fullClsName: c.className || c.classes?.join('+') || ''
          });
        });
      }
    } else if (matrixType === 'rooms') {
      const room = roomsMap.get(entityId);
      if (!room) return results;

      if (scheduleVersion === 'etap1') {
        Object.entries(pl.lessons || {}).forEach(([k, lesson]) => {
          const parts = k.split('|');
          if (parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
            const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
            if (asg && asg.roomId === room.id) {
              const cls = classesMap.get(asg.classId);
              const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
              const subj = subjectsMap.get(asg.subjectId);
              results.push({
                subjectName: subj?.name || 'Przedmiot',
                subjectShort: subj?.short || subj?.name?.substring(0, 3)?.toUpperCase() || 'PRZ',
                teacherAbbr: teacher?.abbr || '',
                roomName: room.name,
                fullClsName: cls?.name || asg.classId
              });
            }
          }
        });
      } else {
        const cells = etap2Schedule.rooms[room.id]?.[dayIdx]?.[String(hourNum)] || [];
        cells.forEach(c => {
          results.push({
            subjectName: c.subject,
            subjectShort: c.subject.length > 5 ? c.subject.substring(0, 4) : c.subject,
            teacherAbbr: c.teacherAbbr || '',
            roomName: room.name,
            fullClsName: c.className || c.classes?.join('+') || ''
          });
        });
      }
    }

    return results;
  };

  // Font and sizing styles based on paperFormat and cellDensity
  const densityConfig = useMemo(() => {
    switch (cellDensity) {
      case 'compact':
        return {
          headerText: 'text-[9.5px]',
          cellText: 'text-[8.5px]',
          subText: 'text-[7px]',
          padding: 'p-1',
          minWidth: paperFormat === 'A2' ? 'min-w-[55px]' : 'min-w-[42px]',
          height: 'min-h-[28px]'
        };
      case 'large':
        return {
          headerText: 'text-[12px]',
          cellText: 'text-[11px]',
          subText: 'text-[9px]',
          padding: 'p-2',
          minWidth: 'min-w-[70px]',
          height: 'min-h-[46px]'
        };
      case 'normal':
      default:
        return {
          headerText: 'text-[10.5px]',
          cellText: 'text-[9.5px]',
          subText: 'text-[8px]',
          padding: 'p-1.5',
          minWidth: 'min-w-[50px]',
          height: 'min-h-[34px]'
        };
    }
  }, [cellDensity, paperFormat]);

  // Execute system print
  const handlePrint = () => {
    window.print();
  };

  // Current entity columns
  const activeEntities = useMemo(() => {
    if (matrixType === 'classes') return filteredClasses;
    if (matrixType === 'teachers') return filteredTeachers;
    return filteredRooms;
  }, [matrixType, filteredClasses, filteredTeachers, filteredRooms]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden select-none print:bg-white print:overflow-visible">
      
      {/* ── CSS PRINT STYLESHEET SPECIFIC FOR A3 / A2 / A4 LARGE FORMAT ── */}
      <style>{`
        @page {
          size: ${paperFormat === 'A2' ? 'A2 landscape' : paperFormat === 'A3' ? 'A3 landscape' : 'A4 landscape'};
          margin: ${paperFormat === 'A2' ? '6mm' : paperFormat === 'A3' ? '5mm' : '4mm'};
        }

        @media print {
          /* Hide app navigation, headers, toasts, and non-print controls */
          header, footer, nav, .no-print, #restoring-pointer-blocker, #version-changelog-toast {
            display: none !important;
          }

          ${isStandaloneModal ? `
          /* When Plachta is rendered as a standalone modal overlay, completely hide the background workspace (e.g. Kreator, Plan Klas) */
          #app-main-workspace {
            display: none !important;
          }
          ` : ''}

          /* Force full width and natural document flow for Plachta container */
          html, body, #root, #plachta-modal-root {
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }

          .plachta-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
          }

          table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          th, td {
            border: 1px solid #334155 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-border-thick {
            border-bottom: 2px solid #0f172a !important;
          }
        }
      `}</style>

      {/* ── CONTROL TOOLBAR (SCREEN ONLY) ── */}
      <div className="no-print bg-slate-900 text-white border-b border-slate-950 px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 z-30 shadow-md">
        
        {/* Left: Title & Matrix selector */}
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Wróć do poprzedniego widoku"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 leading-none">
                <span>Płachta Dyrektorska</span>
                <span className="bg-indigo-500/25 border border-indigo-400/30 text-indigo-300 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                  {paperFormat} Poziomo
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                Wielkoformatowy arkusz zbiorczy całej szkoły ({activeEntities.length} kolumn)
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden md:block" />

          {/* Matrix Type Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMatrixType('classes')}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                matrixType === 'classes' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Oddziały (Klasy)
            </button>
            <button
              type="button"
              onClick={() => setMatrixType('teachers')}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                matrixType === 'teachers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nauczyciele
            </button>
            <button
              type="button"
              onClick={() => setMatrixType('rooms')}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                matrixType === 'rooms' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gabinety (Sale)
            </button>
          </div>
        </div>

        {/* Center: Format, Density & Schedule version */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase">Arkusz:</span>
            {(['A3', 'A2', 'A4'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setPaperFormat(fmt)}
                className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                  paperFormat === fmt ? 'bg-slate-800 text-amber-400 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Density selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase">Gęstość:</span>
            <button
              type="button"
              onClick={() => setCellDensity('compact')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                cellDensity === 'compact' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gęsty
            </button>
            <button
              type="button"
              onClick={() => setCellDensity('normal')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                cellDensity === 'normal' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Średni
            </button>
          </div>

          {/* Color Mode */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setColorMode('color')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                colorMode === 'color' ? 'bg-slate-800 text-emerald-400 font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Kolorowe tła przedmiotów"
            >
              Kolor
            </button>
            <button
              type="button"
              onClick={() => setColorMode('mono')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                colorMode === 'mono' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Czarno-biały do kserokopiarki"
            >
              B&W
            </button>
          </div>

          {/* Etap version */}
          <select
            value={scheduleVersion}
            onChange={e => setScheduleVersion(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl px-2.5 py-1 outline-none"
          >
            <option value="etap1">Etap 1: Plan Klas (Siatka)</option>
            <option value="etap2">Etap 2: Plan Sal (Gabinety)</option>
          </select>
        </div>

        {/* Right: Zoom & Print action */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Oddal podgląd"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono font-bold text-[10px] px-1.5 w-10 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Przybliż podgląd"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="text-[9px] font-bold px-1.5 py-0.5 text-slate-400 hover:text-white transition"
              title="Resetuj zoom do 100%"
            >
              1:1
            </button>
          </div>

          {/* Primary Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition shadow-md cursor-pointer border border-emerald-500/50"
            title="Drukuj arkusz lub zapisz do PDF (A3 / A2 / A4)"
          >
            <Printer size={15} />
            <span>Drukuj Płachtę ({paperFormat})</span>
          </button>
        </div>
      </div>

      {/* ── SUB-BAR: TOGGLES & FILTERS (SCREEN ONLY) ── */}
      <div className="no-print bg-slate-850 text-slate-300 border-b border-slate-800/80 px-4 py-1.5 shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Toggle options */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Zawartość komórek:</span>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showTeacherAbbr}
              onChange={e => setShowTeacherAbbr(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Nauczyciel (skrót)</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showRoomNum}
              onChange={e => setShowRoomNum(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Numer Sali</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={e => setShowLegend(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Słowniczek Kadr (Legenda)</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showSignatures}
              onChange={e => setShowSignatures(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Pieczęć Dyrektora</span>
          </label>
        </div>

        {/* Day & Stage filter */}
        <div className="flex items-center gap-2">
          {matrixType === 'classes' && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold">Rocznik:</span>
              <select
                value={selectedClassStage}
                onChange={e => setSelectedClassStage(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-none"
              >
                <option value="all">Wszystkie oddziały ({pl.classes.length})</option>
                <option value="1-3">Klasy 1–3</option>
                <option value="4-8">Klasy 4–8</option>
                <option value="lo_tech">Szkoły ponadpodstawowe</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-bold">Dni:</span>
            <select
              value={selectedDayFilter}
              onChange={e => setSelectedDayFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-none"
            >
              <option value="all">Wszystkie 5 dni (Pn–Pt)</option>
              {DAYS_NAMES.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── MAIN SCROLLABLE PREVIEW CANVAS ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 print:p-0 bg-slate-200/70 print:bg-white flex justify-center">
        
        <div 
          className="plachta-container bg-white shadow-2xl rounded-xl print:rounded-none print:shadow-none border border-slate-300 print:border-none p-6 print:p-0 transition-transform origin-top"
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            width: paperFormat === 'A2' ? '1600px' : paperFormat === 'A3' ? '1350px' : '1080px'
          }}
        >
          {/* ── SHEET HEADER ── */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                  PŁACHTA DYREKTORSKA · {matrixType === 'classes' ? 'ODDZIAŁY' : matrixType === 'teachers' ? 'KADRA PEDAGOGICZNA' : 'GABINETY I SALE'}
                </span>
                {activeVariant && (
                  <span className="px-2 py-0.5 rounded-md border text-[10.5px] font-bold" style={{ borderColor: activeVariant.color, color: activeVariant.color }}>
                    Wariant: {activeVariant.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                {appState.school.name || 'Szkoła Podstawowa / Zespół Szkół'}
              </h1>
              <p className="text-[11px] font-semibold text-slate-600">
                Tygodniowy zbiorczy plan zajęć lekcyjnych · Rok szkolny {appState.yearLabel} · {scheduleVersion === 'etap1' ? 'Wersja bazowa (Plan Klas)' : 'Wersja gabinetowa (Plan Sal)'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                Arkusz: {paperFormat} Poziomo · Kolumn: {activeEntities.length}
              </div>
              <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                Obowiązuje od: <span className="font-extrabold text-slate-900">{activeVariant?.validFrom || new Date().toLocaleDateString('pl-PL')}</span>
              </div>
              {showSignatures && (
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 border border-dashed border-slate-300 px-2 py-1 rounded">
                  Zatwierdzam: ....................................... (Dyrektor Szkoły)
                </div>
              )}
            </div>
          </div>

          {/* ── MASTER MATRIX TABLE ── */}
          <div className="overflow-x-auto print:overflow-visible border border-slate-800 rounded-lg print:rounded-none">
            <table className="w-full border-collapse text-left border border-slate-800">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black text-center print:bg-slate-900 print:text-white">
                  <th className="border border-slate-700 p-1.5 w-12 text-[10px] print:border-slate-800">Dzień</th>
                  <th className="border border-slate-700 p-1.5 w-14 text-[10px] print:border-slate-800">Godz</th>
                  {activeEntities.map(ent => {
                    const label = matrixType === 'classes'
                      ? (ent as Class).name
                      : matrixType === 'teachers'
                        ? `${(ent as Teacher).abbr}`
                        : (ent as ClassRoom).name;
                    const subLabel = matrixType === 'teachers'
                      ? `${(ent as Teacher).last}`
                      : matrixType === 'rooms'
                        ? (ent as ClassRoom).desc?.substring(0, 10)
                        : undefined;

                    return (
                      <th
                        key={ent.id}
                        className={`border border-slate-700 p-1 text-center font-black ${densityConfig.minWidth} ${densityConfig.headerText} print:border-slate-800`}
                        title={ent.name}
                      >
                        <span className="block leading-tight">{label}</span>
                        {subLabel && (
                          <span className="block text-[8px] font-medium text-slate-400 leading-none truncate max-w-[65px] mx-auto">
                            {subLabel}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {daysToDisplay.map((dayIdx) => {
                  const dayName = DAYS_NAMES[dayIdx];
                  const dayShort = DAYS_SHORT[dayIdx];

                  return hoursList.map((hour, hIdx) => {
                    const isFirstHourOfDay = hIdx === 0;
                    const isLastHourOfDay = hIdx === hoursList.length - 1;

                    return (
                      <tr 
                        key={`${dayIdx}_${hour.num}`}
                        className={`hover:bg-slate-50/80 transition-colors ${isLastHourOfDay ? 'border-b-2 border-slate-900 print-border-thick' : 'border-b border-slate-200'}`}
                      >
                        {/* Day indicator span */}
                        {isFirstHourOfDay && (
                          <td
                            rowSpan={hoursList.length}
                            className="border-r-2 border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-black text-center text-xs p-1 tracking-wider uppercase select-none align-middle print:bg-slate-100 print:text-black"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          >
                            <span className="py-2 inline-block font-black">{dayName}</span>
                          </td>
                        )}

                        {/* Hour number and timing */}
                        <td className="border-r border-slate-300 p-1 bg-slate-50/80 text-center font-mono leading-tight print:bg-slate-50 print:border-slate-400">
                          <span className="font-extrabold text-slate-900 text-xs block">{hour.num}</span>
                          <span className="text-[7.5px] text-slate-500 block leading-none font-bold">
                            {hour.start}
                          </span>
                        </td>

                        {/* Entity Cells */}
                        {activeEntities.map(ent => {
                          const entries = getCellEntries(ent.id, dayIdx, hour.num, hIdx);

                          if (entries.length === 0) {
                            return (
                              <td 
                                key={ent.id}
                                className={`border border-slate-300 p-0 text-center ${densityConfig.minWidth} ${densityConfig.height} bg-white/60 print:bg-white print:border-slate-300`}
                              >
                                <span className="text-[9px] text-slate-200 font-light select-none">·</span>
                              </td>
                            );
                          }

                          return (
                            <td 
                              key={ent.id}
                              className={`border border-slate-300 ${densityConfig.padding} ${densityConfig.minWidth} ${densityConfig.height} align-top print:border-slate-400`}
                            >
                              <div className="flex flex-col gap-0.5">
                                {entries.map((entry, eIdx) => {
                                  const colors = getSubjectCategoryColor(
                                    entry.subjectName,
                                    entry.subjectShort,
                                    colorMode === 'mono'
                                  );

                                  return (
                                    <div
                                      key={eIdx}
                                      className="rounded px-1 py-0.5 border leading-tight transition-all"
                                      style={{
                                        backgroundColor: colors.bg,
                                        borderColor: colors.border,
                                        color: colors.text
                                      }}
                                    >
                                      {/* Main title: Class or Subject */}
                                      <div className="flex items-center justify-between gap-0.5">
                                        <span className={`font-black uppercase truncate ${densityConfig.cellText}`}>
                                          {matrixType === 'teachers' || matrixType === 'rooms'
                                            ? entry.fullClsName || entry.subjectShort
                                            : entry.subjectShort}
                                        </span>
                                        {entry.groupLabel && showGroups && (
                                          <span className="text-[6.5px] font-bold uppercase opacity-80 shrink-0">
                                            [{entry.groupLabel}]
                                          </span>
                                        )}
                                      </div>

                                      {/* Subline: Teacher / Room / Subject in teacher mode */}
                                      <div className={`flex items-center justify-between gap-1 mt-0.5 opacity-90 ${densityConfig.subText} font-bold`}>
                                        {matrixType === 'classes' && (
                                          <>
                                            {showTeacherAbbr && <span>{entry.teacherAbbr}</span>}
                                            {showRoomNum && entry.roomName && (
                                              <span className="truncate max-w-[32px] text-right font-mono">
                                                s.{entry.roomName}
                                              </span>
                                            )}
                                          </>
                                        )}

                                        {matrixType === 'teachers' && (
                                          <>
                                            <span className="truncate">{entry.subjectShort}</span>
                                            {showRoomNum && entry.roomName && (
                                              <span className="truncate font-mono">s.{entry.roomName}</span>
                                            )}
                                          </>
                                        )}

                                        {matrixType === 'rooms' && (
                                          <>
                                            <span className="truncate">{entry.fullClsName}</span>
                                            {showTeacherAbbr && <span>{entry.teacherAbbr}</span>}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {/* ── SHEET FOOTER & CADRE LEGEND ── */}
          {showLegend && (
            <div className="mt-4 pt-3 border-t-2 border-slate-900 print-avoid-break">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-slate-600" />
                  <span>Słowniczek Skrótów Kadry Pedagogicznej i Przedmiotów:</span>
                </h4>
                <div className="text-[10px] text-slate-500 font-bold">
                  Łącznie oddziałów: <span className="font-extrabold text-slate-900">{pl.classes.length}</span> · 
                  Nauczycieli: <span className="font-extrabold text-slate-900">{pl.teachers.length}</span> · 
                  Gabinetów: <span className="font-extrabold text-slate-900">{pl.rooms.length}</span>
                </div>
              </div>

              {/* Grid of teachers */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 text-[9.5px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {filteredTeachers.map(t => (
                  <div key={t.id} className="flex items-baseline gap-1 truncate" title={`${t.first} ${t.last}`}>
                    <span className="font-black text-indigo-900 shrink-0 font-mono">[{t.abbr}]</span>
                    <span className="truncate">{t.last} {t.first?.substring(0, 1)}.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* School official bottom row */}
          <div className="mt-3 flex justify-between items-end text-[9px] text-slate-400 font-medium">
            <div>
              Wygenerowano w systemie SalePlan Pro · {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div>
              Arkusz przeznaczony do wywieszenia w pokoju nauczycielskim lub gabinecie dyrekcji.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
