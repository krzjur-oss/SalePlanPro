import React, { useState } from 'react';
import { AppState, GeneratorSettings } from '../types';
import { 
  Sliders, 
  Sparkles, 
  MapPin, 
  Shield, 
  RefreshCw, 
  Check, 
  Info,
  Calendar,
  Layers,
  BookOpen,
  UserCheck
} from 'lucide-react';

interface UstawieniaGeneratorowProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
}

export const DEFAULT_GENERATOR_SETTINGS: GeneratorSettings = {
  maxGapsPerTeacher: 2,
  obeyAvailability: true,
  avoidExtremes: true,
  avoidExtremesSubjectIds: [],
  noStudentGaps: true,
  allowDoubleBlocks: true,
  includeSpecialNI: true,
  limitComputerLabs: true,
  customComputerLabsCount: 1,
  minAvailableSubstitutionTeachersPerSlot: 1,
  genPriorityHomerooms: true,
  genPriorityTeachers: true,
  genExcludeWF: true,
  genAutoPlaceWF: true,
  genClearExisting: true,
};

export default function UstawieniaGeneratorow({ appState, onChangeAppState }: UstawieniaGeneratorowProps) {
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const settings = appState.generatorSettings || DEFAULT_GENERATOR_SETTINGS;

  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 3000);
  };

  const updateSettings = (updates: Partial<GeneratorSettings>) => {
    const updatedSettings = {
      ...settings,
      ...updates
    };

    onChangeAppState({
      ...appState,
      generatorSettings: updatedSettings
    });

    triggerNotification('Zapisano ustawienia generatorów');
  };

  const updateDutySettings = (updates: Partial<typeof appState.dyzury.settings>) => {
    onChangeAppState({
      ...appState,
      dyzury: {
        ...appState.dyzury,
        settings: {
          ...appState.dyzury.settings,
          ...updates
        }
      }
    });
    triggerNotification('Zapisano ustawienia generatora dyżurów');
  };

  const handleResetToDefaults = () => {
    onChangeAppState({
      ...appState,
      generatorSettings: { ...DEFAULT_GENERATOR_SETTINGS },
      dyzury: {
        ...appState.dyzury,
        settings: {
          autoBalance: true,
          maxPerTeacher: 2,
          excludeTeachers: [],
          maxMinutesPerTeacher: 60,
          maxConsecutiveDuties: 2
        }
      }
    });
    triggerNotification('Przywrócono domyślne parametry generatorów');
  };

  const handleToggleExcludeTeacher = (teacherId: string) => {
    const currentExcluded = appState.dyzury.settings.excludeTeachers || [];
    const isExcluded = currentExcluded.includes(teacherId);
    const nextExcluded = isExcluded
      ? currentExcluded.filter(id => id !== teacherId)
      : [...currentExcluded, teacherId];
    
    updateDutySettings({ excludeTeachers: nextExcluded });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-6 custom-scrollbar space-y-6 select-none" id="ustawienia-generatorow-view">
      
      {/* NAGŁÓWEK SEKCJII */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
            <Sliders size={12} /> Konfiguracja systemowa
          </span>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            ⚙️ Ustawienia Generatorów i Algorytmów
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Dostosuj globalne parametry, kryteria optymalizacji i wagi algorytmów automatycznego generowania planów lekcji, przydziału sal lekcyjnych oraz dyżurów nauczycielskich.
          </p>
        </div>

        <button
          onClick={handleResetToDefaults}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
        >
          <RefreshCw size={14} className="text-slate-500" />
          Przywróć domyślne
        </button>
      </div>

      {/* NOTIFICATION TOAST INLINE */}
      {showNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in fade-in duration-150">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <span>{showNotification}</span>
        </div>
      )}

      {/* SIATKA SEKCJI BENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* KOLUMNA LEWA: ETAP 1 - GENERATOR PLANU LEKCJI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                1. Autogenerator Planu Lekcji (Etap 1)
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Siatka godzin i niedostępności</p>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* maxGapsPerTeacher */}
            <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="space-y-0.5 pr-4">
                <label className="text-xs font-bold text-slate-800 block"> Maksymalna liczba okienek nauczycieli</label>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Maksymalna liczba niechcianych przerw lekcyjnych u jednego nauczyciela w tygodniu.
                </span>
              </div>
              <input 
                type="number" 
                min={0}
                max={10}
                className="w-16 px-2 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={settings.maxGapsPerTeacher}
                onChange={(e) => updateSettings({ maxGapsPerTeacher: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </div>

            {/* minAvailableSubstitutionTeachersPerSlot */}
            <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="space-y-0.5 pr-4">
                <label className="text-xs font-bold text-slate-800 block">🧑‍🏫 Minimalna rezerwa nauczycieli (zastępstwa)</label>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Liczba wolnych nauczycieli z okienkami na każdej godzinie lekcyjnej do dyspozycji dyrektora.
                </span>
              </div>
              <input 
                type="number" 
                min={0}
                max={10}
                className="w-16 px-2 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={settings.minAvailableSubstitutionTeachersPerSlot !== undefined ? settings.minAvailableSubstitutionTeachersPerSlot : 1}
                onChange={(e) => updateSettings({ minAvailableSubstitutionTeachersPerSlot: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </div>

            {/* obeyAvailability */}
            <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                id="set_obeyAvailability"
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                checked={settings.obeyAvailability}
                onChange={(e) => updateSettings({ obeyAvailability: e.target.checked })}
              />
              <label htmlFor="set_obeyAvailability" className="cursor-pointer select-none space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">Przestrzegaj dyspozycyjności i wykluczeń</span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Algorytm bezwzględnie ominie godziny zaznaczone w kalendarzu jako „czerwone” (niedostępne).
                </span>
              </label>
            </div>

            {/* avoidExtremes */}
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_avoidExtremes"
                  className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  checked={settings.avoidExtremes}
                  onChange={(e) => updateSettings({ avoidExtremes: e.target.checked })}
                />
                <label htmlFor="set_avoidExtremes" className="cursor-pointer select-none space-y-0.5 flex-1">
                  <span className="text-xs font-bold text-slate-800 block">Unikaj skrajnych rozkładów lekcji</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Zapobiega sytuacji, w której nauczyciel ma zajęcia tylko na samym początku i na samym końcu dnia.
                  </span>
                </label>
              </div>

              {settings.avoidExtremes && (
                <div className="ml-7 p-3 bg-blue-50/30 border border-blue-100 rounded-xl space-y-2 animate-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider block">Wybierz przedmioty objęte regułą:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSubjectIds = appState.planLekcji.subjects.map(s => s.id);
                        const isAllSelected = (settings.avoidExtremesSubjectIds || []).length === allSubjectIds.length;
                        updateSettings({ avoidExtremesSubjectIds: isAllSelected ? [] : allSubjectIds });
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer uppercase"
                    >
                      {(settings.avoidExtremesSubjectIds || []).length === appState.planLekcji.subjects.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                    </button>
                  </div>
                  <p className="text-[9.5px] text-slate-500 leading-normal">
                    Zaznaczone przedmioty będą omijać skrajne godziny. Pozostałe przedmioty (np. koła zainteresowań, zajęcia dodatkowe) będą mogły być planowane na skrajnych godzinach lekcyjnych.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg custom-scrollbar">
                    {appState.planLekcji.subjects.map(sub => {
                      const currentSelected = settings.avoidExtremesSubjectIds || appState.planLekcji.subjects.map(s => s.id);
                      const isChecked = currentSelected.includes(sub.id);
                      return (
                        <label 
                          key={sub.id} 
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer select-none text-[11px]"
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let nextSelected: string[];
                              if (e.target.checked) {
                                nextSelected = [...currentSelected, sub.id];
                              } else {
                                nextSelected = currentSelected.filter(id => id !== sub.id);
                              }
                              updateSettings({ avoidExtremesSubjectIds: nextSelected });
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="truncate font-medium text-slate-700" title={sub.name}>
                            {sub.name} <span className="text-[9.5px] text-slate-450 font-mono">({sub.short})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* noStudentGaps */}
            <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                id="set_noStudentGaps"
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                checked={settings.noStudentGaps}
                onChange={(e) => updateSettings({ noStudentGaps: e.target.checked })}
              />
              <label htmlFor="set_noStudentGaps" className="cursor-pointer select-none space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">Całkowity brak okienek u klas (uczniów)</span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Maksymalizuje zwartość planu dla klas szkolnych, by nie zmuszać uczniów do czekania w świetlicy.
                </span>
              </label>
            </div>

            {/* allowDoubleBlocks */}
            <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                id="set_allowDoubleBlocks"
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                checked={settings.allowDoubleBlocks}
                onChange={(e) => updateSettings({ allowDoubleBlocks: e.target.checked })}
              />
              <label htmlFor="set_allowDoubleBlocks" className="cursor-pointer select-none space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">Zezwalaj na bloki dwugodzinne</span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Dla wybranych przedmiotów algorytm może łączyć pojedyncze godziny w lekcje dwugodzinne obok siebie.
                </span>
              </label>
            </div>

            {/* includeSpecialNI */}
            <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                id="set_includeSpecialNI"
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                checked={settings.includeSpecialNI}
                onChange={(e) => updateSettings({ includeSpecialNI: e.target.checked })}
              />
              <label htmlFor="set_includeSpecialNI" className="cursor-pointer select-none space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">Generuj także IPET i lekcje indywidualne (NI)</span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Uwzględnia w tym samym cyklu planowanie nauczania indywidualnego i rewalidacji wsparcia uczniów.
                </span>
              </label>
            </div>

            {/* limitComputerLabs */}
            <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
              <input 
                type="checkbox" 
                id="set_limitComputerLabs"
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                checked={settings.limitComputerLabs}
                onChange={(e) => updateSettings({ limitComputerLabs: e.target.checked })}
              />
              <label htmlFor="set_limitComputerLabs" className="cursor-pointer select-none space-y-0.5 flex-1">
                <span className="text-xs font-bold text-slate-800 block">Ograniczaj jednoczesne pracownie komputerowe</span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Algorytm pilnuje, by liczba klas z informatyką na jednej lekcji nie przekroczyła liczby dostępnych pracowni komputerowych.
                </span>
              </label>
            </div>

            {/* customComputerLabsCount */}
            {settings.limitComputerLabs && (
              <div className="flex items-center justify-between p-3 bg-blue-50/40 rounded-xl border border-blue-100 ml-7 animate-in slide-in-from-top-1 duration-150">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-700 block">Maksymalnie obłożonych pracowni jednocześnie</label>
                </div>
                <input 
                  type="number" 
                  min={1}
                  max={10}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg text-center"
                  value={settings.customComputerLabsCount}
                  onChange={(e) => updateSettings({ customComputerLabsCount: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
            )}

          </div>
        </div>

        {/* KOLUMNA PRAWA: ETAP 2 - GENERATOR GABINETÓW / SAL */}
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  2. Generator i Przydział Sal (Etap 2)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Automatyczna relokacja i gabinety</p>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* genPriorityHomerooms */}
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_genPriorityHomerooms"
                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                  checked={settings.genPriorityHomerooms}
                  onChange={(e) => updateSettings({ genPriorityHomerooms: e.target.checked })}
                />
                <label htmlFor="set_genPriorityHomerooms" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Priorytet dla klasopracowni (gospodarze klas)</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Generator najpierw umieści lekcje danej klasy w jej własnej sali (tam, gdzie klasa jest gospodarzem).
                  </span>
                </label>
              </div>

              {/* genPriorityTeachers */}
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_genPriorityTeachers"
                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                  checked={settings.genPriorityTeachers}
                  onChange={(e) => updateSettings({ genPriorityTeachers: e.target.checked })}
                />
                <label htmlFor="set_genPriorityTeachers" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Priorytet dla stałych gabinetów nauczycieli</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    W drugiej kolejności generator celuje w przypisanie sali stałego przedmiotu danego nauczyciela (gabinet przedmiotowy).
                  </span>
                </label>
              </div>

              {/* genExcludeWF */}
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_genExcludeWF"
                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                  checked={settings.genExcludeWF}
                  onChange={(e) => updateSettings({ genExcludeWF: e.target.checked })}
                />
                <label htmlFor="set_genExcludeWF" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Wykluczenie lekcji W-F z klasowych sal</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Lekcje wychowania fizycznego nie zostaną przypisane do zwykłych ławek klasowych, co zwalnia miejsce dla innych lekcji.
                  </span>
                </label>
              </div>

              {/* genAutoPlaceWF */}
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_genAutoPlaceWF"
                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                  checked={settings.genAutoPlaceWF}
                  onChange={(e) => updateSettings({ genAutoPlaceWF: e.target.checked })}
                />
                <label htmlFor="set_genAutoPlaceWF" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Automatyczny przydział obiektów sportowych</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Automatycznie rozlokuje lekcje wychowania fizycznego na sali gimnastycznej, orliku lub basenie.
                  </span>
                </label>
              </div>

              {/* genClearExisting */}
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_genClearExisting"
                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                  checked={settings.genClearExisting}
                  onChange={(e) => updateSettings({ genClearExisting: e.target.checked })}
                />
                <label htmlFor="set_genClearExisting" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Zresetuj aktualne przypisania sal przed startem</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Pozwala generatorowi na całkowicie czyste i optymalne ułożenie planu sal od zera bez blokowania ręcznych zmian.
                  </span>
                </label>
              </div>

            </div>
          </div>

          {/* GENERATOR DYŻURÓW (ETAP 3) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Shield size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  3. Optymalizator i Generator Dyżurów (Etap 3)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Bezpieczeństwo na przerwach</p>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* autoBalance */}
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <input 
                  type="checkbox" 
                  id="set_autoBalance"
                  className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  checked={appState.dyzury.settings.autoBalance}
                  onChange={(e) => updateDutySettings({ autoBalance: e.target.checked })}
                />
                <label htmlFor="set_autoBalance" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Równomierne obciążenie nauczycieli dyżurami</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Generator dba o to, by nauczyciele mieli zbliżoną liczbę dyżurów w tygodniu (minimalizacja dysproporcji).
                  </span>
                </label>
              </div>

              {/* maxMinutesPerTeacher */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-4">
                  <label className="text-xs font-bold text-slate-800 block">⏱️ Maksymalny czas dyżurów w tygodniu (minuty)</label>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Maksymalny łączny czas dyżurów w tygodniu przydzielony jednemu nauczycielowi (np. 60 minut).
                  </span>
                </div>
                <input 
                  type="number" 
                  min={10}
                  max={300}
                  step={5}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg text-center font-mono"
                  value={appState.dyzury.settings.maxMinutesPerTeacher || 60}
                  onChange={(e) => updateDutySettings({ maxMinutesPerTeacher: Math.max(10, parseInt(e.target.value) || 60) })}
                />
              </div>

              {/* maxConsecutiveDuties */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-4">
                  <label className="text-xs font-bold text-slate-800 block">🔄 Maksymalna liczba dyżurów pod rząd</label>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Ile kolejnych przerw maksymalnie nauczyciel może spędzić na dyżurze (bez przerw wolnych).
                  </span>
                </div>
                <input 
                  type="number" 
                  min={1}
                  max={5}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg text-center font-mono"
                  value={appState.dyzury.settings.maxConsecutiveDuties !== undefined ? appState.dyzury.settings.maxConsecutiveDuties : 2}
                  onChange={(e) => updateDutySettings({ maxConsecutiveDuties: Math.max(1, parseInt(e.target.value) || 2) })}
                />
              </div>

              {/* excludeTeachers */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block flex items-center gap-1">
                  <UserCheck size={14} className="text-slate-500" /> Nauczyciele wykluczeni z dyżurów:
                </label>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Zaznacz kogo algorytm ma całkowicie pominąć podczas automatycznego losowania i przydzielania dyżurów (np. dyrektora lub wicedyrektora).
                </p>
                
                <div className="border border-slate-150 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white p-1 custom-scrollbar">
                  {appState.planLekcji.teachers.map(teacher => {
                    const isExcluded = (appState.dyzury.settings.excludeTeachers || []).includes(teacher.id);
                    return (
                      <div 
                        key={teacher.id} 
                        onClick={() => handleToggleExcludeTeacher(teacher.id)}
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer transition select-none text-xs"
                      >
                        <span className="font-bold text-slate-700">
                          {teacher.first} {teacher.last} <span className="text-slate-400 font-normal">({teacher.abbr})</span>
                        </span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isExcluded 
                            ? 'bg-red-500 border-red-600 text-white' 
                            : 'border-slate-300 text-transparent'
                        }`}>
                          <Check size={10} strokeWidth={3} />
                        </div>
                      </div>
                    );
                  })}
                  {appState.planLekcji.teachers.length === 0 && (
                    <p className="text-slate-400 text-center py-4 text-[10.5px]">Brak zdefiniowanych nauczycieli w bazie.</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* INFORMACJA O ALGORYTMIE */}
      <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex gap-3 text-blue-900 shadow-xs">
        <Info size={18} className="shrink-0 mt-0.5 text-blue-600" />
        <div className="space-y-1">
          <h4 className="font-bold text-xs text-blue-950">Wskazówka: Jak działają te ustawienia?</h4>
          <p className="text-[10.5px] leading-relaxed text-blue-800">
            Wszystkie zmiany wprowadzane w tym panelu są zapisywane automatycznie i obowiązują jako domyślne parametry podczas uruchamiania generatorów w poszczególnych krokach. Możesz je w każdej chwili dostosować lub przywrócić zalecane wartości domyślne jednym przyciskiem.
          </p>
        </div>
      </div>

    </div>
  );
}
