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
 * Dzieli łączną liczbę godzin na zadaną liczbę ról bez gubienia reszty
 * (ostatnia rola otrzymuje resztę z zaokrąglenia, tak aby suma była dokładnie równa totalHours)
 */
export function distributeHoursAcrossRoles(
  totalHours: number,
  rolesCount: number,
  decimals: number = 1
): number[] {
  if (rolesCount <= 0 || totalHours <= 0) return [];
  if (rolesCount === 1) return [round(totalHours, decimals)];

  const baseHours = round(totalHours / rolesCount, decimals);
  const result: number[] = [];
  let allocated = 0;

  for (let i = 0; i < rolesCount; i++) {
    if (i === rolesCount - 1) {
      const remaining = round(totalHours - allocated, decimals);
      result.push(remaining);
    } else {
      result.push(baseHours);
      allocated = round(allocated + baseHours, decimals);
    }
  }

  return result;
}

/**
 * Wylicza sugerowany limit dyżurów na przerwach
 * Wzór uzgodniony z użytkownikiem:
 * Proporcjonalnie do godzin bezpośrednio przy tablicy (18h dydaktycznych = 1.0 pełnego etatu tablicowego)
 * limit = round( L_base * (h_tablica / 18) )
 * Nie mnożymy podwójnie przez min(1, FTE), gdy boardHours już odzwierciedla etat.
 */
export function calculateSuggestedDutyLimit(
  boardHours: number,
  _totalFte: number = 0,
  baseDutyPerFullTime: number = 3,
  dutyExempt: boolean = false
): number {
  if (dutyExempt) return 0;
  if (boardHours <= 0) return 0;

  // boardHours już bezpośrednio odzwierciedla wymiar etatu przy tablicy (18h = 1.0)
  const boardRatio = boardHours / 18;
  const rawLimit = baseDutyPerFullTime * boardRatio;

  // Minimalna wartość dla uczącego przy tablicy to 1 dyżur, jeśli ma min. 4h przy tablicy
  if (boardHours >= 4 && rawLimit < 1) {
    return 1;
  }
  return Math.max(0, Math.round(rawLimit));
}

/**
 * Zwraca konfigurację metadanych stanowisk z uwzględnieniem ewentualnych nadpisań pensum bazowego per szkoła
 * (np. zgodnie z uchwałą właściwego organu prowadzącego)
 */
export function getStandardPositionsMeta(
  schoolBasePensum?: Partial<Record<StandardPositionType, number>>
): Record<StandardPositionType, StandardPositionMeta> {
  if (!schoolBasePensum || Object.keys(schoolBasePensum).length === 0) {
    return STANDARD_POSITIONS_META;
  }
  const result: Record<StandardPositionType, StandardPositionMeta> = { ...STANDARD_POSITIONS_META };
  (Object.keys(STANDARD_POSITIONS_META) as StandardPositionType[]).forEach(type => {
    const custom = schoolBasePensum[type];
    if (custom !== undefined && custom > 0) {
      result[type] = {
        ...STANDARD_POSITIONS_META[type],
        defaultPensum: custom
      };
    }
  });
  return result;
}

/**
 * Buduje znormalizowaną listę stanowisk dla nauczyciela
 * Jeśli nauczyciel nie ma zdefiniowanych workloadPositions, tworzy je automatycznie
 * z dotychczasowych pól (przydziały lekcyjne, nonTeachingHours, nonTeachingRoles).
 * Gdy brak przydziałów i godzin pozalekcyjnych, zwraca pustą tablicę (0 h, FTE 0) bez fantomowych 18h.
 */
export function normalizeTeacherPositions(
  teacher: Teacher,
  assignments: Assignment[] = [],
  specialAssignments: SpecialAssignment[] = [],
  schoolBasePensum?: Partial<Record<StandardPositionType, number>>
): TeacherWorkloadPosition[] {
  if (teacher.workloadPositions && teacher.workloadPositions.length > 0) {
    return teacher.workloadPositions;
  }

  const positions: TeacherWorkloadPosition[] = [];
  const metaMap = getStandardPositionsMeta(schoolBasePensum);

  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeSpecial = Array.isArray(specialAssignments) ? specialAssignments : [];

  // 1. Zlicz godziny lekcyjne przy tablicy z przydziałów
  const assignedLessonHours = safeAssignments
    .filter(a => a && a.teacherId === teacher.id)
    .reduce((sum, a) => sum + (Number(a.hoursPerWeek) || 0), 0);

  // 2. Zlicz godziny SPE / wspomagające
  const assignedSpecialHours = safeSpecial
    .filter(sa => sa && (sa.teacherId === teacher.id || sa.supportTeacherId === teacher.id))
    .reduce((sum, sa) => sum + (Number(sa.hoursPerWeek) || 0), 0);

  const totalBoardHours = assignedLessonHours + assignedSpecialHours;

  if (totalBoardHours > 0) {
    positions.push({
      id: `${teacher.id}-pos-przedmiotowy`,
      type: 'przedmiotowy',
      title: 'Zajęcia przedmiotowe / dydaktyczne',
      hours: totalBoardHours,
      basePensum: metaMap.przedmiotowy.defaultPensum,
      unitMinutes: 45
    });
  }

  // 3. Obsługa godzin poza tablicą (nonTeachingHours) z podziałem bez gubienia reszty
  if (teacher.nonTeachingHours && teacher.nonTeachingHours > 0) {
    const roles = teacher.nonTeachingRoles || [];
    if (roles.length === 0) {
      positions.push({
        id: `${teacher.id}-pos-inne`,
        type: 'inny',
        title: 'Zadania opiekuńczo-wychowawcze',
        hours: teacher.nonTeachingHours,
        basePensum: metaMap.swietlica?.defaultPensum || 26,
        unitMinutes: 60
      });
    } else {
      const distributedHours = distributeHoursAcrossRoles(teacher.nonTeachingHours, roles.length, 1);
      roles.forEach((r, idx) => {
        let type: StandardPositionType = 'inny';
        let defaultPensum = metaMap.specjalista.defaultPensum;
        let unitMinutes: 45 | 60 = 60;
        let title = 'Czynności pozalekcyjne';

        if (r === 'swietlica') {
          type = 'swietlica';
          defaultPensum = metaMap.swietlica.defaultPensum;
          unitMinutes = 60;
          title = 'Świetlica szkolna';
        } else if (r === 'biblioteka') {
          type = 'biblioteka';
          defaultPensum = metaMap.biblioteka.defaultPensum;
          unitMinutes = 60;
          title = 'Biblioteka szkolna';
        } else if (r === 'wspomagajacy') {
          type = 'wspomagajacy';
          defaultPensum = metaMap.wspomagajacy.defaultPensum;
          unitMinutes = 45;
          title = 'Nauczyciel współorganizujący';
        } else if (['pedagog', 'psycholog', 'logopeda', 'terapeuta'].includes(r)) {
          type = 'specjalista';
          defaultPensum = metaMap.specjalista.defaultPensum;
          unitMinutes = 60;
          title = metaMap[type].label;
        }

        positions.push({
          id: `${teacher.id}-pos-nt-${idx}`,
          type,
          title,
          hours: distributedHours[idx] ?? 0,
          basePensum: defaultPensum,
          unitMinutes
        });
      });
    }
  }

  // Gdy nauczyciel nie ma żadnych przydziałów ani godzin pozalekcyjnych,
  // zwracamy pustą listę pozycji (0 h, FTE 0) zamiast fantomowych 18h
  return positions;
}

/**
 * Główna funkcja wykonująca pełną analizę obciążenia i pensum nauczyciela
 * Rozdziela pojęcia „godziny ponadwymiarowe” i „drugi etat” (odrębna umowa).
 */
export function calculateTeacherWorkload(
  teacher: Teacher,
  assignments: Assignment[] = [],
  specialAssignments: SpecialAssignment[] = [],
  dutiesAssignedCount: number = 0,
  baseDutyPerFullTime: number = 3,
  schoolBasePensum?: Partial<Record<StandardPositionType, number>>,
  schoolDefaultOvertimeHandling?: 'overtime' | 'second_contract'
): TeacherWorkloadAnalysis {
  const positions = normalizeTeacherPositions(teacher, assignments, specialAssignments, schoolBasePensum);
  const metaMap = getStandardPositionsMeta(schoolBasePensum);

  // 1. Zlicz godziny 45 min i 60 min oraz godziny tablicowe
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

    // boardHours wyłącznie z unitMinutes === 45 i typów tablicowych;
    // typ 'inny' z 60 min NIE jest tablicowy
    const meta = metaMap[p.type] || STANDARD_POSITIONS_META[p.type];
    const isBoardType = p.type === 'przedmiotowy' || 
                        p.type === 'wspomagajacy' || 
                        p.type === 'doradca' || 
                        (p.type === 'inny' && meta?.isBoardTeaching);
    if (p.unitMinutes === 45 && isBoardType) {
      boardHours += p.hours;
    }
  });

  // 2. Flaga braku przydziałów (gdy nauczyciel nie ma żadnych przydziałów ani godzin)
  const hasNoAssignments = positions.length === 0 || nominalHours === 0;

  // 3. Obliczenie pensum łączonego i etatu
  const pensumResult = calculateCombinedPensum(
    positions.map(p => ({ hours: p.hours, basePensum: p.basePensum }))
  );

  const hasCustomPensum = Boolean(teacher.customPensum && teacher.customPensum > 0);
  const effectivePensum = hasCustomPensum
    ? (teacher.customPensum as number)
    : (hasNoAssignments ? (teacher.customPensum || 18) : pensumResult.averagedPensum);

  // (1) FTE = nominalHours / effectivePensum przy customPensum, w przeciwnym razie suma h_i/P_i
  let totalFte = 0;
  if (!hasNoAssignments) {
    if (hasCustomPensum && effectivePensum > 0) {
      totalFte = round(nominalHours / effectivePensum, 4);
    } else {
      totalFte = pensumResult.totalFte;
    }
  }
  const ftePercent = round(totalFte * 100, 1);

  // 4. Rozdzielenie: godziny ponadwymiarowe (nadgodziny) vs drugi etat (odrębna umowa)
  // Zasada: nadgodziny liczone są tylko dla stanowisk jednego rodzaju lub według ustawienia w Kreatorze/profilu
  const activePositions = positions.filter(p => p.hours > 0);
  const distinctPositionTypes = new Set(activePositions.map(p => p.type));
  const isSinglePositionType = distinctPositionTypes.size <= 1;

  let overtimeHandling: 'overtime' | 'second_contract';
  if (teacher.overtimeHandling) {
    overtimeHandling = teacher.overtimeHandling;
  } else if (schoolDefaultOvertimeHandling) {
    overtimeHandling = schoolDefaultOvertimeHandling;
  } else if (isSinglePositionType) {
    overtimeHandling = 'overtime';
  } else {
    // Stanowiska łączone (różne rodzaje): domyślnie drugi etat (odrębna umowa)
    overtimeHandling = 'second_contract';
  }

  let overtimeHours = 0;
  let secondContractFte = 0;
  let secondContractHours = 0;
  let unfilledHours = 0;

  if (!hasNoAssignments) {
    if (teacher.overtimeHours !== undefined && teacher.overtimeHours > 0) {
      overtimeHours = teacher.overtimeHours;
      overtimeHandling = 'overtime';
    } else if (totalFte >= 1.0) {
      const excessHours = Math.max(0, round(nominalHours - effectivePensum, 2));

      if (overtimeHandling === 'overtime') {
        overtimeHours = excessHours;
      } else {
        // 'second_contract' (odrębna umowa o pracę)
        secondContractFte = Math.max(0, round(totalFte - 1.0, 4));

        // Godziny drugiego etatu: sumujemy godziny pozycji wykraczające ponad 1,0 FTE
        let fteAccum = 0;
        let scHours = 0;
        activePositions.forEach(p => {
          const pFte = p.basePensum > 0 ? p.hours / p.basePensum : 0;
          if (fteAccum + pFte <= 1.0) {
            fteAccum += pFte;
          } else if (fteAccum < 1.0) {
            const neededFte = 1.0 - fteAccum;
            const firstContractHours = neededFte * p.basePensum;
            scHours += p.hours - firstContractHours;
            fteAccum = 1.0;
          } else {
            scHours += p.hours;
          }
        });

        secondContractHours = scHours > 0 ? round(scHours, 2) : excessHours;
      }
    } else {
      // Niepełny etat - ile brakuje do pełnego etatu
      unfilledHours = Math.max(0, round(effectivePensum - nominalHours, 2));
    }
  }

  // 5. Dyżury na przerwach
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

  // 6. Rozkład 40-godzinnego tygodnia pracy (w minutach zegarowych)
  const directTeachingMinutes = Math.round(hours45min * 45 + hours60min * 60);
  const breakDutiesMinutes = Math.round(dutiesAssignedCount * 15);
  const statutoryAndPrepMinutes = hasNoAssignments
    ? 0
    : Math.max(0, 2400 - (directTeachingMinutes + breakDutiesMinutes));

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
    isCombinedPensum: hasCustomPensum ? false : pensumResult.isCombined,
    basePensum: effectivePensum,
    averagedPensum: effectivePensum,
    overtimeHours,
    secondContractFte,
    secondContractHours,
    overtimeHandling,
    unfilledHours,
    suggestedDutyLimit,
    effectiveDutyLimit,
    dutyExempt,
    hasNoAssignments,
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
  totalSecondContractFte: number;
  totalSecondContractHours: number;
  teachersWithCombinedPensum: number;
  teachersWithOvertime: number;
  teachersWithSecondContract: number;
  totalSuggestedDuties: number;
  totalAssignedDuties: number;
}

export function calculateSchoolWorkloadKPI(
  teachers: Teacher[],
  assignments: Assignment[] = [],
  specialAssignments: SpecialAssignment[] = [],
  dutiesCountMap: Record<string, number> = {},
  baseDutyPerFullTime: number = 3,
  schoolBasePensum?: Partial<Record<StandardPositionType, number>>,
  schoolDefaultOvertimeHandling?: 'overtime' | 'second_contract'
): SchoolWorkloadKPI {
  let totalFte = 0;
  let totalHours45min = 0;
  let totalHours60min = 0;
  let totalCombinedHours = 0;
  let totalOvertimeHours = 0;
  let totalSecondContractFte = 0;
  let totalSecondContractHours = 0;
  let teachersWithCombinedPensum = 0;
  let teachersWithOvertime = 0;
  let teachersWithSecondContract = 0;
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
      baseDutyPerFullTime,
      schoolBasePensum,
      schoolDefaultOvertimeHandling
    );

    totalFte += analysis.totalFte;
    totalHours45min += analysis.hours45min;
    totalHours60min += analysis.hours60min;
    totalCombinedHours += analysis.nominalHours;
    totalOvertimeHours += analysis.overtimeHours;
    totalSecondContractFte += analysis.secondContractFte;
    totalSecondContractHours += analysis.secondContractHours;
    if (analysis.isCombinedPensum) teachersWithCombinedPensum++;
    if (analysis.overtimeHours > 0) teachersWithOvertime++;
    if (analysis.secondContractHours > 0) teachersWithSecondContract++;
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
    totalSecondContractFte: round(totalSecondContractFte, 4),
    totalSecondContractHours: round(totalSecondContractHours, 2),
    teachersWithCombinedPensum,
    teachersWithOvertime,
    teachersWithSecondContract,
    totalSuggestedDuties,
    totalAssignedDuties
  };
}
