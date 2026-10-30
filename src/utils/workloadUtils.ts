/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Rozliczania Pensum, Nadgodzin i Dyżurów (Karta Nauczyciela art. 42)
 * 
 * Zasady prawne i algorytmy:
 * 1. Pensum bazowe:
 *    - Przedmiotowy: 18h (45 min)
 *    - Współorganizujący (pedagog specjalny/wspierający): 20h (45 min)
 *    - Świetlica: 26h (60 min)
 *    - Bibliotekarz: 30h (60 min)
 *    - Specjaliści (pedagog, psycholog, logopeda, terapeuta): 22h (60 min)
 *    - Doradca zawodowy: 22h (45 min)
 * 2. Pensum łączone:
 *    - Wzór proporcjonalny: P_łączone = sum(h_i) / sum(h_i / P_i)
 *    - Suma etatów: E = sum(h_i / P_i)
 * 3. Nadgodziny (godziny ponadwymiarowe):
 *    - Dla etatu E >= 1.0: max(0, sum(h_i) - P_łączone)
 * 4. Dyżury na przerwach:
 *    - Limit proporcjonalny do wymiaru etatu i godzin bezpośrednio przy tablicy (h_tablica / 18)
 * 5. Czas pracy 40h:
 *    - Pensum (45 min i 60 min) + dyżury międzylekcyjne + przygotowanie/rady/sprawdzanie do 40h
 */

import { Assignment, SpecialAssignment, StandardPositionType, Teacher, TeacherWorkloadAnalysis, TeacherWorkloadPosition } from '../types';

export interface StandardPositionMeta {
  type: StandardPositionType;
  label: string;
  defaultPensum: number;
  unitMinutes: 45 | 60;
  legalBasis: string;
  isBoardTeaching: boolean;
  description: string;
}

export const STANDARD_POSITIONS_META: Record<StandardPositionType, StandardPositionMeta> = {
  przedmiotowy: {
    type: 'przedmiotowy',
    label: 'Nauczyciel przedmiotowy (np. język polski, matematyka, historia, informatyka)',
    defaultPensum: 18,
    unitMinutes: 45,
    legalBasis: 'Karta Nauczyciela (art. 42 ust. 3)',
    isBoardTeaching: true,
    description: 'Zajęcia dydaktyczne przy tablicy (godz. lekcyjna 45 min)'
  },
  wspomagajacy: {
    type: 'wspomagajacy',
    label: 'Nauczyciel współorganizujący (pedagog specjalny / wspierający)',
    defaultPensum: 20,
    unitMinutes: 45,
    legalBasis: 'Karta Nauczyciela (art. 42 ust. 3)',
    isBoardTeaching: true,
    description: 'Współorganizowanie kształcenia integracyjnego i specjalnego (godz. 45 min)'
  },
  swietlica: {
    type: 'swietlica',
    label: 'Wychowawca świetlicy szkolnej',
    defaultPensum: 26,
    unitMinutes: 60,
    legalBasis: 'Karta Nauczyciela (art. 42 ust. 3)',
    isBoardTeaching: false,
    description: 'Zajęcia opiekuńczo-wychowawcze w świetlicy (godz. zegarowa 60 min)'
  },
  biblioteka: {
    type: 'biblioteka',
    label: 'Nauczyciel bibliotekarz',
    defaultPensum: 30,
    unitMinutes: 60,
    legalBasis: 'Karta Nauczyciela (art. 42 ust. 3)',
    isBoardTeaching: false,
    description: 'Praca w bibliotece i czytelni szkolnej (godz. zegarowa 60 min)'
  },
  specjalista: {
    type: 'specjalista',
    label: 'Pedagog / Psycholog / Logopeda / Terapeuta pedagogiczny',
    defaultPensum: 22,
    unitMinutes: 60,
    legalBasis: 'Uchwała organu prowadzącego (maks. 22 godz.)',
    isBoardTeaching: false,
    description: 'Zajęcia specjalistyczne i pomoc psychologiczno-pedagogiczna (godz. zegarowa 60 min)'
  },
  doradca: {
    type: 'doradca',
    label: 'Doradca zawodowy',
    defaultPensum: 22,
    unitMinutes: 45,
    legalBasis: 'Uchwała organu prowadzącego (maks. 22 godz.)',
    isBoardTeaching: true,
    description: 'Zajęcia z zakresu doradztwa zawodowego (godz. lekcyjna 45 min)'
  },
  inny: {
    type: 'inny',
    label: 'Inne stanowisko pedagogiczne / samorządowe',
    defaultPensum: 18,
    unitMinutes: 45,
    legalBasis: 'Regulamin szkoły / Uchwała organu prowadzącego',
    isBoardTeaching: true,
    description: 'Stanowisko konfigurowane indywidualnie'
  }
};

/**
 * Zaokrągla liczbę do zadanej liczby miejsc po przecinku
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Oblicza pensum łączone i łączny wymiar etatu na podstawie zestawu stanowisk
 * Wzór:
 * E = sum(h_i / P_i)
 * P_uśrednione = sum(h_i) / sum(h_i / P_i)
 */
export function calculateCombinedPensum(
  positions: { hours: number; basePensum: number }[]
): {
  totalHours: number;
  totalFte: number;
  averagedPensum: number;
  isCombined: boolean;
  overtimeHours: number;
} {
  const activePositions = positions.filter(p => p.hours > 0 && p.basePensum > 0);

  if (activePositions.length === 0) {
    return {
      totalHours: 0,
      totalFte: 0,
      averagedPensum: 18,
      isCombined: false,
      overtimeHours: 0
    };
  }

  const totalHours = activePositions.reduce((acc, p) => acc + p.hours, 0);
  const totalFte = activePositions.reduce((acc, p) => acc + (p.hours / p.basePensum), 0);

  // Sprawdzamy czy występują różne wymiary pensum
  const uniquePensums = new Set(activePositions.map(p => p.basePensum));
  const isCombined = uniquePensums.size > 1;

  // Uśredniony wymiar pensum = łączna liczba godzin / łączny wymiar etatu
  let averagedPensum = 18;
  if (totalFte > 0) {
    averagedPensum = round(totalHours / totalFte, 2);
  } else if (activePositions[0]) {
    averagedPensum = activePositions[0].basePensum;
  }

  // Obliczenie nadgodzin dla etatu >= 1.0
  let overtimeHours = 0;
  if (totalFte >= 1.0) {
    overtimeHours = Math.max(0, round(totalHours - averagedPensum, 2));
  }

  return {
    totalHours: round(totalHours, 2),
    totalFte: round(totalFte, 4),
    averagedPensum,
    isCombined,
    overtimeHours
  };
}

/**
 * Wylicza sugerowany limit dyżurów na przerwach
 * Wzór uzgodniony z użytkownikiem:
 * Proporcjonalnie do wymiaru etatu i godzin bezpośrednio przy tablicy:
 * limit = round( L_base * (h_tablica / 18) * min(1.0, E) )
 */
export function calculateSuggestedDutyLimit(
  boardHours: number,
  totalFte: number,
  baseDutyPerFullTime: number = 3,
  dutyExempt: boolean = false
): number {
  if (dutyExempt) return 0;
  if (boardHours <= 0 || totalFte <= 0) return 0;

  // Współczynnik tablicy (18h dydaktycznych = 1.0)
  const boardRatio = boardHours / 18;
  const fteFactor = Math.min(1.0, totalFte);

  const rawLimit = baseDutyPerFullTime * boardRatio * fteFactor;
  // Minimalna wartość dla uczącego przy tablicy to 1 dyżur, jeśli ma min. 4h przy tablicy
  if (boardHours >= 4 && rawLimit < 1) {
    return 1;
  }
  return Math.max(0, Math.round(rawLimit));
}

/**
 * Buduje znormalizowaną listę stanowisk dla nauczyciela
 * Jeśli nauczyciel nie ma zdefiniowanych workloadPositions, tworzy je automatycznie
 * z dotychczasowych pól (przydziały lekcyjne, nonTeachingHours, nonTeachingRoles).
 */
export function normalizeTeacherPositions(
  teacher: Teacher,
  assignments: Assignment[] = [],
  specialAssignments: SpecialAssignment[] = []
): TeacherWorkloadPosition[] {
  if (teacher.workloadPositions && teacher.workloadPositions.length > 0) {
    return teacher.workloadPositions;
  }

  const positions: TeacherWorkloadPosition[] = [];

  // 1. Zlicz godziny lekcyjne przy tablicy z przydziałów
  const assignedLessonHours = assignments
    .filter(a => a.teacherId === teacher.id)
    .reduce((sum, a) => sum + (Number(a.hoursPerWeek) || 0), 0);

  // 2. Zlicz godziny SPE / wspomagające
  const assignedSpecialHours = specialAssignments
    .filter(sa => sa.teacherId === teacher.id || sa.supportTeacherId === teacher.id)
    .reduce((sum, sa) => sum + (Number(sa.hoursPerWeek) || 0), 0);

  const totalBoardHours = assignedLessonHours + assignedSpecialHours;

  if (totalBoardHours > 0) {
    positions.push({
      id: `${teacher.id}-pos-przedmiotowy`,
      type: 'przedmiotowy',
      title: 'Zajęcia przedmiotowe / dydaktyczne',
      hours: totalBoardHours,
      basePensum: 18,
      unitMinutes: 45
    });
  } else if ((teacher.maxHours || 0) > 0 && !teacher.nonTeachingHours) {
    // Brak przydziałów, ale zdefiniowano maxHours w profilu
    positions.push({
      id: `${teacher.id}-pos-default`,
      type: 'przedmiotowy',
      title: 'Zajęcia przedmiotowe',
      hours: teacher.maxHours || 18,
      basePensum: 18,
      unitMinutes: 45
    });
  }

  // 3. Obsługa dotychczasowych godzin poza tablicą (nonTeachingHours)
  if (teacher.nonTeachingHours && teacher.nonTeachingHours > 0) {
    const roles = teacher.nonTeachingRoles || [];
    if (roles.length === 0) {
      positions.push({
        id: `${teacher.id}-pos-inne`,
        type: 'inny',
        title: 'Zadania opiekuńczo-wychowawcze',
        hours: teacher.nonTeachingHours,
        basePensum: 26,
        unitMinutes: 60
      });
    } else {
      // Podziel po równo lub przypisz do konkretnych ról
      const hoursPerRole = round(teacher.nonTeachingHours / roles.length, 1);
      roles.forEach((r, idx) => {
        let type: StandardPositionType = 'inny';
        let defaultPensum = 22;
        let unitMinutes: 45 | 60 = 60;
        let title = 'Czynności pozalekcyjne';

        if (r === 'swietlica') {
          type = 'swietlica';
          defaultPensum = 26;
          unitMinutes = 60;
          title = 'Świetlica szkolna';
        } else if (r === 'biblioteka') {
          type = 'biblioteka';
          defaultPensum = 30;
          unitMinutes = 60;
          title = 'Biblioteka szkolna';
        } else if (r === 'wspomagajacy') {
          type = 'wspomagajacy';
          defaultPensum = 20;
          unitMinutes = 45;
          title = 'Nauczyciel współorganizujący';
        } else if (['pedagog', 'psycholog', 'logopeda', 'terapeuta'].includes(r)) {
          type = 'specjalista';
          defaultPensum = 22;
          unitMinutes = 60;
          title = STANDARD_POSITIONS_META[type].label;
        }

        positions.push({
          id: `${teacher.id}-pos-nt-${idx}`,
          type,
          title,
          hours: hoursPerRole,
          basePensum: defaultPensum,
          unitMinutes
        });
      });
    }
  }

  // Jeśli nauczyciel nie ma nic, stwórz pozycję 18h pełnoetatową jako punkt startowy
  if (positions.length === 0) {
    positions.push({
      id: `${teacher.id}-pos-empty`,
      type: 'przedmiotowy',
      title: 'Zajęcia dydaktyczne (etat bazowy)',
      hours: 18,
      basePensum: 18,
      unitMinutes: 45
    });
  }

  return positions;
}

/**
 * Główna funkcja wykonująca pełną analizę obciążenia i pensum nauczyciela
 */
export function calculateTeacherWorkload(
  teacher: Teacher,
  assignments: Assignment[] = [],
  specialAssignments: SpecialAssignment[] = [],
  dutiesAssignedCount: number = 0,
  baseDutyPerFullTime: number = 3
): TeacherWorkloadAnalysis {
  const positions = normalizeTeacherPositions(teacher, assignments, specialAssignments);

  // 1. Zlicz godziny 45 min i 60 min
  let hours45min = 0;
  let hours60min = 0;
  let boardHours = 0;
  let nominalHours = 0;

  positions.forEach(p => {
    nominalHours += p.hours;
    if (p.unitMinutes === 45) {
      hours45min += p.hours;
    } else {
      hours60min += p.hours;
    }

    const meta = STANDARD_POSITIONS_META[p.type];
    if (meta?.isBoardTeaching || p.type === 'przedmiotowy' || p.type === 'wspomagajacy' || p.type === 'doradca') {
      boardHours += p.hours;
    }
  });

  // 2. Rzeczywiste godziny przydzielone w planie zajęć (dla weryfikacji)
  const actualPlanHours = assignments
    .filter(a => a.teacherId === teacher.id)
    .reduce((sum, a) => sum + (Number(a.hoursPerWeek) || 0), 0);

  const actualSpecialHours = specialAssignments
    .filter(sa => sa.teacherId === teacher.id || sa.supportTeacherId === teacher.id)
    .reduce((sum, sa) => sum + (Number(sa.hoursPerWeek) || 0), 0);

  const totalAssignedHours = round(actualPlanHours + actualSpecialHours + hours60min, 2);

  // 3. Obliczenie pensum łączonego i etatu
  const pensumResult = calculateCombinedPensum(
    positions.map(p => ({ hours: p.hours, basePensum: p.basePensum }))
  );

  const effectivePensum = teacher.customPensum && teacher.customPensum > 0
    ? teacher.customPensum
    : pensumResult.averagedPensum;

  const totalFte = pensumResult.totalFte;
  const ftePercent = round(totalFte * 100, 1);

  // Nadgodziny:
  let overtimeHours = 0;
  let unfilledHours = 0;

  if (teacher.overtimeHours !== undefined && teacher.overtimeHours > 0) {
    overtimeHours = teacher.overtimeHours;
  } else if (totalFte >= 1.0) {
    overtimeHours = Math.max(0, round(nominalHours - effectivePensum, 2));
  } else {
    // Niepełny etat - ile brakuje do pełnego etatu
    unfilledHours = Math.max(0, round(effectivePensum - nominalHours, 2));
  }

  // 4. Dyżury na przerwach
  const dutyExempt = Boolean(teacher.dutyExempt || teacher.isAdministrative);
  const suggestedDutyLimit = calculateSuggestedDutyLimit(
    boardHours,
    totalFte,
    baseDutyPerFullTime,
    dutyExempt
  );

  const effectiveDutyLimit = teacher.maxDutyCount !== undefined
    ? teacher.maxDutyCount
    : suggestedDutyLimit;

  // 5. Rozkład 40-godzinnego tygodnia pracy (w minutach zegarowych)
  // Norma 40 godzin zegarowych = 2400 minut
  const directTeachingMinutes = Math.round(hours45min * 45 + hours60min * 60);
  const breakDutiesMinutes = Math.round(dutiesAssignedCount * 15); // średnio 15 minut na dyżur
  const statutoryAndPrepMinutes = Math.max(0, 2400 - (directTeachingMinutes + breakDutiesMinutes));

  return {
    teacherId: teacher.id,
    positions,
    hours45min: round(hours45min, 1),
    hours60min: round(hours60min, 1),
    boardHours: round(boardHours, 1),
    totalAssignedHours: round(nominalHours, 2),
    nominalHours: round(nominalHours, 2),
    totalFte,
    ftePercent,
    isCombinedPensum: pensumResult.isCombined,
    basePensum: effectivePensum,
    averagedPensum: effectivePensum,
    overtimeHours,
    unfilledHours,
    suggestedDutyLimit,
    effectiveDutyLimit,
    dutyExempt,
    timeEnvelope40h: {
      directTeachingMinutes,
      breakDutiesMinutes,
      statutoryAndPrepMinutes,
      totalWeeklyMinutes: 2400
    }
  };
}

/**
 * Zbiorcze podsumowanie obciążenia kadry pedagogicznej w szkole
 */
export interface SchoolWorkloadKPI {
  totalTeachersCount: number;
  activeTeachersCount: number;
  totalFte: number;
  totalHours45min: number;
  totalHours60min: number;
  totalCombinedHours: number;
  totalOvertimeHours: number;
  teachersWithCombinedPensum: number;
  teachersWithOvertime: number;
  totalSuggestedDuties: number;
  totalAssignedDuties: number;
}

export function calculateSchoolWorkloadKPI(
  teachers: Teacher[],
  assignments: Assignment[] = [],
  specialAssignments: SpecialAssignment[] = [],
  dutiesCountMap: Record<string, number> = {},
  baseDutyPerFullTime: number = 3
): SchoolWorkloadKPI {
  let totalFte = 0;
  let totalHours45min = 0;
  let totalHours60min = 0;
  let totalCombinedHours = 0;
  let totalOvertimeHours = 0;
  let teachersWithCombinedPensum = 0;
  let teachersWithOvertime = 0;
  let totalSuggestedDuties = 0;
  let totalAssignedDuties = 0;
  let activeTeachersCount = 0;

  teachers.forEach(t => {
    if (t.inactive) return;
    activeTeachersCount++;

    const dutiesAssigned = dutiesCountMap[t.id] || 0;
    totalAssignedDuties += dutiesAssigned;

    const analysis = calculateTeacherWorkload(
      t,
      assignments,
      specialAssignments,
      dutiesAssigned,
      baseDutyPerFullTime
    );

    totalFte += analysis.totalFte;
    totalHours45min += analysis.hours45min;
    totalHours60min += analysis.hours60min;
    totalCombinedHours += analysis.nominalHours;
    totalOvertimeHours += analysis.overtimeHours;
    if (analysis.isCombinedPensum) teachersWithCombinedPensum++;
    if (analysis.overtimeHours > 0) teachersWithOvertime++;
    totalSuggestedDuties += analysis.effectiveDutyLimit;
  });

  return {
    totalTeachersCount: teachers.length,
    activeTeachersCount,
    totalFte: round(totalFte, 2),
    totalHours45min: round(totalHours45min, 1),
    totalHours60min: round(totalHours60min, 1),
    totalCombinedHours: round(totalCombinedHours, 1),
    totalOvertimeHours: round(totalOvertimeHours, 2),
    teachersWithCombinedPensum,
    teachersWithOvertime,
    totalSuggestedDuties,
    totalAssignedDuties
  };
}
