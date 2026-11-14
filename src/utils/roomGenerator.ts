/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Automatyczny Generator Planu Sal (Room Generator)
 * Opis: Algorytm przydziału sal lekcyjnych dla planu z Etapu 1 z obsługą klas 1–3,
 *       grup międzyoddziałowych (linkedGroupIds), twardych wymogów pracowni oraz
 *       niedublowania wpisów przy wyłączonym czyszczeniu planu.
 */
import {
  AppState,
  Assignment,
  Class,
  ClassRoom,
  SchedCell,
  SchedData,
  SchoolGroup,
  Subject,
  Teacher
} from '../types';
import { colKey, flattenColumns } from '../utils';
import {
  buildAssignmentCombinedClasses,
  isGrade1to3,
  isSpecializedLabRoom
} from './roomUtils';

export interface RoomGeneratorOptions {
  genPriorityHomerooms: boolean;
  genPriorityTeachers: boolean;
  genExcludeWF: boolean;
  genAutoPlaceWF: boolean;
  genClearExisting: boolean;
}

export interface RoomGeneratorResult {
  nextSchedData: SchedData;
  totalPlaced: number;
  totalSkippedPE: number;
  totalUnassigned: number;
  warnings: string[];
}

interface PendingRoomLesson {
  id: string;
  assignmentId: string;
  classId: string;
  className: string;
  classYear?: number | null;
  groupId?: string | null;
  linkedClassIds?: string[];
  linkedGroupIds?: string[];
  combinedClasses: string[];
  displayClassName: string;
  teacherId: string | null;
  teacherAbbr: string;
  suppTeacherAbbr?: string;
  subjectId: string;
  subjectShort: string;
  subjectName: string;
  suggestedRoomId?: string | null;
  suggestedRoomName: string | null;
  requiresHardRoom: boolean;
  requiredRoomColKey: string | null;
  isPE: boolean;
}

const DAY_NAMES_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt'];

function isLessonAlreadyScheduledInHour(
  colKeyCells: Record<string, SchedCell | SchedCell[]>,
  lesson: PendingRoomLesson
): boolean {
  for (const cellOrArr of Object.values(colKeyCells)) {
    if (!cellOrArr) continue;
    const slots = Array.isArray(cellOrArr) ? cellOrArr : [cellOrArr];
    for (const slot of slots) {
      const meta = slot?._bridgeMeta;
      if (!meta) continue;

      if (meta.assignmentId && lesson.assignmentId) {
        if (meta.assignmentId === lesson.assignmentId) {
          return true;
        }
        continue;
      }

      if (meta.classId !== lesson.classId) continue;
      if ((meta.groupId || null) !== (lesson.groupId || null)) continue;

      if ((meta.teacherId || null) === (lesson.teacherId || null)) {
        if (lesson.teacherId || !meta.subjectId || meta.subjectId === lesson.subjectId) {
          return true;
        }
      }
    }
  }
  return false;
}

function buildLessonCell(
  lesson: PendingRoomLesson,
  note?: string
): SchedCell {
  return {
    teacherAbbr: lesson.teacherAbbr,
    supportTeacherAbbr: lesson.suppTeacherAbbr,
    classes: lesson.combinedClasses,
    className: lesson.displayClassName,
    subject: lesson.subjectName,
    note,
    _bridgeMeta: {
      assignmentId: lesson.assignmentId,
      classId: lesson.classId,
      teacherId: lesson.teacherId,
      subjectId: lesson.subjectId,
      roomId: lesson.suggestedRoomId,
      groupId: lesson.groupId || null,
      linkedClassIds: lesson.linkedClassIds,
      linkedGroupIds: lesson.linkedGroupIds,
      suggestedRoom: lesson.suggestedRoomName
    }
  };
}

export function autoGenerateRooms(
  appState: AppState,
  schedData: SchedData,
  options: RoomGeneratorOptions
): RoomGeneratorResult {
  const {
    genPriorityHomerooms,
    genPriorityTeachers,
    genExcludeWF,
    genAutoPlaceWF,
    genClearExisting
  } = options;

  const yearKey = appState.yearKey;
  const pl = appState.planLekcji;
  const warnings: string[] = [];

  if (!pl || !pl.assignments) {
    return {
      nextSchedData: schedData,
      totalPlaced: 0,
      totalSkippedPE: 0,
      totalUnassigned: 0,
      warnings: ['Brak przydziałów lekcyjnych w Etapie 1!']
    };
  }

  const allRoomCols = flattenColumns(appState.floors);
  if (allRoomCols.length === 0) {
    return {
      nextSchedData: schedData,
      totalPlaced: 0,
      totalSkippedPE: 0,
      totalUnassigned: 0,
      warnings: ['Brak sal w układzie architektonicznym szkoły!']
    };
  }

  const assignmentsMap = new Map<string, Assignment>((pl.assignments || []).map(a => [a.id, a]));
  const teachersMap = new Map<string, Teacher>((pl.teachers || []).map(t => [t.id, t]));
  const subjectsMap = new Map<string, Subject>((pl.subjects || []).map(s => [s.id, s]));
  const groupsMap = new Map<string, SchoolGroup>((pl.schoolGroups || []).map(g => [g.id, g]));
  const classesMap = new Map<string, Class>((pl.classes || []).map(c => [c.id, c]));

  // Mapowanie sal po ID oraz oczyszczonej nazwie
  const roomsMap = new Map<string, ClassRoom>();
  (pl.rooms || []).forEach(r => {
    roomsMap.set(r.id, r);
    roomsMap.set(r.name.toLowerCase().trim(), r);
  });

  // Szybkie mapowanie nazwy sali (lowercase) na klucz kolumny w strukturze budynku
  const roomNameToColKey = new Map<string, string>();
  allRoomCols.forEach(col => {
    const clean = (col.room.num || '').toLowerCase().trim();
    if (clean && !roomNameToColKey.has(clean)) {
      roomNameToColKey.set(clean, colKey(col));
    }
  });

  const hasAnyGrade1_3Room = allRoomCols.some(col => {
    const clean = (col.room.num || '').toLowerCase().trim();
    return roomsMap.get(clean)?.isGrade1_3 === true;
  });

  const isPESubject = (subjectId: string, teacherId: string | null) => {
    const sub = subjectsMap.get(subjectId);
    if (!sub) return false;
    const name = (sub.name || '').toLowerCase();
    const s = (sub.short || '').toLowerCase();
    const teacher = teacherId ? teachersMap.get(teacherId) : null;
    const tAbbr = teacher ? (teacher.abbr || '').toLowerCase() : '';

    return (
      s.includes('wf') ||
      s.includes('w-f') ||
      name.includes('wychowanie fizyczne') ||
      name.includes('w-f') ||
      name.includes('wf') ||
      tAbbr === 'wf'
    );
  };

  const isINFSubject = (subjectId: string) => {
    const sub = subjectsMap.get(subjectId);
    if (!sub) return false;
    const name = (sub.name || '').toLowerCase();
    const short = (sub.short || '').toLowerCase();
    return (
      short.includes('inf') ||
      short.includes('e-inf') ||
      name.includes('informatyk') ||
      name.includes('edukacja informatyczna') ||
      name.includes('zajęcia komputerowe')
    );
  };

  const nextSchedData: SchedData = { ...schedData };
  nextSchedData[yearKey] = { ...(nextSchedData[yearKey] || {}) };

  let totalPlaced = 0;
  let totalSkippedPE = 0;
  let totalUnassigned = 0;

  const availableSportCols = allRoomCols.filter(col => {
    const roomNameClean = (col.room.num || '').toLowerCase().trim();
    const meta = roomsMap.get(roomNameClean);
    const bld = appState.buildings[col.floor.buildingIdx];
    return meta?.type === 'sport' || bld?.multi === true;
  });

  // Główna pętla 5 dni
  for (let day = 0; day < 5; day++) {
    nextSchedData[yearKey][day] = { ...(nextSchedData[yearKey][day] || {}) };

    appState.hours.forEach(hourKey => {
      const hourIdx = pl.hours.findIndex(h => String(h.num) === hourKey);
      if (hourIdx === -1) return;

      const colKeyCells: Record<string, SchedCell | SchedCell[]> = genClearExisting
        ? {}
        : { ...(nextSchedData[yearKey][day][hourKey] || {}) };
      nextSchedData[yearKey][day][hourKey] = colKeyCells;

      const lessonsToAssign: PendingRoomLesson[] = [];
      const seenAssignmentsInSlot = new Set<string>();

      pl.classes.forEach(cls => {
        const matchingLessons = Object.entries(pl.lessons || {}).filter(([k]) => {
          const p = k.split('|');
          return p[0] === cls.id && parseInt(p[1], 10) === day && parseInt(p[2], 10) === hourIdx;
        });

        matchingLessons.forEach(([lessonKey, lesson]) => {
          if (!lesson) return;

          const asg = assignmentsMap.get(lesson.assignmentId);
          if (!asg) return;

          // Deduplikacja zajęć wielooddziałowych (linkedClassIds ORAZ linkedGroupIds)
          const hasLinkedClasses = Boolean(asg.linkedClassIds && asg.linkedClassIds.length > 0);
          const hasLinkedGroups = Boolean(asg.linkedGroupIds && asg.linkedGroupIds.length > 0);
          if ((hasLinkedClasses || hasLinkedGroups) && cls.id !== asg.classId) {
            return;
          }
          if (seenAssignmentsInSlot.has(asg.id)) {
            return;
          }
          seenAssignmentsInSlot.add(asg.id);

          const baseClass = classesMap.get(asg.classId) || cls;
          const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
          const subject = subjectsMap.get(asg.subjectId);
          const roomEtap1 = asg.roomId ? roomsMap.get(asg.roomId) : null;
          const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;

          const { combinedClasses, displayClassName } = buildAssignmentCombinedClasses(
            asg,
            baseClass,
            classesMap,
            groupsMap
          );

          const requiresHardRoom = isSpecializedLabRoom(roomEtap1);
          const requiredRoomColKey =
            requiresHardRoom && roomEtap1
              ? (roomNameToColKey.get(roomEtap1.name.toLowerCase().trim()) || null)
              : null;

          const pendingLesson: PendingRoomLesson = {
            id: lessonKey,
            assignmentId: asg.id,
            classId: baseClass.id,
            className: baseClass.name,
            classYear: baseClass.year,
            groupId: asg.groupId,
            linkedClassIds: asg.linkedClassIds,
            linkedGroupIds: asg.linkedGroupIds,
            combinedClasses,
            displayClassName,
            teacherId: asg.teacherId,
            teacherAbbr: teacher?.abbr || '?',
            suppTeacherAbbr: suppTeacher?.abbr,
            subjectId: asg.subjectId,
            subjectShort: subject?.short || 'Zajęcia',
            subjectName: subject?.name || 'Zajęcia',
            suggestedRoomId: asg.roomId,
            suggestedRoomName: roomEtap1 ? roomEtap1.name : null,
            requiresHardRoom,
            requiredRoomColKey,
            isPE: isPESubject(asg.subjectId, asg.teacherId)
          };

          // Gdy genClearExisting = false, nie dublujemy lekcji już umieszczonej na tym dniu i godzinie
          if (!genClearExisting && isLessonAlreadyScheduledInHour(colKeyCells, pendingLesson)) {
            return;
          }

          lessonsToAssign.push(pendingLesson);
        });
      });

      const occupiedKeys = new Set<string>();
      Object.keys(colKeyCells).forEach(ck => {
        const cell = colKeyCells[ck];
        if (cell) {
          occupiedKeys.add(ck);
        }
      });

      const standardLessons = lessonsToAssign.filter(l => !l.isPE);
      const peLessons = lessonsToAssign.filter(l => l.isPE);

      // A. Przydział lekcji W-F
      if (genExcludeWF) {
        if (genAutoPlaceWF) {
          peLessons.forEach(lesson => {
            let assignedKey = '';
            if (lesson.requiresHardRoom) {
              if (lesson.requiredRoomColKey && !occupiedKeys.has(lesson.requiredRoomColKey)) {
                assignedKey = lesson.requiredRoomColKey;
              } else {
                totalUnassigned++;
                warnings.push(
                  `Pracownia/sala „${lesson.suggestedRoomName}” jest niedostępna lub zajęta (${DAY_NAMES_SHORT[day]} lek. ${hourKey}) dla ${lesson.displayClassName} (${lesson.subjectName}).`
                );
                return;
              }
            } else {
              for (const col of availableSportCols) {
                const key = colKey(col);
                if (!occupiedKeys.has(key)) {
                  assignedKey = key;
                  break;
                }
              }
            }

            if (!assignedKey) {
              totalUnassigned++;
            } else {
              occupiedKeys.add(assignedKey);
              colKeyCells[assignedKey] = buildLessonCell(lesson, 'Zajęcia sportowe (W-F)');
              totalPlaced++;
            }
          });
        } else {
          totalSkippedPE += peLessons.length;
        }
      } else {
        standardLessons.push(...peLessons);
      }

      // B. Przydział standardowych lekcji (zachłanne dopasowanie z poszanowaniem twardych reguł)
      const unassignedStandard = [...standardLessons];

      while (unassignedStandard.length > 0) {
        const candidates: { lessonIdx: number; colKey: string; score: number }[] = [];

        unassignedStandard.forEach((lesson, lIdx) => {
          // Twardy wymóg pracowni z Etapu 1: jeśli wskazana pracownia jest zajęta lub nie istnieje,
          // lekcja NIE może zostać przeniesiona do innej sali.
          if (lesson.requiresHardRoom) {
            if (!lesson.requiredRoomColKey || occupiedKeys.has(lesson.requiredRoomColKey)) {
              return;
            }
          }

          allRoomCols.forEach(col => {
            const key = colKey(col);
            if (occupiedKeys.has(key)) return;

            if (lesson.requiresHardRoom && key !== lesson.requiredRoomColKey) {
              return;
            }

            const roomNameClean = (col.room.num || '').toLowerCase().trim();
            const meta = roomsMap.get(roomNameClean);
            const bld = appState.buildings[col.floor.buildingIdx];
            const isSport = meta?.type === 'sport' || bld?.multi === true;
            const isIndividual = meta?.type === 'indywidualne';
            const isLabRoom = isSpecializedLabRoom(meta);

            let score = 0;

            if (lesson.requiresHardRoom && key === lesson.requiredRoomColKey) {
              score += 100000;
            }

            // Reguła 1: Sale wychowawcze / gospodarze sal
            const hr = appState.homerooms?.[key];
            if (genPriorityHomerooms && hr) {
              if (
                hr.className &&
                lesson.combinedClasses.some(cName => cName.toUpperCase().trim() === hr.className.toUpperCase().trim())
              ) {
                score += 2000;
              }
              if (
                hr.teacherAbbr &&
                lesson.teacherAbbr &&
                hr.teacherAbbr.toUpperCase().trim() === lesson.teacherAbbr.toUpperCase().trim()
              ) {
                score += 1200;
              }
              if (
                hr.className2 &&
                lesson.combinedClasses.some(cName => hr.className2 && cName.toUpperCase().trim() === hr.className2.toUpperCase().trim())
              ) {
                score += 800;
              }
              if (
                hr.teacherAbbr2 &&
                lesson.teacherAbbr &&
                hr.teacherAbbr2.toUpperCase().trim() === lesson.teacherAbbr.toUpperCase().trim()
              ) {
                score += 500;
              }
            }

            // Reguła 2: Preferowane sale nauczyciela
            if (genPriorityTeachers && lesson.teacherId) {
              const tObj = appState.teachers.find(t => t.id === lesson.teacherId);
              if (tObj?.preferredRooms && tObj.preferredRooms.includes(key)) {
                score += 1500;
              }
            }

            // Reguła 3: Sugestia sali ogólnej z Etapu 1
            if (
              !lesson.requiresHardRoom &&
              lesson.suggestedRoomName &&
              roomNameClean === lesson.suggestedRoomName.toLowerCase().trim()
            ) {
              score += 300;
            }

            // Ciągłość lekcji nauczyciela w tej samej sali
            if (hourIdx > 0 && lesson.teacherId) {
              const prevHourKey = appState.hours[hourIdx - 1];
              const prevColKeyCells = nextSchedData[yearKey][day][prevHourKey] || {};
              const prevCell = prevColKeyCells[key];
              if (prevCell) {
                const cellsList = Array.isArray(prevCell) ? prevCell : [prevCell];
                const hasSameTeacher = cellsList.some(cell => cell?._bridgeMeta?.teacherId === lesson.teacherId);
                if (hasSameTeacher) {
                  score += 5000;
                }
              }
            }

            // Reguły dla klas 1–3 (wyłącznie po cls.year, fallback /^[1-3](?!\d)/ gdy year null/undefined)
            const lessonIsGrade1_3 = isGrade1to3({ name: lesson.className, year: lesson.classYear });
            const isPEOrInf = lesson.isPE || isINFSubject(lesson.subjectId);

            const isClassHomeroom =
              hr &&
              hr.className &&
              (hr.className.toUpperCase().trim() === lesson.className.toUpperCase().trim() ||
                (hr.className2 && hr.className2.toUpperCase().trim() === lesson.className.toUpperCase().trim()));

            if (lessonIsGrade1_3 && !isPEOrInf) {
              const classHasHomeroomDefined = Object.values(appState.homerooms || {}).some(
                hObj =>
                  hObj.className?.toUpperCase().trim() === lesson.className.toUpperCase().trim() ||
                  hObj.className2?.toUpperCase().trim() === lesson.className.toUpperCase().trim()
              );

              if (classHasHomeroomDefined) {
                if (isClassHomeroom) {
                  score += 50000;
                } else {
                  score -= 50000;
                }
              }

              // Preferencja sal oznaczonych isGrade1_3 tylko wtedy, gdy szkoła w ogóle takie posiada
              if (hasAnyGrade1_3Room) {
                if (meta?.isGrade1_3) {
                  score += 15000;
                } else {
                  score -= 2000;
                }
              }
            } else if (!lessonIsGrade1_3) {
              if (meta?.isGrade1_3) {
                score -= 20000;
              }
            }

            // Pojemność sali względem całej klasy / podziału na grupy
            const isWholeClass = !lesson.groupId;
            const capacity = meta?.capacity || 30;

            if (isWholeClass) {
              if (capacity >= 25) {
                score += capacity * 30;
              } else {
                score -= (30 - capacity) * 30;
              }
            } else {
              if (capacity >= 25) {
                score -= capacity * 40;
              } else {
                score += (30 - capacity) * 40;
              }
            }

            if (!lesson.requiresHardRoom && isLabRoom) {
              score -= 1500;
            }
            if (isSport) {
              score -= 800;
            }
            if (isIndividual) {
              score -= 400;
            }

            candidates.push({
              lessonIdx: lIdx,
              colKey: key,
              score
            });
          });
        });

        // Jawny warunek zakończenia: brak dostępnych (wolnych i zgodnych z twardymi regułami) sal
        if (candidates.length === 0) {
          unassignedStandard.forEach(unassigned => {
            totalUnassigned++;
            if (unassigned.requiresHardRoom) {
              warnings.push(
                `Pracownia „${unassigned.suggestedRoomName}” jest zajęta lub nie istnieje w układzie sal (${DAY_NAMES_SHORT[day]} lek. ${hourKey}) — nie przydzielono ${unassigned.displayClassName} (${unassigned.subjectName}).`
              );
            }
          });
          break;
        }

        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        const chosenLesson = unassignedStandard[best.lessonIdx];
        const chosenRoomKey = best.colKey;

        colKeyCells[chosenRoomKey] = buildLessonCell(
          chosenLesson,
          chosenLesson.suggestedRoomName ? `(sugestia: ${chosenLesson.suggestedRoomName})` : undefined
        );

        occupiedKeys.add(chosenRoomKey);
        totalPlaced++;
        unassignedStandard.splice(best.lessonIdx, 1);
      }
    });
  }

  return {
    nextSchedData,
    totalPlaced,
    totalSkippedPE,
    totalUnassigned,
    warnings
  };
}
