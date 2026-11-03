import React, { useState } from 'react';
import { AppState, Subject } from '../../types';
import { uid, subjectAbbr } from '../../utils';
import { Z_INDEX_CLASSES } from '../../styles/zIndex';
import { PALETTE_COLORS, SCHOOL_TYPES_DICTIONARIES } from './constants';
import { BookOpen, Edit3, Trash2, ArrowLeft, ArrowRight, X } from 'lucide-react';

export interface KreatorStepSubjectsProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  setActiveStep: (step: number) => void;
  showNoti: (text: string, type?: 'info' | 'success') => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const KreatorStepSubjects: React.FC<KreatorStepSubjectsProps> = ({
  appState,
  onChangeAppState,
  setActiveStep,
  showNoti,
  triggerConfirm
}) => {
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjShort, setNewSubjShort] = useState('');
  const [isSubjShortManual, setIsSubjShortManual] = useState(false);
  const [newSubjColor, setNewSubjColor] = useState(() => PALETTE_COLORS[appState.subjects?.length % PALETTE_COLORS.length] || '#16a34a');
  const [newSubjPattern, setNewSubjPattern] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  // Subject Dictionary states
  const [selectedDictKey, setSelectedDictKey] = useState<string | null>(null);
  const [dictSubjsSelected, setDictSubjsSelected] = useState<Record<string, boolean>>({});

  const handleOpenDictionary = (key: string) => {
    setSelectedDictKey(key);
    const dict = SCHOOL_TYPES_DICTIONARIES[key];
    if (dict) {
      const initialSelected: Record<string, boolean> = {};
      const existingShorts = new Set(appState.subjects.map(s => s.short.toUpperCase()));
      dict.subjects.forEach(s => {
        initialSelected[s.short] = !existingShorts.has(s.short.toUpperCase());
      });
      setDictSubjsSelected(initialSelected);
    }
  };

  const handleImportSelectedSubjects = () => {
    if (!selectedDictKey) return;
    const dict = SCHOOL_TYPES_DICTIONARIES[selectedDictKey];
    if (!dict) return;

    const toImport = dict.subjects.filter(s => dictSubjsSelected[s.short]);
    if (toImport.length === 0) {
      showNoti('Nie wybrano żadnych przedmiotów do zaimportowania.', 'info');
      return;
    }

    const existingShorts = new Set(appState.subjects.map(s => s.short.toUpperCase()));
    let importCount = 0;
    const newSubjects: Subject[] = [...appState.subjects];

    toImport.forEach(s => {
      if (!existingShorts.has(s.short.toUpperCase())) {
        newSubjects.push({
          id: 'sub_' + uid(),
          name: s.name,
          short: s.short.toUpperCase(),
          color: s.color,
          defaultGroupPattern: s.defaultGroupPattern
        });
        importCount++;
      }
    });

    if (importCount > 0) {
      onChangeAppState({
        ...appState,
        subjects: newSubjects,
        planLekcji: {
          ...appState.planLekcji,
          subjects: newSubjects
        }
      });
      showNoti(`Pomyślnie zaimportowano ${importCount} przedmiotów ze słownika!`, 'success');
    } else {
      showNoti('Wszystkie wybrane przedmioty już istnieją w Twojej bazie.', 'info');
    }

    setSelectedDictKey(null);
    setDictSubjsSelected({});
  };

  const handleStartEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setNewSubjName(sub.name);
    setNewSubjShort(sub.short);
    setIsSubjShortManual(true);
    setNewSubjColor(sub.color);
    setNewSubjPattern(sub.defaultGroupPattern || '');
  };

  const handleCancelEditSubject = () => {
    setEditingSubjectId(null);
    setNewSubjName('');
    setNewSubjShort('');
    setIsSubjShortManual(false);
    setNewSubjPattern('');
    const nextColor = PALETTE_COLORS[appState.subjects.length % PALETTE_COLORS.length] || '#16a34a';
    setNewSubjColor(nextColor);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim() || !newSubjShort.trim()) return;

    if (editingSubjectId) {
      const nextSubjs = appState.subjects.map(s => {
        if (s.id === editingSubjectId) {
          return {
            ...s,
            name: newSubjName.trim(),
            short: newSubjShort.trim().toUpperCase(),
            color: newSubjColor,
            defaultGroupPattern: newSubjPattern.trim() || undefined
          };
        }
        return s;
      });

      onChangeAppState({
        ...appState,
        subjects: nextSubjs,
        planLekcji: {
          ...appState.planLekcji,
          subjects: nextSubjs
        }
      });

      handleCancelEditSubject();
      showNoti('Zaktualizowano dane przedmiotu');
    } else {
      const newSubj: Subject = {
        id: 'sub_' + uid(),
        name: newSubjName.trim(),
        short: newSubjShort.trim().toUpperCase(),
        color: newSubjColor,
        defaultGroupPattern: newSubjPattern.trim() || undefined
      };

      const nextSubjs = [...appState.subjects, newSubj];

      onChangeAppState({
        ...appState,
        subjects: nextSubjs,
        planLekcji: {
          ...appState.planLekcji,
          subjects: nextSubjs
        }
      });

      setNewSubjName('');
      setNewSubjShort('');
      setIsSubjShortManual(false);
      setNewSubjPattern('');
      const nextColor = PALETTE_COLORS[nextSubjs.length % PALETTE_COLORS.length] || '#16a34a';
      setNewSubjColor(nextColor);
      showNoti(`Dodano przedmiot: ${newSubj.name}`);
    }
  };

  const handleRemoveSubject = (id: string) => {
    triggerConfirm(
      'Usuwanie przedmiotu',
      'Czy chcesz usunąć ten przedmiot z bazy? Usunie to również lekcje z tym przedmiotem.',
      () => {
        const nextSubjs = appState.subjects.filter(s => s.id !== id);

        onChangeAppState({
          ...appState,
          subjects: nextSubjs,
          planLekcji: {
            ...appState.planLekcji,
            subjects: nextSubjs,
            assignments: appState.planLekcji.assignments.filter(a => a.subjectId !== id)
          }
        });
        if (editingSubjectId === id) {
          handleCancelEditSubject();
        }
        showNoti('Przedmiot został usunięty');
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 5</span>
        <h2 className="text-xl font-black text-slate-900 mt-2">📚 Przedmioty szkolne i edukacyjne</h2>
        <p className="text-xs text-slate-500 mt-1">Uporządkuj listę prowadzonych lekcji przedmiotowych i przydziel im kolory do wizualizacji na planach.</p>
      </div>

      {/* SŁOWNIKI PRZEDMIOTÓW (RODZAJE SZKÓŁ) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-blue-600 text-white p-1 rounded-md">
            <BookOpen size={16} />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">⚡ Słownik Przedmiotów • Szybki import dla rodzaju szkoły</h4>
            <p className="text-[10px] text-slate-500 font-semibold">Wybierz rodzaj szkoły, aby otworzyć gotowy słownik przedmiotów i błyskawicznie je dodać.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(SCHOOL_TYPES_DICTIONARIES).map(([key, dict]) => (
            <button
              key={key}
              onClick={() => handleOpenDictionary(key)}
              type="button"
              className="flex flex-col items-center justify-center p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl transition cursor-pointer text-center group shadow-xs"
            >
              <span className="text-2xl mb-1.5 group-hover:scale-110 transition duration-150">{dict.icon}</span>
              <span className="text-xs font-black text-slate-900 leading-tight block">{dict.name}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{dict.subjects.length} przedmiotów</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form column */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
          <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">
            {editingSubjectId ? '📝 Edytuj Przedmiot' : '➕ Dodaj Przedmiot'}
          </h3>
          <form onSubmit={handleAddSubject} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Pełna nazwa przedmiotu *</label>
              <input 
                type="text" 
                required
                placeholder="np. Język niemiecki"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                value={newSubjName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewSubjName(val);
                  if (!isSubjShortManual) {
                    setNewSubjShort(subjectAbbr(val));
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">Skrót tablicowy (maks. 5 znaków) *</label>
              <input 
                type="text" 
                required
                maxLength={5}
                placeholder="np. NIEM"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold"
                value={newSubjShort}
                onChange={(e) => {
                  setNewSubjShort(e.target.value);
                  setIsSubjShortManual(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Słowo kluczowe podgrupy (opcjonalne)</label>
              <input 
                type="text" 
                placeholder="np. religia, ang, niem, wf"
                className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold text-indigo-600 placeholder-slate-300"
                value={newSubjPattern}
                onChange={(e) => setNewSubjPattern(e.target.value)}
              />
              <p className="text-[9px] text-slate-400 leading-normal pt-1">
                Służy do automatycznego przypisywania podgrupy klasy (np. wpisanie <strong>religia</strong> sprawi, że zajęcia z religii domyślnie trafią do podgrupy "religia" w danej klasie).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block mb-1.5">Kolor kafelka przedmiotu (Wybierz spośród 60 kolorów)</label>
              <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto p-1.5 border border-slate-200 bg-slate-50 rounded-lg">
                {PALETTE_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewSubjColor(c)}
                    className={`w-5 h-5 rounded border shrink-0 transition ${
                      newSubjColor === c ? 'ring-2 ring-blue-500 scale-110 shadow-sm' : 'border-slate-200 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="submit" 
                className={`grow py-2 text-white font-bold text-xs rounded-lg shadow mt-2 transition cursor-pointer ${
                  editingSubjectId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editingSubjectId ? 'Zaktualizuj dane' : 'Zarejestruj przedmiot'}
              </button>
              {editingSubjectId && (
                <button 
                  type="button" 
                  onClick={handleCancelEditSubject}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg mt-2 cursor-pointer transition"
                >
                  Anuluj
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Databases list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Planowany kanon przedmiotowy</h3>
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.subjects.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {appState.subjects.map((sub) => (
              <div key={sub.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50 w-full min-w-0 gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-9 h-9 text-white font-mono font-black text-[10px] rounded-lg tracking-wider flex items-center justify-center border shadow-sm shrink-0" style={{ backgroundColor: sub.color || '#cbd5e1' }}>
                    {sub.short}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900 leading-none truncate" title={sub.name}>{sub.name}</span>
                      {sub.defaultGroupPattern && (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                          Grupa: {sub.defaultGroupPattern}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">Identyfikator planowy: {sub.id}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={() => handleStartEditSubject(sub)}
                    className="p-1 px-2 text-slate-400 hover:text-indigo-600 rounded select-none cursor-pointer"
                    title="Edytuj przedmiot"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button 
                    onClick={() => handleRemoveSubject(sub.id)}
                    className="p-1 px-2 text-slate-400 hover:text-red-500 rounded select-none cursor-pointer"
                    title="Usuń przedmiot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {appState.subjects.length === 0 && (
              <p className="p-10 text-center text-xs text-slate-400">Brak przedmiotów lekcyjnych.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={() => setActiveStep(4)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
          <ArrowLeft size={14} /> Wstecz
        </button>
        <button onClick={() => setActiveStep(6)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
          Dalej: Nauczyciele <ArrowRight size={14} />
        </button>
      </div>

      {/* Słownik Przedmiotów - Podgląd i wybór przedmiotów modal */}
      {selectedDictKey && (() => {
        const dict = SCHOOL_TYPES_DICTIONARIES[selectedDictKey];
        if (!dict) return null;
        
        const existingShorts = new Set(appState.subjects.map(s => s.short.toUpperCase()));
        const subjectsList = dict.subjects;

        return (
          <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 ${Z_INDEX_CLASSES.MODAL} no-print`}>
            <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dict.icon}</span>
                  <div className="text-left">
                    <span className="text-[9px] text-blue-400 block uppercase font-black tracking-wider">Kanon przedmiotów</span>
                    <h3 className="text-base font-black uppercase text-white leading-tight">
                      Słownik: {dict.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDictKey(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
                <p className="text-xs text-slate-500 leading-normal font-medium text-left">
                  Zaznacz przedmioty ze słownika, które chcesz zaimportować do swojej szkoły. Przedmioty już istniejące w Twojej konfiguracji (z tym samym skrótem) są automatycznie ignorowane.
                </p>

                {/* Selection helpers */}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected: Record<string, boolean> = {};
                      subjectsList.forEach(s => {
                        allSelected[s.short] = true;
                      });
                      setDictSubjsSelected(allSelected);
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                  >
                    Zaznacz wszystkie
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDictSubjsSelected({});
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-600 uppercase"
                  >
                    Odznacz wszystkie
                  </button>
                </div>

                {/* Grid checklist */}
                <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {subjectsList.map((s, idx) => {
                    const exists = existingShorts.has(s.short.toUpperCase());
                    const isSelected = !!dictSubjsSelected[s.short];
                    return (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-3 cursor-pointer transition select-none ${
                          exists ? 'bg-slate-50 opacity-60' : isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={exists}
                            checked={isSelected && !exists}
                            onChange={(e) => {
                              setDictSubjsSelected(prev => ({
                                ...prev,
                                [s.short]: e.target.checked
                              }));
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span
                            className="w-8 h-8 text-white font-mono font-black text-[9px] rounded-lg tracking-wider flex items-center justify-center border shadow-xs"
                            style={{ backgroundColor: s.color }}
                          >
                            {s.short}
                          </span>
                          <div className="text-left">
                            <span className="text-xs font-black text-slate-900 block leading-tight">{s.name}</span>
                            {s.defaultGroupPattern && (
                              <span className="inline-block bg-indigo-50 text-indigo-700 text-[8px] font-black px-1 py-0 rounded uppercase mt-0.5 tracking-wide">
                                Podgrupa: {s.defaultGroupPattern}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {exists ? (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Już dodany
                            </span>
                          ) : (
                            <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                              {isSelected ? 'Wybrany' : 'Pomiń'}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDictKey(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleImportSelectedSubjects}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <BookOpen size={14} />
                  Zaimportuj wybrane przedmioty ({subjectsList.filter(s => dictSubjsSelected[s.short] && !existingShorts.has(s.short.toUpperCase())).length})
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
