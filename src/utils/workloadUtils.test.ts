import { describe, it, expect } from 'vitest';
import {
  calculateCombinedPensum,
  calculateSuggestedDutyLimit,
  calculateTeacherWorkload,
  normalizeTeacherPositions,
  calculateSchoolWorkloadKPI,
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
      // 9h przy tablicy przy etacie 0.5 -> 3 * (9/18) * 0.5 = 0.75 -> zaokrąglenie do 1
      const limit = calculateSuggestedDutyLimit(9, 0.5, 3, false);
      expect(limit).toBe(1);
    });

    it('zwraca 0 dla nauczyciela niemającego godzin bezpośrednio przy tablicy', () => {
      // np. wychowawca wyłącznie świetlicy lub bibliotekarz bez lekcji przedmiotowych
      const limit = calculateSuggestedDutyLimit(0, 1.0, 3, false);
      expect(limit).toBe(0);
    });
  });

  describe('calculateTeacherWorkload - Pełna analiza nauczyciela', () => {
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
      expect(result.timeEnvelope40h.totalWeeklyMinutes).toBe(2400); // 40h
      // Czas bezpośredni: 12 * 45 min + 8 * 60 min = 540 + 480 = 1020 minut
      expect(result.timeEnvelope40h.directTeachingMinutes).toBe(1020);
      // 2 dyżury * 15 min = 30 minut
      expect(result.timeEnvelope40h.breakDutiesMinutes).toBe(30);
      // Przygotowanie i zadania statutowe: 2400 - 1050 = 1350 minut
      expect(result.timeEnvelope40h.statutoryAndPrepMinutes).toBe(1350);
    });

    it('zapewnia wsteczną kompatybilność dla nauczycieli bez zdefiniowanych workloadPositions', () => {
      const teacher: Teacher = {
        id: 't-legacy',
        first: 'Jan',
        last: 'Kowalski',
        abbr: 'JK',
        maxHours: 18
      };

      const result = calculateTeacherWorkload(teacher);
      expect(result.totalFte).toBe(1.0);
      expect(result.basePensum).toBe(18);
      expect(result.hours45min).toBe(18);
      expect(result.hours60min).toBe(0);
      expect(result.suggestedDutyLimit).toBe(3);
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
  });
});
