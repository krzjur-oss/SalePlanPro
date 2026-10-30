/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Typy danych dla Audytora Higieny Planu Ucznia wg wytycznych MEN
 */

export type SubjectDifficultyLevel = 'hard' | 'medium' | 'light';

export interface SubjectHygieneClassification {
  subjectId: string;
  subjectName: string;
  difficulty: SubjectDifficultyLevel; // 'hard' (np. matematyka, chemia), 'medium' (np. historia, biologia), 'light' (np. wf, plastyka, muzyka)
  isCustomOverride?: boolean;
}

export type HygieneViolationSeverity = 'critical' | 'warning' | 'info';

export type HygieneViolationType = 
  | 'daily_hours_exceeded'        // Przekroczenie maksymalnej dziennej liczby godzin wg MEN
  | 'difficult_subject_late'       // Trudny przedmiot na skrajnej/późnej godzinie (np. 7-8 lekcja)
  | 'difficult_subjects_chain'     // Kumulacja 3+ trudnych przedmiotów pod rząd bez oddechu
  | 'student_gap_detected'         // Okienko w planie klasy (niedopuszczalne wg BHP MEN)
  | 'lunch_break_missing'          // Brak przerwy obiadowej (>= 15 min) w oknie 11:30-13:30
  | 'unbalanced_weekly_days'       // Dysproporcja godzin między dniami (np. 8 lekcji w poniedziałek, 4 we wtorek)
  | 'unstable_start_hour';         // Zmienne godziny rozpoczynania zajęć (brak stałości)

export interface HygieneViolation {
  id: string;
  type: HygieneViolationType;
  severity: HygieneViolationSeverity;
  classId: string;
  className: string;
  dayIdx?: number;
  dayName?: string;
  hourNum?: number;
  timeRange?: string;
  subjectName?: string;
  title: string;
  description: string;
  menRegulationRef: string; // Odniesienie do wytycznych MEN / Sanepid
  repairSuggestion?: string; // Konkretna podpowiedź naprawcza dla planisty
}

export interface DayHygieneStats {
  dayIdx: number;
  dayName: string;
  totalLessons: number;
  startHour: number;
  endHour: number;
  hardSubjectsCount: number;
  lightSubjectsCount: number;
  fatigueScore: number; // 0..100 (im wyższy, tym większe zmęczenie uczniów)
  hasLunchBreak: boolean;
  hasGap: boolean;
}

export interface ClassHygieneReport {
  classId: string;
  className: string;
  gradeLevel: '1-3' | '4-6' | '7-8' | 'ponadpodstawowa';
  totalWeeklyHours: number;
  hygieneScore: number; // 0..100 pkt
  scoreGrade: 'wzorowy' | 'dobry' | 'wymaga_poprawy' | 'krytyczny';
  dayStats: DayHygieneStats[];
  violations: HygieneViolation[];
  maxDailyHours: number;
  minDailyHours: number;
  hoursFluctuation: number; // Różnica max - min
  fatigueCurveAverage: number;
  hardSubjectsAfter5thHourCount: number;
  recommendations: string[];
}

export interface SchoolHygieneAuditSummary {
  overallScore: number; // 0..100
  overallGrade: 'wzorowy' | 'dobry' | 'wymaga_poprawy' | 'krytyczny';
  totalClassesAudited: number;
  classesWithViolationsCount: number;
  criticalViolationsCount: number;
  warningsCount: number;
  infosCount: number;
  
  // Wskaźniki składowe
  complianceMetrics: {
    dailyLimitsCompliance: number; // % klas bez przekroczeń limitu godzin
    fatigueCurveCompliance: number; // % trudnych przedmiotów w strefie optymalnej percepcji
    noGapsCompliance: number; // % dni bez okienek uczniowskich
    lunchBreakCompliance: number; // % dni z zagwarantowaną przerwą obiadową
    weeklyBalanceCompliance: number; // % klas ze zrównoważonym tygodniem
  };

  classReports: ClassHygieneReport[];
  criticalViolationsList: HygieneViolation[];
  topImprovementOpportunities: string[];
  auditTimestamp: string;
}
