import { z } from 'zod';
import { ImportPayload } from './mergeEngine';

/**
 * Strips dangerous prototype pollution properties (__proto__, constructor, prototype)
 * recursively from an arbitrary JSON structure.
 */
export function sanitizeProtoPollution<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeProtoPollution(item)) as unknown as T;
  }

  const cleanObj: Record<string, any> = Object.create(null);

  for (const key of Object.keys(obj)) {
    // Strictly block and drop prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const val = (obj as Record<string, any>)[key];
    cleanObj[key] = sanitizeProtoPollution(val);
  }

  return cleanObj as T;
}

// ── ZOD SCHEMAS FOR SALEPLAN PRO DATA MODELS ──

export const SchoolSchema = z.object({
  name: z.string().default('Szkoła Podstawowa'),
  short: z.string().default('SP'),
  phone: z.string().optional().default(''),
  web: z.string().optional().default(''),
}).passthrough();

export const HourSchema = z.object({
  num: z.number(),
  start: z.string(),
  end: z.string(),
  label: z.string().optional(),
}).passthrough();

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional().default('#2563eb'),
  year: z.number().nullable().optional(),
  students: z.number().nullable().optional(),
  groupIds: z.array(z.string()).optional().default([]),
  group: z.string().optional(),
  abbr: z.string().optional(),
  baseClass: z.string().optional(),
}).passthrough();

export const TeacherSchema = z.object({
  id: z.string(),
  first: z.string().optional().default(''),
  last: z.string(),
  abbr: z.string(),
  maxHours: z.number().optional().default(18),
  color: z.string().optional().default('#3b82f6'),
  availability: z.array(z.string()).optional().default([]),
  inactive: z.boolean().optional().default(false),
  inactiveComment: z.string().optional(),
  preferredRooms: z.array(z.string()).optional().default([]),
  isAdministrative: z.boolean().optional(),
  administrativeRole: z.string().optional(),
}).passthrough();

export const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  color: z.string().optional().default('#2563eb'),
}).passthrough();

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().optional().default(30),
  color: z.string().optional(),
  isLab: z.boolean().optional(),
}).passthrough();

export const SegmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  rooms: z.array(RoomSchema).optional().default([]),
}).passthrough();

export const FloorSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  buildingIdx: z.number().optional().default(0),
  segments: z.array(SegmentSchema).optional().default([]),
}).passthrough();

export const BuildingSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  color: z.string().optional(),
}).passthrough();

export const AssignmentSchema = z.object({
  id: z.string(),
  classId: z.string(),
  teacherId: z.string().nullable(),
  subjectId: z.string(),
  roomId: z.string().nullable().optional(),
  hoursPerWeek: z.number().default(1),
  groupId: z.string().nullable().optional(),
  linkedGroupIds: z.array(z.string()).optional(),
  linkedClassIds: z.array(z.string()).optional(),
  preferredBlockSize: z.number().optional(),
}).passthrough();

export const LessonSchema = z.object({
  assignmentId: z.string(),
  locked: z.boolean().optional().default(false),
  supportTeacherId: z.string().nullable().optional(),
}).passthrough();

export const SpecialStudentSchema = z.object({
  id: z.string(),
  firstName: z.string().optional().default(''),
  lastName: z.string(),
  classId: z.string().nullable().optional(),
  type: z.string().default('wsp'),
  supportTypes: z.array(z.string()).optional().default([]),
  supportHours: z.record(z.string(), z.number().optional()).optional(),
  note: z.string().optional(),
  supportTeacherIds: z.array(z.string()).optional().default([]),
}).passthrough();

export const SpecialAssignmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  teacherId: z.string().nullable().optional(),
  supportTeacherId: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  hoursPerWeek: z.number().default(1),
  withClass: z.boolean().default(true),
  subjectId: z.string(),
  supportType: z.string().optional(),
  preferredBlockSize: z.number().optional(),
}).passthrough();

export const MiejsceDyzuruSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  pietroId: z.string().optional(),
  opis: z.string().optional(),
}).passthrough();

export const PrzerwaSchema = z.object({
  num: z.number(),
  start: z.string(),
  end: z.string(),
  label: z.string().optional(),
}).passthrough();

export const DyzurEntrySchema = z.object({
  teacherAbbr: z.string(),
  locked: z.boolean().optional().default(false),
  note: z.string().optional(),
}).passthrough();

export const PlanDyzuryStateSchema = z.object({
  miejsca: z.array(MiejsceDyzuruSchema).optional().default([]),
  przerwy: z.array(PrzerwaSchema).optional().default([]),
  harmonogram: z.record(z.string(), DyzurEntrySchema).optional().default({}),
  settings: z.object({
    autoBalance: z.boolean().optional().default(true),
    maxPerTeacher: z.number().optional().default(2),
    excludeTeachers: z.array(z.string()).optional().default([]),
    maxMinutesPerTeacher: z.number().optional(),
    maxConsecutiveDuties: z.number().optional(),
    excludeAfterLastLesson: z.boolean().optional(),
    skipDutyIfNoClassesOnCorridor: z.boolean().optional(),
  }).passthrough().optional().default({
    autoBalance: true,
    maxPerTeacher: 2,
    excludeTeachers: [],
  }),
}).passthrough();

export const PlanLekcjiStateSchema = z.object({
  meta: z.object({
    schoolName: z.string().optional().default('Szkoła'),
    year: z.string().optional().default('2025/2026'),
    modifiedAt: z.string().optional(),
  }).passthrough().optional().default({ schoolName: 'Szkoła', year: '2025/2026' }),
  hours: z.array(HourSchema).optional().default([]),
  classes: z.array(ClassSchema).optional().default([]),
  teachers: z.array(TeacherSchema).optional().default([]),
  rooms: z.array(RoomSchema).optional().default([]),
  subjects: z.array(SubjectSchema).optional().default([]),
  schoolGroups: z.array(z.any()).optional().default([]),
  assignments: z.array(AssignmentSchema).optional().default([]),
  lessons: z.record(z.string(), LessonSchema).optional().default({}),
  specialStudents: z.array(SpecialStudentSchema).optional().default([]),
  specialAssignments: z.array(SpecialAssignmentSchema).optional().default([]),
  specialLessons: z.record(z.string(), z.any()).optional().default({}),
  specialAbsences: z.record(z.string(), z.any()).optional().default({}),
}).passthrough();

export const AppStateSchema = z.object({
  yearKey: z.string().optional().default('y_2025_2026'),
  yearLabel: z.string().optional().default('2025/2026'),
  hours: z.array(z.string()).optional().default([]),
  timeslots: z.array(HourSchema).optional().default([]),
  school: SchoolSchema.optional(),
  buildings: z.array(BuildingSchema).optional().default([]),
  floors: z.array(FloorSchema).optional().default([]),
  classes: z.array(ClassSchema).optional().default([]),
  teachers: z.array(TeacherSchema).optional().default([]),
  subjects: z.array(SubjectSchema).optional().default([]),
  homerooms: z.record(z.string(), z.any()).optional().default({}),
  planLekcji: PlanLekcjiStateSchema.optional(),
  dyzury: PlanDyzuryStateSchema.optional(),
  generatorSettings: z.record(z.string(), z.any()).optional(),
}).passthrough();

export const SchedCellSchema = z.object({
  teacherAbbr: z.string().optional(),
  supportTeacherAbbr: z.string().optional(),
  classes: z.array(z.string()).optional().default([]),
  className: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  note: z.string().optional(),
  locked: z.boolean().optional(),
  _bridgeMeta: z.record(z.string(), z.any()).optional(),
}).passthrough();

export const SchedDataSchema = z.record(
  z.string(), // yearKey
  z.record(
    z.string(), // dayIdx
    z.record(
      z.string(), // hourKey
      z.record(
        z.string(), // colKey
        z.union([SchedCellSchema, z.array(SchedCellSchema)])
      )
    )
  )
);

export const ArchiveEntrySchema = z.object({
  yearKey: z.string(),
  label: z.string(),
  savedAt: z.string(),
  config: AppStateSchema,
}).passthrough();

export const SnapshotEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  appState: AppStateSchema,
  schedData: z.record(z.string(), z.any()).optional().default({}),
  comment: z.string().optional(),
  stats: z.record(z.string(), z.any()).optional(),
}).passthrough();

export const AppEventLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actionType: z.string(),
  description: z.string(),
  details: z.string().optional(),
}).passthrough();

export const ImportPayloadSchema = z.object({
  version: z.string().optional(),
  timestamp: z.string().optional(),
  appState: AppStateSchema.optional(),
  schedData: z.record(z.string(), z.any()).optional(),
  archive: z.array(ArchiveEntrySchema).optional(),
  snapshots: z.array(SnapshotEntrySchema).optional(),
  historyLogs: z.array(AppEventLogSchema).optional(),
}).passthrough();

export interface ValidationResult {
  isValid: boolean;
  data?: ImportPayload;
  errors: string[];
  warnings: string[];
  summary: {
    classesCount: number;
    teachersCount: number;
    roomsCount: number;
    specialStudentsCount: number;
    hasSchedData: boolean;
  };
}

/**
 * Validates any raw incoming JSON or JS object against the strict SalePlan Pro schema.
 * Prevents Prototype Pollution and validates types, returning formatted Polish diagnostic messages.
 */
export function validateImportJson(rawInput: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let rawObj: any;

  // 1. Safe JSON Parse if passed as string
  if (typeof rawInput === 'string') {
    try {
      rawObj = JSON.parse(rawInput);
    } catch (parseErr: any) {
      return {
        isValid: false,
        errors: [`Błąd składni JSON: Plik nie zawiera poprawnego formatu JSON (${parseErr?.message || 'SyntaxError'}).`],
        warnings: [],
        summary: { classesCount: 0, teachersCount: 0, roomsCount: 0, specialStudentsCount: 0, hasSchedData: false }
      };
    }
  } else {
    rawObj = rawInput;
  }

  if (!rawObj || typeof rawObj !== 'object') {
    return {
      isValid: false,
      errors: ['Plik nie zawiera poprawnego obiektu danych (oczekiwano obiektu JSON).'],
      warnings: [],
      summary: { classesCount: 0, teachersCount: 0, roomsCount: 0, specialStudentsCount: 0, hasSchedData: false }
    };
  }

  // 2. Protect against Prototype Pollution
  const sanitized = sanitizeProtoPollution(rawObj);

  // 3. Unwrap wrapped payloads (e.g. data or state wrappers)
  let targetPayload = sanitized;
  if (sanitized.data && typeof sanitized.data === 'object') {
    targetPayload = sanitized.data;
  } else if (sanitized.state && typeof sanitized.state === 'object') {
    targetPayload = sanitized.state;
  }

  // If directly given an AppState (e.g. school, classes at root level), wrap it into ImportPayload
  if (!targetPayload.appState && (targetPayload.school || targetPayload.classes || targetPayload.teachers || targetPayload.planLekcji)) {
    targetPayload = {
      version: '3.0',
      timestamp: new Date().toISOString(),
      appState: targetPayload,
      schedData: {}
    };
  }

  // 4. Run Zod Schema Validation
  const parseResult = ImportPayloadSchema.safeParse(targetPayload);

  if (!parseResult.success) {
    parseResult.error.issues.forEach(issue => {
      const pathStr = issue.path.join('.');
      errors.push(`Niezgodność schematu w [${pathStr || 'główny obiekt'}]: ${issue.message}`);
    });
  }

  const validatedData = parseResult.success ? parseResult.data : targetPayload;

  // 5. Semantic checks & sanity warnings
  const app = validatedData.appState;
  const classes = app?.classes || app?.planLekcji?.classes || [];
  const teachers = app?.teachers || app?.planLekcji?.teachers || [];
  const rooms = app?.planLekcji?.rooms || [];
  const specialStudents = app?.planLekcji?.specialStudents || [];
  const hasSched = !!validatedData.schedData && Object.keys(validatedData.schedData).length > 0;

  if (classes.length === 0 && teachers.length === 0 && !hasSched) {
    warnings.push('Plik nie zawiera żadnych oddziałów ani nauczycieli – import może być pusty.');
  }

  return {
    isValid: errors.length === 0,
    data: validatedData as ImportPayload,
    errors,
    warnings,
    summary: {
      classesCount: classes.length,
      teachersCount: teachers.length,
      roomsCount: rooms.length,
      specialStudentsCount: specialStudents.length,
      hasSchedData: hasSched
    }
  };
}
