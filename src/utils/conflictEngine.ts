/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Wykrywania Konfliktów Planu Lekcji (ConflictEngine)
 * Opis: Czysta funkcja analityczna sprawdzająca kolizje nauczycieli, sal, klas, grup i dostępności.
 */

import { PlanLekcjiState, Assignment, SpecialAssignment } from '../types';
import { isSportsFacility } from './roomUtils';

export interface PlanConflict {
  type: 'teacher' | 'room' | 'class' | 'availability';
  lessonKeys: string[];
  message: string;
}

export interface ConflictEngineResult {
  conflicts: PlanConflict[];
  conflictMap: Map<string, string[]>; // lessonKey -> list of conflict messages
}

/**
 * Czysta funkcja wykrywająca wszystkie rodzaje konfliktów w obiekcie PlanLekcjiState.
 *
 * Zasady:
 * 1. Ten sam assignmentId = lekcja łączona (nie stanowi konfliktu).
 * 2. Lekcja całej klasy koliduje z każdą inną lekcją tej klasy w tym samym slocie (inną całą klasą lub dowolną grupą).
 * 3. Dwie różne grupy tej samej klasy nie kolidują, o ile mają różnych nauczycieli, różne sale i nie wykluczają się w modelu uczniów.
 * 4. Model partycji grup (partitionId) i uczniów (studentIds): grupy o tej samej partycji wykluczają się i mogą odbywać się równolegle; grupy o różnych partycjach kolidują w razie nakładających się uczniów.
 * 5. Grupy międzyoddziałowe (linkedGroupIds): zajmują wszystkie powiązane grupy i oddziały w danym slocie.
 * 6. Lekcje specialLessons z teacherId / supportTeacherId są porównywane z lekcjami klasowymi i między sobą.
 * 7. Uwzględnia supportTeacherId nauczycieli wspomagających.
 * 8. Uwzględnia dostępność nauczycieli (availability).
 * 9. Uwzględnia limity sal sportowych (isSportsFacility i singleClassLimit).
 */
export function detectConflicts(planLekcji: PlanLekcjiState): PlanConflict[] {
  return analyzeConflicts(planLekcji).conflicts;
}

/**
 * Zwraca mapę konfliktów dla poszczególnych komórek (lessonKey -> array of messages).
 * Używana bezpośrednio przez komponenty UI do błyskawicznego podświetlania kolizji.
 */
export function detectConflictsMap(planLekcji: PlanLekcjiState): Map<string, string[]> {
  return analyzeConflicts(planLekcji).conflictMap;
}

/**
 * Główny silnik analizy konfliktów zwracający pełny zestaw danych.
 */
export function analyzeConflicts(planLekcji: PlanLekcjiState): ConflictEngineResult {
  const conflicts: PlanConflict[] = [];
  const conflictMap = new Map<string, string[]>();

  const addConflict = (type: PlanConflict['type'], keys: string[], message: string) => {
    conflicts.push({ type, lessonKeys: keys, message });
    keys.forEach(k => {
      const existing = conflictMap.get(k) || [];
      if (!existing.includes(message)) {
        existing.push(message);
        conflictMap.set(k, existing);
      }
    });
  };

  if (!planLekcji) {
    return { conflicts, conflictMap };
  }

  const assignmentsMap = new Map<string, Assignment>(
    (planLekcji.assignments || []).map(a => [a.id, a])
  );
  const specialAssignmentsMap = new Map<string, SpecialAssignment>(
    (planLekcji.specialAssignments || []).map(sa => [sa.id, sa])
  );
  const teachersMap = new Map(
    (planLekcji.teachers || []).map(t => [t.id, t])
  );
  const classesMap = new Map(
    (planLekcji.classes || []).map(c => [c.id, c])
  );
  const roomsMap = new Map(
    (planLekcji.rooms || []).map(r => [r.id, r])
  );
  const groupsMap = new Map(
    (planLekcji.schoolGroups || []).map(g => [g.id, g])
  );

  // Struktury pomocnicze do grupowania wpisów w slotach (dzień, godzina)
  interface TeacherSlotItem {
    key: string;
    assignmentId: string;
    classId: string;
    role: 'prowadzący' | 'wspomagający';
    isSpecial?: boolean;
    studentId?: string;
  }

  interface RoomSlotItem {
    key: string;
    assignmentId: string;
    classId: string;
    isSpecial?: boolean;
    studentId?: string;
  }

  interface ClassSlotItem {
    key: string;
    assignmentId: string;
    groupId: string | null;
    teacherId: string | null;
    roomId: string | null;
  }

  // teacherId|day|hour -> TeacherSlotItem[]
  const teacherSlots = new Map<string, TeacherSlotItem[]>();
  // roomId|day|hour -> RoomSlotItem[]
  const roomSlots = new Map<string, RoomSlotItem[]>();
  // classId|day|hour -> ClassSlotItem[]
  const classSlots = new Map<string, ClassSlotItem[]>();

  // 1. ZBIERANIE LEKCJI KLASOWYCH (planLekcji.lessons)
  Object.entries(planLekcji.lessons || {}).forEach(([key, lesson]) => {
    if (!lesson) return;
    const parts = key.split('|');
    if (parts.length < 3) return;

    const classId = parts[0];
    const day = parseInt(parts[1], 10);
    const hour = parseInt(parts[2], 10);
    const keyGroupId = parts.length >= 4 ? parts[3] : null;

    const asg = assignmentsMap.get(lesson.assignmentId);
    if (!asg) return;

    const effectiveGroupId = asg.groupId || keyGroupId || null;
    const effectiveSupportId = lesson.supportTeacherId || asg.supportTeacherId || null;

    // A. Rejestracja w slotach klasy
    const cKey = `${classId}|${day}|${hour}`;
    const cList = classSlots.get(cKey) || [];
    cList.push({
      key,
      assignmentId: asg.id,
      groupId: effectiveGroupId,
      teacherId: asg.teacherId || null,
      roomId: asg.roomId || null
    });
    classSlots.set(cKey, cList);

    // B. Rejestracja w slotach nauczycieli
    if (asg.teacherId) {
      const tKey = `${asg.teacherId}|${day}|${hour}`;
      const tList = teacherSlots.get(tKey) || [];
      tList.push({
        key,
        assignmentId: asg.id,
        classId,
        role: 'prowadzący'
      });
      teacherSlots.set(tKey, tList);

      // Sprawdzenie dostępności nauczyciela prowadzącego
      const teacher = teachersMap.get(asg.teacherId);
      if (teacher && teacher.availability && teacher.availability.length > 0) {
        const checkCode = `${day}-${hour}`;
        if (!teacher.availability.includes(checkCode)) {
          const tName = `${teacher.first} ${teacher.last} (${teacher.abbr})`;
          addConflict(
            'availability',
            [key],
            `Niedostępność nauczyciela: ${tName} nie ma wyznaczonej dostępności w tym terminie (dzień ${day}, lekcja ${hour + 1}).`
          );
        }
      }
    }

    if (effectiveSupportId) {
      const supKey = `${effectiveSupportId}|${day}|${hour}`;
      const supList = teacherSlots.get(supKey) || [];
      supList.push({
        key,
        assignmentId: asg.id,
        classId,
        role: 'wspomagający'
      });
      teacherSlots.set(supKey, supList);

      // Sprawdzenie dostępności nauczyciela wspomagającego
      const supTeacher = teachersMap.get(effectiveSupportId);
      if (supTeacher && supTeacher.availability && supTeacher.availability.length > 0) {
        const checkCode = `${day}-${hour}`;
        if (!supTeacher.availability.includes(checkCode)) {
          const supName = `${supTeacher.first} ${supTeacher.last} (${supTeacher.abbr})`;
          addConflict(
            'availability',
            [key],
            `Niedostępność nauczyciela wsp.: ${supName} nie ma wyznaczonej dostępności w tym terminie (dzień ${day}, lekcja ${hour + 1}).`
          );
        }
      }
    }

    // C. Rejestracja w slotach sal
    if (asg.roomId) {
      const rKey = `${asg.roomId}|${day}|${hour}`;
      const rList = roomSlots.get(rKey) || [];
      rList.push({
        key,
        assignmentId: asg.id,
        classId
      });
      roomSlots.set(rKey, rList);
    }
  });

  // 2. ZBIERANIE LEKCJI SPECJALNYCH (Nauczanie Indywidualne / planLekcji.specialLessons)
  Object.entries(planLekcji.specialLessons || {}).forEach(([key, spLesson]) => {
    if (!spLesson) return;
    const parts = key.split('|');
    if (parts.length < 3) return;

    const studentId = parts[0];
    const day = parseInt(parts[1], 10);
    const hour = parseInt(parts[2], 10);

    const spAsg = specialAssignmentsMap.get(spLesson.assignmentId);
    if (!spAsg) return;

    // Nauczyciel prowadzący zajęcia specjalne
    if (spAsg.teacherId) {
      const tKey = `${spAsg.teacherId}|${day}|${hour}`;
      const tList = teacherSlots.get(tKey) || [];
      tList.push({
        key,
        assignmentId: spAsg.id,
        classId: `special_${studentId}`,
        role: 'prowadzący',
        isSpecial: true,
        studentId
      });
      teacherSlots.set(tKey, tList);

      const teacher = teachersMap.get(spAsg.teacherId);
      if (teacher && teacher.availability && teacher.availability.length > 0) {
        const checkCode = `${day}-${hour}`;
        if (!teacher.availability.includes(checkCode)) {
          const tName = `${teacher.first} ${teacher.last} (${teacher.abbr})`;
          addConflict(
            'availability',
            [key],
            `Niedostępność nauczyciela (NI): ${tName} nie ma wyznaczonej dostępności w tym terminie (dzień ${day}, lekcja ${hour + 1}).`
          );
        }
      }
    }

    // Nauczyciel wspomagający w zajęciach specjalnych
    if (spAsg.supportTeacherId) {
      const supKey = `${spAsg.supportTeacherId}|${day}|${hour}`;
      const supList = teacherSlots.get(supKey) || [];
      supList.push({
        key,
        assignmentId: spAsg.id,
        classId: `special_${studentId}`,
        role: 'wspomagający',
        isSpecial: true,
        studentId
      });
      teacherSlots.set(supKey, supList);
    }

    // Sala w zajęciach specjalnych
    if (spAsg.roomId) {
      const rKey = `${spAsg.roomId}|${day}|${hour}`;
      const rList = roomSlots.get(rKey) || [];
      rList.push({
        key,
        assignmentId: spAsg.id,
        classId: `special_${studentId}`,
        isSpecial: true,
        studentId
      });
      roomSlots.set(rKey, rList);
    }
  });

  // 3. WERYFIKACJA KONFLIKTÓW KLAS I GRUP (type: 'class')
  classSlots.forEach((items, cSlotKey) => {
    if (items.length <= 1) return;
    const [classId, dayStr, hourStr] = cSlotKey.split('|');
    const className = classesMap.get(classId)?.name || classId;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);

    // Sprawdzamy każdą parę wewnątrz tego samego slotu klasy
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        // Ta sama łączona lekcja (np. powiązane klasy) nie koliduje
        if (itemA.assignmentId === itemB.assignmentId) continue;

        const isWholeA = !itemA.groupId;
        const isWholeB = !itemB.groupId;

        let isConflict = false;
        let conflictMsg = '';

        if (isWholeA || isWholeB) {
          // Zasada: lekcja całej klasy koliduje z każdą lekcją (całej klasy lub dowolnej grupy)
          isConflict = true;
          if (isWholeA && isWholeB) {
            conflictMsg = `Konflikt klasy: Klasa ${className} ma zaplanowane dwie różne lekcje dla całej klasy w tym samym czasie.`;
          } else {
            const groupItem = isWholeA ? itemB : itemA;
            const gName = groupItem.groupId ? groupsMap.get(groupItem.groupId)?.name || groupItem.groupId : 'grupa';
            conflictMsg = `Konflikt klasy: Klasa ${className} ma zaplanowaną lekcję dla całej klasy jednocześnie z lekcją grupy (${gName}).`;
          }
        } else if (itemA.groupId && itemA.groupId === itemB.groupId) {
          // Ta sama grupa ma dwie różne lekcje
          isConflict = true;
          const gName = groupsMap.get(itemA.groupId)?.name || itemA.groupId;
          conflictMsg = `Konflikt grupy: Grupa ${gName} w klasie ${className} ma zaplanowane dwie różne lekcje w tym samym czasie.`;
        } else if (itemA.groupId && itemB.groupId && itemA.groupId !== itemB.groupId) {
          // Sprawdzenie kolizji uczniów między różnymi grupami tej samej klasy
          const groupA = groupsMap.get(itemA.groupId);
          const groupB = groupsMap.get(itemB.groupId);
          const gNameA = groupA?.name || itemA.groupId;
          const gNameB = groupB?.name || itemB.groupId;

          const studentsA = groupA?.studentIds;
          const studentsB = groupB?.studentIds;
          const hasExplicitStudentsA = Array.isArray(studentsA) && studentsA.length > 0;
          const hasExplicitStudentsB = Array.isArray(studentsB) && studentsB.length > 0;

          if (hasExplicitStudentsA && hasExplicitStudentsB) {
            // Dokładne sprawdzenie przecięcia uczniów
            const commonStudents = studentsA.filter(sId => studentsB.includes(sId));
            if (commonStudents.length > 0) {
              isConflict = true;
              const partInfo = (groupA?.partitionId && groupB?.partitionId && groupA.partitionId !== groupB.partitionId)
                ? ` (podziały: ${groupA.partitionId} vs ${groupB.partitionId})`
                : '';
              conflictMsg = `Konflikt uczniów w grupach: Grupa ${gNameA} i Grupa ${gNameB} w klasie ${className}${partInfo} mają wspólnych uczniów (${commonStudents.length}) i nie mogą odbywać się jednocześnie.`;
            }
          } else if (groupA?.partitionId && groupB?.partitionId && groupA.partitionId !== groupB.partitionId) {
            // Grupy o tym samym partitionId wykluczają się wzajemnie i razem tworzą całą klasę.
            // Grupy z różnych partitionId kolidują, gdy nie podano rozłącznych list studentów (z definicji dzielą uczniów klasy).
            isConflict = true;
            conflictMsg = `Konflikt podziału: Grupa ${gNameA} (podział: ${groupA.partitionId}) i Grupa ${gNameB} (podział: ${groupB.partitionId}) w klasie ${className} pochodzą z różnych podziałów i mają wspólnych uczniów.`;
          }
        }

        if (isConflict) {
          addConflict('class', [itemA.key, itemB.key], conflictMsg);
        }
      }
    }
  });

  // 4. WERYFIKACJA KONFLIKTÓW NAUCZYCIELI (type: 'teacher')
  teacherSlots.forEach((items, tSlotKey) => {
    if (items.length <= 1) return;
    const [teacherId, dayStr, hourStr] = tSlotKey.split('|');
    const teacher = teachersMap.get(teacherId);
    const tName = teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nauczyciel';

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        // Ten sam assignmentId = lekcja łączona (nie stanowi konfliktu nauczyciela!)
        if (itemA.assignmentId === itemB.assignmentId) continue;

        const clsAName = itemA.isSpecial ? 'Nauczanie Indywidualne' : (classesMap.get(itemA.classId)?.name || itemA.classId);
        const clsBName = itemB.isSpecial ? 'Nauczanie Indywidualne' : (classesMap.get(itemB.classId)?.name || itemB.classId);

        const roleDescA = itemA.role === 'wspomagający' ? 'jako wspomagający' : 'jako prowadzący';
        const roleDescB = itemB.role === 'wspomagający' ? 'jako wspomagający' : 'jako prowadzący';

        const msg = `Konflikt Nauczyciela: ${tName} jest przypisany jednocześnie do: ${clsAName} (${roleDescA}) oraz ${clsBName} (${roleDescB}).`;
        addConflict('teacher', [itemA.key, itemB.key], msg);
      }
    }
  });

  // 5. WERYFIKACJA KONFLIKTÓW SAL (type: 'room')
  roomSlots.forEach((items, rSlotKey) => {
    if (items.length <= 1) return;
    const [roomId] = rSlotKey.split('|');
    const room = roomsMap.get(roomId);
    const rName = room ? room.name : 'Sala';
    const isSport = isSportsFacility(room);
    const hasSingleClassLimit = room?.singleClassLimit === true;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        // Ten sam assignmentId = ta sama lekcja łączona w tej samej sali (nie stanowi konfliktu sali!)
        if (itemA.assignmentId === itemB.assignmentId) continue;

        if (isSport) {
          // Obiekt sportowy bez ścisłego limitu jednej klasy: dopuszcza wiele klas i grup jednocześnie
          if (!hasSingleClassLimit) continue;

          // Obiekt sportowy ze ścisłym limitem: dopuszcza wiele grup TEJ SAMEJ klasy
          if (itemA.classId === itemB.classId) continue;

          // Inne klasy w obiekcie sportowym z limitem jednej klasy -> konflikt!
          const clsAName = classesMap.get(itemA.classId)?.name || itemA.classId;
          const clsBName = classesMap.get(itemB.classId)?.name || itemB.classId;
          const msg = `Limit obiektu sportowego: Obiekt ${rName} ma ustawiony limit jednej klasy, a przypisano w tym samym czasie klasy: ${clsAName} oraz ${clsBName}.`;
          addConflict('room', [itemA.key, itemB.key], msg);
          continue;
        }

        // Zwykła sala: jakikolwiek inny przydział w tej samej sali to konflikt!
        const clsAName = itemA.isSpecial ? 'Nauczanie Indywidualne' : (classesMap.get(itemA.classId)?.name || itemA.classId);
        const clsBName = itemB.isSpecial ? 'Nauczanie Indywidualne' : (classesMap.get(itemB.classId)?.name || itemB.classId);

        const msg = `Konflikt Sali: Sala ${rName} jest zajęta w tym samym czasie przez: ${clsAName} oraz ${clsBName}.`;
        addConflict('room', [itemA.key, itemB.key], msg);
      }
    }
  });

  return { conflicts, conflictMap };
}
