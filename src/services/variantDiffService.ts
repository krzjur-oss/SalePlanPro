/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Porównywarki Wariantów Planu (variantDiffService.ts) (Module 4)
 * Opis: Obliczanie dokładnych różnic, detekcja kolizji przy synchronizacji,
 *       zestawienia KPI oraz eksport raportu diff do arkusza Excel (.xlsx).
 */

import * as XLSX from 'xlsx';
import { AppState, PlanVariant, Lesson, Assignment, SchedCell } from '../types';
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
  lookups: LookupCaches,
  lessonKey?: string
): DiffSlotItem | null {
  if (!lesson) return null;

  const assignments = variant?.data.assignments && variant.data.assignments.length > 0 
    ? variant.data.assignments 
    : appState.planLekcji.assignments;

  const asg = assignments.find(a => a.id === lesson.assignmentId);
  if (!asg) {
    return {
      subject: 'Lekcja nieprzypisana',
      lesson,
      lessonKey
    };
  }

  const subj = lookups.subjectsMap.get(asg.subjectId);
  const teacher = asg.teacherId ? lookups.teachersMap.get(asg.teacherId) : null;
  const room = asg.roomId ? lookups.roomsMap.get(asg.roomId) : null;
  const cls = lookups.classesMap.get(asg.classId);

  // Group lookup
  const groupId = asg.groupId || (lessonKey && lessonKey.split('|').length > 3 ? lessonKey.split('|')[3] : undefined);
  const groupObj = groupId ? lookups.groupsMap.get(groupId) : undefined;
  const groupName = groupObj?.name || groupId;

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
    groupId: groupId || undefined,
    groupName: groupName || undefined,
    group: groupName || groupId || undefined,
    lesson,
    lessonKey
  };
}

/**
 * Sprawdza czy dwa sloty lekcyjne są w 100% identyczne pod kątem przedmiotu, nauczyciela, sali, klasy i grupy
 */
export function areSlotsEquivalent(a: DiffSlotItem | null, b: DiffSlotItem | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const groupA = a.groupId || a.groupName || a.group || '';
  const groupB = b.groupId || b.groupName || b.group || '';

  return (
    a.subject === b.subject &&
    a.teacherAbbr === b.teacherAbbr &&
    a.room === b.room &&
    a.classId === b.classId &&
    groupA === groupB &&
    a.lesson?.supportTeacherId === b.lesson?.supportTeacherId
  );
}

/**
 * Sprawdza czy dwie listy slotów w tej samej komórce planu są równoważne (np. wiele podgrup)
 */
export function areSlotItemListsEquivalent(
  listA: DiffSlotItem[] | null | undefined,
  listB: DiffSlotItem[] | null | undefined
): boolean {
  const arrA = listA || [];
  const arrB = listB || [];
  if (arrA.length === 0 && arrB.length === 0) return true;
  if (arrA.length !== arrB.length) return false;

  const matchedIndicesB = new Set<number>();
  for (const itemA of arrA) {
    let foundIndex = -1;
    for (let i = 0; i < arrB.length; i++) {
      if (!matchedIndicesB.has(i) && areSlotsEquivalent(itemA, arrB[i])) {
        foundIndex = i;
        break;
      }
    }
    if (foundIndex === -1) return false;
    matchedIndicesB.add(foundIndex);
  }
  return true;
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

export function findLessonKeyInLessons(
  lessons: Record<string, Lesson> | undefined,
  classId: string,
  dayIdx: number,
  hourIdx: number,
  hourNum?: number
): string | undefined {
  if (!lessons) return undefined;
  const keyIdx = `${classId}|${dayIdx}|${hourIdx}`;
  if (lessons[keyIdx]) return keyIdx;

  const prefixIdx = `${classId}|${dayIdx}|${hourIdx}|`;
  for (const k of Object.keys(lessons)) {
    if (k.startsWith(prefixIdx)) return k;
  }

  if (hourNum !== undefined && hourNum !== hourIdx) {
    const keyNum = `${classId}|${dayIdx}|${hourNum}`;
    if (lessons[keyNum]) return keyNum;

    const prefixNum = `${classId}|${dayIdx}|${hourNum}|`;
    for (const k of Object.keys(lessons)) {
      if (k.startsWith(prefixNum)) return k;
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

        const keyA = findLessonKeyInLessons(variantA.data.lessons, cls.id, dayIdx, hIdx, slotNum);
        const keyB = findLessonKeyInLessons(variantB.data.lessons, cls.id, dayIdx, hIdx, slotNum);

        const lesA = findLessonInLessons(variantA.data.lessons, cls.id, dayIdx, hIdx, slotNum);
        const lesB = findLessonInLessons(variantB.data.lessons, cls.id, dayIdx, hIdx, slotNum);

        const itemA = extractSlotItem(lesA, variantA, appState, lookups, keyA);
        const itemB = extractSlotItem(lesB, variantB, appState, lookups, keyB);

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
 * Buduje zindeksowaną mapę lekcji dla nauczyciela: klucz to `${dayIdx}|${hourIdx}` -> lista DiffSlotItem[]
 * Obsługuje wiele lekcji w jednym slocie (podział na grupy / zajęcia łączone).
 */
export function buildTeacherLessonsBySlot(
  variant: PlanVariant | undefined,
  teacherId: string,
  appState: AppState,
  lookups: LookupCaches,
  hours?: { num?: number; start?: string; end?: string }[]
): Map<string, DiffSlotItem[]> {
  const map = new Map<string, DiffSlotItem[]>();
  if (!variant?.data?.lessons) return map;

  const asgs = variant.data.assignments && variant.data.assignments.length > 0
    ? variant.data.assignments
    : appState.planLekcji.assignments;
  const asgsMap = new Map(asgs.map(a => [a.id, a]));
  const hoursList = hours && hours.length > 0 ? hours : (appState.planLekcji.hours || []);

  const allKeys = Object.keys(variant.data.lessons);
  const hasZeroHourKey = allKeys.some(k => {
    const p = k.split('|');
    return p.length >= 3 && p[2] === '0';
  });

  for (const [key, les] of Object.entries(variant.data.lessons)) {
    const asg = asgsMap.get(les.assignmentId);
    if (!asg || asg.teacherId !== teacherId) continue;

    const parts = key.split('|');
    if (parts.length < 3) continue;
    const dayIdx = parseInt(parts[1], 10);
    const hourRaw = parseInt(parts[2], 10);

    let hIdx = hourRaw;
    if (!hasZeroHourKey && hourRaw > 0) {
      const foundIdx = hoursList.findIndex((h, idx) => (h.num ?? (idx + 1)) === hourRaw);
      if (foundIdx !== -1) {
        hIdx = foundIdx;
      } else {
        hIdx = hourRaw - 1;
      }
    }

    const item = extractSlotItem(les, variant, appState, lookups, key);
    if (!item) continue;

    const slotKey = `${dayIdx}|${hIdx}`;
    const list = map.get(slotKey) || [];
    list.push(item);
    map.set(slotKey, list);
  }

  return map;
}

/**
 * Buduje zindeksowaną mapę lekcji dla sali: klucz to `${dayIdx}|${hourIdx}` -> lista DiffSlotItem[]
 * Obsługuje wiele lekcji w jednym slocie (grupy współdzielące salę).
 */
export function buildRoomLessonsBySlot(
  variant: PlanVariant | undefined,
  roomId: string,
  appState: AppState,
  lookups: LookupCaches,
  hours?: { num?: number; start?: string; end?: string }[]
): Map<string, DiffSlotItem[]> {
  const map = new Map<string, DiffSlotItem[]>();
  if (!variant?.data?.lessons) return map;

  const asgs = variant.data.assignments && variant.data.assignments.length > 0
    ? variant.data.assignments
    : appState.planLekcji.assignments;
  const asgsMap = new Map(asgs.map(a => [a.id, a]));
  const hoursList = hours && hours.length > 0 ? hours : (appState.planLekcji.hours || []);

  const allKeys = Object.keys(variant.data.lessons);
  const hasZeroHourKey = allKeys.some(k => {
    const p = k.split('|');
    return p.length >= 3 && p[2] === '0';
  });

  for (const [key, les] of Object.entries(variant.data.lessons)) {
    const asg = asgsMap.get(les.assignmentId);
    if (!asg || asg.roomId !== roomId) continue;

    const parts = key.split('|');
    if (parts.length < 3) continue;
    const dayIdx = parseInt(parts[1], 10);
    const hourRaw = parseInt(parts[2], 10);

    let hIdx = hourRaw;
    if (!hasZeroHourKey && hourRaw > 0) {
      const foundIdx = hoursList.findIndex((h, idx) => (h.num ?? (idx + 1)) === hourRaw);
      if (foundIdx !== -1) {
        hIdx = foundIdx;
      } else {
        hIdx = hourRaw - 1;
      }
    }

    const item = extractSlotItem(les, variant, appState, lookups, key);
    if (!item) continue;

    const slotKey = `${dayIdx}|${hIdx}`;
    const list = map.get(slotKey) || [];
    list.push(item);
    map.set(slotKey, list);
  }

  return map;
}

/**
 * Buduje zindeksowaną mapę lekcji dla klasy: klucz to `${dayIdx}|${hourIdx}` -> lista DiffSlotItem[]
 * Obsługuje wiele lekcji w jednym slocie (podział na grupy językowe/ćwiczeniowe).
 */
export function buildClassLessonsBySlot(
  variant: PlanVariant | undefined,
  classId: string,
  appState: AppState,
  lookups: LookupCaches,
  hours?: { num?: number; start?: string; end?: string }[]
): Map<string, DiffSlotItem[]> {
  const map = new Map<string, DiffSlotItem[]>();
  if (!variant?.data?.lessons) return map;

  const hoursList = hours && hours.length > 0 ? hours : (appState.planLekcji.hours || []);
  const allKeys = Object.keys(variant.data.lessons);
  const hasZeroHourKey = allKeys.some(k => {
    const p = k.split('|');
    return p.length >= 3 && p[2] === '0';
  });

  for (const [key, les] of Object.entries(variant.data.lessons)) {
    const parts = key.split('|');
    if (parts.length < 3 || parts[0] !== classId) continue;
    const dayIdx = parseInt(parts[1], 10);
    const hourRaw = parseInt(parts[2], 10);

    let hIdx = hourRaw;
    if (!hasZeroHourKey && hourRaw > 0) {
      const foundIdx = hoursList.findIndex((h, idx) => (h.num ?? (idx + 1)) === hourRaw);
      if (foundIdx !== -1) {
        hIdx = foundIdx;
      } else {
        hIdx = hourRaw - 1;
      }
    }

    const item = extractSlotItem(les, variant, appState, lookups, key);
    if (!item) continue;

    const slotKey = `${dayIdx}|${hIdx}`;
    const list = map.get(slotKey) || [];
    list.push(item);
    map.set(slotKey, list);
  }

  return map;
}

/**
 * Obliczenie różnic dla nauczycieli pomiędzy dwoma wariantami z wykorzystaniem zindeksowanych map
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

  teachersToProcess.forEach(teacher => {
    // Budujemy raz indeks lekcji dla nauczyciela
    const lessonsBySlotA = buildTeacherLessonsBySlot(variantA, teacher.id, appState, lookups, hours);
    const lessonsBySlotB = buildTeacherLessonsBySlot(variantB, teacher.id, appState, lookups, hours);

    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        const slotKey = `${dayIdx}|${hIdx}`;
        const itemsA = lessonsBySlotA.get(slotKey) || [];
        const itemsB = lessonsBySlotB.get(slotKey) || [];

        if (areSlotItemListsEquivalent(itemsA, itemsB)) {
          return;
        }

        const slotNum = h.num ?? (hIdx + 1);
        const timeRange = `${h.start} - ${h.end}`;

        if (itemsA.length <= 1 && itemsB.length <= 1) {
          const slotA = itemsA[0] || null;
          const slotB = itemsB[0] || null;

          let status: DetailedDiffItem['status'] = 'changed';
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
            itemA: slotA,
            itemB: slotB
          });
        } else {
          // Obsługa wielu lekcji w slocie (np. podgrupy)
          const maxLen = Math.max(itemsA.length, itemsB.length);
          for (let i = 0; i < maxLen; i++) {
            const slotA = itemsA[i] || null;
            const slotB = itemsB[i] || null;

            if (areSlotsEquivalent(slotA, slotB)) continue;

            let status: DetailedDiffItem['status'] = 'changed';
            if (!slotA && slotB) status = 'added';
            else if (slotA && !slotB) status = 'removed';
            else if (slotA && slotB && slotA.room !== slotB.room && slotA.className === slotB.className) {
              status = 'room_changed';
            }

            const subId = slotA?.groupId || slotB?.groupId || `${i}`;
            results.push({
              id: `teacher_${teacher.id}_${dayIdx}_${hIdx}_${subId}`,
              scope: 'teacher',
              entityId: teacher.id,
              entityName: `${teacher.last} ${teacher.first} (${teacher.abbr})`,
              dayIdx,
              dayName,
              hourIdx: hIdx,
              hourNum: slotNum,
              timeRange,
              status,
              itemA: slotA,
              itemB: slotB
            });
          }
        }
      });
    });
  });

  return results;
}

/**
 * Obliczenie różnic dla sal / gabinetów lekcyjnych z wykorzystaniem zindeksowanych map
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

  roomsToProcess.forEach(room => {
    // Budujemy raz indeks lekcji dla sali
    const lessonsBySlotA = buildRoomLessonsBySlot(variantA, room.id, appState, lookups, hours);
    const lessonsBySlotB = buildRoomLessonsBySlot(variantB, room.id, appState, lookups, hours);

    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        const slotKey = `${dayIdx}|${hIdx}`;
        const itemsA = lessonsBySlotA.get(slotKey) || [];
        const itemsB = lessonsBySlotB.get(slotKey) || [];

        if (areSlotItemListsEquivalent(itemsA, itemsB)) {
          return;
        }

        const slotNum = h.num ?? (hIdx + 1);
        const timeRange = `${h.start} - ${h.end}`;

        if (itemsA.length <= 1 && itemsB.length <= 1) {
          const slotA = itemsA[0] || null;
          const slotB = itemsB[0] || null;

          let status: DetailedDiffItem['status'] = 'changed';
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
            itemA: slotA,
            itemB: slotB
          });
        } else {
          // Obsługa wielu grup w sali
          const maxLen = Math.max(itemsA.length, itemsB.length);
          for (let i = 0; i < maxLen; i++) {
            const slotA = itemsA[i] || null;
            const slotB = itemsB[i] || null;

            if (areSlotsEquivalent(slotA, slotB)) continue;

            let status: DetailedDiffItem['status'] = 'changed';
            if (!slotA && slotB) status = 'added';
            else if (slotA && !slotB) status = 'removed';
            else if (slotA && slotB && slotA.teacherAbbr !== slotB.teacherAbbr) {
              status = 'teacher_changed';
            }

            const subId = slotA?.groupId || slotB?.groupId || `${i}`;
            results.push({
              id: `room_${room.id}_${dayIdx}_${hIdx}_${subId}`,
              scope: 'room',
              entityId: room.id,
              entityName: room.name.startsWith('Sala') ? room.name : `Sala ${room.name}`,
              dayIdx,
              dayName,
              hourIdx: hIdx,
              hourNum: slotNum,
              timeRange,
              status,
              itemA: slotA,
              itemB: slotB
            });
          }
        }
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

    const tA = item.itemA?.teacherId || item.itemA?.teacherAbbr;
    if (tA) affectedTeachers.add(tA);
    const tB = item.itemB?.teacherId || item.itemB?.teacherAbbr;
    if (tB) affectedTeachers.add(tB);
    const rA = item.itemA?.roomId || item.itemA?.room;
    if (rA) affectedRooms.add(rA);
    const rB = item.itemB?.roomId || item.itemB?.room;
    if (rB) affectedRooms.add(rB);

    if (item.collisionRisk) potentialCollisionsCount++;
  });

  dutyDiffs.forEach(() => {
    dutyChangedCount++;
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

export type SlotTransferItem =
  | Lesson
  | { key?: string; lesson: Lesson; assignment?: Assignment }
  | [string, Lesson];

export type SlotTransferSource =
  | Lesson
  | Lesson[]
  | SlotTransferItem[]
  | Record<string, Lesson>
  | string
  | undefined
  | null;

/**
 * Pomocnicze wyszukiwanie definicji przydziału źródłowego
 */
function findSourceAssignment(
  assignmentId: string,
  sourceAssignments?: Assignment[] | PlanVariant | AppState | Record<string, any>
): Assignment | undefined {
  if (!sourceAssignments) return undefined;

  // 1. Tablica przydziałów Assignment[]
  if (Array.isArray(sourceAssignments)) {
    return sourceAssignments.find((a: any) => a && a.id === assignmentId);
  }

  // 2. Obiekt PlanVariant z data.assignments
  if ('data' in sourceAssignments && Array.isArray((sourceAssignments as any).data?.assignments)) {
    return (sourceAssignments as any).data.assignments.find((a: any) => a && a.id === assignmentId);
  }

  // 3. Obiekt AppState z planLekcji.assignments
  if ('planLekcji' in sourceAssignments && Array.isArray((sourceAssignments as any).planLekcji?.assignments)) {
    return (sourceAssignments as any).planLekcji.assignments.find((a: any) => a && a.id === assignmentId);
  }

  // 4. Pojedynczy przydział
  if ((sourceAssignments as any).id === assignmentId) {
    return sourceAssignments as Assignment;
  }

  return undefined;
}

/**
 * Kopiowanie lub usuwanie slotu w wariancie (Cherry-Pick / Sync)
 * 
 * Zasady:
 * - Klucze lekcji są 0-indeksowane: `klasa|dzień|hourIdx` z opcjonalnym sufiksem `|groupId`.
 * - Usuwa wyłącznie klucz `klasa|dzień|hourIdx` oraz klucze zaczynające się od `klasa|dzień|hourIdx|`.
 * - NIE usuwa klucza `hourIdx + 1`.
 * - Przy kopiowaniu zachowuje oryginalny klucz źródłowy (z sufiksem grupy).
 * - Przyjmuje pojedynczą lekcję, klucz źródłowy lub listę lekcji slotu.
 * - Jeśli wariant docelowy ma niepustą listę `assignments` i brakuje w niej przydziału źródłowego,
 *   dołącza kopię przydziału do wariantu docelowego (bez duplikatów).
 */
export function applySlotTransfer(
  targetVariant: PlanVariant,
  sourceLesson: SlotTransferSource,
  classId: string,
  dayIdx: number,
  hourIdx: number,
  sourceKey?: string | string[] | Assignment[] | PlanVariant | AppState,
  sourceAssignments?: Assignment[] | PlanVariant | AppState
): PlanVariant {
  const updatedVariant = JSON.parse(JSON.stringify(targetVariant)) as PlanVariant;
  if (!updatedVariant.data) {
    updatedVariant.data = {} as any;
  }
  if (!updatedVariant.data.lessons) {
    updatedVariant.data.lessons = {};
  }

  // Rozstrzygnięcie parametrów opcjonalnych (sourceKey vs sourceAssignments)
  let resolvedKey: string | string[] | undefined;
  let resolvedAssignments: Assignment[] | PlanVariant | AppState | undefined = sourceAssignments;

  if (typeof sourceKey === 'string' || (Array.isArray(sourceKey) && (sourceKey.length === 0 || typeof sourceKey[0] === 'string'))) {
    resolvedKey = sourceKey as string | string[];
  } else if (sourceKey !== undefined && sourceKey !== null) {
    resolvedAssignments = sourceKey as any;
  }

  // Klucz bazowy dla slotu 0-indeksowanego
  const baseKey = `${classId}|${dayIdx}|${hourIdx}`;
  const groupPrefix = `${baseKey}|`;

  // 1. Usuń wyłącznie klucz `klasa|dzień|hourIdx` oraz klucze zaczynające się od `klasa|dzień|hourIdx|`
  //    (NIE usuwamy klucza `hourIdx + 1`)
  for (const k of Object.keys(updatedVariant.data.lessons)) {
    if (k === baseKey || k.startsWith(groupPrefix)) {
      delete updatedVariant.data.lessons[k];
    }
  }

  // Jeśli brak lekcji do przeniesienia (np. undefined/null), kończymy po wyczyszczeniu slotu
  if (!sourceLesson) {
    updatedVariant.updatedAt = new Date().toISOString();
    return updatedVariant;
  }

  // 2. Normalizacja przekazanego źródła do listy wpisów: { key?: string; lesson: Lesson; assignment?: Assignment }
  interface NormalizedEntry {
    key?: string;
    lesson: Lesson;
    assignment?: Assignment;
  }
  const entriesToAdd: NormalizedEntry[] = [];

  if (Array.isArray(sourceLesson)) {
    sourceLesson.forEach((item) => {
      if (!item) return;
      if (Array.isArray(item)) {
        // [key, lesson]
        if (item[1] && typeof item[1] === 'object' && 'assignmentId' in item[1]) {
          entriesToAdd.push({
            key: typeof item[0] === 'string' ? item[0] : undefined,
            lesson: item[1] as Lesson,
            assignment: (item[1] as any).assignment
          });
        }
      } else if (typeof item === 'object') {
        if ('lesson' in item && item.lesson) {
          // { key?: string; lesson: Lesson; assignment?: Assignment }
          entriesToAdd.push({
            key: (item as any).key,
            lesson: (item as any).lesson,
            assignment: (item as any).assignment
          });
        } else if ('assignmentId' in item) {
          // Pojedynczy Lesson w tablicy
          entriesToAdd.push({
            key: (item as any).key,
            lesson: item as Lesson,
            assignment: (item as any).assignment
          });
        }
      }
    });
  } else if (typeof sourceLesson === 'object') {
    if ('lesson' in sourceLesson && (sourceLesson as any).lesson) {
      // { key?: string; lesson: Lesson; assignment?: Assignment }
      entriesToAdd.push({
        key: (sourceLesson as any).key || (typeof resolvedKey === 'string' ? resolvedKey : undefined),
        lesson: (sourceLesson as any).lesson,
        assignment: (sourceLesson as any).assignment
      });
    } else if ('assignmentId' in sourceLesson) {
      // Pojedyncza lekcja Lesson
      entriesToAdd.push({
        key: (sourceLesson as any).key || (typeof resolvedKey === 'string' ? resolvedKey : undefined),
        lesson: sourceLesson as Lesson,
        assignment: (sourceLesson as any).assignment
      });
    } else {
      // Słownik klucz -> lekcja (Record<string, Lesson>)
      for (const [k, les] of Object.entries(sourceLesson)) {
        if (les && typeof les === 'object' && 'assignmentId' in les) {
          entriesToAdd.push({
            key: k,
            lesson: les as Lesson,
            assignment: (les as any).assignment
          });
        }
      }
    }
  }

  // 3. Zapis lekcji z zachowaniem oryginalnego klucza źródłowego (z sufiksem grupy)
  entriesToAdd.forEach((entry, idx) => {
    let itemKey = entry.key;
    if (!itemKey && Array.isArray(resolvedKey) && resolvedKey[idx]) {
      itemKey = resolvedKey[idx];
    } else if (!itemKey && typeof resolvedKey === 'string' && idx === 0) {
      itemKey = resolvedKey;
    }

    let targetKey = baseKey;
    if (itemKey) {
      const parts = itemKey.split('|');
      if (parts.length > 3) {
        // Klucz pełny z sufiksem grupy np. "c1|0|1|gr1" -> sufiks "gr1"
        const groupSuffix = parts.slice(3).join('|');
        targetKey = `${baseKey}|${groupSuffix}`;
      } else if (!itemKey.includes('|') && itemKey.trim() !== '') {
        // Sam sufiks grupy przekazany jako sourceKey np. "gr1"
        targetKey = `${baseKey}|${itemKey.replace(/^\|/, '')}`;
      } else {
        targetKey = baseKey;
      }
    } else if ((entry.lesson as any).groupId) {
      targetKey = `${baseKey}|${(entry.lesson as any).groupId}`;
    }

    updatedVariant.data.lessons[targetKey] = {
      assignmentId: entry.lesson.assignmentId,
      locked: entry.lesson.locked ?? false,
      supportTeacherId: entry.lesson.supportTeacherId
    };
  });

  // 4. Jeśli wariant docelowy ma niepustą listę assignments i brakuje w niej przydziału źródłowego,
  //    dołącz kopię przydziału do wariantu docelowego (bez duplikatów).
  if (Array.isArray(updatedVariant.data.assignments) && updatedVariant.data.assignments.length > 0) {
    for (const entry of entriesToAdd) {
      const asgId = entry.lesson.assignmentId;
      if (!asgId) continue;

      const alreadyExists = updatedVariant.data.assignments.some(a => a.id === asgId);
      if (!alreadyExists) {
        const sourceAsg = entry.assignment || findSourceAssignment(asgId, resolvedAssignments);
        if (sourceAsg) {
          if (!updatedVariant.data.assignments.some(a => a.id === sourceAsg.id)) {
            updatedVariant.data.assignments.push(JSON.parse(JSON.stringify(sourceAsg)));
          }
        }
      }
    }
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

  const nameA = sanitizeFileName(variantA.name, 30);
  const nameB = sanitizeFileName(variantB.name, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  let baseName = `Raport_Diff_${nameA}_vs_${nameB}_${dateStr}`;
  if (baseName.length > 80) {
    baseName = baseName.slice(0, 80);
  }
  const fileName = `${baseName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Sanityzacja nazwy pliku: usuwa znaki niedozwolone w systemach plików (\ / : * ? " < > |)
 * oraz ogranicza długość ciągu.
 */
export function sanitizeFileName(name: string, maxLen = 30): string {
  if (!name) return 'Wariant';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, maxLen);
}
