import { describe, it, expect } from 'vitest';
import { generateDutiesHtml } from './Wydruki';
import { AppState } from '../types';

describe('Wydruki XSS Defense & HTML Sanitization Tests', () => {
  it('generateDutiesHtml nie zawiera surowego <script> z danych użytkownika', () => {
    const maliciousPayload = '<script>alert("xss_exploit")</script>';

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
