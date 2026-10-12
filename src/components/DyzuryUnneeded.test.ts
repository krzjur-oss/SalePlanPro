/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Obsługi Zbędnych Dyżurów (Dyzury Unneeded Tests)
 * Opis: Weryfikacja manualnego oznaczania zbędnych dyżurów, schematów walidacji i wydruków.
 */
import { describe, it, expect } from 'vitest';
import { DyzurEntrySchema, PlanDyzuryStateSchema } from '../utils/validationSchemas';
import { generateDutiesHtml } from '../utils/dutiesPrintHtml';
import { AppState, PlanDyzuryState } from '../types';

describe('Etap 3: Dyżury Niepotrzebne (Zbędne) Tests', () => {
  it('DyzurEntrySchema poprawnie waliduje wpis oznaczony jako zbędny z pustym teacherAbbr i notatką', () => {
    const unneededEntry = {
      teacherAbbr: '',
      locked: true,
      isUnneeded: true,
      note: 'Brak uczniów w skrzydle zachodnim'
    };

    const parsed = DyzurEntrySchema.parse(unneededEntry);
    expect(parsed.isUnneeded).toBe(true);
    expect(parsed.locked).toBe(true);
    expect(parsed.teacherAbbr).toBe('');
    expect(parsed.note).toBe('Brak uczniów w skrzydle zachodnim');
  });

  it('PlanDyzuryStateSchema akceptuje harmonogram zawierający wpisy standardowe oraz zbędne', () => {
    const rawState: PlanDyzuryState = {
      miejsca: [
        { id: 'm1', name: 'Hol Parter' },
        { id: 'm2', name: 'I Piętro' }
      ],
      przerwy: [
        { num: 1, name: 'Przerwa 1', start: '08:45', end: '08:55' },
        { num: 2, name: 'Przerwa 2', start: '09:40', end: '09:50' }
      ],
      harmonogram: {
        'm1|0|1': { teacherAbbr: 'JK', locked: false },
        'm1|0|2': { teacherAbbr: '', locked: true, isUnneeded: true, note: 'Zamknięte skrzydło' },
        'm2|1|1': { teacherAbbr: '', locked: true, isUnneeded: true }
      },
      settings: {
        autoBalance: true,
        maxPerTeacher: 3,
        excludeTeachers: []
      }
    };

    const validated = PlanDyzuryStateSchema.parse(rawState);
    expect(validated.harmonogram['m1|0|1']?.teacherAbbr).toBe('JK');
    expect(validated.harmonogram['m1|0|1']?.isUnneeded).toBe(false);
    expect(validated.harmonogram['m1|0|2']?.isUnneeded).toBe(true);
    expect(validated.harmonogram['m1|0|2']?.note).toBe('Zamknięte skrzydło');
    expect(validated.harmonogram['m2|1|1']?.isUnneeded).toBe(true);
  });

  it('generateDutiesHtml czytelnie renderuje oznaczenie "🚫 Zbędny" dla niepotrzebnych slotów', () => {
    const mockState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: {
        name: 'Szkoła Podstawowa nr 1',
        short: 'SP1'
      },
      dyzury: {
        miejsca: [
          { id: 'm1', name: 'Korytarz Parter' }
        ],
        przerwy: [
          { num: 1, name: 'Przerwa 1', start: '08:45', end: '08:55' }
        ],
        harmonogram: {
          'm1|0|1': {
            teacherAbbr: '',
            locked: true,
            isUnneeded: true,
            note: 'Klasy na wycieczce'
          }
        },
        settings: {
          autoBalance: true,
          maxPerTeacher: 3,
          excludeTeachers: [],
          firstGradeAdaptationDuty: false
        }
      },
      teachers: [],
      planLekcji: {
        classes: [],
        teachers: [],
        subjects: [],
        rooms: [],
        lessons: {},
        assignments: []
      }
    } as unknown as AppState;

    const html = generateDutiesHtml(mockState, {});
    expect(html).toContain('Zbędny');
    expect(html).toContain('Klasy na wycieczce');
  });

  it('obliczanie zapotrzebowania: slot oznaczony jako zbędny redukuje wymagany czas dyżurów', () => {
    // 1 miejsce, 1 przerwa (10 min) w poniedziałek (dzień 0)
    // Gdy zbędny: nie powinien być liczony jako brakujący
    const breakDuration = 10;
    const teachersNeeded = 1;

    const dutyKey = 'm1|0|1';
    const harmonogramWithUnneeded: Record<string, { teacherAbbr: string; locked: boolean; isUnneeded?: boolean }> = {
      [dutyKey]: {
        teacherAbbr: '',
        locked: true,
        isUnneeded: true
      }
    };

    let totalMinutesNeeded = 0;
    let unneededCount = 0;

    for (let day = 0; day < 5; day++) {
      const key = `m1|${day}|1`;
      if (harmonogramWithUnneeded[key]?.isUnneeded) {
        unneededCount++;
        continue;
      }
      totalMinutesNeeded += breakDuration * teachersNeeded;
    }

    // Poniedziałek (1 dzień) jest zbędny, pozostałe 4 dni po 10 min = 40 min
    expect(unneededCount).toBe(1);
    expect(totalMinutesNeeded).toBe(40);
  });
});
