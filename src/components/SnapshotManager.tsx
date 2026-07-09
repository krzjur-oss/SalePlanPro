import React, { useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { AppState, SchedData, SnapshotEntry, AutosaveVersion } from '../types';
import { 
  Camera, Trash2, Download, Upload, Clock, Bookmark, X, Check, Search, FileText, AlertTriangle, Loader2, Info, BarChart2, TrendingUp, TrendingDown 
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
  isRestoring?: boolean;
  onRestoringChange?: (isRestoring: boolean) => void;
  autosaveVersions?: AutosaveVersion[];
}



interface SafeErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, resetError: () => void) => ReactNode;
}

interface SafeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Custom Error Boundary to capture rendering failures inside the Snapshot Manager
class SafeErrorBoundary extends React.Component<SafeErrorBoundaryProps, SafeErrorBoundaryState> {
  props!: SafeErrorBoundaryProps;
  state!: SafeErrorBoundaryState;
  setState!: (
    state: SafeErrorBoundaryState | ((prevState: Readonly<SafeErrorBoundaryState>, props: Readonly<SafeErrorBoundaryProps>) => SafeErrorBoundaryState | Pick<SafeErrorBoundaryState, keyof SafeErrorBoundaryState> | null) | Pick<SafeErrorBoundaryState, keyof SafeErrorBoundaryState> | null,
    callback?: () => void
  ) => void;

  constructor(props: SafeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SafeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("SafeErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.resetError);
    }
    return this.props.children;
  }
}

// Wrapper to isolate rendering errors and provide an elegant click-to-repair action
export default function SnapshotManager(props: SnapshotManagerProps) {
  if (!props.isOpen) return null;

  return (
    <SafeErrorBoundary
      fallback={(error, resetError) => (
        <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden leading-normal text-slate-800">
            <div className="p-4 bg-red-600 text-white flex items-center gap-2 select-none">
              <AlertTriangle size={18} />
              <h2 className="font-extrabold text-sm md:text-base tracking-tight leading-none text-white font-sans">
                Błąd wyświetlania punktów przywracania
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Wykryto problem z odczytem zapisanych punktów przywracania w Twojej przeglądarce. Prawdopodobnie lokalny plik z historią zmian zawiera niekompatybilne wpisy lub błędy formatu we wcześniejszych sesjach.
              </p>
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl max-h-32 overflow-y-auto">
                <span className="block text-[10px] font-mono text-red-700 font-extrabold uppercase tracking-wider mb-1">
                  Treść błędu (diagnostyka):
                </span>
                <code className="text-[10.5px] font-mono text-red-600 font-bold block whitespace-pre-wrap leading-normal">
                  {error?.message || String(error)}
                </code>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Czy na pewno chcesz bezpowrotnie usunąć i wyczyścić pamięć podręczną punktów przywracania?\nTa czynność nie usunie aktywnego planu, skasuje jedynie wcześniejsze migawki.")) {
                      try {
                        localStorage.removeItem('saleplan_v3_snapshots');
                        props.onChangeSnapshots([]);
                        resetError();
                        props.onClose();
                        window.location.reload();
                      } catch (e) {
                        alert("Błąd podczas czyszczenia.");
                      }
                    }
                  }}
                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-lg transition-all shadow-sm cursor-pointer border-none flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Zresetuj i Skasuj uszkodzone kopie</span>
                </button>
                <button
                  type="button"
                  onClick={props.onClose}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all border border-slate-200 cursor-pointer"
                >
                  Zamknij okno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      <SnapshotManagerInner {...props} />
    </SafeErrorBoundary>
  );
}

interface LessonsBreakdown {
  classes: { [className: string]: number };
  teachers: { [teacherAbbr: string]: number };
  days: { [dayIdx: number]: number };
  total: number;
}

const getLessonsBreakdown = (sData: SchedData): LessonsBreakdown => {
  const classes: { [className: string]: number } = {};
  const teachers: { [teacherAbbr: string]: number } = {};
  const days: { [dayIdx: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  let total = 0;

  try {
    Object.values(sData || {}).forEach(yearObj => {
      Object.entries(yearObj || {}).forEach(([dayIdxStr, dayObj]) => {
        const dayIdx = parseInt(dayIdxStr, 10);
        Object.values(dayObj || {}).forEach(hourObj => {
          Object.values(hourObj || {}).forEach(colData => {
            const processCell = (cell: any) => {
              if (!cell) return;
              const matches = cell.className || (cell.classes && cell.classes.length > 0);
              if (matches) {
                total++;
                
                // Track by Class Name
                const cName = cell.className || (cell.classes && cell.classes[0]) || 'Inna';
                classes[cName] = (classes[cName] || 0) + 1;

                if (Array.isArray(cell.classes)) {
                  cell.classes.forEach((c: string) => {
                    if (c && c !== cell.className) {
                      classes[c] = (classes[c] || 0) + 1;
                    }
                  });
                }

                // Track by Teacher
                const tAbbr = cell.teacherAbbr || 'Bez nauczyciela';
                teachers[tAbbr] = (teachers[tAbbr] || 0) + 1;

                // Track by Day
                if (!isNaN(dayIdx)) {
                  days[dayIdx] = (days[dayIdx] || 0) + 1;
                }
              }
            };

            if (Array.isArray(colData)) {
              colData.forEach(processCell);
            } else {
              processCell(colData);
            }
          });
        });
      });
    });
  } catch (e) {
    console.error(e);
  }

  return { classes, teachers, days, total };
};

function SnapshotManagerInner({
  isOpen,
  onClose,
  appState,
  schedData,
  snapshots,
  onChangeSnapshots,
  onRestoreSnapshot,
  isRestoring: propIsRestoring,
  onRestoringChange,
  autosaveVersions = []
}: SnapshotManagerProps) {
  const [localIsRestoring, setLocalIsRestoring] = useState(false);
  const isRestoring = propIsRestoring !== undefined ? propIsRestoring : localIsRestoring;
  const setIsRestoring = onRestoringChange !== undefined ? onRestoringChange : setLocalIsRestoring;

  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Custom modal dialogs instead of browser native confirm/alert inside sandbox iframes
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [showLessonComparison, setShowLessonComparison] = useState(false);
  const [comparisonTab, setComparisonTab] = useState<'classes' | 'teachers' | 'days'>('classes');
  const [comparisonSearchQuery, setComparisonSearchQuery] = useState('');
  const [managerTab, setManagerTab] = useState<'manual' | 'autosave'>('manual');

  // Reset comparison state when chosen snapshot changes
  React.useEffect(() => {
    setComparisonSearchQuery('');
  }, [selectedSnapshotId]);

  // Memoized matching snapshot
  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) return null;
    if (selectedSnapshotId.startsWith('autosave-') && Array.isArray(autosaveVersions)) {
      const foundAutosave = autosaveVersions.find(v => v && v.id === selectedSnapshotId);
      if (foundAutosave) {
        return {
          id: foundAutosave.id,
          name: `Autozapis z dnia ${new Date(foundAutosave.timestamp).toLocaleDateString('pl-PL')} ${new Date(foundAutosave.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
          comment: `Stan roboczy systemu zachowany automatycznie podczas edycji siatki godzin.`,
          createdAt: foundAutosave.timestamp,
          appState: foundAutosave.appState,
          schedData: foundAutosave.schedData,
        } as SnapshotEntry;
      }
    }
    if (!Array.isArray(snapshots)) return null;
    return snapshots.find(s => s && s.id === selectedSnapshotId) || null;
  }, [snapshots, selectedSnapshotId, autosaveVersions]);

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

  // Memoized comparison stats calculation
  const snapshotStats = useMemo(() => {
    if (!selectedSnapshot) return null;
    
    const currLessons = countLessons(schedData);
    const currTeachers = appState.teachers?.length || appState.planLekcji?.teachers?.length || 0;
    const currClasses = appState.classes?.length || appState.planLekcji?.classes?.length || 0;
    const currRooms = appState.planLekcji?.rooms?.length || 0;

    const snapLessons = countLessons(selectedSnapshot.schedData) || selectedSnapshot.stats?.assignedLessonsCount || 0;
    const snapTeachers = selectedSnapshot.appState.teachers?.length || selectedSnapshot.appState.planLekcji?.teachers?.length || selectedSnapshot.stats?.teachersCount || 0;
    const snapClasses = selectedSnapshot.appState.classes?.length || selectedSnapshot.appState.planLekcji?.classes?.length || selectedSnapshot.stats?.classesCount || 0;
    const snapRooms = selectedSnapshot.appState.planLekcji?.rooms?.length || 0;

    const currSchool = appState.school?.name || appState.planLekcji?.meta?.schoolName || 'Nieznana';
    const snapSchool = selectedSnapshot.appState.school?.name || selectedSnapshot.appState.planLekcji?.meta?.schoolName || 'Nieznana';

    const currYear = appState.yearLabel || 'Nieznany';
    const snapYear = selectedSnapshot.appState.yearLabel || 'Nieznany';

    return {
      curr: { lessons: currLessons, teachers: currTeachers, classes: currClasses, rooms: currRooms, school: currSchool, year: currYear },
      snap: { lessons: snapLessons, teachers: snapTeachers, classes: snapClasses, rooms: snapRooms, school: snapSchool, year: snapYear }
    };
  }, [selectedSnapshot, appState, schedData]);

  // Detailed lessons comparison breakdown
  const lessonComparisonData = useMemo(() => {
    if (!selectedSnapshot) return null;

    const currBreakdown = getLessonsBreakdown(schedData);
    const snapBreakdown = getLessonsBreakdown(selectedSnapshot.schedData);

    // Get all unique classes union
    const allClasses = Array.from(new Set([
      ...Object.keys(currBreakdown.classes),
      ...Object.keys(snapBreakdown.classes)
    ])).sort();

    // Get all unique teachers union
    const allTeachers = Array.from(new Set([
      ...Object.keys(currBreakdown.teachers),
      ...Object.keys(snapBreakdown.teachers)
    ])).sort();

    // Map classes comparison list
    const classesComparisonList = allClasses.map(cName => {
      const currVal = currBreakdown.classes[cName] || 0;
      const snapVal = snapBreakdown.classes[cName] || 0;
      const diff = snapVal - currVal;
      return { name: cName, curr: currVal, snap: snapVal, diff };
    });

    // Map teachers comparison list
    const teachersComparisonList = allTeachers.map(tAbbr => {
      const currVal = currBreakdown.teachers[tAbbr] || 0;
      const snapVal = snapBreakdown.teachers[tAbbr] || 0;
      const diff = snapVal - currVal;
      return { name: tAbbr, curr: currVal, snap: snapVal, diff };
    });

    const teachersGained = teachersComparisonList
      .filter(t => t.curr > t.snap)
      .map(t => ({ name: t.name, diff: t.curr - t.snap, curr: t.curr, snap: t.snap }))
      .sort((a, b) => b.diff - a.diff);

    const teachersLost = teachersComparisonList
      .filter(t => t.curr < t.snap)
      .map(t => ({ name: t.name, diff: t.snap - t.curr, curr: t.curr, snap: t.snap }))
      .sort((a, b) => b.diff - a.diff);

    // Map days comparison list (0 to 4)
    const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
    const daysComparisonList = [0, 1, 2, 3, 4].map(dayIdx => {
      const name = dayNames[dayIdx] || `Dzień ${dayIdx + 1}`;
      const currVal = currBreakdown.days[dayIdx] || 0;
      const snapVal = snapBreakdown.days[dayIdx] || 0;
      const diff = snapVal - currVal;
      return { name, curr: currVal, snap: snapVal, diff };
    });

    return {
      classes: classesComparisonList,
      teachers: teachersComparisonList,
      days: daysComparisonList,
      teachersGained,
      teachersLost,
      total: {
        curr: currBreakdown.total,
        snap: snapBreakdown.total,
        diff: snapBreakdown.total - currBreakdown.total
      }
    };
  }, [selectedSnapshot, schedData]);

  // Filter snapshots by search query
  const filteredSnapshots = useMemo(() => {
    if (!Array.isArray(snapshots)) return [];
    return snapshots
      .filter(s => {
        if (!s) return false;
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const nameMatch = s.name ? s.name.toLowerCase().includes(query) : false;
        const commentMatch = s.comment ? s.comment.toLowerCase().includes(query) : false;
        const labelMatch = s.appState?.yearLabel ? s.appState.yearLabel.toLowerCase().includes(query) : false;
        
        return nameMatch || commentMatch || labelMatch;
      })
      .sort((a, b) => {
        const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
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
    if (!snap) return;
    let formattedDate = 'nieznanej daty';
    try {
      if (snap.createdAt) {
        const stamp = new Date(snap.createdAt);
        if (!isNaN(stamp.getTime())) {
          formattedDate = stamp.toLocaleString('pl-PL');
        }
      }
    } catch (e) {}

    setConfirmConfig({
      title: 'Przywrócenie planu lekcji',
      message: `Czy na pewno chcesz przywrócić plan do punktu: "${snap.name || 'Wersja bez nazwy'}"? (Zapisany dnia: ${formattedDate}). Obecny stan planu zostanie zastąpiony!`,
      onConfirm: () => {
        setConfirmConfig(null);
        if (snap.appState && snap.schedData) {
          setIsRestoring(true);
          setTimeout(() => {
            try {
              onRestoreSnapshot(snap.appState, snap.schedData);
              onClose();
            } catch (err) {
              console.error('Błąd podczas przywracania planu', err);
              setAlertConfig({
                title: 'Błąd przywracania',
                message: 'Wystąpił nieoczekiwany błąd podczas przywracania danych.'
              });
            } finally {
              setIsRestoring(false);
            }
          }, 500);
        } else {
          setAlertConfig({
            title: 'Brak danych',
            message: 'Ten punkt przywracania nie zawiera poprawnych danych.'
          });
        }
      }
    });
  };

  // Revert/Restore an autosave version
  const handleRestoreAutosave = (version: AutosaveVersion) => {
    if (!version) return;
    let formattedDate = 'nieznanej daty';
    try {
      if (version.timestamp) {
        const stamp = new Date(version.timestamp);
        if (!isNaN(stamp.getTime())) {
          formattedDate = stamp.toLocaleString('pl-PL');
        }
      }
    } catch (e) {}

    setConfirmConfig({
      title: 'Przywrócenie z autozapisu',
      message: `Czy na pewno chcesz przywrócić plan do automatycznego punktu kontrolnego z dnia: ${formattedDate}? Obecny stan planu zostanie zastąpiony!`,
      onConfirm: () => {
        setConfirmConfig(null);
        if (version.appState && version.schedData) {
          setIsRestoring(true);
          setTimeout(() => {
            try {
              onRestoreSnapshot(version.appState, version.schedData);
              onClose();
            } catch (err) {
              console.error('Błąd podczas przywracania autozapisu', err);
              setAlertConfig({
                title: 'Błąd przywracania',
                message: 'Wystąpił nieoczekiwany błąd podczas przywracania danych.'
              });
            } finally {
              setIsRestoring(false);
            }
          }, 500);
        } else {
          setAlertConfig({
            title: 'Brak danych',
            message: 'Ta automatyczna kopia nie zawiera poprawnych danych.'
          });
        }
      }
    });
  };

  // Delete snapshot
  const handleDelete = (id: string, name: string) => {
    if (!id) return;
    setConfirmConfig({
      title: 'Usunięcie punktu',
      message: `Czy na pewno chcesz bezpowrotnie usunąć punkt przywracania:\n"${name || 'Bez nazwy'}"?`,
      onConfirm: () => {
        setConfirmConfig(null);
        onChangeSnapshots(snapshots.filter(s => s && s.id !== id));
      }
    });
  };

  // Export static snapshot JSON file
  const handleExportSingle = (snap: SnapshotEntry) => {
    if (!snap) return;
    const backup = {
      version: '3.0.0-snapshot',
      snapshot: {
        id: snap.id,
        name: snap.name || 'Wersja bez nazwy',
        createdAt: snap.createdAt,
        appState: snap.appState,
        schedData: snap.schedData,
        comment: snap.comment,
        stats: snap.stats
      }
    };
    const safeName = (snap.name || 'kopia').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
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
          setAlertConfig({
            title: 'Import udany',
            message: `Pomyślnie zaimportowano punkt przywracania: "${targetSnap.name}"`
          });
        } else {
          setAlertConfig({
            title: 'Format nieobsługiwany',
            message: 'Błędny lub nieobsługiwany format pliku punktu przywracania.'
          });
        }
      } catch (err) {
        setAlertConfig({
          title: 'Błąd pliku',
          message: 'Wystąpił błąd podczas dekodowania i odczytu pliku kopii.'
        });
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
        className={`relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full ${
          selectedSnapshot && showLessonComparison ? 'max-w-4xl font-semibold' : 'max-w-2xl'
        } flex flex-col max-h-[85vh] overflow-hidden leading-normal text-slate-800 transition-all duration-300`}
        id="snapshot-manager-dialog"
      >
        {isRestoring && (
          <div className="absolute inset-0 z-[1100] bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-12 h-12 text-violet-400 animate-spin mb-4" />
            <h3 className="text-white font-extrabold text-base md:text-lg mb-2 font-sans tracking-tight">
              Przywracanie planu lekcji...
            </h3>
            <p className="text-xs text-slate-300 max-w-sm leading-relaxed font-semibold">
              Trwa inicjalizacja i ładowanie wybranego punktu przywracania. Proszę czekać, cała struktura jest bezpiecznie podmieniana.
            </p>
          </div>
        )}
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

          {/* TAB SELECTOR */}
          <div className="flex border-b border-slate-200 gap-1 select-none shrink-0 mb-1">
            <button
              type="button"
              onClick={() => {
                setManagerTab('manual');
                setSelectedSnapshotId(null);
              }}
              className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                managerTab === 'manual'
                  ? 'border-violet-600 text-violet-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera size={14} /> Punkty ręczne ({filteredSnapshots.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setManagerTab('autosave');
                setSelectedSnapshotId(null);
              }}
              className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 relative ${
                managerTab === 'autosave'
                  ? 'border-violet-600 text-violet-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock size={14} /> Wersje autozapisu ({autosaveVersions.length})
              {autosaveVersions.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </button>
          </div>

          {managerTab === 'manual' && (
            <div className="space-y-5">
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
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition cursor-pointer border-none"
                  >
                    Zapisz ten stan
                  </button>
                </div>
              </form>
            </div>
          )}
            </div>
          )}

          {selectedSnapshot && snapshotStats && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4.5 space-y-3.5 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <span className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={13} className="text-indigo-600 shrink-0" />
                  Podgląd wybranego punktu przywracania
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSnapshotId(null)}
                  className="text-indigo-500 hover:text-indigo-700 text-[10.5px] font-black uppercase tracking-wider cursor-pointer border-none bg-transparent"
                >
                  Odznacz
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Bookmark size={12} className="text-indigo-500 shrink-0" />
                  {selectedSnapshot.name}
                </h4>
                {selectedSnapshot.comment ? (
                  <p className="text-[10.5px] italic text-slate-600 bg-white/70 border border-indigo-100 p-2.5 rounded-lg leading-relaxed font-semibold">
                    "{selectedSnapshot.comment}"
                  </p>
                ) : (
                  <p className="text-[10.5px] text-slate-450 italic font-semibold pl-4">Brak opisu dla tego punktu.</p>
                )}
              </div>

              {/* Stats Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-3xs bg-white">
                <table className="w-full text-left text-[11px] leading-relaxed border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 select-none font-sans">
                      <th className="p-2.5 font-black text-xs">Wskaźnik (Parametr)</th>
                      <th className="p-2.5 font-bold text-center text-xs">Stan obecny</th>
                      <th className="p-2.5 font-black text-indigo-700 text-center text-xs bg-indigo-50/40">W punkcie przywracania</th>
                      <th className="p-2.5 font-extrabold text-center text-xs">Różnica / Zmiana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold font-mono">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-sans font-extrabold text-slate-800">Nazwa szkoły</td>
                      <td className="p-2.5 text-center text-slate-500">{snapshotStats.curr.school}</td>
                      <td className="p-2.5 text-center text-indigo-900 font-extrabold bg-indigo-50/20">{snapshotStats.snap.school}</td>
                      <td className="p-2.5 text-center font-sans">
                        {snapshotStats.curr.school === snapshotStats.snap.school ? (
                          <span className="text-emerald-600 text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wide">Bez zmian</span>
                        ) : (
                          <span className="text-amber-600 text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 rounded border border-amber-150 uppercase tracking-wide">Inna szkoła</span>
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-sans font-extrabold text-slate-800">Etykieta roku</td>
                      <td className="p-2.5 text-center text-slate-500">{snapshotStats.curr.year}</td>
                      <td className="p-2.5 text-center text-indigo-900 font-extrabold bg-indigo-50/20">{snapshotStats.snap.year}</td>
                      <td className="p-2.5 text-center font-sans">
                        {snapshotStats.curr.year === snapshotStats.snap.year ? (
                          <span className="text-emerald-600 text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wide">Bez zmian</span>
                        ) : (
                          <span className="text-amber-600 text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 rounded border border-amber-150 uppercase tracking-wide">Inny rok</span>
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-sans font-extrabold text-slate-800">Obsadzone lekcje (godziny)</td>
                      <td className="p-2.5 text-center text-slate-500">{snapshotStats.curr.lessons}</td>
                      <td className="p-2.5 text-center text-indigo-900 font-extrabold bg-indigo-50/20">{snapshotStats.snap.lessons}</td>
                      <td className="p-2.5 text-center font-sans">
                        {(() => {
                          const diff = snapshotStats.snap.lessons - snapshotStats.curr.lessons;
                          if (diff > 0) return <span className="text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wide">+{diff} lekcji</span>;
                          if (diff < 0) return <span className="text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 rounded border border-rose-100 uppercase tracking-wide">{diff} lekcji</span>;
                          return <span className="text-slate-400 text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 uppercase tracking-wide">Bez zmian</span>;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-sans font-extrabold text-slate-800">Liczba nauczycieli</td>
                      <td className="p-2.5 text-center text-slate-500">{snapshotStats.curr.teachers}</td>
                      <td className="p-2.5 text-center text-indigo-900 font-extrabold bg-indigo-50/20">{snapshotStats.snap.teachers}</td>
                      <td className="p-2.5 text-center font-sans">
                        {(() => {
                          const diff = snapshotStats.snap.teachers - snapshotStats.curr.teachers;
                          if (diff > 0) return <span className="text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wide">+{diff} naucz.</span>;
                          if (diff < 0) return <span className="text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 rounded border border-rose-100 uppercase tracking-wide">{diff} naucz.</span>;
                          return <span className="text-slate-400 text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 uppercase tracking-wide">Bez zmian</span>;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-sans font-extrabold text-slate-800">Liczba klas szkolnych</td>
                      <td className="p-2.5 text-center text-slate-500">{snapshotStats.curr.classes}</td>
                      <td className="p-2.5 text-center text-indigo-900 font-extrabold bg-indigo-50/20">{snapshotStats.snap.classes}</td>
                      <td className="p-2.5 text-center font-sans">
                        {(() => {
                          const diff = snapshotStats.snap.classes - snapshotStats.curr.classes;
                          if (diff > 0) return <span className="text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wide">+{diff} klas</span>;
                          if (diff < 0) return <span className="text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 rounded border border-rose-100 uppercase tracking-wide">{diff} klas</span>;
                          return <span className="text-slate-400 text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 uppercase tracking-wide">Bez zmian</span>;
                        })()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-sans font-extrabold text-slate-800">Liczba gabinetów / sal l.</td>
                      <td className="p-2.5 text-center text-slate-500">{snapshotStats.curr.rooms}</td>
                      <td className="p-2.5 text-center text-indigo-900 font-extrabold bg-indigo-50/20">{snapshotStats.snap.rooms}</td>
                      <td className="p-2.5 text-center font-sans">
                        {(() => {
                          const diff = snapshotStats.snap.rooms - snapshotStats.curr.rooms;
                          if (diff > 0) return <span className="text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 uppercase tracking-wide">+{diff} sal</span>;
                          if (diff < 0) return <span className="text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 rounded border border-rose-100 uppercase tracking-wide">{diff} sal</span>;
                          return <span className="text-slate-400 text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 uppercase tracking-wide">Bez zmian</span>;
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detailed lessons comparison breakdown */}
              {showLessonComparison && lessonComparisonData && (
                <div className="bg-white border border-indigo-100 rounded-xl p-4.5 space-y-3.5 shadow-xs animate-in slide-in-from-top-1 fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-indigo-100 pb-3 select-none">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={14} className="text-indigo-600 animate-pulse" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide font-sans">Szczegółowa analiza różnic lekcji</span>
                    </div>

                    {/* Dimensions tabs */}
                    <div className="flex items-center gap-1 bg-slate-150/70 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => { setComparisonTab('classes'); setComparisonSearchQuery(''); }}
                        className={`px-2.5 py-1 text-[10.5px] font-black rounded-md transition border-none cursor-pointer ${
                          comparisonTab === 'classes' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                      >
                        Klasy
                      </button>
                      <button
                        type="button"
                        onClick={() => { setComparisonTab('teachers'); setComparisonSearchQuery(''); }}
                        className={`px-2.5 py-1 text-[10.5px] font-black rounded-md transition border-none cursor-pointer ${
                          comparisonTab === 'teachers' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                      >
                        Nauczyciele
                      </button>
                      <button
                        type="button"
                        onClick={() => { setComparisonTab('days'); setComparisonSearchQuery(''); }}
                        className={`px-2.5 py-1 text-[10.5px] font-black rounded-md transition border-none cursor-pointer ${
                          comparisonTab === 'days' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                      >
                        Dni
                      </button>
                    </div>
                  </div>

                  {/* Split Layout: Table comparison on Left, Teacher Workload Shifts on Right */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Panel: Table of Differences */}
                    <div className="lg:col-span-7 space-y-3">
                      {comparisonTab !== 'days' && (
                        <div className="relative select-none">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <Search size={12} />
                          </span>
                          <input
                            type="text"
                            value={comparisonSearchQuery}
                            onChange={(e) => setComparisonSearchQuery(e.target.value)}
                            placeholder={comparisonTab === 'classes' ? "Wyszukaj i filtruj klasy..." : "Wyszukaj i filtruj nauczycieli..."}
                            className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:border-indigo-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold leading-relaxed"
                          />
                        </div>
                      )}

                      <div className="overflow-x-auto border border-slate-205 rounded-lg max-h-52 overflow-y-auto shadow-3xs bg-white custom-scrollbar">
                        <table className="w-full text-left text-[11px] leading-relaxed border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-205 text-slate-500 select-none font-sans sticky top-0 z-10">
                              <th className="p-2.5 font-black uppercase tracking-wide text-[9.5px]">
                                {comparisonTab === 'classes' ? 'Klasa' : comparisonTab === 'teachers' ? 'Nauczyciel/Skrót' : 'Dzień tygodnia'}
                              </th>
                              <th className="p-2.5 font-bold text-center uppercase tracking-wide text-[9.5px]">Stan obecny</th>
                              <th className="p-2.5 font-black text-indigo-600 text-center uppercase tracking-wide text-[9.5px]">W punkcie</th>
                              <th className="p-2.5 font-extrabold text-center uppercase tracking-wide text-[9.5px]">Różnica lekcji</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white font-mono text-slate-700">
                            {(() => {
                              let items = [];
                              if (comparisonTab === 'classes') items = lessonComparisonData.classes;
                              else if (comparisonTab === 'teachers') items = lessonComparisonData.teachers;
                              else items = lessonComparisonData.days;

                              const trimmedQuery = comparisonSearchQuery.trim().toLowerCase();
                              if (trimmedQuery && comparisonTab !== 'days') {
                                items = items.filter(it => it.name.toLowerCase().includes(trimmedQuery));
                              }

                              if (items.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={4} className="p-4 text-center font-sans text-slate-400 italic font-semibold">
                                      Brak danych spełniających kryteria wyszukiwania.
                                    </td>
                                  </tr>
                                );
                              }

                              return items.map((it) => (
                                <tr key={it.name} className="hover:bg-slate-50 font-semibold text-[11px]">
                                  <td className="p-2.5 font-sans font-extrabold text-slate-800">{it.name}</td>
                                  <td className="p-2.5 text-center text-slate-500">{it.curr}</td>
                                  <td className="p-2.5 text-center text-indigo-900 font-extrabold">{it.snap}</td>
                                  <td className="p-2.5 text-center font-sans select-none">
                                    {(() => {
                                      if (it.diff > 0) {
                                        return <span className="text-emerald-700 text-[10px] font-black px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-150 uppercase tracking-wider">+{it.diff} lekcji</span>;
                                      }
                                      if (it.diff < 0) {
                                        return <span className="text-rose-700 text-[10px] font-black px-1.5 py-0.5 bg-rose-50 rounded border border-rose-150 uppercase tracking-wide">{it.diff} lekcji</span>;
                                      }
                                      return <span className="text-slate-400 text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 uppercase tracking-wide">Bez zmian</span>;
                                    })()}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right Panel: Teachers Workload Gained / Lost */}
                    <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-4 lg:pt-0 lg:pl-4 flex flex-col justify-between">
                      <div className="space-y-3 flex-1 flex flex-col min-h-0">
                        <div className="select-none shrink-0 border-b border-dashed border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-slate-550 uppercase tracking-wider block mb-0.5">Wpływ na obciążenie kadry</span>
                          <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">
                            Zmiany obciążenia nauczycieli w bieżącym planie względem wybranego punktu przywracania.
                          </p>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-52 pr-1.5 space-y-3.5 custom-scrollbar min-h-0">
                          {/* Gained hours */}
                          <div className="space-y-1.5">
                            <span className="text-[9.5px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                              <TrendingUp size={11} className="text-emerald-500 shrink-0" />
                              Więcej godzin obecnie ({lessonComparisonData.teachersGained.length})
                            </span>
                            {lessonComparisonData.teachersGained.length === 0 ? (
                              <p className="text-[9.5px] italic text-slate-400 pl-3">Brak (żaden nauczyciel nie ma więcej godzin)</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-1">
                                {lessonComparisonData.teachersGained.map(t => (
                                  <div key={t.name} className="flex items-center justify-between p-2 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100 rounded-lg text-[10.5px] transition font-semibold leading-none">
                                    <div className="min-w-0 pr-2">
                                      <span className="font-extrabold text-slate-800">{t.name}</span>
                                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono leading-none">obecnie: {t.curr} (było: {t.snap})</span>
                                    </div>
                                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded shadow-3xs uppercase shrink-0">
                                      +{t.diff} lekcji
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Lost hours */}
                          <div className="space-y-1.5">
                            <span className="text-[9.5px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                              <TrendingDown size={11} className="text-rose-500 shrink-0" />
                              Mniej godzin obecnie ({lessonComparisonData.teachersLost.length})
                            </span>
                            {lessonComparisonData.teachersLost.length === 0 ? (
                              <p className="text-[9.5px] italic text-slate-400 pl-3">Brak (żaden nauczyciel nie ma mniej godzin)</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-1">
                                {lessonComparisonData.teachersLost.map(t => (
                                  <div key={t.name} className="flex items-center justify-between p-2 bg-rose-50/40 hover:bg-rose-50 border border-rose-100 rounded-lg text-[10.5px] transition font-semibold leading-none">
                                    <div className="min-w-0 pr-2">
                                      <span className="font-extrabold text-slate-800">{t.name}</span>
                                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono leading-none">obecnie: {t.curr} (było: {t.snap})</span>
                                    </div>
                                    <span className="bg-rose-600 text-white text-[9px] font-extrabold font-mono px-1.5 py-0.5 rounded shadow-3xs uppercase shrink-0 font-sans">
                                      -{t.diff} lekcji
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {lessonComparisonData.teachersGained.length === 0 && lessonComparisonData.teachersLost.length === 0 && (
                            <div className="p-4 rounded-xl border border-dashed border-slate-205 text-center text-slate-400 italic text-[10px] font-semibold py-8 select-none leading-relaxed">
                              Brak jakichkolwiek różnic w pensum nauczycieli. Obciążenie kadry w obu wersjach jest identyczne!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[10.5px] leading-relaxed text-indigo-950 font-semibold select-none">
                    <span className="font-bold flex items-center gap-1"><Info size={11} className="text-indigo-600 shrink-0" /> Wyliczenie sumaryczne:</span>
                    <div className="flex items-center gap-2 flex-wrap font-mono font-bold">
                      <span className="text-slate-600">Obecnie: <strong className="text-slate-800 font-black">{lessonComparisonData.total.curr}</strong></span>
                      <span className="text-slate-300 font-light">|</span>
                      <span className="text-indigo-700">W punkcie: <strong className="text-indigo-900 font-black">{lessonComparisonData.total.snap}</strong></span>
                      <span className="text-slate-300 font-light">|</span>
                      <span>Różnica: 
                        {lessonComparisonData.total.diff > 0 ? (
                          <strong className="text-emerald-700 font-black px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 ml-1">+{lessonComparisonData.total.diff}</strong>
                        ) : lessonComparisonData.total.diff < 0 ? (
                          <strong className="text-rose-700 font-black px-1.5 py-0.5 bg-rose-50 rounded border border-rose-100 ml-1">{lessonComparisonData.total.diff}</strong>
                        ) : (
                          <strong className="text-slate-500 font-black px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 ml-1">Bez zmian</strong>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview action buttons */}
              <div className="flex items-center justify-end gap-2 shrink-0 pt-0.5 select-none">
                <button
                  type="button"
                  onClick={() => setShowLessonComparison(!showLessonComparison)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 border ${
                    showLessonComparison 
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300' 
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300'
                  }`}
                  title="Wyświetl szczegółowe porównanie rozkładu godzin i liczby lekcji"
                >
                  <BarChart2 size={13} />
                  <span>{showLessonComparison ? 'Ukryj porównanie' : 'Porównaj ze stanem obecnym'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSnapshotId(null)}
                  className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-black border border-slate-200 rounded-lg text-xs cursor-pointer select-none transition"
                >
                  Zamknij podgląd
                </button>
                <button
                  type="button"
                  onClick={() => handleRestore(selectedSnapshot)}
                  className="px-5 py-1.5 bg-violet-600 hover:bg-violet-750 text-white font-black rounded-lg text-xs cursor-pointer select-none transition flex items-center gap-1.5 shadow-xs border-none"
                >
                  <Check size={13} className="stroke-[3]" />
                  <span>Przywróć ten stan</span>
                </button>
              </div>
            </div>
          )}

          {/* Historia Autozapisów (Wersjonowanie) */}
          {managerTab === 'autosave' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-md space-y-3 select-none">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                    <Clock size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-tight text-slate-100 font-sans">Automatyczne wersje bezpieczeństwa</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed font-sans mt-0.5">
                      System automatycznie rejestruje i przechowuje do 3 ostatnich unikalnych stanów roboczych Twojego planu lekcji podczas każdej modyfikacji. Dzięki temu Twoja praca jest zawsze zabezpieczona przed przypadkowym odświeżeniem strony, awarią przeglądarki czy błędną edycją! Kliknij dowolną wersję, aby podglądnąć statystyki i porównać ją ze stanem obecnym.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider select-none">
                  Kopie automatyczne ({autosaveVersions.length})
                </span>

                {autosaveVersions && autosaveVersions.length > 0 ? (
                  <div className="space-y-2.5">
                    {autosaveVersions.map((version, index) => {
                      if (!version) return null;
                      
                      let dateStr = 'Brak daty';
                      try {
                        if (version.timestamp) {
                          const stamp = new Date(version.timestamp);
                          if (!isNaN(stamp.getTime())) {
                            dateStr = `${stamp.toLocaleDateString('pl-PL')} ${stamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                          }
                        }
                      } catch (e) {}

                      const verLessons = countLessons(version.schedData);
                      const verTeachers = version.appState.teachers?.length || version.appState.planLekcji?.teachers?.length || 0;
                      const verClasses = version.appState.classes?.length || version.appState.planLekcji?.classes?.length || 0;
                      
                      const isSelected = selectedSnapshotId === version.id;

                      return (
                        <div 
                          key={version.id || index}
                          onClick={() => setSelectedSnapshotId(isSelected ? null : version.id)}
                          className={`transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-50/90 border-2 border-amber-500 shadow-md ring-1 ring-amber-500/15' 
                              : 'bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs group'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isSelected && (
                                <span className="bg-amber-500 text-slate-950 rounded-full p-0.5 flex items-center justify-center shrink-0">
                                  <Check size={8} className="stroke-[4]" />
                                </span>
                              )}
                              <span className={`text-xs font-black transition-colors ${isSelected ? 'text-amber-950 font-extrabold font-sans' : 'text-slate-900 group-hover:text-amber-700 font-sans'}`}>
                                Stan automatyczny #{index + 1}
                              </span>
                              <span className={`border font-black px-1.5 py-0.5 rounded text-[8px] uppercase font-mono tracking-wider ${
                                isSelected 
                                  ? 'bg-amber-100 text-amber-800 border-amber-200/60' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200/60'
                              }`}>
                                {version.appState?.yearLabel || 'Plan'}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200/40">
                                Autozapis
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold select-none">
                              <span className="flex items-center gap-0.5 whitespace-nowrap text-slate-500 font-bold font-sans">
                                <Clock size={11} className={isSelected ? 'text-amber-500' : 'text-slate-400'} />
                                📅 {dateStr}
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className={`${isSelected ? 'text-amber-800' : 'text-slate-500'}`}>
                                lekcje: <strong>{verLessons}</strong>
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className={isSelected ? 'text-slate-600' : 'text-slate-500'}>
                                klasy: <strong>{verClasses}</strong>
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className={isSelected ? 'text-slate-600' : 'text-slate-500'}>
                                naucz.: <strong>{verTeachers}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRestoreAutosave(version); }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 border border-none ${
                                isSelected 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs' 
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                              }`}
                              title="Przywróć tę automatyczną wersję bezpieczeństwa"
                            >
                              <Check size={11} className="stroke-[3]" />
                              <span>Przywróć tę wersję</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 select-none">
                    <Clock size={20} className="mx-auto text-slate-300 mb-2" />
                    <div className="space-y-1">
                      <p className="font-bold text-slate-500">Brak wersji autozapisu.</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Dokonaj jakiejkolwiek zmiany w planie lekcji, a system automatycznie zachowa poprzedni stan w tej sekcji.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List of Snapshots */}
          {managerTab === 'manual' && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider select-none">
                Zapisane punkty przywracania ({filteredSnapshots.length})
              </span>

            {filteredSnapshots.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredSnapshots.map((snap) => {
                  if (!snap) return null;
                  
                  let dateStr = 'Brak daty';
                  try {
                    if (snap.createdAt) {
                      const stamp = new Date(snap.createdAt);
                      if (!isNaN(stamp.getTime())) {
                        dateStr = `${stamp.toLocaleDateString('pl-PL')} ${stamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                      }
                    }
                  } catch (e) {
                    console.error('Error rendering snapshot date:', e);
                  }

                  const isSelected = selectedSnapshotId === snap.id;
                  return (
                    <div 
                      key={snap.id || Math.random().toString()} 
                      onClick={() => setSelectedSnapshotId(isSelected ? null : snap.id)}
                      className={`transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-xl cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/75 border-2 border-indigo-600 shadow-sm ring-1 ring-indigo-600/10' 
                          : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs group'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSelected && (
                            <span className="bg-indigo-600 text-white rounded-full p-0.5 flex items-center justify-center shrink-0">
                              <Check size={8} className="stroke-[4]" />
                            </span>
                          )}
                          <span className={`text-xs font-black transition-colors ${isSelected ? 'text-indigo-900 font-extrabold' : 'text-slate-900 group-hover:text-indigo-900'}`}>
                            {snap.name || 'Wersja bez nazwy'}
                          </span>
                          <span className={`border font-black px-1.5 py-0.5 rounded text-[8px] uppercase font-mono tracking-wider ${
                            isSelected 
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-200/60' 
                              : 'bg-slate-100 text-slate-600 border-slate-200/60'
                          }`}>
                            {snap.appState?.yearLabel || 'Plan'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold select-none">
                          <span className="flex items-center gap-0.5 whitespace-nowrap">
                            <Clock size={11} className={isSelected ? 'text-indigo-500' : 'text-slate-400'} />
                            {dateStr}
                          </span>
                          
                          {snap.stats && typeof snap.stats === 'object' && (
                            <>
                              <span className="text-slate-250 font-black">|</span>
                              <span className={`${isSelected ? 'text-indigo-700' : 'text-indigo-600'} block`}>
                                📅 lekcje: <strong>{snap.stats.assignedLessonsCount ?? 0}</strong>
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className={isSelected ? 'text-slate-600' : 'text-slate-500'}>
                                klasy: <strong>{snap.stats.classesCount ?? 0}</strong>
                              </span>
                              <span className="text-slate-250 font-black">|</span>
                              <span className={isSelected ? 'text-slate-600' : 'text-slate-500'}>
                                naucz.: <strong>{snap.stats.teachersCount ?? 0}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        {snap.comment && (
                          <div className={`text-[10.5px] p-2 rounded-lg mt-1 pr-4 max-w-lg leading-relaxed leading-normal font-medium flex items-start gap-1 ${
                            isSelected 
                              ? 'text-indigo-950 bg-indigo-100/50 border border-indigo-200/50' 
                              : 'text-slate-500 bg-slate-50 border border-slate-100/70'
                          }`}>
                            <Bookmark size={11} className={`${isSelected ? 'text-indigo-500' : 'text-violet-400'} mt-0.5 shrink-0`} />
                            <span className="italic">{snap.comment}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRestore(snap); }}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 border ${
                            isSelected 
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs' 
                              : 'bg-violet-50 hover:bg-violet-100 text-violet-700 hover:text-violet-900 border-violet-200 hover:border-violet-300'
                          }`}
                          title="Przywróć cały harmonogram i ustawienia szkoły z tego punktu"
                        >
                          <Check size={11} className="stroke-[3]" />
                          <span>Przywróć</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleExportSingle(snap); }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Wyeksportuj ten pojedynczy punkt do pliku .json"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(snap.id, snap.name || ''); }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
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
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Kliknij niebieski przycisk "Utwórz punkt" po prawej stronie, aby zapisać obecny stan planu.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

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

        {/* Custom Confirmation Dialog Modal */}
        {confirmConfig && (
          <div className="absolute inset-0 z-[1200] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-900 text-white flex items-center gap-2 select-none">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider leading-none text-white">{confirmConfig.title}</h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {confirmConfig.message}
                </p>
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmConfig(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 rounded-lg text-xs cursor-pointer select-none transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={confirmConfig.onConfirm}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs cursor-pointer select-none transition"
                  >
                    Potwierdź
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Dialog Modal */}
        {alertConfig && (
          <div className="absolute inset-0 z-[1200] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-900 text-white flex items-center gap-2 select-none">
                <Info size={16} className="text-blue-400 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider leading-none text-white">{alertConfig.title}</h3>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {alertConfig.message}
                </p>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setAlertConfig(null)}
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-lg text-xs cursor-pointer select-none transition"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
