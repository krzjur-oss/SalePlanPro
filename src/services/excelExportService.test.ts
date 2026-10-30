import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { 
  createClassesSheet, 
  createTeachersSheet, 
  createRoomsSheet, 
  createDutiesSheet, 
  createWorkloadSheet,
  createSingleClassSheet,
  createSingleTeacherSheet
} from './excelExportService';
import { AppState, SchedData } from '../types';

const mockAppState: AppState = {
  schoolName: 'Liceum Ogólnokształcące nr 1',
  yearLabel: '2026/2027',
  yearKey: '2026_2027',
  buildings: [{ name: 'Główny', floors: [] }],
  floors: [],
  subjects: [
    { id: 's1', name: 'Język polski', short: 'POL', color: '#ef4444' },
    { id: 's2', name: 'Matematyka', short: 'MAT', color: '#3b82f6' }
  ],
  planLekcji: {
    classes: [
      { id: 'c1', name: '1A', desc: 'Mat-Fiz' },
      { id: 'c2', name: '1B', desc: 'Humanistyczna' }
    ],
    teachers: [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK', pensum: 18 },
      { id: 't2', first: 'Anna', last: 'Nowak', abbr: 'AN', pensum: 18 }
    ],
    subjects: [
      { id: 's1', name: 'Język polski', short: 'POL', color: '#ef4444' },
      { id: 's2', name: 'Matematyka', short: 'MAT', color: '#3b82f6' }
    ],
    rooms: [
      { id: 'r1', name: '101', desc: 'Sala polonistyczna', capacity: 30 },
      { id: 'r2', name: '102', desc: 'Pracownia matematyczna', capacity: 28 }
    ],
    hours: [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' }
    ],
    assignments: [
      { id: 'asg1', subjectId: 's2', teacherId: 't1', roomId: 'r2', count: 1 },
      { id: 'asg2', subjectId: 's1', teacherId: 't2', roomId: 'r1', count: 1 }
    ],
    lessons: {
      'c1|0|0': { assignmentId: 'asg1' }, // Poniedziałek, lekcja 1 -> Matematyka JK s. 102
      'c2|0|1': { assignmentId: 'asg2' }  // Poniedziałek, lekcja 2 -> Polski AN s. 101
    }
  },
  dyzury: {
    miejsca: [
      { id: 'm1', name: 'Korytarz Parter', floor: 'Parter' }
    ],
    przerwy: [
      { num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' }
    ],
    harmonogram: {
      'm1|0|1': {
        teacherAbbr: 'JK',
        locked: false
      },
      '0_0': {
        teacherAbbr: 'JK',
        teacherId: 't1',
        teacherName: 'Jan Kowalski',
        spotName: 'Korytarz Parter'
      }
    }
  }
} as unknown as AppState;

const mockSchedData: SchedData = {};

describe('excelExportService', () => {
  it('tworzy poprawny arkusz planu klas', () => {
    const ws = createClassesSheet(mockAppState, mockSchedData);
    expect(ws).toBeDefined();
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    expect(json.length).toBeGreaterThan(4);
    // Nagłówek powinien zawierać nazwy klas
    const headerRow = json.find(row => Array.isArray(row) && row.includes('Klasa 1A'));
    expect(headerRow).toBeDefined();
  });

  it('tworzy poprawny arkusz nauczycieli z informacją o dyżurze', () => {
    const ws = createTeachersSheet(mockAppState, mockSchedData);
    expect(ws).toBeDefined();
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    expect(json.length).toBeGreaterThan(3);
    const hasKowalski = json.some(row => Array.isArray(row) && row.some(cell => String(cell).includes('Kowalski')));
    expect(hasKowalski).toBe(true);
  });

  it('tworzy poprawny arkusz sal lekcyjnych z wskaźnikiem obłożenia', () => {
    const ws = createRoomsSheet(mockAppState, mockSchedData);
    expect(ws).toBeDefined();
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    expect(json.length).toBeGreaterThan(3);
    const hasRoom101 = json.some(row => Array.isArray(row) && row.some(cell => String(cell).includes('101')));
    expect(hasRoom101).toBe(true);
  });

  it('tworzy poprawny arkusz dyżurów nauczycielskich', () => {
    const ws = createDutiesSheet(mockAppState);
    expect(ws).toBeDefined();
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    expect(json.length).toBeGreaterThan(3);
    const hasSpot = json.some(row => Array.isArray(row) && row.some(cell => String(cell).includes('Korytarz Parter')));
    expect(hasSpot).toBe(true);
  });

  it('tworzy poprawny arkusz bilansu pensum nauczycieli', () => {
    const ws = createWorkloadSheet(mockAppState);
    expect(ws).toBeDefined();
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    expect(json.length).toBeGreaterThan(4);
    const hasWorkloadHeader = json.some(row => Array.isArray(row) && row.some(c => String(c).includes('Pensum')));
    expect(hasWorkloadHeader).toBe(true);
  });

  it('tworzy dedykowany arkusz dla pojedynczej klasy i nauczyciela', () => {
    const wsClass = createSingleClassSheet(mockAppState, mockSchedData, mockAppState.planLekcji.classes[0]);
    expect(wsClass).toBeDefined();
    const wsTeacher = createSingleTeacherSheet(mockAppState, mockSchedData, mockAppState.planLekcji.teachers[0]);
    expect(wsTeacher).toBeDefined();
  });
});
