/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Silnik Zaawansowanego Eksportu Arkuszy Excel (.xlsx) (excelExportService.ts)
 * Opis: Generowanie profesjonalnych wieloarkuszowych plików Excel ze sformatowanymi
 *       tabelami planów klas, nauczycieli, sal, dyżurów i bilansu pensum.
 */

import * as XLSX from 'xlsx';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom } from '../types';
import { ExcelExportOptions, WorkloadTeacherSummary } from '../types/reports';
import { flattenColumns, colKey } from '../utils';
import { calculateTeacherWorkload } from '../utils/workloadUtils';

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

/**
 * Bezpieczne pobranie bufora i wymuszenie pobrania pliku w przeglądarce
 */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  } catch (err) {
    console.error('Błąd podczas generowania pliku Excel:', err);
    // Fallback do standardowego writeFile SheetJS
    XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
  }
}

/**
 * Automatyczne obliczenie szerokości kolumn arkusza na podstawie zawartości
 */
function autoFitColumns(rows: (string | number | null | undefined)[][]): { wch: number }[] {
  const colWidths: number[] = [];
  rows.forEach(row => {
    row.forEach((cell, colIdx) => {
      const cellLen = cell !== null && cell !== undefined ? String(cell).length : 0;
      colWidths[colIdx] = Math.max(colWidths[colIdx] || 8, Math.min(cellLen + 3, 50));
    });
  });
  return colWidths.map(w => ({ wch: w }));
}

function getSchoolName(appState: AppState): string {
  return appState.school?.name || appState.planLekcji?.meta?.schoolName || 'SZKOŁA';
}

/**
 * Słowniki pomocnicze
 */
function buildLookupMaps(appState: AppState) {
  const pl = appState.planLekcji;
  const classesMap = new Map(pl.classes.map(c => [c.id, c]));
  const teachersMap = new Map(pl.teachers.map(t => [t.id, t]));
  const subjectsMap = new Map(pl.subjects.map(s => [s.id, s]));
  const roomsMap = new Map(pl.rooms.map(r => [r.id, r]));
  const groupsMap = new Map((pl.schoolGroups || []).map(g => [g.id, g]));

  // Mapa sal z widoku pięter
  const colKeyToRoomMap = new Map<string, string>();
  const rawCols = flattenColumns(appState.floors || []);
  rawCols.forEach(col => {
    const key = colKey(col);
    const name = (col.room?.num || col.room?.sub || '').trim();
    if (name) colKeyToRoomMap.set(key, name);
  });

  return { classesMap, teachersMap, subjectsMap, roomsMap, groupsMap, colKeyToRoomMap };
}

/**
 * Pobiera informację o lekcji dla danej klasy, dnia i godziny
 */
function getClassLessonInfo(
  appState: AppState,
  schedData: SchedData,
  classId: string,
  dayIdx: number,
  hourIdx: number,
  lookups: ReturnType<typeof buildLookupMaps>
): string {
  const { classesMap, teachersMap, subjectsMap, roomsMap, groupsMap, colKeyToRoomMap } = lookups;
  const pl = appState.planLekcji;
  const cls = classesMap.get(classId);
  const className = cls?.name || classId;

  // Sprawdzamy najpierw Etap 2 w schedData jeśli istnieje
  const yk = appState.yearKey || 'default';
  const yearObj = schedData[yk];
  const foundEtap2: string[] = [];

  if (yearObj && yearObj[dayIdx] && yearObj[dayIdx][hourIdx]) {
    const hourObj = yearObj[dayIdx][hourIdx];
    Object.entries(hourObj).forEach(([cKey, cellVal]) => {
      const list = Array.isArray(cellVal) ? cellVal : [cellVal];
      list.forEach(c => {
        if (!c) return;
        const matchesClass = (c.classes && c.classes.includes(className)) || c.className === className;
        if (matchesClass) {
          const room = colKeyToRoomMap.get(cKey) || '';
          const tAbbr = c.teacherAbbr || '';
          const grp = (c as any).groupName || c._bridgeMeta?.groupId ? ` [${(c as any).groupName || c._bridgeMeta?.groupId}]` : '';
          foundEtap2.push(`${c.subject || 'Lekcja'}${grp} (${tAbbr}${room ? `, s. ${room}` : ''})`);
        }
      });
    });
  }

  if (foundEtap2.length > 0) {
    return foundEtap2.join(' / ');
  }

  // Wyszukiwanie w pl.lessons (Etap 1)
  const matches: string[] = [];
  Object.entries(pl.lessons).forEach(([key, lesson]) => {
    const parts = key.split('|');
    if (parts[0] === classId && parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hourIdx) {
      const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
      if (asg) {
        const subj = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
        const teacher = asg.teacherId ? teachersMap.get(asg.teacherId)?.abbr || '' : '';
        const room = asg.roomId ? roomsMap.get(asg.roomId)?.name || '' : '';
        const grp = asg.groupId ? ` [${groupsMap.get(asg.groupId)?.name || asg.groupId}]` : '';
        matches.push(`${subj}${grp} (${teacher}${room ? `, s. ${room}` : ''})`);
      }
    }
  });

  return matches.length > 0 ? matches.join(' / ') : '';
}

/**
 * 1. Tworzenie arkusza: Zbiorczy Plan Klas
 */
export function createClassesSheet(appState: AppState, schedData: SchedData): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const lookups = buildLookupMaps(appState);
  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const rows: (string | number | null | undefined)[][] = [];

  // Nagłówek raportu
  const schoolName = getSchoolName(appState);
  const yearLabel = appState.yearLabel || 'ROK SZKOLNY';
  rows.push([`${schoolName.toUpperCase()} – ZBIORCZY PLAN LEKCJI WSZYSTKICH ODDZIAŁÓW`]);
  rows.push([`Rok szkolny: ${yearLabel}`, `Wygenerowano z systemu SalePlan Pro: ${new Date().toLocaleDateString('pl-PL')}`]);
  rows.push([]); // pusta linia

  // Wiersz nagłówka tabeli
  const headerRow = ['Dzień tygodnia', 'Nr', 'Godziny'];
  pl.classes.forEach(c => headerRow.push(`Klasa ${c.name}`));
  rows.push(headerRow);

  // Wiersze danych
  DAYS_NAMES.forEach((dayName, dayIdx) => {
    hours.forEach((h, hIdx) => {
      const row: (string | number | null | undefined)[] = [
        hIdx === 0 ? dayName : '', // Dzień tygodnia tylko w pierwszym wierszu dnia
        h.num,
        `${h.start} - ${h.end}`
      ];

      pl.classes.forEach(c => {
        const cellText = getClassLessonInfo(appState, schedData, c.id, dayIdx, hIdx, lookups);
        row.push(cellText);
      });

      rows.push(row);
    });
    // Pusta linia po każdym dniu dla czytelności
    rows.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * 2. Tworzenie arkusza: Zbiorczy Plan Nauczycieli
 */
export function createTeachersSheet(appState: AppState, schedData: SchedData): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const lookups = buildLookupMaps(appState);
  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const rows: (string | number | null | undefined)[][] = [];
  rows.push([`${getSchoolName(appState).toUpperCase()} – HARMONOGRAM PRACY KADRY PEDAGOGICZNEJ`]);
  rows.push([`Rok szkolny: ${appState.yearLabel || ''}`, `Liczba nauczycieli: ${pl.teachers.length}`]);
  rows.push([]);

  const headerRow = ['Nauczyciel', 'Skrót', 'Dzień', 'Lekcja', 'Godziny', 'Klasa', 'Przedmiot', 'Sala', 'Dyżur po lekcji'];
  rows.push(headerRow);

  pl.teachers.forEach(teacher => {
    let hasAnyRow = false;

    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        // Wyszukaj lekcję nauczyciela w Etapie 1 lub 2
        let lessonFound: { className: string; subject: string; room: string } | null = null;

        // Szukanie w pl.lessons
        Object.entries(pl.lessons).forEach(([key, lesson]) => {
          const parts = key.split('|');
          if (parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
            const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
            if (asg && asg.teacherId === teacher.id) {
              const cls = lookups.classesMap.get(parts[0])?.name || parts[0];
              const subj = lookups.subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
              const rm = asg.roomId ? lookups.roomsMap.get(asg.roomId)?.name || '' : '';
              lessonFound = { className: cls, subject: subj, room: rm };
            }
          }
        });

        // Dyżur po tej lekcji (w przerwie hIdx + 1)
        const breakNum = hIdx + 1;
        const places = appState.dyzury?.miejsca || [];
        const harmonogram = appState.dyzury?.harmonogram || {};
        let isTeacherOnDuty = false;
        let dutyText = '';

        for (const place of places) {
          const dutyKey = `${place.id}|${dayIdx}|${breakNum}`;
          const dutyEntry = harmonogram[dutyKey];
          if (dutyEntry && dutyEntry.teacherAbbr === teacher.abbr) {
            isTeacherOnDuty = true;
            dutyText = `Dyżur: ${place.name}${place.floor ? ` (${place.floor})` : ''}`;
            break;
          }
        }

        if (lessonFound || isTeacherOnDuty) {
          hasAnyRow = true;
          rows.push([
            `${teacher.last} ${teacher.first}`,
            teacher.abbr,
            dayName,
            h.num,
            `${h.start}-${h.end}`,
            lessonFound ? (lessonFound as any).className : '—',
            lessonFound ? (lessonFound as any).subject : '—',
            lessonFound ? (lessonFound as any).room : '—',
            dutyText || '—'
          ]);
        }
      });
    });

    if (hasAnyRow) {
      rows.push([]); // odstęp między nauczycielami
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * 3. Tworzenie arkusza: Obłożenie Sal Lekcyjnych
 */
export function createRoomsSheet(appState: AppState, schedData: SchedData): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const lookups = buildLookupMaps(appState);
  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const rows: (string | number | null | undefined)[][] = [];
  rows.push([`${getSchoolName(appState).toUpperCase()} – HARMONOGRAM OBŁOŻENIA SAL I GABINETÓW`]);
  rows.push([`Rok szkolny: ${appState.yearLabel || ''}`, `Liczba sal: ${pl.rooms.length}`]);
  rows.push([]);

  // Tabela podsumowująca wykorzystanie sal
  rows.push(['PODSUMOWANIE WYKORZYSTANIA GABINETÓW (OBŁOŻENIE)']);
  rows.push(['Sala / Gabinet', 'Typ sali', 'Pojemność', 'Liczba godzin w tygodniu', 'Wskaźnik obłożenia (%)']);

  const roomUsageStats: Record<string, number> = {};
  pl.rooms.forEach(r => { roomUsageStats[r.id] = 0; });

  // Zliczanie godzin zajętych
  Object.values(pl.lessons).forEach(lesson => {
    const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
    if (asg && asg.roomId && roomUsageStats[asg.roomId] !== undefined) {
      roomUsageStats[asg.roomId]++;
    }
  });

  const totalPossibleHoursPerRoom = 5 * hours.length; // np. 5 dni * 8 godz = 40 godz

  pl.rooms.forEach(r => {
    const used = roomUsageStats[r.id] || 0;
    const pct = totalPossibleHoursPerRoom > 0 ? Math.round((used / totalPossibleHoursPerRoom) * 100) : 0;
    rows.push([
      r.name,
      r.desc || (r.type === 'sport' ? 'Sportowa' : r.type === 'indywidualne' ? 'Terapia/Indywidualna' : 'Ogólna'),
      r.capacity ? `${r.capacity} os.` : '—',
      `${used} godz.`,
      `${pct}%`
    ]);
  });

  rows.push([]);
  rows.push(['SZCZEGÓŁOWY HARMONOGRAM REZERWACJI SAL DZIEŃ PO DNIU']);
  const detailHeader = ['Sala', 'Dzień', 'Lekcja', 'Godziny', 'Klasa', 'Przedmiot', 'Nauczyciel'];
  rows.push(detailHeader);

  pl.rooms.forEach(room => {
    DAYS_NAMES.forEach((dayName, dayIdx) => {
      hours.forEach((h, hIdx) => {
        // Sprawdź czy sala jest zajęta
        let occupant: { className: string; subject: string; teacher: string } | null = null;

        Object.entries(pl.lessons).forEach(([key, lesson]) => {
          const parts = key.split('|');
          if (parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
            const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
            if (asg && asg.roomId === room.id) {
              const cls = lookups.classesMap.get(parts[0])?.name || parts[0];
              const subj = lookups.subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
              const t = asg.teacherId ? lookups.teachersMap.get(asg.teacherId)?.abbr || '' : '';
              occupant = { className: cls, subject: subj, teacher: t };
            }
          }
        });

        if (occupant) {
          rows.push([
            room.name,
            dayName,
            h.num,
            `${h.start}-${h.end}`,
            (occupant as any).className,
            (occupant as any).subject,
            (occupant as any).teacher
          ]);
        }
      });
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * 4. Tworzenie arkusza: Grafik Dyżurów Międzylekcyjnych
 */
export function createDutiesSheet(appState: AppState): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const dyzury = appState.dyzury;
  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const rows: (string | number | null | undefined)[][] = [];
  rows.push([`${getSchoolName(appState).toUpperCase()} – HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH`]);
  rows.push([`Rok szkolny: ${appState.yearLabel || ''}`, `Data generacji: ${new Date().toLocaleDateString('pl-PL')}`]);
  rows.push([]);

  const headerRow = ['Dzień', 'Przerwa po lekcji', 'Godziny przerwy', 'Strefa / Piętro', 'Wyznaczony Nauczyciel', 'Skrót', 'Uwagi / Zastępstwo'];
  rows.push(headerRow);

  const harmonogram = dyzury?.harmonogram || {};
  const places = dyzury?.miejsca || [];

  DAYS_NAMES.forEach((dayName, dayIdx) => {
    hours.forEach((h, hIdx) => {
      // Oblicz orientacyjne godziny przerwy (koniec lekcji h -> start lekcji h+1)
      const nextHour = hours[hIdx + 1];
      const breakTimes = nextHour ? `${h.end} - ${nextHour.start}` : `${h.end} (koniec zajęć)`;
      const breakNum = hIdx + 1;

      // Szukanie dyżurów w harmonogramie dla danej przerwy
      const foundDuties: { placeName: string; entry: any }[] = [];
      places.forEach(place => {
        const dutyKey = `${place.id}|${dayIdx}|${breakNum}`;
        const entry = harmonogram[dutyKey];
        if (entry) {
          foundDuties.push({
            placeName: place.name + (place.floor ? ` (${place.floor})` : ''),
            entry
          });
        }
      });

      // Wsparcie dla uproszczonego klucza legacy (np. '0_0' lub '0|0')
      const legacyKey = `${dayIdx}_${hIdx}`;
      const legacyEntry = harmonogram[legacyKey];
      if (legacyEntry && !foundDuties.some(fd => fd.entry === legacyEntry)) {
        foundDuties.push({
          placeName: (legacyEntry as any).spotName || (legacyEntry as any).zoneName || 'Korytarz Parter',
          entry: legacyEntry
        });
      }

      if (foundDuties.length > 0) {
        foundDuties.forEach(({ placeName, entry: d }) => {
          if (d.isUnneeded) {
            rows.push([
              dayName,
              `Po ${h.num}. lekcji`,
              breakTimes,
              placeName,
              '🚫 Zbędny',
              '—',
              d.note || 'Oznaczono jako niepotrzebny'
            ]);
            return;
          }
          const teacherObj = pl.teachers.find(t => t.abbr === d.teacherAbbr) || 
                             (appState.supportStaff || []).find(s => s.abbr === d.teacherAbbr);
          const tFullName = teacherObj ? `${teacherObj.last} ${teacherObj.first}` : d.teacherAbbr;
          rows.push([
            dayName,
            `Po ${h.num}. lekcji`,
            breakTimes,
            placeName,
            tFullName || '—',
            d.teacherAbbr || '—',
            d.note || '—'
          ]);
        });
      }
    });
    rows.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * 5. Tworzenie arkusza: Bilans Pensum i Statystyki Nauczycieli
 */
export function createWorkloadSheet(appState: AppState): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const lookups = buildLookupMaps(appState);

  const summaries: WorkloadTeacherSummary[] = pl.teachers.map(t => {
    // Liczba godzin lekcyjnych
    let hoursCount = 0;
    const classesSet = new Set<string>();
    const daysSet = new Set<number>();
    const subjectsSet = new Set<string>();

    Object.entries(pl.lessons).forEach(([key, lesson]) => {
      const parts = key.split('|');
      const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
      if (asg && asg.teacherId === t.id) {
        hoursCount++;
        classesSet.add(parts[0]);
        daysSet.add(parseInt(parts[1], 10));
        const subjName = lookups.subjectsMap.get(asg.subjectId)?.name;
        if (subjName) subjectsSet.add(subjName);
      }
    });

    // Liczba dyżurów
    let dutiesCount = 0;
    Object.values(appState.dyzury?.harmonogram || {}).forEach(d => {
      if (d && d.teacherAbbr === t.abbr) {
        dutiesCount++;
      }
    });

    const analysis = calculateTeacherWorkload(
      t,
      pl.assignments,
      pl.specialAssignments,
      dutiesCount
    );

    const positionsText = analysis.positions
      .map(p => `${p.title} (${p.hours}h, P=${p.basePensum})`)
      .join('; ');

    return {
      teacherId: t.id,
      name: `${t.last} ${t.first}`,
      abbr: t.abbr,
      positions: positionsText,
      subjects: Array.from(subjectsSet),
      hours45min: analysis.hours45min,
      hours60min: analysis.hours60min,
      totalHours: analysis.nominalHours,
      totalFte: analysis.totalFte,
      isCombined: analysis.isCombinedPensum,
      classesCount: classesSet.size,
      dutiesCount,
      suggestedDutyLimit: analysis.effectiveDutyLimit,
      daysWithLessons: daysSet.size,
      baseQuota: analysis.averagedPensum,
      overtimeHours: analysis.overtimeHours
    };
  });

  // Sortuj alfabetycznie po nazwisku
  summaries.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  const rows: (string | number | null | undefined)[][] = [];
  rows.push([`${getSchoolName(appState).toUpperCase()} – ROZLICZENIE PENSUM I ETATÓW NAUCZYCIELI (KARTA NAUCZYCIELA)`]);
  rows.push([`Rok szkolny: ${appState.yearLabel || ''}`, `Data generacji: ${new Date().toLocaleDateString('pl-PL')}`]);
  rows.push([]);

  const headerRow = [
    'Nauczyciel',
    'Skrót',
    'Stanowiska / Przydziały',
    'Nauczane przedmioty',
    'Godz. 45 min (lekcyjne)',
    'Godz. 60 min (zegarowe)',
    'Suma godzin',
    'Wymiar etatu (FTE)',
    'Pensum (bazowe / łączone)',
    'Nadgodziny',
    'Dyżury (przypisane / limit)',
    'Liczba oddziałów',
    'Dni pracy w tyg.'
  ];
  rows.push(headerRow);

  let totalSchoolHours45 = 0;
  let totalSchoolHours60 = 0;
  let totalSchoolHours = 0;
  let totalSchoolFte = 0;
  let totalOvertime = 0;
  let totalDuties = 0;

  summaries.forEach(s => {
    totalSchoolHours45 += s.hours45min;
    totalSchoolHours60 += s.hours60min;
    totalSchoolHours += s.totalHours;
    totalSchoolFte += s.totalFte;
    totalOvertime += s.overtimeHours;
    totalDuties += s.dutiesCount;

    rows.push([
      s.name,
      s.abbr,
      s.positions || '—',
      s.subjects.join(', ') || '—',
      `${s.hours45min} h`,
      `${s.hours60min} h`,
      `${s.totalHours} h`,
      `${s.totalFte.toFixed(2)} etatu (${(s.totalFte * 100).toFixed(0)}%)`,
      s.isCombined ? `${s.baseQuota} h (łączone)` : `${s.baseQuota} h`,
      s.overtimeHours > 0 ? `+${s.overtimeHours} h` : '0 h',
      `${s.dutiesCount} / ${s.suggestedDutyLimit ?? '—'}`,
      s.classesCount,
      `${s.daysWithLessons} dni`
    ]);
  });

  rows.push([]);
  rows.push([
    'PODSUMOWANIE CAŁKOWITE',
    '',
    '',
    '',
    `Godz. 45m: ${totalSchoolHours45.toFixed(1)} h`,
    `Godz. 60m: ${totalSchoolHours60.toFixed(1)} h`,
    `Suma godzin: ${totalSchoolHours.toFixed(1)} h`,
    `Suma etatów: ${totalSchoolFte.toFixed(2)}`,
    '',
    `Suma nadgodzin: ${totalOvertime.toFixed(1)} h`,
    `Suma dyżurów: ${totalDuties}`,
    '',
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * 6. Tworzenie dedykowanego arkusza dla JEDNEJ konkretnej klasy (układ tygodniowy z siatką)
 */
export function createSingleClassSheet(appState: AppState, schedData: SchedData, targetClass: Class): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const lookups = buildLookupMaps(appState);
  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const rows: (string | number | null | undefined)[][] = [];
  rows.push([`PLAN LEKCJI – KLASA ${targetClass.name}`]);
  rows.push([`Szkoła: ${getSchoolName(appState)}`, `Rok szkolny: ${appState.yearLabel || ''}`]);
  rows.push([]);

  // Kolumny: Nr | Godziny | Poniedziałek | Wtorek | Środa | Czwartek | Piątek
  const headerRow = ['Nr', 'Godziny', ...DAYS_NAMES];
  rows.push(headerRow);

  hours.forEach((h, hIdx) => {
    const row: (string | number | null | undefined)[] = [
      h.num,
      `${h.start} - ${h.end}`
    ];

    DAYS_NAMES.forEach((_, dayIdx) => {
      const lessonInfo = getClassLessonInfo(appState, schedData, targetClass.id, dayIdx, hIdx, lookups);
      row.push(lessonInfo || '');
    });

    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * 7. Tworzenie dedykowanego arkusza dla JEDNEGO konkretnego nauczyciela (układ tygodniowy z siatką)
 */
export function createSingleTeacherSheet(appState: AppState, schedData: SchedData, teacher: Teacher): XLSX.WorkSheet {
  const pl = appState.planLekcji;
  const lookups = buildLookupMaps(appState);
  const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:55', end: '11:40' },
    { num: 5, start: '11:50', end: '12:35' },
    { num: 6, start: '12:45', end: '13:30' },
    { num: 7, start: '13:40', end: '14:25' },
    { num: 8, start: '14:35', end: '15:20' },
  ];

  const rows: (string | number | null | undefined)[][] = [];
  rows.push([`PLAN ZAJĘĆ – ${teacher.last} ${teacher.first} (${teacher.abbr})`]);
  rows.push([`Szkoła: ${getSchoolName(appState)}`, `Rok: ${appState.yearLabel || ''}`]);
  rows.push([]);

  const headerRow = ['Nr', 'Godziny', ...DAYS_NAMES];
  rows.push(headerRow);

  hours.forEach((h, hIdx) => {
    const row: (string | number | null | undefined)[] = [
      h.num,
      `${h.start} - ${h.end}`
    ];

    DAYS_NAMES.forEach((_, dayIdx) => {
      let cellText = '';
      Object.entries(pl.lessons).forEach(([key, lesson]) => {
        const parts = key.split('|');
        if (parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
          if (asg && asg.teacherId === teacher.id) {
            const cls = lookups.classesMap.get(parts[0])?.name || parts[0];
            const subj = lookups.subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
            const rm = asg.roomId ? lookups.roomsMap.get(asg.roomId)?.name || '' : '';
            cellText = `${subj} (${cls}${rm ? `, s. ${rm}` : ''})`;
          }
        }
      });

      // Sprawdź dyżur po lekcji
      const breakNum = hIdx + 1;
      const places = appState.dyzury?.miejsca || [];
      const harmonogram = appState.dyzury?.harmonogram || {};
      for (const place of places) {
        const dutyKey = `${place.id}|${dayIdx}|${breakNum}`;
        const duty = harmonogram[dutyKey];
        if (duty && duty.teacherAbbr === teacher.abbr) {
          const dText = `[Dyżur: ${place.name}${place.floor ? ` (${place.floor})` : ''}]`;
          cellText = cellText ? `${cellText} | ${dText}` : dText;
          break;
        }
      }

      row.push(cellText);
    });

    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = autoFitColumns(rows);
  return ws;
}

/**
 * GŁÓWNA FUNKCJA: Eksport pełnego skoroszytu szkoły (.xlsx)
 */
export function exportFullSchoolWorkbook(
  appState: AppState,
  schedData: SchedData,
  options: ExcelExportOptions = {}
): void {
  const wb = XLSX.utils.book_new();

  // 1. Arkusz Zbiorczy Plan Klas
  if (options.includeClasses !== false) {
    const wsClasses = createClassesSheet(appState, schedData);
    XLSX.utils.book_append_sheet(wb, wsClasses, 'Plan_Klas');
  }

  // 2. Oddzielne zakładki dla każdej klasy, jeśli zaznaczono
  if (options.separateClassSheets) {
    appState.planLekcji.classes.forEach(cls => {
      const wsSingle = createSingleClassSheet(appState, schedData, cls);
      // Ograniczenie nazwy zakładki Excel do 31 znaków
      const safeSheetName = `Kl_${cls.name}`.replace(/[\\/?*[\]:]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, wsSingle, safeSheetName);
    });
  }

  // 3. Arkusz Nauczycieli
  if (options.includeTeachers !== false) {
    const wsTeachers = createTeachersSheet(appState, schedData);
    XLSX.utils.book_append_sheet(wb, wsTeachers, 'Nauczyciele');
  }

  // 4. Arkusz Obłożenia Sal
  if (options.includeRooms !== false) {
    const wsRooms = createRoomsSheet(appState, schedData);
    XLSX.utils.book_append_sheet(wb, wsRooms, 'Sale_Lekcyjne');
  }

  // 5. Grafik Dyżurów
  if (options.includeDuties !== false) {
    const wsDuties = createDutiesSheet(appState);
    XLSX.utils.book_append_sheet(wb, wsDuties, 'Grafik_Dyzurow');
  }

  // 6. Bilans Pensum i Statystyki
  if (options.includeWorkload !== false) {
    const wsWorkload = createWorkloadSheet(appState);
    XLSX.utils.book_append_sheet(wb, wsWorkload, 'Bilans_Pensum');
  }

  const schoolSlug = getSchoolName(appState).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Plan_Lekcji_${schoolSlug}_${dateStr}.xlsx`;

  downloadWorkbook(wb, fileName);
}
