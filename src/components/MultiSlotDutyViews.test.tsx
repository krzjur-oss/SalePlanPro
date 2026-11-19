import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Wydruki from './Wydruki';
import Dyzury from './Dyzury';
import MobilePlanViewer from './MobilePlanViewer';
import KioskMode from './KioskMode';
import { getDemoAppState, getDemoSchedData } from '../utils';
import { AppState, SchedData } from '../types';

function createMultiSlotFixture(): {
  appState: AppState;
  schedData: SchedData;
  teacherA: AppState['planLekcji']['teachers'][number];
  teacherB: AppState['planLekcji']['teachers'][number];
} {
  const appState = getDemoAppState();
  const teacherA = {
    id: 't_slot1',
    first: 'Anna',
    last: 'Nowak',
    abbr: 'AN',
    maxHours: 18,
  };
  const teacherB = {
    id: 't_slot2',
    first: 'Bartosz',
    last: 'Kowalski',
    abbr: 'BK',
    maxHours: 18,
  };

  appState.teachers = [teacherA, teacherB];
  appState.planLekcji.teachers = [teacherA, teacherB];
  appState.planLekcji.hours = [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
  ];
  appState.hours = ['08:00', '08:55'];
  appState.timeslots = appState.planLekcji.hours;

  appState.dyzury = {
    miejsca: [
      { id: 'm1', name: 'Korytarz Główny', floor: 'Parter', teachersNeeded: 2 },
      { id: 'm2', name: 'Dziedziniec', floor: 'Zewnątrz', teachersNeeded: 2 },
    ],
    przerwy: [
      { num: 1, name: 'Przerwa po 1 lekcji', start: '08:45', end: '08:55' },
    ],
    harmonogram: {
      // Celowo w slocie #2 na poniedziałku (dzień 0), a na wtorku (dzień 1) kolizja dla BK między m1 #2 i m2 #2
      'm1|0|1|2': { teacherAbbr: 'BK', locked: false },
      'm1|1|1': { teacherAbbr: 'AN', locked: false },
      'm1|1|1|2': { teacherAbbr: 'BK', locked: false },
      'm2|1|1|2': { teacherAbbr: 'BK', locked: false },
    },
    settings: {
      autoBalance: true,
      maxPerTeacher: 5,
      excludeTeachers: [],
      firstGradeAdaptationDuty: false,
    },
  };

  const firstFloorRoom = appState.floors?.[0]?.segments?.[0]?.rooms?.[0];
  const colKey = firstFloorRoom?.num
    ? `f0_s0_${firstFloorRoom.num}`
    : 'f0_s0_r0';

  const schedData: SchedData = {
    [appState.yearKey]: {
      0: {
        '1': {
          [colKey]: {
            teacherAbbr: 'BK',
            classes: ['1A'],
            className: '1A',
            subject: 'Matematyka',
          },
        },
        '2': {
          [colKey]: {
            teacherAbbr: 'BK',
            classes: ['1B'],
            className: '1B',
            subject: 'Fizyka',
          },
        },
      },
      1: {
        '1': {
          [colKey]: {
            teacherAbbr: 'AN',
            classes: ['2A'],
            className: '2A',
            subject: 'Polski',
          },
        },
      },
    },
  };

  return { appState, schedData, teacherA, teacherB };
}

describe('Integracja widoków z wieloslotowymi dyżurami (teachersNeeded=2, slot #2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Poniedziałek 02.03.2026 godz. 08:50 (przerwa po lekcji 1, dayIdx = 0)
    vi.setSystemTime(new Date('2026-03-02T08:50:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('Wydruki (Plan Nauczyciela): nauczyciel ze slotu #2 widzi swój dyżur w planie tygodnia', () => {
    const { appState, schedData, teacherB } = createMultiSlotFixture();

    render(<Wydruki appState={appState} schedData={schedData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nauczyciele' }));
    const selects = screen.getAllByRole('combobox');
    const teacherSelect = selects[1];
    fireEvent.change(teacherSelect, { target: { value: teacherB.id } });

    expect(screen.getAllByText(/Korytarz Główny #2/).length).toBeGreaterThanOrEqual(2);
  });

  it('Wydruki (Podgląd Dyżurów i Modal Weryfikacji): uwzględnia slot #2 w hasAnyDutiesOnThisDay, pokazuje #2, weryfikację lekcji i podwójny dyżur per slot', () => {
    const { appState, schedData } = createMultiSlotFixture();

    render(<Wydruki appState={appState} schedData={schedData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dyżury' }));

    // Poniedziałek ma obsadzony WYŁĄCZNIE slot #2 ('m1|0|1|2') -> tabela poniedziałkowa musi się wyświetlić (nie puste)
    expect(screen.getAllByText('BK').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/#2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B\. Kowalski/).length).toBeGreaterThan(0);

    // Otwarcie modala interaktywnego podglądu dyżurów
    fireEvent.click(screen.getByRole('button', { name: /Podgląd dyżurów/i }));

    // W modalu powinna być weryfikacja lekcji dla slotu #2 (Matematyka przed przerwą, Fizyka po przerwie)
    expect(screen.getAllByText(/Matematyka/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fizyka/).length).toBeGreaterThan(0);

    // Osobna kolizja wykryta na slocie #2 we wtorek (BK na Korytarz Główny #2 i Dziedziniec #2)
    expect(
      screen.getByText(/Jednoczesny dyżur w rejonie: Dziedziniec \(#2\)/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Jednoczesny dyżur w rejonie: Korytarz Główny \(#2\)/)
    ).toBeTruthy();
  });

  it('MobilePlanViewer: nauczyciel ze slotu #2 widzi swój dyżur po 1. lekcji', () => {
    const { appState, schedData, teacherB } = createMultiSlotFixture();

    render(
      <MobilePlanViewer
        appState={appState}
        schedData={schedData}
        initialType="teacher"
        initialId={teacherB.id}
      />
    );

    expect(screen.getByText(/Dyżur po 1\. lekcji:/)).toBeTruthy();
    expect(screen.getByText(/Korytarz Główny \(Parter\)/)).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
  });

  it('KioskMode: odczytuje harmonogram z kluczami "|" i wyświetla wszystkich dyżurnych ze wszystkich slotów', () => {
    const { appState, schedData } = createMultiSlotFixture();
    // Dodajemy slot #1 na poniedziałek oraz błędny klucz z "_" do weryfikacji ignorowania
    appState.dyzury.harmonogram['m1|0|1'] = { teacherAbbr: 'AN', locked: false };
    appState.dyzury.harmonogram['m2_0_1'] = { teacherAbbr: 'ZLY_KLUCZ', locked: false };

    const { container } = render(
      <KioskMode appState={appState} schedData={schedData} onClose={() => {}} />
    );

    const dutiesHeader = screen.getByText('Dyżury Nauczycielskie');
    const dutiesPanel = dutiesHeader.closest('div')?.parentElement;
    expect(dutiesPanel).toBeTruthy();

    const scoped = within(dutiesPanel as HTMLElement);
    expect(scoped.getByText('AN')).toBeTruthy();
    expect(scoped.getByText('BK')).toBeTruthy();
    expect(scoped.getByText('#1')).toBeTruthy();
    expect(scoped.getByText('#2')).toBeTruthy();
    expect(container.textContent).not.toContain('ZLY_KLUCZ');
  });
});

describe('Wydruki (Plan Klas): dwie grupy w jednej godzinie, wspomagający i s. {sala} w Etapie 1 i Etapie 2', () => {
  function createTwoGroupsClassFixture() {
    const appState = getDemoAppState();
    const cls5A = { id: 'c_5a', name: '5A', color: '#3b82f6', groupIds: ['g1', 'g2'], year: 5 };
    const cls5B = { id: 'c_5b', name: '5B', color: '#10b981', groupIds: [], year: 5 };
    const tLead1 = { id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN', maxHours: 18 };
    const tLead2 = { id: 't2', first: 'Bartosz', last: 'Kowalski', abbr: 'BK', maxHours: 18 };
    const tSupport = { id: 't_ws', first: 'Wanda', last: 'Sokół', abbr: 'WS', maxHours: 20 };

    appState.classes = [cls5A, cls5B];
    appState.planLekcji.classes = [cls5A, cls5B];
    appState.teachers = [tLead1, tLead2, tSupport];
    appState.planLekcji.teachers = [tLead1, tLead2, tSupport];
    appState.planLekcji.hours = [
      { num: 1, start: '08:00', end: '08:45' },
    ];
    appState.hours = ['08:00'];
    appState.timeslots = appState.planLekcji.hours;
    appState.planLekcji.subjects = [
      { id: 's_ang', name: 'Język angielski', short: 'Ang', color: '#2563eb' },
      { id: 's_inf', name: 'Informatyka', short: 'Inf', color: '#059669' },
    ];
    appState.subjects = appState.planLekcji.subjects;
    appState.planLekcji.schoolGroups = [
      { id: 'g1', name: 'gr1', classId: 'c_5a' },
      { id: 'g2', name: 'gr2', classId: 'c_5a' },
    ];
    appState.planLekcji.rooms = [
      { id: 'r_101', name: '101' },
      { id: 'r_102', name: '102' },
    ];
    appState.floors = [
      {
        id: 'f0',
        name: 'Parter',
        color: '#e2e8f0',
        buildingIdx: 0,
        segments: [
          {
            id: 's0',
            name: 'Główny',
            rooms: [
              { id: 'r_101', num: '101' },
              { id: 'r_102', num: '102' },
            ],
          },
        ],
      },
    ];

    appState.planLekcji.assignments = [
      {
        id: 'a_g1',
        classId: 'c_5a',
        teacherId: 't1',
        subjectId: 's_ang',
        roomId: 'r_101',
        hoursPerWeek: 1,
        groupId: 'g1',
        linkedClassIds: ['c_5b'],
      },
      {
        id: 'a_g2',
        classId: 'c_5a',
        teacherId: 't2',
        subjectId: 's_inf',
        roomId: 'r_102',
        hoursPerWeek: 1,
        groupId: 'g2',
      },
    ];

    appState.planLekcji.lessons = {
      'c_5a|0|0|g1': { assignmentId: 'a_g1', locked: false, supportTeacherId: 't_ws' },
      'c_5a|0|0|g2': { assignmentId: 'a_g2', locked: false },
    };

    const schedData: SchedData = {
      [appState.yearKey]: {
        0: {
          '1': {
            'f0_s0_101': {
              classes: ['5A'],
              className: '5A',
              subject: 'Język angielski',
              teacherAbbr: 'AN',
              supportTeacherAbbr: 'WS',
              _bridgeMeta: { groupId: 'g1', classId: 'c_5a', subjectId: 's_ang' },
            },
            'f0_s0_102': {
              classes: [],
              className: '5A (gr2)',
              subject: 'Informatyka',
              teacherAbbr: 'BK',
            },
          },
        },
      },
    };

    return { appState, schedData };
  }

  it('Etap 1 i Etap 2 pokazują osobne grupy, nauczyciela wspomagającego i jednolitą salę s. {sala} w obu kopiach wydruku klas', () => {
    const { appState, schedData } = createTwoGroupsClassFixture();

    const { container } = render(<Wydruki appState={appState} schedData={schedData} />);

    // Domyślnie (gdy schedData nie jest puste) aktywny jest Etap 2 — zweryfikujmy Etap 2 najpierw
    expect(screen.getByText('[gr1] Język angielski')).toBeTruthy();
    expect(screen.getByText('[gr2] Informatyka')).toBeTruthy();
    expect(screen.getByText('+ WS (wspom.)')).toBeTruthy();
    expect(screen.getByText('s. 101')).toBeTruthy();
    expect(screen.getByText('s. 102')).toBeTruthy();
    expect(container.textContent).not.toContain('f. 101');
    expect(container.textContent).not.toContain('sala: 101');

    // Druga kopia wydruku (Generuj Tygodniowy Plan — overlay) w Etapie 2
    fireEvent.click(screen.getByRole('button', { name: /Generuj Tygodniowy Plan/i }));
    const overlayEtap2 = document.getElementById('weekly-print-overlay');
    expect(overlayEtap2).toBeTruthy();
    const scopedOverlay2 = within(overlayEtap2 as HTMLElement);
    expect(scopedOverlay2.getByText('[gr1] Język angielski')).toBeTruthy();
    expect(scopedOverlay2.getByText('[gr2] Informatyka')).toBeTruthy();
    expect(scopedOverlay2.getByText('+ WS (wspom.)')).toBeTruthy();
    expect(scopedOverlay2.getByText('s. 101')).toBeTruthy();
    expect(scopedOverlay2.getByText('s. 102')).toBeTruthy();
    expect(overlayEtap2?.textContent).not.toContain('sala: 101');
    expect(overlayEtap2?.textContent).not.toContain('f. 101');

    // Zamknięcie overlay i przełączenie na Etap 1
    fireEvent.click(screen.getByRole('button', { name: /Zamknij podgląd/i }));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'etap1' } });

    expect(screen.getByText('[gr1] Język angielski')).toBeTruthy();
    expect(screen.getByText('[gr2] Informatyka')).toBeTruthy();
    expect(screen.getByText('5AB (gr1)')).toBeTruthy();
    expect(screen.getByText('+ WS (wspom.)')).toBeTruthy();
    expect(screen.getByText('s. 101')).toBeTruthy();
    expect(screen.getByText('s. 102')).toBeTruthy();
    expect(container.textContent).not.toContain('f. 101');

    // Druga kopia wydruku w Etapie 1
    fireEvent.click(screen.getByRole('button', { name: /Generuj Tygodniowy Plan/i }));
    const overlayEtap1 = document.getElementById('weekly-print-overlay');
    expect(overlayEtap1).toBeTruthy();
    const scopedOverlay1 = within(overlayEtap1 as HTMLElement);
    expect(scopedOverlay1.getByText('[gr1] Język angielski')).toBeTruthy();
    expect(scopedOverlay1.getByText('[gr2] Informatyka')).toBeTruthy();
    expect(scopedOverlay1.getByText('5AB (gr1)')).toBeTruthy();
    expect(scopedOverlay1.getByText('+ WS (wspom.)')).toBeTruthy();
    expect(scopedOverlay1.getByText('s. 101')).toBeTruthy();
    expect(scopedOverlay1.getByText('s. 102')).toBeTruthy();
    expect(overlayEtap1?.textContent).not.toContain('sala: 101');
    expect(overlayEtap1?.textContent).not.toContain('f. 101');
  });
});

describe('Wydruki (Gabinety i Nauczyciele): lekcja łączona 5A gr1 + 5B gr2 i nauczyciel wspomagający', () => {
  function createLinkedRoomAndSupportFixture() {
    const appState = getDemoAppState();
    const cls5A = { id: 'c_5a', name: '5A', color: '#3b82f6', groupIds: ['g_5a_1'], year: 5 };
    const cls5B = { id: 'c_5b', name: '5B', color: '#10b981', groupIds: ['g_5b_2'], year: 5 };
    const tLead = { id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN', maxHours: 18 };
    const tSupport = { id: 't_ws', first: 'Wanda', last: 'Sokół', abbr: 'WS', maxHours: 20 };

    appState.classes = [cls5A, cls5B];
    appState.planLekcji.classes = [cls5A, cls5B];
    appState.teachers = [tLead, tSupport];
    appState.planLekcji.teachers = [tLead, tSupport];
    appState.planLekcji.hours = [{ num: 1, start: '08:00', end: '08:45' }];
    appState.hours = ['08:00'];
    appState.timeslots = appState.planLekcji.hours;
    appState.planLekcji.subjects = [
      { id: 's_ang', name: 'Język angielski', short: 'Ang', color: '#2563eb' },
    ];
    appState.subjects = appState.planLekcji.subjects;
    appState.planLekcji.schoolGroups = [
      { id: 'g_5a_1', name: 'gr1', classId: 'c_5a' },
      { id: 'g_5b_2', name: 'gr2', classId: 'c_5b' },
    ];
    appState.planLekcji.rooms = [{ id: 'r_101', name: '101' }];
    appState.floors = [
      {
        id: 'f0',
        name: 'Parter',
        color: '#e2e8f0',
        buildingIdx: 0,
        segments: [
          {
            id: 's0',
            name: 'Główny',
            rooms: [{ id: 'r_101', num: '101' }],
          },
        ],
      },
    ];

    appState.planLekcji.assignments = [
      {
        id: 'a_linked',
        classId: 'c_5a',
        teacherId: 't1',
        subjectId: 's_ang',
        roomId: 'r_101',
        hoursPerWeek: 1,
        groupId: 'g_5a_1',
        linkedClassIds: ['c_5b'],
        linkedGroupIds: ['g_5b_2'],
      },
    ];

    // Celowo dwa wpisy dla tego samego assignmentId w tym samym slocie — muszą zostać zdeduplikowane w wydruku sali
    appState.planLekcji.lessons = {
      'c_5a|0|0|g_5a_1': { assignmentId: 'a_linked', locked: false, supportTeacherId: 't_ws' },
      'c_5b|0|0|g_5b_2': { assignmentId: 'a_linked', locked: false, supportTeacherId: 't_ws' },
    };

    const schedData: SchedData = {
      [appState.yearKey]: {
        0: {
          '1': {
            'f0_s0_101': {
              classes: ['5A', '5B'],
              className: '5A (gr1) + 5B (gr2)',
              subject: 'Język angielski',
              teacherAbbr: 'AN',
              supportTeacherAbbr: 'WS',
              _bridgeMeta: {
                classId: 'c_5a',
                subjectId: 's_ang',
                teacherId: 't1',
                groupId: 'g_5a_1',
                linkedClassIds: ['c_5b'],
                linkedGroupIds: ['g_5b_2'],
              },
            },
          },
        },
      },
    };

    return { appState, schedData, tLead, tSupport };
  }

  it('Wydruk sali (Gabinety): pokazuje lekcję łączoną 5A (gr1) + 5B (gr2) zdeduplikowaną po assignmentId + slot oraz wspomagającego w Etapie 1 i Etapie 2', () => {
    const { appState, schedData } = createLinkedRoomAndSupportFixture();

    render(<Wydruki appState={appState} schedData={schedData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gabinety' }));

    // Etap 2 (domyślny gdy schedData istnieje)
    expect(screen.getByText('5A (gr1) + 5B (gr2)')).toBeTruthy();
    expect(screen.getByText('AN')).toBeTruthy();
    expect(screen.getByText('+ WS (wspom.)')).toBeTruthy();

    // Przełączenie na Etap 1
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'etap1' } });

    const combinedLabelsEtap1 = screen.getAllByText('5A (gr1) + 5B (gr2)');
    expect(combinedLabelsEtap1).toHaveLength(1);
    expect(screen.getAllByText('+ WS (wspom.)')).toHaveLength(1);
    expect(screen.getByText('AN')).toBeTruthy();

    // Podgląd płachty sal (drugi widok gabinetów) w Etapie 1
    fireEvent.click(screen.getByRole('button', { name: /Podgląd płachty sal/i }));
    const roomsOverlay = document.getElementById('rooms-print-overlay');
    expect(roomsOverlay).toBeTruthy();
    const scopedRoomsOverlay = within(roomsOverlay as HTMLElement);
    expect(scopedRoomsOverlay.getAllByText('5A (gr1) + 5B (gr2)')).toHaveLength(1);
    expect(scopedRoomsOverlay.getAllByText('+ WS (wspom.)')).toHaveLength(1);
  });

  it('Plan nauczyciela wspomagającego: wyświetla dopisek (wspomaganie) w obu miejscach renderowania dla Etapu 1 i Etapu 2, bez dopisku dla prowadzącego', () => {
    const { appState, schedData, tLead, tSupport } = createLinkedRoomAndSupportFixture();

    render(<Wydruki appState={appState} schedData={schedData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nauczyciele' }));

    // 1. Etap 2 — nauczyciel wspomagający WS
    const selectsEtap2 = screen.getAllByRole('combobox');
    fireEvent.change(selectsEtap2[1], { target: { value: tSupport.id } });
    expect(screen.getByText('(wspomaganie)')).toBeTruthy();

    // Druga kopia (Generuj Tygodniowy Plan) — Etap 2 wspomagający
    fireEvent.click(screen.getByRole('button', { name: /Generuj Tygodniowy Plan/i }));
    const overlaySupp2 = document.getElementById('weekly-print-overlay');
    expect(overlaySupp2).toBeTruthy();
    expect(within(overlaySupp2 as HTMLElement).getByText('(wspomaganie)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Zamknij podgląd/i }));

    // 2. Etap 2 — nauczyciel prowadzący AN NIE ma dopisku (wspomaganie)
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: tLead.id } });
    expect(screen.queryByText('(wspomaganie)')).toBeNull();

    // 3. Przełączenie na Etap 1 — nauczyciel wspomagający WS
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'etap1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: tSupport.id } });
    expect(screen.getAllByText('(wspomaganie)').length).toBeGreaterThanOrEqual(1);

    // Druga kopia (Generuj Tygodniowy Plan) — Etap 1 wspomagający
    fireEvent.click(screen.getByRole('button', { name: /Generuj Tygodniowy Plan/i }));
    const overlaySupp1 = document.getElementById('weekly-print-overlay');
    expect(overlaySupp1).toBeTruthy();
    expect(within(overlaySupp1 as HTMLElement).getAllByText('(wspomaganie)').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Notatki, opisy miejsc i brak nadpisywania note przez roomName', () => {
  it('Plan nauczyciela pokazuje d.desc i d.note obok miejsca dyżuru oraz getLessonDisplay pomija ", s. ..." przy braku sali', () => {
    const appState = getDemoAppState();
    const teacher = { id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN', maxHours: 18 };
    appState.teachers = [teacher];
    appState.planLekcji.teachers = [teacher];
    appState.planLekcji.hours = [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
    ];
    appState.hours = ['08:00', '08:55'];
    appState.timeslots = appState.planLekcji.hours;
    appState.dyzury = {
      miejsca: [
        {
          id: 'm1',
          name: 'Korytarz Główny',
          floor: 'Parter',
          desc: 'Wejście zachodnie',
          connectedRooms: ['101', '102'],
          teachersNeeded: 1,
        },
      ],
      przerwy: [
        { num: 1, name: 'Przerwa 1', start: '08:45', end: '08:55' },
      ],
      harmonogram: {
        'm1|0|1': {
          teacherAbbr: 'AN',
          locked: false,
          note: 'Otworzyć świetlicę',
        },
      },
      settings: {
        autoBalance: true,
        maxPerTeacher: 5,
        excludeTeachers: [],
        firstGradeAdaptationDuty: false,
      },
    };

    const firstFloorRoom = appState.floors?.[0]?.segments?.[0]?.rooms?.[0];
    const colKeyWithRoom = firstFloorRoom?.num
      ? `f0_s0_${firstFloorRoom.num}`
      : 'f0_s0_101';
    const expectedRoomNum = firstFloorRoom?.num || '101';

    const schedData: SchedData = {
      [appState.yearKey]: {
        0: {
          '1': {
            // Celowo nieistniejący colKey (brak sali) ORAZ ustawiona notatka cell.note
            'colNoRoom': {
              teacherAbbr: 'AN',
              classes: ['3A'],
              className: '3A',
              subject: 'Przyroda',
              note: 'Notatka komórki bez sali',
            },
          },
          '2': {
            [colKeyWithRoom]: {
              teacherAbbr: 'AN',
              classes: ['3B'],
              className: '3B',
              subject: 'Geografia',
              note: 'Dodatkowa notatka komórki',
            },
          },
        },
      },
    };

    render(<Wydruki appState={appState} schedData={schedData} />);

    // 1. Plan Nauczyciela: d.desc i d.note widoczne w obu miejscach renderowania
    fireEvent.click(screen.getByRole('button', { name: 'Nauczyciele' }));
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: teacher.id } });
    expect(screen.getByText('Wejście zachodnie')).toBeTruthy();
    expect(screen.getByText('Otworzyć świetlicę')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Generuj Tygodniowy Plan/i }));
    const overlay = document.getElementById('weekly-print-overlay');
    expect(overlay).toBeTruthy();
    expect(within(overlay as HTMLElement).getByText('Wejście zachodnie')).toBeTruthy();
    expect(within(overlay as HTMLElement).getByText('Otworzyć świetlicę')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Zamknij podgląd/i }));

    // 2. Dyżury -> nagłówek miejsca i modal weryfikacji lekcji (getLessonDisplay bez ", s. ..." przy braku sali)
    fireEvent.click(screen.getByRole('button', { name: 'Dyżury' }));
    expect(screen.getAllByText('Wejście zachodnie').length).toBeGreaterThan(0);
    expect(screen.getAllByText('sale: 101, 102').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Otworzyć świetlicę').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Podgląd dyżurów/i }));
    expect(screen.getByText(/\(kl\. 3A\)/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`\\(kl\\. 3B, s\\. ${expectedRoomNum}\\)`))).toBeTruthy();
    expect(document.body.textContent).not.toContain('s. Notatka komórki bez sali');
    expect(document.body.textContent).not.toContain('s. Dodatkowa notatka komórki');
  });

  it('Dyzury: w trybie prezentacji (presentationMode) pokazuje notatkę jako tekst zamiast ikonki 📝', () => {
    const appState = getDemoAppState();
    const teacher = { id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN', maxHours: 18 };
    appState.teachers = [teacher];
    appState.dyzury = {
      miejsca: [{ id: 'm1', name: 'Hol', floor: 'Parter', teachersNeeded: 1 }],
      przerwy: [{ num: 1, name: 'Przerwa 1', start: '08:45', end: '08:55' }],
      harmonogram: {
        'm1|0|1': { teacherAbbr: 'AN', locked: false, note: 'Sprawdzić drzwi boczne' },
      },
      settings: {
        autoBalance: true,
        maxPerTeacher: 5,
        excludeTeachers: [],
        firstGradeAdaptationDuty: false,
      },
    };

    const { container, rerender } = render(
      <Dyzury appState={appState} onChangeAppState={() => {}} schedData={{}} presentationMode={true} />
    );

    expect(screen.getByText('Sprawdzić drzwi boczne')).toBeTruthy();
    expect(container.textContent).not.toContain('📝');

    // W trybie zwykłym dostępny jest zarówno wariant tekstowy dla małych ekranów (md:hidden), jak i ikonka 📝 na desktopie (hidden md:inline)
    rerender(
      <Dyzury appState={appState} onChangeAppState={() => {}} schedData={{}} presentationMode={false} />
    );
    expect(container.textContent).toContain('📝');
    expect(screen.getByText('Sprawdzić drzwi boczne')).toBeTruthy();
  });
});



