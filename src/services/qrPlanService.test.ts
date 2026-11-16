import { describe, it, expect } from 'vitest';
import { 
  buildMobilePlanUrl, 
  generateQrDataUrl, 
  generateClassesQrConfigs,
  generateTeachersQrConfigs,
  generateRoomsQrConfigs,
  generateQrPrintHtml
} from './qrPlanService';
import { AppState } from '../types';

const mockAppState: AppState = {
  schoolName: 'Liceum Ogólnokształcące nr 1',
  yearLabel: '2026/2027',
  yearKey: '2026_2027',
  buildings: [],
  floors: [],
  subjects: [],
  planLekcji: {
    classes: [
      { id: 'c1', name: '1A', desc: 'Mat-Fiz' }
    ],
    teachers: [
      { id: 't1', first: 'Jan', last: 'Kowalski', abbr: 'JK' }
    ],
    subjects: [],
    rooms: [
      { id: 'r1', name: '101', desc: 'Gabinet Polski' }
    ],
    hours: [],
    assignments: [],
    lessons: {}
  }
} as unknown as AppState;

describe('qrPlanService', () => {
  it('buduje poprawny URL do widoku mobilnego planu', () => {
    const url = buildMobilePlanUrl('class', 'c1', '2026_2027');
    expect(url).toContain('view=mobile_plan');
    expect(url).toContain('type=class');
    expect(url).toContain('id=c1');
    expect(url).toContain('yk=2026_2027');
  });

  it('generuje poprawny obraz kodu QR w formacie base64 DataURL', async () => {
    const qrDataUrl = await generateQrDataUrl('https://saleplan.pro/?view=mobile_plan&type=class&id=c1');
    expect(qrDataUrl).toBeDefined();
    expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('generuje konfiguracje QR dla klas, nauczycieli i sal', async () => {
    const classConfigs = await generateClassesQrConfigs(mockAppState);
    expect(classConfigs.length).toBe(1);
    expect(classConfigs[0].title).toBe('Klasa 1A');
    expect(classConfigs[0].qrDataUrl).toBeDefined();

    const teacherConfigs = await generateTeachersQrConfigs(mockAppState);
    expect(teacherConfigs.length).toBe(1);
    expect(teacherConfigs[0].title).toBe('Kowalski Jan');
    expect(teacherConfigs[0].qrDataUrl).toBeDefined();

    const roomConfigs = await generateRoomsQrConfigs(mockAppState);
    expect(roomConfigs.length).toBe(1);
    expect(roomConfigs[0].title).toContain('101');
    expect(roomConfigs[0].qrDataUrl).toBeDefined();
  });

  it('tworzy poprawny kod HTML szablonu druku kart A4', async () => {
    const classConfigs = await generateClassesQrConfigs(mockAppState);
    const htmlCards6 = generateQrPrintHtml(classConfigs, 'cards_6', mockAppState);
    expect(htmlCards6).toContain('DRUKOWANIE KART I KODÓW QR (A4)');
    expect(htmlCards6).toContain('Klasa 1A');

    const htmlDoor = generateQrPrintHtml(classConfigs, 'stickers_door', mockAppState);
    expect(htmlDoor).toContain('door-sticker');
  });

  it('escapuje znaczniki HTML w polach tekstowych i odrzuca niebezpieczne qrDataUrl', () => {
    const xssTitle = '<img src=x onerror=alert(1)>';
    const xssSchool = '<script>alert("xss")</script>';
    const xssAppState = {
      ...mockAppState,
      school: { name: xssSchool },
      yearLabel: '2026/<svg onload=alert(2)>'
    } as unknown as AppState;

    const items = [
      {
        id: 'x1',
        type: 'class' as const,
        title: xssTitle,
        subtitle: '<b>Opis</b>',
        tag: '" onclick="alert(3)',
        targetUrl: 'https://saleplan.pro/?q=<script>',
        qrDataUrl: 'javascript:alert(1)'
      }
    ];

    for (const tpl of ['cards_6', 'cards_12', 'stickers_door'] as const) {
      const html = generateQrPrintHtml(items, tpl, xssAppState);
      expect(html).not.toContain(xssTitle);
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('javascript:alert(1)');
      expect(html).not.toContain('<img ');
    }

    const validItems = [
      {
        ...items[0],
        qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    ];
    const htmlWithValidQr = generateQrPrintHtml(validItems, 'cards_6', xssAppState);
    expect(htmlWithValidQr).toContain('<img src="data:image/png;base64,');
    expect(htmlWithValidQr).toContain('alt="&lt;img src=x onerror=alert(1)&gt;"');
  });
});
