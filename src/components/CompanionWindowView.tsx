import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AppState, SchedData, ClassRoom, Subject, Teacher, Class, PlanVariant, Hour 
} from '../types';
import { 
  dualScreenService, DualScreenMessage, ScreenInteractionPayload 
} from '../services/dualScreenService';
import { 
  STORAGE_KEYS, getStorageItemSync 
} from '../services/dbStorage';
import { 
  isSportsFacility 
} from './PlanKlas';
import PlachtaDyrektorska from './PlachtaDyrektorska';
import { 
  Maximize2, Minimize2, RefreshCw, X, Monitor, Layers, MapPin, Shield, Printer, 
  BarChart2, Sparkles, Check, Filter, Search, CheckCircle2, AlertCircle, 
  DoorOpen, Dumbbell, HeartPulse, Building2, Eye, EyeOff, Info, ArrowRight
} from 'lucide-react';

interface CompanionWindowViewProps {
  initialAppState?: AppState;
  initialSchedData?: SchedData;
  initialActiveVariant?: PlanVariant | null;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export const isNIRoom = (room: ClassRoom | undefined | null): boolean => {
  if (!room) return false;
  if (room.type === 'special' || room.type === 'ni' || room.type === 'support' || room.type === 'terapia') return true;
  const name = (room.name || '').toLowerCase().trim();
  const desc = (room.desc || '').toLowerCase().trim();
  const keywords = ['ni', 'rewa', 'rewalidacja', 'terap', 'terapia', 'logoped', 'psycholog', 'pedagog', 'wspier', 'wsparcie', 'integrac', 'korekcyjn', 'wycisz', 'indywidual'];
  return keywords.some(kw => name.includes(kw) || desc.includes(kw));
};

export default function CompanionWindowView({
  initialAppState,
  initialSchedData,
  initialActiveVariant
}: CompanionWindowViewProps) {
  // ── STATE FROM STORAGE OR SYNC ──
  const [appState, setAppState] = useState<AppState>(() => {
    if (initialAppState) return initialAppState;
    const saved = getStorageItemSync<AppState>(STORAGE_KEYS.APP_STATE);
    return saved || ({} as AppState);
  });

  const [schedData, setSchedData] = useState<SchedData>(() => {
    if (initialSchedData) return initialSchedData;
    const saved = getStorageItemSync<SchedData>(STORAGE_KEYS.SCHED_DATA);
    return saved || {};
  });

  const [activeVariant, setActiveVariant] = useState<PlanVariant | null>(initialActiveVariant || null);

  // Active view tab on Companion Screen
  const [activeCompanionTab, setActiveCompanionTab] = useState<
    'rooms_matrix' | 'plachta' | 'building_map' | 'duties' | 'print_preview' | 'school_stats'
  >('rooms_matrix');

  // Connection & Handshake status
  const [isConnectedToMaster, setIsConnectedToMaster] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Interaction / Live Slot highlight sent from Main Window
  const [highlightedSlot, setHighlightedSlot] = useState<ScreenInteractionPayload | null>(null);
  const [lastAssignedRoomAlert, setLastAssignedRoomAlert] = useState<string | null>(null);

  // Rooms Matrix Filter State (as explicitly requested by user)
  const [filterGeneralRooms, setFilterGeneralRooms] = useState(true);
  const [filterSportsRooms, setFilterSportsRooms] = useState(true);
  const [filterNIRooms, setFilterNIRooms] = useState(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [onlyFreeRoomsInHighlightedSlot, setOnlyFreeRoomsInHighlightedSlot] = useState(false);

  // ── DUAL SCREEN MESSAGING & SYNC ──
  useEffect(() => {
    // 1. Initial Handshake to ask Master Window for latest live data
    dualScreenService.sendMessage({
      type: 'HANDSHAKE',
      timestamp: Date.now()
    });

    // 2. Subscribe to incoming messages
    const unsubscribe = dualScreenService.subscribe((msg: DualScreenMessage) => {
      switch (msg.type) {
        case 'HANDSHAKE_ACK':
        case 'STATE_SYNC':
          if (msg.payload?.appState) setAppState(msg.payload.appState);
          if (msg.payload?.schedData) setSchedData(msg.payload.schedData);
          if (msg.payload?.activeVariant) setActiveVariant(msg.payload.activeVariant);
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          break;

        case 'TAB_CHANGE':
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          // Auto-adapt companion view to the active tab in main window
          if (msg.payload?.tab) {
            const masterTab = msg.payload.tab;
            if (masterTab === 'plan_klas') setActiveCompanionTab('rooms_matrix');
            else if (masterTab === 'plan_sal') setActiveCompanionTab('building_map');
            else if (masterTab === 'dyzury') setActiveCompanionTab('duties');
            else if (masterTab === 'wydruki') setActiveCompanionTab('print_preview');
            else if (masterTab === 'kreator') setActiveCompanionTab('school_stats');
          }
          break;

        case 'PLAN_KLAS_HIGHLIGHT':
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          setHighlightedSlot(msg.payload || null);
          break;

        case 'PING':
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          dualScreenService.sendMessage({
            type: 'PONG',
            timestamp: Date.now()
          });
          break;

        case 'PONG':
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          break;
      }
    });

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      dualScreenService.sendMessage({
        type: 'PING',
        timestamp: Date.now()
      });
      // Check if master window is responsive
      if (Date.now() - lastHeartbeat > 8000) {
        setIsConnectedToMaster(false);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pingInterval);
    };
  }, [lastHeartbeat]);

  // Handle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Re-read storage manually if requested
  const handleManualRefresh = () => {
    const savedState = getStorageItemSync<AppState>(STORAGE_KEYS.APP_STATE);
    const savedSched = getStorageItemSync<SchedData>(STORAGE_KEYS.SCHED_DATA);
    if (savedState) setAppState(savedState);
    if (savedSched) setSchedData(savedSched);
    dualScreenService.sendMessage({
      type: 'HANDSHAKE',
      timestamp: Date.now()
    });
  };

  // ── ROOMS & ASSIGNMENTS LOOKUPS ──
  const pl = appState?.planLekcji || { classes: [], teachers: [], subjects: [], rooms: [], assignments: [], lessons: {}, hours: [] };
  const allRooms = pl.rooms || [];
  const hoursList: Hour[] = (pl.hours && pl.hours.length > 0) ? pl.hours : [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:50', end: '11:35' },
    { num: 5, start: '11:45', end: '12:30' },
    { num: 6, start: '12:40', end: '13:25' },
    { num: 7, start: '13:35', end: '14:20' },
    { num: 8, start: '14:25', end: '15:10' },
    { num: 9, start: '15:15', end: '16:00' },
  ];

  const classesMap = useMemo(() => new Map((pl.classes || []).map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map((pl.teachers || []).map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map((pl.subjects || []).map(s => [s.id, s])), [pl.subjects]);
  const assignmentsMap = useMemo(() => new Map((pl.assignments || []).map(a => [a.id, a])), [pl.assignments]);

  // Categorize rooms
  const categorizedRooms = useMemo(() => {
    const general: ClassRoom[] = [];
    const sport: ClassRoom[] = [];
    const ni: ClassRoom[] = [];

    allRooms.forEach(r => {
      if (isSportsFacility(r)) {
        sport.push(r);
      } else if (isNIRoom(r)) {
        ni.push(r);
      } else {
        general.push(r);
      }
    });

    return { general, sport, ni };
  }, [allRooms]);

  // Filtered rooms based on active toggles and search query
  const filteredRooms = useMemo(() => {
    let list: (ClassRoom & { categoryType: 'general' | 'sport' | 'ni' })[] = [];

    if (filterGeneralRooms) {
      list.push(...categorizedRooms.general.map(r => ({ ...r, categoryType: 'general' as const })));
    }
    if (filterSportsRooms) {
      list.push(...categorizedRooms.sport.map(r => ({ ...r, categoryType: 'sport' as const })));
    }
    if (filterNIRooms) {
      list.push(...categorizedRooms.ni.map(r => ({ ...r, categoryType: 'ni' as const })));
    }

    if (roomSearchQuery.trim()) {
      const q = roomSearchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(q) || 
        (r.desc || '').toLowerCase().includes(q)
      );
    }

    // Sort logically
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [categorizedRooms, filterGeneralRooms, filterSportsRooms, filterNIRooms, roomSearchQuery]);

  // Map of room occupation for every [dayIndex][hourIndex][roomId]
  const roomOccupancyMap = useMemo(() => {
    const map = new Map<string, {
      className: string;
      classId: string;
      subjectName: string;
      subjectShort: string;
      subjectColor: string;
      teacherAbbr: string;
      isConflict?: boolean;
    }>();

    // 1. From appState.planLekcji.lessons
    if (pl.lessons) {
      Object.entries(pl.lessons).forEach(([key, lesson]) => {
        const parts = key.split('|');
        if (parts.length >= 3) {
          const classId = parts[0];
          const dayIdx = parseInt(parts[1], 10);
          const hourIdx = parseInt(parts[2], 10);

          const asg = assignmentsMap.get(lesson.assignmentId);
          if (asg && asg.roomId) {
            const cls = classesMap.get(classId);
            const subj = subjectsMap.get(asg.subjectId);
            const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;

            const roomKey = `${dayIdx}-${hourIdx}-${asg.roomId}`;
            map.set(roomKey, {
              className: cls?.name || '?',
              classId,
              subjectName: subj?.name || 'Lekcja',
              subjectShort: subj?.short || subj?.name?.substring(0, 3).toUpperCase() || 'LEK',
              subjectColor: subj?.color || '#3b82f6',
              teacherAbbr: teacher?.abbr || ''
            });
          }
        }
      });
    }

    // 2. Also check schedData for room allocation from Plan Sal
    if (schedData) {
      const yearKey = Object.keys(schedData)[0] || appState?.yearLabel;
      const daysObj = schedData[yearKey];
      if (daysObj && typeof daysObj === 'object') {
        Object.entries(daysObj).forEach(([dKey, hoursObj]: [string, any]) => {
          const dIdx = parseInt(dKey, 10);
          if (hoursObj && typeof hoursObj === 'object') {
            Object.entries(hoursObj).forEach(([hKey, roomsObj]: [string, any]) => {
              const hIdx = parseInt(hKey, 10);
              if (roomsObj && typeof roomsObj === 'object') {
                Object.entries(roomsObj).forEach(([rColKey, cell]: [string, any]) => {
                  if (cell && (cell.className || cell.k)) {
                    // Match room column key to room ID or room name
                    const matchedRoom = allRooms.find(r => 
                      rColKey.endsWith(`_${r.name}`) || 
                      rColKey.endsWith(`_${r.id}`) ||
                      r.name === rColKey ||
                      r.id === rColKey
                    );
                    if (matchedRoom) {
                      const roomKey = `${dIdx}-${hIdx}-${matchedRoom.id}`;
                      if (!map.has(roomKey)) {
                        map.set(roomKey, {
                          className: cell.className || cell.k || '?',
                          classId: cell._bridgeMeta?.classId || '',
                          subjectName: cell.subject || cell.p || '',
                          subjectShort: cell.subject ? cell.subject.substring(0, 3).toUpperCase() : '',
                          subjectColor: '#0284c7',
                          teacherAbbr: cell.teacherAbbr || cell.n || ''
                        });
                      }
                    }
                  }
                });
              }
            });
          }
        });
      }
    }

    return map;
  }, [pl.lessons, schedData, assignmentsMap, classesMap, subjectsMap, teachersMap, allRooms, appState?.yearLabel]);

  // Handle assigning room to the currently active slot in Window 1
  const handleAssignRoomToActiveSlot = (room: ClassRoom) => {
    if (!highlightedSlot || highlightedSlot.dayIdx === undefined || highlightedSlot.hourIdx === undefined) {
      alert('W Oknie 1 najpierw wskaż lub wybierz slot lekcyjny w planie klasy.');
      return;
    }

    dualScreenService.sendMessage({
      type: 'ASSIGN_ROOM_CLICK',
      payload: {
        dayIdx: highlightedSlot.dayIdx,
        hourIdx: highlightedSlot.hourIdx,
        classId: highlightedSlot.classId,
        roomId: room.id,
        roomName: room.name
      },
      timestamp: Date.now()
    });

    setLastAssignedRoomAlert(`Wysłano przydział sali: ${room.name} do lekcji w Oknie 1!`);
    setTimeout(() => setLastAssignedRoomAlert(null), 3500);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 font-sans overflow-hidden select-none">
      {/* ── GÓRNY PASEK STATUSU I NAWIGACJI OKNA TOWARZYSZĄCEGO ── */}
      <header className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-md">
        {/* Lewa strona: Identyfikator Ekranu 2 */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/25 border border-indigo-500/40 rounded-lg text-indigo-300 font-black text-xs">
            <Monitor size={15} className="text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">EKRAN 2</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm text-white tracking-tight truncate">
                SalePlan Pro • Monitor Towarzyszący
              </h1>
              {isConnectedToMaster ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Połączono z Oknem 1
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Oczekiwanie na sygnał
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {appState?.school?.name || 'Szkoła'} • {appState?.yearLabel || 'Rok szkolny'}
            </p>
          </div>
        </div>

        {/* Środek: Selektor widoków drugiego ekranu */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCompanionTab('rooms_matrix')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'rooms_matrix'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Dedykowana matryca wszystkich sal z podziałem na ogólne, sportowe i NI"
          >
            <DoorOpen size={14} className={activeCompanionTab === 'rooms_matrix' ? 'text-white' : 'text-blue-400'} />
            <span>Matryca Sal (Plan Klas)</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('plachta')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'plachta'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Pełna Płachta Dyrektorska całego tygodnia"
          >
            <Layers size={14} className={activeCompanionTab === 'plachta' ? 'text-white' : 'text-indigo-400'} />
            <span>Płachta Dyrektorska</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('building_map')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'building_map'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Rzut kondygnacji i obłożenie sal (Etap 2: Plan Sal)"
          >
            <Building2 size={14} className={activeCompanionTab === 'building_map' ? 'text-white' : 'text-teal-400'} />
            <span>Rzut Kondygnacji (Plan Sal)</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('duties')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'duties'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Strefy dyżurów i okienka nauczycieli (Etap 3: Dyżury)"
          >
            <Shield size={14} className={activeCompanionTab === 'duties' ? 'text-white' : 'text-purple-400'} />
            <span>Strefy Dyżurów</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('school_stats')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'school_stats'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Bilans etatów i pensum nauczycieli (Kreator)"
          >
            <Sparkles size={14} className={activeCompanionTab === 'school_stats' ? 'text-white' : 'text-amber-400'} />
            <span>Bilans Szkoły (Kreator)</span>
          </button>
        </div>

        {/* Prawa strona: Akcje systemowe */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleManualRefresh}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer"
            title="Wymuś synchronizację stanu z bazy danych"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer"
            title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran na monitorze zewnętrznym"}
          >
            {isFullscreen ? <Minimize2 size={14} className="text-amber-400" /> : <Maximize2 size={14} />}
          </button>

          <button
            onClick={() => window.close()}
            className="p-1.5 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 hover:border-red-900/40 transition cursor-pointer"
            title="Zamknij drugie okno i wróć do trybu 1 ekranu"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* ── POWIADOMIENIE O PRZYPISANIU SALI ── */}
      {lastAssignedRoomAlert && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-lg transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{lastAssignedRoomAlert}</span>
          </div>
          <button onClick={() => setLastAssignedRoomAlert(null)} className="text-white hover:opacity-80">✕</button>
        </div>
      )}

      {/* ── GŁÓWNA STREFA ZAWARTOŚCI EKRANU 2 ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
        
        {/* ======================================================== */}
        {/* WIDOK 1: MATRYCA SAL (PLAN KLAS) — DOKŁADNIE WG ŻYCZENIA */}
        {/* ======================================================== */}
        {activeCompanionTab === 'rooms_matrix' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pasek filtrów sal i synchronizacji aktywnego slotu */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Grupa 1: Przełączniki kategorii sal (Ogólne, Sportowe, NI) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1 mr-1">
                  <Filter size={12} className="text-blue-400" /> Filtry sal:
                </span>

                {/* 1. Sale Ogólne */}
                <button
                  onClick={() => setFilterGeneralRooms(!filterGeneralRooms)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    filterGeneralRooms
                      ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="Przełącz wyświetlanie sal ogólnych i pracowni przedmiotowych"
                >
                  <DoorOpen size={13} className={filterGeneralRooms ? 'text-blue-400' : 'text-slate-600'} />
                  <span>Sale ogólne ({categorizedRooms.general.length})</span>
                  <span className={`text-[9px] px-1 rounded-full font-mono ${filterGeneralRooms ? 'bg-blue-500/30' : 'bg-slate-800'}`}>
                    {filterGeneralRooms ? 'WŁ' : 'WYŁ'}
                  </span>
                </button>

                {/* 2. Sale Sportowe */}
                <button
                  onClick={() => setFilterSportsRooms(!filterSportsRooms)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    filterSportsRooms
                      ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="Przełącz wyświetlanie hal sportowych, sal gimnastycznych, basenu i boisk"
                >
                  <Dumbbell size={13} className={filterSportsRooms ? 'text-emerald-400' : 'text-slate-600'} />
                  <span>Sale sportowe ({categorizedRooms.sport.length})</span>
                  <span className={`text-[9px] px-1 rounded-full font-mono ${filterSportsRooms ? 'bg-emerald-500/30' : 'bg-slate-800'}`}>
                    {filterSportsRooms ? 'WŁ' : 'WYŁ'}
                  </span>
                </button>

                {/* 3. Sale Nauczania Indywidualnego i Wsparcia */}
                <button
                  onClick={() => setFilterNIRooms(!filterNIRooms)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    filterNIRooms
                      ? 'bg-purple-600/20 border-purple-500/60 text-purple-300 shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="Przełącz wyświetlanie gabinetów rewalidacji, logopedii, psychologa i sal NI"
                >
                  <HeartPulse size={13} className={filterNIRooms ? 'text-purple-400' : 'text-slate-600'} />
                  <span>Sale NI i wsparcia ({categorizedRooms.ni.length})</span>
                  <span className={`text-[9px] px-1 rounded-full font-mono ${filterNIRooms ? 'bg-purple-500/30' : 'bg-slate-800'}`}>
                    {filterNIRooms ? 'WŁ' : 'WYŁ'}
                  </span>
                </button>
              </div>

              {/* Grupa 2: Dzień tygodnia i wyszukiwarka sali */}
              <div className="flex items-center gap-2">
                {/* Selektor dnia */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-bold">
                  <button
                    onClick={() => setSelectedDayFilter('all')}
                    className={`px-2 py-0.5 rounded transition ${
                      selectedDayFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cały tydzień
                  </button>
                  {DAYS_NAMES.map((dName, dIdx) => (
                    <button
                      key={dIdx}
                      onClick={() => setSelectedDayFilter(dIdx)}
                      className={`px-2 py-0.5 rounded transition ${
                        selectedDayFilter === dIdx ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {dName.substring(0, 2)}
                    </button>
                  ))}
                </div>

                {/* Szybka szukajka sali */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    placeholder="Filtruj gabinet..."
                    className="w-36 pl-7 pr-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* AKTYWNY PASEK INTERAKCJI Z EKRANEM 1 (SLOT SYNC BANNER) */}
            {highlightedSlot && highlightedSlot.dayIdx !== undefined && highlightedSlot.hourIdx !== undefined && (
              <div className="bg-indigo-950/80 border-b border-indigo-500/40 px-4 py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white font-black rounded-md text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Wybrany slot w Oknie 1:
                  </span>
                  <span className="font-extrabold text-indigo-200">
                    {DAYS_NAMES[highlightedSlot.dayIdx]}, godzina {highlightedSlot.hourIdx + 1}
                  </span>
                  {highlightedSlot.className && (
                    <span className="bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      Oddział {highlightedSlot.className}
                    </span>
                  )}
                  {highlightedSlot.subjectShort && (
                    <span className="bg-blue-900/60 border border-blue-700/60 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      Przedmiot: {highlightedSlot.subjectShort}
                    </span>
                  )}
                  {highlightedSlot.teacherAbbr && (
                    <span className="text-slate-400">
                      (Nauczyciel: {highlightedSlot.teacherAbbr})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-indigo-300 font-bold hidden md:inline">
                    👉 Kliknij zieloną wolną salę w tabeli poniżej, aby przypisać ją do tej lekcji
                  </span>
                  <button
                    onClick={() => setHighlightedSlot(null)}
                    className="p-1 text-indigo-300 hover:text-white rounded hover:bg-indigo-800/40 cursor-pointer"
                    title="Ukryj podświetlenie slotu"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TABELA MATRYCY SAL (W STYLU PŁACHTY ZORIENTOWANEJ NA SALE) */}
            <div className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-4">
              {filteredRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 border border-dashed border-slate-800 rounded-xl">
                  <DoorOpen size={36} className="text-slate-600 mb-2" />
                  <span className="text-sm font-bold">Brak sal spełniających kryteria filtrów</span>
                  <span className="text-xs text-slate-500 mt-1">Włącz co najmniej jedną z kategorii sal na pasku u góry.</span>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-xl inline-block min-w-full">
                  <table className="min-w-full border-collapse text-left">
                    {/* NAGŁÓWKI SAL */}
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 sticky top-0 z-20">
                        <th className="p-2 sm:p-2.5 text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-950 border-r border-slate-800 sticky left-0 z-30 min-w-[110px]">
                          Dzień & Godzina
                        </th>
                        {filteredRooms.map(room => (
                          <th 
                            key={room.id}
                            className={`p-2 text-center border-r border-slate-800/80 min-w-[100px] max-w-[130px] select-none ${
                              room.categoryType === 'sport' 
                                ? 'bg-emerald-950/20' 
                                : room.categoryType === 'ni' 
                                ? 'bg-purple-950/20' 
                                : 'bg-slate-950'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-white truncate max-w-full" title={room.name}>
                                {room.name}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                {room.categoryType === 'sport' && (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1 rounded">
                                    ⚽ Sport
                                  </span>
                                )}
                                {room.categoryType === 'ni' && (
                                  <span className="text-[9px] font-bold text-purple-400 bg-purple-950/60 border border-purple-800/60 px-1 rounded">
                                    🧩 NI
                                  </span>
                                )}
                                {room.categoryType === 'general' && (
                                  <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1 rounded">
                                    🏫 Ogólna
                                  </span>
                                )}
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    {/* WIERSZE: DNI I GODZINY LEKCYJNE */}
                    <tbody>
                      {DAYS_NAMES.map((dayName, dayIdx) => {
                        if (selectedDayFilter !== 'all' && selectedDayFilter !== dayIdx) return null;

                        return hoursList.map((hour, hIdx) => {
                          const isCurrentActiveSlot = 
                            highlightedSlot && 
                            highlightedSlot.dayIdx === dayIdx && 
                            highlightedSlot.hourIdx === hIdx;

                          return (
                            <tr 
                              key={`${dayIdx}-${hIdx}`}
                              className={`border-b border-slate-800/60 transition-colors ${
                                isCurrentActiveSlot 
                                  ? 'bg-indigo-950/70 ring-2 ring-indigo-400 relative z-10' 
                                  : hIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'
                              } hover:bg-slate-800/40`}
                            >
                              {/* Kolumna nagłówka wiersza: Dzień + Godzina */}
                              <td className={`p-2 text-xs font-bold border-r border-slate-800 sticky left-0 z-10 select-none ${
                                isCurrentActiveSlot ? 'bg-indigo-900 text-white' : 'bg-slate-950 text-slate-300'
                              }`}>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-indigo-300">{dayName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    g. {hour.num} ({hour.start}-{hour.end})
                                  </span>
                                </div>
                              </td>

                              {/* Komórki sal dla danej godziny */}
                              {filteredRooms.map(room => {
                                const occKey = `${dayIdx}-${hIdx}-${room.id}`;
                                const occ = roomOccupancyMap.get(occKey);

                                if (occ) {
                                  // SALA ZAJĘTA
                                  return (
                                    <td 
                                      key={room.id}
                                      className="p-1 text-center border-r border-slate-800/60 align-middle"
                                    >
                                      <div 
                                        className="p-1.5 rounded-lg border flex flex-col justify-center min-h-[48px] shadow-2xs"
                                        style={{
                                          backgroundColor: `${occ.subjectColor}18`,
                                          borderColor: `${occ.subjectColor}45`
                                        }}
                                        title={`Sala ${room.name} jest ZAJĘTA przez klasę ${occ.className} (${occ.subjectName}, nauczyciel: ${occ.teacherAbbr})`}
                                      >
                                        <div className="flex items-center justify-between gap-1 text-[10px] font-black">
                                          <span className="text-white bg-slate-950/70 px-1 rounded">
                                            {occ.className}
                                          </span>
                                          <span className="text-amber-300 font-mono">
                                            [{occ.subjectShort}]
                                          </span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 truncate mt-0.5 font-medium">
                                          👤 {occ.teacherAbbr || '—'}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }

                                // SALA WOLNA
                                return (
                                  <td 
                                    key={room.id}
                                    className={`p-1 text-center border-r border-slate-800/60 align-middle ${
                                      isCurrentActiveSlot ? 'bg-emerald-950/20' : ''
                                    }`}
                                  >
                                    {isCurrentActiveSlot ? (
                                      <button
                                        onClick={() => handleAssignRoomToActiveSlot(room)}
                                        className="w-full p-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/50 hover:border-emerald-400 rounded-lg text-[10px] font-bold transition flex flex-col items-center justify-center min-h-[48px] cursor-pointer shadow-xs group"
                                        title={`Kliknij, aby przypisać salę ${room.name} do aktywnej lekcji w Oknie 1`}
                                      >
                                        <span className="text-[9px] font-black uppercase text-emerald-400 group-hover:text-white leading-tight">
                                          ✓ Wolna
                                        </span>
                                        <span className="text-[8px] opacity-90 group-hover:underline">
                                          Przypisz salę
                                        </span>
                                      </button>
                                    ) : (
                                      <div 
                                        className="h-full min-h-[48px] rounded flex items-center justify-center text-[10px] text-slate-700 hover:text-slate-400 transition"
                                        title={`Sala ${room.name} jest wolna`}
                                      >
                                        <span className="opacity-40 font-mono text-xs">·</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* WIDOK 2: PŁACHTA DYREKTORSKA (PEŁNY TYDZIEŃ)             */}
        {/* ======================================================== */}
        {activeCompanionTab === 'plachta' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white text-slate-900">
            <PlachtaDyrektorska
              appState={appState}
              schedData={schedData}
              activeVariant={activeVariant}
              isStandaloneModal={true}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* WIDOK 3: RZUT KONDYGNACJI (PLAN SAL)                     */}
        {/* ======================================================== */}
        {activeCompanionTab === 'building_map' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-teal-400" />
                  <h3 className="font-extrabold text-sm text-white">Rozmieszczenie i Obłożenie Sal na Kondygnacjach</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">Liczba sal w szkole: {allRooms.length}</span>
              </div>
              <p className="text-xs text-slate-400">
                Poniższy widok pozwala monitorować rozmieszczenie klas pomiędzy parterem, piętrami oraz skrzydłem sportowym podczas układania Planu Sal (Etap 2).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sekcja Sal Ogólnych */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DoorOpen size={14} /> Sale ogólne & przedmiotowe
                  </span>
                  <span className="text-xs font-mono font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded">
                    {categorizedRooms.general.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {categorizedRooms.general.map(r => (
                    <div key={r.id} className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{r.name}</span>
                      <span className="text-[10px] text-slate-500">{r.desc || 'Gabinet ogólny'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sekcja Sal Sportowych */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Dumbbell size={14} /> Obiekty sportowe
                  </span>
                  <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded">
                    {categorizedRooms.sport.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {categorizedRooms.sport.map(r => (
                    <div key={r.id} className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{r.name}</span>
                      <span className="text-[10px] text-emerald-400">{r.desc || 'Hala/Basen/WF'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sekcja Sal Wsparcia & NI */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={14} /> Gabinety wsparcia & NI
                  </span>
                  <span className="text-xs font-mono font-bold bg-purple-950 text-purple-300 px-2 py-0.5 rounded">
                    {categorizedRooms.ni.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {categorizedRooms.ni.map(r => (
                    <div key={r.id} className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{r.name}</span>
                      <span className="text-[10px] text-purple-400">{r.desc || 'Terapia/Rewalidacja'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* WIDOK 4: STREFY DYŻURÓW                                  */}
        {/* ======================================================== */}
        {activeCompanionTab === 'duties' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-purple-400" />
                <h3 className="font-extrabold text-sm text-white">Inspekcja Stref Dyżurów i Dyspozycyjności Nauczycieli</h3>
              </div>
              <p className="text-xs text-slate-400">
                Wspomaga planowanie opieki na przerwach międzylekcyjnych (Etap 3). W oknie głównym układasz dyżury, a tutaj na bieżąco weryfikujesz, którzy nauczyciele mają okienka lub ułożone lekcje w danej strefie.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pl.teachers.map(t => (
                <div key={t.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-white block">{t.first} {t.last}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Inicjały: {t.abbr}</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded">
                    Pensum: {t.maxHours || 18}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* WIDOK 5: BILANS SZKOŁY (KREATOR)                         */}
        {/* ======================================================== */}
        {activeCompanionTab === 'school_stats' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">Bilans Struktury Szkoły i Etatów (Kreator)</h3>
              </div>
              <p className="text-xs text-slate-400">
                Podsumowanie liczby oddziałów, kadry pedagogicznej, puli sal oraz zdefiniowanych przydziałów w Kreatorze Szkoły.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Liczba Klas</span>
                <span className="text-2xl font-black text-white mt-1 block">{pl.classes.length}</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Nauczyciele</span>
                <span className="text-2xl font-black text-blue-400 mt-1 block">{pl.teachers.length}</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Sale Lekcyjne</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{allRooms.length}</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Przydziały Lekcji</span>
                <span className="text-2xl font-black text-purple-400 mt-1 block">{pl.assignments.length}</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── STOPKA EKRANU 2 ── */}
      <footer className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-slate-500 text-[10px] flex items-center justify-between shrink-0 font-medium">
        <span>SalePlan Pro • Companion Workspace • Submilisekundowa synchronizacja BroadcastChannel</span>
        <div className="flex items-center gap-2">
          <span>Monitor zewnętrzny: <strong>Aktywny</strong></span>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => window.close()} 
            className="text-slate-400 hover:text-red-400 transition cursor-pointer"
          >
            Zamknij okno
          </button>
        </div>
      </footer>
    </div>
  );
}
