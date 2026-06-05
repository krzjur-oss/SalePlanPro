import React, { useState, useMemo, useEffect } from 'react';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom, SchoolGroup, SchedCell } from '../types';
import { Printer, Calendar, User, MapPin, Shield, Layers, FileText, CheckCircle } from 'lucide-react';

interface WydrukiProps {
  appState: AppState;
  schedData: SchedData;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export default function Wydruki({ appState, schedData }: WydrukiProps) {
  const [printType, setPrintType] = useState<'classes' | 'teachers' | 'rooms' | 'duties'>('classes');
  const [scheduleVersion, setScheduleVersion] = useState<'etap1' | 'etap2'>('etap1');
  
  // Selected filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const pl = appState.planLekcji;

  // --- Helpers to resolve names ---
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);

  // Resolve hours list
  const hoursList = useMemo(() => {
    return pl.hours && pl.hours.length > 0 ? pl.hours : [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:55', end: '11:40' },
      { num: 5, start: '11:50', end: '12:35' },
    ];
  }, [pl.hours]);

  // Helper: check if a lesson from SchedData (Etap 2) belongs to a specific class, teacher, or room
  // schedData structure: yearKey -> dayIdx -> hourKey -> colKey -> SchedCell | SchedCell[]
  const etap2Schedule = useMemo(() => {
    const yearKey = appState.yearKey;
    const yearData = schedData[yearKey] || {};
    
    // We want to turn it into an easily queryable structure:
    // class -> day -> hour -> { subject, teacherAbbr, roomName, isCoaching }
    const classMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const teacherMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const roomMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};

    Object.entries(yearData).forEach(([dayStr, hoursData]) => {
      const dayIdx = parseInt(dayStr, 10);
      Object.entries(hoursData).forEach(([hourKey, cells]) => {
        Object.entries(cells).forEach(([colKey, cellVal]) => {
          const cellList = Array.isArray(cellVal) ? cellVal : [cellVal];
          
          cellList.forEach(cell => {
            if (!cell) return;
            // colKey example: f0_s0_101 (last part is room name)
            const parts = colKey.split('_');
            const roomName = parts[parts.length - 1] || '';

            // 1. By Class name
            if (cell.classes && cell.classes.length > 0) {
              cell.classes.forEach(clsName => {
                const clsId = pl.classes.find(c => c.name === clsName)?.id || clsName;
                if (!classMap[clsId]) classMap[clsId] = {};
                if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
                if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
                
                classMap[clsId][dayIdx][hourKey].push({
                  ...cell,
                  note: roomName // Use the actual room name in cell
                });
              });
            } else if (cell.className) {
              const clsId = pl.classes.find(c => c.name === cell.className)?.id || cell.className;
              if (!classMap[clsId]) classMap[clsId] = {};
              if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
              if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
              
              classMap[clsId][dayIdx][hourKey].push({
                ...cell,
                note: roomName
              });
            }

            // 2. By Teacher Abbr
            const tAbbr = cell.teacherAbbr;
            if (tAbbr) {
              const teacherId = pl.teachers.find(t => t.abbr === tAbbr)?.id || tAbbr;
              if (!teacherMap[teacherId]) teacherMap[teacherId] = {};
              if (!teacherMap[teacherId][dayIdx]) teacherMap[teacherId][dayIdx] = {};
              if (!teacherMap[teacherId][dayIdx][hourKey]) teacherMap[teacherId][dayIdx][hourKey] = [];
              
              teacherMap[teacherId][dayIdx][hourKey].push({
                ...cell,
                note: roomName
              });
            }

            // 3. By Room Name
            if (roomName) {
              const roomId = pl.rooms.find(r => r.name === roomName)?.id || roomName;
              if (!roomMap[roomId]) roomMap[roomId] = {};
              if (!roomMap[roomId][dayIdx]) roomMap[roomId][dayIdx] = {};
              if (!roomMap[roomId][dayIdx][hourKey]) roomMap[roomId][dayIdx][hourKey] = [];
              
              roomMap[roomId][dayIdx][hourKey].push({
                ...cell,
                note: roomName
              });
            }
          });
        });
      });
    });

    return { classes: classMap, teachers: teacherMap, rooms: roomMap };
  }, [schedData, appState.yearKey, pl.classes, pl.teachers, pl.rooms]);

  // Handle system print trigger
  const handlePrint = () => {
    window.print();
  };

  const generateRoomsMatrixHtml = () => {
    let daysHtml = '';
    
    [0, 1, 2, 3, 4].forEach(dayIdx => {
      let rowsHtml = '';
      
      hoursList.forEach(hour => {
        const fileHIdx = hoursList.findIndex(h => h.num === hour.num);

        let roomsCellsHtml = '';
        roomsToPrint.forEach(room => {
          let lessonsInRoom: Array<{ subject: string; className: string; teacherAbbr?: string }> = [];

          if (scheduleVersion === 'etap1') {
            Object.entries(pl.lessons).forEach(([key, lesson]) => {
              const parts = key.split('|');
              const classId = parts[0];
              const dIdx = parseInt(parts[1], 10);
              const hrIdx = parseInt(parts[2], 10);

              if (dIdx === dayIdx && hrIdx === fileHIdx) {
                const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                if (asg && asg.roomId === room.id) {
                  const subject = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
                  const clsName = classesMap.get(classId)?.name || 'Klasa';
                  const tAbbr = asg.teacherId ? teachersMap.get(asg.teacherId)?.abbr : '';
                  lessonsInRoom.push({
                    subject,
                    className: clsName,
                    teacherAbbr: tAbbr
                  });
                }
              }
            });
          } else {
            const rSched = etap2Schedule.rooms[room.id] || {};
            const daySchedules = rSched[dayIdx] || {};
            const hourKeyStr = String(hour.num);
            const hourCells = daySchedules[hourKeyStr] || [];
            
            hourCells.forEach(cell => {
              lessonsInRoom.push({
                subject: cell.subject,
                className: cell.className || cell.classes?.join('+') || 'Klasa',
                teacherAbbr: cell.teacherAbbr
              });
            });
          }

          let cellContent = '-';
          if (lessonsInRoom.length > 0) {
            cellContent = lessonsInRoom.map(it => `
              <div style="margin-bottom: 6px; line-height: 1.2;">
                <span style="font-weight: 900; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block;">
                  ${it.className}
                </span>
                <div style="font-size: 9px; font-weight: bold; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;" title="${it.subject}">
                  ${it.subject}
                </div>
                ${it.teacherAbbr ? `
                  <span style="background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; font-weight: bold; display: inline-block; margin-top: 2px;">
                    ${it.teacherAbbr}
                  </span>` : ''}
              </div>
            `).join('');
          }

          roomsCellsHtml += `
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; vertical-align: top; background: #fff; min-height: 50px;">
              ${cellContent}
            </td>
          `;
        });

        rowsHtml += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 10px;">
              <div style="font-size: 12px; font-weight: 900; color: #0f172a;">${hour.num}</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">${hour.start}-${hour.end}</div>
            </td>
            ${roomsCellsHtml}
          </tr>
        `;
      });

      daysHtml += `
        <div class="day-sheet" style="page-break-after: always; margin-bottom: 40px;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="font-size: 13px; font-weight: 950; letter-spacing: 0.05em;">
              📅 ${DAYS_NAMES[dayIdx].toUpperCase()} — PŁACHTA OBŁOŻENIA GABINETÓW
            </span>
            <span style="font-size: 10px; font-weight: bold; font-family: monospace; opacity: 0.85;">
              Wydruk zbiorczy
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; min-width: 700px;">
            <thead>
              <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; font-weight: 900; width: 90px; color: #1e293b;">
                  Lekcja / Godz
                </th>
                ${roomsToPrint.map(room => `
                  <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; font-weight: 950; min-width: 110px; color: #020617;">
                    <span style="font-family: monospace; font-size: 12px; display: block;">${room.name}</span>
                    <span style="font-size: 8.5px; color: #475569; font-weight: 500; display: block; margin-top: 2px; text-transform: uppercase;">${room.desc || 'sala ogólna'}</span>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <title>Płachta Gabinetów - SalePlan Pro</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            color: #0f172a;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 24px;
          }
          .header-title h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.02em;
          }
          .header-title p {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-info {
            text-align: right;
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
            font-weight: bold;
            line-height: 1.4;
          }
          .no-print-bar {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            padding: 12px 24px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }
          .btn-print {
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
          }
          .btn-print:hover {
            background-color: #1d4ed8;
          }
          .btn-close {
            background-color: #f1f5f9;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
          }
          
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              padding: 0 !important;
            }
            .day-sheet {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 0 !important;
            }
            td, th {
              border: 1px solid #000 !important;
            }
            @page {
              size: landscape;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">PODGLĄD WYDRUKU PŁACHTY GABINETÓW</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Układ poziomy (A4 landscape) został automatycznie zoptymalizowany pod drukarkę</span>
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
            <h1>PŁACHTA MATRYCOWA OBŁOŻENIA GABINETÓW</h1>
            <p>${appState.school.name} — Rok szkolny ${appState.yearLabel}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            WERSJA: ${scheduleVersion === 'etap1' ? 'PLAN BAZOWY KLAS (ETAP 1)' : 'PLAN PRZYDZIAŁU SAL (ETAP 2)'}<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString('pl-PL')} o ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div class="content">
          ${daysHtml}
        </div>

        <script>
          // Softly trigger printing once document renders
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              window.print();
            }, 350);
          });
        </script>
      </body>
      </html>
    `;
  };

  const openRoomsPrintPreview = () => {
    try {
      const htmlContent = generateRoomsMatrixHtml();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        setPopupBlocked(true);
      }
    } catch (e) {
      console.error(e);
      setPopupBlocked(true);
    }
  };

  // --- Classes Data Resolution ---
  const classesToPrint = useMemo(() => {
    if (selectedClassId === 'all') {
      return pl.classes;
    }
    return pl.classes.filter(c => c.id === selectedClassId);
  }, [pl.classes, selectedClassId]);

  // --- Teachers Data Resolution ---
  const teachersToPrint = useMemo(() => {
    if (selectedTeacherId === 'all') {
      return pl.teachers;
    }
    return pl.teachers.filter(t => t.id === selectedTeacherId);
  }, [pl.teachers, selectedTeacherId]);

  // --- Rooms Data Resolution ---
  const roomsToPrint = useMemo(() => {
    if (selectedRoomId === 'all') {
      return pl.rooms;
    }
    return pl.rooms.filter(r => r.id === selectedRoomId);
  }, [pl.rooms, selectedRoomId]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible">
      {/* CSS rules specifically injected for elegant printing */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .print-card {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            padding: 10px !important;
            margin-bottom: 25px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
            color: #000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h2, h3, h4 {
            color: #000 !important;
          }
        }
      `}</style>

      {/* --- CONTROLS BOX (HIDDEN ON PRINT) --- */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-5xl mx-auto">
        {isInIframe && (
          <div className="mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left">
            <div className="flex gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <span className="text-xs font-black text-amber-900 block uppercase tracking-tight">Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)</span>
                <p className="text-[11px] text-amber-800 leading-normal font-semibold mt-1">
                  Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">window.print()</code>) oraz otwierania nowych okien z wnętrza takich ramek.
                </p>
                <div className="bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">1</span>
                    <span>Kliknij okrągłą ikonę ze strzałką <strong className="font-black">"Otwórz w nowej karcie"</strong> w prawym górnym rogu podglądu aplikacji.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">2</span>
                    <span>W nowym oknie przycisk <strong className="font-black">"Drukuj teraz"</strong> oraz <strong className="font-black">"Podgląd płachty sal"</strong> zadziałają natychmiast!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Centrum Wydruków i Publikacji</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wygodne drukowanie planów lekcji i dyżurów</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {printType === 'rooms' && (
              <button 
                onClick={openRoomsPrintPreview}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer"
              >
                <Printer size={15} className="animate-pulse" /> Podgląd płachty sal
              </button>
            )}
            <button 
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Printer size={15} /> Drukuj teraz (Ctrl+P)
            </button>
          </div>
        </div>

        {/* Filters and Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Main Select template */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Typ wydruku</label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPrintType('classes')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'classes' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Plan Klas
              </button>
              <button
                onClick={() => setPrintType('teachers')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'teachers' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Nauczyciele
              </button>
              <button
                onClick={() => setPrintType('rooms')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'rooms' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Gabinety
              </button>
              <button
                onClick={() => setPrintType('duties')}
                className={`py-1.5 text-[11px] font-black rounded-md transition ${printType === 'duties' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Dyżury
              </button>
            </div>
          </div>

          {/* Schedule version select */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Siatka Lekcji</label>
            <select
              value={scheduleVersion}
              onChange={(e) => setScheduleVersion(e.target.value as any)}
              className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
            >
              <option value="etap1">Etap 1: Plan Klas (Siatka bazowa)</option>
              <option value="etap2">Etap 2: Plan Sal (Przydzielone gabinety)</option>
            </select>
          </div>

          {/* Dynamic Filter select */}
          {printType === 'classes' && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Wybierz Klasę</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
              >
                <option value="all">Wszystkie oddziały (każdy na nowej stronie)</option>
                {pl.classes.map(c => (
                  <option key={c.id} value={c.id}>Klasa {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {printType === 'teachers' && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Wybierz Nauczyciela</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
              >
                <option value="all">Wszyscy nauczyciele (każdy na nowej stronie)</option>
                {pl.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.last} {t.first} ({t.abbr})</option>
                ))}
              </select>
            </div>
          )}

          {printType === 'rooms' && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Wybierz Gabinet</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none"
              >
                <option value="all">Wszystkie sale/gabinety</option>
                {pl.rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.desc || 'sala ogólna'})</option>
                ))}
              </select>
            </div>
          )}

          {printType === 'duties' && (
            <div className="flex items-end justify-center py-2 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-lg text-[10px] font-bold p-3">
              <div>
                <span className="block font-black uppercase text-xs">Dyżury gotowe</span>
                Renderuje kompletny podział przerwa po przerwie dla całej kadry.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- PRINT AREA --- */}
      <div className="print-container max-w-5xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0">
        
        {/* ======================= CLASSES RENDERING ======================= */}
        {printType === 'classes' && classesToPrint.map((cls, idx) => {
          return (
            <div key={cls.id} className={`print-card pb-6 border-b border-slate-200 last:border-0 ${idx < classesToPrint.length - 1 ? 'page-break' : ''}`}>
              <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">PLAN LEKCJI · KLASA {cls.name}</h2>
                  <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                  Generowane przez SalePlan Pro · {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
                </div>
              </div>

              <table className="w-full text-xs text-left border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 uppercase font-black text-slate-800">
                    <th className="w-20 border border-slate-300 p-2 text-center text-[10.5px]">Lp. / Godz</th>
                    {DAYS_NAMES.map(d => (
                      <th key={d} className="border border-slate-300 p-2 text-center text-[10.5px]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hoursList.map((hour, hIdx) => {
                    const hourKeyStr = String(hour.num);
                    return (
                      <tr key={hour.num} className="hover:bg-slate-50/50">
                        {/* Hour details cell */}
                        <td className="border border-slate-300 p-2 font-mono text-center text-[10px]">
                          <span className="font-extrabold text-slate-900">{hour.num}</span>
                          <span className="block text-[8px] text-slate-400 leading-none mt-0.5">{hour.start}-{hour.end}</span>
                        </td>
                        
                        {/* Day cells 0..4 */}
                        {[0, 1, 2, 3, 4].map(dayIdx => {
                          let displayItems: Array<{ subject: string; teacherAbbr?: string; roomName?: string }> = [];

                          if (scheduleVersion === 'etap1') {
                            // Find base Etap 1 lessons
                            const lessonKeyStr = `${cls.id}|${dayIdx}|${hIdx}`;
                            const lesson = pl.lessons[lessonKeyStr];
                            if (lesson) {
                              const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                              if (asg) {
                                const subject = subjectsMap.get(asg.subjectId)?.name || 'Inny';
                                const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                                const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
                                displayItems.push({
                                  subject,
                                  teacherAbbr: teacher?.abbr,
                                  roomName: room?.name
                                });
                              }
                            }
                          } else {
                            // Find Etap 2 schedules from compiled map
                            const clsMapData = etap2Schedule.classes[cls.id] || {};
                            const daySchedules = clsMapData[dayIdx] || {};
                            const hourCells = daySchedules[hourKeyStr] || [];
                            
                            hourCells.forEach(cell => {
                              displayItems.push({
                                subject: cell.subject,
                                teacherAbbr: cell.teacherAbbr,
                                roomName: cell.note // In Etap 2 we mapped room to notes
                              });
                            });
                          }

                          return (
                            <td key={dayIdx} className="border border-slate-300 p-2 align-top text-center min-h-[45px]">
                              {displayItems.length > 0 ? (
                                <div className="space-y-1">
                                  {displayItems.map((it, dIdx) => (
                                    <div key={dIdx} className="text-[10px]">
                                      <span className="font-black text-slate-950 block">{it.subject}</span>
                                      <div className="flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5">
                                        {it.teacherAbbr && <span className="bg-slate-100 border border-slate-200 px-1 rounded">{it.teacherAbbr}</span>}
                                        {it.roomName && <span className="bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded">f. {it.roomName}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-300 font-bold font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* ======================= TEACHERS RENDERING ======================= */}
        {printType === 'teachers' && teachersToPrint.map((teacher, idx) => {
          return (
            <div key={teacher.id} className={`print-card pb-6 border-b border-slate-200 last:border-0 ${idx < teachersToPrint.length - 1 ? 'page-break' : ''}`}>
              <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">PLAN LEKCJI NAUCZYCIELA: {teacher.last} {teacher.first} ({teacher.abbr})</h2>
                  <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                  Generowane przez SalePlan Pro · {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
                </div>
              </div>

              <table className="w-full text-xs text-left border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 uppercase font-black text-slate-800">
                    <th className="w-20 border border-slate-300 p-2 text-center text-[10.5px]">Lp. / Godz</th>
                    {DAYS_NAMES.map(d => (
                      <th key={d} className="border border-slate-300 p-2 text-center text-[10.5px]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hoursList.map((hour, hIdx) => {
                    const hourKeyStr = String(hour.num);
                    return (
                      <tr key={hour.num} className="hover:bg-slate-50/50">
                        {/* Hour info */}
                        <td className="border border-slate-300 p-2 font-mono text-center text-[10px]">
                          <span className="font-extrabold text-slate-900">{hour.num}</span>
                          <span className="block text-[8px] text-slate-400 leading-none mt-0.5">{hour.start}-{hour.end}</span>
                        </td>
                        
                        {/* Day columns 0..4 */}
                        {[0, 1, 2, 3, 4].map(dayIdx => {
                          let displayItems: Array<{ subject: string; className: string; roomName?: string }> = [];

                          if (scheduleVersion === 'etap1') {
                            // Collect all matches from Step 1 lessons mapping
                            Object.entries(pl.lessons).forEach(([key, lesson]) => {
                              const parts = key.split('|');
                              const classId = parts[0];
                              const dIdx = parseInt(parts[1], 10);
                              const hrIndex = parseInt(parts[2], 10);

                              if (dIdx === dayIdx && hrIndex === hIdx) {
                                const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                                if (asg && asg.teacherId === teacher.id) {
                                  const subject = subjectsMap.get(asg.subjectId)?.name || 'Inny';
                                  const clsName = classesMap.get(classId)?.name || 'Inna';
                                  const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
                                  displayItems.push({
                                    subject,
                                    className: clsName,
                                    roomName: room?.name
                                  });
                                }
                              }
                            });
                          } else {
                            // Gather SchedData from compiled teacher map
                            const tSched = etap2Schedule.teachers[teacher.id] || {};
                            const daySchedules = tSched[dayIdx] || {};
                            const hourCells = daySchedules[hourKeyStr] || [];
                            
                            hourCells.forEach(cell => {
                              displayItems.push({
                                subject: cell.subject,
                                className: cell.className || cell.classes?.join('+') || 'Klasa',
                                roomName: cell.note // mapped room name
                              });
                            });
                          }

                          return (
                            <td key={dayIdx} className="border border-slate-300 p-2 align-top text-center min-h-[45px]">
                              {displayItems.length > 0 ? (
                                <div className="space-y-1">
                                  {displayItems.map((it, dIdx) => (
                                    <div key={dIdx} className="text-[10px]">
                                      <span className="font-black text-slate-950 block">{it.subject}</span>
                                      <div className="flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5">
                                        <span className="bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded">{it.className}</span>
                                        {it.roomName && <span className="bg-blue-50 border border-blue-100 text-blue-700 px-1.5 rounded">s. {it.roomName}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-300 font-bold font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* ======================= ROOMS RENDERING ======================= */}
        {printType === 'rooms' && (
          <div className="print-card pb-6">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                Generowane przez SalePlan Pro · {scheduleVersion === 'etap1' ? 'Wersja Plan Klas' : 'Wersja Plan Sal'}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-6 font-bold uppercase no-print">
              Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty.
            </p>

            <div className="no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="space-y-1 text-left">
                <span className="text-xs font-black text-amber-900 block uppercase">✨ Dedykowany Wydruk Płachty Dyrektorskiej</span>
                <p className="text-[11px] text-amber-700 leading-normal font-medium max-w-3xl">
                  Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki.
                </p>
              </div>
              <button
                onClick={openRoomsPrintPreview}
                className="shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer"
              >
                <Printer size={14} className="animate-pulse" /> Podgląd i Druk Płachty (A4 Poziomo)
              </button>
            </div>

            {roomsToPrint.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">Brak gabinetów do wyświetlenia w wybranym filtrze.</p>
            ) : (
              <div className="space-y-12">
                {[0, 1, 2, 3, 4].map((dayIdx) => {
                  return (
                    <div key={dayIdx} className="page-break last:pb-0 pb-2">
                      <div className="bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-3 print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                        <span className="text-xs font-black uppercase tracking-wide">
                          📅 {DAYS_NAMES[dayIdx]} — PŁACHTA OBŁOŻENIA GABINETÓW
                        </span>
                        <span className="text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500">
                          {appState.yearLabel}
                        </span>
                      </div>

                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                        <table className="w-full text-xs text-left border border-slate-300 min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-100 uppercase font-black text-slate-800">
                              <th className="w-24 border border-slate-300 p-2 text-center text-[10.5px]">Godz / Lekcja</th>
                              {roomsToPrint.map(room => (
                                <th key={room.id} className="border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]">
                                  <span className="font-mono text-[11px] block text-slate-900">{room.name}</span>
                                  <span className="block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto">{room.desc || 'ogólna'}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {hoursList.map((hour, hIdx) => {
                              const hourKeyStr = String(hour.num);
                              return (
                                <tr key={hour.num} className="hover:bg-slate-50/40">
                                  {/* Hour column */}
                                  <td className="border border-slate-300 p-2 font-mono text-center bg-slate-50/50">
                                    <span className="font-extrabold text-slate-900 text-[11px]">{hour.num}</span>
                                    <span className="block text-[8px] text-slate-400 leading-none mt-0.5">{hour.start}-{hour.end}</span>
                                  </td>

                                  {/* Rooms cells */}
                                  {roomsToPrint.map(room => {
                                    let lessonsInRoom: Array<{ subject: string; className: string; teacherAbbr?: string }> = [];

                                    if (scheduleVersion === 'etap1') {
                                      // Search assignments matching room in stage 1
                                      Object.entries(pl.lessons).forEach(([key, lesson]) => {
                                        const parts = key.split('|');
                                        const classId = parts[0];
                                        const dIdx = parseInt(parts[1], 10);
                                        const hrIdx = parseInt(parts[2], 10);

                                        if (dIdx === dayIdx && hrIdx === hIdx) {
                                          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                                          if (asg && asg.roomId === room.id) {
                                            const subject = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
                                            const clsName = classesMap.get(classId)?.name || 'Klasa';
                                            const tAbbr = asg.teacherId ? teachersMap.get(asg.teacherId)?.abbr : '';
                                            lessonsInRoom.push({
                                              subject,
                                              className: clsName,
                                              teacherAbbr: tAbbr
                                            });
                                          }
                                        }
                                      });
                                    } else {
                                      // Get from Plan Sal mapping (stage 2)
                                      const rSched = etap2Schedule.rooms[room.id] || {};
                                      const daySchedules = rSched[dayIdx] || {};
                                      const hourCells = daySchedules[hourKeyStr] || [];
                                      
                                      hourCells.forEach(cell => {
                                        lessonsInRoom.push({
                                          subject: cell.subject,
                                          className: cell.className || cell.classes?.join('+') || 'Klasa',
                                          teacherAbbr: cell.teacherAbbr
                                        });
                                      });
                                    }

                                    return (
                                      <td key={room.id} className="border border-slate-300 p-1.5 align-top text-center min-h-[50px] bg-white">
                                        {lessonsInRoom.length > 0 ? (
                                          <div className="space-y-1">
                                            {lessonsInRoom.map((it, dIdx) => (
                                              <div key={dIdx} className="text-[10px] leading-tight">
                                                <span className="font-extrabold text-slate-900 block text-[10.5px] bg-amber-100/70 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block mb-0.5">
                                                  {it.className}
                                                </span>
                                                <span className="text-[9px] text-slate-700 block font-bold truncate max-w-[100px] mx-auto" title={it.subject}>
                                                  {it.subject}
                                                </span>
                                                {it.teacherAbbr && (
                                                  <span className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-1.5 rounded text-[8.5px] font-bold inline-block mt-0.5">
                                                    {it.teacherAbbr}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-slate-300 font-bold font-mono">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= DUTIES (DYŻURY) RENDERING ======================= */}
        {printType === 'duties' && (
          <div className="print-card pb-6">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase">{appState.school.name} ({appState.yearLabel})</p>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-bold uppercase font-mono">
                Generowane przez SalePlan Pro · Moduł Dyżurów
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-6 font-bold uppercase">
              Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych.
            </p>

            <div className="space-y-8">
              {[0, 1, 2, 3, 4].map(dayIdx => {
                // Find if there are actually any duties scheduled on this day
                const dayDutiesList: { miejsceName: string; przerwaName: string; przerwaTime: string; teacherAbbr: string }[] = [];
                
                appState.dyzury.miejsca.forEach(miejsce => {
                  appState.dyzury.przerwy.forEach(przerwa => {
                    const dutyKey = `${miejsce.id}|${dayIdx}|${przerwa.num}`;
                    const entry = appState.dyzury.harmonogram[dutyKey];
                    if (entry && entry.teacherAbbr) {
                      dayDutiesList.push({
                        miejsceName: miejsce.name,
                        przerwaName: przerwa.name || `Przerwa ${przerwa.num}`,
                        przerwaTime: `${przerwa.start} - ${przerwa.end}`,
                        teacherAbbr: entry.teacherAbbr
                      });
                    }
                  });
                });

                return (
                  <div key={dayIdx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid">
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">
                      📅 {DAYS_NAMES[dayIdx]}
                    </h3>

                    {dayDutiesList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">Brak przydzielonych dyżurów na ten dzień.</p>
                    ) : (
                      <table className="w-full text-xs border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 font-black uppercase">
                            <th className="border border-slate-300 p-2 text-left">Przerwa / Godzina</th>
                            <th className="border border-slate-300 p-2 text-left">Lokalizacja / Miejsce</th>
                            <th className="border border-slate-300 p-2 text-center w-28">Nauczyciel dyżurujący</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayDutiesList.map((d, dIdx) => (
                            <tr key={dIdx} className="bg-white">
                              <td className="border border-slate-300 p-2 font-mono text-[9px]">
                                <span className="font-extrabold text-slate-800">{d.przerwaName}</span>
                                <span className="block text-slate-400 font-bold mt-0.5">{d.przerwaTime}</span>
                              </td>
                              <td className="border border-slate-300 p-2 font-semibold text-slate-700">
                                {d.miejsceName}
                              </td>
                              <td className="border border-slate-300 p-2 font-extrabold text-center text-[10px]">
                                <span className="bg-slate-900 text-white rounded px-2 py-0.5 inline-block">{d.teacherAbbr}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pop-up Blocked Fallback Modal */}
      {popupBlocked && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Pop-up zablokowany lub zakazany w bezpiecznym iFrame</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left">
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Alternatywnie użyj przycisku <strong className="font-black text-slate-900">Drukuj teraz</strong> w menu głównym.</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  setPopupBlocked(false);
                  window.print();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Drukuj stąd
              </button>
              <button
                onClick={() => setPopupBlocked(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
