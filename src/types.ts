export interface School {
  name: string;
  short: string;
  phone?: string;
  web?: string;
}

export interface Hour {
  num: number;
  start: string;
  end: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  desc?: string;
  type?: string;
  capacity?: number;
  isGrade1_3?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  short: string;
  color: string;
  defaultGroupPattern?: string;
}

export interface Teacher {
  id: string;
  first: string;
  last: string;
  abbr: string;
  maxHours?: number;
  color?: string;
  overtimeHours?: number;
  availability?: string[]; // format: "dayIndex-hourNum" (np. "0-1")
  inactive?: boolean;
  inactiveComment?: string;
  substitutions?: string[]; // entries format: "inactiveTeacherId|dayIndex|hourNum" or similar representing assigned substitutions
  preferredRooms?: string[]; // list of preferred room column keys (e.g. ["f0_s0_104"])
}

export interface SchoolGroup {
  id: string;
  name: string;
  color?: string;
  classId?: string;
}

export interface Assignment {
  id: string;
  classId: string;
  teacherId: string | null;
  subjectId: string;
  roomId: string | null;
  hoursPerWeek: number;
  groupId: string | null;
  linkedGroupIds?: string[];
  linkedClassIds?: string[];
  preferredBlockSize?: number;
}

export interface Lesson {
  assignmentId: string;
  locked: boolean;
  supportTeacherId?: string | null;
}

export interface LessonsState {
  [key: string]: Lesson; // "classId|day|hour" lub "classId|day|hour|groupId"
}

export interface SpecialStudent {
  id: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  type: 'ni' | 'rewa' | 'wsp';
  note?: string;
  supportTeacherIds?: string[]; // Multiple support teachers on regular lessons
}

export interface SpecialAssignment {
  id: string;
  studentId: string;
  teacherId: string | null;
  supportTeacherId?: string | null;
  roomId?: string | null;
  hoursPerWeek: number;
  withClass: boolean;
  subjectId: string;
}

export interface SpecialLesson {
  assignmentId: string;
}

export interface SpecialLessonsState {
  [key: string]: SpecialLesson; // "studentId|day|hour|assignmentId"
}

export interface SpecialAbsencesState {
  [key: string]: boolean; // "studentId|day|hour"
}

export interface Building {
  id: string;
  name: string;
  address?: string;
  multi?: boolean;
  hasCustomStructure?: boolean;
  customFloors?: string[];
  customSegments?: string[];
}

export interface Room {
  id: string;
  num: string;
  sub?: string;
}

export interface Segment {
  id: string;
  name: string;
  rooms: Room[];
}

export interface Floor {
  id: string;
  name: string;
  color: string;
  buildingIdx: number;
  segments: Segment[];
}

export interface SchedCell {
  teacherAbbr?: string;
  supportTeacherAbbr?: string;
  classes: string[];
  className: string;
  subject: string;
  note?: string;
  locked?: boolean;
  _bridgeMeta?: {
    classId: string;
    teacherId: string | null;
    subjectId: string | null;
    roomId: string | null;
    groupId: string | null;
    suggestedRoom: string | null;
  };
}

export interface SchedDataYDH {
  [colKey: string]: SchedCell | SchedCell[];
}

export interface SchedDataYear {
  [dayIdx: number]: {
    [hourKey: string]: SchedDataYDH;
  };
}

export interface SchedData {
  [yearKey: string]: SchedDataYear;
}

export interface Homeroom {
  className: string;
  teacherAbbr?: string;
  className2?: string;
  teacherAbbr2?: string;
}

export interface HomeroomState {
  [colKey: string]: Homeroom;
}

export interface Class {
  id: string;
  name: string;
  color: string;
  groupIds: string[];
  group?: string;
  year?: number | null;
  students?: number | null;
  abbr?: string;
  baseClass?: string;
}

export interface PlanLekcjiState {
  meta: {
    schoolName: string;
    year: string;
    modifiedAt?: string;
  };
  hours: Hour[];
  classes: Class[];
  teachers: Teacher[];
  rooms: ClassRoom[];
  subjects: Subject[];
  schoolGroups: SchoolGroup[];
  assignments: Assignment[];
  lessons: LessonsState;
  specialStudents: SpecialStudent[];
  specialAssignments: SpecialAssignment[];
  specialLessons: SpecialLessonsState;
  specialAbsences: SpecialAbsencesState;
}

export interface MiejsceDyzuru {
  id: string;
  name: string;
  desc?: string;
  floor?: string;
  teachersNeeded?: number;
  connectedRooms?: string[];
  isTransitional?: boolean;
}

export interface Przerwa {
  num: number;
  start: string;
  end: string;
  name: string;
}

export interface DyzurEntry {
  teacherAbbr: string;
  locked: boolean;
  note?: string;
}

export interface DyzuryState {
  [key: string]: DyzurEntry; // "miejsceId|dzien|przerwa"
}

export interface PlanDyzuryState {
  miejsca: MiejsceDyzuru[];
  przerwy: Przerwa[];
  harmonogram: DyzuryState;
  settings: {
    autoBalance: boolean;
    maxPerTeacher: number;
    excludeTeachers: string[];
    maxMinutesPerTeacher?: number;
    maxConsecutiveDuties?: number;
    excludeAfterLastLesson?: boolean;
    skipDutyIfNoClassesOnCorridor?: boolean;
  };
}

export interface GeneratorSettings {
  maxGapsPerTeacher: number;
  obeyAvailability: boolean;
  avoidExtremes: boolean;
  avoidExtremesSubjectIds?: string[];
  noStudentGaps: boolean;
  allowDoubleBlocks: boolean;
  includeSpecialNI: boolean;
  limitComputerLabs: boolean;
  customComputerLabsCount: number;
  minAvailableSubstitutionTeachersPerSlot?: number;

  genPriorityHomerooms: boolean;
  genPriorityTeachers: boolean;
  genExcludeWF: boolean;
  genAutoPlaceWF: boolean;
  genClearExisting: boolean;

  forceOptionalToExtremes?: boolean;
  optionalSubjectIds?: string[];
}

export interface AppState {
  yearKey: string;
  yearLabel: string;
  hours: string[]; // Plan Sal hours (keys of time slots)
  timeslots: Hour[]; // start, end, label
  school: School;
  buildings: Building[];
  floors: Floor[];
  classes: Class[]; // Plan Sal classes
  teachers: Teacher[]; // Plan Sal teachers
  subjects: Subject[]; // Plan Sal subjects
  homerooms: HomeroomState;
  planLekcji: PlanLekcjiState;
  dyzury: PlanDyzuryState;
  generatorSettings?: GeneratorSettings;
}

export interface ArchiveEntry {
  yearKey: string;
  label: string;
  savedAt: string;
  config: AppState;
}

export interface SnapshotEntry {
  id: string;
  name: string;
  createdAt: string;
  appState: AppState;
  schedData: SchedData;
  comment?: string;
  stats?: {
    assignedLessonsCount: number;
    classesCount: number;
    teachersCount: number;
  };
}

export interface AutosaveVersion {
  id: string;
  timestamp: string;
  appState: AppState;
  schedData: SchedData;
}

export interface UndoEntry {
  label: string;
  yearKey: string;
  day: number;
  scope: 'day' | 'year';
  snapshot: any; // schedData state snapshot
}

export interface AppEventLog {
  id: string;
  timestamp: string;
  actionType: 'restore' | 'import' | 'reset' | 'snapshot_create' | 'snapshot_delete' | 'undo' | 'redo' | 'other';
  description: string;
  details?: string;
}

export interface AppErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  type: 'runtime' | 'promise' | 'manual' | 'sw';
  userAgent: string;
  url: string;
}


