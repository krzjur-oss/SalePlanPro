/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Porównywarki Wariantów Planu (variantDiffService.ts) (Module 4)
 * Opis: Obliczanie dokładnych różnic, detekcja kolizji przy synchronizacji,
 *       zestawienia KPI oraz eksport raportu diff do arkusza Excel (.xlsx).
 */

import * as XLSX from 'xlsx';
import { AppState, PlanVariant, Lesson, SchedCell } from '../types';
import { 
  DetailedDiffItem, 
  DiffSummaryKPI, 
  DiffSlotItem, 
  VariantComparisonState 
} from '../types/variantDiff';

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export interface LookupCaches {
  classesMap: Map<string, any>;
  teachersMap: Map<string, any>;
  subjectsMap: Map<string, any>;
  roomsMap: Map<string, any>;
  groupsMap: Map<string, any>;
  placesMap: Map<string, any>;
}

export function buildLookupCaches(appState: AppState): LookupCaches {
  const pl = appState.planLekcji;
  return {
    classesMap: new Map(pl.classes.map(c => [c.id, c])),
    teachersMap: new Map(pl.teachers.map(t => [t.id, t])),
    subjectsMap: new Map(pl.subjects.map(s => [s.id, s])),
    roomsMap: new Map(pl.rooms.map(r => [r.id, r])),
    groupsMap: new Map((pl.schoolGroups || []).map(g => [g.id, g])),
    placesMap: new Map((appState.dyzury?.miejsca || []).map(p => [p.id, p]))
  };
}

/**
 * Zwraca reprezentację lekcji w postaci zunifikowanego DiffSlotItem
 */
export function extractSlotItem(
  lesson: Lesson | undefined,
  variant: PlanVariant | undefined,
  appState: AppState,
  lookups: LookupCaches
): DiffSlotItem | null {
  if (!lesson) return null;

  const assignments = variant?.data.assignments && variant.data.assignments.length > 0 
    ? variant.data.assignments 
    : appState.planLekcji.assignments;

  const asg = assignments.find(a => a.id === lesson.assignmentId);
  if (!asg) {
    return {
      subject: 'Lekcja nieprzypisana',
      lesson
    };
  }

  const subj = lookups.subjectsMap.get(asg.subjectId);
  const teacher = asg.teacherId ? lookups.teachersMap.get(asg.teacherId) : null;
  const room = asg.roomId ? lookups.roomsMap.get(asg.roomId) : null;
  const cls = lookups.classesMap.get(asg.classId);

  return {
    subject: subj?.name || 'Przedmiot',
    subjectColor: subj?.color,
    teacher: teacher ? `${teacher.last} ${teacher.first}` : undefined,
    teacherAbbr: teacher?.abbr,
    teacherId: asg.teacherId || undefined,
    room: room?.name,
    roomId: asg.roomId || undefined,
    className: cls?.name,
    classId: asg.classId,
    lesson
  };
}

/**
 * Sprawdza czy dwa sloty lekcyjne są w 100% identyczne pod kątem przedmiotu, nauczyciela i sali
 */
export function areSlotsEquivalent(a: DiffSlotItem | null, b: DiffSlotItem | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.subject === b.subject &&
    a.teacherAbbr === b.teacherAbbr &&
    a.room === b.room &&
    a.lesson?.supportTeacherId === b.lesson?.supportTeacherId
  );
}

/**
 * Wykrywanie kolizji przy próbie przeniesienia lekcji do wariantu docelowego
 */
export function checkSlotCollision(
  targetVariant: PlanVariant,
  sourceSlot: DiffSlotItem,
  dayIdx: number,
  hourIdx: number,
  appState: AppState,
  lookups: LookupCaches
): { hasCollision: boolean; reason?: string } {
  if (!sourceSlot) return { hasCollision: false };

  const assignments = targetVariant.data.assignments || appState.planLekcji.assignments;
  const lessons = targetVariant.data.lessons || {};

  // Sprawdź czy nauczyciel nie ma już innej lekcji w tym samym czasie
  if (sourceSlot.teacherId) {
    for (const [key, les] of Object.entries(lessons)) {
      const parts = key.split('|');
      const lClassId = parts[0];
      const lDay = parseInt(parts[1], 10);
      const lHour = parseInt(parts[2], 10);

      // Jeśli to inna klasa w tym samym slocie
      if (lDay === dayIdx && lHour === hourIdx && lClassId !== sourceSlot.classId) {
        const asg = assignments.find(a => a.id === les.assignmentId);
        if (asg && asg.teacherId === sourceSlot.teacherId) {
          const conflictClass = lookups.classesMap.get(lClassId)?.name || lClassId;
          return {
            hasCollision: true,
            reason: `Kolizja nauczyciela: ${sourceSlot.teacherAbbr || 'Nauczyciel'} prowadzi już zajęcia w klasie ${conflictClass}`
          };
        }
      }
    }
  }

  // Sprawdź czy sala nie jest już zajęta w tym samym czasie
  if (sourceSlot.roomId) {
    for (const [key, les] of Object.entries(lessons)) {
      const parts = key.split('|');
      const lClassId = parts[0];
      const lDay = parseInt(parts[1], 10);
      const lHour = parseInt(parts[2], 10);

      if (lDay === dayIdx && lHour === hourIdx && lClassId !== sourceSlot.classId) {
        const asg = assignments.find(a => a.id === les.assignmentId);
        if (asg && asg.roomId === sourceSlot.roomId) {
          const conflictClass = lookups.classesMap.get(lClassId)?.name || lClassId;
          return {
            hasCollision: true,
            reason: `Kolizja sali: Gabinet ${sourceSlot.room || ''} jest już zajęty przez klasę ${conflictClass}`
          };
        }
      }
    }
  }

  return { hasCollision: false };
}

/**
 * Wyszukiwanie lekcji w lessons wariantu z obsługą kluczy 0-indeksowanych i 1-indeksowanych
 */
export function findLessonInLessons(
  lessons: Record<string, Lesson> | undefined,
  classId: string,
  dayIdx: number,
  hourIdx: number,
  hourNum?: number
): Lesson | undefined {
  if (!lessons) return undefined;
  // 1. Sprawdź standardowy klucz 0-indeksowany
  const keyIdx = `${classId}|${dayIdx}|${hourIdx}`;
  if (lessons[keyIdx]) return lessons[keyIdx];

  // 2. Sprawdź klucz z podziałem na grupy
  const prefixIdx = `${classId}|${dayIdx}|${hourIdx}|`;
  for (const [k, v] of Object.entries(lessons)) {
    if (k.startsWith(prefixIdx)) return v;
  }

  // 3. Fallback do 1-indeksowanego numeru lekcji, jeśli nie znaleziono
  if (hourNum !== undefined && hourNum !== hourIdx) {
    const keyNum = `${classId}|${dayIdx}|${hourNum}`;
    if (lessons[keyNum]) return lessons[keyNum];

    const prefixNum = `${classId}|${dayIdx}|${hourNum}|`;
    for (const [k, v] of Object.entries(lessons)) {
      if (k.startsWith(prefixNum)) return v;
    }
  }

  return undefined;
}

/**
 * Obliczenie różnic dla wszystkich klas pomiędzy dwoma wariantami
 */
export function computeClassDiffs(
  appState: AppState,
  variantA: PlanVariant,
  variantB: PlanVariant,
  specificClassId?: string
): DetailedDiffItem[] {
  const pl = appState.planLekcji;
  const lookups = buildLookupCaches(appState);
  const results: DetailedDiffItem[] = [];

  const classesToProcess = specificClassId 
    ? pl.classes.filter(c => c.id === specificClassId)
    : pl.classes;

  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  classesToProcess.forEach(cls => {
    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        const slotNum = h.num ?? (hIdx + 1);
        const timeRange = `${h.start} - ${h.end}`;

        const lesA = findLessonInLessons(variantA.data.lessons, cls.id, dayIdx, hIdx, slotNum);
        const lesB = findLessonInLessons(variantB.data.lessons, cls.id, dayIdx, hIdx, slotNum);

        const itemA = extractSlotItem(lesA, variantA, appState, lookups);
        const itemB = extractSlotItem(lesB, variantB, appState, lookups);

        if (areSlotsEquivalent(itemA, itemB)) {
          return; // brak różnicy w tym slocie
        }

        let status: DetailedDiffItem['status'] = 'changed';

        if (!itemA && itemB) {
          status = 'added';
        } else if (itemA && !itemB) {
          status = 'removed';
        } else if (itemA && itemB) {
          const subDiff = itemA.subject !== itemB.subject;
          const tchDiff = itemA.teacherAbbr !== itemB.teacherAbbr;
          const roomDiff = itemA.room !== itemB.room;

          if (subDiff) {
            status = 'changed';
          } else if (tchDiff && !roomDiff) {
            status = 'teacher_changed';
          } else if (roomDiff && !tchDiff) {
            status = 'room_changed';
          } else {
            status = 'changed';
          }
        }

        // Sprawdź ryzyko kolizji przy ewentualnym transferze z B do A
        const colCheck = itemB ? checkSlotCollision(variantA, itemB, dayIdx, hIdx, appState, lookups) : { hasCollision: false };

        results.push({
          id: `class_${cls.id}_${dayIdx}_${hIdx}`,
          scope: 'class',
          entityId: cls.id,
          entityName: `Klasa ${cls.name}`,
          dayIdx,
          dayName,
          hourIdx: hIdx,
          hourNum: slotNum,
          timeRange,
          status,
          itemA,
          itemB,
          collisionRisk: colCheck.hasCollision,
          collisionReason: colCheck.reason
        });
      });
    });
  });

  return results;
}

/**
 * Obliczenie różnic dla nauczycieli pomiędzy dwoma wariantami
 */
export function computeTeacherDiffs(
  appState: AppState,
  variantA: PlanVariant,
  variantB: PlanVariant,
  specificTeacherId?: string
): DetailedDiffItem[] {
  const pl = appState.planLekcji;
  const lookups = buildLookupCaches(appState);
  const results: DetailedDiffItem[] = [];

  const teachersToProcess = specificTeacherId
    ? pl.teachers.filter(t => t.id === specificTeacherId)
    : pl.teachers;

  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const asgsA = variantA.data.assignments || pl.assignments;
  const asgsB = variantB.data.assignments || pl.assignments;

  teachersToProcess.forEach(teacher => {
    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        const slotNum = h.num ?? (hIdx + 1);
        const timeRange = `${h.start} - ${h.end}`;

        // Znajdź lekcję w wariancie A
        let itemA: DiffSlotItem | null = null;
        Object.entries(variantA.data.lessons || {}).forEach(([key, les]) => {
          const parts = key.split('|');
          const lDay = parseInt(parts[1], 10);
          const lHour = parseInt(parts[2], 10);
          if (lDay === dayIdx && (lHour === hIdx || lHour === slotNum)) {
            const asg = asgsA.find(a => a.id === les.assignmentId);
            if (asg && asg.teacherId === teacher.id) {
              itemA = extractSlotItem(les, variantA, appState, lookups);
            }
          }
        });

        // Znajdź lekcję w wariancie B
        let itemB: DiffSlotItem | null = null;
        Object.entries(variantB.data.lessons || {}).forEach(([key, les]) => {
          const parts = key.split('|');
          const lDay = parseInt(parts[1], 10);
          const lHour = parseInt(parts[2], 10);
          if (lDay === dayIdx && (lHour === hIdx || lHour === slotNum)) {
            const asg = asgsB.find(a => a.id === les.assignmentId);
            if (asg && asg.teacherId === teacher.id) {
              itemB = extractSlotItem(les, variantB, appState, lookups);
            }
          }
        });

        if (areSlotsEquivalent(itemA, itemB)) {
          return;
        }

        let status: DetailedDiffItem['status'] = 'changed';
        const slotA = itemA as DiffSlotItem | null;
        const slotB = itemB as DiffSlotItem | null;

        if (!slotA && slotB) {
          status = 'added';
        } else if (slotA && !slotB) {
          status = 'removed';
        } else if (slotA && slotB) {
          if (slotA.room !== slotB.room && slotA.className === slotB.className) {
            status = 'room_changed';
          }
        }

        results.push({
          id: `teacher_${teacher.id}_${dayIdx}_${hIdx}`,
          scope: 'teacher',
          entityId: teacher.id,
          entityName: `${teacher.last} ${teacher.first} (${teacher.abbr})`,
          dayIdx,
          dayName,
          hourIdx: hIdx,
          hourNum: slotNum,
          timeRange,
          status,
          itemA,
          itemB
        });
      });
    });
  });

  return results;
}

/**
 * Obliczenie różnic dla sal / gabinetów lekcyjnych
 */
export function computeRoomDiffs(
  appState: AppState,
  variantA: PlanVariant,
  variantB: PlanVariant,
  specificRoomId?: string
): DetailedDiffItem[] {
  const pl = appState.planLekcji;
  const lookups = buildLookupCaches(appState);
  const results: DetailedDiffItem[] = [];

  const roomsToProcess = specificRoomId
    ? pl.rooms.filter(r => r.id === specificRoomId)
    : pl.rooms;

  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const asgsA = variantA.data.assignments || pl.assignments;
  const asgsB = variantB.data.assignments || pl.assignments;

  roomsToProcess.forEach(room => {
    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        const slotNum = h.num ?? (hIdx + 1);
        const timeRange = `${h.start} - ${h.end}`;

        let itemA: DiffSlotItem | null = null;
        Object.entries(variantA.data.lessons || {}).forEach(([key, les]) => {
          const parts = key.split('|');
          const lDay = parseInt(parts[1], 10);
          const lHour = parseInt(parts[2], 10);
          if (lDay === dayIdx && (lHour === hIdx || lHour === slotNum)) {
            const asg = asgsA.find(a => a.id === les.assignmentId);
            if (asg && asg.roomId === room.id) {
              itemA = extractSlotItem(les, variantA, appState, lookups);
            }
          }
        });

        let itemB: DiffSlotItem | null = null;
        Object.entries(variantB.data.lessons || {}).forEach(([key, les]) => {
          const parts = key.split('|');
          const lDay = parseInt(parts[1], 10);
          const lHour = parseInt(parts[2], 10);
          if (lDay === dayIdx && (lHour === hIdx || lHour === slotNum)) {
            const asg = asgsB.find(a => a.id === les.assignmentId);
            if (asg && asg.roomId === room.id) {
              itemB = extractSlotItem(les, variantB, appState, lookups);
            }
          }
        });

        if (areSlotsEquivalent(itemA, itemB)) {
          return;
        }

        let status: DetailedDiffItem['status'] = 'changed';
        const slotA = itemA as DiffSlotItem | null;
        const slotB = itemB as DiffSlotItem | null;

        if (!slotA && slotB) {
          status = 'added';
        } else if (slotA && !slotB) {
          status = 'removed';
        } else if (slotA && slotB) {
          if (slotA.teacherAbbr !== slotB.teacherAbbr) status = 'teacher_changed';
        }

        results.push({
          id: `room_${room.id}_${dayIdx}_${hIdx}`,
          scope: 'room',
          entityId: room.id,
          entityName: room.name.startsWith('Sala') ? room.name : `Sala ${room.name}`,
          dayIdx,
          dayName,
          hourIdx: hIdx,
          hourNum: slotNum,
          timeRange,
          status,
          itemA,
          itemB
        });
      });
    });
  });

  return results;
}

/**
 * Obliczenie różnic w dyżurach nauczycielskich pomiędzy wariantami
 */
export function computeDutyDiffs(
  appState: AppState,
  variantA: PlanVariant,
  variantB: PlanVariant
): DetailedDiffItem[] {
  const places = appState.dyzury?.miejsca || [];
  const breaks = appState.dyzury?.przerwy || [];
  const harmonogramA = variantA.data.dyzury || appState.dyzury?.harmonogram || {};
  const harmonogramB = variantB.data.dyzury || appState.dyzury?.harmonogram || {};
  const lookups = buildLookupCaches(appState);
  const results: DetailedDiffItem[] = [];

  places.forEach(place => {
    DAYS_NAMES.forEach((dayName, dayIdx) => {
      breaks.forEach((p, pIdx) => {
        const dutyKey = `${place.id}|${dayIdx}|${p.num}`;
        const entryA = harmonogramA[dutyKey];
        const entryB = harmonogramB[dutyKey];

        const isSame = (
          (!entryA && !entryB) ||
          (entryA && entryB && entryA.teacherAbbr === entryB.teacherAbbr && entryA.isUnneeded === entryB.isUnneeded)
        );

        if (isSame) return;

        const teacherA = entryA?.teacherAbbr 
          ? (lookups.teachersMap.get(entryA.teacherAbbr) || Array.from(lookups.teachersMap.values()).find((t: any) => t.abbr === entryA.teacherAbbr))
          : null;
        const teacherB = entryB?.teacherAbbr 
          ? (lookups.teachersMap.get(entryB.teacherAbbr) || Array.from(lookups.teachersMap.values()).find((t: any) => t.abbr === entryB.teacherAbbr))
          : null;

        const itemA: DiffSlotItem | null = entryA ? {
          teacher: teacherA ? `${teacherA.last} ${teacherA.first}` : undefined,
          teacherAbbr: entryA.teacherAbbr,
          note: entryA.note,
          isUnneeded: entryA.isUnneeded
        } : null;

        const itemB: DiffSlotItem | null = entryB ? {
          teacher: teacherB ? `${teacherB.last} ${teacherB.first}` : undefined,
          teacherAbbr: entryB.teacherAbbr,
          note: entryB.note,
          isUnneeded: entryB.isUnneeded
        } : null;

        results.push({
          id: `duty_${place.id}_${dayIdx}_${p.num}`,
          scope: 'duty',
          entityId: place.id,
          entityName: `${place.name}${place.floor ? ` (${place.floor})` : ''}`,
          dayIdx,
          dayName,
          hourIdx: pIdx,
          hourNum: p.num,
          timeRange: `${p.start} - ${p.end}`,
          status: 'duty_changed',
          itemA,
          itemB
        });
      });
    });
  });

  return results;
}

/**
 * Główna funkcja agregująca wszystkie różnice i wskaźniki KPI
 */
export function computeAllDiffs(
  appState: AppState,
  variantA: PlanVariant | null,
  variantB: PlanVariant | null
): { items: DetailedDiffItem[]; kpi: DiffSummaryKPI } {
  if (!variantA || !variantB) {
    return {
      items: [],
      kpi: {
        totalChanges: 0,
        addedCount: 0,
        removedCount: 0,
        roomChangedCount: 0,
        teacherChangedCount: 0,
        dutyChangedCount: 0,
        affectedClassesCount: 0,
        affectedTeachersCount: 0,
        affectedRoomsCount: 0,
        potentialCollisionsCount: 0
      }
    };
  }

  const classDiffs = computeClassDiffs(appState, variantA, variantB);
  const teacherDiffs = computeTeacherDiffs(appState, variantA, variantB);
  const roomDiffs = computeRoomDiffs(appState, variantA, variantB);
  const dutyDiffs = computeDutyDiffs(appState, variantA, variantB);

  const allItems = [...classDiffs, ...dutyDiffs];

  const affectedClasses = new Set<string>();
  const affectedTeachers = new Set<string>();
  const affectedRooms = new Set<string>();
  let addedCount = 0;
  let removedCount = 0;
  let roomChangedCount = 0;
  let teacherChangedCount = 0;
  let dutyChangedCount = 0;
  let potentialCollisionsCount = 0;

  classDiffs.forEach(item => {
    affectedClasses.add(item.entityId);
    if (item.status === 'added') addedCount++;
    else if (item.status === 'removed') removedCount++;
    else if (item.status === 'room_changed') roomChangedCount++;
    else if (item.status === 'teacher_changed') teacherChangedCount++;

    if (item.itemA?.teacherAbbr) affectedTeachers.add(item.itemA.teacherAbbr);
    if (item.itemB?.teacherAbbr) affectedTeachers.add(item.itemB.teacherAbbr);
    if (item.itemA?.room) affectedRooms.add(item.itemA.room);
    if (item.itemB?.room) affectedRooms.add(item.itemB.room);

    if (item.collisionRisk) potentialCollisionsCount++;
  });

  dutyDiffs.forEach(() => {
    dutyChangedCount++;
  });

  teacherDiffs.forEach(item => {
    affectedTeachers.add(item.entityId);
  });

  roomDiffs.forEach(item => {
    affectedRooms.add(item.entityId);
  });

  const kpi: DiffSummaryKPI = {
    totalChanges: allItems.length,
    addedCount,
    removedCount,
    roomChangedCount,
    teacherChangedCount,
    dutyChangedCount,
    affectedClassesCount: affectedClasses.size,
    affectedTeachersCount: affectedTeachers.size,
    affectedRoomsCount: affectedRooms.size,
    potentialCollisionsCount
  };

  return { items: allItems, kpi };
}

/**
 * Kopiowanie lub usuwanie slotu w wariancie (Cherry-Pick / Sync)
 */
export function applySlotTransfer(
  targetVariant: PlanVariant,
  sourceLesson: Lesson | undefined,
  classId: string,
  dayIdx: number,
  hourIdx: number
): PlanVariant {
  const updatedVariant = JSON.parse(JSON.stringify(targetVariant)) as PlanVariant;
  const keyIdx = `${classId}|${dayIdx}|${hourIdx}`;
  const keyNum = `${classId}|${dayIdx}|${hourIdx + 1}`;

  // Usuń oba formaty klucza przed zapisem
  delete updatedVariant.data.lessons[keyIdx];
  delete updatedVariant.data.lessons[keyNum];

  if (sourceLesson) {
    // Przypisanie skopiowanej lekcji na standardowy klucz
    updatedVariant.data.lessons[keyIdx] = {
      assignmentId: sourceLesson.assignmentId,
      locked: false,
      supportTeacherId: sourceLesson.supportTeacherId
    };
  }

  updatedVariant.updatedAt = new Date().toISOString();
  return updatedVariant;
}

/**
 * Eksport raportu różnic pomiędzy wariantami do arkusza Excel (.xlsx)
 */
export function exportDiffToExcel(
  comparison: VariantComparisonState,
  appState: AppState
): void {
  const { variantA, variantB, diffItems, kpi } = comparison;
  if (!variantA || !variantB) return;

  const wb = XLSX.utils.book_new();

  // 1. Arkusz Podsumowania KPI
  const kpiRows: (string | number)[][] = [
    [`RAPORT PORÓWNANIA WARIANTÓW PLANU LEKCJI (SPLIT-SCREEN DIFF)`],
    [`Szkoła: ${appState.school?.name || appState.planLekcji?.meta?.schoolName || 'SZKOŁA'}`, `Data generacji: ${new Date().toLocaleDateString('pl-PL')}`],
    [`Wariant A (Wzorzec): ${variantA.name} (${variantA.tag})`],
    [`Wariant B (Porównywany): ${variantB.name} (${variantB.tag})`],
    [],
    ['WSKAŹNIKI KLUCZOWE (KPI)', 'WARTOŚĆ'],
    ['Łączna liczba wykrytych odchyleń', kpi.totalChanges],
    ['Nowe lekcje dodane w Wariancie B', kpi.addedCount],
    ['Lekcje usunięte w Wariancie B (okienka)', kpi.removedCount],
    ['Przesunięcia sal / gabinetów', kpi.roomChangedCount],
    ['Zmiany obsady nauczycieli', kpi.teacherChangedCount],
    ['Modyfikacje w dyżurach nauczycielskich', kpi.dutyChangedCount],
    ['Liczba oddziałów ze zmianami', kpi.affectedClassesCount],
    ['Liczba nauczycieli ze zmianami', kpi.affectedTeachersCount],
    ['Liczba sal objętych zmianami', kpi.affectedRoomsCount],
    ['Zidentyfikowane potencjalne ryzyka kolizji', kpi.potentialCollisionsCount]
  ];
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Podsumowanie_KPI');

  // 2. Arkusz Wykazu Zbiorczego Różnic
  const diffRows: (string | number)[][] = [
    ['Lp.', 'Zakres', 'Oddział / Strefa', 'Dzień', 'Lekcja', 'Godziny', 'Rodzaj zmiany', 'Wariant A (Wzorzec)', 'Wariant B (Porównywany)', 'Ryzyko kolizji']
  ];

  diffItems.forEach((item, idx) => {
    const textA = item.itemA 
      ? `${item.itemA.subject || 'Lekcja'} (${item.itemA.teacherAbbr || ''}${item.itemA.room ? `, s. ${item.itemA.room}` : ''})`
      : 'Brak (okienko)';

    const textB = item.itemB
      ? `${item.itemB.subject || 'Lekcja'} (${item.itemB.teacherAbbr || ''}${item.itemB.room ? `, s. ${item.itemB.room}` : ''})`
      : 'Brak (okienko)';

    let statusLabel = 'Zmiana';
    if (item.status === 'added') statusLabel = '+ Dodana lekcja';
    else if (item.status === 'removed') statusLabel = '- Usunięta lekcja';
    else if (item.status === 'room_changed') statusLabel = 'Zmiana sali';
    else if (item.status === 'teacher_changed') statusLabel = 'Zmiana nauczyciela';
    else if (item.status === 'duty_changed') statusLabel = 'Zmiana dyżuru';

    diffRows.push([
      idx + 1,
      item.scope === 'class' ? 'Klasa' : 'Dyżur',
      item.entityName,
      item.dayName,
      `Lekcja ${item.hourNum}`,
      item.timeRange,
      statusLabel,
      textA,
      textB,
      item.collisionRisk ? `⚠️ ${item.collisionReason || 'Kolizja'}` : 'Brak'
    ]);
  });

  const wsDiff = XLSX.utils.aoa_to_sheet(diffRows);
  XLSX.utils.book_append_sheet(wb, wsDiff, 'Wykaz_Roznic');

  const fileName = `Raport_Diff_${variantA.name}_vs_${variantB.name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
