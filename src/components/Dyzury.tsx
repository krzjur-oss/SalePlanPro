import React, { useState, useMemo } from 'react';
import { AppState, MiejsceDyzuru, Przerwa, DyzurEntry, DyzuryState } from '../types';
import { esc, colKey, flattenColumns, uid } from '../utils';
import { 
  Shield, Timer, RefreshCcw, Trash2, Edit3, Plus, Settings, Check, HelpCircle 
} from 'lucide-react';

const getBreakDuration = (p: Przerwa): number => {
  const [sh, sm] = p.start.split(':').map(Number);
  const [eh, em] = p.end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff < 0 ? diff + 24 * 60 : diff;
};

interface DyzuryProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  schedData: any;
}

export default function Dyzury({ appState, onChangeAppState, schedData }: DyzuryProps) {
  const dyz = appState.dyzury;

  const [activeTab, setActiveTab] = useState<'roster' | 'places' | 'breaks'>('roster');
  const [activeDay, setActiveDay] = useState<number>(0);
  const [draggedTeacher, setDraggedTeacher] = useState<{ miejsceId: string; przerwa: number } | null>(null);

  // Edit / Add forms
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceFloor, setNewPlaceFloor] = useState('');
  const [newPlaceDesc, setNewPlaceDesc] = useState('');
  const [newPlaceTeachersNeeded, setNewPlaceTeachersNeeded] = useState<number>(1);
  const [newPlaceConnectedRooms, setNewPlaceConnectedRooms] = useState<string[]>([]);

  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');
  const [newBreakName, setNewBreakName] = useState('');

  const [maxDuties, setMaxDuties] = useState<number>(dyz.settings.maxPerTeacher || 3);
  const [maxMinutesPerTeacher, setMaxMinutesPerTeacher] = useState<number>(() => dyz.settings.maxMinutesPerTeacher || 60);
  const [maxConsecutiveDuties, setMaxConsecutiveDuties] = useState<number>(() => dyz.settings.maxConsecutiveDuties !== undefined ? dyz.settings.maxConsecutiveDuties : 2);
  const [excludeTeachers, setExcludeTeachers] = useState<string[]>(dyz.settings.excludeTeachers || []);

  const [editingSlot, setEditingSlot] = useState<{ miejsceId: string; przerwa: number } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [dutyNote, setDutyNote] = useState('');
  const [dutyLocked, setDutyLocked] = useState(true);

  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editingBreakNum, setEditingBreakNum] = useState<number | null>(null);

  const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
  const DAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];

  // ── LOOKUPS & CALCULATIONS ──

  // Excluded teachers set
  const excludedSet = useMemo(() => new Set(excludeTeachers), [excludeTeachers]);

  // Active / Eligible teachers
  const eligibleTeachers = useMemo(() => {
    return appState.teachers.filter(t => !excludedSet.has(t.abbr));
  }, [appState.teachers, excludedSet]);

  // Teacher hours in Plan Sal weekly
  const teacherHours = useMemo(() => {
    const hours: { [abbr: string]: number } = {};
    const yk = appState.yearKey;
    const yearData = schedData[yk] || {};

    Object.values(yearData).forEach((dayData: any) => {
      Object.values(dayData).forEach((hourData: any) => {
        Object.values(hourData).forEach((cell: any) => {
          const cells = Array.isArray(cell) ? cell : [cell];
          cells.forEach((c: any) => {
            if (c?.teacherAbbr) {
              hours[c.teacherAbbr] = (hours[c.teacherAbbr] || 0) + 1;
            }
          });
        });
      });
    });

    return hours;
  }, [schedData, appState.yearKey]);

  // Current duty allocation counts per teacher
  const teacherDutyCounts = useMemo(() => {
    const counts: { [abbr: string]: number } = {};
    Object.values(dyz.harmonogram).forEach((entry) => {
      if (entry.teacherAbbr) {
        counts[entry.teacherAbbr] = (counts[entry.teacherAbbr] || 0) + 1;
      }
    });
    return counts;
  }, [dyz.harmonogram]);

  // Current duty allocation minutes per teacher
  const teacherDutyMinutes = useMemo(() => {
    const mins: { [abbr: string]: number } = {};
    Object.entries(dyz.harmonogram).forEach(([key, entry]) => {
      if (entry.teacherAbbr) {
        const parts = key.split('|'); // [miejsceId, day, przerwaNum]
        const przerwaNum = parseInt(parts[2]);
        const przerwa = dyz.przerwy.find(p => p.num === przerwaNum);
        if (przerwa) {
          const d = getBreakDuration(przerwa);
          mins[entry.teacherAbbr] = (mins[entry.teacherAbbr] || 0) + d;
        }
      }
    });
    return mins;
  }, [dyz.harmonogram, dyz.przerwy]);

  // Target max minutes for each teacher based on FTE
  const teacherMaxMinutes = useMemo(() => {
    const maxMins: { [abbr: string]: number } = {};
    const fullTimeHours = 18;
    let sumProportions = 0;

    eligibleTeachers.forEach(t => {
      const hours = teacherHours[t.abbr] || 0;
      const prop = hours >= fullTimeHours ? 1.0 : hours / fullTimeHours;
      sumProportions += prop;
    });

    if (sumProportions === 0) sumProportions = 1;

    // Calculate total required minutes
    let totalRequiredDutyMinutes = 0;
    for (let day = 0; day < 5; day++) {
      for (const przerwa of dyz.przerwy) {
        const d = getBreakDuration(przerwa);
        for (const miejsce of dyz.miejsca) {
          totalRequiredDutyMinutes += d * (miejsce.teachersNeeded || 1);
        }
      }
    }

    const avgMinutesForFullTime = totalRequiredDutyMinutes / sumProportions;
    const maxMinsLimit = dyz.settings.maxMinutesPerTeacher || 60;
    eligibleTeachers.forEach(t => {
      const hours = teacherHours[t.abbr] || 0;
      const prop = hours >= fullTimeHours ? 1.0 : hours / fullTimeHours;
      if (dyz.settings.autoBalance !== false) {
        maxMins[t.abbr] = Math.min(maxMinsLimit, Math.max(15, Math.ceil(avgMinutesForFullTime * prop)));
      } else {
        maxMins[t.abbr] = maxMinsLimit;
      }
    });

    return maxMins;
  }, [eligibleTeachers, teacherHours, dyz.przerwy, dyz.miejsca, dyz.settings.maxMinutesPerTeacher, dyz.settings.autoBalance]);



  // ── HANDLERS ──

  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;

    if (editingPlaceId) {
      // Edit existing
      const updatedPlaces = dyz.miejsca.map(m => {
        if (m.id === editingPlaceId) {
          return {
            ...m,
            name: newPlaceName.trim(),
            desc: newPlaceDesc.trim() || undefined,
            floor: newPlaceFloor.trim() || undefined,
            teachersNeeded: newPlaceTeachersNeeded,
            connectedRooms: newPlaceConnectedRooms
          };
        }
        return m;
      });

      onChangeAppState({
        ...appState,
        dyzury: {
          ...dyz,
          miejsca: updatedPlaces
        }
      });

      setEditingPlaceId(null);
      setNewPlaceName('');
      setNewPlaceFloor('');
      setNewPlaceDesc('');
      setNewPlaceTeachersNeeded(1);
      setNewPlaceConnectedRooms([]);
      notify('Zaktualizowano miejsce dyżuru');
    } else {
      // Add new
      const newPlace: MiejsceDyzuru = {
        id: uid(),
        name: newPlaceName.trim(),
        desc: newPlaceDesc.trim() || undefined,
        floor: newPlaceFloor.trim() || undefined,
        teachersNeeded: newPlaceTeachersNeeded,
        connectedRooms: newPlaceConnectedRooms
      };

      onChangeAppState({
        ...appState,
        dyzury: {
          ...dyz,
          miejsca: [...dyz.miejsca, newPlace]
        }
      });

      setNewPlaceName('');
      setNewPlaceFloor('');
      setNewPlaceDesc('');
      setNewPlaceTeachersNeeded(1);
      setNewPlaceConnectedRooms([]);
      notify('Dodano miejsce dyżuru');
    }
  };

  const handleStartEditPlace = (place: MiejsceDyzuru) => {
    setEditingPlaceId(place.id);
    setNewPlaceName(place.name);
    setNewPlaceFloor(place.floor || '');
    setNewPlaceDesc(place.desc || '');
    setNewPlaceTeachersNeeded(place.teachersNeeded || 1);
    setNewPlaceConnectedRooms(place.connectedRooms || []);
    notify(`Edycja miejsca: ${place.name}`);
  };

  const handleCancelEditPlace = () => {
    setEditingPlaceId(null);
    setNewPlaceName('');
    setNewPlaceFloor('');
    setNewPlaceDesc('');
    setNewPlaceTeachersNeeded(1);
    setNewPlaceConnectedRooms([]);
  };

  const handleRemovePlace = (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to miejsce dyżuru? Skasuje to również zaplanowane w nim dyżury.')) return;

    if (editingPlaceId === id) {
      handleCancelEditPlace();
    }

    // Filter harmonogram
    const nextHarm = { ...dyz.harmonogram };
    Object.keys(nextHarm).forEach((key) => {
      if (key.startsWith(id + '|')) {
        delete nextHarm[key];
      }
    });

    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        miejsca: dyz.miejsca.filter(m => m.id !== id),
        harmonogram: nextHarm
      }
    });
    notify('Usunięto miejsce dyżuru');
  };

  const handleAddBreak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreakStart || !newBreakEnd) return;

    if (editingBreakNum !== null) {
      // Edit existing
      const updatedBreaks = dyz.przerwy.map(p => {
        if (p.num === editingBreakNum) {
          return {
            ...p,
            start: newBreakStart,
            end: newBreakEnd,
            name: newBreakName.trim() || `Przerwa ${p.num}`
          };
        }
        return p;
      });

      onChangeAppState({
        ...appState,
        dyzury: {
          ...dyz,
          przerwy: updatedBreaks
        }
      });

      setEditingBreakNum(null);
      setNewBreakStart('');
      setNewBreakEnd('');
      setNewBreakName('');
      notify('Zaktualizowano przerwę szkolną');
    } else {
      // Add new
      const newPrzerwa: Przerwa = {
        num: dyz.przerwy.length + 1,
        start: newBreakStart,
        end: newBreakEnd,
        name: newBreakName.trim() || `Przerwa ${dyz.przerwy.length + 1}`
      };

      onChangeAppState({
        ...appState,
        dyzury: {
          ...dyz,
          przerwy: [...dyz.przerwy, newPrzerwa]
        }
      });

      setNewBreakStart('');
      setNewBreakEnd('');
      setNewBreakName('');
      notify('Dodano przerwę szkolną');
    }
  };

  const handleStartEditBreak = (p: Przerwa) => {
    setEditingBreakNum(p.num);
    setNewBreakStart(p.start);
    setNewBreakEnd(p.end);
    setNewBreakName(p.name);
    notify(`Edycja przerwy: ${p.name || `nr ${p.num}`}`);
  };

  const handleCancelEditBreak = () => {
    setEditingBreakNum(null);
    setNewBreakStart('');
    setNewBreakEnd('');
    setNewBreakName('');
  };

  const handleAddPreDuty = () => {
    let lesson1Start = '08:00';
    if (appState.timeslots && appState.timeslots.length > 0) {
      const firstLes = appState.timeslots.find(t => t.num === 1) || appState.timeslots[0];
      if (firstLes) {
        lesson1Start = firstLes.start;
      }
    }
    
    let [h, m] = lesson1Start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      h = 8;
      m = 0;
    }
    
    let startTotalMins = h * 60 + m - 15;
    if (startTotalMins < 0) {
      startTotalMins += 24 * 60;
    }
    const sh = Math.floor(startTotalMins / 60) % 24;
    const sm = startTotalMins % 60;
    
    const startStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
    const endStr = lesson1Start;
    
    const nextNum = dyz.przerwy.length + 1;
    const newPrzerwa: Przerwa = {
      num: nextNum,
      start: startStr,
      end: endStr,
      name: 'Dyżur przed lekcjami'
    };
    
    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        przerwy: [...dyz.przerwy, newPrzerwa]
      }
    });
    
    notify('Dodano dyżur przed lekcjami skoordynowany z rozpoczęciem zajęć!');
  };

  const handleRemoveBreak = (num: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę przerwę?')) return;

    if (editingBreakNum === num) {
      handleCancelEditBreak();
    }

    const nextHarm = { ...dyz.harmonogram };
    Object.keys(nextHarm).forEach((key) => {
      if (key.endsWith(`|${num}`)) {
        delete nextHarm[key];
      }
    });

    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        przerwy: dyz.przerwy.filter(p => p.num !== num).map((p, idx) => ({ ...p, num: idx + 1 })),
        harmonogram: nextHarm
      }
    });
    notify('Usunięto przerwę');
  };

  const _getTeacherLesson = (abbr: string, dayIdx: number, hourKey: string) => {
    const yk = appState.yearKey;
    const hourData = schedData[yk]?.[dayIdx]?.[hourKey] || {};
    const cols = flattenColumns(appState.floors);

    for (const cKey of Object.keys(hourData)) {
      const cell = hourData[cKey];
      if (!cell) continue;
      const cells = Array.isArray(cell) ? cell : [cell];
      
      for (const c of cells) {
        if (c?.teacherAbbr === abbr) {
          const matchedCol = cols.find(col => colKey(col) === cKey);
          return {
            className: c.className || c.classes?.join(', ') || 'Klasa',
            subject: c.subject || 'Lekcja',
            roomName: matchedCol?.room.num || 'Inna'
          };
        }
      }
    }
    return null;
  };

  const _teacherHasClassInConnectedRooms = (
    abbr: string,
    dayIdx: number,
    hourKey: string,
    connectedRooms: string[]
  ): boolean => {
    if (!connectedRooms || connectedRooms.length === 0) return false;

    const yk = appState.yearKey;
    const hourData = schedData[yk]?.[dayIdx]?.[hourKey] || {};
    const cols = flattenColumns(appState.floors);

    const connectedKeys = cols
      .filter(col => connectedRooms.includes(col.room.num))
      .map(col => colKey(col));

    if (connectedKeys.length === 0) return false;

    return connectedKeys.some(cKey => {
      const cell = hourData[cKey];
      if (!cell) return false;
      const cells = Array.isArray(cell) ? cell : [cell];
      return cells.some((c: any) => c?.teacherAbbr === abbr);
    });
  };

  const wouldViolateConsecutiveDutiesRule = (
    teacherAbbr: string,
    day: number,
    candidateBreakNum: number,
    currentHarm: any,
    miejsca: MiejsceDyzuru[],
    przerwy: Przerwa[]
  ): boolean => {
    const maxConsecutive = dyz.settings.maxConsecutiveDuties !== undefined ? dyz.settings.maxConsecutiveDuties : 2;

    const sortedBreaks = [...przerwy].sort((a, b) => {
      const [ah, am] = a.start.split(':').map(Number);
      const [bh, bm] = b.start.split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    const dutyInSortedIndices = sortedBreaks.map((p) => {
      if (p.num === candidateBreakNum) return true;
      const hasDuty = miejsca.some(m => 
        currentHarm[`${m.id}|${day}|${p.num}`]?.teacherAbbr === teacherAbbr
      );
      return hasDuty;
    });

    let consecutiveCount = 0;
    for (let i = 0; i < dutyInSortedIndices.length; i++) {
      if (dutyInSortedIndices[i]) {
        consecutiveCount++;
        if (consecutiveCount > maxConsecutive) {
          return true; // Violation
        }
      } else {
        consecutiveCount = 0;
      }
    }
    return false;
  };

  const isTeacherAvailableForBreak = (abbr: string, dayIdx: number, przerwa: Przerwa): boolean => {
    const yk = appState.yearKey;
    const dayData = schedData[yk]?.[dayIdx] || {};
    const activeHours: number[] = [];

    Object.keys(dayData).forEach(hourKey => {
      const hNum = parseInt(hourKey);
      if (!isNaN(hNum)) {
        const hourData = dayData[hourKey] || {};
        const hasClass = Object.values(hourData).some((cell: any) => {
          const cells = Array.isArray(cell) ? cell : [cell];
          return cells.some((c: any) => c?.teacherAbbr === abbr);
        });
        if (hasClass) {
          activeHours.push(hNum);
        }
      }
    });

    if (activeHours.length === 0) return false;

    const minHour = Math.min(...activeHours);
    const maxHour = Math.max(...activeHours);

    const firstTimeslot = appState.timeslots?.find(t => t.num === minHour);
    const lastTimeslot = appState.timeslots?.find(t => t.num === maxHour);

    if (!firstTimeslot || !lastTimeslot) {
      return przerwa.num >= minHour - 1 && przerwa.num <= maxHour;
    }

    const toMins = (tStr: string) => {
      const [h, m] = tStr.split(':').map(Number);
      return (isNaN(h) || isNaN(m)) ? 0 : h * 60 + m;
    };

    const dayStartMins = toMins(firstTimeslot.start);
    const dayEndMins = toMins(lastTimeslot.end);

    const breakStartMins = toMins(przerwa.start);
    const breakEndMins = toMins(przerwa.end);

    const isBetween = breakStartMins >= dayStartMins && breakEndMins <= dayEndMins;
    const isDirectlyBefore = breakEndMins === dayStartMins || (breakEndMins > dayStartMins - 30 && breakEndMins <= dayStartMins);
    const isDirectlyAfter = breakStartMins === dayEndMins || (breakStartMins >= dayEndMins && breakStartMins < dayEndMins + 30);

    return isBetween || isDirectlyBefore || isDirectlyAfter || (przerwa.num >= minHour - 1 && przerwa.num <= maxHour);
  };

  // ── AUTO-SUGESTIA DYŻURÓW (Smart duty optimizer with connected rooms preference) ──
  const handleAutoSuggest = () => {
    if (dyz.miejsca.length === 0) {
      notify('Dodaj przynajmniej jedno miejsce dyżuru!', 'err');
      return;
    }
    if (eligibleTeachers.length === 0) {
      notify('Brak aktywnych nauczycieli do przypisania!', 'err');
      return;
    }

    const nextHarm = { ...dyz.harmonogram };

    const fullTimeHours = 18;
    const teacherProportions: { [abbr: string]: number } = {};
    let sumProportions = 0;

    eligibleTeachers.forEach(t => {
      const hours = teacherHours[t.abbr] || 0;
      const prop = hours >= fullTimeHours ? 1.0 : hours / fullTimeHours;
      teacherProportions[t.abbr] = prop;
      sumProportions += prop;
    });

    if (sumProportions === 0) sumProportions = 1;

    // Calculate total duty slots needed for the week and their duration
    let totalRequiredDutyMinutes = 0;
    for (let day = 0; day < 5; day++) {
      for (const przerwa of dyz.przerwy) {
        const breakDur = getBreakDuration(przerwa);
        for (const miejsce of dyz.miejsca) {
          totalRequiredDutyMinutes += breakDur * (miejsce.teachersNeeded || 1);
        }
      }
    }

    // Target/Max minutes for each teacher
    const avgMinutesForFullTime = totalRequiredDutyMinutes / sumProportions;
    const teacherMaxMinutes: { [abbr: string]: number } = {};
    const maxMinsLimit = dyz.settings.maxMinutesPerTeacher || 60;
    eligibleTeachers.forEach(t => {
      // Set a baseline minimum of at least 15 mins so they can be assigned at least once if needed
      if (dyz.settings.autoBalance !== false) {
        teacherMaxMinutes[t.abbr] = Math.min(maxMinsLimit, Math.max(15, Math.ceil(avgMinutesForFullTime * teacherProportions[t.abbr])));
      } else {
        teacherMaxMinutes[t.abbr] = maxMinsLimit;
      }
    });

    // Track assigned minutes for each teacher
    const assignedMinutes: { [abbr: string]: number } = {};
    eligibleTeachers.forEach(t => {
      assignedMinutes[t.abbr] = 0;
    });

    // Populate assignedMinutes with currently locked duties
    Object.entries(nextHarm).forEach(([key, entry]) => {
      if (entry.locked && entry.teacherAbbr && assignedMinutes[entry.teacherAbbr] !== undefined) {
        const parts = key.split('|'); // [miejsceId, day, przerwaNum]
        const przerwaNum = parseInt(parts[2]);
        const przerwa = dyz.przerwy.find(p => p.num === przerwaNum);
        if (przerwa) {
          assignedMinutes[entry.teacherAbbr] += getBreakDuration(przerwa);
        }
      }
    });

    // Clear unlocked duties first so we can regenerate them
    Object.keys(nextHarm).forEach(key => {
      if (!nextHarm[key]?.locked) {
        delete nextHarm[key];
      }
    });

    // Helper to check if teacher can be assigned to a break
    const canAssignTeacher = (
      t: any,
      day: number,
      przerwa: Przerwa,
      allowedMinutesBuffer: number
    ): boolean => {
      // Check if they are active on this day and during this break
      if (!isTeacherAvailableForBreak(t.abbr, day, przerwa)) return false;

      // Check if they have already hit their limit (with buffer)
      const dur = getBreakDuration(przerwa);
      if (assignedMinutes[t.abbr] + dur > teacherMaxMinutes[t.abbr] + allowedMinutesBuffer) return false;

      // Check if already assigned in this identical break (to another place)
      const alreadyAssignedInBreak = dyz.miejsca.some(m => 
        nextHarm[`${m.id}|${day}|${przerwa.num}`]?.teacherAbbr === t.abbr
      );
      if (alreadyAssignedInBreak) return false;

      // Check consecutive duties rule
      if (wouldViolateConsecutiveDutiesRule(t.abbr, day, przerwa.num, nextHarm, dyz.miejsca, dyz.przerwy)) {
        return false;
      }

      return true;
    };

    let assignedCount = 0;

    // We do multi-pass scheduling to ensure perfect balance:
    // We try to fill slots with 0 buffer first. If some slots remain, we try with +15 min buffer, then +30 min, up to +60 min.
    const buffers = [0, 15, 30, 45, 60, 120];

    for (const buffer of buffers) {
      // Loop through days, breaks, places
      for (let day = 0; day < 5; day++) {
        for (const przerwa of dyz.przerwy) {
          const breakDur = getBreakDuration(przerwa);

          for (const miejsce of dyz.miejsca) {
            const key = `${miejsce.id}|${day}|${przerwa.num}`;

            // Skip if already filled
            if (nextHarm[key]) continue;

            let selected: string | null = null;
            const connected = miejsce.connectedRooms || [];

            // Sort teachers who can be assigned, preferring the ones who are furthest from their maximum limit
            const getDeficit = (abbr: string) => {
              return teacherMaxMinutes[abbr] - assignedMinutes[abbr];
            };

            const candidates = [...eligibleTeachers]
              .filter(t => canAssignTeacher(t, day, przerwa, buffer))
              .sort((a, b) => getDeficit(b.abbr) - getDeficit(a.abbr)); // larger deficit first

            if (candidates.length === 0) continue;

            // TIER 1: Connected rooms preference
            if (connected.length > 0) {
              const connectedCandidate = candidates.find(t => {
                const hourBefore = String(przerwa.num);
                const hourAfter = String(przerwa.num + 1);
                return _teacherHasClassInConnectedRooms(t.abbr, day, hourBefore, connected) ||
                       _teacherHasClassInConnectedRooms(t.abbr, day, hourAfter, connected);
              });
              if (connectedCandidate) {
                selected = connectedCandidate.abbr;
              }
            }

            // TIER 2: Nearby classrooms preference (directly before or after the break)
            if (!selected) {
              const nearbyCandidate = candidates.find(t => {
                const hourBefore = String(przerwa.num);
                const hourAfter = String(przerwa.num + 1);
                return _teacherHasClass(t.abbr, day, hourBefore) || _teacherHasClass(t.abbr, day, hourAfter);
              });
              if (nearbyCandidate) {
                selected = nearbyCandidate.abbr;
              }
            }

            // TIER 3: Fallback - most free candidate in pool
            if (!selected && candidates.length > 0) {
              selected = candidates[0].abbr;
            }

            if (selected) {
              nextHarm[key] = {
                teacherAbbr: selected,
                locked: false
              };
              assignedMinutes[selected] += breakDur;
              assignedCount++;
            }
          }
        }
      }
    }

    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        harmonogram: nextHarm
      }
    });

    notify(`✓ Automatycznie zaplanowano ${assignedCount} dyżurów!`);
  };

  const _teacherHasClass = (abbr: string, dayIdx: number, hourKey: string): boolean => {
    const yk = appState.yearKey;
    const hourData = schedData[yk]?.[dayIdx]?.[hourKey] || {};
    return Object.values(hourData).some((cell: any) => {
      const cells = Array.isArray(cell) ? cell : [cell];
      return cells.some((c: any) => c?.teacherAbbr === abbr);
    });
  };

  // Drag & drop swapping
  const handleDragStart = (mId: string, prw: number) => {
    setDraggedTeacher({ miejsceId: mId, przerwa: prw });
  };

  const handleDropOnSlot = (dstMId: string, dstPrw: number) => {
    if (!draggedTeacher) return;
    const { miejsceId: srcMId, przerwa: srcPrw } = draggedTeacher;

    const srcKey = `${srcMId}|${activeDay}|${srcPrw}`;
    const dstKey = `${dstMId}|${activeDay}|${dstPrw}`;

    const nextHarm = { ...dyz.harmonogram };
    const tempSrc = nextHarm[srcKey];
    const tempDst = nextHarm[dstKey];

    if (tempDst) nextHarm[srcKey] = tempDst;
    else delete nextHarm[srcKey];

    if (tempSrc) nextHarm[dstKey] = tempSrc;
    else delete nextHarm[dstKey];

    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        harmonogram: nextHarm
      }
    });

    setDraggedTeacher(null);
    notify('Zamieniono dyżury');
  };

  // Direct Assign Modal
  const openDirectAssign = (miejsceId: string, przerwa: number) => {
    setEditingSlot({ miejsceId, przerwa });
    const key = `${miejsceId}|${activeDay}|${przerwa}`;
    const entry = dyz.harmonogram[key];
    setSelectedTeacher(entry?.teacherAbbr || '');
    setDutyNote(entry?.note || '');
    setDutyLocked(entry ? entry.locked : true);
  };

  const saveDirectAssign = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSlot) return;

    const { miejsceId, przerwa } = editingSlot;
    const key = `${miejsceId}|${activeDay}|${przerwa}`;
    const nextHarm = { ...dyz.harmonogram };

    if (selectedTeacher) {
      nextHarm[key] = {
        teacherAbbr: selectedTeacher,
        locked: dutyLocked,
        note: dutyNote.trim() || undefined
      };
    } else {
      delete nextHarm[key];
    }

    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        harmonogram: nextHarm
      }
    });

    setEditingSlot(null);
    notify('Zapisano dyżur');
  };

  const handleClearDuties = () => {
    if (!confirm('Czy na pewno chcesz usunąć wszystkie dyżury z całego tygodnia? (Zablokowane również)')) return;

    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        harmonogram: {}
      }
    });
    notify('Wyczyszczono wszystkie dyżury');
  };

  const handleToggleExcludeTeacher = (abbr: string) => {
    let nextExclude = [...excludeTeachers];
    if (nextExclude.includes(abbr)) {
      nextExclude = nextExclude.filter(a => a !== abbr);
    } else {
      nextExclude.push(abbr);
    }
    setExcludeTeachers(nextExclude);
    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        settings: {
          ...dyz.settings,
          excludeTeachers: nextExclude
        }
      }
    });
  };

  const handleSaveSettings = () => {
    onChangeAppState({
      ...appState,
      dyzury: {
        ...dyz,
        settings: {
          autoBalance: true,
          maxPerTeacher: maxDuties,
          excludeTeachers
        }
      }
    });
    notify('Zapisano ustawienia dyżurów');
  };

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg z-[9999] ${
      type === 'ok' ? 'border-emerald-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden px-0 mx-0" id="page-dyzury">
      {/* ── PASEK KONTROLI / ZAKŁADKI KRAJOWE ── */}
      <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'roster' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            📋 Harmonogram Dzienny
          </button>
          <button 
            onClick={() => setActiveTab('places')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'places' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            🚪 Miejsca Dyżurowania
          </button>
          <button 
            onClick={() => setActiveTab('breaks')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'breaks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            ⏱ Przerwy i Limity
          </button>
        </div>

        {activeTab === 'roster' && (
          <div className="flex items-center gap-1 shrink-0">
            {DAYS.map((day, dIdx) => (
              <button
                key={dIdx}
                onClick={() => setActiveDay(dIdx)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                  activeDay === dIdx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {DAYS_SHORT[dIdx]}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={handleAutoSuggest}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition flex items-center gap-1"
          >
            <RefreshCcw size={14} /> Auto-sugestia dyżurów
          </button>
          <button 
            onClick={handleClearDuties}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
          >
            Wyczyść Wszystko
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-5">
        {/* ── INTERAKTYWNY HARMONOGRAM ── */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-4 lg:col-span-3 min-w-[500px]">
              {dyz.miejsca.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left text-xs font-bold text-slate-500 w-48">Godzina / Przerwa</th>
                      {dyz.miejsca.map(place => (
                        <th key={place.id} className="p-3 text-center text-xs font-bold text-slate-600">
                          <span className="block text-slate-700 font-bold">{place.name}</span>
                          {place.floor && <span className="block text-[9px] text-slate-400 font-medium mt-0.5">{place.floor}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dyz.przerwy.map(p => (
                      <tr key={p.num} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-b-0">
                        <td className="p-3 select-none">
                          <div className="font-bold text-xs text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.start}–{p.end}</div>
                        </td>
                        {dyz.miejsca.map(place => {
                          const key = `${place.id}|${activeDay}|${p.num}`;
                          const duty = dyz.harmonogram[key];
                          const t = duty?.teacherAbbr ? appState.teachers.find(tch => tch.abbr === duty.teacherAbbr) : null;

                          return (
                            <td 
                              key={place.id} 
                              className="p-1.5 text-center align-middle"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropOnSlot(place.id, p.num)}
                            >
                              {duty?.teacherAbbr ? (
                                <div 
                                  draggable
                                  onDragStart={() => handleDragStart(place.id, p.num)}
                                  onClick={() => openDirectAssign(place.id, p.num)}
                                  className={`p-2.5 rounded-lg border-l-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow transition relative flex flex-col justify-center items-center ${
                                    duty.locked 
                                      ? 'bg-slate-50 border-slate-600 text-slate-900 font-bold'
                                      : 'bg-emerald-50/50 border-emerald-500 text-emerald-950 font-semibold'
                                  }`}
                                >
                                  <span className="text-xs tracking-wider font-mono">{duty.teacherAbbr}</span>
                                  <span className="text-[9px] text-slate-400 truncate max-w-[80px] font-medium mt-0.5">
                                    {t ? `${t.first.slice(0, 1)}. ${t.last}` : 'Dyżur'}
                                  </span>
                                  {duty.locked && <span className="absolute top-1 right-1 text-[8px]" title="Zablokowany">🔒</span>}
                                  {duty.note && <span className="absolute top-1 left-1 text-[8px]" title={duty.note}>📝</span>}
                                </div>
                              ) : (
                                <button 
                                  onClick={() => openDirectAssign(place.id, p.num)}
                                  className="w-full py-2.5 border border-dashed border-slate-200 hover:border-blue-300 hover:text-blue-500 rounded-lg text-slate-300 text-sm font-light transition"
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">Brak zdefiniowanych miejsc dyżurowania. Przejdź do zakładki „Miejsca Dyżurowania”, aby dodać pierwsze punkty.</div>
              )}
            </div>

            {/* Panel statystyk dyżurów */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 select-none">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">📊 Bilans dyżurów nauczycielskich</h3>
              <p className="text-[11px] text-slate-400 leading-normal">Poniższa lista prezentuje sumaryczną liczbę i czas dyżurów w bieżącym tygodniu zbalansowaną proporcjonalnie do wymiaru godzin lekcyjnych nauczyciela.</p>
              
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {appState.teachers.map(t => {
                  const dc = teacherDutyCounts[t.abbr] || 0;
                  const dm = teacherDutyMinutes[t.abbr] || 0;
                  const maxMins = teacherMaxMinutes[t.abbr] || 0;
                  const hours = teacherHours[t.abbr] || 0;
                  const isOver = dm > maxMins;
                  const isExcluded = excludedSet.has(t.abbr);

                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-4 text-xs font-semibold">
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate ${isExcluded ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                          {t.first} {t.last}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Siatka: {hours}h lekcyjnych (etat: {hours >= 18 ? '1.00' : (hours / 18).toFixed(2)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExcluded ? (
                          <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Zwolniony</span>
                        ) : (
                          <span className={`px-2 py-1 rounded font-mono font-bold text-[10px] flex flex-col items-end border ${
                            isOver 
                              ? 'bg-red-50 text-red-700 border-red-200 font-extrabold'
                              : dm >= maxMins
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            <span className="font-bold">{dc} dyżurów</span>
                            <span className="text-[9px] text-slate-400 font-normal mt-0.5">{dm} / {maxMins} min</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MIEJSCA DYŻUROWANIA ── */}
        {activeTab === 'places' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 select-none">
                {editingPlaceId ? <Edit3 size={14} className="text-amber-500" /> : <Plus size={14} />} 
                {editingPlaceId ? 'Edytuj punkt dyżurów' : 'Dodaj punkt dyżurów'}
              </h3>
              <form onSubmit={handleAddPlace} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Nazwa miejsca (np. Korytarz Parter) *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-bold"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Piętro (np. I Piętro)" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-medium text-slate-700"
                  value={newPlaceFloor}
                  onChange={(e) => setNewPlaceFloor(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Krótki opis" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newPlaceDesc}
                  onChange={(e) => setNewPlaceDesc(e.target.value)}
                />
                <div className="flex flex-col gap-1 text-left px-1">
                  <span className="text-[10px] text-slate-500 font-bold">Liczba nauczycieli na dyżurze:</span>
                  <input 
                     type="number" 
                    min={1} 
                    max={5}
                    className="w-full px-3 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold"
                    value={newPlaceTeachersNeeded}
                    onChange={(e) => setNewPlaceTeachersNeeded(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                {/* Tag rooms list picker */}
                <div className="flex flex-col gap-1 text-left px-1 border-t border-slate-100 pt-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">🚪 Sale z wejściem na ten korytarz:</span>
                  {appState.planLekcji.rooms.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto p-1.5 bg-slate-50 border border-slate-200/50 rounded-lg">
                      {appState.planLekcji.rooms.map(rm => {
                        const isSel = newPlaceConnectedRooms.includes(rm.name);
                        return (
                          <button
                            key={rm.id}
                            type="button"
                            onClick={() => {
                              if (isSel) {
                                setNewPlaceConnectedRooms(newPlaceConnectedRooms.filter(x => x !== rm.name));
                              } else {
                                setNewPlaceConnectedRooms([...newPlaceConnectedRooms, rm.name]);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition duration-150 shrink-0 ${
                              isSel
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {rm.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400 italic">Brak zdefiniowanych sal lekcyjnych.</p>
                  )}
                </div>

                {editingPlaceId ? (
                  <div className="flex gap-2 mt-2">
                    <button 
                      type="submit" 
                      className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
                    >
                      Zapisz zmiany
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCancelEditPlace}
                      className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-250 text-slate-600 border border-slate-200 font-bold text-xs shadow-sm transition"
                    >
                      Anuluj
                    </button>
                  </div>
                ) : (
                  <button 
                    type="submit" 
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm mt-2 transition"
                  >
                    Dodaj Miejsce
                  </button>
                )}
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm md:col-span-2 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 select-none">🚪 Skonfigurowane punkty dyżurów</h3>
              </div>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400">
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider">Lokalizacja</th>
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider">Piętro / Strefa</th>
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider">Liczba naucz.</th>
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider">Opis</th>
                    <th className="p-3 text-center text-xs font-bold uppercase tracking-wider w-24">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {dyz.miejsca.map(place => (
                    <tr key={place.id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-b-0">
                      <td className="p-3 text-xs text-slate-800">
                        <div className="font-bold">{place.name}</div>
                        {place.connectedRooms && place.connectedRooms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {place.connectedRooms.map(rm => (
                              <span key={rm} className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-mono font-bold">
                                🚪 {rm}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-500 font-semibold">{place.floor || '—'}</td>
                      <td className="p-3 text-xs text-slate-500 font-semibold">{place.teachersNeeded || 1}</td>
                      <td className="p-3 text-xs text-slate-400">{place.desc || '—'}</td>
                      <td className="p-3 text-xs text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleStartEditPlace(place)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                            title="Edytuj miejsce"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => handleRemovePlace(place.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Usuń miejsce"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {dyz.miejsca.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">Brak skonfigurowanych punktów korytarzowych.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── HARMONOGRAM PRZERW I USTAWIENIA GENERATORA ── */}
        {activeTab === 'breaks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Lista Przerw */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">⏱ Przerwy i dzwonki</h3>
              </div>
              <div className="p-5 space-y-4">
                <form onSubmit={handleAddBreak} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nazwa</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                      placeholder="np. Długa przerwa"
                      value={newBreakName}
                      onChange={(e) => setNewBreakName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Start</label>
                    <input 
                      type="time"
                      required
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                      value={newBreakStart}
                      onChange={(e) => setNewBreakStart(e.target.value)}
                    />
                  </div>
                  <div className="text-slate-400 pb-2.5">—</div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Koniec</label>
                    <input 
                      type="time"
                      required
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                      value={newBreakEnd}
                      onChange={(e) => setNewBreakEnd(e.target.value)}
                    />
                  </div>
                  {editingBreakNum !== null ? (
                    <div className="flex gap-1 shrink-0 h-[32px]">
                      <button 
                        type="submit" 
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Zapisz
                      </button>
                      <button 
                        type="button" 
                        onClick={handleCancelEditBreak}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm h-[32px]">
                      Dodaj
                    </button>
                  )}
                </form>

                <button
                  type="button"
                  onClick={handleAddPreDuty}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200/60 flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Plus size={14} className="text-amber-600 font-bold" /> Szybka akcja: Dodaj Dyżur przed lekcjami (15 min przed startem)
                </button>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {dyz.przerwy.map(p => (
                    <div key={p.num} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-700">{p.name || `Przerwa nr ${p.num}`}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold ml-2">({p.start}–{p.end})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleStartEditBreak(p)}
                          className="text-slate-400 hover:text-amber-600 transition"
                          title="Edytuj przerwę"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          onClick={() => handleRemoveBreak(p.num)}
                          className="text-slate-400 hover:text-red-500 font-bold transition text-sm"
                          title="Usuń przerwę"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Limity i Wyłączenia nauczycieli */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 select-none">
                <Settings size={14} /> Parametry automatycznego planowania
              </h3>

              <div className="space-y-4">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">⏱️ Maksymalny czas dyżurów w tygodniu</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number"
                        min="10"
                        max="300"
                        step="5"
                        value={maxMinutesPerTeacher}
                        onChange={(e) => setMaxMinutesPerTeacher(Number(e.target.value))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none w-24 font-bold text-slate-800 font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">minut</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Łączny limit czasu dyżurów przydzielany nauczycielowi w skali tygodnia.</span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">🔄 Maksymalna liczba dyżurów pod rząd</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number"
                        min="1"
                        max="5"
                        value={maxConsecutiveDuties}
                        onChange={(e) => setMaxConsecutiveDuties(Number(e.target.value))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none w-24 font-bold text-slate-800 font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">przerw(y) pod rząd</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Maksymalny limit przerw pod rząd, na których nauczyciel może pełnić dyżur.</span>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleSaveSettings}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                    >
                      Zapisz Parametry
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 select-none">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Wyłączeni z dyżurów szkolnych (np. Dyrekcja)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-100 p-2.5 rounded-lg bg-slate-50/50">
                    {appState.teachers.map(t => {
                      const isExcluded = excludedSet.has(t.abbr);
                      return (
                        <label 
                          key={t.id} 
                          className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-white text-xs ${
                            isExcluded ? 'text-slate-400 font-medium' : 'text-slate-700 font-semibold'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isExcluded}
                            onChange={() => handleToggleExcludeTeacher(t.abbr)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="truncate">{t.first} {t.last}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL RĘCZNEGO PRZYDZIELANIA DYŻURU ── */}
      {editingSlot && (() => {
        const { miejsceId, przerwa } = editingSlot;
        const miejsce = dyz.miejsca.find(m => m.id === miejsceId);
        if (!miejsce) return null;

        const getCandidateList = (pl: MiejsceDyzuru, prw: number) => {
          const connected = pl.connectedRooms || [];
          const candidates = eligibleTeachers.map(t => {
            const lessonBefore = _getTeacherLesson(t.abbr, activeDay, String(prw));
            const lessonAfter = _getTeacherLesson(t.abbr, activeDay, String(prw + 1));
            
            const isAlreadyOnBreak = dyz.miejsca.some(m => 
              m.id !== pl.id && 
              dyz.harmonogram[`${m.id}|${activeDay}|${prw}`]?.teacherAbbr === t.abbr
            );
            
            const currentMins = teacherDutyMinutes[t.abbr] || 0;
            const maxMins = teacherMaxMinutes[t.abbr] || 0;
            const isCurrentlyAssignedHere = dyz.harmonogram[`${pl.id}|${activeDay}|${prw}`]?.teacherAbbr === t.abbr;
            const isOverLimit = currentMins >= maxMins && !isCurrentlyAssignedHere;

            let score = 1; // standard neutral
            let reason = 'Wolny (brak przyległych lekcji)';

            if (isAlreadyOnBreak) {
              score = -1;
              reason = 'Zajęty - pełni inny dyżur na tej przerwie';
            } else if (isOverLimit) {
              score = 0;
              reason = `Przekroczony limit minutowy (${currentMins}/${maxMins} min)`;
            } else {
              const roomBeforeConnected = lessonBefore?.roomName && connected.includes(lessonBefore.roomName);
              const roomAfterConnected = lessonAfter?.roomName && connected.includes(lessonAfter.roomName);
              
              if (roomBeforeConnected || roomAfterConnected) {
                score = 3;
                const matchingRoom = roomBeforeConnected ? lessonBefore.roomName : lessonAfter.roomName;
                reason = `⭐⭐⭐ Polecany obok: Lekcja w sali ${matchingRoom}`;
              } else if (lessonBefore || lessonAfter) {
                score = 2;
                const preInfo = lessonBefore ? `sala ${lessonBefore.roomName}` : '';
                const postInfo = lessonAfter ? `sala ${lessonAfter.roomName}` : '';
                reason = `👍 Dobra: Lekcja blisko (${[preInfo, postInfo].filter(Boolean).join(' / ')})`;
              }
            }

            return {
              teacher: t,
              score,
              reason,
              lessonBefore,
              lessonAfter,
              currentMins,
              maxMins,
              isCurrentlyAssignedHere
            };
          });

          return candidates.sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            const deficitA = a.maxMins - a.currentMins;
            const deficitB = b.maxMins - b.currentMins;
            return deficitB - deficitA; // prefer those with larger deficit
          });
        };

        const candidates = getCandidateList(miejsce, przerwa);

        return (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">🚪 Przypisz nauczyciela na dyżur</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    Stanowisko: <span className="text-slate-700">{miejsce.name}</span> | Przerwa nr {przerwa} ({DAYS[activeDay]})
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setEditingSlot(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 animate-hover"
                >
                  ✕
                </button>
              </div>

              {/* Informacja o przyległach salach */}
              {miejsce.connectedRooms && miejsce.connectedRooms.length > 0 && (
                <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-100/40 text-[11px] flex flex-wrap items-center gap-1.5 font-semibold text-slate-600">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Przyległe sale:</span>
                  {miejsce.connectedRooms.map(rm => (
                    <span key={rm} className="px-1.5 py-0.5 bg-white text-blue-700 border border-blue-100 rounded text-[9px] font-mono font-bold">
                      🚪 {rm}
                    </span>
                  ))}
                </div>
              )}

              <div className="p-4 overflow-y-auto space-y-2 flex-1 scrollbar-thin">
                {/* Opcje edycji dyżuru */}
                {selectedTeacher && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3 mb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Ustawienia dyżuru dla: <span className="font-mono bg-white px-1.5 py-0.5 border rounded text-blue-700">{selectedTeacher}</span></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notatka / Uwagi:</label>
                      <input 
                        type="text"
                        placeholder="np. Zastępstwo za Kowalskiego"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-blue-500 font-medium"
                        value={dutyNote}
                        onChange={(e) => setDutyNote(e.target.value)}
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={dutyLocked}
                        onChange={(e) => setDutyLocked(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Zablokuj dyżur (zapobiega nadpisaniu przez generator)</span>
                    </label>
                  </div>
                )}

                {/* Opcja: Brak dyżuru */}
                <button
                  type="button"
                  onClick={() => setSelectedTeacher('')}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs font-bold transition flex justify-between items-center ${
                    selectedTeacher === '' 
                      ? 'border-red-500 bg-red-50 text-red-900' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>— Brak Dyżuru / Usuń przypisanie —</span>
                  {selectedTeacher === '' && <span className="text-red-500">✓</span>}
                </button>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100">
                  Rekomendowani nauczyciele (inteligentne dopasowanie):
                </div>

                <div className="space-y-1.5">
                  {candidates.map(({ teacher, score, reason, lessonBefore, lessonAfter, currentMins, maxMins }) => {
                    const isSelected = selectedTeacher === teacher.abbr;
                    const isBusy = score === -1;
                    
                    let bgClass = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
                    let borderClass = 'border-slate-200';
                    if (isSelected) {
                      bgClass = 'bg-blue-50/65 text-blue-950';
                      borderClass = 'border-blue-500 ring-2 ring-blue-100';
                    } else if (isBusy) {
                      bgClass = 'bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-60';
                      borderClass = 'border-slate-100';
                    } else if (score === 3) {
                      bgClass = 'bg-emerald-50/25 text-slate-800 hover:bg-emerald-50/50';
                      borderClass = 'border-emerald-300';
                    }

                    return (
                      <button
                        key={teacher.id}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setSelectedTeacher(teacher.abbr)}
                        className={`w-full p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${bgClass} ${borderClass}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-bold font-mono text-slate-900 flex items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-200">
                              {teacher.abbr}
                            </span>
                            {teacher.first} {teacher.last}
                          </span>
                          <span className={`text-[10px] font-bold ${currentMins >= maxMins ? 'text-red-600' : 'text-slate-400'}`}>
                            {currentMins} / {maxMins} min
                          </span>
                        </div>

                        {/* Recommendation label / Helper description */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            score === 3 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : score === 2 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : score === 0 
                                  ? 'bg-amber-100 text-amber-800'
                                  : isBusy 
                                    ? 'bg-slate-200/80 text-slate-500' 
                                    : 'bg-slate-100 text-slate-500'
                          }`}>
                            {reason}
                          </span>
                        </div>

                        {/* Show school lessons context */}
                        {(lessonBefore || lessonAfter) && (
                          <div className="mt-1 text-[9px] font-semibold text-slate-400 bg-slate-50/50 rounded p-1.5 space-y-0.5 border border-slate-100">
                            {lessonBefore && (
                              <div>
                                🕧 lekcja przed przerwą: <span className="font-bold text-slate-600">{lessonBefore.className} - {lessonBefore.subject}</span> w sali <span className="font-bold text-slate-700">{lessonBefore.roomName}</span>
                              </div>
                            )}
                            {lessonAfter && (
                              <div>
                                🕐 lekcja po przerwie: <span className="font-bold text-slate-600">{lessonAfter.className} - {lessonAfter.subject}</span> w sali <span className="font-bold text-slate-700">{lessonAfter.roomName}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
                >
                  Anuluj
                </button>
                <button 
                  type="button" 
                  onClick={() => saveDirectAssign()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  ✓ Zapisz Dyżur
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

