/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Autogenerator Planu Lekcji (PlanGenerator)
 * Opis: Inteligentny silnik heurystyczny do automatycznego rozmieszczania lekcji w siatce godzinowej oddziałów.
 * Funkcjonalności v3.14.0:
 * - Zaawansowany model zajętości grup zgodny z groupsOverlap(a, b, schoolGroups) i partycjami
 * - Egzekucja limitów okienek (globalne i indywidualne), dziennego rozkładu przedmiotu oraz rezerwy zastępstw
 * - Opcja zachowania ręcznych lekcji niezablokowanych i automatyczne czyszczenie osieroconych przydziałów
 * - Obsługa klas powiązanych (linkedClassIds), grup międzyoddziałowych (linkedGroupIds), nauczycieli wspomagających i sal
 * - Końcowa weryfikacja poprawności wygenerowanego planu przez silnik detectConflicts
 */

import React, { useState, useMemo } from 'react';
import { 
  AppState, PlanLekcjiState, Class, Teacher, Subject, ClassRoom, SchoolGroup, Assignment, Lesson, SpecialStudent, SpecialAssignment, SpecialLesson 
} from '../types';
import { 
  Sparkles, X, Settings, HelpCircle, AlertCircle, Play, CheckCircle, RefreshCw, Undo2, Users, Calendar, Award, Lock 
} from 'lucide-react';
import { isSportsFacility } from '../utils/roomUtils';
import { detectConflicts, groupsOverlap, PlanConflict } from '../utils/conflictEngine';
import { isTeacherAvailableAt } from '../utils/availability';

export interface PlanGeneratorProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onClose: () => void;
}

export interface TeacherRoleConfig {
  teacherId: string;
  role: 'teacher' | 'director' | 'deputy';
  maxGaps?: number | null;
  spreadObligation: boolean;
}

export interface PlanGeneratorOptions {
  maxGapsPerTeacher: number;
  obeyAvailability: boolean;
  avoidExtremes: boolean;
  avoidExtremesSubjectIds: string[];
  noStudentGaps: boolean;
  allowDoubleBlocks: boolean;
  includeSpecialNI: boolean;
  limitComputerLabs: boolean;
  customComputerLabsCount: number;
  minAvailableSubstitutionTeachersPerSlot: number;
  forceOptionalToExtremes: boolean;
  optionalSubjectIds: string[];
  preserveUnlockedManualLessons?: boolean;
  teacherConfigs?: Record<string, TeacherRoleConfig>;
}

export interface PlanGenerationResult {
  success: boolean;
  placedRegular: number;
  totalRegular: number;
  placedSpecial: number;
  totalSpecial: number;
  errors: string[];
  warnings: string[];
  conflicts: PlanConflict[];
  updatedLessons: Record<string, Lesson>;
  updatedSpecialLessons: Record<string, SpecialLesson>;
}

interface WorkUnit {
  assignmentId: string;
  classId: string;
  linkedClassIds: string[];
  linkedGroupIds: string[];
  teacherId: string | null;
  supportTeacherId: string | null;
  subjectId: string;
  groupId: string | null;
  roomId: string | null;
  preferredBlockSize: number;
}

interface WorkBundle {
  classId: string;
  linkedClassIds: string[];
  units: WorkUnit[];
  preferredBlockSize: number;
}

/**
 * Autonomiczny silnik układania planu lekcji z pełną obsługą grup, sal i nauczycieli wspomagających.
 */
export function runPlanGenerationAlgorithm(
  appState: AppState,
  options: PlanGeneratorOptions
): PlanGenerationResult {
  const pl = appState.planLekcji;
  const daysCount = 5; // Poniedziałek - Piątek (0..4)
  const maxHoursCount = pl.hours.length || 9;

  const teachersMap = new Map(pl.teachers.map(t => [t.id, t]));
  const subjectsMap = new Map(pl.subjects.map(s => [s.id, s]));
  const classesMap = new Map(pl.classes.map(c => [c.id, c]));
  const roomsMap = new Map((pl.rooms || []).map(r => [r.id, r]));

  const isINFSubject = (subjectId: string) => {
    const sub = subjectsMap.get(subjectId);
    if (!sub) return false;
    const name = (sub.name || '').toLowerCase();
    const short = (sub.short || '').toLowerCase();
    return (
      short.includes('inf') ||
      short.includes('e-inf') ||
      name.includes('informatyk') ||
      name.includes('edukacja informatyczna')
    );
  };

  const infLessonsCount = new Map<string, number>();

  const generatedLessons: Record<string, Lesson> = {};
  const generatedSpecialLessons: Record<string, SpecialLesson> = {};

  const warnings: string[] = [];
  const errors: string[] = [];

  // Nauczyciele zajęci w slocie: teacherId|day|hour (prowadzący oraz wspomagający)
  const teacherBusy = new Set<string>();
  // Uczniowie NI zajęci w slocie: studentId|day|hour
  const specialStudentBusy = new Set<string>();

  // ── MODEL ZAJĘTOŚCI KLAS Z PARTYCJAMI I UCZNIAMI (zgodny z conflictEngine) ──
  // classId|day|hour -> lista groupId (null oznacza całą klasę)
  const classSlotGroups = new Map<string, Array<string | null>>();
  // classAnyBusy: czy w danym slocie klasa ma jakiekolwiek lekcje (na potrzeby okienek uczniów)
  const classAnyBusy = new Set<string>();
  // Liczba lekcji danego przedmiotu w klasie/grupie w danym dniu: classId|groupKey|day|subjectId -> count
  const classSubjectDayCount = new Map<string, number>();

  const activeTeachers = pl.teachers.filter(t => !t.inactive);

  // ── MODEL ZAJĘTOŚCI SAL (roomBusy) ──
  // roomId|day|hour -> Array<{ assignmentId: string; classId: string }>
  const roomOccupancy = new Map<string, Array<{ assignmentId: string; classId: string }>>();

  const isClassSlotBusy = (
    classId: string,
    day: number,
    hour: number,
    groupId: string | null | undefined
  ): boolean => {
    const slotKey = `${classId}|${day}|${hour}`;
    const existingGroups = classSlotGroups.get(slotKey);
    if (!existingGroups || existingGroups.length === 0) return false;
    return existingGroups.some(existingGroupId =>
      groupsOverlap(existingGroupId, groupId ?? null, pl.schoolGroups)
    );
  };

  const markClassSlotBusy = (
    classId: string,
    day: number,
    hour: number,
    groupId: string | null | undefined
  ) => {
    const slotKey = `${classId}|${day}|${hour}`;
    classAnyBusy.add(slotKey);
    const list = classSlotGroups.get(slotKey) || [];
    list.push(groupId ?? null);
    classSlotGroups.set(slotKey, list);
  };

  const getSubjectDayKey = (classId: string, groupId: string | null | undefined, day: number, subjectId: string) =>
    `${classId}|${groupId ?? '__ALL__'}|${day}|${subjectId}`;

  const incrementClassSubjectDayCount = (
    classId: string,
    groupId: string | null | undefined,
    day: number,
    subjectId: string
  ) => {
    const key = getSubjectDayKey(classId, groupId, day, subjectId);
    classSubjectDayCount.set(key, (classSubjectDayCount.get(key) || 0) + 1);
  };

  const getExistingSubjectCountOnDay = (
    classId: string,
    groupId: string | null | undefined,
    day: number,
    subjectId: string
  ): number => {
    const direct = classSubjectDayCount.get(getSubjectDayKey(classId, groupId, day, subjectId)) || 0;
    if (!groupId) return direct;
    const wholeClass = classSubjectDayCount.get(getSubjectDayKey(classId, null, day, subjectId)) || 0;
    return direct + wholeClass;
  };

  const isRoomSlotBusy = (
    roomId: string | null | undefined,
    day: number,
    hour: number,
    assignmentId: string,
    classId: string
  ): boolean => {
    if (!roomId) return false;
    const slotKey = `${roomId}|${day}|${hour}`;
    const entries = roomOccupancy.get(slotKey);
    if (!entries || entries.length === 0) return false;

    const room = roomsMap.get(roomId);
    const isSport = isSportsFacility(room);
    const hasSingleClassLimit = room?.singleClassLimit === true;

    return entries.some(entry => {
      if (entry.assignmentId === assignmentId) return false; // ta sama łączona lekcja
      if (isSport) {
        if (!hasSingleClassLimit) return false; // brak limitu pojedynczej klasy -> wiele grup i klas dozwolone
        if (entry.classId === classId) return false; // limit jednej klasy -> dopuszcza grupy tej samej klasy
        return true; // inna klasa w sali gimnastycznej z limitem jednej klasy
      }
      return true; // zwykła sala -> zajęta przez inny przydział
    });
  };

  const markRoomSlotBusy = (
    roomId: string | null | undefined,
    day: number,
    hour: number,
    assignmentId: string,
    classId: string
  ) => {
    if (!roomId) return;
    const slotKey = `${roomId}|${day}|${hour}`;
    const list = roomOccupancy.get(slotKey) || [];
    list.push({ assignmentId, classId });
    roomOccupancy.set(slotKey, list);
  };

  // Funkcja pomocnicza wyznaczająca wszystkie cele (klasa + grupa) dla przydziału z uwzględnieniem grup międzyoddziałowych
  const getTargetsForAsgOrUnit = (
    mainClassId: string,
    mainGroupId: string | null,
    linkedClassIds: string[] = [],
    linkedGroupIds: string[] = []
  ): { classId: string; groupId: string | null }[] => {
    const targets: { classId: string; groupId: string | null }[] = [
      { classId: mainClassId, groupId: mainGroupId }
    ];

    if (linkedGroupIds && linkedGroupIds.length > 0) {
      linkedGroupIds.forEach(lgId => {
        const grp = pl.schoolGroups?.find(g => g.id === lgId);
        const grpClsId = grp?.classId || linkedClassIds[0] || mainClassId;
        if (!targets.some(t => t.classId === grpClsId && t.groupId === lgId)) {
          targets.push({ classId: grpClsId, groupId: lgId });
        }
      });
    }

    if (linkedClassIds && linkedClassIds.length > 0) {
      linkedClassIds.forEach(lcId => {
        if (!targets.some(t => t.classId === lcId)) {
          targets.push({ classId: lcId, groupId: mainGroupId });
        }
      });
    }

    return targets;
  };

  // 1. Kopiowanie i rejestracja zablokowanych lekcji (oraz opcjonalnie ręcznych lekcji niezablokowanych) z usunięciem osieroconych lekcji bez przydziału
  Object.entries(pl.lessons || {}).forEach(([key, value]) => {
    if (!value) return;
    if (!value.locked && !options.preserveUnlockedManualLessons) return;

    const asg = pl.assignments.find(a => a.id === value.assignmentId);
    if (!asg) {
      warnings.push(
        `Usunięto ${value.locked ? 'zablokowaną' : 'ręczną'} lekcję (${key}), ponieważ powiązany przydział (${value.assignmentId}) nie istnieje.`
      );
      return;
    }

    generatedLessons[key] = { ...value };
    const parts = key.split('|');
    const classId = parts[0];
    const day = parseInt(parts[1], 10);
    const hour = parseInt(parts[2], 10);
    const keyGroupId = parts.length >= 4 ? parts[3] : null;
    const effectiveGroupId = keyGroupId || asg.groupId || null;

    const targetList = getTargetsForAsgOrUnit(
      classId,
      effectiveGroupId,
      asg.linkedClassIds || [],
      asg.linkedGroupIds || []
    );
    targetList.forEach(tgt => {
      markClassSlotBusy(tgt.classId, day, hour, tgt.groupId);
      incrementClassSubjectDayCount(tgt.classId, tgt.groupId, day, asg.subjectId);
      if (asg.roomId) {
        markRoomSlotBusy(asg.roomId, day, hour, asg.id, tgt.classId);
      }
    });

    if (asg.teacherId) {
      teacherBusy.add(`${asg.teacherId}|${day}|${hour}`);
    }
    const supTeacherId = value.supportTeacherId || asg.supportTeacherId;
    if (supTeacherId) {
      teacherBusy.add(`${supTeacherId}|${day}|${hour}`);
    }
    if (isINFSubject(asg.subjectId)) {
      const slotKey = `${day}|${hour}`;
      infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
    }
  });

  // Kopiowanie zablokowanych (oraz opcjonalnie ręcznych niezablokowanych) lekcji specjalnych (Nauczanie Indywidualne)
  Object.entries(pl.specialLessons || {}).forEach(([key, value]) => {
    if (!value) return;
    if (!value.locked && !options.preserveUnlockedManualLessons) return;

    const spAsg = (pl.specialAssignments || []).find(sa => sa.id === value.assignmentId);
    if (!spAsg) {
      warnings.push(
        `Usunięto ${value.locked ? 'zablokowane' : 'ręczne'} zajęcia indywidualne (${key}), ponieważ powiązany przydział (${value.assignmentId}) nie istnieje.`
      );
      return;
    }

    generatedSpecialLessons[key] = { ...value };
    const parts = key.split('|');
    if (parts.length >= 3) {
      const studentId = parts[0];
      const day = parseInt(parts[1], 10);
      const hour = parseInt(parts[2], 10);
      specialStudentBusy.add(`${studentId}|${day}|${hour}`);

      if (spAsg.teacherId) {
        teacherBusy.add(`${spAsg.teacherId}|${day}|${hour}`);
      }
      if (spAsg.supportTeacherId) {
        teacherBusy.add(`${spAsg.supportTeacherId}|${day}|${hour}`);
      }
      if (spAsg.roomId) {
        markRoomSlotBusy(spAsg.roomId, day, hour, spAsg.id, `special-${studentId}`);
      }
    }
  });

  // 2. Przygotowanie jednostek roboczych (WorkUnit) oraz docelowej sumy godzin regularnych
  const rawUnits: WorkUnit[] = [];
  let totalRegularTarget = 0;

  pl.assignments.forEach(asg => {
    const keptCount = Object.entries(generatedLessons).filter(([k, l]) => {
      if (l.assignmentId !== asg.id) return false;
      const parts = k.split('|');
      return parts[0] === asg.classId;
    }).length;

    const remainingHours = Math.max(0, asg.hoursPerWeek - keptCount);
    totalRegularTarget += remainingHours;
    const blockPrefer = asg.preferredBlockSize || (options.allowDoubleBlocks ? 2 : 1);

    for (let i = 0; i < remainingHours; i++) {
      rawUnits.push({
        assignmentId: asg.id,
        classId: asg.classId,
        linkedClassIds: asg.linkedClassIds || [],
        linkedGroupIds: asg.linkedGroupIds || [],
        teacherId: asg.teacherId,
        supportTeacherId: asg.supportTeacherId || null,
        subjectId: asg.subjectId,
        groupId: asg.groupId || null,
        roomId: asg.roomId || null,
        preferredBlockSize: blockPrefer
      });
    }
  });

  // 3. Łączenie jednostek w wiązki równoległe (WorkBundle):
  // Jednostki z tym samym classId, godzinami i różnymi nauczycielami i grupami staramy się układać równolegle.
  const bundles: WorkBundle[] = [];
  const unitsByClass = new Map<string, WorkUnit[]>();

  rawUnits.forEach(u => {
    const list = unitsByClass.get(u.classId) || [];
    list.push(u);
    unitsByClass.set(u.classId, list);
  });

  unitsByClass.forEach((classUnits, classId) => {
    const wholeClassUnits: WorkUnit[] = [];
    const groupUnitsByGroupId = new Map<string, WorkUnit[]>();

    classUnits.forEach(u => {
      if (!u.groupId) {
        wholeClassUnits.push(u);
      } else {
        const list = groupUnitsByGroupId.get(u.groupId) || [];
        list.push(u);
        groupUnitsByGroupId.set(u.groupId, list);
      }
    });

    // Lekcje całej klasy tworzą pojedyncze wiązki
    wholeClassUnits.forEach(u => {
      bundles.push({
        classId: u.classId,
        linkedClassIds: u.linkedClassIds,
        units: [u],
        preferredBlockSize: u.preferredBlockSize
      });
    });

    // Lekcje grupowe: łączymy w pary/trójki równoległe dla różnych grup i różnych nauczycieli
    const groupKeys = Array.from(groupUnitsByGroupId.keys());

    while (true) {
      // Wybierz grupy, które mają jeszcze wolne jednostki
      const availableGroups = groupKeys.filter(gId => (groupUnitsByGroupId.get(gId)?.length || 0) > 0);
      if (availableGroups.length < 2) {
        // Mniej niż 2 grupy -> pozostałe jednostki idą jako pojedyncze wiązki
        availableGroups.forEach(gId => {
          const remaining = groupUnitsByGroupId.get(gId) || [];
          remaining.forEach(u => {
            bundles.push({
              classId: u.classId,
              linkedClassIds: u.linkedClassIds,
              units: [u],
              preferredBlockSize: u.preferredBlockSize
            });
          });
          groupUnitsByGroupId.set(gId, []);
        });
        break;
      }

      // Weź po 1 jednostce z grup, upewniając się o braku kolizji wewnętrznych (różni nauczyciele, kompatybilne sale)
      const bundledUnits: WorkUnit[] = [];
      const usedTeachers = new Set<string>();
      const usedSupportTeachers = new Set<string>();

      for (const gId of availableGroups) {
        const pool = groupUnitsByGroupId.get(gId) || [];
        if (pool.length === 0) continue;

        // Szukamy w pool jednostki, która nie koliduje z dotychczas dobranymi w wiązce (partitionId/studentIds, nauczyciele, sale)
        const candidateIdx = pool.findIndex(cand => {
          if (cand.teacherId && usedTeachers.has(cand.teacherId)) return false;
          if (cand.supportTeacherId && usedSupportTeachers.has(cand.supportTeacherId)) return false;
          for (const already of bundledUnits) {
            if (groupsOverlap(already.groupId, cand.groupId, pl.schoolGroups)) return false;
            if (already.roomId && cand.roomId && already.roomId === cand.roomId) {
              const r = roomsMap.get(already.roomId);
              if (!isSportsFacility(r)) return false; // zwykła sala nie mieści równolegle dwóch grup
            }
          }
          return true;
        });

        if (candidateIdx !== -1) {
          const [selected] = pool.splice(candidateIdx, 1);
          bundledUnits.push(selected);
          if (selected.teacherId) usedTeachers.add(selected.teacherId);
          if (selected.supportTeacherId) usedSupportTeachers.add(selected.supportTeacherId);
        }
      }

      if (bundledUnits.length > 0) {
        bundles.push({
          classId,
          linkedClassIds: bundledUnits[0].linkedClassIds,
          units: bundledUnits,
          preferredBlockSize: Math.max(...bundledUnits.map(u => u.preferredBlockSize))
        });
      } else {
        // Brak kompatybilnych par - opróżnij pierwszą grupę pojedynczo
        const firstGroup = availableGroups[0];
        const [singleUnit] = (groupUnitsByGroupId.get(firstGroup) || []).splice(0, 1);
        if (singleUnit) {
          bundles.push({
            classId,
            linkedClassIds: singleUnit.linkedClassIds,
            units: [singleUnit],
            preferredBlockSize: singleUnit.preferredBlockSize
          });
        }
      }
    }
  });

  // Sortowanie heurystyczne wiązek (trudniejsze / wielogrupowe na początku)
  const getTeacherDifficulty = (teacherId: string | null) => {
    if (!teacherId) return 0;
    const t = teachersMap.get(teacherId);
    const config = options.teacherConfigs?.[teacherId];
    const availabilityCount = t?.availability?.length || 45;
    const totalHours = pl.assignments
      .filter(a => a.teacherId === teacherId)
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);

    let score = totalHours * 10 - availabilityCount * 2;
    if (config) {
      if (config.role === 'director') score += 20;
      if (config.role === 'deputy') score += 15;
    }
    return score;
  };

  bundles.sort((a, b) => {
    // Wiązki równoległe (wiele grup) mają priorytet wcześniejszego ułożenia
    const sizeDiff = b.units.length - a.units.length;
    if (sizeDiff !== 0) return sizeDiff;

    const diffA = a.units.reduce((acc, u) => acc + getTeacherDifficulty(u.teacherId), 0);
    const diffB = b.units.reduce((acc, u) => acc + getTeacherDifficulty(u.teacherId), 0);
    return diffB - diffA;
  });

  // Wyznaczenie docelowej liczby dni obecności (spreadObligation) dla każdego nauczyciela
  const teacherTargetSpreadDays = new Map<string, number>();
  pl.teachers.forEach(t => {
    const regularHours = pl.assignments
      .filter(a => a.teacherId === t.id || a.supportTeacherId === t.id)
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);
    const specialHours = options.includeSpecialNI
      ? (pl.specialAssignments || [])
          .filter(sa => !sa.withClass && (sa.teacherId === t.id || sa.supportTeacherId === t.id))
          .reduce((sum, sa) => sum + sa.hoursPerWeek, 0)
      : 0;
    const totalHours = regularHours + specialHours;

    let availableDays = 0;
    for (let d = 0; d < daysCount; d++) {
      let anyHourAvail = false;
      for (let h = 0; h < maxHoursCount; h++) {
        if (!options.obeyAvailability || isTeacherAvailableAt(t, d, h, pl.hours)) {
          anyHourAvail = true;
          break;
        }
      }
      if (anyHourAvail) availableDays++;
    }
    teacherTargetSpreadDays.set(t.id, Math.min(daysCount, totalHours, availableDays));
  });

  const computeTeacherGaps = (
    teacherId: string,
    extraDay?: number,
    extraHours: number[] = []
  ): { totalGaps: number; distinctDays: number; busyOnExtraDay: boolean } => {
    let totalGaps = 0;
    let distinctDays = 0;
    let busyOnExtraDay = false;

    for (let d = 0; d < daysCount; d++) {
      let minH = 99;
      let maxH = -1;
      let count = 0;
      let existingOnDay = false;

      for (let h = 0; h < maxHoursCount; h++) {
        const isExisting = teacherBusy.has(`${teacherId}|${d}|${h}`);
        const isExtra = extraDay === d && extraHours.includes(h);
        if (isExisting) existingOnDay = true;
        if (isExisting || isExtra) {
          minH = Math.min(minH, h);
          maxH = Math.max(maxH, h);
          count++;
        }
      }

      if (count > 0) {
        distinctDays++;
        if (count > 1) {
          totalGaps += (maxH - minH + 1) - count;
        }
      }
      if (extraDay === d && existingOnDay) {
        busyOnExtraDay = true;
      }
    }

    return { totalGaps, distinctDays, busyOnExtraDay };
  };

  // Ocena slotu dla wiązki jednostek
  const scoreBundleSlot = (
    bundle: WorkBundle,
    day: number,
    hour: number,
    isDouble: boolean,
    extraOnSameDayForBundle = false
  ): number => {
    let score = 1000 * bundle.units.length;

    // 1. TWARDE OGRANICZENIA: kolizje klas, nauczycieli, sal, pracowni, rezerwy zastępstw oraz >3 lekcji przedmiotu dziennie
    let infNeeded = 0;
    const bundleTeacherIds = new Set<string>();

    // Weryfikacja braku kolizji wewnętrznych w samej wiązce (np. grupy z różnych partycji lub współdzielone cele międzyoddziałowe)
    for (let i = 0; i < bundle.units.length; i++) {
      for (let j = i + 1; j < bundle.units.length; j++) {
        const uA = bundle.units[i];
        const uB = bundle.units[j];
        const targetsA = getTargetsForAsgOrUnit(uA.classId, uA.groupId, uA.linkedClassIds, uA.linkedGroupIds);
        const targetsB = getTargetsForAsgOrUnit(uB.classId, uB.groupId, uB.linkedClassIds, uB.linkedGroupIds);
        for (const tA of targetsA) {
          for (const tB of targetsB) {
            if (tA.classId === tB.classId && uA.assignmentId !== uB.assignmentId) {
              if (groupsOverlap(tA.groupId, tB.groupId, pl.schoolGroups)) {
                return -1;
              }
            }
          }
        }
      }
    }

    const dailySubjectAddition = extraOnSameDayForBundle ? 2 : 1;
    let maxProjectedSameSubject = 0;
    let hasNewDayForSubject = false;
    let hasRepeatedSubjectNonDouble = false;

    for (const unit of bundle.units) {
      const targets = getTargetsForAsgOrUnit(
        unit.classId,
        unit.groupId,
        unit.linkedClassIds,
        unit.linkedGroupIds
      );
      for (const tgt of targets) {
        if (isClassSlotBusy(tgt.classId, day, hour, tgt.groupId)) {
          return -1;
        }
        const existingSubjCount = getExistingSubjectCountOnDay(tgt.classId, tgt.groupId, day, unit.subjectId);
        const projectedSubjCount = existingSubjCount + dailySubjectAddition;
        if (projectedSubjCount > 3) {
          return -1; // Twardy limit: max 3 lekcje tego samego przedmiotu dziennie w klasie/grupie
        }
        if (projectedSubjCount > maxProjectedSameSubject) {
          maxProjectedSameSubject = projectedSubjCount;
        }
        if (existingSubjCount === 0) {
          hasNewDayForSubject = true;
        } else if (!isDouble) {
          hasRepeatedSubjectNonDouble = true;
        }
      }

      // Nauczyciel prowadzący
      if (unit.teacherId) {
        bundleTeacherIds.add(unit.teacherId);
        if (teacherBusy.has(`${unit.teacherId}|${day}|${hour}`)) return -1;
        if (options.obeyAvailability) {
          const t = teachersMap.get(unit.teacherId);
          if (!isTeacherAvailableAt(t, day, hour, pl.hours)) {
            return -1;
          }
        }
      }

      // Nauczyciel wspomagający (supportTeacherId w teacherBusy)
      if (unit.supportTeacherId) {
        bundleTeacherIds.add(unit.supportTeacherId);
        if (teacherBusy.has(`${unit.supportTeacherId}|${day}|${hour}`)) return -1;
        if (options.obeyAvailability) {
          const st = teachersMap.get(unit.supportTeacherId);
          if (!isTeacherAvailableAt(st, day, hour, pl.hours)) {
            return -1;
          }
        }
      }

      // Sala lekcyjna (roomBusy z wyjątkami dla sal sportowych)
      if (unit.roomId) {
        for (const tgt of targets) {
          if (isRoomSlotBusy(unit.roomId, day, hour, unit.assignmentId, tgt.classId)) {
            return -1;
          }
        }
      }

      if (isINFSubject(unit.subjectId)) {
        infNeeded++;
      }
    }

    if (options.limitComputerLabs && infNeeded > 0) {
      const currentCount = infLessonsCount.get(`${day}|${hour}`) || 0;
      if (currentCount + infNeeded > options.customComputerLabsCount) {
        return -1;
      }
    }

    // Rezerwa na zastępstwa doraźne (nie zajmuj slotu, jeśli zostałoby mniej wolnych nauczycieli niż próg)
    if (options.minAvailableSubstitutionTeachersPerSlot > 0) {
      let freeSubstitutesAfter = 0;
      for (const t of activeTeachers) {
        if (bundleTeacherIds.has(t.id)) continue;
        if (teacherBusy.has(`${t.id}|${day}|${hour}`)) continue;
        if (options.obeyAvailability && !isTeacherAvailableAt(t, day, hour, pl.hours)) continue;
        freeSubstitutesAfter++;
      }
      if (freeSubstitutesAfter < options.minAvailableSubstitutionTeachersPerSlot) {
        return -1;
      }
    }

    // 2. MIĘKKIE KRYTERIA, LIMITY OKIENEK, ROZKŁAD DNIOWY I BONUSY HEURYSTYCZNE
    // Reguła rozkładu przedmiotu: kara za >2 lekcje tego samego przedmiotu dziennie (twarda >3 powyżej), bonus za różne dni
    if (maxProjectedSameSubject > 2) {
      score -= 8000 * bundle.units.length;
    } else if (hasNewDayForSubject) {
      score += 700;
    } else if (hasRepeatedSubjectNonDouble) {
      score -= 250;
    }

    // Limit okienek nauczyciela (maxGapsPerTeacher / teacherConfigs[*].maxGaps) oraz spreadObligation
    const extraHoursForTeacher = extraOnSameDayForBundle && hour > 0 ? [hour - 1, hour] : [hour];
    for (const tId of bundleTeacherIds) {
      const tConfig = options.teacherConfigs?.[tId];
      const allowedGaps = tConfig?.maxGaps ?? options.maxGapsPerTeacher;
      const beforeStats = computeTeacherGaps(tId);
      const afterStats = computeTeacherGaps(tId, day, extraHoursForTeacher);

      if (afterStats.totalGaps > allowedGaps) {
        // Silna kara spychająca slot poniżej zera -> twarda blokada w głównym przebiegu, możliwy fallback
        score -= 8000 * bundle.units.length * (afterStats.totalGaps - allowedGaps);
      } else if (afterStats.totalGaps < beforeStats.totalGaps) {
        score += 1400 * (beforeStats.totalGaps - afterStats.totalGaps);
      } else if (afterStats.totalGaps > beforeStats.totalGaps) {
        score -= 50 * (afterStats.totalGaps - beforeStats.totalGaps);
      }

      if (tConfig?.spreadObligation) {
        const targetDays = teacherTargetSpreadDays.get(tId) || 0;
        if (beforeStats.distinctDays < targetDays) {
          if (!afterStats.busyOnExtraDay) {
            score += 3000;
          } else {
            score -= 600;
          }
        }
      }
    }

    // Ogromny bonus za równoległe ułożenie grup w wiązce
    if (bundle.units.length >= 2) {
      score += 2500 * (bundle.units.length - 1);
    }

    // Dla pojedynczej grupy: silny bonus, jeśli inna grupa tej klasy już ma lekcję w tym slocie
    if (bundle.units.length === 1 && bundle.units[0].groupId) {
      const u = bundle.units[0];
      const gId = u.groupId;
      if (gId) {
        const hasOtherGroupInSlot = groupKeysInSlot(u.classId, day, hour, gId);
        if (hasOtherGroupInSlot) {
          score += 3500; // silne przyciąganie pojedynczych grup do równoległości
        }
      }
    }

    // Przedmioty opcjonalne na skrajach dnia klasy (forceOptionalToExtremes)
    const isAnyOptional = bundle.units.some(
      u => options.forceOptionalToExtremes && options.optionalSubjectIds.includes(u.subjectId)
    );
    if (isAnyOptional) {
      let dayMin = 99;
      let dayMax = -1;
      for (let h = 0; h < maxHoursCount; h++) {
        if (classAnyBusy.has(`${bundle.classId}|${day}|${h}`)) {
          dayMin = Math.min(dayMin, h);
          dayMax = Math.max(dayMax, h);
        }
      }
      if (hour === 0 || hour >= 6 || (dayMax !== -1 && (hour <= dayMin || hour >= dayMax))) {
        score += 450;
      }
    }

    // Unikanie skrajności (avoidExtremes) — kara wyłącznie dla przedmiotów wskazanych w avoidExtremesSubjectIds
    if (options.avoidExtremes && options.avoidExtremesSubjectIds.length > 0) {
      const hasAvoidExtremesSubject = bundle.units.some(
        u =>
          options.avoidExtremesSubjectIds.includes(u.subjectId) &&
          !(options.forceOptionalToExtremes && options.optionalSubjectIds.includes(u.subjectId))
      );
      if (hasAvoidExtremesSubject) {
        if (hour === 0) score -= 400;
        if (hour >= 6) score -= (hour - 5) * 120;
      }
    }

    // Spójność planu uczniów (noStudentGaps)
    if (options.noStudentGaps) {
      let dayMin = 99;
      let dayMax = -1;
      for (let h = 0; h < maxHoursCount; h++) {
        if (classAnyBusy.has(`${bundle.classId}|${day}|${h}`)) {
          dayMin = Math.min(dayMin, h);
          dayMax = Math.max(dayMax, h);
        }
      }

      if (dayMax !== -1) {
        if (hour >= dayMin - 1 && hour <= dayMax + 1) {
          score += 500;
          if (hour >= dayMin && hour <= dayMax) score += 400; // wypełnianie okienka
        } else {
          score -= 300; // izolowana lekcja
        }
      } else {
        if (hour === 1 || hour === 2) score += 200;
      }
    }

    // Preferencja bloków podwójnych dla tego samego przedmiotu
    if (isDouble) {
      score += 200;
    }

    return score;
  };

  const groupKeysInSlot = (classId: string, day: number, hour: number, currentGroupId: string): boolean => {
    // Sprawdza czy w danym slocie inna niekolizyjna grupa tej klasy ma lekcję
    const existing = classSlotGroups.get(`${classId}|${day}|${hour}`);
    if (!existing || existing.length === 0) return false;
    return existing.some(
      gId => gId !== null && gId !== currentGroupId && !groupsOverlap(gId, currentGroupId, pl.schoolGroups)
    );
  };

  const placeBundleAtSlot = (bundle: WorkBundle, day: number, hour: number) => {
    bundle.units.forEach(unit => {
      const targets = getTargetsForAsgOrUnit(
        unit.classId,
        unit.groupId,
        unit.linkedClassIds,
        unit.linkedGroupIds
      );
      targets.forEach(tgt => {
        // Zapisuj klucz klasa|dzień|godzina|groupId dla przydziałów z groupId
        const key = tgt.groupId ? `${tgt.classId}|${day}|${hour}|${tgt.groupId}` : `${tgt.classId}|${day}|${hour}`;
        generatedLessons[key] = {
          assignmentId: unit.assignmentId,
          locked: false,
          ...(unit.supportTeacherId ? { supportTeacherId: unit.supportTeacherId } : {})
        };
        markClassSlotBusy(tgt.classId, day, hour, tgt.groupId);
        incrementClassSubjectDayCount(tgt.classId, tgt.groupId, day, unit.subjectId);
        if (unit.roomId) {
          markRoomSlotBusy(unit.roomId, day, hour, unit.assignmentId, tgt.classId);
        }
      });

      if (unit.teacherId) {
        teacherBusy.add(`${unit.teacherId}|${day}|${hour}`);
      }
      if (unit.supportTeacherId) {
        teacherBusy.add(`${unit.supportTeacherId}|${day}|${hour}`);
      }
      if (isINFSubject(unit.subjectId)) {
        const slotKey = `${day}|${hour}`;
        infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
      }
    });
  };

  // 4. Główna pętla rozmieszczania wiązek
  let placedRegularCount = 0;

  let bIdx = 0;
  while (bIdx < bundles.length) {
    const bundle = bundles[bIdx];
    let placed = false;
    let bestScore = -99999;
    let bestDay = -1;
    let bestHour = -1;
    let isBlock = false;

    // Szukanie kolejnej wiązki do bloku 2-godzinnego
    const findNextMatchingBundleIdx = () => {
      if (!options.allowDoubleBlocks || bundle.preferredBlockSize < 2) return -1;
      for (let k = bIdx + 1; k < bundles.length; k++) {
        const other = bundles[k];
        if (
          other.classId === bundle.classId &&
          other.units.length === bundle.units.length &&
          other.units.every((u, i) => u.assignmentId === bundle.units[i].assignmentId)
        ) {
          return k;
        }
      }
      return -1;
    };

    const nextBundleMatchIdx = findNextMatchingBundleIdx();
    const shouldTryBlock = nextBundleMatchIdx !== -1;

    if (shouldTryBlock) {
      for (let d = 0; d < daysCount; d++) {
        for (let h = 0; h < maxHoursCount - 1; h++) {
          const s1 = scoreBundleSlot(bundle, d, h, true, false);
          const s2 = scoreBundleSlot(bundle, d, h + 1, true, true);
          if (s1 > 0 && s2 > 0) {
            const combined = s1 + s2;
            if (combined > bestScore) {
              bestScore = combined;
              bestDay = d;
              bestHour = h;
              isBlock = true;
            }
          }
        }
      }
    }

    if (bestHour === -1) {
      isBlock = false;
      for (let d = 0; d < daysCount; d++) {
        for (let h = 0; h < maxHoursCount; h++) {
          const s = scoreBundleSlot(bundle, d, h, false, false);
          if (s > bestScore && s > 0) {
            bestScore = s;
            bestDay = d;
            bestHour = h;
          }
        }
      }
    }

    if (bestHour !== -1) {
      if (isBlock && nextBundleMatchIdx !== -1) {
        const secondBundle = bundles[nextBundleMatchIdx];
        placeBundleAtSlot(bundle, bestDay, bestHour);
        placeBundleAtSlot(secondBundle, bestDay, bestHour + 1);
        bundles.splice(nextBundleMatchIdx, 1);
        placedRegularCount += bundle.units.length + secondBundle.units.length;
      } else {
        placeBundleAtSlot(bundle, bestDay, bestHour);
        placedRegularCount += bundle.units.length;
      }
      placed = true;
    }

    if (!placed) {
      // Fallback: szukanie wolnego slotu bez twardych kolizji (najwyżej oceniony spośród slotów !== -1)
      let fallbackPlaced = false;
      let bestFallbackScore = -Infinity;
      let bestFallbackDay = -1;
      let bestFallbackHour = -1;

      for (let d = 0; d < daysCount; d++) {
        for (let h = 0; h < maxHoursCount; h++) {
          const s = scoreBundleSlot(bundle, d, h, false, false);
          if (s !== -1 && s > bestFallbackScore) {
            bestFallbackScore = s;
            bestFallbackDay = d;
            bestFallbackHour = h;
          }
        }
      }

      if (bestFallbackDay !== -1) {
        placeBundleAtSlot(bundle, bestFallbackDay, bestFallbackHour);
        placedRegularCount += bundle.units.length;
        fallbackPlaced = true;
      }

      if (!fallbackPlaced) {
        // W ostateczności rozbijamy wiązkę na pojedyncze jednostki
        bundle.units.forEach(unit => {
          let singlePlaced = false;
          const singleBundle: WorkBundle = {
            classId: unit.classId,
            linkedClassIds: unit.linkedClassIds,
            units: [unit],
            preferredBlockSize: 1
          };

          let bestSingleScore = -Infinity;
          let bestSingleDay = -1;
          let bestSingleHour = -1;

          for (let d = 0; d < daysCount; d++) {
            for (let h = 0; h < maxHoursCount; h++) {
              const s = scoreBundleSlot(singleBundle, d, h, false, false);
              if (s !== -1 && s > bestSingleScore) {
                bestSingleScore = s;
                bestSingleDay = d;
                bestSingleHour = h;
              }
            }
          }

          if (bestSingleDay !== -1) {
            placeBundleAtSlot(singleBundle, bestSingleDay, bestSingleHour);
            placedRegularCount += 1;
            singlePlaced = true;
          }

          if (!singlePlaced) {
            const subj = subjectsMap.get(unit.subjectId);
            const cls = classesMap.get(unit.classId);
            const teacher = unit.teacherId ? teachersMap.get(unit.teacherId) : null;
            warnings.push(
              `Nie udało się dopasować godziny przedmiotu: "${subj?.name || 'Przedmiot'}" dla klasy ${cls?.name || 'Klasa'}${unit.groupId ? ` (gr. ${unit.groupId})` : ''} (Nauczyciel: ${teacher ? teacher.abbr : 'Brak'}).`
            );
          }
        });
      }
    }

    bIdx++;
  }

  // 5. Nauczanie Indywidualne (SpecialNI)
  let placedSpecialCount = 0;
  let totalSpecialCount = 0;

  if (options.includeSpecialNI) {
    interface SpecialWorkUnit {
      specialAsg: SpecialAssignment;
      studentId: string;
      teacherId: string | null;
      supportTeacherId: string | null;
      roomId: string | null;
      subjectId: string;
    }

    const specialUnits: SpecialWorkUnit[] = [];
    (pl.specialAssignments || []).forEach(sa => {
      if (!sa.withClass) {
        const keptSpecialCount = Object.values(generatedSpecialLessons).filter(
          sl => sl.assignmentId === sa.id
        ).length;
        const remainingSpecialHours = Math.max(0, sa.hoursPerWeek - keptSpecialCount);
        totalSpecialCount += remainingSpecialHours;
        for (let i = 0; i < remainingSpecialHours; i++) {
          specialUnits.push({
            specialAsg: sa,
            studentId: sa.studentId,
            teacherId: sa.teacherId,
            supportTeacherId: sa.supportTeacherId || null,
            roomId: sa.roomId || null,
            subjectId: sa.subjectId
          });
        }
      }
    });

    specialUnits.forEach(unit => {
      let placedSp = false;

      for (let d = 0; d < daysCount; d++) {
        for (let h = 0; h < maxHoursCount; h++) {
          if (specialStudentBusy.has(`${unit.studentId}|${d}|${h}`)) continue;
          if (unit.teacherId && teacherBusy.has(`${unit.teacherId}|${d}|${h}`)) continue;
          if (unit.supportTeacherId && teacherBusy.has(`${unit.supportTeacherId}|${d}|${h}`)) continue;

          if (options.obeyAvailability && unit.teacherId) {
            const t = teachersMap.get(unit.teacherId);
            if (!isTeacherAvailableAt(t, d, h, pl.hours)) continue;
          }
          if (options.obeyAvailability && unit.supportTeacherId) {
            const st = teachersMap.get(unit.supportTeacherId);
            if (!isTeacherAvailableAt(st, d, h, pl.hours)) continue;
          }

          if (unit.roomId && isRoomSlotBusy(unit.roomId, d, h, unit.specialAsg.id, `special-${unit.studentId}`)) {
            continue;
          }

          if (options.minAvailableSubstitutionTeachersPerSlot > 0) {
            let freeSubstitutesAfter = 0;
            for (const t of activeTeachers) {
              if (t.id === unit.teacherId || t.id === unit.supportTeacherId) continue;
              if (teacherBusy.has(`${t.id}|${d}|${h}`)) continue;
              if (options.obeyAvailability && !isTeacherAvailableAt(t, d, h, pl.hours)) continue;
              freeSubstitutesAfter++;
            }
            if (freeSubstitutesAfter < options.minAvailableSubstitutionTeachersPerSlot) {
              continue;
            }
          }

          const specKey = `${unit.studentId}|${d}|${h}|${unit.specialAsg.id}`;
          generatedSpecialLessons[specKey] = { assignmentId: unit.specialAsg.id };
          specialStudentBusy.add(`${unit.studentId}|${d}|${h}`);
          if (unit.teacherId) teacherBusy.add(`${unit.teacherId}|${d}|${h}`);
          if (unit.supportTeacherId) teacherBusy.add(`${unit.supportTeacherId}|${d}|${h}`);
          if (unit.roomId) markRoomSlotBusy(unit.roomId, d, h, unit.specialAsg.id, `special-${unit.studentId}`);

          placedSpecialCount++;
          placedSp = true;
          break;
        }
        if (placedSp) break;
      }

      if (!placedSp) {
        const stud = (pl.specialStudents || []).find(s => s.id === unit.studentId);
        const subj = subjectsMap.get(unit.subjectId);
        warnings.push(
          `Zajęcia indywidualne: "${subj?.name || 'Zajęcie'}" dla ucznia ${stud ? `${stud.lastName} ${stud.firstName}` : 'Uczeń'} nie zmieściły się w żadnym wolnym slocie.`
        );
      }
    });
  }

  // Po generowaniu: usuń ewentualne lekcje (w tym zablokowane) z nieistniejącym assignmentId i zgłoś ostrzeżenie
  const validAssignmentIds = new Set(pl.assignments.map(a => a.id));
  const validSpecialAssignmentIds = new Set((pl.specialAssignments || []).map(sa => sa.id));

  Object.keys(generatedLessons).forEach(key => {
    const lesson = generatedLessons[key];
    if (!lesson || !validAssignmentIds.has(lesson.assignmentId)) {
      delete generatedLessons[key];
      warnings.push(
        `Po generowaniu usunięto lekcję (${key}) z nieistniejącym przydziałem (${lesson?.assignmentId || 'brak'}).`
      );
    }
  });

  Object.keys(generatedSpecialLessons).forEach(key => {
    const spLesson = generatedSpecialLessons[key];
    if (!spLesson || !validSpecialAssignmentIds.has(spLesson.assignmentId)) {
      delete generatedSpecialLessons[key];
      warnings.push(
        `Po generowaniu usunięto zajęcia indywidualne (${key}) z nieistniejącym przydziałem (${spLesson?.assignmentId || 'brak'}).`
      );
    }
  });

  // Kontrola końcowa wygenerowanego planu za pomocą silnika conflictEngine
  const finalPlanState: PlanLekcjiState = {
    ...pl,
    lessons: generatedLessons,
    specialLessons: generatedSpecialLessons
  };
  const detectedConflicts = detectConflicts(finalPlanState);

  const unplacedRegular = Math.max(0, totalRegularTarget - placedRegularCount);
  const unplacedSpecial = Math.max(0, totalSpecialCount - placedSpecialCount);
  const hasUnplacedHours = unplacedRegular > 0 || unplacedSpecial > 0;

  return {
    success: !hasUnplacedHours && detectedConflicts.length === 0 && errors.length === 0,
    placedRegular: placedRegularCount,
    totalRegular: totalRegularTarget,
    placedSpecial: placedSpecialCount,
    totalSpecial: totalSpecialCount,
    errors,
    warnings,
    conflicts: detectedConflicts,
    updatedLessons: generatedLessons,
    updatedSpecialLessons: generatedSpecialLessons
  };
}

export default function PlanGenerator({ appState, onChangeAppState, onClose }: PlanGeneratorProps) {
  const pl = appState.planLekcji;

  // ── GENERATOR OPTIONS STATED BY USER ──
  const [maxGapsPerTeacher, setMaxGapsPerTeacher] = useState<number>(() => appState.generatorSettings?.maxGapsPerTeacher ?? 2);
  const [obeyAvailability, setObeyAvailability] = useState<boolean>(() => appState.generatorSettings?.obeyAvailability ?? true);
  const [avoidExtremes, setAvoidExtremes] = useState<boolean>(() => appState.generatorSettings?.avoidExtremes ?? true);
  const [avoidExtremesSubjectIds, setAvoidExtremesSubjectIds] = useState<string[]>(() => appState.generatorSettings?.avoidExtremesSubjectIds ?? []);
  const [noStudentGaps, setNoStudentGaps] = useState<boolean>(() => appState.generatorSettings?.noStudentGaps ?? true);
  const [allowDoubleBlocks, setAllowDoubleBlocks] = useState<boolean>(() => appState.generatorSettings?.allowDoubleBlocks ?? true);
  const [includeSpecialNI, setIncludeSpecialNI] = useState<boolean>(() => appState.generatorSettings?.includeSpecialNI ?? true);
  const [limitComputerLabs, setLimitComputerLabs] = useState<boolean>(() => appState.generatorSettings?.limitComputerLabs ?? true);
  const [customComputerLabsCount, setCustomComputerLabsCount] = useState<number>(() => {
    if (appState.generatorSettings?.customComputerLabsCount !== undefined) {
      return appState.generatorSettings.customComputerLabsCount;
    }
    const fromRooms = pl.rooms?.filter(r => r.type === 'informatyka').length || 0;
    return fromRooms > 0 ? fromRooms : 1;
  });
  const [minAvailableSubstitutionTeachersPerSlot, setMinAvailableSubstitutionTeachersPerSlot] = useState<number>(() => appState.generatorSettings?.minAvailableSubstitutionTeachersPerSlot ?? 1);

  const [forceOptionalToExtremes, setForceOptionalToExtremes] = useState<boolean>(() => appState.generatorSettings?.forceOptionalToExtremes ?? true);
  const [preserveUnlockedManualLessons, setPreserveUnlockedManualLessons] = useState<boolean>(() => appState.generatorSettings?.preserveUnlockedManualLessons ?? false);
  const [optionalSubjectIds, setOptionalSubjectIds] = useState<string[]>(() => {
    if (appState.generatorSettings?.optionalSubjectIds) {
      return appState.generatorSettings.optionalSubjectIds;
    }
    // Domyślne dopasowanie przedmiotów: religia, etyka, mniejszość, wdż
    return pl.subjects
      .filter(s => {
        const nameLower = s.name.toLowerCase();
        return (
          nameLower.includes('relig') ||
          nameLower.includes('etyk') ||
          nameLower.includes('mniejsz') ||
          nameLower.includes('wdż') ||
          nameLower.includes('wdz')
        );
      })
      .map(s => s.id);
  });

  // Zapamiętanie ról nauczycieli w bieżącej sesji generatora
  const [teacherConfigs, setTeacherConfigs] = useState<Record<string, TeacherRoleConfig>>(() => {
    const configs: Record<string, TeacherRoleConfig> = {};
    pl.teachers.forEach(t => {
      // Domyślnie null => dziedziczy globalny suwak maxGapsPerTeacher
      configs[t.id] = {
        teacherId: t.id,
        role: 'teacher',
        maxGaps: null,
        spreadObligation: false,
      };
    });
    return configs;
  });

  // Stan informacji zwrotnej o trwającym procesie generowania
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<PlanGenerationResult | null>(null);

  // Funkcja pomocnicza do aktualizacji konfiguracji
  const updateTeacherConfig = (teacherId: string, updates: Partial<TeacherRoleConfig>) => {
    setTeacherConfigs(prev => {
      const current = prev[teacherId] || {
        teacherId,
        role: 'teacher' as const,
        maxGaps: null,
        spreadObligation: false
      };
      const updated = { ...current, ...updates };
      // Dyrektor i wicedyrektor otrzymują zalecane okienka organizacyjne
      if (updates.role === 'director') {
        updated.maxGaps = 1;
      } else if (updates.role === 'deputy') {
        updated.maxGaps = 2;
      } else if (updates.role === 'teacher' && updates.maxGaps === undefined) {
        updated.maxGaps = null;
      }
      return { ...prev, [teacherId]: updated };
    });
  };

  // Maps of state
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);

  const lockedLessonsCount = useMemo(() => {
    const regLocked = Object.values(pl.lessons).filter(l => l.locked).length;
    const speLocked = Object.values(pl.specialLessons || {}).filter(sl => sl.locked).length;
    return regLocked + speLocked;
  }, [pl.lessons, pl.specialLessons]);

  const unlockedLessonsCount = useMemo(() => {
    const regUnlocked = Object.values(pl.lessons).filter(l => l && !l.locked).length;
    const speUnlocked = Object.values(pl.specialLessons || {}).filter(sl => sl && !sl.locked).length;
    return regUnlocked + speUnlocked;
  }, [pl.lessons, pl.specialLessons]);

  // ── CORE SCHEDULING ALGORITHM ──
  const runAutoGeneration = () => {
    setIsGenerating(true);
    setGenerationResult(null);

    // Uruchomienie asynchroniczne, aby wskaźnik ładowania zdążył się wyrenderować
    setTimeout(() => {
      try {
        const options: PlanGeneratorOptions = {
          maxGapsPerTeacher,
          obeyAvailability,
          avoidExtremes,
          avoidExtremesSubjectIds,
          noStudentGaps,
          allowDoubleBlocks,
          includeSpecialNI,
          limitComputerLabs,
          customComputerLabsCount,
          minAvailableSubstitutionTeachersPerSlot,
          forceOptionalToExtremes,
          optionalSubjectIds,
          preserveUnlockedManualLessons,
          teacherConfigs
        };

        const result = runPlanGenerationAlgorithm(appState, options);

        onChangeAppState({
          ...appState,
          planLekcji: {
            ...pl,
            lessons: result.updatedLessons,
            specialLessons: result.updatedSpecialLessons
          },
          generatorSettings: {
            genPriorityHomerooms: true,
            genPriorityTeachers: true,
            genExcludeWF: true,
            genAutoPlaceWF: true,
            genClearExisting: false,
            ...appState.generatorSettings,
            ...options
          }
        });

        setGenerationResult(result);
      } catch (err: any) {
        setGenerationResult({
          success: false,
          placedRegular: 0,
          totalRegular: 0,
          placedSpecial: 0,
          totalSpecial: 0,
          errors: [err.message || 'Wystąpił nieznany błąd podczas generowania planu.'],
          warnings: [],
          conflicts: [],
          updatedLessons: pl.lessons,
          updatedSpecialLessons: pl.specialLessons || {}
        });
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200" id="generator-modal">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-150 transform transition-all scale-100">
        
        {/* NAGŁÓWEK MODALA */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles className="text-amber-300 animate-pulse" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Generator Automatyczny Planu Lekcji</h2>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">Algorytmiczne układanie optymalnych lekcji i nauczania indywidualnego</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 rounded-full transition text-white"
            title="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* ZAWARTOŚĆ */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 select-none">
              <RefreshCw className="text-indigo-600 animate-spin" size={48} />
              <div className="text-center">
                <p className="font-bold text-slate-800 text-base">Generowanie planu lekcji...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Przeliczanie kryteriów, unikanie okienek u klas i optymalizacja dostępności kadry.</p>
              </div>
            </div>
          ) : generationResult ? (
            // WYNIK GENERATORA
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                {generationResult.success && generationResult.warnings.length === 0 ? (
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={28} />
                ) : (
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={28} />
                )}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {generationResult.success && generationResult.warnings.length === 0 
                      ? 'Plan wygenerowany perfekcyjnie!' 
                      : 'Plan wygenerowany z uwagami'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Rozmieszczanie zakończyło się pomyślnie. Stare i odblokowane lekcje zostały zastąpione nowym harmonogramem.
                  </p>
                </div>
              </div>

              {/* STATYSTYKI REZULTATU */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Lekcje klasowe</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-blue-950 font-mono">
                      {generationResult.placedRegular} / {generationResult.totalRegular}
                    </span>
                    <span className="text-xs font-bold text-blue-600">godz.</span>
                  </div>
                  <span className="text-[10px] text-blue-500 font-extrabold mt-1">Lekcje w siatce głównej</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Zajęcia indywidualne (NI)</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-amber-950 font-mono">
                      {generationResult.placedSpecial} / {generationResult.totalSpecial}
                    </span>
                    <span className="text-xs font-bold text-amber-600">godz.</span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-extrabold mt-1">Indywidualne + Rewalidacja</span>
                </div>

                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider block">Sprawność dopasowania</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-violet-950 font-mono">
                      {generationResult.totalRegular > 0 
                        ? Math.round((generationResult.placedRegular / generationResult.totalRegular) * 100)
                        : 100}%
                    </span>
                  </div>
                  <span className="text-[10px] text-violet-500 font-extrabold mt-1">Skuteczność algorytmu</span>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Niewprowadzone lekcje</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-rose-950 font-mono">
                      {Math.max(0, generationResult.totalRegular - generationResult.placedRegular) + Math.max(0, generationResult.totalSpecial - generationResult.placedSpecial)}
                    </span>
                    <span className="text-xs font-bold text-rose-600">godz.</span>
                  </div>
                  <span className="text-[10px] text-rose-500 font-extrabold mt-1">
                    {generationResult.conflicts.length > 0
                      ? `Wykryto konfliktów: ${generationResult.conflicts.length}`
                      : 'Brak wolnych nauczycieli / sal'}
                  </span>
                </div>
              </div>

              {/* LISTA KONFLIKTÓW Z KONTROLI KOŃCOWEJ */}
              {generationResult.conflicts.length > 0 && (
                <div className="space-y-2 select-none">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">🚨 Wykryte kolizje w planie ({generationResult.conflicts.length})</span>
                  <div className="border border-rose-200 rounded-2xl p-4 bg-rose-50/40 max-h-48 overflow-y-auto space-y-1.5">
                    {generationResult.conflicts.map((conflict, i) => (
                      <div key={i} className="text-xs text-rose-800 leading-normal font-semibold flex items-start gap-1.5">
                        <span className="text-rose-500 mt-0.5">•</span>
                        <span>[{conflict.type}] {conflict.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LISTA OSTRZEŻEŃ */}
              {generationResult.warnings.length > 0 && (
                <div className="space-y-2 select-none">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">⚠️ Szczegóły ostrzeżeń ({generationResult.warnings.length})</span>
                  <div className="border border-red-150 rounded-2xl p-4 bg-red-50/20 max-h-48 overflow-y-auto space-y-1.5">
                    {generationResult.warnings.map((warn, i) => (
                      <div key={i} className="text-xs text-red-800 leading-normal font-semibold flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-medium italic mt-1 leading-normal">
                    Wskazówka: Zwiększ dostępność nauczycieli lub zredukuj nakładające się zadania w danej godzinie przed ponownym generowaniem.
                  </p>
                </div>
              )}

              {/* PRZYCISKI PO WYGENEROWANIU */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGenerationResult(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo2 size={14} /> Dopasuj ustawienia i spróbuj ponownie
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Zobacz gotowy plan
                </button>
              </div>
            </div>
          ) : (
            // WYBÓR KRYTERIÓW GENEROWANIA
            <div className="space-y-6">
              
              {/* Ochrona zablokowanych godzin (Kłódki) */}
              {lockedLessonsCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs select-none">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Lock size={16} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                      <span>Wykryto {lockedLessonsCount} zablokowanych godzin (Kłódki)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-black">
                        Ochrona aktywna
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Wszystkie godziny oznaczone kłódką (lekcje klas, nauczycieli oraz zajęcia specjalne SPE) pozostaną <strong>nienaruszone</strong> na swoich miejscach. Generator zapełni wyłącznie puste i odblokowane terminy.
                    </p>
                  </div>
                </div>
              )}

              {/* Sekcja 1: Główne reguły optymalizacji */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3.5 select-none">⚙️ Ogólne reguły optymalizacji</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Maks okienek */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition bg-slate-50/50">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 select-none leading-none">
                        📈 Główne pensum okienek nauczycieli
                      </label>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1">
                        Maksymalna liczba nieobsadzonych lekcji (górna granica "okienek") dla pojedynczego nauczyciela w tygodniu.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        value={maxGapsPerTeacher}
                        onChange={(e) => setMaxGapsPerTeacher(Number(e.target.value))}
                      />
                      <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0 leading-none">
                        {maxGapsPerTeacher === 0 ? 'Bez okienek (0)' : `${maxGapsPerTeacher} okienka`}
                      </span>
                    </div>
                  </div>

                  {/* Ciągłość lekcji u klas (Brak okienek dla klas) */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setNoStudentGaps(!noStudentGaps)}>
                    <input 
                      type="checkbox"
                      checked={noStudentGaps}
                      onChange={() => {}} // handled by div
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">🏫 Ciągłość zajęć dla uczniów (Brak okienek)</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Lekcje każdej z klas będą układane jedna po drugiej w sprawnym bloku bez żadnych luźnych przerw w środku dnia.
                      </p>
                    </div>
                  </div>

                  {/* Skrajne godziny */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col gap-3 bg-slate-50/50">
                    <div className="flex items-start gap-3 hover:text-indigo-600 transition cursor-pointer" onClick={() => setAvoidExtremes(!avoidExtremes)}>
                      <input 
                        type="checkbox"
                        checked={avoidExtremes}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-800 block select-none">⏰ Omijaj skrajne godziny (godzina zerowa / późne)</span>
                        <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                          Unikaj w miarę możliwości planowania lekcji na godzinę 0 (przed 8:00) oraz późnych lekcjach (od 7. godziny wzwyż).
                        </p>
                      </div>
                    </div>

                    {avoidExtremes && (
                      <div className="ml-7 p-3 bg-blue-50/30 border border-blue-100 rounded-xl space-y-2 animate-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider block">Wybierz przedmioty objęte regułą:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const allSubjectIds = pl.subjects.map(s => s.id);
                              const isAllSelected = (avoidExtremesSubjectIds || []).length === allSubjectIds.length;
                              setAvoidExtremesSubjectIds(isAllSelected ? [] : allSubjectIds);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer uppercase font-mono"
                          >
                            {(avoidExtremesSubjectIds || []).length === pl.subjects.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg custom-scrollbar">
                          {pl.subjects.map(sub => {
                            const currentSelected = avoidExtremesSubjectIds || pl.subjects.map(s => s.id);
                            const isChecked = currentSelected.includes(sub.id);
                            return (
                              <label 
                                key={sub.id} 
                                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer select-none text-[11px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let nextSelected: string[];
                                    if (e.target.checked) {
                                      nextSelected = [...currentSelected, sub.id];
                                    } else {
                                      nextSelected = currentSelected.filter(id => id !== sub.id);
                                    }
                                    setAvoidExtremesSubjectIds(nextSelected);
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                />
                                <span className="truncate font-medium text-slate-700" title={sub.name}>
                                  {sub.name} <span className="text-[9.5px] text-slate-450 font-mono">({sub.short})</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dostępność nauczycieli */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setObeyAvailability(!obeyAvailability)}>
                    <input 
                      type="checkbox"
                      checked={obeyAvailability}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">📅 Respektuj deklarowaną dostępność nauczycieli</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Blokuje wstawianie zajęć w slotach określonych u nauczyciela jako wyłączone lub niedostępne.
                      </p>
                    </div>
                  </div>

                  {/* Lekcje pod rząd */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setAllowDoubleBlocks(!allowDoubleBlocks)}>
                    <input 
                      type="checkbox"
                      checked={allowDoubleBlocks}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">📚 Łączenie godzin (bloki dwugodzinne pod rząd)</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Jeśli dany przedmiot ma ≥ 2 godziny tygodniowo, system może połączyć je w blok lekcji pod rząd w tym samym dniu.
                      </p>
                    </div>
                  </div>

                  {/* Nauczanie indywidualne */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setIncludeSpecialNI(!includeSpecialNI)}>
                    <input 
                      type="checkbox"
                      checked={includeSpecialNI}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">🌟 Uwzględnij nauczanie indywidualne (NI) i Rewalidację</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Automatycznie dopasuje wolne sloty nauczycieli do zajęć zindywidualizowanych dla zgłoszonych uczniów ze specjalnymi potrzebami.
                      </p>
                    </div>
                  </div>

                  {/* Limit pracowni informatycznych */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition bg-slate-50/50">
                    <div>
                      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setLimitComputerLabs(!limitComputerLabs)}>
                        <input 
                          type="checkbox"
                          checked={limitComputerLabs}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-800 block select-none">🖥️ Limit zajęć informatycznych (pracownia komp.)</span>
                          <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                            Ogranicza liczbę jednoczesnych zajęć z informatyki / edukacji informatycznej do liczby sprawnych pracowni komputerowych w szkole.
                          </p>
                        </div>
                      </div>
                    </div>
                    {limitComputerLabs && (
                      <div className="flex items-center gap-3 mt-4 border-t border-slate-100 pt-3">
                        <span className="text-[10px] text-slate-500 font-bold select-none whitespace-nowrap">Dostępne pracownie:</span>
                        <input 
                          type="number"
                          min="1"
                          max="10"
                          className="w-16 px-2 py-1 text-xs font-black font-mono border border-slate-250 bg-white rounded-lg outline-none focus:border-indigo-500"
                          value={customComputerLabsCount}
                          onChange={(e) => setCustomComputerLabsCount(Math.max(1, Number(e.target.value)))}
                        />
                        <span className="text-[10px] text-slate-450 font-medium select-none">
                          {pl.rooms?.filter(r => r.type === 'informatyka').length > 0 
                            ? `(wykryto ${pl.rooms.filter(r => r.type === 'informatyka').length} w rejestrze sal)` 
                            : '(brak zarejestrowanych sal typu informatyka)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Minimalna liczba nauczycieli na zastępstwa doraźne */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition bg-slate-50/50">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 select-none leading-none">
                        🧑‍🏫 Rezerwa na zastępstwa doraźne
                      </label>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1">
                        Zapewnia, że na każdej godzinie lekcyjnej co najmniej określona liczba nauczycieli ma okienko (jest w szkole i nie prowadzi zajęć), aby dyrektor miał kogo wyznaczyć na zastępstwo.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        value={minAvailableSubstitutionTeachersPerSlot}
                        onChange={(e) => setMinAvailableSubstitutionTeachersPerSlot(Number(e.target.value))}
                      />
                      <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0 leading-none">
                        {minAvailableSubstitutionTeachersPerSlot === 0 ? 'Brak rezerwy (0)' : `Min. ${minAvailableSubstitutionTeachersPerSlot} nauczycieli`}
                      </span>
                    </div>
                  </div>

                  {/* Religia i przedmioty opcjonalne na skrajach dnia */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col gap-3 bg-slate-50/50">
                    <div className="flex items-start gap-3 hover:text-indigo-600 transition cursor-pointer" onClick={() => setForceOptionalToExtremes(!forceOptionalToExtremes)}>
                      <input 
                        type="checkbox"
                        checked={forceOptionalToExtremes}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-800 block select-none">⛪ Przedmioty opcjonalne (np. Religia, Etyka) na skrajach dnia klasy</span>
                        <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                          Automatycznie planuje wybrane przedmioty na pierwszej lub ostatniej lekcji danej klasy. Zapobiega to okienkom u uczniów nieuczestniczących w tych lekcjach.
                        </p>
                      </div>
                    </div>

                    {forceOptionalToExtremes && (
                      <div className="ml-7 p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl space-y-2 animate-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider block">Wybierz przedmioty objęte regułą:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const allSubjectIds = pl.subjects.map(s => s.id);
                              const isAllSelected = (optionalSubjectIds || []).length === allSubjectIds.length;
                              setOptionalSubjectIds(isAllSelected ? [] : allSubjectIds);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer uppercase font-mono"
                          >
                            {(optionalSubjectIds || []).length === pl.subjects.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg custom-scrollbar">
                          {pl.subjects.map(sub => {
                            const isChecked = (optionalSubjectIds || []).includes(sub.id);
                            return (
                              <label 
                                key={sub.id} 
                                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer select-none text-[11px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let nextSelected: string[];
                                    if (e.target.checked) {
                                      nextSelected = [...(optionalSubjectIds || []), sub.id];
                                    } else {
                                      nextSelected = (optionalSubjectIds || []).filter(id => id !== sub.id);
                                    }
                                    setOptionalSubjectIds(nextSelected);
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                <span className="truncate font-medium text-slate-700" title={sub.name}>
                                  {sub.name} <span className="text-[9.5px] text-slate-450 font-mono">({sub.short})</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Zachowaj ręczne lekcje niezablokowane */}
                  <div
                    className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50"
                    onClick={() => setPreserveUnlockedManualLessons(!preserveUnlockedManualLessons)}
                  >
                    <input
                      type="checkbox"
                      checked={preserveUnlockedManualLessons}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">
                        📌 Zachowaj ręczne lekcje niezablokowane
                        {unlockedLessonsCount > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9.5px] font-mono">
                            {unlockedLessonsCount}
                          </span>
                        )}
                      </span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Nie usuwa lekcji wstawionych wcześniej ręcznie nawet bez kłódki — generator dopisze wyłącznie brakujące godziny z przydziałów.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sekcja 2: Role i redukcja obciążeń (Dyrektor / Wicedyrektor) */}
              <div>
                <div className="flex items-center justify-between mb-3.5 select-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">🧑‍🏫 Funkcje kadry kierowniczej i priorytety nauczycieli ({pl.teachers.length})</span>
                  <div className="text-[9.5px] text-slate-400 font-semibold italic">Wyznacz dyrektorom i wicedyrektorom ulgi i ograniczenia obciążeń</div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs max-h-64 overflow-y-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs bg-white">
                    <thead className="bg-slate-50 select-none">
                      <tr>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nauczyciel</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funkcja / Rola</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit okienek</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wymóg obecności</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {pl.teachers.map(t => {
                        const config = teacherConfigs[t.id] || {
                          teacherId: t.id,
                          role: 'teacher',
                          maxGaps: null,
                          spreadObligation: false,
                        };
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900">{t.first} {t.last}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Abbr: {t.abbr} | Pensum: {t.maxHours ?? 18}h</div>
                            </td>
                            <td className="p-3">
                              <select
                                value={config.role}
                                onChange={(e) => updateTeacherConfig(t.id, { role: e.target.value as any })}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-slate-800"
                              >
                                <option value="teacher">Zwykły nauczyciel</option>
                                <option value="director">👑 Dyrektor szkoły</option>
                                <option value="deputy">🎓 Wicedyrektor</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                value={config.maxGaps === null || config.maxGaps === undefined ? 'default' : String(config.maxGaps)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateTeacherConfig(t.id, { maxGaps: val === 'default' ? null : Number(val) });
                                }}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-slate-800"
                              >
                                <option value="default">Wg suwaka ({maxGapsPerTeacher})</option>
                                <option value="0">Max 0 okienek</option>
                                <option value="1">Max 1 okienko</option>
                                <option value="2">Max 2 okienka</option>
                                <option value="3">Max 3 okienka</option>
                                <option value="4">Max 4 okienka</option>
                                <option value="5">Max 5 okienek</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={config.spreadObligation}
                                  onChange={(e) => updateTeacherConfig(t.id, { spreadObligation: e.target.checked })}
                                  className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-500 font-bold leading-tight select-none">
                                  Codzienna obecność
                                </span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRZYCISKI MODALA */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-105 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={runAutoGeneration}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={13} fill="currentColor" /> Rozpocznij automatyczne układanie
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
