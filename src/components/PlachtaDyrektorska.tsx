import React, { useState, useMemo } from 'react';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom, SchoolGroup, SchedCell, PlanVariant } from '../types';
import { 
  Printer, ZoomIn, ZoomOut, Check, Sliders, Filter,
  FileSpreadsheet, ArrowLeft, Calendar, User, MapPin, Layers, Award, Sparkles, X, Eye, FileText,
  Split, LayoutGrid, ChevronRight
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
  const [cellDensity, setCellDensity] = useState<'ultra_compact' | 'compact' | 'normal' | 'large'>('compact');
  const [colorMode, setColorMode] = useState<'color' | 'mono'>('color');

  // Multi-page layout strategy: Day-by-Day (recommended for large schools) vs Continuous vs Single Day
  const [printLayoutMode, setPrintLayoutMode] = useState<'day_by_day' | 'continuous' | 'single_day'>('day_by_day');
  const [singleDaySelection, setSingleDaySelection] = useState<number>(0);

  // Column split mode for very large schools (e.g. 25-50 columns)
  const [columnSplitMode, setColumnSplitMode] = useState<'all' | 'part1' | 'part2'>('all');

  // Screen preview tab / view filter
  const [previewDayTab, setPreviewDayTab] = useState<number | 'all'>('all');

  // Element visibility toggles
  const [showTeacherAbbr, setShowTeacherAbbr] = useState(true);
  const [showRoomNum, setShowRoomNum] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [selectedClassStage, setSelectedClassStage] = useState<string>('all'); // all, 1-3, 4-8, lo_tech

  // Screen preview Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(100);

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

  // Base entities before column splitting
  const baseEntities = useMemo(() => {
    if (matrixType === 'classes') return filteredClasses;
    if (matrixType === 'teachers') return filteredTeachers;
    return filteredRooms;
  }, [matrixType, filteredClasses, filteredTeachers, filteredRooms]);

  // Active entities after column split
  const activeEntities = useMemo(() => {
    if (columnSplitMode === 'all') return baseEntities;
    const half = Math.ceil(baseEntities.length / 2);
    if (columnSplitMode === 'part1') return baseEntities.slice(0, half);
    if (columnSplitMode === 'part2') return baseEntities.slice(half);
    return baseEntities;
  }, [baseEntities, columnSplitMode]);

  // Days list to render in print / full preview
  const daysToRender = useMemo(() => {
    if (printLayoutMode === 'single_day') {
      return [singleDaySelection];
    }
    return [0, 1, 2, 3, 4];
  }, [printLayoutMode, singleDaySelection]);

  // Days visible on screen (respects previewDayTab)
  const daysOnScreen = useMemo(() => {
    if (previewDayTab === 'all') return daysToRender;
    return [previewDayTab];
  }, [previewDayTab, daysToRender]);

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

  // Adaptive font and sizing styles based on paperFormat, activeEntities count, and cellDensity
  const densityConfig = useMemo(() => {
    const count = activeEntities.length;
    const isVeryWide = count > 32; // e.g. 35 rooms or 42 teachers
    const isMediumWide = count > 20; // e.g. 25 classes

    if (cellDensity === 'ultra_compact' || (cellDensity === 'compact' && isVeryWide)) {
      return {
        headerText: 'text-[7.5px] leading-tight',
        cellText: 'text-[7px] leading-none',
        subText: 'text-[6px] leading-none',
        padding: 'p-0.5',
        minWidth: 'min-w-[30px]',
        height: 'min-h-[22px]',
        badgeText: 'text-[6px]'
      };
    }

    if (cellDensity === 'compact') {
      return {
        headerText: isMediumWide ? 'text-[8.5px] leading-tight' : 'text-[9.5px]',
        cellText: isMediumWide ? 'text-[8px] leading-tight' : 'text-[8.5px]',
        subText: isMediumWide ? 'text-[6.5px] leading-none' : 'text-[7px]',
        padding: isMediumWide ? 'p-1' : 'p-1',
        minWidth: isMediumWide ? 'min-w-[38px]' : 'min-w-[45px]',
        height: 'min-h-[26px]',
        badgeText: 'text-[6.5px]'
      };
    }

    if (cellDensity === 'large') {
      return {
        headerText: 'text-[11.5px]',
        cellText: 'text-[10.5px]',
        subText: 'text-[8.5px]',
        padding: 'p-2',
        minWidth: 'min-w-[65px]',
        height: 'min-h-[44px]',
        badgeText: 'text-[8px]'
      };
    }

    // Normal
    return {
      headerText: isVeryWide ? 'text-[8.5px]' : isMediumWide ? 'text-[9.5px]' : 'text-[10.5px]',
      cellText: isVeryWide ? 'text-[7.5px]' : isMediumWide ? 'text-[8.5px]' : 'text-[9.5px]',
      subText: isVeryWide ? 'text-[6.5px]' : isMediumWide ? 'text-[7.5px]' : 'text-[8px]',
      padding: isMediumWide ? 'p-1' : 'p-1.5',
      minWidth: isVeryWide ? 'min-w-[36px]' : isMediumWide ? 'min-w-[44px]' : 'min-w-[50px]',
      height: 'min-h-[32px]',
      badgeText: 'text-[7px]'
    };
  }, [cellDensity, activeEntities.length]);

  // Execute system print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="plachta-root flex flex-col h-full w-full bg-slate-100 overflow-hidden select-none print:bg-white print:overflow-visible print:block print:h-auto print:w-full">
      
      {/* ── CSS PRINT STYLESHEET SPECIFIC FOR A3 / A2 / A4 MULTI-PAGE LARGE FORMAT ── */}
      <style>{`
        @page {
          size: ${paperFormat === 'A2' ? 'A2 landscape' : paperFormat === 'A3' ? 'A3 landscape' : 'A4 landscape'};
          margin: ${paperFormat === 'A2' ? '5mm' : paperFormat === 'A3' ? '4mm' : '4mm'};
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

          /* Force block document flow for natural multi-page pagination */
          html, body, #root, #plachta-modal-root, #plachta-modal-root > div,
          .plachta-root, .plachta-container {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            float: none !important;
          }

          .plachta-scroll-wrapper {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .plachta-page {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }

          .plachta-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            page-break-inside: auto;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          th, td {
            border: 1px solid #1e293b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-border-thick {
            border-bottom: 2px solid #0f172a !important;
          }
        }
      `}</style>

      {/* ── TOP CONTROL TOOLBAR (SCREEN ONLY) ── */}
      <div className="no-print bg-slate-900 text-white border-b border-slate-950 px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 z-30 shadow-md">
        
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
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 leading-none">
                <span>Płachta Dyrektorska</span>
                <span className="bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                  {paperFormat} Poziomo
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {appState.school.name || 'Szkoła'} • {activeEntities.length} kolumn w bieżącym widoku (łącznie {baseEntities.length})
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden md:block" />

          {/* Matrix Type Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setMatrixType('classes'); setColumnSplitMode('all'); }}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                matrixType === 'classes' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Oddziały ({pl.classes.length})
            </button>
            <button
              type="button"
              onClick={() => { setMatrixType('teachers'); setColumnSplitMode('all'); }}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                matrixType === 'teachers' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nauczyciele ({pl.teachers.length})
            </button>
            <button
              type="button"
              onClick={() => { setMatrixType('rooms'); setColumnSplitMode('all'); }}
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                matrixType === 'rooms' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sale / Gabinety ({pl.rooms.length})
            </button>
          </div>
        </div>

        {/* Center: Print Strategy (Day-by-Day vs Continuous) & Columns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout Strategy */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Układ:</span>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('day_by_day')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                printLayoutMode === 'day_by_day' ? 'bg-emerald-700 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Zalecany: Każdy dzień tygodnia drukowany na osobnej karcie A3 (5 stron). Nic nie jest ucięte pionowo!"
            >
              Każdy dzień na nowej karcie (5 stron)
            </button>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('continuous')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                printLayoutMode === 'continuous' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Wszystkie dni w jednym arkuszu ciągłym"
            >
              Ciągły
            </button>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('single_day')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                printLayoutMode === 'single_day' ? 'bg-slate-800 text-amber-300 font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Drukuj tylko 1 wybrany dzień"
            >
              1 Dzień
            </button>
          </div>

          {/* If Single Day layout */}
          {printLayoutMode === 'single_day' && (
            <select
              value={singleDaySelection}
              onChange={e => setSingleDaySelection(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-800 text-amber-300 text-xs font-bold rounded-xl px-2 py-1 outline-none"
            >
              {DAYS_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          )}

          {/* Column Splitting for large schools */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Kolumny:</span>
            <button
              type="button"
              onClick={() => setColumnSplitMode('all')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                columnSplitMode === 'all' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title={`Wszystkie kolumny (${baseEntities.length}) naraz z auto-dopasowaniem`}
            >
              Wszystkie ({baseEntities.length})
            </button>
            <button
              type="button"
              onClick={() => setColumnSplitMode('part1')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                columnSplitMode === 'part1' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Część 1: pierwsze 50% kolumn (większa czytelność i większa czcionka)"
            >
              Część 1 (1–{Math.ceil(baseEntities.length / 2)})
            </button>
            <button
              type="button"
              onClick={() => setColumnSplitMode('part2')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer ${
                columnSplitMode === 'part2' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Część 2: drugie 50% kolumn"
            >
              Część 2 ({Math.ceil(baseEntities.length / 2) + 1}–{baseEntities.length})
            </button>
          </div>
        </div>

        {/* Right: Print Action & Zoom */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(40, prev - 15))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Oddal podgląd"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono font-bold text-[10px] px-1 w-9 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Przybliż podgląd"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Primary Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition shadow-md cursor-pointer border border-emerald-400"
            title="Drukuj płachtę lub zapisz do pliku PDF"
          >
            <Printer size={15} className="animate-pulse" />
            <span>Drukuj Płachtę ({paperFormat})</span>
          </button>
        </div>
      </div>

      {/* ── SECONDARY SUB-BAR: FORMAT, DENSITY, FILTERS & SCREEN TABS ── */}
      <div className="no-print bg-slate-850 text-slate-300 border-b border-slate-800 px-4 py-1.5 shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Format, density, color */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Format selector */}
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Format:</span>
            {(['A3', 'A2', 'A4'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setPaperFormat(fmt)}
                className={`px-1.5 py-0.5 font-bold rounded transition cursor-pointer ${
                  paperFormat === fmt ? 'bg-slate-800 text-amber-400 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Density selector */}
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Gęstość:</span>
            <button
              type="button"
              onClick={() => setCellDensity('ultra_compact')}
              className={`px-1.5 py-0.5 font-bold rounded transition cursor-pointer ${
                cellDensity === 'ultra_compact' ? 'bg-slate-800 text-amber-300 font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Super-kompaktowy (dla 35-50 kolumn)"
            >
              Super-gęsty
            </button>
            <button
              type="button"
              onClick={() => setCellDensity('compact')}
              className={`px-1.5 py-0.5 font-bold rounded transition cursor-pointer ${
                cellDensity === 'compact' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gęsty
            </button>
            <button
              type="button"
              onClick={() => setCellDensity('normal')}
              className={`px-1.5 py-0.5 font-bold rounded transition cursor-pointer ${
                cellDensity === 'normal' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Średni
            </button>
          </div>

          {/* Color Mode */}
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setColorMode('color')}
              className={`px-1.5 py-0.5 font-bold rounded transition cursor-pointer ${
                colorMode === 'color' ? 'bg-slate-800 text-emerald-400 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kolor
            </button>
            <button
              type="button"
              onClick={() => setColorMode('mono')}
              className={`px-1.5 py-0.5 font-bold rounded transition cursor-pointer ${
                colorMode === 'mono' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              B&W
            </button>
          </div>

          {/* Schedule Version */}
          <select
            value={scheduleVersion}
            onChange={e => setScheduleVersion(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-none"
          >
            <option value="etap1">Etap 1: Plan Klas (Siatka)</option>
            <option value="etap2">Etap 2: Plan Sal (Gabinety)</option>
          </select>

          {/* Stage filter for classes */}
          {matrixType === 'classes' && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold">Rocznik:</span>
              <select
                value={selectedClassStage}
                onChange={e => setSelectedClassStage(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-bold rounded-lg px-2 py-0.5 outline-none"
              >
                <option value="all">Wszystkie oddziały ({pl.classes.length})</option>
                <option value="1-3">Klasy 1–3</option>
                <option value="4-8">Klasy 4–8</option>
                <option value="lo_tech">Ponadpodstawowe</option>
              </select>
            </div>
          )}
        </div>

        {/* Right: Cell detail toggles & Screen day tab selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showTeacherAbbr}
              onChange={e => setShowTeacherAbbr(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Nauczyciel</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showRoomNum}
              onChange={e => setShowRoomNum(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Sala</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={e => setShowLegend(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Słowniczek kadr</span>
          </label>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Quick Screen Preview Day Selector */}
          <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded-lg border border-slate-800 text-[10px]">
            <span className="text-slate-500 font-bold px-1">Podgląd:</span>
            <button
              type="button"
              onClick={() => setPreviewDayTab('all')}
              className={`px-1.5 py-0.5 rounded font-bold transition ${
                previewDayTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wszystkie ({daysToRender.length})
            </button>
            {daysToRender.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setPreviewDayTab(d)}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  previewDayTab === d ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {DAYS_SHORT[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN SCROLLABLE PREVIEW CANVAS ── */}
      <div className="plachta-scroll-wrapper flex-1 overflow-auto p-3 sm:p-6 print:p-0 bg-slate-200/70 print:bg-white flex flex-col items-center">
        
        {/* Helper screen banner explaining multi-page A3 landscape output */}
        <div className="no-print w-full max-w-7xl mb-4 bg-emerald-950/80 border border-emerald-700/60 rounded-xl p-3 text-emerald-100 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Sparkles size={16} />
            </span>
            <div>
              <strong className="font-bold text-emerald-300">Wielkoformatowy wydruk dyrektorski A3/A2 zoptymalizowany dla {baseEntities.length} kolumn:</strong>
              <span className="ml-1 text-emerald-200">
                {printLayoutMode === 'day_by_day' 
                  ? `Każdy dzień tygodnia (Pn–Pt) drukowany jest na dedykowanej karcie formatu ${paperFormat} Poziomo (razem 5 stron). Żadna kolumna ani wiersz nie zostaną ucięte!` 
                  : `Układ ${printLayoutMode === 'single_day' ? 'pojedynczego dnia' : 'ciągły wielostronicowy'} formatu ${paperFormat} Poziomo.`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={13} />
            Drukuj teraz
          </button>
        </div>

        {/* Outer Container with optional Zoom */}
        <div 
          className="plachta-container w-full max-w-full print:w-full space-y-6 print:space-y-0 transition-transform origin-top"
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            width: paperFormat === 'A2' ? '1680px' : paperFormat === 'A3' ? '1420px' : '1100px',
            maxWidth: '100%'
          }}
        >
          {daysOnScreen.map((dayIdx, dIdx) => {
            const dayName = DAYS_NAMES[dayIdx];
            const isLastRenderedDay = dIdx === daysOnScreen.length - 1;

            return (
              <div 
                key={dayIdx}
                className={`plachta-page bg-white shadow-xl print:shadow-none rounded-xl print:rounded-none border border-slate-300 print:border-none p-5 sm:p-6 print:p-0 ${
                  (!isLastRenderedDay || (showLegend && printLayoutMode === 'day_by_day')) ? 'plachta-page-break' : ''
                }`}
              >
                {/* ── SHEET HEADER FOR THIS DAY ── */}
                <div className="border-b-2 border-slate-900 pb-2 mb-2 flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        PŁACHTA DYREKTORSKA · {matrixType === 'classes' ? 'ODDZIAŁY' : matrixType === 'teachers' ? 'KADRA PEDAGOGICZNA' : 'GABINETY I SALE'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[11px] uppercase tracking-wide">
                        {dayName}
                      </span>
                      {activeVariant && (
                        <span className="px-2 py-0.5 rounded-md border text-[9.5px] font-bold" style={{ borderColor: activeVariant.color, color: activeVariant.color }}>
                          Wariant: {activeVariant.name}
                        </span>
                      )}
                      {columnSplitMode !== 'all' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9.5px] uppercase">
                          {columnSplitMode === 'part1' ? 'Część 1' : 'Część 2'}
                        </span>
                      )}
                    </div>
                    
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1 leading-tight">
                      {appState.school.name || 'Szkoła'}
                    </h1>
                    <p className="text-[10px] font-semibold text-slate-600 leading-normal">
                      Zbiorczy rozkład zajęć · Dzień: <strong className="text-slate-950 uppercase font-black">{dayName}</strong> · Rok szkolny {appState.yearLabel} · {scheduleVersion === 'etap1' ? 'Wersja bazowa (Plan Klas)' : 'Wersja gabinetowa (Plan Sal)'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">
                      Arkusz: {paperFormat} Poziomo · Kolumn: {activeEntities.length} {columnSplitMode !== 'all' ? `(z ${baseEntities.length})` : ''}
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                      Stan na: <span className="font-extrabold text-slate-900">{activeVariant?.validFrom || new Date().toLocaleDateString('pl-PL')}</span>
                    </div>
                    {showSignatures && (
                      <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 border border-dashed border-slate-400 px-2 py-0.5 rounded">
                        Zatwierdzam: ....................................... (Dyrektor Szkoły)
                      </div>
                    )}
                  </div>
                </div>

                {/* ── MASTER MATRIX TABLE FOR THIS DAY ── */}
                <div className="overflow-x-auto print:overflow-visible border border-slate-800 rounded-lg print:rounded-none">
                  <table className="w-full border-collapse text-left border border-slate-800 table-fixed">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase font-black text-center print:bg-slate-900 print:text-white">
                        <th className="border border-slate-700 p-1 w-12 text-[9.5px] print:border-slate-800">
                          Godz
                        </th>
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
                              className={`border border-slate-700 p-0.5 text-center font-black ${densityConfig.headerText} print:border-slate-800 overflow-hidden`}
                              title={ent.name}
                            >
                              <span className="block leading-none truncate">{label}</span>
                              {subLabel && (
                                <span className="block text-[6.5px] font-semibold text-slate-400 leading-none truncate max-w-[65px] mx-auto mt-0.5">
                                  {subLabel}
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {hoursList.map((hour, hIdx) => {
                        const isLastHour = hIdx === hoursList.length - 1;

                        return (
                          <tr 
                            key={`${dayIdx}_${hour.num}`}
                            className={`hover:bg-slate-50/80 transition-colors ${isLastHour ? 'border-b-2 border-slate-900 print-border-thick' : 'border-b border-slate-200'}`}
                          >
                            {/* Hour number and timing column */}
                            <td className="border-r border-slate-300 p-0.5 bg-slate-50/80 text-center font-mono leading-tight print:bg-slate-50 print:border-slate-400">
                              <span className="font-extrabold text-slate-900 text-[10px] block leading-none">{hour.num}</span>
                              <span className="text-[6.5px] text-slate-500 block leading-none font-bold mt-0.5">
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
                                    className={`border border-slate-300 p-0 text-center ${densityConfig.height} bg-white/60 print:bg-white print:border-slate-300`}
                                  >
                                    <span className="text-[8px] text-slate-200 font-light select-none">·</span>
                                  </td>
                                );
                              }

                              return (
                                <td 
                                  key={ent.id}
                                  className={`border border-slate-300 ${densityConfig.padding} ${densityConfig.height} align-top print:border-slate-400 overflow-hidden`}
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
                                          className="rounded px-0.5 py-0.5 border leading-tight transition-all"
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
                                              <span className="text-[6px] font-bold uppercase opacity-80 shrink-0">
                                                [{entry.groupLabel}]
                                              </span>
                                            )}
                                          </div>

                                          {/* Subline: Teacher / Room / Subject in teacher mode */}
                                          <div className={`flex items-center justify-between gap-0.5 mt-0.5 opacity-90 ${densityConfig.subText} font-bold`}>
                                            {matrixType === 'classes' && (
                                              <>
                                                {showTeacherAbbr && <span className="truncate">{entry.teacherAbbr}</span>}
                                                {showRoomNum && entry.roomName && (
                                                  <span className="truncate text-right font-mono">
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
                                                {showTeacherAbbr && <span className="truncate font-mono">{entry.teacherAbbr}</span>}
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
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Day Sheet Bottom Info */}
                <div className="mt-2 flex justify-between items-center text-[8.5px] text-slate-400 font-medium">
                  <span>
                    Arkusz dzienny: <strong className="text-slate-700 uppercase">{dayName}</strong> · SalePlan Pro
                  </span>
                  <span>
                    Strona {dIdx + 1} z {daysOnScreen.length} {showLegend ? '+ Legenda' : ''}
                  </span>
                </div>
              </div>
            );
          })}

          {/* ── SEPARATE FINAL SHEET: CADRE LEGEND & OFFICIAL SCHOOL VALIDATION ── */}
          {showLegend && (
            <div className="plachta-page bg-white shadow-xl print:shadow-none rounded-xl print:rounded-none border border-slate-300 print:border-none p-5 sm:p-6 print:p-0 print-avoid-break">
              <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <User size={15} className="text-indigo-600" />
                    <span>Słowniczek Kadry Pedagogicznej, Sal i Przedmiotów</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Pełne zestawienie skrótów wykorzystywanych w arkuszach Płachty Dyrektorskiej
                  </p>
                </div>
                <div className="text-[10px] font-bold text-slate-700 text-right">
                  Łącznie: <span className="font-extrabold text-slate-900">{pl.classes.length}</span> oddziałów · 
                  <span className="font-extrabold text-slate-900 ml-1">{pl.teachers.length}</span> nauczycieli · 
                  <span className="font-extrabold text-slate-900 ml-1">{pl.rooms.length}</span> gabinetów
                </div>
              </div>

              {/* Teachers grid */}
              <div className="space-y-1 mb-4">
                <span className="text-[9.5px] font-black uppercase text-slate-600 block tracking-wider">
                  Nauczyciele ({filteredTeachers.length}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-1 text-[9px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {filteredTeachers.map(t => (
                    <div key={t.id} className="flex items-baseline gap-1 truncate" title={`${t.first} ${t.last}`}>
                      <span className="font-black text-indigo-900 shrink-0 font-mono">[{t.abbr}]</span>
                      <span className="truncate">{t.last} {t.first?.substring(0, 1)}.</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rooms & Subjects Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[9.5px] font-black uppercase text-slate-600 block tracking-wider mb-1">
                    Gabinety i Sale ({filteredRooms.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 text-[8.5px] text-slate-700">
                    {filteredRooms.map(r => (
                      <span key={r.id} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                        <strong>s.{r.name}</strong> {r.desc ? `(${r.desc.substring(0, 12)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[9.5px] font-black uppercase text-slate-600 block tracking-wider mb-1">
                    Klucz Kolorów Przedmiotów:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[8.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 shrink-0" />
                      <span className="text-slate-700 font-bold">Humanistyczne (Pol, Hist, WOS)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 shrink-0" />
                      <span className="text-slate-700 font-bold">Ścisłe (Mat, Fiz, Chem, Bio)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-green-100 border border-green-300 shrink-0" />
                      <span className="text-slate-700 font-bold">Języki obce (Ang, Niem, Hiszp)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 shrink-0" />
                      <span className="text-slate-700 font-bold">Wychowanie Fizyczne (WF)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-cyan-100 border border-cyan-300 shrink-0" />
                      <span className="text-slate-700 font-bold">Informatyka & Technologie</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-pink-100 border border-pink-300 shrink-0" />
                      <span className="text-slate-700 font-bold">Wsparcie & SPE (Rewal, Terap)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Seal and Signature Section */}
              <div className="pt-2 border-t border-slate-300 flex justify-between items-end text-[9px] text-slate-500">
                <div>
                  Wygenerowano w systemie SalePlan Pro • {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-right">
                  <div className="border-t border-dotted border-slate-600 pt-1 px-8 inline-block text-center font-bold text-slate-800 uppercase">
                    Pieczęć Szkoły i Podpis Dyrektora
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
