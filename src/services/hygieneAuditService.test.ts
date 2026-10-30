import { describe, it, expect } from 'vitest';
import { 
  classifySubjectDifficulty, 
  determineGradeLevel, 
  getMaxDailyHoursForGrade,
  checkLunchBreakAvailable,
  auditClassHygiene,
  auditSchoolHygiene
} from './hygieneAuditService';
import { Subject, Class, Hour, AppState } from '../types';
import { getDemoAppState } from '../utils';

describe('hygieneAuditService', () => {
  describe('Klasyfikacja trudności przedmiotów', () => {
    it('poprawnie rozpoznaje przedmioty trudne (Hard)', () => {
      const math: Subject = { id: 's1', name: 'Matematyka', short: 'MAT', color: '#ff0000' };
      const physics: Subject = { id: 's2', name: 'Fizyka', short: 'FIZ', color: '#00ff00' };
      const english: Subject = { id: 's3', name: 'Język angielski', short: 'ANG', color: '#0000ff' };
      const chemistry: Subject = { id: 's4', name: 'Chemia', short: 'CH', color: '#112233' };

      expect(classifySubjectDifficulty(math)).toBe('hard');
      expect(classifySubjectDifficulty(physics)).toBe('hard');
      expect(classifySubjectDifficulty(english)).toBe('hard');
      expect(classifySubjectDifficulty(chemistry)).toBe('hard');
    });

    it('poprawnie rozpoznaje przedmioty relaksacyjne/ruchowe (Light)', () => {
      const pe: Subject = { id: 's5', name: 'Wychowanie fizyczne', short: 'WF', color: '#00ffff' };
      const art: Subject = { id: 's6', name: 'Plastyka', short: 'PL', color: '#ffff00' };
      const music: Subject = { id: 's7', name: 'Muzyka', short: 'MUZ', color: '#ff00ff' };
      const homeroom: Subject = { id: 's8', name: 'Godzina z wychowawcą', short: 'GW', color: '#123456' };

      expect(classifySubjectDifficulty(pe)).toBe('light');
      expect(classifySubjectDifficulty(art)).toBe('light');
      expect(classifySubjectDifficulty(music)).toBe('light');
      expect(classifySubjectDifficulty(homeroom)).toBe('light');
    });

    it('klasyfikuje pozostałe przedmioty jako umiarkowane (Medium)', () => {
      const general: Subject = { id: 's9', name: 'Zajęcia ogólne', short: 'OGÓL', color: '#654321' };
      expect(classifySubjectDifficulty(general)).toBe('medium');
    });
  });

  describe('Rozpoznawanie etapów edukacyjnych i limitów godzin MEN', () => {
    it('klasyfikuje etapy edukacyjne na podstawie nazwy klasy', () => {
      expect(determineGradeLevel('1A')).toBe('1-3');
      expect(determineGradeLevel('3B')).toBe('1-3');
      expect(determineGradeLevel('4C')).toBe('4-6');
      expect(determineGradeLevel('6A')).toBe('4-6');
      expect(determineGradeLevel('7B')).toBe('7-8');
      expect(determineGradeLevel('8A')).toBe('7-8');
      expect(determineGradeLevel('2A LO')).toBe('ponadpodstawowa');
      expect(determineGradeLevel('I Liceum')).toBe('ponadpodstawowa');
    });

    it('zwraca prawidłowe dzienne limity godzin wg MEN', () => {
      expect(getMaxDailyHoursForGrade('1-3')).toBe(5);
      expect(getMaxDailyHoursForGrade('4-6')).toBe(6);
      expect(getMaxDailyHoursForGrade('7-8')).toBe(7);
      expect(getMaxDailyHoursForGrade('ponadpodstawowa')).toBe(8);
    });
  });

  describe('Weryfikacja przerw obiadowych', () => {
    it('wykrywa przerwę obiadową >= 15 min w oknie południowym', () => {
      const timeslots: Hour[] = [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' },
        { num: 4, start: '10:45', end: '11:30' },
        { num: 5, start: '11:50', end: '12:35' }, // przerwa 11:30 do 11:50 = 20 min
        { num: 6, start: '12:45', end: '13:30' }
      ];

      expect(checkLunchBreakAvailable(timeslots)).toBe(true);
    });

    it('wykrywa brak długiej przerwy gdy wszystkie mają tylko 5-10 min', () => {
      const timeslots: Hour[] = [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:50', end: '09:35' }, // 5 min
        { num: 3, start: '09:40', end: '10:25' }, // 5 min
        { num: 4, start: '10:30', end: '11:15' }, // 5 min
        { num: 5, start: '11:25', end: '12:10' }, // 10 min
        { num: 6, start: '12:20', end: '13:05' }  // 10 min
      ];

      expect(checkLunchBreakAvailable(timeslots)).toBe(false);
    });
  });

  describe('Audyt planu szkoły i klas', () => {
    const demoState = getDemoAppState();

    it('przeprowadza pełny audyt szkoły i zwraca raport z metrykami', () => {
      const summary = auditSchoolHygiene(demoState);

      expect(summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(summary.overallScore).toBeLessThanOrEqual(100);
      expect(summary.totalClassesAudited).toBe(demoState.planLekcji.classes.length);
      expect(summary.classReports.length).toBe(demoState.planLekcji.classes.length);
      expect(summary.complianceMetrics).toHaveProperty('dailyLimitsCompliance');
      expect(summary.complianceMetrics).toHaveProperty('fatigueCurveCompliance');
      expect(summary.complianceMetrics).toHaveProperty('noGapsCompliance');
      expect(summary.complianceMetrics).toHaveProperty('lunchBreakCompliance');
      expect(summary.complianceMetrics).toHaveProperty('weeklyBalanceCompliance');
    });

    it('wykrywa okienko w planie klasy i oznacza je statusem critical', () => {
      const testClass = demoState.planLekcji.classes[0];
      const testSubject = demoState.planLekcji.subjects[0];
      const asgId = 'asg-test-gap';

      const modifiedState: AppState = {
        ...demoState,
        planLekcji: {
          ...demoState.planLekcji,
          assignments: [
            ...demoState.planLekcji.assignments,
            {
              id: asgId,
              classId: testClass.id,
              teacherId: 't1',
              subjectId: testSubject.id,
              roomId: 'r1',
              hoursPerWeek: 2,
              groupId: null
            }
          ],
          lessons: {
            // Lekcja 1 oraz lekcja 3, brak lekcji 2 (okienko!)
            [`${testClass.id}|0|1`]: { assignmentId: asgId, locked: false },
            [`${testClass.id}|0|3`]: { assignmentId: asgId, locked: false }
          }
        }
      };

      const classReport = auditClassHygiene(testClass, modifiedState);
      const gapViolation = classReport.violations.find(v => v.type === 'student_gap_detected');

      expect(gapViolation).toBeDefined();
      expect(gapViolation?.severity).toBe('critical');
      expect(gapViolation?.hourNum).toBe(2);
    });
  });
});
