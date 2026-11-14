import { describe, it, expect } from 'vitest';
import { PlanGeneratorOptions, runPlanGenerationAlgorithm } from '../components/PlanGenerator';
import { AppState } from '../types';
import { detectConflicts, groupsOverlap } from '../utils/conflictEngine';

const baseOptions: PlanGeneratorOptions = {
  maxGapsPerTeacher: 2,
  obeyAvailability: true,
  avoidExtremes: false,
  avoidExtremesSubjectIds: [],
  noStudentGaps: true,
  allowDoubleBlocks: false,
  includeSpecialNI: true,
  limitComputerLabs: false,
  customComputerLabsCount: 1,
  minAvailableSubstitutionTeachersPerSlot: 0,
  forceOptionalToExtremes: false,
  optionalSubjectIds: []
};

function createTestAppState(): AppState {
  const hours = [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:50', end: '11:35' },
    { num: 5, start: '11:45', end: '12:30' },
    { num: 6, start: '12:40', end: '13:25' },
    { num: 7, start: '13:35', end: '14:20' },
    { num: 8, start: '14:25', end: '15:10' }
  ];

  return {
    yearKey: 'y_2025_2026',
    yearLabel: '2025/2026',
    school: { name: 'Szkoła Testowa', short: 'ST', phone: '', web: '' },
    hours: hours.map(h => String(h.num)),
    timeslots: hours,
    buildings: [{ id: 'b1', name: 'Budynek Główny' }],
    floors: [],
    classes: [],
    teachers: [],
    subjects: [],
    homerooms: {},
    dyzury: {
      miejsca: [],
      przerwy: [],
      harmonogram: {},
      settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] }
    },
    planLekcji: {
      meta: { schoolName: 'Szkoła Testowa', year: '2025/2026' },
      hours,
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
      specialAbsences: {}
    }
  };
}

describe('PlanGenerator – Audyt partycji grup, metryk, NI i zablokowanych lekcji (P1)', () => {
  it('groupsOverlap: prawidłowo rozstrzyga kolizje wg partitionId i studentIds', () => {
    const groups = [
      { id: 'g_lang1', name: 'Ang gr 1', classId: 'c1', partitionId: 'lang' },
      { id: 'g_lang2', name: 'Ang gr 2', classId: 'c1', partitionId: 'lang' },
      { id: 'g_pe1', name: 'WF ch', classId: 'c1', partitionId: 'pe' },
      { id: 'g_s1', name: 'Koło A', classId: 'c1', studentIds: ['u1', 'u2'] },
      { id: 'g_s2', name: 'Koło B', classId: 'c1', studentIds: ['u2', 'u3'] },
      { id: 'g_s3', name: 'Koło C', classId: 'c1', partitionId: 'pe', studentIds: ['u4', 'u5'] }
    ];

    expect(groupsOverlap(null, 'g_lang1', groups)).toBe(true);
    expect(groupsOverlap('g_lang1', 'g_lang1', groups)).toBe(true);
    expect(groupsOverlap('g_lang1', 'g_lang2', groups)).toBe(false);
    expect(groupsOverlap('g_lang1', 'g_pe1', groups)).toBe(true);
    expect(groupsOverlap('g_s1', 'g_s2', groups)).toBe(true);
    expect(groupsOverlap('g_s1', 'g_s3', groups)).toBe(false);
  });

  it('Scenariusz P1: języki + WF (12 godzin, różne partitionId) kończy się z 0 konfliktów i 12/12 ułożonymi godzinami', () => {
    const appState = createTestAppState();
    const pl = appState.planLekcji;

    pl.classes = [
      {
        id: 'c_1a',
        name: '1A',
        color: '#3b82f6',
        groupIds: ['g_lang1', 'g_lang2', 'g_pe1', 'g_pe2']
      }
    ];

    pl.schoolGroups = [
      { id: 'g_lang1', name: 'Język 1', classId: 'c_1a', partitionId: 'lang' },
      { id: 'g_lang2', name: 'Język 2', classId: 'c_1a', partitionId: 'lang' },
      { id: 'g_pe1', name: 'WF Chłopcy', classId: 'c_1a', partitionId: 'pe' },
      { id: 'g_pe2', name: 'WF Dziewczęta', classId: 'c_1a', partitionId: 'pe' }
    ];

    pl.teachers = [
      { id: 't_ang', first: 'Anna', last: 'Angielska', abbr: 'AA' },
      { id: 't_niem', first: 'Nadia', last: 'Niemiecka', abbr: 'NN' },
      { id: 't_wf1', first: 'Jan', last: 'Sportowy', abbr: 'JS' },
      { id: 't_wf2', first: 'Ewa', last: 'Biegacz', abbr: 'EB' }
    ];

    pl.subjects = [
      { id: 's_ang', name: 'Język angielski', short: 'ANG', color: '#2563eb' },
      { id: 's_niem', name: 'Język niemiecki', short: 'NIEM', color: '#f59e0b' },
      { id: 's_wf', name: 'Wychowanie fizyczne', short: 'WF', color: '#10b981' }
    ];

    pl.rooms = [
      { id: 'r_101', name: '101' },
      { id: 'r_102', name: '102' },
      { id: 'r_sg', name: 'SG', type: 'sport' }
    ];

    // 3h + 3h + 3h + 3h = 12 godzin
    pl.assignments = [
      { id: 'a_l1', classId: 'c_1a', groupId: 'g_lang1', teacherId: 't_ang', subjectId: 's_ang', roomId: 'r_101', hoursPerWeek: 3 },
      { id: 'a_l2', classId: 'c_1a', groupId: 'g_lang2', teacherId: 't_niem', subjectId: 's_niem', roomId: 'r_102', hoursPerWeek: 3 },
      { id: 'a_p1', classId: 'c_1a', groupId: 'g_pe1', teacherId: 't_wf1', subjectId: 's_wf', roomId: 'r_sg', hoursPerWeek: 3 },
      { id: 'a_p2', classId: 'c_1a', groupId: 'g_pe2', teacherId: 't_wf2', subjectId: 's_wf', roomId: 'r_sg', hoursPerWeek: 3 }
    ];

    const result = runPlanGenerationAlgorithm(appState, baseOptions);

    expect(result.totalRegular).toBe(12);
    expect(result.placedRegular).toBe(12);
    expect(result.conflicts).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.success).toBe(true);

    // Weryfikacja bezpośrednia przez detectConflicts
    const finalCheck = detectConflicts({
      ...pl,
      lessons: result.updatedLessons,
      specialLessons: result.updatedSpecialLessons
    });
    expect(finalCheck).toHaveLength(0);

    // Grupy z partycji 'lang' i 'pe' nie mogą występować w tym samym slocie czasowym
    const slotPartitions = new Map<string, Set<string>>();
    Object.keys(result.updatedLessons).forEach(key => {
      const [, day, hour, groupId] = key.split('|');
      const slot = `${day}|${hour}`;
      const part = pl.schoolGroups.find(g => g.id === groupId)?.partitionId || '';
      const set = slotPartitions.get(slot) || new Set<string>();
      set.add(part);
      slotPartitions.set(slot, set);
    });

    slotPartitions.forEach(parts => {
      expect(parts.size).toBe(1);
    });
  });

  it('grupy bez partycji ze wspólnym uczniem (studentIds) nie lądują w tym samym slocie', () => {
    const appState = createTestAppState();
    const pl = appState.planLekcji;

    pl.classes = [{ id: 'c1', name: '2A', color: '#3b82f6', groupIds: ['g_a', 'g_b'] }];
    pl.schoolGroups = [
      { id: 'g_a', name: 'Grupa A', classId: 'c1', studentIds: ['uczen_1', 'uczen_2'] },
      { id: 'g_b', name: 'Grupa B', classId: 'c1', studentIds: ['uczen_2', 'uczen_3'] } // wspólny uczen_2!
    ];
    pl.teachers = [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN' }
    ];
    pl.subjects = [
      { id: 's1', name: 'Informatyka', short: 'INF', color: '#6366f1' }
    ];
    pl.rooms = [
      { id: 'r1', name: '201' },
      { id: 'r2', name: '202' }
    ];
    pl.assignments = [
      { id: 'asg1', classId: 'c1', groupId: 'g_a', teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 2 },
      { id: 'asg2', classId: 'c1', groupId: 'g_b', teacherId: 't2', subjectId: 's1', roomId: 'r2', hoursPerWeek: 2 }
    ];

    const result = runPlanGenerationAlgorithm(appState, baseOptions);
    expect(result.success).toBe(true);
    expect(result.placedRegular).toBe(4);
    expect(result.totalRegular).toBe(4);
    expect(result.conflicts).toHaveLength(0);

    // Muszą zająć 4 rozłączne sloty (nie mogą być równolegle)
    const slots = new Set(Object.keys(result.updatedLessons).map(k => {
      const p = k.split('|');
      return `${p[1]}|${p[2]}`;
    }));
    expect(slots.size).toBe(4);
  });

  it('kolizja NI (specialLessons jako Record) jest wykrywana w kontroli końcowej i raportowana osobno w polu conflicts', () => {
    const appState = createTestAppState();
    const pl = appState.planLekcji;

    pl.classes = [{ id: 'c1', name: '3A', color: '#3b82f6', groupIds: [] }];
    pl.teachers = [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }];
    pl.subjects = [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#2563eb' }];
    pl.rooms = [{ id: 'r1', name: '101' }, { id: 'r2', name: '102' }];
    pl.assignments = [
      { id: 'a_reg', classId: 'c1', groupId: null, teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 2 }
    ];

    pl.specialStudents = [{ id: 'st1', firstName: 'Ala', lastName: 'Kot', classId: null, type: 'ni' }];
    pl.specialAssignments = [
      { id: 'sp_1', studentId: 'st1', teacherId: 't1', subjectId: 's1', roomId: 'r2', hoursPerWeek: 1, withClass: false }
    ];

    // Zablokowana lekcja klasowa oraz zablokowana lekcja NI w tym samym slocie (dzień 0, lekcja 0) z tym samym nauczycielem t1!
    pl.lessons = {
      'c1|0|0': { assignmentId: 'a_reg', locked: true }
    };
    pl.specialLessons = {
      'st1|0|0|sp_1': { assignmentId: 'sp_1', locked: true }
    };

    const result = runPlanGenerationAlgorithm(appState, { ...baseOptions, includeSpecialNI: true });

    // totalRegular = suma hoursPerWeek (2) minus 1 zablokowana = 1 (nie zawyżone przez konflikty!)
    expect(result.totalRegular).toBe(1);
    expect(result.placedRegular).toBe(1);
    expect(result.conflicts.some(c => c.type === 'teacher')).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.success).toBe(false);
  });

  it('usuwa zablokowane lekcje bez istniejącego przydziału, dodaje ostrzeżenie i poprawnie liczy metrykę totalRegular', () => {
    const appState = createTestAppState();
    const pl = appState.planLekcji;

    pl.classes = [{ id: 'c1', name: '4A', color: '#3b82f6', groupIds: [] }];
    pl.teachers = [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK', availability: ['0-1'] }];
    pl.subjects = [{ id: 's1', name: 'Fizyka', short: 'FIZ', color: '#8b5cf6' }];
    pl.rooms = [{ id: 'r1', name: '105' }];
    pl.assignments = [
      { id: 'a_valid', classId: 'c1', groupId: null, teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 2 }
    ];

    // Osierocone zablokowane lekcje (nieistniejące przydziały) + nauczyciel dostępny tylko 1h przy przydziale 2h
    pl.lessons = {
      'c1|0|0': { assignmentId: 'non_existent_asg', locked: true }
    };
    pl.specialLessons = {
      'st_ghost|0|1|non_existent_sp': { assignmentId: 'non_existent_sp', locked: true }
    };

    const result = runPlanGenerationAlgorithm(appState, baseOptions);

    // Osierocone lekcje zostały usunięte i nie zablokowały slotu (0,0) dla prawidłowego przydziału
    expect(result.updatedLessons['c1|0|0']?.assignmentId).toBe('a_valid');
    expect(result.updatedSpecialLessons['st_ghost|0|1|non_existent_sp']).toBeUndefined();
    expect(result.totalRegular).toBe(2);
    expect(result.placedRegular).toBe(1);
    // Ostrzeżenia: 2 o osieroconych zablokowanych + 1 o nieułożonej lekcji = 3 (totalRegular pozostało 2!)
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    expect(result.warnings.some(w => w.includes('non_existent_asg'))).toBe(true);
    expect(result.warnings.some(w => w.includes('non_existent_sp'))).toBe(true);
    expect(result.success).toBe(false);
  });
});
