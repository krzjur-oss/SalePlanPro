/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Szybkich Zastępstw Dziennych (SubstitutionService)
 * Opis: Automatyczne wykrywanie lekcji nieobecnych nauczycieli, bezkolizyjne
 *       rekomendacje zastępców, optymalizacja okienek oraz generowanie ogłoszeń.
 */

import { 
  AppState, 
  SchedData, 
  Lesson, 
  Assignment, 
  Teacher, 
  Subject, 
  ClassRoom, 
  Class,
  DailySubstitution,
  AbsenceRecord,
  CandidateTeacherInfo,
  DailySubstitutionsState,
  SubstitutionActionType
} from '../types';
import { isTeacherAvailableAtNum } from '../utils/availability';

export const POLISH_DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
export const POLISH_MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
];

/**
 * Zwraca datę w formacie YYYY-MM-DD
 */
export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Zwraca datę przesuniętą o określoną liczbę dni (w tym dni roboczych)
 */
export function getOffsetISODate(baseDateStr: string, daysOffset: number): string {
  const parts = baseDateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Zwraca kolejny dzień roboczy (jeśli dziś piątek -> poniedziałek)
 */
export function getNextSchoolDayISODate(baseDateStr: string): string {
  let cur = baseDateStr;
  for (let i = 0; i < 7; i++) {
    cur = getOffsetISODate(cur, 1);
    const dayOfWeek = getSchoolDayOfWeek(cur);
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      return cur;
    }
  }
  return cur;
}

/**
 * Zwraca poprzedni dzień roboczy
 */
export function getPrevSchoolDayISODate(baseDateStr: string): string {
  let cur = baseDateStr;
  for (let i = 0; i < 7; i++) {
    cur = getOffsetISODate(cur, -1);
    const dayOfWeek = getSchoolDayOfWeek(cur);
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      return cur;
    }
  }
  return cur;
}

/**
 * Zwraca indeks dnia szkolnego (0 = Poniedziałek, 1 = Wtorek, ..., 4 = Piątek).
 * Dla weekendów zwraca -1.
 */
export function getSchoolDayOfWeek(dateStr: string): number {
  if (!dateStr) return -1;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return -1;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = date.getDay(); // 0 = Niedziela, 1 = Poniedziałek, ..., 6 = Sobota
  if (day === 0 || day === 6) {
    return -1;
  }
  return day - 1; // 0..4
}

/**
 * Formatuje datę w języku polskim z nazwą dnia tygodnia, np. "Środa, 14 października 2026"
 */
export function formatPolishDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayOfWeek = date.getDay();
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const dayName = dayNames[dayOfWeek] || '';
  const dayNum = date.getDate();
  const monthName = POLISH_MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();

  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

/**
 * Sprawdza, czy dana data przypada na weekend
 */
export function isWeekend(dateStr: string): boolean {
  return getSchoolDayOfWeek(dateStr) === -1;
}

/**
 * Wyszukuje lekcje w planie bazowym dotknięte nieobecnością nauczyciela
 */
export function findAffectedLessonsForAbsence(
  absence: AbsenceRecord,
  appState: AppState,
  schedData?: SchedData
): DailySubstitution[] {
  const dayOfWeek = getSchoolDayOfWeek(absence.date);
  if (dayOfWeek === -1) {
    return []; // Nieobecność w weekend nie generuje lekcji
  }

  const pl = appState.planLekcji;
  if (!pl || !pl.lessons) {
    return [];
  }

  const assignmentsMap = new Map<string, Assignment>(pl.assignments.map(a => [a.id, a]));
  const classesMap = new Map<string, Class>(pl.classes.map(c => [c.id, c]));
  const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
  const roomsMap = new Map<string, ClassRoom>(pl.rooms.map(r => [r.id, r]));
  const timeslots = appState.timeslots || [];

  // Przygotowanie mapy dyżurów nieobecnego nauczyciela
  const teacherAbbr = absence.teacherAbbr;
  const harmonogram = appState.dyzury?.harmonogram || {};
  const miejsca = appState.dyzury?.miejsca || [];
  const przerwy = appState.dyzury?.przerwy || [];

  const dutiesOnDay: Array<{ breakNum: number; spotName: string; timeRange: string }> = [];
  Object.entries(harmonogram).forEach(([key, entry]) => {
    if (entry && entry.teacherAbbr === teacherAbbr) {
      // Klucz zazwyczaj: "spotId_dayIdx_breakNum"
      const parts = key.split('_');
      if (parts.length >= 3) {
        const spotId = parts[0];
        const dIdx = parseInt(parts[1], 10);
        const bNum = parseInt(parts[2], 10);
        if (dIdx === dayOfWeek) {
          const spot = miejsca.find(m => m.id === spotId);
          const przerw = przerwy.find(p => p.num === bNum);
          dutiesOnDay.push({
            breakNum: bNum,
            spotName: spot ? spot.name : 'Dyżur szkolny',
            timeRange: przerw ? `${przerw.start} - ${przerw.end}` : `Przerwa ${bNum}`
          });
        }
      }
    }
  });

  const substitutions: DailySubstitution[] = [];

  Object.entries(pl.lessons).forEach(([lessonKey, lesson]) => {
    if (!lesson || !lesson.assignmentId) return;
    const asg = assignmentsMap.get(lesson.assignmentId);
    if (!asg) return;

    // Sprawdzenie, czy to lekcja nieobecnego nauczyciela
    if (asg.teacherId !== absence.teacherId) return;

    // Rozbicie klucza: classId|day|hour lub classId|day|hour|groupId
    const parts = lessonKey.split('|');
    const cId = parts[0];
    const d = parseInt(parts[1], 10);
    const h = parseInt(parts[2], 10);

    if (d !== dayOfWeek) return;

    // Sprawdzenie zakresu godzinowego nieobecności
    if (!absence.wholeDay) {
      const sH = absence.startHour ?? 1;
      const eH = absence.endHour ?? 10;
      if (h < sH || h > eH) {
        return;
      }
    }

    const cls = classesMap.get(cId);
    const subj = subjectsMap.get(asg.subjectId);
    const origRoom = asg.roomId ? roomsMap.get(asg.roomId) : null;
    const timeSlot = timeslots[h - 1];

    // Powiązany dyżur na przerwie po tej lekcji
    const dutyAfter = dutiesOnDay.find(duty => duty.breakNum === h);

    const sub: DailySubstitution = {
      id: `sub-${absence.id}-${h}-${cId}`,
      absenceId: absence.id,
      date: absence.date,
      dayOfWeek,
      hourNum: h,
      timeRange: timeSlot ? `${timeSlot.start} - ${timeSlot.end}` : undefined,
      lessonKey,
      classId: cId,
      className: cls ? cls.name : cId,
      subjectId: asg.subjectId,
      subjectName: subj ? subj.name : 'Zajęcia edukacyjne',
      subjectColor: subj ? subj.color : '#3b82f6',
      originalTeacherId: absence.teacherId,
      originalTeacherName: absence.teacherName,
      originalTeacherAbbr: absence.teacherAbbr,
      originalRoomId: asg.roomId,
      originalRoomName: origRoom ? origRoom.name : undefined,
      actionType: 'unassigned',
      status: 'pending',
      isDutyAffected: !!dutyAfter,
      dutySpotName: dutyAfter ? dutyAfter.spotName : undefined,
      dutyBreakTime: dutyAfter ? dutyAfter.timeRange : undefined,
      updatedAt: new Date().toISOString()
    };

    substitutions.push(sub);
  });

  // Sortowanie lekcji chronologicznie według numeru godziny i nazwy klasy
  return substitutions.sort((a, b) => {
    if (a.hourNum !== b.hourNum) return a.hourNum - b.hourNum;
    return a.className.localeCompare(b.className, undefined, { numeric: true });
  });
}

/**
 * Wyszukuje i ocenia kandydatów na zastępcę w danym slocie
 */
export function getSmartSubstitutionCandidates(
  sub: DailySubstitution,
  appState: AppState,
  schedData?: SchedData,
  existingSubsForDate: DailySubstitution[] = [],
  absencesForDate: AbsenceRecord[] = []
): CandidateTeacherInfo[] {
  const pl = appState.planLekcji;
  if (!pl) return [];

  const allTeachers = pl.teachers || [];
  const assignments = pl.assignments || [];
  const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
  const classesMap = new Map<string, Class>(pl.classes.map(c => [c.id, c]));

  // Zbiór ID nauczycieli nieobecnych w tym dniu
  const absentTeacherIds = new Set<string>(
    absencesForDate
      .filter(a => {
        if (a.wholeDay) return true;
        const sH = a.startHour ?? 1;
        const eH = a.endHour ?? 10;
        return sub.hourNum >= sH && sub.hourNum <= eH;
      })
      .map(a => a.teacherId)
  );

  // Zbiór ID nauczycieli już przypisanych do zastępstwa w tej samej godzinie
  const alreadySubbingTeacherIds = new Set<string>(
    existingSubsForDate
      .filter(s => s.id !== sub.id && s.hourNum === sub.hourNum && s.replacementTeacherId)
      .map(s => s.replacementTeacherId!)
  );

  // Mapa lekcji wszystkich nauczycieli w danym dniu: teacherId -> Set<hourNum>
  // oraz szczegóły lekcji w tej konkretnej godzinie: teacherId -> { className, subjectName }
  const teacherDayHoursMap = new Map<string, Set<number>>();
  const teacherHourLessonDetails = new Map<string, { className: string; subjectName: string }>();

  // Mapa kwalifikacji przedmiotowych: teacherId -> Set<subjectId>
  const teacherSubjectQuals = new Map<string, Set<string>>();
  // Mapa klas, których uczy dany nauczyciel: teacherId -> Set<classId>
  const teacherClassesMap = new Map<string, Set<string>>();

  assignments.forEach(asg => {
    if (!asg.teacherId) return;
    if (!teacherSubjectQuals.has(asg.teacherId)) {
      teacherSubjectQuals.set(asg.teacherId, new Set());
    }
    teacherSubjectQuals.get(asg.teacherId)!.add(asg.subjectId);

    if (!teacherClassesMap.has(asg.teacherId)) {
      teacherClassesMap.set(asg.teacherId, new Set());
    }
    teacherClassesMap.get(asg.teacherId)!.add(asg.classId);
  });

  const assignmentsById = new Map<string, Assignment>(assignments.map(a => [a.id, a]));

  // Analiza siatki godzin w planie bazowym
  Object.entries(pl.lessons).forEach(([key, lesson]) => {
    if (!lesson || !lesson.assignmentId) return;
    const asg = assignmentsById.get(lesson.assignmentId);
    if (!asg || !asg.teacherId) return;

    const parts = key.split('|');
    const cId = parts[0];
    const d = parseInt(parts[1], 10);
    const h = parseInt(parts[2], 10);

    if (d === sub.dayOfWeek) {
      if (!teacherDayHoursMap.has(asg.teacherId)) {
        teacherDayHoursMap.set(asg.teacherId, new Set());
      }
      teacherDayHoursMap.get(asg.teacherId)!.add(h);

      if (h === sub.hourNum) {
        const cls = classesMap.get(cId);
        const subj = subjectsMap.get(asg.subjectId);
        teacherHourLessonDetails.set(asg.teacherId, {
          className: cls ? cls.name : cId,
          subjectName: subj ? subj.name : 'Lekcja'
        });
      }
    }
  });

  const candidates: CandidateTeacherInfo[] = [];

  allTeachers.forEach(teacher => {
    // Nie bierzemy pod uwagę nieobecnego nauczyciela
    if (teacher.id === sub.originalTeacherId) return;

    const fullName = `${teacher.first} ${teacher.last}`.trim();
    const dayHours = teacherDayHoursMap.get(teacher.id) || new Set<number>();
    const teachesSameSubject = teacherSubjectQuals.get(teacher.id)?.has(sub.subjectId) || false;
    const teachesSameClass = teacherClassesMap.get(teacher.id)?.has(sub.classId) || false;

    // Sprawdzenie dostępności
    const isAbsentToday = absentTeacherIds.has(teacher.id);
    const isAlreadySubbing = alreadySubbingTeacherIds.has(teacher.id);
    const hasOwnLesson = dayHours.has(sub.hourNum);

    const isAvailable = !isAbsentToday && !isAlreadySubbing && !hasOwnLesson;

    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 50; // Baza startowa dla wolnego nauczyciela

    if (isAbsentToday) {
      score = 0;
      warnings.push('Nauczyciel zgłoszony jako nieobecny w tym dniu');
    } else if (isAlreadySubbing) {
      score = 0;
      warnings.push('Przypisany już do innego zastępstwa w tej godzinie');
    } else if (hasOwnLesson) {
      score = 0;
      const own = teacherHourLessonDetails.get(teacher.id);
      warnings.push(`Prowadzi w tym czasie własną lekcję (${own?.className || ''} - ${own?.subjectName || ''})`);
    } else {
      // 1. Zgodność przedmiotowa (Kwalifikacje do przedmiotu)
      if (teachesSameSubject) {
        score += 30;
        reasons.push('Uczy tego samego przedmiotu (kwalifikacje)');
      }

      // 2. Znajomość klasy (Uczy ten sam oddział w innym przedmiocie)
      if (teachesSameClass) {
        score += 15;
        reasons.push(`Zna klasę ${sub.className} (uczy ten oddział)`);
      }

      // 3. Wychowawstwo klasy
      const isHomeroom = Object.values(appState.homerooms || {}).some(
        h => h.className === sub.className && h.teacherAbbr === teacher.abbr
      );
      if (isHomeroom) {
        score += 15;
        reasons.push(`Wychowawca klasy ${sub.className}`);
      }

      // 4. Analiza okienek i obecności w szkole
      const hasLessonBefore = dayHours.has(sub.hourNum - 1);
      const hasLessonAfter = dayHours.has(sub.hourNum + 1);

      if (hasLessonBefore && hasLessonAfter) {
        score += 25;
        reasons.push('Wypełnia 1-godzinne okienko między swoimi lekcjami');
      } else if (hasLessonBefore || hasLessonAfter) {
        score += 15;
        reasons.push('Lekcja przyległa do bieżącego planu nauczyciela');
      } else if (dayHours.size === 0) {
        score -= 20;
        warnings.push('Dzień wolny nauczyciela od zajęć dydaktycznych');
      } else {
        score += 5;
        reasons.push('Jest obecny w szkole w tym dniu');
      }

      // 5. Preferencje dyspozycyjności z Kreatora Szkoły
      if (!isTeacherAvailableAtNum(teacher, sub.dayOfWeek, sub.hourNum)) {
        score -= 25;
        warnings.push('Godzina oznaczona jako niedyspozycyjna w profilu');
      }

      // 6. Uwzględnienie ról niepedagogicznych (świetlica, biblioteka)
      if (teacher.nonTeachingRoles && teacher.nonTeachingRoles.length > 0) {
        reasons.push(`Pełni funkcję: ${teacher.nonTeachingRoles.join(', ')}`);
      }
    }

    // Ograniczenie punktacji do przedziału 0..100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let recommendationLevel: CandidateTeacherInfo['recommendationLevel'] = 'conflict';
    if (finalScore >= 80) {
      recommendationLevel = 'ideal';
    } else if (finalScore >= 60) {
      recommendationLevel = 'good';
    } else if (finalScore >= 30) {
      recommendationLevel = 'possible';
    }

    candidates.push({
      teacherId: teacher.id,
      first: teacher.first,
      last: teacher.last,
      abbr: teacher.abbr,
      fullName,
      score: finalScore,
      recommendationLevel,
      isAvailable,
      hasWindowInSchedule: dayHours.has(sub.hourNum - 1) && dayHours.has(sub.hourNum + 1),
      teachesSameSubject,
      teachesSameClass,
      currentLessonAtHour: teacherHourLessonDetails.get(teacher.id),
      reasons,
      warnings
    });
  });

  // Sortowanie kandydatów: najpierw dostępni, potem według najwyższego score i nazwiska
  return candidates.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
  });
}

/**
 * Sugeruje optymalnego kandydata oraz salę dla danego zastępstwa
 */
export function suggestOptimalSubstitution(
  sub: DailySubstitution,
  appState: AppState,
  schedData?: SchedData,
  existingSubsForDate: DailySubstitution[] = [],
  absencesForDate: AbsenceRecord[] = []
): { candidate: CandidateTeacherInfo | null; room: ClassRoom | null; actionType: SubstitutionActionType } {
  const candidates = getSmartSubstitutionCandidates(sub, appState, schedData, existingSubsForDate, absencesForDate);
  const bestCandidate = candidates.find(c => c.isAvailable && c.score >= 40) || null;

  // Sprawdzenie dostępności sali bazowej
  let recommendedRoom: ClassRoom | null = null;
  const pl = appState.planLekcji;
  if (pl) {
    if (sub.originalRoomId) {
      recommendedRoom = pl.rooms.find(r => r.id === sub.originalRoomId) || null;
    }
    if (!recommendedRoom && pl.rooms.length > 0) {
      recommendedRoom = pl.rooms[0];
    }
  }

  return {
    candidate: bestCandidate,
    room: recommendedRoom,
    actionType: bestCandidate ? 'substitute_teacher' : 'study_room'
  };
}

/**
 * Automatyczne przypisanie wszystkich nierozstrzygniętych wakatów na dany dzień
 */
export function autoResolveAllPendingForDate(
  date: string,
  appState: AppState,
  schedData: SchedData | undefined,
  currentSubs: DailySubstitution[],
  absences: AbsenceRecord[]
): DailySubstitution[] {
  const daySubs = currentSubs.filter(s => s.date === date);
  const otherSubs = currentSubs.filter(s => s.date !== date);
  const dayAbsences = absences.filter(a => a.date === date);

  const updatedDaySubs: DailySubstitution[] = [...daySubs];

  // Iterujemy po wakatach (pending / unassigned)
  updatedDaySubs.forEach((sub, idx) => {
    if (sub.actionType === 'unassigned' || sub.status === 'pending') {
      const suggestion = suggestOptimalSubstitution(
        sub,
        appState,
        schedData,
        updatedDaySubs,
        dayAbsences
      );

      if (suggestion.candidate) {
        updatedDaySubs[idx] = {
          ...sub,
          actionType: 'substitute_teacher',
          replacementTeacherId: suggestion.candidate.teacherId,
          replacementTeacherName: suggestion.candidate.fullName,
          replacementTeacherAbbr: suggestion.candidate.abbr,
          replacementRoomId: suggestion.room ? suggestion.room.id : sub.originalRoomId,
          replacementRoomName: suggestion.room ? suggestion.room.name : sub.originalRoomName,
          status: 'confirmed',
          note: suggestion.candidate.teachesSameSubject 
            ? 'Zastępstwo przedmiotowe (realizacja programu)' 
            : 'Zastępstwo doraźne (opieka dydaktyczna)',
          updatedAt: new Date().toISOString()
        };
      } else {
        // Jeśli brak wolnego nauczyciela – przekierowanie do czytelni / opieki
        updatedDaySubs[idx] = {
          ...sub,
          actionType: 'study_room',
          status: 'confirmed',
          note: 'Brak wolnego nauczyciela w okienku – opieka w czytelni / świetlicy',
          updatedAt: new Date().toISOString()
        };
      }
    }
  });

  return [...otherSubs, ...updatedDaySubs];
}

/**
 * Generuje sformatowaną treść ogłoszenia do schowka / Librusa / e-dziennika
 */
export function generateSubstitutionsTextAnnouncement(
  dateStr: string,
  substitutions: DailySubstitution[],
  absences: AbsenceRecord[],
  schoolName: string = 'Szkoła'
): string {
  const daySubs = substitutions.filter(s => s.date === dateStr);
  const dayAbsences = absences.filter(a => a.date === dateStr);
  const formattedDate = formatPolishDateWithDay(dateStr);

  const lines: string[] = [];
  lines.push(`=======================================================`);
  lines.push(`📋 ORGANIZACJA ZASTĘPSTW DZIENNYCH – ${schoolName.toUpperCase()}`);
  lines.push(`📅 Data: ${formattedDate}`);
  lines.push(`=======================================================`);
  lines.push(``);

  if (dayAbsences.length > 0) {
    lines.push(`🔴 NIEOBECNI NAUCZYCIELE:`);
    dayAbsences.forEach(a => {
      const scope = a.wholeDay ? 'cały dzień' : `lekcje ${a.startHour}-${a.endHour}`;
      const reasonLabel = getAbsenceReasonLabel(a.reason);
      lines.push(` • ${a.teacherName} (${scope}) [${reasonLabel}]`);
    });
    lines.push(``);
  }

  if (daySubs.length === 0) {
    lines.push(`Brak zaplanowanych zastępstw na ten dzień (zajęcia zgodnie z planem).`);
    return lines.join('\n');
  }

  lines.push(`⚡ SZCZEGÓŁOWY HARMONOGRAM ZASTĘPSTW:`);
  lines.push(`-------------------------------------------------------`);

  daySubs.forEach(s => {
    const time = s.timeRange ? `(${s.timeRange})` : '';
    let actionDesc = '';

    if (s.actionType === 'substitute_teacher') {
      actionDesc = `Zastępca: ${s.replacementTeacherName || '–'} | Sala: ${s.replacementRoomName || s.originalRoomName || 'b/s'}`;
    } else if (s.actionType === 'study_room') {
      actionDesc = `Opieka w czytelni / świetlicy szkolnej`;
    } else if (s.actionType === 'combine_classes') {
      actionDesc = `Łączenie z oddziałem: ${s.combinedWithClassName || 'inna klasa'}`;
    } else if (s.actionType === 'cancel_lesson') {
      actionDesc = `Lekcja odwołana (uczniowie zwolnieni do domu / przychodzą później)`;
    } else if (s.actionType === 'change_room') {
      actionDesc = `Zmiana sali: nowa sala ${s.replacementRoomName || 'b/s'}`;
    } else {
      actionDesc = `WAKAT – oczekuje na decyzję dyrekcji`;
    }

    const notePart = s.note ? ` [Uwaga: ${s.note}]` : '';
    lines.push(`Lekcja ${s.hourNum} ${time}: Klasa ${s.className} – ${s.subjectName}`);
    lines.push(`   ↳ ${actionDesc}${notePart}`);
    if (s.isDutyAffected && s.dutySpotName) {
      lines.push(`   ⚠️ Zastępstwo na dyżurze: ${s.dutySpotName} (${s.dutyBreakTime || ''})`);
    }
    lines.push(``);
  });

  lines.push(`-------------------------------------------------------`);
  lines.push(`Wygenerowano automatycznie w systemie SalePlan Pro.`);

  return lines.join('\n');
}

/**
 * Zwraca czytelną polską etykietę powodu nieobecności
 */
export function getAbsenceReasonLabel(reason: AbsenceRecord['reason']): string {
  switch (reason) {
    case 'zwolnienie_lekarskie': return 'Zwolnienie lekarskie (L4)';
    case 'opieka': return 'Opieka nad dzieckiem / członkiem rodziny';
    case 'wycieczka': return 'Wycieczka szkolna / wyjście';
    case 'szkolenie': return 'Szkolenie / konferencja';
    case 'urlop': return 'Urlop okolicznościowy / wypoczynkowy';
    case 'delegacja': return 'Delegacja służbowa';
    case 'inne': default: return 'Inna przyczyna usprawiedliwiona';
  }
}

/**
 * Zwraca domyślny zestaw demonstracyjnych nieobecności i zastępstw
 */
export function getDemoDailySubstitutions(appState: AppState): DailySubstitutionsState {
  const today = getTodayISODate();
  const teachers = appState.planLekcji?.teachers || [];
  
  if (teachers.length === 0) {
    return {
      absences: [],
      substitutions: [],
      selectedDate: today
    };
  }

  // Wybieramy pierwszego nauczyciela do demonstracji nieobecności
  const firstTeacher = teachers[0];
  const demoAbsence: AbsenceRecord = {
    id: `demo-abs-${Date.now()}`,
    teacherId: firstTeacher.id,
    teacherName: `${firstTeacher.first} ${firstTeacher.last}`,
    teacherAbbr: firstTeacher.abbr,
    date: today,
    reason: 'zwolnienie_lekarskie',
    reasonDetails: 'L4 – powrót w poniedziałek',
    wholeDay: true,
    createdAt: new Date().toISOString()
  };

  const initialSubs = findAffectedLessonsForAbsence(demoAbsence, appState);

  // Wypełniamy pierwsze zastępstwo demonstracyjną propozycją
  if (initialSubs.length > 0) {
    const firstSub = initialSubs[0];
    const candidate = getSmartSubstitutionCandidates(firstSub, appState).find(c => c.isAvailable);
    if (candidate) {
      initialSubs[0] = {
        ...firstSub,
        actionType: 'substitute_teacher',
        replacementTeacherId: candidate.teacherId,
        replacementTeacherName: candidate.fullName,
        replacementTeacherAbbr: candidate.abbr,
        replacementRoomName: firstSub.originalRoomName,
        status: 'confirmed',
        note: 'Zastępstwo demonstracyjne zrealizowane z systemem SalePlan Pro',
        updatedAt: new Date().toISOString()
      };
    }
  }

  return {
    absences: [demoAbsence],
    substitutions: initialSubs,
    selectedDate: today
  };
}
