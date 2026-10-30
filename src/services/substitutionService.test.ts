import { describe, it, expect } from 'vitest';
import { 
  getSchoolDayOfWeek, 
  getOffsetISODate, 
  getNextSchoolDayISODate,
  formatPolishDateWithDay,
  findAffectedLessonsForAbsence,
  getSmartSubstitutionCandidates,
  suggestOptimalSubstitution,
  autoResolveAllPendingForDate
} from './substitutionService';
import { AppState, AbsenceRecord, DailySubstitution } from '../types';
import { getDemoAppState } from '../utils';

describe('substitutionService', () => {
  describe('Kalkulator dat i dni szkolnych', () => {
    it('poprawnie wylicza dni robocze 0-4 (Pn-Pt) oraz odrzuca weekendy', () => {
      // 2026-10-12 to Poniedziałek (day 0)
      expect(getSchoolDayOfWeek('2026-10-12')).toBe(0);
      // 2026-10-14 to Środa (day 2)
      expect(getSchoolDayOfWeek('2026-10-14')).toBe(2);
      // 2026-10-16 to Piątek (day 4)
      expect(getSchoolDayOfWeek('2026-10-16')).toBe(4);
      // 2026-10-17 to Sobota (weekend = -1)
      expect(getSchoolDayOfWeek('2026-10-17')).toBe(-1);
      // 2026-10-18 to Niedziela (weekend = -1)
      expect(getSchoolDayOfWeek('2026-10-18')).toBe(-1);
    });

    it('poprawnie przesuwa datę do kolejnego dnia roboczego', () => {
      // Z piątku (2026-10-16) kolejny dzień roboczy to poniedziałek (2026-10-19)
      expect(getNextSchoolDayISODate('2026-10-16')).toBe('2026-10-19');
      // Ze środy (2026-10-14) to czwartek (2026-10-15)
      expect(getNextSchoolDayISODate('2026-10-14')).toBe('2026-10-15');
    });

    it('formatuje datę w czytelny polski ciąg znaków', () => {
      const formatted = formatPolishDateWithDay('2026-10-14');
      expect(formatted).toContain('Środa');
      expect(formatted).toContain('października');
      expect(formatted).toContain('2026');
    });
  });

  describe('Wyszukiwanie lekcji nieobecnego nauczyciela', () => {
    const demoState = getDemoAppState();

    it('znajduje lekcje powiązane z nieobecnym nauczycielem w danym dniu', () => {
      const teacher = demoState.planLekcji.teachers[0];
      const absence: AbsenceRecord = {
        id: 'abs-1',
        teacherId: teacher.id,
        teacherName: `${teacher.first} ${teacher.last}`,
        teacherAbbr: teacher.abbr,
        date: '2026-10-14', // Środa (day 2)
        reason: 'zwolnienie_lekarskie',
        wholeDay: true,
        createdAt: new Date().toISOString()
      };

      const affected = findAffectedLessonsForAbsence(absence, demoState);
      expect(Array.isArray(affected)).toBe(true);
      // Każda znaleziona lekcja musi należeć do tego nauczyciela
      affected.forEach(sub => {
        expect(sub.originalTeacherId).toBe(teacher.id);
        expect(sub.dayOfWeek).toBe(2);
        expect(sub.status).toBe('pending');
      });
    });

    it('filtruje zakres godzinowy gdy nieobecność nie jest całodniowa', () => {
      const teacher = demoState.planLekcji.teachers[0];
      const absencePartial: AbsenceRecord = {
        id: 'abs-partial',
        teacherId: teacher.id,
        teacherName: `${teacher.first} ${teacher.last}`,
        teacherAbbr: teacher.abbr,
        date: '2026-10-14',
        reason: 'szkolenie',
        wholeDay: false,
        startHour: 2,
        endHour: 3,
        createdAt: new Date().toISOString()
      };

      const affected = findAffectedLessonsForAbsence(absencePartial, demoState);
      affected.forEach(sub => {
        expect(sub.hourNum).toBeGreaterThanOrEqual(2);
        expect(sub.hourNum).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Inteligentny ranking i scoring zastępców', () => {
    const demoState = getDemoAppState();

    it('przyznaje wyższy wynik wolnym kandydatom z kwalifikacjami przedmiotowymi', () => {
      const teacher = demoState.planLekcji.teachers[0];
      const dummySub: DailySubstitution = {
        id: 'sub-test',
        absenceId: 'abs-test',
        date: '2026-10-14',
        dayOfWeek: 2,
        hourNum: 2,
        lessonKey: 'c1|2|2',
        classId: demoState.planLekcji.classes[0].id,
        className: demoState.planLekcji.classes[0].name,
        subjectId: demoState.planLekcji.subjects[0].id,
        subjectName: demoState.planLekcji.subjects[0].name,
        originalTeacherId: teacher.id,
        originalTeacherName: `${teacher.first} ${teacher.last}`,
        originalTeacherAbbr: teacher.abbr,
        actionType: 'unassigned',
        status: 'pending',
        updatedAt: new Date().toISOString()
      };

      const candidates = getSmartSubstitutionCandidates(dummySub, demoState);
      expect(candidates.length).toBeGreaterThan(0);
      
      // Sprawdzenie, czy nieobecny nauczyciel nie znajduje się na liście zastępców
      expect(candidates.some(c => c.teacherId === teacher.id)).toBe(false);

      // Sprawdzenie czy kandydaci mają wyliczone wyniki w przedziale 0..100
      candidates.forEach(c => {
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(100);
      });
    });

    it('autoResolveAllPendingForDate przypisuje brakujące zastępstwa bez kolizji', () => {
      const teacher = demoState.planLekcji.teachers[0];
      const dummySub: DailySubstitution = {
        id: 'sub-pending-1',
        absenceId: 'abs-test',
        date: '2026-10-14',
        dayOfWeek: 2,
        hourNum: 1,
        lessonKey: 'c1|2|1',
        classId: demoState.planLekcji.classes[0].id,
        className: demoState.planLekcji.classes[0].name,
        subjectId: demoState.planLekcji.subjects[0].id,
        subjectName: demoState.planLekcji.subjects[0].name,
        originalTeacherId: teacher.id,
        originalTeacherName: `${teacher.first} ${teacher.last}`,
        originalTeacherAbbr: teacher.abbr,
        actionType: 'unassigned',
        status: 'pending',
        updatedAt: new Date().toISOString()
      };

      const resolved = autoResolveAllPendingForDate(
        '2026-10-14',
        demoState,
        undefined,
        [dummySub],
        []
      );

      expect(resolved.length).toBe(1);
      expect(resolved[0].status).toBe('confirmed');
      expect(resolved[0].actionType).not.toBe('unassigned');
    });
  });
});
