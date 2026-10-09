/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Testy Sanityzacji i Ochrony XSS (Sanitizer Tests)
 * Opis: Weryfikacja usuwania znaków kontrolnych i ochrony szablonów HTML przed wstrzykiwaniem kodu.
 */
import { describe, it, expect } from 'vitest';
import { 
  sanitizeText, 
  escapeHtml, 
  sanitizeUrl, 
  sanitizePrintMetric, 
  sanitizeStudentNotes, 
  sanitizeObjectStrings 
} from './sanitizer';

describe('Sanitizer & escapeHtml unit tests', () => {
  describe('escapeHtml', () => {
    it('does not strip or corrupt "Data: 1"', () => {
      expect(escapeHtml('Data: 1')).toBe('Data: 1');
      expect(escapeHtml('Data: 12.05.2026')).toBe('Data: 12.05.2026');
      expect(escapeHtml('Metadata: test')).toBe('Metadata: test');
    });

    it('properly escapes comparison operators in "5 < 6 > 3"', () => {
      expect(escapeHtml('5 < 6 > 3')).toBe('5 &lt; 6 &gt; 3');
      expect(escapeHtml('<3 godz. a >5')).toBe('&lt;3 godz. a &gt;5');
    });

    it('escapes scripts so they display as text without executing', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes quotes in HTML attributes like " onmouseover="x', () => {
      expect(escapeHtml('" onmouseover="x')).toBe('&quot; onmouseover=&quot;x');
      expect(escapeHtml("' onfocus='alert(1)'")).toBe('&#39; onfocus=&#39;alert(1)&#39;');
    });

    it('preserves slashes without replacing with &#x2F; in "Sala 12/14"', () => {
      expect(escapeHtml('Sala 12/14')).toBe('Sala 12/14');
      expect(escapeHtml('2025/2026')).toBe('2025/2026');
    });

    it('preserves Polish characters untouched', () => {
      const polishText = 'Zażółć gęślą jaźń ĄĆĘŁŃÓŚŹŻ';
      expect(escapeHtml(polishText)).toBe(polishText);
    });

    it('escapes ampersands properly', () => {
      expect(escapeHtml('Biologia & Chemia')).toBe('Biologia &amp; Chemia');
    });

    it('handles null and undefined gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('preserves legitimate text with colons, pseudo-schemes and angle brackets', () => {
      expect(sanitizeText('Data: 12.05.2026')).toBe('Data: 12.05.2026');
      expect(sanitizeText('Metadata: x')).toBe('Metadata: x');
      expect(sanitizeText('<3 godz. a >5')).toBe('<3 godz. a >5');
      expect(sanitizeText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
      expect(sanitizeText('Sala 12/14')).toBe('Sala 12/14');
    });

    it('removes non-printable control characters', () => {
      expect(sanitizeText('Test\x00Control\x1FChars')).toBe('TestControlChars');
    });

    it('normalizes excessive horizontal whitespace', () => {
      expect(sanitizeText('Jan    Kowalski   -   klasa   1A')).toBe('Jan Kowalski - klasa 1A');
    });

    it('preserves Polish characters', () => {
      expect(sanitizeText('Szkoła Podstawowa nr 5 w Łodzi')).toBe('Szkoła Podstawowa nr 5 w Łodzi');
    });
  });

  describe('sanitizeUrl', () => {
    it('allows valid http, https, and mailto URLs', () => {
      expect(sanitizeUrl('https://sp1.edu.pl')).toBe('https://sp1.edu.pl');
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
      expect(sanitizeUrl('mailto:sekretariat@szkola.pl')).toBe('mailto:sekretariat@szkola.pl');
    });

    it('allows safe relative URLs', () => {
      expect(sanitizeUrl('/favicon.svg')).toBe('/favicon.svg');
      expect(sanitizeUrl('./assets/logo.png')).toBe('./assets/logo.png');
      expect(sanitizeUrl('../icon.png')).toBe('../icon.png');
      expect(sanitizeUrl('images/photo.jpg')).toBe('images/photo.jpg');
      expect(sanitizeUrl('?tab=wydruki')).toBe('?tab=wydruki');
      expect(sanitizeUrl('#section1')).toBe('#section1');
    });

    it('blocks dangerous pseudo-protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('javascript :alert(1)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('handles null and undefined', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
    });
  });

  describe('sanitizeStudentNotes & sanitizePrintMetric', () => {
    it('preserves full note text containing "Data:" and "<3"', () => {
      const complexNote = 'Data: 15.09.2026. Zalecenia: praca w małej grupie (<3 uczniów), czas zadania >15 min. Sala 12/14.';
      expect(sanitizeStudentNotes(complexNote)).toBe(complexNote);
    });

    it('bounds print metric safely without stripping words', () => {
      expect(sanitizePrintMetric('SP nr 1 im. M. Kopernika (Data: 2026/2027)')).toBe('SP nr 1 im. M. Kopernika (Data: 2026/2027)');
    });
  });

  describe('sanitizeObjectStrings', () => {
    it('does not alter semantic values like hashes, base64 or identifiers', () => {
      const data = {
        id: 'cls-1a-2026',
        name: 'Klasa 1/A',
        salt: 'u+zXb3R19N==',
        iv: 'A7x/91Lq==',
        ciphertext: 'K5y4/==Data:secret==',
        hash: 'a1b2c3d4e5f6',
      };
      const cleaned = sanitizeObjectStrings(data);
      expect(cleaned).toEqual(data);
    });

    it('drops prototype pollution keys', () => {
      const maliciousPayload = JSON.parse('{"name":"Test","__proto__":{"admin":true},"constructor":{"polluted":true}}');
      const sanitized = sanitizeObjectStrings(maliciousPayload);
      expect(sanitized.name).toBe('Test');
      expect((sanitized as any).__proto__.admin).toBeUndefined();
      expect((sanitized as any).constructor.polluted).toBeUndefined();
    });
  });
});
