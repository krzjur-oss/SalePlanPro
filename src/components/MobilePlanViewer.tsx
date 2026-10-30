/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Mobilny Podgląd Planu Lekcji (MobilePlanViewer.tsx)
 * Opis: Dedykowany, lekki i responsywny widok planu lekcji dla smartfonów i tabletów.
 *       Uruchamiany po zeskanowaniu kodu QR lub bezpośrednim linku z parametrem `?view=mobile_plan`.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { AppState, SchedData, Class, Teacher, ClassRoom } from '../types';
import { QrTargetType } from '../types/reports';
import { 
  Calendar, Clock, MapPin, User, ArrowLeft, Share2, 
  Download, Printer, Sparkles, Check, ChevronLeft, ChevronRight,
  Shield, BookOpen, Layers, Smartphone, RefreshCw
} from 'lucide-react';
import { flattenColumns, colKey } from '../utils';

interface MobilePlanViewerProps {
  appState: AppState;
  schedData: SchedData;
  initialType?: QrTargetType;
  initialId?: string;
  onBackToApp?: () => void;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const DAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'];

export default function MobilePlanViewer({
  appState,
  schedData,
  initialType = 'class',
  initialId,
  onBackToApp
}: MobilePlanViewerProps) {
  const pl = appState.planLekcji;

  // Typ podglądu (klasa, nauczyciel, sala)
  const [targetType, setTargetType] = useState<QrTargetType>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('type') as QrTargetType;
      if (t === 'class' || t === 'teacher' || t === 'room') return t;
    }
    return initialType;
  });

  // Identyfikator wybranego obiektu
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const id = p.get('id');
      if (id) return id;
    }
    if (initialId) return initialId;
    return pl.classes[0]?.id || '';
  });

  // Domyślny aktywny dzień tygodnia (jeśli dziś Pon-Pt, to dzisiejszy dzień)
  const [activeDayIdx, setActiveDayIdx] = useState<number>(() => {
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon, 5 = Fri, 6 = Sat
    if (day >= 1 && day <= 5) return day - 1;
    return 0; // w weekend pokazujemy poniedziałek
  });

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Aktualizacja czasu rzeczywistego
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mapy wyszukiwania
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);
  const groupsMap = useMemo(() => new Map((pl.schoolGroups || []).map(g => [g.id, g])), [pl.schoolGroups]);

  // Kolumny sal z pięter
  const colKeyToRoomMap = useMemo(() => {
    const map = new Map<string, string>();
    const rawCols = flattenColumns(appState.floors || []);
    rawCols.forEach(col => {
      const key = colKey(col);
      const name = (col.room?.num || col.room?.sub || '').trim();
      if (name) map.set(key, name);
    });
    return map;
  }, [appState.floors]);

  // Godziny lekcyjne
  const hours = useMemo(() => {
    return pl.hours && pl.hours.length > 0 ? pl.hours : [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:55', end: '11:40' },
      { num: 5, start: '11:50', end: '12:35' },
      { num: 6, start: '12:45', end: '13:30' },
      { num: 7, start: '13:40', end: '14:25' },
      { num: 8, start: '14:35', end: '15:20' },
    ];
  }, [pl.hours]);

  // Pobranie aktualnie wybranego obiektu
  const currentTarget = useMemo(() => {
    if (targetType === 'class') {
      const found = classesMap.get(selectedId) || pl.classes.find(c => c.name === selectedId) || pl.classes[0];
      return {
        id: found?.id || '',
        title: found ? `Klasa ${found.name}` : 'Klasa',
        subtitle: found?.group || 'Oddział szkolny',
        color: '#2563eb'
      };
    }
    if (targetType === 'teacher') {
      const found = teachersMap.get(selectedId) || pl.teachers.find(t => t.abbr === selectedId) || pl.teachers[0];
      return {
        id: found?.id || '',
        title: found ? `${found.last} ${found.first}` : 'Nauczyciel',
        subtitle: found ? `Skrót: ${found.abbr} • Pensum: ${found.maxHours || 18} h` : '',
        color: '#4f46e5'
      };
    }
    // room
    const found = roomsMap.get(selectedId) || pl.rooms.find(r => r.name === selectedId) || pl.rooms[0];
    return {
      id: found?.id || '',
      title: found ? (found.name.startsWith('Sala') ? found.name : `Sala ${found.name}`) : 'Sala',
      subtitle: found?.desc || (found?.capacity ? `Pojemność: ${found.capacity} osób` : 'Gabinet lekcyjny'),
      color: '#059669'
    };
  }, [targetType, selectedId, classesMap, teachersMap, roomsMap, pl.classes, pl.teachers, pl.rooms]);

  // Obliczenie lekcji dla wybranego dnia i godziny
  const getLessonsForSlot = (dayIdx: number, hourIdx: number) => {
    const yk = appState.yearKey || 'default';
    const yearObj = schedData[yk];
    const results: Array<{
      subject: string;
      subjectColor?: string;
      teacherName: string;
      teacherAbbr: string;
      roomName: string;
      className: string;
      groupName?: string;
    }> = [];

    // Etap 2: Plan Sal
    if (yearObj && yearObj[dayIdx] && yearObj[dayIdx][hourIdx]) {
      const hourObj = yearObj[dayIdx][hourIdx];
      Object.entries(hourObj).forEach(([cKey, cellVal]) => {
        const list = Array.isArray(cellVal) ? cellVal : [cellVal];
        list.forEach(c => {
          if (!c) return;
          const room = colKeyToRoomMap.get(cKey) || '';
          let match = false;

          if (targetType === 'class') {
            const cName = classesMap.get(selectedId)?.name || selectedId;
            match = (c.classes && c.classes.includes(cName)) || c.className === cName;
          } else if (targetType === 'teacher') {
            const tAbbr = teachersMap.get(selectedId)?.abbr || selectedId;
            match = c.teacherAbbr === tAbbr;
          } else if (targetType === 'room') {
            const rName = roomsMap.get(selectedId)?.name || selectedId;
            match = room.toLowerCase() === rName.toLowerCase();
          }

          if (match) {
            results.push({
              subject: c.subject || 'Lekcja',
              teacherName: c.teacherAbbr || '',
              teacherAbbr: c.teacherAbbr || '',
              roomName: room,
              className: c.className || (c.classes ? c.classes.join(', ') : ''),
              groupName: (c as any).groupName || c._bridgeMeta?.groupId || undefined
            });
          }
        });
      });
    }

    if (results.length > 0) return results;

    // Etap 1: Plan Klas (pl.lessons)
    Object.entries(pl.lessons).forEach(([key, lesson]) => {
      const parts = key.split('|');
      const lClassId = parts[0];
      const lDayIdx = parseInt(parts[1], 10);
      const lHourIdx = parseInt(parts[2], 10);

      if (lDayIdx === dayIdx && lHourIdx === hourIdx) {
        const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
        if (!asg) return;

        let match = false;
        if (targetType === 'class') {
          match = lClassId === selectedId;
        } else if (targetType === 'teacher') {
          match = asg.teacherId === selectedId;
        } else if (targetType === 'room') {
          match = asg.roomId === selectedId;
        }

        if (match) {
          const subj = subjectsMap.get(asg.subjectId);
          const t = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
          const r = asg.roomId ? roomsMap.get(asg.roomId) : null;
          const cls = classesMap.get(lClassId);
          const grp = asg.groupId ? groupsMap.get(asg.groupId) : null;

          results.push({
            subject: subj?.name || 'Przedmiot',
            subjectColor: subj?.color,
            teacherName: t ? `${t.last} ${t.first}` : '',
            teacherAbbr: t?.abbr || '',
            roomName: r?.name || '',
            className: cls?.name || lClassId,
            groupName: grp?.name
          });
        }
      }
    });

    return results;
  };

  // Dyżur nauczyciela po danej lekcji
  const getTeacherDuty = (dayIdx: number, hourIdx: number): { spotName: string; note?: string } | null => {
    if (targetType !== 'teacher') return null;
    const teacher = teachersMap.get(selectedId);
    if (!teacher) return null;

    const breakNum = hourIdx + 1;
    const places = appState.dyzury?.miejsca || [];
    const harmonogram = appState.dyzury?.harmonogram || {};

    for (const place of places) {
      const dutyKey = `${place.id}|${dayIdx}|${breakNum}`;
      const duty = harmonogram[dutyKey];
      if (duty && duty.teacherAbbr === teacher.abbr) {
        return {
          spotName: place.name + (place.floor ? ` (${place.floor})` : ''),
          note: duty.note
        };
      }
    }
    return null;
  };

  const copyDirectLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?view=mobile_plan&type=${targetType}&id=${encodeURIComponent(selectedId)}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* GÓRNY PASEK MOBILNY */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                title="Wróć do aplikacji głównej"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">
                {appState.school?.name || appState.planLekcji?.meta?.schoolName || 'SalePlan Pro'} • {appState.yearLabel || 'Plan Lekcji'}
              </span>
              <h1 className="text-base font-black text-white leading-tight flex items-center gap-1.5">
                {currentTarget.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={copyDirectLink}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              title="Kopiuj link do tego planu"
            >
              {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
              title="Drukuj plan"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* PRZEŁĄCZNIK TYPU & SZYBKI WYBÓR W GÓRNYM PASKU */}
        <div className="max-w-md mx-auto mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl">
          <button
            onClick={() => {
              setTargetType('class');
              setSelectedId(pl.classes[0]?.id || '');
            }}
            className={`py-1.5 text-xs font-black rounded-lg transition ${targetType === 'class' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
          >
            Klasy
          </button>
          <button
            onClick={() => {
              setTargetType('teacher');
              setSelectedId(pl.teachers[0]?.id || '');
            }}
            className={`py-1.5 text-xs font-black rounded-lg transition ${targetType === 'teacher' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
          >
            Nauczyciele
          </button>
          <button
            onClick={() => {
              setTargetType('room');
              setSelectedId(pl.rooms[0]?.id || '');
            }}
            className={`py-1.5 text-xs font-black rounded-lg transition ${targetType === 'room' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
          >
            Gabinety
          </button>
        </div>

        {/* SELECT DANEGO OBIEKTU */}
        <div className="max-w-md mx-auto mt-2">
          {targetType === 'class' && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              {pl.classes.map(c => (
                <option key={c.id} value={c.id}>Klasa {c.name} {c.group ? `(${c.group})` : ''}</option>
              ))}
            </select>
          )}

          {targetType === 'teacher' && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
            >
              {pl.teachers.map(t => (
                <option key={t.id} value={t.id}>{t.last} {t.first} ({t.abbr})</option>
              ))}
            </select>
          )}

          {targetType === 'room' && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
            >
              {pl.rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} {r.desc ? `– ${r.desc}` : ''}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* PASEK NAWIGACJI DNIA (PON - PT LUB TYDZIEŃ) */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-3 py-2.5 shadow-xs sticky top-[138px] z-20">
        <div className="max-w-md mx-auto flex items-center justify-between gap-1.5">
          <div className="flex-1 grid grid-cols-5 gap-1">
            {DAYS_SHORT.map((name, idx) => (
              <button
                key={name}
                onClick={() => {
                  setActiveDayIdx(idx);
                  setViewMode('day');
                }}
                className={`py-1.5 rounded-lg text-xs font-black transition flex flex-col items-center ${
                  viewMode === 'day' && activeDayIdx === idx
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setViewMode(prev => prev === 'day' ? 'week' : 'day')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
              viewMode === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Pokaż cały tydzień"
          >
            <Calendar size={13} />
            <span className="hidden sm:inline">Tydzień</span>
          </button>
        </div>
      </div>

      {/* GŁÓWNA ZAWARTOŚĆ MOBILNA */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* NAGŁÓWEK DNIA */}
        <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Clock size={16} />
            </span>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {viewMode === 'day' ? DAYS_NAMES[activeDayIdx] : 'Wszystkie dni tygodnia'}
              </span>
              <span className="text-xs font-extrabold text-slate-200">
                Godziny lekcyjne • Czas: {currentTimeStr || 'Dziś'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black px-2 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
            {currentTarget.subtitle}
          </span>
        </div>

        {/* WIDOK DZIENNY */}
        {viewMode === 'day' ? (
          <div className="space-y-2.5">
            {hours.map((h, hIdx) => {
              const lessons = getLessonsForSlot(activeDayIdx, hIdx);
              const duty = getTeacherDuty(activeDayIdx, hIdx);
              const hasLessons = lessons.length > 0;

              return (
                <div key={h.num} className="space-y-1">
                  <div
                    className={`rounded-xl border p-3 transition flex items-start gap-3 ${
                      hasLessons
                        ? 'bg-slate-900/90 border-slate-700/80 shadow-xs'
                        : 'bg-slate-900/30 border-slate-800/50 text-slate-500 opacity-60'
                    }`}
                  >
                    {/* LEWA KOLUMNA: NUMER I GODZINY */}
                    <div className="text-center w-12 shrink-0 pt-0.5">
                      <span className="text-base font-black text-white block leading-tight">{h.num}</span>
                      <span className="text-[10px] font-bold text-slate-400 block">{h.start}</span>
                      <span className="text-[9px] text-slate-500 block">{h.end}</span>
                    </div>

                    {/* PRAWA KOLUMNA: LEKCJA LUB OKIENKO */}
                    <div className="flex-1 min-w-0">
                      {hasLessons ? (
                        <div className="space-y-1.5">
                          {lessons.map((lesson, lIdx) => (
                            <div key={lIdx} className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-sm font-extrabold text-white truncate">
                                  {lesson.subject}
                                  {lesson.groupName && (
                                    <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">
                                      {lesson.groupName}
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                                {targetType !== 'class' && (
                                  <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-blue-300 font-bold">
                                    <User size={11} /> Kl. {lesson.className}
                                  </span>
                                )}

                                {targetType !== 'teacher' && lesson.teacherAbbr && (
                                  <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-amber-300 font-bold">
                                    <User size={11} /> {lesson.teacherAbbr}
                                  </span>
                                )}

                                {lesson.roomName && (
                                  <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-emerald-300 font-bold">
                                    <MapPin size={11} /> s. {lesson.roomName}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 italic block py-2">
                          Brak zaplanowanych zajęć
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DYŻUR PO TEJ LEKCJI */}
                  {duty && (
                    <div className="mx-2 bg-gradient-to-r from-amber-950/60 to-orange-950/40 border border-amber-600/40 rounded-lg p-2 text-amber-200 text-xs font-bold flex items-center gap-2">
                      <Shield size={14} className="text-amber-400 shrink-0" />
                      <span>
                        Dyżur po {h.num}. lekcji: <strong>{duty.spotName || 'Korytarz'}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* WIDOK TYGODNIOWY */
          <div className="space-y-4">
            {DAYS_NAMES.map((dayName, dIdx) => (
              <div key={dayName} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <h3 className="text-xs font-black uppercase text-blue-400 tracking-wider">
                    {dayName}
                  </h3>
                </div>

                <div className="space-y-1">
                  {hours.map((h, hIdx) => {
                    const lessons = getLessonsForSlot(dIdx, hIdx);
                    if (lessons.length === 0) return null;

                    return (
                      <div key={h.num} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-none">
                        <span className="text-[11px] font-black text-slate-400 w-8">#{h.num}</span>
                        <div className="flex-1 truncate font-bold text-white">
                          {lessons.map(l => l.subject).join(' / ')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium ml-2">
                          {lessons.map(l => l.roomName ? `s. ${l.roomName}` : '').filter(Boolean).join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STOPKA INFORMACYJNA */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-[10px] text-slate-500">
            Działa offline • Dodaj stronę do ekranu początkowego telefonu (PWA)
          </p>
          <p className="text-[9px] text-slate-600">
            Wygenerowano przez system SalePlan Pro v3.9
          </p>
        </div>
      </main>
    </div>
  );
}
