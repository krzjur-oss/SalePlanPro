import React, { useState } from 'react';
import { AppState, MiejsceDyzuru } from '../../types';
import { uid } from '../../utils';
import { Shield, Edit3, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

export interface KreatorStepCorridorsProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  setActiveStep: (step: number) => void;
  showNoti: (text: string, type?: 'info' | 'success') => void;
}

export const KreatorStepCorridors: React.FC<KreatorStepCorridorsProps> = ({
  appState,
  onChangeAppState,
  setActiveStep,
  showNoti
}) => {
  const [newCorridorName, setNewCorridorName] = useState('');
  const [newCorridorFloor, setNewCorridorFloor] = useState('');
  const [newCorridorDesc, setNewCorridorDesc] = useState('');
  const [newCorridorCount, setNewCorridorCount] = useState<number | ''>(1);
  const [newCorridorConnectedRooms, setNewCorridorConnectedRooms] = useState<string[]>([]);
  const [editingCorridorId, setEditingCorridorId] = useState<string | null>(null);

  const handleStartEditCorridor = (place: MiejsceDyzuru) => {
    setEditingCorridorId(place.id);
    setNewCorridorName(place.name);
    setNewCorridorFloor(place.floor || '');
    setNewCorridorDesc(place.desc || '');
    setNewCorridorCount(place.teachersNeeded || 1);
    setNewCorridorConnectedRooms(place.connectedRooms || []);
  };

  const handleCancelEditCorridor = () => {
    setEditingCorridorId(null);
    setNewCorridorName('');
    setNewCorridorFloor('');
    setNewCorridorDesc('');
    setNewCorridorCount(1);
    setNewCorridorConnectedRooms([]);
  };

  const handleAddCorridorDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorridorName.trim()) return;

    if (editingCorridorId) {
      const updatedPlace: MiejsceDyzuru = {
        id: editingCorridorId,
        name: newCorridorName.trim(),
        floor: newCorridorFloor.trim() || undefined,
        desc: newCorridorDesc.trim() || undefined,
        teachersNeeded: newCorridorCount === '' ? 1 : Number(newCorridorCount),
        connectedRooms: newCorridorConnectedRooms
      };

      onChangeAppState({
        ...appState,
        dyzury: {
          ...appState.dyzury,
          miejsca: appState.dyzury.miejsca.map(m => m.id === editingCorridorId ? updatedPlace : m)
        }
      });

      handleCancelEditCorridor();
      showNoti(`Zaktualizowano punkt korytarzowy: ${updatedPlace.name}`);
    } else {
      const newPlace: MiejsceDyzuru = {
        id: 'm_' + uid(),
        name: newCorridorName.trim(),
        floor: newCorridorFloor.trim() || undefined,
        desc: newCorridorDesc.trim() || undefined,
        teachersNeeded: newCorridorCount === '' ? 1 : Number(newCorridorCount),
        connectedRooms: newCorridorConnectedRooms
      };

      onChangeAppState({
        ...appState,
        dyzury: {
          ...appState.dyzury,
          miejsca: [...appState.dyzury.miejsca, newPlace]
        }
      });

      setNewCorridorName('');
      setNewCorridorFloor('');
      setNewCorridorDesc('');
      setNewCorridorCount(1);
      setNewCorridorConnectedRooms([]);
      showNoti(`Dodano punkt korytarzowy: - wymagani dyżurny: ${newPlace.teachersNeeded}`);
    }
  };

  const handleRemoveCorridor = (id: string) => {
    onChangeAppState({
      ...appState,
      dyzury: {
        ...appState.dyzury,
        miejsca: appState.dyzury.miejsca.filter(m => m.id !== id)
      }
    });
    if (editingCorridorId === id) {
      handleCancelEditCorridor();
    }
    showNoti('Punkt korytarzowy został usunięty');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 7</span>
        <h2 className="text-xl font-black text-slate-900 mt-2">🚪 Dyżury korytarzowe</h2>
        <p className="text-xs text-slate-500 mt-1">Stwórz punkty dyżurów korytarzowych/schodowych ze szczegółowym określeniem ilu nauczycieli powinno jednocześnie pilnować porządku na danej przerwie.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Addition Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
          <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">
            {editingCorridorId ? '✏️ Edytuj punkt dyżurów' : 'Dodaj punkt dyżurów'}
          </h3>
          <form onSubmit={handleAddCorridorDuty} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Lokalizacja / Schody / Plac *</label>
              <input 
                type="text" 
                required
                placeholder="np. Korytarz parter - przy szatni"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                value={newCorridorName}
                onChange={(e) => setNewCorridorName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Piętro (opcjonalnie)</label>
                <input 
                  type="text" 
                  placeholder="np. Parter"
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                  value={newCorridorFloor}
                  onChange={(e) => setNewCorridorFloor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Dyżurantów (Wymagani)</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  max={4}
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold text-blue-600"
                  value={newCorridorCount}
                  onChange={(e) => setNewCorridorCount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Krótki opis / Zadania</label>
              <input 
                type="text" 
                placeholder="np. Nadzór szafek i wyjścia głównego"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                value={newCorridorDesc}
                onChange={(e) => setNewCorridorDesc(e.target.value)}
              />
            </div>

            {/* Checkbox pills for connecting classrooms */}
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              <label className="text-[10px] text-slate-500 font-bold block">🚪 Sale z wejściem na ten korytarz:</label>
              {appState.planLekcji.rooms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  {appState.planLekcji.rooms.map(rm => {
                    const isSel = newCorridorConnectedRooms.includes(rm.name);
                    return (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => {
                          if (isSel) {
                            setNewCorridorConnectedRooms(newCorridorConnectedRooms.filter(x => x !== rm.name));
                          } else {
                            setNewCorridorConnectedRooms([...newCorridorConnectedRooms, rm.name]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition duration-150 shrink-0 ${
                          isSel
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {rm.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Brak zdefiniowanych sal. Dodaj je najpierw w Kroku 3.</p>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition">
                {editingCorridorId ? 'Zapisz zmiany' : 'Dodaj punkt dyżuru'}
              </button>
              {editingCorridorId && (
                <button 
                  type="button" 
                  onClick={handleCancelEditCorridor}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition"
                >
                  Anuluj
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Summary corridors rendering */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Planowane punkty dozorowania porządku</h3>
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.dyzury.miejsca.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {appState.dyzury.miejsca.map(place => (
              <div key={place.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50 w-full min-w-0 gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Shield size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 leading-none block truncate" title={place.name}>{place.name}</span>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {place.floor && <span className="text-[10px] text-slate-400 font-semibold shrink-0">{place.floor}</span>}
                      <span className="bg-indigo-100 text-indigo-800 font-black px-1.5 py-0.2 rounded text-[9px] uppercase shrink-0">
                        Potrzeba: {place.teachersNeeded || 1} {place.teachersNeeded === 1 ? 'nauczyciel' : 'nauczycieli'}
                      </span>
                    </div>
                    {place.desc && <p className="text-[10px] text-slate-400 font-semibold mt-1 break-words">{place.desc}</p>}
                    
                    {/* Connected classroom badges */}
                    {place.connectedRooms && place.connectedRooms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Przyległe sale:</span>
                        {place.connectedRooms.map(rm => (
                          <span key={rm} className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-mono font-bold animate-fade-in shrink-0">
                            🚪 {rm}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => handleStartEditCorridor(place)}
                    className={`p-1 px-2 rounded transition-colors ${
                      editingCorridorId === place.id 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                    }`}
                    title="Edytuj"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleRemoveCorridor(place.id)}
                    className="p-1 px-2 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors"
                    title="Usuń"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {appState.dyzury.miejsca.length === 0 && (
              <p className="p-10 text-center text-xs text-slate-400">Brak punktów nadzoru.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={() => setActiveStep(6)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
          <ArrowLeft size={14} /> Wstecz
        </button>
        <button onClick={() => setActiveStep(8)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
          Dalej: Uczniowie i wsparcie <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
