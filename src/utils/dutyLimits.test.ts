/**
 * SalePlan Pro – Testy limitów i generatora dyżurów (`dutyLimits.ts`)
 */
import { describe, it, expect } from 'vitest';
import { AppState, Assignment, SchedData, Teacher } from '../types';
import {
  autoAssignDuties,
  buildAllDutyPersonnel,
  computeTeacherDutyLimits,
  computeTeacherMaxMinutes,
  getDutySlotKey,
  isTeacherAvailableForBreak,
  parseDutySlotKey,
} from './dutyLimits';
import { generateDutiesHtml } from './dutiesPrintHtml';

function makeTeacher(overrides: Partial<Teacher> & { id: string; abbr: string }): Teacher {
  const { id, first = 'Jan', last = `Nauczyciel_${overrides.abbr}`, abbr, color = '#3b82f6', availability = [], ...rest } = overrides;
  return {
    id,
    first,
    last,
    abbr,
    color,
    availability,
    ...rest,
  };
}

function makeAssignment(id: string, teacherId: string, hoursPerWeek = 18): Assignment {
  return {
    id,
    classId: 'c1',
    subjectId: 's1',
    teacherId,
    roomId: 'r1',
    groupId: null,
    hoursPerWeek,
  };
}

function buildTestFixtures(options: {
  teachers: Teacher[];
  assignments?: Assignment[];
  breaks?: Array<{ num: number; name: string; start: string; end: string }>;
  places?: Array<{ id: string; name: string; teachersNeeded?: number }>;
  settings?: Partial<AppState['dyzury']['settings']>;
  daysWithLessons?: number[];
}): { appState: AppState; schedData: SchedData } {
  const daysWithLessons = options.daysWithLessons ?? [0, 1, 2, 3, 4];
  const breaks = options.breaks ?? [
    { num: 1, name: 'Przerwa 1', start: '08:45', end: '08:55' },
    { num: 2, name: 'Przerwa 2', start: '09:40', end: '09:50' },
    { num: 3, name: 'Przerwa 3', start: '10:35', end: '10:45' },
  ];
  const places = options.places ?? [{ id: 'p1', name: 'Korytarz Główny', teachersNeeded: 1 }];
  const assignments =
    options.assignments ??
    options.teachers.map((t, idx) => makeAssignment(`a_${idx}`, t.id, 18));

  const appState: AppState = {
    yearKey: 'y1',
    yearLabel: '2025/2026',
    school: { name: 'SP Test', short: 'SPT' },
    hours: ['1', '2', '3', '4'],
    buildings: [{ id: 'b1', name: 'Budynek Główny' }],
    classes: [{ id: 'c1', name: '4A', color: '#3b82f6', groupIds: [] }],
    homerooms: {},
    floors: [
      {
        id: 'f1',
        name: 'Parter',
        color: '#e2e8f0',
        buildingIdx: 0,
        segments: [
          {
            id: 'seg1',
            name: 'Główny',
            rooms: [{ id: 'r1', num: '101' }],
          },
        ],
      },
    ],
    timeslots: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:45', end: '11:30' },
    ],
    teachers: options.teachers,
    subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#3b82f6' }],
    dyzury: {
      miejsca: places,
      przerwy: breaks,
      harmonogram: {},
      settings: {
        autoBalance: true,
        maxPerTeacher: 10,
        excludeTeachers: [],
        maxMinutesPerTeacher: 120,
        maxConsecutiveDuties: 5,
        firstGradeAdaptationDuty: false,
        peSupervisionDuty: false,
        ...options.settings,
      },
    },
    planLekcji: {
      meta: { schoolName: 'SP Test', year: '2025/2026' },
      classes: [{ id: 'c1', name: '4A', color: '#3b82f6', groupIds: [] }],
      hours: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' },
        { num: 4, start: '10:45', end: '11:30' },
      ],
      teachers: options.teachers,
      rooms: [{ id: 'r1', name: '101', capacity: 30 }],
      subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#3b82f6' }],
      schoolGroups: [],
      assignments,
      lessons: {},
      specialStudents: [],
      specialAssignments: [],
      specialLessons: {},
      specialAbsences: {},
    },
  };

  // Każdy nauczyciel ma lekcje na godzinach 1..4 w wybranych dniach, aby był obecny na przerwach
  const schedData: SchedData = { y1: {} };
  daysWithLessons.forEach((dayIdx) => {
    schedData.y1[dayIdx] = {};
    [1, 2, 3, 4].forEach((hNum) => {
      schedData.y1[dayIdx][String(hNum)] = {
        col1: options.teachers.map((t) => ({
          teacherAbbr: t.abbr,
          subject: 'MAT',
          className: '4A',
          classes: ['4A'],
        })),
      };
    });
  });

  return { appState, schedData };
}

describe('dutyLimits — wspólna kalkulacja limitów i generator dyżurów', () => {
  it('dutyExempt, isAdministrative oraz proporcja FTE <= 0 zwracają limit 0 i nie są kandydatami (bez Math.max(15, ...))', () => {
    const exemptLimit = computeTeacherDutyLimits({
      teacher: makeTeacher({ id: 't1', abbr: 'EX', dutyExempt: true }),
      fteProportion: 1.0,
      avgMinutesForFullTime: 60,
      settings: { autoBalance: true, maxMinutesPerTeacher: 60, maxPerTeacher: 5 },
      breakDuration: 10,
    });
    expect(exemptLimit.maxMinutes).toBe(0);
    expect(exemptLimit.isCandidate).toBe(false);

    const adminLimit = computeTeacherDutyLimits({
      teacher: makeTeacher({ id: 't2', abbr: 'AD', isAdministrative: true }),
      fteProportion: 1.0,
      avgMinutesForFullTime: 60,
      settings: { autoBalance: true, maxMinutesPerTeacher: 60, maxPerTeacher: 5 },
      breakDuration: 10,
    });
    expect(adminLimit.maxMinutes).toBe(0);
    expect(adminLimit.isCandidate).toBe(false);

    const zeroFteMax = computeTeacherMaxMinutes({
      teacher: makeTeacher({ id: 't3', abbr: 'ZF' }),
      fteProportion: 0,
      avgMinutesForFullTime: 90,
      settings: { autoBalance: true, maxMinutesPerTeacher: 60, maxPerTeacher: 5 },
      breakDuration: 10,
    });
    expect(zeroFteMax).toBe(0);
  });

  it('nauczyciel z dutyExempt lub isAdministrative otrzymuje 0 dyżurów od generatora', () => {
    const exemptTeacher = makeTeacher({ id: 't1', abbr: 'ZW', dutyExempt: true });
    const adminTeacher = makeTeacher({ id: 't2', abbr: 'DYR', isAdministrative: true });
    const regularTeacher = makeTeacher({ id: 't3', abbr: 'OK' });

    const { appState, schedData } = buildTestFixtures({
      teachers: [exemptTeacher, adminTeacher, regularTeacher],
      daysWithLessons: [0],
      breaks: [
        { num: 1, name: 'P1', start: '08:45', end: '08:55' },
        { num: 2, name: 'P2', start: '09:40', end: '09:50' },
      ],
      settings: { maxPerTeacher: 5, maxMinutesPerTeacher: 60 },
    });

    const result = autoAssignDuties(appState, schedData);
    expect(result.teacherMaxMinutes['ZW']).toBe(0);
    expect(result.teacherMaxMinutes['DYR']).toBe(0);

    const entries = Object.values(result.harmonogram);
    expect(entries.filter((e) => e.teacherAbbr === 'ZW')).toHaveLength(0);
    expect(entries.filter((e) => e.teacherAbbr === 'DYR')).toHaveLength(0);
    expect(entries.filter((e) => e.teacherAbbr === 'OK')).toHaveLength(2);
  });

  it('teacher.maxDutyCount=1 daje twardy limit maks. 1 dyżur (bez rozluźniania buforami)', () => {
    const limitedTeacher = makeTeacher({ id: 't1', abbr: 'LIM', maxDutyCount: 1 });
    const { appState, schedData } = buildTestFixtures({
      teachers: [limitedTeacher],
      daysWithLessons: [0, 1],
      breaks: [
        { num: 1, name: 'P1', start: '08:45', end: '08:55' },
        { num: 2, name: 'P2', start: '09:40', end: '09:50' },
      ],
      settings: { maxPerTeacher: 10, maxMinutesPerTeacher: 120 },
    });

    const result = autoAssignDuties(appState, schedData);
    // Przerwy po 10 min * maxDutyCount=1 => limit 10 min
    expect(result.teacherMaxMinutes['LIM']).toBe(10);

    const assignedForLim = Object.values(result.harmonogram).filter(
      (e) => e.teacherAbbr === 'LIM'
    );
    expect(assignedForLim).toHaveLength(1);
    // Pozostałe wymagane sloty zostają puste z ostrzeżeniem
    expect(result.unfilledSlots.length).toBeGreaterThanOrEqual(3);
  });

  it('dyz.settings.maxPerTeacher=2 jest egzekwowane jako twardy limit liczby dyżurów', () => {
    const t1 = makeTeacher({ id: 't1', abbr: 'N1' });
    const { appState, schedData } = buildTestFixtures({
      teachers: [t1],
      daysWithLessons: [0, 1, 2],
      breaks: [
        { num: 1, name: 'P1', start: '08:45', end: '08:55' },
        { num: 2, name: 'P2', start: '09:40', end: '09:50' },
      ],
      settings: {
        autoBalance: true,
        maxPerTeacher: 2,
        maxMinutesPerTeacher: 180,
      },
    });

    const result = autoAssignDuties(appState, schedData);
    const assignedCount = Object.values(result.harmonogram).filter(
      (e) => e.teacherAbbr === 'N1'
    ).length;
    expect(assignedCount).toBe(2);
    expect(result.unfilledSlots.length).toBeGreaterThan(0);
  });

  it('dyz.settings.maxMinutesPerTeacher=20 przy przerwach 10 min ogranicza do maks. 2 dyżurów mimo buforów', () => {
    const t1 = makeTeacher({ id: 't1', abbr: 'N1' });
    const { appState, schedData } = buildTestFixtures({
      teachers: [t1],
      daysWithLessons: [0, 1, 2],
      breaks: [
        { num: 1, name: 'P1', start: '08:45', end: '08:55' },
        { num: 2, name: 'P2', start: '09:40', end: '09:50' },
      ],
      settings: {
        autoBalance: true,
        maxPerTeacher: 10,
        maxMinutesPerTeacher: 20,
      },
    });

    const result = autoAssignDuties(appState, schedData);
    const assignedCount = Object.values(result.harmonogram).filter(
      (e) => e.teacherAbbr === 'N1'
    ).length;
    expect(assignedCount).toBe(2);
    expect(result.unfilledSlots.length).toBeGreaterThan(0);
  });

  it('miejsce z teachersNeeded=2 dostaje 2 różne osoby na tej samej przerwie oraz poprawny wydruk', () => {
    const t1 = makeTeacher({ id: 't1', abbr: 'AA', first: 'Anna', last: 'Abacka' });
    const t2 = makeTeacher({ id: 't2', abbr: 'BB', first: 'Beata', last: 'Babacka' });

    const { appState, schedData } = buildTestFixtures({
      teachers: [t1, t2],
      daysWithLessons: [0],
      places: [{ id: 'hol', name: 'Hol Główny', teachersNeeded: 2 }],
      breaks: [{ num: 1, name: 'Długa', start: '09:40', end: '09:55' }],
      settings: { maxPerTeacher: 3, maxMinutesPerTeacher: 60 },
    });

    const result = autoAssignDuties(appState, schedData);
    const slot1 = result.harmonogram[getDutySlotKey('hol', 0, 1, 1)];
    const slot2 = result.harmonogram[getDutySlotKey('hol', 0, 1, 2)];

    expect(slot1?.teacherAbbr).toBeTruthy();
    expect(slot2?.teacherAbbr).toBeTruthy();
    expect(slot1?.teacherAbbr).not.toBe(slot2?.teacherAbbr);
    expect(new Set([slot1?.teacherAbbr, slot2?.teacherAbbr])).toEqual(new Set(['AA', 'BB']));

    // Weryfikacja parsera kluczy
    expect(parseDutySlotKey(getDutySlotKey('hol', 0, 1, 1))).toEqual({
      placeId: 'hol',
      day: 0,
      breakNum: 1,
      slotIdx: 1,
    });
    expect(parseDutySlotKey(getDutySlotKey('hol', 0, 1, 2))).toEqual({
      placeId: 'hol',
      day: 0,
      breakNum: 1,
      slotIdx: 2,
    });

    // Wydruk HTML zawiera oba nazwiska/skróty
    const updatedAppState: AppState = {
      ...appState,
      dyzury: {
        ...appState.dyzury,
        harmonogram: result.harmonogram,
      },
    };
    const html = generateDutiesHtml(updatedAppState, schedData);
    expect(html).toContain('AA');
    expect(html).toContain('BB');
    expect(html).toContain('(2 os.)');
  });

  it('isTeacherAvailableForBreak respektuje Teacher.availability także gdy nauczyciel ma lekcje danego dnia', () => {
    // Nauczyciel ma lekcje 1..4 w dniu 0, ale zadeklarował dostępność wyłącznie dla '0-1' i '0-4' (brak '0-2' i '0-3')
    const restrictedTeacher = makeTeacher({
      id: 't1',
      abbr: 'AV',
      availability: ['0-1', '0-4'],
    });
    const backupTeacher = makeTeacher({
      id: 't2',
      abbr: 'BK',
      availability: [],
    });

    const { appState, schedData } = buildTestFixtures({
      teachers: [restrictedTeacher, backupTeacher],
      daysWithLessons: [0],
      breaks: [
        { num: 1, name: 'P1', start: '08:45', end: '08:55' },
        { num: 2, name: 'P2', start: '09:40', end: '09:50' },
        { num: 3, name: 'P3', start: '10:35', end: '10:45' },
      ],
      settings: { maxPerTeacher: 5, maxMinutesPerTeacher: 60 },
    });

    const personnel = buildAllDutyPersonnel(appState);
    const avPerson = personnel.find(p => p.abbr === 'AV')!;

    expect(isTeacherAvailableForBreak(avPerson, 0, appState.dyzury.przerwy[0], appState, schedData)).toBe(true);
    expect(isTeacherAvailableForBreak(avPerson, 0, appState.dyzury.przerwy[1], appState, schedData)).toBe(false);
    expect(isTeacherAvailableForBreak(avPerson, 0, appState.dyzury.przerwy[2], appState, schedData)).toBe(false);

    const result = autoAssignDuties(appState, schedData);
    expect(result.harmonogram[getDutySlotKey('p1', 0, 2, 1)]?.teacherAbbr).not.toBe('AV');
    expect(result.harmonogram[getDutySlotKey('p1', 0, 3, 1)]?.teacherAbbr).not.toBe('AV');
  });
});
