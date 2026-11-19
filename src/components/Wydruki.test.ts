/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Modułu Wydruków i Płachty Dyrektorskiej (Wydruki Tests)
 * Opis: Weryfikacja formatowania dat, deduplikacji komórek oraz szablonów wydruków.
 */
import { describe, it, expect } from 'vitest';
import { generateDutiesHtml, getTeacherDutiesForBreakFromDyzury, renderRoomMatrixCellHtml } from './Wydruki';
import { getMobileTeacherDuty } from './MobilePlanViewer';
import { getActiveKioskDuties } from './KioskMode';
import { getDemoAppState } from '../utils';
import { AppState, PlanDyzuryState } from '../types';

describe('Wydruki XSS Defense & HTML Sanitization Tests', () => {
  it('generateDutiesHtml nie zawiera surowego <script> z danych użytkownika', () => {
    const mockState = {
      yearKey: 'y_2025_2026',
      yearLabel: '2025/2026',
      school: {
        name: `<script>alert("xss-school")</script>`,
        short: 'SP'
      },
      dyzury: {
        miejsca: [
          {
            id: 'm1',
            name: `<script>alert("xss-place-name")</script>`,
            floor: `<script>alert("xss-place-floor")</script>`
          }
        ],
        przerwy: [
          {
            num: 1,
            name: `<script>alert("xss-break-name")</script>`,
            start: '08:00',
            end: '08:15'
          }
        ],
        harmonogram: {
          'm1|0|1': {
            teacherAbbr: `<script>xss-abbr</script>`,
            locked: false,
            note: `<script>xss-note</script>`
          }
        },
        settings: {
          autoBalance: true,
          maxPerTeacher: 5,
          excludeTeachers: [],
          firstGradeAdaptationDuty: false
        }
      },
      teachers: [
        {
          id: 't1',
          abbr: `<script>xss-abbr</script>`,
          first: `<script>xss-first</script>`,
          last: `<script>xss-last</script>`
        }
      ],
      planLekcji: {
        classes: [],
        teachers: [],
        rooms: [],
        subjects: [],
        schoolGroups: [],
        assignments: [],
        lessons: {},
        specialStudents: [],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      }
    } as unknown as AppState;

    const html = generateDutiesHtml(mockState, {});

    // Verification: Data-derived script tags must NEVER appear in raw form
    expect(html).not.toContain('<script>alert("xss-place-name")</script>');
    expect(html).not.toContain('<script>alert("xss-place-floor")</script>');
    expect(html).not.toContain('<script>alert("xss-break-name")</script>');
    expect(html).not.toContain('<script>xss-abbr</script>');
    expect(html).not.toContain('<script>xss-first</script>');
    expect(html).not.toContain('<script>xss-last</script>');
    expect(html).not.toContain('<script>alert("xss-school")</script>');

    // Verification: They MUST be escaped as safe HTML entities
    expect(html).toContain('&lt;script&gt;alert(&quot;xss-place-name&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss-break-name&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;xss-abbr&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss-school&quot;)&lt;/script&gt;');
  });
});

describe('Wieloslotowe klucze harmonogramu dyżurów (teachersNeeded > 1)', () => {
  const buildMultiSlotDyzury = (): PlanDyzuryState => ({
    miejsca: [
      { id: 'm1', name: 'Korytarz Główny', floor: 'Parter', teachersNeeded: 2 }
    ],
    przerwy: [
      { num: 1, name: 'Przerwa 1', start: '08:45', end: '08:55' }
    ],
    harmonogram: {
      'm1|0|1': { teacherAbbr: 'AN', locked: false },
      'm1|0|1|2': { teacherAbbr: 'BK', locked: false, note: 'Wejście B' },
      'm1_0_1': { teacherAbbr: 'ZLY_SEP', locked: false }
    },
    settings: {
      autoBalance: true,
      maxPerTeacher: 5,
      excludeTeachers: [],
      firstGradeAdaptationDuty: false
    }
  });

  it('getTeacherDutiesForBreakFromDyzury wykrywa nauczyciela przypisanego do slotu #2', () => {
    const dyzury = buildMultiSlotDyzury();

    const slot2Duties = getTeacherDutiesForBreakFromDyzury(dyzury, 'BK', 0, 1);
    expect(slot2Duties).toHaveLength(1);
    expect(slot2Duties[0]).toMatchObject({
      placeName: 'Korytarz Główny',
      floor: 'Parter',
      note: 'Wejście B',
      slotIdx: 2,
      totalSlots: 2
    });

    // Pomija wpisy oznaczone jako isUnneeded
    dyzury.harmonogram['m1|0|1|2'] = { teacherAbbr: 'BK', locked: false, isUnneeded: true };
    expect(getTeacherDutiesForBreakFromDyzury(dyzury, 'BK', 0, 1)).toHaveLength(0);
  });

  it('getMobileTeacherDuty wykrywa dyżur ze slotu #2 w widoku mobilnym', () => {
    const dyzury = buildMultiSlotDyzury();

    const duty = getMobileTeacherDuty(dyzury, 'BK', 0, 1);
    expect(duty).toEqual({
      spotName: 'Korytarz Główny (Parter)',
      note: 'Wejście B',
      slotIdx: 2,
      totalSlots: 2
    });
  });

  it('getActiveKioskDuties używa separatora "|" i zwraca wszystkich dyżurnych ze wszystkich slotów', () => {
    const dyzury = buildMultiSlotDyzury();

    const active = getActiveKioskDuties(dyzury, 0, 1);
    expect(active).toEqual([
      {
        placeName: 'Korytarz Główny',
        teacherAbbr: 'AN',
        breakName: 'Po lekcji 1',
        slotIdx: 1,
        totalSlots: 2
      },
      {
        placeName: 'Korytarz Główny',
        teacherAbbr: 'BK',
        breakName: 'Po lekcji 1',
        slotIdx: 2,
        totalSlots: 2
      }
    ]);
    expect(active.some(d => d.teacherAbbr === 'ZLY_SEP')).toBe(false);
  });

  it('generateDutiesHtml renderuje oba sloty (#1 i #2) przy teachersNeeded=2', () => {
    const baseState = getDemoAppState();
    baseState.dyzury = buildMultiSlotDyzury();
    const html = generateDutiesHtml(baseState, {});

    expect(html).toContain('#1');
    expect(html).toContain('AN');
    expect(html).toContain('#2');
    expect(html).toContain('BK');
  });
});

describe('Szablon HTML matrycy sal (renderRoomMatrixCellHtml)', () => {
  it('renderuje lekcję łączoną, skrót wspomagającego pod skrótem prowadzącego oraz escapuje HTML', () => {
    const html = renderRoomMatrixCellHtml(
      [
        {
          subject: 'Język angielski',
          subjectShort: 'Ang',
          className: '5A (gr1) + 5B (gr2)',
          teacherAbbr: 'AN',
          supportAbbr: '<WS>',
          displayText: '5A (gr1) + 5B (gr2) Ang AN + <WS>',
        },
      ],
      {
        clsFontSize: '10px',
        grpFontSize: '8.5px',
        subjFontSize: '9px',
        tAbbrFontSize: '8.5px',
      }
    );

    expect(html).toContain('5A (gr1) + 5B (gr2)');
    expect(html).toContain('Ang');
    expect(html).toContain('AN');
    expect(html).toContain('+ &lt;WS&gt; (wspom.)');
    expect(html).not.toContain('<WS>');
    expect(html.indexOf('AN')).toBeLessThan(html.indexOf('+ &lt;WS&gt; (wspom.)'));
  });
});

describe('generateDutiesHtml: notatki dyżurnych oraz opis i połączone sale w nagłówku miejsca', () => {
  it('wyświetla entry.note pod skrótem dyżurnego (maks. 2 linie, bez white-space: nowrap, z escapeHtml) oraz place.desc i connectedRooms w nagłówku', () => {
    const baseState = getDemoAppState();
    baseState.teachers = [
      { id: 't1', first: 'Anna', last: 'Nowak', abbr: 'AN', maxHours: 18 },
    ];
    baseState.dyzury = {
      miejsca: [
        {
          id: 'm1',
          name: 'Korytarz Północny',
          floor: 'I piętro',
          desc: 'Przy schodach <głównych>',
          connectedRooms: ['101', '102', '103'],
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
          note: 'Uwaga <test> dyżurny przy wejściu',
        },
      },
      settings: {
        autoBalance: true,
        maxPerTeacher: 5,
        excludeTeachers: [],
        firstGradeAdaptationDuty: false,
      },
    };

    const html = generateDutiesHtml(baseState, {});

    // Nagłówek miejsca: desc + connectedRooms
    expect(html).toContain('Przy schodach &lt;głównych&gt;');
    expect(html).toContain('sale: 101, 102, 103');

    // Notatka pod skrótem dyżurnego z escapeHtml i clampingiem bez nowrap
    expect(html).toContain('Uwaga &lt;test&gt; dyżurny przy wejściu');
    expect(html).not.toContain('Uwaga <test> dyżurny przy wejściu');
    expect(html).toContain('-webkit-line-clamp: 2');
    expect(html).not.toMatch(/Uwaga &lt;test&gt;[^>]*white-space:\s*nowrap/);
  });
});


