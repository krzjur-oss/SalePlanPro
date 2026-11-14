import { describe, it, expect } from 'vitest';
import { AppState, PlanLekcjiState, SchedCell, SchedData } from '../types';
import { autoGenerateRooms, RoomGeneratorOptions } from '../utils/roomGenerator';
import { isGrade1to3, isSpecializedLabRoom } from '../utils/roomUtils';
import { determineGradeLevel } from '../services/hygieneAuditService';
import { isClassGrade1_3 } from '../utils/mergeEngine';

function makePlanLekcji(partial: Partial<PlanLekcjiState>): PlanLekcjiState {
  return {
    meta: { schoolName: 'Szkoła Testowa', year: '2025/2026' },
    hours: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' }
    ],
    classes: [],
    teachers: [],
    rooms: [],
    subjects: [],
    schoolGroups: [],
    assignments: [],
    lessons: {},
    specialStudents: [],
    specialAssignments: [],
    specialLessons: {},
    specialAbsences: {},
    ...partial
  };
}

function createBaseAppState(
  planPartial: Partial<PlanLekcjiState>,
  overrides?: Partial<Omit<AppState, 'planLekcji'>>
): AppState {
  const planLekcji = makePlanLekcji(planPartial);
  const rooms = planLekcji.rooms;

  const floors = overrides?.floors ?? [
    {
      id: 'f0',
      name: 'Parter',
      color: '#e2e8f0',
      buildingIdx: 0,
      segments: [
        {
          id: 's0',
          name: 'Skrzydło A',
          rooms: rooms.map((r, idx) => ({ id: r.id || `room_${idx}`, num: r.name }))
        }
      ]
    }
  ];

  return {
    yearKey: 'y_2025_2026',
    yearLabel: '2025/2026',
    hours: planLekcji.hours.map((h) => String(h.num)),
    timeslots: planLekcji.hours,
    school: { name: 'Szkoła Testowa', short: 'ST' },
    buildings: [{ id: 'b0', name: 'Budynek Główny', multi: false }],
    floors,
    classes: planLekcji.classes,
    teachers: planLekcji.teachers,
    subjects: planLekcji.subjects,
    homerooms: {},
    dyzury: {
      miejsca: [],
      przerwy: [],
      harmonogram: {},
      settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] }
    },
    planLekcji,
    ...overrides
  };
}

function countAllSchedEntries(schedData: SchedData, yearKey: string): number {
  let count = 0;
  const year = schedData[yearKey] || {};
  Object.values(year).forEach((dayObj) => {
    Object.values(dayObj || {}).forEach((hourObj) => {
      Object.values(hourObj || {}).forEach((cellOrArr) => {
        if (!cellOrArr) return;
        count += Array.isArray(cellOrArr) ? cellOrArr.length : 1;
      });
    });
  });
  return count;
}

function collectAllCells(
  schedData: SchedData,
  yearKey: string
): { colKey: string; day: string; hour: string; cell: SchedCell }[] {
  const list: { colKey: string; day: string; hour: string; cell: SchedCell }[] = [];
  const year = schedData[yearKey] || {};
  Object.entries(year).forEach(([day, dayObj]) => {
    Object.entries(dayObj || {}).forEach(([hour, hourObj]) => {
      Object.entries(hourObj || {}).forEach(([colKey, cellOrArr]) => {
        if (!cellOrArr) return;
        const arr = Array.isArray(cellOrArr) ? cellOrArr : [cellOrArr];
        arr.forEach((cell) => list.push({ colKey, day, hour, cell }));
      });
    });
  });
  return list;
}

const DEFAULT_GEN_OPTIONS: RoomGeneratorOptions = {
  genPriorityHomerooms: true,
  genPriorityTeachers: true,
  genExcludeWF: true,
  genAutoPlaceWF: true,
  genClearExisting: true
};

describe('PlanSal – generator sal i klasyfikacja klas 1–3', () => {
  it('isGrade1to3: klasyfikuje wyłącznie po cls.year gdy zdefiniowane, fallback /^[1-3](?!\\d)/ nie łapie "10A" i "11B"', () => {
    expect(isGrade1to3({ name: '1A', year: null })).toBe(true);
    expect(isGrade1to3({ name: '2B', year: undefined })).toBe(true);
    expect(isGrade1to3({ name: '3C' })).toBe(true);

    expect(isGrade1to3({ name: '10A', year: null })).toBe(false);
    expect(isGrade1to3({ name: '11B', year: undefined })).toBe(false);
    expect(isGrade1to3({ name: '20C' })).toBe(false);
    expect(isGrade1to3({ name: '4A' })).toBe(false);

    // Gdy year jest zdefiniowany, decyduje wyłącznie year (1..3)
    expect(isGrade1to3({ name: '1A', year: 4 })).toBe(false);
    expect(isGrade1to3({ name: '10A', year: 2 })).toBe(true);
    expect(isGrade1to3({ name: 'Oddział B', year: 1 })).toBe(true);
    expect(isGrade1to3({ name: '1A', year: 10 })).toBe(false);

    // Spójność innych miejsc w aplikacji
    expect(determineGradeLevel('10A')).toBe('ponadpodstawowa');
    expect(determineGradeLevel('1A')).toBe('1-3');
    expect(isClassGrade1_3('10A')).toBe(false);
    expect(isClassGrade1_3('1A', 4)).toBe(false);
    expect(isClassGrade1_3('1A')).toBe(true);
  });

  it('klasy 1A–3A bez zdefiniowanych homerooms ani sal isGrade1_3 otrzymują wszystkie lekcje w wolnych salach', () => {
    const appState = createBaseAppState({
      hours: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' }
      ],
      classes: [
        { id: 'c1', name: '1A', color: '#f00', groupIds: [], year: 1 },
        { id: 'c2', name: '2A', color: '#0f0', groupIds: [], year: 2 },
        { id: 'c3', name: '3A', color: '#00f', groupIds: [], year: 3 }
      ],
      teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
      rooms: [
        { id: 'r1', name: '101', capacity: 28 },
        { id: 'r2', name: '102', capacity: 28 },
        { id: 'r3', name: '103', capacity: 15 } // mniejsza pojemność weryfikuje także brak progu -4000
      ],
      subjects: [{ id: 's_pol', name: 'Edukacja polonistyczna', short: 'POL', color: '#3b82f6' }],
      assignments: [
        { id: 'a1', classId: 'c1', teacherId: 't1', subjectId: 's_pol', roomId: null, hoursPerWeek: 1, groupId: null },
        { id: 'a2', classId: 'c2', teacherId: 't1', subjectId: 's_pol', roomId: null, hoursPerWeek: 1, groupId: null },
        { id: 'a3', classId: 'c3', teacherId: 't1', subjectId: 's_pol', roomId: null, hoursPerWeek: 1, groupId: null }
      ],
      lessons: {
        'c1|0|0': { assignmentId: 'a1', locked: false },
        'c2|0|0': { assignmentId: 'a2', locked: false },
        'c3|0|0': { assignmentId: 'a3', locked: false }
      }
    });

    const result = autoGenerateRooms(appState, {}, DEFAULT_GEN_OPTIONS);

    expect(result.totalPlaced).toBe(3);
    expect(result.totalUnassigned).toBe(0);
    expect(countAllSchedEntries(result.nextSchedData, appState.yearKey)).toBe(3);
  });

  it('klasa "10A" nie jest traktowana jako klasa 1–3 i woli zwykłą salę zamiast sali isGrade1_3', () => {
    const appState = createBaseAppState({
      hours: [{ num: 1, start: '08:00', end: '08:45' }],
      classes: [{ id: 'c10', name: '10A', color: '#f00', groupIds: [], year: null }],
      teachers: [{ id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN' }],
      rooms: [
        { id: 'r_junior', name: '101', capacity: 30, isGrade1_3: true },
        { id: 'r_std', name: '102', capacity: 28, isGrade1_3: false }
      ],
      subjects: [{ id: 's_mat', name: 'Matematyka', short: 'MAT', color: '#2563eb' }],
      assignments: [
        { id: 'a10', classId: 'c10', teacherId: 't1', subjectId: 's_mat', roomId: null, hoursPerWeek: 1, groupId: null }
      ],
      lessons: {
        'c10|0|0': { assignmentId: 'a10', locked: false }
      }
    });

    const result = autoGenerateRooms(appState, {}, DEFAULT_GEN_OPTIONS);
    const cells = collectAllCells(result.nextSchedData, appState.yearKey);

    expect(result.totalPlaced).toBe(1);
    expect(cells).toHaveLength(1);
    expect(cells[0].colKey).toBe('f0_s0_102');
  });

  it('drugi przebieg z genClearExisting=false nie zwiększa liczby wpisów w planie sal', () => {
    const appState = createBaseAppState({
      hours: [{ num: 1, start: '08:00', end: '08:45' }],
      classes: [
        { id: 'c5a', name: '5A', color: '#f00', groupIds: ['g1'], year: 5 },
        { id: 'c5b', name: '5B', color: '#0f0', groupIds: [], year: 5 }
      ],
      teachers: [
        { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
        { id: 't2', first: 'Ewa', last: 'Lis', abbr: 'EL' }
      ],
      rooms: [
        { id: 'r1', name: '101', capacity: 28 },
        { id: 'r2', name: '102', capacity: 28 },
        { id: 'r3', name: '103', capacity: 28 },
        { id: 'r4', name: '104', capacity: 28 }
      ],
      subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#2563eb' }],
      schoolGroups: [{ id: 'g1', name: 'gr1', classId: 'c5a' }],
      assignments: [
        { id: 'a1', classId: 'c5a', teacherId: 't1', subjectId: 's1', roomId: null, hoursPerWeek: 1, groupId: 'g1' },
        { id: 'a2', classId: 'c5b', teacherId: 't2', subjectId: 's1', roomId: null, hoursPerWeek: 1, groupId: null }
      ],
      lessons: {
        'c5a|0|0|g1': { assignmentId: 'a1', locked: false },
        'c5b|0|0': { assignmentId: 'a2', locked: false }
      }
    });

    const firstRun = autoGenerateRooms(appState, {}, { ...DEFAULT_GEN_OPTIONS, genClearExisting: true });
    expect(firstRun.totalPlaced).toBe(2);
    expect(countAllSchedEntries(firstRun.nextSchedData, appState.yearKey)).toBe(2);

    const secondRun = autoGenerateRooms(appState, firstRun.nextSchedData, {
      ...DEFAULT_GEN_OPTIONS,
      genClearExisting: false
    });
    expect(secondRun.totalPlaced).toBe(0);
    expect(secondRun.totalUnassigned).toBe(0);
    expect(countAllSchedEntries(secondRun.nextSchedData, appState.yearKey)).toBe(2);
  });

  it('lekcja międzyoddziałowa z linkedGroupIds (5A gr1 + 5B gr1) otrzymuje jedną salę z obiema klasami', () => {
    const appState = createBaseAppState({
      hours: [{ num: 1, start: '08:00', end: '08:45' }],
      classes: [
        { id: 'c5a', name: '5A', color: '#f00', groupIds: ['g_5a_1'], year: 5 },
        { id: 'c5b', name: '5B', color: '#0f0', groupIds: ['g_5b_1'], year: 5 }
      ],
      teachers: [{ id: 't1', first: 'Piotr', last: 'Mazur', abbr: 'PM' }],
      rooms: [
        { id: 'r1', name: '101', capacity: 20 },
        { id: 'r2', name: '102', capacity: 20 }
      ],
      subjects: [{ id: 's_ang', name: 'Język angielski', short: 'ANG', color: '#10b981' }],
      schoolGroups: [
        { id: 'g_5a_1', name: 'gr1', classId: 'c5a' },
        { id: 'g_5b_1', name: 'gr1', classId: 'c5b' }
      ],
      assignments: [
        {
          id: 'a_ang',
          classId: 'c5a',
          teacherId: 't1',
          subjectId: 's_ang',
          roomId: null,
          hoursPerWeek: 1,
          groupId: 'g_5a_1',
          linkedGroupIds: ['g_5b_1']
        }
      ],
      lessons: {
        'c5a|0|0|g_5a_1': { assignmentId: 'a_ang', locked: false },
        'c5b|0|0|g_5b_1': { assignmentId: 'a_ang', locked: false }
      }
    });

    const result = autoGenerateRooms(appState, {}, DEFAULT_GEN_OPTIONS);
    const cells = collectAllCells(result.nextSchedData, appState.yearKey);

    expect(result.totalPlaced).toBe(1);
    expect(cells).toHaveLength(1);
    expect(cells[0].cell.classes).toEqual(['5A', '5B']);
    expect(cells[0].cell._bridgeMeta?.linkedGroupIds).toEqual(['g_5b_1']);
    expect(cells[0].cell._bridgeMeta?.assignmentId).toBe('a_ang');
  });

  it('przydział asg.roomId dla pracowni (type: "informatyka") jest twardym wymogiem i ostrzega przy zajętości', () => {
    expect(isSpecializedLabRoom({ id: 'r_inf', name: '205', type: 'informatyka' })).toBe(true);
    expect(isSpecializedLabRoom({ id: 'r_std', name: '101', type: 'ogolna' })).toBe(false);
    expect(isSpecializedLabRoom({ id: 'r_undef', name: '102' })).toBe(false);

    const appState = createBaseAppState({
      hours: [{ num: 1, start: '08:00', end: '08:45' }],
      classes: [
        { id: 'c5a', name: '5A', color: '#f00', groupIds: [], year: 5 },
        { id: 'c6a', name: '6A', color: '#0f0', groupIds: [], year: 6 }
      ],
      teachers: [
        { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
        { id: 't2', first: 'Ewa', last: 'Lis', abbr: 'EL' }
      ],
      rooms: [
        { id: 'r_inf', name: '205', type: 'informatyka', capacity: 16 },
        { id: 'r_std', name: '101', type: 'ogolna', capacity: 30 }
      ],
      subjects: [{ id: 's_inf', name: 'Informatyka', short: 'INF', color: '#8b5cf6' }],
      assignments: [
        { id: 'a1', classId: 'c5a', teacherId: 't1', subjectId: 's_inf', roomId: 'r_inf', hoursPerWeek: 1, groupId: null },
        { id: 'a2', classId: 'c6a', teacherId: 't2', subjectId: 's_inf', roomId: 'r_inf', hoursPerWeek: 1, groupId: null }
      ],
      lessons: {
        'c5a|0|0': { assignmentId: 'a1', locked: false },
        'c6a|0|0': { assignmentId: 'a2', locked: false }
      }
    });

    // Dwie lekcje chcą tej samej pracowni informatycznej 205 (mimo wolnej zwykłej sali 101)
    const result = autoGenerateRooms(appState, {}, DEFAULT_GEN_OPTIONS);
    const cells = collectAllCells(result.nextSchedData, appState.yearKey);

    expect(result.totalPlaced).toBe(1);
    expect(result.totalUnassigned).toBe(1);
    expect(cells).toHaveLength(1);
    expect(cells[0].colKey).toBe('f0_s0_205');
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('205');
  });
});
