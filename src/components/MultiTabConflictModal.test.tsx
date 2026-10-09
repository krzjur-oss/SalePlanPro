/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Okna Konfliktu Wielu Kart (MultiTabConflictModal Tests)
 * Opis: Weryfikacja renderowania okna dialogowego wykrywania równoległej edycji planu.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MultiTabConflictModal from './MultiTabConflictModal';
import type { AppState } from '../types';

describe('MultiTabConflictModal Unit Tests', () => {
  it('renders tab origin information and list of changes made', () => {
    const localAppState: Partial<AppState> = {
      planLekcji: {
        meta: { schoolName: 'SP 1', year: '2025/2026' },
        hours: [],
        classes: [{ id: 'c1', name: '1A', color: '#fff', groupIds: [] }],
        teachers: [{ id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }],
        rooms: [],
        subjects: [{ id: 's1', name: 'Matematyka', short: 'MAT', color: '#blue' }],
        schoolGroups: [],
        assignments: [{ id: 'a1', classId: 'c1', teacherId: 't1', subjectId: 's1', roomId: null, hoursPerWeek: 4, groupId: null }],
        lessons: {},
        specialStudents: [],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      },
      dyzury: {
        miejsca: [{ id: 'm1', name: 'Korytarz Parter' }],
        przerwy: [{ num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' }],
        harmonogram: {},
        settings: { autoBalance: false, maxPerTeacher: 2, excludeTeachers: [] }
      }
    };

    const incomingAppState: Partial<AppState> = {
      ...localAppState,
      planLekcji: {
        ...localAppState.planLekcji!,
        lessons: {
          'c1|0|1': { assignmentId: 'a1', locked: false }
        }
      },
      dyzury: {
        ...localAppState.dyzury!,
        harmonogram: {
          'm1|0|1': { teacherAbbr: 'JK', locked: false }
        }
      }
    };

    const onLoadIncoming = vi.fn();
    const onKeepLocal = vi.fn();

    render(
      <MultiTabConflictModal
        isOpen={true}
        localRevision={2}
        incomingRevision={3}
        incomingTabId="tab_window_dyzury_987654"
        incomingTabName="Karta: Dyżury Nauczycielskie"
        incomingSectionName="Dyżury Nauczycielskie"
        incomingUpdatedAt="2026-10-09T08:35:00.000Z"
        localTabName="Plan Klas"
        localAppState={localAppState as AppState}
        incomingAppState={incomingAppState as AppState}
        onLoadIncoming={onLoadIncoming}
        onKeepLocal={onKeepLocal}
      />
    );

    // 1. Sprawdzenie informacji: w jakiej karcie dokonano zmian
    expect(screen.getByText('Wykryto równoległą edycję')).toBeDefined();
    expect(screen.getByText('Karta: Dyżury Nauczycielskie')).toBeDefined();
    expect(screen.getByText('Rewizja #2')).toBeDefined();
    expect(screen.getByText('Rewizja #3')).toBeDefined();
    expect(screen.getByText('Dyżury Nauczycielskie')).toBeDefined();

    // 2. Sprawdzenie informacji: jakich zmian dokonano
    expect(screen.getByText(/Dodano lekcję: 1A/i)).toBeDefined();
    expect(screen.getByText(/Dodano dyżur: Korytarz Parter/i)).toBeDefined();
    expect(screen.getByText(/Łącznie wykrytych różnic: 2/i)).toBeDefined();
  });
});
