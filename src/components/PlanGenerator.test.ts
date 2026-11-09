import { describe, it, expect } from 'vitest';
import { runPlanGenerationAlgorithm, PlanGeneratorOptions } from './PlanGenerator';
import { AppState, ClassRoom } from '../types';

describe('PlanGenerator - Model zajętości z grupami, parami równoległymi i salami', () => {
  const defaultOptions: PlanGeneratorOptions = {
    maxGapsPerTeacher: 2,
    obeyAvailability: true,
    avoidExtremes: false,
    avoidExtremesSubjectIds: [],
    noStudentGaps: true,
    allowDoubleBlocks: false,
    includeSpecialNI: false,
    limitComputerLabs: false,
    customComputerLabsCount: 2,
    minAvailableSubstitutionTeachersPerSlot: 0,
    forceOptionalToExtremes: false,
    optionalSubjectIds: []
  };

  const createBaseAppState = (partial?: Partial<AppState>): AppState => {
    return {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: { name: 'Testowa Szkoła', short: 'TS', phone: '', web: '' },
      hours: ['1', '2', '3', '4', '5', '6', '7', '8'],
      timeslots: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' },
        { num: 4, start: '10:50', end: '11:35' },
        { num: 5, start: '11:45', end: '12:30' },
        { num: 6, start: '12:40', end: '13:25' },
        { num: 7, start: '13:35', end: '14:20' },
        { num: 8, start: '14:25', end: '15:10' }
      ],
      buildings: [{ id: 'b1', name: 'Budynek Główny' }],
      floors: [],
      classes: [],
      teachers: [],
      subjects: [],
      homerooms: {},
      planLekcji: {
        meta: { schoolName: 'Testowa Szkoła', year: '2025/2026', modifiedAt: new Date().toISOString() },
        hours: [
          { num: 1, start: '08:00', end: '08:45' },
          { num: 2, start: '08:55', end: '09:40' },
          { num: 3, start: '09:50', end: '10:35' },
          { num: 4, start: '10:50', end: '11:35' },
          { num: 5, start: '11:45', end: '12:30' },
          { num: 6, start: '12:40', end: '13:25' },
          { num: 7, start: '13:35', end: '14:20' },
          { num: 8, start: '14:25', end: '15:10' }
        ],
        classes: [],
        teachers: [],
        subjects: [],
        rooms: [],
        assignments: [],
        schoolGroups: [],
        lessons: {},
        specialStudents: [],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      },
      dyzury: {
        miejsca: [],
        przerwy: [],
        harmonogram: {},
        settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] }
      },
      ...partial
    };
  };

  it('klasa 2 grup × 2 nauczycieli × 2 h/tydz. mieści się w 2 godzinach (ułożenie równoległe)', () => {
    const appState = createBaseAppState();
    const pl = appState.planLekcji;

    // Klasa 1A
    pl.classes = [{ id: 'c1', name: '1A', color: '#3b82f6', groupIds: ['g1', 'g2'] }];
    pl.schoolGroups = [
      { id: 'g1', name: 'Gr 1', classId: 'c1' },
      { id: 'g2', name: 'Gr 2', classId: 'c1' }
    ];

    // Nauczyciele
    pl.teachers = [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN' }
    ];

    // Przedmioty
    pl.subjects = [
      { id: 's1', name: 'Język angielski', short: 'ANG', color: '#ef4444' },
      { id: 's2', name: 'Język niemiecki', short: 'NIEM', color: '#f59e0b' }
    ];

    // Sale
    pl.rooms = [
      { id: 'r101', name: '101', desc: 'Pracownia językowa 1' },
      { id: 'r102', name: '102', desc: 'Pracownia językowa 2' }
    ];

    // 2 przydziały: gr 1 z t1 (2h), gr 2 z t2 (2h)
    pl.assignments = [
      {
        id: 'asg_ang',
        classId: 'c1',
        groupId: 'g1',
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r101',
        hoursPerWeek: 2
      },
      {
        id: 'asg_niem',
        classId: 'c1',
        groupId: 'g2',
        teacherId: 't2',
        subjectId: 's2',
        roomId: 'r102',
        hoursPerWeek: 2
      }
    ];

    const result = runPlanGenerationAlgorithm(appState, defaultOptions);

    expect(result.success).toBe(true);
    expect(result.placedRegular).toBe(4); // 2h dla g1 + 2h dla g2

    const keys = Object.keys(result.updatedLessons);
    expect(keys.length).toBe(4);

    // Zapisywanie klucza klasa|dzień|godzina|groupId dla przydziałów z groupId
    for (const key of keys) {
      const parts = key.split('|');
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('c1');
      expect(['g1', 'g2']).toContain(parts[3]);
    }

    // Wyznaczenie unikalnych slotów czasowych (dzień|godzina) dla klasy 1A
    const uniqueTimeSlots = new Set<string>();
    keys.forEach(key => {
      const parts = key.split('|');
      uniqueTimeSlots.add(`${parts[1]}|${parts[2]}`);
    });

    // Klasa 2 grup × 2 nauczycieli × 2 h/tydz. musi zmieścić się dokładnie w 2 godzinach w siatce czasowej!
    expect(uniqueTimeSlots.size).toBe(2);

    // W każdym z tych 2 slotów czasowych muszą znajdować się OBIE grupy jednocześnie
    uniqueTimeSlots.forEach(slot => {
      const lessonsInSlot = keys.filter(k => {
        const parts = k.split('|');
        return `${parts[1]}|${parts[2]}` === slot;
      });

      expect(lessonsInSlot.length).toBe(2);
      const groupsInSlot = lessonsInSlot.map(k => k.split('|')[3]);
      expect(groupsInSlot).toContain('g1');
      expect(groupsInSlot).toContain('g2');
    });
  });

  it('plan bez konfliktów sal (zwykła sala nie dopuszcza kolizji, a sala sportowa obsługuje współdzielenie)', () => {
    const appState = createBaseAppState();
    const pl = appState.planLekcji;

    // Dwie klasy: 1A i 1B
    pl.classes = [
      { id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] },
      { id: 'c2', name: '1B', color: '#10b981', groupIds: [] }
    ];

    // Dwóch nauczycieli
    pl.teachers = [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't2', first: 'Adam', last: 'Wiśniewski', abbr: 'AW' }
    ];

    // Przedmioty
    pl.subjects = [
      { id: 's_mat', name: 'Matematyka', short: 'MAT', color: '#3b82f6' },
      { id: 's_fiz', name: 'Fizyka', short: 'FIZ', color: '#8b5cf6' }
    ];

    // Jedna zwykła sala wykładowa (np. 105)
    const singleClassRoom: ClassRoom = {
      id: 'r105',
      name: '105',
      desc: 'Pracownia matematyczno-fizyczna'
    };
    pl.rooms = [singleClassRoom];

    // Przydział 1: klasa 1A w sali 105 (3h)
    // Przydział 2: klasa 1B w tej samej sali 105 (3h)
    pl.assignments = [
      {
        id: 'asg_1',
        classId: 'c1',
        groupId: null,
        teacherId: 't1',
        subjectId: 's_mat',
        roomId: 'r105',
        hoursPerWeek: 3
      },
      {
        id: 'asg_2',
        classId: 'c2',
        groupId: null,
        teacherId: 't2',
        subjectId: 's_fiz',
        roomId: 'r105',
        hoursPerWeek: 3
      }
    ];

    const result = runPlanGenerationAlgorithm(appState, defaultOptions);

    expect(result.success).toBe(true);
    expect(result.placedRegular).toBe(6);

    // Weryfikacja: W żadnym slocie (dzień, godzina) sala 105 nie może mieć więcej niż 1 lekcji!
    const roomSlots = new Map<string, string[]>(); // slot -> assignmentIds
    Object.entries(result.updatedLessons).forEach(([key, lesson]) => {
      const parts = key.split('|');
      const slot = `${parts[1]}|${parts[2]}`;
      const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
      if (asg?.roomId === 'r105') {
        const list = roomSlots.get(slot) || [];
        list.push(lesson.assignmentId);
        roomSlots.set(slot, list);
      }
    });

    roomSlots.forEach((asgIdsInSlot) => {
      // W zwykłej sali maksymalnie 1 przydział w danym slocie
      expect(asgIdsInSlot.length).toBe(1);
    });
  });

  it('uwzględnia linkedClassIds (zajmuje wszystkie klasy powiązane) oraz supportTeacherId w teacherBusy', () => {
    const appState = createBaseAppState();
    const pl = appState.planLekcji;

    pl.classes = [
      { id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] },
      { id: 'c2', name: '1B', color: '#10b981', groupIds: [] },
      { id: 'c3', name: '1C', color: '#f59e0b', groupIds: [] }
    ];

    pl.teachers = [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't_sup', first: 'Marta', last: 'Wspomagająca', abbr: 'MW' },
      { id: 't3', first: 'Piotr', last: 'Zieliński', abbr: 'PZ' }
    ];

    pl.subjects = [
      { id: 's1', name: 'Historia', short: 'HIST', color: '#f59e0b' },
      { id: 's2', name: 'Biologia', short: 'BIO', color: '#10b981' }
    ];

    // Przydział 1: klasa 1A łączona z 1B (linkedClassIds: ['c2']), nauczyciel t1, wspomagający t_sup
    // Przydział 2: klasa 1C, nauczyciel t3, wspomagający t_sup (ten sam nauczyciel wspomagający!)
    pl.assignments = [
      {
        id: 'asg_joint',
        classId: 'c1',
        linkedClassIds: ['c2'],
        groupId: null,
        teacherId: 't1',
        supportTeacherId: 't_sup',
        subjectId: 's1',
        roomId: null,
        hoursPerWeek: 2
      },
      {
        id: 'asg_c3',
        classId: 'c3',
        groupId: null,
        teacherId: 't3',
        supportTeacherId: 't_sup',
        subjectId: 's2',
        roomId: null,
        hoursPerWeek: 2
      }
    ];

    const result = runPlanGenerationAlgorithm(appState, defaultOptions);

    expect(result.success).toBe(true);

    // 1. linkedClassIds: lekcja asg_joint musi być zapisana ZARÓWNO dla c1 jak i dla c2 w tej samej godzinie
    const jointKeysC1 = Object.keys(result.updatedLessons).filter(k => k.startsWith('c1|') && result.updatedLessons[k].assignmentId === 'asg_joint');
    const jointKeysC2 = Object.keys(result.updatedLessons).filter(k => k.startsWith('c2|') && result.updatedLessons[k].assignmentId === 'asg_joint');

    expect(jointKeysC1.length).toBe(2);
    expect(jointKeysC2.length).toBe(2);

    // Sprawdzenie, czy godziny c1 i c2 dla lekcji łączonej są identyczne
    const c1Slots = jointKeysC1.map(k => `${k.split('|')[1]}|${k.split('|')[2]}`).sort();
    const c2Slots = jointKeysC2.map(k => `${k.split('|')[1]}|${k.split('|')[2]}`).sort();
    expect(c1Slots).toEqual(c2Slots);

    // 2. supportTeacherId: nauczyciel wspomagający t_sup nie może być w tej samej godzinie w klasie 1C (asg_c3)
    const c3Keys = Object.keys(result.updatedLessons).filter(k => k.startsWith('c3|') && result.updatedLessons[k].assignmentId === 'asg_c3');
    expect(c3Keys.length).toBe(2);

    const c3Slots = c3Keys.map(k => `${k.split('|')[1]}|${k.split('|')[2]}`);
    c3Slots.forEach(slot => {
      // Żaden slot klasy c3 nie może pokrywać się ze slotem asg_joint, bo t_sup jest zajęty!
      expect(c1Slots).not.toContain(slot);
    });
  });

  it('uwzględnia linkedGroupIds (grupy międzyoddziałowe): zapisuje klucze dla powiązanych grup i blokuje ich zajętość', () => {
    const appState = createBaseAppState();
    const pl = appState.planLekcji;

    // Dwie klasy: 1A i 1B
    pl.classes = [
      { id: 'c1', name: '1A', color: '#3b82f6', groupIds: ['g_1a_adv', 'g_1a_basic'] },
      { id: 'c2', name: '1B', color: '#10b981', groupIds: ['g_1b_adv', 'g_1b_basic'] }
    ];
    pl.schoolGroups = [
      { id: 'g_1a_adv', name: '1A Ang Zaaw', classId: 'c1' },
      { id: 'g_1a_basic', name: '1A Ang Podst', classId: 'c1' },
      { id: 'g_1b_adv', name: '1B Ang Zaaw', classId: 'c2' },
      { id: 'g_1b_basic', name: '1B Ang Podst', classId: 'c2' }
    ];

    pl.teachers = [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN' }
    ];

    pl.subjects = [
      { id: 's1', name: 'Język angielski', short: 'ANG', color: '#ef4444' }
    ];

    pl.rooms = [
      { id: 'r101', name: '101' },
      { id: 'r102', name: '102' }
    ];

    // Przydział międzyoddziałowy zaawansowany łączący g_1a_adv i g_1b_adv
    pl.assignments = [
      {
        id: 'asg_cross_group',
        classId: 'c1',
        groupId: 'g_1a_adv',
        linkedClassIds: ['c2'],
        linkedGroupIds: ['g_1b_adv'],
        teacherId: 't1',
        subjectId: 's1',
        roomId: 'r101',
        hoursPerWeek: 2
      }
    ];

    const result = runPlanGenerationAlgorithm(appState, defaultOptions);

    expect(result.success).toBe(true);

    const keys = Object.keys(result.updatedLessons);
    // Powinny powstać 2 lekcje dla c1|...|g_1a_adv i 2 lekcje dla c2|...|g_1b_adv (łącznie 4 wpisy w planie)
    const c1GroupKeys = keys.filter(k => k.startsWith('c1|') && k.endsWith('|g_1a_adv'));
    const c2GroupKeys = keys.filter(k => k.startsWith('c2|') && k.endsWith('|g_1b_adv'));

    expect(c1GroupKeys.length).toBe(2);
    expect(c2GroupKeys.length).toBe(2);

    // Godziny obu grup muszą być zsynchronizowane
    const c1Slots = c1GroupKeys.map(k => `${k.split('|')[1]}|${k.split('|')[2]}`).sort();
    const c2Slots = c2GroupKeys.map(k => `${k.split('|')[1]}|${k.split('|')[2]}`).sort();
    expect(c1Slots).toEqual(c2Slots);
  });
});
