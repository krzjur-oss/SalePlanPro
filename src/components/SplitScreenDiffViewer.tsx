/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Wizualna Porównywarka Wariantów Split-Screen Diff (SplitScreenDiffViewer.tsx) (Module 4)
 * Opis: Pełnoekranowy widok porównywania dwóch wersji planu side-by-side z synchronicznym
 *       przewijaniem, wyróżnianiem zmian, detekcją kolizji i cherry-pickingiem lekcji.
 *       Kolorystyka zharmonizowana ze standardem graficznym SalePlan Pro.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  ArrowLeft, 
  ArrowRight,
  Printer, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  GraduationCap, 
  DoorClosed, 
  Shield, 
  Search,
  Columns2,
  Table as TableIcon,
  Sparkles
} from 'lucide-react';
import { 
  AppState, 
  PlanVariant, 
  PlanVariantTag 
} from '../types';
import { 
  SplitViewDisplayMode, 
  DiffFilterEntity, 
  DiffSlotItem 
} from '../types/variantDiff';
import { 
  buildLookupCaches, 
  computeAllDiffs, 
  computeClassDiffs, 
  computeTeacherDiffs, 
  computeRoomDiffs, 
  computeDutyDiffs, 
  applySlotTransfer, 
  findLessonInLessons, 
  extractSlotItem, 
  areSlotsEquivalent,
  exportDiffToExcel 
} from '../services/variantDiffService';

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

const TAG_CONFIG: Record<PlanVariantTag, { label: string; bg: string; text: string; border: string }> = {
  semestr_1: { label: 'Semestr 1', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  semestr_2: { label: 'Semestr 2', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  roboczy:   { label: 'Roboczy / Szkic', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  awaryjny:  { label: 'Awaryjny', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  praktyki:  { label: 'Czas Praktyk', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  inna:      { label: 'Inny Wariant', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

interface SplitScreenDiffViewerProps {
  appState: AppState;
  planVariants: PlanVariant[];
  activeVariantId?: string;
  onUpdateVariants?: (variants: PlanVariant[]) => void;
  onApplyVariantToActive?: (variant: PlanVariant) => void;
  onBackToMain?: () => void;
}

export default function SplitScreenDiffViewer({
  appState,
  planVariants,
  activeVariantId,
  onUpdateVariants,
  onApplyVariantToActive,
  onBackToMain
}: SplitScreenDiffViewerProps) {
  const pl = appState.planLekcji;
  const lookups = useMemo(() => buildLookupCaches(appState), [appState]);

  // Stan wyboru wariantów A i B
  const [variantAId, setVariantAId] = useState<string>(() => {
    if (activeVariantId && planVariants.some(v => v.id === activeVariantId)) {
      return activeVariantId;
    }
    return planVariants[0]?.id || '';
  });

  const [variantBId, setVariantBId] = useState<string>(() => {
    const other = planVariants.find(v => v.id !== activeVariantId && v.id !== planVariants[0]?.id);
    return other?.id || planVariants[1]?.id || planVariants[0]?.id || '';
  });

  // Warianty w pamięci lokalnej komponentu (umożliwiającej cherry-picking)
  const [localVariants, setLocalVariants] = useState<PlanVariant[]>(planVariants);

  useEffect(() => {
    setLocalVariants(planVariants);
  }, [planVariants]);

  // Synchronizacja przy zmianie planVariants
  useEffect(() => {
    if (!variantAId && planVariants.length > 0) setVariantAId(planVariants[0].id);
    if (!variantBId && planVariants.length > 1) setVariantBId(planVariants[1].id);
  }, [planVariants, variantAId, variantBId]);

  const variantA = useMemo(() => localVariants.find(v => v.id === variantAId) || null, [localVariants, variantAId]);
  const variantB = useMemo(() => localVariants.find(v => v.id === variantBId) || null, [localVariants, variantBId]);

  // Tryby widoku i filtry
  const [displayMode, setDisplayMode] = useState<SplitViewDisplayMode>('split_screen');
  const [scope, setScope] = useState<DiffFilterEntity>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => pl.classes[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => pl.teachers[0]?.id || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => pl.rooms[0]?.id || '');
  const [filterOnlyChanged, setFilterOnlyChanged] = useState<boolean>(false);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Synchronizacja scrollowania pomiędzy panelem A i panelem B
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);

  const handleLeftScroll = () => {
    if (!syncScroll || isScrollingRef.current) return;
    if (leftPaneRef.current && rightPaneRef.current) {
      isScrollingRef.current = true;
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
      rightPaneRef.current.scrollLeft = leftPaneRef.current.scrollLeft;
      requestAnimationFrame(() => { isScrollingRef.current = false; });
    }
  };

  const handleRightScroll = () => {
    if (!syncScroll || isScrollingRef.current) return;
    if (leftPaneRef.current && rightPaneRef.current) {
      isScrollingRef.current = true;
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
      leftPaneRef.current.scrollLeft = rightPaneRef.current.scrollLeft;
      requestAnimationFrame(() => { isScrollingRef.current = false; });
    }
  };

  // Obliczenie wszystkich różnic i KPI
  const { items: allDiffs, kpi } = useMemo(() => {
    return computeAllDiffs(appState, variantA, variantB);
  }, [appState, variantA, variantB]);

  // Różnice dla bieżącego widoku (klasa, nauczyciel, sala lub dyżury)
  const currentScopeDiffs = useMemo(() => {
    if (!variantA || !variantB) return [];
    if (scope === 'class') {
      return computeClassDiffs(appState, variantA, variantB, selectedClassId);
    }
    if (scope === 'teacher') {
      return computeTeacherDiffs(appState, variantA, variantB, selectedTeacherId);
    }
    if (scope === 'room') {
      return computeRoomDiffs(appState, variantA, variantB, selectedRoomId);
    }
    if (scope === 'duty') {
      return computeDutyDiffs(appState, variantA, variantB);
    }
    return allDiffs;
  }, [scope, appState, variantA, variantB, selectedClassId, selectedTeacherId, selectedRoomId, allDiffs]);

  // Lista godzin lekcyjnych
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

  // Zamiana miejscami wariantu A i B
  const handleSwapVariants = () => {
    const temp = variantAId;
    setVariantAId(variantBId);
    setVariantBId(temp);
  };

  // Kopiowanie pojedynczego slotu z B do A lub A do B
  const handleTransferSlot = (
    toVariant: PlanVariant,
    classId: string,
    dayIdx: number,
    hourIdx: number,
    slotItem: DiffSlotItem | null
  ) => {
    const updated = applySlotTransfer(toVariant, slotItem?.lesson, classId, dayIdx, hourIdx);
    const newVariants = localVariants.map(v => v.id === updated.id ? updated : v);
    setLocalVariants(newVariants);
    if (onUpdateVariants) onUpdateVariants(newVariants);

    const slotLabel = slotItem ? `${slotItem.subject || 'Lekcja'}` : 'Wyczyszczenie okienka';
    setActionSuccessMsg(`Przeniesiono lekcję [${slotLabel}] do wariantu "${toVariant.name}"`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Eksport diff do pliku Excel
  const handleExportExcel = () => {
    if (!variantA || !variantB) return;
    exportDiffToExcel({
      variantA,
      variantB,
      diffItems: allDiffs,
      kpi
    }, appState);
  };

  // Drukuj raport diff
  const handlePrint = () => {
    window.print();
  };

  // Zastosuj wariant B jako bieżący aktywny plan
  const handleApplyVariant = () => {
    if (!variantB) return;
    if (window.confirm(`Czy na pewno chcesz zastosować Wariant "${variantB.name}" (${TAG_CONFIG[variantB.tag]?.label || variantB.tag}) jako główny aktywny plan lekcji szkoły? Dotychczasowy plan zostanie zaktualizowany.`)) {
      if (onApplyVariantToActive) {
        onApplyVariantToActive(variantB);
        setActionSuccessMsg(`Wariant "${variantB.name}" został pomyślnie ustawiony jako aktywny plan szkoły!`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    }
  };

  // Filtrowanie zbiorczej tabeli diff
  const filteredTableItems = useMemo(() => {
    if (!searchTableQuery) return allDiffs;
    const q = searchTableQuery.toLowerCase();
    return allDiffs.filter(item => {
      const matchEntity = item.entityName.toLowerCase().includes(q);
      const matchSubA = (item.itemA?.subject || '').toLowerCase().includes(q);
      const matchSubB = (item.itemB?.subject || '').toLowerCase().includes(q);
      const matchTchA = (item.itemA?.teacher || '').toLowerCase().includes(q) || (item.itemA?.teacherAbbr || '').toLowerCase().includes(q);
      const matchTchB = (item.itemB?.teacher || '').toLowerCase().includes(q) || (item.itemB?.teacherAbbr || '').toLowerCase().includes(q);
      const matchRmA = (item.itemA?.room || '').toLowerCase().includes(q);
      const matchRmB = (item.itemB?.room || '').toLowerCase().includes(q);
      return matchEntity || matchSubA || matchSubB || matchTchA || matchTchB || matchRmA || matchRmB;
    });
  }, [allDiffs, searchTableQuery]);

  // Pobranie lekcji dla danego slotu w wariancie
  const getSlotData = (variant: PlanVariant | null, dayIdx: number, hourIdx: number): DiffSlotItem | null => {
    if (!variant) return null;
    if (scope === 'class') {
      const slotNum = hours[hourIdx]?.num ?? (hourIdx + 1);
      const les = findLessonInLessons(variant.data.lessons, selectedClassId, dayIdx, hourIdx, slotNum);
      return extractSlotItem(les, variant, appState, lookups);
    }
    if (scope === 'teacher') {
      const asgs = variant.data.assignments || pl.assignments;
      let found: DiffSlotItem | null = null;
      Object.entries(variant.data.lessons || {}).forEach(([key, les]) => {
        const parts = key.split('|');
        const lDay = parseInt(parts[1], 10);
        const lHour = parseInt(parts[2], 10);
        if (lDay === dayIdx && lHour === hourIdx) {
          const asg = asgs.find(a => a.id === les.assignmentId);
          if (asg && asg.teacherId === selectedTeacherId) {
            found = extractSlotItem(les, variant, appState, lookups);
          }
        }
      });
      return found;
    }
    if (scope === 'room') {
      const asgs = variant.data.assignments || pl.assignments;
      let found: DiffSlotItem | null = null;
      Object.entries(variant.data.lessons || {}).forEach(([key, les]) => {
        const parts = key.split('|');
        const lDay = parseInt(parts[1], 10);
        const lHour = parseInt(parts[2], 10);
        if (lDay === dayIdx && lHour === hourIdx) {
          const asg = asgs.find(a => a.id === les.assignmentId);
          if (asg && asg.roomId === selectedRoomId) {
            found = extractSlotItem(les, variant, appState, lookups);
          }
        }
      });
      return found;
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* GÓRNY PASEK NARZĘDZIOWY / HEADER */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tytuł i powrót */}
          <div className="flex items-center gap-3">
            {onBackToMain && (
              <button
                onClick={onBackToMain}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                title="Wróć do planu lekcji"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                  <Columns2 size={16} />
                </div>
                <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Porównywarka Wariantów (Split-Screen Diff)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  Moduł 4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Wizualne zestawienie dwóch wersji planu side-by-side z wykrywaniem kolizji i selektywną synchronizacją zmian
              </p>
            </div>
          </div>

          {/* Selektory Wariantów A i B */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
            {/* Wariant A */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-rose-700 px-2 py-0.5 bg-rose-50 rounded border border-rose-200">
                A (Baza)
              </span>
              <select
                value={variantAId}
                onChange={e => setVariantAId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-rose-500 shadow-2xs"
              >
                {localVariants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.id === activeVariantId ? '★ (Aktywny)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwapVariants}
              className="p-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Zamień kolejność wariantów (A ↔ B)"
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* Wariant B */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                B (Porównywany)
              </span>
              <select
                value={variantBId}
                onChange={e => setVariantBId(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 shadow-2xs"
              >
                {localVariants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.id === activeVariantId ? '★ (Aktywny)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Akcje Eksportu */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                title="Pobierz pełny raport różnic w formacie Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handlePrint}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title="Drukuj zestawienie różnic"
              >
                <Printer size={14} />
              </button>
              {onApplyVariantToActive && variantB && (
                <button
                  onClick={handleApplyVariant}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-xs ml-1 cursor-pointer"
                  title="Ustaw Wariant B jako aktywny plan szkoły"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Zastosuj Wariant B</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pasek powiadomienia o akcji */}
        {actionSuccessMsg && (
          <div className="mt-2 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-2 animate-in fade-in shadow-xs">
            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </header>

      {/* PASEK METRYK KPI & RÓŻNIC */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 shrink-0 overflow-x-auto shadow-2xs">
        <div className="flex items-center gap-3 min-w-max text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl font-bold">
            <span className="text-slate-600">Różnice łącznie:</span>
            <span className="text-indigo-600 font-black text-sm">{kpi.totalChanges}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Dodane w B:</span>
            <span className="font-black">+{kpi.addedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Usunięte w B:</span>
            <span className="font-black">-{kpi.removedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Zmiany sal:</span>
            <span className="font-black">{kpi.roomChangedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Zmiany nauczycieli:</span>
            <span className="font-black">{kpi.teacherChangedCount}</span>
          </div>
          {kpi.dutyChangedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold">
              <Shield size={12} className="text-amber-600" />
              <span>Dyżury:</span>
              <span className="font-black">{kpi.dutyChangedCount}</span>
            </div>
          )}
          {kpi.potentialCollisionsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 font-black">
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Ryzyko kolizji: {kpi.potentialCollisionsCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* PASEK ZAKRESU (SCOPE) & TRYBU WYŚWIETLANIA */}
      <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3">
        {/* Przełącznik Scope */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => { setScope('class'); setDisplayMode('split_screen'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              scope === 'class' && displayMode !== 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={14} />
            <span>Klasy ({pl.classes.length})</span>
          </button>
          <button
            onClick={() => { setScope('teacher'); setDisplayMode('split_screen'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              scope === 'teacher' && displayMode !== 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={14} />
            <span>Nauczyciele ({pl.teachers.length})</span>
          </button>
          <button
            onClick={() => { setScope('room'); setDisplayMode('split_screen'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              scope === 'room' && displayMode !== 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DoorClosed size={14} />
            <span>Sale ({pl.rooms.length})</span>
          </button>
          <button
            onClick={() => { setScope('duty'); setDisplayMode('split_screen'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              scope === 'duty' && displayMode !== 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield size={14} />
            <span>Dyżury</span>
          </button>
          <button
            onClick={() => setDisplayMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              displayMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={14} />
            <span>Zbiorczy Wykaz ({allDiffs.length})</span>
          </button>
        </div>

        {/* Selektor obiektu w zależności od scope */}
        {displayMode !== 'table' && (
          <div className="flex items-center gap-3">
            {scope === 'class' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Oddział:</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 shadow-2xs"
                >
                  {pl.classes.map(c => {
                    const diffCount = allDiffs.filter(d => d.entityId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        Klasa {c.name} {diffCount > 0 ? `(${diffCount} zmian)` : '✓ bez zmian'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {scope === 'teacher' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Nauczyciel:</label>
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 shadow-2xs"
                >
                  {pl.teachers.map(t => {
                    const diffCount = allDiffs.filter(d => d.entityId === t.id || d.itemA?.teacherAbbr === t.abbr || d.itemB?.teacherAbbr === t.abbr).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.last} {t.first} ({t.abbr}) {diffCount > 0 ? `(${diffCount} zmian)` : '✓ bez zmian'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {scope === 'room' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Gabinet:</label>
                <select
                  value={selectedRoomId}
                  onChange={e => setSelectedRoomId(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 shadow-2xs"
                >
                  {pl.rooms.map(r => {
                    const diffCount = allDiffs.filter(d => d.entityId === r.id || d.itemA?.room === r.name || d.itemB?.room === r.name).length;
                    return (
                      <option key={r.id} value={r.id}>
                        Sala {r.name} {diffCount > 0 ? `(${diffCount} zmian)` : '✓ bez zmian'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Opcje podglądu */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-300">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncScroll}
                  onChange={e => setSyncScroll(e.target.checked)}
                  className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span>Synchro scroll</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterOnlyChanged}
                  onChange={e => setFilterOnlyChanged(e.target.checked)}
                  className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span>Tylko zmiany ({currentScopeDiffs.length})</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* OBSZAR GŁÓWNY (MAIN CONTENT) */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 bg-slate-50">
        {displayMode === 'table' ? (
          /* ============================================================== */
          /* WIDOK 1: ZBIORCZY WYKAZ RÓŻNIC (INTERACTIVE TABLE VIEW) */
          /* ============================================================== */
          <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xs">
            {/* Pasek filtrowania tabeli */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtruj różnice po klasie, przedmiocie, nauczycielu lub sali..."
                  value={searchTableQuery}
                  onChange={e => setSearchTableQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>Pokazano pozycji: <strong className="text-slate-900">{filteredTableItems.length}</strong> z {allDiffs.length}</span>
              </div>
            </div>

            {/* Tabela danych */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">Lp.</th>
                    <th className="p-3 w-32">Zakres</th>
                    <th className="p-3 w-36">Dzień & Lekcja</th>
                    <th className="p-3 w-36">Rodzaj zmiany</th>
                    <th className="p-3 bg-rose-50/70 text-rose-900 border-l border-r border-rose-200">
                      Wariant A ({variantA?.name || 'Wzorzec'})
                    </th>
                    <th className="p-3 bg-emerald-50/70 text-emerald-900 border-r border-emerald-200">
                      Wariant B ({variantB?.name || 'Porównywany'})
                    </th>
                    <th className="p-3 w-28 text-center">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTableItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400">
                        <CheckCircle size={36} className="mx-auto mb-2 text-emerald-500 opacity-90" />
                        <p className="font-bold text-slate-700 text-sm">Brak różnic spełniających kryteria</p>
                        <p className="text-xs text-slate-400 mt-1">Oba warianty są w 100% zgodne w wybranym filtrze.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTableItems.map((item, idx) => {
                      const isAdded = item.status === 'added';
                      const isRemoved = item.status === 'removed';
                      const isRoom = item.status === 'room_changed';
                      const isTch = item.status === 'teacher_changed';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                            {item.scope === 'class' && <GraduationCap size={13} className="text-indigo-600 shrink-0" />}
                            {item.scope === 'duty' && <Shield size={13} className="text-amber-600 shrink-0" />}
                            <span>{item.entityName}</span>
                          </td>
                          <td className="p-3 text-slate-700">
                            <div className="font-semibold">{item.dayName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Lekcja {item.hourNum} ({item.timeRange})
                            </span>
                          </td>
                          <td className="p-3">
                            {isAdded && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                + Dodana w B
                              </span>
                            )}
                            {isRemoved && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-200">
                                - Usunięta w B
                              </span>
                            )}
                            {isRoom && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">
                                Zmiana sali
                              </span>
                            )}
                            {isTch && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                                Zmiana nauczyciela
                              </span>
                            )}
                            {!isAdded && !isRemoved && !isRoom && !isTch && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                Zmiana zajęć
                              </span>
                            )}
                          </td>
                          {/* Stan w A */}
                          <td className="p-3 bg-rose-50/30 border-l border-r border-rose-100">
                            {item.itemA ? (
                              <div>
                                <span className="font-extrabold text-slate-900 text-xs block">
                                  {item.itemA.subject || 'Lekcja'}
                                </span>
                                <span className="text-[11px] text-rose-700 font-medium">
                                  {item.itemA.teacher || item.itemA.teacherAbbr || ''}
                                  {item.itemA.room ? ` • s. ${item.itemA.room}` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Brak (okienko)</span>
                            )}
                          </td>
                          {/* Stan w B */}
                          <td className="p-3 bg-emerald-50/30 border-r border-emerald-100">
                            {item.itemB ? (
                              <div>
                                <span className="font-extrabold text-slate-900 text-xs block">
                                  {item.itemB.subject || 'Lekcja'}
                                </span>
                                <span className="text-[11px] text-emerald-700 font-medium">
                                  {item.itemB.teacher || item.itemB.teacherAbbr || ''}
                                  {item.itemB.room ? ` • s. ${item.itemB.room}` : ''}
                                </span>
                                {item.collisionRisk && (
                                  <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                                    <AlertTriangle size={11} />
                                    <span>{item.collisionReason}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Brak (okienko)</span>
                            )}
                          </td>
                          {/* Kopiowanie / Akcja */}
                          <td className="p-3 text-center">
                            {variantA && variantB && item.scope === 'class' && (
                              <button
                                onClick={() => handleTransferSlot(
                                  variantA, 
                                  item.entityId, 
                                  item.dayIdx, 
                                  item.hourIdx, 
                                  item.itemB
                                )}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs"
                                title="Kopiuj ten stan z wariantu B do wariantu A"
                              >
                                <span>A ⬅ B</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* WIDOK 2: PODZIELONY EKRAN (SPLIT-SCREEN SIDE-BY-SIDE PANELS) */
          /* ============================================================== */
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PANEL LEWY: WARIANT A */}
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col min-h-0 overflow-hidden shadow-xs">
              {/* Header Panelu A */}
              <div className="p-3 bg-gradient-to-r from-rose-50/80 to-white border-b border-rose-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-2xs" />
                  <h3 className="text-sm font-black text-slate-900">
                    {variantA?.name || 'Wariant A'}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TAG_CONFIG[variantA?.tag || 'inna'].bg} ${TAG_CONFIG[variantA?.tag || 'inna'].text} ${TAG_CONFIG[variantA?.tag || 'inna'].border}`}>
                    {TAG_CONFIG[variantA?.tag || 'inna'].label}
                  </span>
                </div>
                <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider">
                  Panel A (Wzorzec)
                </span>
              </div>

              {/* Siatka kalendarza Panelu A */}
              <div 
                ref={leftPaneRef}
                onScroll={handleLeftScroll}
                className="flex-1 min-h-0 overflow-auto p-2"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="p-2 w-10 text-center">Nr</th>
                      <th className="p-2 w-20 text-center">Godz</th>
                      {DAYS_NAMES.map(dName => (
                        <th key={dName} className="p-2 text-center">{dName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hours.map((h, hIdx) => {
                      return (
                        <tr key={hIdx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-center text-slate-400 font-bold bg-slate-50 text-[11px]">
                            {h.num}
                          </td>
                          <td className="p-1.5 text-center text-slate-500 font-mono text-[10px] bg-slate-50">
                            {h.start}
                          </td>
                          {DAYS_NAMES.map((_, dayIdx) => {
                            const slotA = getSlotData(variantA, dayIdx, hIdx);
                            const slotB = getSlotData(variantB, dayIdx, hIdx);
                            const isDiff = !areSlotsEquivalent(slotA, slotB);

                            if (filterOnlyChanged && !isDiff) {
                              return (
                                <td key={dayIdx} className="p-2 text-center text-slate-300 font-mono text-[10px]">
                                  —
                                </td>
                              );
                            }

                            return (
                              <td 
                                key={dayIdx} 
                                className={`p-1.5 transition ${
                                  isDiff 
                                    ? 'bg-rose-50/70 border border-rose-200 rounded-lg' 
                                    : 'border-b border-slate-100'
                                }`}
                              >
                                {slotA ? (
                                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-left relative group shadow-2xs hover:border-slate-300 transition">
                                    <div className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">
                                      {slotA.subject}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                      {slotA.teacherAbbr || ''}
                                      {slotA.room ? ` • s. ${slotA.room}` : ''}
                                    </div>

                                    {/* Przycisk kopiowania A -> B */}
                                    {isDiff && variantB && (
                                      <button
                                        onClick={() => handleTransferSlot(
                                          variantB!, 
                                          selectedClassId, 
                                          dayIdx, 
                                          hIdx, 
                                          slotA
                                        )}
                                        className="opacity-0 group-hover:opacity-100 absolute right-1 top-1 p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-black transition shadow-xs flex items-center gap-0.5 cursor-pointer"
                                        title="Kopiuj tę lekcję z A do B"
                                      >
                                        <span>B</span>
                                        <ArrowRight size={10} />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-9 flex items-center justify-center text-slate-300 text-[10px] font-mono">
                                    -
                                  </div>
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

            {/* PANEL PRAWY: WARIANT B */}
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col min-h-0 overflow-hidden shadow-xs">
              {/* Header Panelu B */}
              <div className="p-3 bg-gradient-to-r from-emerald-50/80 to-white border-b border-emerald-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-2xs" />
                  <h3 className="text-sm font-black text-slate-900">
                    {variantB?.name || 'Wariant B'}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TAG_CONFIG[variantB?.tag || 'inna'].bg} ${TAG_CONFIG[variantB?.tag || 'inna'].text} ${TAG_CONFIG[variantB?.tag || 'inna'].border}`}>
                    {TAG_CONFIG[variantB?.tag || 'inna'].label}
                  </span>
                </div>
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Panel B (Porównywany)
                </span>
              </div>

              {/* Siatka kalendarza Panelu B */}
              <div 
                ref={rightPaneRef}
                onScroll={handleRightScroll}
                className="flex-1 min-h-0 overflow-auto p-2"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="p-2 w-10 text-center">Nr</th>
                      <th className="p-2 w-20 text-center">Godz</th>
                      {DAYS_NAMES.map(dName => (
                        <th key={dName} className="p-2 text-center">{dName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hours.map((h, hIdx) => {
                      return (
                        <tr key={hIdx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-center text-slate-400 font-bold bg-slate-50 text-[11px]">
                            {h.num}
                          </td>
                          <td className="p-1.5 text-center text-slate-500 font-mono text-[10px] bg-slate-50">
                            {h.start}
                          </td>
                          {DAYS_NAMES.map((_, dayIdx) => {
                            const slotA = getSlotData(variantA, dayIdx, hIdx);
                            const slotB = getSlotData(variantB, dayIdx, hIdx);
                            const isDiff = !areSlotsEquivalent(slotA, slotB);

                            if (filterOnlyChanged && !isDiff) {
                              return (
                                <td key={dayIdx} className="p-2 text-center text-slate-300 font-mono text-[10px]">
                                  —
                                </td>
                              );
                            }

                            return (
                              <td 
                                key={dayIdx} 
                                className={`p-1.5 transition ${
                                  isDiff 
                                    ? 'bg-emerald-50/70 border border-emerald-200 rounded-lg' 
                                    : 'border-b border-slate-100'
                                }`}
                              >
                                {slotB ? (
                                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-left relative group shadow-2xs hover:border-slate-300 transition">
                                    <div className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">
                                      {slotB.subject}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                      {slotB.teacherAbbr || ''}
                                      {slotB.room ? ` • s. ${slotB.room}` : ''}
                                    </div>

                                    {/* Przycisk kopiowania B -> A */}
                                    {isDiff && variantA && (
                                      <button
                                        onClick={() => handleTransferSlot(
                                          variantA!, 
                                          selectedClassId, 
                                          dayIdx, 
                                          hIdx, 
                                          slotB
                                        )}
                                        className="opacity-0 group-hover:opacity-100 absolute left-1 top-1 p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black transition shadow-xs flex items-center gap-0.5 cursor-pointer"
                                        title="Kopiuj tę lekcję z B do A"
                                      >
                                        <ArrowLeft size={10} />
                                        <span>A</span>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-9 flex items-center justify-center text-slate-300 text-[10px] font-mono">
                                    -
                                  </div>
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
          </div>
        )}
      </main>
    </div>
  );
}
