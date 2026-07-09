import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppState, SchedData, ArchiveEntry, SnapshotEntry, SchedCell, Assignment, Teacher, Subject, ClassRoom, AppEventLog, AutosaveVersion
} from './types';
import { 
  getDemoAppState, getDemoSchedData, downloadFile, getStorageSize, formatBytes, mergeClassNames 
} from './utils';
import PlanKlas from './components/PlanKlas';
import PlanSal from './components/PlanSal';
import Dyzury from './components/Dyzury';
import KreatorSzkoly from './components/KreatorSzkoly';
import Wydruki from './components/Wydruki';
import Statystyki from './components/Statystyki';
import OProgramie from './components/OProgramie';
import UstawieniaGeneratorow from './components/UstawieniaGeneratorow';
import SnapshotManager from './components/SnapshotManager';
import BackupPasswordModal from './components/BackupPasswordModal';
import { encryptText, decryptText, isEncryptedBackup } from './lib/crypto';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Layers, MapPin, Shield, Download, Upload, Trash2, RotateCcw, RotateCw, RefreshCw, Layers2, FileText, Sparkles, Menu, X, Printer, BarChart2,
  Maximize2, Minimize2, HelpCircle, History, Camera, Plus, Clock, Bookmark, AlertTriangle, Check, Search, Sliders, Eye, EyeOff, ChevronRight
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

  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>(() => {
    const saved = localStorage.getItem('saleplan_v3_snapshots');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { }
    }
    return [];
  });

  const [autosaveVersions, setAutosaveVersions] = useState<AutosaveVersion[]>(() => {
    const saved = localStorage.getItem('saleplan_v3_autosave_versions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [historyLogs, setHistoryLogs] = useState<AppEventLog[]>(() => {
    const saved = localStorage.getItem('saleplan_v3_history_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: 'init-system',
        timestamp: new Date().toISOString(),
        actionType: 'other',
        description: 'Zainicjalizowano dziennik pracy programu',
        details: 'Dziennik jest gotowy do monitorowania operacji użytkownika.'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('saleplan_v3_history_logs', JSON.stringify(historyLogs));
  }, [historyLogs]);

  const addEventLog = (actionType: AppEventLog['actionType'], description: string, details?: string) => {
    const newLog: AppEventLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now(),
      timestamp: new Date().toISOString(),
      actionType,
      description,
      details
    };
    setHistoryLogs(prev => [newLog, ...prev.slice(0, 99)]); // keep up to 100 entries for stability
  };

  const handleChangeSnapshots = (newSnaps: SnapshotEntry[]) => {
    if (newSnaps.length > snapshots.length) {
      const added = newSnaps.find(n => !snapshots.some(s => s && s.id === n.id));
      if (added) {
        addEventLog(
          'snapshot_create',
          'Utworzono punkt przywracania (Snapshot)',
          `Nazwa: "${added.name}".` + (added.comment ? ` Komentarz: "${added.comment}"` : '')
        );
      }
    } else if (newSnaps.length < snapshots.length) {
      const deleted = snapshots.find(s => s && !newSnaps.some(n => n.id === s.id));
      if (deleted) {
        addEventLog(
          'snapshot_delete',
          'Usunięto punkt przywracania (Snapshot)',
          `Nazwa: "${deleted.name}".`
        );
      }
    } else if (newSnaps.length === 0 && snapshots.length > 0) {
      addEventLog(
        'snapshot_delete',
        'Wyczyszczono wszystkie punkty przywracania',
        'Usunięto bezpowrotnie wszystkie zapisane kopie zapasowe planu.'
      );
    }
    setSnapshots(newSnaps);
  };

  const pushAutosaveVersion = (newAppState: AppState, newSchedData: SchedData) => {
    try {
      const saved = localStorage.getItem('saleplan_v3_autosave_versions');
      let versions: AutosaveVersion[] = [];
      if (saved) {
        try {
          versions = JSON.parse(saved);
          if (!Array.isArray(versions)) versions = [];
        } catch (e) {}
      }

      // Check if state actually changed from the last version
      if (versions.length > 0) {
        const last = versions[0];
        const currentHash = JSON.stringify({ appState: newAppState, schedData: newSchedData });
        const lastHash = JSON.stringify({ appState: last.appState, schedData: last.schedData });
        if (currentHash === lastHash) {
          return; // No real change, don't duplicate
        }
      }

      const newVersion: AutosaveVersion = {
        id: `autosave-${Date.now()}`,
        timestamp: new Date().toISOString(),
        appState: JSON.parse(JSON.stringify(newAppState)),
        schedData: JSON.parse(JSON.stringify(newSchedData)),
      };

      const nextVersions = [newVersion, ...versions].slice(0, 3);
      localStorage.setItem('saleplan_v3_autosave_versions', JSON.stringify(nextVersions));
      setAutosaveVersions(nextVersions);
    } catch (e) {
      console.error('Błąd podczas wersjonowania autozapisu:', e);
    }
  };

  const [currentTab, setCurrentTab] = useState<'plan_klas' | 'plan_sal' | 'dyzury' | 'kreator' | 'wydruki' | 'statystyki' | 'o_programie' | 'ustawienia_generatorow'>('kreator');
  const [oProgramieTab, setOProgramieTab] = useState<'info' | 'changelog'>('info');

  const CURRENT_VERSION = '3.1.0';
  const [showVersionToast, setShowVersionToast] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('saleplan_last_seen_version');
    if (lastSeen !== CURRENT_VERSION) {
      const timer = setTimeout(() => {
        setShowVersionToast(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismissVersionToast = () => {
    localStorage.setItem('saleplan_last_seen_version', CURRENT_VERSION);
    setShowVersionToast(false);
  };

  const handleOpenChangelog = () => {
    localStorage.setItem('saleplan_last_seen_version', CURRENT_VERSION);
    setShowVersionToast(false);
    setOProgramieTab('changelog');
    setCurrentTab('o_programie');
  };
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [showSnapshotManager, setShowSnapshotManager] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // States for optional backup encryption
  const [showBackupPasswordModal, setShowBackupPasswordModal] = useState(false);
  const [backupPasswordMode, setBackupPasswordMode] = useState<'export' | 'import'>('export');
  const [pendingEncryptedContent, setPendingEncryptedContent] = useState<string | null>(null);
  const [backupModalError, setBackupModalError] = useState('');

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
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

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

  // ── LOCALSTORAGE PERSISTENCE EFFECTS (DEBOUNCED) ──
  const isInitialMount = React.useRef(true);
  const stateRef = React.useRef({ appState, schedData });

  // Update stateRef on edits to ensure the latest values are captured 
  useEffect(() => {
    stateRef.current = { appState, schedData };
  }, [appState, schedData]);

  // Unified debounced save effect for appState and schedData
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');

    const handler = setTimeout(() => {
      setSaveStatus('saving');
      // Elegant micro-delay to allow visual status feedback
      setTimeout(() => {
        try {
          localStorage.setItem('saleplan_v3_app_state', JSON.stringify(stateRef.current.appState));
          localStorage.setItem('saleplan_v3_sched_data', JSON.stringify(stateRef.current.schedData));
          pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
          setSaveStatus('saved');
        } catch (e) {
          console.error('Błąd zapisu autozapisu', e);
          setSaveStatus('saved');
        }
      }, 250);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [appState, schedData]);

  // Force instant save on tab switch
  useEffect(() => {
    if (isInitialMount.current) return;
    
    try {
      setSaveStatus('saving');
      localStorage.setItem('saleplan_v3_app_state', JSON.stringify(stateRef.current.appState));
      localStorage.setItem('saleplan_v3_sched_data', JSON.stringify(stateRef.current.schedData));
      pushAutosaveVersion(stateRef.current.appState, stateRef.current.schedData);
      setSaveStatus('saved');
      addEventLog('other', 'Automatyczny zapis przy zmianie zakładki', `Zapisano stan programu przy przełączeniu na zakładkę "${currentTab}".`);
    } catch (e) {
      console.error('Błąd natychmiastowego zapisu przy zmianie zakładki', e);
      setSaveStatus('saved');
    }
  }, [currentTab]);

  // Unload fallback to secure any unsaved drafts instantly
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('saleplan_v3_app_state', JSON.stringify(stateRef.current.appState));
        localStorage.setItem('saleplan_v3_sched_data', JSON.stringify(stateRef.current.schedData));
      } catch (e) {
        console.error('Błąd zapisu przy opuszczeniu strony', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Sync archive immediately (low frequency, separate key)
  useEffect(() => {
    localStorage.setItem('saleplan_v3_archive', JSON.stringify(archive));
  }, [archive]);

  // Sync snapshots immediately
  useEffect(() => {
    localStorage.setItem('saleplan_v3_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

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
    addEventLog('undo', 'Cofnięto zmianę planu (Undo)', 'Przywrócono poprzedni stan rozmieszczenia sal / dyżurów.');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(schedData))]);
    setSchedData(next);
    setRedoStack(prev => prev.slice(0, -1));
    addEventLog('redo', 'Ponowiono zmianę planu (Redo)', 'Zastosowano ponownie uprzednio cofniętą operację.');
  };

  // ── KEYBOARD SHORTCUTS FOR UNDO / REDO ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
        notify('Wyłączono tryb prezentacji', 'info');
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeEl.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack, schedData, isPresentationMode]);

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

          // Deduplicate inter-class shared lessons: only process them for the primary class
          if (asg.linkedClassIds && asg.linkedClassIds.length > 0 && cls.id !== asg.classId) {
            return;
          }

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
            const extraClasses = asg.linkedClassIds && asg.linkedClassIds.length > 0
              ? (asg.linkedClassIds.map(id => pl.classes.find(c => c.id === id)?.name).filter(Boolean) as string[])
              : [];
            
            const combinedClasses = [cls.name, ...extraClasses];
            const newCell: SchedCell = {
              teacherAbbr: teacher?.abbr || '?',
              supportTeacherAbbr: suppTeacher?.abbr || undefined,
              classes: combinedClasses,
              className: mergeClassNames(combinedClasses).join('+'),
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
    addEventLog(
      'import',
      'Import siatki z Planu Klas (Etap 1)',
      `Przeniesiono pomyślnie ${countTransfer} jednostek lekcyjnych i sal do gabinetów.`
    );
  };

  // ── SNAPSHOT ACTIONS ──
  const validateSnapshotData = (state: any, sched: any): boolean => {
    if (!state || typeof state !== 'object') {
      notify('Błąd spójności danych: Stan aplikacji ma nieprawidłowy format.', 'err');
      return false;
    }
    if (!sched || typeof sched !== 'object') {
      notify('Błąd spójności danych: Harmonogram lekcji ma nieprawidłowy format.', 'err');
      return false;
    }
    if (typeof state.yearKey !== 'string' || !state.yearKey) {
      notify('Błąd spójności danych: Brak identyfikatora roku (yearKey).', 'err');
      return false;
    }
    if (!state.school || typeof state.school !== 'object' || typeof state.school.name !== 'string') {
      notify('Błąd spójności danych: Brak lub uszkodzona struktura danych szkoły.', 'err');
      return false;
    }
    if (!state.planLekcji || typeof state.planLekcji !== 'object') {
      notify('Błąd spójności danych: Brak struktury planu lekcji.', 'err');
      return false;
    }
    const pl = state.planLekcji;
    if (!Array.isArray(pl.hours) || !Array.isArray(pl.classes) || !Array.isArray(pl.teachers) || !Array.isArray(pl.subjects)) {
      notify('Błąd spójności danych: Brak wymaganych list (godziny, klasy, nauczyciele lub przedmioty).', 'err');
      return false;
    }
    if (!state.dyzury || typeof state.dyzury !== 'object' || !Array.isArray(state.dyzury.miejsca) || !Array.isArray(state.dyzury.przerwy)) {
      notify('Błąd spójności danych: Brak lub uszkodzona sekcja dyżurów.', 'err');
      return false;
    }
    return true;
  };

  const handleRestoreSnapshotState = (restoredAppState: AppState, restoredSchedData: SchedData) => {
    const startTime = performance.now();
    console.group('⏱️ Rozpoczęcie procedury przywracania stanu z punktu przywracania (Snapshot)');
    
    if (!validateSnapshotData(restoredAppState, restoredSchedData)) {
      console.error('❌ Walidacja spójności danych przywracanego punktu nie powiodła się.');
      console.groupEnd();
      throw new Error('Walidacja spójności danych nie powiodła się.');
    }

    // Obliczenie statystyk przywracanych obiektów dla ułatwienia debugowania
    const classesCount = restoredAppState.planLekcji?.classes?.length || 0;
    const teachersCount = restoredAppState.planLekcji?.teachers?.length || 0;
    const roomsCount = restoredAppState.planLekcji?.rooms?.length || 0;
    const subjectsCount = restoredAppState.planLekcji?.subjects?.length || 0;
    const assignmentsCount = restoredAppState.planLekcji?.assignments?.length || 0;
    const lessonsCount = Object.keys(restoredAppState.planLekcji?.lessons || {}).length;

    const specialStudentsCount = restoredAppState.planLekcji?.specialStudents?.length || 0;
    const specialAssignmentsCount = restoredAppState.planLekcji?.specialAssignments?.length || 0;
    const specialLessonsCount = Object.keys(restoredAppState.planLekcji?.specialLessons || {}).length;

    const dutyPlacesCount = restoredAppState.dyzury?.miejsca?.length || 0;
    const dutyScheduleCount = Object.keys(restoredAppState.dyzury?.harmonogram || {}).length;

    let schedCellsCount = 0;
    if (restoredSchedData) {
      for (const yKey in restoredSchedData) {
        const yearData = restoredSchedData[yKey];
        if (yearData) {
          for (const dIdx in yearData) {
            const dayData = yearData[+dIdx];
            if (dayData) {
              for (const hKey in dayData) {
                const hData = dayData[hKey];
                if (hData) {
                  schedCellsCount += Object.keys(hData).length;
                }
              }
            }
          }
        }
      }
    }

    console.log('📊 Przywracane struktury danych i obiekty:');
    console.log(`- Klasy: ${classesCount}`);
    console.log(`- Nauczyciele: ${teachersCount}`);
    console.log(`- Sale lekcyjne: ${roomsCount}`);
    console.log(`- Przedmioty: ${subjectsCount}`);
    console.log(`- Przydziały (Assignments): ${assignmentsCount}`);
    console.log(`- Obsadzone lekcje (Lessons): ${lessonsCount}`);
    console.log(`- Uczniowie ze spec. potrzebami: ${specialStudentsCount}`);
    console.log(`- Specjalne przydziały / lekcje: ${specialAssignmentsCount} / ${specialLessonsCount}`);
    console.log(`- Miejsca dyżurów / zaplanowane dyżury: ${dutyPlacesCount} / ${dutyScheduleCount}`);
    console.log(`- Komórki harmonogramu (SchedData): ${schedCellsCount}`);

    // Save active schedule into undo history so the user can easily revert a restore action if needed
    pushToUndo(schedData);
    handleUpdateAppState(restoredAppState);
    setSchedData(restoredSchedData);

    const duration = performance.now() - startTime;
    console.log(`✅ Synchronizacja stanów i struktur zakończona pomyślnie.`);
    console.log(`⏱️ Czas procesowania logicznego: ${duration.toFixed(2)} ms`);
    console.groupEnd();

    notify('Przywrócono stan planu do wybranego punktu przywracania', 'ok');
    addEventLog(
      'restore',
      'Przywrócono plan z punktu przywracania',
      `Zaktualizowano całą konfigurację dla szkoły "${restoredAppState.school?.name || ''}" (${restoredAppState.yearLabel || ''}). Proces trwał ${duration.toFixed(2)} ms.`
    );
  };

  // ── JSON BACKUPS ACTIONS ──
  const handleExportBackup = () => {
    setBackupPasswordMode('export');
    setBackupModalError('');
    setShowBackupPasswordModal(true);
  };

  const handleExecuteExport = async (password?: string) => {
    const backupObj = {
      version: '3.1.0',
      appState,
      schedData,
      timestamp: new Date().toISOString()
    };
    
    const rawJson = JSON.stringify(backupObj, null, 2);
    const fileName = `saleplan-plan-szkoly-${appState.school.short.toLowerCase() || 'v3'}`;

    try {
      if (password) {
        const encrypted = await encryptText(rawJson, password);
        downloadFile(encrypted, `${fileName}-secured.json`, 'application/json');
        notify('Wyeksportowano zabezpieczone hasłem archiwum JSON', 'ok');
      } else {
        downloadFile(rawJson, `${fileName}.json`, 'application/json');
        notify('Wyeksportowano archiwum JSON', 'ok');
      }
      setShowBackupPasswordModal(false);
    } catch (err) {
      notify('Błąd podczas eksportowania kopii', 'err');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so same file can be selected again
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rawContent = evt.target?.result as string;
      if (!rawContent) return;

      if (isEncryptedBackup(rawContent)) {
        setPendingEncryptedContent(rawContent);
        setBackupPasswordMode('import');
        setBackupModalError('');
        setShowBackupPasswordModal(true);
      } else {
        try {
          const data = JSON.parse(rawContent);
          processImportedBackup(data);
        } catch (err) {
          notify('Błąd odczytu pliku kopii - niepoprawny format JSON', 'err');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteDecryptAndImport = async (password: string) => {
    if (!pendingEncryptedContent) return;
    try {
      const decrypted = await decryptText(pendingEncryptedContent, password);
      const data = JSON.parse(decrypted);
      processImportedBackup(data);
      
      setShowBackupPasswordModal(false);
      setPendingEncryptedContent(null);
    } catch (err: any) {
      setBackupModalError(err.message || 'Niepoprawne hasło lub błąd odszyfrowywania.');
    }
  };

  const processImportedBackup = (data: any) => {
    if (data.appState && data.schedData) {
      pushToUndo(schedData);
      handleUpdateAppState(data.appState);
      setSchedData(data.schedData);
      notify('Pomyślnie wczytano archiwum lekcyjne!', 'ok');
      addEventLog(
        'import',
        'Wczytano kopię zapasową JSON (plik)',
        `Pomyślnie przywrócono stan planu lekcji i konfigurację dla szkoły "${data.appState.school?.name || ''}".`
      );
    } else {
      notify('Błędny format pliku archiwum', 'err');
    }
  };

  const handleResetTimetable = () => {
    if (!confirm('Czy jesteś PEWIEN, że chcesz zresetować cały plan lekcji, czyścić gabinety oraz dyżury?')) return;
    pushToUndo(schedData);
    handleUpdateAppState(getDemoAppState());
    setSchedData({});
    notify('Zresetowano całą konfigurację programu', 'ok');
    addEventLog(
      'reset',
      'Zresetowano konfigurację i wyczyszczono plan',
      'Wycofano wszystkie dane do stanu demonstracyjnego (demo).'
    );
  };

  const notify = (msg: string, type: 'ok' | 'err' | 'info' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg z-[9999] ${
      type === 'ok' ? 'border-emerald-500' : type === 'info' ? 'border-amber-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <div className={`flex flex-col h-screen w-screen bg-slate-100 font-sans overflow-hidden ${isRestoring ? 'pointer-events-none select-none' : ''}`}>
      
      {/* ── PODSTAWOWY NAGŁÓWEK SYSTEMOWY ── */}
      {!isPresentationMode && (
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
              {currentTab === 'ustawienia_generatorow' && <><Sliders size={13} className="text-indigo-400 font-bold" /> ⚙️ Ustawienia generatorów</>}
              {currentTab === 'o_programie' && <><HelpCircle size={13} className="text-sky-400 font-bold" /> ℹ️ O programie & regulamin</>}
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

                  <div className="border-t border-slate-800/60 my-1 pb-1" />

                  <button
                    onClick={() => { setCurrentTab('ustawienia_generatorow'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'ustawienia_generatorow'
                        ? 'bg-indigo-600/10 border-l-4 border-indigo-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sliders size={15} className={`shrink-0 mt-0.5 ${currentTab === 'ustawienia_generatorow' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">⚙️ Ustawienia generatorów</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase font-mono">Kryteria i wagi algorytmów</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-800/60 my-1 pb-1" />

                  <button
                    onClick={() => { setCurrentTab('o_programie'); setOProgramieTab('info'); setHamburgerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2.5 hover:bg-slate-800/60 ${
                      currentTab === 'o_programie'
                        ? 'bg-sky-600/10 border-l-4 border-sky-500 text-white font-extrabold pl-2'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <HelpCircle size={15} className={`shrink-0 mt-0.5 ${currentTab === 'o_programie' ? 'text-sky-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-black block">ℹ️ O programie & regulamin</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5 font-bold uppercase">Opis, licencja i warunki</span>
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
            <button 
              onClick={() => {
                setIsPresentationMode(!isPresentationMode);
                notify(isPresentationMode ? 'Wyłączono tryb prezentacji' : 'Włączono tryb prezentacji (Esc aby wyjść)', 'info');
              }}
              className={`p-1.5 rounded-lg transition select-none cursor-pointer ${
                isPresentationMode ? 'text-amber-400 bg-slate-800 hover:bg-slate-750' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isPresentationMode ? "Wyjdź z trybu prezentacji" : "Włącz tryb prezentacji (Prezentacja)"}
            >
              {isPresentationMode ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button 
            onClick={() => setShowSnapshotManager(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs font-extrabold flex items-center gap-1.5 bg-slate-950 px-3 py-2 border border-slate-800/85 hover:border-violet-500/50 cursor-pointer"
            title="Zarządzaj punktami przywracania planu (Snapshots)"
          >
            <History size={15} className="text-violet-400" />
            <span className="hidden lg:inline leading-none">Punkty przywracania</span>
            <span className="lg:hidden leading-none">Kopie planu</span>
            {snapshots.length > 0 && (
              <span className="bg-violet-600 font-extrabold text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center">
                {snapshots.length}
              </span>
            )}
          </button>

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
      )}

      {/* ── GŁÓWNA STREFA ZAKŁADEK (RENDER) ── */}
      <div className="flex-1 flex overflow-hidden px-0 mx-0">
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
            presentationMode={isPresentationMode}
          />
        )}
        {currentTab === 'plan_sal' && (
          <PlanSal 
            appState={appState} 
            schedData={schedData} 
            onChangeAppState={handleUpdateAppState} 
            onChangeSchedData={handleUpdateSchedData} 
            onImportFromPlanKlas={handleImportFromPlanKlas}
            presentationMode={isPresentationMode}
          />
        )}
        {currentTab === 'dyzury' && (
          <Dyzury 
            appState={appState} 
            onChangeAppState={handleUpdateAppState} 
            schedData={schedData}
            presentationMode={isPresentationMode}
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
            historyLogs={historyLogs}
            onClearHistoryLogs={() => setHistoryLogs([])}
          />
        )}
        {currentTab === 'ustawienia_generatorow' && (
          <UstawieniaGeneratorow 
            appState={appState} 
            onChangeAppState={handleUpdateAppState} 
          />
        )}
        {currentTab === 'o_programie' && (
          <OProgramie initialTab={oProgramieTab} />
        )}
      </div>

      {/* ── STOPKA STATYSTYCZNA LICENCJI ── */}
      {!isPresentationMode && (
        <footer className="bg-slate-900 border-t border-slate-950 text-slate-500 py-3 px-6 flex flex-col md:flex-row justify-between items-center gap-3.5 text-[10px] select-none shrink-0 font-medium">
        <div className="flex items-center gap-3">
          <span>Licencja: Edukacyjna (Zastrzeżona) · Offline Client-side App</span>
          <span className="text-slate-750 font-bold">|</span>
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px]">
            {saveStatus === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1 select-none">
                <RefreshCw size={10} className="animate-spin text-amber-400" /> Zapamiętywanie...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-indigo-400 flex items-center gap-1 select-none">
                ⌛ Oczekiwanie na zapis...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-500 flex items-center gap-1 select-none">
                ✓ Wszystkie zmiany zapisane w przeglądarce
              </span>
            )}
          </div>
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
      )}

      {/* Floating Presentation Mode Exit Indicator */}
      {isPresentationMode && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 bg-slate-900/95 hover:bg-slate-900 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-slate-800 text-white animate-fade-in">
          <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Tryb Prezentacji</span>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => {
              setIsPresentationMode(false);
              notify('Wyłączono tryb prezentacji', 'info');
            }}
            className="flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 uppercase cursor-pointer"
          >
            <EyeOff size={14} /> Wyjdź (Esc)
          </button>
        </div>
      )}

      <SnapshotManager
        isOpen={showSnapshotManager}
        onClose={() => setShowSnapshotManager(false)}
        appState={appState}
        schedData={schedData}
        snapshots={snapshots}
        onChangeSnapshots={handleChangeSnapshots}
        onRestoreSnapshot={handleRestoreSnapshotState}
        isRestoring={isRestoring}
        onRestoringChange={setIsRestoring}
        autosaveVersions={autosaveVersions}
      />

      <BackupPasswordModal
        isOpen={showBackupPasswordModal}
        onClose={() => {
          setShowBackupPasswordModal(false);
          setPendingEncryptedContent(null);
        }}
        mode={backupPasswordMode}
        onSubmit={(password) => {
          if (backupPasswordMode === 'export') {
            handleExecuteExport(password);
          } else {
            handleExecuteDecryptAndImport(password);
          }
        }}
        onSkip={() => {
          if (backupPasswordMode === 'export') {
            handleExecuteExport();
          }
        }}
        errorMsg={backupModalError}
      />

      {isRestoring && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-xs pointer-events-none cursor-wait select-none flex flex-col items-center justify-center text-white"
          id="restoring-pointer-blocker"
        >
          <div className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center shadow-2xl space-y-3 max-w-xs text-center pointer-events-none">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
            <div className="space-y-1">
              <p className="font-extrabold text-sm tracking-tight font-sans text-slate-100">Inicjalizacja danych...</p>
              <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">Trwa bezpieczna podmiana stanów i przebudowa widoków planu.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST WYKRYCIA NOWEJ WERSJI ── */}
      <AnimatePresence>
        {showVersionToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9000] max-w-sm bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 font-sans"
            id="version-changelog-toast"
          >
            <div className="flex gap-3">
              <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shrink-0 flex items-center justify-center h-10 w-10 shadow-lg shadow-amber-500/20">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-amber-500/25 text-amber-300 font-extrabold font-mono uppercase px-2 py-0.5 rounded-full tracking-wider">
                    Dostępna aktualizacja
                  </span>
                  <button 
                    onClick={handleDismissVersionToast}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                    title="Zamknij"
                  >
                    <X size={15} />
                  </button>
                </div>
                <h4 className="text-xs font-black tracking-tight text-slate-100">SalePlan Pro v3.1.0!</h4>
                <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed">
                  Zaimplementowano wykres zapotrzebowania na dyżury (Recharts), role administracyjne nauczycieli i przestrzenie przejściowe.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleOpenChangelog}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs hover:shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    Zobacz historię zmian <ChevronRight size={12} />
                  </button>
                  <button
                    onClick={handleDismissVersionToast}
                    className="text-slate-400 hover:text-slate-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition hover:bg-slate-800 cursor-pointer"
                  >
                    Pomiń
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
