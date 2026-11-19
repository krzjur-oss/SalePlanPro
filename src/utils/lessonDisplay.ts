/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Ujednolicony Opis Lekcji (Lesson Display)
 * Opis: Kanoniczna funkcja describeLesson(lessonOrCell, ctx) łącząca logikę
 *       rozwiązywania klasy, grupy, przedmiotu, nauczyciela prowadzącego,
 *       nauczyciela wspomagającego, sali, lekcji łączonych oraz notatki
 *       dla danych Etapu 1 (Lesson + Assignment) i Etapu 2 (SchedCell).
 */
import {
  AppState,
  Assignment,
  Class,
  ClassRoom,
  Lesson,
  PlanLekcjiState,
  SchedCell,
  SchoolGroup,
  Subject,
  Teacher,
} from '../types';
import { buildAssignmentCombinedClasses } from './roomUtils';

export interface LessonTeacherDisplay {
  id?: string;
  abbr: string;
  first?: string;
  last?: string;
  compact: string;
  full: string;
}

export interface DescribedLesson {
  classLabel: string;
  groupLabel?: string;
  groupShort?: string;
  subjectName: string;
  subjectShort: string;
  leadTeacher: LessonTeacherDisplay | null;
  supportTeacher: LessonTeacherDisplay | null;
  roomName?: string;
  linkedWith?: string;
  note?: string;
}

export interface Etap1LessonInput {
  lesson: Lesson;
  assignment?: Assignment;
  lessonKey?: string;
  classId?: string;
  roomName?: string | null;
}

export type Etap2CellInput = SchedCell & {
  roomName?: string;
  colKey?: string;
};

export type LessonOrCellInput = Lesson | Etap1LessonInput | Etap2CellInput;

export interface LessonDisplayContext {
  appState?: Pick<AppState, 'classes' | 'teachers' | 'subjects' | 'planLekcji'>;
  planLekcji?: Partial<PlanLekcjiState>;
  classes?: Class[];
  teachers?: Teacher[];
  appTeachers?: Teacher[];
  subjects?: Subject[];
  appSubjects?: Subject[];
  rooms?: ClassRoom[];
  schoolGroups?: SchoolGroup[];
  assignments?: Assignment[];

  classesMap?: Map<string, Class>;
  teachersMap?: Map<string, Teacher>;
  subjectsMap?: Map<string, Subject>;
  roomsMap?: Map<string, ClassRoom>;
  groupsMap?: Map<string, SchoolGroup>;
  assignmentsMap?: Map<string, Assignment>;

  assignment?: Assignment;
  lessonKey?: string;
  classId?: string;
  targetClassId?: string;
  targetClassName?: string;
  roomName?: string | null;
  colKey?: string;
  resolveRoomFromColKey?: (colKey: string) => string;
}

function isEtap1Wrapper(input: LessonOrCellInput): input is Etap1LessonInput {
  return typeof input === 'object' && input !== null && 'lesson' in input;
}

function isRawLesson(input: LessonOrCellInput): input is Lesson {
  return (
    typeof input === 'object' &&
    input !== null &&
    'assignmentId' in input &&
    !('className' in input) &&
    !('classes' in input) &&
    !('subject' in input)
  );
}

/**
 * Formatuje czytelny skrót przedmiotu na podstawie zdefiniowanego `short` lub polskiej nazwy.
 */
export function getSubjectShort(
  subjectNameOrId: string,
  subjectObj?: Pick<Subject, 'id' | 'name' | 'short'> | null,
  ctx?: Pick<LessonDisplayContext, 'subjects' | 'appSubjects' | 'planLekcji' | 'appState'>
): string {
  if (subjectObj && subjectObj.short && String(subjectObj.short).trim()) {
    return String(subjectObj.short).trim();
  }

  const normalizedKey = String(subjectNameOrId || '').toLowerCase().trim();
  const plSubjects = ctx?.subjects || ctx?.planLekcji?.subjects || ctx?.appState?.planLekcji?.subjects || [];
  const appSubjects = ctx?.appSubjects || ctx?.appState?.subjects || [];

  const found = plSubjects.find(
    s => s.id === subjectNameOrId || s.name.toLowerCase().trim() === normalizedKey
  );
  if (found && found.short && found.short.trim()) {
    return found.short.trim();
  }

  const appFound = appSubjects.find(
    s => s.id === subjectNameOrId || s.name.toLowerCase().trim() === normalizedKey
  );
  if (appFound && appFound.short && appFound.short.trim()) {
    return appFound.short.trim();
  }

  const name = found?.name || appFound?.name || subjectNameOrId || '';
  if (!name) return '';
  if (name.length <= 4) return name;

  const lower = name.toLowerCase();
  if (lower.includes('angielsk')) return 'ang';
  if (lower.includes('polsk')) return 'pol';
  if (lower.includes('matemat')) return 'mat';
  if (lower.includes('fizyk')) return 'fiz';
  if (lower.includes('chem')) return 'chem';
  if (lower.includes('biolog')) return 'biol';
  if (lower.includes('geograf')) return 'geogr';
  if (lower.includes('histor')) return 'hist';
  if (lower.includes('informat')) return 'inf';
  if (lower.includes('fizyczn') || lower.includes('w-f') || lower.includes('wf')) return 'WF';
  if (lower.includes('relig')) return 'rel';
  if (lower.includes('muzyk')) return 'muz';
  if (lower.includes('plastyk')) return 'plas';
  if (lower.includes('technik')) return 'tech';
  if (lower.includes('niemieck')) return 'niem';
  if (lower.includes('hiszpań') || lower.includes('hiszpan')) return 'hiszp';
  if (lower.includes('francusk')) return 'franc';
  if (lower.includes('rosyjsk')) return 'ros';
  if (lower.includes('etyk')) return 'etyka';
  if (lower.includes('godzina wychowawcza') || lower.includes('zajęcia z wychowawcą')) return 'GW';
  if (lower.includes('edukacja wczesnoszkolna')) return 'EW';
  if (lower.includes('edukacja dla bezpieczeństwa')) return 'EDB';
  if (lower.includes('wiedza o społeczeństwie')) return 'WOS';
  if (lower.includes('historia i teraźniejszość')) return 'HIT';
  return name.slice(0, 4);
}

/**
 * Formatuje krótki identyfikator grupy (np. "G1", "G2", "chł", "dz").
 * Odfiltrowuje dopiski przedmiotowe, aby uniknąć duplikacji etykiet.
 */
export function getGroupShort(
  groupIdOrName?: string | null,
  subjectContext?: string,
  ctx?: Pick<LessonDisplayContext, 'schoolGroups' | 'planLekcji' | 'appState' | 'groupsMap'>
): string {
  if (!groupIdOrName) return '';
  const trimmed = String(groupIdOrName).trim();
  if (!trimmed) return '';

  const schoolGroups = ctx?.schoolGroups || ctx?.planLekcji?.schoolGroups || ctx?.appState?.planLekcji?.schoolGroups || [];
  const grpObj =
    ctx?.groupsMap?.get(trimmed) ||
    schoolGroups.find(g => g.id === trimmed || g.name.toLowerCase() === trimmed.toLowerCase());
  const name = grpObj ? grpObj.name.trim() : trimmed;

  if (/^g\s*\d+$/i.test(name)) {
    return name.toUpperCase().replace(/\s+/, '');
  }
  const mGrupa = name.match(/^grupa\s*(\d+|[a-zA-Z]+)/i);
  if (mGrupa) {
    return `G${mGrupa[1].toUpperCase()}`;
  }
  const mGr = name.match(/^gr\.?\s*(\d+|[a-zA-Z]+)/i);
  if (mGr) {
    return `G${mGr[1].toUpperCase()}`;
  }
  if (/^\d+$/.test(name)) {
    return `G${name}`;
  }
  if (/^1\/2$/i.test(name) || /^gr\.?\s*1\/2$/i.test(name)) return 'G1';
  if (/^2\/2$/i.test(name) || /^gr\.?\s*2\/2$/i.test(name)) return 'G2';
  if (name.toLowerCase() === 'chłopcy' || name.toLowerCase() === 'chlopcy') return 'chł';
  if (name.toLowerCase() === 'dziewczęta' || name.toLowerCase() === 'dziewczeta') return 'dz';

  const lowerName = name.toLowerCase();
  if (
    lowerName.includes('relig') ||
    lowerName.includes('mniejszoś') ||
    lowerName.includes('mniejszos') ||
    lowerName.includes('hiszpań') ||
    lowerName.includes('hiszpan') ||
    lowerName.includes('niemieck') ||
    lowerName.includes('angielsk') ||
    lowerName.includes('informat') ||
    lowerName.includes('etyk') ||
    lowerName.includes('fizyczn') ||
    lowerName.includes('wf')
  ) {
    return '';
  }

  if (subjectContext) {
    const sLower = subjectContext.toLowerCase();
    if (lowerName.includes(sLower) || sLower.includes(lowerName)) {
      return '';
    }
  }

  if (name.length <= 4 && !/^[A-Z0-9]{3,}$/.test(name)) {
    return name;
  }

  return '';
}

function buildTeacherDisplay(
  teacherObj?: Teacher | null,
  fallbackAbbr?: string | null
): LessonTeacherDisplay | null {
  const rawFallback = (fallbackAbbr || '').trim();
  if (!teacherObj && !rawFallback) return null;

  if (!teacherObj) {
    return {
      abbr: rawFallback,
      compact: rawFallback,
      full: rawFallback,
    };
  }

  const first = (teacherObj.first || '').trim();
  const last = (teacherObj.last || '').trim();
  const abbr = (teacherObj.abbr || rawFallback).trim();
  if (!abbr && !first && !last) return null;

  const fullName = [first, last].filter(Boolean).join(' ');
  const compact = first && last
    ? `${first[0]}. ${last}${abbr ? ` (${abbr})` : ''}`
    : fullName
      ? `${fullName}${abbr ? ` (${abbr})` : ''}`
      : abbr;
  const full = fullName
    ? `${fullName}${abbr ? ` (${abbr})` : ''}`
    : abbr;

  return {
    id: teacherObj.id,
    abbr,
    first: first || undefined,
    last: last || undefined,
    compact,
    full,
  };
}

function resolveCollections(ctx: LessonDisplayContext) {
  const pl = ctx.planLekcji || ctx.appState?.planLekcji;
  const classes = ctx.classes || pl?.classes || ctx.appState?.classes || [];
  const teachers = ctx.teachers || pl?.teachers || ctx.appState?.teachers || [];
  const appTeachers = ctx.appTeachers || ctx.appState?.teachers || [];
  const subjects = ctx.subjects || pl?.subjects || ctx.appState?.subjects || [];
  const appSubjects = ctx.appSubjects || ctx.appState?.subjects || [];
  const rooms = ctx.rooms || pl?.rooms || [];
  const schoolGroups = ctx.schoolGroups || pl?.schoolGroups || [];
  const assignments = ctx.assignments || pl?.assignments || [];

  const classesMap = ctx.classesMap || new Map(classes.map(c => [c.id, c]));
  const teachersMap = ctx.teachersMap || new Map(teachers.map(t => [t.id, t]));
  const subjectsMap = ctx.subjectsMap || new Map(subjects.map(s => [s.id, s]));
  const roomsMap = ctx.roomsMap || new Map(rooms.map(r => [r.id, r]));
  const groupsMap = ctx.groupsMap || new Map(schoolGroups.map(g => [g.id, g]));

  return {
    classes,
    teachers,
    appTeachers,
    subjects,
    appSubjects,
    rooms,
    schoolGroups,
    assignments,
    classesMap,
    teachersMap,
    subjectsMap,
    roomsMap,
    groupsMap,
  };
}

/**
 * Zwraca ujednolicony opis lekcji dla danych z Etapu 1 (Lesson/Assignment) oraz Etapu 2 (SchedCell).
 */
export function describeLesson(
  lessonOrCell: LessonOrCellInput,
  ctx: LessonDisplayContext = {}
): DescribedLesson {
  const cols = resolveCollections(ctx);
  const shortCtx = {
    subjects: cols.subjects,
    appSubjects: cols.appSubjects,
    schoolGroups: cols.schoolGroups,
    groupsMap: cols.groupsMap,
  };

  if (isEtap1Wrapper(lessonOrCell) || isRawLesson(lessonOrCell)) {
    const lesson = isEtap1Wrapper(lessonOrCell) ? lessonOrCell.lesson : lessonOrCell;
    const lessonKey = isEtap1Wrapper(lessonOrCell) ? lessonOrCell.lessonKey : ctx.lessonKey;
    const explicitClassId = isEtap1Wrapper(lessonOrCell) ? lessonOrCell.classId : ctx.classId;
    const explicitRoomName = isEtap1Wrapper(lessonOrCell) ? lessonOrCell.roomName : ctx.roomName;

    const asg =
      (isEtap1Wrapper(lessonOrCell) ? lessonOrCell.assignment : ctx.assignment) ||
      ctx.assignmentsMap?.get(lesson.assignmentId) ||
      cols.assignments.find(a => a.id === lesson.assignmentId);

    const keyParts = lessonKey ? lessonKey.split('|') : [];
    const fallbackClassId = explicitClassId || keyParts[0] || asg?.classId || '';
    const keyGroupId = keyParts[3] || undefined;

    const subjObj = asg?.subjectId
      ? (cols.subjectsMap.get(asg.subjectId) || cols.subjects.find(s => s.id === asg.subjectId))
      : undefined;
    const subjectName = subjObj?.name || 'Przedmiot';
    const subjectShort = getSubjectShort(asg?.subjectId || subjectName, subjObj, shortCtx);

    const leadTeacherObj = asg?.teacherId
      ? (cols.teachersMap.get(asg.teacherId) || cols.appTeachers.find(t => t.id === asg.teacherId))
      : undefined;
    const leadTeacher = buildTeacherDisplay(leadTeacherObj);

    const suppId = lesson.supportTeacherId || asg?.supportTeacherId || null;
    const supportTeacherObj = suppId
      ? (cols.teachersMap.get(suppId) || cols.appTeachers.find(t => t.id === suppId))
      : undefined;
    const supportTeacher = buildTeacherDisplay(supportTeacherObj);

    const metaRoom = asg?.roomId
      ? (cols.roomsMap.get(asg.roomId) || cols.rooms.find(r => r.id === asg.roomId))
      : undefined;
    const resolvedRoomOverride = explicitRoomName !== undefined
      ? (explicitRoomName || '').trim()
      : (ctx.colKey && ctx.resolveRoomFromColKey ? ctx.resolveRoomFromColKey(ctx.colKey).trim() : '');
    const roomName = (
      resolvedRoomOverride ||
      (explicitRoomName === undefined ? (metaRoom?.name || (asg?.roomId ? String(asg.roomId) : '')).trim() : '')
    ) || undefined;

    const baseClassObj: Class =
      (asg?.classId ? cols.classesMap.get(asg.classId) : undefined) ||
      (fallbackClassId ? cols.classesMap.get(fallbackClassId) : undefined) || {
        id: asg?.classId || fallbackClassId || 'class',
        name: 'Klasa',
        color: '',
        groupIds: [],
      };

    const rawGroupId = asg?.groupId || keyGroupId || undefined;
    const effectiveAsg = asg
      ? (rawGroupId && !asg.groupId ? { ...asg, groupId: rawGroupId } : asg)
      : undefined;

    const isLinked = Boolean(
      effectiveAsg &&
      ((effectiveAsg.linkedClassIds && effectiveAsg.linkedClassIds.length > 0) ||
        (effectiveAsg.linkedGroupIds && effectiveAsg.linkedGroupIds.length > 0))
    );

    let classLabel = baseClassObj.name;
    let groupLabel: string | undefined;
    let groupShort: string | undefined;
    let linkedWith: string | undefined;

    if (effectiveAsg && isLinked) {
      const combined = buildAssignmentCombinedClasses(
        effectiveAsg,
        baseClassObj,
        cols.classesMap,
        cols.groupsMap
      );
      linkedWith = combined.displayClassName || undefined;

      const hasMultipleGroupLabels =
        combined.displayClassName.includes(' + ') &&
        (combined.displayClassName.match(/\([^)]+\)/g) || []).length > 1;

      if (ctx.targetClassId) {
        let targetRawGroupId: string | undefined;
        if (ctx.targetClassId === effectiveAsg.classId) {
          targetRawGroupId = effectiveAsg.groupId || keyGroupId || undefined;
        } else {
          const matchingLinkedGrp = (effectiveAsg.linkedGroupIds || []).find(lgId => {
            const grp = cols.groupsMap.get(lgId) || cols.schoolGroups.find(g => g.id === lgId);
            return grp?.classId === ctx.targetClassId;
          });
          targetRawGroupId = matchingLinkedGrp || keyGroupId || effectiveAsg.groupId || undefined;
        }
        const targetGrpObj = targetRawGroupId
          ? (cols.groupsMap.get(targetRawGroupId) || cols.schoolGroups.find(g => g.id === targetRawGroupId))
          : undefined;
        groupLabel = targetGrpObj ? targetGrpObj.name : targetRawGroupId;
        groupShort = getGroupShort(groupLabel, subjectShort || subjectName, shortCtx) || undefined;
        classLabel = hasMultipleGroupLabels
          ? combined.displayClassName
          : combined.displayClassName.replace(/\s*\([^)]*\)/g, '').trim() || combined.displayClassName;
      } else if (!hasMultipleGroupLabels) {
        classLabel =
          combined.displayClassName.replace(/\s*\([^)]*\)/g, '').trim() ||
          combined.displayClassName;
        const grpObj = rawGroupId
          ? (cols.groupsMap.get(rawGroupId) || cols.schoolGroups.find(g => g.id === rawGroupId))
          : undefined;
        groupLabel = grpObj ? grpObj.name : combined.groupName || rawGroupId;
        groupShort = getGroupShort(groupLabel, subjectShort || subjectName, shortCtx) || undefined;
      } else {
        classLabel = combined.displayClassName;
        const distinctGroups: string[] = [];
        if (effectiveAsg.groupId) {
          const g = cols.groupsMap.get(effectiveAsg.groupId) || cols.schoolGroups.find(gr => gr.id === effectiveAsg.groupId);
          if (g?.name) distinctGroups.push(g.name);
        }
        (effectiveAsg.linkedGroupIds || []).forEach(lgId => {
          const g = cols.groupsMap.get(lgId) || cols.schoolGroups.find(gr => gr.id === lgId);
          const gName = g?.name || lgId;
          if (gName && !distinctGroups.includes(gName)) {
            distinctGroups.push(gName);
          }
        });
        groupLabel = distinctGroups.length > 0 ? distinctGroups.join(' + ') : (combined.groupName || undefined);
        groupShort = undefined;
      }
    } else {
      classLabel = baseClassObj.name.replace(/\s*\([^)]*\)/g, '').trim() || baseClassObj.name;
      const grpObj = rawGroupId
        ? (cols.groupsMap.get(rawGroupId) || cols.schoolGroups.find(g => g.id === rawGroupId))
        : undefined;
      groupLabel = grpObj ? grpObj.name : rawGroupId;
      groupShort = getGroupShort(groupLabel, subjectShort || subjectName, shortCtx) || undefined;
    }

    return {
      classLabel,
      groupLabel: groupLabel || undefined,
      groupShort: groupShort || undefined,
      subjectName,
      subjectShort,
      leadTeacher,
      supportTeacher,
      roomName,
      linkedWith,
      note: undefined,
    };
  }

  // Etap 2 (SchedCell)
  const cell = lessonOrCell;
  const rawClass = cell.className || cell.classes?.join('+') || 'Klasa';
  const allParenMatches = rawClass.match(/\([^)]+\)/g) || [];
  const hasMultipleParenGroups = allParenMatches.length > 1;

  let classLabel = rawClass;
  let embeddedGroupInClass = '';
  if (allParenMatches.length === 1) {
    const parenMatch = rawClass.match(/\(([^)]+)\)/);
    if (parenMatch) {
      embeddedGroupInClass = parenMatch[1].trim();
      classLabel = rawClass.replace(/\s*\([^)]*\)/g, '').trim() || rawClass;
    }
  }

  const subjObj =
    (cell._bridgeMeta?.subjectId
      ? (cols.subjectsMap.get(cell._bridgeMeta.subjectId) ||
          cols.subjects.find(s => s.id === cell._bridgeMeta?.subjectId))
      : undefined) ||
    cols.subjects.find(s => s.name.toLowerCase().trim() === (cell.subject || '').toLowerCase().trim());

  const subjectName = (cell.subject || '').trim() || subjObj?.name || 'Przedmiot';
  const subjectShort = getSubjectShort(cell.subject || cell._bridgeMeta?.subjectId || subjectName, subjObj, shortCtx);

  let rawGroup: string | undefined;
  if (ctx.targetClassName) {
    const escapedClsName = ctx.targetClassName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classText = cell.className || (cell.classes || []).join(' ');
    const classSpecificMatch = classText.match(new RegExp(`${escapedClsName}\\s*\\(([^)]+)\\)`));
    if (classSpecificMatch?.[1]) {
      rawGroup = classSpecificMatch[1].trim();
    } else if (
      cell._bridgeMeta?.groupId &&
      (!cell._bridgeMeta.classId ||
        cols.classesMap.get(cell._bridgeMeta.classId)?.name === ctx.targetClassName)
    ) {
      rawGroup = cell._bridgeMeta.groupId;
    } else if (cell._bridgeMeta?.linkedGroupIds && cell._bridgeMeta.linkedGroupIds.length > 0) {
      const targetClassObj = cols.classes.find(c => c.name === ctx.targetClassName);
      const matchedLgId = targetClassObj
        ? cell._bridgeMeta.linkedGroupIds.find(lgId => {
            const g = cols.groupsMap.get(lgId) || cols.schoolGroups.find(gr => gr.id === lgId);
            return g?.classId === targetClassObj.id;
          })
        : undefined;
      rawGroup = matchedLgId || cell._bridgeMeta.groupId || undefined;
    } else {
      const parenMatch = classText.match(/\(([^)]+)\)/);
      rawGroup = parenMatch?.[1]?.trim() || cell._bridgeMeta?.groupId || undefined;
    }
  } else {
    rawGroup = hasMultipleParenGroups ? undefined : (cell._bridgeMeta?.groupId || undefined);
    if (!rawGroup && !hasMultipleParenGroups && cell._bridgeMeta?.classId && cell._bridgeMeta?.subjectId) {
      const matchingAsg = cols.assignments.find(
        a =>
          a.classId === cell._bridgeMeta?.classId &&
          a.subjectId === cell._bridgeMeta?.subjectId &&
          (!cell._bridgeMeta?.teacherId || a.teacherId === cell._bridgeMeta?.teacherId)
      );
      if (matchingAsg?.groupId) {
        rawGroup = matchingAsg.groupId;
      }
    }
    if (!rawGroup && embeddedGroupInClass) {
      rawGroup = embeddedGroupInClass;
    }
    if (!rawGroup && !hasMultipleParenGroups && cell.note) {
      const noteMatch = cell.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2|chłopcy|dziewczęta)\b/i);
      if (noteMatch) {
        rawGroup = noteMatch[0];
      }
    }
  }

  let groupLabel: string | undefined;
  let groupShort: string | undefined;
  if (rawGroup) {
    const grpObj = cols.groupsMap.get(rawGroup) || cols.schoolGroups.find(g => g.id === rawGroup);
    groupLabel = grpObj ? grpObj.name : rawGroup;
    groupShort = hasMultipleParenGroups && !ctx.targetClassName
      ? undefined
      : (getGroupShort(groupLabel, subjectShort || subjectName, shortCtx) || undefined);
  } else if (hasMultipleParenGroups) {
    groupLabel = allParenMatches.map(m => m.slice(1, -1).trim()).filter(Boolean).join(' + ') || undefined;
    groupShort = undefined;
  }

  const rawLeadAbbr = (cell.teacherAbbr || cell._bridgeMeta?.teacherAbbr || '').trim();
  const leadTeacherObj =
    (cell._bridgeMeta?.teacherId
      ? (cols.teachersMap.get(cell._bridgeMeta.teacherId) ||
          cols.appTeachers.find(t => t.id === cell._bridgeMeta?.teacherId))
      : undefined) ||
    (rawLeadAbbr
      ? cols.teachers.find(t => t.abbr?.toUpperCase().trim() === rawLeadAbbr.toUpperCase()) ||
        cols.appTeachers.find(t => t.abbr?.toUpperCase().trim() === rawLeadAbbr.toUpperCase())
      : undefined);
  const leadTeacher = buildTeacherDisplay(leadTeacherObj, rawLeadAbbr);

  const rawSuppAbbr = (cell.supportTeacherAbbr || cell._bridgeMeta?.supportTeacherAbbr || '').trim();
  const supportTeacherObj = rawSuppAbbr
    ? cols.teachers.find(t => t.abbr?.toUpperCase().trim() === rawSuppAbbr.toUpperCase()) ||
      cols.appTeachers.find(t => t.abbr?.toUpperCase().trim() === rawSuppAbbr.toUpperCase())
    : undefined;
  const supportTeacher = buildTeacherDisplay(supportTeacherObj, rawSuppAbbr);

  const effectiveColKey = cell.colKey || ctx.colKey;
  const resolvedColRoom = effectiveColKey && ctx.resolveRoomFromColKey
    ? ctx.resolveRoomFromColKey(effectiveColKey)
    : '';
  const roomName = (ctx.roomName ?? cell.roomName ?? resolvedColRoom)?.trim() || undefined;

  let linkedWith: string | undefined;
  if (hasMultipleParenGroups) {
    linkedWith = rawClass;
  } else if (cell.classes && cell.classes.length > 1) {
    linkedWith = cell.classes.join('+');
  } else if (
    (cell._bridgeMeta?.linkedClassIds && cell._bridgeMeta.linkedClassIds.length > 0) ||
    (cell._bridgeMeta?.linkedGroupIds && cell._bridgeMeta.linkedGroupIds.length > 0)
  ) {
    linkedWith = rawClass;
  }

  const note = cell.note?.trim() || undefined;

  return {
    classLabel,
    groupLabel,
    groupShort,
    subjectName,
    subjectShort,
    leadTeacher,
    supportTeacher,
    roomName,
    linkedWith,
    note,
  };
}
