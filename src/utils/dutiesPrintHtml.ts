/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Szablony Wydruku Harmonogramu Dyżurów (Duties Print HTML)
 * Opis: Generowanie czystych dokumentów HTML/CSS do druku dyżurów nauczycielskich.
 */
import { AppState, SchedData } from '../types';
import { calculateAdaptationDuties } from './adaptationDuty';
import { escapeHtml } from './sanitizer';

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export function generateDutiesHtml(appState: AppState, schedData: SchedData = {}): string {
  const places = appState.dyzury?.miejsca || [];
  const breaks = appState.dyzury?.przerwy || [];
  const recommendedScale = Math.min(1.0, Math.max(0.45, 8 / Math.max(places.length, 1)));
  const adaptationDuties = calculateAdaptationDuties(appState, schedData);
  const showAdaptation = appState.dyzury?.settings?.firstGradeAdaptationDuty !== false;

  let daysHtml = '';

  [0, 1, 2, 3, 4].forEach(dayIdx => {
    let rowsHtml = '';
    
    breaks.forEach(p => {
      let colsHtml = '';
      places.forEach(place => {
        const dutyKey = `${place.id}|${dayIdx}|${p.num}`;
        const entry = appState.dyzury?.harmonogram?.[dutyKey];
        const t = entry?.teacherAbbr 
          ? (appState.teachers?.find(tch => tch.abbr === entry.teacherAbbr) || (appState.supportStaff || []).find(st => st.abbr === entry.teacherAbbr)) 
          : null;
        
        let cellContent = '-';
        if (entry?.teacherAbbr) {
          cellContent = `
            <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
              ${escapeHtml(entry.teacherAbbr)}
            </div>
            <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${t ? escapeHtml(`${t.first} ${t.last}`) : ''}">
              ${t ? `${escapeHtml(t.first.slice(0, 1))}. ${escapeHtml(t.last)}` : 'Dyżur'}
            </div>
          `;
        }

        colsHtml += `
          <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
            ${cellContent}
          </td>
        `;
      });

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
            <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${escapeHtml(p.name || `Przerwa ${p.num}`)}</div>
            <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${escapeHtml(p.start)} - ${escapeHtml(p.end)}</div>
          </td>
          ${colsHtml}
        </tr>
      `;
    });

    const dayAdaptationList = showAdaptation ? (adaptationDuties?.byDay?.[dayIdx] || []) : [];

    daysHtml += `
      <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
        <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${escapeHtml(DAYS_NAMES[dayIdx])} — HARMONOGRAM DYŻURÓW</span>
          <span style="font-size: 8.5px; font-family: monospace; font-weight: bold; opacity: 0.8; text-transform: uppercase;">PODZIAŁ NA REJONY / MIEJSCA DYŻUROWAŃ</span>
        </div>

        ${places.length === 0 ? `
          <p style="font-size: 11px; color: #64748b; font-style: italic; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; background: #fafafa;">Brak zdefiniowanych miejsc dyżurowania.</p>
        ` : `
          <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 900; color: #334155; width: 140px;">PRZERWA / GODZINA</th>
                ${places.map(place => `
                  <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 10.5px; font-weight: 900; color: #1e293b; background-color: #f8fafc;">
                    <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${escapeHtml(place.name)}</div>
                    ${place.floor ? `<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${escapeHtml(place.floor)}</div>` : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `}

        ${dayAdaptationList.length > 0 ? `
          <div style="margin-top: 14px; border: 1px solid #fde68a; border-radius: 8px; overflow: hidden; background: #fffbeb;">
            <div style="background-color: #fef3c7; border-bottom: 1px solid #fde68a; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 10px; font-weight: 900; color: #78350f; text-transform: uppercase; letter-spacing: 0.03em;">
                🎒 OKRES ADAPTACYJNY KLAS 1 — OPIEKA W SALACH I ODPROWADZANIE UCZNIÓW
              </span>
              <span style="font-size: 9px; font-weight: bold; color: #92400e;">
                (Pierwsze ${appState.dyzury?.settings?.firstGradeAdaptationDurationMonths || 2} mies. roku szkolnego)
              </span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; font-size: 9.5px; background: #fff;">
              <thead>
                <tr style="background-color: #fffbeb; border-bottom: 1px solid #fde68a; color: #78350f;">
                  <th style="border: 1px solid #fde68a; padding: 5px 8px; text-align: left; font-weight: 900; width: 60px;">KLASA</th>
                  <th style="border: 1px solid #fde68a; padding: 5px 8px; text-align: left; font-weight: 900; width: 140px;">RODZAJ OPIEKI</th>
                  <th style="border: 1px solid #fde68a; padding: 5px 8px; text-align: left; font-weight: 900; width: 80px;">SALA</th>
                  <th style="border: 1px solid #fde68a; padding: 5px 8px; text-align: left; font-weight: 900;">CZAS / PRZERWA</th>
                  <th style="border: 1px solid #fde68a; padding: 5px 8px; text-align: left; font-weight: 900;">NAUCZYCIEL ODPOWIEDZIALNY</th>
                  <th style="border: 1px solid #fde68a; padding: 5px 8px; text-align: center; font-weight: 900; width: 50px;">CZAS</th>
                </tr>
              </thead>
              <tbody>
                ${dayAdaptationList.map(duty => `
                  <tr>
                    <td style="border: 1px solid #fef3c7; padding: 6px 8px; font-weight: 900; color: #78350f; font-family: monospace;">
                      ${escapeHtml(duty.className)}
                    </td>
                    <td style="border: 1px solid #fef3c7; padding: 6px 8px; font-weight: bold; color: ${duty.type === 'classroom' ? '#92400e' : '#1e40af'};">
                      ${duty.type === 'classroom' ? '🏫 Opieka w sali' : '🚶‍♂️ Odprowadzanie'}
                    </td>
                    <td style="border: 1px solid #fef3c7; padding: 6px 8px; font-weight: bold; color: #334155;">
                      Sala ${escapeHtml(duty.roomNum)}
                    </td>
                    <td style="border: 1px solid #fef3c7; padding: 6px 8px; color: #475569; font-family: monospace; font-size: 9px;">
                      ${duty.type === 'classroom' ? `Przerwa po ${duty.breakNum}. lekcji (${escapeHtml(duty.timeRange)})` : `Po ${duty.breakNum}. lekcji (${escapeHtml(duty.timeRange)})`}
                    </td>
                    <td style="border: 1px solid #fef3c7; padding: 6px 8px; font-weight: bold; color: #0f172a;">
                      <span style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 8.5px; border: 1px solid #e2e8f0; margin-right: 4px;">
                        ${escapeHtml(duty.teacherAbbr)}
                      </span>
                      ${escapeHtml(duty.teacherName)}
                    </td>
                    <td style="border: 1px solid #fef3c7; padding: 6px 8px; text-align: center; font-weight: 900; color: #78350f; font-family: monospace;">
                      ${duty.durationMinutes} min
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Plan i Harmonogram Dyżurów — SalePlan Pro</title>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print-bar {
          background-color: #fff;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .btn-close {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-close:hover {
          background-color: #e2e8f0;
          color: #1e293b;
        }
        .btn-print {
          background-color: #059669;
          color: #fff;
          border: 1px solid #059669;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-print:hover {
          background-color: #047857;
          border-color: #047857;
        }
        .header {
          background-color: #fff;
          border-bottom: 2px solid #0f172a;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header-title h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.01em;
          color: #0f172a;
        }
        .header-title p {
          margin: 4px 0 0 0;
          font-size: 11.5px;
          color: #475569;
          font-weight: bold;
          text-transform: uppercase;
        }
        .meta-info {
          font-size: 9px;
          font-weight: bold;
          text-align: right;
          line-height: 1.5;
          color: #64748b;
          text-transform: uppercase;
        }
        .content {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @media print {
          .no-print-bar {
            display: none !important;
          }
          body {
            background-color: #fff !important;
          }
          .header {
            padding: 12px 0 20px 0 !important;
            margin-bottom: 16px !important;
            border-bottom: 2px solid #000 !important;
          }
          .content {
            padding: 0 !important;
            max-width: 100% !important;
          }
          td, th {
            border: 1px solid #000 !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 900; font-size: 13px; color: #020617;">PODGLĄD HARMONOGRAMU DYŻURÓW</span>
          <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Układ poziomy (A4 landscape) został automatycznie zoptymalizowany pod drukarkę</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 16px; margin-left: auto; margin-right: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; white-space: nowrap;">Skala wydruku (Zoom):</label>
            <select id="scale-selector" onchange="adjustScale(this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #1e293b; background: white; cursor: pointer;">
              <option value="1.0" ${recommendedScale >= 0.95 ? 'selected' : ''}>Auto (100%)</option>
              <option value="0.95" ${recommendedScale >= 0.9 && recommendedScale < 0.95 ? 'selected' : ''}>95%</option>
              <option value="0.90" ${recommendedScale >= 0.85 && recommendedScale < 0.9 ? 'selected' : ''}>90%</option>
              <option value="0.85" ${recommendedScale >= 0.8 && recommendedScale < 0.85 ? 'selected' : ''}>85% (Kompaktowa)</option>
              <option value="0.80" ${recommendedScale >= 0.75 && recommendedScale < 0.8 ? 'selected' : ''}>80%</option>
              <option value="0.75" ${recommendedScale >= 0.7 && recommendedScale < 0.75 ? 'selected' : ''}>75%</option>
              <option value="0.70" ${recommendedScale >= 0.65 && recommendedScale < 0.7 ? 'selected' : ''}>70%</option>
              <option value="0.65" ${recommendedScale >= 0.6 && recommendedScale < 0.65 ? 'selected' : ''}>65%</option>
              <option value="0.60" ${recommendedScale >= 0.55 && recommendedScale < 0.6 ? 'selected' : ''}>60% (Gęsta)</option>
              <option value="0.55" ${recommendedScale >= 0.5 && recommendedScale < 0.55 ? 'selected' : ''}>55%</option>
              <option value="0.50" ${recommendedScale >= 0.45 && recommendedScale < 0.5 ? 'selected' : ''}>50%</option>
              <option value="0.45" ${recommendedScale >= 0.4 && recommendedScale < 0.45 ? 'selected' : ''}>45%</option>
              <option value="0.40" ${recommendedScale < 0.4 ? 'selected' : ''}>40% (Bardzo gęsta)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-close" onclick="window.close()">Zamknij okno</button>
          <button class="btn-print" onclick="window.print()">
            🖨️ Drukuj (Ctrl+P)
          </button>
        </div>
      </div>

      <div class="header">
        <div class="header-title">
          <h1>PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h1>
          <p>${escapeHtml(appState.school?.name || '')} — Rok szkolny ${escapeHtml(appState.yearLabel || '')}</p>
        </div>
        <div class="meta-info">
          SYSTEM GENERACYJNY SalePlan Pro<br>
          MODUŁ DYŻURÓW SZKOLNYCH<br>
          DATA GENEROWANIA: ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div class="content">
        ${daysHtml}
      </div>

      <script>
        function adjustScale(scaleValue) {
          const content = document.querySelector('.content');
          const header = document.querySelector('.header');
          if (content) {
            content.style.zoom = scaleValue;
            content.style.webkitZoom = scaleValue;
          }
          if (header) {
            header.style.zoom = scaleValue;
            header.style.webkitZoom = scaleValue;
          }
        }

        // Initial scale application
        window.addEventListener('DOMContentLoaded', () => {
          const initialScale = document.getElementById('scale-selector')?.value || '1.0';
          adjustScale(initialScale);
          
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.print();
            });
          });
        });
      </script>
    </body>
    </html>
  `;
}
