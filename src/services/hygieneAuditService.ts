/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Audytora Higieny Planu Ucznia wg wytycznych MEN (hygieneAuditService.ts)
 * Opis: Weryfikacja planu lekcji pod kątem rozporządzeń MEN, wytycznych Sanepidu,
 *       krzywej zmęczenia uczniów, limitów dziennych, okienek i przerw regeneracyjnych.
 */

import { 
  AppState, 
  Lesson, 
  Assignment, 
  Subject, 
  Class, 
  Hour,
  SubjectDifficultyLevel,
  SubjectHygieneClassification,
  HygieneViolation,
  DayHygieneStats,
  ClassHygieneReport,
  SchoolHygieneAuditSummary
} from '../types';

export const DAYS_POLISH = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

// ── REGULACJE MEN I SANEPIDU – DANE REFERENCYJNE ──
export const MEN_REGULATION_REFS = {
  DAILY_LIMITS: 'Rozporządzenie MEN ws. BHP w szkołach (§ 9 ust. 1: równomierne obciążenie zajęciami)',
  FATIGUE_CURVE: 'Wytyczne higieny pracy umysłowej ucznia (MEN & Sanepid: przedmioty trudne w fazie szczytowej percepcji)',
  CHAINS: 'Standardy ergonomii planu lekcji (zakaz kumulacji 3+ przedmiotów ścisłych bez oddechu)',
  NO_GAPS: 'Rozporządzenie MEN ws. BHP (§ 13: zakaz pozostawiania uczniów bez opieki / okienek dla oddziałów)',
  LUNCH_BREAK: 'Wytyczne IŻŻ & MEN (minimum 15-20 min przerwy obiadowej przy pobycie > 5 godz.)',
  WEEKLY_BALANCE: 'Rozporządzenie MEN ws. ramowych planów nauczania (różnica między dniami max 1-2 godz.)',
  START_STABILITY: 'Standardy chronobiologiczne Sanepidu (stałość godziny rozpoczęcia zajęć)'
};

/**
 * Automatyczna klasyfikacja trudności przedmiotu na podstawie polskiego nazewnictwa
 */
export function classifySubjectDifficulty(subject: Subject): SubjectDifficultyLevel {
  const name = (subject.name || '').toLowerCase().trim();
  const short = (subject.short || '').toLowerCase().trim();

  // 1. Przedmioty lekkie / relaksacyjne / ruchowe (Light) - sprawdzamy najpierw, aby WF nie był mylony z fizyką
  const lightPatterns = [
    'wychowanie fizyczne', 'wf', 'w-f', 'sport', 'basen', 'gimnastyk',
    'plastyk', 'plast', 'muzyk', 'muz', 'sztuk',
    'technik', 'tech', 'zajęcia techniczne',
    'godzina wychowawcza', 'godz. wych', 'gw', 'zajęcia z wychowawcą', 'godzina z wychowawcą',
    'religi', 'rel', 'etyk',
    'edukacja dla bezpieczeństwa', 'edb', 'bhp',
    'rytmik', 'zajęcia korekcyjne', 'korektyw', 'rewalidacj', 'terapi'
  ];

  if (lightPatterns.some(p => name.includes(p) || short === p)) {
    return 'light';
  }

  // 2. Przedmioty trudne / wzmożonego wysiłku umysłowego (Hard)
  const hardPatterns = [
    'matematyk', 'mat', 'fizyk', 'chemia', 'chemiczn', 'chem', 'biolog', 'biol', 'geograf', 'geog',
    'polski', 'pol', 'język polski', 'j. polski', 'j.pol',
    'angielsk', 'ang', 'j. angielski', 'język angielski', 'j.ang',
    'niemieck', 'niem', 'j. niemiecki', 'język niemiecki', 'j.niem',
    'hiszpańsk', 'hiszp', 'j. hiszpański', 'francusk', 'rosyjsk', 'włosk', 'łacin',
    'informatyk', 'inf', 'programowan', 'algorytm',
    'histori', 'hist', 'wiedza o społeczeństwie', 'wos',
    'przedsiębiorczoś', 'biznes', 'ekonomi', 'robotyk'
  ];

  if (hardPatterns.some(p => name.includes(p) || short === p)) {
    return 'hard';
  }

  // 3. Przedmioty umiarkowane (Medium) - np. przyroda, edukacja wczesnoszkolna
  return 'medium';
}

/**
 * Określenie etapu edukacyjnego klasy
 */
export function determineGradeLevel(className: string, classYear?: number | null): '1-3' | '4-6' | '7-8' | 'ponadpodstawowa' {
  const clean = className.trim().toUpperCase();

  // Sprawdzenie szkół ponadpodstawowych (LO, Technikum, BS)
  if (clean.includes('LO') || clean.includes('TECH') || clean.includes('BS') || clean.includes('LICEUM')) {
    return 'ponadpodstawowa';
  }

  // Odczyt pierwszej cyfry z nazwy klasy (np. "1A" -> 1, "4B" -> 4, "7C" -> 7)
  const match = clean.match(/^([1-8])/);
  if (match) {
    const gradeNum = parseInt(match[1], 10);
    if (gradeNum >= 1 && gradeNum <= 3) return '1-3';
    if (gradeNum >= 4 && gradeNum <= 6) return '4-6';
    if (gradeNum >= 7 && gradeNum <= 8) return '7-8';
  }

  if (classYear) {
    if (classYear >= 1 && classYear <= 3) return '1-3';
    if (classYear >= 4 && classYear <= 6) return '4-6';
    if (classYear >= 7 && classYear <= 8) return '7-8';
  }

  return '4-6'; // Domyślnie
}

/**
 * Zwraca maksymalny dopuszczalny dzienny wymiar godzin dla danego etapu wg MEN
 */
export function getMaxDailyHoursForGrade(gradeLevel: '1-3' | '4-6' | '7-8' | 'ponadpodstawowa'): number {
  switch (gradeLevel) {
    case '1-3': return 5;
    case '4-6': return 6;
    case '7-8': return 7;
    case 'ponadpodstawowa': return 8;
  }
}

/**
 * Sprawdza czy w danym dniu i oknie czasowym występuje długa przerwa obiadowa
 */
export function checkLunchBreakAvailable(timeslots: Hour[]): boolean {
  if (!timeslots || timeslots.length < 4) return true;

  // Analizujemy przerwy między lekcjami 3 a 6 (okno 11:15 - 13:30)
  for (let i = 2; i < Math.min(6, timeslots.length - 1); i++) {
    const curEnd = timeslots[i].end;
    const nextStart = timeslots[i + 1].start;
    if (curEnd && nextStart) {
      const [curH, curM] = curEnd.split(':').map(Number);
      const [nextH, nextM] = nextStart.split(':').map(Number);
      const durationMin = (nextH * 60 + nextM) - (curH * 60 + curM);
      if (durationMin >= 15) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Główny audytor higieny planu lekcji pojedynczego oddziału (klasy)
 */
export function auditClassHygiene(
  cls: Class,
  appState: AppState
): ClassHygieneReport {
  const pl = appState.planLekcji;
  const assignmentsMap = new Map<string, Assignment>(pl.assignments.map(a => [a.id, a]));
  const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
  const timeslots = appState.timeslots || [];
  const gradeLevel = determineGradeLevel(cls.name, cls.year);
  const maxAllowedDaily = getMaxDailyHoursForGrade(gradeLevel);

  // Struktura godzin w poszczególnych dniach: dayIdx (0..4) -> Map<hourNum, { subject, diff } >
  const daySchedule = new Map<number, Map<number, { subject: Subject; difficulty: SubjectDifficultyLevel }>>();
  for (let d = 0; d < 5; d++) {
    daySchedule.set(d, new Map());
  }

  Object.entries(pl.lessons).forEach(([key, lesson]) => {
    if (!lesson || !lesson.assignmentId) return;
    const asg = assignmentsMap.get(lesson.assignmentId);
    if (!asg) return;

    const parts = key.split('|');
    const cId = parts[0];
    const d = parseInt(parts[1], 10);
    const h = parseInt(parts[2], 10);

    // Sprawdzenie czy lekcja dotyczy tej klasy (bezpośrednio lub przez powiązane grupy)
    const isTargetClass = cId === cls.id || (asg.linkedClassIds && asg.linkedClassIds.includes(cls.id));
    if (isTargetClass && d >= 0 && d < 5) {
      const subj = subjectsMap.get(asg.subjectId);
      if (subj) {
        const diff = classifySubjectDifficulty(subj);
        daySchedule.get(d)!.set(h, { subject: subj, difficulty: diff });
      }
    }
  });

  const violations: HygieneViolation[] = [];
  const dayStats: DayHygieneStats[] = [];
  const dailyCounts: number[] = [];
  const startHours: number[] = [];
  let totalHardAfter5th = 0;
  let totalFatigueScore = 0;

  const hasSchoolLunchBreak = checkLunchBreakAvailable(timeslots);

  for (let d = 0; d < 5; d++) {
    const hoursMap = daySchedule.get(d)!;
    const hourNums = Array.from(hoursMap.keys()).sort((a, b) => a - b);
    const count = hourNums.length;
    dailyCounts.push(count);

    if (count === 0) {
      dayStats.push({
        dayIdx: d,
        dayName: DAYS_POLISH[d],
        totalLessons: 0,
        startHour: 0,
        endHour: 0,
        hardSubjectsCount: 0,
        lightSubjectsCount: 0,
        fatigueScore: 0,
        hasLunchBreak: true,
        hasGap: false
      });
      continue;
    }

    const minH = hourNums[0];
    const maxH = hourNums[hourNums.length - 1];
    startHours.push(minH);

    let hardCount = 0;
    let lightCount = 0;
    let dayFatigue = 0;

    // 1. Weryfikacja okienek w planie klasy (Luki między minH a maxH)
    let hasGapInDay = false;
    for (let h = minH; h <= maxH; h++) {
      if (!hoursMap.has(h)) {
        hasGapInDay = true;
        violations.push({
          id: `viol-gap-${cls.id}-${d}-${h}`,
          type: 'student_gap_detected',
          severity: 'critical',
          classId: cls.id,
          className: cls.name,
          dayIdx: d,
          dayName: DAYS_POLISH[d],
          hourNum: h,
          title: `Okienko w planie klasy ${cls.name}`,
          description: `Wykryto pustą godzinę lekcyjną (lekcja nr ${h}) w środku dnia zajęć. Uczniowie nie mogą mieć okienek wg przepisów BHP.`,
          menRegulationRef: MEN_REGULATION_REFS.NO_GAPS,
          repairSuggestion: `Przesuń późniejsze lekcje o jedną godzinę wcześniej, aby zamknąć lukę.`
        });
      }
    }

    // 2. Weryfikacja przekroczenia limitu godzin dziennych
    if (count > maxAllowedDaily) {
      violations.push({
        id: `viol-daily-limit-${cls.id}-${d}`,
        type: 'daily_hours_exceeded',
        severity: 'critical',
        classId: cls.id,
        className: cls.name,
        dayIdx: d,
        dayName: DAYS_POLISH[d],
        title: `Przekroczony dzienny limit lekcji (${count} godz.)`,
        description: `Dla etapu ${gradeLevel} dopuszczalny limit to ${maxAllowedDaily} lekcji dziennie. Plan przewiduje ${count} lekcji.`,
        menRegulationRef: MEN_REGULATION_REFS.DAILY_LIMITS,
        repairSuggestion: `Przenieś ${count - maxAllowedDaily} lekcję na inny, mniej obciążony dzień tygodnia.`
      });
    }

    // 3. Weryfikacja trudnych przedmiotów na późnych godzinach i krzywej zmęczenia
    let currentHardChain = 0;

    hourNums.forEach(h => {
      const item = hoursMap.get(h)!;
      if (item.difficulty === 'hard') {
        hardCount++;
        currentHardChain++;
        // Współczynnik zmęczenia: im późniejsza lekcja, tym wyższy koszt poznawczy
        dayFatigue += h >= 5 ? 20 : 10;

        if (h >= 6) {
          totalHardAfter5th++;
          violations.push({
            id: `viol-hard-late-${cls.id}-${d}-${h}`,
            type: 'difficult_subject_late',
            severity: h >= 7 ? 'critical' : 'warning',
            classId: cls.id,
            className: cls.name,
            dayIdx: d,
            dayName: DAYS_POLISH[d],
            hourNum: h,
            subjectName: item.subject.name,
            title: `Trudny przedmiot na lekcji ${h} (${item.subject.name})`,
            description: `Przedmioty wymagające wzmożonego wysiłku umysłowego (${item.subject.name}) powinny odbywać się w godzinach 2-4 (szczyt percepcji).`,
            menRegulationRef: MEN_REGULATION_REFS.FATIGUE_CURVE,
            repairSuggestion: `Zamień miejscami z przedmiotem lżejszym (np. plastyka, muzyka, wf) z wcześniejszych godzin.`
          });
        }
      } else {
        if (item.difficulty === 'light') {
          lightCount++;
          dayFatigue += 2;
        } else {
          dayFatigue += 6;
        }
        currentHardChain = 0; // Przerwanie łańcucha
      }

      // 4. Kumulacja 3+ przedmiotów trudnych pod rząd
      if (currentHardChain >= 3) {
        violations.push({
          id: `viol-chain-${cls.id}-${d}-${h}`,
          type: 'difficult_subjects_chain',
          severity: 'warning',
          classId: cls.id,
          className: cls.name,
          dayIdx: d,
          dayName: DAYS_POLISH[d],
          hourNum: h,
          title: `Kumulacja trudnych przedmiotów pod rząd (${currentHardChain} z rzędu)`,
          description: `Uczniowie mają 3 lub więcej przedmiotów ścisłych/językowych pod rząd bez zajęć rozluźniających.`,
          menRegulationRef: MEN_REGULATION_REFS.CHAINS,
          repairSuggestion: `Wpleć między przedmioty trudne zajęcia artystyczne, wychowanie fizyczne lub przerwę.`
        });
      }
    });

    // 5. Przerwa obiadowa przy długim dniu (>= 6 lekcji)
    if (count >= 6 && !hasSchoolLunchBreak) {
      violations.push({
        id: `viol-lunch-${cls.id}-${d}`,
        type: 'lunch_break_missing',
        severity: 'warning',
        classId: cls.id,
        className: cls.name,
        dayIdx: d,
        dayName: DAYS_POLISH[d],
        title: `Brak przerwy obiadowej przy ${count} lekcjach`,
        description: `Klasa przebywa w szkole ponad 5 godzin, a w siatce dzwonków brakuje długiej przerwy na regenerację i posiłek.`,
        menRegulationRef: MEN_REGULATION_REFS.LUNCH_BREAK,
        repairSuggestion: `Wprowadź przerwę 15-20 minut po 4. lub 5. lekcji w Kreatorze Szkoły.`
      });
    }

    const normalizedFatigue = Math.min(100, Math.round((dayFatigue / (count * 15)) * 100));
    totalFatigueScore += normalizedFatigue;

    dayStats.push({
      dayIdx: d,
      dayName: DAYS_POLISH[d],
      totalLessons: count,
      startHour: minH,
      endHour: maxH,
      hardSubjectsCount: hardCount,
      lightSubjectsCount: lightCount,
      fatigueScore: normalizedFatigue,
      hasLunchBreak: hasSchoolLunchBreak,
      hasGap: hasGapInDay
    });
  }

  // 6. Dysproporcja tygodniowa (Wahania obciążenia między dniami)
  const activeDaysCounts = dailyCounts.filter(c => c > 0);
  const maxDaily = activeDaysCounts.length > 0 ? Math.max(...activeDaysCounts) : 0;
  const minDaily = activeDaysCounts.length > 0 ? Math.min(...activeDaysCounts) : 0;
  const hoursFluctuation = maxDaily - minDaily;

  if (hoursFluctuation > 2) {
    violations.push({
      id: `viol-fluct-${cls.id}`,
      type: 'unbalanced_weekly_days',
      severity: 'warning',
      classId: cls.id,
      className: cls.name,
      title: `Duża dysproporcja obciążenia w tygodniu (${hoursFluctuation} godz. różnicy)`,
      description: `W najcięższym dniu klasa ma ${maxDaily} lekcji, a w najlżejszym tylko ${minDaily}. Przepisy MEN zalecają różnicę max 1-2 godz.`,
      menRegulationRef: MEN_REGULATION_REFS.WEEKLY_BALANCE,
      repairSuggestion: `Przenieś lekcję z dnia o ${maxDaily} godzinach do dnia o ${minDaily} godzinach.`
    });
  }

  // 7. Stabilność godziny rozpoczęcia zajęć
  if (startHours.length >= 2) {
    const minStart = Math.min(...startHours);
    const maxStart = Math.max(...startHours);
    if (maxStart - minStart >= 2) {
      violations.push({
        id: `viol-start-${cls.id}`,
        type: 'unstable_start_hour',
        severity: 'info',
        classId: cls.id,
        className: cls.name,
        title: `Nieregularne godziny rozpoczynania zajęć (od lekcji ${minStart} do ${maxStart})`,
        description: `Klasa rozpoczyna zajęcia o różnych porach, co zaburza rytm dobowy uczniów.`,
        menRegulationRef: MEN_REGULATION_REFS.START_STABILITY,
        repairSuggestion: `W miarę możliwości planuj rozpoczęcie zajęć o stałej porze (np. zawsze 1. lub 2. lekcja).`
      });
    }
  }

  // Obliczenie wskaźnika higieny MEN (0..100)
  let baseScore = 100;
  violations.forEach(v => {
    if (v.severity === 'critical') baseScore -= 15;
    else if (v.severity === 'warning') baseScore -= 6;
    else baseScore -= 2;
  });
  const hygieneScore = Math.max(0, Math.min(100, Math.round(baseScore)));

  let scoreGrade: ClassHygieneReport['scoreGrade'] = 'krytyczny';
  if (hygieneScore >= 90) scoreGrade = 'wzorowy';
  else if (hygieneScore >= 75) scoreGrade = 'dobry';
  else if (hygieneScore >= 50) scoreGrade = 'wymaga_poprawy';

  // Generowanie unikalnych rekomendacji naprawczych
  const recommendations: string[] = [];
  if (violations.some(v => v.type === 'student_gap_detected')) {
    recommendations.push('Priorytet: zlikwiduj okienka w planie lekcji uczniów (przepisy BHP).');
  }
  if (violations.some(v => v.type === 'daily_hours_exceeded')) {
    recommendations.push(`Zredukuj dni o liczbie lekcji > ${maxAllowedDaily} dla etapu edukacyjnego ${gradeLevel}.`);
  }
  if (totalHardAfter5th > 0) {
    recommendations.push(`Przesuń ${totalHardAfter5th} trudnych przedmiotów z 6-8 lekcji na godziny przedpołudniowe.`);
  }
  if (hoursFluctuation > 2) {
    recommendations.push('Wyrównaj liczbę lekcji pomiędzy poszczególnymi dniami tygodnia.');
  }

  return {
    classId: cls.id,
    className: cls.name,
    gradeLevel,
    totalWeeklyHours: activeDaysCounts.reduce((a, b) => a + b, 0),
    hygieneScore,
    scoreGrade,
    dayStats,
    violations,
    maxDailyHours: maxDaily,
    minDailyHours: minDaily,
    hoursFluctuation,
    fatigueCurveAverage: Math.round(totalFatigueScore / 5),
    hardSubjectsAfter5thHourCount: totalHardAfter5th,
    recommendations
  };
}

/**
 * Zbiorczy audyt całej szkoły
 */
export function auditSchoolHygiene(appState: AppState): SchoolHygieneAuditSummary {
  const classes = appState.planLekcji.classes || [];
  const classReports = classes.map(c => auditClassHygiene(c, appState));

  let totalScore = 0;
  let classesWithViolations = 0;
  let criticalCount = 0;
  let warningsCount = 0;
  let infosCount = 0;

  let noGapsDays = 0;
  let totalDaysAudited = 0;
  let dailyLimitsSatisfiedClasses = 0;
  let lunchBreakSatisfiedDays = 0;
  let weeklyBalanceSatisfiedClasses = 0;
  let fatigueCurveSatisfiedClasses = 0;

  const allCriticalViolations: HygieneViolation[] = [];

  classReports.forEach(r => {
    totalScore += r.hygieneScore;
    if (r.violations.length > 0) classesWithViolations++;

    r.violations.forEach(v => {
      if (v.severity === 'critical') {
        criticalCount++;
        allCriticalViolations.push(v);
      } else if (v.severity === 'warning') {
        warningsCount++;
      } else {
        infosCount++;
      }
    });

    // Wskaźniki
    if (!r.violations.some(v => v.type === 'daily_hours_exceeded')) dailyLimitsSatisfiedClasses++;
    if (!r.violations.some(v => v.type === 'unbalanced_weekly_days')) weeklyBalanceSatisfiedClasses++;
    if (r.hardSubjectsAfter5thHourCount === 0) fatigueCurveSatisfiedClasses++;

    r.dayStats.forEach(d => {
      if (d.totalLessons > 0) {
        totalDaysAudited++;
        if (!d.hasGap) noGapsDays++;
        if (d.hasLunchBreak) lunchBreakSatisfiedDays++;
      }
    });
  });

  const overallScore = classes.length > 0 ? Math.round(totalScore / classes.length) : 100;

  let overallGrade: SchoolHygieneAuditSummary['overallGrade'] = 'krytyczny';
  if (overallScore >= 90) overallGrade = 'wzorowy';
  else if (overallScore >= 75) overallGrade = 'dobry';
  else if (overallScore >= 50) overallGrade = 'wymaga_poprawy';

  const complianceMetrics = {
    dailyLimitsCompliance: classes.length > 0 ? Math.round((dailyLimitsSatisfiedClasses / classes.length) * 100) : 100,
    fatigueCurveCompliance: classes.length > 0 ? Math.round((fatigueCurveSatisfiedClasses / classes.length) * 100) : 100,
    noGapsCompliance: totalDaysAudited > 0 ? Math.round((noGapsDays / totalDaysAudited) * 100) : 100,
    lunchBreakCompliance: totalDaysAudited > 0 ? Math.round((lunchBreakSatisfiedDays / totalDaysAudited) * 100) : 100,
    weeklyBalanceCompliance: classes.length > 0 ? Math.round((weeklyBalanceSatisfiedClasses / classes.length) * 100) : 100
  };

  const topImprovementOpportunities: string[] = [];
  if (complianceMetrics.noGapsCompliance < 100) {
    topImprovementOpportunities.push('Wyeliminuj okienka uczniowskie – to bezwzględny wymóg prawny MEN.');
  }
  if (complianceMetrics.fatigueCurveCompliance < 80) {
    topImprovementOpportunities.push('Przenieś trudne przedmioty z 6-8 lekcji na godziny 2-4.');
  }
  if (complianceMetrics.dailyLimitsCompliance < 90) {
    topImprovementOpportunities.push('Dostosuj maksymalną liczbę lekcji dziennie do norm wiekowych klas.');
  }
  if (complianceMetrics.weeklyBalanceCompliance < 85) {
    topImprovementOpportunities.push('Zmniejsz dysproporcje godzin między najcięższym i najlżejszym dniem.');
  }

  return {
    overallScore,
    overallGrade,
    totalClassesAudited: classes.length,
    classesWithViolationsCount: classesWithViolations,
    criticalViolationsCount: criticalCount,
    warningsCount,
    infosCount,
    complianceMetrics,
    classReports: classReports.sort((a, b) => a.hygieneScore - b.hygieneScore), // Najpierw klasy z najniższym wynikiem
    criticalViolationsList: allCriticalViolations,
    topImprovementOpportunities,
    auditTimestamp: new Date().toISOString()
  };
}
