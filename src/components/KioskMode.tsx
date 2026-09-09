import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState, SchedData, Class, Teacher, Subject, ClassRoom, PlanVariant, SchedCell } from '../types';
import { 
  Tv, Maximize2, Minimize2, Play, Pause, ChevronLeft, ChevronRight, Clock,
  Calendar, MapPin, User, Shield, Sparkles, Layers, Sliders, Bell, X, RefreshCw,
  Eye, EyeOff, Volume2, Edit3, Check, ArrowRight, MessageSquare, RotateCcw
} from 'lucide-react';
import { flattenColumns as localFlattenColumns, colKey as localColKey } from '../utils';

export interface KioskModeProps {
  appState: AppState;
  schedData: SchedData;
  activeVariant?: PlanVariant | null;
  onClose: () => void;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const DEFAULT_ANNOUNCEMENT = '📢 Szczęśliwy numerek: 14 · Zebranie Rady Pedagogicznej o godz. 15:30 · Pamiętaj o obuwiu zmiennym! · Wszystkie zapytania w sekretariacie szkoły.';

const ANNOUNCEMENT_PRESETS = [
  { label: '🍀 Szczęśliwy numerek', text: '🍀 Szczęśliwy numerek na dziś: 14' },
  { label: '📢 Zebranie z rodzicami', text: '📢 Zebrania z rodzicami dzisiaj o godz. 17:00' },
  { label: '⏱️ Skrócone lekcje', text: '⏱️ Uwaga: Lekcje skrócone o 15 minut z powodu uroczystości / upałów' },
  { label: '🏆 Apel szkolny', text: '🏆 Apel szkolny w sali gimnastycznej o godz. 09:50 dla klas 4–8' },
  { label: '⚠️ Zastępstwa i sale', text: '⚠️ Zastępstwa i zamiany sal wywieszone przy pokoju nauczycielskim' },
  { label: '👟 Obuwie zmienne', text: '👟 Przypominamy o obowiązku zmiany obuwia w szatni szkolnej' },
];

export default function KioskMode({
  appState,
  schedData,
  activeVariant,
  onClose
}: KioskModeProps) {
  const pl = appState.planLekcji;

  // Visual & Presentation States
  const [displayMode, setDisplayMode] = useState<'live' | 'carousel' | 'rooms' | 'autoscroll'>('live');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Carousel & Animation States
  const [carouselClassIdx, setCarouselClassIdx] = useState<number>(0);
  const [carouselRoomFloorIdx, setCarouselRoomFloorIdx] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [rotationIntervalSec, setRotationIntervalSec] = useState<number>(10);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Time & Bell States
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSimulatingTime, setIsSimulatingTime] = useState<boolean>(false);
  const [simulatedDayIdx, setSimulatedDayIdx] = useState<number>(0);
  const [simulatedHourIdx, setSimulatedHourIdx] = useState<number>(0);

  // Announcement bar
  const [announcementText, setAnnouncementText] = useState<string>(() => {
    return localStorage.getItem('saleplan_kiosk_announcement') || DEFAULT_ANNOUNCEMENT;
  });
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [tempAnnouncement, setTempAnnouncement] = useState<string>('');

  // Live board filter: hide classes without lessons or with a free period (okienko)
  const [hideEmptyClasses, setHideEmptyClasses] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('saleplan_kiosk_hide_empty');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleHideEmptyClasses = (explicitVal?: boolean) => {
    const nextVal = explicitVal !== undefined ? explicitVal : !hideEmptyClasses;
    setHideEmptyClasses(nextVal);
    try {
      localStorage.setItem('saleplan_kiosk_hide_empty', String(nextVal));
    } catch {}
  };

  const handleOpenAnnouncementEditor = () => {
    setTempAnnouncement(announcementText);
    setShowAnnouncementModal(true);
  };

  const handleSaveAnnouncement = (newText?: string) => {
    const textToSave = (newText !== undefined ? newText : tempAnnouncement).trim();
    const finalVal = textToSave || DEFAULT_ANNOUNCEMENT;
    setAnnouncementText(finalVal);
    try {
      localStorage.setItem('saleplan_kiosk_announcement', finalVal);
    } catch {
      // ignore
    }
    setShowAnnouncementModal(false);
  };

  // Maps for fast lookups
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);

  // Hours list resolved
  const hoursList = useMemo(() => {
    if (pl.hours && pl.hours.length > 0) {
      return [...pl.hours].sort((a, b) => a.num - b.num);
    }
    return [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:55', end: '11:40' },
      { num: 5, start: '11:50', end: '12:35' },
      { num: 6, start: '12:55', end: '13:40' },
      { num: 7, start: '13:50', end: '14:35' },
      { num: 8, start: '14:45', end: '15:30' }
    ];
  }, [pl.hours]);

  // Etap 2 Room key resolver
  const flatColumns = useMemo(() => {
    return localFlattenColumns(appState.floors || []);
  }, [appState.floors]);

  const resolveRoomFromColKey = useMemo(() => {
    const cache = new Map<string, string>();
    flatColumns.forEach(c => {
      const ck = localColKey({
        floorIdx: c.floorIdx,
        segIdx: c.segIdx,
        room: c.room,
        roomIdx: c.roomIdx
      });
      cache.set(ck, c.room.name || c.room.num || 'Sala');
    });
    return (ck: string) => cache.get(ck) || '';
  }, [flatColumns]);

  // Compiled Etap 2 schedule matrix: [type][entityId][dayIdx][hourKey] = SchedCell[]
  const etap2Schedule = useMemo(() => {
    const yearKey = appState.yearKey || 'default';
    const yearData = schedData[yearKey] || {};
    const classMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const teacherMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};
    const roomMap: Record<string, Record<number, Record<string, SchedCell[]>>> = {};

    Object.entries(yearData).forEach(([dayStr, hoursData]) => {
      const dayIdx = parseInt(dayStr, 10);
      if (isNaN(dayIdx)) return;
      Object.entries(hoursData || {}).forEach(([hourKey, cells]) => {
        Object.entries(cells || {}).forEach(([colKeyStr, cellVal]) => {
          const cellList = Array.isArray(cellVal) ? cellVal : [cellVal];
          cellList.forEach(cell => {
            if (!cell) return;
            const actualRoomName = resolveRoomFromColKey(colKeyStr);

            if (cell.classes && cell.classes.length > 0) {
              cell.classes.forEach(clsName => {
                const clsId = pl.classes.find(c => c.name === clsName)?.id || clsName;
                if (!classMap[clsId]) classMap[clsId] = {};
                if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
                if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
                classMap[clsId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
              });
            } else if (cell.className) {
              const clsId = pl.classes.find(c => c.name === cell.className)?.id || cell.className;
              if (!classMap[clsId]) classMap[clsId] = {};
              if (!classMap[clsId][dayIdx]) classMap[clsId][dayIdx] = {};
              if (!classMap[clsId][dayIdx][hourKey]) classMap[clsId][dayIdx][hourKey] = [];
              classMap[clsId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
            }

            if (cell.teacherAbbr) {
              const teacherId = pl.teachers.find(t => t.abbr === cell.teacherAbbr)?.id || cell.teacherAbbr;
              if (!teacherMap[teacherId]) teacherMap[teacherId] = {};
              if (!teacherMap[teacherId][dayIdx]) teacherMap[teacherId][dayIdx] = {};
              if (!teacherMap[teacherId][dayIdx][hourKey]) teacherMap[teacherId][dayIdx][hourKey] = [];
              teacherMap[teacherId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
            }

            if (actualRoomName) {
              const roomId = pl.rooms.find(r => r.name === actualRoomName)?.id || actualRoomName;
              if (!roomMap[roomId]) roomMap[roomId] = {};
              if (!roomMap[roomId][dayIdx]) roomMap[roomId][dayIdx] = {};
              if (!roomMap[roomId][dayIdx][hourKey]) roomMap[roomId][dayIdx][hourKey] = [];
              roomMap[roomId][dayIdx][hourKey].push({ ...cell, note: actualRoomName });
            }
          });
        });
      });
    });

    return { classes: classMap, teachers: teacherMap, rooms: roomMap };
  }, [schedData, appState.yearKey, pl.classes, pl.teachers, pl.rooms, resolveRoomFromColKey]);

  // Live timer interval (every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current day and current active/upcoming hour index
  const bellStatus = useMemo(() => {
    if (isSimulatingTime) {
      const hObj = hoursList[simulatedHourIdx] || hoursList[0];
      const nextHObj = hoursList[simulatedHourIdx + 1] || null;
      return {
        dayIdx: simulatedDayIdx,
        dayName: DAYS_NAMES[simulatedDayIdx],
        isLessonActive: true,
        currentHourIdx: simulatedHourIdx,
        currentHour: hObj,
        nextHourIdx: simulatedHourIdx + 1 < hoursList.length ? simulatedHourIdx + 1 : null,
        nextHour: nextHObj,
        statusText: `Lekcja ${hObj.num} (${hObj.start} – ${hObj.end})`,
        countdownText: `Pozostało 20 min (symulacja)`,
        isBreak: false
      };
    }

    const now = currentTime;
    const rawDay = now.getDay(); // 0 = Sun, 1 = Mon .. 5 = Fri, 6 = Sat
    const dayIdx = rawDay >= 1 && rawDay <= 5 ? rawDay - 1 : 0; // Default to Monday on weekends
    const dayName = DAYS_NAMES[dayIdx];

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let activeHourIdx: number | null = null;
    let upcomingHourIdx: number | null = null;
    let isBreak = false;
    let statusText = 'Poza godzinami lekcyjnymi';
    let countdownText = 'Zajęcia rozpoczynają się o 08:00';

    for (let i = 0; i < hoursList.length; i++) {
      const h = hoursList[i];
      const [sh, sm] = h.start.split(':').map(Number);
      const [eh, em] = h.end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      // Currently inside this lesson
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        activeHourIdx = i;
        upcomingHourIdx = i + 1 < hoursList.length ? i + 1 : null;
        const remaining = endMin - currentMinutes;
        statusText = `Trwa lekcja ${h.num} (${h.start} – ${h.end})`;
        countdownText = `Do dzwonka pozostało: ${remaining} min`;
        break;
      }

      // Inside a break before this lesson
      if (i > 0) {
        const prevH = hoursList[i - 1];
        const [peh, pem] = prevH.end.split(':').map(Number);
        const prevEndMin = peh * 60 + pem;

        if (currentMinutes >= prevEndMin && currentMinutes < startMin) {
          isBreak = true;
          activeHourIdx = i - 1; // Previous lesson context
          upcomingHourIdx = i; // Next lesson starting soon
          const remaining = startMin - currentMinutes;
          statusText = `Przerwa międzylekcyjna (${prevH.end} – ${h.start})`;
          countdownText = `Dzwonek na lekcję ${h.num} za: ${remaining} min`;
          break;
        }
      }
    }

    // If before first lesson
    if (activeHourIdx === null && hoursList.length > 0) {
      const firstH = hoursList[0];
      const [sh, sm] = firstH.start.split(':').map(Number);
      const firstStartMin = sh * 60 + sm;
      if (currentMinutes < firstStartMin) {
        upcomingHourIdx = 0;
        const diff = firstStartMin - currentMinutes;
        statusText = `Przed rozpoczęciem zajęć`;
        countdownText = `Pierwszy dzwonek za: ${diff} min (${firstH.start})`;
      } else {
        // After last lesson
        statusText = `Koniec zajęć lekcyjnych na dziś`;
        countdownText = `Do zobaczenia jutro!`;
      }
    }

    const currentHour = activeHourIdx !== null ? hoursList[activeHourIdx] : null;
    const nextHour = upcomingHourIdx !== null ? hoursList[upcomingHourIdx] : null;

    return {
      dayIdx,
      dayName,
      isLessonActive: activeHourIdx !== null && !isBreak,
      isBreak,
      currentHourIdx: activeHourIdx,
      currentHour,
      nextHourIdx: upcomingHourIdx,
      nextHour,
      statusText,
      countdownText
    };
  }, [currentTime, isSimulatingTime, simulatedDayIdx, simulatedHourIdx, hoursList]);

  // Helper to retrieve lesson for a class at a given hour
  const getClassLessonInfo = useCallback((classId: string, dayIdx: number, hourIdx: number | null) => {
    if (hourIdx === null || hourIdx < 0 || hourIdx >= hoursList.length) return null;
    const hourObj = hoursList[hourIdx];
    const hourNum = hourObj.num;

    // Check Etap 2 first
    const etap2Cells = etap2Schedule.classes[classId]?.[dayIdx]?.[String(hourNum)] || [];
    if (etap2Cells.length > 0) {
      const cell = etap2Cells[0];
      return {
        subject: cell.subject,
        teacher: cell.teacherAbbr || '',
        room: cell.note || '',
        isGroup: (cell.note || '').includes('gr')
      };
    }

    // Check Etap 1
    const lessonKey = Object.keys(pl.lessons || {}).find(k => {
      const p = k.split('|');
      return p[0] === classId && parseInt(p[1], 10) === dayIdx && parseInt(p[2], 10) === hourIdx;
    });

    if (lessonKey) {
      const lesson = pl.lessons[lessonKey];
      const asg = pl.assignments.find(a => a.id === lesson?.assignmentId);
      if (asg) {
        const subj = subjectsMap.get(asg.subjectId);
        const t = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
        const r = asg.roomId ? roomsMap.get(asg.roomId) : null;
        return {
          subject: subj?.name || 'Przedmiot',
          teacher: t?.abbr || '',
          room: r?.name || '',
          isGroup: !!asg.groupId
        };
      }
    }

    return null;
  }, [hoursList, etap2Schedule, pl.lessons, pl.assignments, subjectsMap, teachersMap, roomsMap]);

  // Live duties on current break
  const activeDuties = useMemo(() => {
    if (!appState.dyzury?.harmonogram || !appState.dyzury?.miejsca) return [];
    const duties: Array<{ placeName: string; teacherAbbr: string; breakName: string }> = [];

    const breakNum = bellStatus.currentHour ? bellStatus.currentHour.num : 1;
    const dIdx = bellStatus.dayIdx;

    appState.dyzury.miejsca.forEach(m => {
      const key = `${m.id}_${dIdx}_${breakNum}`;
      const entry = appState.dyzury?.harmonogram?.[key];
      if (entry && entry.teacherAbbr) {
        duties.push({
          placeName: m.name,
          teacherAbbr: entry.teacherAbbr,
          breakName: `Po lekcji ${breakNum}`
        });
      }
    });

    return duties;
  }, [appState.dyzury, bellStatus.dayIdx, bellStatus.currentHour]);

  // Reference hour index for the Live Hall Board ("Na żywo")
  const liveReferenceHourIdx = useMemo(() => {
    if (isSimulatingTime) {
      return simulatedHourIdx;
    }
    if (bellStatus.isBreak && bellStatus.nextHourIdx !== null) {
      return bellStatus.nextHourIdx;
    }
    if (bellStatus.currentHourIdx !== null) {
      return bellStatus.currentHourIdx;
    }
    return bellStatus.nextHourIdx ?? 0;
  }, [isSimulatingTime, simulatedHourIdx, bellStatus.isBreak, bellStatus.nextHourIdx, bellStatus.currentHourIdx]);

  // Classes list for Live Board (filtering out classes without lessons or with a free period / okienko)
  const classesToDisplay = useMemo(() => {
    const list = pl.classes.map(cls => {
      const currentLesson = getClassLessonInfo(cls.id, bellStatus.dayIdx, liveReferenceHourIdx);
      const nextLesson = getClassLessonInfo(
        cls.id, 
        bellStatus.dayIdx, 
        liveReferenceHourIdx !== null ? liveReferenceHourIdx + 1 : null
      );
      return {
        cls,
        currentLesson,
        nextLesson,
        hasLesson: currentLesson !== null
      };
    });

    if (hideEmptyClasses) {
      return list.filter(item => item.hasLesson);
    }
    return list;
  }, [pl.classes, bellStatus.dayIdx, liveReferenceHourIdx, getClassLessonInfo, hideEmptyClasses]);

  // Free classrooms in current hour
  const freeRoomsInCurrentHour = useMemo(() => {
    if (liveReferenceHourIdx === null || liveReferenceHourIdx === undefined) return [];
    const occupiedRoomNames = new Set<string>();

    pl.classes.forEach(c => {
      const l = getClassLessonInfo(c.id, bellStatus.dayIdx, liveReferenceHourIdx);
      if (l && l.room) {
        occupiedRoomNames.add(l.room.toLowerCase().trim());
      }
    });

    return pl.rooms.filter(r => !occupiedRoomNames.has(r.name.toLowerCase().trim())).slice(0, 8);
  }, [liveReferenceHourIdx, bellStatus.dayIdx, pl.classes, pl.rooms, getClassLessonInfo]);

  // Carousel timer effect (rotates class or floor)
  useEffect(() => {
    if (isPaused || pl.classes.length === 0) return;

    const intervalMs = rotationIntervalSec * 1000;
    const stepMs = 100;
    let elapsedMs = 0;

    const interval = setInterval(() => {
      elapsedMs += stepMs;
      const pct = Math.min(100, (elapsedMs / intervalMs) * 100);
      setProgressPercent(pct);

      if (elapsedMs >= intervalMs) {
        elapsedMs = 0;
        setProgressPercent(0);

        if (displayMode === 'carousel') {
          setCarouselClassIdx(prev => (prev + 1) % pl.classes.length);
        } else if (displayMode === 'rooms') {
          setCarouselRoomFloorIdx(prev => (prev + 1) % Math.max(1, (appState.floors || []).length));
        }
      }
    }, stepMs);

    return () => clearInterval(interval);
  }, [isPaused, rotationIntervalSec, displayMode, pl.classes.length, appState.floors]);

  // Fullscreen management
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        setIsPaused(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        setCarouselClassIdx(prev => (prev + 1) % pl.classes.length);
        setProgressPercent(0);
      } else if (e.key === 'ArrowLeft') {
        setCarouselClassIdx(prev => (prev - 1 + pl.classes.length) % pl.classes.length);
        setProgressPercent(0);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pl.classes.length]);

  // Active carousel class
  const currentCarouselClass = pl.classes[carouselClassIdx] || pl.classes[0];

  // Font scaling styles
  const fontStyles = useMemo(() => {
    switch (fontSize) {
      case 'xlarge':
        return {
          title: 'text-2xl sm:text-3xl font-black',
          cardHeader: 'text-lg sm:text-xl font-black',
          body: 'text-sm sm:text-base font-bold',
          sub: 'text-xs sm:text-sm font-semibold',
          clock: 'text-3xl sm:text-5xl font-black'
        };
      case 'large':
        return {
          title: 'text-xl sm:text-2xl font-black',
          cardHeader: 'text-base sm:text-lg font-black',
          body: 'text-xs sm:text-sm font-bold',
          sub: 'text-[11px] sm:text-xs font-semibold',
          clock: 'text-2xl sm:text-4xl font-black'
        };
      case 'normal':
      default:
        return {
          title: 'text-lg sm:text-xl font-black',
          cardHeader: 'text-sm sm:text-base font-black',
          body: 'text-xs font-bold',
          sub: 'text-[10px] font-semibold',
          clock: 'text-xl sm:text-3xl font-black'
        };
    }
  }, [fontSize]);

  const isDark = theme === 'dark';

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col select-none overflow-hidden ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ── TOP HEADER / LIVE BROADCAST TICKER ── */}
      <div 
        className={`px-4 sm:px-8 py-3 shrink-0 flex items-center justify-between gap-4 border-b ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {/* Left: School identity & Live status indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shrink-0 flex items-center justify-center">
            <Tv size={22} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`${fontStyles.title} tracking-tight leading-none truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {appState.school.name || 'Tablica Szkolna'}
              </h1>
              {activeVariant && (
                <span className={`hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-400/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {activeVariant.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide ${
                bellStatus.isLessonActive 
                  ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' : 'bg-emerald-100 text-emerald-950 border border-emerald-400 animate-pulse')
                  : bellStatus.isBreak
                    ? (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-amber-100 text-amber-950 border border-amber-400')
                    : (isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-200 text-slate-900')
              }`}>
                <span className={`w-2 h-2 rounded-full ${bellStatus.isLessonActive ? (isDark ? 'bg-emerald-400' : 'bg-emerald-600') : bellStatus.isBreak ? (isDark ? 'bg-amber-400' : 'bg-amber-600') : (isDark ? 'bg-slate-400' : 'bg-slate-600')}`} />
                <span>{bellStatus.statusText}</span>
              </span>

              <span className={`hidden sm:inline-block text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                {bellStatus.countdownText}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Digital Clock & Polish Calendar date */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className={`${fontStyles.clock} font-mono tracking-wider font-extrabold leading-none ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
            {currentTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className={`text-[11px] sm:text-xs font-extrabold mt-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {bellStatus.dayName}, {currentTime.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Right: Mode switches, settings & exit */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View switcher buttons */}
          <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
            <button
              type="button"
              onClick={() => setDisplayMode('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'live' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300/80 font-bold'
              }`}
              title="Widok na żywo: co teraz i za chwilę"
            >
              <Bell size={13} />
              <span className="hidden sm:inline">Na Żywo</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('carousel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'carousel' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300/80 font-bold'
              }`}
              title="Karuzela planów klas"
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Karuzela Klas</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('rooms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'rooms' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300/80 font-bold'
              }`}
              title="Obłożenie gabinetów"
            >
              <MapPin size={13} />
              <span className="hidden sm:inline">Gabinety</span>
            </button>
          </div>

          {/* Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              showSettingsDrawer 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : isDark ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-950 shadow-xs font-bold'
            }`}
            title="Ustawienia tablicy (motyw, czcionka, prędkość, symulacja)"
          >
            <Sliders size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-950 shadow-xs font-bold'
            }`}
            title={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran (F11)'}
          >
            {isFullscreen ? <Minimize2 size={16} className="text-amber-400" /> : <Maximize2 size={16} />}
          </button>

          {/* Close Kiosk Mode */}
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark 
                ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border-rose-500/30' 
                : 'bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white border-rose-300 shadow-xs font-bold'
            }`}
            title="Zamknij Kiosk i wróć do programu (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── SETTINGS DRAWER OVERLAY ── */}
      {showSettingsDrawer && (
        <div className={`p-4 border-b shrink-0 flex flex-wrap items-center justify-between gap-4 z-40 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            {/* Theme */}
            <div className="flex items-center gap-1">
              <span className={`font-bold uppercase text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Motyw TV:</span>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-2 py-1 rounded-md font-bold cursor-pointer transition ${
                  theme === 'dark' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-bold'
                }`}
              >
                Ciemny (OLED)
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-2 py-1 rounded-md font-bold cursor-pointer transition ${
                  theme === 'light' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-bold'
                }`}
              >
                Jasny (Rzutnik)
              </button>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1">
              <span className={`font-bold uppercase text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Rozmiar czcionki:</span>
              {(['normal', 'large', 'xlarge'] as const).map(fs => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => setFontSize(fs)}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer transition ${
                    fontSize === fs 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-bold'
                  }`}
                >
                  {fs === 'normal' ? 'Normalna' : fs === 'large' ? 'Duża' : 'B. Duża'}
                </button>
              ))}
            </div>

            {/* Rotation Speed */}
            <div className="flex items-center gap-1">
              <span className={`font-bold uppercase text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Rotacja:</span>
              {[5, 8, 10, 15, 20].map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setRotationIntervalSec(sec)}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer transition ${
                    rotationIntervalSec === sec 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-bold'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Simulation mode */}
            <div className={`flex items-center gap-2 border-l pl-4 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              <label className={`flex items-center gap-1 font-bold cursor-pointer ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                <input
                  type="checkbox"
                  checked={isSimulatingTime}
                  onChange={e => setIsSimulatingTime(e.target.checked)}
                  className="rounded text-amber-500 w-3.5 h-3.5"
                />
                <span>Testuj inną godzinę:</span>
              </label>

              {isSimulatingTime && (
                <div className="flex items-center gap-2">
                  <select
                    value={simulatedDayIdx}
                    onChange={e => setSimulatedDayIdx(Number(e.target.value))}
                    className={`text-xs rounded px-2 py-1 border font-medium ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs'
                    }`}
                  >
                    {DAYS_NAMES.map((d, idx) => (
                      <option key={d} value={idx}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={simulatedHourIdx}
                    onChange={e => setSimulatedHourIdx(Number(e.target.value))}
                    className={`text-xs rounded px-2 py-1 border font-medium ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs'
                    }`}
                  >
                    {hoursList.map((h, idx) => (
                      <option key={h.num} value={idx}>Lekcja {h.num} ({h.start} – {h.end})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Announcement Editor from settings */}
            <div className={`flex items-center gap-2 border-l pl-4 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              <span className={`font-bold uppercase text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Pasek ogłoszeń:</span>
              <button
                type="button"
                onClick={handleOpenAnnouncementEditor}
                className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                  isDark 
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border-amber-500/30' 
                    : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 font-bold'
                }`}
                title="Edytuj treść paska komunikatów na dole ekranu"
              >
                <Edit3 size={12} />
                <span>Edytuj komunikat</span>
              </button>
            </div>

            {/* Hide empty classes / okienka toggle */}
            <div className={`flex items-center gap-1 border-l pl-4 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              <span className={`font-bold uppercase text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Okienka i brak zajęć:</span>
              <button
                type="button"
                onClick={() => toggleHideEmptyClasses(true)}
                className={`px-2 py-1 rounded-md font-bold cursor-pointer transition ${
                  hideEmptyClasses 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-bold'
                }`}
                title="Nie wyświetla klas, które w danej godzinie nie mają zajęć lub mają okienko"
              >
                Ukrywaj (tylko lekcje)
              </button>
              <button
                type="button"
                onClick={() => toggleHideEmptyClasses(false)}
                className={`px-2 py-1 rounded-md font-bold cursor-pointer transition ${
                  !hideEmptyClasses 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 font-bold'
                }`}
                title="Pokaż wszystkie klasy, w tym okienka i brak lekcji"
              >
                Pokaż wszystkie
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSettingsDrawer(false)}
            className={`text-xs font-bold cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-700 hover:text-slate-950 font-bold'}`}
          >
            Zamknij pasek
          </button>
        </div>
      )}

      {/* ── MAIN DISPLAY AREA ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
        
        {/* ======================================================== */}
        {/* MODE 1: LIVE HALL BOARD ("TERAZ I ZA CHWILĘ")            */}
        {/* ======================================================== */}
        {displayMode === 'live' && (
          <div className="h-full flex flex-col gap-4">
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
              {/* Left 3 columns: Classes Tiles */}
              <div className="lg:col-span-3 flex flex-col min-h-0">
                <div className={`flex items-center justify-between pb-2 mb-2 border-b flex-wrap gap-2 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                      <Layers size={16} />
                      <span>
                        Rozkład oddziałów w tej chwili ({classesToDisplay.length}
                        {hideEmptyClasses && classesToDisplay.length !== pl.classes.length ? ` z ${pl.classes.length}` : ''} klas)
                      </span>
                    </h2>
                    {hideEmptyClasses && classesToDisplay.length < pl.classes.length && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      }`}>
                        Ukryto {pl.classes.length - classesToDisplay.length} bez zajęć / okienka
                      </span>
                    )}
                  </div>

                  <div className={`flex items-center gap-2 sm:gap-3 text-xs font-bold flex-wrap ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                    <button
                      type="button"
                      onClick={() => toggleHideEmptyClasses()}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                        hideEmptyClasses 
                          ? (isDark ? 'bg-indigo-600/25 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/35' : 'bg-indigo-100 text-indigo-950 border-indigo-300 hover:bg-indigo-200 font-black')
                          : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 hover:text-slate-950 font-bold')
                      }`}
                      title="Przełącz ukrywanie klas, które w danej godzinie nie mają zajęć lub mają okienko"
                    >
                      {hideEmptyClasses ? <EyeOff size={13} className={isDark ? 'text-indigo-400' : 'text-indigo-700'} /> : <Eye size={13} className={isDark ? 'text-slate-400' : 'text-slate-700'} />}
                      <span>{hideEmptyClasses ? 'Tylko z lekcjami' : 'Pokaż wszystkie'}</span>
                    </button>

                    <div>
                      Dzień: <span className={`font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>{bellStatus.dayName}</span> · Lekcja {hoursList[liveReferenceHourIdx]?.num || bellStatus.currentHour?.num || 1} {bellStatus.isBreak ? '(za chwilę)' : ''}
                    </div>
                  </div>
                </div>

                {classesToDisplay.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 my-auto ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                      <Clock size={24} />
                    </div>
                    <div className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      Brak zaplanowanych lekcji w tej godzinie
                    </div>
                    <p className={`text-xs max-w-md ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                      Żadna z {pl.classes.length} klas nie ma w tej chwili zajęć w planie (koniec lekcji lub okienko).
                    </p>
                    {hideEmptyClasses && (
                      <button
                        type="button"
                        onClick={() => toggleHideEmptyClasses(false)}
                        className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        Pokaż wszystkie klasy ({pl.classes.length})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto pr-1">
                    {classesToDisplay.map(({ cls, currentLesson, nextLesson }) => {
                      return (
                        <div
                          key={cls.id}
                          className={`p-3 rounded-2xl border flex flex-col justify-between transition shadow-md ${
                            isDark 
                              ? 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50' 
                              : 'bg-white border-slate-300 hover:border-indigo-400 shadow-sm'
                          }`}
                        >
                          {/* Class title header */}
                          <div className={`flex items-center justify-between pb-1.5 mb-1.5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                            <span className={`${fontStyles.cardHeader} font-mono tracking-tight ${isDark ? 'text-indigo-400' : 'text-indigo-900 font-black'}`}>
                              {cls.name}
                            </span>
                            {currentLesson?.room && (
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono border ${
                                isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-100 text-indigo-950 border-indigo-300'
                              }`}>
                                s. {currentLesson.room}
                              </span>
                            )}
                          </div>

                          {/* Current lesson */}
                          <div className="mb-2">
                            <div className={`text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${bellStatus.isBreak ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                              <span>{bellStatus.isBreak ? 'Po dzwonku:' : 'Teraz:'}</span>
                            </div>
                            {currentLesson ? (
                              <div className="mt-0.5">
                                <div className={`${fontStyles.body} truncate ${isDark ? 'text-white' : 'text-slate-950 font-black'}`} title={currentLesson.subject}>
                                  {currentLesson.subject}
                                </div>
                                <div className={`text-xs font-bold flex items-center justify-between mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                                  <span>{currentLesson.teacher ? `prof. ${currentLesson.teacher}` : ''}</span>
                                  {currentLesson.isGroup && <span className={`text-[9px] uppercase font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-900 bg-indigo-50 px-1 rounded'}`}>[grupa]</span>}
                                </div>
                              </div>
                            ) : (
                              <div className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded border ${isDark ? 'text-slate-400 bg-slate-800/40 border-slate-700/50 italic' : 'text-slate-800 bg-slate-100 border-slate-300'}`}>
                                Brak zajęć / Okienko
                              </div>
                            )}
                          </div>

                          {/* Next lesson */}
                          <div className={`pt-1.5 border-t text-xs ${isDark ? 'border-slate-800/40' : 'border-slate-200'}`}>
                            <div className={`text-[9px] font-black uppercase flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                              <ArrowRight size={10} className={isDark ? 'text-slate-400' : 'text-slate-700'} />
                              <span>{bellStatus.isBreak ? 'Kolejna lekcja:' : 'Za chwilę:'}</span>
                            </div>
                            {nextLesson ? (
                              <div className={`text-[11.5px] truncate mt-0.5 font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>
                                <span className="truncate">{nextLesson.subject}</span>
                                <span className={`font-mono shrink-0 ml-1 font-bold ${isDark ? 'text-slate-400' : 'text-indigo-950 bg-indigo-50 px-1 rounded border border-indigo-200'}`}>
                                  {nextLesson.room ? `s.${nextLesson.room}` : ''}
                                </span>
                              </div>
                            ) : (
                              <div className={`text-[10.5px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded border ${isDark ? 'text-slate-400 bg-slate-800/40 border-slate-700/50 italic' : 'text-slate-800 bg-slate-100 border-slate-300'}`}>
                                Koniec zajęć
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right column: Duties & Free Rooms */}
              <div className="flex flex-col gap-4 overflow-y-auto">
                {/* Active Duties on Break */}
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                  <div className={`flex items-center gap-2 pb-2 mb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <Shield size={16} className={isDark ? 'text-amber-400' : 'text-amber-700'} />
                    <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                      Dyżury Nauczycielskie
                    </h3>
                  </div>

                  {activeDuties.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeDuties.map((d, i) => (
                        <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-xl border ${
                          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-amber-50 border-amber-300 shadow-xs'
                        }`}>
                          <div className={`font-bold truncate pr-2 ${isDark ? 'text-slate-200' : 'text-slate-950'}`}>{d.placeName}</div>
                          <span className={`font-mono font-black px-2 py-0.5 rounded shrink-0 border ${
                            isDark ? 'text-amber-300 bg-amber-950/60 border-amber-800' : 'text-amber-950 bg-amber-200 border-amber-400 font-black'
                          }`}>
                            {d.teacherAbbr}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-xs p-3 text-center ${isDark ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                      Brak zaplanowanych dyżurów w tym czasie.
                    </div>
                  )}
                </div>

                {/* Free Classrooms */}
                <div className={`p-4 rounded-2xl border flex-1 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                  <div className={`flex items-center gap-2 pb-2 mb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <MapPin size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-700'} />
                    <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                      Wolne sale w tej godzinie
                    </h3>
                  </div>

                  {freeRoomsInCurrentHour.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {freeRoomsInCurrentHour.map(r => (
                        <div key={r.id} className={`p-2 rounded-xl text-center border ${
                          isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-300 shadow-xs'
                        }`}>
                          <div className={`font-mono font-black text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>{r.name}</div>
                          <div className={`text-[9.5px] font-bold truncate ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>{r.desc || 'Ogólna'}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-xs p-3 text-center ${isDark ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                      Wszystkie sale są aktualnie zajęte.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* MODE 2: AUTO-CAROUSEL OF CLASSES                         */}
        {/* ======================================================== */}
        {displayMode === 'carousel' && currentCarouselClass && (
          <div className="h-full flex flex-col justify-between">
            {/* Class Carousel Header */}
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <div className="flex items-center gap-4">
                <div className="px-4 py-1.5 rounded-2xl bg-indigo-600 text-white font-mono font-black text-2xl shadow-lg">
                  {currentCarouselClass.name}
                </div>
                <div>
                  <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Tygodniowy Plan Zajęć Klasy {currentCarouselClass.name}
                  </h2>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    Oddział {carouselClassIdx + 1} z {pl.classes.length} · Automatyczna rotacja co {rotationIntervalSec}s
                  </p>
                </div>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCarouselClassIdx(prev => (prev - 1 + pl.classes.length) % pl.classes.length);
                    setProgressPercent(0);
                  }}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-100 shadow-xs font-bold'
                  }`}
                  title="Poprzednia klasa (Strzałka w lewo)"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-3 py-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    isPaused 
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md' 
                      : isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs font-bold'
                  }`}
                  title={isPaused ? 'Wznów rotację (Spacja)' : 'Wstrzymaj rotację (Spacja)'}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  <span>{isPaused ? 'Pauza' : 'Rotacja'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCarouselClassIdx(prev => (prev + 1) % pl.classes.length);
                    setProgressPercent(0);
                  }}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-100 shadow-xs font-bold'
                  }`}
                  title="Następna klasa (Strzałka w prawo)"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Weekly Timetable Grid */}
            <div className={`flex-1 overflow-hidden border rounded-2xl flex flex-col ${
              isDark ? 'border-slate-800 bg-slate-900/60 shadow-xl' : 'border-slate-300 bg-white shadow-sm'
            }`}>
              <table className="w-full h-full border-collapse text-left">
                <thead>
                  <tr className={`uppercase font-black text-center text-xs ${
                    isDark ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-950 border-b border-slate-400'
                  }`}>
                    <th className={`p-3 border-b border-r w-24 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>Godz</th>
                    {DAYS_NAMES.map((d, dIdx) => (
                      <th 
                        key={d} 
                        className={`p-3 border-b border-r text-center ${isDark ? 'border-slate-800' : 'border-slate-300'} ${
                          dIdx === bellStatus.dayIdx ? (isDark ? 'bg-indigo-950/80 text-indigo-300' : 'bg-indigo-100 text-indigo-950 font-black') : ''
                        }`}
                      >
                        <span>{d}</span>
                        {dIdx === bellStatus.dayIdx && (
                          <span className={`block text-[9px] font-mono font-black mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Dzisiaj</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {hoursList.map((hour, hIdx) => {
                    const isCurrentHourRow = hIdx === bellStatus.currentHourIdx;

                    return (
                      <tr 
                        key={hour.num} 
                        className={`border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'} ${
                          isCurrentHourRow 
                            ? (isDark ? 'bg-indigo-950/30' : 'bg-indigo-50/70') 
                            : (isDark ? 'hover:bg-slate-850/40' : 'hover:bg-slate-50')
                        }`}
                      >
                        {/* Hour details */}
                        <td className={`p-2 border-r text-center font-mono ${
                          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-slate-100'
                        }`}>
                          <span className={`text-sm font-black block ${isDark ? 'text-white' : 'text-slate-950'}`}>{hour.num}</span>
                          <span className={`text-[9px] block font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{hour.start}–{hour.end}</span>
                        </td>

                        {/* Day cells 0..4 */}
                        {[0, 1, 2, 3, 4].map(dayIdx => {
                          const lesson = getClassLessonInfo(currentCarouselClass.id, dayIdx, hIdx);
                          const isNowSlot = dayIdx === bellStatus.dayIdx && isCurrentHourRow;

                          if (!lesson) {
                            return (
                              <td key={dayIdx} className={`p-2 border-r text-center ${isDark ? 'border-slate-800/40' : 'border-slate-200'}`}>
                                <span className={`font-bold select-none ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>—</span>
                              </td>
                            );
                          }

                          return (
                            <td 
                              key={dayIdx} 
                              className={`p-2.5 border-r align-top ${isDark ? 'border-slate-800' : 'border-slate-200'} ${
                                isNowSlot ? (isDark ? 'bg-emerald-950/40 ring-2 ring-emerald-500 ring-inset' : 'bg-emerald-50 ring-2 ring-emerald-600 ring-inset') : ''
                              }`}
                            >
                              <div className="flex flex-col justify-between h-full">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`font-black text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                    {lesson.subject}
                                  </span>
                                  {isNowSlot && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[8px] uppercase">
                                      Teraz
                                    </span>
                                  )}
                                </div>

                                <div className={`flex items-center justify-between text-xs font-bold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                                  <span>{lesson.teacher ? `prof. ${lesson.teacher}` : ''}</span>
                                  {lesson.room && (
                                    <span className={`font-mono px-1.5 py-0.5 rounded text-[10.5px] border font-black ${
                                      isDark ? 'text-indigo-300 bg-indigo-950 border-indigo-800' : 'text-indigo-950 bg-indigo-100 border-indigo-300'
                                    }`}>
                                      s.{lesson.room}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Carousel Progress Bar */}
            <div className="mt-3">
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`}>
                <div 
                  className="h-full bg-indigo-600 transition-all duration-100 ease-linear rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE 3: ROOMS KIOSK                                      */}
        {/* ======================================================== */}
        {displayMode === 'rooms' && (
          <div className="h-full flex flex-col">
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-600 text-white shadow-md">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Obłożenie Gabinetów i Sal Lekcyjnych
                  </h2>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    Dzień: {bellStatus.dayName} · {pl.rooms.length} sal
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {pl.rooms.map(room => {
                  let activeClassInRoom: string | null = null;
                  let activeSubjInRoom: string | null = null;
                  let activeTeacherInRoom: string | null = null;

                  pl.classes.forEach(c => {
                    const l = getClassLessonInfo(c.id, bellStatus.dayIdx, bellStatus.currentHourIdx);
                    if (l && l.room && l.room.toLowerCase().trim() === room.name.toLowerCase().trim()) {
                      activeClassInRoom = c.name;
                      activeSubjInRoom = l.subject;
                      activeTeacherInRoom = l.teacher;
                    }
                  });

                  const isOccupied = !!activeClassInRoom;

                  return (
                    <div
                      key={room.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                        isOccupied 
                          ? (isDark ? 'bg-slate-900 border-indigo-500/60 shadow-md' : 'bg-white border-indigo-300 shadow-sm')
                          : (isDark ? 'bg-slate-950/60 border-slate-800 opacity-75' : 'bg-white border-slate-300 shadow-xs')
                      }`}
                    >
                      <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <span className={`font-mono font-black text-base ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {room.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                          isOccupied 
                            ? 'bg-indigo-600 text-white' 
                            : (isDark ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-950 border border-emerald-400')
                        }`}>
                          {isOccupied ? 'Zajęta' : 'Wolna'}
                        </span>
                      </div>

                      <div className="py-2">
                        {isOccupied ? (
                          <>
                            <div className={`text-sm font-black ${isDark ? 'text-indigo-300' : 'text-indigo-950'}`}>
                              Klasa {activeClassInRoom}
                            </div>
                            <div className={`text-xs truncate mt-0.5 font-bold ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>
                              {activeSubjInRoom}
                            </div>
                            <div className={`text-[11px] mt-0.5 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                              prof. {activeTeacherInRoom}
                            </div>
                          </>
                        ) : (
                          <div className={`text-xs font-bold py-2 inline-block px-2 rounded border ${isDark ? 'text-slate-500 italic' : 'text-slate-800 bg-slate-100 border-slate-300'}`}>
                            Brak zaplanowanych zajęć
                          </div>
                        )}
                      </div>

                      <div className={`pt-2 border-t text-[10px] font-bold truncate ${
                        isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-200 text-slate-700'
                      }`}>
                        {room.desc || 'Sala ogólna'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM LIVE ANNOUNCEMENT TICKER (MARQUEE) ── */}
      <div className={`px-3 sm:px-4 py-2 border-t shrink-0 flex items-center justify-between gap-2 sm:gap-3 text-xs ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-900 shadow-lg'
      }`}>
        {/* Left Badge: clickable on tablet */}
        <button
          type="button"
          onClick={handleOpenAnnouncementEditor}
          className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-[11px] uppercase tracking-wider transition cursor-pointer shadow-xs"
          title="Dotknij, aby edytować komunikat szkoły"
        >
          <Volume2 size={13} className="shrink-0" />
          <span className="leading-none">Komunikaty Szkoły:</span>
        </button>

        {/* Center: Marquee ticker text - tapping directly on tablet opens editor */}
        <div
          onClick={handleOpenAnnouncementEditor}
          className={`flex-1 overflow-hidden cursor-pointer group py-1 px-2 rounded-lg transition flex items-center min-w-0 ${
            isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'
          }`}
          title="Dotknij lub kliknij, aby zmienić treść komunikatu szkoły"
        >
          <div className={`marquee font-bold transition truncate ${
            isDark ? 'text-slate-200 group-hover:text-amber-300' : 'text-slate-950 font-extrabold group-hover:text-amber-700'
          }`}>
            {announcementText}
          </div>
        </div>

        {/* Right Action: Touch-friendly large Edit Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAnnouncementEditor}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg active:scale-95 border font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border-slate-700' 
                : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 font-black'
            }`}
            title="Edytuj treść paska ogłoszeń na tablecie lub komputerze"
          >
            <Edit3 size={14} className={isDark ? 'text-amber-400 shrink-0' : 'text-amber-800 shrink-0'} />
            <span className="font-bold">Edytuj</span>
          </button>

          <span className={`text-[10px] font-medium hidden md:inline ${isDark ? 'text-slate-500' : 'text-slate-700 font-bold'}`}>
            Sterowanie: <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-400 text-slate-950 font-bold'}`}>Spacja</kbd> (pauza) · <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-400 text-slate-950 font-bold'}`}>F</kbd> (ekran) · <kbd className={`px-1 py-0.5 rounded border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-400 text-slate-950 font-bold'}`}>Esc</kbd> (wyjście)
          </span>
        </div>
      </div>

      {/* ── MODAL EDYCJI KOMUNIKATU SZKOŁY DLA TABLETÓW I EKRANÓW DOTYKOWYCH ── */}
      {showAnnouncementModal && (
        <div 
          className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setShowAnnouncementModal(false)}
        >
          <div 
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                    Edycja Paska Komunikatów Szkoły
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Treść przewijana na żywo na dole ekranu TV i rzutnika w holu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Zamknij bez zapisywania"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content / Textarea */}
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Wpisz treść komunikatu:</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {tempAnnouncement.length} znaków
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={tempAnnouncement}
                  onChange={e => setTempAnnouncement(e.target.value)}
                  placeholder="np. 📢 Szczęśliwy numerek: 14 · Zebranie z rodzicami o godz. 17:00..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none leading-relaxed transition shadow-inner"
                  autoFocus
                />
              </div>

              {/* Szybkie szablony (One-tap pills) */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Szybkie szablony (dotknij na tablecie, aby wstawić):</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ANNOUNCEMENT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTempAnnouncement(prev => {
                          const trimmed = prev.trim();
                          if (!trimmed || trimmed === DEFAULT_ANNOUNCEMENT) {
                            return preset.text;
                          }
                          return `${trimmed} · ${preset.text}`;
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempAnnouncement(DEFAULT_ANNOUNCEMENT)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Przywróć domyślny komunikat powitalny"
                >
                  <RotateCcw size={13} />
                  <span>Domyślny</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTempAnnouncement('')}
                  className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold transition cursor-pointer"
                >
                  Wyczyść
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAnnouncement()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-950 flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>Zapisz i wyświetl na TV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
