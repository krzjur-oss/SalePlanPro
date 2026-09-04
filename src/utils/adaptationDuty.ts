import { AppState, Class, Przerwa, AdaptationDutySlot } from '../types';
import { flattenColumns, colKey } from '../utils';

export function getBreakDuration(p: Przerwa): number {
  if (!p?.start || !p?.end) return 10;
  const [sh, sm] = p.start.split(':').map(Number);
  const [eh, em] = p.end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 10;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff < 0 ? diff + 24 * 60 : diff;
}

/**
 * Checks if a class is Grade 1 (Pierwsza klasa)
 */
export function isClassGrade1(cls: Class | { name?: string; year?: number | null; abbr?: string }): boolean {
  if (!cls) return false;
  if (cls.year === 1) return true;
  const name = String(cls.name || '').trim();
  // Matches "1", "1A", "1a", "1-A", "1 B", "I A", "kl. 1a", "Klasa 1"
  if (/^(kl(\.|asa)?\s*)?1[a-z0-9]?(\b|\s|$)/i.test(name)) return true;
  if (/^(kl(\.|asa)?\s*)?I[a-z0-9]?(\b|\s|$)/i.test(name)) return true;
  if (cls.abbr && /^1[a-z0-9]?/i.test(cls.abbr)) return true;
  return false;
}

/**
 * Resolves list of classes eligible for Grade 1 adaptation duty
 */
export function getGrade1EligibleClasses(classes: Class[], customClassIds?: string[]): Class[] {
  if (customClassIds && customClassIds.length > 0) {
    return classes.filter(c => customClassIds.includes(c.id));
  }
  return classes.filter(c => isClassGrade1(c));
}

export interface AdaptationDutiesResult {
  slots: AdaptationDutySlot[];
  byDay: Record<number, AdaptationDutySlot[]>;
  byTeacher: Record<string, AdaptationDutySlot[]>;
  totalMinutes: number;
  totalTeacherMinutes: Record<string, number>;
  classroomDutiesCount: number;
  escortDutiesCount: number;
  teachersInvolvedCount: number;
}

/**
 * Calculates all Grade 1 classroom duties during breaks and escort duties after the last lesson.
 */
export function calculateAdaptationDuties(appState: AppState, schedData: any): AdaptationDutiesResult {
  const isEnabled = appState.dyzury.settings.firstGradeAdaptationDuty !== false;
  
  if (!isEnabled) {
    return {
      slots: [],
      byDay: { 0: [], 1: [], 2: [], 3: [], 4: [] },
      byTeacher: {},
      totalMinutes: 0,
      totalTeacherMinutes: {},
      classroomDutiesCount: 0,
      escortDutiesCount: 0,
      teachersInvolvedCount: 0
    };
  }

  const eligibleClasses = getGrade1EligibleClasses(
    appState.planLekcji.classes.length > 0 ? appState.planLekcji.classes : appState.classes,
    appState.dyzury.settings.firstGradeCustomClassIds
  );

  const escortDuration = appState.dyzury.settings.firstGradeEscortDuration || 15;
  const przerwy = appState.dyzury.przerwy || [];
  const timeslots = appState.timeslots || [];
  const yk = appState.yearKey;
  const cols = flattenColumns(appState.floors);

  const slots: AdaptationDutySlot[] = [];
  const byDay: Record<number, AdaptationDutySlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  const byTeacher: Record<string, AdaptationDutySlot[]> = {};
  const totalTeacherMinutes: Record<string, number> = {};

  let classroomDutiesCount = 0;
  let escortDutiesCount = 0;

  // Teacher name lookup
  const teacherMap: Record<string, string> = {};
  appState.teachers.forEach(t => {
    teacherMap[t.abbr] = `${t.first} ${t.last}`;
  });
  appState.planLekcji.teachers.forEach(t => {
    if (t.abbr && !teacherMap[t.abbr]) {
      teacherMap[t.abbr] = `${t.first} ${t.last}`;
    }
  });

  // For each day (0 = Monday .. 4 = Friday)
  for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
    const dayData = schedData?.[yk]?.[dayIdx] || {};

    for (const targetClass of eligibleClasses) {
      // Find all lessons of this class on this day
      // Map hourNum -> { teacherAbbr, roomNum }
      const classLessonsByHour: Record<number, { teacherAbbr: string; roomNum: string }> = {};

      Object.keys(dayData).forEach(hourKey => {
        const hourNum = parseInt(hourKey);
        if (isNaN(hourNum)) return;

        const hourCells = dayData[hourKey] || {};
        for (const cKey of Object.keys(hourCells)) {
          const cell = hourCells[cKey];
          if (!cell) continue;
          const cells = Array.isArray(cell) ? cell : [cell];

          for (const c of cells) {
            if (!c?.teacherAbbr) continue;

            // Check if this lesson belongs to targetClass
            const matchesClass = 
              c.className === targetClass.name ||
              c.classId === targetClass.id ||
              (Array.isArray(c.classes) && c.classes.includes(targetClass.name));

            if (matchesClass) {
              const matchedCol = cols.find(col => colKey(col) === cKey);
              classLessonsByHour[hourNum] = {
                teacherAbbr: c.teacherAbbr,
                roomNum: matchedCol?.room?.num || c.roomName || 'Sala lekcyjna'
              };
              break;
            }
          }
        }
      });

      // Also check appState.planLekcji.lessons as fallback if schedData is empty
      if (Object.keys(classLessonsByHour).length === 0 && appState.planLekcji?.lessons) {
        Object.entries(appState.planLekcji.lessons).forEach(([key, lesson]) => {
          const [cId, dIdxStr, hIdxStr, assignId] = key.split('|');
          if (cId === targetClass.id && parseInt(dIdxStr) === dayIdx) {
            const hNum = parseInt(hIdxStr) + 1; // 0-indexed hour to 1-indexed
            const assign = appState.planLekcji.assignments.find(a => a.id === (lesson.assignmentId || assignId));
            if (assign?.teacherId) {
              const tch = appState.planLekcji.teachers.find(t => t.id === assign.teacherId) ||
                          appState.teachers.find(t => t.id === assign.teacherId);
              if (tch?.abbr) {
                const rm = appState.planLekcji.rooms.find(r => r.id === assign.roomId);
                classLessonsByHour[hNum] = {
                  teacherAbbr: tch.abbr,
                  roomNum: rm?.name || 'Sala'
                };
              }
            }
          }
        });
      }

      const activeHourNums = Object.keys(classLessonsByHour).map(Number).sort((a, b) => a - b);
      if (activeHourNums.length === 0) continue;

      const lastHourNum = activeHourNums[activeHourNums.length - 1];

      // 1. Classroom duties between lessons of Grade 1
      for (let i = 0; i < activeHourNums.length; i++) {
        const currentHour = activeHourNums[i];
        const isLastLesson = currentHour === lastHourNum;

        if (!isLastLesson) {
          // Break after currentHour
          const breakNum = currentHour;
          const matchingPrzerwa = przerwy.find(p => p.num === breakNum);
          const duration = matchingPrzerwa ? getBreakDuration(matchingPrzerwa) : 10;
          
          let timeRange = matchingPrzerwa ? `${matchingPrzerwa.start}–${matchingPrzerwa.end}` : `Przerwa po ${currentHour}. lekcji`;
          const teacherInfo = classLessonsByHour[currentHour];

          if (teacherInfo?.teacherAbbr) {
            const slot: AdaptationDutySlot = {
              dayIdx,
              breakNum,
              type: 'classroom',
              classId: targetClass.id,
              className: targetClass.name,
              roomNum: teacherInfo.roomNum,
              teacherAbbr: teacherInfo.teacherAbbr,
              teacherName: teacherMap[teacherInfo.teacherAbbr] || teacherInfo.teacherAbbr,
              durationMinutes: duration,
              timeRange
            };

            slots.push(slot);
            byDay[dayIdx].push(slot);
            if (!byTeacher[slot.teacherAbbr]) byTeacher[slot.teacherAbbr] = [];
            byTeacher[slot.teacherAbbr].push(slot);
            totalTeacherMinutes[slot.teacherAbbr] = (totalTeacherMinutes[slot.teacherAbbr] || 0) + duration;
            classroomDutiesCount++;
          }
        } else {
          // 2. Escort duty after the last lesson of Grade 1
          const teacherInfo = classLessonsByHour[lastHourNum];
          const lastSlot = timeslots.find(t => t.num === lastHourNum);
          
          let escortStart = lastSlot?.end || '11:40';
          let escortEnd = escortStart;
          const [eh, em] = escortStart.split(':').map(Number);
          if (!isNaN(eh) && !isNaN(em)) {
            const endMins = eh * 60 + em + escortDuration;
            const resH = Math.floor(endMins / 60) % 24;
            const resM = endMins % 60;
            escortEnd = `${String(resH).padStart(2, '0')}:${String(resM).padStart(2, '0')}`;
          }

          if (teacherInfo?.teacherAbbr) {
            const slot: AdaptationDutySlot = {
              dayIdx,
              breakNum: lastHourNum,
              type: 'escort',
              classId: targetClass.id,
              className: targetClass.name,
              roomNum: teacherInfo.roomNum,
              teacherAbbr: teacherInfo.teacherAbbr,
              teacherName: teacherMap[teacherInfo.teacherAbbr] || teacherInfo.teacherAbbr,
              durationMinutes: escortDuration,
              timeRange: `${escortStart}–${escortEnd}`
            };

            slots.push(slot);
            byDay[dayIdx].push(slot);
            if (!byTeacher[slot.teacherAbbr]) byTeacher[slot.teacherAbbr] = [];
            byTeacher[slot.teacherAbbr].push(slot);
            totalTeacherMinutes[slot.teacherAbbr] = (totalTeacherMinutes[slot.teacherAbbr] || 0) + escortDuration;
            escortDutiesCount++;
          }
        }
      }
    }
  }

  let totalMinutes = 0;
  Object.values(totalTeacherMinutes).forEach(m => {
    totalMinutes += m;
  });

  return {
    slots,
    byDay,
    byTeacher,
    totalMinutes,
    totalTeacherMinutes,
    classroomDutiesCount,
    escortDutiesCount,
    teachersInvolvedCount: Object.keys(byTeacher).length
  };
}

/**
 * Checks if a given teacher is busy on a given day and break with an adaptation duty (classroom or escort).
 */
export function getTeacherAdaptationDuty(
  slotsByDay: Record<number, AdaptationDutySlot[]>,
  teacherAbbr: string,
  dayIdx: number,
  breakNum: number
): AdaptationDutySlot | undefined {
  const daySlots = slotsByDay[dayIdx];
  if (!daySlots || daySlots.length === 0) return undefined;
  return daySlots.find(s => s.teacherAbbr === teacherAbbr && s.breakNum === breakNum);
}
