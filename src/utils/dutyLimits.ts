/**
 * SalePlan Pro – Moduł Limitów i Automatycznego Planowania Dyżurów
 * Wspólne, spójne obliczenia limitów minutowych/ilościowych oraz generator obsady dyżurów
 * używane jednocześnie przez panel statystyk (bilans) i auto-sugestię w Dyzury.tsx.
 */

import {
  AppState,
  DyzurEntry,
  MiejsceDyzuru,
  PlanDyzuryState,
  Przerwa,
  SchedCell,
  SchedData,
  Teacher,
} from '../types';
import { colKey, flattenColumns } from '../utils';
import { calculateAdaptationDuties, getTeacherAdaptationDuty } from './adaptationDuty';
import { hasExplicitAvailabilityAtNum, isTeacherAvailableAtNum } from './availability';
import { calculatePESupervisionDuties, getTeacherPESupervision } from './peDuty';
import { calculateTeacherWorkload } from './workloadUtils';

export const DUTY_DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'] as const;

export const DUTY_NON_TEACHING_ROLE_NAMES: Record<string, string> = {
  swietlica: 'Wychowawca świetlicy',
  biblioteka: 'Bibliotekarz',
  pedagog: 'Pedagog szkolny / specjalny',
  psycholog: 'Psycholog',
  logopeda: 'Logopeda',
  wspomagajacy: 'Nauczyciel współorganizujący',
  terapeuta: 'Terapeuta pedagogiczny',
};

export interface DutyPerson {
  id: string;
  first: string;
  last: string;
  abbr: string;
  color?: string;
  isStaff: boolean;
  role: string;
  nonTeachingRoles?: string[];
  nonTeachingHours?: number;
  weeklyHours?: number;
  availability?: string[];
  inactive?: boolean;
  dutyEligible: boolean;
  dutyExempt?: boolean;
  isAdministrative?: boolean;
  maxDutyCount?: number;
}

export interface ParsedDutySlotKey {
  placeId: string;
  day: number;
  breakNum: number;
  slotIdx: number;
}

export interface ComputeTeacherMaxMinutesInput {
  teacher?: Pick<
    Teacher,
    'dutyExempt' | 'isAdministrative' | 'maxDutyCount' | 'nonTeachingDutyEligible' | 'inactive'
  > | null;
  isStaff?: boolean;
  staffDutyEligible?: boolean;
  staffInactive?: boolean;
  isExcluded?: boolean;
  fteProportion: number;
  avgMinutesForFullTime: number;
  settings: Pick<
    PlanDyzuryState['settings'],
    'autoBalance' | 'maxMinutesPerTeacher' | 'maxPerTeacher'
  >;
  breakDuration: number;
}

export interface TeacherDutyLimits {
  /** Docelowy / wyświetlany limit minut w panelu statystyk i w punkcie startowym generatora (buffer=0) */
  maxMinutes: number;
  /** Nieprzekraczalny, twardy limit minut (np. maxMinutesPerTeacher lub maxDutyCount * breakDuration) */
  hardMaxMinutes: number;
  /** Nieprzekraczalny, twardy limit liczby dyżurów (teacher.maxDutyCount i/lub dyz.settings.maxPerTeacher) */
  hardMaxCount?: number;
  /** Czy limit minut wynika z ręcznego maxDutyCount (brak buforów) */
  hasManualLimit: boolean;
  /** Czy osoba może pełnić jakiekolwiek dyżury (nie jest wyłączona, zwolniona, admin lub 0 FTE) */
  isCandidate: boolean;
}

export interface UnfilledDutySlot {
  key: string;
  placeId: string;
  placeName: string;
  day: number;
  dayName: string;
  breakNum: number;
  breakName: string;
  timeRange: string;
  slotIdx: number;
  totalSlotsForPlace: number;
}

export interface AutoAssignDutiesResult {
  harmonogram: Record<string, DyzurEntry>;
  assignedCount: number;
  unfilledSlots: UnfilledDutySlot[];
  teacherMaxMinutes: Record<string, number>;
}

/**
 * Buduje klucz slotu w harmonogramie dyżurów.
 * Slot 1 zachowuje format wstecznie kompatybilny `miejsce|dzien|przerwa`,
 * kolejne sloty dla `teachersNeeded > 1` mają sufiks `|slotIdx` (`miejsce|dzien|przerwa|2`, itd.).
 */
export function getDutySlotKey(
  placeId: string,
  day: number,
  breakNum: number,
  slotIdx: number = 1
): string {
  const safeSlot = Math.max(1, Math.floor(slotIdx || 1));
  return safeSlot > 1
    ? `${placeId}|${day}|${breakNum}|${safeSlot}`
    : `${placeId}|${day}|${breakNum}`;
}

export function parseDutySlotKey(key: string): ParsedDutySlotKey | null {
  const parts = key.split('|');
  if (parts.length < 3) return null;
  const placeId = parts[0];
  const day = parseInt(parts[1], 10);
  const breakNum = parseInt(parts[2], 10);
  const slotIdx = parts.length >= 4 ? Math.max(1, parseInt(parts[3], 10) || 1) : 1;
  if (!placeId || isNaN(day) || isNaN(breakNum)) return null;
  return { placeId, day, breakNum, slotIdx };
}

export function getBreakDuration(p: Przerwa): number {
  const [sh, sm] = p.start.split(':').map(Number);
  const [eh, em] = p.end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff < 0 ? diff + 24 * 60 : diff;
}

export function getStandardBreakDuration(przerwy: Przerwa[]): number {
  const positiveDurations = przerwy.map(getBreakDuration).filter((d) => d > 0);
  if (positiveDurations.length === 0) return 15;
  const sum = positiveDurations.reduce((acc, d) => acc + d, 0);
  return Math.round(sum / positiveDurations.length);
}

/**
 * Sumuje wymagane minuty dyżurów w tygodniu z uwzględnieniem `teachersNeeded`
 * oraz z pominięciem slotów ręcznie oznaczonych jako `isUnneeded`.
 */
export function computeTotalRequiredDutyMinutes(
  dyz: Pick<PlanDyzuryState, 'miejsca' | 'przerwy' | 'harmonogram'>
): number {
  let total = 0;
  for (let day = 0; day < 5; day++) {
    for (const przerwa of dyz.przerwy) {
      const dur = getBreakDuration(przerwa);
      for (const miejsce of dyz.miejsca) {
        const needed = Math.max(1, miejsce.teachersNeeded || 1);
        for (let slotIdx = 1; slotIdx <= needed; slotIdx++) {
          const key = getDutySlotKey(miejsce.id, day, przerwa.num, slotIdx);
          if (dyz.harmonogram[key]?.isUnneeded) continue;
          total += dur;
        }
      }
    }
  }
  return total;
}

/**
 * Pełna kalkulacja limitów minutowych, ilościowych i statusu kandydata.
 * Używana zarówno przez `computeTeacherMaxMinutes`, jak i generator dyżurów.
 */
export function computeTeacherDutyLimits(
  input: ComputeTeacherMaxMinutesInput
): TeacherDutyLimits {
  const {
    teacher,
    isStaff = false,
    staffDutyEligible = true,
    staffInactive = false,
    isExcluded = false,
    fteProportion,
    avgMinutesForFullTime,
    settings,
    breakDuration,
  } = input;

  // 1. Wyłączenia, zwolnienia, stanowiska administracyjne oraz zerowy etat => brak kandydowania, limit = 0
  const isTeacherExempt =
    !isStaff &&
    Boolean(
      teacher?.dutyExempt ||
        teacher?.isAdministrative ||
        teacher?.inactive ||
        teacher?.nonTeachingDutyEligible === false
    );
  const isStaffDisabled = isStaff && (staffInactive || !staffDutyEligible);

  if (isExcluded || isTeacherExempt || isStaffDisabled || fteProportion <= 0) {
    return {
      maxMinutes: 0,
      hardMaxMinutes: 0,
      hardMaxCount: 0,
      hasManualLimit: true,
      isCandidate: false,
    };
  }

  const hasExplicitMaxMinutes =
    typeof settings.maxMinutesPerTeacher === 'number' && !isNaN(settings.maxMinutesPerTeacher);
  const globalHardMaxMinutes = hasExplicitMaxMinutes
    ? Math.max(0, settings.maxMinutesPerTeacher!)
    : 60;

  const hasSettingsMaxCount =
    typeof settings.maxPerTeacher === 'number' && !isNaN(settings.maxPerTeacher);
  const settingsMaxCount = hasSettingsMaxCount ? Math.max(0, settings.maxPerTeacher) : undefined;

  const hasManualCount = !isStaff && teacher?.maxDutyCount !== undefined;
  const teacherManualCount = hasManualCount ? Math.max(0, teacher!.maxDutyCount!) : undefined;

  let hardMaxCount: number | undefined;
  if (settingsMaxCount !== undefined && teacherManualCount !== undefined) {
    hardMaxCount = Math.min(settingsMaxCount, teacherManualCount);
  } else if (teacherManualCount !== undefined) {
    hardMaxCount = teacherManualCount;
  } else if (settingsMaxCount !== undefined) {
    hardMaxCount = settingsMaxCount;
  }

  // 2. Ręcznie ustawiony limit liczby dyżurów nauczyciela => twardy limit = maxDutyCount * (długość przerwy), bez buforów
  if (teacherManualCount !== undefined) {
    const safeBreakDur = Math.max(0, breakDuration);
    const manualMinutes = Math.max(0, Math.round(teacherManualCount * safeBreakDur));
    const cappedManualMinutes = hasExplicitMaxMinutes
      ? Math.min(globalHardMaxMinutes, manualMinutes)
      : manualMinutes;

    const isCandidate = cappedManualMinutes > 0 && (hardMaxCount === undefined || hardMaxCount > 0);
    return {
      maxMinutes: cappedManualMinutes,
      hardMaxMinutes: cappedManualMinutes,
      hardMaxCount,
      hasManualLimit: true,
      isCandidate,
    };
  }

  if (globalHardMaxMinutes <= 0 || hardMaxCount === 0) {
    return {
      maxMinutes: 0,
      hardMaxMinutes: 0,
      hardMaxCount: 0,
      hasManualLimit: false,
      isCandidate: false,
    };
  }

  // 3. Proporcjonalne bilansowanie (autoBalance) z twardym sufitem `maxMinutesPerTeacher`
  if (settings.autoBalance !== false) {
    const balancedMinutes = Math.min(
      globalHardMaxMinutes,
      Math.max(15, Math.ceil(avgMinutesForFullTime * fteProportion))
    );
    return {
      maxMinutes: balancedMinutes,
      hardMaxMinutes: globalHardMaxMinutes,
      hardMaxCount,
      hasManualLimit: false,
      isCandidate: true,
    };
  }

  // 4. Tryb bez autoBalance: limit sztywny = maxMinutesPerTeacher
  return {
    maxMinutes: globalHardMaxMinutes,
    hardMaxMinutes: globalHardMaxMinutes,
    hardMaxCount,
    hasManualLimit: false,
    isCandidate: true,
  };
}

/**
 * Wspólna funkcja obliczająca maksymalną liczbę minut dyżurów dla nauczyciela / pracownika.
 * Używana jednocześnie przez panel statystyk (bilans dyżurów) i generator `handleAutoSuggest`.
 */
export function computeTeacherMaxMinutes(input: ComputeTeacherMaxMinutesInput): number {
  return computeTeacherDutyLimits(input).maxMinutes;
}

export function buildAllDutyPersonnel(appState: AppState): DutyPerson[] {
  const list: DutyPerson[] = [];

  (appState.teachers || []).forEach((t) => {
    const hasNonTeaching = Boolean(
      (t.nonTeachingHours && t.nonTeachingHours > 0) ||
        (t.nonTeachingRoles && t.nonTeachingRoles.length > 0)
    );
    const roleStr = hasNonTeaching
      ? t.nonTeachingRoles && t.nonTeachingRoles.length > 0
        ? t.nonTeachingRoles.map((r) => DUTY_NON_TEACHING_ROLE_NAMES[r] || r).join(', ')
        : 'Zadania poza tablicą'
      : 'Nauczyciel';

    list.push({
      id: t.id,
      first: t.first,
      last: t.last,
      abbr: t.abbr,
      color: t.color || '#3b82f6',
      isStaff: false,
      role: roleStr,
      nonTeachingRoles: t.nonTeachingRoles || [],
      nonTeachingHours: t.nonTeachingHours || 0,
      availability: t.availability || [],
      inactive: Boolean(t.inactive),
      dutyExempt: Boolean(t.dutyExempt),
      isAdministrative: Boolean(t.isAdministrative),
      maxDutyCount: t.maxDutyCount,
      dutyEligible: t.nonTeachingDutyEligible !== false && !t.dutyExempt && !t.isAdministrative,
    });
  });

  (appState.supportStaff || []).forEach((s) => {
    list.push({
      id: s.id,
      first: s.first,
      last: s.last,
      abbr: s.abbr,
      color: s.color || '#475569',
      isStaff: true,
      role: s.role || 'Pracownik obsługi',
      weeklyHours: s.weeklyHours || 40,
      availability: s.availability || [],
      inactive: Boolean(s.inactive),
      dutyEligible: s.dutyEligible !== false,
    });
  });

  return list;
}

export function computePersonWeeklyHoursMap(
  appState: AppState,
  schedData: SchedData
): Record<string, number> {
  const hours: Record<string, number> = {};
  const yk = appState.yearKey;
  const yearData = schedData[yk] || {};

  Object.values(yearData).forEach((dayData) => {
    if (!dayData || typeof dayData !== 'object') return;
    Object.values(dayData).forEach((hourData) => {
      if (!hourData || typeof hourData !== 'object') return;
      Object.values(hourData).forEach((cell) => {
        const cells: SchedCell[] = Array.isArray(cell)
          ? (cell as SchedCell[])
          : cell
            ? [cell as SchedCell]
            : [];
        cells.forEach((c) => {
          if (c?.teacherAbbr) {
            hours[c.teacherAbbr] = (hours[c.teacherAbbr] || 0) + 1;
          }
        });
      });
    });
  });

  (appState.teachers || []).forEach((t) => {
    if (t.nonTeachingHours && t.nonTeachingHours > 0) {
      hours[t.abbr] = (hours[t.abbr] || 0) + t.nonTeachingHours;
    }
  });

  (appState.supportStaff || []).forEach((s) => {
    hours[s.abbr] = s.weeklyHours || 40;
  });

  return hours;
}

export function computePersonFteProportion(
  person: Pick<DutyPerson, 'abbr' | 'isStaff' | 'dutyExempt' | 'isAdministrative'>,
  hours: number,
  teacherMap: Map<string, Teacher>,
  appState: AppState
): number {
  if (person.isStaff) {
    return hours >= 40 ? 1.0 : Math.max(0, hours / 40);
  }

  const teacher = teacherMap.get(person.abbr);
  if (!teacher) {
    if (person.dutyExempt || person.isAdministrative) return 0;
    return hours >= 18 ? 1.0 : Math.max(0, hours / 18);
  }
  if (teacher.dutyExempt || teacher.isAdministrative) return 0;

  const analysis = calculateTeacherWorkload(
    teacher,
    appState.planLekcji?.assignments || [],
    appState.planLekcji?.specialAssignments || [],
    0,
    3,
    appState.school?.basePensumConfig,
    appState.school?.overtimeDefaultHandling
  );

  if (analysis.dutyExempt || analysis.effectiveDutyLimit === 0) {
    return 0;
  }

  if (analysis.boardHours > 0) {
    return Math.max(0, analysis.boardHours / 18);
  }

  return Math.min(1.0, Math.max(0, analysis.totalFte));
}

export function isTeacherAssignedOnBreak(
  harmonogram: Record<string, DyzurEntry>,
  miejsca: MiejsceDyzuru[],
  day: number,
  breakNum: number,
  teacherAbbr: string,
  ignorePlaceId?: string,
  ignoreSlotIdx?: number
): boolean {
  return miejsca.some((m) => {
    const needed = Math.max(1, m.teachersNeeded || 1);
    for (let slotIdx = 1; slotIdx <= needed; slotIdx++) {
      if (ignorePlaceId === m.id && ignoreSlotIdx === slotIdx) continue;
      const key = getDutySlotKey(m.id, day, breakNum, slotIdx);
      if (harmonogram[key]?.teacherAbbr === teacherAbbr) {
        return true;
      }
    }
    return false;
  });
}

export function wouldViolateConsecutiveDutiesRule(
  teacherAbbr: string,
  day: number,
  candidateBreakNum: number,
  currentHarm: Record<string, DyzurEntry>,
  miejsca: MiejsceDyzuru[],
  przerwy: Przerwa[],
  maxConsecutive: number = 2
): boolean {
  const sortedBreaks = [...przerwy].sort((a, b) => {
    const [ah, am] = a.start.split(':').map(Number);
    const [bh, bm] = b.start.split(':').map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  const dutyInSortedIndices = sortedBreaks.map((p) => {
    if (p.num === candidateBreakNum) return true;
    return isTeacherAssignedOnBreak(currentHarm, miejsca, day, p.num, teacherAbbr);
  });

  let consecutiveCount = 0;
  for (let i = 0; i < dutyInSortedIndices.length; i++) {
    if (dutyInSortedIndices[i]) {
      consecutiveCount++;
      if (consecutiveCount > maxConsecutive) {
        return true;
      }
    } else {
      consecutiveCount = 0;
    }
  }
  return false;
}

export function isPlaceActiveForBreakInPlan(
  miejsce: MiejsceDyzuru,
  dayIdx: number,
  przerwa: Przerwa,
  appState: AppState,
  schedData: SchedData
): boolean {
  if (!appState.dyzury?.settings?.skipDutyIfNoClassesOnCorridor) return true;

  const yk = appState.yearKey;
  const hourBeforeKey = String(przerwa.num);
  const hourAfterKey = String(przerwa.num + 1);

  const dayData = schedData[yk]?.[dayIdx] || {};
  const hourBeforeData = dayData[hourBeforeKey] || {};
  const hourAfterData = dayData[hourAfterKey] || {};

  let roomsToCheck: string[] = miejsce.connectedRooms || [];

  if (miejsce.isTransitional || roomsToCheck.length === 0) {
    if (miejsce.floor) {
      const cols = flattenColumns(appState.floors || []);
      roomsToCheck = cols
        .filter((col) => col.floor?.name === miejsce.floor)
        .map((col) => col.room.num);
    }

    if (roomsToCheck.length === 0) {
      const hasAnyLessonInSchool =
        Object.values(hourBeforeData).some((cell) => {
          const cells = Array.isArray(cell) ? cell : [cell];
          return cells.some((c: any) => c?.teacherAbbr);
        }) ||
        Object.values(hourAfterData).some((cell) => {
          const cells = Array.isArray(cell) ? cell : [cell];
          return cells.some((c: any) => c?.teacherAbbr);
        });
      return hasAnyLessonInSchool;
    }
  }

  const cols = flattenColumns(appState.floors || []);
  const targetColKeys = cols
    .filter((col) => roomsToCheck.includes(col.room.num))
    .map((col) => colKey(col));

  if (targetColKeys.length === 0) return false;

  const hasClassBefore = targetColKeys.some((cKey) => {
    const cell = hourBeforeData[cKey];
    if (!cell) return false;
    const cells = Array.isArray(cell) ? cell : [cell];
    return cells.some((c: any) => c?.teacherAbbr);
  });

  const hasClassAfter = targetColKeys.some((cKey) => {
    const cell = hourAfterData[cKey];
    if (!cell) return false;
    const cells = Array.isArray(cell) ? cell : [cell];
    return cells.some((c: any) => c?.teacherAbbr);
  });

  return hasClassBefore || hasClassAfter;
}

export function isTeacherAvailableForBreak(
  person: DutyPerson,
  dayIdx: number,
  przerwa: Przerwa,
  appState: AppState,
  schedData: SchedData
): boolean {
  if (person.isStaff) {
    if (person.availability && person.availability.length > 0) {
      return isTeacherAvailableAtNum(person, dayIdx, przerwa.num);
    }
    return przerwa.num <= 8;
  }

  // Jeśli nauczyciel ma określoną dostępność (niepustą listę), respektujemy ją również w dniach, w których ma lekcje
  if (person.availability && person.availability.length > 0 && !isTeacherAvailableAtNum(person, dayIdx, przerwa.num)) {
    return false;
  }

  const yk = appState.yearKey;
  const dayData = schedData[yk]?.[dayIdx] || {};
  const activeHours: number[] = [];

  Object.keys(dayData).forEach((hourKey) => {
    const hNum = parseInt(hourKey, 10);
    if (!isNaN(hNum)) {
      const hourData = dayData[hourKey] || {};
      const hasClass = Object.values(hourData).some((cell) => {
        const cells = Array.isArray(cell) ? cell : [cell];
        return cells.some((c: SchedCell) => c?.teacherAbbr === person.abbr);
      });
      if (hasClass) {
        activeHours.push(hNum);
      }
    }
  });

  const hasNonTeaching = Boolean(
    (person.nonTeachingHours && person.nonTeachingHours > 0) ||
      (person.nonTeachingRoles && person.nonTeachingRoles.length > 0)
  );

  if (activeHours.length === 0) {
    if (hasNonTeaching) {
      if (person.availability && person.availability.length > 0) {
        return isTeacherAvailableAtNum(person, dayIdx, przerwa.num);
      }
      return przerwa.num <= 6;
    }
    return false;
  }

  const minHour = Math.min(...activeHours);
  const maxHour = Math.max(...activeHours);
  const excludeAfterLast = Boolean(appState.dyzury?.settings?.excludeAfterLastLesson);

  const firstTimeslot = (appState.timeslots || []).find((t) => t.num === minHour);
  const lastTimeslot = (appState.timeslots || []).find((t) => t.num === maxHour);

  if (!firstTimeslot || !lastTimeslot) {
    if (excludeAfterLast) {
      return przerwa.num >= minHour - 1 && przerwa.num < maxHour;
    }
    return przerwa.num >= minHour - 1 && przerwa.num <= maxHour;
  }

  const toMins = (tStr: string) => {
    const [h, m] = tStr.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  const dayStartMins = toMins(firstTimeslot.start);
  const dayEndMins = toMins(lastTimeslot.end);
  const breakStartMins = toMins(przerwa.start);
  const breakEndMins = toMins(przerwa.end);

  if (excludeAfterLast && breakStartMins >= dayEndMins) {
    if (hasNonTeaching && hasExplicitAvailabilityAtNum(person, dayIdx, przerwa.num)) {
      return true;
    }
    return false;
  }

  const isBetween = breakStartMins >= dayStartMins && breakEndMins <= dayEndMins;
  const isDirectlyBefore =
    breakEndMins === dayStartMins ||
    (breakEndMins > dayStartMins - 30 && breakEndMins <= dayStartMins);
  const isDirectlyAfter =
    breakStartMins === dayEndMins ||
    (breakStartMins >= dayEndMins && breakStartMins < dayEndMins + 30);

  if (
    isBetween ||
    isDirectlyBefore ||
    isDirectlyAfter ||
    (przerwa.num >= minHour - 1 && przerwa.num <= maxHour)
  ) {
    return true;
  }

  if (hasNonTeaching && hasExplicitAvailabilityAtNum(person, dayIdx, przerwa.num)) {
    return true;
  }

  return false;
}

export const isPersonAvailableForBreak = isTeacherAvailableForBreak;

function teacherHasClassInHour(
  abbr: string,
  dayIdx: number,
  hourKey: string,
  appState: AppState,
  schedData: SchedData
): boolean {
  const yk = appState.yearKey;
  const hourData = schedData[yk]?.[dayIdx]?.[hourKey] || {};
  return Object.values(hourData).some((cell: any) => {
    const cells = Array.isArray(cell) ? cell : [cell];
    return cells.some((c: any) => c?.teacherAbbr === abbr);
  });
}

function teacherHasClassInConnectedRooms(
  abbr: string,
  dayIdx: number,
  hourKey: string,
  connectedRooms: string[],
  appState: AppState,
  schedData: SchedData
): boolean {
  if (!connectedRooms || connectedRooms.length === 0) return false;

  const yk = appState.yearKey;
  const hourData = schedData[yk]?.[dayIdx]?.[hourKey] || {};
  const cols = flattenColumns(appState.floors || []);

  const connectedKeys = cols
    .filter((col) => connectedRooms.includes(col.room.num))
    .map((col) => colKey(col));

  if (connectedKeys.length === 0) return false;

  return connectedKeys.some((cKey) => {
    const cell = hourData[cKey];
    if (!cell) return false;
    const cells = Array.isArray(cell) ? cell : [cell];
    return cells.some((c: any) => c?.teacherAbbr === abbr);
  });
}

/**
 * Automatycznie przydziela dyżury respektując wszystkie twarde limity:
 * - `dutyExempt`, `isAdministrative`, zerowy etat => nigdy nie jest kandydatem (0 dyżurów)
 * - `teacher.maxDutyCount` => twardy limit `maxDutyCount * długość przerwy` i `<= maxDutyCount`, bez buforów
 * - `dyz.settings.maxPerTeacher` => twardy limit liczby dyżurów
 * - `dyz.settings.maxMinutesPerTeacher` => twardy sufit minutowy; pętla buforów może rozluźniać wyłącznie miękki limit wynikający z `autoBalance`
 * - obsługa `teachersNeeded > 1` z przypisaniem różnych osób na tej samej przerwie
 * - zwraca listę nieobsadzonych wymaganych slotów, jeśli twarde limity nie pozwalają na pełne obsadzenie
 */
export function autoAssignDuties(
  appState: AppState,
  schedData: SchedData
): AutoAssignDutiesResult {
  const dyz = appState.dyzury;
  const nextHarm: Record<string, DyzurEntry> = { ...(dyz.harmonogram || {}) };
  const yk = appState.yearKey || 'default';

  const allPersonnel = buildAllDutyPersonnel(appState);
  const excludedSet = new Set(dyz.settings.excludeTeachers || []);
  const teacherMap = new Map<string, Teacher>();
  (appState.teachers || []).forEach((t) => teacherMap.set(t.abbr, t));
  const staffInactiveMap = new Map<string, boolean>();
  const staffEligibleMap = new Map<string, boolean>();
  (appState.supportStaff || []).forEach((s) => {
    staffInactiveMap.set(s.abbr, Boolean(s.inactive));
    staffEligibleMap.set(s.abbr, s.dutyEligible !== false);
  });

  const personHours = computePersonWeeklyHoursMap(appState, schedData);
  const standardBreakDuration = getStandardBreakDuration(dyz.przerwy || []);

  const personProportions: Record<string, number> = {};
  let sumProportions = 0;

  allPersonnel.forEach((p) => {
    if (excludedSet.has(p.abbr) || !p.dutyEligible || p.inactive) {
      personProportions[p.abbr] = 0;
      return;
    }
    const prop = computePersonFteProportion(p, personHours[p.abbr] || 0, teacherMap, appState);
    personProportions[p.abbr] = prop;
    sumProportions += prop;
  });

  if (sumProportions === 0) sumProportions = 1;

  const totalRequiredDutyMinutes = computeTotalRequiredDutyMinutes({
    miejsca: dyz.miejsca,
    przerwy: dyz.przerwy,
    harmonogram: nextHarm,
  });
  const avgMinutesForFullTime = totalRequiredDutyMinutes / sumProportions;

  const limitsByAbbr: Record<string, TeacherDutyLimits> = {};
  const teacherMaxMinutes: Record<string, number> = {};
  const candidatesPool: DutyPerson[] = [];

  allPersonnel.forEach((p) => {
    const teacher = !p.isStaff ? teacherMap.get(p.abbr) : null;
    const limits = computeTeacherDutyLimits({
      teacher,
      isStaff: p.isStaff,
      staffDutyEligible: p.isStaff ? staffEligibleMap.get(p.abbr) ?? true : undefined,
      staffInactive: p.isStaff ? staffInactiveMap.get(p.abbr) ?? false : undefined,
      isExcluded: excludedSet.has(p.abbr),
      fteProportion: personProportions[p.abbr] || 0,
      avgMinutesForFullTime,
      settings: dyz.settings,
      breakDuration: standardBreakDuration,
    });
    limitsByAbbr[p.abbr] = limits;
    teacherMaxMinutes[p.abbr] = limits.maxMinutes;
    if (limits.isCandidate) {
      candidatesPool.push(p);
    }
  });

  const adaptationDuties = calculateAdaptationDuties(appState, schedData);
  const peDuties = calculatePESupervisionDuties(appState, schedData);

  const assignedMinutes: Record<string, number> = {};
  const assignedCounts: Record<string, number> = {};

  allPersonnel.forEach((p) => {
    const adaptMins =
      dyz.settings.firstGradeAdaptationDuty !== false &&
      dyz.settings.countAdaptationInFTE !== false
        ? adaptationDuties.totalTeacherMinutes[p.abbr] || 0
        : 0;
    const peMins =
      dyz.settings.peSupervisionDuty !== false && dyz.settings.countPeSupervisionInFTE
        ? peDuties.totalTeacherMinutes[p.abbr] || 0
        : 0;
    assignedMinutes[p.abbr] = adaptMins + peMins;
    assignedCounts[p.abbr] = 0;
  });

  // Zlicz minuty i liczbę dyżurów dla zablokowanych wpisów przed wyczyszczeniem odblokowanych
  Object.entries(nextHarm).forEach(([key, entry]) => {
    if (entry.locked && entry.teacherAbbr && !entry.isUnneeded) {
      const parsed = parseDutySlotKey(key);
      if (parsed) {
        const przerwa = dyz.przerwy.find((p) => p.num === parsed.breakNum);
        if (przerwa) {
          assignedMinutes[entry.teacherAbbr] =
            (assignedMinutes[entry.teacherAbbr] || 0) + getBreakDuration(przerwa);
        }
        assignedCounts[entry.teacherAbbr] = (assignedCounts[entry.teacherAbbr] || 0) + 1;
      }
    }
  });

  // Wyczyść odblokowane dyżury (zachowaj zablokowane i zbędne)
  Object.keys(nextHarm).forEach((key) => {
    if (!nextHarm[key]?.locked && !nextHarm[key]?.isUnneeded) {
      delete nextHarm[key];
    }
  });

  const maxConsecutive =
    dyz.settings.maxConsecutiveDuties !== undefined ? dyz.settings.maxConsecutiveDuties : 2;

  const canAssignPerson = (
    p: DutyPerson,
    day: number,
    przerwa: Przerwa,
    allowedMinutesBuffer: number
  ): boolean => {
    const limits = limitsByAbbr[p.abbr];
    if (!limits || !limits.isCandidate) return false;

    if (!isTeacherAvailableForBreak(p, day, przerwa, appState, schedData)) return false;

    if (dyz.settings.firstGradeAdaptationDuty !== false) {
      if (getTeacherAdaptationDuty(adaptationDuties.byDay, p.abbr, day, przerwa.num)) {
        return false;
      }
    }

    if (dyz.settings.peSupervisionDuty !== false) {
      if (
        getTeacherPESupervision(
          schedData,
          yk,
          day,
          przerwa.num,
          p.abbr,
          appState.subjects,
          dyz.settings
        )
      ) {
        return false;
      }
    }

    // Twardy limit liczby dyżurów (teacher.maxDutyCount i/lub dyz.settings.maxPerTeacher) — nigdy nie jest rozluźniany
    const currentCount = assignedCounts[p.abbr] || 0;
    if (limits.hardMaxCount !== undefined && currentCount + 1 > limits.hardMaxCount) {
      return false;
    }

    // Kontrola minut: pętla buforów może rozluźniać WYŁĄCZNIE limit miękki z autoBalance,
    // nigdy limitów ręcznych (hasManualLimit) ani twardego sufitu `hardMaxMinutes` (`maxMinutesPerTeacher`)
    const dur = getBreakDuration(przerwa);
    const effectiveLimitForPass = limits.hasManualLimit
      ? limits.maxMinutes
      : Math.min(limits.hardMaxMinutes, limits.maxMinutes + allowedMinutesBuffer);

    if ((assignedMinutes[p.abbr] || 0) + dur > effectiveLimitForPass) {
      return false;
    }

    // Osoba może pełnić maksymalnie jeden dyżur w trakcie tej samej przerwy (również gdy miejsce ma teachersNeeded > 1)
    if (isTeacherAssignedOnBreak(nextHarm, dyz.miejsca, day, przerwa.num, p.abbr)) {
      return false;
    }

    if (
      wouldViolateConsecutiveDutiesRule(
        p.abbr,
        day,
        przerwa.num,
        nextHarm,
        dyz.miejsca,
        dyz.przerwy,
        maxConsecutive
      )
    ) {
      return false;
    }

    return true;
  };

  let assignedCount = 0;
  const buffers = [0, 15, 30, 45, 60, 120];

  for (const buffer of buffers) {
    for (let day = 0; day < 5; day++) {
      for (const przerwa of dyz.przerwy) {
        const breakDur = getBreakDuration(przerwa);

        for (const miejsce of dyz.miejsca) {
          if (!isPlaceActiveForBreakInPlan(miejsce, day, przerwa, appState, schedData)) {
            continue;
          }

          const needed = Math.max(1, miejsce.teachersNeeded || 1);
          const connected = miejsce.connectedRooms || [];

          for (let slotIdx = 1; slotIdx <= needed; slotIdx++) {
            const key = getDutySlotKey(miejsce.id, day, przerwa.num, slotIdx);

            if (nextHarm[key]?.isUnneeded) continue;
            if (nextHarm[key]?.teacherAbbr) continue;

            const getDeficit = (abbr: string) =>
              (teacherMaxMinutes[abbr] || 0) - (assignedMinutes[abbr] || 0);

            const candidates = [...candidatesPool]
              .filter((t) => canAssignPerson(t, day, przerwa, buffer))
              .sort((a, b) => getDeficit(b.abbr) - getDeficit(a.abbr));

            if (candidates.length === 0) continue;

            let selected: string | null = null;

            // TIER 1: Przyległe sale
            if (connected.length > 0) {
              const connectedCandidate = candidates.find((t) => {
                const hourBefore = String(przerwa.num);
                const hourAfter = String(przerwa.num + 1);
                return (
                  teacherHasClassInConnectedRooms(
                    t.abbr,
                    day,
                    hourBefore,
                    connected,
                    appState,
                    schedData
                  ) ||
                  teacherHasClassInConnectedRooms(
                    t.abbr,
                    day,
                    hourAfter,
                    connected,
                    appState,
                    schedData
                  )
                );
              });
              if (connectedCandidate) {
                selected = connectedCandidate.abbr;
              }
            }

            // TIER 2: Lekcja bezpośrednio przed lub po przerwie
            if (!selected) {
              const nearbyCandidate = candidates.find((t) => {
                const hourBefore = String(przerwa.num);
                const hourAfter = String(przerwa.num + 1);
                return (
                  teacherHasClassInHour(t.abbr, day, hourBefore, appState, schedData) ||
                  teacherHasClassInHour(t.abbr, day, hourAfter, appState, schedData)
                );
              });
              if (nearbyCandidate) {
                selected = nearbyCandidate.abbr;
              }
            }

            // TIER 3: Osoba z największym deficytem minut w puli
            if (!selected) {
              selected = candidates[0].abbr;
            }

            if (selected) {
              nextHarm[key] = {
                teacherAbbr: selected,
                locked: false,
              };
              assignedMinutes[selected] = (assignedMinutes[selected] || 0) + breakDur;
              assignedCounts[selected] = (assignedCounts[selected] || 0) + 1;
              assignedCount++;
            }
          }
        }
      }
    }
  }

  // Zbierz wszystkie wymagane sloty, których nie udało się obsadzić bez złamania twardych limitów
  const unfilledSlots: UnfilledDutySlot[] = [];
  for (let day = 0; day < 5; day++) {
    for (const przerwa of dyz.przerwy) {
      for (const miejsce of dyz.miejsca) {
        if (!isPlaceActiveForBreakInPlan(miejsce, day, przerwa, appState, schedData)) {
          continue;
        }
        const needed = Math.max(1, miejsce.teachersNeeded || 1);
        for (let slotIdx = 1; slotIdx <= needed; slotIdx++) {
          const key = getDutySlotKey(miejsce.id, day, przerwa.num, slotIdx);
          const entry = nextHarm[key];
          if (entry?.isUnneeded) continue;
          if (!entry?.teacherAbbr) {
            unfilledSlots.push({
              key,
              placeId: miejsce.id,
              placeName: miejsce.name,
              day,
              dayName: DUTY_DAYS[day] || `Dzień ${day + 1}`,
              breakNum: przerwa.num,
              breakName: przerwa.name || `Przerwa ${przerwa.num}`,
              timeRange: `${przerwa.start}–${przerwa.end}`,
              slotIdx,
              totalSlotsForPlace: needed,
            });
          }
        }
      }
    }
  }

  return {
    harmonogram: nextHarm,
    assignedCount,
    unfilledSlots,
    teacherMaxMinutes,
  };
}
