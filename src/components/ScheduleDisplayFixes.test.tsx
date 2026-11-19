import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PlanKlas from './PlanKlas';
import PlanSal, { isWychowawczeCell } from './PlanSal';
import Wydruki from './Wydruki';
import { getDemoAppState, colKey, flattenColumns } from '../utils';
import { SchedData } from '../types';

describe('Wyświetlanie nauczyciela, notatek i wychowawców (PlanKlas, PlanSal, Wydruki)', () => {
  it('PlanKlas: w obu widokach pokazuje {first[0]}. {last} (SKRÓT) bez truncate i z pełnym imieniem i nazwiskiem w title', () => {
    const appState = getDemoAppState();
    const cls = { id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] };
    const teacher = {
      id: 't1',
      first: 'Aleksandra',
      last: 'Brzęczyszczykiewiczówna',
      abbr: 'AB',
      maxHours: 18,
    };
    const subject = { id: 's1', name: 'Matematyka', short: 'MAT', color: '#2563eb' };
    const asg = {
      id: 'a1',
      classId: cls.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      hoursPerWeek: 2,
      groupId: null,
      roomId: null,
    };

    appState.classes = [cls];
    appState.teachers = [teacher];
    appState.subjects = [subject];
    appState.planLekcji = {
      ...appState.planLekcji,
      classes: [cls],
      teachers: [teacher],
      subjects: [subject],
      hours: [{ num: 1, start: '08:00', end: '08:45' }],
      assignments: [asg],
      lessons: {
        [`${cls.id}|0|0|${asg.id}`]: {
          assignmentId: asg.id,
          locked: false,
        },
      },
      schoolGroups: [],
      specialStudents: [],
      specialAssignments: [],
    };

    render(
      <PlanKlas
        appState={appState}
        onChangeAppState={() => {}}
        onTransfer={() => {}}
      />
    );

    // Widok jednej klasy (~3670)
    const compactText = '👤 A. Brzęczyszczykiewiczówna (AB)';
    const fullTitle = 'Aleksandra Brzęczyszczykiewiczówna (AB)';
    const singleViewTeacherEl = screen.getByText(compactText);
    expect(singleViewTeacherEl).toBeTruthy();
    expect(singleViewTeacherEl.getAttribute('title')).toBe(fullTitle);
    expect(singleViewTeacherEl.className).not.toContain('truncate');

    // Przełączenie na widok wszystkich klas (~3300)
    fireEvent.click(screen.getByRole('button', { name: /Wszystkie klasy/i }));
    const allViewTeacherEl = screen.getByText(compactText);
    expect(allViewTeacherEl).toBeTruthy();
    expect(allViewTeacherEl.getAttribute('title')).toBe(fullTitle);
    expect(allViewTeacherEl.className).not.toContain('truncate');
  });

  it('PlanSal: pokazuje „Brak nauczyciela" w kolorze ostrzegawczym zamiast „Wychowawca", chyba że zajęcia są wychowawcze, oraz zawija notatkę bez limitu 80px', () => {
    const appState = getDemoAppState();
    const cols = flattenColumns(appState.floors);
    expect(cols.length).toBeGreaterThanOrEqual(2);
    const colA = cols[0];
    const colB = cols[1];
    const keyA = colKey(colA);
    const keyB = colKey(colB);
    const hourNum = String(appState.hours[0] || '1');
    const longNote = 'Bardzo długa notatka dotycząca organizacji sali i sprzętu laboratoryjnego na całą lekcję';

    const schedData: SchedData = {
      [appState.yearKey]: {
        0: {
          [hourNum]: {
            [keyA]: {
              teacherAbbr: '',
              classes: ['5A'],
              className: '5A',
              subject: 'Matematyka',
              note: longNote,
            },
            [keyB]: {
              teacherAbbr: '',
              classes: ['5B'],
              className: '5B',
              subject: 'Godzina wychowawcza',
              note: 'Spotkanie organizacyjne',
            },
          },
        },
      },
    };

    render(
      <PlanSal
        appState={appState}
        schedData={schedData}
        onChangeAppState={() => {}}
        onChangeSchedData={() => {}}
        onImportFromPlanKlas={() => {}}
      />
    );

    // Komórka bez nauczyciela (zwykły przedmiot) -> „Brak nauczyciela" w kolorze ostrzegawczym
    const missingTeacherLabel = screen.getByText('👤 Brak nauczyciela');
    expect(missingTeacherLabel).toBeTruthy();
    expect(missingTeacherLabel.parentElement?.className).toContain('text-amber-700');

    // Komórka bez nauczyciela oznaczona jako zajęcia wychowawcze -> „Wychowawca"
    const homeroomTeacherLabel = screen.getByText('👤 Wychowawca');
    expect(homeroomTeacherLabel).toBeTruthy();
    expect(homeroomTeacherLabel.parentElement?.className).not.toContain('text-amber-700');

    // Notatka w osobnej linii z zawijaniem i bez max-w-[80px] / truncate
    const noteEl = screen.getByText(longNote);
    expect(noteEl.tagName.toLowerCase()).toBe('div');
    expect(noteEl.className).not.toContain('max-w-[80px]');
    expect(noteEl.className).not.toContain('truncate');
    expect(noteEl.className).toContain('break-words');

    // Weryfikacja pomocnika isWychowawczeCell
    expect(isWychowawczeCell({ subject: 'Wychowanie fizyczne' })).toBe(false);
    expect(isWychowawczeCell({ subject: 'Zajęcia wychowawcze' })).toBe(true);
    expect(isWychowawczeCell({ subject: 'Informatyka', isHomeroom: true })).toBe(true);
  });

  it('Wydruki (Plan Klas): nagłówek wydruku w obu widokach zawiera „Wychowawca: …" z appState.homerooms', () => {
    const appState = getDemoAppState();
    const cls1 = { id: 'c1', name: '1A', color: '#3b82f6', groupIds: [] };
    const cls2 = { id: 'c2', name: '2B', color: '#10b981', groupIds: [] };
    const t1 = { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK', maxHours: 18 };

    appState.classes = [cls1, cls2];
    appState.teachers = [t1];
    appState.planLekcji = {
      ...appState.planLekcji,
      classes: [cls1, cls2],
      teachers: [t1],
      hours: [{ num: 1, start: '08:00', end: '08:45' }],
      assignments: [],
      lessons: {},
    };
    appState.homerooms = {
      r_101: {
        className: '1A',
        teacherAbbr: 'JK',
        className2: '2B',
        teacherAbbr2: 'AN',
      },
    };

    render(<Wydruki appState={appState} schedData={{}} />);

    // Widok główny (.print-container)
    expect(screen.getByText('Wychowawca: Jan Kowalski (JK)')).toBeTruthy();
    expect(screen.getByText('Wychowawca: AN')).toBeTruthy();

    // Podgląd tygodniowy (#weekly-print-overlay)
    fireEvent.click(screen.getByRole('button', { name: /Generuj Tygodniowy Plan/i }));
    const overlay = document.getElementById('weekly-print-overlay');
    expect(overlay).toBeTruthy();
    expect(within(overlay as HTMLElement).getByText('Wychowawca: Jan Kowalski (JK)')).toBeTruthy();
    expect(within(overlay as HTMLElement).getByText('Wychowawca: AN')).toBeTruthy();
  });
});
