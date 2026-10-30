/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Generatora Mobilnych Kodów QR (qrPlanService.ts)
 * Opis: Generowanie kodów QR dla klas, nauczycieli i sal lekcyjnych z bezpośrednimi
 *       linkami do responsywnego widoku mobilnego offline oraz arkuszami druku A4.
 */

import QRCode from 'qrcode';
import { AppState, Class, Teacher, ClassRoom } from '../types';
import { QrItemConfig, QrPrintSheetTemplate, QrTargetType } from '../types/reports';

/**
 * Budowanie adresu URL do bezpośredniego widoku mobilnego
 */
export function buildMobilePlanUrl(type: QrTargetType, id: string, yearKey?: string): string {
  if (typeof window === 'undefined') {
    return `https://saleplan.pro/?view=mobile_plan&type=${type}&id=${encodeURIComponent(id)}`;
  }
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const ykParam = yearKey ? `&yk=${encodeURIComponent(yearKey)}` : '';
  return `${baseUrl}?view=mobile_plan&type=${type}&id=${encodeURIComponent(id)}${ykParam}`;
}

/**
 * Generowanie obrazu QR (DataURL Base64 PNG)
 */
export async function generateQrDataUrl(
  text: string, 
  options: { width?: number; margin?: number; colorDark?: string } = {}
): Promise<string> {
  const { width = 400, margin = 2, colorDark = '#090d16' } = options;
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      width,
      margin,
      color: {
        dark: colorDark,
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Błąd generowania kodu QR:', err);
    throw err;
  }
}

/**
 * Przygotowanie listy elementów QR dla wszystkich klas
 */
export async function generateClassesQrConfigs(appState: AppState): Promise<QrItemConfig[]> {
  const pl = appState.planLekcji;
  const yearKey = appState.yearKey;
  const results: QrItemConfig[] = [];

  for (const cls of pl.classes) {
    const url = buildMobilePlanUrl('class', cls.id, yearKey);
    const qrDataUrl = await generateQrDataUrl(url, { width: 360 });
    results.push({
      id: cls.id,
      type: 'class',
      title: `Klasa ${cls.name}`,
      subtitle: cls.group || `Oddział szkolny • ${appState.school?.name || appState.planLekcji?.meta?.schoolName || 'Szkoła'}`,
      tag: `Rok szkolny ${appState.yearLabel || ''}`,
      targetUrl: url,
      qrDataUrl
    });
  }

  return results;
}

/**
 * Przygotowanie listy elementów QR dla wszystkich nauczycieli
 */
export async function generateTeachersQrConfigs(appState: AppState): Promise<QrItemConfig[]> {
  const pl = appState.planLekcji;
  const yearKey = appState.yearKey;
  const results: QrItemConfig[] = [];

  for (const teacher of pl.teachers) {
    const url = buildMobilePlanUrl('teacher', teacher.id, yearKey);
    const qrDataUrl = await generateQrDataUrl(url, { width: 360, colorDark: '#1e1b4b' });
    results.push({
      id: teacher.id,
      type: 'teacher',
      title: `${teacher.last} ${teacher.first}`,
      subtitle: `Skrót: ${teacher.abbr} • Grafik i Dyżury`,
      tag: `Kadra Pedagogiczna`,
      targetUrl: url,
      qrDataUrl
    });
  }

  return results;
}

/**
 * Przygotowanie listy elementów QR dla sal lekcyjnych
 */
export async function generateRoomsQrConfigs(appState: AppState): Promise<QrItemConfig[]> {
  const pl = appState.planLekcji;
  const yearKey = appState.yearKey;
  const results: QrItemConfig[] = [];

  for (const room of pl.rooms) {
    const url = buildMobilePlanUrl('room', room.id, yearKey);
    const qrDataUrl = await generateQrDataUrl(url, { width: 360, colorDark: '#064e3b' });
    const roomType = room.type === 'sport' ? 'Sala sportowa' : room.type === 'indywidualne' ? 'Terapia / Indywidualne' : 'Sala lekcyjna';
    results.push({
      id: room.id,
      type: 'room',
      title: room.name.startsWith('Sala') ? room.name : `Sala ${room.name}`,
      subtitle: room.desc || roomType,
      tag: room.capacity ? `Pojemność: ${room.capacity} os.` : 'Harmonogram sali',
      targetUrl: url,
      qrDataUrl
    });
  }

  return results;
}

/**
 * Pobranie kodu QR jako plik graficzny PNG
 */
export function downloadQrPng(qrDataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = qrDataUrl;
  a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

/**
 * Generowanie gotowego do druku HTML z kartami kodów QR na arkuszu A4
 */
export function generateQrPrintHtml(
  items: QrItemConfig[], 
  template: QrPrintSheetTemplate, 
  appState: AppState
): string {
  const schoolName = appState.school?.name || appState.planLekcji?.meta?.schoolName || 'SZKOŁA';
  const yearLabel = appState.yearLabel || '';

  let gridClass = 'grid-6';
  if (template === 'cards_12') gridClass = 'grid-12';
  if (template === 'stickers_door') gridClass = 'grid-door';
  if (template === 'table_summary') gridClass = 'grid-table';

  const cardsHtml = items.map(item => {
    if (template === 'stickers_door') {
      return `
        <div class="door-sticker">
          <div class="door-header">
            <span class="door-school">${schoolName}</span>
            <span class="door-tag">${item.tag || 'GABINET'}</span>
          </div>
          <div class="door-title">${item.title}</div>
          <div class="door-desc">${item.subtitle}</div>
          <div class="qr-box">
            <img src="${item.qrDataUrl}" alt="${item.title}" class="qr-img" />
          </div>
          <div class="door-footer">
            <span class="scan-cta">📱 Zeskanuj telefonem rozkład sali</span>
            <span class="sys-brand">SalePlan Pro</span>
          </div>
        </div>
      `;
    }

    if (template === 'cards_12') {
      return `
        <div class="card-12">
          <div class="card-12-top">
            <span class="badge">${item.tag || ''}</span>
            <span class="sch-micro">${schoolName}</span>
          </div>
          <div class="card-12-title">${item.title}</div>
          <div class="card-12-qr">
            <img src="${item.qrDataUrl}" alt="${item.title}" />
          </div>
          <div class="card-12-footer">Zeskanuj plan lekcji</div>
        </div>
      `;
    }

    // Domyślny cards_6 (2 kolumny x 3 wiersze na A4)
    return `
      <div class="card-6">
        <div class="card-header">
          <div class="school-label">${schoolName}</div>
          <div class="year-label">${yearLabel}</div>
        </div>
        <div class="card-body">
          <div class="card-info">
            <div class="card-tag">${item.tag || ''}</div>
            <div class="card-title">${item.title}</div>
            <div class="card-subtitle">${item.subtitle}</div>
            <div class="card-instructions">
              <p>📌 <strong>Plan w smartfonie:</strong></p>
              <ul>
                <li>Zeskanuj kod aparatem telefonu</li>
                <li>Działa offline bez logowania</li>
                <li>Zawsze aktualny harmonogram</li>
              </ul>
            </div>
          </div>
          <div class="card-qr-box">
            <img src="${item.qrDataUrl}" alt="${item.title}" class="qr-img-large" />
            <span class="qr-direct-link">${item.targetUrl.replace(/^https?:\/\//, '')}</span>
          </div>
        </div>
        <div class="card-footer">
          <span>Generowano automatycznie z SalePlan Pro</span>
          <span class="page-date">${new Date().toLocaleDateString('pl-PL')}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>Karty Kodów QR – ${schoolName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          background-color: #f8fafc;
          color: #0f172a;
          padding: 12px;
        }
        .no-print-bar {
          background-color: #0f172a;
          color: white;
          padding: 12px 20px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .btn-print {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-close {
          background-color: #334155;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
        }
        .print-grid {
          display: grid;
          gap: 12px;
        }
        
        /* Szablon cards_6: 2 kolumny na A4 */
        .grid-6 {
          grid-template-columns: repeat(2, 1fr);
        }
        .card-6 {
          background: white;
          border: 2px dashed #94a3b8;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 240px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }
        .card-body {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .card-info {
          flex: 1;
        }
        .card-tag {
          font-size: 9px;
          font-weight: 900;
          background-color: #eff6ff;
          color: #1d4ed8;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .card-title {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .card-subtitle {
          font-size: 11px;
          color: #475569;
          margin-bottom: 8px;
        }
        .card-instructions {
          font-size: 10px;
          color: #334155;
          line-height: 1.4;
        }
        .card-instructions ul {
          padding-left: 14px;
          margin-top: 3px;
        }
        .card-qr-box {
          text-align: center;
          width: 120px;
        }
        .qr-img-large {
          width: 110px;
          height: 110px;
          display: block;
          margin: 0 auto 4px auto;
        }
        .qr-direct-link {
          font-size: 8px;
          color: #94a3b8;
          word-break: break-all;
        }
        .card-footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }

        /* Szablon stickers_door (Zawieszki na drzwi) */
        .grid-door {
          grid-template-columns: repeat(2, 1fr);
        }
        .door-sticker {
          background: white;
          border: 3px solid #0f172a;
          border-radius: 14px;
          padding: 18px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: 280px;
        }
        .door-header {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .door-title {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 10px;
        }
        .door-desc {
          font-size: 13px;
          color: #475569;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .door-sticker .qr-box img {
          width: 130px;
          height: 130px;
        }
        .door-footer {
          margin-top: 10px;
          width: 100%;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: #2563eb;
        }

        /* Szablon cards_12 (3 kolumny x 4 wiersze) */
        .grid-12 {
          grid-template-columns: repeat(3, 1fr);
        }
        .card-12 {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 8px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .card-12-top {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .card-12-title {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
        }
        .card-12-qr img {
          width: 85px;
          height: 85px;
          margin: 4px auto;
          display: block;
        }
        .card-12-footer {
          font-size: 8px;
          font-weight: 700;
          color: #2563eb;
        }

        @media print {
          .no-print-bar {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
          }
          .card-6, .door-sticker, .card-12 {
            border-color: #000 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <span style="font-weight: 900; font-size: 14px;">DRUKOWANIE KART I KODÓW QR (A4)</span>
          <span style="font-size: 11px; color: #94a3b8; margin-left: 10px;">Liczba elementów: ${items.length}</span>
        </div>
        <div>
          <button class="btn-close" onclick="window.close()">Zamknij</button>
          <button class="btn-print" onclick="window.print()">Drukuj arkusze (Ctrl+P)</button>
        </div>
      </div>

      <div class="print-grid ${gridClass}">
        ${cardsHtml}
      </div>

      <script>
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;
}
