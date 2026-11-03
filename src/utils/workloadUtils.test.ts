import { describe, it, expect } from 'vitest';
import {
  calculateCombinedPensum,
  calculateSuggestedDutyLimit,
  calculateTeacherWorkload,
  normalizeTeacherPositions,
  calculateSchoolWorkloadKPI,
  distributeHoursAcrossRoles,
  getStandardPositionsMeta,
  STANDARD_POSITIONS_META
} from './workloadUtils';
import { Teacher } from '../types';

describe('workloadUtils - Pensum, Nadgodziny i Dyżury w Szkole Podstawowej', () => {
  describe('Metadane stanowisk (STANDARD_POSITIONS_META)', () => {
    it('posiada poprawne pensum i jednostki czasu dla wszystkich stanowisk SP', () => {
      expect(STANDARD_POSITIONS_META.przedmiotowy.defaultPensum).toBe(18);
      expect(STANDARD_POSITIONS_META.przedmiotowy.unitMinutes).toBe(45);

      expect(STANDARD_POSITIONS_META.wspomagajacy.defaultPensum).toBe(20);
      expect(STANDARD_POSITIONS_META.wspomagajacy.unitMinutes).toBe(45);

      expect(STANDARD_POSITIONS_META.swietlica.defaultPensum).toBe(26);
      expect(STANDARD_POSITIONS_META.swietlica.unitMinutes).toBe(60);

      expect(STANDARD_POSITIONS_META.biblioteka.defaultPensum).toBe(30);
      expect(STANDARD_POSITIONS_META.biblioteka.unitMinutes).toBe(60);

      expect(STANDARD_POSITIONS_META.specjalista.defaultPensum).toBe(22);
      expect(STANDARD_POSITIONS_META.specjalista.unitMinutes).toBe(60);

      expect(STANDARD_POSITIONS_META.doradca.defaultPensum).toBe(22);
      expect(STANDARD_POSITIONS_META.doradca.unitMinutes).toBe(45);
    });
  });

  describe('calculateCombinedPensum - Pensum Łączone', () => {
    it('zwraca pojedyncze pensum bazowe gdy nauczyciel ma tylko jedno stanowisko', () => {
      const res18 = calculateCombinedPensum([{ hours: 18, basePensum: 18 }]);
      expect(res18.totalHours).toBe(18);
      expect(res18.totalFte).toBe(1);
      expect(res18.averagedPensum).toBe(18);
      expect(res18.isCombined).toBe(false);
      expect(res18.overtimeHours).toBe(0);

      const res26 = calculateCombinedPensum([{ hours: 26, basePensum: 26 }]);
      expect(res26.totalHours).toBe(26);
      expect(res26.totalFte).toBe(1);
      expect(res26.averagedPensum).toBe(26);
      expect(res26.isCombined).toBe(false);
    });

    it('poprawnie wylicza pensum łączone ze wzoru proporcjonalnego: H / sum(h_i / P_i)', () => {
      // Przykład 1: 10h przedmiotowy (P=18) + 10h świetlica (P=26)
      // H = 20h
      // E = 10/18 + 10/26 = 0.55555... + 0.384615... = 0.94017...
      // P_łączone = 20 / 0.94017... = 21.2727... ~ 21.27h
      const res = calculateCombinedPensum([
        { hours: 10, basePensum: 18 },
        { hours: 10, basePensum: 26 }
      ]);
      expect(res.totalHours).toBe(20);
      expect(res.isCombined).toBe(true);
      expect(res.averagedPensum).toBe(21.27);
      expect(res.totalFte).toBeCloseTo(0.9402, 3);
      expect(res.overtimeHours).toBe(0); // Etat < 1.0
    });

    it('poprawnie wylicza nadgodziny dla etatu powyżej 1.0 przy pensum łączonym', () => {
      // Przykład 2: Pełny etat przedmiotowy (18h o P=18) + 6h świetlicy (o P=26)
      // H = 24h
      // E = 18/18 + 6/26 = 1.0 + 0.230769 = 1.230769
      // P_łączone = 24 / 1.230769 = 19.5h
      // Nadgodziny = 24 - 19.5 = 4.5h
      const res = calculateCombinedPensum([
        { hours: 18, basePensum: 18 },
        { hours: 6, basePensum: 26 }
      ]);
      expect(res.totalHours).toBe(24);
      expect(res.totalFte).toBeCloseTo(1.2308, 3);
      expect(res.averagedPensum).toBe(19.5);
      expect(res.overtimeHours).toBe(4.5);
    });
  });

  describe('calculateSuggestedDutyLimit - Limit Dyżurów na Przerwach', () => {
    it('zwraca 0 dla nauczyciela zwolnionego z dyżurów', () => {
      const limit = calculateSuggestedDutyLimit(18, 1.0, 3, true);
      expect(limit).toBe(0);
    });

    it('zwraca bazowy limit (np. 3) dla pełnego etatu dydaktycznego przy tablicy', () => {
      const limit = calculateSuggestedDutyLimit(18, 1.0, 3, false);
      expect(limit).toBe(3);
    });

    it('zmniejsza limit proporcjonalnie dla nauczyciela z mniejszą liczbą godzin przy tablicy', () => {
      // 9h przy tablicy: 3 * (9/18) = 1.5 -> zaokrąglenie do 2 (bez podwójnego mnożenia przez FTE)
      const limit = calculateSuggestedDutyLimit(9, 0.5, 3, false);
      expect(limit).toBe(2);
    });

    it('zwraca poprawny limit dyżurów dla 12 h tablicowych bez podwójnego mnożenia przez FTE', () => {
      // Audyt: 12h tablicowych przy bazie 3 dyżury: 3 * (12/18) = 2.0 -> dokładnie 2 dyżury
      const limit = calculateSuggestedDutyLimit(12, 12 / 18, 3, false);
      expect(limit).toBe(2);
    });

    it('zwraca 0 dla nauczyciela niemającego godzin bezpośrednio przy tablicy', () => {
      // np. wychowawca wyłącznie świetlicy lub bibliotekarz bez lekcji przedmiotowych
      const limit = calculateSuggestedDutyLimit(0, 1.0, 3, false);
      expect(limit).toBe(0);
    });
  });

  describe('distributeHoursAcrossRoles - Podział godzin bez gubienia reszty', () => {
    it('poprawnie dzieli 10 h na 3 role z przypisaniem reszty do ostatniej roli (3.3h + 3.3h + 3.4h)', () => {
      const parts = distributeHoursAcrossRoles(10, 3, 1);
      expect(parts).toEqual([3.3, 3.3, 3.4]);
      const sum = parts.reduce((acc, h) => acc + h, 0);
      expect(sum).toBe(10.0);
    });

    it('zwraca pustą tablicę dla 0 ról lub 0 godzin', () => {
      expect(distributeHoursAcrossRoles(0, 3, 1)).toEqual([]);
      expect(distributeHoursAcrossRoles(10, 0, 1)).toEqual([]);
    });

    it('zwraca pojedynczą wartość dla 1 roli', () => {
      expect(distributeHoursAcrossRoles(15, 1, 1)).toEqual([15]);
    });
  });

  describe('calculateTeacherWorkload - Pełna analiza nauczyciela i przypadki z audytu', () => {
    it('rozbija godziny na 45 min (lekcyjne) i 60 min (zegarowe)', () => {
      const teacher: Teacher = {
        id: 't-test-1',
        first: 'Anna',
        last: 'Nowak',
        abbr: 'AN',
        workloadPositions: [
          {
            id: 'pos-1',
            type: 'przedmiotowy',
            title: 'Język polski',
            hours: 12,
            basePensum: 18,
            unitMinutes: 45
          },
          {
            id: 'pos-2',
            type: 'swietlica',
            title: 'Świetlica',
            hours: 8,
            basePensum: 26,
            unitMinutes: 60
          }
        ]
      };

      const result = calculateTeacherWorkload(teacher, [], [], 2, 3);
      expect(result.hours45min).toBe(12);
      expect(result.hours60min).toBe(8);
      expect(result.boardHours).toBe(12);
      expect(result.nominalHours).toBe(20);
      expect(result.isCombinedPensum).toBe(true);
      expect(result.hasNoAssignments).toBe(false);
      expect(result.timeEnvelope40h.totalWeeklyMinutes).toBe(2400); // 40h
      // Czas bezpośredni: 12 * 45 min + 8 * 60 min = 540 + 480 = 1020 minut
      expect(result.timeEnvelope40h.directTeachingMinutes).toBe(1020);
      // 2 dyżury * 15 min = 30 minut
      expect(result.timeEnvelope40h.breakDutiesMinutes).toBe(30);
      // Przygotowanie i zadania statutowe: 2400 - 1050 = 1350 minut
      expect(result.timeEnvelope40h.statutoryAndPrepMinutes).toBe(1350);
    });

    it('przypadek z audytu: customPensum 16 + 17 h (FTE = 17/16, nadgodziny = 1h)', () => {
      const teacher: Teacher = {
        id: 't-custom-16',
        first: 'Marek',
        last: 'Dyrektor',
        abbr: 'MD',
        customPensum: 16,
        workloadPositions: [
          {
            id: 'pos-1',
            type: 'przedmiotowy',
            title: 'Fizyka',
            hours: 17,
            basePensum: 18,
            unitMinutes: 45
          }
        ]
      };

      const result = calculateTeacherWorkload(teacher);
      expect(result.basePensum).toBe(16);
      expect(result.averagedPensum).toBe(16);
      expect(result.nominalHours).toBe(17);
      // FTE = 17 / 16 = 1.0625
      expect(result.totalFte).toBeCloseTo(1.0625, 4);
      expect(result.ftePercent).toBe(106.3);
      // Nadgodziny = max(0, 17 - 16) = 1h
      expect(result.overtimeHours).toBe(1);
      expect(result.unfilledHours).toBe(0);
      expect(result.hasNoAssignments).toBe(false);
    });

    it('przypadek z audytu: nauczyciel bez przydziałów zwraca pozycje puste (0 h, FTE 0) i hasNoAssignments: true', () => {
      const teacher: Teacher = {
        id: 't-empty',
        first: 'Piotr',
        last: 'Nowy',
        abbr: 'PN'
      };

      const result = calculateTeacherWorkload(teacher, [], []);
      expect(result.positions).toEqual([]);
      expect(result.nominalHours).toBe(0);
      expect(result.boardHours).toBe(0);
      expect(result.hours45min).toBe(0);
      expect(result.hours60min).toBe(0);
      expect(result.totalFte).toBe(0);
      expect(result.ftePercent).toBe(0);
      expect(result.overtimeHours).toBe(0);
      expect(result.unfilledHours).toBe(0);
      expect(result.suggestedDutyLimit).toBe(0);
      expect(result.hasNoAssignments).toBe(true);
    });

    it('przypadek z audytu: 20 h opiekuńczych bez roli (inny 60 min NIE jest tablicowy)', () => {
      const teacher: Teacher = {
        id: 't-care-20',
        first: 'Barbara',
        last: 'Opiekun',
        abbr: 'BO',
        nonTeachingHours: 20
      };

      const result = calculateTeacherWorkload(teacher, [], []);
      expect(result.hasNoAssignments).toBe(false);
      expect(result.positions.length).toBe(1);
      expect(result.positions[0].type).toBe('inny');
      expect(result.positions[0].unitMinutes).toBe(60);
      expect(result.positions[0].basePensum).toBe(26);
      expect(result.hours60min).toBe(20);
      expect(result.hours45min).toBe(0);
      // Typ 'inny' z 60 min NIE jest tablicowy:
      expect(result.boardHours).toBe(0);
      // FTE = 20 / 26
      expect(result.totalFte).toBeCloseTo(20 / 26, 4);
      expect(result.effectiveDutyLimit).toBe(0);
    });

    it('przypadek z audytu: 10 h na 3 role w normalizeTeacherPositions bez gubienia reszty', () => {
      const teacher: Teacher = {
        id: 't-3roles',
        first: 'Grażyna',
        last: 'Wielozadaniowa',
        abbr: 'GW',
        nonTeachingHours: 10,
        nonTeachingRoles: ['swietlica', 'biblioteka', 'pedagog']
      };

      const positions = normalizeTeacherPositions(teacher);
      expect(positions.length).toBe(3);
      expect(positions[0].hours).toBe(3.3);
      expect(positions[1].hours).toBe(3.3);
      expect(positions[2].hours).toBe(3.4);
      const total = positions.reduce((sum, p) => sum + p.hours, 0);
      expect(total).toBe(10.0);
    });

    it('wsteczna kompatybilność: nauczyciel z przydziałami lekcyjnymi przy tablicy', () => {
      const teacher: Teacher = {
        id: 't-legacy',
        first: 'Jan',
        last: 'Kowalski',
        abbr: 'JK'
      };

      const assignments = [
        { id: 'a1', teacherId: 't-legacy', classId: 'c1', subjectId: 's1', hoursPerWeek: 18 }
      ];

      const result = calculateTeacherWorkload(teacher, assignments as any, []);
      expect(result.totalFte).toBe(1.0);
      expect(result.basePensum).toBe(18);
      expect(result.hours45min).toBe(18);
      expect(result.hours60min).toBe(0);
      expect(result.boardHours).toBe(18);
      expect(result.suggestedDutyLimit).toBe(3);
      expect(result.hasNoAssignments).toBe(false);
    });
  });

  describe('calculateSchoolWorkloadKPI - Podsumowanie szkoły', () => {
    it('sumuje etaty, godziny 45 min, godziny 60 min i nadgodziny w szkole', () => {
      const teachers: Teacher[] = [
        {
          id: 't1',
          first: 'A',
          last: 'A',
          abbr: 'AA',
          workloadPositions: [
            { id: 'p1', type: 'przedmiotowy', title: 'Matematyka', hours: 18, basePensum: 18, unitMinutes: 45 }
          ]
        },
        {
          id: 't2',
          first: 'B',
          last: 'B',
          abbr: 'BB',
          workloadPositions: [
            { id: 'p2', type: 'swietlica', title: 'Świetlica', hours: 26, basePensum: 26, unitMinutes: 60 }
          ]
        }
      ];

      const kpi = calculateSchoolWorkloadKPI(teachers);
      expect(kpi.totalTeachersCount).toBe(2);
      expect(kpi.activeTeachersCount).toBe(2);
      expect(kpi.totalFte).toBe(2.0);
      expect(kpi.totalHours45min).toBe(18);
      expect(kpi.totalHours60min).toBe(26);
      expect(kpi.totalCombinedHours).toBe(44);
    });

    it('agreguje drugi etat (drugą umowę o pracę) w KPI szkoły', () => {
      const teachers: Teacher[] = [
        {
          id: 't-combined-surplus',
          first: 'Anna',
          last: 'Nowak',
          abbr: 'AN',
          workloadPositions: [
            { id: 'p1', type: 'przedmiotowy', title: 'Język polski', hours: 18, basePensum: 18, unitMinutes: 45 },
            { id: 'p2', type: 'swietlica', title: 'Świetlica', hours: 13, basePensum: 26, unitMinutes: 60 }
          ]
        }
      ];

      const kpi = calculateSchoolWorkloadKPI(teachers);
      expect(kpi.totalFte).toBe(1.5);
      expect(kpi.totalOvertimeHours).toBe(0);
      expect(kpi.totalSecondContractFte).toBe(0.5);
      expect(kpi.totalSecondContractHours).toBe(13);
      expect(kpi.teachersWithSecondContract).toBe(1);
    });
  });

  describe('Rozdział: godziny ponadwymiarowe (nadgodziny) vs drugi etat (odrębna umowa)', () => {
    it('stanowisko jednego rodzaju: nadwyżka ponad 1.0 etatu jest domyślnie traktowana jako nadgodziny', () => {
      const teacher: Teacher = {
        id: 't-single-overtime',
        first: 'Tomasz',
        last: 'Matematyk',
        abbr: 'TM',
        workloadPositions: [
          { id: 'pos-1', type: 'przedmiotowy', title: 'Matematyka', hours: 22, basePensum: 18, unitMinutes: 45 }
        ]
      };

      const result = calculateTeacherWorkload(teacher);
      expect(result.totalFte).toBeCloseTo(22 / 18, 4);
      expect(result.overtimeHandling).toBe('overtime');
      // Nadgodziny: 22 - 18 = 4h
      expect(result.overtimeHours).toBe(4);
      expect(result.secondContractFte).toBe(0);
      expect(result.secondContractHours).toBe(0);
    });

    it('stanowiska łączone (różne rodzaje): nadwyżka jest domyślnie traktowana jako drugi etat', () => {
      const teacher: Teacher = {
        id: 't-multi-second-contract',
        first: 'Ewa',
        last: 'Łączona',
        abbr: 'EL',
        workloadPositions: [
          { id: 'pos-1', type: 'przedmiotowy', title: 'Historia', hours: 18, basePensum: 18, unitMinutes: 45 },
          { id: 'pos-2', type: 'swietlica', title: 'Świetlica', hours: 13, basePensum: 26, unitMinutes: 60 }
        ]
      };

      const result = calculateTeacherWorkload(teacher);
      // Łączny etat = 18/18 + 13/26 = 1.0 + 0.5 = 1.5 FTE
      expect(result.totalFte).toBe(1.5);
      expect(result.overtimeHandling).toBe('second_contract');
      // Nadwyżka jako drugi etat: 0.5 FTE, 13 godzin
      expect(result.overtimeHours).toBe(0);
      expect(result.secondContractFte).toBe(0.5);
      expect(result.secondContractHours).toBe(13);
    });

    it('wymuszenie w profilu teacher.overtimeHandling = overtime dla stanowisk łączonych', () => {
      const teacher: Teacher = {
        id: 't-forced-overtime',
        first: 'Janina',
        last: 'Kreator',
        abbr: 'JK',
        overtimeHandling: 'overtime',
        workloadPositions: [
          { id: 'pos-1', type: 'przedmiotowy', title: 'Biologia', hours: 18, basePensum: 18, unitMinutes: 45 },
          { id: 'pos-2', type: 'swietlica', title: 'Świetlica', hours: 13, basePensum: 26, unitMinutes: 60 }
        ]
      };

      const result = calculateTeacherWorkload(teacher);
      expect(result.overtimeHandling).toBe('overtime');
      expect(result.overtimeHours).toBeGreaterThan(0);
      expect(result.secondContractFte).toBe(0);
      expect(result.secondContractHours).toBe(0);
    });

    it('wymuszenie w profilu teacher.overtimeHandling = second_contract dla stanowiska jednego rodzaju', () => {
      const teacher: Teacher = {
        id: 't-forced-contract',
        first: 'Krzysztof',
        last: 'Podwójny',
        abbr: 'KP',
        overtimeHandling: 'second_contract',
        workloadPositions: [
          { id: 'pos-1', type: 'przedmiotowy', title: 'Informatyka', hours: 22, basePensum: 18, unitMinutes: 45 }
        ]
      };

      const result = calculateTeacherWorkload(teacher);
      expect(result.overtimeHandling).toBe('second_contract');
      expect(result.overtimeHours).toBe(0);
      expect(result.secondContractFte).toBeCloseTo(4 / 18, 4);
      expect(result.secondContractHours).toBe(4);
    });
  });

  describe('Edycja pensum bazowych per szkoła (schoolBasePensum)', () => {
    it('getStandardPositionsMeta nadpisuje pensum na podstawie uchwały organu prowadzącego', () => {
      const schoolConfig = {
        specjalista: 20,
        doradca: 20,
        swietlica: 24
      };

      const meta = getStandardPositionsMeta(schoolConfig);
      expect(meta.specjalista.defaultPensum).toBe(20);
      expect(meta.doradca.defaultPensum).toBe(20);
      expect(meta.swietlica.defaultPensum).toBe(24);
      // Niezmienione stanowisko pozostaje ustawowe
      expect(meta.przedmiotowy.defaultPensum).toBe(18);
      expect(meta.biblioteka.defaultPensum).toBe(30);
    });

    it('normalizeTeacherPositions używa zmodyfikowanego pensum szkoły', () => {
      const teacher: Teacher = {
        id: 't-pedagog',
        first: 'Alicja',
        last: 'Psycholog',
        abbr: 'AP',
        nonTeachingHours: 20,
        nonTeachingRoles: ['psycholog']
      };

      const schoolConfig = {
        specjalista: 20
      };

      const positions = normalizeTeacherPositions(teacher, [], [], schoolConfig);
      expect(positions.length).toBe(1);
      expect(positions[0].type).toBe('specjalista');
      expect(positions[0].basePensum).toBe(20);
      expect(positions[0].hours).toBe(20);
    });

    it('calculateTeacherWorkload z pensum szkoły wylicza pełny etat 1.0 FTE dla 20h psychologa', () => {
      const teacher: Teacher = {
        id: 't-pedagog-2',
        first: 'Alicja',
        last: 'Psycholog',
        abbr: 'AP',
        nonTeachingHours: 20,
        nonTeachingRoles: ['psycholog']
      };

      const schoolConfig = {
        specjalista: 20
      };

      const result = calculateTeacherWorkload(teacher, [], [], 0, 0, schoolConfig);
      // Przy pensum szkoły 20h, 20h pracy daje dokładnie 1.0 FTE
      expect(result.totalFte).toBe(1.0);
      expect(result.ftePercent).toBe(100);
      expect(result.overtimeHours).toBe(0);
      expect(result.unfilledHours).toBe(0);
    });
  });
});
