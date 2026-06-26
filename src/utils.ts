import { AppState, SchedData, SchedCell, Floor, Class, Teacher, Subject, ClassRoom, Assignment } from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function esc(str: any): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function hexRgba(hex: string, a: number): string {
  let cleanHex = hex || '#94a3b8';
  if (cleanHex.length === 4) {
    cleanHex = '#' + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] + cleanHex[3] + cleanHex[3];
  }
  if (cleanHex.length < 7) return `rgba(148,163,184,${a})`;
  const r = parseInt(cleanHex.slice(1, 3), 16);
  const g = parseInt(cleanHex.slice(3, 5), 16);
  const b = parseInt(cleanHex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function roomLabelShort(fi: number, si: number, num: string | number): string {
  const segLetter = String.fromCharCode(65 + si); // A, B, C...
  return `${fi}${segLetter}${num}`;
}

export function colKey(col: { floorIdx: number; segIdx: number; room: { num: string; sub?: string }; roomIdx: number }): string {
  const n = (col.room.num || '').trim();
  return n
    ? `f${col.floorIdx}_s${col.segIdx}_${n}`
    : `f${col.floorIdx}_s${col.segIdx}_r${col.roomIdx}`;
}

export function flattenColumns(floors: Floor[]) {
  const cols: { floorIdx: number; segIdx: number; roomIdx: number; floor: any; seg: any; room: any }[] = [];
  floors.forEach((floor, fi) =>
    floor.segments.forEach((seg, si) =>
      seg.rooms.forEach((room, ri) =>
        cols.push({ floorIdx: fi, segIdx: si, roomIdx: ri, floor, seg, room })
      )
    )
  );
  return cols;
}

export function mergeClassNames(classes: string[]): string[] {
  if (!classes || classes.length <= 1) return classes || [];

  const parsed = classes.map(cls => {
    const m = String(cls).trim().match(/^(\d+)([A-Za-z])(?:\s+(.+))?$/);
    if (m) return { level: m[1], letter: m[2].toUpperCase(), group: (m[3] || '').trim(), orig: cls };
    return { level: null, letter: null, group: null, orig: cls };
  });

  const buckets = new Map<string, { level: string; group: string; letters: string[] }>();
  const unparsed: string[] = [];

  for (const p of parsed) {
    if (p.level === null) {
      unparsed.push(p.orig);
      continue;
    }
    const key = p.level + '|' + p.group;
    if (!buckets.has(key)) {
      buckets.set(key, { level: p.level, group: p.group, letters: [] });
    }
    const b = buckets.get(key)!;
    if (!b.letters.includes(p.letter)) b.letters.push(p.letter);
  }

  const merged: string[] = [];
  for (const [, b] of buckets) {
    b.letters.sort();
    merged.push(b.level + b.letters.join('') + (b.group ? ' ' + b.group : ''));
  }

  return [...merged, ...unparsed];
}

export function subjectAbbr(subject: string): string {
  if (!subject) return '';
  const s = subject.trim();
  const lower = s.toLowerCase().replace(/\s+/g, ' ');

  // Wyjątki podane przez użytkownika
  if (lower === 'język polski' || lower === 'jezyk polski') return 'Pol';
  if (lower === 'język angielski' || lower === 'jezyk angielski') return 'Ang';

  const CONJUNCTIONS = new Set([
    'i', 'w', 'z', 'na', 'o', 'do', 'za', 'po', 'od', 'u', 'we', 'ze', 'dla', 'lub', 'lecz', 'pod', 'nad', 'przed', 'a', 'o', 'z', 'w'
  ]);

  const words = s.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '';

  // Jeżeli nazwa jest jednoczłonowa (jednowyrazowa)
  if (words.length === 1) {
    const singleWord = words[0];
    if (singleWord.length <= 3) {
      return singleWord.toUpperCase();
    }
    return singleWord.charAt(0).toUpperCase() + singleWord.slice(1, 3).toLowerCase();
  }

  // Jeżeli nazwa przedmiotu jest wieloczłonowa
  const mainWords = words.filter(w => !CONJUNCTIONS.has(w.toLowerCase()));
  
  if (mainWords.length === 0) {
    // Jeśli zostały tylko spójniki, weźmy pierwszy słowo i skróćmy do 3 znaków
    const firstWord = words[0];
    return firstWord.slice(0, 3).toUpperCase();
  }

  if (mainWords.length === 1) {
    const singleMain = mainWords[0];
    if (singleMain.length <= 3) {
      return singleMain.toUpperCase();
    }
    return singleMain.charAt(0).toUpperCase() + singleMain.slice(1, 3).toLowerCase();
  }

  // Pierwsze litery obydwu/wszystkich członów głównych
  return mainWords.map(w => w.charAt(0).toUpperCase()).join('');
}

export function genAbbr(first: string, last: string): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (!f && !l) return '';

  const fLetter = f ? f[0].toUpperCase() : '';
  const parts = l.split(/[-\s]+/).filter(Boolean);
  let lPart = '';
  if (parts.length >= 2) {
    // Nazwisko dwuczłonowe: dwie pierwsze litery każdego członu
    const p1 = parts[0].slice(0, 2);
    const p2 = parts[1].slice(0, 2);
    lPart = p1 + p2;
  } else if (parts.length === 1) {
    // Nazwisko jednoczłonowe: trzy pierwsze litery nazwiska
    lPart = parts[0].slice(0, 3);
  }
  return (fLetter + lPart).toUpperCase();
}

export function ensureUniqueAbbr(abbr: string, existing: string[]): string {
  if (!existing.includes(abbr)) return abbr;
  let i = 2;
  while (existing.includes(abbr + i)) i++;
  return abbr + i;
}

export function autoClassAbbr(className: string, groupName: string): string {
  const cls = (className || '').trim().toUpperCase();
  const grp = (groupName || '').trim().toLowerCase();

  if (!grp || grp === 'cała klasa' || grp === 'cala klasa') {
    return cls;
  }

  const CLASS_ABBR_IGNORE = new Set(['i', 'w', 'z', 'na', 'dla', 'ze', 'lub', 'a', 'of', 'and', 'the', 'or', 'im']);
  const words = grp.split(/\s+/).filter(w => w.length > 0);
  const meaningful = words.filter(w => !CLASS_ABBR_IGNORE.has(w.toLowerCase()));

  let grpAbbr = '';
  if (meaningful.length === 0) {
    grpAbbr = words[0].slice(0, 3);
  } else if (meaningful.length === 1) {
    const w = meaningful[0];
    grpAbbr = w[0].toUpperCase() + w.slice(1, 3).toLowerCase();
  } else {
    grpAbbr = meaningful
      .map(w => w[0].toUpperCase() + (
        w.length > 1 && w[1] === w[1].toUpperCase() && w[1] !== w[1].toLowerCase()
          ? w[1] : ''
      ))
      .join('');
    if (grpAbbr.length < 2) grpAbbr = meaningful[0].slice(0, 3);
  }

  return (cls + ' ' + grpAbbr.toUpperCase()).slice(0, 12);
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function getStorageSize(): number {
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += (localStorage.getItem(key) || '').length * 2;
    }
  }
  return total;
}

// ================================================================
//  DEMO DATABASE POPULATOR
// ================================================================
export function getDemoAppState(): AppState {
  const baseClasses: Class[] = [
    { id: 'c1', name: '1A', color: '#2563eb', groupIds: [] },
    { id: 'c2', name: '1B', color: '#16a34a', groupIds: [] },
    { id: 'c3', name: '2A', color: '#d97706', groupIds: [] },
    { id: 'c4', name: '2B', color: '#dc2626', groupIds: [] },
    { id: 'c5', name: '3A', color: '#7c3aed', groupIds: [] },
  ];

  const teachers: Teacher[] = [
    { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JKOW', maxHours: 18, color: '#3b82f6' },
    { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'ANOW', maxHours: 18, color: '#10b981' },
    { id: 't3', first: 'Maria', last: 'Zielińska', abbr: 'MZIE', maxHours: 20, color: '#f59e0b' },
    { id: 't4', first: 'Piotr', last: 'Wiśniewski', abbr: 'PWIS', maxHours: 18, color: '#ef4444' },
    { id: 't5', first: 'Krzysztof', last: 'Wójcik', abbr: 'KWOJ', maxHours: 18, color: '#8b5cf6' },
  ];

  const subjects: Subject[] = [
    { id: 's1', name: 'Matematyka', short: 'MAT', color: '#2563eb' },
    { id: 's2', name: 'Język polski', short: 'POL', color: '#16a34a' },
    { id: 's3', name: 'Język angielski', short: 'ANG', color: '#d97706' },
    { id: 's4', name: 'Wychowanie fizyczne', short: 'WF', color: '#dc2626' },
    { id: 's5', name: 'Informatyka', short: 'INF', color: '#7c3aed' },
  ];

  const rooms: ClassRoom[] = [
    { id: 'r1', name: '101', desc: 'Sala ogólna' },
    { id: 'r2', name: '102', desc: 'Sala językowa' },
    { id: 'r3', name: '201', desc: 'Pracownia komputerowa' },
    { id: 'r4', name: 'Hala', desc: 'Sala gimnastyczna' },
  ];

  const assignments: Assignment[] = [
    { id: 'a1', classId: 'c1', teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 4, groupId: null },
    { id: 'a2', classId: 'c1', teacherId: 't2', subjectId: 's2', roomId: 'r1', hoursPerWeek: 4, groupId: null },
    { id: 'a3', classId: 'c2', teacherId: 't1', subjectId: 's1', roomId: 'r1', hoursPerWeek: 4, groupId: null },
    { id: 'a4', classId: 'c2', teacherId: 't3', subjectId: 's3', roomId: 'r2', hoursPerWeek: 3, groupId: null },
    { id: 'a5', classId: 'c3', teacherId: 't4', subjectId: 's2', roomId: 'r3', hoursPerWeek: 4, groupId: null },
    { id: 'a6', classId: 'c3', teacherId: 't2', subjectId: 's1', roomId: 'r1', hoursPerWeek: 4, groupId: null },
    { id: 'a7', classId: 'c4', teacherId: 't5', subjectId: 's4', roomId: 'r4', hoursPerWeek: 3, groupId: null },
  ];

  const lessons: { [key: string]: { assignmentId: string; locked: boolean } } = {
    'c1|0|1': { assignmentId: 'a1', locked: false }, // Mon 1st hour MAT -> 1A
    'c1|0|2': { assignmentId: 'a1', locked: false }, // Mon 2nd hour MAT -> 1A
    'c1|1|1': { assignmentId: 'a2', locked: false }, // Tue 1st hour POL -> 1A
    'c2|0|1': { assignmentId: 'a3', locked: false }, // Mon 1st hour MAT -> 1B (Conflict! Same teacher t1 as 1A)
    'c2|0|3': { assignmentId: 'a4', locked: false }, // Mon 3rd hour ANG -> 1B
    'c3|1|1': { assignmentId: 'a5', locked: false }, // Tue 1st hour POL -> 2A
    'c3|1|2': { assignmentId: 'a6', locked: false }, // Tue 2nd hour MAT -> 2A
    'c4|0|2': { assignmentId: 'a7', locked: false }, // Mon 2nd hour WF -> 2B
  };

  const defaultHours = [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
  ];

  const buildings = [
    { id: 'b1', name: 'Budynek Główny', address: 'ul. Szkolna 1', multi: false },
    { id: 'b2', name: 'Hala Sportowa', address: 'ul. Szkolna 1', multi: true },
  ];

  const floors = [
    {
      id: 'f1',
      name: 'Parter',
      color: '#3b82f6',
      buildingIdx: 0,
      segments: [
        {
          id: 's1',
          name: 'Skrzydło A',
          rooms: [
            { id: 'rm1', num: '101', sub: 'Matematyczna' },
            { id: 'rm2', num: '102', sub: 'Polonistyczna' },
          ],
        },
      ],
    },
    {
      id: 'f2',
      name: 'I Piętro',
      color: '#10b981',
      buildingIdx: 0,
      segments: [
        {
          id: 's2',
          name: 'Skrzydło B',
          rooms: [
            { id: 'rm3', num: '201', sub: 'Komputerowa' },
          ],
        },
      ],
    },
    {
      id: 'f3',
      name: 'Parter',
      color: '#ef4444',
      buildingIdx: 1,
      segments: [
        {
          id: 's3',
          name: 'Główny',
          rooms: [
            { id: 'rm4', num: 'Hala', sub: 'Główna' },
          ],
        },
      ],
    },
  ];

  const miejscaDyzuru = [
    { id: 'm1', name: 'Korytarz Parter', desc: 'Przy salach 101-102', floor: 'Parter' },
    { id: 'm2', name: 'Korytarz I Piętro', desc: 'Przy pracowni komputerowej', floor: 'I Piętro' },
    { id: 'm3', name: 'Wejście Główne', desc: 'Szatnia i drzwi wejściowe', floor: 'Parter' },
  ];

  const przerwy = [
    { num: 1, start: '08:45', end: '08:55', name: 'Przerwa po 1. lekcji' },
    { num: 2, start: '09:40', end: '09:50', name: 'Przerwa po 2. lekcji' },
    { num: 3, start: '10:35', end: '10:55', name: 'Długa przerwa obiad' },
    { num: 4, start: '11:40', end: '11:50', name: 'Przerwa po 4. lekcji' },
  ];

  return {
    yearKey: 'y_2025_2026',
    yearLabel: '2025/2026',
    hours: ['1', '2', '3', '4', '5'],
    timeslots: defaultHours,
    school: {
      name: 'Szkoła Podstawowa nr 15 w Warszawie',
      short: 'SP 15',
      phone: '+48 22 123 45 67',
      web: 'sekretariat@sp15.edu.pl',
    },
    buildings,
    floors,
    classes: baseClasses,
    teachers: teachers,
    subjects: subjects,
    homerooms: {},
    planLekcji: {
      meta: { schoolName: 'Szkoła Podstawowa nr 15 w Warszawie', year: '2025/2026' },
      hours: defaultHours,
      classes: baseClasses,
      teachers: teachers,
      rooms,
      subjects,
      schoolGroups: [],
      assignments,
      lessons,
      specialStudents: [],
      specialAssignments: [],
      specialLessons: {},
      specialAbsences: {},
    },
    dyzury: {
      miejsca: miejscaDyzuru,
      przerwy: przerwy,
      harmonogram: {},
      settings: {
        autoBalance: true,
        maxPerTeacher: 2,
        excludeTeachers: [],
      },
    },
    generatorSettings: {
      maxGapsPerTeacher: 2,
      obeyAvailability: true,
      avoidExtremes: true,
      avoidExtremesSubjectIds: [],
      noStudentGaps: true,
      allowDoubleBlocks: true,
      includeSpecialNI: true,
      limitComputerLabs: true,
      customComputerLabsCount: 1,
      genPriorityHomerooms: true,
      genPriorityTeachers: true,
      genExcludeWF: true,
      genAutoPlaceWF: true,
      genClearExisting: true,
    },
  };
}

export function getDemoSchedData(): SchedData {
  return {
    'y_2025_2026': {
      0: { // Monday
        '1': {
          'f0_s0_101': { teacherAbbr: 'JKOW', classes: ['1A'], className: '1A', subject: 'Matematyka', note: '(sugestia: 101)' },
          'f0_s0_102': { teacherAbbr: 'JKOW', classes: ['1B'], className: '1B', subject: 'Matematyka', note: 'Kolizja!' }, // Same teacher
        },
        '2': {
          'f0_s0_101': { teacherAbbr: 'JKOW', classes: ['1A'], className: '1A', subject: 'Matematyka', note: '(sugestia: 101)' },
        },
      },
      1: { // Tuesday
        '1': {
          'f0_s0_101': { teacherAbbr: 'mzIE', classes: ['2A'], className: '2A', subject: 'Polski', note: '' },
        },
      },
    },
  };
}
