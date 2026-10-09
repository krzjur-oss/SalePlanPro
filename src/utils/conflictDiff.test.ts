/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Silnika Różnicowego (Conflict Diff Tests)
 * Opis: Weryfikacja obliczania bilansu różnic pomiędzy kartami dla lekcji, dyżurów i sal.
 */
import { describe, it, expect } from 'vitest';
import { computeConflictDiff } from './conflictDiff';
import type { AppState, SchedData } from '../types';

describe('computeConflictDiff Unit Tests', () => {
  it('correctly reports no differences when local and incoming states are empty or identical', () => {
    const stateA: Partial<AppState> = {
      teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
      planLekcji: {
        meta: { schoolName: 'SP 1', year: '2025/2026' },
        hours: [],
        classes: [{ id: 'c1', name: '1A', color: '#fff', groupIds: [] }],
        teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
        rooms: [],
        subjects: [],
        schoolGroups: [],
        assignments: [],
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
        settings: { autoBalance: false, maxPerTeacher: 2, excludeTeachers: [] }
      }
    };

    const diff = computeConflictDiff(stateA as AppState, stateA as AppState);
    expect(diff.hasDifferences).toBe(false);
    expect(diff.totalChangesCount).toBe(0);
    expect(diff.items).toHaveLength(0);
  });

  it('detects added lessons in incoming state with formatted class and teacher', () => {
    const localState: Partial<AppState> = {
      planLekcji: {
        meta: { schoolName: 'SP 1', year: '2025/2026' },
        hours: [],
        classes: [{ id: 'c1', name: '1A', color: '#fff', groupIds: [] }],
        teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
        rooms: [{ id: 'r1', name: '101' }],
        subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#blue' }],
        schoolGroups: [],
        assignments: [{ id: 'a1', classId: 'c1', teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 4, groupId: null }],
        lessons: {},
        specialStudents: [],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      }
    };

    const incomingState: Partial<AppState> = {
      ...localState,
      planLekcji: {
        ...localState.planLekcji!,
        lessons: {
          'c1|0|1': { assignmentId: 'a1', locked: false }
        }
      }
    };

    const diff = computeConflictDiff(localState as AppState, incomingState as AppState);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.totalChangesCount).toBe(1);
    expect(diff.items[0].category).toBe('lessons');
    expect(diff.items[0].action).toBe('added');
    expect(diff.items[0].title).toContain('1A');
    expect(diff.items[0].description).toContain('Poniedziałek');
    expect(diff.items[0].description).toContain('Matematyka');
    expect(diff.items[0].description).toContain('Jan Kowalski');

    const lessonMetric = diff.metrics.find(m => m.key === 'lessons');
    expect(lessonMetric?.diff).toBe(1);
    expect(lessonMetric?.localCount).toBe(0);
    expect(lessonMetric?.incomingCount).toBe(1);
  });

  it('detects duties changes (added, removed, modified)', () => {
    const localState: Partial<AppState> = {
      dyzury: {
        miejsca: [{ id: 'm1', name: 'Korytarz Parter' }],
        przerwy: [{ num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' }],
        harmonogram: {
          'm1|0|1': { teacherAbbr: 'JK', locked: false }
        },
        settings: { autoBalance: false, maxPerTeacher: 2, excludeTeachers: [] }
      }
    };

    const incomingState: Partial<AppState> = {
      dyzury: {
        miejsca: [{ id: 'm1', name: 'Korytarz Parter' }, { id: 'm2', name: 'Szatnia' }],
        przerwy: [{ num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' }],
        harmonogram: {
          'm1|0|1': { teacherAbbr: 'AN', locked: false }, // modified
          'm2|0|1': { teacherAbbr: 'XYZ', locked: false }  // added
        },
        settings: { autoBalance: false, maxPerTeacher: 2, excludeTeachers: [] }
      }
    };

    const diff = computeConflictDiff(localState as AppState, incomingState as AppState);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.categorized.duties).toHaveLength(2);

    const modDuty = diff.categorized.duties.find(d => d.action === 'modified');
    expect(modDuty).toBeDefined();
    expect(modDuty?.description).toContain('AN');
    expect(modDuty?.description).toContain('JK');

    const addDuty = diff.categorized.duties.find(d => d.action === 'added');
    expect(addDuty).toBeDefined();
    expect(addDuty?.title).toContain('Szatnia');
  });

  it('detects changes in teachers, classes, and special students (homeTeachingInSchool)', () => {
    const localState: Partial<AppState> = {
      planLekcji: {
        meta: { schoolName: 'SP 1', year: '2025/2026' },
        hours: [],
        classes: [{ id: 'c1', name: '1A', color: '#fff', groupIds: [] }],
        teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
        rooms: [],
        subjects: [],
        schoolGroups: [],
        assignments: [],
        lessons: {},
        specialStudents: [{ id: 's1', firstName: 'Kacper', lastName: 'M.', type: 'ni', classId: 'c1', homeTeachingInSchool: true }],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      }
    };

    const incomingState: Partial<AppState> = {
      planLekcji: {
        ...localState.planLekcji!,
        teachers: [
          { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
          { id: 't2', first: 'Maria', last: 'Nowak', abbr: 'MN' } // added teacher
        ],
        classes: [
          { id: 'c1', name: '1A', color: '#fff', groupIds: [] },
          { id: 'c2', name: '2B', color: '#fff', groupIds: [] } // added class
        ],
        specialStudents: [{ id: 's1', firstName: 'Kacper', lastName: 'M.', type: 'ni', classId: 'c1', homeTeachingInSchool: false }] // modified homeTeaching
      }
    };

    const diff = computeConflictDiff(localState as AppState, incomingState as AppState);
    expect(diff.hasDifferences).toBe(true);

    const tchItem = diff.items.find(i => i.id === 'tch_add_t2');
    expect(tchItem).toBeDefined();
    expect(tchItem?.title).toContain('Maria Nowak (MN)');

    const clsItem = diff.items.find(i => i.id === 'cls_add_c2');
    expect(clsItem).toBeDefined();
    expect(clsItem?.title).toContain('2B');

    const studItem = diff.items.find(i => i.id === 'stud_mod_s1');
    expect(studItem).toBeDefined();
    expect(studItem?.title).toContain('Kacper M.');
    expect(studItem?.description).toContain('W domu');
  });
});
