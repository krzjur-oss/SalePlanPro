import { describe, it, expect } from 'vitest';
import { 
  getFreeRoomsForSlot, 
  calculateTeacherGaps, 
  calculateClassGaps, 
  findSwapAndMoveSuggestions,
  executeSwapOrMove
} from './swapAdvisorService';
import { PlanLekcjiState, Assignment, Lesson, Teacher, Subject, ClassRoom, Class } from '../types';

describe('swapAdvisorService', () => {
  const mockRooms: ClassRoom[] = [
    { id: 'r1', name: '101', desc: 'Ogólna', capacity: 30 },
    { id: 'r2', name: '102 (Chem)', desc: 'Pracownia chemiczna', capacity: 28 },
    { id: 'r3', name: 'SG', desc: 'Sala gimnastyczna', type: 'sport', capacity: 60 }
  ];

  const mockTeachers: Teacher[] = [
    { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' },
    { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN' }
  ];

  const mockSubjects: Subject[] = [
    { id: 's1', name: 'Matematyka', short: 'MAT', color: '#2563eb' },
    { id: 's2', name: 'Chemia', short: 'CHM', color: '#16a34a' }
  ];

  const mockClasses: Class[] = [
    { id: 'c1', name: '4A', color: '#3b82f6', groupIds: [], students: 25 },
    { id: 'c2', name: '5B', color: '#10b981', groupIds: [], students: 28 }
  ];

  const mockAssignments: Assignment[] = [
    { id: 'a1', classId: 'c1', teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 4, groupId: null },
    { id: 'a2', classId: 'c1', teacherId: 't2', subjectId: 's2', roomId: 'r2', hoursPerWeek: 2, groupId: null },
    { id: 'a3', classId: 'c2', teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 4, groupId: null }
  ];

  const basePlan: PlanLekcjiState = {
    meta: { schoolName: 'SP 1', year: '2026/2027' },
    hours: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:45', end: '11:30' }
    ],
    classes: mockClasses,
    teachers: mockTeachers,
    rooms: mockRooms,
    subjects: mockSubjects,
    schoolGroups: [],
    assignments: mockAssignments,
    lessons: {
      'c1|0|0': { assignmentId: 'a1', locked: false }, // poniedziałek g. 1
      'c1|0|2': { assignmentId: 'a2', locked: false }  // poniedziałek g. 3 (okienko na g. 2!)
    },
    specialStudents: [],
    specialAssignments: [],
    specialLessons: {},
    specialAbsences: {}
  };

  it('poprawnie wykrywa wolne sale i preferencje pracowni', () => {
    // W poniedziałek na g. 1 sala r1 (101) jest zajęta przez c1|0|0
    const roomsInfo = getFreeRoomsForSlot(basePlan, 0, 0, {
      subjectId: 's2', // chemia
      classId: 'c1'
    });

    expect(roomsInfo).toHaveLength(3);
    const r1 = roomsInfo.find(r => r.room.id === 'r1');
    const r2 = roomsInfo.find(r => r.room.id === 'r2');

    expect(r1?.isFree).toBe(false);
    expect(r1?.occupyingLesson?.className).toBe('4A');
    expect(r2?.isFree).toBe(true);
    expect(r2?.isSpecializedMatch).toBe(true); // Pracownia chemiczna dla chemii
  });

  it('poprawnie oblicza liczbę okienek dla nauczyciela i klasy', () => {
    const asgMap = new Map<string, Assignment>(mockAssignments.map(a => [a.id, a]));
    // Klasa c1 ma lekcje o g. 0 i g. 2, brak o g. 1 -> 1 okienko!
    const classGaps = calculateClassGaps('c1', 0, basePlan.lessons, 4);
    expect(classGaps.gapsCount).toBe(1);
    expect(classGaps.occupiedHours).toEqual([0, 2]);

    // Nauczyciel t1 ma lekcję tylko o g. 0 -> 0 okienek
    const teacherGaps = calculateTeacherGaps('t1', 0, basePlan.lessons, asgMap, 4);
    expect(teacherGaps.gapsCount).toBe(0);
  });

  it('znajduje bezkolizyjne sugestie przeniesienia lekcji likwidujące okienka', () => {
    const suggestions = findSwapAndMoveSuggestions({
      pl: basePlan,
      source: {
        key: 'c1|0|2',
        classId: 'c1',
        day: 0,
        hour: 2,
        lesson: basePlan.lessons['c1|0|2'],
        assignment: mockAssignments[1],
        subject: mockSubjects[1],
        teacher: mockTeachers[1],
        room: mockRooms[1]
      }
    });

    expect(suggestions.length).toBeGreaterThan(0);
    // Powinien zasugerować przeniesienie na g. 1 (godz. 08:55), co zlikwiduje okienko
    const moveG1 = suggestions.find(s => s.targetDay === 0 && s.targetHour === 1);
    expect(moveG1).toBeDefined();
    expect(moveG1?.hasConflicts).toBe(false);
    expect(moveG1?.gapsDeltaClass).toBeLessThan(0); // Poprawa okienek klasy!
  });

  it('wykonuje bezbłędnie przeniesienie lekcji', () => {
    const suggestion = {
      id: 'move_0_1',
      type: 'move_to_empty' as const,
      targetDay: 0,
      targetDayName: 'Poniedziałek',
      targetHour: 1,
      targetHourTime: '08:55–09:40',
      teacherFree: true,
      classFree: true,
      hasConflicts: false,
      conflictDetails: [],
      gapsDeltaTeacher: 0,
      gapsDeltaClass: -1,
      score: 95,
      recommendationLevel: 'perfect' as const,
      recommendationLabel: 'Rekomendacja: Idealne przeniesienie',
      reasons: []
    };

    const { newPlan } = executeSwapOrMove(
      basePlan,
      {
        key: 'c1|0|2',
        classId: 'c1',
        day: 0,
        hour: 2,
        lesson: basePlan.lessons['c1|0|2'],
        assignment: mockAssignments[1],
        subject: mockSubjects[1],
        teacher: mockTeachers[1],
        room: mockRooms[1]
      },
      suggestion
    );

    expect(newPlan.lessons['c1|0|2']).toBeUndefined();
    expect(newPlan.lessons['c1|0|1']).toBeDefined();
    expect(newPlan.lessons['c1|0|1'].assignmentId).toBe('a2');
  });
});
