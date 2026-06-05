import React, { useState, useMemo } from 'react';
import { AppState, SchedData, SchedCell, Floor, Room, Building, Assignment, Teacher, Subject, ClassRoom } from '../types';
import { colKey, flattenColumns, esc, hexRgba } from '../utils';
import { 
  Building2, MapPin, Grid, AlertTriangle, UserCheck, RefreshCw, Trash2, Edit, Grab, Sparkles, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { DraggableItem, DroppableCell } from './DndWrapper';

interface PlanSalProps {
  appState: AppState;
  schedData: SchedData;
  onChangeAppState: (newState: AppState) => void;
  onChangeSchedData: (newData: SchedData) => void;
  onImportFromPlanKlas: () => void;
}

function cleanFloorName(floorName: string, buildingName?: string): string {
  if (!buildingName) return floorName;
  const bNameLower = buildingName.toLowerCase().trim();
  const fNameLower = floorName.toLowerCase().trim();
  
  if (fNameLower.startsWith(bNameLower)) {
    let remaining = floorName.substring(buildingName.length).trim();
    if (remaining.startsWith('–') || remaining.startsWith('-')) {
      remaining = remaining.substring(1).trim();
    }
    if (remaining) {
      return remaining.charAt(0).toUpperCase() + remaining.slice(1);
    }
  }
  return floorName;
}

export default function PlanSal({ 
  appState, 
  schedData, 
  onChangeAppState, 
  onChangeSchedData,
  onImportFromPlanKlas
}: PlanSalProps) {
  const [activeDay, setActiveDay] = useState<number>(0);
  const [activeRoomCategory, setActiveRoomCategory] = useState<'main' | 'individual' | 'sport'>('main');
  const [editingCell, setEditingCell] = useState<{ hour: string; colKey: string; slotIdx?: number } | null>(null);

  // States for the D&D Pool sidebar
  const [showPoolSidebar, setShowPoolSidebar] = useState<boolean>(true);
  const [poolFilter, setPoolFilter] = useState<'all' | 'unassigned'>('unassigned');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form edit states
  const [cellClass, setCellClass] = useState<string>('');
  const [cellTeacher, setCellTeacher] = useState<string>('');
  const [cellSupportTeacher, setCellSupportTeacher] = useState<string>('');
  const [cellSubject, setCellSubject] = useState<string>('');
  const [cellNote, setCellNote] = useState<string>('');

  const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

  // Map room name to metadata classroom object
  const roomsMap = useMemo(() => {
    return new Map(appState.planLekcji.rooms.map(r => [r.name.toLowerCase().trim(), r]));
  }, [appState.planLekcji.rooms]);

  // Classified and sorted columns (rooms) list
  const classifiedCols = useMemo(() => {
    const rawCols = flattenColumns(appState.floors);

    const mainCols: typeof rawCols = [];
    const individualCols: typeof rawCols = [];
    const sportCols: typeof rawCols = [];

    rawCols.forEach(col => {
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
    const sortFn = (a: typeof rawCols[0], b: typeof rawCols[0]) => {
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
  }, [appState.floors, appState.buildings, roomsMap]);

  // Flat list of active columns
  const cols = useMemo(() => {
    return classifiedCols[activeRoomCategory];
  }, [classifiedCols, activeRoomCategory]);

  // Group columns for layout merging
  const buildingGroups = useMemo(() => {
    const groups: { startIdx: number; span: number; buildingIdx: number; name: string }[] = [];
    let currentGroup = null as any;

    cols.forEach((col, idx) => {
      const bIdx = col.floor.buildingIdx;
      const bld = appState.buildings[bIdx];
      const name = bld?.name || 'Budynek';

      if (!currentGroup || currentGroup.buildingIdx !== bIdx) {
        currentGroup = { startIdx: idx, span: 1, buildingIdx: bIdx, name };
        groups.push(currentGroup);
      } else {
        currentGroup.span++;
      }
    });

    return groups;
  }, [cols, appState.buildings]);

  const floorGroups = useMemo(() => {
    const groups: { startIdx: number; span: number; name: string; buildingName?: string }[] = [];
    let currentGroup = null as any;

    cols.forEach((col, idx) => {
      const bIdx = col.floor.buildingIdx;
      const bld = appState.buildings[bIdx];
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
  }, [cols, appState.buildings]);

  const segmentGroups = useMemo(() => {
    const groups: { startIdx: number; span: number; name: string }[] = [];
    let currentGroup = null as any;

    cols.forEach((col, idx) => {
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
  }, [cols]);

  // Current day sched data
  const currentDayData = useMemo(() => {
    return schedData[appState.yearKey]?.[activeDay] || {};
  }, [schedData, appState.yearKey, activeDay]);

  // Resolvers for Etap 1 -> Etap 2 Bridging
  const assignmentsMap = useMemo(() => {
    return new Map((appState.planLekcji.assignments || []).map(a => [a.id, a]));
  }, [appState.planLekcji.assignments]);

  const teachersMap = useMemo(() => {
    return new Map((appState.planLekcji.teachers || []).map(t => [t.id, t]));
  }, [appState.planLekcji.teachers]);

  const subjectsMap = useMemo(() => {
    return new Map((appState.planLekcji.subjects || []).map(s => [s.id, s]));
  }, [appState.planLekcji.subjects]);

  const rMap = useMemo(() => {
    return new Map((appState.planLekcji.rooms || []).map(r => [r.id, r]));
  }, [appState.planLekcji.rooms]);

  // Set of classes assigned at any given hour on current active day in plan sal
  const isAssigned = useMemo(() => {
    const map = new Set<string>();
    appState.hours.forEach(h => {
      const row = currentDayData[h] || {};
      Object.keys(row).forEach(cKey => {
        const cell = row[cKey];
        if (!cell) return;
        const slots = Array.isArray(cell) ? cell : [cell];
        slots.forEach(slot => {
          if (!slot) return;
          const classes = slot.classes || (slot.className ? [slot.className] : []);
          classes.forEach(c => {
            if (c) {
              map.add(`${h}|${c.toUpperCase()}`);
            }
          });
        });
      });
    });
    return map;
  }, [currentDayData, appState.hours]);

  // Flat list of all scheduled lessons for chosen activeDay from Etap 1
  const poolLessons = useMemo(() => {
    const pl = appState.planLekcji;
    if (!pl || !pl.classes) return [];

    const list: {
      id: string;
      className: string;
      subject: string;
      teacherAbbr: string;
      hourKey: string;
      suggestedRoom: string;
      isAssigned: boolean;
    }[] = [];

    pl.classes.forEach(cls => {
      appState.hours.forEach((hKey) => {
        const hIdx = pl.hours.findIndex(h => String(h.num) === hKey);
        if (hIdx === -1) return;

        const lessonKey = `${cls.id}|${activeDay}|${hIdx}`;
        const lesson = pl.lessons?.[lessonKey];
        if (!lesson) return;

        const asg = assignmentsMap.get(lesson.assignmentId);
        if (!asg) return;

        const className = cls.name;
        const subject = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
        const teacherAbbr = asg.teacherId ? teachersMap.get(asg.teacherId)?.abbr || '' : '';
        const suggestedRoom = asg.roomId ? rMap.get(asg.roomId)?.name || '' : '';
        
        const assigned = isAssigned.has(`${hKey}|${className.toUpperCase()}`);

        list.push({
          id: `${cls.id}-${activeDay}-${hKey}`,
          className,
          subject,
          teacherAbbr,
          hourKey: hKey,
          suggestedRoom,
          isAssigned: assigned
        });
      });
    });

    return list;
  }, [appState.planLekcji, appState.hours, activeDay, assignmentsMap, subjectsMap, rMap, isAssigned]);

  // Collision Checking (School-wide checked)
  const collisions = useMemo(() => {
    // teacherLocations: "teacherAbbr|hour" -> list of { colKey, slotIdx, isSupport?: boolean }
    const teacherLocations = new Map<string, { colKey: string; slotIdx?: number; isSupport?: boolean }[]>();
    // classLocations: "classAbbr|hour" -> list of { colKey, slotIdx }
    const classLocations = new Map<string, { colKey: string; slotIdx?: number }[]>();

    // detected: "hour|colKey" -> set of conflict descriptions / reasons
    const detected = new Map<string, string[]>();
    
    // specific slots in conflict: "hour|colKey|slotIdx" -> array of descriptions
    const slotConflicts = new Map<string, string[]>();

    const allCols = flattenColumns(appState.floors);

    // Phase 1: Collect all bookings for teachers and classes at each hour
    appState.hours.forEach(h => {
      const row = currentDayData[h] || {};
      allCols.forEach(col => {
        const cKey = colKey(col);
        const cell = row[cKey];
        if (!cell) return;

        const bld = appState.buildings[col.floor.buildingIdx];
        const roomNameClean = (col.room.num || '').toLowerCase().trim();
        const meta = roomsMap.get(roomNameClean);
        const isSport = meta?.type === 'sport' || bld?.multi === true;

        const slots: SchedCell[] = Array.isArray(cell) ? cell : [cell];

        slots.forEach((slot, slIdx) => {
          if (!slot) return;

          // Register teacher
          if (slot.teacherAbbr) {
            const tKey = `${slot.teacherAbbr.toUpperCase()}|${h}`;
            const list = teacherLocations.get(tKey) || [];
            list.push({ colKey: cKey, slotIdx: isSport ? slIdx : undefined });
            teacherLocations.set(tKey, list);
          }

          // Register support teacher
          if (slot.supportTeacherAbbr) {
            const tKey = `${slot.supportTeacherAbbr.toUpperCase()}|${h}`;
            const list = teacherLocations.get(tKey) || [];
            list.push({ colKey: cKey, slotIdx: isSport ? slIdx : undefined, isSupport: true });
            teacherLocations.set(tKey, list);
          }

          // Register classes (including split entries to detect split group conflicts)
          const classNames = slot.classes || (slot.className ? [slot.className] : []);
          const expandedClasses: string[] = [];
          
          classNames.forEach(cls => {
            if (!cls) return;
            const list = cls.split(/[\s,+/]+|(?:\bi\b)/i).map(c => c.trim().toUpperCase()).filter(Boolean);
            expandedClasses.push(...list);
          });

          expandedClasses.forEach(cls => {
            const cKeyCombined = `${cls}|${h}`;
            const list = classLocations.get(cKeyCombined) || [];
            list.push({ colKey: cKey, slotIdx: isSport ? slIdx : undefined });
            classLocations.set(cKeyCombined, list);
          });
        });
      });
    });

    // Phase 2: Analyze and flag school-wide overlaps
    // For Teachers:
    teacherLocations.forEach((list, tKey) => {
      if (list.length > 1) {
        const [teacherAbbr, h] = tKey.split('|');
        const distinctCols = Array.from(new Set(list.map(item => item.colKey)));
        if (distinctCols.length > 1) {
          list.forEach(item => {
            const keyInCol = `${h}|${item.colKey}`;
            const otherRms = distinctCols.filter(c => c !== item.colKey).map(c => {
               const foundCol = allCols.find(x => colKey(x) === c);
               return foundCol ? foundCol.room.num : c;
            }).join(', ');
            const desc = `Szkolny konflikt: Nauczyciel ${teacherAbbr} ${item.isSupport ? '(wspomagający)' : ''} przypisany równolegle do sal: ${otherRms}`;

            // Add to room detected
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            // Add to slot conflict if present
            if (item.slotIdx !== undefined) {
              const sKey = `${h}|${item.colKey}|${item.slotIdx}`;
              const sExisting = slotConflicts.get(sKey) || [];
              if (!sExisting.includes(desc)) {
                sExisting.push(desc);
                slotConflicts.set(sKey, sExisting);
              }
            }
          });
        }
      }
    });

    // For Classes:
    classLocations.forEach((list, cKeyCombined) => {
      if (list.length > 1) {
        const [cls, h] = cKeyCombined.split('|');
        const distinctCols = Array.from(new Set(list.map(item => item.colKey)));
        if (distinctCols.length > 1) {
          list.forEach(item => {
            const keyInCol = `${h}|${item.colKey}`;
            const otherRms = distinctCols.filter(c => c !== item.colKey).map(c => {
               const foundCol = allCols.find(x => colKey(x) === c);
               return foundCol ? foundCol.room.num : c;
            }).join(', ');
            const desc = `Szkolny konflikt: Klasa ${cls} przypisana równolegle do sal: ${otherRms}`;

            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            if (item.slotIdx !== undefined) {
              const sKey = `${h}|${item.colKey}|${item.slotIdx}`;
              const sExisting = slotConflicts.get(sKey) || [];
              if (!sExisting.includes(desc)) {
                sExisting.push(desc);
                slotConflicts.set(sKey, sExisting);
              }
            }
          });
        }
      }
    });

    // Phase 3: Local Room Conflicts (Duplicate teachers/classes in the single room at the same hour)
    appState.hours.forEach(h => {
      const row = currentDayData[h] || {};
      allCols.forEach(col => {
        const cKey = colKey(col);
        const cell = row[cKey];
        if (!cell) return;

        const bld = appState.buildings[col.floor.buildingIdx];
        const roomNameClean = (col.room.num || '').toLowerCase().trim();
        const meta = roomsMap.get(roomNameClean);
        const isSport = meta?.type === 'sport' || bld?.multi === true;

        const slots: SchedCell[] = Array.isArray(cell) ? cell : [cell];

        if (slots.length === 0) return;

        const keyInCol = `${h}|${cKey}`;

        // 1. Standard Room Check: a standard room model only expects maximum 1 lesson.
        // If there are multiple entries or lessons, that is a local room conflict.
        if (!isSport && slots.length > 1) {
          const desc = `Lokalny konflikt: Więcej niż 1 przydział lekcji w tej samej standardowej sali`;
          const existing = detected.get(keyInCol) || [];
          if (!existing.includes(desc)) {
            existing.push(desc);
            detected.set(keyInCol, existing);
          }
        }

        // 2. Class duplicates / Teacher duplicates in the SAME room at the same time
        const teachersInThisRoom = slots.map(s => s?.teacherAbbr?.trim().toUpperCase()).filter(Boolean);
        const classesInThisRoom: string[] = [];
        slots.forEach(s => {
          const classNames = s?.classes || (s?.className ? [s?.className] : []);
          classNames.forEach(cls => {
            if (cls?.trim()) {
              const individualList = cls.split(/[\s,+/]+|(?:\bi\b)/i).map(c => c.trim().toUpperCase()).filter(Boolean);
              classesInThisRoom.push(...individualList);
            }
          });
        });

        // If standard room:
        // By definition, a standard room should not have multiple different teachers or different classes
        if (!isSport) {
          const uniqueTeachers = Array.from(new Set(teachersInThisRoom));
          const uniqueClasses = Array.from(new Set(classesInThisRoom));

          if (uniqueTeachers.length > 1) {
            const desc = `Konflikt Sali: Dwóch różnych nauczycieli (${uniqueTeachers.join(', ')}) w tej samej sali w tym samym czasie!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }
          }

          if (uniqueClasses.length > 1) {
            const desc = `Konflikt Sali: Dwie różne klasy (${uniqueClasses.join(', ')}) w tej samej sali w tym samym czasie!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }
          }
        } else {
          // If multi room (gym/sports), detect duplicate teacher or duplicate class WITHIN the gym slots
          // (They shouldn't be assigned twice in different slots of the same gym at the same hour)
          const teacherCounts = new Map<string, number>();
          teachersInThisRoom.forEach(t => teacherCounts.set(t, (teacherCounts.get(t) || 0) + 1));
          
          let duplicatedTeacher = '';
          teacherCounts.forEach((count, t) => {
            if (count > 1) duplicatedTeacher = t;
          });

          if (duplicatedTeacher) {
            const desc = `Lokalny konflikt: Nauczyciel ${duplicatedTeacher} przypisany podwójnie w tej samej sali sportowej!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            slots.forEach((s, slIdx) => {
              if (s?.teacherAbbr?.trim().toUpperCase() === duplicatedTeacher) {
                const sKey = `${h}|${cKey}|${slIdx}`;
                const sExisting = slotConflicts.get(sKey) || [];
                if (!sExisting.includes(desc)) {
                  sExisting.push(desc);
                  slotConflicts.set(sKey, sExisting);
                }
              }
            });
          }

          const classCounts = new Map<string, number>();
          classesInThisRoom.forEach(c => classCounts.set(c, (classCounts.get(c) || 0) + 1));

          let duplicatedClass = '';
          classCounts.forEach((count, c) => {
            if (count > 1) duplicatedClass = c;
          });

          if (duplicatedClass) {
            const desc = `Lokalny konflikt: Klasa ${duplicatedClass} przypisana podwójnie w tej samej sali sportowej!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            slots.forEach((s, slIdx) => {
              const sClasses = s?.classes || (s?.className ? [s?.className] : []);
              if (sClasses.some(cls => cls?.trim().toUpperCase() === duplicatedClass)) {
                const sKey = `${h}|${cKey}|${slIdx}`;
                const sExisting = slotConflicts.get(sKey) || [];
                if (!sExisting.includes(desc)) {
                  sExisting.push(desc);
                  slotConflicts.set(sKey, sExisting);
                }
              }
            });
          }
        }
      });
    });

    return {
      detected,       // key: "h|cKey", value: array of description strings
      slotConflicts   // key: "h|cKey|slotIdx", value: array of description strings
    };
  }, [currentDayData, appState.hours, appState.floors, appState.buildings, roomsMap]);

  // ── HANDLING MODAL ACTIONS ──

  const handleOpenEdit = (hour: string, cKey: string, slotIdx?: number) => {
    const raw = currentDayData[hour]?.[cKey];
    let cell: SchedCell | null = null;
    if (Array.isArray(raw)) {
      cell = (slotIdx !== undefined ? raw[slotIdx] : raw[0]) || null;
    } else {
      cell = (raw as SchedCell) || null;
    }

    setEditingCell({ hour, colKey: cKey, slotIdx });
    setCellClass(cell?.className || cell?.classes?.[0] || '');
    setCellTeacher(cell?.teacherAbbr || '');
    setCellSupportTeacher(cell?.supportTeacherAbbr || '');
    setCellSubject(cell?.subject || '');
    setCellNote(cell?.note || '');
  };

  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;

    const { hour, colKey: cKey, slotIdx } = editingCell;
    const yearKey = appState.yearKey;

    const newCell: SchedCell = {
      teacherAbbr: cellTeacher.trim().toUpperCase(),
      supportTeacherAbbr: cellSupportTeacher.trim().toUpperCase() || undefined,
      className: cellClass.trim().toUpperCase(),
      classes: [cellClass.trim().toUpperCase()],
      subject: cellSubject.trim(),
      note: cellNote.trim()
    };

    const newSchedData = { ...schedData };
    if (!newSchedData[yearKey]) newSchedData[yearKey] = {};
    if (!newSchedData[yearKey][activeDay]) newSchedData[yearKey][activeDay] = {};
    if (!newSchedData[yearKey][activeDay][hour]) newSchedData[yearKey][activeDay][hour] = {};

    const raw = newSchedData[yearKey][activeDay][hour][cKey];

    if (Array.isArray(raw)) {
      const arr = [...raw];
      if (slotIdx !== undefined && slotIdx < arr.length) {
        arr[slotIdx] = newCell;
      } else {
        arr.push(newCell);
      }
      newSchedData[yearKey][activeDay][hour][cKey] = arr;
    } else {
      newSchedData[yearKey][activeDay][hour][cKey] = newCell;
    }

    onChangeSchedData(newSchedData);
    setEditingCell(null);
    notify('Zapisano przydział sali', 'ok');
  };

  const handleClearCell = () => {
    if (!editingCell) return;
    const { hour, colKey: cKey, slotIdx } = editingCell;
    const yearKey = appState.yearKey;

    const newSchedData = { ...schedData };
    if (newSchedData[yearKey]?.[activeDay]?.[hour]) {
      const raw = newSchedData[yearKey][activeDay][hour][cKey];
      if (Array.isArray(raw)) {
        if (slotIdx !== undefined) {
          const arr = [...raw];
          arr.splice(slotIdx, 1);
          newSchedData[yearKey][activeDay][hour][cKey] = arr;
        } else {
          newSchedData[yearKey][activeDay][hour][cKey] = [];
        }
      } else {
        delete newSchedData[yearKey][activeDay][hour][cKey];
      }
      onChangeSchedData(newSchedData);
    }

    setEditingCell(null);
    notify('Wyczyszczono przydział', 'ok');
  };

  const handleAddWFSlot = (hour: string, cKey: string) => {
    const yearKey = appState.yearKey;
    const newSchedData = { ...schedData };
    if (!newSchedData[yearKey]) newSchedData[yearKey] = {};
    if (!newSchedData[yearKey][activeDay]) newSchedData[yearKey][activeDay] = {};
    if (!newSchedData[yearKey][activeDay][hour]) newSchedData[yearKey][activeDay][hour] = {};

    const raw = newSchedData[yearKey][activeDay][hour][cKey];
    const arr = Array.isArray(raw) ? [...raw] : raw ? [raw] : [];

    arr.push({
      teacherAbbr: '',
      classes: [],
      className: '',
      subject: 'Wychowanie fizyczne',
      note: 'Nowa grupa WF'
    });

    newSchedData[yearKey][activeDay][hour][cKey] = arr;
    onChangeSchedData(newSchedData);
    notify('Dodano grupę do obiektu sportowego', 'ok');
  };

  const handleRemoveWFSlot = (hour: string, cKey: string, slotIdx: number) => {
    const yearKey = appState.yearKey;
    const newSchedData = { ...schedData };
    if (newSchedData[yearKey]?.[activeDay]?.[hour]) {
      const raw = newSchedData[yearKey][activeDay][hour][cKey];
      if (Array.isArray(raw)) {
        const arr = [...raw];
        arr.splice(slotIdx, 1);
        newSchedData[yearKey][activeDay][hour][cKey] = arr;
        onChangeSchedData(newSchedData);
        notify('Usunięto grupę ze slotu sportowego', 'ok');
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as any;
    const dropData = over.data.current as any;

    if (!dragData || !dropData) return;

    const { type, hour: srcHour, colKey: srcColKey, slotIdx: srcSlotIdx, cellData } = dragData;
    const { hour: destHour, colKey: destColKey, isSport: destIsSport } = dropData;

    const yearKey = appState.yearKey;
    const dayIdx = activeDay;

    const nextSchedData = JSON.parse(JSON.stringify(schedData));

    if (!nextSchedData[yearKey]) nextSchedData[yearKey] = {};
    if (!nextSchedData[yearKey][dayIdx]) nextSchedData[yearKey][dayIdx] = {};

    let cellToMove: SchedCell | null = null;

    if (type === 'grid-cell') {
      if (!srcHour || !srcColKey) return;

      const sourceCellVal = nextSchedData[yearKey][dayIdx][srcHour]?.[srcColKey];
      if (!sourceCellVal) return;

      if (srcHour === destHour && srcColKey === destColKey) {
        return;
      }

      if (Array.isArray(sourceCellVal)) {
        if (srcSlotIdx !== undefined && srcSlotIdx < sourceCellVal.length) {
          cellToMove = sourceCellVal[srcSlotIdx];
          sourceCellVal.splice(srcSlotIdx, 1);
          nextSchedData[yearKey][dayIdx][srcHour][srcColKey] = sourceCellVal;
        }
      } else {
        cellToMove = sourceCellVal;
        delete nextSchedData[yearKey][dayIdx][srcHour][srcColKey];
      }
    } else if (type === 'pool-lesson') {
      if (!cellData) return;
      cellToMove = {
        className: cellData.className,
        classes: cellData.classes,
        teacherAbbr: cellData.teacherAbbr,
        subject: cellData.subject,
        note: cellData.note || '',
        _bridgeMeta: cellData._bridgeMeta
      };
    }

    if (!cellToMove) return;

    if (!nextSchedData[yearKey][dayIdx][destHour]) {
      nextSchedData[yearKey][dayIdx][destHour] = {};
    }

    const targetCellVal = nextSchedData[yearKey][dayIdx][destHour][destColKey];

    if (destIsSport) {
      const arr = Array.isArray(targetCellVal) ? [...targetCellVal] : targetCellVal ? [targetCellVal] : [];
      arr.push(cellToMove);
      nextSchedData[yearKey][dayIdx][destHour][destColKey] = arr;
    } else {
      if (targetCellVal) {
        const arr = Array.isArray(targetCellVal) ? [...targetCellVal] : [targetCellVal];
        arr.push(cellToMove);
        nextSchedData[yearKey][dayIdx][destHour][destColKey] = arr;
      } else {
        nextSchedData[yearKey][dayIdx][destHour][destColKey] = cellToMove;
      }
    }

    onChangeSchedData(nextSchedData);
    notify('Zaktualizowano przydział sali korporacyjnie', 'ok');
  };

  const renderSidebar = () => {
    // Filter pool lessons
    const filteredPool = poolLessons.filter(lesson => {
      const matchesFilter = poolFilter === 'all' || !lesson.isAssigned;
      const matchesSearch = 
        lesson.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.teacherAbbr.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    if (!showPoolSidebar) {
      return (
        <button
          type="button"
          onClick={() => setShowPoolSidebar(true)}
          className="bg-slate-900 border-l border-slate-800 text-slate-300 w-10 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-slate-850 hover:text-white transition shadow-lg shrink-0 select-none"
          title="Rozwiń pulę zajęć"
        >
          <ChevronLeft size={16} />
          <div className="origin-center -rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-slate-400 mt-8">
            Pula zajęć ({poolLessons.filter(l => !l.isAssigned).length})
          </div>
        </button>
      );
    }

    const unassignedCount = poolLessons.filter(l => !l.isAssigned).length;

    return (
      <div className="w-80 bg-slate-900 border-l border-slate-950 flex flex-col shadow-2xl overflow-hidden shrink-0 transition-all duration-300 select-none">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Sparkles size={13} className="text-amber-400" /> Pula zajęć (Plan Klas)
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">
              Przeciągnij lekcję do wybranej sali korytarza
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPoolSidebar(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="Zwiń panel"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-850 space-y-2 shrink-0">
          <div className="flex rounded-lg bg-slate-950 p-1 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setPoolFilter('unassigned')}
              className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                poolFilter === 'unassigned' 
                  ? 'bg-slate-800 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Do przydziału ({unassignedCount})
            </button>
            <button
              type="button"
              onClick={() => setPoolFilter('all')}
              className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                poolFilter === 'all' 
                  ? 'bg-slate-800 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wszystkie ({poolLessons.length})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filtruj np. 4A, Matemat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none border border-slate-800/80 font-medium"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* List of Draggable Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-900/60 custom-scrollbar">
          {filteredPool.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-[11px] font-medium border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20 p-4">
              {searchQuery ? 'Brak zajęć odpowiadających filtrom' : 'Brak wolnych lekcji dla wybranego filtru! 🎉'}
            </div>
          ) : (
            filteredPool.map((lesson) => {
              const dragId = `pool-${lesson.id}`;
              return (
                <DraggableItem
                  key={lesson.id}
                  id={dragId}
                  data={{
                    type: 'pool-lesson',
                    cellData: {
                      className: lesson.className,
                      classes: [lesson.className],
                      teacherAbbr: lesson.teacherAbbr,
                      subject: lesson.subject,
                      _bridgeMeta: {
                        className: lesson.className,
                        subject: lesson.subject,
                        teacherAbbr: lesson.teacherAbbr
                      }
                    }
                  }}
                >
                  <div className={`p-2.5 border-l-4 rounded-lg bg-slate-950 shadow-xs transition select-none flex flex-col justify-between ${
                    lesson.isAssigned 
                      ? 'border-indigo-500 bg-slate-950/40 opacity-55' 
                      : 'border-amber-500 hover:border-amber-400 hover:bg-slate-950/90'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-100 flex items-center gap-1">
                        Klasa {lesson.className}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        lesson.isAssigned 
                          ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/80' 
                          : 'bg-amber-950 text-amber-400 border border-amber-900'
                      }`}>
                        lekcja {lesson.hourKey}
                      </span>
                    </div>

                    <div className="text-[10.5px] font-bold text-slate-300 truncate" title={lesson.subject}>
                      {lesson.subject}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-1.5 border-t border-slate-900/40 pt-1.5">
                      <span className="text-slate-400">👤 {lesson.teacherAbbr || 'N/N'}</span>
                      {lesson.suggestedRoom && (
                        <span className="text-amber-500/90 text-[9px] font-bold flex items-center gap-1 bg-amber-950/30 border border-amber-950 px-1 py-0.5 rounded leading-none">
                          🚪 {lesson.suggestedRoom}
                        </span>
                      )}
                    </div>
                  </div>
                </DraggableItem>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg transition-transform z-[9999] ${
      type === 'ok' ? 'border-emerald-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 overflow-hidden h-full" id="page-plan-sal">
        {/* ── PASEK KONTROLI / DNIE ── */}
        <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            {DAYS.map((day, dIdx) => (
              <button
                key={dIdx}
                type="button"
                onClick={() => setActiveDay(dIdx)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeDay === dIdx
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onImportFromPlanKlas}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={14} /> Synchronizuj z Planem Klas (Etap 1)
            </button>
          </div>
        </div>

        {/* ── PASEK KATEGORII SAL ── */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveRoomCategory('main')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition ${
                activeRoomCategory === 'main'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              🏢 Budynek Główny ({classifiedCols.main.length})
            </button>
            <button
              onClick={() => setActiveRoomCategory('individual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition ${
                activeRoomCategory === 'individual'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              🗣️ Nauczanie Indywidualne ({classifiedCols.individual.length})
            </button>
            <button
              onClick={() => setActiveRoomCategory('sport')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition ${
                activeRoomCategory === 'sport'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              🏆 Sale Sportowe ({classifiedCols.sport.length})
            </button>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Filtr kategorii obiektów
          </div>
        </div>

        {/* ── DRAG AND DROP CONTENT ZONE (Siatka + Sidebar) ── */}
        <div className="flex-1 flex overflow-hidden bg-slate-50">
          
          {/* Lewa strona: Siatka sal */}
          <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
            {cols.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 font-medium text-xs shadow-xs max-w-md mx-auto select-none mt-8">
                <div className="text-3xl mb-3">🚪</div>
                <p className="font-bold text-slate-700 mb-1">Brak sal w wybranej kategorii</p>
                <p className="text-slate-400">Dodaj sale odpowiedniego typu w Kreatorze Szkoły (Krok 3 - Sale i gabinety), aby układać dla nich dzwonki.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-md p-4 overflow-x-auto">
                <table className="w-full border-collapse table-fixed" style={{ minWidth: `${cols.length * 150 + 100}px` }}>
                  <colgroup>
                    <col style={{ width: '100px' }} />
                    {cols.map((col, idx) => (
                      <col key={`col-${idx}`} style={{ width: '150px' }} />
                    ))}
                  </colgroup>
                  <thead>
                    {/* Budynki / Piętra / Segmenty / Sale w 4 rzędach */}
                    <tr>
                      <th 
                        rowSpan={4} 
                        className="border-b border-r border-slate-200 p-3 text-xs font-bold text-slate-500 text-center select-none bg-slate-100 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                      >
                        Godz.
                      </th>
                      {buildingGroups.map((g, idx) => {
                        const bColor = BUILDING_COLORS[g.buildingIdx % BUILDING_COLORS.length];
                        return (
                          <th 
                            key={`bld-grp-${idx}`} 
                            colSpan={g.span}
                            className="border-b border-r last:border-r-0 border-slate-200 p-2 text-center text-[10px] uppercase font-black tracking-wide select-none bg-white font-black"
                            style={{ color: bColor }}
                          >
                            🏢 {g.name}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      {floorGroups.map((g, idx) => (
                        <th 
                          key={`floor-grp-${idx}`} 
                          colSpan={g.span}
                          className="border-b border-r last:border-r-0 border-slate-200 p-2 text-center text-xs font-black text-slate-700 select-none bg-slate-50/50"
                        >
                          📍 {cleanFloorName(g.name, g.buildingName)}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {segmentGroups.map((g, idx) => (
                        <th 
                          key={`seg-grp-${idx}`} 
                          colSpan={g.span}
                          className="border-b border-r last:border-r-0 border-slate-105 p-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-tight select-none bg-white"
                        >
                          🧩 {g.name}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {cols.map((col, idx) => (
                        <th 
                          key={`room-${idx}`} 
                          className="border-b border-r last:border-r-0 border-slate-200 p-2 text-center select-none bg-slate-50/10"
                        >
                          <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200/80 rounded px-1.5 py-0.5 inline-block">
                            🚪 {col.room.num}
                          </div>
                          {col.room.sub && (
                            <div className="text-[9px] text-slate-400 font-medium normal-case mt-0.5 leading-none">
                              ({col.room.sub})
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                  {appState.hours.map((h, hourIndex) => {
                    const ts = appState.timeslots.find(t => String(t.num) === h);
                    return (
                      <tr key={hourIndex} className="hover:bg-slate-50/50">
                        {/* Hour cell */}
                        <td className="border-b border-r border-slate-200 p-3 text-center bg-slate-100 select-none sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                          <span className="block font-bold text-slate-700">{h}</span>
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                            {ts ? `${ts.start}–${ts.end}` : ''}
                          </span>
                        </td>

                        {/* Rooms cells */}
                        {cols.map((col, colIdx) => {
                          const cKey = colKey(col);
                          const raw = currentDayData[h]?.[cKey];
                          const bld = appState.buildings[col.floor.buildingIdx];
                          const roomNameClean = (col.room.num || '').toLowerCase().trim();
                          const meta = roomsMap.get(roomNameClean);
                          const isSport = meta?.type === 'sport' || bld?.multi === true;

                          // Render for Multi-slot (Gym/WF Columns)
                          if (isSport) {
                            const slots = Array.isArray(raw) ? raw : raw ? [raw] : [];
                            const cellConfReasons = collisions.detected.get(`${h}|${cKey}`) || [];
                            const isCellConf = cellConfReasons.length > 0;

                            return (
                              <td 
                                key={colIdx} 
                                className={`border-b border-r last:border-r-0 border-slate-200 p-2 align-top transition-colors ${
                                  isCellConf ? 'bg-red-50/70 border-2 border-red-300' : 'bg-slate-50/20'
                                }`}
                                title={isCellConf ? cellConfReasons.join('\n') : undefined}
                              >
                                <DroppableCell 
                                  id={`drop-${h}-${cKey}`} 
                                  data={{ hour: h, colKey: cKey, isSport: true }}
                                >
                                  <div className="space-y-1.5 font-mono text-[11px] h-full min-h-[56px]">
                                    {isCellConf && (
                                      <div className="text-[9px] font-black text-red-700 bg-red-150 border border-red-200 rounded px-1.5 py-0.5 leading-none flex items-center gap-1 mb-1 shadow-xs animate-pulse select-none">
                                        ⚠️ KOLIZJA
                                      </div>
                                    )}
                                    {slots.map((slot, slIdx) => {
                                      const classes = slot.classes || (slot.className ? [slot.className] : []);
                                      const slotKey = `${h}|${cKey}|${slIdx}`;
                                      const slotConfReasons = collisions.slotConflicts.get(slotKey) || [];
                                      const isSlotConf = slotConfReasons.length > 0;

                                      return (
                                        <DraggableItem
                                          key={slIdx}
                                          id={`drag-${h}-${cKey}-${slIdx}`}
                                          data={{
                                            type: 'grid-cell',
                                            hour: h,
                                            colKey: cKey,
                                            slotIdx: slIdx,
                                            cellData: slot
                                          }}
                                        >
                                          <div 
                                            title={isSlotConf ? slotConfReasons.join('\n') : undefined}
                                            className={`p-2 border rounded-lg text-[11px] relative shadow-xs transition-all ${
                                              isSlotConf 
                                                ? 'border-red-500 bg-red-50 text-red-950 font-semibold shadow-red-100/50' 
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-950 font-medium'
                                            }`}
                                          >
                                            <div className="font-bold flex items-center justify-between">
                                              <span className={`${isSlotConf ? 'text-red-700' : ''}`}>{classes.join(', ') || 'Wolny sport'}</span>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button 
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEdit(h, cKey, slIdx);
                                                  }}
                                                  className={`${isSlotConf ? 'text-red-700 hover:text-red-950' : 'text-emerald-700 hover:text-emerald-950'} text-[10px]`}
                                                >
                                                  ✏️
                                                </button>
                                                <button 
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveWFSlot(h, cKey, slIdx);
                                                  }}
                                                  className="text-red-500 hover:text-red-700 text-[10px]"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            </div>
                                            <div className="mt-0.5 text-slate-700">{slot.subject}</div>
                                            {slot.teacherAbbr && (
                                              <div className={`text-[10px] mt-1 select-all font-bold ${isSlotConf ? 'text-red-600' : 'text-emerald-700'}`}>
                                                👤 {slot.teacherAbbr}
                                              </div>
                                            )}
                                            {slot.supportTeacherAbbr && (
                                              <div className="text-[10px] text-indigo-700 font-bold select-all mt-0.5">
                                                👥 {slot.supportTeacherAbbr} (wspomag.)
                                              </div>
                                            )}
                                            {isSlotConf && (
                                              <div className="text-[9px] font-medium text-red-500 leading-tight mt-1 bg-white/70 p-1.5 rounded border border-red-200/40">
                                                {slotConfReasons[0]}
                                              </div>
                                            )}
                                          </div>
                                        </DraggableItem>
                                      );
                                    })}
                                    <button 
                                      type="button"
                                      onClick={() => handleAddWFSlot(h, cKey)}
                                      className="w-full py-1.5 border border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      ＋ Dodaj grupę WF
                                    </button>
                                  </div>
                                </DroppableCell>
                              </td>
                            );
                          }

                          // Standard Room Cell
                          const slots = Array.isArray(raw) ? raw : raw ? [raw] : [];
                          const hasL = slots.length > 0;
                          const confReasons = collisions.detected.get(`${h}|${cKey}`) || [];
                          const isConf = confReasons.length > 0;

                          return (
                            <td 
                              key={colIdx} 
                              className={`border-b border-r last:border-r-0 border-slate-200 p-2 align-top transition-colors ${
                                isConf ? 'bg-red-50/70 border-2 border-red-300' : 'hover:bg-blue-50/40'
                              }`}
                            >
                              <DroppableCell 
                                id={`drop-${h}-${cKey}`} 
                                data={{ hour: h, colKey: cKey, isSport: false }}
                              >
                                {hasL ? (
                                  <div className="space-y-2 h-full min-h-[56px] justify-center flex flex-col">
                                    {isConf && (
                                      <div className="text-[9px] font-black text-red-700 bg-red-100 border border-red-200 rounded px-1.5 py-0.5 leading-none flex items-center gap-1 select-none animate-pulse">
                                        <AlertTriangle size={10} /> KOLIZJA SALI
                                      </div>
                                    )}
                                    {slots.map((slot, slIdx) => {
                                      const classes = slot?.classes || (slot?.className ? [slot?.className] : []);
                                      const isSpecificConf = isConf;
                                      return (
                                        <DraggableItem
                                          key={slIdx}
                                          id={`drag-${h}-${cKey}-${slIdx}`}
                                          data={{
                                            type: 'grid-cell',
                                            hour: h,
                                            colKey: cKey,
                                            slotIdx: slIdx,
                                            cellData: slot
                                          }}
                                        >
                                          <div 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenEdit(h, cKey, slIdx);
                                            }}
                                            className={`rounded-lg p-2.5 border-l-4 relative select-none flex flex-col justify-between shadow-sm cursor-pointer transition hover:scale-[1.01] ${
                                              isSpecificConf 
                                                ? 'border-red-600 bg-red-50 text-red-950 font-semibold' 
                                                : 'border-blue-500 bg-white hover:bg-slate-50'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                                <span className={`${isSpecificConf ? 'text-red-700 font-extrabold' : ''}`}>{classes.join(', ') || '—'}</span>
                                                {isSpecificConf && <span className="text-[8px] text-red-600 font-bold bg-white border border-red-200 px-1 py-0.5 rounded animate-pulse">KOLIZJA</span>}
                                              </div>
                                              <div className="text-[10px] text-slate-500 font-semibold mt-1">{slot.subject}</div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-[10px] mt-2 font-medium">
                                              <div className="flex items-center justify-between">
                                                <span className={isSpecificConf ? 'text-red-700 font-bold' : 'text-slate-600 font-semibold'}>👤 {slot.teacherAbbr || 'Wychowawca'}</span>
                                                {slot.note && <span className="text-[9px] italic text-slate-400 truncate max-w-[80px]" title={slot.note}>{slot.note}</span>}
                                              </div>
                                              {slot.supportTeacherAbbr && (
                                                <div className="text-indigo-600 font-semibold flex items-center gap-1">
                                                  <span>👥 {slot.supportTeacherAbbr}</span>
                                                  <span className="text-[8px] bg-indigo-50 border border-indigo-100 rounded px-1 shrink-0">wspom.</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </DraggableItem>
                                      );
                                    })}
                                    {isConf && confReasons.length > 0 && (
                                      <div className="text-[9.5px] font-bold text-red-700 leading-normal bg-red-100/80 p-2 rounded border border-red-200 space-y-1 text-left">
                                        {confReasons.map((reason, rIdx) => (
                                          <div key={rIdx} className="flex items-start gap-1">
                                            <span className="text-red-900 font-extrabold">•</span>
                                            <span>{reason}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleOpenEdit(h, cKey)}
                                    className="h-full min-h-[56px] flex items-center justify-center text-slate-200 font-light cursor-pointer hover:text-blue-500 hover:bg-blue-50/20 rounded transition-colors"
                                  >
                                    +
                                  </div>
                                )}
                              </DroppableCell>
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

          {/* Prawa strona: sidebar lekcji z Planu Klas */}
          {renderSidebar()}

        </div>

        {/* ── MODAL EDYCJI PRZYDZIAŁU SALI ── */}
        {editingCell && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form 
              onSubmit={handleSaveCell}
              className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between select-none">
                <h3 className="font-bold text-slate-800">🏠 Edytuj przydział sali</h3>
                <button 
                  type="button" 
                  onClick={() => setEditingCell(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Klasa / Grupy</label>
                  <input 
                    type="text" 
                    value={cellClass}
                    onChange={(e) => setCellClass(e.target.value)}
                    placeholder="np. 4A, 1B"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nauczyciel</label>
                  <input 
                    type="text" 
                    value={cellTeacher}
                    onChange={(e) => setCellTeacher(e.target.value)}
                    placeholder="np. JKOW, ANOW"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nauczyciel Wspomagający</label>
                  <input 
                    type="text" 
                    value={cellSupportTeacher}
                    onChange={(e) => setCellSupportTeacher(e.target.value)}
                    placeholder="np. KOWW, WSPM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Przedmiot</label>
                  <input 
                    type="text" 
                    value={cellSubject}
                    onChange={(e) => setCellSubject(e.target.value)}
                    placeholder="np. Matematyka"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Uwagi</label>
                  <input 
                    type="text" 
                    value={cellNote}
                    onChange={(e) => setCellNote(e.target.value)}
                    placeholder="np. Lekcja łączona"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button 
                  type="button" 
                  onClick={handleClearCell}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 cursor-pointer"
                >
                  Wyczyść
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingCell(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

      </div>
    </DndContext>
  );
}

const BUILDING_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
