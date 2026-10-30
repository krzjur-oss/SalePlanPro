/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Zastępstwa Dzienne (ZastepstwaDziennik.tsx)
 * Opis: Błyskawiczne zgłaszanie nieobecności, automatyczna detekcja wakatów,
 *       inteligentne rekomendacje bezkolizyjnych zastępców i generator wydruków A4.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AppState, 
  SchedData, 
  DailySubstitution, 
  AbsenceRecord, 
  AbsenceReason,
  SubstitutionActionType,
  CandidateTeacherInfo,
  DailySubstitutionsState,
  Teacher,
  ClassRoom,
  Class
} from '../types';
import { 
  getTodayISODate,
  getOffsetISODate,
  getNextSchoolDayISODate,
  getPrevSchoolDayISODate,
  getSchoolDayOfWeek,
  formatPolishDateWithDay,
  findAffectedLessonsForAbsence,
  getSmartSubstitutionCandidates,
  suggestOptimalSubstitution,
  autoResolveAllPendingForDate,
  generateSubstitutionsTextAnnouncement,
  getAbsenceReasonLabel,
  getDemoDailySubstitutions,
  isWeekend,
  POLISH_DAYS
} from '../services/substitutionService';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../services/dbStorage';
import { SalePlanLogoMark } from './SalePlanLogo';
import { 
  Calendar, UserX, UserCheck, AlertCircle, CheckCircle2, 
  Printer, Copy, Sparkles, Plus, Trash2, ArrowLeft, ArrowRight,
  Clock, ShieldAlert, DoorClosed, Users, BookOpen, Ban, ChevronDown,
  RefreshCw, Check, Search, FileText, X, AlertTriangle, Layers
} from 'lucide-react';

interface ZastepstwaDziennikProps {
  appState: AppState;
  schedData: SchedData;
  onChangeAppState?: (updater: (prev: AppState) => AppState) => void;
}

export default function ZastepstwaDziennik({
  appState,
  schedData,
  onChangeAppState
}: ZastepstwaDziennikProps) {
  // ── STAN BAZOWY DANYCH ZASTĘPSTW ──
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayISODate());
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [substitutions, setSubstitutions] = useState<DailySubstitution[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // ── WIDOKI I MODALE ──
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [showAddAbsenceModal, setShowAddAbsenceModal] = useState<boolean>(false);
  const [candidatePickerSubId, setCandidatePickerSubId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'ok' | 'info' | 'err' } | null>(null);

  // ── FORMULARZ ZGŁASZANIA NIEOBECNOŚCI ──
  const [newAbsTeacherId, setNewAbsTeacherId] = useState<string>('');
  const [newAbsReason, setNewAbsReason] = useState<AbsenceReason>('zwolnienie_lekarskie');
  const [newAbsReasonDetails, setNewAbsReasonDetails] = useState<string>('');
  const [newAbsWholeDay, setNewAbsWholeDay] = useState<boolean>(true);
  const [newAbsStartHour, setNewAbsStartHour] = useState<number>(1);
  const [newAbsEndHour, setNewAbsEndHour] = useState<number>(8);
  const [newAbsStartDate, setNewAbsStartDate] = useState<string>(() => selectedDate);
  const [newAbsEndDate, setNewAbsEndDate] = useState<string>(() => selectedDate);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');

  // ── POWIADOMIENIA TOAST ──
  const showToast = useCallback((text: string, type: 'ok' | 'info' | 'err' = 'ok') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 3500);
  }, []);

  // ── WCZYTANIE STANU Z BAZY DANYCH INDEXEDDB ──
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const saved = await getStorageItem<DailySubstitutionsState>(STORAGE_KEYS.DAILY_SUBSTITUTIONS);
        if (!isMounted) return;
        if (saved && Array.isArray(saved.absences) && Array.isArray(saved.substitutions)) {
          setAbsences(saved.absences);
          setSubstitutions(saved.substitutions);
          if (saved.selectedDate) {
            setSelectedDate(saved.selectedDate);
          }
        } else {
          // Inicjalizacja danymi demonstracyjnymi
          const demo = getDemoDailySubstitutions(appState);
          setAbsences(demo.absences);
          setSubstitutions(demo.substitutions);
          await setStorageItem(STORAGE_KEYS.DAILY_SUBSTITUTIONS, demo).catch(() => {});
        }
      } catch (e) {
        console.warn('[Zastępstwa] Błąd wczytywania stanu z pamięci:', e);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [appState]);

  // ── ZAPIS ZMIAN DO INDEXEDDB ──
  const persistState = useCallback(async (newAbs: AbsenceRecord[], newSubs: DailySubstitution[], curDate: string) => {
    try {
      const payload: DailySubstitutionsState = {
        absences: newAbs,
        substitutions: newSubs,
        selectedDate: curDate
      };
      await setStorageItem(STORAGE_KEYS.DAILY_SUBSTITUTIONS, payload);
    } catch (e) {
      console.warn('[Zastępstwa] Błąd zapisu zmian:', e);
    }
  }, []);

  // ── DANE NA BIEŻĄCY DZIEŃ ──
  const dayOfWeek = useMemo(() => getSchoolDayOfWeek(selectedDate), [selectedDate]);
  const isWeekendDay = dayOfWeek === -1;

  const dayAbsences = useMemo(() => {
    return absences.filter(a => a.date === selectedDate);
  }, [absences, selectedDate]);

  const daySubstitutions = useMemo(() => {
    return substitutions.filter(s => s.date === selectedDate);
  }, [substitutions, selectedDate]);

  // Statystyki dnia
  const stats = useMemo(() => {
    const total = daySubstitutions.length;
    const pending = daySubstitutions.filter(s => s.status === 'pending' || s.actionType === 'unassigned').length;
    const confirmed = daySubstitutions.filter(s => s.status === 'confirmed').length;
    const cancelled = daySubstitutions.filter(s => s.actionType === 'cancel_lesson').length;
    const dutiesAffected = daySubstitutions.filter(s => s.isDutyAffected).length;
    return { total, pending, confirmed, cancelled, dutiesAffected };
  }, [daySubstitutions]);

  // ── AKCJE NAWIGACJI PO KALENDARZU ──
  const handleGoPrevDay = () => {
    const prev = getPrevSchoolDayISODate(selectedDate);
    setSelectedDate(prev);
    persistState(absences, substitutions, prev);
  };

  const handleGoNextDay = () => {
    const next = getNextSchoolDayISODate(selectedDate);
    setSelectedDate(next);
    persistState(absences, substitutions, next);
  };

  const handleGoToday = () => {
    const today = getTodayISODate();
    setSelectedDate(today);
    persistState(absences, substitutions, today);
  };

  // ── DODAWANIE NOWEJ NIEOBECNOŚCI NAUCZYCIELA ──
  const handleOpenAddAbsence = () => {
    setNewAbsStartDate(selectedDate);
    setNewAbsEndDate(selectedDate);
    setNewAbsWholeDay(true);
    setNewAbsStartHour(1);
    setNewAbsEndHour(8);
    setNewAbsReason('zwolnienie_lekarskie');
    setNewAbsReasonDetails('');
    setTeacherSearchTerm('');
    if (appState.planLekcji.teachers.length > 0) {
      setNewAbsTeacherId(appState.planLekcji.teachers[0].id);
    }
    setShowAddAbsenceModal(true);
  };

  const handleSaveAbsence = () => {
    const teacher = appState.planLekcji.teachers.find(t => t.id === newAbsTeacherId);
    if (!teacher) {
      showToast('Wybierz nauczyciela z listy.', 'err');
      return;
    }

    // Obsługa zakresu dat (od newAbsStartDate do newAbsEndDate)
    const datesToProcess: string[] = [];
    let curDate = newAbsStartDate;
    while (curDate <= newAbsEndDate) {
      // Pomijamy weekendy
      if (getSchoolDayOfWeek(curDate) !== -1) {
        datesToProcess.push(curDate);
      }
      curDate = getOffsetISODate(curDate, 1);
    }

    if (datesToProcess.length === 0) {
      showToast('Wybrany zakres dat nie zawiera żadnych dni roboczych.', 'err');
      return;
    }

    let nextAbsences = [...absences];
    let nextSubstitutions = [...substitutions];
    let createdCount = 0;

    datesToProcess.forEach(targetDate => {
      // Sprawdzamy czy już istnieje nieobecność tego nauczyciela w tym dniu
      const existing = nextAbsences.find(a => a.teacherId === teacher.id && a.date === targetDate);
      if (existing) {
        // Usuwamy dotychczasowe powiązane zastępstwa przed ponownym generowaniem
        nextAbsences = nextAbsences.filter(a => a.id !== existing.id);
        nextSubstitutions = nextSubstitutions.filter(s => s.absenceId !== existing.id);
      }

      const newAbsence: AbsenceRecord = {
        id: `abs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        teacherId: teacher.id,
        teacherName: `${teacher.first} ${teacher.last}`,
        teacherAbbr: teacher.abbr,
        date: targetDate,
        reason: newAbsReason,
        reasonDetails: newAbsReasonDetails.trim() || undefined,
        wholeDay: newAbsWholeDay,
        startHour: newAbsWholeDay ? undefined : newAbsStartHour,
        endHour: newAbsWholeDay ? undefined : newAbsEndHour,
        createdAt: new Date().toISOString()
      };

      nextAbsences.push(newAbsence);

      // Wyszukujemy lekcje w planie lekcji dla tego nauczyciela
      const newSubs = findAffectedLessonsForAbsence(newAbsence, appState, schedData);
      nextSubstitutions.push(...newSubs);
      createdCount += newSubs.length;
    });

    setAbsences(nextAbsences);
    setSubstitutions(nextSubstitutions);
    persistState(nextAbsences, nextSubstitutions, selectedDate);
    setShowAddAbsenceModal(false);

    showToast(
      `Zarejestrowano nieobecność (${teacher.first} ${teacher.last}). Wykryto ${createdCount} lekcji wymagających zastępstwa.`,
      'ok'
    );
  };

  // ── USUWANIE NIEOBECNOŚCI ──
  const handleDeleteAbsence = (absenceId: string) => {
    const abs = absences.find(a => a.id === absenceId);
    if (!abs) return;

    if (!confirm(`Czy na pewno usunąć zgłoszenie nieobecności dla: ${abs.teacherName}?`)) {
      return;
    }

    const nextAbs = absences.filter(a => a.id !== absenceId);
    const nextSubs = substitutions.filter(s => s.absenceId !== absenceId);

    setAbsences(nextAbs);
    setSubstitutions(nextSubs);
    persistState(nextAbs, nextSubs, selectedDate);
    showToast(`Usunięto nieobecność i wycofano powiązane wakaty.`, 'info');
  };

  // ── EDYCJA ZASTĘPSTWA ──
  const handleUpdateSubstitution = (subId: string, patch: Partial<DailySubstitution>) => {
    const nextSubs = substitutions.map(s => {
      if (s.id !== subId) return s;
      return {
        ...s,
        ...patch,
        updatedAt: new Date().toISOString()
      };
    });
    setSubstitutions(nextSubs);
    persistState(absences, nextSubs, selectedDate);
  };

  // ── SZYBKIE PRZYPISANIE SUGEROWANEGO ZASTĘPCY (1 KLIKNIĘCIE) ──
  const handleQuickSuggestSingle = (sub: DailySubstitution) => {
    const suggestion = suggestOptimalSubstitution(sub, appState, schedData, substitutions, absences);
    if (!suggestion.candidate) {
      showToast('Brak wolnego nauczyciela w tym slocie. Rozważ skierowanie klasy do czytelni lub odwołanie lekcji.', 'info');
      return;
    }

    handleUpdateSubstitution(sub.id, {
      actionType: 'substitute_teacher',
      replacementTeacherId: suggestion.candidate.teacherId,
      replacementTeacherName: suggestion.candidate.fullName,
      replacementTeacherAbbr: suggestion.candidate.abbr,
      replacementRoomId: suggestion.room ? suggestion.room.id : sub.originalRoomId,
      replacementRoomName: suggestion.room ? suggestion.room.name : sub.originalRoomName,
      status: 'confirmed',
      note: suggestion.candidate.teachesSameSubject
        ? 'Zastępstwo przedmiotowe (zgodne kwalifikacje)'
        : 'Zastępstwo doraźne (opieka)',
    });

    showToast(`Przypisano zastępcę: ${suggestion.candidate.fullName} (Zgodność: ${suggestion.candidate.score}%)`, 'ok');
  };

  // ── AUTOMATYCZNE PRZYPISANIE WSZYSTKICH WAKATÓW NA DANY DZIEŃ ──
  const handleAutoResolveAll = () => {
    const pendingCount = daySubstitutions.filter(s => s.status === 'pending' || s.actionType === 'unassigned').length;
    if (pendingCount === 0) {
      showToast('Wszystkie zastępstwa na ten dzień mają już podjęte decyzje.', 'info');
      return;
    }

    const resolved = autoResolveAllPendingForDate(
      selectedDate,
      appState,
      schedData,
      substitutions,
      absences
    );

    setSubstitutions(resolved);
    persistState(absences, resolved, selectedDate);
    showToast(`Błyskawicznie rozwiązano ${pendingCount} wakatów na dzień ${selectedDate}!`, 'ok');
  };

  // ── KOPIOWANIE OGŁOSZENIA DO SCHOWKA ──
  const handleCopyAnnouncement = () => {
    const text = generateSubstitutionsTextAnnouncement(
      selectedDate,
      substitutions,
      absences,
      appState.school.name || 'Szkoła'
    );

    navigator.clipboard.writeText(text).then(() => {
      showToast('Skopiowano treść ogłoszenia do schowka! Możesz wkleić do Librusa / e-dziennika.', 'ok');
    }).catch(() => {
      showToast('Nie udało się skopiować automatycznie do schowka.', 'err');
    });
  };

  // Nauczyciele przefiltrowani w modalu zgłaszania nieobecności
  const filteredTeachersForModal = useMemo(() => {
    const query = teacherSearchTerm.toLowerCase().trim();
    if (!query) return appState.planLekcji.teachers;
    return appState.planLekcji.teachers.filter(t => 
      t.first.toLowerCase().includes(query) ||
      t.last.toLowerCase().includes(query) ||
      t.abbr.toLowerCase().includes(query)
    );
  }, [appState.planLekcji.teachers, teacherSearchTerm]);

  // Aktywne zastępstwo dla modalu wyboru kandydata
  const activePickerSub = useMemo(() => {
    if (!candidatePickerSubId) return null;
    return substitutions.find(s => s.id === candidatePickerSubId) || null;
  }, [candidatePickerSubId, substitutions]);

  // Lista kandydatów dla modalu wyboru kandydata
  const candidatesForActiveSub = useMemo(() => {
    if (!activePickerSub) return [];
    return getSmartSubstitutionCandidates(activePickerSub, appState, schedData, substitutions, absences);
  }, [activePickerSub, appState, schedData, substitutions, absences]);

  if (!isLoaded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
        <RefreshCw size={26} className="animate-spin text-blue-500" />
        <span className="text-xs font-semibold">Ładowanie modułu Zastępstw Dziennych...</span>
      </div>
    );
  }

  // ── WIDOK WYDRUKU / KARTY ZASTĘPSTW (PRINT MODE) ──
  if (isPrintMode) {
    return (
      <div className="flex-1 bg-white text-slate-900 flex flex-col overflow-y-auto print:overflow-visible font-sans">
        {/* Pasek sterowania wydrukiem */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrintMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
            >
              <ArrowLeft size={14} /> Powrót do edycji
            </button>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-extrabold text-blue-400">Podgląd wydruku A4 (Karta zastępstw szkolnych)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-extrabold shadow-md transition cursor-pointer"
            >
              <Printer size={15} /> Drukuj teraz (Ctrl + P)
            </button>
          </div>
        </div>

        {/* Ciało karty zastępstw A4 */}
        <div className="max-w-4xl mx-auto p-8 w-full print:p-0 print:max-w-full">
          {/* Nagłówek szkolny */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SalePlanLogoMark size={28} />
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                  {appState.school.name || 'Szkoła Podstawowa'}
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Dzienny rejestr organizacji zastępstw i zmian w planie lekcji
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Dzień i data</span>
              <span className="text-base font-extrabold text-slate-900 block capitalize">
                {formatPolishDateWithDay(selectedDate)}
              </span>
            </div>
          </div>

          {/* Wykaz nieobecnych */}
          {dayAbsences.length > 0 && (
            <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded-lg">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <UserX size={14} className="text-red-600" /> Nauczyciele nieobecni w dniu dzisiejszym:
              </h2>
              <div className="flex flex-wrap gap-2">
                {dayAbsences.map(a => (
                  <span key={a.id} className="text-xs font-bold text-slate-800 bg-white border border-slate-300 px-2.5 py-1 rounded-md shadow-2xs">
                    {a.teacherName} ({a.teacherAbbr}) – <span className="font-normal text-slate-600">{getAbsenceReasonLabel(a.reason)}</span>
                    {!a.wholeDay && <span className="text-red-600 font-bold ml-1">(lekcje: {a.startHour}-{a.endHour})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tabela zastępstw */}
          {daySubstitutions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium border border-dashed border-slate-300 rounded-lg">
              W tym dniu wszystkie zajęcia dydaktyczne odbywają się zgodnie z planem lekcji (brak zastępstw).
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs mb-8">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-800">
                  <th className="py-2.5 px-2 w-12 text-center">Lekcja</th>
                  <th className="py-2.5 px-2 w-20">Godzina</th>
                  <th className="py-2.5 px-2 w-16">Oddział</th>
                  <th className="py-2.5 px-2">Nieobecny n-l</th>
                  <th className="py-2.5 px-2">Przedmiot bazowy</th>
                  <th className="py-2.5 px-2">Nauczyciel zastępujący / Decyzja</th>
                  <th className="py-2.5 px-2 w-14 text-center">Sala</th>
                  <th className="py-2.5 px-2">Uwagi dydaktyczne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {daySubstitutions.map(s => {
                  const isCancelled = s.actionType === 'cancel_lesson';
                  const isStudy = s.actionType === 'study_room';
                  const isCombined = s.actionType === 'combine_classes';

                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 ${isCancelled ? 'bg-red-50/50' : ''}`}>
                      <td className="py-2 px-2 text-center font-black text-slate-900">{s.hourNum}</td>
                      <td className="py-2 px-2 text-slate-600 font-mono text-[11px] whitespace-nowrap">{s.timeRange || '–'}</td>
                      <td className="py-2 px-2 font-black text-slate-900">{s.className}</td>
                      <td className="py-2 px-2 font-bold text-slate-700">{s.originalTeacherName}</td>
                      <td className="py-2 px-2 text-slate-800 font-medium">{s.subjectName}</td>
                      <td className="py-2 px-2 font-black">
                        {s.actionType === 'substitute_teacher' ? (
                          <span className="text-blue-900">{s.replacementTeacherName || '–'}</span>
                        ) : isStudy ? (
                          <span className="text-amber-800 font-bold">Opieka w czytelni / bibliotece</span>
                        ) : isCombined ? (
                          <span className="text-indigo-800 font-bold">Łączenie: {s.combinedWithClassName || 'inna klasa'}</span>
                        ) : isCancelled ? (
                          <span className="text-red-700 font-bold">Lekcja odwołana (zwolnienie)</span>
                        ) : s.actionType === 'change_room' ? (
                          <span className="text-slate-800 font-bold">Zmiana sali</span>
                        ) : (
                          <span className="text-red-600 uppercase font-black tracking-wide">WAKAT (Brak)</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">
                        {s.replacementRoomName || s.originalRoomName || '–'}
                      </td>
                      <td className="py-2 px-2 text-slate-600 italic">
                        {s.note || (isCancelled ? 'Uczniowie przychodzą później / zwolnieni' : '')}
                        {s.isDutyAffected && (
                          <span className="block text-[10px] text-red-700 font-bold not-italic">
                            ⚠️ Dyżur: {s.dutySpotName}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Podpisy dyrekcji */}
          <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-12 border-b border-dotted border-slate-400 mb-1"></div>
              <span className="text-slate-600 font-bold">Sporządził / Planista</span>
            </div>
            <div>
              <div className="h-12 border-b border-dotted border-slate-400 mb-1"></div>
              <span className="text-slate-900 font-black">Zatwierdził Dyrektor Szkoły</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ── POWIADOMIENIE TOAST ── */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl z-50 text-xs font-bold flex items-center gap-2 border transition ${
          toastMessage.type === 'ok' 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
            : toastMessage.type === 'info'
            ? 'bg-blue-950 border-blue-500 text-blue-200'
            : 'bg-red-950 border-red-500 text-red-200'
        }`}>
          {toastMessage.type === 'ok' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
          {toastMessage.type === 'info' && <AlertCircle size={16} className="text-blue-400 shrink-0" />}
          {toastMessage.type === 'err' && <AlertTriangle size={16} className="text-red-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── GÓRNY PASEK STEROWANIA I KALENDARZA ── */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-xs">
        {/* Nawigacja po dacie */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={handleGoPrevDay}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              title="Poprzedni dzień roboczy"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs font-black hover:bg-slate-800 rounded-lg text-blue-400 hover:text-blue-300 transition cursor-pointer"
            >
              Dziś
            </button>
            <button
              onClick={handleGoNextDay}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              title="Następny dzień roboczy"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  persistState(absences, substitutions, e.target.value);
                }
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:border-blue-500 transition cursor-pointer"
            />
          </div>

          <div className="hidden md:flex flex-col ml-2 leading-tight">
            <span className="text-xs font-black text-white capitalize">
              {formatPolishDateWithDay(selectedDate)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              {isWeekendDay ? 'Dzień wolny od nauki (weekend)' : `Dzień cyklu szkolnego (${POLISH_DAYS[dayOfWeek]})`}
            </span>
          </div>
        </div>

        {/* Wskaźniki statystyczne (Pills) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-bold">Wakaty:</span>
            <span className={`font-black px-1.5 py-0.2 rounded-md ${
              stats.pending > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-emerald-400'
            }`}>
              {stats.pending}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-bold">Zatwierdzone:</span>
            <span className="font-black text-blue-400">{stats.confirmed}</span>
          </div>

          {stats.dutiesAffected > 0 && (
            <div className="flex items-center gap-1 bg-red-950/50 border border-red-500/30 text-red-300 px-2.5 py-1.5 rounded-xl text-xs font-bold">
              <ShieldAlert size={14} className="text-red-400" />
              <span>{stats.dutiesAffected} dyżury</span>
            </div>
          )}
        </div>

        {/* Główne akcje operacyjne */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoResolveAll}
            disabled={stats.pending === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition shadow-xs cursor-pointer ${
              stats.pending > 0
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950'
                : 'bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-800'
            }`}
            title="Automatycznie przydziel optymalnych wolnych nauczycieli do wszystkich wakatów w 1 kliknięcie"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Auto-przypisz wakat</span>
            <span className="sm:hidden">Auto</span>
          </button>

          <button
            onClick={handleCopyAnnouncement}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
            title="Skopiuj zredagowane ogłoszenie o zastępstwach do schowka"
          >
            <Copy size={14} />
            <span className="hidden sm:inline">Ogłoszenie</span>
          </button>

          <button
            onClick={() => setIsPrintMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
            title="Drukuj kartę zastępstw w formacie A4"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Drukuj A4</span>
          </button>

          <button
            onClick={handleOpenAddAbsence}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
            title="Zgłoś nową nieobecność nauczyciela"
          >
            <Plus size={15} />
            <span>Zgłoś nieobecność</span>
          </button>
        </div>
      </div>

      {/* ── PASEK INFORMACYJNY NIEOBECNOŚCI (CHIPS) ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <UserX size={15} className="text-red-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Nieobecni nauczyciele:
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto min-w-0 flex-1">
          {dayAbsences.length === 0 ? (
            <span className="text-xs text-slate-500 font-medium italic">
              Brak zgłoszonych nieobecności na ten dzień. Wszyscy nauczyciele pracują zgodnie z planem.
            </span>
          ) : (
            dayAbsences.map(a => (
              <div 
                key={a.id} 
                className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-200 shrink-0 shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>{a.teacherName}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({a.wholeDay ? 'cały dzień' : `godz. ${a.startHour}-${a.endHour}`})
                </span>
                <span className="text-[9px] bg-red-950/80 border border-red-500/30 text-red-300 px-1 py-0.2 rounded font-mono">
                  {getAbsenceReasonLabel(a.reason).split(' ')[0]}
                </span>
                <button
                  onClick={() => handleDeleteAbsence(a.id)}
                  className="text-slate-500 hover:text-red-400 transition ml-1 p-0.5 rounded cursor-pointer"
                  title="Usuń to zgłoszenie nieobecności"
                >
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── GŁÓWNA SIATKA LEKCJI WYMAGAJĄCYCH ZASTĘPSTWA ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {isWeekendDay ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 shadow-xl">
            <Calendar size={48} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-extrabold text-white mb-1">Weekend – Szkoła nie prowadzi zajęć</h3>
            <p className="text-xs text-slate-400 mb-4">
              Wybrana data ({selectedDate}) przypada na sobotę lub niedzielę.
            </p>
            <button
              onClick={() => {
                const nextMon = getNextSchoolDayISODate(selectedDate);
                setSelectedDate(nextMon);
                persistState(absences, substitutions, nextMon);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            >
              Przejdź do najbliższego poniedziałku
            </button>
          </div>
        ) : daySubstitutions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 shadow-xl">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
            <h3 className="text-base font-extrabold text-white mb-1">Brak wakatów i zastępstw na ten dzień</h3>
            <p className="text-xs text-slate-400 mb-5">
              Wszyscy nauczyciele są obecni lub dla zgłoszonych nieobecności nie ma zaplanowanych lekcji w siatce.
            </p>
            <button
              onClick={handleOpenAddAbsence}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <Plus size={15} /> Zgłoś nieobecność nauczyciela
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-6xl mx-auto">
            {daySubstitutions.map(sub => {
              const isPending = sub.status === 'pending' || sub.actionType === 'unassigned';
              const isSubTeacher = sub.actionType === 'substitute_teacher';
              const isCancelled = sub.actionType === 'cancel_lesson';
              const isStudy = sub.actionType === 'study_room';
              const isCombined = sub.actionType === 'combine_classes';

              return (
                <div 
                  key={sub.id}
                  className={`bg-slate-900 border rounded-2xl p-3 sm:p-4 transition shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPending 
                      ? 'border-amber-500/50 bg-amber-950/10' 
                      : isCancelled
                      ? 'border-red-900/60 bg-red-950/15'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Lewa strona: Nr lekcji, Klasa, Nieobecny i Przedmiot */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase leading-none">Lekcja</span>
                      <span className="text-base font-black text-white leading-none mt-0.5">{sub.hourNum}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md text-xs font-black">
                          Klasa {sub.className}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {sub.subjectName}
                        </span>
                        {sub.timeRange && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {sub.timeRange}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                        <span>Nieobecny: <strong className="text-slate-300">{sub.originalTeacherName}</strong></span>
                        <span>•</span>
                        <span>Sala bazowa: <strong className="text-slate-300">{sub.originalRoomName || 'b/s'}</strong></span>
                        {sub.isDutyAffected && (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <ShieldAlert size={12} /> Dyżur: {sub.dutySpotName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Środek: Typ decyzji i przydział */}
                  <div className="flex-1 flex flex-wrap items-center gap-2.5 justify-start md:justify-center">
                    {/* Selektor typu działania */}
                    <select
                      value={sub.actionType}
                      onChange={e => {
                        const val = e.target.value as SubstitutionActionType;
                        handleUpdateSubstitution(sub.id, {
                          actionType: val,
                          status: val === 'unassigned' ? 'pending' : 'confirmed'
                        });
                      }}
                      className="bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="unassigned">⚠️ Wakat (brak decyzji)</option>
                      <option value="substitute_teacher">👤 Zastępstwo z nauczycielem</option>
                      <option value="study_room">🏫 Opieka w czytelni / bibliotece</option>
                      <option value="combine_classes">👥 Łączenie grup / klas</option>
                      <option value="cancel_lesson">🚫 Lekcja odwołana (zwolnienie)</option>
                      <option value="change_room">🚪 Tylko zmiana sali</option>
                    </select>

                    {/* Szczegóły dla zastępstwa z nauczycielem */}
                    {isSubTeacher && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setCandidatePickerSubId(sub.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                          title="Wybierz zastępcę z listy rankingowej"
                        >
                          <UserCheck size={14} className="text-blue-400" />
                          <span>{sub.replacementTeacherName || 'Wybierz zastępcę...'}</span>
                          <ChevronDown size={13} className="text-slate-400" />
                        </button>

                        <button
                          onClick={() => handleQuickSuggestSingle(sub)}
                          className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Inteligentna podpowiedź optymalnego nauczyciela w okienku"
                        >
                          <Sparkles size={14} />
                        </button>

                        {/* Selektor sali zastępczej */}
                        <select
                          value={sub.replacementRoomId || ''}
                          onChange={e => {
                            const rId = e.target.value;
                            const rObj = appState.planLekcji.rooms.find(r => r.id === rId);
                            handleUpdateSubstitution(sub.id, {
                              replacementRoomId: rId || null,
                              replacementRoomName: rObj ? rObj.name : null
                            });
                          }}
                          className="bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 rounded-xl px-2 py-1.5 focus:outline-hidden"
                          title="Zmień salę dla tego zastępstwa"
                        >
                          <option value="">Sala: {sub.originalRoomName || 'b/s'}</option>
                          {appState.planLekcji.rooms.map(r => (
                            <option key={r.id} value={r.id}>Sala {r.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Szczegóły dla łączenia klas */}
                    {isCombined && (
                      <select
                        value={sub.combinedWithClassId || ''}
                        onChange={e => {
                          const cId = e.target.value;
                          const cObj = appState.planLekcji.classes.find(c => c.id === cId);
                          handleUpdateSubstitution(sub.id, {
                            combinedWithClassId: cId || null,
                            combinedWithClassName: cObj ? cObj.name : null
                          });
                        }}
                        className="bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-300 rounded-xl px-2 py-1.5"
                      >
                        <option value="">Wybierz klasę łączoną...</option>
                        {appState.planLekcji.classes
                          .filter(c => c.id !== sub.classId)
                          .map(c => (
                            <option key={c.id} value={c.id}>Łączenie z klasą {c.name}</option>
                          ))}
                      </select>
                    )}

                    {/* Informacja dla odwołania lekcji */}
                    {isCancelled && (
                      <span className="text-xs text-red-400 font-bold bg-red-950/60 border border-red-500/20 px-2.5 py-1 rounded-lg">
                        Lekcja odwołana – uczniowie zwolnieni do domu
                      </span>
                    )}

                    {/* Informacja dla opieki w czytelni */}
                    {isStudy && (
                      <span className="text-xs text-amber-300 font-bold bg-amber-950/60 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                        Opieka w czytelni / bibliotece szkolnej
                      </span>
                    )}
                  </div>

                  {/* Prawa strona: Uwagi, Status i Akcje */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Uwaga dydaktyczna..."
                      value={sub.note || ''}
                      onChange={e => handleUpdateSubstitution(sub.id, { note: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-hidden focus:border-slate-700 w-32 sm:w-44"
                    />

                    <button
                      onClick={() => {
                        const nextStatus = sub.status === 'confirmed' ? 'pending' : 'confirmed';
                        handleUpdateSubstitution(sub.id, { status: nextStatus });
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        sub.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                      }`}
                      title="Kliknij, aby przełączyć status (Robocze / Zatwierdzone)"
                    >
                      {sub.status === 'confirmed' ? <Check size={13} /> : <Clock size={13} />}
                      <span>{sub.status === 'confirmed' ? 'Zatwierdzone' : 'Wakat'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ZGŁASZANIA NOWEJ NIEOBECNOŚCI ── */}
      {showAddAbsenceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserX size={20} className="text-red-400" />
                <h3 className="text-sm font-black text-white">Zgłoś nieobecność nauczyciela</h3>
              </div>
              <button 
                onClick={() => setShowAddAbsenceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Wybór nauczyciela */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Nauczyciel:</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtruj listę nauczycieli..."
                  value={teacherSearchTerm}
                  onChange={e => setTeacherSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 mb-1"
                />
              </div>

              <select
                value={newAbsTeacherId}
                onChange={e => setNewAbsTeacherId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-blue-500"
              >
                {filteredTeachersForModal.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.first} {t.last} ({t.abbr})
                  </option>
                ))}
              </select>
            </div>

            {/* Zakres dat */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Od dnia:</label>
                <input
                  type="date"
                  value={newAbsStartDate}
                  onChange={e => {
                    setNewAbsStartDate(e.target.value);
                    if (e.target.value > newAbsEndDate) {
                      setNewAbsEndDate(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Do dnia:</label>
                <input
                  type="date"
                  value={newAbsEndDate}
                  min={newAbsStartDate}
                  onChange={e => setNewAbsEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                />
              </div>
            </div>

            {/* Przyczyna nieobecności */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Przyczyna nieobecności:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'zwolnienie_lekarskie', label: 'Zwolnienie lekarskie (L4)' },
                  { key: 'opieka', label: 'Opieka nad dzieckiem' },
                  { key: 'wycieczka', label: 'Wycieczka szkolna' },
                  { key: 'szkolenie', label: 'Szkolenie / Konferencja' },
                  { key: 'urlop', label: 'Urlop okolicznościowy' },
                  { key: 'inne', label: 'Inna przyczyna' },
                ].map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setNewAbsReason(r.key as AbsenceReason)}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-bold border transition ${
                      newAbsReason === r.key
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zakres godzinowy (Cały dzień vs Wybrane lekcje) */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    checked={newAbsWholeDay}
                    onChange={() => setNewAbsWholeDay(true)}
                    className="accent-blue-500"
                  />
                  <span>Cały dzień roboczy</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    checked={!newAbsWholeDay}
                    onChange={() => setNewAbsWholeDay(false)}
                    className="accent-blue-500"
                  />
                  <span>Tylko wybrane godziny</span>
                </label>
              </div>

              {!newAbsWholeDay && (
                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-bold">Od lekcji:</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newAbsStartHour}
                    onChange={e => setNewAbsStartHour(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-white"
                  />
                  <span className="text-xs text-slate-400 font-bold">do lekcji:</span>
                  <input
                    type="number"
                    min={newAbsStartHour}
                    max={12}
                    value={newAbsEndHour}
                    onChange={e => setNewAbsEndHour(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-white"
                  />
                </div>
              )}
            </div>

            {/* Dodatkowa notatka */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Uwagi dodatkowe (opcjonalnie):</label>
              <input
                type="text"
                placeholder="np. Zwolnienie do piątku, zastępstwo z matematyki..."
                value={newAbsReasonDetails}
                onChange={e => setNewAbsReasonDetails(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
              />
            </div>

            {/* Przyciski akcji modalu */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddAbsenceModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSaveAbsence}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition"
              >
                Zatwierdź i utwórz wakaty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RANKINGU KANDYDATÓW DLA DANEGO ZASTĘPSTWA ── */}
      {candidatePickerSubId && activePickerSub && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-left overflow-hidden">
            {/* Nagłówek modalu */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <UserCheck size={18} className="text-blue-400" />
                  Rekomendowani zastępcy – Lekcja {activePickerSub.hourNum} ({activePickerSub.className})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Przedmiot: <strong>{activePickerSub.subjectName}</strong> • Nieobecny: {activePickerSub.originalTeacherName}
                </p>
              </div>
              <button 
                onClick={() => setCandidatePickerSubId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista kandydatów z rankingiem */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-800/60">
              {candidatesForActiveSub.map(candidate => {
                const isIdeal = candidate.recommendationLevel === 'ideal';
                const isGood = candidate.recommendationLevel === 'good';
                const isConflict = !candidate.isAvailable;

                return (
                  <div
                    key={candidate.teacherId}
                    className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 p-3 rounded-xl transition ${
                      isConflict 
                        ? 'opacity-40 bg-slate-950/40' 
                        : isIdeal
                        ? 'bg-blue-950/20 hover:bg-blue-950/40 border border-blue-500/30'
                        : 'bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{candidate.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({candidate.abbr})</span>
                        
                        {/* Wskaźnik dopasowania (Score badge) */}
                        <span className={`text-[10px] font-black px-2 py-0.2 rounded-full leading-none ${
                          candidate.score >= 80 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : candidate.score >= 60
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : candidate.score >= 40
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {candidate.score}% Zgodność
                        </span>

                        {candidate.hasWindowInSchedule && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-bold">
                            Wypełnia okienko
                          </span>
                        )}
                      </div>

                      {/* Argumenty scoringu i ostrzeżenia */}
                      <div className="mt-1 space-y-0.5">
                        {candidate.reasons.map((reason, rIdx) => (
                          <p key={rIdx} className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <Check size={11} className="shrink-0" /> {reason}
                          </p>
                        ))}
                        {candidate.warnings.map((warn, wIdx) => (
                          <p key={wIdx} className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                            <AlertTriangle size={11} className="shrink-0" /> {warn}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Przycisk wyboru */}
                    <button
                      disabled={isConflict}
                      onClick={() => {
                        handleUpdateSubstitution(activePickerSub.id, {
                          actionType: 'substitute_teacher',
                          replacementTeacherId: candidate.teacherId,
                          replacementTeacherName: candidate.fullName,
                          replacementTeacherAbbr: candidate.abbr,
                          status: 'confirmed',
                          note: candidate.teachesSameSubject
                            ? 'Zastępstwo przedmiotowe (zgodne kwalifikacje)'
                            : 'Zastępstwo doraźne (opieka)'
                        });
                        setCandidatePickerSubId(null);
                        showToast(`Przypisano nauczyciela: ${candidate.fullName}`, 'ok');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                        isConflict
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer'
                      }`}
                    >
                      Wybierz
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Stopka modalu */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setCandidatePickerSubId(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
