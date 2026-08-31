import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom, SchoolGroup, SchedCell } from '../types';
import { Printer, Calendar, User, MapPin, Shield, Layers, FileText, CheckCircle, X, ExternalLink } from 'lucide-react';
import { flattenColumns as localFlattenColumns, colKey as localColKey, cleanFloorName as localCleanFloorName } from '../utils';

interface WydrukiProps {
  appState: AppState;
  schedData: SchedData;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const getRoomCategory = (room: { name: string; desc?: string }): 'ogolne' | 'indywidualne' | 'sportowe' => {
  const name = room.name.toLowerCase();
  const desc = (room.desc || '').toLowerCase();

  // Sports facilities: basen, hala, sala gimnastyczna, fitness, wf, boisko, stadion, gym
  if (
    name.includes('basen') || name.includes('hala') || name.includes('wf') ||
    name.includes('gimn') || name.includes('sport') || name.includes('boisko') ||
    name.includes('s.gim') || name.includes('sgim') || name.includes('gym') ||
    desc.includes('gimn') || desc.includes('sport') || desc.includes('basen') ||
    desc.includes('hala') || desc.includes('wf') || desc.includes('boisko') ||
    desc.includes('fitness') || desc.includes('aerob') || desc.includes('stadion')
  ) {
    return 'sportowe';
  }

  // Individual / Therapy rooms: indyw, terap, rewa, logop, psych, pedag, korek, rewalidacja, logopeda, psycholog, pedagog, terapeutyczna, językowa, jezyk, sensoryczna
  if (
    name.includes('indyw') || name.includes('terap') || name.includes('rewa') ||
    name.includes('logop') || name.includes('psych') || name.includes('pedag') ||
    name.includes('korek') || name.includes('język') || name.includes('jezyk') ||
    desc.includes('indyw') || desc.includes('terap') || desc.includes('rewa') ||
    desc.includes('logop') || desc.includes('psych') || desc.includes('pedag') ||
    desc.includes('korek') || desc.includes('język') || desc.includes('jezyk') ||
    desc.includes('rewalid') || desc.includes('terapia') || desc.includes('specjal') ||
    desc.includes('gabinet') || desc.includes('sensory') || desc.includes('wspomag')
  ) {
    return 'indywidualne';
  }

  return 'ogolne';
};

function getFloorGroups(categoryCols: any[], buildings: any[]) {
  const groups: { startIdx: number; span: number; name: string; buildingName?: string }[] = [];
  let currentGroup = null as any;

  categoryCols.forEach((col, idx) => {
    const bIdx = col.floor.buildingIdx;
    const bld = buildings[bIdx];
    const buildingName = bld?.name || '';
    const fId = col.floor.id;
    const name = col.floor.name;
    const key = `${bIdx}|${fId}`;

    if (!currentGroup || currentGroup.key !== key) {
      currentGroup = { startIdx: idx, span: 1, key, name, buildingName };
      groups.push(currentGroup);
    } else {
      currentGroup.span++;
    }
  });

  return groups;
}

function getSegmentGroups(categoryCols: any[]) {
  const groups: { startIdx: number; span: number; name: string }[] = [];
  let currentGroup = null as any;

  categoryCols.forEach((col, idx) => {
    const bIdx = col.floor.buildingIdx;
    const fId = col.floor.id;
    const sId = col.seg?.id || 'default_seg';
    const name = col.seg?.name || 'Główny';
    const key = `${bIdx}|${fId}|${sId}`;

    if (!currentGroup || currentGroup.key !== key) {
      currentGroup = { startIdx: idx, span: 1, key, name };
      groups.push(currentGroup);
    } else {
      currentGroup.span++;
    }
  });

  return groups;
}

export default function Wydruki({ appState, schedData }: WydrukiProps) {
  const [printType, setPrintType] = useState<'classes' | 'teachers' | 'rooms' | 'duties'>('classes');
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
  
  // Selected filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [isPrintFriendlyWeeklyMode, setIsPrintFriendlyWeeklyMode] = useState<boolean>(false);
  const [weeklyPageOrientation, setWeeklyPageOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  // Rooms dedicated print friendly & scaling states
  const [isRoomsPrintFriendlyMode, setIsRoomsPrintFriendlyMode] = useState<boolean>(false);
  const [roomsPageOrientation, setRoomsPageOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [roomsSplitMode, setRoomsSplitMode] = useState<'floors' | 'cols' | 'none'>('floors');
  const [roomsSelectedFloor, setRoomsSelectedFloor] = useState<string | 'all'>('all');
  const [roomsMaxColsPerPage, setRoomsMaxColsPerPage] = useState<number>(12);
  const [roomsSelectedDay, setRoomsSelectedDay] = useState<number | 'all'>('all');
  const [roomsSelectedCategory, setRoomsSelectedCategory] = useState<string>('all');
  const [roomsPrintScale, setRoomsPrintScale] = useState<number>(1.0);
  
  // State for in-app interactive duties print preview modal
  const [isDutiesModalOpen, setIsDutiesModalOpen] = useState<boolean>(false);
  const [dutiesModalScale, setDutiesModalScale] = useState<number>(1.0);
  const [dutiesModalDayFilter, setDutiesModalDayFilter] = useState<number | 'all'>('all');
  
  // Teacher schedule configuration
  const [showDutiesInTeacherPlan, setShowDutiesInTeacherPlan] = useState<boolean>(true);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Dynamic viewport scaling manager for mobile/tablet print and preview containers
  useEffect(() => {
    if (isPrintFriendlyWeeklyMode || isRoomsPrintFriendlyMode) {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      const originalContent = viewportMeta ? viewportMeta.getAttribute('content') : '';
      
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      
      const orientation = isRoomsPrintFriendlyMode ? roomsPageOrientation : weeklyPageOrientation;
      const targetWidth = orientation === 'landscape' ? '1120' : '794';
      viewportMeta.setAttribute('content', `width=${targetWidth}, initial-scale=0.8, shrink-to-fit=no`);
      
      const styleEl = document.createElement('style');
      styleEl.id = 'print-mobile-viewport-adjustments';
      styleEl.innerHTML = `
        @media print {
          @page {
            size: ${orientation};
            margin: 6mm 8mm;
          }
          html, body {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #weekly-print-overlay, #rooms-print-overlay {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `;
      document.head.appendChild(styleEl);

      return () => {
        if (viewportMeta) {
          if (originalContent) {
            viewportMeta.setAttribute('content', originalContent);
          } else {
            viewportMeta.removeAttribute('content');
          }
        }
        const tempStyle = document.getElementById('print-mobile-viewport-adjustments');
        if (tempStyle) tempStyle.remove();
      };
    }
  }, [isPrintFriendlyWeeklyMode, weeklyPageOrientation, isRoomsPrintFriendlyMode, roomsPageOrientation]);

  const pl = appState.planLekcji;

  // --- Map and parse yearLabel to auto-preset start/end dates of the school year ---
  const defaultDates = useMemo(() => {
    const label = appState.yearLabel || '';
    const match = label.match(/(\d{4})/);
    let startYear = new Date().getFullYear();
    let endYear = startYear + 1;
    if (match) {
      startYear = parseInt(match[1], 10);
      const match2 = label.match(/\d{4}.*?(\d{4})/);
      if (match2) {
        endYear = parseInt(match2[1], 10);
      } else {
        endYear = startYear + 1;
      }
    }
    return {
      start: `${startYear}-09-01`,
      end: `${endYear}-06-25`
    };
  }, [appState.yearLabel]);

  const [startDateInput, setStartDateInput] = useState(defaultDates.start);
  const [endDateInput, setEndDateInput] = useState(defaultDates.end);
  const [nameFormat, setNameFormat] = useState('[Przedmiot] - [Klasa] [Sala]');

  // Keep date values in sync with state in case the school year changes in the parent component
  useEffect(() => {
    setStartDateInput(defaultDates.start);
    setEndDateInput(defaultDates.end);
  }, [defaultDates]);

  // Help calculate the first date corresponding to dayIdx (0 = Monday, ..., 4 = Friday) on or after startDateInput
  const getFirstOccurrence = (startDateStr: string, dayIdx: number) => {
    const start = new Date(startDateStr);
    const targetDay = dayIdx + 1; // 1 = Monday, 5 = Friday
    const currentDay = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let diff = targetDay - currentDay;
    if (diff < 0) {
      diff += 7;
    }
    
    const result = new Date(start);
    result.setDate(start.getDate() + diff);
    return result;
  };

  const formatIcsDateTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
  };

  const formatIcsUntil = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T235959Z`;
  };

  const escapeIcsText = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n')
      .trim();
  };

  const RRULE_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR'];

  const handleExportTeacherIcs = (teacher: Teacher) => {
    const lessons = getTeacherLessonsList(teacher);
    if (lessons.length === 0) {
      alert(`Nauczyciel ${teacher.last} ${teacher.first} nie ma przypisanych żadnych lekcji w wybranym planie.`);
      return;
    }

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SalePlan Pro//NONSGML v1.0//PL',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    lessons.forEach((lesson) => {
      const firstOccur = getFirstOccurrence(startDateInput, lesson.dayIdx);
      const [startH, startM] = lesson.start.split(':').map(Number);
      const [endH, endM] = lesson.end.split(':').map(Number);

      const eventStart = new Date(firstOccur);
      eventStart.setHours(startH, startM, 0, 0);

      const eventEnd = new Date(firstOccur);
      eventEnd.setHours(endH, endM, 0, 0);

      const summary = nameFormat
        .replace('[Przedmiot]', lesson.subject)
        .replace('[Klasa]', lesson.className)
        .replace('[Sala]', lesson.roomName ? `s. ${lesson.roomName}` : '')
        .replace(/\s+/g, ' ')
        .trim();

      const description = `Lekcja: ${lesson.hourNum} (${lesson.start}-${lesson.end})\\n` +
        `Nauczyciel: ${teacher.last} ${teacher.first} (${teacher.abbr})\\n` +
        `Klasa: ${lesson.className}\\n` +
        (lesson.roomName ? `Sala: ${lesson.roomName}\\n` : '') +
        `Wygenerowano automatycznie z SalePlan Pro`;

      const location = lesson.roomName ? `Sala ${lesson.roomName}` : '';
      const eventUid = `asg-${teacher.id}-${lesson.dayIdx}-${lesson.hourNum}-${lesson.className.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}@saleplan.pro`;
      const untilDate = new Date(endDateInput);

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${eventUid}`);
      ics.push(`DTSTAMP:${formatIcsDateTime(new Date())}Z`);
      ics.push(`DTSTART:${formatIcsDateTime(eventStart)}`);
      ics.push(`DTEND:${formatIcsDateTime(eventEnd)}`);
      ics.push(`RRULE:FREQ=WEEKLY;UNTIL=${formatIcsUntil(untilDate)};BYDAY=${RRULE_DAYS[lesson.dayIdx]}`);
      ics.push(`SUMMARY:${escapeIcsText(summary)}`);
      ics.push(`LOCATION:${escapeIcsText(location)}`);
      ics.push(`DESCRIPTION:${escapeIcsText(description)}`);
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');

    const icsContent = ics.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan_${teacher.last}_${teacher.first}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAllTeachersIcs = () => {
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SalePlan Pro//NONSGML v1.0//PL',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    let totalLessonsCount = 0;

    pl.teachers.forEach((teacher) => {
      const lessons = getTeacherLessonsList(teacher);
      lessons.forEach((lesson) => {
        totalLessonsCount++;
        const firstOccur = getFirstOccurrence(startDateInput, lesson.dayIdx);
        const [startH, startM] = lesson.start.split(':').map(Number);
        const [endH, endM] = lesson.end.split(':').map(Number);

        const eventStart = new Date(firstOccur);
        eventStart.setHours(startH, startM, 0, 0);

        const eventEnd = new Date(firstOccur);
        eventEnd.setHours(endH, endM, 0, 0);

        const summary = `[${teacher.abbr}] ` + nameFormat
          .replace('[Przedmiot]', lesson.subject)
          .replace('[Klasa]', lesson.className)
          .replace('[Sala]', lesson.roomName ? `s. ${lesson.roomName}` : '')
          .replace(/\s+/g, ' ')
          .trim();

        const description = `Nauczyciel: ${teacher.last} ${teacher.first} (${teacher.abbr})\\n` +
          `Lekcja: ${lesson.hourNum} (${lesson.start}-${lesson.end})\\n` +
          `Klasa: ${lesson.className}\\n` +
          (lesson.roomName ? `Sala: ${lesson.roomName}\\n` : '') +
          `Wygenerowano automatycznie z SalePlan Pro`;

        const location = lesson.roomName ? `Sala ${lesson.roomName}` : '';
        const eventUid = `asg-all-${teacher.id}-${lesson.dayIdx}-${lesson.hourNum}-${lesson.className.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}-${totalLessonsCount}@saleplan.pro`;
        const untilDate = new Date(endDateInput);

        ics.push('BEGIN:VEVENT');
        ics.push(`UID:${eventUid}`);
        ics.push(`DTSTAMP:${formatIcsDateTime(new Date())}Z`);
        ics.push(`DTSTART:${formatIcsDateTime(eventStart)}`);
        ics.push(`DTEND:${formatIcsDateTime(eventEnd)}`);
        ics.push(`RRULE:FREQ=WEEKLY;UNTIL=${formatIcsUntil(untilDate)};BYDAY=${RRULE_DAYS[lesson.dayIdx]}`);
        ics.push(`SUMMARY:${escapeIcsText(summary)}`);
        ics.push(`LOCATION:${escapeIcsText(location)}`);
        ics.push(`DESCRIPTION:${escapeIcsText(description)}`);
        ics.push('END:VEVENT');
      });
    });

    if (totalLessonsCount === 0) {
      alert(`Brak przypisanych lekcji w całym planie lekcji.`);
      return;
    }

    ics.push('END:VCALENDAR');

    const icsContent = ics.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan_wszyscy_nauczyciele.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Helpers to resolve names ---
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);
  const groupsMap = useMemo(() => new Map((pl.schoolGroups || []).map(g => [g.id, g])), [pl.schoolGroups]);

  // Helper to format subject short code cleanly (e.g. "ang", "mat", "pol")
  const getSubjectShort = (subjectNameOrId: string, subjectObj?: any): string => {
    if (subjectObj && subjectObj.short && String(subjectObj.short).trim()) {
      return String(subjectObj.short).trim();
    }
    const found = pl.subjects.find(s => s.id === subjectNameOrId || s.name.toLowerCase().trim() === String(subjectNameOrId).toLowerCase().trim());
    if (found && found.short && found.short.trim()) {
      return found.short.trim();
    }
    const appFound = appState.subjects.find(s => s.id === subjectNameOrId || s.name.toLowerCase().trim() === String(subjectNameOrId).toLowerCase().trim());
    if (appFound && appFound.short && appFound.short.trim()) {
      return appFound.short.trim();
    }
    const name = found?.name || appFound?.name || subjectNameOrId || '';
    if (!name) return '';
    if (name.length <= 4) return name;
    const lower = name.toLowerCase();
    if (lower.includes('angielsk')) return 'ang';
    if (lower.includes('polsk')) return 'pol';
    if (lower.includes('matemat')) return 'mat';
    if (lower.includes('fizyk')) return 'fiz';
    if (lower.includes('chem')) return 'chem';
    if (lower.includes('biolog')) return 'biol';
    if (lower.includes('geograf')) return 'geogr';
    if (lower.includes('histor')) return 'hist';
    if (lower.includes('informat')) return 'inf';
    if (lower.includes('fizyczn') || lower.includes('w-f') || lower.includes('wf')) return 'WF';
    if (lower.includes('relig')) return 'rel';
    if (lower.includes('muzyk')) return 'muz';
    if (lower.includes('plastyk')) return 'plas';
    if (lower.includes('technik')) return 'tech';
    if (lower.includes('niemieck')) return 'niem';
    if (lower.includes('hiszpań') || lower.includes('hiszpan')) return 'hiszp';
    if (lower.includes('francusk')) return 'franc';
    if (lower.includes('rosyjsk')) return 'ros';
    if (lower.includes('etyk')) return 'etyka';
    if (lower.includes('godzina wychowawcza') || lower.includes('zajęcia z wychowawcą')) return 'GW';
    if (lower.includes('edukacja wczesnoszkolna')) return 'EW';
    if (lower.includes('edukacja dla bezpieczeństwa')) return 'EDB';
    if (lower.includes('wiedza o społeczeństwie')) return 'WOS';
    if (lower.includes('historia i teraźniejszość')) return 'HIT';
    return name.slice(0, 4);
  };

  // Helper to format group short representation cleanly (e.g. "G1", "G2", "chł", "dz")
  // Filters out subject descriptors, religion, minority language notes to avoid repetitions in cells
  const getGroupShort = (groupIdOrName?: string | null, subjectContext?: string): string => {
    if (!groupIdOrName) return '';
    const trimmed = String(groupIdOrName).trim();
    if (!trimmed) return '';
    const grpObj = (pl.schoolGroups || []).find(g => g.id === trimmed || g.name.toLowerCase() === trimmed.toLowerCase());
    const name = grpObj ? grpObj.name.trim() : trimmed;

    // Direct group patterns
    if (/^g\s*\d+$/i.test(name)) {
      return name.toUpperCase().replace(/\s+/, '');
    }
    const mGrupa = name.match(/^grupa\s*(\d+|[a-zA-Z]+)/i);
    if (mGrupa) {
      return `G${mGrupa[1].toUpperCase()}`;
    }
    const mGr = name.match(/^gr\.?\s*(\d+|[a-zA-Z]+)/i);
    if (mGr) {
      return `G${mGr[1].toUpperCase()}`;
    }
    if (/^\d+$/.test(name)) {
      return `G${name}`;
    }
    if (/^1\/2$/i.test(name) || /^gr\.?\s*1\/2$/i.test(name)) return 'G1';
    if (/^2\/2$/i.test(name) || /^gr\.?\s*2\/2$/i.test(name)) return 'G2';
    if (name.toLowerCase() === 'chłopcy' || name.toLowerCase() === 'chlopcy') return 'chł';
    if (name.toLowerCase() === 'dziewczęta' || name.toLowerCase() === 'dziewczeta') return 'dz';

    // If name is actually a subject qualifier or subject description, NOT a group index
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('relig') ||
      lowerName.includes('mniejszoś') ||
      lowerName.includes('mniejszos') ||
      lowerName.includes('hiszpań') ||
      lowerName.includes('hiszpan') ||
      lowerName.includes('niemieck') ||
      lowerName.includes('angielsk') ||
      lowerName.includes('informat') ||
      lowerName.includes('etyk') ||
      lowerName.includes('fizyczn') ||
      lowerName.includes('wf')
    ) {
      return '';
    }

    if (subjectContext) {
      const sLower = subjectContext.toLowerCase();
      if (lowerName.includes(sLower) || sLower.includes(lowerName)) {
        return '';
      }
    }

    if (name.length <= 4 && !/^[A-Z0-9]{3,}$/.test(name)) {
      return name;
    }

    return '';
  };

  // Resolve hours list
  const hoursList = useMemo(() => {
    return pl.hours && pl.hours.length > 0 ? pl.hours : [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:55', end: '11:40' },
      { num: 5, start: '11:50', end: '12:35' },
    ];
  }, [pl.hours]);

  // Fast lookup from colKey (e.g. f0_s0_101) to room definition in appState.floors
  const colKeyToRoomMap = useMemo(() => {
    const map = new Map<string, { num: string; sub?: string; name: string; floorName: string }>();
    const rawCols = localFlattenColumns(appState.floors || []);
    rawCols.forEach(col => {
      const key = localColKey(col);
      const num = (col.room?.num || '').trim();
      const sub = (col.room?.sub || '').trim();
      const name = num || sub || 'Sala';
      const floorName = col.floor?.name || '';
      map.set(key, { num, sub, name, floorName });
    });
    return map;
  }, [appState.floors]);

  // Robust resolver that extracts the actual room name from the Plan Sal column
  const resolveRoomFromColKey = useCallback((cKey: string): string => {
    if (!cKey) return '';
    const fromMap = colKeyToRoomMap.get(cKey);
    if (fromMap && fromMap.name) return fromMap.name;

    // Pattern matching on colKey e.g. f0_s1_104 or f0_s0_Gimnastyczna or f1_s2_r3
    const parts = cKey.split('_');
    if (parts.length >= 3) {
      const fi = parseInt(parts[0].replace('f', ''), 10);
      const si = parseInt(parts[1].replace('s', ''), 10);
      const lastPart = parts.slice(2).join('_');
      
      if (lastPart.startsWith('r') && /^\d+$/.test(lastPart.slice(1))) {
        const ri = parseInt(lastPart.slice(1), 10);
        const roomObj = appState.floors?.[fi]?.segments?.[si]?.rooms?.[ri];
        if (roomObj) {
          return (roomObj.num || roomObj.sub || '').trim() || `Sala ${ri + 1}`;
        }
      } else if (lastPart) {
        return lastPart;
      }
    }

    // Direct room match in pl.rooms
    const directRoom = pl.rooms.find(r => r.id === cKey || r.name === cKey || (r.name && r.name.toLowerCase() === cKey.toLowerCase()));
    if (directRoom) return directRoom.name;

    return '';
  }, [colKeyToRoomMap, appState.floors, pl.rooms]);

  // Helper: check if a lesson from SchedData (Etap 2) belongs to a specific class, teacher, or room
  // schedData structure: yearKey -> dayIdx -> hourKey -> colKey -> SchedCell | SchedCell[]
  const etap2Schedule = useMemo(() => {
    const yearKey = appState.yearKey;
    const yearData = schedData[yearKey] || {};
    
    // We want to turn it into an easily queryable structure:
    // class -> day -> hour -> { subject, teacherAbbr, roomName, isCoaching }
    const classMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const teacherMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const roomMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};

    Object.entries(yearData).forEach(([dayStr, hoursData]) => {
      const dayIdx = parseInt(dayStr, 10);
      Object.entries(hoursData).forEach(([hourKey, cells]) => {
        Object.entries(cells).forEach(([colKeyStr, cellVal]) => {
          const cellList = Array.isArray(cellVal) ? cellVal : [cellVal];
          
          cellList.forEach(cell => {
            if (!cell) return;
            // Always resolve the actual room name from the Plan Sal room column
            const actualRoomName = resolveRoomFromColKey(colKeyStr);

            // 1. By Class name
            if (cell.classes && cell.classes.length > 0) {
              cell.classes.forEach(clsName => {
                const clsId = pl.classes.find(c => c.name === clsName)?.id || clsName;
                if (!classMap[clsId]) classMap[clsId] = {};
                if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
                if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
                
                classMap[clsId][dayIdx][hourKey].push({
                  ...cell,
                  note: actualRoomName // Store the actual room name in note for downstream rendering
                });
              });
            } else if (cell.className) {
              const clsId = pl.classes.find(c => c.name === cell.className)?.id || cell.className;
              if (!classMap[clsId]) classMap[clsId] = {};
              if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
              if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
              
              classMap[clsId][dayIdx][hourKey].push({
                ...cell,
                note: actualRoomName
              });
            }

            // 2. By Teacher Abbr
            const tAbbr = cell.teacherAbbr;
            if (tAbbr) {
              const teacherId = pl.teachers.find(t => t.abbr === tAbbr)?.id || tAbbr;
              if (!teacherMap[teacherId]) teacherMap[teacherId] = {};
              if (!teacherMap[teacherId][dayIdx]) teacherMap[teacherId][dayIdx] = {};
              if (!teacherMap[teacherId][dayIdx][hourKey]) teacherMap[teacherId][dayIdx][hourKey] = [];
              
              teacherMap[teacherId][dayIdx][hourKey].push({
                ...cell,
                note: actualRoomName
              });
            }

            // 3. By Room Name
            if (actualRoomName) {
              const roomId = pl.rooms.find(r => r.name === actualRoomName)?.id || actualRoomName;
              if (!roomMap[roomId]) roomMap[roomId] = {};
              if (!roomMap[roomId][dayIdx]) roomMap[roomId][dayIdx] = {};
              if (!roomMap[roomId][dayIdx][hourKey]) roomMap[roomId][dayIdx][hourKey] = [];
              
              roomMap[roomId][dayIdx][hourKey].push({
                ...cell,
                note: actualRoomName
              });
            }
          });
        });
      });
    });

    return { classes: classMap, teachers: teacherMap, rooms: roomMap };
  }, [schedData, appState.yearKey, pl.classes, pl.teachers, pl.rooms, resolveRoomFromColKey]);

  // Handle system print trigger
  const handlePrint = () => {
    window.print();
  };

  // Helper to chunk columns for printing
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    if (!size || size <= 0 || arr.length <= size) return [arr];
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  };

  // Helper to retrieve lessons for room and hour cleanly
  const getRoomLessons = (
    col: any,
    dayIdx: number,
    hourNum: number,
    hourIdx: number
  ) => {
    const lessonsInRoom: Array<{ 
      subject: string; 
      subjectShort: string; 
      className: string; 
      groupName?: string;
      groupShort?: string;
      teacherAbbr?: string;
      displayText: string;
    }> = [];

    if (scheduleVersion === 'etap1') {
      const seenAsg = new Set<string>();
      Object.entries(pl.lessons).forEach(([key, lesson]) => {
        const parts = key.split('|');
        const classId = parts[0];
        const dIdx = parseInt(parts[1], 10);
        const hrIdx = parseInt(parts[2], 10);
        const keyGroupId = parts[3] || null;

        if (dIdx === dayIdx && hrIdx === hourIdx) {
          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
          if (asg) {
            const metaRoom = pl.rooms.find(r => r.id === asg.roomId);
            const isMatch = asg.roomId === col.room.id || 
                            (metaRoom && metaRoom.name.toLowerCase().trim() === col.room.num.toLowerCase().trim());
            if (isMatch) {
              const uniqueKey = `${asg.id}-${classId}-${asg.groupId || keyGroupId || ''}`;
              if (seenAsg.has(uniqueKey)) return;
              seenAsg.add(uniqueKey);

              const subjObj = subjectsMap.get(asg.subjectId) || pl.subjects.find(s => s.id === asg.subjectId);
              const subjectName = subjObj?.name || 'Przedmiot';
              const subjectShort = subjObj?.short || getSubjectShort(asg.subjectId, subjObj);

              let clsName = classesMap.get(classId)?.name || 'Klasa';
              if (asg.linkedClassIds && asg.linkedClassIds.length > 0) {
                const linkedNames = asg.linkedClassIds.map(id => classesMap.get(id)?.name).filter(Boolean);
                clsName = [clsName, ...linkedNames].join('+');
              }
              const cleanClsName = clsName.replace(/\s*\([^)]*\)/g, '').trim() || clsName;

              const rawGroupId = asg.groupId || keyGroupId;
              const grpObj = rawGroupId ? (pl.schoolGroups.find(g => g.id === rawGroupId) || groupsMap.get(rawGroupId)) : null;
              const groupName = grpObj ? grpObj.name : rawGroupId || undefined;
              const groupShort = getGroupShort(groupName, subjectShort || subjectName);

              const tAbbr = asg.teacherId ? (teachersMap.get(asg.teacherId)?.abbr || '') : '';

              const partsFormatted = [cleanClsName, subjectShort, groupShort, tAbbr].filter(Boolean);
              const displayText = partsFormatted.join(' ');

              lessonsInRoom.push({
                subject: subjectName,
                subjectShort,
                className: cleanClsName,
                groupName,
                groupShort,
                teacherAbbr: tAbbr,
                displayText
              });
            }
          }
        }
      });
    } else {
      const cKey = localColKey(col);
      const hourKeyStr = String(hourNum);
      const hourSlots = schedData[appState.yearKey]?.[dayIdx] || {};
      const rawCell = hourSlots[hourKeyStr]?.[cKey] || hourSlots[hourNum]?.[cKey] || hourSlots[String(hourIdx)]?.[cKey];
      const slots = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
      slots.forEach(cell => {
        if (!cell) return;
        const rawClass = cell.className || cell.classes?.join('+') || 'Klasa';

        let cleanClass = rawClass;
        let embeddedGroupInClass = '';
        const parenMatch = rawClass.match(/\(([^)]+)\)/);
        if (parenMatch) {
          embeddedGroupInClass = parenMatch[1].trim();
          cleanClass = rawClass.replace(/\s*\([^)]*\)/g, '').trim() || rawClass;
        }

        const subjObj = (cell._bridgeMeta?.subjectId ? (subjectsMap.get(cell._bridgeMeta.subjectId) || pl.subjects.find(s => s.id === cell._bridgeMeta?.subjectId)) : null) ||
                        pl.subjects.find(s => s.name.toLowerCase().trim() === (cell.subject || '').toLowerCase().trim());
        const subjectName = cell.subject || subjObj?.name || 'Przedmiot';
        const subjectShort = subjObj?.short || getSubjectShort(cell.subject, subjObj);

        let rawGroup = cell._bridgeMeta?.groupId;
        if (!rawGroup && cell._bridgeMeta?.classId && cell._bridgeMeta?.subjectId) {
          const matchingAsg = pl.assignments.find(a => 
            a.classId === cell._bridgeMeta?.classId && 
            a.subjectId === cell._bridgeMeta?.subjectId &&
            (!cell._bridgeMeta?.teacherId || a.teacherId === cell._bridgeMeta?.teacherId)
          );
          if (matchingAsg?.groupId) {
            rawGroup = matchingAsg.groupId;
          }
        }
        if (!rawGroup && embeddedGroupInClass) {
          rawGroup = embeddedGroupInClass;
        }
        if (!rawGroup && cell.note) {
          const noteMatch = cell.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2|chłopcy|dziewczęta)\b/i);
          if (noteMatch) {
            rawGroup = noteMatch[0];
          }
        }

        const grpObj = rawGroup ? (pl.schoolGroups.find(g => g.id === rawGroup) || groupsMap.get(rawGroup)) : null;
        const groupName = grpObj ? grpObj.name : rawGroup || undefined;
        const groupShort = getGroupShort(groupName, subjectShort || subjectName);

        const tAbbr = cell.teacherAbbr || '';

        const partsFormatted = [cleanClass, subjectShort, groupShort, tAbbr].filter(Boolean);
        const displayText = partsFormatted.join(' ');

        lessonsInRoom.push({
          subject: subjectName,
          subjectShort,
          className: cleanClass,
          groupName,
          groupShort,
          teacherAbbr: tAbbr,
          displayText
        });
      });
    }

    // Deduplicate any repeated identical entries in the same room slot
    const seenLessonKey = new Set<string>();
    return lessonsInRoom.filter(it => {
      const key = `${it.className}|${it.subjectShort}|${it.groupShort}|${it.teacherAbbr}`;
      if (seenLessonKey.has(key)) return false;
      seenLessonKey.add(key);
      return true;
    });
  };

  // Helper to retrieve lessons for a teacher and hour cleanly
  const getTeacherLessons = useCallback((
    teacher: Teacher,
    dayIdx: number,
    hourNum: number,
    hourIdx: number
  ) => {
    const lessonsForTeacher: Array<{
      subject: string;
      subjectShort: string;
      className: string;
      groupName?: string;
      groupShort?: string;
      roomName?: string;
      displayText: string;
    }> = [];

    const hourKeyStr = String(hourNum);
    const yk = appState.yearKey || 'default';
    const hourSlots = schedData[yk]?.[dayIdx]?.[hourKeyStr] || schedData[yk]?.[dayIdx]?.[hourNum] || {};

    if (scheduleVersion === 'etap1') {
      const seenAsg = new Set<string>();
      Object.entries(pl.lessons).forEach(([key, lesson]) => {
        const parts = key.split('|');
        const classId = parts[0];
        const dIdx = parseInt(parts[1], 10);
        const hrIdx = parseInt(parts[2], 10);
        const keyGroupId = parts[3] || null;

        if (dIdx === dayIdx && hrIdx === hourIdx) {
          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
          if (asg && (asg.teacherId === teacher.id || lesson.supportTeacherId === teacher.id)) {
            const uniqueKey = `${asg.id}-${classId}-${asg.groupId || keyGroupId || ''}`;
            if (seenAsg.has(uniqueKey)) return;
            seenAsg.add(uniqueKey);

            const subjObj = subjectsMap.get(asg.subjectId) || pl.subjects.find(s => s.id === asg.subjectId);
            const subjectName = subjObj?.name || 'Przedmiot';
            const subjectShort = subjObj?.short || getSubjectShort(asg.subjectId, subjObj);

            let clsName = classesMap.get(classId)?.name || 'Klasa';
            if (asg.linkedClassIds && asg.linkedClassIds.length > 0) {
              const linkedNames = asg.linkedClassIds.map(id => classesMap.get(id)?.name).filter(Boolean);
              clsName = [clsName, ...linkedNames].join('+');
            }
            const cleanClsName = clsName.replace(/\s*\([^)]*\)/g, '').trim() || clsName;

            const rawGroupId = asg.groupId || keyGroupId;
            const grpObj = rawGroupId ? (pl.schoolGroups.find(g => g.id === rawGroupId) || groupsMap.get(rawGroupId)) : null;
            const groupName = grpObj ? grpObj.name : rawGroupId || undefined;
            const groupShort = getGroupShort(groupName, subjectShort || subjectName);

            // Check if Plan Sal (schedData) has the actual room assigned for this lesson/slot
            let actualRoom = '';
            for (const [colKey, rawCell] of Object.entries(hourSlots)) {
              const slots = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
              const match = slots.find(c => {
                if (!c) return false;
                const matchesTeacher = c.teacherAbbr === teacher.abbr || c.supportTeacherAbbr === teacher.abbr || c._bridgeMeta?.teacherId === teacher.id;
                if (!matchesTeacher) return false;
                const matchesClass = c._bridgeMeta?.classId === classId || c.className?.includes(cleanClsName) || (c.classes && c.classes.includes(cleanClsName));
                const matchesSubj = !c.subject || c.subject.toLowerCase() === subjectName.toLowerCase() || c._bridgeMeta?.subjectId === asg.subjectId;
                return matchesClass || matchesSubj;
              });
              if (match) {
                actualRoom = resolveRoomFromColKey(colKey);
                if (actualRoom) break;
              }
            }

            // If not placed in Plan Sal yet, only then fallback to asg.roomId (suggested room)
            const metaRoom = asg.roomId ? (roomsMap.get(asg.roomId) || pl.rooms.find(r => r.id === asg.roomId)) : null;
            const roomName = actualRoom || metaRoom?.name || (asg.roomId ? String(asg.roomId) : '');

            const partsFormatted = [subjectName, cleanClsName + (groupShort ? ` (${groupShort})` : ''), roomName ? `s. ${roomName}` : ''].filter(Boolean);
            const displayText = partsFormatted.join(' • ');

            lessonsForTeacher.push({
              subject: subjectName,
              subjectShort,
              className: cleanClsName,
              groupName,
              groupShort,
              roomName,
              displayText
            });
          }
        }
      });
    } else {
      // In Etap 2: Check schedData for cells where teacher matches teacher.abbr, supportTeacherAbbr, or teacher.id
      const seenSlots = new Set<string>();

      Object.entries(hourSlots).forEach(([colKey, rawCell]) => {
        const slots = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
        slots.forEach(cell => {
          if (!cell) return;
          if (cell.teacherAbbr !== teacher.abbr && cell.supportTeacherAbbr !== teacher.abbr && cell._bridgeMeta?.teacherId !== teacher.id) return;

          // Col room resolution: ALWAYS resolve actual room from the Plan Sal room column
          const roomName = resolveRoomFromColKey(colKey);

          const rawClass = cell.className || cell.classes?.join('+') || 'Klasa';
          let cleanClass = rawClass;
          let embeddedGroupInClass = '';
          const parenMatch = rawClass.match(/\(([^)]+)\)/);
          if (parenMatch) {
            embeddedGroupInClass = parenMatch[1].trim();
            cleanClass = rawClass.replace(/\s*\([^)]*\)/g, '').trim() || rawClass;
          }

          const subjObj = (cell._bridgeMeta?.subjectId ? (subjectsMap.get(cell._bridgeMeta.subjectId) || pl.subjects.find(s => s.id === cell._bridgeMeta?.subjectId)) : null) ||
                          pl.subjects.find(s => s.name.toLowerCase().trim() === (cell.subject || '').toLowerCase().trim());
          const subjectName = cell.subject || subjObj?.name || 'Przedmiot';
          const subjectShort = subjObj?.short || getSubjectShort(cell.subject, subjObj);

          let rawGroup = cell._bridgeMeta?.groupId;
          if (!rawGroup && cell._bridgeMeta?.classId && cell._bridgeMeta?.subjectId) {
            const matchingAsg = pl.assignments.find(a => 
              a.classId === cell._bridgeMeta?.classId && 
              a.subjectId === cell._bridgeMeta?.subjectId &&
              (!cell._bridgeMeta?.teacherId || a.teacherId === cell._bridgeMeta?.teacherId)
            );
            if (matchingAsg?.groupId) {
              rawGroup = matchingAsg.groupId;
            }
          }
          if (!rawGroup && embeddedGroupInClass) {
            rawGroup = embeddedGroupInClass;
          }
          if (!rawGroup && cell.note) {
            const noteMatch = cell.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2|chłopcy|dziewczęta)\b/i);
            if (noteMatch) {
              rawGroup = noteMatch[0];
            }
          }

          const grpObj = rawGroup ? (pl.schoolGroups.find(g => g.id === rawGroup) || groupsMap.get(rawGroup)) : null;
          const groupName = grpObj ? grpObj.name : rawGroup || undefined;
          const groupShort = getGroupShort(groupName, subjectShort || subjectName);

          const slotKey = `${subjectName}-${cleanClass}-${groupShort || ''}-${roomName}`;
          if (seenSlots.has(slotKey)) return;
          seenSlots.add(slotKey);

          const partsFormatted = [subjectName, cleanClass + (groupShort ? ` (${groupShort})` : ''), roomName ? `s. ${roomName}` : ''].filter(Boolean);
          const displayText = partsFormatted.join(' • ');

          lessonsForTeacher.push({
            subject: subjectName,
            subjectShort,
            className: cleanClass,
            groupName,
            groupShort,
            roomName,
            displayText
          });
        });
      });
    }

    // Deduplicate any repeated identical entries
    const seenTeacherLessonKey = new Set<string>();
    return lessonsForTeacher.filter(it => {
      const key = `${it.className}|${it.subjectShort}|${it.groupShort}|${it.roomName}`;
      if (seenTeacherLessonKey.has(key)) return false;
      seenTeacherLessonKey.add(key);
      return true;
    });
  }, [scheduleVersion, appState.yearKey, schedData, pl.lessons, pl.assignments, pl.subjects, pl.classes, pl.schoolGroups, pl.rooms, subjectsMap, classesMap, groupsMap, roomsMap, resolveRoomFromColKey]);

  // Safe builder for teacher's current assigned lessons list
  const getTeacherLessonsList = useCallback((teacher: Teacher) => {
    const lessons: Array<{
      dayIdx: number;
      hourNum: number;
      start: string;
      end: string;
      subject: string;
      className: string;
      roomName?: string;
    }> = [];

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      hoursList.forEach((hour, hIdx) => {
        const teacherLessons = getTeacherLessons(teacher, dayIdx, Number(hour.num), hIdx);
        teacherLessons.forEach(it => {
          lessons.push({
            dayIdx,
            hourNum: hour.num,
            start: hour.start,
            end: hour.end,
            subject: it.subject,
            className: it.className + (it.groupShort ? ` (${it.groupShort})` : ''),
            roomName: it.roomName
          });
        });
      });
    }

    return lessons;
  }, [hoursList, getTeacherLessons]);

  // Helper to get teacher duties for a specific break number and day
  const getTeacherDutiesForBreak = (teacherAbbr: string, dayIdx: number, breakNum: number) => {
    if (!appState.dyzury?.harmonogram || !appState.dyzury?.miejsca) return [];
    const duties: Array<{ placeName: string; floor?: string; desc?: string; note?: string; breakName: string; start: string; end: string }> = [];
    
    const przerwa = appState.dyzury.przerwy?.find(p => p.num === breakNum);
    
    appState.dyzury.miejsca.forEach(m => {
      const key = `${m.id}|${dayIdx}|${breakNum}`;
      const entry = appState.dyzury.harmonogram[key];
      if (entry && entry.teacherAbbr === teacherAbbr) {
        duties.push({
          placeName: m.name,
          floor: m.floor,
          desc: m.desc,
          note: entry.note,
          breakName: przerwa?.name || `Przerwa ${breakNum}`,
          start: przerwa?.start || '',
          end: przerwa?.end || ''
        });
      }
    });
    return duties;
  };

  const generateRoomsMatrixHtml = () => {
    const categories = roomsPrintCategories;
    const daysToRender = roomsSelectedDay === 'all' ? [0, 1, 2, 3, 4] : [roomsSelectedDay];
    const catsToRender = roomsSelectedCategory === 'all' 
      ? categories 
      : categories.filter(c => c.id === roomsSelectedCategory);

    let pagesHtml = '';

    daysToRender.forEach(dayIdx => {
      catsToRender.forEach(cat => {
        const chunks = chunkArray(cat.cols, roomsMaxColsPerPage > 0 ? roomsMaxColsPerPage : cat.cols.length);

        chunks.forEach((chunkCols, chunkIdx) => {
          const catRoomsCount = chunkCols.length;
          const floorGroups = getFloorGroups(chunkCols, appState.buildings);
          const segmentGroups = getSegmentGroups(chunkCols);

          // Dynamic styling based on columns count on this specific A4 landscape sheet
          let thPadding = '4px 3px';
          let tdPadding = '3px 2px';
          let clsFontSize = '10px';
          let grpFontSize = '8.5px';
          let subjFontSize = '9px';
          let tAbbrFontSize = '8.5px';
          let headerNameFontSize = '10.5px';
          let headerDescFontSize = '7.5px';
          let showHeaderDesc = true;

          if (catRoomsCount > 14) {
            thPadding = '2px 1px';
            tdPadding = '2px 1px';
            clsFontSize = '8.5px';
            grpFontSize = '7.5px';
            subjFontSize = '8px';
            tAbbrFontSize = '7.5px';
            headerNameFontSize = '8px';
            headerDescFontSize = '6.5px';
            showHeaderDesc = false;
          } else if (catRoomsCount > 10) {
            thPadding = '3px 2px';
            tdPadding = '2.5px 1.5px';
            clsFontSize = '9px';
            grpFontSize = '8px';
            subjFontSize = '8.5px';
            tAbbrFontSize = '8px';
            headerNameFontSize = '9.5px';
            headerDescFontSize = '7px';
          }

          let rowsHtml = '';
          hoursList.forEach((hour, hIdx) => {
            let roomsCellsHtml = '';
            chunkCols.forEach(col => {
              const lessonsInRoom = getRoomLessons(col, dayIdx, hour.num, hIdx);

              let cellContent = '<span style="color: #cbd5e1; font-weight: bold; font-family: monospace;">-</span>';
              if (lessonsInRoom.length > 0) {
                cellContent = lessonsInRoom.map(it => `
                  <div style="line-height: 1.15; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 1px 0;" title="${escapeHtml(it.displayText)} (${escapeHtml(it.subject)})">
                    <div style="color: #0f172a; font-weight: 900; font-size: ${clsFontSize}; letter-spacing: -0.01em;">
                      ${escapeHtml(it.className)}
                    </div>
                    ${it.groupShort ? `
                      <div style="color: #4338ca; font-weight: 800; font-size: ${grpFontSize};">
                        ${escapeHtml(it.groupShort)}
                      </div>` : ''}
                    <div style="color: #1e293b; font-weight: 800; font-size: ${subjFontSize}; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(it.subjectShort || it.subject)}
                    </div>
                    ${it.teacherAbbr ? `
                      <div style="color: #334155; font-weight: 700; font-family: monospace; font-size: ${tAbbrFontSize};">
                        ${escapeHtml(it.teacherAbbr)}
                      </div>` : ''}
                  </div>
                `).join('<div style="border-top: 1px dashed #cbd5e1; margin: 2px 0; width: 80%;"></div>');
              }

              roomsCellsHtml += `
                <td style="border: 1px solid #94a3b8; padding: ${tdPadding}; text-align: center; vertical-align: middle; background: #fff; width: calc((100% - 54px) / ${catRoomsCount}); box-sizing: border-box;">
                  ${cellContent}
                </td>
              `;
            });

            rowsHtml += `
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 9.5px; width: 54px; max-width: 54px; box-sizing: border-box;">
                  <div style="font-size: 10.5px; font-weight: 900; color: #0f172a;">${escapeHtml(hour.num)}</div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 0.5px;">${escapeHtml(hour.start)}-${escapeHtml(hour.end)}</div>
                </td>
                ${roomsCellsHtml}
              </tr>
            `;
          });

          const chunkLabel = chunks.length > 1 ? ` — CZĘŚĆ ${chunkIdx + 1}/${chunks.length} (Sal: ${catRoomsCount})` : ` (Sal: ${catRoomsCount})`;

          pagesHtml += `
            <div class="sheet-page" style="page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
              <!-- Page Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px;">
                <div>
                  <div style="font-size: 12.5px; font-weight: 950; color: #0f172a; letter-spacing: -0.01em;">
                    📅 ${escapeHtml(DAYS_NAMES[dayIdx].toUpperCase())} — ${escapeHtml(cat.name.toUpperCase())}${escapeHtml(chunkLabel)}
                  </div>
                  <div style="font-size: 9px; color: #475569; font-weight: bold; margin-top: 1px;">
                    ${escapeHtml(appState.school.name)} • ROK SZKOLNY ${escapeHtml(appState.yearLabel)} • ${scheduleVersion === 'etap1' ? 'PLAN BAZOWY KLAS (ETAP 1)' : 'PLAN PRZYDZIAŁU SAL (ETAP 2)'}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8px; color: #64748b; font-family: monospace; font-weight: bold; line-height: 1.2;">
                  SalePlan Pro · Razem sal: ${roomsToPrint.length}<br>
                  ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <!-- Matrix Table -->
              <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <!-- Floor level headers row -->
                  <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 9px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Godz
                    </th>
                    ${floorGroups.map(g => `
                      <th colspan="${g.span}" style="border: 1px solid #94a3b8; padding: 2.5px 2px; text-align: center; font-size: 9px; font-weight: bold; background-color: #f8fafc; color: #334155; box-sizing: border-box;">
                        📍 ${escapeHtml(localCleanFloorName(g.name, g.buildingName))}
                      </th>
                    `).join('')}
                  </tr>
                  <!-- Segment level headers row -->
                  <tr style="background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 7.5px; font-weight: 500; background-color: #f8fafc; color: #64748b; width: 54px; max-width: 54px; box-sizing: border-box;">
                      -
                    </th>
                    ${segmentGroups.map(g => `
                      <th colspan="${g.span}" style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8px; font-weight: bold; background-color: #ffffff; color: #64748b; text-transform: uppercase; box-sizing: border-box;">
                        🧩 ${escapeHtml(g.name)}
                      </th>
                    `).join('')}
                  </tr>
                  <!-- Room level headers row -->
                  <tr style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 9px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Nr
                    </th>
                    ${chunkCols.map((col: any) => {
                      const roomDesc = col.room.sub || 'sala ogólna';
                      return `
                        <th style="border: 1px solid #94a3b8; padding: ${thPadding}; text-align: center; font-size: 9.5px; font-weight: 950; color: #020617; width: calc((100% - 54px) / ${catRoomsCount}); box-sizing: border-box;">
                          <span style="font-family: monospace; font-size: ${headerNameFontSize}; display: block;">🚪 ${escapeHtml(col.room.num)}</span>
                          ${showHeaderDesc ? `<span style="font-size: ${headerDescFontSize}; color: #475569; font-weight: 500; display: block; margin-top: 0.5px; text-transform: lowercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">(${escapeHtml(roomDesc)})</span>` : ''}
                        </th>
                      `;
                    }).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          `;
        });
      });
    });

    return `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=1120, initial-scale=0.8, shrink-to-fit=no">
        <title>Płachta Gabinetów - SalePlan Pro</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 16px;
            background-color: #f1f5f9;
            color: #0f172a;
            width: 100%;
          }
          .no-print-bar {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            max-width: 100%;
          }
          .btn-print {
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .btn-print:hover {
            background-color: #1d4ed8;
          }
          .btn-close {
            background-color: #f8fafc;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
          }
          
          .content-container {
            width: 100%;
            max-width: 100%;
          }
          
          @page {
            size: landscape;
            margin: 4mm 6mm;
          }
          
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .sheet-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            td, th {
              border: 1px solid #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">🖨️ PODGLĄD WYDRUKU PŁACHTY GABINETÓW (A4 POZIOMO)</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Automatycznie dopasowano do szerokości arkusza A4 bez ucinania</span>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button class="btn-close" onclick="window.close()">Zamknij</button>
            <button class="btn-print" onclick="window.print()">
              🖨️ Drukuj teraz (Ctrl+P)
            </button>
          </div>
        </div>

        <div class="content-container">
          ${pagesHtml}
        </div>

        <script>
          window.addEventListener('DOMContentLoaded', () => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  const openRoomsPrintPreview = () => {
    try {
      const htmlContent = generateRoomsMatrixHtml();
      const printWindow = window.open('', '_blank', 'noopener');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        // Fallback to interactive in-app print overlay if popup is blocked or inside iframe
        setIsRoomsPrintFriendlyMode(true);
      }
    } catch (e) {
      console.error(e);
      setIsRoomsPrintFriendlyMode(true);
    }
  };

  const generateDutiesHtml = () => {
    const places = appState.dyzury.miejsca;
    const breaks = appState.dyzury.przerwy;
    const recommendedScale = Math.min(1.0, Math.max(0.45, 8 / Math.max(places.length, 1)));

    let daysHtml = '';

    [0, 1, 2, 3, 4].forEach(dayIdx => {
      let rowsHtml = '';
      
      breaks.forEach(p => {
        let colsHtml = '';
        places.forEach(place => {
          const dutyKey = `${place.id}|${dayIdx}|${p.num}`;
          const entry = appState.dyzury.harmonogram[dutyKey];
          const t = entry?.teacherAbbr ? appState.teachers.find(tch => tch.abbr === entry.teacherAbbr) : null;
          
          let cellContent = '-';
          if (entry?.teacherAbbr) {
            cellContent = `
              <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
                ${escapeHtml(entry.teacherAbbr)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${t ? escapeHtml(`${t.first} ${t.last}`) : ''}">
                ${t ? `${escapeHtml(t.first.slice(0, 1))}. ${escapeHtml(t.last)}` : 'Dyżur'}
              </div>
            `;
          }

          colsHtml += `
            <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
              ${cellContent}
            </td>
          `;
        });

        rowsHtml += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${escapeHtml(p.name || `Przerwa ${p.num}`)}</div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${escapeHtml(p.start)} - ${escapeHtml(p.end)}</div>
            </td>
            ${colsHtml}
          </tr>
        `;
      });

      daysHtml += `
        <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
          <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${escapeHtml(DAYS_NAMES[dayIdx])} — HARMONOGRAM DYŻURÓW</span>
            <span style="font-size: 8.5px; font-family: monospace; font-weight: bold; opacity: 0.8; text-transform: uppercase;">PODZIAŁ NA REJONY / MIEJSCA DYŻUROWAŃ</span>
          </div>

          ${places.length === 0 ? `
            <p style="font-size: 11px; color: #64748b; font-style: italic; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; background: #fafafa;">Brak zdefiniowanych miejsc dyżurowania.</p>
          ` : `
            <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 900; color: #334155; width: 140px;">PRZERWA / GODZINA</th>
                  ${places.map(place => `
                    <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 10.5px; font-weight: 900; color: #1e293b; background-color: #f8fafc;">
                      <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${escapeHtml(place.name)}</div>
                      ${place.floor ? `<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${escapeHtml(place.floor)}</div>` : ''}
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          `}
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plan i Harmonogram Dyżurów — SalePlan Pro</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print-bar {
            background-color: #fff;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .btn-close {
            background-color: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
            color: #1e293b;
          }
          .btn-print {
            background-color: #059669;
            color: #fff;
            border: 1px solid #059669;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .btn-print:hover {
            background-color: #047857;
            border-color: #047857;
          }
          .header {
            background-color: #fff;
            border-bottom: 2px solid #0f172a;
            padding: 24px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -0.01em;
            color: #0f172a;
          }
          .header-title p {
            margin: 4px 0 0 0;
            font-size: 11.5px;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-info {
            font-size: 9px;
            font-weight: bold;
            text-align: right;
            line-height: 1.5;
            color: #64748b;
            text-transform: uppercase;
          }
          .content {
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #fff !important;
            }
            .header {
              padding: 12px 0 20px 0 !important;
              margin-bottom: 16px !important;
              border-bottom: 2px solid #000 !important;
            }
            .content {
              padding: 0 !important;
              max-width: 100% !important;
            }
            td, th {
              border: 1px solid #000 !important;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">PODGLĄD HARMONOGRAMU DYŻURÓW</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Układ poziomy (A4 landscape) został automatycznie zoptymalizowany pod drukarkę</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 16px; margin-left: auto; margin-right: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; white-space: nowrap;">Skala wydruku (Zoom):</label>
              <select id="scale-selector" onchange="adjustScale(this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #1e293b; background: white; cursor: pointer;">
                <option value="1.0" ${recommendedScale >= 0.95 ? 'selected' : ''}>Auto (100%)</option>
                <option value="0.95" ${recommendedScale >= 0.9 && recommendedScale < 0.95 ? 'selected' : ''}>95%</option>
                <option value="0.90" ${recommendedScale >= 0.85 && recommendedScale < 0.9 ? 'selected' : ''}>90%</option>
                <option value="0.85" ${recommendedScale >= 0.8 && recommendedScale < 0.85 ? 'selected' : ''}>85% (Kompaktowa)</option>
                <option value="0.80" ${recommendedScale >= 0.75 && recommendedScale < 0.8 ? 'selected' : ''}>80%</option>
                <option value="0.75" ${recommendedScale >= 0.7 && recommendedScale < 0.75 ? 'selected' : ''}>75%</option>
                <option value="0.70" ${recommendedScale >= 0.65 && recommendedScale < 0.7 ? 'selected' : ''}>70%</option>
                <option value="0.65" ${recommendedScale >= 0.6 && recommendedScale < 0.65 ? 'selected' : ''}>65%</option>
                <option value="0.60" ${recommendedScale >= 0.55 && recommendedScale < 0.6 ? 'selected' : ''}>60% (Gęsta)</option>
                <option value="0.55" ${recommendedScale >= 0.5 && recommendedScale < 0.55 ? 'selected' : ''}>55%</option>
                <option value="0.50" ${recommendedScale >= 0.45 && recommendedScale < 0.5 ? 'selected' : ''}>50%</option>
                <option value="0.45" ${recommendedScale >= 0.4 && recommendedScale < 0.45 ? 'selected' : ''}>45%</option>
                <option value="0.40" ${recommendedScale < 0.4 ? 'selected' : ''}>40% (Bardzo gęsta)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn-close" onclick="window.close()">Zamknij okno</button>
            <button class="btn-print" onclick="window.print()">
              🖨️ Drukuj (Ctrl+P)
            </button>
          </div>
        </div>

        <div class="header">
          <div class="header-title">
            <h1>PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h1>
            <p>${escapeHtml(appState.school.name)} — Rok szkolny ${escapeHtml(appState.yearLabel)}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            MODUŁ DYŻURÓW SZKOLNYCH<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div class="content">
          ${daysHtml}
        </div>

        <script>
          function adjustScale(scaleValue) {
            const content = document.querySelector('.content');
            const header = document.querySelector('.header');
            if (content) {
              content.style.zoom = scaleValue;
              content.style.webkitZoom = scaleValue;
            }
            if (header) {
              header.style.zoom = scaleValue;
              header.style.webkitZoom = scaleValue;
            }
          }

          // Initial scale application
          window.addEventListener('DOMContentLoaded', () => {
            const initialScale = document.getElementById('scale-selector')?.value || '1.0';
            adjustScale(initialScale);
            
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  const openDutiesPrintPreview = () => {
    try {
      const htmlContent = generateDutiesHtml();
      const printWindow = window.open('', '_blank', 'noopener');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        setPopupBlocked(true);
      }
    } catch (e) {
      console.error(e);
      setPopupBlocked(true);
    }
  };

  // --- Classes Data Resolution ---
  const classesToPrint = useMemo(() => {
    if (selectedClassId === 'all') {
      return pl.classes;
    }
    return pl.classes.filter(c => c.id === selectedClassId);
  }, [pl.classes, selectedClassId]);

  // --- Teachers Data Resolution ---
  const teachersToPrint = useMemo(() => {
    if (selectedTeacherId === 'all') {
      return pl.teachers;
    }
    return pl.teachers.filter(t => t.id === selectedTeacherId);
  }, [pl.teachers, selectedTeacherId]);

  // --- Rooms Data Resolution ---
  const roomsToPrint = useMemo(() => {
    if (selectedRoomId === 'all') {
      return pl.rooms;
    }
    return pl.rooms.filter(r => r.id === selectedRoomId);
  }, [pl.rooms, selectedRoomId]);

  // Classified and sorted columns (rooms) list for Wydruki
  const roomsToPrintColumns = useMemo(() => {
    const rawCols = localFlattenColumns(appState.floors);
    
    // Filter rooms according to selectedRoomId
    const filteredCols = selectedRoomId === 'all'
      ? rawCols
      : rawCols.filter(col => {
          const roomNameClean = (col.room.num || '').toLowerCase().trim();
          const meta = pl.rooms.find(r => r.name.toLowerCase().trim() === roomNameClean);
          return meta && meta.id === selectedRoomId;
        });

    const mainCols: any[] = [];
    const individualCols: any[] = [];
    const sportCols: any[] = [];

    const roomsMap = new Map(pl.rooms.map(r => [r.name.toLowerCase().trim(), r]));

    filteredCols.forEach(col => {
      const roomNameClean = (col.room.num || '').toLowerCase().trim();
      const meta = roomsMap.get(roomNameClean);
      const bld = appState.buildings[col.floor.buildingIdx];

      const isIndividual = meta?.type === 'indywidualne';
      const isSport = meta?.type === 'sport' || bld?.multi === true;

      if (isIndividual) {
        individualCols.push(col);
      } else if (isSport) {
        sportCols.push(col);
      } else {
        mainCols.push(col);
      }
    });

    // Sort alphanumerically by room.num
    const sortFn = (a: any, b: any) => {
      const numA = a.room.num || '';
      const numB = b.room.num || '';
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    };

    mainCols.sort(sortFn);
    individualCols.sort(sortFn);
    sportCols.sort(sortFn);

    return {
      main: mainCols,
      individual: individualCols,
      sport: sportCols
    };
  }, [appState.floors, appState.buildings, pl.rooms, selectedRoomId]);

  // Extract unique floors for floor selector
  const availableFloors = useMemo(() => {
    const floorList: { id: string; name: string; buildingName: string }[] = [];
    const seen = new Set<string>();
    
    appState.floors.forEach((floor, fi) => {
      const bld = appState.buildings[floor.buildingIdx];
      const bldName = bld?.name || `Budynek ${floor.buildingIdx + 1}`;
      const fName = localCleanFloorName(floor.name || `Piętro ${fi + 1}`, bldName);
      const id = `f_${fi}`;
      if (!seen.has(id)) {
        seen.add(id);
        floorList.push({ id, name: `${bldName} - ${fName}`, buildingName: bldName });
      }
    });
    return floorList;
  }, [appState.floors, appState.buildings]);

  const roomsPrintCategories = useMemo(() => {
    if (roomsSplitMode === 'floors') {
      // Group columns by floor
      const allCols = [
        ...roomsToPrintColumns.main,
        ...roomsToPrintColumns.individual,
        ...roomsToPrintColumns.sport
      ];

      // If user selected a specific floor
      const filteredByFloor = roomsSelectedFloor === 'all'
        ? allCols
        : allCols.filter(col => `f_${col.floorIdx}` === roomsSelectedFloor);

      const floorMap = new Map<string, { id: string; name: string; icon: string; floorIdx: number; cols: any[] }>();

      filteredByFloor.forEach(col => {
        const floorKey = `f_${col.floorIdx}`;
        const bld = appState.buildings[col.floor.buildingIdx];
        const bldName = bld?.name || `Budynek ${col.floor.buildingIdx + 1}`;
        const fName = localCleanFloorName(col.floor.name || `Piętro ${col.floorIdx + 1}`, bldName);
        const displayName = `${bldName} — ${fName}`;

        if (!floorMap.has(floorKey)) {
          floorMap.set(floorKey, {
            id: floorKey,
            name: displayName,
            icon: '📍',
            floorIdx: col.floorIdx,
            cols: []
          });
        }
        floorMap.get(floorKey)!.cols.push(col);
      });

      // Sort by floorIdx
      return Array.from(floorMap.values())
        .sort((a, b) => a.floorIdx - b.floorIdx)
        .filter(c => c.cols.length > 0);
    }

    return [
      { id: 'main', name: 'Budynek Główny', icon: '🏢', cols: roomsToPrintColumns.main },
      { id: 'individual', name: 'Nauczanie Indywidualne', icon: '🗣️', cols: roomsToPrintColumns.individual },
      { id: 'sport', name: 'Sale Sportowe', icon: '🏆', cols: roomsToPrintColumns.sport }
    ].filter(c => c.cols.length > 0);
  }, [roomsSplitMode, roomsSelectedFloor, roomsToPrintColumns, appState.floors, appState.buildings]);

  if (isRoomsPrintFriendlyMode) {
    const daysToRender = roomsSelectedDay === 'all' ? [0, 1, 2, 3, 4] : [roomsSelectedDay];
    const catsToRender = roomsSelectedCategory === 'all' 
      ? roomsPrintCategories 
      : roomsPrintCategories.filter(c => c.id === roomsSelectedCategory);

    return (
      <div id="rooms-print-overlay" className="fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            header, footer, #restoring-pointer-blocker {
              display: none !important;
            }
            html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
              height: auto !important;
              width: 100% !important;
              overflow: visible !important;
              position: static !important;
            }
            body {
              background-color: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #rooms-print-overlay {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .rooms-sheet-card {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 0 20px 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              table-layout: fixed !important;
            }
            th, td {
              border: 1px solid #000 !important;
              color: #000 !important;
              box-sizing: border-box !important;
            }
            th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: ${roomsPageOrientation};
              margin: 6mm 8mm;
            }
          }
        ` }} />

        {/* Top Control Bar */}
        <div className="no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-slate-800 rounded-lg text-amber-400">
              <Printer size={20} />
            </span>
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tight">Studio Wydruku Płachty Sal</span>
              <h3 className="text-sm font-black uppercase text-white leading-tight">
                Płachta Obłożenia Gabinetów • Układ A4 {roomsPageOrientation === 'landscape' ? 'Poziomy' : 'Pionowy'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Orientation */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setRoomsPageOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  roomsPageOrientation === 'landscape' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Poziomo (A4)
              </button>
              <button
                onClick={() => setRoomsPageOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                  roomsPageOrientation === 'portrait' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pionowo (A4)
              </button>
            </div>

            {/* Grouping / Split mode */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Układ tabel:</span>
              <select
                value={roomsSplitMode}
                onChange={(e) => setRoomsSplitMode(e.target.value as any)}
                className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer"
              >
                <option value="floors" className="bg-slate-800 text-white">Podział wg Kondygnacji (Zalecany)</option>
                <option value="cols" className="bg-slate-800 text-white">Wg Kategorii / Budynków</option>
              </select>
            </div>

            {/* Floor selector when roomsSplitMode === 'floors' */}
            {roomsSplitMode === 'floors' && (
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Piętro:</span>
                <select
                  value={roomsSelectedFloor}
                  onChange={(e) => setRoomsSelectedFloor(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-800 text-white">Wszystkie kondygnacje</option>
                  {availableFloors.map(f => (
                    <option key={f.id} value={f.id} className="bg-slate-800 text-white">{f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Max cols chunking */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sal / strona:</span>
              <select
                value={roomsMaxColsPerPage}
                onChange={(e) => setRoomsMaxColsPerPage(parseInt(e.target.value, 10))}
                className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer"
              >
                <option value={8} className="bg-slate-800 text-white">8 sal (Duża czytelność)</option>
                <option value={10} className="bg-slate-800 text-white">10 sal (Zalecane A4)</option>
                <option value={12} className="bg-slate-800 text-white">12 sal (Standard)</option>
                <option value={15} className="bg-slate-800 text-white">15 sal (Kompakt)</option>
                <option value={0} className="bg-slate-800 text-white">Wszystkie w 1 tabeli</option>
              </select>
            </div>

            {/* Day selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Dzień:</span>
              <select
                value={roomsSelectedDay}
                onChange={(e) => setRoomsSelectedDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800 text-white">Wszystkie dni (Pn-Pt)</option>
                {DAYS_NAMES.map((name, idx) => (
                  <option key={idx} value={idx} className="bg-slate-800 text-white">{name}</option>
                ))}
              </select>
            </div>

            {/* Category / Building selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Budynek:</span>
              <select
                value={roomsSelectedCategory}
                onChange={(e) => setRoomsSelectedCategory(e.target.value)}
                className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800 text-white">Wszystkie kategorie</option>
                {roomsPrintCategories.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800 text-white">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <button
              onClick={openRoomsPrintPreview}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Otwórz czysty HTML w nowej karcie"
            >
              <ExternalLink size={14} /> W osobnym oknie
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} /> Drukuj teraz (Ctrl+P)
            </button>

            <button
              onClick={() => setIsRoomsPrintFriendlyMode(false)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </div>

        {/* Sheets List Container */}
        <div className="max-w-7xl mx-auto space-y-8">
          {daysToRender.map(dayIdx => {
            return (
              <div key={dayIdx} className="space-y-6">
                {catsToRender.map(cat => {
                  const chunks = chunkArray(cat.cols, roomsMaxColsPerPage > 0 ? roomsMaxColsPerPage : cat.cols.length);

                  return chunks.map((chunkCols, chunkIdx) => {
                    const catRoomsCount = chunkCols.length;
                    const floorGroups = getFloorGroups(chunkCols, appState.buildings);
                    const segmentGroups = getSegmentGroups(chunkCols);

                    const chunkLabel = chunks.length > 1 
                      ? ` — Część ${chunkIdx + 1}/${chunks.length} (Sal: ${catRoomsCount})` 
                      : ` (Sal: ${catRoomsCount})`;

                    return (
                      <div
                        key={`${dayIdx}-${cat.id}-${chunkIdx}`}
                        className="rooms-sheet-card bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-md transition"
                      >
                        {/* Sheet Header */}
                        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-3">
                          <div>
                            <h2 className="text-base md:text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                              <span>📅 {DAYS_NAMES[dayIdx].toUpperCase()} — {cat.name.toUpperCase()}{chunkLabel}</span>
                            </h2>
                            <p className="text-[10.5px] text-slate-600 font-bold uppercase mt-0.5">
                              {appState.school.name} • Rok szkolny {appState.yearLabel} • {scheduleVersion === 'etap1' ? 'Plan Bazowy Klas (Etap 1)' : 'Plan Przydziału Sal (Etap 2)'}
                            </p>
                          </div>
                          <div className="text-right text-[9px] font-mono text-slate-400 font-bold uppercase leading-tight">
                            SalePlan Pro • Sal w szkole: {roomsToPrint.length}<br />
                            Wydrukowano: {new Date().toLocaleDateString('pl-PL')}
                          </div>
                        </div>

                        {/* Table */}
                        <div className="w-full overflow-hidden">
                          <table className="w-full text-xs text-left border-collapse table-fixed bg-white">
                            <thead>
                              {/* Floor row */}
                              <tr className="bg-slate-100 uppercase font-black text-slate-800">
                                <th className="w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]">
                                  Godz
                                </th>
                                {floorGroups.map((g, fIdx) => (
                                  <th
                                    key={fIdx}
                                    colSpan={g.span}
                                    className="border border-slate-300 p-1.5 text-center text-[9.5px] bg-slate-50 font-bold text-slate-700"
                                  >
                                    📍 {localCleanFloorName(g.name, g.buildingName)}
                                  </th>
                                ))}
                              </tr>

                              {/* Segment row */}
                              <tr className="bg-white uppercase font-black text-slate-500">
                                <th className="w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1 text-center text-[8px] bg-slate-50 font-medium text-slate-400">
                                  -
                                </th>
                                {segmentGroups.map((g, sIdx) => (
                                  <th
                                    key={sIdx}
                                    colSpan={g.span}
                                    className="border border-slate-300 p-1 text-center text-[8.5px] bg-white text-slate-500 uppercase font-semibold"
                                  >
                                    🧩 {g.name}
                                  </th>
                                ))}
                              </tr>

                              {/* Room headers */}
                              <tr className="bg-slate-50 uppercase font-black text-slate-800">
                                <th className="w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]">
                                  Nr
                                </th>
                                {chunkCols.map((col: any, cIdx) => (
                                  <th
                                    key={cIdx}
                                    style={{ width: `calc((100% - 52px) / ${catRoomsCount})` }}
                                    className="border border-slate-300 p-1.5 text-center"
                                  >
                                    <span className="font-mono text-[10.5px] block text-slate-950 font-black">
                                      🚪 {col.room.num}
                                    </span>
                                    <span className="block text-[8px] text-slate-500 font-medium normal-case truncate max-w-full mx-auto mt-0.5">
                                      ({col.room.sub || 'sala ogólna'})
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              {hoursList.map((hour, hIdx) => (
                                <tr key={hour.num} className="hover:bg-slate-50/40">
                                  {/* Hour cell */}
                                  <td className="w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 font-mono text-center bg-slate-50/60">
                                    <span className="font-black text-slate-900 text-[11px] block">{hour.num}</span>
                                    <span className="block text-[7.5px] text-slate-500 leading-none mt-0.5 font-medium">
                                      {hour.start}-{hour.end}
                                    </span>
                                  </td>

                                  {/* Room cells */}
                                  {chunkCols.map((col: any, cIdx) => {
                                    const lessonsInRoom = getRoomLessons(col, dayIdx, hour.num, hIdx);

                                    return (
                                      <td
                                        key={cIdx}
                                        style={{ width: `calc((100% - 52px) / ${catRoomsCount})` }}
                                        className="border border-slate-300 p-1.5 align-middle text-center bg-white min-h-[44px]"
                                      >
                                        {lessonsInRoom.length > 0 ? (
                                          <div className="space-y-1">
                                            {lessonsInRoom.map((it, lIdx) => (
                                              <div key={lIdx} className="leading-tight flex flex-col items-center justify-center text-center py-0.5" title={`${it.displayText} (${it.subject})`}>
                                                <span className="font-black text-slate-950 text-[10.5px]">
                                                  {it.className}
                                                </span>
                                                {it.groupShort && (
                                                  <span className="text-indigo-700 text-[8.5px] font-bold">
                                                    {it.groupShort}
                                                  </span>
                                                )}
                                                <span
                                                  className="text-[9.5px] text-slate-800 font-extrabold truncate max-w-full"
                                                  title={it.subject}
                                                >
                                                  {it.subjectShort || it.subject}
                                                </span>
                                                {it.teacherAbbr && (
                                                  <span className="text-slate-600 text-[8.5px] font-mono font-bold">
                                                    {it.teacherAbbr}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-slate-300 font-bold font-mono">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (isPrintFriendlyWeeklyMode) {
    return (
      <div id="weekly-print-overlay" className="fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            /* Ukrywamy nagłówek i stopkę systemową */
            header, footer, #restoring-pointer-blocker {
              display: none !important;
            }

            /* Resetujemy wysokości i paski przewijania kontenerów nadrzędnych */
            html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
              height: auto !important;
              width: auto !important;
              overflow: visible !important;
              position: static !important;
            }

            body {
              background-color: white !important;
              color: black !important;
            }

            #weekly-print-overlay {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            .print-card {
              border: 1px solid #000 !important;
              margin-bottom: 25px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
              padding: 10px !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border: 1px solid #000 !important;
              color: #000 !important;
              padding: 4px 6px !important;
              font-size: 10px !important;
            }
            th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: ${weeklyPageOrientation};
              margin: 10mm;
            }
          }
        ` }} />

        {/* Top bar (Control stripe) - Hidden during print */}
        <div className="no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-slate-800 rounded-lg text-indigo-400">
              <Printer size={20} />
            </span>
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tight">Tryb przygotowania do druku</span>
              <h3 className="text-sm font-black uppercase text-white leading-tight">
                Podgląd Tygodniowego Planu • {printType === 'classes' ? 'Oddziały' : 'Nauczyciele'}
              </h3>
            </div>
          </div>

          {/* Controls inside top-bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick selector of layout orientation */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setWeeklyPageOrientation('portrait')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${weeklyPageOrientation === 'portrait' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Pionowo (A4)
              </button>
              <button
                onClick={() => setWeeklyPageOrientation('landscape')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${weeklyPageOrientation === 'landscape' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Poziomo (A4)
              </button>
            </div>

            {/* Quick selector of active class or teacher directly in overlay */}
            {printType === 'classes' ? (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="all">Wszystkie oddziały</option>
                {pl.classes.map(c => (
                  <option key={c.id} value={c.id}>Klasa {c.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="all">Wszyscy nauczyciele</option>
                  {pl.teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.last} {t.first}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-xs text-slate-300 font-bold cursor-pointer select-none bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-600 transition">
                  <input
                    type="checkbox"
                    checked={showDutiesInTeacherPlan}
                    onChange={(e) => setShowDutiesInTeacherPlan(e.target.checked)}
                    className="rounded text-indigo-500 focus:ring-indigo-400 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Dyżury na przerwach</span>
                </label>
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid"
            >
              <Printer size={13} /> Drukuj teraz (Ctrl+P)
            </button>
            
            <button
              onClick={() => setIsPrintFriendlyWeeklyMode(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition select-none cursor-pointer"
            >
              Zamknij podgląd
            </button>
          </div>
        </div>

        {/* Outer content container containing all printed sheets */}
        <div className="max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0">
          
          {printType === 'classes' ? (
            classesToPrint.map((cls, idx) => {
              return (
                <div key={cls.id} className={`print-card pb-8 border-b border-slate-200 last:border-0 ${idx < classesToPrint.length - 1 ? 'page-break mb-12' : ''}`}>
                  {/* Class Header */}
                  <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
                    <div className="text-left">
                      <h2 className="text-xl font-black text-slate-950">TYGODNIOWY PLAN LEKCJI • KLASA {cls.name}</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase">{appState.school.name} • Plan lekcji</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-bold uppercase">
                      Rok szkolny: {appState.yearLabel} • {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
                    </div>
                  </div>

                  {/* Clean Grid Table */}
                  <table className="w-full text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 uppercase font-black text-slate-800">
                        <th className="w-24 border border-slate-300 p-2.5 text-center text-[10px]">Nr / Godz</th>
                        {DAYS_NAMES.map(d => (
                          <th key={d} className="border border-slate-300 p-2.5 text-center text-[10px]">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {hoursList.map((hour, hIdx) => {
                        const hourKeyStr = String(hour.num);
                        return (
                          <tr key={hour.num} className="bg-white">
                            <td className="border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50">
                              <span className="font-extrabold text-slate-900">{hour.num}</span>
                              <span className="block text-[8px] text-slate-400 font-semibold leading-none mt-0.5">{hour.start}-{hour.end}</span>
                            </td>

                            {[0, 1, 2, 3, 4].map(dayIdx => {
                              let displayItems: Array<{ subject: string; teacherAbbr?: string; roomName?: string }> = [];

                              if (scheduleVersion === 'etap1') {
                                const matchingLessons = Object.entries(pl.lessons).filter(([k]) => {
                                  const p = k.split('|');
                                  return p[0] === cls.id && parseInt(p[1], 10) === dayIdx && parseInt(p[2], 10) === hIdx;
                                });

                                matchingLessons.forEach(([_, lesson]) => {
                                  if (lesson) {
                                    const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                                    if (asg) {
                                      const baseSubject = subjectsMap.get(asg.subjectId)?.name || 'Inny';
                                      const group = asg.groupId ? pl.schoolGroups?.find(g => g.id === asg.groupId) : null;
                                      const subject = group ? `[${group.name}] ${baseSubject}` : baseSubject;
                                      const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                                      const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
                                      displayItems.push({
                                        subject,
                                        teacherAbbr: teacher?.abbr,
                                        roomName: room?.name
                                      });
                                    }
                                  }
                                });
                              } else {
                                const clsMapData = etap2Schedule.classes[cls.id] || {};
                                const daySchedules = clsMapData[dayIdx] || {};
                                const hourCells = daySchedules[hourKeyStr] || [];
                                
                                hourCells.forEach(cell => {
                                  displayItems.push({
                                    subject: cell.subject,
                                    teacherAbbr: cell.teacherAbbr,
                                    roomName: cell.note
                                  });
                                });
                              }

                              return (
                                <td key={dayIdx} className="border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white">
                                  {displayItems.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {displayItems.map((it, dIdx) => (
                                        <div key={dIdx} className="text-[10px] leading-tight">
                                          <span className="font-black text-slate-900 block tracking-tight text-[10.5px]">{it.subject}</span>
                                          <div className="flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1">
                                            {it.teacherAbbr && <span className="bg-slate-100 border border-slate-200 px-1 rounded">{it.teacherAbbr}</span>}
                                            {it.roomName && <span className="bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded">sala: {it.roomName}</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-slate-200 font-bold font-mono">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          ) : (
            teachersToPrint.map((teacher, idx) => {
              return (
                <div key={teacher.id} className={`print-card pb-8 border-b border-slate-200 last:border-0 ${idx < teachersToPrint.length - 1 ? 'page-break mb-12' : ''}`}>
                  {/* Teacher Header */}
                  <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
                    <div className="text-left">
                      <h2 className="text-xl font-black text-slate-950">TYGODNIOWY PLAN NAUCZYCIELA • {teacher.last.toUpperCase()} {teacher.first.toUpperCase()} ({teacher.abbr})</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase">{appState.school.name} • Plan lekcji</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-bold uppercase">
                      Rok szkolny: {appState.yearLabel} • {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
                    </div>
                  </div>

                  {/* Clean Grid Table */}
                  <table className="w-full text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 uppercase font-black text-slate-800">
                        <th className="w-24 border border-slate-300 p-2.5 text-center text-[10px]">Nr / Godz</th>
                        {DAYS_NAMES.map(d => (
                          <th key={d} className="border border-slate-300 p-2.5 text-center text-[10px]">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {/* Pre-lesson break 0 (if any duties for this teacher) */}
                      {showDutiesInTeacherPlan && (() => {
                        const preBreaks = (appState.dyzury?.przerwy || []).filter(p => p.num === 0);
                        return preBreaks.map(p => {
                          const hasAnyDuty = [0, 1, 2, 3, 4].some(d => getTeacherDutiesForBreak(teacher.abbr, d, p.num).length > 0);
                          if (!hasAnyDuty) return null;
                          return (
                            <tr key={`break-pre-${p.num}`} className="bg-amber-50/70 border-y border-amber-200/90 font-medium">
                              <td className="border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60">
                                <span className="font-extrabold text-amber-950 block">{p.start}–{p.end}</span>
                                <span className="text-[8px] font-black uppercase text-amber-800 block">Dyżur</span>
                              </td>
                              {[0, 1, 2, 3, 4].map(dayIdx => {
                                const duties = getTeacherDutiesForBreak(teacher.abbr, dayIdx, p.num);
                                return (
                                  <td key={dayIdx} className="border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40">
                                    {duties.length > 0 ? (
                                      <div className="space-y-0.5">
                                        {duties.map((d, dIdx) => (
                                          <div key={dIdx} className="text-[9.5px] leading-tight flex flex-col items-center justify-center text-center">
                                            <span className="text-[7.5px] font-black text-amber-800 uppercase tracking-tight">🛡️ Dyżur:</span>
                                            <span className="font-extrabold text-slate-950 text-[10px]">{d.placeName}</span>
                                            {d.floor && <span className="text-[8px] text-slate-600 font-medium">({d.floor})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[8px] text-slate-300 font-mono">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}

                      {hoursList.map((hour, hIdx) => {
                        const currentHourNum = Number(hour.num);
                        const matchingBreaks = (appState.dyzury?.przerwy || []).filter(p => {
                          if (p.num === 0) return false;
                          if (p.num === currentHourNum || p.num === hIdx + 1) return true;
                          if (hour.end && p.start && hour.end === p.start) return true;
                          return false;
                        });

                        return (
                          <React.Fragment key={hour.num}>
                            <tr className="bg-white">
                              <td className="border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50">
                                <span className="font-extrabold text-slate-900">{hour.num}</span>
                                <span className="block text-[8.5px] text-slate-500 font-semibold leading-none mt-0.5">{hour.start}-{hour.end}</span>
                              </td>

                              {[0, 1, 2, 3, 4].map(dayIdx => {
                                const lessons = getTeacherLessons(teacher, dayIdx, Number(hour.num), hIdx);

                                return (
                                  <td key={dayIdx} className="border border-slate-300 p-2 align-middle text-center min-h-[52px] bg-white">
                                    {lessons.length > 0 ? (
                                      <div className="space-y-1.5 py-0.5">
                                        {lessons.map((it, dIdx) => (
                                          <div key={dIdx} className="text-[10px] leading-tight flex flex-col items-center justify-center text-center" title={it.displayText}>
                                            <span className="font-black text-slate-900 block tracking-tight text-[11px]">
                                              {it.subject}
                                            </span>
                                            <div className="flex items-center justify-center gap-1 text-[9.5px] mt-0.5 font-bold text-slate-800">
                                              <span>{it.className}</span>
                                              {it.groupShort && (
                                                <span className="text-indigo-700 font-extrabold text-[8.5px]">
                                                  ({it.groupShort})
                                                </span>
                                              )}
                                            </div>
                                            {it.roomName && (
                                              <span className="text-slate-600 text-[8.5px] font-semibold mt-0.5">
                                                s. {it.roomName}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-300 font-bold font-mono">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Duty breaks between lessons */}
                            {showDutiesInTeacherPlan && matchingBreaks.map(p => {
                              const hasAnyDuty = [0, 1, 2, 3, 4].some(d => getTeacherDutiesForBreak(teacher.abbr, d, p.num).length > 0);
                              if (!hasAnyDuty) return null;
                              return (
                                <tr key={`break-${hour.num}-${p.num}`} className="bg-amber-50/70 border-y border-amber-200/90 font-medium">
                                  <td className="border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60">
                                    <span className="font-extrabold text-amber-950 block">{p.start}–{p.end}</span>
                                    <span className="text-[8px] font-black uppercase text-amber-800 block">Dyżur</span>
                                  </td>
                                  {[0, 1, 2, 3, 4].map(dayIdx => {
                                    const duties = getTeacherDutiesForBreak(teacher.abbr, dayIdx, p.num);
                                    return (
                                      <td key={dayIdx} className="border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40">
                                        {duties.length > 0 ? (
                                          <div className="space-y-0.5">
                                            {duties.map((d, dIdx) => (
                                              <div key={dIdx} className="text-[9.5px] leading-tight flex flex-col items-center justify-center text-center">
                                                <span className="text-[7.5px] font-black text-amber-800 uppercase tracking-tight">🛡️ Dyżur:</span>
                                                <span className="font-extrabold text-slate-950 text-[10px]">{d.placeName}</span>
                                                {d.floor && <span className="text-[8px] text-slate-600 font-medium">({d.floor})</span>}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[8px] text-slate-300 font-mono">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const getLessonDisplay = (lessonsList: any[]) => {
    if (!lessonsList || lessonsList.length === 0) return null;
    return lessonsList.map((l, i) => {
      const cls = l.className || l.classes?.join(', ') || '';
      const subj = l.subject || '';
      const room = l.note || ''; // room name stored in note field
      return (
        <div key={i} className="text-[10px] font-semibold text-slate-700 leading-tight">
          📚 <span className="font-extrabold text-slate-900">{subj}</span> (kl. {cls}, s. {room})
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible">
      {/* CSS rules specifically injected for elegant printing */}
      <style>{`
        @media print {
          /* Ukrywamy nagłówek i stopkę systemową */
          header, footer, #restoring-pointer-blocker {
            display: none !important;
          }

          /* Resetujemy wysokości i paski przewijania kontenerów nadrzędnych */
          html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            position: static !important;
          }

          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .print-card {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            padding: 10px !important;
            margin-bottom: 25px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
            color: #000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h2, h3, h4 {
            color: #000 !important;
          }
        }
      `}</style>

      {/* --- CONTROLS BOX (HIDDEN ON PRINT) --- */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-7xl mx-auto">
        {isInIframe && (
          <div className="mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left">
            <div className="flex gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <span className="text-xs font-black text-amber-900 block uppercase tracking-tight">Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)</span>
                <p className="text-[11px] text-amber-800 leading-normal font-semibold mt-1">
                  Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">window.print()</code>) oraz otwierania nowych okien z wnętrza takich ramek.
                </p>
                <div className="bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">1</span>
                    <span>Kliknij okrągłą ikonę ze strzałką <strong className="font-black">"Otwórz w nowej karcie"</strong> w prawym górnym rogu podglądu aplikacji.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">2</span>
                    <span>W nowym oknie przycisk <strong className="font-black">"Drukuj teraz"</strong> oraz <strong className="font-black">"Podgląd płachty sal"</strong> zadziałają natychmiast!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Centrum Wydruków i Publikacji</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wygodne drukowanie planów lekcji i dyżurów</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {printType === 'rooms' && (
              <button 
                onClick={openRoomsPrintPreview}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer"
              >
                <Printer size={15} className="animate-pulse" /> Podgląd płachty sal
              </button>
            )}
            {printType === 'duties' && (
              <button 
                onClick={() => setIsDutiesModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer"
              >
                <Printer size={15} className="animate-pulse" /> Podgląd dyżurów
              </button>
            )}
            {(printType === 'classes' || printType === 'teachers') && (
              <button 
                onClick={() => setIsPrintFriendlyWeeklyMode(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid"
                title="Generuj przejrzysty i czytelny tygodniowy plan dostosowany do wydruku z czyszczeniem interfejsu"
              >
                <Calendar size={15} /> Generuj Tygodniowy Plan
              </button>
            )}
            <button 
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Printer size={15} /> Drukuj teraz (Ctrl+P)
            </button>
          </div>
        </div>

        {/* Filters and Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Main Select template */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Typ wydruku</label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPrintType('classes')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'classes' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Plan Klas
              </button>
              <button
                onClick={() => setPrintType('teachers')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'teachers' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Nauczyciele
              </button>
              <button
                onClick={() => setPrintType('rooms')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'rooms' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Gabinety
              </button>
              <button
                onClick={() => setPrintType('duties')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'duties' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Dyżury
              </button>
            </div>
          </div>

          {/* Schedule version select */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Siatka Lekcji</label>
            <select
              value={scheduleVersion}
              onChange={(e) => setScheduleVersion(e.target.value as any)}
              className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
            >
              <option value="etap1">Etap 1: Plan Klas (Siatka bazowa)</option>
              <option value="etap2">Etap 2: Plan Sal (Przydzielone gabinety)</option>
            </select>
          </div>

          {/* Dynamic Filter select */}
          {printType === 'classes' && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Wybierz Klasę</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
              >
                <option value="all">Wszystkie oddziały (każdy na nowej stronie)</option>
                {pl.classes.map(c => (
                  <option key={c.id} value={c.id}>Klasa {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {printType === 'teachers' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Wybierz Nauczyciela</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
                >
                  <option value="all">Wszyscy nauczyciele (każdy na nowej stronie)</option>
                  {pl.teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.last} {t.first} ({t.abbr})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Opcje planu</label>
                <label className="h-[38px] px-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg flex items-center gap-2 cursor-pointer transition select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showDutiesInTeacherPlan}
                    onChange={(e) => setShowDutiesInTeacherPlan(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Pokaż dyżury międzylekcyjne</span>
                </label>
              </div>
            </>
          )}

          {printType === 'rooms' && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Wybierz Gabinet</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
              >
                <option value="all">Wszystkie sale/gabinety</option>
                {pl.rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.desc || 'sala ogólna'})</option>
                ))}
              </select>
            </div>
          )}

          {printType === 'rooms' && (
            <div className="space-y-1 flex flex-col justify-end">
              <label className="text-[10px] text-slate-400 font-bold uppercase invisible sm:block">Akcja</label>
              <button
                onClick={openRoomsPrintPreview}
                className="w-full h-[38px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-amber-600 border-solid"
              >
                <Printer size={15} /> Podgląd wydruku płachty sal
              </button>
            </div>
          )}

          {printType === 'duties' && (
            <div className="space-y-1 flex flex-col justify-end">
              <label className="text-[10px] text-slate-400 font-bold uppercase invisible sm:block">Akcja</label>
              <button
                onClick={() => setIsDutiesModalOpen(true)}
                className="w-full h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid"
              >
                <Printer size={15} /> Podgląd wydruku dyżurów
              </button>
            </div>
          )}
        </div>

        {/* --- DEDYKOWANY PODPANEL EKSPORTU DO KALENDARZA (UKRYTY NA WYDRUKU) --- */}
        {printType === 'teachers' && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-4 text-left">
            <div className="bg-gradient-to-tr from-indigo-50/70 to-blue-50/30 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs">📅</span>
                <span className="text-xs font-black uppercase text-indigo-900 tracking-wide">Eksport tygodniowego planu zajęć do kalendarza (.ics / Google Calendar)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Początek okresu (Pierwszy dzień lekcji)</label>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Koniec okresu (Ostatni dzień lekcji)</label>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block">Format tytułu wydarzenia w kalendarzu</label>
                  <select
                    value={nameFormat}
                    onChange={(e) => setNameFormat(e.target.value)}
                    className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                  >
                    <option value="[Przedmiot] - [Klasa] [Sala]">[Przedmiot] - [Klasa] [Sala]</option>
                    <option value="[Klasa] - [Przedmiot] [Sala]">[Klasa] - [Przedmiot] [Sala]</option>
                    <option value="[Przedmiot] ([Klasa]) (Sala: [Sala])">[Przedmiot] ([Klasa]) ([Sala])</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-indigo-100/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <div className="text-[10px] text-slate-500 leading-relaxed max-w-xl">
                  💡 <strong>Wskazówka:</strong> Kliknij przycisk <span className="bg-white border text-indigo-700 px-1 py-0.5 rounded font-black text-[9px]">Pobierz kalendarz (.ics)</span> przy konkretnym nauczycielu na liście poniżej, albo pobierz zbiorczy arkusz z kadrą za pomocą poniższych przycisków szybkiego pobierania.
                </div>
                
                <div className="flex gap-2 flex-wrap w-full lg:w-auto">
                  {selectedTeacherId !== 'all' && (
                    <button
                      onClick={() => {
                        const tObj = pl.teachers.find(t => t.id === selectedTeacherId);
                        if (tObj) handleExportTeacherIcs(tObj);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-600 border-solid"
                    >
                      <Calendar size={13} /> Pobierz dla {pl.teachers.find(t => t.id === selectedTeacherId)?.abbr}
                    </button>
                  )}
                  <button
                    onClick={handleExportAllTeachersIcs}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-800 border-solid"
                  >
                    <Layers size={13} /> Wspólny plik dla KADRY
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- PRINT AREA --- */}
      <div className="print-container max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0">
        
        {/* ======================= CLASSES RENDERING ======================= */}
        {printType === 'classes' && classesToPrint.map((cls, idx) => {
          return (
            <div key={cls.id} className={`print-card pb-6 border-b border-slate-200 last:border-0 ${idx < classesToPrint.length - 1 ? 'page-break' : ''}`}>
              <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">PLAN LEKCJI · KLASA {cls.name}</h2>
                  <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                  Generowane przez SalePlan Pro · {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
                </div>
              </div>

              <table className="w-full text-xs text-left border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 uppercase font-black text-slate-800">
                    <th className="w-20 border border-slate-300 p-2 text-center text-[10.5px]">Lp. / Godz</th>
                    {DAYS_NAMES.map(d => (
                      <th key={d} className="border border-slate-300 p-2 text-center text-[10.5px]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hoursList.map((hour, hIdx) => {
                    const hourKeyStr = String(hour.num);
                    return (
                      <tr key={hour.num} className="hover:bg-slate-50/50">
                        {/* Hour details cell */}
                        <td className="border border-slate-300 p-2 font-mono text-center text-[10px]">
                          <span className="font-extrabold text-slate-900">{hour.num}</span>
                          <span className="block text-[8px] text-slate-400 leading-none mt-0.5">{hour.start}-{hour.end}</span>
                        </td>
                        
                        {/* Day cells 0..4 */}
                        {[0, 1, 2, 3, 4].map(dayIdx => {
                          let displayItems: Array<{ subject: string; teacherAbbr?: string; roomName?: string }> = [];

                          if (scheduleVersion === 'etap1') {
                            // Find base Etap 1 lessons
                            const matchingLessons = Object.entries(pl.lessons).filter(([k]) => {
                              const p = k.split('|');
                              return p[0] === cls.id && parseInt(p[1], 10) === dayIdx && parseInt(p[2], 10) === hIdx;
                            });

                            matchingLessons.forEach(([_, lesson]) => {
                              if (lesson) {
                                const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                                if (asg) {
                                  const baseSubject = subjectsMap.get(asg.subjectId)?.name || 'Inny';
                                  const group = asg.groupId ? pl.schoolGroups?.find(g => g.id === asg.groupId) : null;
                                  const subject = group ? `[${group.name}] ${baseSubject}` : baseSubject;
                                  const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                                  const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
                                  displayItems.push({
                                    subject,
                                    teacherAbbr: teacher?.abbr,
                                    roomName: room?.name
                                  });
                                }
                              }
                            });
                          } else {
                            // Find Etap 2 schedules from compiled map
                            const clsMapData = etap2Schedule.classes[cls.id] || {};
                            const daySchedules = clsMapData[dayIdx] || {};
                            const hourCells = daySchedules[hourKeyStr] || [];
                            
                            hourCells.forEach(cell => {
                              displayItems.push({
                                subject: cell.subject,
                                teacherAbbr: cell.teacherAbbr,
                                roomName: cell.note // In Etap 2 we mapped room to notes
                              });
                            });
                          }

                          return (
                            <td key={dayIdx} className="border border-slate-300 p-2 align-top text-center min-h-[45px]">
                              {displayItems.length > 0 ? (
                                <div className="space-y-1">
                                  {displayItems.map((it, dIdx) => (
                                    <div key={dIdx} className="text-[10px]">
                                      <span className="font-black text-slate-950 block">{it.subject}</span>
                                      <div className="flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5">
                                        {it.teacherAbbr && <span className="bg-slate-100 border border-slate-200 px-1 rounded">{it.teacherAbbr}</span>}
                                        {it.roomName && <span className="bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded">f. {it.roomName}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-300 font-bold font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* ======================= TEACHERS RENDERING ======================= */}
        {printType === 'teachers' && teachersToPrint.map((teacher, idx) => {
          return (
            <div key={teacher.id} className={`print-card pb-6 border-b border-slate-200 last:border-0 ${idx < teachersToPrint.length - 1 ? 'page-break' : ''}`}>
              <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">PLAN LEKCJI NAUCZYCIELA: {teacher.last} {teacher.first} ({teacher.abbr})</h2>
                  <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    onClick={() => handleExportTeacherIcs(teacher)}
                    className="no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-black tracking-tight leading-none transition flex items-center gap-1.5 cursor-pointer select-none border-solid"
                    title="Pobierz plik kalendarza (.ics) dla tego nauczyciela"
                  >
                    <Calendar size={11} /> Pobierz kalendarz (.ics)
                  </button>
                  <div className="text-right text-[9px] text-slate-400 font-bold uppercase font-mono">
                    Generowane przez SalePlan Pro · {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
                  </div>
                </div>
              </div>

              <table className="w-full text-xs text-left border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 uppercase font-black text-slate-800">
                    <th className="w-20 border border-slate-300 p-2 text-center text-[10.5px]">Lp. / Godz</th>
                    {DAYS_NAMES.map(d => (
                      <th key={d} className="border border-slate-300 p-2 text-center text-[10.5px]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Pre-lesson break 0 (if any duties for this teacher) */}
                  {showDutiesInTeacherPlan && (() => {
                    const preBreaks = (appState.dyzury?.przerwy || []).filter(p => p.num === 0);
                    return preBreaks.map(p => {
                      const hasAnyDuty = [0, 1, 2, 3, 4].some(d => getTeacherDutiesForBreak(teacher.abbr, d, p.num).length > 0);
                      if (!hasAnyDuty) return null;
                      return (
                        <tr key={`break-pre-${p.num}`} className="bg-amber-50/70 border-y border-amber-200/90 font-medium">
                          <td className="border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60">
                            <span className="font-extrabold text-amber-950 block">{p.start}–{p.end}</span>
                            <span className="text-[8px] font-black uppercase text-amber-800 block">Dyżur</span>
                          </td>
                          {[0, 1, 2, 3, 4].map(dayIdx => {
                            const duties = getTeacherDutiesForBreak(teacher.abbr, dayIdx, p.num);
                            return (
                              <td key={dayIdx} className="border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40">
                                {duties.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {duties.map((d, dIdx) => (
                                      <div key={dIdx} className="text-[9.5px] leading-tight flex flex-col items-center justify-center text-center">
                                        <span className="text-[7.5px] font-black text-amber-800 uppercase tracking-tight">🛡️ Dyżur:</span>
                                        <span className="font-extrabold text-slate-950 text-[10px]">{d.placeName}</span>
                                        {d.floor && <span className="text-[8px] text-slate-600 font-medium">({d.floor})</span>}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[8px] text-slate-300 font-mono">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}

                  {hoursList.map((hour, hIdx) => {
                    const currentHourNum = Number(hour.num);
                    const matchingBreaks = (appState.dyzury?.przerwy || []).filter(p => {
                      if (p.num === 0) return false;
                      if (p.num === currentHourNum || p.num === hIdx + 1) return true;
                      if (hour.end && p.start && hour.end === p.start) return true;
                      return false;
                    });

                    return (
                      <React.Fragment key={hour.num}>
                        <tr className="hover:bg-slate-50/50">
                          {/* Hour info */}
                          <td className="border border-slate-300 p-2 font-mono text-center text-[10px] bg-slate-50/50">
                            <span className="font-extrabold text-slate-900">{hour.num}</span>
                            <span className="block text-[8px] text-slate-500 font-semibold leading-none mt-0.5">{hour.start}-{hour.end}</span>
                          </td>
                          
                          {/* Day columns 0..4 */}
                          {[0, 1, 2, 3, 4].map(dayIdx => {
                            const lessons = getTeacherLessons(teacher, dayIdx, Number(hour.num), hIdx);

                            return (
                              <td key={dayIdx} className="border border-slate-300 p-2 align-middle text-center min-h-[50px] bg-white">
                                {lessons.length > 0 ? (
                                  <div className="space-y-1.5 py-0.5">
                                    {lessons.map((it, dIdx) => (
                                      <div key={dIdx} className="text-[10px] leading-tight flex flex-col items-center justify-center text-center" title={it.displayText}>
                                        <span className="font-black text-slate-900 block tracking-tight text-[11px]">
                                          {it.subject}
                                        </span>
                                        <div className="flex items-center justify-center gap-1 text-[9.5px] mt-0.5 font-bold text-slate-800">
                                          <span>{it.className}</span>
                                          {it.groupShort && (
                                            <span className="text-indigo-700 font-extrabold text-[8.5px]">
                                              ({it.groupShort})
                                            </span>
                                          )}
                                        </div>
                                        {it.roomName && (
                                          <span className="text-slate-600 text-[8.5px] font-semibold mt-0.5">
                                            s. {it.roomName}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-300 font-bold font-mono">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Duty breaks between lessons */}
                        {showDutiesInTeacherPlan && matchingBreaks.map(p => {
                          const hasAnyDuty = [0, 1, 2, 3, 4].some(d => getTeacherDutiesForBreak(teacher.abbr, d, p.num).length > 0);
                          if (!hasAnyDuty) return null;
                          return (
                            <tr key={`break-${hour.num}-${p.num}`} className="bg-amber-50/70 border-y border-amber-200/90 font-medium">
                              <td className="border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60">
                                <span className="font-extrabold text-amber-950 block">{p.start}–{p.end}</span>
                                <span className="text-[8px] font-black uppercase text-amber-800 block">Dyżur</span>
                              </td>
                              {[0, 1, 2, 3, 4].map(dayIdx => {
                                const duties = getTeacherDutiesForBreak(teacher.abbr, dayIdx, p.num);
                                return (
                                  <td key={dayIdx} className="border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40">
                                    {duties.length > 0 ? (
                                      <div className="space-y-0.5">
                                        {duties.map((d, dIdx) => (
                                          <div key={dIdx} className="text-[9.5px] leading-tight flex flex-col items-center justify-center text-center">
                                            <span className="text-[7.5px] font-black text-amber-800 uppercase tracking-tight">🛡️ Dyżur:</span>
                                            <span className="font-extrabold text-slate-950 text-[10px]">{d.placeName}</span>
                                            {d.floor && <span className="text-[8px] text-slate-600 font-medium">({d.floor})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[8px] text-slate-300 font-mono">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* ======================= ROOMS RENDERING ======================= */}
        {printType === 'rooms' && (
          <div className="print-card pb-6">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                Generowane przez SalePlan Pro · {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-6 font-bold uppercase no-print">
              Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty.
            </p>

            <div className="no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="space-y-1 text-left">
                <span className="text-xs font-black text-amber-900 block uppercase">✨ Dedykowany Wydruk Płachty Dyrektorskiej</span>
                <p className="text-[11px] text-amber-700 leading-normal font-medium max-w-3xl">
                  Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki.
                </p>
              </div>
              <button
                onClick={openRoomsPrintPreview}
                className="shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer"
              >
                <Printer size={14} className="animate-pulse" /> Podgląd i Druk Płachty (A4 Poziomo)
              </button>
            </div>

            {roomsToPrint.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">Brak gabinetów do wyświetlenia w wybranym filtrze.</p>
            ) : (
              <div className="space-y-12">
                {[0, 1, 2, 3, 4].map((dayIdx) => {
                  return (
                    <div key={dayIdx} className="page-break last:pb-0 pb-2">
                      <div className="bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-4 print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                        <span className="text-xs font-black uppercase tracking-wide">
                          📅 {DAYS_NAMES[dayIdx]} — PŁACHTA OBŁOŻENIA GABINETÓW
                        </span>
                        <span className="text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500">
                          Podział na kategorie
                        </span>
                      </div>

                      <div className="space-y-6">
                        {roomsPrintCategories.map((cat) => {
                          const floorGroups = getFloorGroups(cat.cols, appState.buildings);
                          const segmentGroups = getSegmentGroups(cat.cols);

                          return (
                            <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="text-sm">{cat.icon}</span>
                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{cat.name} ({cat.cols.length})</h4>
                              </div>

                              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="w-full text-xs text-left border border-slate-300 min-w-[600px] bg-white rounded-lg">
                                  <thead>
                                    {/* Row 1: Floor headers */}
                                    <tr className="bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300">
                                      <th className="w-24 border border-slate-300 p-2 text-center text-[10.5px]">Lekcja / Godz</th>
                                      {floorGroups.map((g, fIdx) => (
                                        <th key={fIdx} colSpan={g.span} className="border border-slate-300 p-2 text-center text-[10px] bg-slate-50 font-bold text-slate-700">
                                          📍 {localCleanFloorName(g.name, g.buildingName)}
                                        </th>
                                      ))}
                                    </tr>
                                    {/* Row 2: Segment headers */}
                                    <tr className="bg-white uppercase font-black text-slate-500 border-b border-slate-300">
                                      <th className="border border-slate-300 p-1.5 text-center text-[9px] bg-slate-50 font-medium text-slate-400">-</th>
                                      {segmentGroups.map((g, sIdx) => (
                                        <th key={sIdx} colSpan={g.span} className="border border-slate-300 p-1.5 text-center text-[9px] bg-white text-slate-500 uppercase font-semibold">
                                          🧩 {g.name}
                                        </th>
                                      ))}
                                    </tr>
                                    {/* Row 3: Room headers */}
                                    <tr className="bg-slate-50 uppercase font-black text-slate-800">
                                      <th className="border border-slate-300 p-2 text-center text-[10.5px]">Godzina</th>
                                      {cat.cols.map((col, cIdx) => (
                                        <th key={cIdx} className="border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]">
                                          <span className="font-mono text-[11px] block text-slate-900">🚪 {col.room.num}</span>
                                          <span className="block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto">({col.room.sub || 'sala ogólna'})</span>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {hoursList.map((hour, hIdx) => {
                                      const hourKeyStr = String(hour.num);
                                      return (
                                        <tr key={hour.num} className="hover:bg-slate-50/40">
                                          {/* Hour column */}
                                          <td className="border border-slate-300 p-2 font-mono text-center bg-slate-50/50">
                                            <span className="font-extrabold text-slate-900 text-[11px]">{hour.num}</span>
                                            <span className="block text-[8px] text-slate-400 leading-none mt-0.5">{hour.start}-{hour.end}</span>
                                          </td>

                                          {/* Rooms cells */}
                                          {cat.cols.map((col, cIdx) => {
                                            const lessonsInRoom = getRoomLessons(col, dayIdx, hour.num, hIdx);

                                            return (
                                              <td key={cIdx} className="border border-slate-300 p-1.5 align-middle text-center min-h-[50px] bg-white">
                                                {lessonsInRoom.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {lessonsInRoom.map((it, dIdx) => (
                                                      <div key={dIdx} className="text-[10px] leading-tight flex flex-col items-center justify-center text-center py-0.5" title={`${it.displayText} (${it.subject})`}>
                                                        <span className="font-extrabold text-slate-900 text-[10.5px]">
                                                          {it.className}
                                                        </span>
                                                        {it.groupShort && (
                                                          <span className="text-indigo-700 text-[8.5px] font-bold">
                                                            {it.groupShort}
                                                          </span>
                                                        )}
                                                        <span className="text-[9.5px] text-slate-800 font-extrabold truncate max-w-full" title={it.subject}>
                                                          {it.subjectShort || it.subject}
                                                        </span>
                                                        {it.teacherAbbr && (
                                                          <span className="text-slate-600 text-[8.5px] font-mono font-bold">
                                                            {it.teacherAbbr}
                                                          </span>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <span className="text-[10px] text-slate-300 font-bold font-mono">-</span>
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= DUTIES (DYŻURY) RENDERING ======================= */}
        {printType === 'duties' && (
          <div className="print-card pb-6">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                Generowane przez SalePlan Pro · Moduł Dyżurów
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-6 font-bold uppercase">
              Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych.
            </p>

            <div className="space-y-8">
              {[0, 1, 2, 3, 4].map(dayIdx => {
                const hasAnyDutiesOnThisDay = appState.dyzury.miejsca.some(miejsce =>
                  appState.dyzury.przerwy.some(przerwa => {
                    const dutyKey = `${miejsce.id}|${dayIdx}|${przerwa.num}`;
                    return !!appState.dyzury.harmonogram[dutyKey]?.teacherAbbr;
                  })
                );

                return (
                  <div key={dayIdx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5">
                      📅 {DAYS_NAMES[dayIdx]}
                    </h3>

                    {!hasAnyDutiesOnThisDay ? (
                      <p className="text-[10px] text-slate-400 italic py-1.5">Brak przydzielonych dyżurów na ten dzień.</p>
                    ) : appState.dyzury.miejsca.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1.5">Brak zdefiniowanych miejsc dyżurowania.</p>
                    ) : (
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                        <table className="w-full text-xs border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300">
                              <th className="border border-slate-300 p-2 text-left text-[10px] w-48 bg-slate-50">Godzina / Przerwa</th>
                              {appState.dyzury.miejsca.map(place => (
                                <th key={place.id} className="border border-slate-300 p-2 text-center text-[10px] min-w-[110px] bg-slate-50">
                                  <span className="block text-slate-900 font-black">📍 {place.name}</span>
                                  {place.floor && (
                                    <span className="block text-[8px] text-slate-500 font-bold uppercase mt-0.5">{place.floor}</span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {appState.dyzury.przerwy.map(przerwa => {
                              return (
                                <tr key={przerwa.num} className="bg-white border-b border-slate-200 hover:bg-slate-50/50">
                                  <td className="border border-slate-300 p-2.5 font-mono text-[9px] text-left">
                                    <span className="font-extrabold text-slate-800">{przerwa.name || `Przerwa ${przerwa.num}`}</span>
                                    <span className="block text-slate-400 font-bold mt-0.5">⏱️ {przerwa.start} - {przerwa.end}</span>
                                  </td>
                                  {appState.dyzury.miejsca.map(place => {
                                    const dutyKey = `${place.id}|${dayIdx}|${przerwa.num}`;
                                    const entry = appState.dyzury.harmonogram[dutyKey];
                                    const t = entry?.teacherAbbr ? appState.teachers.find(tch => tch.abbr === entry.teacherAbbr) : null;

                                    return (
                                      <td key={place.id} className="border border-slate-300 p-2 text-center align-middle">
                                        {entry?.teacherAbbr ? (
                                          <div className="inline-flex flex-col items-center justify-center">
                                            <span className="bg-emerald-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-black shadow-xs tracking-wider uppercase inline-block print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
                                              {entry.teacherAbbr}
                                            </span>
                                            <span className="block text-[8.5px] text-slate-400 font-bold truncate max-w-[100px] mt-1 print:text-slate-500">
                                              {t ? `${t.first.slice(0, 1)}. ${t.last}` : 'Dyżur'}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 font-bold">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Duties Print Preview and Verification Modal */}
      {isDutiesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] no-print">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-7xl w-full h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Printer size={22} className="animate-pulse" />
                </span>
                <div className="text-left">
                  <span className="text-[10px] text-emerald-400 block uppercase font-black tracking-wider">Dynamiczny Podgląd i Weryfikacja • SchedData</span>
                  <h3 className="text-lg font-black uppercase text-white leading-tight">
                    Harmonogram Dyżurów Nauczycielskich
                  </h3>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Day Selector */}
                <div className="flex flex-col text-left">
                  <label className="text-[9px] font-bold uppercase text-slate-400 mb-1">Dzień Tygodnia</label>
                  <select
                    value={dutiesModalDayFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDutiesModalDayFilter(val === 'all' ? 'all' : parseInt(val, 10));
                    }}
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="all">Wszystkie dni tygodnia</option>
                    {[0, 1, 2, 3, 4].map(idx => (
                      <option key={idx} value={idx}>{DAYS_NAMES[idx]}</option>
                    ))}
                  </select>
                </div>

                {/* Scale Selector */}
                <div className="flex flex-col text-left">
                  <label className="text-[9px] font-bold uppercase text-slate-400 mb-1">Skala (Zoom)</label>
                  <select
                    value={dutiesModalScale}
                    onChange={(e) => setDutiesModalScale(parseFloat(e.target.value))}
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="0.7">70% (Gęsty/Kompaktowy)</option>
                    <option value="0.8">80%</option>
                    <option value="0.85">85%</option>
                    <option value="0.9">90%</option>
                    <option value="1.0">100% (Standardowy)</option>
                    <option value="1.1">110% (Powiększony)</option>
                  </select>
                </div>

                {/* Print Trigger */}
                <div className="flex items-end h-full">
                  <button
                    onClick={openDutiesPrintPreview}
                    className="h-[36px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid"
                    title="Otwórz czysty, zoptymalizowany podział A4 landscape do drukowania lub zapisu do PDF"
                  >
                    <Printer size={15} /> Drukuj / Generuj PDF
                  </button>
                </div>

                {/* Close Button */}
                <div className="flex items-end h-full">
                  <button
                    onClick={() => setIsDutiesModalOpen(false)}
                    className="h-[36px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable container) */}
            <div className="p-6 bg-slate-100 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300">
              <div 
                className="mx-auto bg-white p-8 border border-slate-200 shadow-md rounded-2xl space-y-8"
                style={{ 
                  transform: `scale(${dutiesModalScale})`, 
                  transformOrigin: 'top center',
                  width: `${100 / dutiesModalScale}%`,
                  transition: 'transform 0.15s ease-out, width 0.15s ease-out'
                }}
              >
                {/* School Header */}
                <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4">
                  <div className="text-left">
                    <h2 className="text-xl font-black text-slate-950">PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h2>
                    <p className="text-xs text-slate-500 font-extrabold uppercase">{appState.school.name} • Rok szkolny {appState.yearLabel}</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-bold uppercase">
                    Generowane dynamicznie • Weryfikacja planu lekcji (SchedData)
                  </div>
                </div>

                {/* Grid Structure */}
                <div className="space-y-8 text-left">
                  {[0, 1, 2, 3, 4]
                    .filter(idx => dutiesModalDayFilter === 'all' || dutiesModalDayFilter === idx)
                    .map(dayIdx => {
                      const hasAnyDutiesOnThisDay = appState.dyzury.miejsca.some(miejsce =>
                        appState.dyzury.przerwy.some(przerwa => {
                          const dutyKey = `${miejsce.id}|${dayIdx}|${przerwa.num}`;
                          return !!appState.dyzury.harmonogram[dutyKey]?.teacherAbbr;
                        })
                      );

                      return (
                        <div key={dayIdx} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 break-inside-avoid shadow-sm">
                          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center justify-between">
                            <span>📅 {DAYS_NAMES[dayIdx]}</span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              {appState.dyzury.miejsca.length} Miejsc • {appState.dyzury.przerwy.length} Przerw
                            </span>
                          </h3>

                          {!hasAnyDutiesOnThisDay ? (
                            <p className="text-[10px] text-slate-400 italic py-2">Brak przydzielonych dyżurów na ten dzień.</p>
                          ) : appState.dyzury.miejsca.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic py-2">Brak zdefiniowanych miejsc dyżurowania.</p>
                          ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-xl shadow-xs">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300">
                                    <th className="p-3 text-left text-[10px] w-48 bg-slate-50 font-black border-r border-slate-200">
                                      Godzina / Przerwa
                                    </th>
                                    {appState.dyzury.miejsca.map(place => (
                                      <th key={place.id} className="p-3 text-center text-[10px] min-w-[200px] bg-slate-50 font-black border-r border-slate-200 last:border-r-0">
                                        <span className="block text-slate-900 font-black">📍 {place.name}</span>
                                        {place.floor && (
                                          <span className="block text-[8px] text-slate-500 font-bold uppercase mt-0.5">{place.floor}</span>
                                        )}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {appState.dyzury.przerwy.map(przerwa => {
                                    return (
                                      <tr key={przerwa.num} className="bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                                        <td className="p-3 font-mono text-[9px] text-left border-r border-slate-200 font-semibold bg-slate-50/30">
                                          <span className="font-extrabold text-slate-800 block text-xs">{przerwa.name || `Przerwa ${przerwa.num}`}</span>
                                          <span className="block text-slate-400 font-bold mt-1">⏱️ {przerwa.start} - {przerwa.end}</span>
                                        </td>
                                        {appState.dyzury.miejsca.map(place => {
                                          const dutyKey = `${place.id}|${dayIdx}|${przerwa.num}`;
                                          const entry = appState.dyzury.harmonogram[dutyKey];
                                          const t = entry?.teacherAbbr ? appState.teachers.find(tch => tch.abbr === entry.teacherAbbr) : null;
                                          const teacherId = t?.id || entry?.teacherAbbr || '';

                                          // Resolve SchedData lessons directly before and after
                                          const dayLessons = teacherId ? (etap2Schedule.teachers[teacherId]?.[dayIdx] || {}) : {};
                                          const lessonsBefore = teacherId ? (dayLessons[String(przerwa.num)] || []) : [];
                                          const lessonsAfter = teacherId ? (dayLessons[String(przerwa.num + 1)] || []) : [];
                                          const hasAnyLessonsOnDay = teacherId ? (Object.values(dayLessons).some(arr => Array.isArray(arr) && arr.length > 0)) : false;

                                          // Collision: double duty
                                          const otherDutiesSameBreak = appState.dyzury.miejsca
                                            .filter(m => m.id !== place.id)
                                            .map(m => {
                                              const k = `${m.id}|${dayIdx}|${przerwa.num}`;
                                              return { placeName: m.name, entry: appState.dyzury.harmonogram[k] };
                                            })
                                            .filter(d => d.entry?.teacherAbbr === entry?.teacherAbbr);

                                          return (
                                            <td key={place.id} className="p-3 text-center align-middle border-r border-slate-200 last:border-r-0">
                                              {entry?.teacherAbbr ? (
                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                  {/* Teacher badge */}
                                                  <div className="inline-flex flex-col items-center justify-center">
                                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1 text-xs font-mono font-black shadow-xs tracking-wider uppercase inline-block">
                                                      {entry.teacherAbbr}
                                                    </span>
                                                    <span className="block text-[9px] text-slate-600 font-bold truncate max-w-[150px] mt-1">
                                                      {t ? `${t.first} ${t.last}` : 'Dyżur'}
                                                    </span>
                                                  </div>

                                                  {/* Verification Context (Lessons from schedData) */}
                                                  <div className="w-full mt-2 pt-2 border-t border-slate-100 text-left space-y-1 bg-slate-50/50 p-2 rounded-lg">
                                                    <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider mb-1">Weryfikacja lekcji:</div>
                                                    
                                                    {/* Lesson before */}
                                                    <div className="text-[9px]">
                                                      <span className="text-slate-400 font-bold">Przed przerwą: </span>
                                                      {lessonsBefore.length > 0 ? (
                                                        getLessonDisplay(lessonsBefore)
                                                      ) : (
                                                        <span className="text-slate-400 font-medium italic">Brak lekcji</span>
                                                      )}
                                                    </div>

                                                    {/* Lesson after */}
                                                    <div className="text-[9px]">
                                                      <span className="text-slate-400 font-bold">Po przerwie: </span>
                                                      {lessonsAfter.length > 0 ? (
                                                        getLessonDisplay(lessonsAfter)
                                                      ) : (
                                                        <span className="text-slate-400 font-medium italic">Brak lekcji</span>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* Warnings/Checks */}
                                                  {(otherDutiesSameBreak.length > 0 || !hasAnyLessonsOnDay) && (
                                                    <div className="w-full space-y-1">
                                                      {otherDutiesSameBreak.length > 0 && (
                                                        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-1 text-[8.5px] font-bold text-left">
                                                          🚨 Kolizja: Jednoczesny dyżur w rejonie: {otherDutiesSameBreak.map(d => d.placeName).join(', ')}
                                                        </div>
                                                      )}
                                                      {!hasAnyLessonsOnDay && (
                                                        <div className="bg-amber-50 text-amber-700 border border-amber-200 rounded p-1 text-[8.5px] font-bold text-left">
                                                          ⚠️ Brak innych lekcji w tym dniu!
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="text-slate-300 font-bold">-</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-400 font-semibold uppercase">
                Opcje weryfikacji są dynamicznie synchronizowane z głównym widokiem deweloperskim
              </span>
              <button
                onClick={() => setIsDutiesModalOpen(false)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition"
              >
                Zamknij podgląd
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Blocked Fallback Modal */}
      {popupBlocked && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Pop-up zablokowany lub zakazany w bezpiecznym iFrame</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left">
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Alternatywnie użyj przycisku <strong className="font-black text-slate-900">Drukuj teraz</strong> w menu głównym.</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  setPopupBlocked(false);
                  window.print();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Drukuj stąd
              </button>
              <button
                onClick={() => setPopupBlocked(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
