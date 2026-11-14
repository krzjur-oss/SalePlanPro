/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Narzędzia Geometrii, Numeracji i Klasyfikacji Sal Lekcyjnych (Room Utils)
 * Opis: Generowanie i parsowanie etykiet sal, rozpoznawanie klas 1–3, sal sportowych i pracowni.
 */
import { Assignment, Class, ClassRoom, SchoolGroup } from '../types';
import { mergeClassNames } from '../utils';

/**
 * Checks whether a classroom is a sports facility (gym, sports hall, swimming pool, pitch, etc.)
 * Used across PlanKlas, PlanSal, and DualScreen views for multi-class allocations and conflict detection.
 */
export const isSportsFacility = (room: ClassRoom | undefined | null): boolean => {
  if (!room) return false;
  if (room.type === 'sport') return true;
  const name = (room.name || '').toLowerCase().trim();
  const desc = (room.desc || '').toLowerCase().trim();
  const keywords = ['basen', 'hala', 'wf', 'gimn', 'sport', 'boisko', 'orlik', 'stadion', 'fitness', 'siłownia', 'silownia'];
  if (keywords.some(kw => name.includes(kw) || desc.includes(kw))) return true;
  if (name === 'sg' || name.startsWith('sg') || name.startsWith('sg_') || name.startsWith('sg-')) return true;
  return false;
};

/**
 * Określa, czy oddział należy do klas 1–3 edukacji wczesnoszkolnej.
 * Reguła:
 * - Jeśli `cls.year` jest podane (`!== null && !== undefined`), decyzja zapada WYŁĄCZNIE na podstawie `cls.year >= 1 && cls.year <= 3`.
 * - Fallback po nazwie `/^[1-3](?!\d)/` działa wyłącznie wtedy, gdy `cls.year` jest `null` lub `undefined`
 *   (nazwy typu "10A", "11B", "20C" nie są klasami 1–3).
 */
export function isGrade1to3(
  cls: { name?: string | null; year?: number | null } | string | null | undefined
): boolean {
  if (!cls) return false;
  if (typeof cls === 'string') {
    return /^[1-3](?!\d)/.test(cls.trim());
  }
  if (cls.year !== null && cls.year !== undefined) {
    return cls.year >= 1 && cls.year <= 3;
  }
  return /^[1-3](?!\d)/.test((cls.name || '').trim());
}

/**
 * Sprawdza, czy sala z Etapu 1 jest dedykowaną pracownią (posiada określony `type` różny od ogólnego).
 * Przydziały `asg.roomId` wskazujące na takie pracownie są traktowane jako twardy wymóg.
 */
export function isSpecializedLabRoom(room: ClassRoom | undefined | null): boolean {
  if (!room || !room.type) return false;
  const cleanType = room.type.trim().toLowerCase();
  if (!cleanType || cleanType === 'ogolna' || cleanType === 'ogólna' || cleanType === 'standard') {
    return false;
  }
  return true;
}

/**
 * Zbiera listę klas uczestniczących w przydziale (klasa bazowa + linkedClassIds + klasy z linkedGroupIds)
 * oraz buduje czytelną etykietę (np. "5AB (gr1)" albo "5A (gr1) + 5B (gr2)").
 */
export function buildAssignmentCombinedClasses(
  asg: Assignment,
  baseClass: Class,
  classesMap: Map<string, Class>,
  groupsMap: Map<string, SchoolGroup>
): { combinedClasses: string[]; displayClassName: string; groupName?: string } {
  const combinedClasses: string[] = [];
  const pushClass = (name?: string | null) => {
    const clean = (name || '').trim();
    if (clean && !combinedClasses.includes(clean)) {
      combinedClasses.push(clean);
    }
  };

  pushClass(baseClass.name);

  if (asg.linkedClassIds && asg.linkedClassIds.length > 0) {
    asg.linkedClassIds.forEach(lcId => {
      const linkedCls = classesMap.get(lcId);
      if (linkedCls) pushClass(linkedCls.name);
    });
  }

  const groupLabels: string[] = [];
  const distinctGroupNames: string[] = [];

  const baseGrp = asg.groupId ? groupsMap.get(asg.groupId) : null;
  const baseGrpName = baseGrp ? baseGrp.name : (asg.groupId || undefined);
  if (baseGrpName) {
    distinctGroupNames.push(baseGrpName);
    groupLabels.push(`${baseClass.name} (${baseGrpName})`);
  } else {
    groupLabels.push(baseClass.name);
  }

  if (asg.linkedGroupIds && asg.linkedGroupIds.length > 0) {
    asg.linkedGroupIds.forEach(lgId => {
      const lg = groupsMap.get(lgId);
      const lgClass = lg?.classId ? classesMap.get(lg.classId) : undefined;
      if (lgClass) {
        pushClass(lgClass.name);
      }
      const lgName = lg ? lg.name : lgId;
      if (lgName && !distinctGroupNames.includes(lgName)) {
        distinctGroupNames.push(lgName);
      }
      if (lgClass && lgName) {
        groupLabels.push(`${lgClass.name} (${lgName})`);
      }
    });
  }

  let displayClassName: string;
  if (distinctGroupNames.length === 0) {
    displayClassName = mergeClassNames(combinedClasses).join('+');
  } else if (distinctGroupNames.length === 1) {
    displayClassName = `${mergeClassNames(combinedClasses).join('+')} (${distinctGroupNames[0]})`;
  } else {
    displayClassName = groupLabels.join(' + ');
  }

  return {
    combinedClasses,
    displayClassName,
    groupName: distinctGroupNames.length === 1 ? distinctGroupNames[0] : baseGrpName
  };
}
