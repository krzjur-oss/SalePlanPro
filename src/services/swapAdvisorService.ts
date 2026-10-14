/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Asystenta Optymalnych Zamian i Wolnych Sal (SwapAdvisorService)
 * Opis: Automatyczna analiza bezkolizyjnych terminów, likwidacja okienek nauczycieli i klas,
 *       inteligentne dopasowanie wolnych sal oraz scoring propozycji przeniesień i zamian.
 */

import { 
  PlanLekcjiState, 
  Lesson, 
  LessonsState, 
  Assignment, 
  Teacher, 
  Subject, 
  ClassRoom, 
  Class 
} from '../types';
import { SwapSlotItem } from '../components/SwapAssistantModal';

export const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export interface RoomAvailabilityInfo {
  room: ClassRoom;
  isFree: boolean;
  occupyingLesson?: {
    className: string;
    subjectName: string;
    teacherName: string;
  };
  isHomeroom?: boolean;
  isSpecializedMatch?: boolean; // np. pracownia chemiczna dla chemii, wf dla sali gimnastycznej
  capacityFit?: boolean;
  score: number; // 0..100
  badge: 'ideal' | 'free' | 'busy';
  badgeLabel: string;
}

export interface SwapSuggestion {
  id: string;
  type: 'move_to_empty' | 'swap_with_lesson';
  targetDay: number;
  targetDayName: string;
  targetHour: number;
  targetHourTime: string;
  targetLessonKey?: string;
  targetLesson?: {
    subjectName: string;
    teacherName: string;
    className: string;
    roomName: string;
  };
  suggestedRoom?: ClassRoom;
  teacherFree: boolean;
  classFree: boolean;
  hasConflicts: boolean;
  conflictDetails: string[];
  gapsDeltaTeacher: number; // ujemne = poprawa (mniej okienek), 0 = bez zmian, dodatnie = nowe okienko
  gapsDeltaClass: number;
  score: number; // 0..100
  recommendationLevel: 'perfect' | 'great' | 'acceptable' | 'conflict';
  recommendationLabel: string;
  reasons: string[];
}

/**
 * Zwraca listę wszystkich sal z informacją o ich dostępności i dopasowaniu w zadanym slocie (dzień, godzina).
 */
export function getFreeRoomsForSlot(
  pl: PlanLekcjiState,
  dayIndex: number,
  hourIndex: number,
  options?: {
    subjectId?: string;
    classId?: string;
    excludeKey?: string;
  }
): RoomAvailabilityInfo[] {
  const rooms = pl.rooms || [];
  const assignmentsMap = new Map<string, Assignment>(pl.assignments.map(a => [a.id, a]));
  const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
  const teachersMap = new Map<string, Teacher>(pl.teachers.map(t => [t.id, t]));
  const classesMap = new Map<string, Class>(pl.classes.map(c => [c.id, c]));

  // Mapa zajętości sal w danym dniu i godzinie: roomId -> { className, subjectName, teacherName }
  const occupiedRooms = new Map<string, { className: string; subjectName: string; teacherName: string }>();

  Object.entries(pl.lessons).forEach(([key, lesson]) => {
    if (options?.excludeKey && key === options.excludeKey) return;
    const parts = key.split('|');
    const cId = parts[0];
    const d = parseInt(parts[1], 10);
    const h = parseInt(parts[2], 10);

    if (d === dayIndex && h === hourIndex) {
      const asg = assignmentsMap.get(lesson.assignmentId);
      if (asg && asg.roomId) {
        const cls = classesMap.get(cId);
        const subj = subjectsMap.get(asg.subjectId);
        const t = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
        occupiedRooms.set(asg.roomId, {
          className: cls?.name || cId,
          subjectName: subj?.name || 'Lekcja',
          teacherName: t ? `${t.first} ${t.last}` : 'Brak nauczyciela'
        });
      }
    }
  });

  const targetSubject = options?.subjectId ? subjectsMap.get(options.subjectId) : null;
  const targetClass = options?.classId ? classesMap.get(options.classId) : null;
  const subjectNameLower = (targetSubject?.name || '').toLowerCase();

  return rooms.map(room => {
    const occupation = occupiedRooms.get(room.id);
    const isFree = !occupation;
    const roomNameLower = (room.name || '').toLowerCase();
    const roomDescLower = (room.desc || '').toLowerCase();

    // Sprawdzenie specjalizacji pracowni
    let isSpecializedMatch = false;
    if (
      (subjectNameLower.includes('fizyk') && (roomNameLower.includes('fiz') || roomDescLower.includes('fiz'))) ||
      (subjectNameLower.includes('chem') && (roomNameLower.includes('chem') || roomDescLower.includes('chem'))) ||
      (subjectNameLower.includes('biolog') && (roomNameLower.includes('bio') || roomDescLower.includes('bio'))) ||
      (subjectNameLower.includes('informat') && (roomNameLower.includes('inf') || roomNameLower.includes('komp') || roomDescLower.includes('komp'))) ||
      ((subjectNameLower.includes('wf') || subjectNameLower.includes('wychowanie fiz')) && (room.type === 'sport' || roomNameLower.includes('gimn') || roomNameLower.includes('sport'))) ||
      (subjectNameLower.includes('geograf') && (roomNameLower.includes('geo') || roomDescLower.includes('geo'))) ||
      (subjectNameLower.includes('język') && (roomNameLower.includes('język') || roomDescLower.includes('język')))
    ) {
      isSpecializedMatch = true;
    }

    const classSize = targetClass?.students || 26;
    const roomCapacity = room.capacity || 30;
    const capacityFit = roomCapacity >= classSize;

    // Obliczenie punktacji dopasowania
    let score = isFree ? 60 : 0;
    if (isFree) {
      if (isSpecializedMatch) score += 30;
      if (capacityFit) score += 10;
    }

    let badge: 'ideal' | 'free' | 'busy' = 'busy';
    let badgeLabel = `Zajęta: ${occupation?.className || ''}`;

    if (isFree) {
      if (isSpecializedMatch) {
        badge = 'ideal';
        badgeLabel = 'Dedykowana pracownia';
      } else {
        badge = 'free';
        badgeLabel = 'Wolna';
      }
    }

    return {
      room,
      isFree,
      occupyingLesson: occupation,
      isSpecializedMatch,
      capacityFit,
      score,
      badge,
      badgeLabel
    };
  }).sort((a, b) => b.score - a.score || a.room.name.localeCompare(b.room.name, 'pl'));
}

/**
 * Oblicza liczbę okienek (luki między pierwszą a ostatnią lekcją danego dnia) dla nauczyciela.
 */
export function calculateTeacherGaps(
  teacherId: string,
  dayIndex: number,
  lessons: LessonsState,
  assignmentsMap: Map<string, Assignment>,
  totalHours: number
): { gapsCount: number; occupiedHours: number[] } {
  const occupiedHoursSet = new Set<number>();

  Object.entries(lessons).forEach(([key, lesson]) => {
    const parts = key.split('|');
    const d = parseInt(parts[1], 10);
    const h = parseInt(parts[2], 10);
    if (d === dayIndex) {
      const asg = assignmentsMap.get(lesson.assignmentId);
      if (asg && asg.teacherId === teacherId) {
        occupiedHoursSet.add(h);
      }
    }
  });

  const occupiedHours = Array.from(occupiedHoursSet).sort((a, b) => a - b);
  if (occupiedHours.length <= 1) {
    return { gapsCount: 0, occupiedHours };
  }

  const minHour = occupiedHours[0];
  const maxHour = occupiedHours[occupiedHours.length - 1];
  let gapsCount = 0;

  for (let h = minHour; h <= maxHour; h++) {
    if (!occupiedHoursSet.has(h)) {
      gapsCount++;
    }
  }

  return { gapsCount, occupiedHours };
}

/**
 * Oblicza liczbę okienek dla danej klasy w wybranym dniu.
 */
export function calculateClassGaps(
  classId: string,
  dayIndex: number,
  lessons: LessonsState,
  totalHours: number
): { gapsCount: number; occupiedHours: number[] } {
  const occupiedHoursSet = new Set<number>();

  Object.entries(lessons).forEach(([key]) => {
    const parts = key.split('|');
    const cId = parts[0];
    const d = parseInt(parts[1], 10);
    const h = parseInt(parts[2], 10);
    if (cId === classId && d === dayIndex) {
      occupiedHoursSet.add(h);
    }
  });

  const occupiedHours = Array.from(occupiedHoursSet).sort((a, b) => a - b);
  if (occupiedHours.length <= 1) {
    return { gapsCount: 0, occupiedHours };
  }

  const minHour = occupiedHours[0];
  const maxHour = occupiedHours[occupiedHours.length - 1];
  let gapsCount = 0;

  for (let h = minHour; h <= maxHour; h++) {
    if (!occupiedHoursSet.has(h)) {
      gapsCount++;
    }
  }

  return { gapsCount, occupiedHours };
}

/**
 * Generuje inteligentne sugestie przeniesień i bezkolizyjnych zamian dla wskazanego slotu/lekcji.
 */
export function findSwapAndMoveSuggestions(params: {
  pl: PlanLekcjiState;
  source: SwapSlotItem;
  maxSuggestions?: number;
}): SwapSuggestion[] {
  const { pl, source, maxSuggestions = 12 } = params;

  if (!source.classId || source.day === undefined || source.hour === undefined) {
    return [];
  }

  const totalHours = pl.hours.length;
  const assignmentsMap = new Map<string, Assignment>(pl.assignments.map(a => [a.id, a]));
  const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
  const teachersMap = new Map<string, Teacher>(pl.teachers.map(t => [t.id, t]));
  const classesMap = new Map<string, Class>(pl.classes.map(c => [c.id, c]));
  const roomsMap = new Map<string, ClassRoom>(pl.rooms.map(r => [r.id, r]));

  const sourceTeacher = source.teacher;
  const sourceRoom = source.room;
  const sourceSubject = source.subject;
  const sourceKey = source.key;

  // Obliczenie aktualnych okienek nauczyciela i klasy
  const currentTeacherGapsSourceDay = sourceTeacher
    ? calculateTeacherGaps(sourceTeacher.id, source.day, pl.lessons, assignmentsMap, totalHours).gapsCount
    : 0;
  const currentClassGapsSourceDay = calculateClassGaps(source.classId, source.day, pl.lessons, totalHours).gapsCount;

  const suggestions: SwapSuggestion[] = [];

  // Przeszukujemy wszystkie dni tygodnia i godziny
  for (let d = 0; d < 5; d++) {
    for (let h = 0; h < totalHours; h++) {
      // Pomiń ten sam termin
      if (d === source.day && h === source.hour) continue;

      const hourTime = pl.hours[h] ? `${pl.hours[h].start}–${pl.hours[h].end}` : `Lekcja ${h + 1}`;
      const dayName = DAYS_NAMES[d] || `Dzień ${d + 1}`;

      // Sprawdź lekcje w klasie źródłowej w tym docelowym slocie
      const targetLessonsInClass: { key: string; lesson: Lesson; asg?: Assignment }[] = [];
      Object.entries(pl.lessons).forEach(([k, l]) => {
        const parts = k.split('|');
        if (parts[0] === source.classId && parseInt(parts[1], 10) === d && parseInt(parts[2], 10) === h) {
          targetLessonsInClass.push({
            key: k,
            lesson: l,
            asg: assignmentsMap.get(l.assignmentId)
          });
        }
      });

      // =========================================================================
      // WARIANT 1: PRZENIESIENIE DO PUSTEGO SLOTU (Brak lekcji w klasie o tej porze)
      // =========================================================================
      if (targetLessonsInClass.length === 0) {
        const conflictDetails: string[] = [];
        let teacherFree = true;
        let classFree = true;

        // 1. Sprawdź dostępność nauczyciela źródłowego
        if (sourceTeacher) {
          // Czy ma inną klasę o tej porze?
          Object.entries(pl.lessons).forEach(([k, l]) => {
            if (k === sourceKey) return;
            const parts = k.split('|');
            if (parseInt(parts[1], 10) === d && parseInt(parts[2], 10) === h) {
              const asg = assignmentsMap.get(l.assignmentId);
              if (asg && asg.teacherId === sourceTeacher.id) {
                teacherFree = false;
                const otherCls = classesMap.get(parts[0])?.name || parts[0];
                conflictDetails.push(`Nauczyciel ${sourceTeacher.abbr || sourceTeacher.last} uczy w tym czasie klasę ${otherCls}`);
              }
            }
          });

          // Dyspozycyjność nauczyciela (availability)
          if (sourceTeacher.availability && sourceTeacher.availability.length > 0) {
            const slotCode = `${d}-${h}`;
            if (!sourceTeacher.availability.includes(slotCode)) {
              teacherFree = false;
              conflictDetails.push(`Nauczyciel ma oznaczoną niedostępność w ${dayName} na lekcji ${h + 1}`);
            }
          }
        }

        // 2. Sprawdź dostępność sal w slocie docelowym
        const freeRooms = getFreeRoomsForSlot(pl, d, h, {
          subjectId: sourceSubject?.id,
          classId: source.classId,
          excludeKey: sourceKey
        });

        // Czy dotychczasowa sala źródłowa jest wolna w slocie docelowym?
        const isCurrentRoomFree = sourceRoom ? freeRooms.some(r => r.room.id === sourceRoom.id && r.isFree) : true;
        const bestSuggestedRoom = isCurrentRoomFree && sourceRoom 
          ? sourceRoom 
          : (freeRooms.find(r => r.isFree)?.room || sourceRoom);

        // 3. Obliczenie wpływu na okienka nauczyciela i klasy
        let gapsDeltaTeacher = 0;
        let gapsDeltaClass = 0;

        if (sourceTeacher) {
          // Symulacja stanu po przeniesieniu
          const simulatedLessons: LessonsState = { ...pl.lessons };
          if (sourceKey) delete simulatedLessons[sourceKey];
          const newKey = `${source.classId}|${d}|${h}`;
          if (source.lesson) simulatedLessons[newKey] = source.lesson;

          const newGapsSourceDay = calculateTeacherGaps(sourceTeacher.id, source.day, simulatedLessons, assignmentsMap, totalHours).gapsCount;
          const newGapsTargetDay = calculateTeacherGaps(sourceTeacher.id, d, simulatedLessons, assignmentsMap, totalHours).gapsCount;

          const currentTeacherGapsTargetDay = (d !== source.day)
            ? calculateTeacherGaps(sourceTeacher.id, d, pl.lessons, assignmentsMap, totalHours).gapsCount
            : currentTeacherGapsSourceDay;

          gapsDeltaTeacher = (newGapsSourceDay + newGapsTargetDay) - (currentTeacherGapsSourceDay + currentTeacherGapsTargetDay);
        }

        // Symulacja okienek klasy
        const simClassLessons: LessonsState = { ...pl.lessons };
        if (sourceKey) delete simClassLessons[sourceKey];
        simClassLessons[`${source.classId}|${d}|${h}`] = source.lesson || { assignmentId: source.assignment?.id || '', locked: false };
        const newClassGapsSource = calculateClassGaps(source.classId, source.day, simClassLessons, totalHours).gapsCount;
        const newClassGapsTarget = calculateClassGaps(source.classId, d, simClassLessons, totalHours).gapsCount;
        const currentClassGapsTarget = (d !== source.day)
          ? calculateClassGaps(source.classId, d, pl.lessons, totalHours).gapsCount
          : currentClassGapsSourceDay;

        gapsDeltaClass = (newClassGapsSource + newClassGapsTarget) - (currentClassGapsSourceDay + currentClassGapsTarget);

        // 4. Kalkulacja Score (0-100)
        let score = 75;
        const reasons: string[] = [];

        if (conflictDetails.length > 0) {
          score = Math.max(10, 30 - conflictDetails.length * 10);
        } else {
          // Bonus za brak kolizji
          reasons.push('Brak kolizji nauczyciela i klasy');

          // Wpływ na okienka nauczyciela
          if (gapsDeltaTeacher < 0) {
            score += 20;
            reasons.push(`Likwiduje okienko u nauczyciela (${Math.abs(gapsDeltaTeacher)} godz.)`);
          } else if (gapsDeltaTeacher > 0) {
            score -= 15;
            reasons.push(`Tworzy okienko u nauczyciela (+${gapsDeltaTeacher} godz.)`);
          }

          // Wpływ na okienka klasy
          if (gapsDeltaClass < 0) {
            score += 15;
            reasons.push('Likwiduje okienko w planie klasy');
          } else if (gapsDeltaClass > 0) {
            score -= 20;
            reasons.push('Tworzy okienko w planie klasy');
          }

          // Zachowanie tej samej sali
          if (sourceRoom && isCurrentRoomFree) {
            score += 5;
            reasons.push(`Sala ${sourceRoom.name} jest wolna`);
          } else if (bestSuggestedRoom) {
            reasons.push(`Dostępna alternatywna sala: ${bestSuggestedRoom.name}`);
          }

          // Zbliżenie do środka dnia lekcyjnego
          if (h >= 1 && h <= 5) {
            score += 5;
          }
        }

        score = Math.max(5, Math.min(100, score));

        let recommendationLevel: SwapSuggestion['recommendationLevel'] = 'acceptable';
        let recommendationLabel = 'Możliwe przeniesienie';

        if (conflictDetails.length > 0) {
          recommendationLevel = 'conflict';
          recommendationLabel = 'Wykryto kolizję';
        } else if (score >= 85) {
          recommendationLevel = 'perfect';
          recommendationLabel = 'Rekomendacja: Idealne przeniesienie';
        } else if (score >= 70) {
          recommendationLevel = 'great';
          recommendationLabel = 'Bardzo dobre przeniesienie';
        }

        suggestions.push({
          id: `move_${d}_${h}`,
          type: 'move_to_empty',
          targetDay: d,
          targetDayName: dayName,
          targetHour: h,
          targetHourTime: hourTime,
          suggestedRoom: bestSuggestedRoom,
          teacherFree,
          classFree,
          hasConflicts: conflictDetails.length > 0,
          conflictDetails,
          gapsDeltaTeacher,
          gapsDeltaClass,
          score,
          recommendationLevel,
          recommendationLabel,
          reasons
        });
      }

      // =========================================================================
      // WARIANT 2: ZAMIANA Z INNĄ LEKCJĄ W TEJ KLASIE (Swap A ⇄ B)
      // =========================================================================
      else if (targetLessonsInClass.length === 1) {
        const targetItem = targetLessonsInClass[0];
        const targetAsg = targetItem.asg;
        const targetTeacher = targetAsg?.teacherId ? teachersMap.get(targetAsg.teacherId) : null;
        const targetSubj = targetAsg?.subjectId ? subjectsMap.get(targetAsg.subjectId) : null;
        const targetRoom = targetAsg?.roomId ? roomsMap.get(targetAsg.roomId) : null;

        const conflictDetails: string[] = [];

        // 1. Sprawdź nauczyciela źródłowego w terminie docelowym (d, h)
        if (sourceTeacher) {
          Object.entries(pl.lessons).forEach(([k, l]) => {
            if (k === sourceKey || k === targetItem.key) return;
            const parts = k.split('|');
            if (parseInt(parts[1], 10) === d && parseInt(parts[2], 10) === h) {
              const asg = assignmentsMap.get(l.assignmentId);
              if (asg && asg.teacherId === sourceTeacher.id) {
                const otherCls = classesMap.get(parts[0])?.name || parts[0];
                conflictDetails.push(`Nauczyciel ${sourceTeacher.abbr || sourceTeacher.last} uczy w tym czasie klasę ${otherCls}`);
              }
            }
          });

          if (sourceTeacher.availability && sourceTeacher.availability.length > 0) {
            const slotCode = `${d}-${h}`;
            if (!sourceTeacher.availability.includes(slotCode)) {
              conflictDetails.push(`Nauczyciel ${sourceTeacher.abbr} ma niedostępność w ${dayName} g. ${h + 1}`);
            }
          }
        }

        // 2. Sprawdź nauczyciela docelowego w terminie źródłowym (source.day, source.hour)
        if (targetTeacher) {
          Object.entries(pl.lessons).forEach(([k, l]) => {
            if (k === sourceKey || k === targetItem.key) return;
            const parts = k.split('|');
            if (parseInt(parts[1], 10) === source.day && parseInt(parts[2], 10) === source.hour) {
              const asg = assignmentsMap.get(l.assignmentId);
              if (asg && asg.teacherId === targetTeacher.id) {
                const otherCls = classesMap.get(parts[0])?.name || parts[0];
                conflictDetails.push(`Nauczyciel ${targetTeacher.abbr || targetTeacher.last} uczy w tym czasie klasę ${otherCls}`);
              }
            }
          });

          if (targetTeacher.availability && targetTeacher.availability.length > 0) {
            const slotCode = `${source.day}-${source.hour}`;
            if (!targetTeacher.availability.includes(slotCode)) {
              conflictDetails.push(`Nauczyciel ${targetTeacher.abbr} ma niedostępność w terminie źródłowym`);
            }
          }
        }

        // 3. Sprawdź konflikt sal w przypadku zamiany
        // Czy sala docelowa może przejść do slotu źródłowego?
        if (targetRoom) {
          Object.entries(pl.lessons).forEach(([k, l]) => {
            if (k === sourceKey || k === targetItem.key) return;
            const parts = k.split('|');
            if (parseInt(parts[1], 10) === source.day && parseInt(parts[2], 10) === source.hour) {
              const asg = assignmentsMap.get(l.assignmentId);
              if (asg && asg.roomId === targetRoom.id) {
                conflictDetails.push(`Sala ${targetRoom.name} jest w terminie źródłowym zajęta`);
              }
            }
          });
        }

        // Kalkulacja Score
        let score = 70;
        const reasons: string[] = [];

        if (conflictDetails.length > 0) {
          score = Math.max(10, 30 - conflictDetails.length * 10);
        } else {
          reasons.push(`Czysta zamiana z lekcją: ${targetSubj?.name || 'Inna lekcja'}`);
          if (targetTeacher) {
            reasons.push(`Nauczyciele ${sourceTeacher?.abbr || ''} i ${targetTeacher.abbr} są obaj dostępni`);
          }
          score += 15;
        }

        score = Math.max(5, Math.min(100, score));

        let recommendationLevel: SwapSuggestion['recommendationLevel'] = 'acceptable';
        let recommendationLabel = 'Zamiana lekcji';

        if (conflictDetails.length > 0) {
          recommendationLevel = 'conflict';
          recommendationLabel = 'Kolizja przy zamianie';
        } else if (score >= 85) {
          recommendationLevel = 'perfect';
          recommendationLabel = 'Rekomendacja: Optymalna zamiana';
        } else if (score >= 70) {
          recommendationLevel = 'great';
          recommendationLabel = 'Korzystna zamiana';
        }

        suggestions.push({
          id: `swap_${d}_${h}`,
          type: 'swap_with_lesson',
          targetDay: d,
          targetDayName: dayName,
          targetHour: h,
          targetHourTime: hourTime,
          targetLessonKey: targetItem.key,
          targetLesson: {
            subjectName: targetSubj?.name || 'Przedmiot',
            teacherName: targetTeacher ? `${targetTeacher.first} ${targetTeacher.last}` : 'Nauczyciel',
            className: classesMap.get(source.classId)?.name || source.classId,
            roomName: targetRoom?.name || 'Brak sali'
          },
          suggestedRoom: targetRoom || sourceRoom,
          teacherFree: conflictDetails.length === 0,
          classFree: true,
          hasConflicts: conflictDetails.length > 0,
          conflictDetails,
          gapsDeltaTeacher: 0,
          gapsDeltaClass: 0,
          score,
          recommendationLevel,
          recommendationLabel,
          reasons
        });
      }
    }
  }

  // Sortowanie: najpierw bez kolizji, z najwyższym wynikiem (score)
  return suggestions
    .sort((a, b) => {
      if (a.hasConflicts !== b.hasConflicts) {
        return a.hasConflicts ? 1 : -1;
      }
      return b.score - a.score;
    })
    .slice(0, maxSuggestions);
}

/**
 * Wykonuje zatwierdzoną operację przeniesienia lub zamiany i zwraca zaktualizowany obiekt PlanLekcjiState.
 */
export function executeSwapOrMove(
  pl: PlanLekcjiState,
  source: SwapSlotItem,
  suggestion: SwapSuggestion,
  options?: {
    assignedRoomId?: string | null;
  }
): {
  newPlan: PlanLekcjiState;
  logMessage: string;
} {
  const nextLessons = { ...pl.lessons };

  // Usunięcie klucza źródłowego
  if (source.key) {
    delete nextLessons[source.key];
  }

  // W przypadku zamiany (swap):
  if (suggestion.type === 'swap_with_lesson' && suggestion.targetLessonKey) {
    const existingTargetLesson = nextLessons[suggestion.targetLessonKey];
    delete nextLessons[suggestion.targetLessonKey];

    // Przeniesienie lekcji źródłowej do slotu docelowego
    if (source.lesson && source.assignment) {
      const targetKey = source.assignment.groupId
        ? `${source.classId}|${suggestion.targetDay}|${suggestion.targetHour}|${source.assignment.groupId}`
        : `${source.classId}|${suggestion.targetDay}|${suggestion.targetHour}`;
      nextLessons[targetKey] = {
        ...source.lesson
      };
    }

    // Przeniesienie lekcji docelowej do slotu źródłowego
    if (existingTargetLesson) {
      const targetAsg = pl.assignments.find(a => a.id === existingTargetLesson.assignmentId);
      const sourceSlotKey = targetAsg?.groupId
        ? `${source.classId}|${source.day}|${source.hour}|${targetAsg.groupId}`
        : `${source.classId}|${source.day}|${source.hour}`;
      nextLessons[sourceSlotKey] = {
        ...existingTargetLesson
      };
    }

    const sSubj = source.subject?.name || 'Lekcja A';
    const tSubj = suggestion.targetLesson?.subjectName || 'Lekcja B';
    return {
      newPlan: {
        ...pl,
        lessons: nextLessons
      },
      logMessage: `Zamieniono lekcje: ${sSubj} (${DAYS_NAMES[source.day]}) ⇄ ${tSubj} (${suggestion.targetDayName})`
    };
  }

  // W przypadku przeniesienia do wolnego slotu (move_to_empty):
  if (source.lesson && source.assignment) {
    const targetKey = source.assignment.groupId
      ? `${source.classId}|${suggestion.targetDay}|${suggestion.targetHour}|${source.assignment.groupId}`
      : `${source.classId}|${suggestion.targetDay}|${suggestion.targetHour}`;

    nextLessons[targetKey] = {
      ...source.lesson
    };

    // Opcjonalna aktualizacja przypisanej sali, jeśli wybrano nową salę
    let nextAssignments = pl.assignments;
    if (options?.assignedRoomId !== undefined && options.assignedRoomId !== source.assignment.roomId) {
      nextAssignments = pl.assignments.map(a => 
        a.id === source.assignment?.id ? { ...a, roomId: options.assignedRoomId || null } : a
      );
    }

    const sSubj = source.subject?.name || 'Lekcja';
    return {
      newPlan: {
        ...pl,
        assignments: nextAssignments,
        lessons: nextLessons
      },
      logMessage: `Przeniesiono lekcję: ${sSubj} z ${DAYS_NAMES[source.day]} na ${suggestion.targetDayName} g. ${suggestion.targetHour + 1}`
    };
  }

  return {
    newPlan: pl,
    logMessage: 'Brak zmian'
  };
}
