import React, { useState } from 'react';
import { AppState, Building } from '../../types';
import { uid } from '../../utils';
import { Landmark, Edit3, Trash2, Plus, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

export interface KreatorStepBuildingsProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  setActiveStep: (step: number) => void;
  showNoti: (text: string, type?: 'info' | 'success') => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const KreatorStepBuildings: React.FC<KreatorStepBuildingsProps> = ({
  appState,
  onChangeAppState,
  setActiveStep,
  showNoti,
  triggerConfirm
}) => {
  const [editingBldId, setEditingBldId] = useState<string | null>(null);
  const [newBldName, setNewBldName] = useState('');
  const [newBldAddress, setNewBldAddress] = useState('');
  const [newBldIsZlecony, setNewBldIsZlecony] = useState(false);
  const [newBldSingleClassLimit, setNewBldSingleClassLimit] = useState(false);
  const [newBldHasCustomStructure, setNewBldHasCustomStructure] = useState(false);
  const [newBldCustomFloors, setNewBldCustomFloors] = useState('');
  const [newBldCustomSegments, setNewBldCustomSegments] = useState('');

  const resetForm = () => {
    setEditingBldId(null);
    setNewBldName('');
    setNewBldAddress('');
    setNewBldIsZlecony(false);
    setNewBldSingleClassLimit(false);
    setNewBldHasCustomStructure(false);
    setNewBldCustomFloors('');
    setNewBldCustomSegments('');
  };

  const handleAddBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBldName.trim()) return;

    const parsedFloors = newBldHasCustomStructure 
      ? newBldCustomFloors.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const parsedSegments = newBldHasCustomStructure 
      ? newBldCustomSegments.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (editingBldId) {
      // Edit Mode
      const nextBlds = appState.buildings.map(b => {
        if (b.id === editingBldId) {
          return {
            ...b,
            name: newBldName.trim(),
            address: newBldAddress.trim() || undefined,
            multi: newBldIsZlecony,
            singleClassLimit: newBldSingleClassLimit,
            hasCustomStructure: newBldHasCustomStructure,
            customFloors: parsedFloors.length > 0 ? parsedFloors : undefined,
            customSegments: parsedSegments.length > 0 ? parsedSegments : undefined
          };
        }
        return b;
      });

      // Aktualizacja nazwy piętra dla zachowania zgodności
      const bldIdx = appState.buildings.findIndex(b => b.id === editingBldId);
      const nextFloors = appState.floors.map(f => {
        if (f.buildingIdx === bldIdx && f.id === 'f_bld_' + editingBldId) {
          return {
            ...f,
            name: 'Budynek: ' + newBldName.trim(),
            color: newBldIsZlecony ? '#f43f5e' : '#2563eb'
          };
        }
        return f;
      });

      onChangeAppState({
        ...appState,
        buildings: nextBlds,
        floors: nextFloors
      });

      resetForm();
      showNoti('Dane budynku zostały zaktualizowane pomyślnie');
    } else {
      // Add Mode
      const newBld: Building = {
        id: 'bld_' + uid(),
        name: newBldName.trim(),
        address: newBldAddress.trim() || undefined,
        multi: newBldIsZlecony,
        singleClassLimit: newBldSingleClassLimit,
        hasCustomStructure: newBldHasCustomStructure,
        customFloors: parsedFloors.length > 0 ? parsedFloors : undefined,
        customSegments: parsedSegments.length > 0 ? parsedSegments : undefined
      };

      const nextBlds = [...appState.buildings, newBld];

      // Create a matching Floor in floors list so we can layout columns in Plan Sal step
      const nextFloors = [...appState.floors];
      const bldIdx = nextBlds.length - 1;

      if (!newBldHasCustomStructure) {
        nextFloors.push({
          id: 'f_bld_' + newBld.id,
          name: 'Budynek: ' + newBld.name,
          color: newBldIsZlecony ? '#f43f5e' : '#2563eb',
          buildingIdx: bldIdx,
          segments: [
            {
              id: 'seg_bld_' + newBld.id,
              name: 'Strefa Ogólna',
              rooms: []
            }
          ]
        });
      }

      onChangeAppState({
        ...appState,
        buildings: nextBlds,
        floors: nextFloors
      });

      resetForm();
      showNoti('Dodano budynek i powiązano z siatką sal');
    }
  };

  const handleRemoveBuilding = (id: string, idx: number) => {
    if (appState.buildings.length <= 1) {
      showNoti('Szkoła musi posiadać przynajmniej jeden budynek.', 'info');
      return;
    }
    
    triggerConfirm(
      'Usuwanie budynku',
      'Czy na pewno chcesz usunąć ten budynek? Usunie to również przypisane piętra i sale.',
      () => {
        const nextBlds = appState.buildings.filter(b => b.id !== id);
        const nextFloors = appState.floors
          .filter(f => f.buildingIdx !== idx)
          .map(f => {
            if (f.buildingIdx > idx) {
              return { ...f, buildingIdx: f.buildingIdx - 1 };
            }
            return f;
          });

        onChangeAppState({
          ...appState,
          buildings: nextBlds,
          floors: nextFloors
        });
        showNoti('Usunięto budynek');
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 2</span>
        <h2 className="text-xl font-black text-slate-900 mt-2">🏢 Budynki i Lokacje zewnętrzne</h2>
        <p className="text-xs text-slate-500 mt-1">Szkoła może posiadać własny budynek główny oraz zewnętrzne lokacje zlecone (hala, basen, orlik).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add building form */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 h-fit">
          <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Dodaj budynek</h3>
          <form onSubmit={handleAddBuilding} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Pełna nazwa budynku</label>
              <input 
                type="text" 
                required
                placeholder="np. Hala Sportowa OSIR"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                value={newBldName}
                onChange={(e) => setNewBldName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Adres lokacji</label>
              <input 
                type="text" 
                placeholder="np. ul. Lipowa 4, Gdynia"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                value={newBldAddress}
                onChange={(e) => setNewBldAddress(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input 
                type="checkbox" 
                id="outerLoc" 
                checked={newBldIsZlecony}
                onChange={(e) => setNewBldIsZlecony(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <label htmlFor="outerLoc" className="text-slate-600 text-xs font-bold leading-none cursor-pointer">
                Zlecona zewnętrzna / sportowa (hala, basen itp.)
              </label>
            </div>

            {newBldIsZlecony && (
              <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="bldSingleClassLimit" 
                    checked={newBldSingleClassLimit}
                    onChange={(e) => setNewBldSingleClassLimit(e.target.checked)}
                    className="rounded accent-amber-600"
                  />
                  <label htmlFor="bldSingleClassLimit" className="text-amber-900 text-xs font-bold leading-none cursor-pointer">
                    Rygorystyczny limit klas (maks. 1 klasa jednocześnie)
                  </label>
                </div>
                <p className="text-[10px] text-amber-700 font-medium pl-5">
                  Gdy zaznaczone, system zgłosi konflikt przy próbie zaplanowania więcej niż 1 klasy w tym samym czasie. Jeśli odznaczone (np. duże boisko/orlik), wiele klas może ćwiczyć równolegle.
                </p>
              </div>
            )}

            {/* Optional custom structure division in Step 2 */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-105">
              <input 
                type="checkbox" 
                id="customStructure" 
                checked={newBldHasCustomStructure}
                onChange={(e) => setNewBldHasCustomStructure(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <label htmlFor="customStructure" className="text-slate-600 text-xs font-bold leading-none cursor-pointer">
                Zdefiniuj własne piętra i segmenty
              </label>
            </div>

            {newBldHasCustomStructure && (
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase">Piętra budynku (oddziel przecinkami)</label>
                  <input 
                    type="text" 
                    required={newBldHasCustomStructure}
                    placeholder="np. Parter, Piętro I, Piętro II"
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none"
                    value={newBldCustomFloors}
                    onChange={(e) => setNewBldCustomFloors(e.target.value)}
                  />
                  <p className="text-[8px] text-slate-400 font-bold">np: Parter, Piętro I, Piętro II</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase">Segmenty (oddziel przecinkami)</label>
                  <input 
                    type="text" 
                    placeholder="np. A, B, C"
                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none"
                    value={newBldCustomSegments}
                    onChange={(e) => setNewBldCustomSegments(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-1.5 transition">
                {editingBldId ? <RefreshCw size={14} /> : <Plus size={14} />} {editingBldId ? 'Zapisz zmiany' : 'Dodaj lokację'}
              </button>
              {editingBldId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Anuluj
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Building list database view */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Lista zdefiniowanych budynków</h3>
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.buildings.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
            {appState.buildings.map((b, idx) => (
              <div key={b.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${b.multi ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Landmark size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-950">{b.name}</span>
                      {b.multi ? (
                        <span className="bg-amber-100 border border-amber-200 text-amber-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Zlecony / Obiekt sportowy</span>
                      ) : (
                        <span className="bg-blue-100 border border-blue-200 text-blue-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Własny</span>
                      )}
                      {b.multi && (
                        b.singleClassLimit ? (
                          <span className="bg-rose-100 border border-rose-200 text-rose-700 font-bold px-1.5 py-0.5 rounded text-[9px]">Limit: 1 klasa</span>
                        ) : (
                          <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[9px]">Bez limitu klas</span>
                        )
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{b.address || 'Brak sprecyzowanego adresu'}</p>
                    
                    {/* Render custom building properties if they exist */}
                    {b.hasCustomStructure && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {b.customFloors && b.customFloors.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-100 border border-slate-150 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-500 leading-none">
                            <span>🏢 Piętra:</span>
                            <span className="font-extrabold text-slate-700">{b.customFloors.join(', ')}</span>
                          </div>
                        )}
                        {b.customSegments && b.customSegments.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-100 border border-slate-150 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-500 leading-none">
                            <span>🧩 Segmenty:</span>
                            <span className="font-extrabold text-slate-700">{b.customSegments.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingBldId(b.id);
                      setNewBldName(b.name);
                      setNewBldAddress(b.address || '');
                      setNewBldIsZlecony(!!b.multi);
                      setNewBldSingleClassLimit(!!b.singleClassLimit);
                      setNewBldHasCustomStructure(!!b.hasCustomStructure);
                      setNewBldCustomFloors(b.customFloors ? b.customFloors.join(', ') : '');
                      setNewBldCustomSegments(b.customSegments ? b.customSegments.join(', ') : '');
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-500 rounded transition-colors"
                    title="Edytuj"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleRemoveBuilding(b.id, idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                    title="Usuń"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {appState.buildings.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">Brak budynków. Dodaj pierwszy powyżej!</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={() => setActiveStep(1)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
          <ArrowLeft size={14} /> Wstecz
        </button>
        <button onClick={() => setActiveStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
          Dalej: Pracownie i sale <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
