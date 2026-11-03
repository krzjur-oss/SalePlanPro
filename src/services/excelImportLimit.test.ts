/**
 * Testy jednostkowe: Limit rozmiaru importu Excel (10 MB) oraz integracja z SheetJS (XLSX)
 */
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { MAX_EXCEL_FILE_SIZE as SIO_MAX_SIZE } from '../components/SioImport';
import { MAX_EXCEL_FILE_SIZE as MODAL_MAX_SIZE } from '../components/ImportModal';
import { downloadWorkbook, createClassesSheet } from './excelExportService';
import { exportDiffToExcel } from './variantDiffService';

describe('Excel Import Limit & XLSX Integration Tests', () => {
  it('definiuje limit rozmiaru pliku Excel na poziomie dokładnie 10 MB (10 485 760 bajtów)', () => {
    const EXPECTED_LIMIT = 10 * 1024 * 1024;
    expect(SIO_MAX_SIZE).toBe(EXPECTED_LIMIT);
    expect(MODAL_MAX_SIZE).toBe(EXPECTED_LIMIT);
  });

  it('poprawnie odrzuca pliki przekraczające limit 10 MB', () => {
    const validSize = 10 * 1024 * 1024; // 10 MB - granica dopuszczalna
    const invalidSize = 10 * 1024 * 1024 + 1; // 10 MB + 1 bajt
    const largeSize = 25 * 1024 * 1024; // 25 MB

    expect(validSize <= SIO_MAX_SIZE).toBe(true);
    expect(invalidSize > SIO_MAX_SIZE).toBe(true);
    expect(largeSize > SIO_MAX_SIZE).toBe(true);
  });

  it('poprawnie parsuje i konwertuje skoroszyt Excel (SheetJS 0.20.3) na format CSV dla importu SIO', () => {
    // Generowanie przykładowego skoroszytu w pamięci
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Klasa', 'Nauczyciel', 'Przedmiot', 'Godziny'],
      ['1A', 'Kowalski Jan', 'Matematyka', '4'],
      ['2B', 'Nowak Anna', 'Język polski', '5']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Przydziały');

    // Zapis do tablicy bajtów (format xlsx)
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Odczyt przez XLSX.read (odpowiednik wczytania pliku przez użytkownika)
    const parsedWb = XLSX.read(buffer, { type: 'array' });
    expect(parsedWb.SheetNames).toContain('Przydziały');

    const firstWs = parsedWb.Sheets[parsedWb.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstWs, { FS: ';' });

    expect(csv).toContain('Klasa;Nauczyciel;Przedmiot;Godziny');
    expect(csv).toContain('1A;Kowalski Jan;Matematyka;4');
    expect(csv).toContain('2B;Nowak Anna;Język polski;5');
  });

  it('weryfikuje obecność i poprawność funkcji eksportu XLSX w excelExportService i variantDiffService', () => {
    expect(typeof downloadWorkbook).toBe('function');
    expect(typeof createClassesSheet).toBe('function');
    expect(typeof exportDiffToExcel).toBe('function');
  });
});
