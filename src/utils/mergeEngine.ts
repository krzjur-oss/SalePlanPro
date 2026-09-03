import { 
  AppState, 
  SchedData, 
  SchedCell, 
  ArchiveEntry, 
  SnapshotEntry, 
  AppEventLog, 
  Teacher, 
  Subject, 
  Class, 
  ClassRoom, 
  Building, 
  Floor, 
  HomeroomState, 
  Assignment, 
  Lesson, 
  SpecialStudent, 
  SpecialAssignment, 
  SpecialLesson, 
  MiejsceDyzuru, 
  Przerwa, 
  DyzuryState,
  PlanDyzuryState,
  Hour
} from '../types';
import { sanitizeProtoPollution } from './validationSchemas';

export interface ImportPayload {
  version?: string;
  timestamp?: string;
  appState?: AppState;
  schedData?: SchedData;
  archive?: ArchiveEntry[];
  snapshots?: SnapshotEntry[];
  historyLogs?: AppEventLog[];
  [key: string]: any;
}

export type ClassScope = 'all' | 'grades_1_3' | 'grades_4_8' | 'custom';
export type MergeStrategy = 'merge' | 'replace';

export interface FileMergeConfig {
  fileId: string;
  fileName: string;
  payload: ImportPayload;
  
  // Basic info & Infrastructure
  importSchoolInfo: boolean;
  importBuildingsAndFloors: boolean;
  importRoomsList: boolean;
  teachersMode: 'none' | 'merge_new' | 'replace';
  subjectsMode: 'none' | 'merge_new' | 'replace';
  classesMode: 'none' | 'merge_new' | 'replace';
  homeroomsMode: 'none' | 'merge' | 'replace';

  // Plan Lekcji (Etap 1 - Klasy i Nauczyciele)
  planLekcjiScope: ClassScope;
  planLekcjiCustomClasses: string[]; // class IDs
  planLekcjiIncludeSpecial: boolean; // NI / Rewalidacja
  planLekcjiStrategy: MergeStrategy;

  // Plan Sal (Etap 2 - Obłożenie Sal / schedData)
  planSalScope: ClassScope | 'custom_rooms';
  planSalCustomClasses: string[]; // class names or IDs
  planSalCustomColKeys: string[]; // specific room col keys (e.g. f0_s0_101)
  planSalStrategy: MergeStrategy;

  // Plan Dyżurów
  dyzuryMode: 'none' | 'harmonogram_only' | 'all';
  dyzuryStrategy: MergeStrategy;

  // Extra storage
  importArchive: boolean;
  archiveStrategy: MergeStrategy;
  importSnapshots: boolean;
  snapshotsStrategy: MergeStrategy;
  importHistoryLogs: boolean;
}

/**
 * Sanitizes any object to ensure it conforms to a valid AppState schema,
 * preventing any undefined property access in the UI or subcomponents,
 * and strictly protecting against Prototype Pollution attacks.
 */
export function sanitizeAppState(rawInput: any): AppState {
  const raw = sanitizeProtoPollution(rawInput) || {};

  const rawSchool = raw.school || {};
  const school = {
    name: typeof rawSchool.name === 'string' ? rawSchool.name : 'Szkoła Podstawowa',
    short: typeof rawSchool.short === 'string' ? rawSchool.short : 'SP',
    phone: typeof rawSchool.phone === 'string' ? rawSchool.phone : '',
    web: typeof rawSchool.web === 'string' ? rawSchool.web : '',
  };

  const defaultHours: Hour[] = [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const timeslots: Hour[] = Array.isArray(raw.timeslots) && raw.timeslots.length > 0 
    ? raw.timeslots 
    : defaultHours;

  const hours: string[] = Array.isArray(raw.hours) && raw.hours.length > 0
    ? raw.hours.map(String)
    : timeslots.map(h => String(h.num));

  const classes: Class[] = Array.isArray(raw.classes)
    ? raw.classes.filter(Boolean).map((c: any, i: number) => ({
        id: String(c.id || `c_${i}`),
        name: String(c.name || `Klasa ${i + 1}`),
        color: String(c.color || '#2563eb'),
        year: typeof c.year === 'number' ? c.year : undefined,
        groupIds: Array.isArray(c.groupIds) ? c.groupIds : []
      }))
    : [];

  const teachers: Teacher[] = Array.isArray(raw.teachers)
    ? raw.teachers.filter(Boolean).map((t: any, i: number) => ({
        id: String(t.id || `t_${i}`),
        first: String(t.first || ''),
        last: String(t.last || `Nauczyciel ${i + 1}`),
        abbr: String(t.abbr || `N${i + 1}`).toUpperCase(),
        maxHours: typeof t.maxHours === 'number' ? t.maxHours : 18,
        color: String(t.color || '#3b82f6'),
        availability: Array.isArray(t.availability) ? t.availability : [],
        preferredRooms: Array.isArray(t.preferredRooms) ? t.preferredRooms : []
      }))
    : [];

  const subjects: Subject[] = Array.isArray(raw.subjects)
    ? raw.subjects.filter(Boolean).map((s: any, i: number) => ({
        id: String(s.id || `s_${i}`),
        name: String(s.name || `Przedmiot ${i + 1}`),
        short: String(s.short || s.name || `P${i + 1}`).toUpperCase(),
        color: String(s.color || '#2563eb')
      }))
    : [];

  const buildings: Building[] = Array.isArray(raw.buildings) ? raw.buildings : [];
  const floors: Floor[] = Array.isArray(raw.floors) ? raw.floors : [];
  const homerooms: HomeroomState = (raw.homerooms && typeof raw.homerooms === 'object') ? raw.homerooms : {};

  const rawPlan = raw.planLekcji && typeof raw.planLekcji === 'object' ? raw.planLekcji : {};
  const planLekcji = {
    meta: {
      schoolName: school.name,
      year: raw.yearLabel || '2025/2026'
    },
    hours: Array.isArray(rawPlan.hours) ? rawPlan.hours : timeslots,
    classes: Array.isArray(rawPlan.classes) ? rawPlan.classes : classes,
    teachers: Array.isArray(rawPlan.teachers) ? rawPlan.teachers : teachers,
    rooms: Array.isArray(rawPlan.rooms) ? rawPlan.rooms : [],
    subjects: Array.isArray(rawPlan.subjects) ? rawPlan.subjects : subjects,
    schoolGroups: Array.isArray(rawPlan.schoolGroups) ? rawPlan.schoolGroups : [],
    assignments: Array.isArray(rawPlan.assignments) ? rawPlan.assignments : [],
    lessons: (rawPlan.lessons && typeof rawPlan.lessons === 'object') ? rawPlan.lessons : {},
    specialStudents: Array.isArray(rawPlan.specialStudents) ? rawPlan.specialStudents : [],
    specialAssignments: Array.isArray(rawPlan.specialAssignments) ? rawPlan.specialAssignments : [],
    specialLessons: (rawPlan.specialLessons && typeof rawPlan.specialLessons === 'object') ? rawPlan.specialLessons : {},
    specialAbsences: (rawPlan.specialAbsences && typeof rawPlan.specialAbsences === 'object') ? rawPlan.specialAbsences : {}
  };

  const rawDyzury = raw.dyzury && typeof raw.dyzury === 'object' ? raw.dyzury : {};
  const dyzury: PlanDyzuryState = {
    miejsca: Array.isArray(rawDyzury.miejsca) ? rawDyzury.miejsca : [],
    przerwy: Array.isArray(rawDyzury.przerwy) ? rawDyzury.przerwy : [],
    harmonogram: (rawDyzury.harmonogram && typeof rawDyzury.harmonogram === 'object') ? rawDyzury.harmonogram : {},
    settings: {
      autoBalance: rawDyzury.settings?.autoBalance !== false,
      maxPerTeacher: typeof rawDyzury.settings?.maxPerTeacher === 'number' ? rawDyzury.settings.maxPerTeacher : 2,
      excludeTeachers: Array.isArray(rawDyzury.settings?.excludeTeachers) ? rawDyzury.settings.excludeTeachers : []
    }
  };

  const rawGen = raw.generatorSettings && typeof raw.generatorSettings === 'object' ? raw.generatorSettings : {};
  const generatorSettings = {
    maxGapsPerTeacher: typeof rawGen.maxGapsPerTeacher === 'number' ? rawGen.maxGapsPerTeacher : 2,
    obeyAvailability: rawGen.obeyAvailability !== false,
    avoidExtremes: rawGen.avoidExtremes !== false,
    avoidExtremesSubjectIds: Array.isArray(rawGen.avoidExtremesSubjectIds) ? rawGen.avoidExtremesSubjectIds : [],
    noStudentGaps: rawGen.noStudentGaps !== false,
    allowDoubleBlocks: rawGen.allowDoubleBlocks !== false,
    includeSpecialNI: rawGen.includeSpecialNI !== false,
    limitComputerLabs: rawGen.limitComputerLabs !== false,
    customComputerLabsCount: typeof rawGen.customComputerLabsCount === 'number' ? rawGen.customComputerLabsCount : 1,
    genPriorityHomerooms: rawGen.genPriorityHomerooms !== false,
    genPriorityTeachers: rawGen.genPriorityTeachers !== false,
    genExcludeWF: rawGen.genExcludeWF !== false,
    genAutoPlaceWF: rawGen.genAutoPlaceWF !== false,
    genClearExisting: rawGen.genClearExisting !== false,
  };

  return {
    yearKey: String(raw.yearKey || 'y_2025_2026'),
    yearLabel: String(raw.yearLabel || '2025/2026'),
    hours,
    timeslots,
    school,
    buildings,
    floors,
    classes,
    teachers,
    subjects,
    homerooms,
    planLekcji,
    dyzury,
    generatorSettings
  };
}

/**
 * Normalizes any loaded payload into a consistent ImportPayload object.
 * Handles standard backup files, raw AppState files, snapshots, or wrapped objects.
 * Strips any potential Prototype Pollution attempts.
 */
export function normalizeImportPayload(rawInput: any): ImportPayload {
  const raw = sanitizeProtoPollution(rawInput);
  if (!raw || typeof raw !== 'object') {
    return {
      version: '3.0',
      timestamp: new Date().toISOString(),
      appState: sanitizeAppState({}),
      schedData: {}
    };
  }

  // 1. Standard format or snapshot containing appState
  if (raw.appState && typeof raw.appState === 'object') {
    return {
      version: raw.version || '3.0',
      timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
      appState: sanitizeAppState(raw.appState),
      schedData: (raw.schedData && typeof raw.schedData === 'object') ? raw.schedData : {},
      archive: Array.isArray(raw.archive) ? raw.archive : [],
      snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
      historyLogs: Array.isArray(raw.historyLogs) ? raw.historyLogs : []
    };
  }

  // 2. Direct AppState object (e.g. user exported or saved state directly without wrapper)
  if (raw.school || raw.classes || raw.teachers || raw.planLekcji || raw.dyzury || raw.buildings || raw.floors) {
    return {
      version: raw.version || '3.0',
      timestamp: new Date().toISOString(),
      appState: sanitizeAppState(raw),
      schedData: (raw.schedData && typeof raw.schedData === 'object') ? raw.schedData : {},
      archive: Array.isArray(raw.archive) ? raw.archive : [],
      snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
      historyLogs: Array.isArray(raw.historyLogs) ? raw.historyLogs : []
    };
  }

  // 3. Wrapped under data or state
  if (raw.data && typeof raw.data === 'object') {
    return normalizeImportPayload(raw.data);
  }
  if (raw.state && typeof raw.state === 'object') {
    return normalizeImportPayload(raw.state);
  }

  // Fallback
  return {
    version: '3.0',
    timestamp: new Date().toISOString(),
    appState: sanitizeAppState(raw),
    schedData: (raw.schedData && typeof raw.schedData === 'object') ? raw.schedData : {},
    archive: [],
    snapshots: [],
    historyLogs: []
  };
}

export function isClassGrade1_3(className: string, year?: number | null): boolean {
  if (year !== null && year !== undefined && year >= 1 && year <= 3) return true;
  const clean = String(className || '').trim().toUpperCase();
  if (/^[1-3][A-Z0-9]?\b/.test(clean)) return true;
  if (/^(I|II|III)[A-Z0-9]?\b/.test(clean)) return true;
  if (/^0[A-Z0-9]?\b/.test(clean)) return true; // Zerówka / oddział przedszkolny
  return false;
}

export function isClassGrade4_8(className: string, year?: number | null): boolean {
  if (year !== null && year !== undefined && year >= 4 && year <= 8) return true;
  const clean = String(className || '').trim().toUpperCase();
  if (/^[4-8][A-Z0-9]?\b/.test(clean)) return true;
  if (/^(IV|V|VI|VII|VIII)[A-Z0-9]?\b/.test(clean)) return true;
  return false;
}

export function matchesClassScope(
  cls: { id: string; name: string; year?: number | null },
  scope: ClassScope,
  customClassIds?: string[]
): boolean {
  if (scope === 'all') return true;
  const cName = String(cls?.name || '');
  if (scope === 'grades_1_3') return isClassGrade1_3(cName, cls?.year);
  if (scope === 'grades_4_8') return isClassGrade4_8(cName, cls?.year);
  if (scope === 'custom') {
    return !!customClassIds && (customClassIds.includes(cls?.id) || customClassIds.includes(cName));
  }
  return true;
}

export function inspectFilePayload(rawPayload: ImportPayload, fileName: string = 'plik.json') {
  const payload = normalizeImportPayload(rawPayload);
  const app = payload.appState;
  const sched = payload.schedData;
  const schoolName = app?.school?.name || 'Niezdefiniowana szkoła';
  const schoolShort = app?.school?.short || '';
  const yearLabel = app?.yearLabel || '';
  const classes = app?.classes || app?.planLekcji?.classes || [];
  const teachers = app?.teachers || app?.planLekcji?.teachers || [];
  const rooms = app?.planLekcji?.rooms || [];

  let lessons1_3 = 0;
  let lessons4_8 = 0;
  let totalLessons = 0;

  if (app?.planLekcji?.lessons && typeof app.planLekcji.lessons === 'object') {
    const classMap = new Map(classes.map(c => [c.id, c]));
    Object.keys(app.planLekcji.lessons).forEach(key => {
      totalLessons++;
      const parts = key.split('|');
      const classId = parts[0];
      const cls = classMap.get(classId);
      if (cls) {
        if (isClassGrade1_3(cls.name, cls.year)) lessons1_3++;
        else if (isClassGrade4_8(cls.name, cls.year)) lessons4_8++;
      }
    });
  }

  let schedRoomsTotal = 0;
  let sched1_3 = 0;
  let sched4_8 = 0;

  if (sched && typeof sched === 'object') {
    Object.values(sched).forEach(year => {
      if (year && typeof year === 'object') {
        Object.values(year).forEach(day => {
          if (day && typeof day === 'object') {
            Object.values(day).forEach(hour => {
              if (hour && typeof hour === 'object') {
                Object.values(hour).forEach(cell => {
                  if (cell) {
                    const cellsArr = Array.isArray(cell) ? cell : [cell];
                    cellsArr.forEach(c => {
                      if (c) {
                        schedRoomsTotal++;
                        const cNames = Array.isArray(c.classes) ? c.classes : (c.className ? [c.className] : []);
                        const has1_3 = cNames.some(cn => isClassGrade1_3(String(cn || '')));
                        const has4_8 = cNames.some(cn => isClassGrade4_8(String(cn || '')));
                        if (has1_3) sched1_3++;
                        if (has4_8) sched4_8++;
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  let dutyEntries = 0;
  if (app?.dyzury?.harmonogram && typeof app.dyzury.harmonogram === 'object') {
    dutyEntries = Object.keys(app.dyzury.harmonogram).length;
  }

  // Detect auto suggestion role based on content-first, with filename as secondary hint
  const lowerName = String(fileName || '').toLowerCase();
  let detectedRole: 'full' | 'plan_klas' | 'sal_1_3' | 'sal_4_8' | 'dyzury' = 'full';
  
  if (dutyEntries > 0 && totalLessons === 0 && schedRoomsTotal === 0) {
    detectedRole = 'dyzury';
  } else if (totalLessons > 0 && schedRoomsTotal === 0) {
    detectedRole = 'plan_klas';
  } else if (sched1_3 > 0 && sched4_8 === 0 && totalLessons <= lessons1_3) {
    detectedRole = 'sal_1_3';
  } else if (sched4_8 > 0 && sched1_3 === 0 && totalLessons <= lessons4_8) {
    detectedRole = 'sal_4_8';
  } else if (lowerName.includes('dyzur') && dutyEntries > 0) {
    detectedRole = 'dyzury';
  } else if ((lowerName.includes('1-3') || lowerName.includes('wczesnoszkol')) && (lessons1_3 > 0 || sched1_3 > 0)) {
    detectedRole = 'sal_1_3';
  } else if ((lowerName.includes('4-8') || lowerName.includes('starsze')) && (lessons4_8 > 0 || sched4_8 > 0)) {
    detectedRole = 'sal_4_8';
  } else if ((lowerName.includes('klas') || lowerName.includes('siatka')) && totalLessons > 0) {
    detectedRole = 'plan_klas';
  }

  return {
    schoolName,
    schoolShort,
    yearLabel,
    classesCount: classes.length,
    teachersCount: teachers.length,
    roomsCount: rooms.length,
    totalLessons,
    lessons1_3,
    lessons4_8,
    schedRoomsTotal,
    sched1_3,
    sched4_8,
    dutyEntries,
    archiveCount: Array.isArray(payload.archive) ? payload.archive.length : 0,
    snapshotsCount: Array.isArray(payload.snapshots) ? payload.snapshots.length : 0,
    historyLogsCount: Array.isArray(payload.historyLogs) ? payload.historyLogs.length : 0,
    detectedRole
  };
}

export function createDefaultFileMergeConfig(
  fileId: string,
  fileName: string,
  rawPayload: ImportPayload,
  isFirstFile: boolean = false
): FileMergeConfig {
  const payload = normalizeImportPayload(rawPayload);
  const stats = inspectFilePayload(payload, fileName);
  
  // Defaults based on role
  let planLekcjiScope: ClassScope = 'all';
  let planSalScope: ClassScope | 'custom_rooms' = 'all';
  let dyzuryMode: 'none' | 'harmonogram_only' | 'all' = stats.dutyEntries > 0 ? 'all' : 'none';
  let importSchoolInfo = isFirstFile;
  let importBuildingsAndFloors = isFirstFile;
  let importRoomsList = isFirstFile;
  let teachersMode: 'none' | 'merge_new' | 'replace' = isFirstFile ? 'replace' : 'merge_new';
  let subjectsMode: 'none' | 'merge_new' | 'replace' = isFirstFile ? 'replace' : 'merge_new';
  let classesMode: 'none' | 'merge_new' | 'replace' = isFirstFile ? 'replace' : 'merge_new';
  let homeroomsMode: 'none' | 'merge' | 'replace' = isFirstFile ? 'replace' : 'merge';

  if (stats.detectedRole === 'sal_1_3') {
    planLekcjiScope = 'grades_1_3';
    planSalScope = 'grades_1_3';
    dyzuryMode = 'none';
    if (!isFirstFile) {
      importSchoolInfo = false;
      importBuildingsAndFloors = false;
      importRoomsList = false;
    }
  } else if (stats.detectedRole === 'sal_4_8') {
    planLekcjiScope = 'grades_4_8';
    planSalScope = 'grades_4_8';
    dyzuryMode = 'none';
    if (!isFirstFile) {
      importSchoolInfo = false;
      importBuildingsAndFloors = false;
      importRoomsList = false;
    }
  } else if (stats.detectedRole === 'dyzury') {
    planLekcjiScope = 'all';
    planSalScope = 'all';
    dyzuryMode = 'all';
    if (!isFirstFile) {
      importSchoolInfo = false;
      importBuildingsAndFloors = false;
      importRoomsList = false;
      teachersMode = 'merge_new';
    }
  } else if (stats.detectedRole === 'plan_klas') {
    planLekcjiScope = 'all';
    planSalScope = 'all';
    dyzuryMode = stats.dutyEntries > 0 ? 'all' : 'none';
  }

  return {
    fileId,
    fileName,
    payload,
    importSchoolInfo,
    importBuildingsAndFloors,
    importRoomsList,
    teachersMode,
    subjectsMode,
    classesMode,
    homeroomsMode,
    planLekcjiScope,
    planLekcjiCustomClasses: [],
    planLekcjiIncludeSpecial: true,
    planLekcjiStrategy: isFirstFile ? 'replace' : 'merge',
    planSalScope,
    planSalCustomClasses: [],
    planSalCustomColKeys: [],
    planSalStrategy: isFirstFile ? 'replace' : 'merge',
    dyzuryMode,
    dyzuryStrategy: isFirstFile ? 'replace' : 'merge',
    importArchive: isFirstFile,
    archiveStrategy: 'merge',
    importSnapshots: isFirstFile,
    snapshotsStrategy: 'merge',
    importHistoryLogs: false
  };
}

/**
 * Merges an incoming AppState and SchedData into a target AppState and SchedData according to configuration.
 */
export function applyFileMergeToState(
  currentState: AppState,
  currentSched: SchedData,
  config: FileMergeConfig
): { nextState: AppState; nextSched: SchedData; report: string[] } {
  const report: string[] = [];
  const safeCurrent = sanitizeAppState(currentState);
  const nextState: AppState = JSON.parse(JSON.stringify(safeCurrent));
  const nextSched: SchedData = JSON.parse(JSON.stringify(currentSched || {}));

  const normalizedPayload = normalizeImportPayload(config.payload);
  const incomingState = normalizedPayload.appState;
  const incomingSched = normalizedPayload.schedData;

  if (incomingState) {
    // 1. School Info
    if (config.importSchoolInfo && incomingState.school) {
      nextState.school = JSON.parse(JSON.stringify(incomingState.school));
      if (incomingState.yearLabel) nextState.yearLabel = incomingState.yearLabel;
      if (incomingState.yearKey) nextState.yearKey = incomingState.yearKey;
      if (Array.isArray(incomingState.timeslots) && incomingState.timeslots.length > 0) {
        nextState.timeslots = JSON.parse(JSON.stringify(incomingState.timeslots));
      }
      if (Array.isArray(incomingState.hours) && incomingState.hours.length > 0) {
        nextState.hours = JSON.parse(JSON.stringify(incomingState.hours));
      }
      if (Array.isArray(incomingState.planLekcji?.hours) && incomingState.planLekcji.hours.length > 0) {
        nextState.planLekcji.hours = JSON.parse(JSON.stringify(incomingState.planLekcji.hours));
      }
      report.push(`Dane szkoły i godziny lekcyjne`);
    }

    // 2. Buildings & Floors
    if (config.importBuildingsAndFloors && Array.isArray(incomingState.buildings) && Array.isArray(incomingState.floors)) {
      nextState.buildings = JSON.parse(JSON.stringify(incomingState.buildings));
      nextState.floors = JSON.parse(JSON.stringify(incomingState.floors));
      report.push(`Infrastruktura budynków i pięter`);
    }

    // 3. Rooms
    if (config.importRoomsList && Array.isArray(incomingState.planLekcji?.rooms)) {
      nextState.planLekcji.rooms = JSON.parse(JSON.stringify(incomingState.planLekcji.rooms));
      report.push(`Wykaz gabinetów (${incomingState.planLekcji.rooms.length} sal)`);
    }

    // 4. Teachers
    if (config.teachersMode !== 'none' && Array.isArray(incomingState.teachers)) {
      if (config.teachersMode === 'replace') {
        nextState.teachers = JSON.parse(JSON.stringify(incomingState.teachers));
        nextState.planLekcji.teachers = JSON.parse(JSON.stringify(incomingState.teachers));
        report.push(`Wszyscy nauczyciele (${incomingState.teachers.length} osób)`);
      } else if (config.teachersMode === 'merge_new') {
        let addedCount = 0;
        const currentTeachersMap = new Map<string, Teacher>();
        (nextState.teachers || []).forEach(t => {
          if (t?.id) currentTeachersMap.set(t.id, t);
          if (t?.abbr) currentTeachersMap.set(String(t.abbr).toUpperCase().trim(), t);
        });

        incomingState.teachers.forEach(incT => {
          if (!incT) return;
          const keyId = incT.id;
          const keyAbbr = String(incT.abbr || '').toUpperCase().trim();
          const existing = (keyId && currentTeachersMap.get(keyId)) || (keyAbbr ? currentTeachersMap.get(keyAbbr) : undefined);
          if (!existing) {
            nextState.teachers.push(JSON.parse(JSON.stringify(incT)));
            addedCount++;
          } else {
            // Update attributes if missing
            if (incT.availability && (!existing.availability || existing.availability.length === 0)) {
              existing.availability = JSON.parse(JSON.stringify(incT.availability));
            }
            if (incT.color && !existing.color) existing.color = incT.color;
            if (incT.preferredRooms && (!existing.preferredRooms || existing.preferredRooms.length === 0)) {
              existing.preferredRooms = JSON.parse(JSON.stringify(incT.preferredRooms));
            }
          }
        });
        nextState.planLekcji.teachers = JSON.parse(JSON.stringify(nextState.teachers));
        if (addedCount > 0) report.push(`Nauczyciele (+${addedCount} nowych)`);
      }
    }

    // 5. Subjects
    if (config.subjectsMode !== 'none' && Array.isArray(incomingState.subjects)) {
      if (config.subjectsMode === 'replace') {
        nextState.subjects = JSON.parse(JSON.stringify(incomingState.subjects));
        nextState.planLekcji.subjects = JSON.parse(JSON.stringify(incomingState.subjects));
        report.push(`Przedmioty (${incomingState.subjects.length})`);
      } else if (config.subjectsMode === 'merge_new') {
        let addedSubCount = 0;
        const currentSubjectsMap = new Map<string, Subject>();
        (nextState.subjects || []).forEach(s => {
          if (s?.id) currentSubjectsMap.set(s.id, s);
          if (s?.name) currentSubjectsMap.set(String(s.name).toUpperCase().trim(), s);
          if (s?.short) currentSubjectsMap.set(String(s.short).toUpperCase().trim(), s);
        });

        incomingState.subjects.forEach(incS => {
          if (!incS) return;
          const sName = String(incS.name || '').toUpperCase().trim();
          const sShort = String(incS.short || '').toUpperCase().trim();
          const existing = (incS.id && currentSubjectsMap.get(incS.id)) || 
            (sName ? currentSubjectsMap.get(sName) : undefined) || 
            (sShort ? currentSubjectsMap.get(sShort) : undefined);
          if (!existing) {
            nextState.subjects.push(JSON.parse(JSON.stringify(incS)));
            addedSubCount++;
          }
        });
        nextState.planLekcji.subjects = JSON.parse(JSON.stringify(nextState.subjects));
        if (addedSubCount > 0) report.push(`Przedmioty (+${addedSubCount} nowych)`);
      }
    }

    // 6. Classes
    if (config.classesMode !== 'none' && Array.isArray(incomingState.classes)) {
      if (config.classesMode === 'replace') {
        nextState.classes = JSON.parse(JSON.stringify(incomingState.classes));
        nextState.planLekcji.classes = JSON.parse(JSON.stringify(incomingState.classes));
        report.push(`Klasy i oddziały (${incomingState.classes.length})`);
      } else if (config.classesMode === 'merge_new') {
        let addedClsCount = 0;
        const currentClassesMap = new Map<string, Class>();
        (nextState.classes || []).forEach(c => {
          if (c?.id) currentClassesMap.set(c.id, c);
          if (c?.name) currentClassesMap.set(String(c.name).toUpperCase().trim(), c);
        });

        incomingState.classes.forEach(incC => {
          if (!incC) return;
          const cName = String(incC.name || '').toUpperCase().trim();
          const existing = (incC.id && currentClassesMap.get(incC.id)) || (cName ? currentClassesMap.get(cName) : undefined);
          if (!existing) {
            nextState.classes.push(JSON.parse(JSON.stringify(incC)));
            addedClsCount++;
          }
        });
        nextState.planLekcji.classes = JSON.parse(JSON.stringify(nextState.classes));
        if (addedClsCount > 0) report.push(`Oddziały (+${addedClsCount} nowych)`);
      }
    }

    // 7. Homerooms
    if (config.homeroomsMode !== 'none' && incomingState.homerooms && typeof incomingState.homerooms === 'object') {
      if (config.homeroomsMode === 'replace') {
        nextState.homerooms = JSON.parse(JSON.stringify(incomingState.homerooms));
        report.push(`Wszystkie sale wychowawcze (Homerooms)`);
      } else {
        nextState.homerooms = {
          ...(nextState.homerooms || {}),
          ...JSON.parse(JSON.stringify(incomingState.homerooms))
        };
        report.push(`Sale wychowawcze (zaktualizowano)`);
      }
    }

    // 8. Plan Lekcji (Etap 1 - Klasy i Nauczyciele)
    if (incomingState.planLekcji?.lessons && typeof incomingState.planLekcji.lessons === 'object') {
      const incomingClasses = Array.isArray(incomingState.planLekcji.classes) 
        ? incomingState.planLekcji.classes 
        : (Array.isArray(incomingState.classes) ? incomingState.classes : []);
      const matchingIncomingClasses = incomingClasses.filter(c => 
        matchesClassScope(c, config.planLekcjiScope, config.planLekcjiCustomClasses)
      );
      const matchingClassIds = new Set(matchingIncomingClasses.map(c => c?.id).filter(Boolean));

      if (matchingClassIds.size > 0 || config.planLekcjiScope === 'all') {
        let mergedLessonsCount = 0;
        
        // Match assignments
        const incomingAssignments = Array.isArray(incomingState.planLekcji.assignments) ? incomingState.planLekcji.assignments : [];
        const filteredAssignments = incomingAssignments.filter(a => a && matchingClassIds.has(a.classId));

        if (!nextState.planLekcji) {
          nextState.planLekcji = safeCurrent.planLekcji;
        }

        if (config.planLekcjiStrategy === 'replace' && config.planLekcjiScope === 'all') {
          nextState.planLekcji.assignments = JSON.parse(JSON.stringify(incomingAssignments));
          nextState.planLekcji.lessons = JSON.parse(JSON.stringify(incomingState.planLekcji.lessons));
          mergedLessonsCount = Object.keys(nextState.planLekcji.lessons).length;
        } else {
          // Merge or replace for selected classes
          nextState.planLekcji.assignments = (nextState.planLekcji.assignments || []).filter(
            a => a && !matchingClassIds.has(a.classId)
          );
          nextState.planLekcji.assignments.push(...JSON.parse(JSON.stringify(filteredAssignments)));

          const nextLessons: Record<string, Lesson> = {};
          Object.entries(nextState.planLekcji.lessons || {}).forEach(([k, lesson]) => {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
            const classId = k.split('|')[0];
            if (!matchingClassIds.has(classId)) {
              nextLessons[k] = lesson;
            }
          });

          // Add incoming lessons for matching classes
          Object.entries(incomingState.planLekcji.lessons).forEach(([k, lesson]) => {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
            const classId = k.split('|')[0];
            if (matchingClassIds.has(classId) || config.planLekcjiScope === 'all') {
              nextLessons[k] = JSON.parse(JSON.stringify(lesson));
              mergedLessonsCount++;
            }
          });

          nextState.planLekcji.lessons = nextLessons;
        }

        // Special education (NI / Rewalidacja)
        if (config.planLekcjiIncludeSpecial && Array.isArray(incomingState.planLekcji.specialStudents)) {
          nextState.planLekcji.specialStudents = JSON.parse(JSON.stringify(incomingState.planLekcji.specialStudents));
          nextState.planLekcji.specialAssignments = JSON.parse(JSON.stringify(incomingState.planLekcji.specialAssignments || []));
          nextState.planLekcji.specialLessons = JSON.parse(JSON.stringify(incomingState.planLekcji.specialLessons || {}));
          nextState.planLekcji.specialAbsences = JSON.parse(JSON.stringify(incomingState.planLekcji.specialAbsences || {}));
        }

        const scopeLabel = 
          config.planLekcjiScope === 'grades_1_3' ? 'klasy 1-3' :
          config.planLekcjiScope === 'grades_4_8' ? 'klasy 4-8' :
          config.planLekcjiScope === 'custom' ? `wybrane klasy (${matchingIncomingClasses.length})` :
          'wszystkie klasy';

        report.push(`Plan lekcji: ${scopeLabel} (${mergedLessonsCount} lekcji)`);
      }
    }

    // 9. Plan Dyżurów (Dyżury nauczycielskie)
    if (config.dyzuryMode !== 'none' && incomingState.dyzury && typeof incomingState.dyzury === 'object') {
      if (!nextState.dyzury) {
        nextState.dyzury = { miejsca: [], przerwy: [], harmonogram: {}, settings: { autoBalance: true, maxPerTeacher: 2, excludeTeachers: [] } };
      }

      if (config.dyzuryMode === 'all') {
        if (config.dyzuryStrategy === 'replace') {
          nextState.dyzury = JSON.parse(JSON.stringify(incomingState.dyzury));
          report.push(`Plan dyżurów (całość: miejsca, przerwy i harmonogram)`);
        } else {
          // Merge places and breaks if not existing
          const existingMiejscaIds = new Set((nextState.dyzury.miejsca || []).map(m => m?.id).filter(Boolean));
          const newMiejsca = (incomingState.dyzury.miejsca || []).filter(m => m && !existingMiejscaIds.has(m.id));
          nextState.dyzury.miejsca = [...(nextState.dyzury.miejsca || []), ...JSON.parse(JSON.stringify(newMiejsca))];

          const existingPrzerwyNums = new Set((nextState.dyzury.przerwy || []).map(p => p?.num).filter(n => n !== undefined));
          const newPrzerwy = (incomingState.dyzury.przerwy || []).filter(p => p && !existingPrzerwyNums.has(p.num));
          nextState.dyzury.przerwy = [...(nextState.dyzury.przerwy || []), ...JSON.parse(JSON.stringify(newPrzerwy))];

          // Merge harmonogram
          nextState.dyzury.harmonogram = {
            ...(nextState.dyzury.harmonogram || {}),
            ...JSON.parse(JSON.stringify(incomingState.dyzury.harmonogram || {}))
          };
          report.push(`Plan dyżurów (scalono z obecnymi)`);
        }
      } else if (config.dyzuryMode === 'harmonogram_only') {
        if (config.dyzuryStrategy === 'replace') {
          nextState.dyzury.harmonogram = JSON.parse(JSON.stringify(incomingState.dyzury.harmonogram || {}));
          report.push(`Harmonogram dyżurów (zastąpiono)`);
        } else {
          nextState.dyzury.harmonogram = {
            ...(nextState.dyzury.harmonogram || {}),
            ...JSON.parse(JSON.stringify(incomingState.dyzury.harmonogram || {}))
          };
          report.push(`Harmonogram dyżurów (dołączono)`);
        }
      }
    }
  }

  // 10. Plan Sal (Etap 2 - Obłożenie Gabinetów / schedData)
  if (incomingSched && typeof incomingSched === 'object' && Object.keys(incomingSched).length > 0) {
    if (config.planSalStrategy === 'replace' && config.planSalScope === 'all') {
      Object.keys(nextSched).forEach(k => delete nextSched[k]);
      Object.assign(nextSched, JSON.parse(JSON.stringify(incomingSched)));
      report.push(`Plan sal (zastąpiono cały rozkład sal)`);
    } else {
      let transferredRoomCells = 0;
      const targetScope = config.planSalScope;
      const customClassNames = new Set((config.planSalCustomClasses || []).map(s => String(s || '').toUpperCase().trim()));
      const customColKeys = new Set(config.planSalCustomColKeys || []);

      // Function to check if a cell matches the targeted Plan Sal filter
      const cellMatchesFilter = (cell: SchedCell): boolean => {
        if (!cell) return false;
        if (targetScope === 'all') return true;
        
        const cellClasses = Array.isArray(cell.classes) ? cell.classes : (cell.className ? [cell.className] : []);
        if (targetScope === 'grades_1_3') {
          return cellClasses.some(cName => isClassGrade1_3(String(cName || '')));
        }
        if (targetScope === 'grades_4_8') {
          return cellClasses.some(cName => isClassGrade4_8(String(cName || '')));
        }
        if (targetScope === 'custom') {
          return cellClasses.some(cName => customClassNames.has(String(cName || '').toUpperCase().trim()));
        }
        return true;
      };

      // Traverse incoming SchedData and apply cells safely
      Object.entries(incomingSched).forEach(([yearKey, yearObj]) => {
        if (yearKey === '__proto__' || yearKey === 'constructor' || yearKey === 'prototype') return;
        if (!yearObj || typeof yearObj !== 'object') return;
        if (!nextSched[yearKey]) nextSched[yearKey] = {};
        
        Object.entries(yearObj).forEach(([dayKey, dayObj]) => {
          if (dayKey === '__proto__' || dayKey === 'constructor' || dayKey === 'prototype') return;
          if (!dayObj || typeof dayObj !== 'object') return;
          const dayIdx = Number(dayKey);
          if (!nextSched[yearKey][dayIdx]) nextSched[yearKey][dayIdx] = {};

          Object.entries(dayObj).forEach(([hourKey, hourObj]) => {
            if (hourKey === '__proto__' || hourKey === 'constructor' || hourKey === 'prototype') return;
            if (!hourObj || typeof hourObj !== 'object') return;
            if (!nextSched[yearKey][dayIdx][hourKey]) nextSched[yearKey][dayIdx][hourKey] = {};
            const destHourObj = nextSched[yearKey][dayIdx][hourKey];

            // If merging specific scope, first remove existing cells matching this scope from destHourObj
            if (targetScope === 'grades_1_3' || targetScope === 'grades_4_8' || targetScope === 'custom') {
              Object.keys(destHourObj).forEach(colKey => {
                if (colKey === '__proto__' || colKey === 'constructor' || colKey === 'prototype') return;
                const curCell = destHourObj[colKey];
                if (!curCell) return;

                if (Array.isArray(curCell)) {
                  const filtered = curCell.filter(c => !cellMatchesFilter(c));
                  if (filtered.length === 0) delete destHourObj[colKey];
                  else destHourObj[colKey] = filtered.length === 1 ? filtered[0] : filtered;
                } else if (cellMatchesFilter(curCell)) {
                  delete destHourObj[colKey];
                }
              });
            }

            // Now insert matching cells from incoming
            Object.entries(hourObj).forEach(([colKey, incomingCell]) => {
              if (colKey === '__proto__' || colKey === 'constructor' || colKey === 'prototype') return;
              if (targetScope === 'custom_rooms' && !customColKeys.has(colKey)) return;
              if (!incomingCell) return;

              const incomingCellsArr = Array.isArray(incomingCell) ? incomingCell : [incomingCell];
              const matchingIncomingCells = incomingCellsArr.filter(c => cellMatchesFilter(c));

              if (matchingIncomingCells.length > 0) {
                transferredRoomCells += matchingIncomingCells.length;
                const existingInDest = destHourObj[colKey];

                if (!existingInDest) {
                  destHourObj[colKey] = matchingIncomingCells.length === 1 
                    ? JSON.parse(JSON.stringify(matchingIncomingCells[0])) 
                    : JSON.parse(JSON.stringify(matchingIncomingCells));
                } else {
                  // Merge array of cells (e.g. gym with multiple classes or support teachers)
                  const existingArr = Array.isArray(existingInDest) ? existingInDest : [existingInDest];
                  destHourObj[colKey] = [
                    ...existingArr, 
                    ...JSON.parse(JSON.stringify(matchingIncomingCells))
                  ];
                }
              }
            });
          });
        });
      });

      const salScopeLabel = 
        targetScope === 'grades_1_3' ? 'klasy 1-3' :
        targetScope === 'grades_4_8' ? 'klasy 4-8' :
        targetScope === 'custom' ? 'wybrane oddziały' :
        targetScope === 'custom_rooms' ? 'wybrane gabinety' :
        'wszystkie sale';

      report.push(`Plan sal: ${salScopeLabel} (${transferredRoomCells} przydziałów)`);
    }
  }

  return { 
    nextState: sanitizeAppState(nextState), 
    nextSched, 
    report 
  };
}

/**
 * Sequentially merges multiple files into the current state.
 */
export async function executeMultiFileMerge(
  currentState: AppState,
  currentSched: SchedData,
  currentArchive: ArchiveEntry[],
  currentSnapshots: SnapshotEntry[],
  currentLogs: AppEventLog[],
  fileConfigs: FileMergeConfig[]
): Promise<{
  mergedState: AppState;
  mergedSched: SchedData;
  mergedArchive: ArchiveEntry[];
  mergedSnapshots: SnapshotEntry[];
  mergedLogs: AppEventLog[];
  overallReport: string[];
}> {
  let mergedState: AppState = sanitizeAppState(JSON.parse(JSON.stringify(currentState)));
  let mergedSched: SchedData = JSON.parse(JSON.stringify(currentSched || {}));
  let mergedArchive: ArchiveEntry[] = Array.isArray(currentArchive) ? JSON.parse(JSON.stringify(currentArchive)) : [];
  let mergedSnapshots: SnapshotEntry[] = Array.isArray(currentSnapshots) ? JSON.parse(JSON.stringify(currentSnapshots)) : [];
  let mergedLogs: AppEventLog[] = Array.isArray(currentLogs) ? JSON.parse(JSON.stringify(currentLogs)) : [];
  const overallReport: string[] = [];

  for (const config of fileConfigs) {
    const { nextState, nextSched, report } = applyFileMergeToState(mergedState, mergedSched, config);
    mergedState = nextState;
    mergedSched = nextSched;

    // Archive handling
    if (config.importArchive && Array.isArray(config.payload.archive)) {
      if (config.archiveStrategy === 'replace') {
        mergedArchive = JSON.parse(JSON.stringify(config.payload.archive));
      } else {
        const existingArchKeys = new Set(mergedArchive.map(a => `${a?.yearKey}_${a?.savedAt}`));
        const newArch = config.payload.archive.filter(a => a && !existingArchKeys.has(`${a?.yearKey}_${a?.savedAt}`));
        mergedArchive.push(...JSON.parse(JSON.stringify(newArch)));
      }
      report.push(`Archiwum wersji`);
    }

    // Snapshots handling
    if (config.importSnapshots && Array.isArray(config.payload.snapshots)) {
      if (config.snapshotsStrategy === 'replace') {
        mergedSnapshots = JSON.parse(JSON.stringify(config.payload.snapshots));
      } else {
        const existingSnapIds = new Set(mergedSnapshots.map(s => s?.id).filter(Boolean));
        const newSnaps = config.payload.snapshots.filter(s => s && !existingSnapIds.has(s.id));
        mergedSnapshots.push(...JSON.parse(JSON.stringify(newSnaps)));
      }
      report.push(`Punkty przywracania`);
    }

    // Audit logs handling
    if (config.importHistoryLogs && Array.isArray(config.payload.historyLogs)) {
      const existingLogIds = new Set(mergedLogs.map(l => l?.id).filter(Boolean));
      const newLogs = config.payload.historyLogs.filter(l => l && !existingLogIds.has(l.id));
      mergedLogs.push(...JSON.parse(JSON.stringify(newLogs)));
      report.push(`Historia zdarzeń`);
    }

    if (report.length > 0) {
      overallReport.push(`[${config.fileName}]: ${report.join(', ')}`);
    }
  }

  return {
    mergedState: sanitizeAppState(mergedState),
    mergedSched,
    mergedArchive,
    mergedSnapshots,
    mergedLogs,
    overallReport
  };
}
