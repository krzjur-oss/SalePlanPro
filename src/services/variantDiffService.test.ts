import { describe, it, expect, vi } from 'vitest';
import * as variantDiffService from './variantDiffService';
import { 
  areSlotsEquivalent, 
  areSlotItemListsEquivalent,
  computeClassDiffs, 
  computeTeacherDiffs, 
  computeRoomDiffs, 
  computeDutyDiffs, 
  computeAllDiffs, 
  checkSlotCollision, 
  applySlotTransfer,
  buildLookupCaches,
  buildTeacherLessonsBySlot,
  buildRoomLessonsBySlot,
  sanitizeFileName
} from './variantDiffService';
import { AppState, PlanVariant, Assignment } from '../types';

const mockAppState: AppState = {
  yearKey: '2026_2027',
  yearLabel: '2026/2027',
  school: { name: 'I Liceum Ogólnokształcące', short: 'ILO' },
  buildings: [],
  floors: [],
  subjects: [
    { id: 's1', name: 'Język polski', short: 'POL', color: '#ef4444' },
    { id: 's2', name: 'Matematyka', short: 'MAT', color: '#3b82f6' }
  ],
  classes: [],
  teachers: [],
  homerooms: {},
  dyzury: {
    miejsca: [
      { id: 'm1', name: 'Korytarz Parter', floor: '0' }
    ],
    przerwy: [
      { num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' }
    ],
    harmonogram: {},
    settings: { autoBalance: true, maxPerTeacher: 5, excludeTeachers: [] }
  },
  hours: [],
  timeslots: [],
  planLekcji: {
    meta: { schoolName: 'I Liceum', year: '2026/2027' },
    hours: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' }
    ],
    classes: [
      { id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] },
      { id: 'c2', name: '1B', color: '#10b981', groupIds: [] }
    ],
    teachers: [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
      { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN' }
    ],
    subjects: [
      { id: 's1', name: 'Język polski', short: 'POL', color: '#ef4444' },
      { id: 's2', name: 'Matematyka', short: 'MAT', color: '#3b82f6' }
    ],
    rooms: [
      { id: 'r1', name: '101' },
      { id: 'r2', name: '102' }
    ],
    schoolGroups: [],
    assignments: [
      { id: 'asg1', classId: 'c1', subjectId: 's1', teacherId: 't1', roomId: 'r1', hoursPerWeek: 3, groupId: null },
      { id: 'asg2', classId: 'c1', subjectId: 's2', teacherId: 't2', roomId: 'r2', hoursPerWeek: 3, groupId: null },
      { id: 'asg3', classId: 'c2', subjectId: 's2', teacherId: 't2', roomId: 'r2', hoursPerWeek: 3, groupId: null }
    ],
    lessons: {},
    specialStudents: [],
    specialAssignments: [],
    specialLessons: {},
    specialAbsences: {}
  }
};

const createMockVariant = (id: string, name: string, lessons: Record<string, any>, dyzury: Record<string, any> = {}): PlanVariant => ({
  id,
  name,
  tag: 'semestr_1',
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
  color: '#3b82f6',
  data: {
    lessons,
    schedData: {},
    dyzury
  }
});

describe('variantDiffService', () => {
  it('areSlotsEquivalent poprawnie weryfikuje równoważność slotów w tym classId i grupę', () => {
    expect(areSlotsEquivalent(null, null)).toBe(true);
    expect(areSlotsEquivalent({ subject: 'MAT', teacherAbbr: 'JK', room: '101' }, null)).toBe(false);
    expect(areSlotsEquivalent(
      { subject: 'MAT', teacherAbbr: 'JK', room: '101' },
      { subject: 'MAT', teacherAbbr: 'JK', room: '101' }
    )).toBe(true);
    expect(areSlotsEquivalent(
      { subject: 'MAT', teacherAbbr: 'JK', room: '101' },
      { subject: 'POL', teacherAbbr: 'JK', room: '101' }
    )).toBe(false);

    // Weryfikacja classId
    expect(areSlotsEquivalent(
      { subject: 'MAT', teacherAbbr: 'JK', room: '101', classId: 'c1' },
      { subject: 'MAT', teacherAbbr: 'JK', room: '101', classId: 'c2' }
    )).toBe(false);
    expect(areSlotsEquivalent(
      { subject: 'MAT', teacherAbbr: 'JK', room: '101', classId: 'c1' },
      { subject: 'MAT', teacherAbbr: 'JK', room: '101', classId: 'c1' }
    )).toBe(true);

    // Weryfikacja grupy (groupId / groupName / group)
    expect(areSlotsEquivalent(
      { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', group: 'Gr. 1' },
      { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', group: 'Gr. 2' }
    )).toBe(false);
    expect(areSlotsEquivalent(
      { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', groupId: 'g1' },
      { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', groupId: 'g1' }
    )).toBe(true);
    expect(areSlotsEquivalent(
      { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', groupName: 'Gr. 1' },
      { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', group: 'Gr. 1' }
    )).toBe(true);
  });

  it('computeClassDiffs wykrywa dodaną i zmienioną lekcję', () => {
    // Wariant A: lekcja 1 w poniedziałek (day 0, hour 0) -> asg1 (Polski JK r1)
    const varA = createMockVariant('va', 'Wariant A', {
      'c1|0|0': { assignmentId: 'asg1' }
    });

    // Wariant B: lekcja 1 w poniedziałek -> asg2 (Matematyka AN r2) oraz lekcja 2 -> asg1 (dodana)
    const varB = createMockVariant('vb', 'Wariant B', {
      'c1|0|0': { assignmentId: 'asg2' },
      'c1|0|1': { assignmentId: 'asg1' }
    });

    const diffs = computeClassDiffs(mockAppState, varA, varB, 'c1');
    expect(diffs.length).toBe(2);

    const slot0 = diffs.find(d => d.hourIdx === 0);
    expect(slot0).toBeDefined();
    expect(slot0?.status).toBe('changed');

    const slot1 = diffs.find(d => d.hourIdx === 1);
    expect(slot1).toBeDefined();
    expect(slot1?.status).toBe('added');
  });

  it('checkSlotCollision wykrywa konflikt podwójnego przydziału nauczyciela w tej samej godzinie', () => {
    const lookups = buildLookupCaches(mockAppState);

    // Target variant: w klasie c2 w poniedziałek na lekcji 0 uczy nauczyciel t2 (asg3)
    const targetVar = createMockVariant('vt', 'Docelowy', {
      'c2|0|0': { assignmentId: 'asg3' } // t2 uczy w c2
    });

    // Próba wstawienia slotu do c1 z nauczycielem t2 w tym samym czasie
    const slotToInsert = {
      classId: 'c1',
      className: '1A',
      subject: 'Matematyka',
      teacherId: 't2',
      teacherAbbr: 'AN',
      roomId: 'r1'
    };

    const collision = checkSlotCollision(targetVar, slotToInsert, 0, 0, mockAppState, lookups);
    expect(collision.hasCollision).toBe(true);
    expect(collision.reason).toContain('AN');
  });

  it('computeDutyDiffs wykrywa zmiany w obsadzie dyżurów', () => {
    const varA = createMockVariant('va', 'Wariant A', {}, {
      'm1|0|1': { teacherAbbr: 'JK' }
    });
    const varB = createMockVariant('vb', 'Wariant B', {}, {
      'm1|0|1': { teacherAbbr: 'AN' }
    });

    const dutyDiffs = computeDutyDiffs(mockAppState, varA, varB);
    expect(dutyDiffs.length).toBe(1);
    expect(dutyDiffs[0].itemA?.teacherAbbr).toBe('JK');
    expect(dutyDiffs[0].itemB?.teacherAbbr).toBe('AN');
  });

  it('computeAllDiffs prawidłowo oblicza zagregowane metryki KPI', () => {
    const varA = createMockVariant('va', 'Wariant A', {
      'c1|0|0': { assignmentId: 'asg1' }
    });
    const varB = createMockVariant('vb', 'Wariant B', {});

    const { items, kpi } = computeAllDiffs(mockAppState, varA, varB);
    expect(items.length).toBe(1);
    expect(kpi.removedCount).toBe(1);
    expect(kpi.affectedClassesCount).toBe(1);
  });

  it('(a) transfer w godzinę 1 nie usuwa lekcji z godziny 2', () => {
    const targetVar = createMockVariant('vt', 'Docelowy', {
      'c1|0|1': { assignmentId: 'old_asg1' },
      'c1|0|2': { assignmentId: 'asg_hour2' } // Lekcja w godzinie 2
    });

    // 1. Transfer nowej lekcji do godziny 1
    const updated = applySlotTransfer(
      targetVar,
      { assignmentId: 'new_asg1', locked: false },
      'c1',
      0,
      1
    );

    // Godzina 1 ma nową lekcję
    expect(updated.data.lessons['c1|0|1']?.assignmentId).toBe('new_asg1');
    // Lekcja w godzinie 2 NIE została usunięta
    expect(updated.data.lessons['c1|0|2']).toBeDefined();
    expect(updated.data.lessons['c1|0|2']?.assignmentId).toBe('asg_hour2');

    // 2. Wyczyszczenie godziny 1 (undefined) również NIE może usuwać godziny 2
    const cleared = applySlotTransfer(updated, undefined, 'c1', 0, 1);
    expect(cleared.data.lessons['c1|0|1']).toBeUndefined();
    expect(cleared.data.lessons['c1|0|2']).toBeDefined();
    expect(cleared.data.lessons['c1|0|2']?.assignmentId).toBe('asg_hour2');
  });

  it('(b) nadpisanie slotu z grupami usuwa klucze grupowe', () => {
    const targetVar = createMockVariant('vt', 'Docelowy', {
      'c1|0|1|gr1': { assignmentId: 'asg_gr1' },
      'c1|0|1|gr2': { assignmentId: 'asg_gr2' },
      'c1|0|2|gr1': { assignmentId: 'asg_hour2_gr1' } // Lekcja grupowa w innej godzinie
    });

    // 1. Nadpisujemy slot z grupami pojedynczą lekcją ogólną
    const updated = applySlotTransfer(
      targetVar,
      { assignmentId: 'asg_whole_class', locked: false },
      'c1',
      0,
      1
    );

    expect(updated.data.lessons['c1|0|1']?.assignmentId).toBe('asg_whole_class');
    expect(updated.data.lessons['c1|0|1|gr1']).toBeUndefined();
    expect(updated.data.lessons['c1|0|1|gr2']).toBeUndefined();
    // Lekcja z godziny 2 pozostała nienaruszona
    expect(updated.data.lessons['c1|0|2|gr1']?.assignmentId).toBe('asg_hour2_gr1');

    // 2. Nadpisanie undefined (wyczyszczenie slotu) usuwa wszystkie klucze grupowe
    const targetWithGroups = createMockVariant('vt2', 'Docelowy 2', {
      'c1|0|1': { assignmentId: 'asg_base' },
      'c1|0|1|gr1': { assignmentId: 'asg_gr1' },
      'c1|0|1|gr2': { assignmentId: 'asg_gr2' }
    });
    const cleared = applySlotTransfer(targetWithGroups, undefined, 'c1', 0, 1);
    expect(cleared.data.lessons['c1|0|1']).toBeUndefined();
    expect(cleared.data.lessons['c1|0|1|gr1']).toBeUndefined();
    expect(cleared.data.lessons['c1|0|1|gr2']).toBeUndefined();
  });

  it('(c) transfer lekcji grupowej zachowuje sufiks', () => {
    const targetVar = createMockVariant('vt', 'Docelowy', {});

    // 1. Transfer z podaniem klucza źródłowego z sufiksem grupy
    const updated1 = applySlotTransfer(
      targetVar,
      { assignmentId: 'asg_group_ang', locked: false },
      'c1',
      0,
      1,
      'c1|0|1|gr_ang_1'
    );

    expect(updated1.data.lessons['c1|0|1|gr_ang_1']).toBeDefined();
    expect(updated1.data.lessons['c1|0|1|gr_ang_1']?.assignmentId).toBe('asg_group_ang');
    expect(updated1.data.lessons['c1|0|1']).toBeUndefined();

    // 2. Transfer listy lekcji slotu (dwie grupy na tej samej godzinie)
    const targetVar2 = createMockVariant('vt2', 'Docelowy 2', {});
    const updated2 = applySlotTransfer(
      targetVar2,
      [
        { key: 'c1|0|1|gr_inf_1', lesson: { assignmentId: 'asg_inf_1', locked: false } },
        { key: 'c1|0|1|gr_inf_2', lesson: { assignmentId: 'asg_inf_2', locked: false } }
      ],
      'c1',
      0,
      1
    );

    expect(updated2.data.lessons['c1|0|1|gr_inf_1']?.assignmentId).toBe('asg_inf_1');
    expect(updated2.data.lessons['c1|0|1|gr_inf_2']?.assignmentId).toBe('asg_inf_2');
    expect(updated2.data.lessons['c1|0|1']).toBeUndefined();

    // 3. Transfer z tablicą par [key, lesson]
    const targetVar3 = createMockVariant('vt3', 'Docelowy 3', {});
    const updated3 = applySlotTransfer(
      targetVar3,
      [
        ['c1|0|1|gr_wf_ch', { assignmentId: 'asg_wf_ch', locked: false }],
        ['c1|0|1|gr_wf_dz', { assignmentId: 'asg_wf_dz', locked: false }]
      ] as any,
      'c1',
      0,
      1
    );

    expect(updated3.data.lessons['c1|0|1|gr_wf_ch']?.assignmentId).toBe('asg_wf_ch');
    expect(updated3.data.lessons['c1|0|1|gr_wf_dz']?.assignmentId).toBe('asg_wf_dz');
  });

  it('(d) wariant z własnymi assignments', () => {
    const sourceAssignment: Assignment = {
      id: 'asg_biol_ext',
      classId: 'c1',
      subjectId: 's_bio',
      teacherId: 't3',
      roomId: 'r3',
      hoursPerWeek: 2,
      groupId: null
    };

    const targetVar: PlanVariant = {
      ...createMockVariant('vt', 'Docelowy z assignments', {}),
      data: {
        lessons: {},
        schedData: {},
        assignments: [
          { id: 'asg_existing_1', classId: 'c1', subjectId: 's1', teacherId: 't1', roomId: 'r1', hoursPerWeek: 3, groupId: null }
        ]
      }
    };

    // 1. Transfer lekcji z asg_biol_ext - brakuje w wariancie docelowym
    const updated = applySlotTransfer(
      targetVar,
      { assignmentId: 'asg_biol_ext', locked: false },
      'c1',
      0,
      1,
      undefined,
      [sourceAssignment]
    );

    // Sprawdzenie czy przydział został dołączony
    expect(updated.data.assignments).toBeDefined();
    expect(updated.data.assignments?.length).toBe(2);
    const addedAsg = updated.data.assignments?.find(a => a.id === 'asg_biol_ext');
    expect(addedAsg).toBeDefined();
    expect(addedAsg?.subjectId).toBe('s_bio');
    expect(addedAsg?.teacherId).toBe('t3');

    // 2. Sprawdzenie braku duplikatów przy ponownym transferze tej samej lekcji
    const updatedTwice = applySlotTransfer(
      updated,
      { assignmentId: 'asg_biol_ext', locked: false },
      'c1',
      0,
      1,
      undefined,
      [sourceAssignment]
    );
    expect(updatedTwice.data.assignments?.length).toBe(2);

    // 3. Wariant bez własnych assignments (undefined) nie tworzy niepotrzebnie assignments
    const targetWithoutAssignments = createMockVariant('vt_no_asg', 'Bez assignments', {});
    const updatedNoAsg = applySlotTransfer(
      targetWithoutAssignments,
      { assignmentId: 'asg_biol_ext', locked: false },
      'c1',
      0,
      1,
      undefined,
      [sourceAssignment]
    );
    expect(updatedNoAsg.data.assignments).toBeUndefined();
    expect(updatedNoAsg.data.lessons['c1|0|1']?.assignmentId).toBe('asg_biol_ext');
  });

  it('areSlotItemListsEquivalent poprawnie porównuje listy slotów w komórce', () => {
    expect(areSlotItemListsEquivalent([], [])).toBe(true);
    expect(areSlotItemListsEquivalent(null, undefined)).toBe(true);

    const slot1 = { subject: 'ANG', teacherAbbr: 'AN', room: '102', classId: 'c1', group: 'Gr. 1' };
    const slot2 = { subject: 'NIE', teacherAbbr: 'JK', room: '103', classId: 'c1', group: 'Gr. 2' };

    expect(areSlotItemListsEquivalent([slot1], [slot1])).toBe(true);
    expect(areSlotItemListsEquivalent([slot1, slot2], [slot2, slot1])).toBe(true);
    expect(areSlotItemListsEquivalent([slot1], [slot1, slot2])).toBe(false);
  });

  it('buildTeacherLessonsBySlot i buildRoomLessonsBySlot indeksują lekcje i obsługują wiele grup w jednym slocie', () => {
    const lookups = buildLookupCaches(mockAppState);

    const customVariant: PlanVariant = {
      ...createMockVariant('v_groups', 'Wariant z grupami', {}),
      data: {
        lessons: {
          'c1|0|0|gr1': { assignmentId: 'asg_g1', locked: false },
          'c1|0|0|gr2': { assignmentId: 'asg_g2', locked: false }
        },
        schedData: {},
        assignments: [
          { id: 'asg_g1', classId: 'c1', subjectId: 's1', teacherId: 't1', roomId: 'r1', hoursPerWeek: 2, groupId: 'gr1' },
          { id: 'asg_g2', classId: 'c1', subjectId: 's2', teacherId: 't1', roomId: 'r1', hoursPerWeek: 2, groupId: 'gr2' }
        ]
      }
    };

    const teacherMap = buildTeacherLessonsBySlot(customVariant, 't1', mockAppState, lookups);
    const teacherSlot0 = teacherMap.get('0|0');
    expect(teacherSlot0).toBeDefined();
    expect(teacherSlot0?.length).toBe(2);
    expect(teacherSlot0?.[0].groupId).toBe('gr1');
    expect(teacherSlot0?.[1].groupId).toBe('gr2');

    const roomMap = buildRoomLessonsBySlot(customVariant, 'r1', mockAppState, lookups);
    const roomSlot0 = roomMap.get('0|0');
    expect(roomSlot0).toBeDefined();
    expect(roomSlot0?.length).toBe(2);
  });

  it('computeAllDiffs buduje affectedTeachers i affectedRooms ze zmian w classDiffs bez wołania teacher/room diffs', () => {
    const spyTeacher = vi.spyOn(variantDiffService, 'computeTeacherDiffs');
    const spyRoom = vi.spyOn(variantDiffService, 'computeRoomDiffs');

    // Wariant A: c1|0|0 -> asg1 (t1, r1)
    const varA = createMockVariant('va', 'Wariant A', {
      'c1|0|0': { assignmentId: 'asg1' }
    });
    // Wariant B: c1|0|0 -> asg2 (t2, r2)
    const varB = createMockVariant('vb', 'Wariant B', {
      'c1|0|0': { assignmentId: 'asg2' }
    });

    const { items, kpi } = computeAllDiffs(mockAppState, varA, varB);

    expect(items.length).toBe(1);
    expect(kpi.affectedClassesCount).toBe(1);
    expect(kpi.affectedTeachersCount).toBe(2); // t1 i t2
    expect(kpi.affectedRoomsCount).toBe(2);    // r1 i r2

    expect(spyTeacher).not.toHaveBeenCalled();
    expect(spyRoom).not.toHaveBeenCalled();

    spyTeacher.mockRestore();
    spyRoom.mockRestore();
  });

  it('sanitizeFileName poprawnie usuwa znaki specjalne i ogranicza długość', () => {
    const rawName = 'Plan/2026:Semestr*1?Test"<>|Koniec';
    const sanitized = sanitizeFileName(rawName, 30);
    expect(sanitized).not.toMatch(/[\\/:*?"<>|]/);
    expect(sanitized).toBe('Plan_2026_Semestr_1_Test____Ko');
    expect(sanitized.length).toBe(30);

    expect(sanitizeFileName('', 20)).toBe('Wariant');
    expect(sanitizeFileName('BardzoDługaNazwaWariantuKtóraPrzekraczaMaksymalnyLimitDługościPlikuNaDysku', 25).length).toBe(25);
  });
});
