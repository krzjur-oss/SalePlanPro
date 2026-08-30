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
  DyzuryState
} from '../types';

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

export function isClassGrade1_3(className: string, year?: number | null): boolean {
  if (year !== null && year !== undefined && year >= 1 && year <= 3) return true;
  const clean = (className || '').trim().toUpperCase();
  if (/^[1-3][A-Z0-9]?\b/.test(clean)) return true;
  if (/^(I|II|III)[A-Z0-9]?\b/.test(clean)) return true;
  if (/^0[A-Z0-9]?\b/.test(clean)) return true; // Zerówka / oddział przedszkolny
  return false;
}

export function isClassGrade4_8(className: string, year?: number | null): boolean {
  if (year !== null && year !== undefined && year >= 4 && year <= 8) return true;
  const clean = (className || '').trim().toUpperCase();
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
  if (scope === 'grades_1_3') return isClassGrade1_3(cls.name, cls.year);
  if (scope === 'grades_4_8') return isClassGrade4_8(cls.name, cls.year);
  if (scope === 'custom') {
    return !!customClassIds && (customClassIds.includes(cls.id) || customClassIds.includes(cls.name));
  }
  return true;
}

export function inspectFilePayload(payload: ImportPayload, fileName: string = 'plik.json') {
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

  if (app?.planLekcji?.lessons) {
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

  if (sched) {
    Object.values(sched).forEach(year => {
      Object.values(year || {}).forEach(day => {
        Object.values(day || {}).forEach(hour => {
          Object.values(hour || {}).forEach(cell => {
            if (cell) {
              const cellsArr = Array.isArray(cell) ? cell : [cell];
              cellsArr.forEach(c => {
                schedRoomsTotal++;
                const cNames = c.classes || (c.className ? [c.className] : []);
                const has1_3 = cNames.some(cn => isClassGrade1_3(cn));
                const has4_8 = cNames.some(cn => isClassGrade4_8(cn));
                if (has1_3) sched1_3++;
                if (has4_8) sched4_8++;
              });
            }
          });
        });
      });
    });
  }

  let dutyEntries = 0;
  if (app?.dyzury?.harmonogram) {
    dutyEntries = Object.keys(app.dyzury.harmonogram).length;
  }

  // Detect auto suggestion role based on filename and content
  const lowerName = fileName.toLowerCase();
  let detectedRole: 'full' | 'plan_klas' | 'sal_1_3' | 'sal_4_8' | 'dyzury' = 'full';
  
  if (lowerName.includes('dyzur') || (dutyEntries > 0 && totalLessons === 0 && schedRoomsTotal === 0)) {
    detectedRole = 'dyzury';
  } else if (lowerName.includes('1-3') || lowerName.includes('wczesnoszkol')) {
    detectedRole = 'sal_1_3';
  } else if (lowerName.includes('4-8') || lowerName.includes('starsze')) {
    detectedRole = 'sal_4_8';
  } else if (lowerName.includes('klas') || lowerName.includes('siatka') || (totalLessons > 0 && schedRoomsTotal === 0)) {
    detectedRole = 'plan_klas';
  } else if (sched1_3 > 0 && sched4_8 === 0) {
    detectedRole = 'sal_1_3';
  } else if (sched4_8 > 0 && sched1_3 === 0) {
    detectedRole = 'sal_4_8';
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
  payload: ImportPayload,
  isFirstFile: boolean = false
): FileMergeConfig {
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
    dyzuryMode = 'none';
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
  const nextState: AppState = JSON.parse(JSON.stringify(currentState));
  const nextSched: SchedData = JSON.parse(JSON.stringify(currentSched));

  const incomingState = config.payload.appState;
  const incomingSched = config.payload.schedData;

  if (incomingState) {
    // 1. School Info
    if (config.importSchoolInfo && incomingState.school) {
      nextState.school = JSON.parse(JSON.stringify(incomingState.school));
      if (incomingState.yearLabel) nextState.yearLabel = incomingState.yearLabel;
      if (incomingState.yearKey) nextState.yearKey = incomingState.yearKey;
      if (incomingState.timeslots && incomingState.timeslots.length > 0) {
        nextState.timeslots = JSON.parse(JSON.stringify(incomingState.timeslots));
      }
      if (incomingState.hours && incomingState.hours.length > 0) {
        nextState.hours = JSON.parse(JSON.stringify(incomingState.hours));
      }
      if (incomingState.planLekcji?.hours && incomingState.planLekcji.hours.length > 0) {
        nextState.planLekcji.hours = JSON.parse(JSON.stringify(incomingState.planLekcji.hours));
      }
      report.push(`Dane szkoły i godziny lekcyjne`);
    }

    // 2. Buildings & Floors
    if (config.importBuildingsAndFloors && incomingState.buildings && incomingState.floors) {
      nextState.buildings = JSON.parse(JSON.stringify(incomingState.buildings));
      nextState.floors = JSON.parse(JSON.stringify(incomingState.floors));
      report.push(`Infrastruktura budynków i pięter`);
    }

    // 3. Rooms
    if (config.importRoomsList && incomingState.planLekcji?.rooms) {
      nextState.planLekcji.rooms = JSON.parse(JSON.stringify(incomingState.planLekcji.rooms));
      report.push(`Wykaz gabinetów (${incomingState.planLekcji.rooms.length} sal)`);
    }

    // 4. Teachers
    if (config.teachersMode !== 'none' && incomingState.teachers) {
      if (config.teachersMode === 'replace') {
        nextState.teachers = JSON.parse(JSON.stringify(incomingState.teachers));
        nextState.planLekcji.teachers = JSON.parse(JSON.stringify(incomingState.teachers));
        report.push(`Wszyscy nauczyciele (${incomingState.teachers.length} osób)`);
      } else if (config.teachersMode === 'merge_new') {
        let addedCount = 0;
        const currentTeachersMap = new Map<string, Teacher>();
        nextState.teachers.forEach(t => {
          currentTeachersMap.set(t.id, t);
          if (t.abbr) currentTeachersMap.set(t.abbr.toUpperCase(), t);
        });

        incomingState.teachers.forEach(incT => {
          const keyId = incT.id;
          const keyAbbr = incT.abbr?.toUpperCase();
          const existing = currentTeachersMap.get(keyId) || (keyAbbr ? currentTeachersMap.get(keyAbbr) : undefined);
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
    if (config.subjectsMode !== 'none' && incomingState.subjects) {
      if (config.subjectsMode === 'replace') {
        nextState.subjects = JSON.parse(JSON.stringify(incomingState.subjects));
        nextState.planLekcji.subjects = JSON.parse(JSON.stringify(incomingState.subjects));
        report.push(`Przedmioty (${incomingState.subjects.length})`);
      } else if (config.subjectsMode === 'merge_new') {
        let addedSubCount = 0;
        const currentSubjectsMap = new Map<string, Subject>();
        nextState.subjects.forEach(s => {
          currentSubjectsMap.set(s.id, s);
          if (s.name) currentSubjectsMap.set(s.name.toUpperCase().trim(), s);
          if (s.short) currentSubjectsMap.set(s.short.toUpperCase().trim(), s);
        });

        incomingState.subjects.forEach(incS => {
          const existing = currentSubjectsMap.get(incS.id) || 
            currentSubjectsMap.get(incS.name?.toUpperCase().trim()) || 
            currentSubjectsMap.get(incS.short?.toUpperCase().trim());
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
    if (config.classesMode !== 'none' && incomingState.classes) {
      if (config.classesMode === 'replace') {
        nextState.classes = JSON.parse(JSON.stringify(incomingState.classes));
        nextState.planLekcji.classes = JSON.parse(JSON.stringify(incomingState.classes));
        report.push(`Klasy i oddziały (${incomingState.classes.length})`);
      } else if (config.classesMode === 'merge_new') {
        let addedClsCount = 0;
        const currentClassesMap = new Map<string, Class>();
        nextState.classes.forEach(c => {
          currentClassesMap.set(c.id, c);
          if (c.name) currentClassesMap.set(c.name.toUpperCase().trim(), c);
        });

        incomingState.classes.forEach(incC => {
          const existing = currentClassesMap.get(incC.id) || currentClassesMap.get(incC.name?.toUpperCase().trim());
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
    if (config.homeroomsMode !== 'none' && incomingState.homerooms) {
      if (config.homeroomsMode === 'replace') {
        nextState.homerooms = JSON.parse(JSON.stringify(incomingState.homerooms));
        report.push(`Wszystkie sale wychowawcze (Homerooms)`);
      } else {
        nextState.homerooms = {
          ...nextState.homerooms,
          ...JSON.parse(JSON.stringify(incomingState.homerooms))
        };
        report.push(`Sale wychowawcze (zaktualizowano)`);
      }
    }

    // 8. Plan Lekcji (Etap 1 - Klasy i Nauczyciele)
    if (incomingState.planLekcji?.lessons) {
      const incomingClasses = incomingState.planLekcji.classes || incomingState.classes || [];
      const matchingIncomingClasses = incomingClasses.filter(c => 
        matchesClassScope(c, config.planLekcjiScope, config.planLekcjiCustomClasses)
      );
      const matchingClassIds = new Set(matchingIncomingClasses.map(c => c.id));
      const matchingClassNames = new Set(matchingIncomingClasses.map(c => c.name.toUpperCase().trim()));

      if (matchingClassIds.size > 0 || config.planLekcjiScope === 'all') {
        let mergedLessonsCount = 0;
        
        // Match assignments
        const incomingAssignments = incomingState.planLekcji.assignments || [];
        const filteredAssignments = incomingAssignments.filter(a => matchingClassIds.has(a.classId));

        if (config.planLekcjiStrategy === 'replace' && config.planLekcjiScope === 'all') {
          nextState.planLekcji.assignments = JSON.parse(JSON.stringify(incomingAssignments));
          nextState.planLekcji.lessons = JSON.parse(JSON.stringify(incomingState.planLekcji.lessons));
          mergedLessonsCount = Object.keys(nextState.planLekcji.lessons).length;
        } else {
          // Merge or replace for selected classes
          // 1. Filter out existing assignments for matching classes if replacing selected
          nextState.planLekcji.assignments = nextState.planLekcji.assignments.filter(
            a => !matchingClassIds.has(a.classId)
          );
          // Add new assignments
          nextState.planLekcji.assignments.push(...JSON.parse(JSON.stringify(filteredAssignments)));

          // 2. Filter out existing lessons for matching classes
          const nextLessons: Record<string, Lesson> = {};
          Object.entries(nextState.planLekcji.lessons).forEach(([k, lesson]) => {
            const classId = k.split('|')[0];
            if (!matchingClassIds.has(classId)) {
              nextLessons[k] = lesson;
            }
          });

          // Add incoming lessons for matching classes
          Object.entries(incomingState.planLekcji.lessons).forEach(([k, lesson]) => {
            const classId = k.split('|')[0];
            if (matchingClassIds.has(classId) || config.planLekcjiScope === 'all') {
              nextLessons[k] = JSON.parse(JSON.stringify(lesson));
              mergedLessonsCount++;
            }
          });

          nextState.planLekcji.lessons = nextLessons;
        }

        // Special education (NI / Rewalidacja)
        if (config.planLekcjiIncludeSpecial && incomingState.planLekcji.specialStudents) {
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
    if (config.dyzuryMode !== 'none' && incomingState.dyzury) {
      if (config.dyzuryMode === 'all') {
        if (config.dyzuryStrategy === 'replace') {
          nextState.dyzury = JSON.parse(JSON.stringify(incomingState.dyzury));
          report.push(`Plan dyżurów (całość: miejsca, przerwy i harmonogram)`);
        } else {
          // Merge places and breaks if not existing
          const existingMiejscaIds = new Set(nextState.dyzury.miejsca.map(m => m.id));
          const newMiejsca = incomingState.dyzury.miejsca.filter(m => !existingMiejscaIds.has(m.id));
          nextState.dyzury.miejsca.push(...JSON.parse(JSON.stringify(newMiejsca)));

          const existingPrzerwyNums = new Set(nextState.dyzury.przerwy.map(p => p.num));
          const newPrzerwy = incomingState.dyzury.przerwy.filter(p => !existingPrzerwyNums.has(p.num));
          nextState.dyzury.przerwy.push(...JSON.parse(JSON.stringify(newPrzerwy)));

          // Merge harmonogram
          nextState.dyzury.harmonogram = {
            ...nextState.dyzury.harmonogram,
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
            ...nextState.dyzury.harmonogram,
            ...JSON.parse(JSON.stringify(incomingState.dyzury.harmonogram || {}))
          };
          report.push(`Harmonogram dyżurów (dołączono)`);
        }
      }
    }
  }

  // 10. Plan Sal (Etap 2 - Obłożenie Gabinetów / schedData)
  if (incomingSched) {
    if (config.planSalStrategy === 'replace' && config.planSalScope === 'all') {
      Object.keys(nextSched).forEach(k => delete nextSched[k]);
      Object.assign(nextSched, JSON.parse(JSON.stringify(incomingSched)));
      report.push(`Plan sal (zastąpiono cały rozkład sal)`);
    } else {
      let transferredRoomCells = 0;
      const targetScope = config.planSalScope;
      const customClassNames = new Set(config.planSalCustomClasses.map(s => s.toUpperCase().trim()));
      const customColKeys = new Set(config.planSalCustomColKeys);

      // Function to check if a cell matches the targeted Plan Sal filter
      const cellMatchesFilter = (cell: SchedCell): boolean => {
        if (targetScope === 'all') return true;
        
        const cellClasses = cell.classes || (cell.className ? [cell.className] : []);
        if (targetScope === 'grades_1_3') {
          return cellClasses.some(cName => isClassGrade1_3(cName));
        }
        if (targetScope === 'grades_4_8') {
          return cellClasses.some(cName => isClassGrade4_8(cName));
        }
        if (targetScope === 'custom') {
          return cellClasses.some(cName => customClassNames.has(cName.toUpperCase().trim()));
        }
        return true;
      };

      // Traverse incoming SchedData and apply cells
      Object.entries(incomingSched).forEach(([yearKey, yearObj]) => {
        if (!nextSched[yearKey]) nextSched[yearKey] = {};
        
        Object.entries(yearObj || {}).forEach(([dayKey, dayObj]) => {
          const dayIdx = Number(dayKey);
          if (!nextSched[yearKey][dayIdx]) nextSched[yearKey][dayIdx] = {};

          Object.entries(dayObj || {}).forEach(([hourKey, hourObj]) => {
            if (!nextSched[yearKey][dayIdx][hourKey]) nextSched[yearKey][dayIdx][hourKey] = {};
            const destHourObj = nextSched[yearKey][dayIdx][hourKey];

            // If merging specific scope, first remove existing cells matching this scope from destHourObj
            if (targetScope === 'grades_1_3' || targetScope === 'grades_4_8' || targetScope === 'custom') {
              Object.keys(destHourObj).forEach(colKey => {
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
            Object.entries(hourObj || {}).forEach(([colKey, incomingCell]) => {
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

  return { nextState, nextSched, report };
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
  let activeState = JSON.parse(JSON.stringify(currentState));
  let activeSched = JSON.parse(JSON.stringify(currentSched));
  let activeArchive = [...currentArchive];
  let activeSnapshots = [...currentSnapshots];
  let activeLogs = [...currentLogs];
  const overallReport: string[] = [];

  for (const config of fileConfigs) {
    const { nextState, nextSched, report } = applyFileMergeToState(activeState, activeSched, config);
    activeState = nextState;
    activeSched = nextSched;

    if (report.length > 0) {
      overallReport.push(`[${config.fileName}]: ${report.join(', ')}`);
    }

    // Archive
    if (config.importArchive && Array.isArray(config.payload.archive) && config.payload.archive.length > 0) {
      if (config.archiveStrategy === 'replace') {
        activeArchive = JSON.parse(JSON.stringify(config.payload.archive));
      } else {
        const existingKeys = new Set(activeArchive.map(a => a.yearKey));
        const newItems = config.payload.archive.filter(a => !existingKeys.has(a.yearKey));
        activeArchive = [...activeArchive, ...JSON.parse(JSON.stringify(newItems))];
      }
    }

    // Snapshots
    if (config.importSnapshots && Array.isArray(config.payload.snapshots) && config.payload.snapshots.length > 0) {
      if (config.snapshotsStrategy === 'replace') {
        activeSnapshots = JSON.parse(JSON.stringify(config.payload.snapshots));
      } else {
        const existingIds = new Set(activeSnapshots.map(s => s.id));
        const newItems = config.payload.snapshots.filter(s => !existingIds.has(s.id));
        activeSnapshots = [...activeSnapshots, ...JSON.parse(JSON.stringify(newItems))];
      }
    }

    // Logs
    if (config.importHistoryLogs && Array.isArray(config.payload.historyLogs) && config.payload.historyLogs.length > 0) {
      const existingIds = new Set(activeLogs.map(l => l.id));
      const newItems = config.payload.historyLogs.filter(l => !existingIds.has(l.id));
      activeLogs = [...activeLogs, ...JSON.parse(JSON.stringify(newItems))];
    }
  }

  return {
    mergedState: activeState,
    mergedSched: activeSched,
    mergedArchive: activeArchive,
    mergedSnapshots: activeSnapshots,
    mergedLogs: activeLogs,
    overallReport
  };
}
