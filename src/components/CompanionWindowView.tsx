import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppState, SchedData, ClassRoom, PlanVariant, Hour 
} from '../types';
import { 
  dualScreenService, DualScreenMessage, ScreenInteractionPayload 
} from '../services/dualScreenService';
import { 
  STORAGE_KEYS, getStorageItemSync, setStorageItem 
} from '../services/dbStorage';
import { 
  isSportsFacility 
} from './PlanKlas';
import PlachtaDyrektorska from './PlachtaDyrektorska';
import DualScreen2Kreator from './DualScreen2Kreator';
import DualScreen2PlanKlas from './DualScreen2PlanKlas';
import DualScreen2PlanSal from './DualScreen2PlanSal';
import { 
  Maximize2, Minimize2, RefreshCw, X, Monitor, Layers, 
  Sparkles, Filter, Search, CheckCircle2, 
  DoorOpen, Dumbbell, HeartPulse, Building2, Shield,
  Scan, ZoomIn, ZoomOut, RotateCcw
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
  const [planVariants, setPlanVariants] = useState<PlanVariant[]>(() => {
    const saved = getStorageItemSync<PlanVariant[]>(STORAGE_KEYS.PLAN_VARIANTS);
    return saved || [];
  });

  // Active view tab on Companion Screen
  const [activeCompanionTab, setActiveCompanionTab] = useState<
    'kreator' | 'plan_klas' | 'plan_sal' | 'dyzury' | 'wydruki' | 'statystyki' | 'o_programie' | 'ustawienia_generatorow' | 'rooms_matrix' | 'plachta' | 'building_map' | 'duties' | 'school_stats'
  >(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab') as any;
      if (p) return p;
    }
    return 'plan_klas';
  });

  // Connection & Handshake status
  const [isConnectedToMaster, setIsConnectedToMaster] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Interaction / Live Slot highlight sent from Main Window
  const [highlightedSlot, setHighlightedSlot] = useState<ScreenInteractionPayload | null>(null);
  const [lastAssignedRoomAlert, setLastAssignedRoomAlert] = useState<string | null>(null);

  // Rooms Matrix Filter State
  const [filterGeneralRooms, setFilterGeneralRooms] = useState(true);
  const [filterSportsRooms, setFilterSportsRooms] = useState(true);
  const [filterNIRooms, setFilterNIRooms] = useState(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  const handleUpdateLessons = (newLessons: Record<string, any>) => {
    setAppState(prev => {
      const updated = {
        ...prev,
        planLekcji: {
          ...prev.planLekcji,
          lessons: newLessons
        }
      };
      setStorageItem(STORAGE_KEYS.APP_STATE, updated);
      return updated;
    });
  };

  const handleChangeSchedData = (newSched: SchedData) => {
    setSchedData(newSched);
    setStorageItem(STORAGE_KEYS.SCHED_DATA, newSched);
  };

  const handleVariantCreated = (newVariant: PlanVariant) => {
    setPlanVariants(prev => {
      const updated = [...prev, newVariant];
      setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updated);
      return updated;
    });
  };

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
          if (msg.payload?.planVariants) setPlanVariants(msg.payload.planVariants);
          if (msg.payload?.currentTab) setActiveCompanionTab(msg.payload.currentTab);
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          break;

        case 'TAB_CHANGE':
          setIsConnectedToMaster(true);
          setLastHeartbeat(Date.now());
          // Auto-adapt companion view to the active tab in main window
          if (msg.payload?.tab) {
            setActiveCompanionTab(msg.payload.tab as any);
          }
          break;

        case 'UPDATE_LESSONS':
          if (msg.payload?.lessons) {
            setAppState(prev => ({
              ...prev,
              planLekcji: {
                ...prev.planLekcji,
                lessons: msg.payload.lessons
              }
            }));
          }
          break;

        case 'UPDATE_SCHED_DATA':
          if (msg.payload?.schedData) {
            setSchedData(msg.payload.schedData);
          }
          break;

        case 'CREATE_VARIANT':
          if (msg.payload?.variant) {
            setPlanVariants(prev => {
              const exists = prev.some(v => v.id === msg.payload.variant.id);
              const updated = exists ? prev.map(v => v.id === msg.payload.variant.id ? msg.payload.variant : v) : [...prev, msg.payload.variant];
              setStorageItem(STORAGE_KEYS.PLAN_VARIANTS, updated);
              return updated;
            });
            if (msg.payload.activateImmediately) {
              setActiveVariant(msg.payload.variant);
            }
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

  // Filtered rooms based on active toggles and search query:
  // 1. Sale ogólne, 2. Sale nauczania indywidualnego / wsparcia, 3. Sale sportowe
  const filteredRooms = useMemo(() => {
    let list: (ClassRoom & { categoryType: 'general' | 'sport' | 'ni' })[] = [];

    const genSorted = [...categorizedRooms.general].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    const niSorted = [...categorizedRooms.ni].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    const sportSorted = [...categorizedRooms.sport].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    if (filterGeneralRooms) {
      list.push(...genSorted.map(r => ({ ...r, categoryType: 'general' as const })));
    }
    if (filterNIRooms) {
      list.push(...niSorted.map(r => ({ ...r, categoryType: 'ni' as const })));
    }
    if (filterSportsRooms) {
      list.push(...sportSorted.map(r => ({ ...r, categoryType: 'sport' as const })));
    }

    if (roomSearchQuery.trim()) {
      const q = roomSearchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(q) || 
        (r.desc || '').toLowerCase().includes(q)
      );
    }

    return list;
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

  // ── AUTO-FIT & ZOOM ENGINE DLA MATRYCY SAL ──
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);

  const [fitToScreen, setFitToScreen] = useState<boolean>(() => {
    const saved = localStorage.getItem('saleplan_companion_fit_to_screen');
    return saved !== null ? JSON.parse(saved) : true; // Domyślnie WŁĄCZONE
  });
  const [cellDensity, setCellDensity] = useState<'normal' | 'compact'>(() => {
    const saved = localStorage.getItem('saleplan_companion_cell_density');
    return (saved === 'compact' || saved === 'normal') ? saved : 'compact';
  });
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [autoScale, setAutoScale] = useState<number>(1);
  const [hoveredCellInfo, setHoveredCellInfo] = useState<{
    roomName: string;
    categoryType: string;
    dayName: string;
    hourText: string;
    isOccupied: boolean;
    className?: string;
    subjectName?: string;
    subjectShort?: string;
    subjectColor?: string;
    teacherName?: string;
    teacherAbbr?: string;
  } | null>(null);

  // Zapisz preferencje w localStorage
  useEffect(() => {
    localStorage.setItem('saleplan_companion_fit_to_screen', JSON.stringify(fitToScreen));
  }, [fitToScreen]);

  useEffect(() => {
    localStorage.setItem('saleplan_companion_cell_density', cellDensity);
  }, [cellDensity]);

  // Automatyczne obliczanie współczynnika skali w czasie rzeczywistym
  useEffect(() => {
    if (!fitToScreen || !containerRef.current || !tableRef.current) {
      setAutoScale(1);
      return;
    }

    const calculateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
      const cWidth = containerRef.current.clientWidth - 20; // margines bezpieczeństwa
      const cHeight = containerRef.current.clientHeight - 20;

      const tWidth = tableRef.current.offsetWidth;
      const tHeight = tableRef.current.offsetHeight;

      if (cWidth > 40 && cHeight > 40 && tWidth > 40 && tHeight > 40) {
        const scaleX = cWidth / tWidth;
        const scaleY = cHeight / tHeight;
        // Bierzemy mniejszą wartość, aby zagwarantować 100% zmieszczenia w pionie I w poziomie
        const minScale = Math.min(scaleX, scaleY);
        setAutoScale(Math.max(0.1, Math.min(1.5, minScale)));
      }
    };

    calculateScale();
    const timer = setTimeout(calculateScale, 120);

    const observer = new ResizeObserver(() => {
      calculateScale();
    });

    if (containerRef.current) observer.observe(containerRef.current);
    if (tableRef.current) observer.observe(tableRef.current);
    window.addEventListener('resize', calculateScale);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [fitToScreen, filteredRooms.length, hoursList.length, selectedDayFilter, cellDensity]);

  const effectiveScale = fitToScreen ? autoScale * (zoomPercent / 100) : (zoomPercent / 100);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-800 font-sans overflow-hidden select-none">
      {/* ── GÓRNY PASEK STATUSU I NAWIGACJI OKNA TOWARZYSZĄCEGO (JASNY, SPÓJNY Z EKRANEM 1) ── */}
      <header className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-xs text-slate-800">
        {/* Lewa strona: Identyfikator Ekranu 2 */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 border border-indigo-500 rounded-lg text-white font-black text-xs shadow-xs">
            <Monitor size={15} className="text-white shrink-0" />
            <span className="whitespace-nowrap tracking-wider">EKRAN 2</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm text-slate-900 tracking-tight truncate">
                SalePlan Pro • Monitor Towarzyszący
              </h1>
              {isConnectedToMaster ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Połączono z Oknem 1
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Oczekiwanie na sygnał
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {appState?.school?.name || 'Szkoła'} • {appState?.yearLabel || 'Rok szkolny'}
            </p>
          </div>
        </div>

        {/* Środek: Selektor widoków drugiego ekranu */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-bold overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveCompanionTab('kreator')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'kreator'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Kreator Szkoły: Nowy wariant (Ekran 2)"
          >
            <Sparkles size={14} className={activeCompanionTab === 'kreator' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Kreator (Nowy wariant)</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('plan_klas')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'plan_klas'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Etap 1: Siatka klas, dni tygodnia i godzin z przeciąganiem i klikaniem"
          >
            <Layers size={14} className={activeCompanionTab === 'plan_klas' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Etap 1: Plan Klas</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('plan_sal')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'plan_sal'
                ? 'bg-white text-teal-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Etap 2: Siatka sal (Budynek, Piętro, Sala) z czyszczeniem"
          >
            <DoorOpen size={14} className={activeCompanionTab === 'plan_sal' ? 'text-teal-600' : 'text-slate-400'} />
            <span>Etap 2: Plan Sal</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('dyzury')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'dyzury'
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Etap 3: Dyżury (W budowie na Ekranie 2)"
          >
            <Shield size={14} className={activeCompanionTab === 'dyzury' ? 'text-purple-600' : 'text-slate-400'} />
            <span>Etap 3: Dyżury</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('plachta')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'plachta'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Pełna Płachta Dyrektorska całego tygodnia"
          >
            <Monitor size={14} className={activeCompanionTab === 'plachta' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Płachta Dyrektorska</span>
          </button>

          <button
            onClick={() => setActiveCompanionTab('rooms_matrix')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeCompanionTab === 'rooms_matrix'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Szczegółowa matryca sal z filtrami (ogólne, sportowe, NI)"
          >
            <Filter size={14} className={activeCompanionTab === 'rooms_matrix' ? 'text-slate-800' : 'text-slate-400'} />
            <span>Matryca Sal</span>
          </button>
        </div>

        {/* Prawa strona: Akcje systemowe */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleManualRefresh}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
            title="Wymuś synchronizację stanu z bazy danych"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
            title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran na monitorze zewnętrznym"}
          >
            {isFullscreen ? <Minimize2 size={14} className="text-amber-600" /> : <Maximize2 size={14} />}
          </button>

          <button
            onClick={() => window.close()}
            className="p-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-200 shadow-xs transition cursor-pointer"
            title="Zamknij drugie okno i wróć do trybu 1 ekranu"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* ── POWIADOMIENIE O PRZYPISANIU SALI ── */}
      {lastAssignedRoomAlert && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{lastAssignedRoomAlert}</span>
          </div>
          <button onClick={() => setLastAssignedRoomAlert(null)} className="text-white hover:opacity-80">✕</button>
        </div>
      )}

      {/* ── GŁÓWNA STREFA ZAWARTOŚCI EKRANU 2 (JASNA, IDENTYCZNA Z EKRANEM 1) ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 text-slate-800">
        
        {/* ======================================================== */}
        {/* WIDOK 1: KREATOR SZKOŁY (NOWY WARIANT)                   */}
        {/* ======================================================== */}
        {activeCompanionTab === 'kreator' && (
          <DualScreen2Kreator
            appState={appState}
            schedData={schedData}
            activeVariant={activeVariant}
            planVariants={planVariants}
            onVariantCreated={handleVariantCreated}
          />
        )}

        {/* ======================================================== */}
        {/* WIDOK 2: ETAP 1 PLAN KLAS (SIATKA KLAS, DNI I GODZIN)   */}
        {/* ======================================================== */}
        {activeCompanionTab === 'plan_klas' && (
          <DualScreen2PlanKlas
            appState={appState}
            schedData={schedData}
            onUpdateLessons={handleUpdateLessons}
          />
        )}

        {/* ======================================================== */}
        {/* WIDOK 3: ETAP 2 PLAN SAL (SIATKA: BUDYNEK, PIĘTRO, SALA) */}
        {/* ======================================================== */}
        {activeCompanionTab === 'plan_sal' && (
          <DualScreen2PlanSal
            appState={appState}
            schedData={schedData}
            onChangeSchedData={handleChangeSchedData}
          />
        )}

        {/* ======================================================== */}
        {/* WIDOKI W BUDOWIE NA EKRANIE 2 (DYŻURY, STATYSTYKI, ETC)  */}
        {/* ======================================================== */}
        {(activeCompanionTab === 'dyzury' || activeCompanionTab === 'statystyki' || activeCompanionTab === 'ustawienia_generatorow' || activeCompanionTab === 'o_programie') && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-100 text-slate-800 select-none">
            <div className="max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-4">
              <div className="w-16 h-16 mx-auto bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 shadow-xs">
                <Sparkles size={32} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Ekran 2 • W Budowie
              </span>
              <h2 className="text-xl font-black text-slate-800">
                {activeCompanionTab === 'dyzury' ? 'Etap 3: Dyżury' : activeCompanionTab === 'statystyki' ? 'Statystyki' : 'Moduł w budowie'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Widok drugiego ekranu dla tej sekcji nawigacji jest w trakcie przygotowania. Pełne sterowanie i edycja odbywają się w Oknie Głównym (Ekran 1).
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* WIDOK 4: PŁACHTA DYREKTORSKA                             */}
        {/* ======================================================== */}
        {activeCompanionTab === 'plachta' && (
          <div className="flex-1 overflow-auto p-4 bg-slate-100">
            <PlachtaDyrektorska appState={appState} schedData={schedData} />
          </div>
        )}
        
        {/* ======================================================== */}
        {/* WIDOK 1: MATRYCA SAL (PLAN KLAS)                         */}
        {/* ======================================================== */}
        {activeCompanionTab === 'rooms_matrix' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pasek filtrów sal i wyszukiwarki (białe tło, czyste ramki jak na Ekranie 1) */}
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
              
              {/* Grupa 1: Przełączniki kategorii sal (Ogólne, Sportowe, NI) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1 mr-1">
                  <Filter size={13} className="text-blue-600" /> Filtry sal:
                </span>

                {/* 1. Sale Ogólne */}
                <button
                  onClick={() => setFilterGeneralRooms(!filterGeneralRooms)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    filterGeneralRooms
                      ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                  title="Przełącz wyświetlanie sal ogólnych i pracowni przedmiotowych"
                >
                  <DoorOpen size={13} className={filterGeneralRooms ? 'text-blue-600' : 'text-slate-400'} />
                  <span>Sale ogólne ({categorizedRooms.general.length})</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-extrabold ${filterGeneralRooms ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                    {filterGeneralRooms ? 'WŁ' : 'WYŁ'}
                  </span>
                </button>

                {/* 2. Sale Sportowe */}
                <button
                  onClick={() => setFilterSportsRooms(!filterSportsRooms)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    filterSportsRooms
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                  title="Przełącz wyświetlanie hal sportowych, sal gimnastycznych, basenu i boisk"
                >
                  <Dumbbell size={13} className={filterSportsRooms ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>Sale sportowe ({categorizedRooms.sport.length})</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-extrabold ${filterSportsRooms ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                    {filterSportsRooms ? 'WŁ' : 'WYŁ'}
                  </span>
                </button>

                {/* 3. Sale Nauczania Indywidualnego i Wsparcia */}
                <button
                  onClick={() => setFilterNIRooms(!filterNIRooms)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    filterNIRooms
                      ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                  title="Przełącz wyświetlanie gabinetów rewalidacji, logopedii, psychologa i sal NI"
                >
                  <HeartPulse size={13} className={filterNIRooms ? 'text-purple-600' : 'text-slate-400'} />
                  <span>Sale NI i wsparcia ({categorizedRooms.ni.length})</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-extrabold ${filterNIRooms ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-500'}`}>
                    {filterNIRooms ? 'WŁ' : 'WYŁ'}
                  </span>
                </button>
              </div>

              {/* Grupa 2: Dzień tygodnia i wyszukiwarka sali */}
              <div className="flex items-center gap-2">
                {/* Selektor dnia */}
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
                  <button
                    onClick={() => setSelectedDayFilter('all')}
                    className={`px-2.5 py-1 rounded transition ${
                      selectedDayFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Cały tydzień
                  </button>
                  {DAYS_NAMES.map((dName, dIdx) => (
                    <button
                      key={dIdx}
                      onClick={() => setSelectedDayFilter(dIdx)}
                      className={`px-2 py-1 rounded transition ${
                        selectedDayFilter === dIdx ? 'bg-indigo-600 text-white font-extrabold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {dName.substring(0, 2)}
                    </button>
                  ))}
                </div>

                {/* Szybka szukajka sali */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    placeholder="Szukaj sali..."
                    className="w-36 pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* PASEK KONTROLI SKALOWANIA I DOPASOWANIA DO EKRANU (AUTO-FIT & ZOOM) */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-slate-800 shadow-2xs">
              {/* Lewa strona: Przełącznik Auto-Fit 100% bez przewijania */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    setFitToScreen(prev => !prev);
                    if (!fitToScreen) setZoomPercent(100);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer border ${
                    fitToScreen
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                      : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-400'
                  }`}
                  title="Automatycznie skaluje całą matrycę (wszystkie dni, godziny i sale), aby mieściła się w 100% w oknie bez konieczności przewijania w pionie i poziomie"
                >
                  <Scan size={14} className={fitToScreen ? 'text-white animate-pulse' : 'text-slate-500'} />
                  <span>DOPASUJ DO EKRANU (100% BEZ PRZEWIJANIA)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-black ${
                    fitToScreen ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {fitToScreen ? `WŁ (${Math.round(effectiveScale * 100)}%)` : 'WYŁ (1:1)'}
                  </span>
                </button>

                {/* Kontrolki ręcznego zoomu */}
                <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-bold text-slate-700 shadow-2xs">
                  <button
                    onClick={() => setZoomPercent(z => Math.max(20, z - 10))}
                    className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition cursor-pointer"
                    title="Zmniejsz powiększenie (-10%)"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="px-2 text-[11px] font-mono font-bold text-slate-800 min-w-[48px] text-center">
                    {Math.round(effectiveScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomPercent(z => Math.min(250, z + 10))}
                    className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition cursor-pointer"
                    title="Zwiększ powiększenie (+10%)"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={() => setZoomPercent(100)}
                    className="ml-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded text-[10px] font-mono transition cursor-pointer flex items-center gap-1"
                    title="Zresetuj powiększenie do 100%"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>

                {/* Przełącznik gęstości komórek */}
                <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-xs font-bold shadow-2xs">
                  <button
                    onClick={() => setCellDensity('normal')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      cellDensity === 'normal'
                        ? 'bg-slate-800 text-white font-extrabold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Standardowy układ i szerokość kolumn"
                  >
                    Normalny
                  </button>
                  <button
                    onClick={() => setCellDensity('compact')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      cellDensity === 'compact'
                        ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Zagęszczone kolumny – pozwala zmieścić znacznie więcej sal w poziomie w wyższej skali"
                  >
                    Kompaktowy (więcej sal)
                  </button>
                </div>
              </div>

              {/* Prawa strona: Przycisk pełnego ekranu */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    } else {
                      document.exitFullscreen().catch(() => {});
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Przełącz pełny ekran przeglądarki (klawisz F11)"
                >
                  <Maximize2 size={13} />
                  <span>Pełny ekran (F11)</span>
                </button>
              </div>
            </div>

            {/* INSPEKTOR NAJECHANEJ KOMÓRKI / STATUS BAR MATRYCY */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs min-h-[34px] shadow-2xs shrink-0">
              {hoveredCellInfo ? (
                <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="font-extrabold text-amber-700 flex items-center gap-1">
                    <DoorOpen size={14} className="text-amber-600" />
                    Sala {hoveredCellInfo.roomName}
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({hoveredCellInfo.categoryType === 'sport' ? 'Sportowa' : hoveredCellInfo.categoryType === 'ni' ? 'NI/SPE' : 'Ogólna'})
                    </span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-700 font-medium">
                    📅 {hoveredCellInfo.dayName}, {hoveredCellInfo.hourText}
                  </span>
                  <span className="text-slate-300">|</span>
                  {hoveredCellInfo.isOccupied ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        ZAJĘTA
                      </span>
                      <span className="bg-white text-slate-900 border border-slate-300 font-black px-1.5 py-0.5 rounded text-[11px] shadow-2xs">
                        Klasa {hoveredCellInfo.className}
                      </span>
                      <span className="font-bold text-indigo-700">
                        {hoveredCellInfo.subjectName} [{hoveredCellInfo.subjectShort}]
                      </span>
                      <span className="text-slate-500">
                        (👤 {hoveredCellInfo.teacherName || hoveredCellInfo.teacherAbbr})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ SALA WOLNA
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Dostępna w tym terminie do przydziału
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between w-full text-slate-500 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>
                      {fitToScreen 
                        ? 'Tryb dopasowania aktywny: cała matryca mieści się na ekranie bez suwaków. Najedź kursorem na dowolną komórkę, aby powiększyć jej szczegóły.' 
                        : 'Tryb standardowy 1:1. Włącz „Dopasuj do ekranu”, aby automatycznie zmieścić wszystkie klasy, godziny i sale bez przewijania.'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Sale: {filteredRooms.length} • Dni: {selectedDayFilter === 'all' ? DAYS_NAMES.length : 1} • Godziny: {hoursList.length}
                  </span>
                </div>
              )}
            </div>

            {/* AKTYWNY PASEK INTERAKCJI Z EKRANEM 1 (JASNA BELKA W STYLU EKRANU 1) */}
            {highlightedSlot && highlightedSlot.dayIdx !== undefined && highlightedSlot.hourIdx !== undefined && (
              <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-2xs animate-fadeIn">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white font-black rounded-md text-[10px] uppercase tracking-wide flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    Wybrany slot na Ekranie 1:
                  </span>
                  <span className="font-extrabold text-indigo-950">
                    {DAYS_NAMES[highlightedSlot.dayIdx]}, godzina {highlightedSlot.hourIdx + 1}
                  </span>
                  {highlightedSlot.className && (
                    <span className="bg-white border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-bold shadow-2xs">
                      Klasa {highlightedSlot.className}
                    </span>
                  )}
                  {highlightedSlot.subjectShort && (
                    <span className="bg-blue-100 border border-blue-200 text-blue-800 px-2 py-0.5 rounded font-mono font-bold shadow-2xs">
                      Przedmiot: [{highlightedSlot.subjectShort}]
                    </span>
                  )}
                  {highlightedSlot.teacherAbbr && (
                    <span className="text-slate-600 font-medium">
                      (Nauczyciel: {highlightedSlot.teacherAbbr})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-indigo-800 font-bold hidden md:inline">
                    👉 Kliknij zielony przycisk „Wolna” przy sali, aby natychmiast przypisać ją do tej lekcji
                  </span>
                  <button
                    onClick={() => setHighlightedSlot(null)}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-indigo-100 transition cursor-pointer"
                    title="Ukryj podświetlenie slotu"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TABELA MATRYCY SAL (JASNY PROJEKT IDENTYCZNY ZE STYLEM SIATKI PLANU KLAS) */}
            <div 
              ref={containerRef}
              className={`flex-1 ${fitToScreen ? 'overflow-hidden' : 'overflow-auto'} bg-slate-100 p-2 sm:p-3 relative`}
            >
              {filteredRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 border border-dashed border-slate-300 bg-white rounded-2xl shadow-xs">
                  <DoorOpen size={40} className="text-slate-400 mb-2" />
                  <span className="text-sm font-bold text-slate-700">Brak sal spełniających kryteria filtrów</span>
                  <span className="text-xs text-slate-500 mt-1">Włącz co najmniej jedną z kategorii sal na pasku u góry.</span>
                </div>
              ) : (
                <div 
                  style={{
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                    width: 'max-content',
                  }}
                  className="inline-block"
                >
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs inline-block">
                    <table ref={tableRef} className="border-collapse text-left">
                      {/* NAGŁÓWKI SAL */}
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                          <th className={`text-center font-black text-slate-800 uppercase tracking-wider bg-slate-100 border-r border-slate-200 sticky left-0 z-30 ${
                            cellDensity === 'compact' 
                              ? 'p-1.5 text-[11px] min-w-[90px] w-[90px]' 
                              : 'p-2.5 sm:p-3 text-xs min-w-[130px] w-[130px]'
                          }`}>
                            Dzień
                          </th>
                          <th className={`text-center font-black text-slate-800 uppercase tracking-wider bg-slate-100 border-r border-slate-200 sticky z-30 ${
                            cellDensity === 'compact' 
                              ? 'p-1.5 text-[11px] min-w-[95px] w-[95px] left-[90px]' 
                              : 'p-2.5 sm:p-3 text-xs min-w-[125px] w-[125px] left-[130px]'
                          }`}>
                            Nr lekcji & Godziny
                          </th>
                          {filteredRooms.map(room => (
                            <th 
                              key={room.id}
                              className={`text-center border-r border-slate-200 select-none ${
                                cellDensity === 'compact'
                                  ? 'p-1.5 min-w-[75px] max-w-[95px]'
                                  : 'p-2 min-w-[110px] max-w-[140px]'
                              } ${
                                room.categoryType === 'sport' 
                                  ? 'bg-emerald-50/70 text-emerald-950' 
                                  : room.categoryType === 'ni' 
                                  ? 'bg-purple-50/70 text-purple-950' 
                                  : 'bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                <span className={`font-black text-slate-900 truncate max-w-full ${
                                  cellDensity === 'compact' ? 'text-[11px]' : 'text-xs'
                                }`} title={room.name}>
                                  {room.name}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {room.categoryType === 'sport' && (
                                    <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1 py-0.2 rounded-sm">
                                      Sport
                                    </span>
                                  )}
                                  {room.categoryType === 'ni' && (
                                    <span className="text-[8px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0.2 rounded-sm">
                                      NI/SPE
                                    </span>
                                  )}
                                  {room.categoryType === 'general' && (
                                    <span className="text-[8px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1 py-0.2 rounded-sm">
                                      Ogólna
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

                          const totalHoursInDay = hoursList.length;

                          return hoursList.map((hour, hIdx) => {
                            const isCurrentActiveSlot = 
                              highlightedSlot && 
                              highlightedSlot.dayIdx === dayIdx && 
                              highlightedSlot.hourIdx === hIdx;

                            return (
                              <tr 
                                key={`${dayIdx}-${hIdx}`}
                                className={`border-b border-slate-200 transition-colors ${
                                  isCurrentActiveSlot 
                                    ? 'bg-indigo-50/90 ring-2 ring-indigo-500 relative z-10' 
                                    : hIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                } hover:bg-slate-100/70`}
                              >
                                {/* Kolumna 1: Dzień tygodnia (rowSpan na wszystkie godziny w danym dniu) */}
                                {hIdx === 0 && (
                                  <td 
                                    rowSpan={totalHoursInDay}
                                    className={`text-center border-r-2 border-r-slate-300 sticky left-0 z-15 bg-slate-50 align-middle select-none border-b-2 border-b-slate-300 shadow-2xs ${
                                      cellDensity === 'compact' ? 'p-1.5' : 'p-3'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center justify-center gap-1 py-2">
                                      <span className={`font-black uppercase tracking-wider text-slate-900 bg-white border border-slate-300 rounded-xl shadow-xs ${
                                        cellDensity === 'compact' ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-2'
                                      }`}>
                                        {dayName}
                                      </span>
                                      <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md font-bold font-mono">
                                        {totalHoursInDay} lekcji
                                      </span>
                                    </div>
                                  </td>
                                )}

                                {/* Kolumna 2: Nr lekcji oraz godziny zajęć */}
                                <td className={`text-center font-bold border-r-2 border-r-slate-300 sticky z-10 select-none shadow-2xs ${
                                  cellDensity === 'compact' 
                                    ? 'p-1 text-[11px] left-[90px]' 
                                    : 'p-2 text-xs left-[130px]'
                                } ${
                                  isCurrentActiveSlot 
                                    ? 'bg-indigo-100 text-indigo-950 font-black ring-inset ring-2 ring-indigo-500' 
                                    : hIdx % 2 === 0 ? 'bg-white text-slate-700' : 'bg-slate-50 text-slate-700'
                                }`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Lekcja</span>
                                      <span className={`font-black px-1.5 py-0.2 rounded-md ${
                                        cellDensity === 'compact' ? 'text-[11px]' : 'text-xs'
                                      } ${
                                        isCurrentActiveSlot 
                                          ? 'bg-indigo-600 text-white shadow-2xs' 
                                          : 'bg-slate-100 border border-slate-200 text-slate-900'
                                      }`}>
                                        {hour.num}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-600 font-mono font-bold tracking-tight mt-0.5">
                                      {hour.start}–{hour.end}
                                    </span>
                                  </div>
                                </td>

                                {/* Komórki sal dla danej godziny */}
                                {filteredRooms.map(room => {
                                  const occKey = `${dayIdx}-${hIdx}-${room.id}`;
                                  const occ = roomOccupancyMap.get(occKey);

                                  const hourText = `Lekcja ${hour.num} (${hour.start}–${hour.end})`;

                                  if (occ) {
                                    // SALA ZAJĘTA — elegancka jasna karta z barwną ramką w stylu kart lekcji na Ekranie 1
                                    return (
                                      <td 
                                        key={room.id}
                                        className="p-1 text-center border-r border-slate-200 align-middle"
                                        onMouseEnter={() => {
                                          setHoveredCellInfo({
                                            roomName: room.name,
                                            categoryType: room.categoryType,
                                            dayName,
                                            hourText,
                                            isOccupied: true,
                                            className: occ.className,
                                            subjectName: occ.subjectName,
                                            subjectShort: occ.subjectShort,
                                            subjectColor: occ.subjectColor,
                                            teacherName: occ.teacherAbbr,
                                            teacherAbbr: occ.teacherAbbr,
                                          });
                                        }}
                                        onMouseLeave={() => setHoveredCellInfo(null)}
                                      >
                                        <div 
                                          className={`rounded-lg border bg-white flex flex-col justify-center shadow-2xs hover:shadow-xs transition ${
                                            cellDensity === 'compact' ? 'p-1 min-h-[38px]' : 'p-1.5 min-h-[48px]'
                                          }`}
                                          style={{
                                            borderLeftWidth: '3px',
                                            borderLeftColor: occ.subjectColor,
                                            borderRightColor: '#e2e8f0',
                                            borderTopColor: '#e2e8f0',
                                            borderBottomColor: '#e2e8f0'
                                          }}
                                          title={`Sala ${room.name}: Klasa ${occ.className} (${occ.subjectName}, nauczyciel: ${occ.teacherAbbr})`}
                                        >
                                          <div className="flex items-center justify-between gap-1 text-[10px] font-black">
                                            <span className="text-slate-900 font-extrabold bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                              {occ.className}
                                            </span>
                                            <span 
                                              className="font-mono font-bold text-[9px] px-0.5 rounded"
                                              style={{ color: occ.subjectColor }}
                                            >
                                              [{occ.subjectShort}]
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-slate-600 truncate mt-0.5 font-semibold flex items-center justify-between">
                                            <span>👤 {occ.teacherAbbr || '—'}</span>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  // SALA WOLNA
                                  return (
                                    <td 
                                      key={room.id}
                                      className={`p-1 text-center border-r border-slate-200 align-middle ${
                                        isCurrentActiveSlot ? 'bg-emerald-50/60' : ''
                                      }`}
                                      onMouseEnter={() => {
                                        setHoveredCellInfo({
                                          roomName: room.name,
                                          categoryType: room.categoryType,
                                          dayName,
                                          hourText,
                                          isOccupied: false
                                        });
                                      }}
                                      onMouseLeave={() => setHoveredCellInfo(null)}
                                    >
                                      {isCurrentActiveSlot ? (
                                        <button
                                          onClick={() => handleAssignRoomToActiveSlot(room)}
                                          className={`w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 hover:border-emerald-600 rounded-lg text-[10px] font-bold transition flex flex-col items-center justify-center cursor-pointer shadow-2xs group ${
                                            cellDensity === 'compact' ? 'p-1 min-h-[38px]' : 'p-1.5 min-h-[48px]'
                                          }`}
                                          title={`Kliknij, aby przypisać salę ${room.name} do aktywnej lekcji w Oknie 1`}
                                        >
                                          <span className="text-[9px] font-black uppercase text-emerald-700 group-hover:text-white leading-tight">
                                            ✓ Wolna
                                          </span>
                                          <span className="text-[8px] opacity-90 group-hover:underline text-emerald-800 group-hover:text-white mt-0.2">
                                            Przypisz
                                          </span>
                                        </button>
                                      ) : (
                                        <div 
                                          className={`h-full rounded flex items-center justify-center text-slate-300 hover:text-slate-500 transition ${
                                            cellDensity === 'compact' ? 'min-h-[38px]' : 'min-h-[48px]'
                                          }`}
                                          title={`Sala ${room.name} jest wolna (${dayName}, ${hourText})`}
                                        >
                                          <span className="opacity-60 font-mono text-xs font-bold">+</span>
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
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-teal-600" />
                  <h3 className="font-black text-base text-slate-900">Rozmieszczenie i Obłożenie Sal na Kondygnacjach</h3>
                </div>
                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  Liczba sal w szkole: {allRooms.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Poniższy widok pozwala monitorować rozmieszczenie klas pomiędzy parterem, piętrami oraz skrzydłem sportowym podczas układania Planu Sal (Etap 2).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sekcja Sal Ogólnych */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <DoorOpen size={15} /> Sale ogólne & pracownie
                  </span>
                  <span className="text-xs font-mono font-bold bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded">
                    {categorizedRooms.general.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {categorizedRooms.general.map(r => (
                    <div key={r.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100 transition">
                      <span className="font-extrabold text-slate-900">{r.name}</span>
                      <span className="text-[11px] text-slate-500">{r.desc || 'Gabinet ogólny'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sekcja Sal Sportowych */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Dumbbell size={15} /> Obiekty sportowe
                  </span>
                  <span className="text-xs font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                    {categorizedRooms.sport.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {categorizedRooms.sport.map(r => (
                    <div key={r.id} className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs hover:bg-emerald-50 transition">
                      <span className="font-extrabold text-emerald-950">{r.name}</span>
                      <span className="text-[11px] text-emerald-700 font-medium">{r.desc || 'Hala/Basen/WF'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sekcja Sal Wsparcia & NI */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={15} /> Gabinety wsparcia & NI
                  </span>
                  <span className="text-xs font-mono font-bold bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded">
                    {categorizedRooms.ni.length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {categorizedRooms.ni.map(r => (
                    <div key={r.id} className="p-2.5 bg-purple-50/50 border border-purple-200 rounded-xl flex items-center justify-between text-xs hover:bg-purple-50 transition">
                      <span className="font-extrabold text-purple-950">{r.name}</span>
                      <span className="text-[11px] text-purple-700 font-medium">{r.desc || 'Terapia/Rewalidacja'}</span>
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
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={20} className="text-purple-600" />
                <h3 className="font-black text-base text-slate-900">Inspekcja Stref Dyżurów i Kadry</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Wspomaga planowanie opieki na przerwach międzylekcyjnych (Etap 3). W oknie głównym układasz dyżury, a tutaj na bieżąco weryfikujesz, którzy nauczyciele mają okienka lub ułożone lekcje w danej strefie.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pl.teachers.map(t => (
                <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs hover:bg-slate-50 transition">
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">{t.first} {t.last}</span>
                    <span className="text-[11px] text-slate-500 font-mono">Inicjały: {t.abbr}</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
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
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} className="text-amber-600" />
                <h3 className="font-black text-base text-slate-900">Bilans Struktury Szkoły i Etatów (Kreator)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Podsumowanie liczby oddziałów, kadry pedagogicznej, puli sal oraz zdefiniowanych przydziałów w Kreatorze Szkoły.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Liczba Klas</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{pl.classes.length}</span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Nauczyciele</span>
                <span className="text-2xl font-black text-blue-600 mt-1 block">{pl.teachers.length}</span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Sale Lekcyjne</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">{allRooms.length}</span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Przedmioty</span>
                <span className="text-2xl font-black text-purple-600 mt-1 block">{pl.subjects.length}</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── STOPKA EKRANU 2 (IDENTYCZNA ZE STOPKĄ EKRANU 1) ── */}
      <footer className="px-4 py-2 bg-white border-t border-slate-200 text-slate-500 text-[10px] flex items-center justify-between shrink-0 font-medium shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-bold">✓ EKRAN 2 SYNCHRONIZACJA AKTYWNA</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">SalePlan Pro • Companion Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
            Submilisekundowa magistrala BroadcastChannel
          </span>
          <span className="text-slate-300">|</span>
          <button 
            onClick={() => window.close()} 
            className="text-slate-500 hover:text-red-600 transition cursor-pointer"
          >
            Zamknij okno
          </button>
        </div>
      </footer>
    </div>
  );
}
