import { AppState, Subject, Przerwa } from '../types';
import { getBreakDuration } from './adaptationDuty';

export interface PESupervisionConflict {
  teacherAbbr: string;
  dayIdx: number;
  breakNum: number;
  reason: string;
  type: 'after_pe' | 'before_pe' | 'between_pe';
  className?: string;
  subjectName: string;
  lessonHour: number;
  roomName?: string;
}

export interface PESupervisionSlot {
  dayIdx: number;
  breakNum: number;
  teacherAbbr: string;
  teacherName?: string;
  type: 'after_pe' | 'before_pe' | 'between_pe';
  reason: string;
  className?: string;
  subjectName: string;
  lessonHour: number;
  durationMinutes: number;
  timeRange: string;
}

export interface PESupervisionResult {
  slots: PESupervisionSlot[];
  byDay: Record<number, PESupervisionSlot[]>;
  byTeacher: Record<string, PESupervisionSlot[]>;
  totalMinutes: number;
  totalTeacherMinutes: Record<string, number>;
  totalBreaksCount: number;
  dualRoleTeachers: {
    abbr: string;
    name: string;
    peSubjects: string[];
    otherSubjects: string[];
  }[];
}

const PE_NAME_REGEX = /(\bwf\b|\bw-f\b|wychowanie\s+fizyczne|wych(\.|\s+)*fiz|gimnastyk|zaj[eę]cia\s+sportowe|\bsks\b|basen|p[lł]ywani|lekkoatletyk|siatk[oó]wk|koszyk[oó]wk|pi[lł]k[aą]|taniec|aerobik)/i;

/**
 * Checks if a subject or subject string represents Physical Education / sports classes.
 */
export function isPESubject(
  subject: Subject | { id?: string; name?: string; short?: string } | string | undefined | null,
  customSubjectIds?: string[]
): boolean {
  if (!subject) return false;

  if (typeof subject === 'string') {
    return PE_NAME_REGEX.test(subject.trim());
  }

  if (customSubjectIds && customSubjectIds.length > 0 && subject.id) {
    if (customSubjectIds.includes(`!${subject.id}`)) return false;
    if (customSubjectIds.includes(subject.id)) return true;
  }

  const name = subject.name || '';
  const short = subject.short || '';

  return PE_NAME_REGEX.test(name) || PE_NAME_REGEX.test(short);
}

/**
 * Checks whether a teacher has a PE lesson on a specific hour.
 */
export function getTeacherLessonOnHour(
  schedData: any,
  yearKey: string,
  dayIdx: number,
  hourNum: number,
  teacherAbbr: string,
  subjects: Subject[],
  customSubjectIds?: string[]
): {
  isPE: boolean;
  subjectName: string;
  className?: string;
  roomNum?: string;
} | null {
  const dayData = schedData?.[yearKey]?.[dayIdx] || {};
  const hourData = dayData[String(hourNum)] || {};

  for (const colKey of Object.keys(hourData)) {
    const rawCell = hourData[colKey];
    if (!rawCell) continue;
    const cells = Array.isArray(rawCell) ? rawCell : [rawCell];

    for (const c of cells) {
      if (!c) continue;
      if (c.teacherAbbr === teacherAbbr) {
        let subjectObj: Subject | undefined;
        if (c._bridgeMeta?.subjectId) {
          subjectObj = subjects.find(s => s.id === c._bridgeMeta.subjectId);
        }
        if (!subjectObj && c.subject) {
          subjectObj = subjects.find(s => s.name === c.subject || s.short === c.subject);
        }

        const isPE = isPESubject(subjectObj || c.subject, customSubjectIds);
        const subjectName = subjectObj?.name || c.subject || 'Wychowanie fizyczne';
        const className = c.className || c._bridgeMeta?.className;
        const roomNum = c.roomNum || c.roomId;

        return {
          isPE,
          subjectName,
          className,
          roomNum
        };
      }
    }
  }

  return null;
}

/**
 * Checks if teacher is bound to PE changing room / gym supervision on a specific break.
 */
export function getTeacherPESupervision(
  schedData: any,
  yearKey: string,
  dayIdx: number,
  breakNum: number,
  teacherAbbr: string,
  subjects: Subject[],
  settings?: {
    peSupervisionDuty?: boolean;
    peSupervisionBreaks?: 'before_and_after' | 'after_only' | 'before_only';
    peCustomSubjectIds?: string[];
  }
): PESupervisionConflict | null {
  if (settings?.peSupervisionDuty === false) {
    return null;
  }

  const mode = settings?.peSupervisionBreaks || 'before_and_after';

  // Break N is immediately after lesson hour N, and immediately before lesson hour N+1
  const lessonBefore = getTeacherLessonOnHour(schedData, yearKey, dayIdx, breakNum, teacherAbbr, subjects, settings?.peCustomSubjectIds);
  const lessonAfter = getTeacherLessonOnHour(schedData, yearKey, dayIdx, breakNum + 1, teacherAbbr, subjects, settings?.peCustomSubjectIds);

  const isAfterPE = lessonBefore?.isPE === true;
  const isBeforePE = lessonAfter?.isPE === true;

  if (isAfterPE && isBeforePE) {
    return {
      teacherAbbr,
      dayIdx,
      breakNum,
      type: 'between_pe',
      reason: `Nadzór szatni WF (między lekcjami WF: ${lessonBefore?.className || ''} ➔ ${lessonAfter?.className || ''})`,
      className: lessonBefore?.className || lessonAfter?.className,
      subjectName: lessonBefore?.subjectName || 'Wychowanie fizyczne',
      lessonHour: breakNum,
      roomName: lessonBefore?.roomNum || lessonAfter?.roomNum
    };
  }

  if (isAfterPE && (mode === 'before_and_after' || mode === 'after_only')) {
    return {
      teacherAbbr,
      dayIdx,
      breakNum,
      type: 'after_pe',
      reason: `Nadzór szatni WF (po ${breakNum}. lekcji WF: kl. ${lessonBefore?.className || ''})`,
      className: lessonBefore?.className,
      subjectName: lessonBefore?.subjectName || 'Wychowanie fizyczne',
      lessonHour: breakNum,
      roomName: lessonBefore?.roomNum
    };
  }

  if (isBeforePE && (mode === 'before_and_after' || mode === 'before_only')) {
    return {
      teacherAbbr,
      dayIdx,
      breakNum,
      type: 'before_pe',
      reason: `Nadzór szatni WF (przed ${breakNum + 1}. lekcją WF: kl. ${lessonAfter?.className || ''})`,
      className: lessonAfter?.className,
      subjectName: lessonAfter?.subjectName || 'Wychowanie fizyczne',
      lessonHour: breakNum + 1,
      roomName: lessonAfter?.roomNum
    };
  }

  return null;
}

/**
 * Calculates complete summary of PE supervision across all teachers and days.
 */
export function calculatePESupervisionDuties(
  appState: AppState,
  schedData: any
): PESupervisionResult {
  const isEnabled = appState.dyzury.settings.peSupervisionDuty !== false;

  const emptyResult: PESupervisionResult = {
    slots: [],
    byDay: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    byTeacher: {},
    totalMinutes: 0,
    totalTeacherMinutes: {},
    totalBreaksCount: 0,
    dualRoleTeachers: []
  };

  if (!isEnabled) {
    return emptyResult;
  }

  const przerwy = appState.dyzury.przerwy || [];
  const yk = appState.yearKey;
  const subjects = appState.subjects || [];
  const teachers = appState.teachers || [];

  const slots: PESupervisionSlot[] = [];
  const byDay: Record<number, PESupervisionSlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  const byTeacher: Record<string, PESupervisionSlot[]> = {};
  const totalTeacherMinutes: Record<string, number> = {};

  const teacherMap: Record<string, string> = {};
  teachers.forEach(t => {
    teacherMap[t.abbr] = `${t.first} ${t.last}`;
  });

  // Track subjects taught by each teacher to identify dual-role teachers (e.g. WF + Biologia)
  const teacherSubjectsMap: Record<string, { pe: Set<string>; other: Set<string> }> = {};

  for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
    const dayData = schedData?.[yk]?.[dayIdx] || {};

    // Analyze subjects taught by teachers
    Object.keys(dayData).forEach(hourKey => {
      const hourData = dayData[hourKey] || {};
      Object.values(hourData).forEach((rawCell: any) => {
        const cells = Array.isArray(rawCell) ? rawCell : [rawCell];
        cells.forEach(c => {
          if (!c?.teacherAbbr) return;
          const abbr = c.teacherAbbr;
          if (!teacherSubjectsMap[abbr]) {
            teacherSubjectsMap[abbr] = { pe: new Set(), other: new Set() };
          }
          const subjName = c.subject || '';
          if (isPESubject(subjName, appState.dyzury.settings.peCustomSubjectIds)) {
            teacherSubjectsMap[abbr].pe.add(subjName);
          } else if (subjName.trim()) {
            teacherSubjectsMap[abbr].other.add(subjName);
          }
        });
      });
    });

    // Check each break for PE supervision
    przerwy.forEach(p => {
      const dur = getBreakDuration(p);
      const timeRange = `${p.start} - ${p.end}`;

      teachers.forEach(t => {
        const conflict = getTeacherPESupervision(
          schedData,
          yk,
          dayIdx,
          p.num,
          t.abbr,
          subjects,
          appState.dyzury.settings
        );

        if (conflict) {
          const slot: PESupervisionSlot = {
            dayIdx,
            breakNum: p.num,
            teacherAbbr: t.abbr,
            teacherName: teacherMap[t.abbr] || t.abbr,
            type: conflict.type,
            reason: conflict.reason,
            className: conflict.className,
            subjectName: conflict.subjectName,
            lessonHour: conflict.lessonHour,
            durationMinutes: dur,
            timeRange
          };

          slots.push(slot);
          byDay[dayIdx].push(slot);

          if (!byTeacher[t.abbr]) {
            byTeacher[t.abbr] = [];
          }
          byTeacher[t.abbr].push(slot);

          totalTeacherMinutes[t.abbr] = (totalTeacherMinutes[t.abbr] || 0) + dur;
        }
      });
    });
  }

  const dualRoleTeachers = Object.keys(teacherSubjectsMap)
    .filter(abbr => teacherSubjectsMap[abbr].pe.size > 0 && teacherSubjectsMap[abbr].other.size > 0)
    .map(abbr => {
      const t = teachers.find(tch => tch.abbr === abbr);
      return {
        abbr,
        name: t ? `${t.first} ${t.last}` : abbr,
        peSubjects: Array.from(teacherSubjectsMap[abbr].pe),
        otherSubjects: Array.from(teacherSubjectsMap[abbr].other)
      };
    });

  const totalMinutes = Object.values(totalTeacherMinutes).reduce((sum, val) => sum + val, 0);

  return {
    slots,
    byDay,
    byTeacher,
    totalMinutes,
    totalTeacherMinutes,
    totalBreaksCount: slots.length,
    dualRoleTeachers
  };
}
