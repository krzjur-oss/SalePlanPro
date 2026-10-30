/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Audytor Higieny Planu Ucznia wg wytycznych MEN (AudytorHigienyMEN.tsx)
 * Opis: Pełna weryfikacja planu lekcji pod kątem rozporządzeń MEN, ergonomii umysłowej,
 *       krzywej zmęczenia, przerw obiadowych i eliminacji okienek uczniowskich.
 */

import React, { useState, useMemo } from 'react';
import { 
  AppState, 
  SchedData, 
  Class, 
  ClassHygieneReport, 
  HygieneViolation, 
  SchoolHygieneAuditSummary,
  SubjectDifficultyLevel
} from '../types';
import { 
  auditSchoolHygiene, 
  auditClassHygiene, 
  DAYS_POLISH,
  MEN_REGULATION_REFS,
  classifySubjectDifficulty
} from '../services/hygieneAuditService';
import { SalePlanLogoMark } from './SalePlanLogo';
import { 
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, 
  Printer, ArrowLeft, BookOpen, Clock, HeartHandshake,
  Activity, Sparkles, Filter, ChevronRight, X, FileText,
  Utensils, Zap, HelpCircle, Check, Info, Layers, RefreshCw
} from 'lucide-react';

interface AudytorHigienyMENProps {
  appState: AppState;
  schedData: SchedData;
  onNavigateToTab?: (tab: string) => void;
}

export default function AudytorHigienyMEN({
  appState,
  schedData,
  onNavigateToTab
}: AudytorHigienyMENProps) {
  // ── AUDYT CAŁEJ SZKOŁY ──
  const auditSummary = useMemo<SchoolHygieneAuditSummary>(() => {
    return auditSchoolHygiene(appState);
  }, [appState]);

  // ── STAN WIDOKU ──
  const [selectedClassId, setSelectedClassId] = useState<string | null>(() => {
    return auditSummary.classReports[0]?.classId || null;
  });
  const [filterOnlyViolations, setFilterOnlyViolations] = useState<boolean>(false);
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [showRegulationsModal, setShowRegulationsModal] = useState<boolean>(false);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  // Raport dla aktualnie wybranej klasy
  const activeClassReport = useMemo<ClassHygieneReport | null>(() => {
    if (!selectedClassId) return null;
    return auditSummary.classReports.find(c => c.classId === selectedClassId) || null;
  }, [selectedClassId, auditSummary.classReports]);

  // Klasy po filtracji
  const displayedClassReports = useMemo(() => {
    return auditSummary.classReports.filter(cr => {
      if (filterOnlyViolations && cr.violations.length === 0) return false;
      if (selectedSeverityFilter === 'critical') {
        return cr.violations.some(v => v.severity === 'critical');
      }
      if (selectedSeverityFilter === 'warning') {
        return cr.violations.some(v => v.severity === 'warning');
      }
      return true;
    });
  }, [auditSummary.classReports, filterOnlyViolations, selectedSeverityFilter]);

  // ── WIDOK WYDRUKU OFICJALNEGO RAPORTU MEN (A4) ──
  if (isPrintMode) {
    return (
      <div className="flex-1 bg-white text-slate-900 flex flex-col overflow-y-auto print:overflow-visible font-sans">
        {/* Pasek sterowania drukiem */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrintMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Powrót do audytora
            </button>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-extrabold text-blue-400">Oficjalny Raport Higieny Planu Lekcji (Zgodność z MEN & Sanepid)</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-extrabold shadow-md transition cursor-pointer"
          >
            <Printer size={15} /> Drukuj raport (Ctrl + P)
          </button>
        </div>

        {/* Ciało dokumentu kontrolnego */}
        <div className="max-w-4xl mx-auto p-8 w-full print:p-0 print:max-w-full">
          {/* Nagłówek */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SalePlanLogoMark size={32} />
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                  {appState.school.name || 'Szkoła Podstawowa'}
                </h1>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                PROTOKÓŁ AUDYTU HIGIENY PLANU LEKCJI (WYTYCZNE MEN I SANEPIDU)
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Rok szkolny</span>
              <span className="text-sm font-black text-slate-900 block">{appState.yearLabel}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Data badania: {new Date().toLocaleDateString('pl-PL')}</span>
            </div>
          </div>

          {/* Podsumowanie punktowe */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl mb-6 grid grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Wskaźnik Higieny</span>
              <span className="text-2xl font-black text-slate-900">{auditSummary.overallScore} / 100</span>
              <span className="text-[10px] font-bold text-blue-700 block uppercase">Standard: {auditSummary.overallGrade}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Audytowane oddziały</span>
              <span className="text-2xl font-black text-slate-900">{auditSummary.totalClassesAudited}</span>
              <span className="text-[10px] text-slate-600 block">Oddziałów ogółem</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Okienka w klasach</span>
              <span className={`text-2xl font-black ${auditSummary.complianceMetrics.noGapsCompliance === 100 ? 'text-emerald-700' : 'text-red-700'}`}>
                {100 - auditSummary.complianceMetrics.noGapsCompliance}%
              </span>
              <span className="text-[10px] text-slate-600 block">Naruszeń ciągłości</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Naruszenia krytyczne</span>
              <span className={`text-2xl font-black ${auditSummary.criticalViolationsCount === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {auditSummary.criticalViolationsCount}
              </span>
              <span className="text-[10px] text-slate-600 block">Wymaga korekty</span>
            </div>
          </div>

          {/* Tabela wyników dla poszczególnych oddziałów */}
          <h2 className="text-sm font-black uppercase text-slate-900 mb-2">Tabela zgodności oddziałów z wytycznymi MEN</h2>
          <table className="w-full text-left border-collapse text-xs mb-6">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-900 text-[10px] font-black uppercase text-slate-800">
                <th className="py-2 px-2">Oddział</th>
                <th className="py-2 px-2">Etap</th>
                <th className="py-2 px-2 text-center">Godz./Tydz.</th>
                <th className="py-2 px-2 text-center">Rozkład (Pn-Pt)</th>
                <th className="py-2 px-2 text-center">Trudne po 5. godz.</th>
                <th className="py-2 px-2 text-center">Okienka</th>
                <th className="py-2 px-2 text-center">Wynik MEN</th>
                <th className="py-2 px-2">Główne uwagi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auditSummary.classReports.map(cr => (
                <tr key={cr.classId} className="hover:bg-slate-50">
                  <td className="py-2 px-2 font-black text-slate-950">{cr.className}</td>
                  <td className="py-2 px-2 text-slate-600">{cr.gradeLevel}</td>
                  <td className="py-2 px-2 text-center font-mono font-bold">{cr.totalWeeklyHours}</td>
                  <td className="py-2 px-2 text-center font-mono text-[11px]">
                    {cr.dayStats.map(d => d.totalLessons).join(' - ')}
                  </td>
                  <td className="py-2 px-2 text-center font-bold">
                    {cr.hardSubjectsAfter5thHourCount > 0 ? (
                      <span className="text-amber-800 font-bold">{cr.hardSubjectsAfter5thHourCount}</span>
                    ) : (
                      <span className="text-emerald-700">0</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {cr.dayStats.some(d => d.hasGap) ? (
                      <span className="text-red-700 font-bold">TAK (Błąd)</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Brak</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-black">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      cr.hygieneScore >= 90 ? 'bg-emerald-100 text-emerald-900' :
                      cr.hygieneScore >= 75 ? 'bg-blue-100 text-blue-900' :
                      cr.hygieneScore >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'
                    }`}>
                      {cr.hygieneScore}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[11px] text-slate-700 italic">
                    {cr.violations.length === 0 ? 'Brak uwag (pełna zgodność)' : cr.violations[0].title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Wykaz zaleceń pokontrolnych */}
          {auditSummary.topImprovementOpportunities.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl mb-8">
              <h3 className="text-xs font-black uppercase text-slate-900 mb-2 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-700" />
                Zalecenia naprawcze do wdrożenia przez planistę:
              </h3>
              <ul className="list-disc list-inside text-xs text-slate-800 space-y-1">
                {auditSummary.topImprovementOpportunities.map((opp, idx) => (
                  <li key={idx} className="font-medium">{opp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Podpisy */}
          <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-12 border-b border-dotted border-slate-400 mb-1"></div>
              <span className="text-slate-600 font-bold">Planista / Administrator Planu</span>
            </div>
            <div>
              <div className="h-12 border-b border-dotted border-slate-400 mb-1"></div>
              <span className="text-slate-900 font-black">Dyrektor Szkoły</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── GŁÓWNY INTERFEJS AUDYTORA HIGIENY MEN ──
  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ── GÓRNY PASEK KONTROLNY & WSKAŹNIKI ── */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-4 shrink-0 backdrop-blur-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl shadow-inner">
            <HeartHandshake size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">
                Audytor Higieny Planu Ucznia (MEN & Sanepid)
              </h2>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                auditSummary.overallScore >= 90 ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' :
                auditSummary.overallScore >= 75 ? 'bg-blue-950/80 border-blue-500/30 text-blue-300' :
                auditSummary.overallScore >= 50 ? 'bg-amber-950/80 border-amber-500/30 text-amber-300' :
                'bg-red-950/80 border-red-500/30 text-red-300'
              }`}>
                Ocena: {auditSummary.overallGrade}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Weryfikacja ergonomii umysłowej, przerw obiadowych, krzywej zmęczenia i limitów dziennych
            </p>
          </div>
        </div>

        {/* Wskaźnik ogólny (Score Ring) + Akcje */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Wynik Szkoły:</span>
            <span className="text-lg font-black text-white font-mono">{auditSummary.overallScore}%</span>
          </div>

          <button
            onClick={() => setShowRegulationsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Sprawdź podstawę prawną i rozporządzenia MEN"
          >
            <BookOpen size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Podstawa prawna MEN</span>
          </button>

          <button
            onClick={() => setIsPrintMode(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
            title="Drukuj oficjalny protokół audytu A4 dla Kuratorium Oświaty lub Dyrekcji"
          >
            <Printer size={15} />
            <span>Raport A4 (Druk)</span>
          </button>
        </div>
      </div>

      {/* ── 5 KLUCZOWYCH FILARÓW HIGIENY MEN (KPI TILES) ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 shrink-0 overflow-x-auto">
        {/* Filar 1: Ciągłość zajęć (brak okienek) */}
        <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            auditSummary.complianceMetrics.noGapsCompliance === 100 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <Zap size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">0 okienek uczniów</span>
            <span className="text-sm font-black text-white font-mono">{auditSummary.complianceMetrics.noGapsCompliance}%</span>
          </div>
        </div>

        {/* Filar 2: Krzywa zmęczenia */}
        <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            auditSummary.complianceMetrics.fatigueCurveCompliance >= 80 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <Activity size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Krzywa zmęczenia</span>
            <span className="text-sm font-black text-white font-mono">{auditSummary.complianceMetrics.fatigueCurveCompliance}%</span>
          </div>
        </div>

        {/* Filar 3: Dzienne limity godzin */}
        <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            auditSummary.complianceMetrics.dailyLimitsCompliance >= 90 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <Clock size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Limity godzin/dzień</span>
            <span className="text-sm font-black text-white font-mono">{auditSummary.complianceMetrics.dailyLimitsCompliance}%</span>
          </div>
        </div>

        {/* Filar 4: Przerwy obiadowe */}
        <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            auditSummary.complianceMetrics.lunchBreakCompliance >= 80 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <Utensils size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Przerwa obiadowa</span>
            <span className="text-sm font-black text-white font-mono">{auditSummary.complianceMetrics.lunchBreakCompliance}%</span>
          </div>
        </div>

        {/* Filar 5: Równowaga tygodniowa */}
        <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            auditSummary.complianceMetrics.weeklyBalanceCompliance >= 85 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Równowaga dni</span>
            <span className="text-sm font-black text-white font-mono">{auditSummary.complianceMetrics.weeklyBalanceCompliance}%</span>
          </div>
        </div>
      </div>

      {/* ── GŁÓWNA STREFA ROBOCZA (DWUKOLUMNOWA) ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Lewa kolumna: Lista klas z wynikami i filtrami */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/50 shrink-0">
          {/* Pasek filtrów listy klas */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Oddziały ({displayedClassReports.length})
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterOnlyViolations(!filterOnlyViolations)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                  filterOnlyViolations
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Pokaż tylko klasy z uwagami lub błędami"
              >
                Tylko błędy
              </button>

              <select
                value={selectedSeverityFilter}
                onChange={e => setSelectedSeverityFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 rounded-lg px-2 py-1 focus:outline-hidden"
              >
                <option value="all">Wszystkie</option>
                <option value="critical">Krytyczne</option>
                <option value="warning">Ostrzeżenia</option>
              </select>
            </div>
          </div>

          {/* Lista kart klas */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/40">
            {displayedClassReports.map(cr => {
              const isSelected = cr.classId === selectedClassId;
              const hasCritical = cr.violations.some(v => v.severity === 'critical');

              return (
                <button
                  key={cr.classId}
                  onClick={() => setSelectedClassId(cr.classId)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 shadow-xs'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{cr.className}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">({cr.gradeLevel})</span>
                      {hasCritical && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Naruszenie krytyczne" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{cr.totalWeeklyHours} godz./tydz.</span>
                      <span>•</span>
                      <span className="font-mono">
                        {cr.dayStats.map(d => d.totalLessons).join('-')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md font-mono ${
                      cr.hygieneScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      cr.hygieneScore >= 75 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      cr.hygieneScore >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {cr.hygieneScore}%
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5 font-bold">
                      {cr.violations.length} {cr.violations.length === 1 ? 'uwaga' : 'uwag'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prawa kolumna: Szczegółowy audyt wybranej klasy */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {activeClassReport ? (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Karta nagłówkowa wybranej klasy */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-black text-white">Klasa {activeClassReport.className}</h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-bold">
                      Etap: {activeClassReport.gradeLevel}
                    </span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                      activeClassReport.hygieneScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      activeClassReport.hygieneScore >= 75 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      activeClassReport.hygieneScore >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      Wskaźnik MEN: {activeClassReport.hygieneScore}% ({activeClassReport.scoreGrade})
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Łączny tygodniowy wymiar: <strong>{activeClassReport.totalWeeklyHours} godzin</strong> • 
                    Wahanie obciążenia między dniami: <strong>{activeClassReport.hoursFluctuation} godz.</strong>
                  </p>
                </div>

                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('plan_klas')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                  >
                    <span>Otwórz w Planie Klas</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* Tygodniowy profil obciążenia i zmęczenia (Dzień po dniu) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Activity size={14} className="text-blue-400" /> Profil dobowy i zmęczenie poznawcze w tygodniu:
                </h4>

                <div className="grid grid-cols-5 gap-2">
                  {activeClassReport.dayStats.map(d => (
                    <div key={d.dayIdx} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">{d.dayName.slice(0, 3)}</span>
                      <span className="text-base font-black text-white my-0.5 block font-mono">{d.totalLessons} godz.</span>
                      
                      {d.totalLessons > 0 ? (
                        <div className="space-y-1 mt-1 text-[10px]">
                          <span className="block text-slate-400">lekcje {d.startHour}-{d.endHour}</span>
                          <span className={`block font-bold ${
                            d.fatigueScore > 75 ? 'text-red-400' : d.fatigueScore > 50 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            Zmęczenie: {d.fatigueScore}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic block mt-1">Wolne</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista zidentyfikowanych naruszeń i uwag */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Wykaz uwag i zaleceń MEN dla klasy ({activeClassReport.violations.length})</span>
                  {activeClassReport.violations.length === 0 && (
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Wzorowy rozkład zajęć
                    </span>
                  )}
                </h4>

                {activeClassReport.violations.length === 0 ? (
                  <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-6 text-center text-slate-300">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2" />
                    <h5 className="text-sm font-black text-white">Brak zastrzeżeń do planu tej klasy</h5>
                    <p className="text-xs text-slate-400 mt-1">
                      Plan lekcji w pełni respektuje zasady ergonomii umysłowej, limity dzienne oraz wytyczne MEN i Sanepidu.
                    </p>
                  </div>
                ) : (
                  activeClassReport.violations.map(viol => {
                    const isCritical = viol.severity === 'critical';
                    const isWarning = viol.severity === 'warning';

                    return (
                      <div 
                        key={viol.id}
                        className={`border rounded-2xl p-4 transition shadow-sm ${
                          isCritical
                            ? 'bg-red-950/20 border-red-500/40'
                            : isWarning
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {isCritical && <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />}
                            {isWarning && <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />}
                            {!isCritical && !isWarning && <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />}
                            
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-black text-white">{viol.title}</h5>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                                  isCritical ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                  isWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                  {isCritical ? 'Krytyczne' : isWarning ? 'Ostrzeżenie' : 'Informacja'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                {viol.description}
                              </p>

                              {viol.repairSuggestion && (
                                <div className="mt-2 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2 text-xs">
                                  <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-amber-300 block">Wskazówka naprawcza:</span>
                                    <span className="text-slate-300">{viol.repairSuggestion}</span>
                                  </div>
                                </div>
                              )}

                              <span className="text-[10px] text-slate-500 font-medium block mt-2">
                                ⚖️ {viol.menRegulationRef}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500">
              Wybierz klasę z listy po lewej stronie, aby wyświetlić szczegółowy raport higieny.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL PODSTAWY PRAWNEJ MEN & SANEPIDU ── */}
      {showRegulationsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-left overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400" />
                <h3 className="text-sm font-black text-white">Wymagania Prawne & Wytyczne MEN i Sanepidu</h3>
              </div>
              <button 
                onClick={() => setShowRegulationsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed flex-1">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-black text-blue-300 mb-1">1. Bezpieczeństwo i Higiena w Szkołach (BHP MEN)</h4>
                <p>
                  Zgodnie z § 9 Rozporządzenia MEN w sprawie bezpieczeństwa i higieny w publicznych i niepublicznych szkołach, plan zajęć dydaktyczno-wychowawczych powinien uwzględniać potrzebę równomiernego obciążenia zajęciami w poszczególnych dniach tygodnia oraz zróżnicowanie zajęć w każdym dniu.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-black text-blue-300 mb-1">2. Krzywa Zmęczenia Poznawczego (Ergonomia Sanepidu)</h4>
                <p>
                  Przedmioty wymagające wzmożonego wysiłku umysłowego (matematyka, fizyka, chemia, języki obce) powinny być planowane na 2., 3. i 4. godzinie lekcyjnej. Zabrania się kumulowania zajęć trudnych pod koniec dnia lekcyjnego (godz. 6–8), gdy zdolność skupienia uwagi u dzieci spada o ponad 60%.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-black text-blue-300 mb-1">3. Bezwzględny Zakaz Okienek dla Uczniów</h4>
                <p>
                  Uczniowie w szkole podstawowej i średniej nie mogą mieć tzw. okienek w planie lekcji. Każda godzina w trakcie dnia musi być zagospodarowana zajęciami dydaktycznymi, opieką świetlicową lub biblioteczną.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <h4 className="font-black text-blue-300 mb-1">4. Przerwy Obiadowe i Regeneracja</h4>
                <p>
                  Uczniowie przebywający w placówce powyżej 5 godzin muszą mieć zagwarantowaną co najmniej jedną przerwę trwającą minimum 15–20 minut umożliwiającą spożycie ciepłego posiłku.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRegulationsModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
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
