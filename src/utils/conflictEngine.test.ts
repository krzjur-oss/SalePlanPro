import { describe, it, expect } from 'vitest';
import { detectConflicts, detectConflictsMap } from './conflictEngine';
import { PlanLekcjiState, Assignment, ClassRoom } from '../types';

describe('ConflictEngine - detectConflicts', () => {
  const createBasePlan = (): PlanLekcjiState => ({
    meta: { schoolName: 'Test School', year: '2025/2026' },
    hours: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' }
    ],
    classes: [
      { id: 'c1', name: '1A', color: '#3b82f6', groupIds: ['g1', 'g2'] },
      { id: 'c2', name: '1B', color: '#10b981', groupIds: [] }
    ],
    teachers: [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN' },
      { id: 't_sup', first: 'Marta', last: 'Wspom', abbr: 'MW' }
    ],
    subjects: [
      { id: 's1', name: 'Matematyka', short: 'MAT', color: '#ef4444' },
      { id: 's2', name: 'Język angielski', short: 'ANG', color: '#3b82f6' }
    ],
    rooms: [
      { id: 'r1', name: '101' },
      { id: 'r2', name: '102' },
      { id: 'r_gym_multi', name: 'SG Duża', type: 'sport', singleClassLimit: false },
      { id: 'r_gym_single', name: 'SG Mała', type: 'sport', singleClassLimit: true }
    ],
    schoolGroups: [
      { id: 'g1', name: 'Gr 1', classId: 'c1' },
      { id: 'g2', name: 'Gr 2', classId: 'c1' }
    ],
    assignments: [],
    lessons: {},
    specialStudents: [],
    specialAssignments: [],
    specialLessons: {},
    specialAbsences: {}
  });

  it('ten sam assignmentId (lekcja łączona) NIE stanowi konfliktu nauczyciela ani sali', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_joint',
        classId: 'c1',
        linkedClassIds: ['c2'],
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: null
      }
    ];

    // Dwie klasy mają lekcję z tym samym assignmentId w tej samej sali o tej samej porze
    pl.lessons = {
      'c1|0|0': { assignmentId: 'asg_joint', locked: false },
      'c2|0|0': { assignmentId: 'asg_joint', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.length).toBe(0);
  });

  it('lekcja całej klasy koliduje z inną lekcją tej samej klasy (zarówno całą klasą jak i grupą)', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_whole',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: null
      },
      {
        id: 'asg_group',
        classId: 'c1',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: 'g1'
      }
    ];

    // W tym samym slocie: lekcja całej klasy i lekcja grupy
    pl.lessons = {
      'c1|0|0': { assignmentId: 'asg_whole', locked: false },
      'c1|0|0|g1': { assignmentId: 'asg_group', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.some(c => c.type === 'class')).toBe(true);
  });

  it('dwie różne grupy tej samej klasy NIE kolidują, o ile mają różnych nauczycieli i różne sale', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_g1',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: 'g1'
      },
      {
        id: 'asg_g2',
        classId: 'c1',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: 'g2'
      }
    ];

    pl.lessons = {
      'c1|0|0|g1': { assignmentId: 'asg_g1', locked: false },
      'c1|0|0|g2': { assignmentId: 'asg_g2', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.length).toBe(0);
  });

  it('ta sama grupa tej samej klasy koliduje ze sobą w tym samym slocie', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_g1_a',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: 'g1'
      },
      {
        id: 'asg_g1_b',
        classId: 'c1',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: 'g1'
      }
    ];

    pl.lessons = {
      'c1|0|0|g1': { assignmentId: 'asg_g1_a', locked: false },
      'c1|0|0|g1_dup': { assignmentId: 'asg_g1_b', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.some(c => c.type === 'class')).toBe(true);
  });

  it('lekcje specialLessons z teacherId/supportTeacherId są porównywane z lekcjami klasowymi i generują konflikt', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_reg',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: null
      }
    ];
    pl.specialAssignments = [
      {
        id: 'sp_asg',
        studentId: 'st_1',
        teacherId: 't1', // ten sam nauczyciel!
        subjectId: 's1',
        hoursPerWeek: 1,
        withClass: false
      }
    ];

    pl.lessons = {
      'c1|0|0': { assignmentId: 'asg_reg', locked: false }
    };
    pl.specialLessons = {
      'st_1|0|0|sp_asg': { assignmentId: 'sp_asg' }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.some(c => c.type === 'teacher')).toBe(true);
  });

  it('uwzględnia supportTeacherId w konfliktach nauczycieli', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_1',
        classId: 'c1',
        teacherId: 't1',
        supportTeacherId: 't_sup',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: null
      },
      {
        id: 'asg_2',
        classId: 'c2',
        teacherId: 't2',
        supportTeacherId: 't_sup', // ten sam wspomagający w innej klasie!
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: null
      }
    ];

    pl.lessons = {
      'c1|0|0': { assignmentId: 'asg_1', locked: false, supportTeacherId: 't_sup' },
      'c2|0|0': { assignmentId: 'asg_2', locked: false, supportTeacherId: 't_sup' }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.some(c => c.type === 'teacher')).toBe(true);
  });

  it('uwzględnia dostępność nauczyciela (availability)', () => {
    const pl = createBasePlan();
    pl.teachers[0].availability = ['1-0', '1-1']; // t1 dostępny tylko w dniu 1 (wtorek)

    pl.assignments = [
      {
        id: 'asg_1',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: null
      }
    ];

    // Lekcja przypisana w poniedziałek (dzień 0, lekcja 0) -> niedostępność!
    pl.lessons = {
      'c1|0|0': { assignmentId: 'asg_1', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.some(c => c.type === 'availability')).toBe(true);
  });

  it('uwzględnia limit sal sportowych (multi-class vs singleClassLimit)', () => {
    const pl = createBasePlan();
    pl.assignments = [
      {
        id: 'asg_pe1',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r_gym_multi',
        hoursPerWeek: 1,
        groupId: null
      },
      {
        id: 'asg_pe2',
        classId: 'c2',
        teacherId: 't2',
        subjectId: 's1',
        roomId: 'r_gym_multi',
        hoursPerWeek: 1,
        groupId: null
      }
    ];

    // Obiekt sportowy bez limitu jednej klasy: 1A i 1B mogą być razem na dużej hali
    pl.lessons = {
      'c1|0|0': { assignmentId: 'asg_pe1', locked: false },
      'c2|0|0': { assignmentId: 'asg_pe2', locked: false }
    };

    expect(detectConflicts(pl).filter(c => c.type === 'room').length).toBe(0);

    // Przypisanie do małej sali gimnastycznej ze ścisłym limitem (singleClassLimit: true)
    pl.assignments[0].roomId = 'r_gym_single';
    pl.assignments[1].roomId = 'r_gym_single';

    const conflictsSingle = detectConflicts(pl);
    expect(conflictsSingle.some(c => c.type === 'room')).toBe(true);
  });

  it('grupy o tym samym partitionId wykluczają się wzajemnie i mogą być równolegle', () => {
    const pl = createBasePlan();
    pl.schoolGroups = [
      { id: 'g_lang1', name: 'Angielski Gr 1', classId: 'c1', partitionId: 'lang' },
      { id: 'g_lang2', name: 'Angielski Gr 2', classId: 'c1', partitionId: 'lang' }
    ];
    pl.assignments = [
      {
        id: 'asg_g1',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: 'g_lang1'
      },
      {
        id: 'asg_g2',
        classId: 'c1',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: 'g_lang2'
      }
    ];

    pl.lessons = {
      'c1|0|0|g_lang1': { assignmentId: 'asg_g1', locked: false },
      'c1|0|0|g_lang2': { assignmentId: 'asg_g2', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.filter(c => c.type === 'class').length).toBe(0);
  });

  it('grupy z różnych partitionId kolidują ze sobą, gdy nie podano rozłącznych studentIds', () => {
    const pl = createBasePlan();
    pl.schoolGroups = [
      { id: 'g_lang1', name: 'Angielski Gr 1', classId: 'c1', partitionId: 'lang' },
      { id: 'g_pe_boys', name: 'WF Chłopcy', classId: 'c1', partitionId: 'pe' }
    ];
    pl.assignments = [
      {
        id: 'asg_g1',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: 'g_lang1'
      },
      {
        id: 'asg_g2',
        classId: 'c1',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: 'g_pe_boys'
      }
    ];

    pl.lessons = {
      'c1|0|0|g_lang1': { assignmentId: 'asg_g1', locked: false },
      'c1|0|0|g_pe_boys': { assignmentId: 'asg_g2', locked: false }
    };

    const conflicts = detectConflicts(pl);
    expect(conflicts.some(c => c.type === 'class' && c.message.includes('różnych podziałów'))).toBe(true);
  });

  it('grupy kolidują gdy mają wspólnych uczniów w studentIds, a nie kolidują gdy są rozłączne', () => {
    const pl = createBasePlan();
    pl.schoolGroups = [
      { id: 'g_common1', name: 'Gr A', classId: 'c1', partitionId: 'partA', studentIds: ['st1', 'st2'] },
      { id: 'g_common2', name: 'Gr B', classId: 'c1', partitionId: 'partB', studentIds: ['st2', 'st3'] }, // st2 jest wspólny!
      { id: 'g_disjoint', name: 'Gr C', classId: 'c1', partitionId: 'partC', studentIds: ['st4', 'st5'] }
    ];
    pl.assignments = [
      {
        id: 'asg_1',
        classId: 'c1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r1',
        hoursPerWeek: 1,
        groupId: 'g_common1'
      },
      {
        id: 'asg_2',
        classId: 'c1',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r2',
        hoursPerWeek: 1,
        groupId: 'g_common2'
      }
    ];

    pl.lessons = {
      'c1|0|0|g_common1': { assignmentId: 'asg_1', locked: false },
      'c1|0|0|g_common2': { assignmentId: 'asg_2', locked: false }
    };

    const conflictsOverlap = detectConflicts(pl);
    expect(conflictsOverlap.some(c => c.type === 'class' && c.message.includes('wspólnych uczniów'))).toBe(true);

    // Zmień na grupę rozłączną
    pl.assignments[1].groupId = 'g_disjoint';
    pl.lessons = {
      'c1|0|0|g_common1': { assignmentId: 'asg_1', locked: false },
      'c1|0|0|g_disjoint': { assignmentId: 'asg_2', locked: false }
    };

    const conflictsDisjoint = detectConflicts(pl);
    expect(conflictsDisjoint.filter(c => c.type === 'class').length).toBe(0);
  });
});
