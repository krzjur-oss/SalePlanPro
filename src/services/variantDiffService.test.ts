import { describe, it, expect } from 'vitest';
import { 
  areSlotsEquivalent, 
  computeClassDiffs, 
  computeDutyDiffs, 
  computeAllDiffs, 
  checkSlotCollision, 
  applySlotTransfer,
  buildLookupCaches
} from './variantDiffService';
import { AppState, PlanVariant } from '../types';

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
  it('areSlotsEquivalent poprawnie weryfikuje równoważność slotów', () => {
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

  it('applySlotTransfer kopiuje i usuwa lekcję w wariancie', () => {
    const baseVar = createMockVariant('va', 'Wariant', {});
    const updated = applySlotTransfer(baseVar, { assignmentId: 'asg1', locked: false }, 'c1', 0, 1);

    expect(updated.data.lessons['c1|0|1']).toBeDefined();
    expect(updated.data.lessons['c1|0|1'].assignmentId).toBe('asg1');

    // Usunięcie lekcji
    const cleared = applySlotTransfer(updated, undefined, 'c1', 0, 1);
    expect(cleared.data.lessons['c1|0|1']).toBeUndefined();
  });
});
