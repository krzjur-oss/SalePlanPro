import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  AppState, SchedData, SchedCell, ClassRoom, Floor, Building 
} from '../types';
import { 
  dualScreenService, DualScreenMessage 
} from '../services/dualScreenService';
import { 
  colKey, flattenColumns, cleanFloorName 
} from '../utils';
import { isSportsFacility } from './PlanKlas';
import { isNIRoom } from './CompanionWindowView';
import { 
  ZoomIn, ZoomOut, RotateCcw, Trash2, X, AlertTriangle, 
  DoorOpen, Check, Building2, MapPin, Sparkles, Filter 
} from 'lucide-react';

interface DualScreen2PlanSalProps {
  appState: AppState;
  schedData: SchedData;
  onChangeSchedData: (newSched: SchedData) => void;
}

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const DEFAULT_HOURS = [
  { num: 1, range: '8:00 - 8:45', key: '8:00 - 8:45' },
  { num: 2, range: '8:55 - 9:40', key: '8:55 - 9:40' },
  { num: 3, range: '9:50 - 10:35', key: '9:50 - 10:35' },
  { num: 4, range: '10:50 - 11:35', key: '10:50 - 11:35' },
  { num: 5, range: '11:45 - 12:30', key: '11:45 - 12:30' },
  { num: 6, range: '12:45 - 13:30', key: '12:45 - 13:30' },
  { num: 7, range: '13:40 - 14:25', key: '13:40 - 14:25' },
  { num: 8, range: '14:35 - 15:20', key: '14:35 - 15:20' }
];

export default function DualScreen2PlanSal({
  appState,
  schedData,
  onChangeSchedData
}: DualScreen2PlanSalProps) {
  const pl = appState.planLekcji;

  // Highlighted slot / lesson sent from Ekran 1
  const [highlightedLesson, setHighlightedLesson] = useState<any | null>(null);

  // Auto-fit & Zoom controls
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'general' | 'sports' | 'ni'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Listen to highlights and assignments from Master
  useEffect(() => {
    const unsub = dualScreenService.subscribe((msg: DualScreenMessage) => {
      if (msg.type === 'PLAN_KLAS_HIGHLIGHT' && msg.payload) {
        setHighlightedLesson(msg.payload);
      }
    });
    return () => unsub();
  }, []);

  // Build the list of rooms with 3-part hierarchy: [Budynek, Piętro, Sala]
  const roomRows = useMemo(() => {
    const rawCols = flattenColumns(appState.floors || []);
    const roomsFromFloors = rawCols.map(col => {
      const roomKey = colKey(col);
      const bld = appState.buildings[col.floor.buildingIdx]?.name || 'Główny';
      const floor = col.floor.name || 'Parter';
      const num = col.room.num || '';
      const sub = col.room.sub ? ` (${col.room.sub})` : '';

      // Check room type from pl.rooms if matching
      const matchedPlRoom = pl.rooms.find(r => r.name.toLowerCase() === num.toLowerCase() || r.id === roomKey);
      const isSport = isSportsFacility(matchedPlRoom);
      const isNi = isNIRoom(matchedPlRoom);

      return {
        key: roomKey,
        building: bld,
        floor: cleanFloorName(floor),
        room: `${num}${sub}`,
        type: isSport ? 'sport' : isNi ? 'ni' : 'general',
        matchedPlRoom
      };
    });

    // If floors are empty, fallback to pl.rooms
    if (roomsFromFloors.length === 0 && pl.rooms && pl.rooms.length > 0) {
      return pl.rooms.map(r => ({
        key: r.id,
        building: 'Główny',
        floor: 'Parter',
        room: r.name,
        type: isSportsFacility(r) ? 'sport' : isNIRoom(r) ? 'ni' : 'general',
        matchedPlRoom: r
      }));
    }

    return roomsFromFloors;
  }, [appState.floors, appState.buildings, pl.rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return roomRows.filter(r => {
      if (categoryFilter === 'general' && r.type !== 'general') return false;
      if (categoryFilter === 'sports' && r.type !== 'sport') return false;
      if (categoryFilter === 'ni' && r.type !== 'ni') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.room.toLowerCase().includes(q);
        const matchBld = r.building.toLowerCase().includes(q);
        const matchFloor = r.floor.toLowerCase().includes(q);
        if (!matchName && !matchBld && !matchFloor) return false;
      }
      return true;
    });
  }, [roomRows, categoryFilter, searchQuery]);

  // Compute scale for auto-fit
  useEffect(() => {
    if (!isAutoFit || !containerRef.current || !tableRef.current) return;

    const calculateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
      const cWidth = containerRef.current.clientWidth - 24;
      const cHeight = containerRef.current.clientHeight - 24;
      const tWidth = tableRef.current.offsetWidth || 1500;
      const tHeight = tableRef.current.offsetHeight || 900;

      if (tWidth > 0 && tHeight > 0) {
        const scaleX = cWidth / tWidth;
        const scaleY = cHeight / tHeight;
        const idealScale = Math.min(scaleX, scaleY, 1.05);
        setZoomLevel(Math.max(0.15, idealScale));
      }
    };

    calculateScale();
    const timer = setTimeout(calculateScale, 100);
    window.addEventListener('resize', calculateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateScale);
    };
  }, [isAutoFit, filteredRooms.length, isCompact]);

  // Helper to read cell from schedData
  const getCellData = (dayIdx: number, hourIdx: number, roomKey: string): SchedCell | null => {
    const yearData = schedData[appState.yearKey];
    if (!yearData) return null;
    const dayData = yearData[dayIdx];
    if (!dayData) return null;

    // The hour key can be index or time string
    const hourItem = DEFAULT_HOURS[hourIdx];
    const hourKey = appState.hours[hourIdx] || hourItem.key || `${hourIdx}`;

    const hourData = dayData[hourKey] || dayData[`${hourIdx}`];
    if (!hourData) return null;

    const cell = hourData[roomKey];
    if (!cell) return null;
    return Array.isArray(cell) ? cell[0] : cell;
  };

  // Helper to assign a lesson into a room slot
  const handleAssignToRoom = (dayIdx: number, hourIdx: number, roomKey: string, roomName: string) => {
    if (!highlightedLesson) {
      alert('Wybierz najpierw zajęcie na Ekranie 1, aby przypisać je do tej sali.');
      return;
    }

    const yearKey = appState.yearKey;
    const hourKey = appState.hours[hourIdx] || DEFAULT_HOURS[hourIdx].key || `${hourIdx}`;

    const newSched: SchedData = JSON.parse(JSON.stringify(schedData || {}));
    if (!newSched[yearKey]) newSched[yearKey] = {};
    if (!newSched[yearKey][dayIdx]) newSched[yearKey][dayIdx] = {};
    if (!newSched[yearKey][dayIdx][hourKey]) newSched[yearKey][dayIdx][hourKey] = {};

    newSched[yearKey][dayIdx][hourKey][roomKey] = {
      classes: [highlightedLesson.className],
      className: highlightedLesson.className,
      subject: highlightedLesson.subjectShort || highlightedLesson.subjectName,
      teacherAbbr: highlightedLesson.teacherAbbr,
      _bridgeMeta: {
        classId: highlightedLesson.classId,
        suggestedRoom: roomName
      }
    };

    onChangeSchedData(newSched);
    dualScreenService.sendMessage({
      type: 'UPDATE_SCHED_DATA',
      payload: { schedData: newSched },
      timestamp: Date.now()
    });

    setHighlightedLesson(null);
  };

  // Helper to clear a single room cell
  const handleClearCell = (dayIdx: number, hourIdx: number, roomKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const yearKey = appState.yearKey;
    const hourKey = appState.hours[hourIdx] || DEFAULT_HOURS[hourIdx].key || `${hourIdx}`;

    const newSched: SchedData = JSON.parse(JSON.stringify(schedData || {}));
    if (newSched[yearKey]?.[dayIdx]?.[hourKey]?.[roomKey]) {
      delete newSched[yearKey][dayIdx][hourKey][roomKey];
      onChangeSchedData(newSched);
      dualScreenService.sendMessage({
        type: 'UPDATE_SCHED_DATA',
        payload: { schedData: newSched },
        timestamp: Date.now()
      });
    }
  };

  // Helper to clear all entries for an entire room
  const handleClearEntireRoom = (roomKey: string, roomName: string) => {
    if (!confirm(`Czy na pewno chcesz wyczyścić wszystkie wpisy z sali "${roomName}" ze wszystkich dni i godzin?`)) return;

    const yearKey = appState.yearKey;
    const newSched: SchedData = JSON.parse(JSON.stringify(schedData || {}));
    if (newSched[yearKey]) {
      Object.keys(newSched[yearKey]).forEach(d => {
        const dayData = newSched[yearKey][Number(d)];
        if (dayData) {
          Object.keys(dayData).forEach(h => {
            if (dayData[h]?.[roomKey]) {
              delete dayData[h][roomKey];
            }
          });
        }
      });
    }

    onChangeSchedData(newSched);
    dualScreenService.sendMessage({
      type: 'UPDATE_SCHED_DATA',
      payload: { schedData: newSched },
      timestamp: Date.now()
    });
  };

  // Helper to clear all entries across ALL rooms
  const handleClearAllRoomsSchedule = () => {
    if (!confirm('Czy jesteś pewien, że chcesz wyczyścić WSZYSTKIE wpisy we wszystkich salach ze wszystkich dni? Ta operacja zwolni wszystkie sale.')) return;

    const yearKey = appState.yearKey;
    const newSched: SchedData = {
      ...schedData,
      [yearKey]: {}
    };

    onChangeSchedData(newSched);
    dualScreenService.sendMessage({
      type: 'UPDATE_SCHED_DATA',
      payload: { schedData: newSched },
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full app-workspace-canvas overflow-hidden select-none">
      
      {/* ── PASEK KONTROLNY DLA SIATKI SAL NA EKRANIE 2 ── */}
      <div className="bg-white border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        
        {/* Lewa strona: Tytuł i aktywny wybór z Ekranu 1 */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              Siatka Sal (Plan Sal)
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Sal: <strong className="text-slate-800">{filteredRooms.length}</strong> • Kolumny: Budynek, Piętro, Sala
            </span>
          </div>

          {/* Plakietka zajęcia wybranego z Ekranu 1 do przypisania */}
          {highlightedLesson && (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-300 text-teal-900 px-3 py-1 rounded-xl text-xs shadow-2xs animate-pulse">
              <span className="font-extrabold text-teal-950 truncate max-w-[220px]">
                Wskaż salę dla: {highlightedLesson.className} • {highlightedLesson.subjectShort || highlightedLesson.subjectName} ({highlightedLesson.teacherAbbr})
              </span>
              <button
                onClick={() => setHighlightedLesson(null)}
                className="p-0.5 hover:bg-teal-100 rounded text-teal-700 hover:text-teal-900 cursor-pointer ml-1"
                title="Anuluj przypisywanie"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Prawa strona: Filtry, Czyszczenie, Zoom */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Filtr kategorii sal */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                categoryFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wszystkie ({roomRows.length})
            </button>
            <button
              onClick={() => setCategoryFilter('general')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                categoryFilter === 'general' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ogólne
            </button>
            <button
              onClick={() => setCategoryFilter('sports')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                categoryFilter === 'sports' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WF
            </button>
            <button
              onClick={() => setCategoryFilter('ni')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                categoryFilter === 'ni' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              NI / SPE
            </button>
          </div>

          <button
            onClick={handleClearAllRoomsSchedule}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Wyczyść wszystkie wpisy ze wszystkich sal"
          >
            <Trash2 size={13} />
            <span className="hidden md:inline">Wyczyść wszystkie sale</span>
          </button>

          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              isCompact ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isCompact ? 'Standard' : 'Kompakt'}
          </button>

          <button
            onClick={() => setIsAutoFit(!isAutoFit)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              isAutoFit ? 'bg-teal-600 border-teal-600 text-white shadow-2xs' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Automatycznie dopasuj do 100% szerokości i wysokości ekranu bez przewijania"
          >
            {isAutoFit ? 'Dopasowano (100% ekranu)' : 'Dopasuj do ekranu'}
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => { setIsAutoFit(false); setZoomLevel(prev => Math.max(0.2, prev - 0.1)); }}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Oddal (Zoom -)"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-700 px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => { setIsAutoFit(false); setZoomLevel(prev => Math.min(2.0, prev + 0.1)); }}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Przybliż (Zoom +)"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => { setIsAutoFit(false); setZoomLevel(1); }}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Resetuj zoom (100%)"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KONTENER TABELI SIATKI SAL ── */}
      <div 
        ref={containerRef}
        className={`flex-1 p-2 sm:p-3 relative app-workspace-canvas flex items-start justify-center ${
          isAutoFit ? 'overflow-hidden' : 'overflow-auto'
        }`}
      >
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="shrink-0 max-w-full"
        >
          <table 
            ref={tableRef}
            className="border-collapse text-left plan-table-container shadow-xs rounded-xl overflow-hidden"
          >
            <thead>
              {/* WIERSZ 1 NAGŁÓWKA: DNI TYGODNIA */}
              <tr className="border-b border-slate-300">
                {/* 3 KOLUMNY IDENTYFIKACYJNE SALI: BUDYNEK, PIĘTRO, SALA */}
                <th 
                  rowSpan={2}
                  className="px-2.5 py-2 text-center text-xs font-black uppercase tracking-wider plan-grid-header-day sticky left-0 z-30 min-w-[90px]"
                >
                  Budynek
                </th>
                <th 
                  rowSpan={2}
                  className="px-2.5 py-2 text-center text-xs font-black uppercase tracking-wider plan-grid-header-day sticky left-[90px] z-30 min-w-[80px]"
                >
                  Piętro
                </th>
                <th 
                  rowSpan={2}
                  className="px-2.5 py-2 text-center text-xs font-black uppercase tracking-wider plan-grid-header-day sticky left-[170px] z-30 min-w-[100px]"
                >
                  Sala
                </th>

                {/* DNI TYGODNIA */}
                {DAYS.map((dayName, dIdx) => (
                  <th 
                    key={dIdx}
                    colSpan={8}
                    className="px-2 py-1.5 text-center text-xs font-black uppercase tracking-wider plan-grid-header-day border-r border-slate-700"
                  >
                    {dayName}
                  </th>
                ))}
              </tr>

              {/* WIERSZ 2 NAGŁÓWKA: GODZINY I NR LEKCJI */}
              <tr className="border-b border-slate-300 text-[10px] font-bold">
                {DAYS.map((_, dIdx) => 
                  DEFAULT_HOURS.map(h => (
                    <th 
                      key={`${dIdx}_${h.num}`}
                      className={`px-1 py-1 text-center border-r border-slate-300 font-mono plan-grid-header-time ${
                        isCompact ? 'w-[50px] min-w-[50px]' : 'w-[64px] min-w-[64px]'
                      }`}
                    >
                      <span className="block text-slate-900 font-black">{h.num}</span>
                      <span className="text-[9px] text-slate-500 hidden sm:block truncate">{h.range.split(' ')[0]}</span>
                    </th>
                  ))
                )}
              </tr>
            </thead>

            {/* WIERSZE SAL ZAJĘCIOWYCH */}
            <tbody className="divide-y divide-slate-200">
              {filteredRooms.map(r => (
                <tr key={r.key} className="hover:bg-teal-50/30 transition group">
                  
                  {/* Kolumna 1: Budynek */}
                  <td className="px-2.5 py-1.5 bg-white sticky left-0 z-20 border-r border-slate-300 text-xs font-bold text-slate-600 truncate">
                    {r.building}
                  </td>

                  {/* Kolumna 2: Piętro */}
                  <td className="px-2.5 py-1.5 bg-white sticky left-[90px] z-20 border-r border-slate-300 text-xs text-slate-600 truncate">
                    {r.floor}
                  </td>

                  {/* Kolumna 3: Sala */}
                  <td className="px-2.5 py-1.5 bg-teal-50/40 sticky left-[170px] z-20 border-r border-slate-300 text-xs font-black text-slate-900 flex items-center justify-between gap-1 shadow-2xs">
                    <span className="truncate">{r.room}</span>
                    <button
                      type="button"
                      onClick={() => handleClearEntireRoom(r.key, r.room)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title={`Wyczyść wszystkie wpisy w sali ${r.room}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>

                  {/* Komórki siatki obłożenia sali */}
                  {DAYS.map((_, dayIdx) => 
                    DEFAULT_HOURS.map((_, hourIdx) => {
                      const cell = getCellData(dayIdx, hourIdx, r.key);
                      const isHighlighted = highlightedLesson && highlightedLesson.dayIdx === dayIdx && highlightedLesson.hourIdx === hourIdx;

                      return (
                        <td
                          key={`${dayIdx}_${hourIdx}`}
                          onClick={() => handleAssignToRoom(dayIdx, hourIdx, r.key, r.room)}
                          className={`p-0.5 border-r border-b border-slate-200 transition relative group cursor-pointer ${
                            cell 
                              ? 'bg-white hover:bg-slate-50' 
                              : isHighlighted
                              ? 'bg-amber-50 ring-1 ring-amber-400 animate-pulse'
                              : 'hover:bg-slate-100/70'
                          } ${isCompact ? 'h-8 max-h-8' : 'h-10 max-h-10'}`}
                        >
                          {cell ? (
                            <div className="w-full h-full rounded-md p-1 bg-white border border-teal-200 flex flex-col justify-between overflow-hidden shadow-2xs">
                              <div className="flex items-center justify-between leading-none gap-0.5">
                                <span className="font-black text-[10px] text-teal-800 truncate">
                                  {cell.className || (cell.classes && cell.classes[0])}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleClearCell(dayIdx, hourIdx, r.key, e)}
                                  className="opacity-0 group-hover:opacity-100 hover:bg-rose-500 rounded p-0.5 text-slate-400 hover:text-white transition cursor-pointer"
                                  title="Wyczyść wpis z tej sali"
                                >
                                  <X size={10} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono leading-none">
                                <span className="truncate">{cell.subject}</span>
                                <span className="font-bold text-indigo-700">{cell.teacherAbbr}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-60 transition text-teal-600 text-xs">
                              +
                            </div>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}

              {/* ── OSTATNI WIERSZ TABELI: CZYSZCZENIE WSZYSTKICH WPISÓW W SALI ── */}
              <tr className="bg-slate-50 border-t-2 border-rose-200 sticky bottom-0 z-30 shadow-xs">
                <td 
                  colSpan={3}
                  className="px-3 py-2 bg-slate-50 sticky left-0 z-40 border-r border-slate-300 font-black text-xs text-rose-700 flex items-center gap-2 shadow-2xs"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  <span>Czyszczenie wpisów w salach</span>
                </td>

                {/* Przyciski czyszczenia w danym dniu i godzinie */}
                {DAYS.map((dayName, dayIdx) => 
                  DEFAULT_HOURS.map((_, hourIdx) => (
                    <td 
                      key={`clear_${dayIdx}_${hourIdx}`}
                      className="p-0.5 text-center border-r border-slate-200 bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`Wyczyścić wszystkie sale w ${dayName} na lekcji ${hourIdx + 1}?`)) return;
                          const yearKey = appState.yearKey;
                          const hourKey = appState.hours[hourIdx] || DEFAULT_HOURS[hourIdx].key || `${hourIdx}`;
                          const newSched: SchedData = JSON.parse(JSON.stringify(schedData || {}));
                          if (newSched[yearKey]?.[dayIdx]?.[hourKey]) {
                            delete newSched[yearKey][dayIdx][hourKey];
                            onChangeSchedData(newSched);
                            dualScreenService.sendMessage({
                              type: 'UPDATE_SCHED_DATA',
                              payload: { schedData: newSched },
                              timestamp: Date.now()
                            });
                          }
                        }}
                        className="w-full py-0.5 text-[9px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded transition cursor-pointer"
                        title={`Wyczyść wszystkie sale w ${dayName} na lekcji ${hourIdx + 1}`}
                      >
                        Wyczyść
                      </button>
                    </td>
                  ))
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PASEK INFORMACYJNY STOPKI ── */}
      <div className="bg-white border-t border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-teal-700 font-bold">Wskazówka:</span>
          <span>Wybierz lekcję z puli na Ekranie 1, a następnie kliknij wybraną salę i godzinę na tym ekranie, aby dokonać przydziału. Ostatni wiersz pozwala na błyskawiczne czyszczenie wpisów.</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Siatka zsynchronizowana z Ekranem 1
        </div>
      </div>

    </div>
  );
}
