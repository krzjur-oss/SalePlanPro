import React, { useState, useMemo, useCallback } from 'react';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom, SchoolGroup, SchedCell, PlanVariant } from '../types';
import { 
  Printer, ZoomIn, ZoomOut, Check, Sliders, Filter,
  FileSpreadsheet, ArrowLeft, Calendar, User, MapPin, Layers, Award, Sparkles, X, Eye, FileText,
  Split, LayoutGrid, ChevronRight, BookOpen
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
  
  // Humanities: polski, jp, historia, wos, filozofia, etyka, religia
  if (s.includes('pol') || s.includes('jp') || s.includes('hist') || s.includes('wos') || s.includes('filoz') || s.includes('etyk') || s.includes('relig')) {
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
  // Early Education (Edukacja Wczesnoszkolna): ew, wczesnoszkolna
  if (s.includes('ew') || s.includes('wczesnoszkolna')) {
    return { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }; // Sky
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
  if (s.includes('rewa') || s.includes('terap') || s.includes('wsp') || s.includes('logop') || s.includes('psych') || s.includes('pedag') || s.includes('dor.zaw') || s.includes('wdż')) {
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

  // Layout strategy: All-in-One 2-pages (Karta 1: Cały tydzień, Karta 2: Słownik) vs Day-by-Day (6 pages) vs Single Day
  const [printLayoutMode, setPrintLayoutMode] = useState<'all_in_one' | 'day_by_day' | 'single_day'>('all_in_one');
  const [singleDaySelection, setSingleDaySelection] = useState<number>(0);

  // Column split mode for very large schools (e.g. 25-50 columns)
  const [columnSplitMode, setColumnSplitMode] = useState<'all' | 'part1' | 'part2'>('all');

  // Screen preview tab / view filter (all days, single day, or legend sheet)
  const [previewDayTab, setPreviewDayTab] = useState<number | 'all' | 'legend'>('all');

  // Element visibility toggles
  const [subjectDisplayMode, setSubjectDisplayMode] = useState<'short' | 'full'>('short'); // 'short' = official abbreviations from Creator (JP, MAT, WF); 'full' = full names
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
  const subjectsByName = useMemo(() => {
    const map = new Map<string, Subject>();
    pl.subjects.forEach(s => {
      if (s.name) map.set(s.name.trim().toLowerCase(), s);
      if (s.short) map.set(s.short.trim().toLowerCase(), s);
    });
    return map;
  }, [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);
  const groupsMap = useMemo(() => new Map((pl.schoolGroups || []).map(g => [g.id, g])), [pl.schoolGroups]);

  // Robust subject resolver prioritizing official Creator abbreviations (e.g. JP, MAT, ANG, WF)
  const resolveSubjectInfo = useCallback((subjectId?: string | null, rawSubjectName?: string | null) => {
    // 1. By ID in pl.subjects
    if (subjectId && subjectsMap.has(subjectId)) {
      const s = subjectsMap.get(subjectId)!;
      return {
        id: s.id,
        name: s.name,
        short: (s.short && s.short.trim()) ? s.short.trim() : (s.name.length > 5 ? s.name.substring(0, 4).toUpperCase() : s.name.toUpperCase()),
        color: s.color || '#475569'
      };
    }

    // 2. By raw name matching pl.subjects
    if (rawSubjectName && rawSubjectName.trim()) {
      const clean = rawSubjectName.trim();
      const lower = clean.toLowerCase();

      if (subjectsByName.has(lower)) {
        const s = subjectsByName.get(lower)!;
        return {
          id: s.id,
          name: s.name,
          short: (s.short && s.short.trim()) ? s.short.trim() : s.name,
          color: s.color || '#475569'
        };
      }

      // Prefix or substring match in pl.subjects
      const found = pl.subjects.find(s => {
        const sName = s.name.trim().toLowerCase();
        const sShort = s.short ? s.short.trim().toLowerCase() : '';
        return lower === sName || lower === sShort || lower.startsWith(sName) || sName.startsWith(lower);
      });

      if (found) {
        return {
          id: found.id,
          name: found.name,
          short: (found.short && found.short.trim()) ? found.short.trim() : found.name,
          color: found.color || '#475569'
        };
      }

      // Standard Polish educational abbreviations if not explicitly defined in pl.subjects
      const standardPolishAbbrs: Record<string, string> = {
        'język polski': 'JP',
        'matematyka': 'MAT',
        'język angielski': 'ANG',
        'język niemiecki': 'NIEM',
        'język hiszpański': 'HISZP',
        'język francuski': 'FRANC',
        'język rosyjski': 'ROS',
        'biologia': 'BIOL',
        'chemia': 'CHEM',
        'fizyka': 'FIZ',
        'geografia': 'GEOG',
        'historia': 'HIST',
        'wiedza o społeczeństwie': 'WOS',
        'wos': 'WOS',
        'informatyka': 'INF',
        'plastyka': 'PLAS',
        'muzyka': 'MUZ',
        'technika': 'TECH',
        'wychowanie fizyczne': 'WF',
        'w-f': 'WF',
        'wf': 'WF',
        'religia': 'REL',
        'etyka': 'ETY',
        'przyroda': 'PRZY',
        'edukacja dla bezpieczeństwa': 'EDB',
        'edb': 'EDB',
        'godzina z wychowawcą': 'GW',
        'godzina wychowawcza': 'GW',
        'edukacja wczesnoszkolna': 'EW',
        'zajęcia rewalidacyjne': 'REWAL',
        'rewalidacja': 'REWAL',
        'zajęcia logopedyczne': 'LOGO',
        'logopedia': 'LOGO',
        'terapia pedagogiczna': 'TERAP',
        'zajęcia z psychologiem': 'PSYCH',
        'zajęcia z pedagogiem': 'PEDAG',
        'doradztwo zawodowe': 'DOR.ZAW',
        'wychowanie do życia w rodzinie': 'WDŻ',
        'wdż': 'WDŻ',
        'filozofia': 'FILOZ',
        'historia i teraźniejszość': 'HiT',
        'biznes i zarządzanie': 'BiZ'
      };

      for (const [subjKey, abbr] of Object.entries(standardPolishAbbrs)) {
        if (lower === subjKey || lower.startsWith(subjKey) || subjKey.startsWith(lower)) {
          return { id: `auto-${abbr}`, name: clean, short: abbr, color: '#475569' };
        }
      }

      return {
        id: `custom-${clean}`,
        name: clean,
        short: clean.length > 5 ? clean.substring(0, 4).toUpperCase() : clean.toUpperCase(),
        color: '#475569'
      };
    }

    return { id: 'unknown', name: 'Przedmiot', short: 'PRZ', color: '#475569' };
  }, [subjectsMap, subjectsByName, pl.subjects]);

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
    if (previewDayTab === 'legend') return [];
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

  // Compile unique subjects list combining Creator subjects + all schedule subjects
  const comprehensiveSubjectsList = useMemo(() => {
    const listMap = new Map<string, { id: string; name: string; short: string; color: string; count: number }>();

    // 1. Seed with all subjects from the Creator
    pl.subjects.forEach(s => {
      const shortName = (s.short && s.short.trim()) ? s.short.trim() : (s.name.length > 5 ? s.name.substring(0, 4).toUpperCase() : s.name.toUpperCase());
      listMap.set(s.id, {
        id: s.id,
        name: s.name,
        short: shortName,
        color: s.color || '#475569',
        count: 0
      });
    });

    // 2. Scan assignments/lessons to count hours and discover any missing subjects
    if (scheduleVersion === 'etap1') {
      Object.values(pl.lessons || {}).forEach(lesson => {
        const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
        if (!asg) return;
        const subjInfo = resolveSubjectInfo(asg.subjectId);
        if (listMap.has(subjInfo.id)) {
          listMap.get(subjInfo.id)!.count += 1;
        } else {
          listMap.set(subjInfo.id, {
            id: subjInfo.id,
            name: subjInfo.name,
            short: subjInfo.short,
            color: subjInfo.color,
            count: 1
          });
        }
      });
    } else {
      // Scan etap2 cells
      const yearKey = appState.yearKey || 'default';
      const yearData = schedData[yearKey] || {};
      Object.values(yearData).forEach(hoursData => {
        Object.values(hoursData || {}).forEach(cells => {
          Object.values(cells || {}).forEach(cellVal => {
            const cellList = Array.isArray(cellVal) ? cellVal : [cellVal];
            cellList.forEach(cell => {
              if (!cell || !cell.subject) return;
              const subjInfo = resolveSubjectInfo(cell._bridgeMeta?.subjectId, cell.subject);
              if (listMap.has(subjInfo.id)) {
                listMap.get(subjInfo.id)!.count += 1;
              } else {
                const byNameKey = Array.from(listMap.values()).find(
                  item => item.name.toLowerCase() === subjInfo.name.toLowerCase()
                );
                if (byNameKey) {
                  byNameKey.count += 1;
                } else {
                  listMap.set(subjInfo.id, {
                    id: subjInfo.id,
                    name: subjInfo.name,
                    short: subjInfo.short,
                    color: subjInfo.color,
                    count: 1
                  });
                }
              }
            });
          });
        });
      });
    }

    return Array.from(listMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [pl.subjects, pl.assignments, pl.lessons, schedData, appState.yearKey, scheduleVersion, resolveSubjectInfo]);

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
              const subj = resolveSubjectInfo(asg.subjectId);
              const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
              const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
              const grp = asg.groupId ? groupsMap.get(asg.groupId) : null;
              results.push({
                subjectName: subj.name,
                subjectShort: subj.short,
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
          const subj = resolveSubjectInfo(c._bridgeMeta?.subjectId, c.subject);
          results.push({
            subjectName: subj.name,
            subjectShort: subj.short,
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
              const subj = resolveSubjectInfo(asg.subjectId);
              const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
              const grp = asg.groupId ? groupsMap.get(asg.groupId) : null;
              results.push({
                subjectName: subj.name,
                subjectShort: subj.short,
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
          const subj = resolveSubjectInfo(c._bridgeMeta?.subjectId, c.subject);
          results.push({
            subjectName: subj.name,
            subjectShort: subj.short,
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
              const subj = resolveSubjectInfo(asg.subjectId);
              results.push({
                subjectName: subj.name,
                subjectShort: subj.short,
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
          const subj = resolveSubjectInfo(c._bridgeMeta?.subjectId, c.subject);
          results.push({
            subjectName: subj.name,
            subjectShort: subj.short,
            teacherAbbr: c.teacherAbbr || '',
            roomName: room.name,
            fullClsName: c.className || c.classes?.join('+') || ''
          });
        });
      }
    }

    return results;
  };

  // Adaptive font and sizing styles based on paperFormat, activeEntities count, cellDensity, and printLayoutMode
  const densityConfig = useMemo(() => {
    const count = activeEntities.length;
    const isVeryWide = count > 32; // e.g. 35 rooms or 42 teachers
    const isMediumWide = count > 20; // e.g. 25 classes
    const isAllInOne = printLayoutMode === 'all_in_one';

    // In all_in_one mode, all 40-45 rows fit onto 1 single A3/A2 sheet
    if (isAllInOne) {
      return {
        headerText: isVeryWide ? 'text-[7px] leading-tight' : 'text-[8px] leading-tight',
        cellText: isVeryWide ? 'text-[5.5px] leading-none' : isMediumWide ? 'text-[6px] leading-none' : 'text-[6.5px] leading-none',
        subText: isVeryWide ? 'text-[4.5px] leading-none' : isMediumWide ? 'text-[5px] leading-none' : 'text-[5.5px] leading-none',
        padding: 'p-0.5 print:p-[0.5px]',
        minWidth: isVeryWide ? 'min-w-[24px]' : 'min-w-[30px]',
        height: 'min-h-[16px] print:min-h-0',
        badgeText: 'text-[4.5px]'
      };
    }

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
  }, [cellDensity, activeEntities.length, printLayoutMode]);

  // Calculate precise percentage for entity columns (giving 84px for Dzień+Godz in all_in_one mode, or 44px for Godz in day_by_day mode)
  const colWidthPercent = useMemo(() => {
    if (!activeEntities.length) return '100%';
    const fixedWidth = printLayoutMode === 'all_in_one' ? 84 : 44;
    return `calc((100% - ${fixedWidth}px) / ${activeEntities.length})`;
  }, [activeEntities.length, printLayoutMode]);

  // Execute system print (ensures all 5 days + legend are in DOM when printing full Plachta)
  const handlePrint = (mode: 'all' | 'current' | React.SyntheticEvent = 'all') => {
    const targetMode = mode === 'current' ? 'current' : 'all';
    if (targetMode === 'all' && previewDayTab !== 'all') {
      setPreviewDayTab('all');
      setTimeout(() => {
        window.print();
      }, 250);
      return;
    }
    window.print();
  };

  return (
    <div className="plachta-root flex flex-col h-full w-full bg-slate-100 overflow-hidden select-none print:bg-white print:overflow-visible print:block print:h-auto print:w-full">
      
      {/* ── CSS PRINT STYLESHEET SPECIFIC FOR A3 / A2 / A4 MULTI-PAGE LARGE FORMAT ── */}
      <style>{`
        @page {
          size: ${paperFormat === 'A2' ? 'A2 landscape' : paperFormat === 'A3' ? 'A3 landscape' : 'A4 landscape'};
          margin: ${paperFormat === 'A2' ? '4mm' : paperFormat === 'A3' ? '3.5mm' : '3.5mm'};
        }

        @media print {
          /* 1. Reset root HTML & Body for natural multi-page pagination */
          html, body {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* 2. Hide all navigation, headers, footers, toasts, and floating elements */
          header, footer, nav, aside, .no-print, #restoring-pointer-blocker, #version-changelog-toast {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }

          ${isStandaloneModal ? `
          /* When Plachta is rendered as a standalone modal overlay, completely suppress the background workspace */
          #app-main-workspace,
          #app-main-workspace * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            pointer-events: none !important;
          }
          ` : ''}

          /* 3. Force block flow on root containers */
          #root, #root > div {
            display: block !important;
            position: static !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          #plachta-modal-root, #plachta-modal-root > div,
          .plachta-root, .plachta-scroll-wrapper, .plachta-container {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
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

          /* 4. Individual Sheet / Day Card */
          .plachta-page {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 0 8px 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            float: none !important;
            clear: both !important;
          }

          /* Specifically for all-in-one page: fits completely on Page 1 */
          .plachta-page-all-in-one {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* 5. Force Page Break after each day */
          .plachta-page-break {
            page-break-after: always !important;
            break-after: page !important;
            clear: both !important;
          }

          /* 6. Plachta Matrix Table and Cells - STRICT TABLE DISPLAY RULES */
          .plachta-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .plachta-table thead {
            display: table-header-group !important;
          }

          .plachta-table tbody {
            display: table-row-group !important;
          }

          .plachta-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .plachta-table th {
            display: table-cell !important;
            text-align: center !important;
            vertical-align: middle !important;
            overflow: hidden !important;
            border: 1px solid #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 2px 1px !important;
            box-sizing: border-box !important;
          }

          .plachta-table td {
            display: table-cell !important;
            vertical-align: top !important;
            overflow: hidden !important;
            border: 1px solid #475569 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 1px !important;
            box-sizing: border-box !important;
          }

          /* 6b. ALL-IN-ONE MASTER TABLE: GUARANTEED 1 PAGE FIT FOR ALL 5 DAYS */
          .plachta-table-all-in-one {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .plachta-table-all-in-one thead tr {
            height: 16px !important;
            max-height: 16px !important;
          }

          .plachta-table-all-in-one thead th {
            padding: 1px 0.5px !important;
            font-size: 7.5px !important;
            line-height: 1 !important;
            height: 16px !important;
            border: 1px solid #0f172a !important;
          }

          .plachta-table-all-in-one tbody tr {
            height: ${Math.min(21, Math.max(15, Math.floor(860 / (5 * Math.max(hoursList.length, 7)))))}px !important;
            max-height: ${Math.min(23, Math.max(16, Math.floor(860 / (5 * Math.max(hoursList.length, 7))) + 2))}px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .plachta-table-all-in-one td {
            padding: 0.5px 1px !important;
            vertical-align: middle !important;
            line-height: 1 !important;
            border: 1px solid #475569 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .plachta-table-all-in-one td .plachta-entry-box {
            padding: 0.5px 1px !important;
            margin: 0 !important;
            line-height: 1 !important;
            border-radius: 1.5px !important;
            border-width: 0.5px !important;
          }

          .plachta-table-all-in-one td .plachta-entry-title {
            font-size: 6.5px !important;
            line-height: 1 !important;
            font-weight: 900 !important;
          }

          .plachta-table-all-in-one td .plachta-entry-sub {
            font-size: 5.5px !important;
            line-height: 1 !important;
            margin-top: 0.5px !important;
            font-weight: 700 !important;
          }

          .plachta-table-all-in-one .plachta-day-col {
            width: 32px !important;
            min-width: 32px !important;
            max-width: 32px !important;
            padding: 0 !important;
            text-align: center !important;
            vertical-align: middle !important;
          }

          .plachta-table-all-in-one .plachta-day-col span {
            font-size: 8px !important;
            letter-spacing: 2px !important;
          }

          .plachta-table-all-in-one .plachta-hour-col {
            width: 34px !important;
            min-width: 34px !important;
            max-width: 34px !important;
            padding: 0.5px !important;
            text-align: center !important;
            vertical-align: middle !important;
          }

          /* Ensure cell badges keep exact background colors in print */
          .plachta-table td div[style*="background-color"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 7. Legend page specific */
          .plachta-legend-page {
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            clear: both !important;
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
      <div className="no-print bg-slate-900 text-white border-b border-slate-950 px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 relative z-10 shadow-md">
        
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

        {/* Center: Print Strategy (All-in-One 2 pages vs Day-by-Day 6 pages vs Single Day) & Columns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout Strategy */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Układ:</span>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('all_in_one')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                printLayoutMode === 'all_in_one' ? 'bg-emerald-600 text-white font-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Złóż 5 dni w jedną kartę A3 + skróty na 2 karcie (2 strony łącznie)"
            >
              <span>1 Karta Tygodniowa (2 str. {paperFormat})</span>
              <span className="text-[9px] bg-emerald-700/80 text-emerald-100 px-1 rounded font-mono font-black">2 str.</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintLayoutMode('day_by_day')}
              className={`px-2 py-0.5 font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                printLayoutMode === 'day_by_day' ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
              title="Każdy dzień na osobnej karcie (5 kart dni + 1 karta skrótów = 6 stron)"
            >
              <span>Karty dzienne (6 str.)</span>
              <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded font-mono">6 str.</span>
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
            title={printLayoutMode === 'all_in_one' ? 'Drukuj 2 strony A3: Plan całotygodniowy + Słownik' : 'Drukuj płachtę lub zapisz do pliku PDF'}
          >
            <Printer size={15} className="animate-pulse" />
            <span>
              {printLayoutMode === 'all_in_one'
                ? `Drukuj Płachtę (2 str. ${paperFormat})`
                : printLayoutMode === 'single_day'
                  ? `Drukuj Dzień (${paperFormat})`
                  : `Drukuj Płachtę (6 str. ${paperFormat})`}
            </span>
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

        {/* Right: Cell detail toggles, subject mode & Screen day tab selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Subject Display Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5">
            <span className="text-[10px] text-slate-400 font-bold">Przedmioty:</span>
            <select
              value={subjectDisplayMode}
              onChange={e => setSubjectDisplayMode(e.target.value as 'short' | 'full')}
              className="bg-transparent text-slate-200 text-[11px] font-bold outline-none cursor-pointer"
              title="Wybierz sposób wyświetlania przedmiotów: oficjalne skróty z Kreatora Szkoły (np. JP, MAT, WF) lub pełne nazwy"
            >
              <option value="short" className="bg-slate-900 text-white">Skróty z Kreatora (np. JP, MAT, WF)</option>
              <option value="full" className="bg-slate-900 text-white">Pełne nazwy przedmiotów</option>
            </select>
          </div>

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

          <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-white" title="Włącz lub wyłącz stronę ze słownikiem skrótów przedmiotów, kadr i metryką zatwierdzenia">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={e => setShowLegend(e.target.checked)}
              className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
            />
            <span>Słownik skrótów (Przedmioty & Kadra)</span>
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
              title={printLayoutMode === 'all_in_one' ? 'Karta 1: Tydzień (Pn–Pt)' : 'Wszystkie dni'}
            >
              {printLayoutMode === 'all_in_one' ? 'Tydzień (Pn–Pt)' : `Wszystkie (${daysToRender.length})`}
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
            <button
              type="button"
              onClick={() => setPreviewDayTab('legend')}
              className={`px-1.5 py-0.5 rounded font-bold transition ${
                previewDayTab === 'legend' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Zobacz Słownik skrótów przedmiotów z Kreatora, kadry pedagogicznej, sal i pieczęć urzędową"
            >
              📖 Słownik skrótów
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN SCROLLABLE PREVIEW CANVAS ── */}
      <div className="plachta-scroll-wrapper flex-1 overflow-auto p-3 sm:p-6 print:p-0 bg-slate-200/70 print:bg-white flex flex-col items-center">
        
        {/* Helper screen banner explaining multi-page A3 landscape output */}
        <div className="no-print w-full max-w-7xl mb-4 bg-emerald-950/80 border border-emerald-700/60 rounded-xl p-3 text-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Sparkles size={16} />
            </span>
            <div>
              <strong className="font-bold text-emerald-300">Wielkoformatowy wydruk Płachty Dyrektorskiej ({paperFormat} Poziomo) dla {baseEntities.length} kolumn:</strong>
              <span className="ml-1 text-emerald-200">
                {printLayoutMode === 'all_in_one' ? (
                  <>Wydruk złożony do <strong>2 stron {paperFormat}</strong>: Karta 1 to pełna płachta tygodniowa (Poniedziałek – Piątek z kolumną Dni tygodnia, Godzin oraz oddziałami) + Karta 2 to Słownik skrótów kadry, sal, przedmiotów i pieczęć urzędowa szkoły.</>
                ) : printLayoutMode === 'single_day' ? (
                  <>Wydruk wybranego 1 dnia ({DAYS_NAMES[singleDaySelection]}) na dedykowanej karcie {paperFormat}.</>
                ) : (
                  <>Wydruk obejmuje <strong>6 pełnych stron {paperFormat}</strong>: 5 kart dziennych (Poniedziałek – Piątek) + 1 dedykowaną kartę ze Słownikiem skrótów kadry, sal, przedmiotów i pieczęcią urzędową szkoły.</>
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handlePrint('all')}
            className="shrink-0 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title={printLayoutMode === 'all_in_one' ? 'Drukuj 2 strony A3: Plan całotygodniowy + Słownik' : 'Drukuj całą Płachtę'}
          >
            <Printer size={13} />
            {printLayoutMode === 'all_in_one' ? `Drukuj całą Płachtę (2 strony ${paperFormat})` : printLayoutMode === 'single_day' ? `Drukuj dzień (${paperFormat})` : `Drukuj całą Płachtę (6 stron ${paperFormat})`}
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
          {/* ── UNIFIED FULL-WEEK SHEET: ALL 5 DAYS ON ONE A3 SHEET (KARTA 1 Z 2) ── */}
          {printLayoutMode === 'all_in_one' && (previewDayTab === 'all' || typeof previewDayTab === 'number') && (
            <div 
              className={`plachta-page plachta-page-all-in-one bg-white shadow-xl print:shadow-none rounded-xl print:rounded-none border border-slate-300 print:border-none p-3 sm:p-4 print:p-0 ${
                showLegend ? 'plachta-page-break' : ''
              }`}
            >
              {/* ── SHEET HEADER FOR FULL WEEK ── */}
              <div className="border-b-2 border-slate-900 pb-1 mb-1 print:pb-0.5 print:mb-0.5 flex items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black text-[9px] print:text-[8px] uppercase tracking-wider">
                      PŁACHTA DYREKTORSKA · {matrixType === 'classes' ? 'ODDZIAŁY' : matrixType === 'teachers' ? 'KADRA PEDAGOGICZNA' : 'GABINETY I SALE'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-black text-[9.5px] print:text-[8.5px] uppercase tracking-wide">
                      TYGODNIOWY ROZKŁAD ZAJĘĆ (PONIEDZIAŁEK – PIĄTEK)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-black text-[8.5px] print:text-[8px] uppercase font-mono">
                      Karta 1 z {showLegend ? '2' : '1'}
                    </span>
                    {activeVariant && (
                      <span className="px-1.5 py-0.5 rounded border text-[8.5px] print:text-[7.5px] font-bold" style={{ borderColor: activeVariant.color, color: activeVariant.color }}>
                        Wariant: {activeVariant.name}
                      </span>
                    )}
                    {columnSplitMode !== 'all' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[8.5px] uppercase print:hidden">
                        {columnSplitMode === 'part1' ? 'Część 1' : 'Część 2'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <h1 className="text-sm print:text-[11px] font-black text-slate-900 tracking-tight leading-tight">
                      {appState.school.name || 'Szkoła'}
                    </h1>
                    <span className="text-[8.5px] print:text-[7.5px] font-semibold text-slate-600 leading-none">
                      · Rok szkolny {appState.yearLabel} · {scheduleVersion === 'etap1' ? 'Wersja bazowa (Plan Klas)' : 'Wersja gabinetowa (Plan Sal)'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[8.5px] print:text-[7.5px] font-mono text-slate-500 uppercase font-bold leading-none">
                    Arkusz: {paperFormat} Poziomo · Kolumn: {activeEntities.length} · Stan: <span className="font-extrabold text-slate-900">{activeVariant?.validFrom || new Date().toLocaleDateString('pl-PL')}</span>
                  </div>
                  {showSignatures && (
                    <div className="text-[8px] print:text-[7px] font-bold text-slate-600 uppercase mt-0.5 border border-dashed border-slate-400 px-1.5 py-0.5 rounded inline-block leading-none">
                      Zatwierdzam: ....................................... (Dyrektor Szkoły)
                    </div>
                  )}
                </div>
              </div>

              {/* ── MASTER MATRIX TABLE FOR ALL 5 DAYS ── */}
              <div className="overflow-x-auto print:overflow-visible border border-slate-800 rounded-lg print:rounded-none">
                <table className="plachta-table plachta-table-all-in-one w-full border-collapse text-left border border-slate-800 table-fixed">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase font-black text-center print:bg-slate-900 print:text-white">
                      <th 
                        className="plachta-day-col border border-slate-700 p-0.5 text-[8.5px] print:border-slate-800" 
                        style={{ width: '36px', minWidth: '36px', maxWidth: '36px' }}
                      >
                        Dzień
                      </th>
                      <th 
                        className="plachta-hour-col border border-slate-700 p-0.5 text-[8.5px] print:border-slate-800" 
                        style={{ width: '38px', minWidth: '38px', maxWidth: '38px' }}
                      >
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
                            style={{ width: colWidthPercent }}
                            className={`border border-slate-700 p-0.5 text-center font-black ${densityConfig.headerText} print:border-slate-800 overflow-hidden`}
                            title={ent.name}
                          >
                            <span className="block leading-none truncate">{label}</span>
                            {subLabel && (
                              <span className="block text-[6px] font-semibold text-slate-400 leading-none truncate max-w-[65px] mx-auto mt-0.5">
                                {subLabel}
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {(typeof previewDayTab === 'number' ? [previewDayTab] : daysToRender).map((dayIdx) => {
                      const dayName = DAYS_NAMES[dayIdx];
                      return hoursList.map((hour, hIdx) => {
                        const isFirstHourOfDay = hIdx === 0;
                        const isLastHourOfDay = hIdx === hoursList.length - 1;

                        return (
                          <tr 
                            key={`${dayIdx}_${hour.num}`} 
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isLastHourOfDay ? 'border-b-2 border-slate-900 print-border-thick' : 'border-b border-slate-200'
                            }`}
                          >
                            {/* Left Col 1: Day Name spanning all hours of this day */}
                            {isFirstHourOfDay && (
                              <td 
                                rowSpan={hoursList.length} 
                                className="plachta-day-col border-r-2 border-b-2 border-slate-900 bg-slate-100 text-center align-middle font-black p-0.5 select-none print:bg-slate-100"
                                style={{ width: '36px', minWidth: '36px', maxWidth: '36px' }}
                              >
                                <div className="flex flex-col items-center justify-center h-full py-0.5">
                                  <span className="text-[7px] font-bold text-slate-500 uppercase font-mono block mb-0.5 leading-none">
                                    {DAYS_SHORT[dayIdx] || `DZ. ${dayIdx + 1}`}
                                  </span>
                                  <span 
                                    className="font-black text-[8px] text-slate-900 uppercase tracking-widest block leading-none"
                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                  >
                                    {dayName}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Col 2: Hour Number and Time Range */}
                            <td 
                              className="plachta-hour-col border-r border-slate-300 p-0.5 bg-slate-50/90 text-center font-mono leading-tight print:bg-slate-50 print:border-slate-400"
                              style={{ width: '38px', minWidth: '38px', maxWidth: '38px' }}
                            >
                              <span className="font-extrabold text-slate-900 text-[8px] block leading-none">{hour.num}</span>
                              <span className="text-[5.5px] text-slate-500 block leading-none font-bold mt-0.5">
                                {hour.start}
                              </span>
                            </td>

                            {/* Col 3..N: Classes (or Teachers / Rooms) */}
                            {activeEntities.map(ent => {
                              const entries = getCellEntries(ent.id, dayIdx, hour.num, hIdx);

                              if (entries.length === 0) {
                                return (
                                  <td 
                                    key={ent.id} 
                                    style={{ width: colWidthPercent }}
                                    className={`border border-slate-300 p-0 text-center ${densityConfig.height} bg-white/60 print:bg-white print:border-slate-300`}
                                  >
                                    <span className="text-[6px] text-slate-200 font-light select-none">·</span>
                                  </td>
                                );
                              }

                              return (
                                <td 
                                  key={ent.id} 
                                  style={{ width: colWidthPercent }}
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
                                          className="plachta-entry-box rounded px-0.5 py-0.5 border leading-tight transition-all"
                                          style={{ 
                                            backgroundColor: colors.bg,
                                            borderColor: colors.border,
                                            color: colors.text
                                          }}
                                        >
                                          {/* Main title: Subject or Class */}
                                          <div className="flex items-center justify-between gap-0.5">
                                            <span 
                                              className={`plachta-entry-title font-black uppercase truncate ${densityConfig.cellText}`}
                                              title={`${entry.subjectName} (${entry.subjectShort})`}
                                            >
                                              {matrixType === 'teachers' || matrixType === 'rooms' 
                                                ? (entry.fullClsName || (subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort)) 
                                                : (subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort)}
                                            </span>
                                            {entry.groupLabel && showGroups && (
                                              <span className="text-[4.5px] font-bold uppercase opacity-80 shrink-0">
                                                [{entry.groupLabel}]
                                              </span>
                                            )}
                                          </div>

                                          {/* Subline: Teacher / Room / Subject in teacher mode */}
                                          <div className={`plachta-entry-sub flex items-center justify-between gap-0.5 mt-0.5 opacity-90 ${densityConfig.subText} font-bold`}>
                                            {matrixType === 'classes' && (
                                              <>
                                                {showTeacherAbbr && (
                                                  <span className="truncate">{entry.teacherAbbr}</span>
                                                )}
                                                {showRoomNum && entry.roomName && (
                                                  <span className="truncate text-right font-mono">
                                                    s.{entry.roomName}
                                                  </span>
                                                )}
                                              </>
                                            )}

                                            {matrixType === 'teachers' && (
                                              <>
                                                <span className="truncate">{subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort}</span>
                                                {showRoomNum && entry.roomName && (
                                                  <span className="truncate font-mono">s.{entry.roomName}</span>
                                                )}
                                              </>
                                            )}

                                            {matrixType === 'rooms' && (
                                              <>
                                                <span className="truncate">{subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort}</span>
                                                {showTeacherAbbr && (
                                                  <span className="truncate font-mono">{entry.teacherAbbr}</span>
                                                )}
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

              {/* ── COMPACT SUBJECT ABBREVIATIONS BAR ON SHEET 1 ── */}
              <div className="mt-1 mb-0.5 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded print:border-slate-300 flex items-center gap-1.5 flex-wrap text-[7.5px] print:text-[6.5px] leading-tight text-slate-700">
                <span className="font-black text-slate-900 uppercase shrink-0 font-mono flex items-center gap-1">
                  <BookOpen size={9} className="text-indigo-600 inline" />
                  <span>Skróty przedmiotów:</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {comprehensiveSubjectsList.slice(0, 18).map(s => (
                    <span key={s.id} className="inline-flex items-baseline gap-0.5" title={s.name}>
                      <strong className="font-black text-slate-950 font-mono">[{s.short}]</strong>
                      <span className="text-slate-600">{s.name}</span>
                    </span>
                  ))}
                  {comprehensiveSubjectsList.length > 18 && (
                    <span className="text-indigo-600 font-bold">
                      +{comprehensiveSubjectsList.length - 18} więcej na Karcie 2 (Słownik skrótów)
                    </span>
                  )}
                </div>
              </div>

              {/* ── FULL WEEK SHEET BOTTOM FOOTER ── */}
              <div className="mt-1 pt-0.5 print:mt-0.5 print:pt-0.5 border-t border-slate-300 flex justify-between items-center text-[8px] print:text-[7px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                    Pełna Płachta Tygodniowa (Poniedziałek – Piątek)
                  </span>
                  <span>·</span>
                  <span>Format: <strong>{paperFormat} Poziomo</strong></span>
                  <span>·</span>
                  <span className="text-slate-600">Słownik skrótów kadry, sal i pieczęć na Karcie 2</span>
                </div>
                <div className="font-mono font-bold text-slate-700">
                  Karta 1 z {showLegend ? '2' : '1'} (Pełny tydzień lekcyjny)
                </div>
              </div>
            </div>
          )}

          {/* ── DAY-BY-DAY SHEETS (EACH DAY ON A SEPARATE CARD) ── */}
          {printLayoutMode !== 'all_in_one' && daysOnScreen.map((dayIdx, dIdx) => {
            const dayName = DAYS_NAMES[dayIdx];
            const isLastRenderedDay = dIdx === daysOnScreen.length - 1;

            return (
              <React.Fragment key={dayIdx}>
                <div 
                  className={`plachta-page bg-white shadow-xl print:shadow-none rounded-xl print:rounded-none border border-slate-300 print:border-none p-5 sm:p-6 print:p-0 ${
                    (!isLastRenderedDay || showLegend) ? 'plachta-page-break' : ''
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
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-black text-[9.5px] uppercase font-mono">
                        Karta {dayIdx + 1} z 6
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
                  <table className="plachta-table w-full border-collapse text-left border border-slate-800 table-fixed">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase font-black text-center print:bg-slate-900 print:text-white">
                        <th className="border border-slate-700 p-1 text-[9.5px] print:border-slate-800" style={{ width: '44px', minWidth: '44px', maxWidth: '44px' }}>
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
                              style={{ width: colWidthPercent }}
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
                            <td className="border-r border-slate-300 p-0.5 bg-slate-50/80 text-center font-mono leading-tight print:bg-slate-50 print:border-slate-400" style={{ width: '44px', minWidth: '44px', maxWidth: '44px' }}>
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
                                    style={{ width: colWidthPercent }}
                                    className={`border border-slate-300 p-0 text-center ${densityConfig.height} bg-white/60 print:bg-white print:border-slate-300`}
                                  >
                                    <span className="text-[8px] text-slate-200 font-light select-none">·</span>
                                  </td>
                                );
                              }

                              return (
                                <td 
                                  key={ent.id}
                                  style={{ width: colWidthPercent }}
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
                                            <span 
                                              className={`font-black uppercase truncate ${densityConfig.cellText}`}
                                              title={`${entry.subjectName} (${entry.subjectShort})`}
                                            >
                                              {matrixType === 'teachers' || matrixType === 'rooms'
                                                ? (entry.fullClsName || (subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort))
                                                : (subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort)}
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
                                                <span className="truncate">{subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort}</span>
                                                {showRoomNum && entry.roomName && (
                                                  <span className="truncate font-mono">s.{entry.roomName}</span>
                                                )}
                                              </>
                                            )}

                                            {matrixType === 'rooms' && (
                                              <>
                                                <span className="truncate">{subjectDisplayMode === 'full' ? entry.subjectName : entry.subjectShort}</span>
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

                {/* Compact Subject Abbreviations Bar on Day Sheet */}
                <div className="mt-1 mb-0.5 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded print:border-slate-300 flex items-center gap-1.5 flex-wrap text-[7.5px] print:text-[6.5px] leading-tight text-slate-700">
                  <span className="font-black text-slate-900 uppercase shrink-0 font-mono flex items-center gap-1">
                    <BookOpen size={9} className="text-indigo-600 inline" />
                    <span>Skróty przedmiotów:</span>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {comprehensiveSubjectsList.slice(0, 18).map(s => (
                      <span key={s.id} className="inline-flex items-baseline gap-0.5" title={s.name}>
                        <strong className="font-black text-slate-950 font-mono">[{s.short}]</strong>
                        <span className="text-slate-600">{s.name}</span>
                      </span>
                    ))}
                    {comprehensiveSubjectsList.length > 18 && (
                      <span className="text-indigo-600 font-bold">
                        +{comprehensiveSubjectsList.length - 18} więcej na Karcie ze Słownikiem
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Sheet Bottom Info */}
                <div className="mt-1.5 pt-1 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                      Arkusz dzienny: {dayName}
                    </span>
                    <span>·</span>
                    <span>Format arkusza: <strong>{paperFormat} Poziomo</strong></span>
                    <span>·</span>
                    <span className="text-slate-600">Słownik skrótów kadry, sal i pieczęć na Karcie końcowej</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">
                    Karta {dayIdx + 1} z {daysToRender.length + (showLegend ? 1 : 0)} (Dzień {dayIdx + 1}: {dayName})
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* ── SEPARATE FINAL SHEET: CADRE LEGEND & OFFICIAL SCHOOL VALIDATION ── */}
        {showLegend && (previewDayTab === 'all' || previewDayTab === 'legend') && (
          <div className="plachta-page plachta-legend-page bg-white shadow-xl print:shadow-none rounded-xl print:rounded-none border border-slate-300 print:border-none p-5 sm:p-6 print:p-0 print-avoid-break">
            <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase font-mono tracking-wider">
                    {printLayoutMode === 'all_in_one' ? 'Karta 2 z 2' : printLayoutMode === 'single_day' ? 'Karta 2 z 2' : `Karta ${daysToRender.length + 1} z ${daysToRender.length + 1}`}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <BookOpen size={16} className="text-indigo-600" />
                    <span>Słownik Skrótów Przedmiotów, Kadry Pedagogicznej, Sal i Zatwierdzenie Planu</span>
                  </h3>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Oficjalny słownik skrótów z Kreatora Szkoły, legenda oznaczeń oraz urzędowa metryka zatwierdzenia planu lekcji
                </p>
              </div>
              <div className="text-[10px] font-bold text-slate-700 text-right">
                <span className="font-extrabold text-indigo-700">{comprehensiveSubjectsList.length}</span> przedmiotów · 
                <span className="font-extrabold text-slate-900 ml-1">{filteredTeachers.length}</span> nauczycieli · 
                <span className="font-extrabold text-slate-900 ml-1">{filteredRooms.length}</span> gabinetów · 
                <span className="font-extrabold text-slate-900 ml-1">{pl.classes.length}</span> oddziałów
              </div>
            </div>

            {/* 1. Subjects abbreviation dictionary from Kreator Szkoły */}
            <div className="space-y-1 mb-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <BookOpen size={13} className="text-indigo-600" />
                  <span>Słownik Skrótów Przedmiotów z Kreatora Szkoły ({comprehensiveSubjectsList.length}):</span>
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium">
                  Oficjalne skróty stosowane na Płachcie Dyrektorskiej
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 text-[8.5px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {comprehensiveSubjectsList.map(s => {
                  const colors = getSubjectCategoryColor(s.name, s.short, colorMode === 'mono');
                  return (
                    <div 
                      key={s.id} 
                      className="flex items-center gap-1.5 p-1 rounded bg-white border border-slate-200 shadow-xs"
                      title={s.name}
                    >
                      <span 
                        className="font-black text-[9px] px-1.5 py-0.5 rounded shrink-0 font-mono"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, borderWidth: '1px' }}
                      >
                        [{s.short}]
                      </span>
                      <span className="truncate font-semibold text-slate-800" title={s.name}>
                        {s.name}
                      </span>
                      {s.count > 0 && (
                        <span className="text-[7.5px] text-slate-400 font-mono shrink-0 ml-auto">
                          {s.count}h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Teachers grid */}
            <div className="space-y-1 mb-3">
              <span className="text-[10px] font-black uppercase text-slate-800 block tracking-wider">
                Słownik Skrótów Kadry Pedagogicznej ({filteredTeachers.length}):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-1 text-[9px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                {filteredTeachers.map(t => (
                  <div key={t.id} className="flex items-baseline gap-1 truncate bg-white p-0.5 px-1 rounded border border-slate-200" title={`${t.first} ${t.last}`}>
                    <span className="font-black text-indigo-900 shrink-0 font-mono">[{t.abbr}]</span>
                    <span className="truncate font-medium">{t.last} {t.first?.substring(0, 1)}.</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Rooms & Color categories Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3.5">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[9.5px] font-black uppercase text-slate-800 block tracking-wider mb-1">
                  Wykaz Gabinetów i Sal Lekcyjnych ({filteredRooms.length}):
                </span>
                <div className="flex flex-wrap gap-1 text-[8.5px] text-slate-700">
                  {filteredRooms.map(r => (
                    <span key={r.id} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                      <strong>s.{r.name}</strong> {r.desc ? `(${r.desc.substring(0, 14)})` : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[9.5px] font-black uppercase text-slate-800 block tracking-wider mb-1">
                  Klucz Kolorów Kategorii Przedmiotów:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[8.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Humanistyczne (Pol, JP, Hist, WOS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Ścisłe (Mat, Fiz, Chem, Bio, Geo)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100 border border-green-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Języki obce (Ang, Niem, Hiszp)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Edukacja Wczesnoszkolna (EW)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Wychowanie Fizyczne (WF, Sport)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-cyan-100 border border-cyan-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Informatyka & Technologie (INF)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Sztuka i Muzyka (Plast, Muz)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-pink-100 border border-pink-300 shrink-0" />
                    <span className="text-slate-700 font-bold">Wsparcie & SPE (Rewal, Terap)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Official Seal and Signature Section */}
            <div className="pt-2.5 border-t-2 border-slate-900 flex justify-between items-end text-[9px] text-slate-600">
              <div>
                <strong>SalePlan Pro</strong> • Wygenerowano dla: {appState.school.name} ({appState.yearLabel}) • {printLayoutMode === 'all_in_one' ? 'Karta 2 z 2' : printLayoutMode === 'single_day' ? 'Karta 2 z 2' : `Karta ${daysToRender.length + 1} z ${daysToRender.length + 1}`} (Słownik skrótów i metryka zatwierdzenia) • {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-end gap-8 text-right">
                <div className="border-t border-dotted border-slate-600 pt-1 px-6 inline-block text-center font-bold text-slate-800 uppercase text-[8.5px]">
                  Pieczęć Szkoły
                </div>
                <div className="border-t border-dotted border-slate-600 pt-1 px-8 inline-block text-center font-bold text-slate-800 uppercase text-[8.5px]">
                  Podpis Dyrektora Szkoły
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
