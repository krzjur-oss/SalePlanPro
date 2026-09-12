import React, { useState } from 'react';
import { AppState, SchedData, PlanVariant, PlanVariantTag } from '../types';
import { uid } from '../utils';
import { dualScreenService } from '../services/dualScreenService';
import { 
  Sparkles, Layers, Plus, Check, Calendar, Tag, Info, CheckCircle2, 
  Copy, RefreshCw, Eye, ArrowRight, ShieldCheck 
} from 'lucide-react';

interface DualScreen2KreatorProps {
  appState: AppState;
  schedData: SchedData;
  activeVariant: PlanVariant | null;
  planVariants: PlanVariant[];
  onVariantCreated?: (newVariant: PlanVariant) => void;
}

const COLOR_PRESETS = [
  '#3b82f6', // Niebieski
  '#10b981', // Szmaragdowy
  '#8b5cf6', // Fioletowy
  '#f59e0b', // Bursztynowy
  '#ef4444', // Czerwony
  '#06b6d4', // Turkusowy
  '#ec4899', // Różowy
  '#64748b'  // Łupkowy
];

const TAG_CONFIG: Record<PlanVariantTag, { label: string; bg: string; text: string }> = {
  semestr_1: { label: 'Semestr I', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  semestr_2: { label: 'Semestr II', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  roboczy: { label: 'Wariant roboczy', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  awaryjny: { label: 'Wariant awaryjny', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
  praktyki: { label: 'Praktyki / Staże', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  inna: { label: 'Własny wariant', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' }
};

export default function DualScreen2Kreator({
  appState,
  schedData,
  activeVariant,
  planVariants,
  onVariantCreated
}: DualScreen2KreatorProps) {
  const [newVarName, setNewVarName] = useState('');
  const [newVarTag, setNewVarTag] = useState<PlanVariantTag>('semestr_2');
  const [newVarColor, setNewVarColor] = useState(COLOR_PRESETS[1]);
  const [newVarDesc, setNewVarDesc] = useState('');
  const [newVarValidFrom, setNewVarValidFrom] = useState('');
  const [newVarValidTo, setNewVarValidTo] = useState('');
  const [newVarSourceMode, setNewVarSourceMode] = useState<'clone_active' | 'clone_other' | 'blank'>('clone_active');
  const [newVarSourceOtherId, setNewVarSourceOtherId] = useState<string>('');
  
  // Clone options
  const [cloneLessons, setCloneLessons] = useState(true);
  const [cloneRooms, setCloneRooms] = useState(true);
  const [cloneDuties, setCloneDuties] = useState(true);
  const [cloneSpe, setCloneSpe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateVariant = (activateImmediately: boolean = false) => {
    if (!newVarName.trim()) {
      alert('Podaj nazwę dla nowego wariantu planu lekcji');
      return;
    }

    setIsSubmitting(true);

    try {
      let baseLessons = {};
      let baseSchedData = {};

      if (newVarSourceMode === 'clone_active') {
        if (cloneLessons) baseLessons = JSON.parse(JSON.stringify(appState.planLekcji.lessons || {}));
        if (cloneRooms) baseSchedData = JSON.parse(JSON.stringify(schedData || {}));
      } else if (newVarSourceMode === 'clone_other' && newVarSourceOtherId) {
        const sourceVar = planVariants.find(v => v.id === newVarSourceOtherId);
        if (sourceVar) {
          if (cloneLessons) baseLessons = JSON.parse(JSON.stringify(sourceVar.data?.lessons || {}));
          if (cloneRooms) baseSchedData = JSON.parse(JSON.stringify(sourceVar.data?.schedData || {}));
        }
      }

      const totalLessonsCount = Object.keys(baseLessons).length;
      const classesCount = appState.planLekcji.classes?.length || 0;
      const teachersCount = appState.planLekcji.teachers?.length || 0;
      const roomsUsedCount = appState.planLekcji.rooms?.length || 0;

      const newVariant: PlanVariant = {
        id: `var_${uid()}`,
        name: newVarName.trim(),
        tag: newVarTag,
        description: newVarDesc.trim(),
        color: newVarColor,
        validFrom: newVarValidFrom || undefined,
        validTo: newVarValidTo || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActiveNow: activateImmediately,
        data: {
          lessons: baseLessons,
          schedData: baseSchedData,
          assignments: cloneLessons ? JSON.parse(JSON.stringify(appState.planLekcji.assignments || [])) : undefined,
          specialLessons: cloneSpe ? JSON.parse(JSON.stringify(appState.planLekcji.specialLessons || {})) : undefined,
          specialAbsences: cloneSpe ? JSON.parse(JSON.stringify(appState.planLekcji.specialAbsences || {})) : undefined,
          dyzury: cloneDuties ? JSON.parse(JSON.stringify(appState.dyzury || {})) : undefined
        },
        stats: {
          totalLessons: totalLessonsCount,
          classesCount,
          teachersCount,
          roomsUsedCount
        }
      };

      // Broadcast to Master window (Ekran 1)
      dualScreenService.sendMessage({
        type: 'CREATE_VARIANT',
        payload: {
          variant: newVariant,
          activateImmediately
        },
        timestamp: Date.now()
      });

      if (onVariantCreated) {
        onVariantCreated(newVariant);
      }

      setSuccessMsg(`Pomyślnie utworzono wariant: "${newVariant.name}"! Dane zostały zsynchronizowane z Ekranem 1.`);
      
      // Reset form
      setNewVarName('');
      setNewVarDesc('');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Błąd podczas tworzenia wariantu:', err);
      alert('Wystąpił błąd podczas tworzenia wariantu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 app-workspace-canvas select-none">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Baner powitalny / instrukcja dla Ekranu 2 */}
        <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50/60 border border-indigo-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                  Ekran 2 (Towarzyszący) • Kreator Szkoły
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Utwórz nowy wariant planu lekcji
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Na Ekranie 1 wyświetlane jest podsumowanie aktywnej konfiguracji szkoły. Poniżej możesz przygotować nowy wariant (np. na drugi semestr, wariant z nowymi salami lub scenariusz roboczy) i natychmiast przekazać go do bazy szkoły.
              </p>
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-fade-in shadow-xs">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formularz nowego wariantu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Tag size={16} className="text-indigo-600" />
            Parametry i tożsamość nowego wariantu
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nazwa wariantu */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nazwa nowego wariantu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="np. Wariant II (Semestr Letni), Wariant z blokiem WF, Wariant próbny B..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Kategoria / Tag */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kategoria (Przeznaczenie)
              </label>
              <select
                value={newVarTag}
                onChange={(e) => setNewVarTag(e.target.value as PlanVariantTag)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="semestr_2">Semestr II (Wiosenny)</option>
                <option value="semestr_1">Semestr I (Jesienny)</option>
                <option value="roboczy">Wariant roboczy (Testowy)</option>
                <option value="awaryjny">Wariant awaryjny (Zastępstwa / Remont)</option>
                <option value="praktyki">Praktyki / Staże zawodowe</option>
                <option value="inna">Własny scenariusz</option>
              </select>
            </div>

            {/* Kolor identyfikacyjny */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kolor identyfikacyjny
              </label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewVarColor(c)}
                    className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border ${
                      newVarColor === c ? 'scale-110 border-slate-800 ring-2 ring-indigo-400' : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Opis założeń wariantu */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Opis założeń i notatki (opcjonalnie)
              </label>
              <textarea
                value={newVarDesc}
                onChange={(e) => setNewVarDesc(e.target.value)}
                placeholder="Wprowadź uwagi do wariantu, np. zmiana siatki godzin w klasach 4, włączenie nowej hali sportowej..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Źródło danych początkowych */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Copy size={15} className="text-teal-600" />
              Baza startowa dla nowego wariantu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-2 ${
                newVarSourceMode === 'clone_active'
                  ? 'bg-indigo-50/80 border-indigo-400 text-slate-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="varSource"
                    checked={newVarSourceMode === 'clone_active'}
                    onChange={() => setNewVarSourceMode('clone_active')}
                    className="accent-indigo-600"
                  />
                  <span className="font-extrabold text-slate-800">Klonuj aktywny wariant</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Przenosi bieżący stan planu klas i sal ({activeVariant?.name || 'Główny'})
                </p>
              </label>

              <label className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-2 ${
                newVarSourceMode === 'clone_other'
                  ? 'bg-indigo-50/80 border-indigo-400 text-slate-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="varSource"
                    checked={newVarSourceMode === 'clone_other'}
                    onChange={() => setNewVarSourceMode('clone_other')}
                    className="accent-indigo-600"
                  />
                  <span className="font-extrabold text-slate-800">Klonuj inny wariant</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Wybierz spośród zarchiwizowanych wariantów
                </p>
              </label>

              <label className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-2 ${
                newVarSourceMode === 'blank'
                  ? 'bg-indigo-50/80 border-indigo-400 text-slate-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="varSource"
                    checked={newVarSourceMode === 'blank'}
                    onChange={() => setNewVarSourceMode('blank')}
                    className="accent-indigo-600"
                  />
                  <span className="font-extrabold text-slate-800">Czysta siatka planu</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Zachowuje kadrę i oddziały, ale czyści siatkę lekcji do zera
                </p>
              </label>
            </div>

            {/* Wybór innego wariantu jeśli clone_other */}
            {newVarSourceMode === 'clone_other' && (
              <div className="mt-2">
                <select
                  value={newVarSourceOtherId}
                  onChange={(e) => setNewVarSourceOtherId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Wybierz wariant źródłowy...</option>
                  {planVariants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.tag}) — utworzony {new Date(v.createdAt).toLocaleDateString('pl-PL')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Zaawansowane opcje kopiowania */}
            {newVarSourceMode !== 'blank' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneLessons}
                    onChange={(e) => setCloneLessons(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded"
                  />
                  <span className="text-slate-700 font-bold text-[11px]">Siatka lekcji klas</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneRooms}
                    onChange={(e) => setCloneRooms(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded"
                  />
                  <span className="text-slate-700 font-bold text-[11px]">Plan przydziału sal</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneDuties}
                    onChange={(e) => setCloneDuties(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded"
                  />
                  <span className="text-slate-700 font-bold text-[11px]">Dyżury nauczycieli</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneSpe}
                    onChange={(e) => setCloneSpe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded"
                  />
                  <span className="text-slate-700 font-bold text-[11px]">Zajęcia SPE / NI</span>
                </label>
              </div>
            )}
          </div>

          {/* Przyciski akcji */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleCreateVariant(false)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Plus size={15} />
              <span>Utwórz wariant w tle</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleCreateVariant(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs shadow-indigo-200"
            >
              <Sparkles size={15} />
              <span>Utwórz i natychmiast aktywuj</span>
            </button>
          </div>
        </div>

        {/* Lista istniejących wariantów */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers size={15} className="text-indigo-600" />
              Dotychczasowe warianty szkoły ({planVariants.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Wariant aktywny oznaczony zieloną plakietką
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {planVariants.map(v => {
              const isActive = v.id === activeVariant?.id;
              const tagCfg = TAG_CONFIG[v.tag] || TAG_CONFIG.inna;
              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                    isActive
                      ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-300'
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                        <h4 className="text-xs font-black text-slate-900 truncate">{v.name}</h4>
                      </div>
                      {isActive ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                          AKTYWNY
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tagCfg.bg} ${tagCfg.text} shrink-0`}>
                          {tagCfg.label}
                        </span>
                      )}
                    </div>
                    {v.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{v.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Utworzono: {new Date(v.createdAt).toLocaleDateString('pl-PL')}</span>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          dualScreenService.sendMessage({
                            type: 'SWITCH_VARIANT',
                            payload: { variantId: v.id },
                            timestamp: Date.now()
                          });
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Przełącz na ten wariant</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
