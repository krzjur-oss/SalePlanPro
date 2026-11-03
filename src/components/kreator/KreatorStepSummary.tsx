import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, HelpCircle } from 'lucide-react';

export interface KreatorStepSummaryStats {
  blds: number;
  rooms: number;
  classes: number;
  teachers: number;
  subjects: number;
  corridors: number;
  totalHours: number;
  specialStudents: number;
  specialHours: number;
}

export interface KreatorStepSummaryProps {
  statsSummary: KreatorStepSummaryStats;
  setActiveStep: (step: number) => void;
  onOpenTemplates: () => void;
  onNavigateToTab: (tab: 'plan_klas' | 'plan_sal' | 'dyzury') => void;
}

export const KreatorStepSummary: React.FC<KreatorStepSummaryProps> = ({
  statsSummary,
  setActiveStep,
  onOpenTemplates,
  onNavigateToTab
}) => {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="border-b border-slate-200 pb-4 text-center">
        <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 10: Finalizacja</span>
        <h2 className="text-xl font-black text-slate-900 mt-2">🏁 Dane wprowadzone poprawnie!</h2>
        <p className="text-xs text-slate-500 mt-1">Końcowe podsumowanie bazy danych oraz wytyczne ułożenia planu lekcji.</p>
      </div>

      {/* Stats bento layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Budynki</span>
          <span className="text-2xl font-black text-slate-800">{statsSummary.blds}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sale / Gabinety</span>
          <span className="text-2xl font-black text-slate-800">{statsSummary.rooms}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Klasy</span>
          <span className="text-2xl font-black text-slate-800">{statsSummary.classes}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Nauczyciele</span>
          <span className="text-2xl font-black text-slate-800">{statsSummary.teachers}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Przedmioty</span>
          <span className="text-2xl font-black text-slate-800">{statsSummary.subjects}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Stanowiska dyżurów</span>
          <span className="text-2xl font-black text-slate-800">{statsSummary.corridors}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm col-span-2 sm:col-span-1">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Godzin łącznie</span>
          <span className="text-2xl font-black text-slate-800 text-blue-600">{statsSummary.totalHours} h</span>
        </div>
      </div>

      {/* Special education stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm flex flex-col justify-center">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Zdefiniowani uczniowie wsparcia</span>
          <span className="text-2xl font-black text-indigo-750 text-indigo-600">{statsSummary.specialStudents}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm flex flex-col justify-center">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Wymiar lekcji indywidualnych</span>
          <span className="text-2xl font-black text-indigo-750 text-indigo-600">{statsSummary.specialHours} h/tyg</span>
        </div>
      </div>

      {/* Detailed Polish guide for scheduling next phases */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl space-y-4">
        <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5 select-none font-sans">
          <HelpCircle size={15} /> Jak krok po kroku ułożyć teraz harmonogram lekcji?
        </h3>
        
        <div className="space-y-3.5 text-slate-700 text-xs">
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <h4 className="font-bold text-blue-950">Etap 1: Plan Klas (Solfeggio planowania lekcji)</h4>
              <p className="text-slate-600 mt-0.5 leading-relaxed">Przejdź do zakładki <strong>„Etap 1: Plan Klas”</strong>. Tutaj przydzielasz lekcje do dni i godzin dla poszczególnych oddziałów. Wybierz klasę z menu bocznego, przeciągaj przydziały do komórek planu lekcji i eliminuj konflikty nauczycielskie w czasie rzeczywistym.</p>
            </div>
          </div>

          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <h4 className="font-bold text-blue-950">Zsynchronizuj ułożone lekcje z siatką sal</h4>
              <p className="text-slate-600 mt-0.5 leading-relaxed">Po ułożeniu Planu Klas skorzystaj z przycisku <strong>„Przenieś do Planu Sal”</strong> w nagłówku. System weźmie ułożone jednostki lekcyjne i przeniesie je do bazy gabinetów.</p>
            </div>
          </div>

          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <h4 className="font-bold text-blue-950">Etap 2: Przypisanie gabinetów dla lekcji</h4>
              <p className="text-slate-600 mt-0.5 leading-relaxed">W zakładce <strong>„Etap 2: Plan Sal”</strong> dokonujesz ostatecznego rozmieszczenia lekcji w gabinetach lekcyjnych, salach sportowych, basenach lub pracowniach komputerowych. Pozwoli to uniknąć konfliktatów lokalowych.</p>
            </div>
          </div>

          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">4</span>
            <div>
              <h4 className="font-bold text-blue-950">Etap 3: Dyżury korytarzowe i schodowe</h4>
              <p className="text-slate-600 mt-0.5 leading-relaxed">W zakładce <strong>„Etap 3: Dyżury”</strong> przypisujesz nauczycieli na przerwach korytarzowych. Program wykorzystuje wprowadzoną wymaganą liczbę nauczycieli i pozwala na losowanie lub ręczne obsadzanie pozycji na dyżurach.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action routes */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
        <button 
          onClick={() => setActiveStep(9)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs p-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-300"
        >
          <ArrowLeft size={14} /> Wstecz: Przydziały lekcyjne
        </button>
        <button 
          onClick={onOpenTemplates}
          className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
        >
          <Bookmark size={14} /> 💾 Zapisz tę strukturę jako Szablon
        </button>
        <button 
          onClick={() => onNavigateToTab('plan_klas')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition"
        >
          <ArrowRight size={14} className="animate-bounce" /> Przejdź do Etapu 1: Plan Klas
        </button>
        <button 
          onClick={() => onNavigateToTab('dyzury')}
          className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 shadow transition"
        >
          Zobacz Dyżury Nauczycieli
        </button>
      </div>
    </div>
  );
};
