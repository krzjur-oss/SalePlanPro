/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Komponent Edycji Pensum i Stanowisk Nauczyciela (Karta Nauczyciela)
 * 
 * Wspiera:
 * - Wymiary pensum w SP: 18h (przedmiotowy), 20h (wspomagający), 26h (świetlica), 30h (biblioteka), 22h (specjaliści/doradca)
 * - Pensum łączone: proporcjonalny wzór H / sum(h_i / P_i)
 * - Rozdzielenie godzin 45 min i 60 min
 * - Sugerowany limit dyżurów proporcjonalny do etatu i godzin przy tablicy
 * - Monitor limitu 40h czasu pracy
 */

import React, { useState } from 'react';
import { TeacherWorkloadPosition, StandardPositionType } from '../types';
import { STANDARD_POSITIONS_META, round } from '../utils/workloadUtils';
import { uid } from '../utils';
import { 
  Plus, Trash2, Sliders, Shield, BookOpen, Clock, AlertCircle, CheckCircle2, 
  HelpCircle, Sparkles, ChevronDown, ChevronUp, Scale
} from 'lucide-react';

export interface TeacherWorkloadEditorProps {
  positions: TeacherWorkloadPosition[];
  onChangePositions: (positions: TeacherWorkloadPosition[]) => void;
  livePreview: {
    hours45min: number;
    hours60min: number;
    boardHours: number;
    totalHours: number;
    totalFte: number;
    ftePercent: number;
    averagedPensum: number;
    isCombined: boolean;
    overtimeHours: number;
    suggestedDutyLimit: number;
  };
  dutyExempt: boolean;
  onChangeDutyExempt: (exempt: boolean) => void;
  maxDutyCount: number | '';
  onChangeMaxDutyCount: (count: number | '') => void;
  customPensum: number | '';
  onChangeCustomPensum: (pensum: number | '') => void;
  maxHours: number | '';
  onChangeMaxHours: (hours: number | '') => void;
  overtimeHours: number | '';
  onChangeOvertimeHours: (hours: number | '') => void;
}

export const TeacherWorkloadEditor: React.FC<TeacherWorkloadEditorProps> = ({
  positions,
  onChangePositions,
  livePreview,
  dutyExempt,
  onChangeDutyExempt,
  maxDutyCount,
  onChangeMaxDutyCount,
  customPensum,
  onChangeCustomPensum,
  maxHours,
  onChangeMaxHours,
  overtimeHours,
  onChangeOvertimeHours
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Szybkie szablony (presets)
  const applyPreset = (type: StandardPositionType, customHours?: number) => {
    const meta = STANDARD_POSITIONS_META[type];
    const hours = customHours ?? meta.defaultPensum;

    onChangePositions([
      {
        id: 'pos_' + uid(),
        type,
        title: meta.label.split('(')[0].trim(),
        hours,
        basePensum: meta.defaultPensum,
        unitMinutes: meta.unitMinutes
      }
    ]);
    onChangeMaxHours(hours);
    onChangeOvertimeHours(0);
    onChangeCustomPensum('');
  };

  const applyCombinedPreset = () => {
    onChangePositions([
      {
        id: 'pos_' + uid(),
        type: 'przedmiotowy',
        title: 'Przedmiot lekcyjny (np. matematyka)',
        hours: 10,
        basePensum: 18,
        unitMinutes: 45
      },
      {
        id: 'pos_' + uid(),
        type: 'swietlica',
        title: 'Świetlica szkolna',
        hours: 10,
        basePensum: 26,
        unitMinutes: 60
      }
    ]);
    onChangeMaxHours(20);
    onChangeOvertimeHours(0);
    onChangeCustomPensum('');
  };

  const addPosition = () => {
    const defaultType: StandardPositionType = 'przedmiotowy';
    const meta = STANDARD_POSITIONS_META[defaultType];
    const newPos: TeacherWorkloadPosition = {
      id: 'pos_' + uid(),
      type: defaultType,
      title: 'Zajęcia dydaktyczne',
      hours: 18,
      basePensum: meta.defaultPensum,
      unitMinutes: meta.unitMinutes
    };
    onChangePositions([...positions, newPos]);
  };

  const updatePosition = (id: string, updates: Partial<TeacherWorkloadPosition>) => {
    const next = positions.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };

      // Jeśli zmieniono typ stanowiska, zaktualizuj domyślne pensum i jednostkę czasu
      if (updates.type && updates.type !== p.type) {
        const meta = STANDARD_POSITIONS_META[updates.type];
        updated.basePensum = meta.defaultPensum;
        updated.unitMinutes = meta.unitMinutes;
        if (!updates.title || p.title === STANDARD_POSITIONS_META[p.type]?.label.split('(')[0].trim()) {
          updated.title = meta.label.split('(')[0].trim();
        }
      }
      return updated;
    });
    onChangePositions(next);
  };

  const removePosition = (id: string) => {
    const next = positions.filter(p => p.id !== id);
    onChangePositions(next);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-3.5">
      {/* Nagłówek sekcji */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-amber-100 text-amber-800 rounded-lg">
            <Scale size={15} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Pensum i Stanowiska (Karta Nauczyciela)
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Wymiar pensum, pensum łączone i limity dyżurów w szkole podstawowej
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10.5px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
        >
          <Sliders size={12} />
          <span>{showAdvanced ? 'Mniej' : 'Opcje zaawansowane'}</span>
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Szybkie szablony (Presets) */}
      <div className="space-y-1.5">
        <label className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-wider block">
          Szybki wybór stanowiska bazowego:
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('przedmiotowy')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
            title="Przedmiotowy: 18h lekcyjnych (45 min)"
          >
            <span>🏫</span> Przedmiotowy (18h)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('wspomagajacy')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
            title="Współorganizujący kształcenie: 20h lekcyjnych (45 min)"
          >
            <span>🤝</span> Wspomagający (20h)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('swietlica')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
            title="Wychowawca świetlicy: 26h zegarowych (60 min)"
          >
            <span>🧸</span> Świetlica (26h)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('biblioteka')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
            title="Bibliotekarz: 30h zegarowych (60 min)"
          >
            <span>📖</span> Biblioteka (30h)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('specjalista')}
            className="px-2 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
            title="Pedagog/Psycholog/Logopeda: maks. 22h zegarowych (60 min)"
          >
            <span>🧠</span> Specjalista (22h)
          </button>
          <button
            type="button"
            onClick={applyCombinedPreset}
            className="px-2 py-1 bg-amber-50 border border-amber-300 hover:bg-amber-100/70 rounded-lg text-[10px] font-black text-amber-900 flex items-center gap-1 transition cursor-pointer"
            title="Łączony etat: np. 10h przedmiot + 10h świetlica"
          >
            <Sparkles size={11} className="text-amber-600" /> Łączony (10h+10h)
          </button>
        </div>
      </div>

      {/* Lista przypisanych stanowisk */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[9.5px] text-slate-500 font-extrabold uppercase tracking-wider">
            Przydział godzin i stanowisk ({positions.length}):
          </label>
          <button
            type="button"
            onClick={addPosition}
            className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
          >
            <Plus size={12} /> Dodaj stanowisko (pensum łączone)
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-center space-y-1">
            <p className="text-[11px] text-slate-600 font-medium">
              Brak zdefiniowanych stanowisk szczegółowych.
            </p>
            <p className="text-[10px] text-slate-400">
              Używany jest domyślny wymiar pensum dydaktycznego: <strong>18 godzin tygodniowo (45 min)</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {positions.map((pos) => {
              const meta = STANDARD_POSITIONS_META[pos.type];
              return (
                <div 
                  key={pos.id}
                  className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2 shadow-xs transition hover:border-slate-300"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Typ stanowiska */}
                    <div className="sm:col-span-5">
                      <select
                        value={pos.type}
                        onChange={(e) => updatePosition(pos.id, { type: e.target.value as StandardPositionType })}
                        className="w-full px-2 py-1 text-[11px] font-bold border border-slate-200 rounded bg-slate-50 text-slate-800 outline-none"
                      >
                        <option value="przedmiotowy">🏫 Przedmiotowy (18h / 45 min)</option>
                        <option value="wspomagajacy">🤝 Wspomagający (20h / 45 min)</option>
                        <option value="swietlica">🧸 Świetlica (26h / 60 min)</option>
                        <option value="biblioteka">📖 Biblioteka (30h / 60 min)</option>
                        <option value="specjalista">🧠 Specjalista (22h / 60 min)</option>
                        <option value="doradca">🎯 Doradca zawodowy (22h / 45 min)</option>
                        <option value="inny">⚙️ Inne stanowisko (indywidualne)</option>
                      </select>
                    </div>

                    {/* Nazwa przedmiotu / roli */}
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={pos.title}
                        onChange={(e) => updatePosition(pos.id, { title: e.target.value })}
                        placeholder="np. Język polski"
                        className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white text-slate-800 outline-none font-medium"
                      />
                    </div>

                    {/* Godziny tygodniowo */}
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min={0.5}
                        max={40}
                        step={0.5}
                        value={pos.hours}
                        onChange={(e) => updatePosition(pos.id, { hours: parseFloat(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 text-[11px] font-black border border-slate-200 rounded bg-white text-slate-900 outline-none text-center"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">godz.</span>
                    </div>

                    {/* Pensum bazowe i jednostka */}
                    <div className="sm:col-span-2 flex items-center justify-between gap-1">
                      <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border ${
                        pos.unitMinutes === 45 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {pos.unitMinutes === 45 ? '⏱️ 45m' : '⏰ 60m'}
                      </span>

                      {positions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePosition(pos.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Usuń to stanowisko"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5">
                    <span>Podstawa: <strong>{meta?.legalBasis || 'Karta Nauczyciela'}</strong> (P = {pos.basePensum}h)</span>
                    <span>Wkład do etatu: <strong>{round(pos.hours / (pos.basePensum || 18), 3)} etatu</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Podsumowanie kalkulacji na żywo (Live KPI Box) */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 border border-indigo-200 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-600" />
            Rozliczenie tygodniowe:
          </span>
          {livePreview.isCombined && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs">
              ⚡ Pensum łączone (uśrednione)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Godziny 45m vs 60m */}
          <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Godz. 45m / 60m</span>
            <div className="text-xs font-black text-slate-800">
              <span className="text-blue-700">{livePreview.hours45min}h</span>
              <span className="text-slate-300 font-normal mx-1">|</span>
              <span className="text-amber-700">{livePreview.hours60min}h</span>
            </div>
            <span className="text-[8.5px] text-slate-400 font-medium">lekcyjne / zegarowe</span>
          </div>

          {/* Wymiar etatu */}
          <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Wymiar etatu (FTE)</span>
            <div className="text-xs font-black text-indigo-700">
              {livePreview.totalFte.toFixed(2)} <span className="text-[9px] font-bold">({livePreview.ftePercent}%)</span>
            </div>
            <span className="text-[8.5px] text-slate-400 font-medium">suma ułamków etatu</span>
          </div>

          {/* Pensum wyliczone */}
          <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Pensum tygodniowe</span>
            <div className="text-xs font-black text-slate-800">
              {livePreview.averagedPensum}h
            </div>
            <span className="text-[8.5px] text-slate-400 font-medium">
              {livePreview.isCombined ? 'uśrednione ze wzoru' : 'bazowe'}
            </span>
          </div>

          {/* Nadgodziny */}
          <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Nadgodziny</span>
            <div className={`text-xs font-black ${livePreview.overtimeHours > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {livePreview.overtimeHours > 0 ? `+${livePreview.overtimeHours}h` : '0h'}
            </div>
            <span className="text-[8.5px] text-slate-400 font-medium">ponad etat</span>
          </div>
        </div>

        {/* Sugerowany przydział dyżurów */}
        <div className="bg-white/90 p-2 rounded-lg border border-indigo-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield size={14} className="text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-800 block truncate">
                Sugerowany limit dyżurów na przerwach:
              </span>
              <span className="text-[8.5px] text-slate-400 block">
                Wyliczony proporcjonalnie do etatu i godzin przy tablicy ({livePreview.boardHours}h przy tablicy)
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              {dutyExempt ? 'Zwolniony (0)' : `${maxDutyCount !== '' ? maxDutyCount : livePreview.suggestedDutyLimit} dyż./tydz.`}
            </span>
          </div>
        </div>
      </div>

      {/* Opcje zaawansowane (Collapsible) */}
      {showAdvanced && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 pt-3">
          <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
            Ręczne nadpisania i wyjątki (Karta Nauczyciela / Regulamin Szkoły):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold block">
                Indywidualny limit dyżurów (liczba na tydzień):
              </label>
              <input
                type="number"
                min={0}
                max={20}
                placeholder={`Sugerowany: ${livePreview.suggestedDutyLimit}`}
                value={maxDutyCount}
                onChange={(e) => onChangeMaxDutyCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-slate-50 rounded-lg outline-none font-bold text-slate-800"
              />
              <span className="text-[8.5px] text-slate-400">
                Puste = automatyczny limit proporcjonalny ({livePreview.suggestedDutyLimit} dyżurów)
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold block">
                Ręczne nadpisanie pensum (np. obniżenie dla dyrekcji):
              </label>
              <input
                type="number"
                min={0}
                max={40}
                step={0.5}
                placeholder={`Wyliczone: ${livePreview.averagedPensum}`}
                value={customPensum}
                onChange={(e) => onChangeCustomPensum(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-slate-50 rounded-lg outline-none font-bold text-slate-800"
              />
              <span className="text-[8.5px] text-slate-400">
                Puste = stosuj wyliczone pensum ({livePreview.averagedPensum}h)
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={dutyExempt}
              onChange={(e) => onChangeDutyExempt(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="text-xs font-black text-rose-800 block">
                🚫 Całkowite zwolnienie z dyżurów międzylekcyjnych
              </span>
              <span className="text-[9.5px] text-slate-500 block">
                Nauczyciel nie będzie uwzględniany w grafikach dyżurów korytarzowych (np. stan zdrowia, specyfika pracy)
              </span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};
