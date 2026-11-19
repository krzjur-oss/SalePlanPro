import { describe, it, expect } from 'vitest';
import { describeLesson, getGroupShort, getSubjectShort, LessonDisplayContext } from './lessonDisplay';
import { Assignment, Class, ClassRoom, Lesson, SchedCell, SchoolGroup, Subject, Teacher } from '../types';

function createBaseCtx(): LessonDisplayContext {
  const classes: Class[] = [
    { id: 'c_5a', name: '5A', color: '#3b82f6', groupIds: ['g_5a_1', 'g_5a_2'], year: 5 },
    { id: 'c_5b', name: '5B', color: '#10b981', groupIds: ['g_5b_2'], year: 5 },
  ];
  const teachers: Teacher[] = [
    { id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN', maxHours: 18 },
    { id: 't2', first: 'Bartosz', last: 'Kowalski', abbr: 'BK', maxHours: 18 },
  ];
  const subjects: Subject[] = [
    { id: 's_ang', name: 'Język angielski', short: 'Ang', color: '#2563eb' },
    { id: 's_mat', name: 'Matematyka', short: 'Mat', color: '#ef4444' },
  ];
  const rooms: ClassRoom[] = [
    { id: 'r_101', name: '101' },
  ];
  const schoolGroups: SchoolGroup[] = [
    { id: 'g_5a_1', name: 'gr1', classId: 'c_5a' },
    { id: 'g_5a_2', name: 'gr2', classId: 'c_5a' },
    { id: 'g_5b_2', name: 'gr2', classId: 'c_5b' },
  ];

  return {
    classes,
    teachers,
    subjects,
    rooms,
    schoolGroups,
  };
}

describe('lessonDisplay – describeLesson', () => {
  it('grupa: poprawnie rozwiązuje pojedynczą klasę z grupą w Etapie 1 i Etapie 2', () => {
    const ctx = createBaseCtx();
    const asg: Assignment = {
      id: 'a1',
      classId: 'c_5a',
      teacherId: 't1',
      subjectId: 's_ang',
      roomId: 'r_101',
      hoursPerWeek: 3,
      groupId: 'g_5a_1',
    };
    const lesson: Lesson = { assignmentId: 'a1', locked: false };

    const etap1Res = describeLesson(
      { lesson, assignment: asg, lessonKey: 'c_5a|0|0|g_5a_1' },
      ctx
    );
    expect(etap1Res.classLabel).toBe('5A');
    expect(etap1Res.groupLabel).toBe('gr1');
    expect(etap1Res.groupShort).toBe('G1');
    expect(etap1Res.subjectName).toBe('Język angielski');
    expect(etap1Res.subjectShort).toBe('Ang');
    expect(etap1Res.leadTeacher?.abbr).toBe('AN');
    expect(etap1Res.leadTeacher?.compact).toBe('A. Nowak (AN)');
    expect(etap1Res.leadTeacher?.full).toBe('Anna Nowak (AN)');
    expect(etap1Res.supportTeacher).toBeNull();
    expect(etap1Res.roomName).toBe('101');
    expect(etap1Res.linkedWith).toBeUndefined();

    const cell: SchedCell & { roomName?: string } = {
      classes: ['5A'],
      className: '5A (gr1)',
      subject: 'Język angielski',
      teacherAbbr: 'AN',
      roomName: '101',
      note: 'Podział na grupy',
    };
    const etap2Res = describeLesson(cell, ctx);
    expect(etap2Res.classLabel).toBe('5A');
    expect(etap2Res.groupLabel).toBe('gr1');
    expect(etap2Res.groupShort).toBe('G1');
    expect(etap2Res.subjectName).toBe('Język angielski');
    expect(etap2Res.subjectShort).toBe('Ang');
    expect(etap2Res.leadTeacher?.abbr).toBe('AN');
    expect(etap2Res.roomName).toBe('101');
    expect(etap2Res.note).toBe('Podział na grupy');
    expect(etap2Res.linkedWith).toBeUndefined();
  });

  it('grupa łączona międzyklasowa: obsługuje 5A (gr1) + 5B (gr2) w widoku wspólnym i per klasa', () => {
    const ctx = createBaseCtx();
    const asgLinked: Assignment = {
      id: 'a_link',
      classId: 'c_5a',
      teacherId: 't1',
      subjectId: 's_ang',
      roomId: 'r_101',
      hoursPerWeek: 2,
      groupId: 'g_5a_1',
      linkedClassIds: ['c_5b'],
      linkedGroupIds: ['g_5b_2'],
    };
    const lesson: Lesson = { assignmentId: 'a_link', locked: false, supportTeacherId: 't2' };

    // Widok sali / ogólny (Etap 1)
    const roomEtap1 = describeLesson(
      { lesson, assignment: asgLinked, lessonKey: 'c_5a|0|0|g_5a_1' },
      ctx
    );
    expect(roomEtap1.classLabel).toBe('5A (gr1) + 5B (gr2)');
    expect(roomEtap1.linkedWith).toBe('5A (gr1) + 5B (gr2)');
    expect(roomEtap1.groupLabel).toBe('gr1 + gr2');
    expect(roomEtap1.groupShort).toBeUndefined();

    // Widok klasy 5B (Etap 1 z targetClassId)
    const class5BEtap1 = describeLesson(
      { lesson, assignment: asgLinked, lessonKey: 'c_5b|0|0|g_5b_2' },
      { ...ctx, targetClassId: 'c_5b' }
    );
    expect(class5BEtap1.groupLabel).toBe('gr2');
    expect(class5BEtap1.groupShort).toBe('G2');
    expect(class5BEtap1.linkedWith).toBe('5A (gr1) + 5B (gr2)');

    // Etap 2 komórka z połączonymi klasami i różnymi grupami
    const cellLinked: SchedCell = {
      classes: ['5A', '5B'],
      className: '5A (gr1) + 5B (gr2)',
      subject: 'Język angielski',
      teacherAbbr: 'AN',
      supportTeacherAbbr: 'BK',
      _bridgeMeta: {
        classId: 'c_5a',
        subjectId: 's_ang',
        teacherId: 't1',
        groupId: 'g_5a_1',
        linkedClassIds: ['c_5b'],
        linkedGroupIds: ['g_5b_2'],
      },
    };

    const roomEtap2 = describeLesson(cellLinked, { ...ctx, roomName: '101' });
    expect(roomEtap2.classLabel).toBe('5A (gr1) + 5B (gr2)');
    expect(roomEtap2.linkedWith).toBe('5A (gr1) + 5B (gr2)');
    expect(roomEtap2.groupShort).toBeUndefined();

    const class5BEtap2 = describeLesson(cellLinked, { ...ctx, targetClassName: '5B' });
    expect(class5BEtap2.groupLabel).toBe('gr2');
    expect(class5BEtap2.linkedWith).toBe('5A (gr1) + 5B (gr2)');
  });

  it('wspomagający: zwraca dane nauczyciela wspomagającego w Etapie 1 i Etapie 2', () => {
    const ctx = createBaseCtx();
    const asg: Assignment = {
      id: 'a2',
      classId: 'c_5a',
      teacherId: 't1',
      subjectId: 's_mat',
      roomId: 'r_101',
      hoursPerWeek: 4,
      groupId: null,
    };
    const lesson: Lesson = {
      assignmentId: 'a2',
      locked: false,
      supportTeacherId: 't2',
    };

    const res1 = describeLesson({ lesson, assignment: asg }, ctx);
    expect(res1.leadTeacher?.abbr).toBe('AN');
    expect(res1.supportTeacher?.abbr).toBe('BK');
    expect(res1.supportTeacher?.full).toBe('Bartosz Kowalski (BK)');
    expect(res1.supportTeacher?.compact).toBe('B. Kowalski (BK)');

    const cell: SchedCell = {
      classes: ['5A'],
      className: '5A',
      subject: 'Matematyka',
      teacherAbbr: 'AN',
      supportTeacherAbbr: 'BK',
    };
    const res2 = describeLesson(cell, ctx);
    expect(res2.leadTeacher?.abbr).toBe('AN');
    expect(res2.supportTeacher?.abbr).toBe('BK');
    expect(res2.supportTeacher?.full).toBe('Bartosz Kowalski (BK)');
  });

  it('brak sali: zwraca undefined dla roomName i nie traktuje notatki jako nazwy sali', () => {
    const ctx = createBaseCtx();
    const asgNoRoom: Assignment = {
      id: 'a3',
      classId: 'c_5a',
      teacherId: 't1',
      subjectId: 's_mat',
      roomId: null,
      hoursPerWeek: 1,
      groupId: null,
    };
    const res1 = describeLesson({ lesson: { assignmentId: 'a3', locked: false }, assignment: asgNoRoom }, ctx);
    expect(res1.roomName).toBeUndefined();

    const cellNoRoom: SchedCell = {
      classes: ['5A'],
      className: '5A',
      subject: 'Matematyka',
      teacherAbbr: 'AN',
      note: 'Zajęcia terenowe — nie sala',
    };
    const res2 = describeLesson(cellNoRoom, {
      ...ctx,
      colKey: 'colNoRoom',
      resolveRoomFromColKey: () => '',
    });
    expect(res2.roomName).toBeUndefined();
    expect(res2.note).toBe('Zajęcia terenowe — nie sala');
  });

  it('brak nauczyciela: zwraca null dla leadTeacher w Etapie 1 i Etapie 2', () => {
    const ctx = createBaseCtx();
    const asgNoTeacher: Assignment = {
      id: 'a4',
      classId: 'c_5a',
      teacherId: null,
      subjectId: 's_mat',
      roomId: 'r_101',
      hoursPerWeek: 1,
      groupId: null,
    };
    const res1 = describeLesson(
      { lesson: { assignmentId: 'a4', locked: false }, assignment: asgNoTeacher },
      ctx
    );
    expect(res1.leadTeacher).toBeNull();
    expect(res1.supportTeacher).toBeNull();

    const cellNoTeacher: SchedCell = {
      classes: ['5A'],
      className: '5A',
      subject: 'Godzina wychowawcza',
      teacherAbbr: '',
    };
    const res2 = describeLesson(cellNoTeacher, ctx);
    expect(res2.leadTeacher).toBeNull();
    expect(res2.subjectName).toBe('Godzina wychowawcza');
  });

  it('pomocniki getSubjectShort i getGroupShort formatują skróty zgodnie z konwencją wydruków', () => {
    expect(getSubjectShort('Godzina wychowawcza')).toBe('GW');
    expect(getSubjectShort('Język angielski', { id: 's1', name: 'Język angielski', short: 'Ang' })).toBe('Ang');
    expect(getGroupShort('gr1')).toBe('G1');
    expect(getGroupShort('Chłopcy')).toBe('chł');
    expect(getGroupShort('Religia', 'Religia')).toBe('');
  });
});
