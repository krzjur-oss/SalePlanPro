import React, { useState, useMemo } from 'react';
import { 
  AppState, SchedData, PlanVariant, Class, Teacher, Subject, ClassRoom, Assignment, Lesson 
} from '../types';
import { 
  dualScreenService 
} from '../services/dualScreenService';
import { 
  Sparkles, Layers, MapPin, Shield, Printer, BarChart2, Sliders, HelpCircle,
  Monitor, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, Search,
  Filter, Building2, User, BookOpen, Clock, ArrowRight, Play, Trash2,
  ChevronRight, GripVertical, Check, Plus, AlertCircle, DoorOpen
} from 'lucide-react';
import { isSportsFacility } from './PlanKlas';
import { isNIRoom } from './CompanionWindowView';

interface DualScreenMasterViewProps {
  currentTab: 'kreator' | 'plan_klas' | 'plan_sal' | 'dyzury' | 'wydruki' | 'statystyki' | 'o_programie' | 'ustawienia_generatorow';
  appState: AppState;
  schedData: SchedData;
  activeVariant: PlanVariant | null;
  planVariants: PlanVariant[];
  onChangeAppState: (newState: AppState | ((prev: AppState) => AppState)) => void;
  onChangeSchedData: (newSched: SchedData) => void;
  onSwitchVariant: (variantId: string) => void;
  onNavigateToTab: (tab: any) => void;
  onToggleSingleScreen: () => void;
  onRecallCompanionWindow: () => void;
}

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export default function DualScreenMasterView({
  currentTab,
  appState,
  schedData,
  activeVariant,
  planVariants,
  onChangeAppState,
  onChangeSchedData,
  onSwitchVariant,
  onNavigateToTab,
  onToggleSingleScreen,
  onRecallCompanionWindow
}: DualScreenMasterViewProps) {
  const pl = appState.planLekcji;

  // ─────────────────────────────────────────────────────────────
  // 1. KREATOR SZKOŁY: Widok aktywnej konfiguracji szkoły (Ekran 1)
  // ─────────────────────────────────────────────────────────────
  const [kreatorPreviewTab, setKreatorPreviewTab] = useState<'classes' | 'teachers' | 'rooms' | 'overview'>('overview');
  const [kreatorSearch, setKreatorSearch] = useState('');

  const stats = useMemo(() => {
    const totalClasses = pl.classes?.length || 0;
    const totalTeachers = pl.teachers?.length || 0;
    const totalRooms = pl.rooms?.length || 0;
    const generalRooms = pl.rooms?.filter(r => !isSportsFacility(r) && !isNIRoom(r)).length || 0;
    const sportsRooms = pl.rooms?.filter(r => isSportsFacility(r)).length || 0;
    const niRooms = pl.rooms?.filter(r => isNIRoom(r)).length || 0;
    
    // Total hours in assignments
    const totalWeeklyHours = pl.assignments?.reduce((acc, a) => acc + (a.hoursPerWeek || 0), 0) || 0;
    
    // Planned hours
    const plannedHours = Object.keys(pl.lessons || {}).length;

    return {
      totalClasses,
      totalTeachers,
      totalRooms,
      generalRooms,
      sportsRooms,
      niRooms,
      totalWeeklyHours,
      plannedHours
    };
  }, [pl]);

  // ─────────────────────────────────────────────────────────────
  // 2. ETAP 1 PLAN KLAS: Pula godzin lekcyjnych + Generator (Ekran 1)
  // ─────────────────────────────────────────────────────────────
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [lessonPoolSearch, setLessonPoolSearch] = useState<string>('');
  const [activeSelectedPoolLessonId, setActiveSelectedPoolLessonId] = useState<string | null>(null);

  // Generator options
  const [genMaxGaps, setGenMaxGaps] = useState<number>(2);
  const [genNoStudentGaps, setGenNoStudentGaps] = useState<boolean>(true);
  const [genObeyAvailability, setGenObeyAvailability] = useState<boolean>(true);
  const [genAvoidExtremes, setGenAvoidExtremes] = useState<boolean>(true);
  const [genAllowDoubleBlocks, setGenAllowDoubleBlocks] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Assignments analysis with planned count
  const classAssignmentsPool = useMemo(() => {
    const assignmentsMap = new Map<string, {
      asg: Assignment;
      targetClass?: Class;
      subject?: Subject;
      teacher?: Teacher;
      totalHours: number;
      placedHours: number;
      remainingHours: number;
    }>();

    // Count how many lessons placed for each assignment
    const countMap: Record<string, number> = {};
    Object.values(pl.lessons || {}).forEach(l => {
      if (l && l.assignmentId) {
        countMap[l.assignmentId] = (countMap[l.assignmentId] || 0) + 1;
      }
    });

    (pl.assignments || []).forEach(asg => {
      if (selectedClassId !== 'all' && asg.classId !== selectedClassId) return;

      const targetClass = pl.classes.find(c => c.id === asg.classId);
      const subject = pl.subjects.find(s => s.id === asg.subjectId);
      const teacher = pl.teachers.find(t => t.id === asg.teacherId);

      const placed = countMap[asg.id] || 0;
      const total = asg.hoursPerWeek || 0;
      const remaining = Math.max(0, total - placed);

      if (lessonPoolSearch) {
        const q = lessonPoolSearch.toLowerCase();
        const matchCls = targetClass?.name.toLowerCase().includes(q);
        const matchSub = subject?.name.toLowerCase().includes(q);
        const matchTea = teacher?.last.toLowerCase().includes(q) || teacher?.abbr.toLowerCase().includes(q);
        if (!matchCls && !matchSub && !matchTea) return;
      }

      assignmentsMap.set(asg.id, {
        asg,
        targetClass,
        subject,
        teacher,
        totalHours: total,
        placedHours: placed,
        remainingHours: remaining
      });
    });

    return Array.from(assignmentsMap.values());
  }, [pl.assignments, pl.lessons, pl.classes, pl.subjects, pl.teachers, selectedClassId, lessonPoolSearch]);

  const handleSelectPoolLesson = (item: any) => {
    setActiveSelectedPoolLessonId(item.asg.id);
    // Broadcast to Companion Screen
    dualScreenService.sendMessage({
      type: 'SELECT_LESSON_POOL',
      payload: {
        assignmentId: item.asg.id,
        classId: item.asg.classId,
        className: item.targetClass?.name || item.asg.classId,
        subjectId: item.asg.subjectId,
        subjectName: item.subject?.name || '',
        subjectShort: item.subject?.short || '',
        subjectColor: item.subject?.color || '#3b82f6',
        teacherAbbr: item.teacher?.abbr || '',
        totalHours: item.totalHours,
        remainingHours: item.remainingHours
      },
      timestamp: Date.now()
    });
  };

  const handleRunGeneratorFromScreen1 = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        // Build auto-placement for remaining unplaced lessons
        const currentLessons = { ...(pl.lessons || {}) };
        const teachersOccupied: Record<string, boolean> = {}; // "teacherId|day|hour"
        const classesOccupied: Record<string, boolean> = {};  // "classId|day|hour"

        // Mark existing occupied slots
        Object.entries(currentLessons).forEach(([key, lesson]) => {
          const parts = key.split('|');
          const cId = parts[0];
          const dIdx = parts[1];
          const hIdx = parts[2];
          classesOccupied[`${cId}|${dIdx}|${hIdx}`] = true;

          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
          if (asg && asg.teacherId) {
            teachersOccupied[`${asg.teacherId}|${dIdx}|${hIdx}`] = true;
          }
        });

        let placedCount = 0;
        // Iterate through all assignments and place remaining hours
        (pl.assignments || []).forEach(asg => {
          const currentPlaced = Object.values(currentLessons).filter(l => l.assignmentId === asg.id).length;
          let needed = (asg.hoursPerWeek || 0) - currentPlaced;
          if (needed <= 0) return;

          for (let d = 0; d < 5 && needed > 0; d++) {
            for (let h = 0; h < 8 && needed > 0; h++) {
              const classKey = `${asg.classId}|${d}|${h}`;
              const teacherKey = asg.teacherId ? `${asg.teacherId}|${d}|${h}` : null;

              if (!classesOccupied[classKey] && (!teacherKey || !teachersOccupied[teacherKey])) {
                // Place lesson
                currentLessons[classKey] = {
                  assignmentId: asg.id,
                  locked: false
                };
                classesOccupied[classKey] = true;
                if (teacherKey) teachersOccupied[teacherKey] = true;
                placedCount++;
                needed--;
              }
            }
          }
        });

        onChangeAppState(prev => ({
          ...prev,
          planLekcji: {
            ...prev.planLekcji,
            lessons: currentLessons
          }
        }));

        // Broadcast to Companion Screen
        dualScreenService.sendMessage({
          type: 'UPDATE_LESSONS',
          payload: { lessons: currentLessons },
          timestamp: Date.now()
        });

        alert(`Automatyczny generator zakończył pracę! Rozmieszczono ${placedCount} lekcji w planie.`);
      } catch (err) {
        console.error('Błąd generatora:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 400);
  };

  const handleClearAllLessons = () => {
    if (!confirm('Czy jesteś pewien, że chcesz wyczyścić wszystkie lekcje z planu klas?')) return;
    onChangeAppState(prev => ({
      ...prev,
      planLekcji: {
        ...prev.planLekcji,
        lessons: {}
      }
    }));
    dualScreenService.sendMessage({
      type: 'UPDATE_LESSONS',
      payload: { lessons: {} },
      timestamp: Date.now()
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 3. ETAP 2 PLAN SAL: Pula zajęć zaplanowanych na dany dzień (Ekran 1)
  // ─────────────────────────────────────────────────────────────
  const [salSelectedDay, setSalSelectedDay] = useState<number>(0); // 0=Poniedziałek
  const [salSearchQuery, setSalSearchQuery] = useState<string>('');

  // Lessons scheduled on salSelectedDay grouped by hour
  const dayScheduledHours = useMemo(() => {
    const hoursCount = 8;
    const hoursList = [];

    for (let h = 0; h < hoursCount; h++) {
      const lessonsInHour: Array<{
        key: string;
        classId: string;
        className: string;
        subjectName: string;
        subjectShort: string;
        subjectColor: string;
        teacherAbbr: string;
        teacherName: string;
        assignedRoomId?: string | null;
        assignedRoomName?: string;
        asg: Assignment;
      }> = [];

      Object.entries(pl.lessons || {}).forEach(([key, lesson]) => {
        const parts = key.split('|');
        const cId = parts[0];
        const d = parseInt(parts[1], 10);
        const hour = parseInt(parts[2], 10);

        if (d === salSelectedDay && hour === h) {
          const targetClass = pl.classes.find(c => c.id === cId);
          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
          const subject = asg ? pl.subjects.find(s => s.id === asg.subjectId) : null;
          const teacher = asg ? pl.teachers.find(t => t.id === asg.teacherId) : null;

          const assignedRoom = asg?.roomId ? pl.rooms.find(r => r.id === asg.roomId) : null;

          if (salSearchQuery) {
            const q = salSearchQuery.toLowerCase();
            const matchCls = targetClass?.name.toLowerCase().includes(q);
            const matchSub = subject?.name.toLowerCase().includes(q);
            const matchTea = teacher?.abbr.toLowerCase().includes(q);
            if (!matchCls && !matchSub && !matchTea) return;
          }

          if (asg) {
            lessonsInHour.push({
              key,
              classId: cId,
              className: targetClass?.name || cId,
              subjectName: subject?.name || 'Zajęcia',
              subjectShort: subject?.short || 'Zaj',
              subjectColor: subject?.color || '#3b82f6',
              teacherAbbr: teacher?.abbr || '—',
              teacherName: teacher ? `${teacher.first} ${teacher.last}` : '',
              assignedRoomId: asg.roomId,
              assignedRoomName: assignedRoom?.name,
              asg
            });
          }
        }
      });

      hoursList.push({
        hourIdx: h,
        hourNum: h + 1,
        timeRange: `${7 + h + 1}:00 - ${7 + h + 1}:45`,
        lessons: lessonsInHour
      });
    }

    return hoursList;
  }, [pl.lessons, pl.classes, pl.assignments, pl.subjects, pl.teachers, pl.rooms, salSelectedDay, salSearchQuery]);

  const handleHighlightLessonOnScreen2 = (lessonItem: any, hourIdx: number) => {
    dualScreenService.sendMessage({
      type: 'PLAN_KLAS_HIGHLIGHT',
      payload: {
        dayIdx: salSelectedDay,
        hourIdx,
        classId: lessonItem.classId,
        className: lessonItem.className,
        subjectName: lessonItem.subjectName,
        subjectShort: lessonItem.subjectShort,
        teacherAbbr: lessonItem.teacherAbbr,
        currentRoomName: lessonItem.assignedRoomName
      },
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 text-slate-800 overflow-hidden select-none">
      
      {/* ── PASEK INFORMACYJNY TRYBU 2 EKRANÓW (EKRAN 1) ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-xs text-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-xs flex items-center justify-center">
            <Monitor size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                Ekran 1 (Główny) • Tryb 2 Ekrany
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ekran 2 zsynchronizowany
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {currentTab === 'kreator' && 'Pokazuje aktywną konfigurację szkoły. Na Ekranie 2 możesz utworzyć nowy wariant.'}
              {currentTab === 'plan_klas' && 'Pula godzin lekcyjnych & Ustawienia generatora. Na Ekranie 2 otwarta jest siatka klas i godzin.'}
              {currentTab === 'plan_sal' && 'Pula zajęć dnia z podziałem na godziny. Na Ekranie 2 otwarta jest siatka sal z lokalizacjami.'}
              {(currentTab === 'dyzury' || currentTab === 'wydruki' || currentTab === 'statystyki' || currentTab === 'ustawienia_generatorow' || currentTab === 'o_programie') && 'Wybrany moduł w trybie dwóch ekranów.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRecallCompanionWindow}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Przywołaj Okno Towarzyszące (Ekran 2) na wierzch"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Przywołaj Ekran 2</span>
          </button>
          <button
            onClick={onToggleSingleScreen}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Przełącz z powrotem na standardowy widok pojedynczego ekranu"
          >
            <span>Tryb 1 ekranu</span>
          </button>
        </div>
      </div>

      {/* ── GŁÓWNA ZAWARTOŚĆ DLA AKTYWNEJ ZAKŁADKI W TRYBIE 2 EKRANÓW ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">

        {/* ══════════════════════════════════════════════════════════════
            1. KREATOR SZKOŁY: Ostatnia konfiguracja szkoły (wariant aktywny)
            ══════════════════════════════════════════════════════════════ */}
        {currentTab === 'kreator' && (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Karta aktywnego wariantu szkoły */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
                      Wariant Aktywny
                    </span>
                    <span className="text-slate-500 text-xs font-medium">
                      Ostatnia konfiguracja bazy szkoły
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {activeVariant?.name || 'Wariant Główny (Podstawowy)'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeVariant?.description || 'Podstawowa konfiguracja organizacyjna szkoły i rozkładu zajęć.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Szkoła</span>
                    <span className="text-sm font-extrabold text-slate-800 block">
                      {appState.school?.name || 'Szkoła Demonstracyjna'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Rok szkolny: {appState.yearLabel || '2025/2026'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kluczowe wskaźniki bilansu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                    <Layers size={14} className="text-blue-600" />
                    <span>Oddziały (Klasy)</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalClasses}</div>
                  <span className="text-[10px] text-slate-400">Zarejestrowanych oddziałów</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                    <User size={14} className="text-emerald-600" />
                    <span>Kadra Nauczycieli</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalTeachers}</div>
                  <span className="text-[10px] text-slate-400">Wszyscy pedagodzy</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                    <DoorOpen size={14} className="text-amber-600" />
                    <span>Gabinety & Sale</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalRooms}</div>
                  <span className="text-[10px] text-slate-500">
                    Ogólne: {stats.generalRooms} • WF: {stats.sportsRooms} • NI: {stats.niRooms}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                    <Clock size={14} className="text-indigo-600" />
                    <span>Godziny w Tygodniu</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalWeeklyHours}</div>
                  <span className="text-[10px] text-slate-500">
                    Zaplanowano: {stats.plannedHours} z {stats.totalWeeklyHours} godz.
                  </span>
                </div>
              </div>
            </div>

            {/* Przegląd szczegółów aktywnej konfiguracji */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-slate-800">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setKreatorPreviewTab('overview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      kreatorPreviewTab === 'overview' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Podsumowanie
                  </button>
                  <button
                    onClick={() => setKreatorPreviewTab('classes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      kreatorPreviewTab === 'classes' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Klasy ({stats.totalClasses})
                  </button>
                  <button
                    onClick={() => setKreatorPreviewTab('teachers')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      kreatorPreviewTab === 'teachers' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nauczyciele ({stats.totalTeachers})
                  </button>
                  <button
                    onClick={() => setKreatorPreviewTab('rooms')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      kreatorPreviewTab === 'rooms' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sale ({stats.totalRooms})
                  </button>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={kreatorSearch}
                    onChange={(e) => setKreatorSearch(e.target.value)}
                    placeholder="Filtruj zestawienie..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Tabela Klas */}
              {kreatorPreviewTab === 'classes' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Oddział</th>
                        <th className="px-4 py-3">Poziom / Rocznik</th>
                        <th className="px-4 py-3">Wychowawca</th>
                        <th className="px-4 py-3">Sala Bazowa</th>
                        <th className="px-4 py-3">Liczba Uczniów</th>
                        <th className="px-4 py-3">Suma Godzin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pl.classes
                        .filter(c => !kreatorSearch || c.name.toLowerCase().includes(kreatorSearch.toLowerCase()))
                        .map(cls => {
                          const classAssignments = pl.assignments.filter(a => a.classId === cls.id);
                          const totalHours = classAssignments.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0);
                          return (
                            <tr key={cls.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2.5 font-black text-slate-900 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color || '#3b82f6' }} />
                                {cls.name}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">Klasa {cls.year || cls.name[0] || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700 font-medium">
                                {cls.abbr || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{cls.baseClass || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-500">{cls.students || 24} uczniów</td>
                              <td className="px-4 py-2.5 font-bold text-indigo-600">{totalHours} godz./tydz.</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabela Nauczycieli */}
              {kreatorPreviewTab === 'teachers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nauczyciel</th>
                        <th className="px-4 py-3">Skrót</th>
                        <th className="px-4 py-3">Pensum</th>
                        <th className="px-4 py-3">Przydzielone Godziny</th>
                        <th className="px-4 py-3">Nadgodziny</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pl.teachers
                        .filter(t => !kreatorSearch || `${t.first} ${t.last}`.toLowerCase().includes(kreatorSearch.toLowerCase()) || t.abbr.toLowerCase().includes(kreatorSearch.toLowerCase()))
                        .map(tea => {
                          const teaAssignments = pl.assignments.filter(a => a.teacherId === tea.id);
                          const totalAssigned = teaAssignments.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0);
                          const maxH = tea.maxHours || 18;
                          const overtime = Math.max(0, totalAssigned - maxH);
                          return (
                            <tr key={tea.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                {tea.first} {tea.last}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-black text-indigo-600">{tea.abbr}</td>
                              <td className="px-4 py-2.5 text-slate-500">{maxH} godz.</td>
                              <td className="px-4 py-2.5 font-extrabold text-slate-800">{totalAssigned} godz.</td>
                              <td className="px-4 py-2.5 font-bold text-amber-600">
                                {overtime > 0 ? `+${overtime} godz.` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabela Sal */}
              {kreatorPreviewTab === 'rooms' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Sala</th>
                        <th className="px-4 py-3">Typ</th>
                        <th className="px-4 py-3">Opis</th>
                        <th className="px-4 py-3">Pojemność</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pl.rooms
                        .filter(r => !kreatorSearch || r.name.toLowerCase().includes(kreatorSearch.toLowerCase()))
                        .map(r => (
                          <tr key={r.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-2.5 font-black text-slate-900">{r.name}</td>
                            <td className="px-4 py-2.5">
                              {isSportsFacility(r) ? (
                                <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Sportowa
                                </span>
                              ) : isNIRoom(r) ? (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  NI / Wsparcie
                                </span>
                              ) : (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Ogólna
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{r.desc || 'Sala lekcyjna'}</td>
                            <td className="px-4 py-2.5 text-slate-700 font-bold">{r.capacity || 26} miejsc</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Podsumowanie ogólne */}
              {kreatorPreviewTab === 'overview' && (
                <div className="p-6 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    Konfiguracja szkoły w aktywnym wariancie jest zsynchronizowana
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                    Na tym ekranie wyświetlane są aktualne parametry aktywnego wariantu szkoły. Aby utworzyć kolejny scenariusz, semestr lub wariant roboczy z nowymi przydziałami, przejdź do <strong className="text-slate-900 font-bold">Ekranu 2 (Drugie Okno)</strong>, gdzie dostępny jest interaktywny formularz tworzenia nowego wariantu.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            2. ETAP 1 PLAN KLAS: Wszystkie godziny lekcyjne + Generator
            ══════════════════════════════════════════════════════════════ */}
        {currentTab === 'plan_klas' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Lewa kolumna (7/12): Wszystkie godziny lekcyjne do umieszczenia w planie */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex-1 flex flex-col text-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <BookOpen size={17} className="text-blue-600" />
                      Pula godzin lekcyjnych do umieszczenia
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Przeciągnij kartę lub kliknij, aby wybrać lekcję i wstawić ją na siatce Ekranu 2
                    </p>
                  </div>

                  {/* Filtr klas */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Wszystkie klasy ({pl.classes.length})</option>
                      {pl.classes.map(c => (
                        <option key={c.id} value={c.id}>Klasa {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pasek wyszukiwania w puli */}
                <div className="mt-3 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={lessonPoolSearch}
                    onChange={(e) => setLessonPoolSearch(e.target.value)}
                    placeholder="Szukaj przedmiotu, klasy, nauczyciela..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Lista kart lekcji */}
                <div className="mt-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {classAssignmentsPool.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium">
                      Brak lekcji spełniających kryteria wyszukiwania.
                    </div>
                  ) : (
                    classAssignmentsPool.map(item => {
                      const isComplete = item.remainingHours === 0;
                      const isSelected = activeSelectedPoolLessonId === item.asg.id;

                      return (
                        <div
                          key={item.asg.id}
                          draggable={!isComplete}
                          onDragStart={(e) => {
                            const payload = JSON.stringify({
                              type: 'ASSIGNMENT_DROP',
                              assignmentId: item.asg.id,
                              classId: item.asg.classId,
                              className: item.targetClass?.name || item.asg.classId,
                              subjectId: item.asg.subjectId,
                              subjectName: item.subject?.name || '',
                              subjectShort: item.subject?.short || '',
                              subjectColor: item.subject?.color || '#3b82f6',
                              teacherAbbr: item.teacher?.abbr || '',
                              teacherId: item.teacher?.id
                            });
                            e.dataTransfer.setData('application/json', payload);
                            e.dataTransfer.setData('text/plain', payload);
                            handleSelectPoolLesson(item);
                          }}
                          onClick={() => handleSelectPoolLesson(item)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/40'
                              : isComplete
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="text-slate-400 cursor-grab shrink-0">
                              <GripVertical size={16} />
                            </div>
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: item.subject?.color || '#3b82f6' }} 
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 truncate">
                                  {item.subject?.name || 'Przedmiot'}
                                </span>
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-1.5 py-0.2 rounded font-mono">
                                  {item.targetClass?.name}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 block truncate">
                                Prowadzący: {item.teacher ? `${item.teacher.first} ${item.teacher.last} (${item.teacher.abbr})` : 'Nieprzypisany'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-black block text-slate-800">
                                {item.placedHours} / {item.totalHours} godz.
                              </span>
                              <span className={`text-[10px] font-bold block ${
                                isComplete ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {isComplete ? 'Komplet ✓' : `Pozostało: ${item.remainingHours} godz.`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPoolLesson(item);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                isSelected 
                                  ? 'bg-blue-600 text-white shadow-xs' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'Wybrano' : 'Wstaw'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Prawa kolumna (5/12): Ustawienia generatora planu lekcji */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex-1 flex flex-col justify-between text-slate-800">
                <div>
                  <div className="border-b border-slate-200 pb-3.5 mb-4">
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Sliders size={17} className="text-indigo-600" />
                      Ustawienia generatora planu lekcji
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Parametry i wagi dla algorytmu rozmieszczania siatki lekcji
                    </p>
                  </div>

                  {/* Formularz kryteriów generatora */}
                  <div className="space-y-4 text-xs">
                    
                    {/* Maksymalna liczba okienek */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-800">Maks. okienek u nauczyciela:</span>
                        <span className="font-black text-indigo-600 text-sm">{genMaxGaps}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        value={genMaxGaps}
                        onChange={(e) => setGenMaxGaps(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        0 = całkowity brak okienek (najwyższy rygor), 2 = kompromis
                      </span>
                    </div>

                    {/* Brak okienek u uczniów */}
                    <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer hover:bg-slate-100/80 transition">
                      <input
                        type="checkbox"
                        checked={genNoStudentGaps}
                        onChange={(e) => setGenNoStudentGaps(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Brak okienek u uczniów (Zwarty plan)</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Lekcje oddziałów układane są w ciągły blok bez przerw w środku dnia
                        </span>
                      </div>
                    </label>

                    {/* Dyspozycyjność nauczycieli */}
                    <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer hover:bg-slate-100/80 transition">
                      <input
                        type="checkbox"
                        checked={genObeyAvailability}
                        onChange={(e) => setGenObeyAvailability(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Przestrzegaj dyspozycyjności nauczycieli</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Nie planuj zajęć w zadeklarowanych dniach i godzinach niedostępności
                        </span>
                      </div>
                    </label>

                    {/* Unikanie trudnych przedmiotów na skrajach */}
                    <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer hover:bg-slate-100/80 transition">
                      <input
                        type="checkbox"
                        checked={genAvoidExtremes}
                        onChange={(e) => setGenAvoidExtremes(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Ochrona godzin skrajnych</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Matematyka i fizyka w środku dnia, religia i plastyka na skrajach
                        </span>
                      </div>
                    </label>

                    {/* Bloki dwugodzinne */}
                    <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer hover:bg-slate-100/80 transition">
                      <input
                        type="checkbox"
                        checked={genAllowDoubleBlocks}
                        onChange={(e) => setGenAllowDoubleBlocks(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Zezwalaj na bloki 2-godzinne</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Umożliwia łączenie lekcji WF, pracowni lub języków w bloki podwójne
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Przyciski wykonawcze generatora */}
                <div className="pt-4 border-t border-slate-200 space-y-2 mt-4">
                  <button
                    onClick={handleRunGeneratorFromScreen1}
                    disabled={isGenerating}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Generowanie siatki planu...</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} className="fill-white" />
                        <span>Uruchom automatyczny generator planu</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleClearAllLessons}
                    className="w-full py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Trash2 size={13} />
                    <span>Wyczyść siatkę planu klas</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            3. ETAP 2 PLAN SAL: Pula zajęć zaplanowanych na dany dzień (Ekran 1)
            ══════════════════════════════════════════════════════════════ */}
        {currentTab === 'plan_sal' && (
          <div className="max-w-7xl mx-auto space-y-5">
            
            {/* Pasek wyboru dnia oraz wyszukiwarki */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin size={17} className="text-teal-600" />
                  Pula zajęć zaplanowanych na dany dzień (wg Etapu 1)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wybierz dzień tygodnia, aby przejrzeć zajęcia wymagające przypisania do sal na Ekranie 2
                </p>
              </div>

              {/* Przyciski dni tygodnia */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
                {DAYS.map((dayName, dIdx) => (
                  <button
                    key={dIdx}
                    onClick={() => setSalSelectedDay(dIdx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap ${
                      salSelectedDay === dIdx
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {dayName}
                  </button>
                ))}
              </div>
            </div>

            {/* Siatka godzinowa dnia */}
            <div className="space-y-4">
              {dayScheduledHours.map(hourGroup => (
                <div 
                  key={hourGroup.hourIdx}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs font-black px-2 py-0.5 rounded-md font-mono">
                        Lekcja {hourGroup.hourNum}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {hourGroup.timeRange}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Liczba zaplanowanych grup: <strong className="text-slate-900 font-bold">{hourGroup.lessons.length}</strong>
                    </span>
                  </div>

                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {hourGroup.lessons.length === 0 ? (
                      <div className="col-span-full py-4 text-center text-xs text-slate-400">
                        Brak zajęć oddziałowych zaplanowanych w tym slocie godzinowym.
                      </div>
                    ) : (
                      hourGroup.lessons.map(lessonItem => {
                        const hasRoom = !!lessonItem.assignedRoomId;
                        return (
                          <div
                            key={lessonItem.key}
                            onClick={() => handleHighlightLessonOnScreen2(lessonItem, hourGroup.hourIdx)}
                            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                              hasRoom
                                ? 'bg-teal-50/40 border-teal-200/80 hover:border-teal-400'
                                : 'bg-amber-50/50 border-amber-300/80 hover:border-amber-400'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-1.5 py-0.2 rounded font-mono">
                                  Klasa {lessonItem.className}
                                </span>
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: lessonItem.subjectColor }} 
                                />
                              </div>
                              <h4 className="text-xs font-extrabold text-slate-900 mt-1.5 truncate">
                                {lessonItem.subjectName}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                Nauczyciel: {lessonItem.teacherAbbr} {lessonItem.teacherName && `(${lessonItem.teacherName})`}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                              {hasRoom ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  <DoorOpen size={11} />
                                  {lessonItem.assignedRoomName || 'Sala przydzielona'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded animate-pulse">
                                  <AlertTriangle size={11} />
                                  Brak sali
                                </span>
                              )}

                              <button
                                type="button"
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold"
                              >
                                Wskaż na Ekranie 2 →
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            4. ETAP 3 DYŻURY ORAZ KOLEJNE ZAKŁADKI: W budowie dla trybu 2 ekranów
            ══════════════════════════════════════════════════════════════ */}
        {(currentTab === 'dyzury' || currentTab === 'wydruki' || currentTab === 'statystyki' || currentTab === 'ustawienia_generatorow' || currentTab === 'o_programie') && (
          <div className="max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-5 text-slate-800">
            <div className="inline-flex p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600">
              <Shield size={36} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {currentTab === 'dyzury' && '🛡️ Etap 3: Dyżury nauczycielskie'}
                {currentTab === 'wydruki' && '🖨️ Wydruki i Publikacje'}
                {currentTab === 'statystyki' && '📊 Statystyki i Diagnoza'}
                {currentTab === 'ustawienia_generatorow' && '⚙️ Ustawienia generatorów'}
                {currentTab === 'o_programie' && 'ℹ️ O programie'}
              </h2>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mt-1">
                Moduł w budowie – Tryb dwóch ekranów
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
              Ten moduł w trybie pracy na dwa ekrany jest aktualnie w fazie projektowej. Aby korzystać z pełnej funkcjonalności tego modułu w tradycyjnym układzie, możesz jednym kliknięciem przełączyć się na standardowy tryb jednego ekranu.
            </p>
            <div className="pt-2">
              <button
                onClick={onToggleSingleScreen}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
              >
                Przełącz na standardowy tryb 1 ekranu
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
