/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Typy danych dla Modułu Szybkich Zastępstw Dziennych
 */

export type AbsenceReason = 
  | 'zwolnienie_lekarskie' 
  | 'opieka' 
  | 'wycieczka' 
  | 'szkolenie' 
  | 'urlop' 
  | 'delegacja' 
  | 'inne';

export interface AbsenceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAbbr: string;
  date: string; // YYYY-MM-DD
  reason: AbsenceReason;
  reasonDetails?: string;
  wholeDay: boolean;
  startHour?: number;
  endHour?: number;
  createdAt: string;
}

export type SubstitutionActionType = 
  | 'substitute_teacher'  // Zastępstwo z nauczycielem
  | 'study_room'          // Opieka w czytelni / bibliotece / świetlicy
  | 'combine_classes'     // Łączenie z inną klasą / grupą
  | 'cancel_lesson'       // Odwołanie lekcji / zwolnienie do domu
  | 'change_room'         // Tylko zmiana sali
  | 'unassigned';         // Wakat - oczekuje na decyzję

export type SubstitutionStatus = 'pending' | 'confirmed' | 'cancelled';

export interface DailySubstitution {
  id: string;
  absenceId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Pon, 1=Wt, 2=Śr, 3=Czw, 4=Pt
  hourNum: number;
  timeRange?: string; // np. "08:00 - 08:45"
  lessonKey: string; // klucz w planLekcji.lessons: "classId|dayIdx|hourNum"
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor?: string;
  originalTeacherId: string;
  originalTeacherName: string;
  originalTeacherAbbr: string;
  originalRoomId?: string | null;
  originalRoomName?: string | null;
  
  actionType: SubstitutionActionType;
  
  replacementTeacherId?: string | null;
  replacementTeacherName?: string | null;
  replacementTeacherAbbr?: string | null;
  
  replacementSubjectId?: string | null;
  replacementSubjectName?: string | null;
  
  replacementRoomId?: string | null;
  replacementRoomName?: string | null;
  
  combinedWithClassId?: string | null;
  combinedWithClassName?: string | null;
  
  note?: string;
  status: SubstitutionStatus;
  
  // Zastępstwo na powiązanym dyżurze nauczycielskim
  isDutyAffected?: boolean;
  dutySpotName?: string;
  dutyBreakTime?: string;
  dutyReplacementTeacherId?: string | null;
  dutyReplacementTeacherName?: string | null;
  
  updatedAt: string;
}

export interface DailySubstitutionsState {
  absences: AbsenceRecord[];
  substitutions: DailySubstitution[];
  selectedDate: string; // YYYY-MM-DD
}

export interface CandidateTeacherInfo {
  teacherId: string;
  first: string;
  last: string;
  abbr: string;
  fullName: string;
  score: number; // 0..100
  recommendationLevel: 'ideal' | 'good' | 'possible' | 'conflict';
  isAvailable: boolean;
  hasWindowInSchedule: boolean;
  teachesSameSubject: boolean;
  teachesSameClass: boolean;
  currentLessonAtHour?: {
    className: string;
    subjectName: string;
  };
  hasDutyAtBreak?: boolean;
  reasons: string[];
  warnings: string[];
}
