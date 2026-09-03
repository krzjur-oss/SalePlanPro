import { AppState, SchedData, Teacher, SpecialStudent, SchedCell } from '../types';
import { ImportPayload } from './mergeEngine';

export interface AnonymizationSummary {
  teachersAnonymized: number;
  studentsAnonymized: number;
  cellsUpdated: number;
  schoolMasked: boolean;
}

/**
 * Anonymizes an AppState structure by replacing teacher personal names and SPE student details
 * with synthetic GDPR/RODO-compliant identifiers while preserving timetable integrity and collisions.
 */
export function anonymizeAppState(
  state: AppState
): { state: AppState; teacherAbbrMap: Map<string, string>; summary: AnonymizationSummary } {
  // Deep clone to not mutate original state
  const next: AppState = JSON.parse(JSON.stringify(state));
  const teacherAbbrMap = new Map<string, string>();

  // 1. Anonymize School metadata
  next.school = {
    name: 'Szkoła Podstawowa (Zanonimizowana - RODO)',
    short: 'SP-RODO',
    phone: '000 000 000',
    web: 'https://szkola.gov.pl',
  };

  // 2. Anonymize Teachers (replace first & last names and assign clean abbreviations like N1, N2...)
  let teachersAnonymized = 0;
  const anonymizedTeachers: Teacher[] = (next.teachers || []).map((t, idx) => {
    const newAbbr = `N${idx + 1}`;
    const oldAbbr = String(t.abbr || '').toUpperCase().trim();
    if (oldAbbr) {
      teacherAbbrMap.set(oldAbbr, newAbbr);
    }
    if (t.id) {
      teacherAbbrMap.set(t.id, newAbbr);
    }
    teachersAnonymized++;

    return {
      ...t,
      first: '',
      last: `Nauczyciel ${idx + 1}`,
      abbr: newAbbr,
      inactiveComment: t.inactiveComment ? '[Zanonimizowano - RODO]' : undefined,
    };
  });

  next.teachers = anonymizedTeachers;
  if (next.planLekcji) {
    next.planLekcji.teachers = anonymizedTeachers;
  }

  // 3. Anonymize Special Education Students (SPE)
  let studentsAnonymized = 0;
  if (next.planLekcji?.specialStudents) {
    next.planLekcji.specialStudents = next.planLekcji.specialStudents.map((stud, idx) => {
      studentsAnonymized++;
      return {
        ...stud,
        firstName: 'Uczeń',
        lastName: `SPE ${idx + 1}`,
        note: stud.note ? '[Zanonimizowano - orzeczenie RODO]' : undefined,
      };
    });
  }

  // 4. Update Homerooms teacher abbreviations
  if (next.homerooms) {
    Object.keys(next.homerooms).forEach(colKey => {
      const hr = next.homerooms[colKey];
      if (hr) {
        if (hr.teacherAbbr && teacherAbbrMap.has(hr.teacherAbbr.toUpperCase().trim())) {
          hr.teacherAbbr = teacherAbbrMap.get(hr.teacherAbbr.toUpperCase().trim())!;
        }
        if (hr.teacherAbbr2 && teacherAbbrMap.has(hr.teacherAbbr2.toUpperCase().trim())) {
          hr.teacherAbbr2 = teacherAbbrMap.get(hr.teacherAbbr2.toUpperCase().trim())!;
        }
      }
    });
  }

  // 5. Update Duties (Dyżury) teacher abbreviations
  if (next.dyzury?.harmonogram) {
    Object.keys(next.dyzury.harmonogram).forEach(slotKey => {
      const duty = next.dyzury.harmonogram[slotKey];
      if (duty?.teacherAbbr) {
        const oldAbbr = duty.teacherAbbr.toUpperCase().trim();
        if (teacherAbbrMap.has(oldAbbr)) {
          duty.teacherAbbr = teacherAbbrMap.get(oldAbbr)!;
        }
        if (duty.note) {
          duty.note = '';
        }
      }
    });
  }

  return {
    state: next,
    teacherAbbrMap,
    summary: {
      teachersAnonymized,
      studentsAnonymized,
      cellsUpdated: 0,
      schoolMasked: true
    }
  };
}

/**
 * Anonymizes SchedData room allocations using the generated teacher abbreviation map.
 */
export function anonymizeSchedData(
  schedData: SchedData,
  teacherAbbrMap: Map<string, string>
): { schedData: SchedData; cellsUpdated: number } {
  const nextSched: SchedData = JSON.parse(JSON.stringify(schedData || {}));
  let cellsUpdated = 0;

  const anonymizeCell = (cell: SchedCell) => {
    if (!cell) return;
    if (cell.teacherAbbr) {
      const oldAbbr = cell.teacherAbbr.toUpperCase().trim();
      if (teacherAbbrMap.has(oldAbbr)) {
        cell.teacherAbbr = teacherAbbrMap.get(oldAbbr);
        cellsUpdated++;
      }
    }
    if (cell.supportTeacherAbbr) {
      const oldAbbr = cell.supportTeacherAbbr.toUpperCase().trim();
      if (teacherAbbrMap.has(oldAbbr)) {
        cell.supportTeacherAbbr = teacherAbbrMap.get(oldAbbr);
        cellsUpdated++;
      }
    }
    if (cell.note) {
      // Clear notes that might contain sensitive remarks or names
      cell.note = '';
    }
  };

  Object.values(nextSched).forEach(yearObj => {
    if (!yearObj || typeof yearObj !== 'object') return;
    Object.values(yearObj).forEach(dayObj => {
      if (!dayObj || typeof dayObj !== 'object') return;
      Object.values(dayObj).forEach(hourObj => {
        if (!hourObj || typeof hourObj !== 'object') return;
        Object.values(hourObj).forEach(colEntry => {
          if (Array.isArray(colEntry)) {
            colEntry.forEach(anonymizeCell);
          } else if (colEntry) {
            anonymizeCell(colEntry);
          }
        });
      });
    });
  });

  return { schedData: nextSched, cellsUpdated };
}

/**
 * Anonymizes an entire backup payload (including AppState, SchedData, Archives, Snapshots).
 */
export function anonymizeBackupPayload(rawPayload: ImportPayload | any): { payload: any; summary: AnonymizationSummary } {
  const payloadClone = JSON.parse(JSON.stringify(rawPayload));
  let totalTeachers = 0;
  let totalStudents = 0;
  let totalCells = 0;

  let globalTeacherAbbrMap = new Map<string, string>();

  // 1. Anonymize main appState
  if (payloadClone.appState) {
    const res = anonymizeAppState(payloadClone.appState);
    payloadClone.appState = res.state;
    globalTeacherAbbrMap = res.teacherAbbrMap;
    totalTeachers += res.summary.teachersAnonymized;
    totalStudents += res.summary.studentsAnonymized;
  }

  // 2. Anonymize schedData
  if (payloadClone.schedData) {
    const schedRes = anonymizeSchedData(payloadClone.schedData, globalTeacherAbbrMap);
    payloadClone.schedData = schedRes.schedData;
    totalCells += schedRes.cellsUpdated;
  }

  // 3. Anonymize Archives if present
  if (Array.isArray(payloadClone.archive)) {
    payloadClone.archive = payloadClone.archive.map((arch: any) => {
      if (arch.config) {
        const archRes = anonymizeAppState(arch.config);
        return { ...arch, config: archRes.state };
      }
      return arch;
    });
  }

  // 4. Anonymize Snapshots if present
  if (Array.isArray(payloadClone.snapshots)) {
    payloadClone.snapshots = payloadClone.snapshots.map((snap: any) => {
      let snapApp = snap.appState;
      let snapSched = snap.schedData;
      if (snapApp) {
        const res = anonymizeAppState(snapApp);
        snapApp = res.state;
        if (snapSched) {
          snapSched = anonymizeSchedData(snapSched, res.teacherAbbrMap).schedData;
        }
      }
      return {
        ...snap,
        name: `Migawka [RODO] - ${snap.name || ''}`.slice(0, 50),
        appState: snapApp,
        schedData: snapSched,
        comment: snap.comment ? '[Zanonimizowano - RODO]' : undefined,
      };
    });
  }

  // 5. Mark as anonymized
  payloadClone._anonymized = {
    timestamp: new Date().toISOString(),
    standard: 'RODO / GDPR Art. 32',
  };

  return {
    payload: payloadClone,
    summary: {
      teachersAnonymized: totalTeachers,
      studentsAnonymized: totalStudents,
      cellsUpdated: totalCells,
      schoolMasked: true
    }
  };
}
