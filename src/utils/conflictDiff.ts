/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Różnicowy Konfliktów Równoległej Edycji (Conflict Difference Engine)
 * Opis: Precyzyjne wyliczanie metryk ilościowych oraz szczegółowej listy zmian
 * pomiędzy stanem lokalnym danej karty a stanem zapisanym w bazie danych przez inną kartę.
 */

import { AppState, SchedData, Lesson, DyzurEntry } from '../types';

export interface DiffMetric {
  key: string;
  label: string;
  icon: string;
  localCount: number;
  incomingCount: number;
  diff: number;
  unit: string;
}

export interface DiffDetailItem {
  id: string;
  category: 'lessons' | 'duties' | 'teachers' | 'classes' | 'rooms' | 'subjects' | 'special_students' | 'sched';
  categoryLabel: string;
  action: 'added' | 'modified' | 'removed';
  title: string;
  description: string;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue';
}

export interface ConflictDiffResult {
  hasDifferences: boolean;
  totalChangesCount: number;
  metrics: DiffMetric[];
  items: DiffDetailItem[];
  categorized: {
    lessons: DiffDetailItem[];
    duties: DiffDetailItem[];
    structure: DiffDetailItem[];
    sched: DiffDetailItem[];
  };
}

const POLISH_DAYS = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela'
];

/**
 * Computes a detailed, human-friendly diff between local and incoming AppState and SchedData.
 */
export function computeConflictDiff(
  localState?: AppState | null,
  incomingState?: AppState | null,
  localSched?: SchedData | null,
  incomingSched?: SchedData | null
): ConflictDiffResult {
  const items: DiffDetailItem[] = [];

  const local = localState || ({} as Partial<AppState>);
  const incoming = incomingState || ({} as Partial<AppState>);

  // Budowanie map encji (nauczyciele, klasy, sale) łączących stan lokalny i przychodzący
  const teachersMap = new Map<string, { first: string; last: string; abbr: string }>();
  (local.teachers || []).concat(local.planLekcji?.teachers || []).forEach(t => {
    if (t?.id) teachersMap.set(t.id, { first: t.first || '', last: t.last || '', abbr: t.abbr || '' });
  });
  (incoming.teachers || []).concat(incoming.planLekcji?.teachers || []).forEach(t => {
    if (t?.id) teachersMap.set(t.id, { first: t.first || '', last: t.last || '', abbr: t.abbr || '' });
  });

  const subjectsMap = new Map<string, { name: string; short: string }>();
  (local.subjects || []).concat(local.planLekcji?.subjects || []).forEach(s => {
    if (s?.id) subjectsMap.set(s.id, { name: s.name || '', short: s.short || '' });
  });
  (incoming.subjects || []).concat(incoming.planLekcji?.subjects || []).forEach(s => {
    if (s?.id) subjectsMap.set(s.id, { name: s.name || '', short: s.short || '' });
  });

  const classesMap = new Map<string, { name: string }>();
  (local.classes || []).concat(local.planLekcji?.classes || []).forEach(c => {
    if (c?.id) classesMap.set(c.id, { name: c.name || '' });
  });
  (incoming.classes || []).concat(incoming.planLekcji?.classes || []).forEach(c => {
    if (c?.id) classesMap.set(c.id, { name: c.name || '' });
  });

  const roomsMap = new Map<string, { name: string }>();
  (local.planLekcji?.rooms || []).forEach(r => {
    if (r?.id) roomsMap.set(r.id, { name: r.name || '' });
  });
  (incoming.planLekcji?.rooms || []).forEach(r => {
    if (r?.id) roomsMap.set(r.id, { name: r.name || '' });
  });

  // Mapa przydziałów lekcyjnych
  const assignmentsMap = new Map<string, { classId: string; teacherId: string | null; subjectId: string; roomId: string | null }>();
  (local.planLekcji?.assignments || []).forEach(a => {
    if (a?.id) assignmentsMap.set(a.id, a);
  });
  (incoming.planLekcji?.assignments || []).forEach(a => {
    if (a?.id) assignmentsMap.set(a.id, a);
  });

  // Godziny i siatki lekcyjne
  const timeslots = incoming.timeslots || local.timeslots || [];

  // 1. RÓŻNICE W LEKCJACH (PLAN KLAS)
  const localLessons = (local.planLekcji?.lessons || {}) as Record<string, Lesson>;
  const incomingLessons = (incoming.planLekcji?.lessons || {}) as Record<string, Lesson>;
  const allLessonKeys = Array.from(new Set([...Object.keys(localLessons), ...Object.keys(incomingLessons)]));

  const formatLessonSlot = (key: string, lesson?: Lesson) => {
    const parts = key.split('|').length >= 3 ? key.split('|') : key.split('_');
    const classId = parts[0] || '';
    const dayIdx = parseInt(parts[1], 10);
    const hourIdx = parseInt(parts[2], 10);

    const className = classesMap.get(classId)?.name || (classId ? `Klasa ${classId}` : 'Klasa');
    const dayName = !isNaN(dayIdx) && POLISH_DAYS[dayIdx] ? POLISH_DAYS[dayIdx] : `Dzień ${parts[1]}`;
    
    let hourLabel = `Lekcja ${isNaN(hourIdx) ? parts[2] : hourIdx + 1}`;
    if (!isNaN(hourIdx) && timeslots[hourIdx]) {
      hourLabel += ` (${timeslots[hourIdx].start} - ${timeslots[hourIdx].end})`;
    }

    let detailStr = '';
    if (lesson?.assignmentId) {
      const asg = assignmentsMap.get(lesson.assignmentId);
      if (asg) {
        const sub = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
        const tch = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
        const tchStr = tch ? `${tch.first} ${tch.last} (${tch.abbr})` : 'Bez nauczyciela';
        const rm = asg.roomId ? roomsMap.get(asg.roomId)?.name : null;
        detailStr = `${sub} • ${tchStr}${rm ? ` • Sala ${rm}` : ''}`;
      }
    }

    return { className, dayName, hourLabel, detailStr };
  };

  allLessonKeys.forEach(key => {
    const inLocal = localLessons[key];
    const inInc = incomingLessons[key];

    if (!inLocal && inInc) {
      const slot = formatLessonSlot(key, inInc);
      items.push({
        id: `lesson_add_${key}`,
        category: 'lessons',
        categoryLabel: 'Plan Lekcji',
        action: 'added',
        title: `Dodano lekcję: ${slot.className}`,
        description: `${slot.dayName}, ${slot.hourLabel}${slot.detailStr ? ` • ${slot.detailStr}` : ''}`,
        badgeLabel: '+ Dodano w innej karcie',
        badgeColor: 'emerald'
      });
    } else if (inLocal && !inInc) {
      const slot = formatLessonSlot(key, inLocal);
      items.push({
        id: `lesson_rem_${key}`,
        category: 'lessons',
        categoryLabel: 'Plan Lekcji',
        action: 'removed',
        title: `Usunięto lekcję: ${slot.className}`,
        description: `${slot.dayName}, ${slot.hourLabel}${slot.detailStr ? ` (było: ${slot.detailStr})` : ''}`,
        badgeLabel: '- Usunięto w innej karcie',
        badgeColor: 'rose'
      });
    } else if (inLocal && inInc && (inLocal.assignmentId !== inInc.assignmentId || inLocal.supportTeacherId !== inInc.supportTeacherId)) {
      const slotInc = formatLessonSlot(key, inInc);
      const slotLoc = formatLessonSlot(key, inLocal);
      items.push({
        id: `lesson_mod_${key}`,
        category: 'lessons',
        categoryLabel: 'Plan Lekcji',
        action: 'modified',
        title: `Zmieniono przydział lekcji: ${slotInc.className}`,
        description: `${slotInc.dayName}, ${slotInc.hourLabel} • W innej karcie: ${slotInc.detailStr || 'Nowy przydział'} (w tej karcie: ${slotLoc.detailStr || 'Poprzedni przydział'})`,
        badgeLabel: '~ Zmiana w innej karcie',
        badgeColor: 'amber'
      });
    }
  });

  // 2. RÓŻNICE W HARMONOGRAMIE DYŻURÓW
  const localDuties = (local.dyzury?.harmonogram || {}) as Record<string, DyzurEntry>;
  const incomingDuties = (incoming.dyzury?.harmonogram || {}) as Record<string, DyzurEntry>;
  const allDutyKeys = Array.from(new Set([...Object.keys(localDuties), ...Object.keys(incomingDuties)]));

  const miejscaMap = new Map<string, string>();
  (local.dyzury?.miejsca || []).concat(incoming.dyzury?.miejsca || []).forEach(m => {
    if (m?.id) miejscaMap.set(m.id, m.name || m.id);
  });

  const przerwyMap = new Map<number, { name: string; start: string; end: string }>();
  (local.dyzury?.przerwy || []).concat(incoming.dyzury?.przerwy || []).forEach(p => {
    if (p && typeof p.num === 'number') {
      przerwyMap.set(p.num, { name: p.name || `Przerwa ${p.num}`, start: p.start || '', end: p.end || '' });
    }
  });

  allDutyKeys.forEach(key => {
    const inLocal = localDuties[key];
    const inInc = incomingDuties[key];

    const parts = key.split('|');
    const miejsceId = parts[0] || '';
    const dayIdx = parseInt(parts[1], 10);
    const breakNum = parseInt(parts[2], 10);

    const miejsceName = miejscaMap.get(miejsceId) || `Stanowisko ${miejsceId}`;
    const dayName = !isNaN(dayIdx) && POLISH_DAYS[dayIdx] ? POLISH_DAYS[dayIdx] : `Dzień ${parts[1]}`;
    const pInfo = !isNaN(breakNum) ? przerwyMap.get(breakNum) : null;
    const breakLabel = pInfo ? `${pInfo.name}${pInfo.start ? ` (${pInfo.start} - ${pInfo.end})` : ''}` : `Przerwa ${parts[2]}`;

    if (!inLocal && inInc) {
      items.push({
        id: `duty_add_${key}`,
        category: 'duties',
        categoryLabel: 'Dyżury',
        action: 'added',
        title: `Dodano dyżur: ${miejsceName}`,
        description: `${dayName}, ${breakLabel} • Dyżurujący: ${inInc.teacherAbbr || 'Nauczyciel'}`,
        badgeLabel: '+ Dodano dyżur w innej karcie',
        badgeColor: 'emerald'
      });
    } else if (inLocal && !inInc) {
      items.push({
        id: `duty_rem_${key}`,
        category: 'duties',
        categoryLabel: 'Dyżury',
        action: 'removed',
        title: `Usunięto dyżur: ${miejsceName}`,
        description: `${dayName}, ${breakLabel} • Poprzednio dyżurował: ${inLocal.teacherAbbr || 'Nauczyciel'}`,
        badgeLabel: '- Usunięto dyżur w innej karcie',
        badgeColor: 'rose'
      });
    } else if (inLocal && inInc && inLocal.teacherAbbr !== inInc.teacherAbbr) {
      items.push({
        id: `duty_mod_${key}`,
        category: 'duties',
        categoryLabel: 'Dyżury',
        action: 'modified',
        title: `Zmieniono nauczyciela dyżuru: ${miejsceName}`,
        description: `${dayName}, ${breakLabel} • W innej karcie: ${inInc.teacherAbbr} (w tej karcie: ${inLocal.teacherAbbr})`,
        badgeLabel: '~ Zmiana obsady dyżuru',
        badgeColor: 'amber'
      });
    }
  });

  // 3. RÓŻNICE W LIŚCIE NAUCZYCIELI
  const localTeachersList = local.planLekcji?.teachers || local.teachers || [];
  const incTeachersList = incoming.planLekcji?.teachers || incoming.teachers || [];
  const localTeacherIds = new Set(localTeachersList.map(t => t.id));
  const incTeacherIds = new Set(incTeachersList.map(t => t.id));

  incTeachersList.forEach(t => {
    if (!localTeacherIds.has(t.id)) {
      items.push({
        id: `tch_add_${t.id}`,
        category: 'teachers',
        categoryLabel: 'Nauczyciele',
        action: 'added',
        title: `Dodano nauczyciela: ${t.first} ${t.last} (${t.abbr})`,
        description: `Wymiar etatu: ${t.maxHours || 18} godz.`,
        badgeLabel: '+ Nowy nauczyciel w innej karcie',
        badgeColor: 'emerald'
      });
    }
  });

  localTeachersList.forEach(t => {
    if (!incTeacherIds.has(t.id)) {
      items.push({
        id: `tch_rem_${t.id}`,
        category: 'teachers',
        categoryLabel: 'Nauczyciele',
        action: 'removed',
        title: `Usunięto nauczyciela: ${t.first} ${t.last} (${t.abbr})`,
        description: 'Nauczyciel został usunięty z bazy w innej karcie',
        badgeLabel: '- Usunięto nauczyciela w innej karcie',
        badgeColor: 'rose'
      });
    }
  });

  // 4. RÓŻNICE W ODZDZIAŁACH KLASOWYCH
  const localClassesList = local.planLekcji?.classes || local.classes || [];
  const incClassesList = incoming.planLekcji?.classes || incoming.classes || [];
  const localClassIds = new Set(localClassesList.map(c => c.id));
  const incClassIds = new Set(incClassesList.map(c => c.id));

  incClassesList.forEach(c => {
    if (!localClassIds.has(c.id)) {
      items.push({
        id: `cls_add_${c.id}`,
        category: 'classes',
        categoryLabel: 'Oddziały',
        action: 'added',
        title: `Dodano klasę: ${c.name}`,
        description: `Nowy oddział szkolny dodany w innej karcie`,
        badgeLabel: '+ Nowa klasa w innej karcie',
        badgeColor: 'emerald'
      });
    }
  });

  localClassesList.forEach(c => {
    if (!incClassIds.has(c.id)) {
      items.push({
        id: `cls_rem_${c.id}`,
        category: 'classes',
        categoryLabel: 'Oddziały',
        action: 'removed',
        title: `Usunięto klasę: ${c.name}`,
        description: 'Oddział został usunięty z bazy w innej karcie',
        badgeLabel: '- Usunięto klasę w innej karcie',
        badgeColor: 'rose'
      });
    }
  });

  // 5. RÓŻNICE W SALACH LEKCYJNYCH
  const localRoomsList = local.planLekcji?.rooms || [];
  const incRoomsList = incoming.planLekcji?.rooms || [];
  const localRoomIds = new Set(localRoomsList.map(r => r.id));
  const incRoomIds = new Set(incRoomsList.map(r => r.id));

  incRoomsList.forEach(r => {
    if (!localRoomIds.has(r.id)) {
      items.push({
        id: `rm_add_${r.id}`,
        category: 'rooms',
        categoryLabel: 'Sale',
        action: 'added',
        title: `Dodano salę: ${r.name}`,
        description: `Pojemność: ${r.capacity || 'standardowa'}`,
        badgeLabel: '+ Nowa sala w innej karcie',
        badgeColor: 'emerald'
      });
    }
  });

  localRoomsList.forEach(r => {
    if (!incRoomIds.has(r.id)) {
      items.push({
        id: `rm_rem_${r.id}`,
        category: 'rooms',
        categoryLabel: 'Sale',
        action: 'removed',
        title: `Usunięto salę: ${r.name}`,
        description: 'Sala lekcyjna usunięta w innej karcie',
        badgeLabel: '- Usunięto salę w innej karcie',
        badgeColor: 'rose'
      });
    }
  });

  // 6. RÓŻNICE W UCZNIACH ZE SPE I NI
  const localStudentsList = local.planLekcji?.specialStudents || [];
  const incStudentsList = incoming.planLekcji?.specialStudents || [];
  const localStudentIds = new Set(localStudentsList.map(s => s.id));
  const incStudentIds = new Set(incStudentsList.map(s => s.id));

  incStudentsList.forEach(s => {
    const studentFullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Uczeń SPE';
    const className = s.classId ? (classesMap.get(s.classId)?.name || s.classId) : 'Bez klasy';

    if (!localStudentIds.has(s.id)) {
      const modeStr = s.homeTeachingInSchool !== false ? 'W szkole' : 'W domu (poza szkołą)';
      items.push({
        id: `stud_add_${s.id}`,
        category: 'special_students',
        categoryLabel: 'Uczniowie SPE / NI',
        action: 'added',
        title: `Dodano ucznia SPE: ${studentFullName}`,
        description: `Klasa: ${className} • Tryb NI: ${modeStr}`,
        badgeLabel: '+ Dodano ucznia w innej karcie',
        badgeColor: 'emerald'
      });
    } else {
      const localS = localStudentsList.find(x => x.id === s.id);
      if (localS && localS.homeTeachingInSchool !== s.homeTeachingInSchool) {
        items.push({
          id: `stud_mod_${s.id}`,
          category: 'special_students',
          categoryLabel: 'Uczniowie SPE / NI',
          action: 'modified',
          title: `Zmieniono miejsce nauczania indywidualnego: ${studentFullName}`,
          description: `W innej karcie: ${s.homeTeachingInSchool !== false ? 'W szkole' : 'W domu'} (w tej karcie: ${localS.homeTeachingInSchool !== false ? 'W szkole' : 'W domu'})`,
          badgeLabel: '~ Zmiana trybu NI',
          badgeColor: 'amber'
        });
      }
    }
  });

  localStudentsList.forEach(s => {
    const studentFullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Uczeń SPE';
    if (!incStudentIds.has(s.id)) {
      items.push({
        id: `stud_rem_${s.id}`,
        category: 'special_students',
        categoryLabel: 'Uczniowie SPE / NI',
        action: 'removed',
        title: `Usunięto ucznia SPE: ${studentFullName}`,
        description: 'Uczeń usunięty z profilu wsparcia w innej karcie',
        badgeLabel: '- Usunięto ucznia w innej karcie',
        badgeColor: 'rose'
      });
    }
  });

  // 7. RÓŻNICE W PRZYDZIAŁACH SAL (PLAN SAL)
  if (localSched || incomingSched) {
    const countSlots = (sched?: SchedData | null) => {
      if (!sched || typeof sched !== 'object') return 0;
      let count = 0;
      Object.keys(sched).forEach(y => {
        const year = (sched as any)[y];
        if (year && typeof year === 'object') {
          Object.keys(year).forEach(d => {
            const day = year[d];
            if (day && typeof day === 'object') {
              Object.keys(day).forEach(h => {
                const hour = day[h];
                if (hour && typeof hour === 'object') {
                  count += Object.keys(hour).length;
                }
              });
            }
          });
        }
      });
      return count;
    };

    const locSlotCount = countSlots(localSched);
    const incSlotCount = countSlots(incomingSched);
    if (locSlotCount !== incSlotCount) {
      items.push({
        id: 'sched_diff_count',
        category: 'sched',
        categoryLabel: 'Plan Sal',
        action: 'modified',
        title: 'Zmiana obsadzenia gabinetów w Planie Sal',
        description: `W innej karcie: ${incSlotCount} obsadzonych godzin (w tej karcie: ${locSlotCount})`,
        badgeLabel: '~ Zmiana w Planie Sal',
        badgeColor: 'indigo'
      });
    }
  }

  // 8. ZESTAWIENIE METRYK BILANSU
  const localLessonsCount = Object.keys(localLessons).length;
  const incomingLessonsCount = Object.keys(incomingLessons).length;

  const localDutiesCount = Object.keys(localDuties).length;
  const incomingDutiesCount = Object.keys(incomingDuties).length;

  const localTeachersCount = localTeachersList.length;
  const incomingTeachersCount = incTeachersList.length;

  const localClassesCount = localClassesList.length;
  const incomingClassesCount = incClassesList.length;

  const localRoomsCount = localRoomsList.length;
  const incomingRoomsCount = incRoomsList.length;

  const localStudentsCount = localStudentsList.length;
  const incomingStudentsCount = incStudentsList.length;

  const metrics: DiffMetric[] = [
    {
      key: 'lessons',
      label: 'Lekcje w planie',
      icon: '📚',
      localCount: localLessonsCount,
      incomingCount: incomingLessonsCount,
      diff: incomingLessonsCount - localLessonsCount,
      unit: 'lekcji'
    },
    {
      key: 'duties',
      label: 'Dyżury nauczycielskie',
      icon: '🛡️',
      localCount: localDutiesCount,
      incomingCount: incomingDutiesCount,
      diff: incomingDutiesCount - localDutiesCount,
      unit: 'dyżurów'
    },
    {
      key: 'teachers',
      label: 'Nauczyciele',
      icon: '👨‍🏫',
      localCount: localTeachersCount,
      incomingCount: incomingTeachersCount,
      diff: incomingTeachersCount - localTeachersCount,
      unit: 'osób'
    },
    {
      key: 'classes',
      label: 'Oddziały / Klasy',
      icon: '🏫',
      localCount: localClassesCount,
      incomingCount: incomingClassesCount,
      diff: incomingClassesCount - localClassesCount,
      unit: 'klas'
    },
    {
      key: 'rooms',
      label: 'Sale lekcyjne',
      icon: '🚪',
      localCount: localRoomsCount,
      incomingCount: incomingRoomsCount,
      diff: incomingRoomsCount - localRoomsCount,
      unit: 'sal'
    },
    {
      key: 'special_students',
      label: 'Uczniowie SPE / NI',
      icon: '🎓',
      localCount: localStudentsCount,
      incomingCount: incomingStudentsCount,
      diff: incomingStudentsCount - localStudentsCount,
      unit: 'uczniów'
    }
  ];

  const categorized = {
    lessons: items.filter(i => i.category === 'lessons'),
    duties: items.filter(i => i.category === 'duties'),
    structure: items.filter(i => ['teachers', 'classes', 'rooms', 'subjects', 'special_students'].includes(i.category)),
    sched: items.filter(i => i.category === 'sched')
  };

  return {
    hasDifferences: items.length > 0 || metrics.some(m => m.diff !== 0),
    totalChangesCount: items.length,
    metrics,
    items,
    categorized
  };
}
