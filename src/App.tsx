import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppState, SchedData, ArchiveEntry, SchedCell, Assignment, Teacher, Subject, ClassRoom
} from './types';
import { 
  getDemoAppState, getDemoSchedData, downloadFile, getStorageSize, formatBytes 
} from './utils';
import PlanKlas from './components/PlanKlas';
import PlanSal from './components/PlanSal';
import Dyzury from './components/Dyzury';
import KreatorSzkoly from './components/KreatorSzkoly';
import Wydruki from './components/Wydruki';
import Statystyki from './components/Statystyki';
import { 
  Calendar, Layers, MapPin, Shield, Download, Upload, Trash2, RotateCcw, RotateCw, RefreshCw, Layers2, FileText, Sparkles, Menu, X, Printer, BarChart2,
  Maximize2, Minimize2
} from 'lucide-react';

function sortAppState(resolved: AppState): AppState {
  let nextClasses = resolved.classes;
  if (nextClasses) {
    nextClasses = [...nextClasses].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }
  
  let nextPlanClasses = resolved.planLekcji?.classes;
  if (nextPlanClasses) {
    nextPlanClasses = [...nextPlanClasses].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  let nextTeachers = resolved.teachers;
  if (nextTeachers) {
    nextTeachers = [...nextTeachers].sort((a, b) => {
      const lCompare = a.last.localeCompare(b.last, undefined, { sensitivity: 'base' });
      if (lCompare !== 0) return lCompare;
      return a.first.localeCompare(b.first, undefined, { sensitivity: 'base' });
    });
  }

  let nextPlanTeachers = resolved.planLekcji?.teachers;
  if (nextPlanTeachers) {
    nextPlanTeachers = [...nextPlanTeachers].sort((a, b) => {
      const lCompare = a.last.localeCompare(b.last, undefined, { sensitivity: 'base' });
      if (lCompare !== 0) return lCompare;
      return a.first.localeCompare(b.first, undefined, { sensitivity: 'base' });
    });
  }

  let nextSubjects = resolved.subjects;
  if (nextSubjects) {
    nextSubjects = [...nextSubjects].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }

  let nextPlanSubjects = resolved.planLekcji?.subjects;
  if (nextPlanSubjects) {
    nextPlanSubjects = [...nextPlanSubjects].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }

  return {
    ...resolved,
    classes: nextClasses,
    teachers: nextTeachers,
    subjects: nextSubjects,
    planLekcji: resolved.planLekcji ? {
      ...resolved.planLekcji,
      classes: nextPlanClasses || resolved.planLekcji.classes,
      teachers: nextPlanTeachers || resolved.planLekcji.teachers,
      subjects: nextPlanSubjects || resolved.planLekcji.subjects,
    } : resolved.planLekcji
  };
}

export default function App() {
  // ── HOOKS STATE ──
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('saleplan_v3_app_state');
    if (saved) {
      try { return sortAppState(JSON.parse(saved)); } catch (e) { console.error('Error loading state', e); }
    }
    return sortAppState(getDemoAppState());
  });

  const [schedData, setSchedData] = useState<SchedData>(() => {
    const saved = localStorage.getItem('saleplan_v3_sched_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Error loading sched', e); }
    }
    return getDemoSchedData();
  });

  const [archive, setArchive] = useState<ArchiveEntry[]>(() => {
    const saved = localStorage.getItem('saleplan_v3_archive');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });

  const [currentTab, setCurrentTab] = useState<'plan_klas' | 'plan_sal' | 'dyzury' | 'kreator' | 'wydruki' | 'statystyki'>('kreator');
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  const handleUpdateAppState = (newState: AppState | ((prev: AppState) => AppState)) => {
    setAppState(prev => {
      const resolved = typeof newState === 'function' ? newState(prev) : newState;
      return sortAppState(resolved);
    });
  };

  const handleUpdateArchive = (newArchive: ArchiveEntry[]) => {
    setArchive(newArchive);
  };

  // Undo / Redo Stack for schedData
  const [undoStack, setUndoStack] = useState<SchedData[]>([]);
  const [redoStack, setRedoStack] = useState<SchedData[]>([]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // ── LOCALSTORAGE PERSISTENCE EFFECTS ──
  useEffect(() => {
    localStorage.setItem('saleplan_v3_app_state', JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    localStorage.setItem('saleplan_v3_sched_data', JSON.stringify(schedData));
  }, [schedData]);

  useEffect(() => {
    localStorage.setItem('saleplan_v3_archive', JSON.stringify(archive));
  }, [archive]);

  // ── UNDO / REDO STATE HANDLERS ──
  const pushToUndo = (stateToSave: SchedData) => {
    setUndoStack(prev => [...prev.slice(-39), JSON.parse(JSON.stringify(stateToSave))]);
    setRedoStack([]); // Clear redo
  };

  const handleUpdateSchedData = (newSched: SchedData) => {
    pushToUndo(schedData);
    setSchedData(newSched);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(schedData))]);
    setSchedData(previous);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(schedData))]);
    setSchedData(next);
    setRedoStack(prev => prev.slice(0, -1));
  };

  // ── BRIDGING/IMPORT SESSIONS FROM ETAP 1 TO ETAP 2 ──
  const handleImportFromPlanKlas = () => {
    if (!confirm('Czy chcesz przetransferować siatkę zajęć z Planu Klas do Planu Sal? Spowoduje to nadpisanie bieżącego układu sal dla wspólnych slotów lekcyjnych.')) return;

    pushToUndo(schedData);

    const yearKey = appState.yearKey;
    const pl = appState.planLekcji;

    // Build map for efficient assignment lookups
    const assignmentsMap = new Map<string, Assignment>(pl.assignments.map(a => [a.id, a]));
    const teachersMap = new Map<string, Teacher>(pl.teachers.map(t => [t.id, t]));
    const subjectsMap = new Map<string, Subject>(pl.subjects.map(s => [s.id, s]));
    const roomsMap = new Map<string, ClassRoom>(pl.rooms.map(r => [r.id, r]));

    // SchedData deep structure for current state
    const nextSchedData = { ...schedData };
    if (!nextSchedData[yearKey]) nextSchedData[yearKey] = {};

    let countTransfer = 0;

    // Loop days 0..4
    for (let day = 0; day < 5; day++) {
      if (!nextSchedData[yearKey][day]) nextSchedData[yearKey][day] = {};

      appState.hours.forEach(hourKey => {
        if (!nextSchedData[yearKey][day][hourKey]) {
          nextSchedData[yearKey][day][hourKey] = {};
        }

        const colKeyCells = nextSchedData[yearKey][day][hourKey];

        // Find all lessons for this day and hour in Plan Klas
        pl.classes.forEach(cls => {
          const lessonKey = `${cls.id}|${day}|${pl.hours.findIndex(h => String(h.num) === hourKey)}`;
          const lesson = pl.lessons[lessonKey];
          if (!lesson) return;

          const asg = assignmentsMap.get(lesson.assignmentId);
          if (!asg) return;

          const subject = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
          const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
          const roomEtap1 = asg.roomId ? roomsMap.get(asg.roomId) : null;

          // Attempt to find a suitable room in the building layout
          let assignedColKey = '';
          appState.floors.forEach((floor, fi) => {
            floor.segments.forEach((seg, si) => {
              seg.rooms.forEach((rm, ri) => {
                const targetKey = `f${fi}_s${si}_${rm.num}`;
                
                // Prioritize the room matching name / num
                if (roomEtap1 && String(rm.num).trim() === String(roomEtap1.name).trim()) {
                  assignedColKey = targetKey;
                }
              });
            });
          });

          // Fallback to first empty room of appropriate type if room specified but no strict match, or if any is free
          if (!assignedColKey) {
            for (let fi = 0; fi < appState.floors.length; fi++) {
              const floor = appState.floors[fi];
              for (let si = 0; si < floor.segments.length; si++) {
                const seg = floor.segments[si];
                for (let ri = 0; ri < seg.rooms.length; ri++) {
                  const rm = seg.rooms[ri];
                  const keyCandidate = `f${fi}_s${si}_${rm.num}`;
                  
                  if (!colKeyCells[keyCandidate]) {
                    assignedColKey = keyCandidate;
                    break;
                  }
                }
                if (assignedColKey) break;
              }
              if (assignedColKey) break;
            }
          }

          // Force to first slot if unable to find empty
          if (!assignedColKey && appState.floors[0]?.segments[0]?.rooms[0]) {
            const firstRm = appState.floors[0].segments[0].rooms[0];
            assignedColKey = `f0_s0_${firstRm.num}`;
          }

          if (assignedColKey) {
            const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;
            const newCell: SchedCell = {
              teacherAbbr: teacher?.abbr || '?',
              supportTeacherAbbr: suppTeacher?.abbr || undefined,
              classes: [cls.name],
              className: cls.name,
              subject: subject,
              note: roomEtap1 ? `(sugestia: ${roomEtap1.name})` : undefined,
              _bridgeMeta: {
                classId: cls.id,
                teacherId: asg.teacherId,
                subjectId: asg.subjectId,
                roomId: asg.roomId,
                groupId: asg.groupId || null,
                suggestedRoom: roomEtap1 ? roomEtap1.name : null
              }
            };

            // If already occupied, accumulate into an array to preserve both for conflict detection
            const existing = colKeyCells[assignedColKey];
            if (existing) {
              const existingArr = Array.isArray(existing) ? existing : [existing];
              colKeyCells[assignedColKey] = [...existingArr, newCell];
            } else {
              colKeyCells[assignedColKey] = newCell;
            }
            countTransfer++;
          }
        });
      });
    }

    setSchedData(nextSchedData);
    notify(`Zsynchronizowano lekcje! Przeniesiono pomyślnie ${countTransfer} jednostek lekcyjnych.`, 'ok');
  };

  // ── JSON BACKUPS ACTIONS ──
  const handleExportBackup = () => {
    const backup = {
      version: '3.0.0',
      appState,
      schedData,
      timestamp: new Date().toISOString()
    };
    downloadFile(JSON.stringify(backup, null, 2), `saleplan-plan-szkoly-${appState.school.short.toLowerCase() || 'v3'}.json`, 'application/json');
    notify('Wyeksportowano archiwum JSON', 'ok');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.appState && data.schedData) {
          pushToUndo(schedData);
          handleUpdateAppState(data.appState);
          setSchedData(data.schedData);
          notify('Pomyślnie wczytano archiwum lekcyjne!', 'ok');
        } else {
          notify('Błędny format pliku archiwum', 'err');
        }
      } catch (err) {
        notify('Błąd odczytu pliku kopii', 'err');
      }
    };
    reader.readAsText(file);
  };

  const handleResetTimetable = () => {
    if (!confirm('Czy jesteś PEWIEN, że chcesz zresetować cały plan lekcji, czyścić gabinety oraz dyżury?')) return;
    pushToUndo(schedData);
    handleUpdateAppState(getDemoAppState());
    setSchedData({});
    notify('Zresetowano całą konfigurację programu', 'ok');
  };

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg z-[9999] ${
      type === 'ok' ? 'border-emerald-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 font-sans overflow-hidden">
      
      {/* ── PODSTAWOWY NAGŁÓWEK SYSTEMOWY ── */}
      <header className="bg-slate-900 text-white px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between shadow-md select-none shrink-0 border-b border-slate-950">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-lg p-2 text-white flex items-center justify-center font-black">
            SP
          </div>
          <div>
            <h1 className="font-extrabold text-sm md:text-base tracking-tight text-white flex items-center gap-1.5 leading-none">
              SalePlan Pro <span className="bg-blue-600/30 text-blue-400 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wide">PWA App</span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-semibold mt-0.5 max-w-sm truncate">
              {appState.school.name} ({appState.yearLabel})
            </p>
          </div>
        </div>

        {/* Dynamic Navigation Tabs configured as hamburger menu */}
        <div className="relative my-3 md:my-0 z-30">
          <button
            onClick={() => setHamburgerOpen(!hamburgerOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-900 text-xs text-white font-extrabold shadow transition select-none cursor-pointer"
            id="hamburger-navigation-trigger"
          >
            {hamburgerOpen ? <X size={15} className="text-red-500 animate-pulse" /> : <Menu size={15} className="text-blue-500" />}
            <span className="text-slate-500 font-bold uppercase pointer-events-none">Nawigacja:</span>
            <span className="flex items-center gap-1 leading-none">
              {currentTab === 'kreator' && <><Sparkles size={13} className="text-amber-400 font-bold" /> 🧙‍♀️ Kreator Szkoły</>}
              {currentTab === 'plan_klas' && <><Layers size={13} className="text-blue-400" /> Etap 1: Plan Klas</>}
              {currentTab === 'plan_sal' && <><MapPin size={13} className="text-teal-400" /> Etap 2: Plan Sal</>}
              {currentTab === 'dyzury' && <><Shield size={13} className="text-indigo-400" /> Etap 3: Dyżury</>}
              {currentTab === 'wydruki' && <><Printer size={13} className="text-emerald-400" /> 🖨️ Wydruki</>}
              {currentTab === 'statystyki' && <><BarChart2 size={13} className="text-rose-400" /> 📊 Statystyki</>}
            </span>
          </button>

          {hamburgerOpen && (
            <>
              {/* Overlay close click hook */}
              <div 
                className="fixed inset-0 bg-transparent z-40" 
                onClick={() => setHamburgerOpen(false)} 
              />
              
              <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-xl z-50 overflow-hidden text-left">
                <div className="px-3.5 py-2.5 border-b border-slate-800/80 mb-2">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Główne moduły programu</span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => { setCurrentTab('kreator'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'kreator'
                        ? 'bg-amber-600/10 border-l-4 border-amber-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles size={15} className={`shrink-0 mt-0.5 ${currentTab === 'kreator' ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">🧙‍♀️ Kreator Szkoły</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase">Klasy, nauczyciele, gabinety</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setCurrentTab('plan_klas'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'plan_klas'
                        ? 'bg-blue-600/10 border-l-4 border-blue-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={15} className={`shrink-0 mt-0.5 ${currentTab === 'plan_klas' ? 'text-blue-500' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">📚 Etap 1: Plan Klas</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase">Siatka godzin oddziałowych</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setCurrentTab('plan_sal'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'plan_sal'
                        ? 'bg-teal-600/10 border-l-4 border-teal-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MapPin size={15} className={`shrink-0 mt-0.5 ${currentTab === 'plan_sal' ? 'text-teal-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">🎨 Etap 2: Plan Sal</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase font-mono">Lokalizacje & obłożenie sal</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setCurrentTab('dyzury'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'dyzury'
                        ? 'bg-indigo-600/10 border-l-4 border-indigo-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shield size={15} className={`shrink-0 mt-0.5 ${currentTab === 'dyzury' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">🛡️ Etap 3: Dyżury</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase">Opieka na przerwach</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-800/60 my-1 pb-1" />

                  <button
                    onClick={() => { setCurrentTab('wydruki'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'wydruki'
                        ? 'bg-emerald-600/10 border-l-4 border-emerald-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Printer size={15} className={`shrink-0 mt-0.5 ${currentTab === 'wydruki' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">🖨️ Wydruki i Publikacje</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase">Plany klas, nauczycieli, sal</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setCurrentTab('statystyki'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'statystyki'
                        ? 'bg-rose-600/10 border-l-4 border-rose-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart2 size={15} className={`shrink-0 mt-0.5 ${currentTab === 'statystyki' ? 'text-rose-450 px' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">📊 Statystyki i Diagnoza</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase font-mono">Okienka, limity, obciążenia</span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Global Toolbar actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2.5">
            <button 
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition select-none cursor-pointer"
              title="Cofnij ostatnie działanie (Undo)"
            >
              <RotateCcw size={15} />
            </button>
            <button 
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition select-none cursor-pointer"
              title="Ponów cofnięte działanie (Redo)"
            >
              <RotateCw size={15} />
            </button>
            <button 
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition select-none cursor-pointer"
              title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran (Fullscreen)"}
            >
              {isFullscreen ? <Minimize2 size={15} className="text-amber-400" /> : <Maximize2 size={15} />}
            </button>
          </div>

          <button 
            onClick={handleExportBackup}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs font-extrabold flex items-center gap-1"
            title="Pobierz pełny plik konfiguracyjny (JSON)"
          >
            <Download size={15} /> Export
          </button>
          
          <label className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs font-extrabold flex items-center gap-1 cursor-pointer">
            <Upload size={15} /> Import
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportBackup} 
            />
          </label>

          <button 
            onClick={handleResetTimetable}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
            title="Resetuj dane"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* ── GŁÓWNA STREFA ZAKŁADEK (RENDER) ── */}
      <div className="flex-1 flex overflow-hidden">
        {currentTab === 'kreator' && (
          <KreatorSzkoly
            appState={appState}
            onChangeAppState={handleUpdateAppState}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            archive={archive}
            onChangeArchive={handleUpdateArchive}
          />
        )}
        {currentTab === 'plan_klas' && (
          <PlanKlas 
            appState={appState} 
            onChangeAppState={handleUpdateAppState} 
            onTransfer={() => {
              handleImportFromPlanKlas();
              setCurrentTab('plan_sal');
            }}
          />
        )}
        {currentTab === 'plan_sal' && (
          <PlanSal 
            appState={appState} 
            schedData={schedData} 
            onChangeAppState={handleUpdateAppState} 
            onChangeSchedData={handleUpdateSchedData} 
            onImportFromPlanKlas={handleImportFromPlanKlas}
          />
        )}
        {currentTab === 'dyzury' && (
          <Dyzury 
            appState={appState} 
            onChangeAppState={handleUpdateAppState} 
            schedData={schedData}
          />
        )}
        {currentTab === 'wydruki' && (
          <Wydruki 
            appState={appState} 
            schedData={schedData}
          />
        )}
        {currentTab === 'statystyki' && (
          <Statystyki 
            appState={appState} 
            schedData={schedData}
          />
        )}
      </div>

      {/* ── STOPKA STATYSTYCZNA LICENCJI ── */}
      <footer className="bg-slate-900 border-t border-slate-950 text-slate-500 py-3 px-6 flex flex-col md:flex-row justify-between items-center gap-3.5 text-[10px] select-none shrink-0 font-medium">
        <div className="flex items-center gap-3">
          <span>Licencja: Apache-2.0 · Offline Client-side App</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Przebieg wykorzystania pamięci localStorage */}
          <div className="flex items-center gap-2.5 w-full sm:w-64 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 font-bold shrink-0">Baza (localStorage):</span>
            <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (getStorageSize() / (5 * 1024 * 1024)) > 0.8 
                    ? 'bg-red-500' 
                    : (getStorageSize() / (5 * 1024 * 1024)) > 0.5 
                      ? 'bg-amber-500' 
                      : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(1, (getStorageSize() / (5 * 1024 * 1024)) * 100))}%` }}
              />
            </div>
            <span className="text-slate-300 font-mono font-extrabold shrink-0">
              {((getStorageSize() / (5 * 1024 * 1024)) * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-400">
            <span>zajęte: <strong className="font-extrabold text-slate-300">{formatBytes(getStorageSize())}</strong> z 5.0 MB</span>
            <span className="text-slate-700 font-bold">|</span>
            <span>Wykorzystano lokacje korytarzy i gabinety przedmiotowe</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
