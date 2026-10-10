/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Schematy Walidacji Danych Zod (Validation Schemas)
 * Opis: Rygorystyczna kontrola poprawności struktur bazy danych, importu, eksportu i synchronizacji wielu kart.
 */
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

  const cleanObj: Record<string, unknown> = Object.create(null);

  for (const key of Object.keys(obj)) {
    // Strictly block and drop prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const val = (obj as Record<string, unknown>)[key];
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
  num: z.union([z.number(), z.string()]).transform(Number),
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
  overtimeHours: z.number().optional(),
  availability: z.array(z.string()).optional().default([]),
  inactive: z.boolean().optional().default(false),
  inactiveComment: z.string().optional(),
  substitutions: z.array(z.string()).optional().default([]),
  preferredRooms: z.array(z.string()).optional().default([]),
  isAdministrative: z.boolean().optional(),
  administrativeRole: z.string().optional(),
  nonTeachingHours: z.number().optional(),
  nonTeachingRoles: z.array(z.string()).optional().default([]),
  nonTeachingDutyEligible: z.boolean().optional().default(true),
}).passthrough();

export const SupportStaffSchema = z.object({
  id: z.string(),
  first: z.string().optional().default(''),
  last: z.string(),
  abbr: z.string(),
  role: z.string().optional().default('Pracownik obsługi'),
  color: z.string().optional().default('#64748b'),
  weeklyHours: z.number().optional().default(40),
  availability: z.array(z.string()).optional().default([]),
  dutyEligible: z.boolean().optional().default(true),
  notes: z.string().optional(),
  inactive: z.boolean().optional().default(false),
  inactiveComment: z.string().optional(),
}).passthrough();


export const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  color: z.string().optional().default('#2563eb'),
  defaultGroupPattern: z.string().optional(),
}).passthrough();

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string().optional(),
  type: z.string().optional(),
  capacity: z.number().optional().default(30),
  color: z.string().optional(),
  isLab: z.boolean().optional(),
  isGrade1_3: z.boolean().optional(),
  singleClassLimit: z.boolean().optional(),
}).passthrough();

export const SegmentRoomSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const obj = { ...(val as Record<string, unknown>) };
      if (obj.num === undefined && obj.name !== undefined) {
        obj.num = obj.name;
      }
      if (obj.id === undefined && obj.num !== undefined) {
        obj.id = `room_${obj.num}`;
      }
      return obj;
    }
    return val;
  },
  z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    num: z.union([z.string(), z.number()]).transform(String),
    sub: z.string().optional(),
  }).passthrough()
);

export const SegmentSchema = z.object({
  id: z.string().optional().default(() => Math.random().toString(36).substring(2, 9)),
  name: z.string().optional().default(''),
  rooms: z.array(SegmentRoomSchema).optional().default([]),
}).passthrough();

export const FloorSchema = z.object({
  id: z.string().optional().default(() => Math.random().toString(36).substring(2, 9)),
  name: z.string().optional().default(''),
  color: z.string().optional().default('#3b82f6'),
  buildingIdx: z.union([z.number(), z.string()]).transform(v => typeof v === 'number' ? v : (parseInt(v, 10) || 0)).optional().default(0),
  segments: z.array(SegmentSchema).optional().default([]),
}).passthrough();

export const BuildingSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  address: z.string().optional(),
  color: z.string().optional(),
  multi: z.boolean().optional(),
  singleClassLimit: z.boolean().optional(),
  hasCustomStructure: z.boolean().optional(),
  customFloors: z.array(z.string()).optional(),
  customSegments: z.array(z.string()).optional(),
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
  homeTeachingInSchool: z.boolean().optional(),
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
  isGroup: z.boolean().optional(),
  groupName: z.string().optional(),
  linkedStudentIds: z.array(z.string()).optional().default([]),
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
  schoolGroups: z.array(z.unknown()).optional().default([]),
  assignments: z.array(AssignmentSchema).optional().default([]),
  lessons: z.record(z.string(), LessonSchema).optional().default({}),
  specialStudents: z.array(SpecialStudentSchema).optional().default([]),
  specialAssignments: z.array(SpecialAssignmentSchema).optional().default([]),
  specialLessons: z.record(z.string(), z.unknown()).optional().default({}),
  specialAbsences: z.record(z.string(), z.unknown()).optional().default({}),
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
  supportStaff: z.array(SupportStaffSchema).optional().default([]),
  subjects: z.array(SubjectSchema).optional().default([]),
  homerooms: z.record(z.string(), z.unknown()).optional().default({}),
  planLekcji: PlanLekcjiStateSchema.optional(),
  dyzury: PlanDyzuryStateSchema.optional(),
  generatorSettings: z.record(z.string(), z.unknown()).optional(),
  revision: z.number().optional(),
  tabId: z.string().optional(),
  _revision: z.number().optional(),
  _tabId: z.string().optional(),
}).passthrough();

export const SchedCellSchema = z.object({
  teacherAbbr: z.string().optional(),
  supportTeacherAbbr: z.string().optional(),
  classes: z.array(z.string()).optional().default([]),
  className: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  note: z.string().optional(),
  locked: z.boolean().optional(),
  _bridgeMeta: z.record(z.string(), z.unknown()).optional(),
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
  schedData: z.record(z.string(), z.unknown()).optional().default({}),
  comment: z.string().optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
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
  schedData: z.record(z.string(), z.unknown()).optional(),
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
  
  let rawObj: unknown;

  // 1. Bezpieczne parsowanie JSON w przypadku przekazania tekstu
  if (typeof rawInput === 'string') {
    try {
      rawObj = JSON.parse(rawInput);
    } catch (parseErr: unknown) {
      const errMsg = parseErr instanceof Error ? parseErr.message : 'SyntaxError';
      return {
        isValid: false,
        errors: [`Błąd składni JSON: Plik nie zawiera poprawnego formatu JSON (${errMsg}).`],
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
  const sanitized = sanitizeProtoPollution(rawObj) as Record<string, unknown>;

  // 3. Unwrap wrapped payloads (e.g. data or state wrappers)
  let targetPayload: Record<string, unknown> = sanitized;
  if (sanitized.data && typeof sanitized.data === 'object') {
    targetPayload = sanitized.data as Record<string, unknown>;
  } else if (sanitized.state && typeof sanitized.state === 'object') {
    targetPayload = sanitized.state as Record<string, unknown>;
  }

  // Jeśli przekazano bezpośrednio AppState, opakuj w strukturę ImportPayload
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

  const validatedData = (parseResult.success ? parseResult.data : targetPayload) as Record<string, unknown>;

  // 5. Semantic checks & sanity warnings
  const app = validatedData.appState as Record<string, unknown> | undefined;
  const classes = (app?.classes || (app?.planLekcji as Record<string, unknown> | undefined)?.classes || []) as unknown[];
  const teachers = (app?.teachers || (app?.planLekcji as Record<string, unknown> | undefined)?.teachers || []) as unknown[];
  const rooms = ((app?.planLekcji as Record<string, unknown> | undefined)?.rooms || []) as unknown[];
  const specialStudents = ((app?.planLekcji as Record<string, unknown> | undefined)?.specialStudents || []) as unknown[];
  const schedDataRec = validatedData.schedData as Record<string, unknown> | undefined;
  const hasSched = !!schedDataRec && Object.keys(schedDataRec).length > 0;

  if (classes.length === 0 && teachers.length === 0 && !hasSched) {
    warnings.push('Plik nie zawiera żadnych oddziałów ani nauczycieli – import może być pusty.');
  }

  return {
    isValid: errors.length === 0,
    data: validatedData as unknown as ImportPayload,
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

export const AutosaveVersionSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  appState: AppStateSchema,
  schedData: z.record(z.string(), z.unknown()),
}).passthrough();

export const PlanVariantDataSchema = z.object({
  lessons: z.record(z.string(), LessonSchema),
  schedData: z.record(z.string(), z.unknown()),
  assignments: z.array(AssignmentSchema).optional(),
  specialLessons: z.record(z.string(), z.unknown()).optional(),
  specialAbsences: z.record(z.string(), z.unknown()).optional(),
  spePlan: z.unknown().optional(),
  dyzury: z.unknown().optional(),
}).passthrough();

export const PlanVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string(),
  description: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  isActiveNow: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  color: z.string(),
  isDefault: z.boolean().optional(),
  data: PlanVariantDataSchema,
  stats: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const DualScreenMessageTypeSchema = z.enum([
  'HANDSHAKE',
  'HANDSHAKE_ACK',
  'STATE_SYNC',
  'TAB_CHANGE',
  'PLAN_KLAS_HIGHLIGHT',
  'ASSIGN_ROOM_CLICK',
  'COMPANION_CLOSED',
  'CREATE_VARIANT',
  'SWITCH_VARIANT',
  'UPDATE_LESSONS',
  'UPDATE_ASSIGNMENTS',
  'UPDATE_SCHED_DATA',
  'UPDATE_DUTIES',
  'SELECT_LESSON_POOL',
  'CLEAR_ROOM_SCHEDULE',
  'PING',
  'PONG'
]);

export const DualScreenMessageSchema = z.object({
  type: DualScreenMessageTypeSchema,
  payload: z.unknown().optional(),
  timestamp: z.number(),
  version: z.number().optional(),
}).passthrough();

export const StateMetaSchema = z.object({
  revision: z.number(),
  tabId: z.string(),
  updatedAt: z.string().optional(),
  tabLabel: z.string().optional(),
  activeSection: z.string().optional(),
  activeSectionName: z.string().optional(),
  changeSummary: z.array(z.string()).optional(),
}).passthrough();

export type StateMeta = z.infer<typeof StateMetaSchema>;

export function getStorageSchemaForKey(key: string): z.ZodTypeAny | null {
  switch (key) {
    case 'saleplan_v3_app_state':
      return AppStateSchema;
    case 'saleplan_v3_sched_data':
      return SchedDataSchema;
    case 'saleplan_v3_state_meta':
      return StateMetaSchema;
    case 'saleplan_v3_archive':
      return z.array(ArchiveEntrySchema);
    case 'saleplan_v3_snapshots':
      return z.array(SnapshotEntrySchema);
    case 'saleplan_v3_history_logs':
      return z.array(AppEventLogSchema);
    case 'saleplan_v3_autosave_versions':
      return z.array(AutosaveVersionSchema);
    case 'saleplan_v3_plan_variants':
      return z.array(PlanVariantSchema);
    default:
      return null;
  }
}

