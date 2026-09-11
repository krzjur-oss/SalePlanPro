import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  AppState, SchedData, Class, Teacher, Subject, ClassRoom, Assignment, Lesson 
} from '../types';
import { 
  dualScreenService, DualScreenMessage 
} from '../services/dualScreenService';
import { 
  Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, X, Plus, 
  Trash2, Check, Sparkles, AlertCircle, Info, Calendar, Clock,
  Layers, User, BookOpen, DoorOpen, HelpCircle
} from 'lucide-react';

interface DualScreen2PlanKlasProps {
  appState: AppState;
  schedData: SchedData;
  onUpdateLessons: (newLessons: Record<string, Lesson>) => void;
}

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
const DEFAULT_HOURS = [
  { num: 1, range: '8:00 - 8:45' },
  { num: 2, range: '8:55 - 9:40' },
  { num: 3, range: '9:50 - 10:35' },
  { num: 4, range: '10:50 - 11:35' },
  { num: 5, range: '11:45 - 12:30' },
  { num: 6, range: '12:45 - 13:30' },
  { num: 7, range: '13:40 - 14:25' },
  { num: 8, range: '14:35 - 15:20' }
];

export default function DualScreen2PlanKlas({
  appState,
  schedData,
  onUpdateLessons
}: DualScreen2PlanKlasProps) {
  const pl = appState.planLekcji;

  // Selected lesson from pool (sent by Ekran 1)
  const [selectedPoolLesson, setSelectedPoolLesson] = useState<{
    assignmentId: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    subjectShort: string;
    subjectColor: string;
    teacherAbbr: string;
  } | null>(null);

  // Quick add modal state for empty cells
  const [quickAddCell, setQuickAddCell] = useState<{
    classId: string;
    className: string;
    dayIdx: number;
    hourIdx: number;
  } | null>(null);

  // Auto-fit & Zoom controls
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Listen to pool selections from Master window
  useEffect(() => {
    const unsub = dualScreenService.subscribe((msg: DualScreenMessage) => {
      if (msg.type === 'SELECT_LESSON_POOL' && msg.payload) {
        setSelectedPoolLesson(msg.payload);
      }
    });
    return () => unsub();
  }, []);

  // Compute scale for auto-fit
  useEffect(() => {
    if (!isAutoFit || !containerRef.current || !tableRef.current) return;

    const calculateScale = () => {
      if (!containerRef.current || !tableRef.current) return;
      const cWidth = containerRef.current.clientWidth - 24;
      const cHeight = containerRef.current.clientHeight - 24;
      const tWidth = tableRef.current.offsetWidth || 1400;
      const tHeight = tableRef.current.offsetHeight || 800;

      if (tWidth > 0 && tHeight > 0) {
        const scaleX = cWidth / tWidth;
        const scaleY = cHeight / tHeight;
        // Perfect fit for both X and Y so no scrollbars are required
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
  }, [isAutoFit, pl.classes, isCompact]);

  // Lessons map helper
  const lessonsMap = pl.lessons || {};

  // Handle placing a lesson into a specific cell
  const handlePlaceLesson = (asgData: any, classId: string, dayIdx: number, hourIdx: number) => {
    const cellKey = `${classId}|${dayIdx}|${hourIdx}`;
    const newLessons = {
      ...lessonsMap,
      [cellKey]: {
        assignmentId: asgData.assignmentId,
        locked: false
      }
    };

    onUpdateLessons(newLessons);
    dualScreenService.sendMessage({
      type: 'UPDATE_LESSONS',
      payload: { lessons: newLessons },
      timestamp: Date.now()
    });

    // Reset selected pool lesson if matched
    if (selectedPoolLesson && selectedPoolLesson.assignmentId === asgData.assignmentId) {
      setSelectedPoolLesson(null);
    }
  };

  // Handle removing a lesson from a cell
  const handleRemoveLesson = (cellKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newLessons = { ...lessonsMap };
    delete newLessons[cellKey];

    onUpdateLessons(newLessons);
    dualScreenService.sendMessage({
      type: 'UPDATE_LESSONS',
      payload: { lessons: newLessons },
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 text-slate-800 overflow-hidden select-none">
      
      {/* ── PASEK KONTROLNY DLA SIATKI KLAS NA EKRANIE 2 (JASNY MOTYW) ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        
        {/* Lewa sekcja: Informacja i aktywny wybór z puli */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              Siatka Klas (Plan Klas)
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Oddziałów: <strong className="text-slate-800">{pl.classes.length}</strong> • Dni: 5 • Godzin: 8
            </span>
          </div>

          {/* Plakietka aktywnej lekcji wybranej z Ekranu 1 */}
          {selectedPoolLesson && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-300 text-blue-900 px-3 py-1 rounded-xl text-xs shadow-2xs animate-pulse">
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                style={{ backgroundColor: selectedPoolLesson.subjectColor }} 
              />
              <span className="font-extrabold text-blue-950 truncate max-w-[200px]">
                {selectedPoolLesson.subjectName} ({selectedPoolLesson.className})
              </span>
              <span className="text-[11px] text-blue-700">
                — kliknij pustą komórkę, aby wstawić
              </span>
              <button
                onClick={() => setSelectedPoolLesson(null)}
                className="p-0.5 hover:bg-blue-100 rounded text-blue-700 hover:text-blue-900 cursor-pointer ml-1"
                title="Anuluj wybór"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Prawa sekcja: Narzędzia dopasowania i zoomu */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              isCompact ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isCompact ? 'Tryb Standard' : 'Kompaktowy'}
          </button>

          <button
            onClick={() => setIsAutoFit(!isAutoFit)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              isAutoFit ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
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

      {/* ── KONTENER SIATKI TABELARYCZNEJ (KLASY X DNI X GODZINY) ── */}
      <div 
        ref={containerRef}
        className={`flex-1 p-2 sm:p-3 relative bg-slate-100 flex items-start justify-center ${
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
            className="border-collapse text-left border border-slate-300 bg-white shadow-xs rounded-xl overflow-hidden"
          >
            <thead>
              {/* WIERSZ 1 NAGŁÓWKA: DNI TYGODNIA */}
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                <th 
                  rowSpan={2}
                  className="px-3 py-2 text-center text-xs font-black uppercase tracking-wider text-slate-700 border-r border-slate-300 bg-slate-100 sticky left-0 z-20 min-w-[110px]"
                >
                  Klasa (Oddział)
                </th>
                {DAYS.map((dayName, dIdx) => (
                  <th 
                    key={dIdx}
                    colSpan={8}
                    className="px-2 py-1.5 text-center text-xs font-black uppercase tracking-wider text-blue-800 border-r border-slate-300 bg-blue-50/60"
                  >
                    {dayName}
                  </th>
                ))}
              </tr>

              {/* WIERSZ 2 NAGŁÓWKA: GODZINY LEKCJI (DLA KAŻDEGO DNIA) */}
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-300 text-[10px] font-bold">
                {DAYS.map((_, dIdx) => 
                  DEFAULT_HOURS.map(h => (
                    <th 
                      key={`${dIdx}_${h.num}`}
                      className={`px-1 py-1 text-center border-r border-slate-200 font-mono ${
                        isCompact ? 'w-[50px] min-w-[50px]' : 'w-[64px] min-w-[64px]'
                      }`}
                    >
                      <span className="block text-slate-800 font-black">{h.num}</span>
                      <span className="text-[9px] text-slate-400 hidden sm:block truncate">{h.range.split(' ')[0]}</span>
                    </th>
                  ))
                )}
              </tr>
            </thead>

            {/* POZOSTAŁE WIERSZE: WSZYSTKIE KLASY / ODDZIAŁY */}
            <tbody className="divide-y divide-slate-200">
              {pl.classes.map(cls => (
                <tr key={cls.id} className="hover:bg-blue-50/30 transition">
                  
                  {/* Stała pierwsza kolumna: Nazwa klasy */}
                  <td className="px-3 py-1.5 bg-white sticky left-0 z-10 border-r border-slate-300 font-black text-xs text-slate-900 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                        style={{ backgroundColor: cls.color || '#3b82f6' }} 
                      />
                      <span className="truncate">{cls.name}</span>
                    </div>
                  </td>

                  {/* Komórki siatki: dni i godziny */}
                  {DAYS.map((_, dayIdx) => 
                    DEFAULT_HOURS.map((_, hourIdx) => {
                      const cellKey = `${cls.id}|${dayIdx}|${hourIdx}`;
                      const lesson = lessonsMap[cellKey];

                      let subject: Subject | undefined;
                      let teacher: Teacher | undefined;
                      let room: ClassRoom | undefined;

                      if (lesson && lesson.assignmentId) {
                        const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
                        if (asg) {
                          subject = pl.subjects.find(s => s.id === asg.subjectId);
                          teacher = pl.teachers.find(t => t.id === asg.teacherId);
                          if (asg.roomId) {
                            room = pl.rooms.find(r => r.id === asg.roomId);
                          }
                        }
                      }

                      return (
                        <td
                          key={cellKey}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            let data: any = null;
                            try {
                              const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                              if (raw) data = JSON.parse(raw);
                            } catch (err) {}

                            if (data && data.assignmentId) {
                              handlePlaceLesson(data, cls.id, dayIdx, hourIdx);
                            } else if (selectedPoolLesson) {
                              handlePlaceLesson(selectedPoolLesson, cls.id, dayIdx, hourIdx);
                            }
                          }}
                          onClick={() => {
                            if (selectedPoolLesson) {
                              handlePlaceLesson(selectedPoolLesson, cls.id, dayIdx, hourIdx);
                            } else if (!lesson) {
                              setQuickAddCell({
                                classId: cls.id,
                                className: cls.name,
                                dayIdx,
                                hourIdx
                              });
                            }
                          }}
                          onMouseEnter={() => {
                            if (lesson) {
                              setHoveredCell({
                                className: cls.name,
                                dayName: DAYS[dayIdx],
                                hourNum: hourIdx + 1,
                                subjectName: subject?.name || 'Przedmiot',
                                teacherName: teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nieprzypisany',
                                roomName: room?.name || 'Brak sali'
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`p-0.5 border-r border-b border-slate-200 transition relative group cursor-pointer ${
                            lesson 
                              ? 'bg-white hover:bg-slate-50' 
                              : selectedPoolLesson 
                              ? 'hover:bg-blue-50/60' 
                              : 'hover:bg-slate-100/70'
                          } ${isCompact ? 'h-8 max-h-8' : 'h-10 max-h-10'}`}
                        >
                          {lesson ? (
                            <div 
                              className="w-full h-full rounded-md p-1 flex flex-col justify-between overflow-hidden shadow-2xs border border-slate-200"
                              style={{ 
                                backgroundColor: subject?.color ? `${subject.color}15` : '#3b82f615',
                                borderLeftColor: subject?.color || '#3b82f6',
                                borderLeftWidth: '3px'
                              }}
                            >
                              <div className="flex items-center justify-between gap-0.5 leading-none">
                                <span className="font-extrabold text-[10px] text-slate-900 truncate">
                                  {subject?.short || subject?.name?.slice(0, 4) || 'Lekcja'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveLesson(cellKey, e)}
                                  className="opacity-0 group-hover:opacity-100 hover:bg-rose-500 rounded p-0.5 text-slate-400 hover:text-white transition cursor-pointer"
                                  title="Usuń lekcję z tego slotu"
                                >
                                  <X size={10} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono leading-none">
                                <span className="font-black text-indigo-700">{teacher?.abbr || '—'}</span>
                                {room && (
                                  <span className="text-[8px] bg-white border border-slate-200 px-1 rounded text-slate-600 font-bold">
                                    {room.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-80 transition text-slate-400">
                              <Plus size={12} />
                            </div>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PASEK INSPEKTORA NA ŻYWO (LIVE INSPECTOR) ── */}
      <div className="bg-white border-t border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between shrink-0 shadow-2xs">
        <div>
          {hoveredCell ? (
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-900">Klasa {hoveredCell.className}</span>
              <span>•</span>
              <span className="text-slate-700">{hoveredCell.dayName}, Lekcja {hoveredCell.hourNum}</span>
              <span>•</span>
              <span className="font-bold text-blue-700">{hoveredCell.subjectName}</span>
              <span>•</span>
              <span className="text-indigo-700 font-medium">{hoveredCell.teacherName}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">Sala: {hoveredCell.roomName}</span>
            </div>
          ) : (
            <span>Najedź na komórkę, aby wyświetlić szczegóły lekcji. Przeciągaj lekcje z Ekranu 1 lub klikaj komórki, aby wstawiać zajęcia.</span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Siatka zsynchronizowana z Ekranem 1
        </div>
      </div>

      {/* ── SZYBKI MODAL DODAWANIA PRZEDMIOTU DO KOMÓRKI ── */}
      {quickAddCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Wstaw lekcję do planu
                </h3>
                <p className="text-xs text-slate-500">
                  Klasa: <strong className="text-slate-800">{quickAddCell.className}</strong> • {DAYS[quickAddCell.dayIdx]}, Lekcja {quickAddCell.hourIdx + 1}
                </p>
              </div>
              <button
                onClick={() => setQuickAddCell(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista przydziałów dla tej klasy */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {pl.assignments.filter(a => a.classId === quickAddCell.classId).length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  Brak zdefiniowanych przydziałów przedmiotów dla tej klasy w kreatorze.
                </div>
              ) : (
                pl.assignments
                  .filter(a => a.classId === quickAddCell.classId)
                  .map(asg => {
                    const subject = pl.subjects.find(s => s.id === asg.subjectId);
                    const teacher = pl.teachers.find(t => t.id === asg.teacherId);
                    const currentPlaced = Object.values(lessonsMap).filter(l => l && l.assignmentId === asg.id).length;

                    return (
                      <button
                        key={asg.id}
                        type="button"
                        onClick={() => {
                          handlePlaceLesson(asg, quickAddCell.classId, quickAddCell.dayIdx, quickAddCell.hourIdx);
                          setQuickAddCell(null);
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 text-left transition flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                            style={{ backgroundColor: subject?.color || '#3b82f6' }} 
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-900 block truncate">
                              {subject?.name || 'Przedmiot'}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Brak nauczyciela'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold text-indigo-600 block">
                            {currentPlaced} / {asg.hoursPerWeek || 0} godz.
                          </span>
                          <span className="text-[10px] text-slate-400 block">Wybierz →</span>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setQuickAddCell(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border border-slate-200"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
