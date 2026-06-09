import React, { useState, useMemo } from 'react';
import { AppState, SchedData, SnapshotEntry } from '../types';
import { 
  Camera, Trash2, Download, Upload, Clock, Bookmark, X, Check, Search, FileText, AlertTriangle 
} from 'lucide-react';
import { downloadFile, formatBytes } from '../utils';

interface SnapshotManagerProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  schedData: SchedData;
  snapshots: SnapshotEntry[];
  onChangeSnapshots: (newSnaps: SnapshotEntry[]) => void;
  onRestoreSnapshot: (restoredAppState: AppState, restoredSchedData: SchedData) => void;
}

export default function SnapshotManager({
  isOpen,
  onClose,
  appState,
  schedData,
  snapshots,
  onChangeSnapshots,
  onRestoreSnapshot
}: SnapshotManagerProps) {
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  // Helper function to count occupied lessons in schedData
  const countLessons = (sData: SchedData): number => {
    let count = 0;
    try {
      Object.values(sData || {}).forEach(yearObj => {
        Object.values(yearObj || {}).forEach(dayObj => {
          Object.values(dayObj || {}).forEach(hourObj => {
            Object.values(hourObj || {}).forEach(colData => {
              if (Array.isArray(colData)) {
                count += colData.filter(cell => cell && (cell.className || (cell.classes && cell.classes.length > 0))).length;
              } else if (colData && (colData.className || (colData.classes && colData.classes.length > 0))) {
                count++;
              }
            });
          });
        });
      });
    } catch (e) {
      console.error(e);
    }
    return count;
  };

  // Filter snapshots by search query
  const filteredSnapshots = useMemo(() => {
    return snapshots
      .filter(s => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          s.name.toLowerCase().includes(query) ||
          (s.comment && s.comment.toLowerCase().includes(query)) ||
          s.appState.yearLabel.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [snapshots, searchQuery]);

  // Handle creating a new snapshot
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    
    const timestamp = new Date();
    const defaultName = `Kopia robocza — ${timestamp.toLocaleDateString('pl-PL')} o ${timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    const finalName = newSnapshotName.trim() || defaultName;

    const lessonsCount = countLessons(schedData);

    const newSnap: SnapshotEntry = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: finalName,
      createdAt: timestamp.toISOString(),
      appState: JSON.parse(JSON.stringify(appState)),
      schedData: JSON.parse(JSON.stringify(schedData)),
      comment: newComment.trim() || undefined,
      stats: {
        assignedLessonsCount: lessonsCount,
        classesCount: appState.classes?.length || 0,
        teachersCount: appState.teachers?.length || 0
      }
    };

    onChangeSnapshots([newSnap, ...snapshots]);
    setNewSnapshotName('');
    setNewComment('');
    setShowCreateForm(false);
  };

  // Revert/Restore a snapshot
  const handleRestore = (snap: SnapshotEntry) => {
    const formattedDate = new Date(snap.createdAt).toLocaleString('pl-PL');
    if (
      confirm(
        `UWAGA!\n\nCzy na pewno chcesz przywrócić plan do punktu: "${snap.name}"?\n(Zapisany dnia: ${formattedDate})\n\nObecny stan planu zostanie zastąpiony!`
      )
    ) {
      onRestoreSnapshot(snap.appState, snap.schedData);
      onClose();
    }
  };

  // Delete snapshot
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Czy na pewno chcesz bezpowrotnie usunąć punkt przywracania:\n"${name}"?`)) {
      onChangeSnapshots(snapshots.filter(s => s.id !== id));
    }
  };

  // Export static snapshot JSON file
  const handleExportSingle = (snap: SnapshotEntry) => {
    const backup = {
      version: '3.0.0-snapshot',
      snapshot: {
        id: snap.id,
        name: snap.name,
        createdAt: snap.createdAt,
        appState: snap.appState,
        schedData: snap.schedData,
        comment: snap.comment,
        stats: snap.stats
      }
    };
    const safeName = snap.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    downloadFile(
      JSON.stringify(backup, null, 2),
      `saleplan-restore-point-${safeName}.json`,
      'application/json'
    );
  };

  // Import snapshot JSON file
  const handleImportSingle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawData = JSON.parse(evt.target?.result as string);
        
        let targetSnap: any = null;
        if (rawData.version === '3.0.0-snapshot' && rawData.snapshot) {
          targetSnap = rawData.snapshot;
        } else if (rawData.appState && rawData.schedData) {
          // Standard full backup can also be imported as a snapshot
          targetSnap = {
            id: `snap-imported-${Date.now()}`,
            name: file.name.replace('.json', '') || 'Zaimportowana kopia',
            createdAt: rawData.timestamp || new Date().toISOString(),
            appState: rawData.appState,
            schedData: rawData.schedData,
            comment: 'Zaimportowano z pliku zewnętrznego kopii zapasowej.',
            stats: {
              assignedLessonsCount: countLessons(rawData.schedData),
              classesCount: rawData.appState.classes?.length || 0,
              teachersCount: rawData.appState.teachers?.length || 0
            }
          };
        }

        if (targetSnap && targetSnap.appState && targetSnap.schedData) {
          // Generate new ID to prevent overlaps
          targetSnap.id = `snap-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          onChangeSnapshots([targetSnap, ...snapshots]);
          alert(`Pomyślnie zaimportowano punkt przywracania: "${targetSnap.name}"`);
        } else {
          alert('Błędny lub nieobsługiwany format pliku punktu przywracania.');
        }
      } catch (err) {
        alert('Wystąpił błąd podczas dekodowania i odczytu pliku kopii.');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Calculate approximate snapshots memory impact
  const approximateSize = useMemo(() => {
    return JSON.stringify(snapshots).length;
  }, [snapshots]);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden leading-normal text-slate-800"
        id="snapshot-manager-dialog"
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-violet-400" />
            <div>
              <h2 className="font-extrabold text-sm md:text-base tracking-tight text-white leading-none">
                Punkty przywracania (Snapshots)
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Zarządzaj lokalnymi migawkami całego harmonogramu lekcji, sal i ustawień szkoły
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-lg transition-transform hover:scale-105 cursor-pointer border-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info panel */}
        <div className="bg-amber-50/75 border-b border-amber-100 p-3 px-5 text-[10.5px] leading-relaxed text-amber-900 flex items-start gap-2.5 select-none shrink-0">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            Punkty przywracania to szybkie, bezpieczne <strong>migawki stanu roboczego</strong>. Zachowują one dokładną postać całego planu (lekcji, podziału sal i dyżurów) w danym momencie. Używaj ich jako ubezpieczenia przed eksperymentami, masowym czyszczeniem lub wprowadzaniem trudnych zmian w siatce godzin!
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 custom-scrollbar min-h-0 bg-slate-50/50">
          
          {/* Create Button & Search Line */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs select-none shrink-0">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Szukaj punktu przywracania..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-medium"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label 
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none"
                title="Wczytaj punkt przywracania z pliku .json"
              >
                <Upload size={13} className="text-blue-600" />
                <span>Zaimportuj</span>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportSingle} 
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  if (!showCreateForm) {
                    const timestamp = new Date();
                    setNewSnapshotName(`Kopia robocza — ${timestamp.toLocaleDateString('pl-PL')} ${timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`);
                  }
                }}
                className="px-4.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer border-none"
              >
                <Camera size={13} className="animate-bounce" />
                Utwórz punkt
              </button>
            </div>
          </div>

          {/* Form to Create New Snapshot */}
          {showCreateForm && (
            <div className="bg-white border border-violet-200/80 rounded-xl p-4 shadow-sm space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-250">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={13} />
                  Nowy punkt przywracania
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                >
                  Anuluj
                </button>
              </div>

              <form onSubmit={handleCreateSnapshot} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Nazwa własna punktu przywracania
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Wprowadź czytelną nazwę, np. Przed zmianami na wtorek"
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Opis / Komentarz (Opcjonalnie)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Wpisz np. jakie zmiany planujesz przetestować, dlaczego robisz te kopie planu lekcji"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none font-medium text-slate-650"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-lg text-xs font-extrabold shadow-sm transition cursor-pointer border-none"
                  >
                    Zapisz ten stan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Snapshots */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider select-none">
              Zapisane punkty przywracania ({filteredSnapshots.length})
            </span>

            {filteredSnapshots.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredSnapshots.map((snap) => {
                  const stamp = new Date(snap.createdAt);
                  return (
                    <div 
                      key={snap.id} 
                      className="bg-white border border-slate-200 hover:border-violet-200 hover:shadow-xs p-3.5 rounded-xl transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 group-hover:text-violet-900 transition-colors">
                            {snap.name}
                          </span>
                          <span className="bg-slate-100 text-slate-600 border border-slate-200/60 font-black px-1.5 py-0.5 rounded text-[8px] uppercase font-mono tracking-wider">
                            {snap.appState?.yearLabel || 'Plan'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[10px] text-slate-450 font-semibold select-none">
                          <span className="flex items-center gap-0.5 whitespace-nowrap">
                            <Clock size={11} className="text-slate-400" />
                            {stamp.toLocaleDateString('pl-PL')} {stamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          
                          {snap.stats && (
                            <>
                              <span className="text-slate-250 font-black">|</span>
                              <span className="text-indigo-600 block">
                                📅 lekcje: <strong>{snap.stats.assignedLessonsCount}</strong>
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className="text-slate-500">
                                klasy: <strong>{snap.stats.classesCount}</strong>
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className="text-slate-500">
                                naucz.: <strong>{snap.stats.teachersCount}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        {snap.comment && (
                          <div className="text-[10.5px] text-slate-500 bg-slate-50 border border-slate-100/70 p-2 rounded-lg mt-1 pr-4 max-w-lg leading-relaxed leading-normal font-medium flex items-start gap-1">
                            <Bookmark size={11} className="text-violet-400 mt-0.5 shrink-0" />
                            <span className="italic">{snap.comment}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestore(snap)}
                          className="px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 hover:text-violet-950 border border-violet-150 hover:border-violet-300 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1"
                          title="Przywróć cały harmonogram i ustawienia szkoły z tego punktu"
                        >
                          <Check size={11} className="stroke-[3]" />
                          <span>Przywróć</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleExportSingle(snap)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Wyeksportuj ten pojedynczy punkt do pliku .json"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(snap.id, snap.name)}
                          className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-550/10 rounded-lg transition cursor-pointer"
                          title="Usuń bezpowrotnie ten punkt"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 select-none">
                <Clock size={20} className="mx-auto text-slate-300 mb-2" />
                {searchQuery ? (
                  <span>Brak punktów przywracania pasujących do frazy "{searchQuery}"</span>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-500">Brak zapisanych punktów przywracania.</p>
                    <p className="text-[10px] text-slate-405 leading-relaxed font-semibold">Kliknij niebieski przycisk "Utwórz punkt" po prawej stronie, aby zapisać obecny stan planu.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center sm:justify-between gap-3 select-none text-[10.5px] font-semibold text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span>Zajętość pamięci punktów:</span>
            <strong className="text-slate-700 font-mono font-black">{formatBytes(approximateSize)}</strong>
            <span>miejsca w przeglądarce.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 shadow-3xs cursor-pointer transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
