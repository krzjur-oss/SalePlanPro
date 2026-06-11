import React, { useState, useMemo, useEffect } from 'react';
import { 
  AppState, Class, Teacher, Subject, ClassRoom, SchoolGroup, Assignment, Building, MiejsceDyzuru, Floor, Hour, Przerwa, ArchiveEntry, PlanDyzuryState,
  SpecialStudent, SpecialAssignment
} from '../types';
import { 
  Building as BuildingIcon, School as SchoolIcon, Users, BookOpen, GraduationCap, ShieldAlert, BadgePlus,
  Trash2, Landmark, CheckCircle, ArrowRight, ArrowLeft, Plus, Users2, HelpCircle, Eye, Shield, MapPin, Sparkles, Layers,
  Edit3, RefreshCw, X, Calendar
} from 'lucide-react';
import { uid, genAbbr, ensureUniqueAbbr, subjectAbbr } from '../utils';

const PALETTE_COLORS = [
  '#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', // Blues
  '#16a34a', '#15803d', '#10b981', '#34d399', // Greens / Teals
  '#d97706', '#b45309', '#f59e0b', '#fbbf24', // Ambers / Yellows
  '#dc2626', '#b91c1c', '#f87171', '#ef4444', // Reds
  '#e11d48', '#be123c', '#fb7185', '#fda4af', // Roses
  '#7c3aed', '#6d28d9', '#8b5cf6', '#a78bfa', // Purples
  '#db2777', '#c026d3', '#ec4899', '#f472b6', // Pinks
  '#0d9488', '#0f766e', '#14b8a6', '#2dd4bf', // Teals
  '#0891b2', '#06b6d4', '#22d3ee', '#0097a7', // Cyans / Turquoises
  '#ea580c', '#d35400', '#f97316', '#fb923c', // Oranges
  '#4f46e5', '#3949ab', '#6366f1', '#818cf8', // Indigos
  '#65a30d', '#4d7c0f', '#84cc16', '#a3e635', // Limes
  '#0284c7', '#0369a1', '#38bdf8', '#075985', // Sky blues
  '#5b21b6', '#311b92', '#701a75', '#4a148c', // Deep rich shades
  '#475569', '#334155', '#64748b', '#4b5563'  // Slate / Dark Grays
];

const getFloorAbbr = (floorOption: string, bld: Building | undefined): string => {
  if (!bld || !bld.hasCustomStructure || !bld.customFloors || bld.customFloors.length === 0) {
    return floorOption;
  }
  
  const parterIndex = bld.customFloors.findIndex(f => {
    const lf = f.toLowerCase();
    return lf.includes('parter') || lf === '0' || lf.includes('ground') || lf.includes('zero');
  });

  const idx = bld.customFloors.indexOf(floorOption);
  if (idx === -1) return floorOption;

  if (parterIndex !== -1) {
    const diff = idx - parterIndex;
    return diff > 0 ? `${diff}` : `${diff}`;
  } else {
    const numMatch = floorOption.match(/-?\d+/);
    if (numMatch) {
      return numMatch[0];
    }
    const romanMatch = floorOption.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
    if (romanMatch) {
      const rom = romanMatch[1].toUpperCase();
      const romanMap: Record<string, string> = {
        I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10'
      };
      return romanMap[rom];
    }
    return idx.toString();
  }
};

const getFloorDisplayName = (floorNum: string, bld: Building | undefined): string => {
  if (bld?.hasCustomStructure) {
    return floorNum;
  }
  const floorNames: Record<string, string> = {
    '-1': 'Podziemie',
    '0': 'Parter',
    '1': 'Piętro I',
    '2': 'Piętro II',
    '3': 'Piętro III',
    '4': 'Piętro IV'
  };
  return floorNames[floorNum] || `Piętro ${floorNum}`;
};

interface KreatorSzkolyProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onNavigateToTab: (tab: 'plan_klas' | 'plan_sal' | 'dyzury') => void;
  archive?: ArchiveEntry[];
  onChangeArchive?: (newArchive: ArchiveEntry[]) => void;
}

export default function KreatorSzkoly({ 
  appState, 
  onChangeAppState, 
  onNavigateToTab,
  archive = [],
  onChangeArchive
}: KreatorSzkolyProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  // Success Notification
  const [noti, setNoti] = useState<{ text: string; type: 'info' | 'success' } | null>(null);
  const showNoti = (text: string, type: 'info' | 'success' = 'success') => {
    setNoti({ text, type });
    setTimeout(() => setNoti(null), 3500);
  };

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // --- Step 1 States (Info) ---
  const [schoolName, setSchoolName] = useState(appState.school.name || '');
  const [schoolShort, setSchoolShort] = useState(appState.school.short || '');
  const [schoolPhone, setSchoolPhone] = useState(appState.school.phone || '');
  const [schoolWeb, setSchoolWeb] = useState(appState.school.web || '');
  const [schoolYear, setSchoolYear] = useState(appState.yearLabel || '2026/2027');

  // --- Copy Year states and methods ---
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [targetYear, setTargetYear] = useState(() => {
    const current = appState.yearLabel || '2026/2027';
    const match = current.match(/^(\d{4})\/(\d{4})$/);
    if (match) {
      const y1 = parseInt(match[1]) + 1;
      const y2 = parseInt(match[2]) + 1;
      return `${y1}/${y2}`;
    }
    return '2027/2028';
  });

  const [copyData, setCopyData] = useState({
    schoolInfo: true,
    infrastructure: true,
    subjects: true,
    teachers: true,
    classes: true,
    promoteClasses: true,
    assignments: true,
    dutySpots: true
  });

  const handleCopySchoolYear = () => {
    if (!targetYear.trim()) {
      showNoti('Wpisz prawidłowy rok szkolny (np. 2027/2028)', 'info');
      return;
    }

    const newYearKey = 'y_' + targetYear.trim().replace(/[\/\s-]/g, '_');

    // 1. Zapisz obecny rok w archiwum bazy
    const currentArchiveEntry: ArchiveEntry = {
      yearKey: appState.yearKey,
      label: appState.yearLabel,
      savedAt: new Date().toISOString(),
      config: appState
    };

    let updatedArchive = [...archive];
    const existingIdx = updatedArchive.findIndex(a => a.yearKey === appState.yearKey);
    if (existingIdx !== -1) {
      updatedArchive[existingIdx] = currentArchiveEntry;
    } else {
      updatedArchive.push(currentArchiveEntry);
    }

    if (onChangeArchive) {
      onChangeArchive(updatedArchive);
    }

    // 2. Buduj nową strukturę AppState
    const newSchool = copyData.schoolInfo 
      ? { ...appState.school }
      : { name: appState.school.name, short: appState.school.short };

    const newHours = copyData.schoolInfo ? [...appState.hours] : ['1', '2', '3', '4', '5'];
    const newTimeslots = copyData.schoolInfo ? [...appState.timeslots] : [
      { num: 1, start: '08:00', end: '08:45' },
      { num: 2, start: '08:55', end: '09:40' },
      { num: 3, start: '09:50', end: '10:35' },
      { num: 4, start: '10:55', end: '11:40' },
      { num: 5, start: '11:50', end: '12:35' }
    ];

    const newBuildings = copyData.infrastructure ? JSON.parse(JSON.stringify(appState.buildings)) : [];
    const newFloors = copyData.infrastructure ? JSON.parse(JSON.stringify(appState.floors)) : [];
    const newSubjects = copyData.subjects ? JSON.parse(JSON.stringify(appState.subjects)) : [];
    const newTeachers = copyData.teachers ? JSON.parse(JSON.stringify(appState.teachers)) : [];

    let newClasses: Class[] = [];
    if (copyData.classes) {
      const sourceClasses: Class[] = JSON.parse(JSON.stringify(appState.classes));
      if (copyData.promoteClasses) {
        // Promowanie klas
        sourceClasses.forEach(cl => {
          const match = cl.name.match(/^(\d+)(.*)$/) || cl.name.match(/^(Klasa\s+)(\d+)(.*)$/i);
          if (match) {
            let prefix = "";
            let numStr = "";
            let suffix = "";
            if (match.length === 3) {
              numStr = match[1];
              suffix = match[2];
            } else if (match.length === 4) {
              prefix = match[1];
              numStr = match[2];
              suffix = match[3];
            }
            const currentLevel = parseInt(numStr);
            const nextLevel = currentLevel + 1;

            let maxGradeInApp = 8;
            appState.classes.forEach(c => {
              const m = c.name.match(/^(\d+)/);
              if (m) {
                const lvl = parseInt(m[1]);
                if (lvl > maxGradeInApp) maxGradeInApp = lvl;
              }
            });

            if (nextLevel <= maxGradeInApp) {
              newClasses.push({
                ...cl,
                name: `${prefix}${nextLevel}${suffix}`
              });
            }
          } else {
            newClasses.push(cl);
          }
        });

        // Dodawanie nowych klas pierwszych (odpowiedniki starych pierwszych)
        sourceClasses.forEach(cl => {
          const match = cl.name.match(/^1(.*)$/);
          if (match) {
            const suffix = match[1];
            const exists = newClasses.some(nc => nc.name === `1${suffix}`);
            if (!exists) {
              const newbornId = `cl_new_${uid()}`;
              newClasses.push({
                id: newbornId,
                name: `1${suffix}`,
                color: cl.color,
                groupIds: [],
                group: cl.group,
                year: cl.year,
                students: cl.students,
                abbr: `1${suffix}`,
                baseClass: cl.baseClass
              });
            }
          }
        });
      } else {
        newClasses = sourceClasses;
      }
    }

    const newSchoolGroups = copyData.classes ? JSON.parse(JSON.stringify(appState.planLekcji.schoolGroups)) : [];

    let newAssignments: Assignment[] = [];
    if (copyData.assignments) {
      const sourceAssignments: Assignment[] = JSON.parse(JSON.stringify(appState.planLekcji.assignments));
      const activeClassIds = new Set(newClasses.map(c => c.id));
      const activeTeacherIds = new Set(newTeachers.map(t => t.id));
      const activeSubjectIds = new Set(newSubjects.map(s => s.id));

      newAssignments = sourceAssignments.filter(asg => {
        return activeClassIds.has(asg.classId) && 
               (asg.teacherId === null || activeTeacherIds.has(asg.teacherId)) && 
               activeSubjectIds.has(asg.subjectId);
      });
    }

    const newHomerooms = copyData.classes ? JSON.parse(JSON.stringify(appState.homerooms)) : {};

    let newDyzury: PlanDyzuryState;
    if (copyData.dutySpots) {
      newDyzury = {
        miejsca: JSON.parse(JSON.stringify(appState.dyzury.miejsca)),
        przerwy: JSON.parse(JSON.stringify(appState.dyzury.przerwy)),
        settings: JSON.parse(JSON.stringify(appState.dyzury.settings)),
        harmonogram: {}
      };
    } else {
      newDyzury = {
        miejsca: [],
        przerwy: [],
        settings: { autoBalance: true, maxPerTeacher: 5, excludeTeachers: [] },
        harmonogram: {}
      };
    }

    const finalAppState: AppState = {
      yearKey: newYearKey,
      yearLabel: targetYear.trim(),
      hours: newHours,
      timeslots: newTimeslots,
      school: newSchool,
      buildings: newBuildings,
      floors: newFloors,
      classes: newClasses,
      teachers: newTeachers,
      subjects: newSubjects,
      homerooms: newHomerooms,
      planLekcji: {
        meta: {
          schoolName: newSchool.name,
          year: targetYear.trim(),
          modifiedAt: new Date().toISOString()
        },
        hours: newTimeslots,
        classes: newClasses,
        teachers: newTeachers,
        rooms: copyData.infrastructure ? JSON.parse(JSON.stringify(appState.planLekcji.rooms)) : [],
        subjects: newSubjects,
        schoolGroups: newSchoolGroups,
        assignments: newAssignments,
        lessons: {},
        specialStudents: copyData.classes ? JSON.parse(JSON.stringify(appState.planLekcji.specialStudents || [])) : [],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      },
      dyzury: newDyzury
    };

    onChangeAppState(finalAppState);
    setSchoolName(newSchool.name || '');
    setSchoolShort(newSchool.short || '');
    setSchoolYear(targetYear.trim());
    setHoursList(newTimeslots);

    setActiveStep(1);
    setShowCopyPanel(false);
    showNoti(`Skopiowano ustawienia szkoły i rozpoczęto nowy rok szkolny: ${targetYear.trim()}`, 'success');
  };

  const handleLoadArchiveYear = (arch: ArchiveEntry) => {
    if (!confirm(`Czy na pewno chcesz wczytać dane dla roku szkolnego ${arch.label}? Niezapisane zmiany w obecnym roku zostaną nadpisane.`)) return;

    const currentArchiveEntry: ArchiveEntry = {
      yearKey: appState.yearKey,
      label: appState.yearLabel,
      savedAt: new Date().toISOString(),
      config: appState
    };

    let updatedArchive = [...archive];
    const existingIdx = updatedArchive.findIndex(a => a.yearKey === appState.yearKey);
    if (existingIdx !== -1) {
      updatedArchive[existingIdx] = currentArchiveEntry;
    } else {
      updatedArchive.push(currentArchiveEntry);
    }

    onChangeAppState(arch.config);
    setSchoolName(arch.config.school.name || '');
    setSchoolShort(arch.config.school.short || '');
    setSchoolPhone(arch.config.school.phone || '');
    setSchoolWeb(arch.config.school.web || '');
    setSchoolYear(arch.config.yearLabel || '2026/2027');
    setHoursList(arch.config.planLekcji.hours || arch.config.timeslots || []);

    if (onChangeArchive) {
      onChangeArchive(updatedArchive);
    }
    showNoti(`Załadowano rok szkolny: ${arch.label}`, 'success');
  };

  const handleDeleteArchiveYear = (yearKeyToDelete: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć rok szkolny z archiwum? Dane zostaną bezpowrotnie skasowane.`)) return;
    const updatedArchive = archive.filter(a => a.yearKey !== yearKeyToDelete);
    if (onChangeArchive) {
      onChangeArchive(updatedArchive);
    }
    showNoti(`Usunięto z archiwum`, 'success');
  };

  // Lesson Hours setup and editor state
  const [hoursList, setHoursList] = useState<Hour[]>(() => {
    return appState.planLekcji.hours && appState.planLekcji.hours.length > 0
      ? appState.planLekcji.hours
      : appState.timeslots && appState.timeslots.length > 0
        ? appState.timeslots
        : [
            { num: 1, start: '08:00', end: '08:45' },
            { num: 2, start: '08:55', end: '09:40' },
            { num: 3, start: '09:50', end: '10:35' },
            { num: 4, start: '10:55', end: '11:40' },
            { num: 5, start: '11:50', end: '12:35' }
          ];
  });
  
  // Quick bell scheduler generator state
  const [genStart, setGenStart] = useState('08:00');
  const [genLessonMin, setGenLessonMin] = useState(45);
  const [genBreakMin, setGenBreakMin] = useState(10);
  const [genLongBreakMin, setGenLongBreakMin] = useState(20);
  const [genLongBreakAfter, setGenLongBreakAfter] = useState(3);
  const [genCount, setGenCount] = useState(7);
  const [syncBreaks, setSyncBreaks] = useState(true);

  const handleGenerateHours = (e: React.FormEvent) => {
    e.preventDefault();
    const result: Hour[] = [];
    let [h, m] = genStart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      h = 8;
      m = 0;
    }
    
    for (let i = 1; i <= genCount; i++) {
      const startHourStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      // Add lesson duration
      let totalMins = h * 60 + m + genLessonMin;
      let endH = Math.floor(totalMins / 60) % 24;
      let endM = totalMins % 60;
      const endHourStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      
      result.push({
        num: i,
        start: startHourStr,
        end: endHourStr
      });
      
      // Calculate next start time
      if (i < genCount) {
        const currentBreak = (i === genLongBreakAfter) ? genLongBreakMin : genBreakMin;
        let nextTotalMins = totalMins + currentBreak;
        h = Math.floor(nextTotalMins / 60) % 24;
        m = nextTotalMins % 60;
      }
    }
    setHoursList(result);
    showNoti(`Wygenerowano pomyślnie ${genCount} godzin lekcyjnych!`);
  };

  const handleUpdateHourTime = (num: number, field: 'start' | 'end', val: string) => {
    setHoursList(prev => prev.map(item => {
      if (item.num === num) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleAddHourZero = () => {
    if (hoursList.some(h => h.num === 0)) {
      showNoti('Godzina 0 została już dodana!', 'info');
      return;
    }
    let newStart = '07:10';
    let newEnd = '07:55';
    if (hoursList.length > 0) {
      const first = hoursList.find(h => h.num === 1) || hoursList[0];
      const [sh, sm] = first.start.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm)) {
        const total = sh * 60 + sm - 50;
        const nsh = (Math.floor(total / 60) + 24) % 24;
        const nsm = (total % 60 + 60) % 60;
        newStart = `${String(nsh).padStart(2, '0')}:${String(nsm).padStart(2, '0')}`;
        
        const endTotal = total + 45;
        const neh = (Math.floor(endTotal / 60) + 24) % 24;
        const nem = (endTotal % 60 + 60) % 60;
        newEnd = `${String(neh).padStart(2, '0')}:${String(nem).padStart(2, '0')}`;
      }
    }
    setHoursList([{ num: 0, start: newStart, end: newEnd }, ...hoursList]);
    showNoti('Dodano godzinę 0 (przed lekcjami)');
  };

  const handleAddHourRow = () => {
    const nonZeroHours = hoursList.filter(h => h.num !== 0);
    const nextNum = nonZeroHours.length + 1;
    let newStart = '08:00';
    let newEnd = '08:45';
    
    if (hoursList.length > 0) {
      const last = hoursList[hoursList.length - 1];
      const [eh, em] = last.end.split(':').map(Number);
      if (!isNaN(eh) && !isNaN(em)) {
        // start next 10m later
        const total = eh * 60 + em + 10;
        const sh = Math.floor(total / 60) % 24;
        const sm = total % 60;
        newStart = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
        
        // end 45m later
        const endTotal = total + 45;
        const th = Math.floor(endTotal / 60) % 24;
        const tm = endTotal % 60;
        newEnd = `${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}`;
      }
    }
    setHoursList([...hoursList, { num: nextNum, start: newStart, end: newEnd }]);
    showNoti('Dodano nową godzinę lekcyjną');
  };

  const handleRemoveHourRow = (num: number) => {
    const filtered = hoursList.filter(h => h.num !== num);
    let seq = 1;
    const renumbered = filtered.map(h => {
      if (h.num === 0) return h;
      return { ...h, num: seq++ };
    });
    setHoursList(renumbered);
    showNoti('Usunięto godzinę lekcyjną');
  };

  const handleSaveStep1 = () => {
    if (!schoolName || !schoolShort) {
      showNoti('Nazwa szkoły i skrót są wymagane!', 'info');
      return;
    }
    if (hoursList.length === 0) {
      showNoti('Zdefiniuj przynajmniej jedną godzinę lekcyjną!', 'info');
      return;
    }
    
    const yearKey = 'y_' + schoolYear.replace(/[\/\s-]/g, '_');
    
    // Optional automatic synchronization of breaks for duty plans
    let updatedDyzury = { ...appState.dyzury };
    if (syncBreaks && hoursList.length > 1) {
      const calculatedBreaks: Przerwa[] = [];
      for (let i = 0; i < hoursList.length - 1; i++) {
        const currentLesson = hoursList[i];
        const nextLesson = hoursList[i + 1];
        calculatedBreaks.push({
          num: i + 1,
          start: currentLesson.end,
          end: nextLesson.start,
          name: `Przerwa po ${currentLesson.num}. lekcji`
        });
      }
      updatedDyzury.przerwy = calculatedBreaks;
    }

    onChangeAppState({
      ...appState,
      yearKey,
      yearLabel: schoolYear,
      hours: hoursList.map(h => String(h.num)),
      timeslots: hoursList,
      school: {
        name: schoolName,
        short: schoolShort,
        phone: schoolPhone,
        web: schoolWeb
      },
      planLekcji: {
        ...appState.planLekcji,
        hours: hoursList,
        meta: {
          ...appState.planLekcji.meta,
          schoolName: schoolName,
          year: schoolYear
        }
      },
      dyzury: updatedDyzury
    });

    showNoti(syncBreaks ? 'Zapisano informacje oraz zsynchronizowano dzwonki z przerwami dyżurów!' : 'Zapisano podstawowe informacje o dzwonkach i szkole');
    setActiveStep(2);
  };

  // --- Step 2 States (Buildings) ---
  const [editingBldId, setEditingBldId] = useState<string | null>(null);
  const [newBldName, setNewBldName] = useState('');
  const [newBldAddress, setNewBldAddress] = useState('');
  const [newBldIsZlecony, setNewBldIsZlecony] = useState(false); // multi flag used to signify outside/zlecony location
  const [newBldHasCustomStructure, setNewBldHasCustomStructure] = useState(false);
  const [newBldCustomFloors, setNewBldCustomFloors] = useState('');
  const [newBldCustomSegments, setNewBldCustomSegments] = useState('');

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
            hasCustomStructure: newBldHasCustomStructure,
            customFloors: parsedFloors.length > 0 ? parsedFloors : undefined,
            customSegments: parsedSegments.length > 0 ? parsedSegments : undefined
          };
        }
        return b;
      });

      // Update associated standard floor name if it exists (for compatibility)
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

      setEditingBldId(null);
      setNewBldName('');
      setNewBldAddress('');
      setNewBldIsZlecony(false);
      setNewBldHasCustomStructure(false);
      setNewBldCustomFloors('');
      setNewBldCustomSegments('');
      showNoti('Dane budynku zostały zaktualizowane pomyślnie');
    } else {
      // Add Mode
      const newBld: Building = {
        id: 'bld_' + uid(),
        name: newBldName.trim(),
        address: newBldAddress.trim() || undefined,
        multi: newBldIsZlecony, // true means zlecony / wynajmowany np. orlik, basen
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
          color: newBldIsZlecony ? '#f43f5e' : '#2563eb', // pink for outer, blue for local
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

      setNewBldName('');
      setNewBldAddress('');
      setNewBldIsZlecony(false);
      setNewBldHasCustomStructure(false);
      setNewBldCustomFloors('');
      setNewBldCustomSegments('');
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
        // Remove floors matching compiling buildingIdx
        const nextFloors = appState.floors
          .filter(f => f.buildingIdx !== idx)
          .map(f => {
            // Adjust lower indices
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

  // --- Step 3 States (Rooms) ---
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomFloorNum, setNewRoomFloorNum] = useState<string>('1'); // '0', '1', '2', '3', etc.
  const [newRoomSegmentChar, setNewRoomSegmentChar] = useState<string>('A'); // 'A', 'B', 'C', etc.
  const [newRoomAutomaticAbbr, setNewRoomAutomaticAbbr] = useState<boolean>(true);
  const [newRoomCustomAbbr, setNewRoomCustomAbbr] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomType, setNewRoomType] = useState<'ogolna' | 'wczesnoszkolna' | 'informatyka' | 'indywidualne' | 'sport'>('ogolna');
  const [newRoomBldIdx, setNewRoomBldIdx] = useState(0);

  // Sync room's level and segment with current building's custom structure choice
  useEffect(() => {
    const bld = appState.buildings[newRoomBldIdx];
    if (bld) {
      if (bld.hasCustomStructure) {
        if (bld.customFloors && bld.customFloors.length > 0) {
          setNewRoomFloorNum(bld.customFloors[0]);
        } else {
          setNewRoomFloorNum('0');
        }
        if (bld.customSegments && bld.customSegments.length > 0) {
          setNewRoomSegmentChar(bld.customSegments[0]);
        } else {
          setNewRoomSegmentChar('');
        }
      } else {
        setNewRoomFloorNum('1');
        setNewRoomSegmentChar('A');
      }
    }
  }, [newRoomBldIdx, appState.buildings]);

  // Helper to resolve room's floor & segment details for display
  const getRoomLocationInfo = (roomName: string) => {
    for (let fi = 0; fi < appState.floors.length; fi++) {
      const floor = appState.floors[fi];
      for (let si = 0; si < floor.segments.length; si++) {
        const seg = floor.segments[si];
        if (seg.rooms.some(rm => rm.num === roomName)) {
          const bldName = appState.buildings[floor.buildingIdx]?.name || 'Budynek';
          const floorCleanName = floor.name.includes(' - ') ? floor.name.split(' - ')[1] : floor.name;
          return {
            bld: bldName,
            floor: floorCleanName,
            seg: seg.name
          };
        }
      }
    }
    return null;
  };

  const computedAbbr = useMemo(() => {
    if (newRoomAutomaticAbbr) {
      const numPart = newRoomNum.trim();
      if (!numPart) return '';
      const bld = appState.buildings[newRoomBldIdx];
      const floorAbbr = getFloorAbbr(newRoomFloorNum, bld);
      return `${floorAbbr}${newRoomSegmentChar}${numPart}`;
    }
    return newRoomCustomAbbr.trim() || newRoomNum.trim();
  }, [newRoomAutomaticAbbr, newRoomFloorNum, newRoomSegmentChar, newRoomNum, newRoomCustomAbbr, newRoomBldIdx, appState.buildings]);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomName = computedAbbr;
    if (!newRoomNum.trim() || !finalRoomName) return;

    const roomTypeLabels: Record<string, string> = {
      ogolna: 'Sala ogólna',
      wczesnoszkolna: 'Sala klas 1-3 (Nauczanie początkowe)',
      informatyka: 'Pracownia informatyczna',
      indywidualne: 'Zajęcia indywidualne (gabinet)',
      sport: 'Zajęcia sportowe (sala gimn./basen/orlik)'
    };

    const isGrade1_3 = newRoomType === 'wczesnoszkolna';

    if (editingRoomId) {
      // Find old room name
      const oldRoom = appState.planLekcji.rooms.find(r => r.id === editingRoomId);
      const oldName = oldRoom?.name || '';

      if (finalRoomName !== oldName && appState.planLekcji.rooms.some(r => r.name === finalRoomName)) {
        showNoti(`Sala o nazwie "${finalRoomName}" już istnieje!`, 'info');
        return;
      }

      const updatedClassroom: ClassRoom = {
        id: editingRoomId,
        name: finalRoomName,
        desc: (newRoomDesc.trim() || roomTypeLabels[newRoomType]),
        type: newRoomType,
        capacity: newRoomType === 'indywidualne' ? 5 : 30,
        isGrade1_3: isGrade1_3
      };

      const nextRooms = appState.planLekcji.rooms.map(r => r.id === editingRoomId ? updatedClassroom : r);

      // Filter oldRoom name from floors and segments completely
      let nextFloors = appState.floors.map(floor => {
        return {
          ...floor,
          segments: floor.segments.map(seg => {
            return {
              ...seg,
              rooms: seg.rooms.filter(rm => rm.num !== oldName)
            };
          }).filter(seg => seg.rooms.length > 0)
        };
      }).filter(floor => floor.segments.length > 0 || floor.id.startsWith('f_bld_')); // keep top building nodes

      // Re-insert under new Floor & Segment targets
      const targetFloorId = `f_${newRoomBldIdx}_${newRoomFloorNum}`;
      let floorElem = nextFloors.find(f => f.id === targetFloorId);
      if (!floorElem) {
        const bld = appState.buildings[newRoomBldIdx];
        const bldName = bld?.name || 'Budynek';
        const fName = getFloorDisplayName(newRoomFloorNum, bld);
        
        floorElem = {
          id: targetFloorId,
          name: `${bldName} - ${fName}`,
          color: '#10b981',
          buildingIdx: newRoomBldIdx,
          segments: []
        };
        nextFloors.push(floorElem);
      }

      const targetSegmentId = `seg_${newRoomBldIdx}_${newRoomFloorNum}_${newRoomSegmentChar || 'gen'}`;
      let segmentElem = floorElem.segments.find(s => s.id === targetSegmentId);
      if (!segmentElem) {
        segmentElem = {
          id: targetSegmentId,
          name: newRoomSegmentChar ? (newRoomSegmentChar.length > 1 ? newRoomSegmentChar : `Segment ${newRoomSegmentChar}`) : 'Strefa Ogólna',
          rooms: []
        };
        floorElem.segments.push(segmentElem);
      }

      segmentElem.rooms.push({
        id: 'rm_col_' + updatedClassroom.id,
        num: updatedClassroom.name,
        sub: updatedClassroom.desc
      });

      onChangeAppState({
        ...appState,
        floors: nextFloors,
        planLekcji: {
          ...appState.planLekcji,
          rooms: nextRooms
        }
      });

      setEditingRoomId(null);
      setNewRoomNum('');
      setNewRoomCustomAbbr('');
      setNewRoomDesc('');
      showNoti(`Zaktualizowano salę: ${updatedClassroom.name}`);
    } else {
      // Add Mode
      if (appState.planLekcji.rooms.some(r => r.name === finalRoomName)) {
        showNoti(`Sala o nazwie/skrócie "${finalRoomName}" już istnieje!`, 'info');
        return;
      }

      const newClassroom: ClassRoom = {
        id: 'r_' + uid(),
        name: finalRoomName,
        desc: (newRoomDesc.trim() || roomTypeLabels[newRoomType]),
        type: newRoomType,
        capacity: newRoomType === 'indywidualne' ? 5 : 30,
        isGrade1_3: isGrade1_3
      };

      // Synthesize physical floor column
      const nextFloors = [...appState.floors];
      const targetFloorId = `f_${newRoomBldIdx}_${newRoomFloorNum}`;
      
      let floorElem = nextFloors.find(f => f.id === targetFloorId);
      if (!floorElem) {
        const bld = appState.buildings[newRoomBldIdx];
        const bldName = bld?.name || 'Budynek';
        const fName = getFloorDisplayName(newRoomFloorNum, bld);
        
        floorElem = {
          id: targetFloorId,
          name: `${bldName} - ${fName}`,
          color: '#10b981',
          buildingIdx: newRoomBldIdx,
          segments: []
        };
        nextFloors.push(floorElem);
      }

      const targetSegmentId = `seg_${newRoomBldIdx}_${newRoomFloorNum}_${newRoomSegmentChar || 'gen'}`;
      let segmentElem = floorElem.segments.find(s => s.id === targetSegmentId);
      if (!segmentElem) {
        segmentElem = {
          id: targetSegmentId,
          name: newRoomSegmentChar ? (newRoomSegmentChar.length > 1 ? newRoomSegmentChar : `Segment ${newRoomSegmentChar}`) : 'Strefa Ogólna',
          rooms: []
        };
        floorElem.segments.push(segmentElem);
      }

      segmentElem.rooms.push({
        id: 'rm_col_' + newClassroom.id,
        num: newClassroom.name,
        sub: newClassroom.desc
      });

      onChangeAppState({
        ...appState,
        floors: nextFloors,
        planLekcji: {
          ...appState.planLekcji,
          rooms: [...appState.planLekcji.rooms, newClassroom]
        }
      });

      setNewRoomNum('');
      setNewRoomCustomAbbr('');
      setNewRoomDesc('');
      showNoti(`Dodano salę: ${newClassroom.name} (${roomTypeLabels[newRoomType]})`);
    }
  };

  const handleRemoveRoom = (roomId: string, roomName: string) => {
    triggerConfirm(
      'Usuwanie sali',
      `Czy na pewno chcesz usunąć salę "${roomName}"?`,
      () => {
        // Filter appState.planLekcji.rooms
        const nextRooms = appState.planLekcji.rooms.filter(r => r.id !== roomId);

        // Filter floors rooms
        const nextFloors = appState.floors.map(floor => {
          return {
            ...floor,
            segments: floor.segments.map(seg => ({
              ...seg,
              rooms: seg.rooms.filter(r => r.num !== roomName)
            }))
          };
        });

        onChangeAppState({
          ...appState,
          floors: nextFloors,
          planLekcji: {
            ...appState.planLekcji,
            rooms: nextRooms
          }
        });
        showNoti('Usunięto gabinet');
      }
    );
  };

  // --- Step 4 States (Classes & Groups) ---
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newClsName, setNewClsName] = useState('');
  const [newClsColor, setNewClsColor] = useState(() => PALETTE_COLORS[appState.classes?.length % PALETTE_COLORS.length] || '#2563eb');
  
  // Group within a specific class
  const [newGrpName, setNewGrpName] = useState('');
  const [selectedClsForGrp, setSelectedClsForGrp] = useState('');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClsName.trim()) return;

    if (editingClassId) {
      // Edit Mode
      const nextClasses = appState.classes.map(c => {
        if (c.id === editingClassId) {
          return {
            ...c,
            name: newClsName.trim().toUpperCase(),
            color: newClsColor
          };
        }
        return c;
      });

      onChangeAppState({
        ...appState,
        classes: nextClasses,
        planLekcji: {
          ...appState.planLekcji,
          classes: nextClasses
        }
      });

      setEditingClassId(null);
      setNewClsName('');
      showNoti('Klasa została zaktualizowana');
    } else {
      // Add Mode
      const newClass: Class = {
        id: 'cls_' + uid(),
        name: newClsName.trim().toUpperCase(),
        color: newClsColor,
        groupIds: [],
        group: 'cała klasa'
      };

      const nextClasses = [...appState.classes, newClass];

      onChangeAppState({
        ...appState,
        classes: nextClasses,
        planLekcji: {
          ...appState.planLekcji,
          classes: nextClasses
        }
      });

      setNewClsName('');
      const nextColor = PALETTE_COLORS[nextClasses.length % PALETTE_COLORS.length] || '#2563eb';
      setNewClsColor(nextColor);
      showNoti(`Dodano klasę: ${newClass.name}`);
      if (!selectedClsForGrp) {
        setSelectedClsForGrp(newClass.id);
      }
    }
  };

  const handleRemoveClass = (id: string) => {
    triggerConfirm(
      'Usuwanie klasy',
      'Czy na pewno chcesz usunąć tę klasę? Usunie to również przydzielone do niej lekcje.',
      () => {
        const nextClasses = appState.classes.filter(c => c.id !== id);

        onChangeAppState({
          ...appState,
          classes: nextClasses,
          planLekcji: {
            ...appState.planLekcji,
            classes: nextClasses,
            // Remove assignments
            assignments: appState.planLekcji.assignments.filter(a => a.classId !== id)
          }
        });
        showNoti('Klasa została usunięta');
      }
    );
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const finalClassId = selectedClsForGrp || (appState.classes[0] ? appState.classes[0].id : '');
    
    if (!newGrpName.trim()) {
      showNoti('Wpisz nazwę podgrupy!', 'info');
      return;
    }
    if (!finalClassId) {
      showNoti('Najpierw musisz dodać klasę, aby przypisać do niej podgrupy!', 'info');
      return;
    }

    if (editingGroupId) {
      // Edit Mode
      const nextGroups = appState.planLekcji.schoolGroups.map(g => {
        if (g.id === editingGroupId) {
          return {
            ...g,
            name: newGrpName.trim(),
            classId: finalClassId
          };
        }
        return g;
      });

      // Synchronize Class groupIds list
      const nextClasses = appState.classes.map(c => {
        const classGrps = nextGroups.filter(g => g.classId === c.id).map(g => g.id);
        return {
          ...c,
          groupIds: classGrps
        };
      });

      onChangeAppState({
        ...appState,
        classes: nextClasses,
        planLekcji: {
          ...appState.planLekcji,
          classes: nextClasses,
          schoolGroups: nextGroups
        }
      });

      setEditingGroupId(null);
      setNewGrpName('');
      showNoti('Podgrupa została zaktualizowana');
    } else {
      // Add Mode
      const newGrp: SchoolGroup = {
        id: 'grp_' + uid(),
        name: newGrpName.trim(),
        classId: finalClassId,
        color: '#0ea5e9'
      };

      const nextGroups = [...appState.planLekcji.schoolGroups, newGrp];

      // also append groupIds inside its relevant Class object
      const nextClasses = appState.classes.map(c => {
        if (c.id === finalClassId) {
          return {
            ...c,
            groupIds: [...(c.groupIds || []), newGrp.id]
          };
        }
        return c;
      });

      onChangeAppState({
        ...appState,
        classes: nextClasses,
        planLekcji: {
          ...appState.planLekcji,
          classes: nextClasses,
          schoolGroups: nextGroups
        }
      });

      setNewGrpName('');
      showNoti(`Dodano grupę: "${newGrp.name}"`);
    }
  };

  const handleRemoveGroup = (groupId: string, clsId: string) => {
    triggerConfirm(
      'Usuwanie podgrupy',
      'Czy na pewno chcesz usunąć tę podgrupę?',
      () => {
        const nextGroups = appState.planLekcji.schoolGroups.filter(g => g.id !== groupId);
        const nextClasses = appState.classes.map(c => {
          if (c.id === clsId) {
            return {
              ...c,
              groupIds: (c.groupIds || []).filter(gId => gId !== groupId)
            };
          }
          return c;
        });

        onChangeAppState({
          ...appState,
          classes: nextClasses,
          planLekcji: {
            ...appState.planLekcji,
            classes: nextClasses,
            schoolGroups: nextGroups
          }
        });
        showNoti('Grupa została usunięta');
      }
    );
  };

  // --- Step 5 States (Subjects) ---
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjShort, setNewSubjShort] = useState('');
  const [isSubjShortManual, setIsSubjShortManual] = useState(false);
  const [newSubjColor, setNewSubjColor] = useState(() => PALETTE_COLORS[appState.subjects?.length % PALETTE_COLORS.length] || '#16a34a');
  const [newSubjPattern, setNewSubjPattern] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim() || !newSubjShort.trim()) return;

    if (editingSubjectId) {
      // Edycja przedmiotu
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

      setEditingSubjectId(null);
      setNewSubjName('');
      setNewSubjShort('');
      setIsSubjShortManual(false);
      setNewSubjPattern('');
      const nextColor = PALETTE_COLORS[nextSubjs.length % PALETTE_COLORS.length] || '#16a34a';
      setNewSubjColor(nextColor);
      showNoti('Zaktualizowano dane przedmiotu');
    } else {
      // Dodawanie nowego przedmiotu
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

  const handleStartEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setNewSubjName(sub.name);
    setNewSubjShort(sub.short);
    setIsSubjShortManual(true); // Treat existing as manual so it doesn't get auto-overwritten unless they want it to
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

  // --- Step 6 States (Teachers) ---
  const [newTFirst, setNewTFirst] = useState('');
  const [newTLast, setNewTLast] = useState('');
  const [newTAbbr, setNewTAbbr] = useState('');
  const [newTMaxHours, setNewTMaxHours] = useState(18);
  const [newTOvertimeHours, setNewTOvertimeHours] = useState(0);
  const [isTAbbrManual, setIsTAbbrManual] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [newTColor, setNewTColor] = useState(() => PALETTE_COLORS[appState.teachers?.length % PALETTE_COLORS.length] || '#d97706');
  const [newTAvailability, setNewTAvailability] = useState<string[]>([]);
  const [newTInactive, setNewTInactive] = useState(false);
  const [newTInactiveComment, setNewTInactiveComment] = useState('');
  const [newTSubstitutions, setNewTSubstitutions] = useState<string[]>([]);

  // Trigger auto abbr
  const updateTAbbrAuto = (f: string, l: string) => {
    if (!isTAbbrManual) {
      const generated = genAbbr(f, l);
      setNewTAbbr(generated);
    }
  };

  const handleStartEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setNewTFirst(t.first);
    setNewTLast(t.last);
    setNewTAbbr(t.abbr);
    setIsTAbbrManual(true);
    setNewTMaxHours(t.maxHours || 18);
    setNewTOvertimeHours(t.overtimeHours || 0);
    setNewTColor(t.color || '#d97706');
    setNewTInactive(t.inactive || false);
    setNewTInactiveComment(t.inactiveComment || '');
    setNewTSubstitutions(t.substitutions || []);

    // Load or generate list of available slots
    if (t.availability) {
      setNewTAvailability(t.availability);
    } else {
      const defaultAvail: string[] = [];
      const hList = appState.planLekcji.hours && appState.planLekcji.hours.length > 0 
        ? appState.planLekcji.hours 
        : (hoursList && hoursList.length > 0 ? hoursList : [{ num: 1, start: '08:00', end: '08:45' }]);
      for (let day = 0; day < 5; day++) {
        hList.forEach(h => {
          defaultAvail.push(`${day}-${h.num}`);
        });
      }
      setNewTAvailability(defaultAvail);
    }
  };

  const handleCancelEditTeacher = () => {
    setEditingTeacherId(null);
    setNewTFirst('');
    setNewTLast('');
    setNewTAbbr('');
    setIsTAbbrManual(false);
    setNewTMaxHours(18);
    setNewTOvertimeHours(0);
    setNewTAvailability([]);
    setNewTInactive(false);
    setNewTInactiveComment('');
    setNewTSubstitutions([]);
    const nextColor = PALETTE_COLORS[appState.teachers?.length % PALETTE_COLORS.length] || '#d97706';
    setNewTColor(nextColor);
  };

  const setAllAvailability = (active: boolean) => {
    if (active) {
      const list: string[] = [];
      const hList = appState.planLekcji.hours && appState.planLekcji.hours.length > 0 ? appState.planLekcji.hours : hoursList;
      for (let d = 0; d < 5; d++) {
        hList.forEach(h => {
          list.push(`${d}-${h.num}`);
        });
      }
      setNewTAvailability(list);
    } else {
      setNewTAvailability([]);
    }
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTFirst.trim() || !newTLast.trim() || !newTAbbr.trim()) return;

    const formattedAbbr = newTAbbr.trim().toUpperCase();

    // Check for unique abbr
    if (appState.teachers.some(t => t.id !== editingTeacherId && t.abbr.toUpperCase() === formattedAbbr)) {
      showNoti('Ten skrót nauczyciela jest już zajęty!', 'info');
      return;
    }

    if (editingTeacherId) {
      // Edycja nauczyciela
      const nextT = appState.teachers.map(t => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            first: newTFirst.trim(),
            last: newTLast.trim(),
            abbr: formattedAbbr,
            maxHours: Number(newTMaxHours),
            overtimeHours: Number(newTOvertimeHours) || undefined,
            color: newTColor,
            availability: newTAvailability,
            inactive: newTInactive,
            inactiveComment: newTInactiveComment.trim(),
            substitutions: newTSubstitutions
          };
        }
        return t;
      });

      onChangeAppState({
        ...appState,
        teachers: nextT,
        planLekcji: {
          ...appState.planLekcji,
          teachers: nextT
        }
      });

      setEditingTeacherId(null);
      setNewTFirst('');
      setNewTLast('');
      setNewTAbbr('');
      setIsTAbbrManual(false);
      setNewTMaxHours(18);
      setNewTOvertimeHours(0);
      setNewTInactive(false);
      setNewTInactiveComment('');
      setNewTSubstitutions([]);
      const nextColor = PALETTE_COLORS[nextT.length % PALETTE_COLORS.length] || '#d97706';
      setNewTColor(nextColor);
      showNoti('Zaktualizowano dane nauczyciela');
    } else {
      // Dodawanie nowego nauczyciela
      const newTeacher: Teacher = {
        id: 't_' + uid(),
        first: newTFirst.trim(),
        last: newTLast.trim(),
        abbr: formattedAbbr,
        maxHours: Number(newTMaxHours),
        overtimeHours: Number(newTOvertimeHours) || undefined,
        color: newTColor,
        inactive: newTInactive,
        inactiveComment: newTInactiveComment.trim(),
        substitutions: newTSubstitutions
      };

      const nextT = [...appState.teachers, newTeacher];

      onChangeAppState({
        ...appState,
        teachers: nextT,
        planLekcji: {
          ...appState.planLekcji,
          teachers: nextT
        }
      });

      setNewTFirst('');
      setNewTLast('');
      setNewTAbbr('');
      setIsTAbbrManual(false);
      setNewTMaxHours(18);
      setNewTOvertimeHours(0);
      setNewTInactive(false);
      setNewTInactiveComment('');
      setNewTSubstitutions([]);
      const nextColor = PALETTE_COLORS[nextT.length % PALETTE_COLORS.length] || '#d97706';
      setNewTColor(nextColor);
      showNoti(`Dodano nauczyciela: ${newTeacher.first} ${newTeacher.last}`);
    }
  };

  const handleRemoveTeacher = (id: string) => {
    triggerConfirm(
      'Usuwanie nauczyciela',
      'Czy na pewno chcesz usunąć tego nauczyciela? Usunie to również jego przydziały lekcyjne.',
      () => {
        const nextT = appState.teachers.filter(t => t.id !== id);

        onChangeAppState({
          ...appState,
          teachers: nextT,
          planLekcji: {
            ...appState.planLekcji,
            teachers: nextT,
            assignments: appState.planLekcji.assignments.filter(a => a.teacherId !== id)
          }
        });
        if (editingTeacherId === id) {
          handleCancelEditTeacher();
        }
        showNoti('Nauczyciel został usunięty');
      }
    );
  };

  // --- Step 7 States (Corridors / Duties) ---
  const [newCorridorName, setNewCorridorName] = useState('');
  const [newCorridorFloor, setNewCorridorFloor] = useState('');
  const [newCorridorDesc, setNewCorridorDesc] = useState('');
  const [newCorridorCount, setNewCorridorCount] = useState(1);
  const [newCorridorConnectedRooms, setNewCorridorConnectedRooms] = useState<string[]>([]);

  const handleAddCorridorDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorridorName.trim()) return;

    const newPlace: MiejsceDyzuru = {
      id: 'm_' + uid(),
      name: newCorridorName.trim(),
      floor: newCorridorFloor.trim() || undefined,
      desc: newCorridorDesc.trim() || undefined,
      teachersNeeded: newCorridorCount,
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
  };

  const handleRemoveCorridor = (id: string) => {
    onChangeAppState({
      ...appState,
      dyzury: {
        ...appState.dyzury,
        miejsca: appState.dyzury.miejsca.filter(m => m.id !== id)
      }
    });
    showNoti('Usunięto stanowisko dyżurów');
  };

  // --- Step 8 States (Assignments / Lesson assignment) ---
  const [newAsgClass, setNewAsgClass] = useState('');
  const [newAsgTeacher, setNewAsgTeacher] = useState('');
  const [newAsgSubject, setNewAsgSubject] = useState('');
  const [newAsgRoom, setNewAsgRoom] = useState('');
  const [newAsgGroup, setNewAsgGroup] = useState('');
  const [newAsgHours, setNewAsgHours] = useState(2);
  const [newAsgBlockSize, setNewAsgBlockSize] = useState<number>(1); // default single 1h
  const [newAsgLinkedClasses, setNewAsgLinkedClasses] = useState<string[]>([]);

  const autoSelectGroupForAssignment = (clsId: string, subjId: string) => {
    if (!clsId || !subjId) return;
    const selectedSubj = appState.subjects.find(s => s.id === subjId);
    if (selectedSubj && selectedSubj.defaultGroupPattern) {
      const pattern = selectedSubj.defaultGroupPattern.toLowerCase();
      const classGrps = appState.planLekcji.schoolGroups.filter(g => g.classId === clsId);
      const foundGrp = classGrps.find(g => g.name.toLowerCase().includes(pattern));
      if (foundGrp) {
        setNewAsgGroup(foundGrp.id);
        return;
      }
    }
    setNewAsgGroup('');
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgClass || !newAsgSubject) {
      showNoti('Klasa i przedmiot są wymagane!', 'info');
      return;
    }

    const newAsg: Assignment = {
      id: 'a_' + uid(),
      classId: newAsgClass,
      teacherId: newAsgTeacher || null,
      subjectId: newAsgSubject,
      roomId: newAsgRoom || null,
      groupId: newAsgGroup || null,
      hoursPerWeek: newAsgHours,
      preferredBlockSize: newAsgBlockSize,
      linkedClassIds: newAsgLinkedClasses.length > 0 ? newAsgLinkedClasses : undefined
    };

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        assignments: [...appState.planLekcji.assignments, newAsg]
      }
    });

    setNewAsgRoom('');
    setNewAsgHours(2);
    setNewAsgBlockSize(1);
    setNewAsgLinkedClasses([]);
    showNoti('Dodano przydział lekcyjny');
  };

  const handleRemoveAssignment = (id: string) => {
    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        assignments: appState.planLekcji.assignments.filter(a => a.id !== id)
      }
    });
    showNoti('Usunięto przydział lekcyjny');
  };

  // --- Step 9 States (Special Students / Pupils definition) ---
  const [newStudFirstName, setNewStudFirstName] = useState('');
  const [newStudLastName, setNewStudLastName] = useState('');
  const [newStudClassId, setNewStudClassId] = useState('');
  const [newStudType, setNewStudType] = useState<'ni' | 'rewa' | 'wsp'>('ni');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Memoized current active student information for high performance
  const activeStudent = useMemo(() => {
    if (!activeStudentId) return null;
    return (appState.planLekcji.specialStudents || []).find(s => s.id === activeStudentId) || null;
  }, [activeStudentId, appState.planLekcji.specialStudents]);

  const activeStudentAssignments = useMemo(() => {
    if (!activeStudentId) return [];
    return (appState.planLekcji.specialAssignments || []).filter(a => a.studentId === activeStudentId);
  }, [activeStudentId, appState.planLekcji.specialAssignments]);

  // States for student edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudFirstName, setEditStudFirstName] = useState('');
  const [editStudLastName, setEditStudLastName] = useState('');
  const [editStudClassId, setEditStudClassId] = useState('');
  const [editStudType, setEditStudType] = useState<'ni' | 'rewa' | 'wsp'>('ni');

  const [editStudSubjId, setEditStudSubjId] = useState('');
  const [editStudTeachId, setEditStudTeachId] = useState('');
  const [editStudHours, setEditStudHours] = useState(2);

  const [newStudSubjId, setNewStudSubjId] = useState('');
  const [newStudTeachId, setNewStudTeachId] = useState('');
  const [newStudHours, setNewStudHours] = useState(2);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudLastName.trim()) {
      showNoti('Nazwisko jest wymagane!', 'info');
      return;
    }

    const currentStudents = appState.planLekcji.specialStudents || [];
    const newStudent: SpecialStudent = {
      id: 'stud_' + uid(),
      firstName: newStudFirstName.trim(),
      lastName: newStudLastName.trim(),
      classId: newStudClassId || null,
      type: newStudType,
      supportTeacherIds: []
    };

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        specialStudents: [...currentStudents, newStudent]
      }
    });

    setNewStudFirstName('');
    setNewStudLastName('');
    setNewStudClassId('');
    setActiveStudentId(newStudent.id);
    showNoti(`Dodano ucznia: ${newStudent.firstName} ${newStudent.lastName}`);
  };

  const handleUpdateStudent = (updatedStudent: SpecialStudent) => {
    const currentStudents = appState.planLekcji.specialStudents || [];
    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        specialStudents: currentStudents.map(s => s.id === updatedStudent.id ? updatedStudent : s)
      }
    });
  };

  const handleRemoveStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      'Usunąć ucznia?',
      'Czy na pewno chcesz usunąć tego ucznia oraz wszystkie przypisane do niego zajęcia indywidualne?',
      () => {
        const currentStudents = appState.planLekcji.specialStudents || [];
        const currentSpAsgs = appState.planLekcji.specialAssignments || [];
        const currentSpLessons = appState.planLekcji.specialLessons || {};
        
        onChangeAppState({
          ...appState,
          planLekcji: {
            ...appState.planLekcji,
            specialStudents: currentStudents.filter(s => s.id !== id),
            specialAssignments: currentSpAsgs.filter(a => a.studentId !== id),
            specialLessons: Object.fromEntries(
              Object.entries(currentSpLessons).filter(([k]) => !k.startsWith(id + '|'))
            )
          }
        });

        if (activeStudentId === id) {
          setActiveStudentId(null);
        }
        showNoti('Usunięto ucznia z bazy');
      }
    );
  };

  const handleAddStudentAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentId) {
      showNoti('Wybierz najpierw ucznia!', 'info');
      return;
    }
    if (!newStudSubjId) {
      showNoti('Wybierz przedmiot!', 'info');
      return;
    }

    const currentSpAsgs = appState.planLekcji.specialAssignments || [];
    const newSpAsg: SpecialAssignment = {
      id: 'sasg_' + uid(),
      studentId: activeStudentId,
      subjectId: newStudSubjId,
      teacherId: newStudTeachId || null,
      hoursPerWeek: newStudHours,
      withClass: false
    };

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        specialAssignments: [...currentSpAsgs, newSpAsg]
      }
    });

    setNewStudSubjId('');
    setNewStudTeachId('');
    setNewStudHours(2);
    showNoti('Dodano indywidualne zajęcie dla ucznia');
  };

  const handleRemoveStudentAssignment = (asgId: string) => {
    const currentSpAsgs = appState.planLekcji.specialAssignments || [];
    const currentSpLessons = appState.planLekcji.specialLessons || {};
    
    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        specialAssignments: currentSpAsgs.filter(a => a.id !== asgId),
        specialLessons: Object.fromEntries(
          Object.entries(currentSpLessons).filter(([_, l]) => l.assignmentId !== asgId)
        )
      }
    });
    showNoti('Usunięto zajęcie indywidualne');
  };

  const openEditModal = (student: SpecialStudent) => {
    setEditingStudentId(student.id);
    setEditStudFirstName(student.firstName);
    setEditStudLastName(student.lastName);
    setEditStudClassId(student.classId || '');
    setEditStudType(student.type);
    
    // reset draft fields
    setEditStudSubjId('');
    setEditStudTeachId('');
    setEditStudHours(2);
    
    setIsEditModalOpen(true);
  };

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId) return;
    if (!editStudLastName.trim()) {
      showNoti('Nazwisko studenta/ucznia jest wymagane!', 'info');
      return;
    }

    const currentStudents = appState.planLekcji.specialStudents || [];
    const updatedStudents = currentStudents.map(s => {
      if (s.id === editingStudentId) {
        return {
          ...s,
          firstName: editStudFirstName.trim(),
          lastName: editStudLastName.trim(),
          classId: editStudClassId || null,
          type: editStudType
        };
      }
      return s;
    });

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        specialStudents: updatedStudents
      }
    });

    setIsEditModalOpen(false);
    setEditingStudentId(null);
    showNoti('Zapisano szczegółowe parametry ucznia');
  };

  const handleAddModalAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId) return;
    if (!editStudSubjId) {
      showNoti('Wybierz przedmiot!', 'info');
      return;
    }

    const currentSpAsgs = appState.planLekcji.specialAssignments || [];
    const newSpAsg: SpecialAssignment = {
      id: 'sasg_' + uid(),
      studentId: editingStudentId,
      subjectId: editStudSubjId,
      teacherId: editStudTeachId || null,
      hoursPerWeek: editStudHours,
      withClass: false
    };

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...appState.planLekcji,
        specialAssignments: [...currentSpAsgs, newSpAsg]
      }
    });

    setEditStudSubjId('');
    setEditStudTeachId('');
    setEditStudHours(2);
    showNoti('Dodano indywidualne zajęcie dla ucznia (w modalu)');
  };

  // Memoized maps for optimized O(1) lookups
  const classesMap = useMemo(() => new Map(appState.classes.map(c => [c.id, c])), [appState.classes]);
  const teachersMap = useMemo(() => new Map(appState.teachers.map(t => [t.id, t])), [appState.teachers]);
  const subjectsMap = useMemo(() => new Map(appState.subjects.map(s => [s.id, s])), [appState.subjects]);
  const roomsMap = useMemo(() => new Map(appState.planLekcji.rooms.map(r => [r.id, r])), [appState.planLekcji.rooms]);
  const groupsMap = useMemo(() => new Map(appState.planLekcji.schoolGroups.map(g => [g.id, g])), [appState.planLekcji.schoolGroups]);

  // --- Real-time statistics summaries for assignments ---
  const teacherTotalHoursMap = useMemo(() => {
    const hours: Record<string, number> = {};
    appState.planLekcji.assignments.forEach(a => {
      if (a.teacherId) {
        hours[a.teacherId] = (hours[a.teacherId] || 0) + a.hoursPerWeek;
      }
    });
    return hours;
  }, [appState.planLekcji.assignments]);

  const DAY_NAMES = useMemo(() => ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'], []);

  const inactiveTeachersLessonsList = useMemo(() => {
    const result: Array<{
      inactiveTeacher: Teacher;
      lessons: Array<{
        key: string;
        classId: string;
        className: string;
        day: number;
        hourNum: number;
        subjectId: string;
        subjectName: string;
        subjectShort: string;
        color: string;
        assignmentId: string;
      }>
    }> = [];

    const inactiveTeachers = appState.teachers.filter(t => t.inactive && t.id !== editingTeacherId);
    
    inactiveTeachers.forEach(it => {
      const itLessons: any[] = [];
      
      const itAsgs = appState.planLekcji.assignments.filter(a => a.teacherId === it.id);
      const asgIds = new Set(itAsgs.map(a => a.id));

      Object.entries(appState.planLekcji.lessons).forEach(([lessonKey, lesson]) => {
        if (asgIds.has(lesson.assignmentId)) {
          const parts = lessonKey.split('|');
          if (parts.length >= 3) {
            const classId = parts[0];
            const day = parseInt(parts[1]);
            const hourNum = parseInt(parts[2]);
            
            const cls = appState.classes.find(c => c.id === classId);
            const asg = itAsgs.find(a => a.id === lesson.assignmentId);
            const sub = asg ? appState.subjects.find(s => s.id === asg.subjectId) : null;
            
            itLessons.push({
              key: lessonKey,
              classId,
              className: cls ? cls.name : 'Klasa ' + classId,
              day,
              hourNum,
              subjectId: asg ? asg.subjectId : '',
              subjectName: sub ? sub.name : 'Przedmiot',
              subjectShort: sub ? sub.short : 'Przedmiot',
              color: sub?.color || '#3b82f6',
              assignmentId: lesson.assignmentId
            });
          }
        }
      });

      // Sort by day and hours
      itLessons.sort((a, b) => a.day - b.day || a.hourNum - b.hourNum);

      result.push({
        inactiveTeacher: it,
        lessons: itLessons
      });
    });

    return result;
  }, [appState.teachers, appState.planLekcji.lessons, appState.planLekcji.assignments, appState.classes, appState.subjects, editingTeacherId]);

  const classTotalHoursMap = useMemo(() => {
    const hours: Record<string, number> = {};
    appState.planLekcji.assignments.forEach(a => {
      hours[a.classId] = (hours[a.classId] || 0) + a.hoursPerWeek;
    });
    return hours;
  }, [appState.planLekcji.assignments]);

  // General App Statistics for Summary Step 10 (Refined precise dependencies)
  const statsSummary = useMemo(() => {
    return {
      blds: appState.buildings.length,
      rooms: appState.planLekcji.rooms.length,
      classes: appState.classes.length,
      teachers: appState.teachers.length,
      subjects: appState.subjects.length,
      corridors: appState.dyzury.miejsca.length,
      asgs: appState.planLekcji.assignments.length,
      totalHours: appState.planLekcji.assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0),
      specialStudents: (appState.planLekcji.specialStudents || []).length,
      specialHours: (appState.planLekcji.specialAssignments || []).reduce((sum, a) => sum + a.hoursPerWeek, 0)
    };
  }, [
    appState.buildings,
    appState.planLekcji.rooms,
    appState.classes,
    appState.teachers,
    appState.subjects,
    appState.dyzury.miejsca,
    appState.planLekcji.assignments,
    appState.planLekcji.specialStudents,
    appState.planLekcji.specialAssignments
  ]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 relative" id="wizard-view">
      
      {/* STEPS SIDEBAR */}
      <aside className="w-full md:w-80 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-950 p-6 md:h-full overflow-y-auto select-none">
        
        <div className="flex items-center gap-2 pb-5 mb-5 border-b border-slate-800 shrink-0">
          <div className="bg-amber-500 rounded-lg p-1.5 text-slate-950 leading-none">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Kreator Szkoły</h2>
            <p className="text-[10px] text-slate-400 font-semibold">Uporządkowane wprowadzanie danych</p>
          </div>
        </div>

        {/* Vertical Timeline Steps */}
        <div className="flex flex-col gap-1 flex-1">
          {[
            { n: 1, title: 'Szkoła i Rok Szkolny', info: 'Główne ustawienia', icon: SchoolIcon },
            { n: 2, title: 'Budynki szkolne', info: 'Własne i zlecone', icon: Landmark },
            { n: 3, title: 'Pracownie i Sale', info: 'Dla zajęć specjalnych', icon: BuildingIcon },
            { n: 4, title: 'Klasy i Grupy', info: 'Siatka organizacyjna', icon: Users },
            { n: 5, title: 'Przedmioty szkolne', info: 'Lista przedmiotów', icon: BookOpen },
            { n: 6, title: 'Nauczyciele', info: 'Pensum i limity', icon: GraduationCap },
            { n: 7, title: 'Korytarze i Dyżury', info: 'Liczba nauczycieli', icon: Shield },
            { n: 8, title: 'Przydziały Lekcji', info: 'Łączenie w pary', icon: Layers },
            { n: 9, title: 'Uczniowie', info: 'IPET, NI i wspomaganie', icon: Users2 },
            { n: 10, title: 'Podsumowanie i Start', info: 'Wytyczne układania', icon: CheckCircle }
          ].map((st) => {
            const Icon = st.icon;
            const isActive = activeStep === st.n;
            const isCompleted = activeStep > st.n;
            return (
              <button
                key={st.n}
                onClick={() => setActiveStep(st.n)}
                className={`w-full flex items-center gap-3 text-left p-2.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 font-bold border-l-4 border-blue-500' 
                    : isCompleted 
                      ? 'text-slate-400 hover:bg-slate-800'
                      : 'text-slate-500 hover:bg-slate-800/40'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : isCompleted 
                      ? 'bg-slate-800 text-slate-300' 
                      : 'bg-slate-950 text-slate-600'
                }`}>
                  {isCompleted ? '✓' : st.n}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-bold leading-tight">{st.title}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-0.5">{st.info}</p>
                </div>
                <Icon size={14} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
              </button>
            );
          })}
        </div>
      </aside>

      {/* STEPS CONTENT VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Floating Success Notifications */}
        {noti && (
          <div className="absolute top-4 right-4 bg-slate-900 border-l-4 border-emerald-500 px-4 py-3 rounded-lg text-white text-xs font-bold shadow-2xl z-[9000] flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            <span>{noti.text}</span>
          </div>
        )}

        {/* Main Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">

          {/* STEP 1: Basic School Settings */}
          {activeStep === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 1</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">🏫 Dane Szkoły i Rok Szkolny</h2>
                <p className="text-xs text-slate-500 mt-1">Skonfiguruj nazwę, kontakt i aktualny okres planowania lekcji.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pełna nazwa szkoły *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-slate-50"
                    placeholder="np. Szkoła Podstawowa nr 15 w Warszawie"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Skrót (np. SP 15) *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-slate-50"
                      placeholder="np. SP 15"
                      value={schoolShort}
                      onChange={(e) => setSchoolShort(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rok szkolny</label>
                    <select 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-slate-50"
                      value={schoolYear}
                      onChange={(e) => setSchoolYear(e.target.value)}
                    >
                      <option value="2025/2026">2025/2026</option>
                      <option value="2026/2027">2026/2027 (Kolejny)</option>
                      <option value="2027/2028">2027/2028</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Telefon (Opcjonalnie)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-slate-50"
                      placeholder="np. +48 22 123 45 67"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Domenowy E-mail / WWW </label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-slate-50"
                      placeholder="np. sekretariat@sp15.edu.pl"
                      value={schoolWeb}
                      onChange={(e) => setSchoolWeb(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Sekcja: Archiwum i Kopiowanie na Kolejny Rok Szkolny */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      📅 Zarządzanie latami szkolnymi i kopiowanie bazy
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Skopiuj i przenieś ustawienia do kolejnego roku szkolnego lub zarządzaj przeszłymi latami.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowCopyPanel(!showCopyPanel)}
                    className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition shadow-sm cursor-pointer border-solid"
                  >
                    <RefreshCw size={13} className={showCopyPanel ? "rotate-45" : ""} />
                    {showCopyPanel ? "Ukryj panel kopiowania" : "Kopiuj konfigurację szkoły..."}
                  </button>
                </div>

                {showCopyPanel && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Docelowy Rok Szkolny (np. 2027/2028) *</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-white"
                          value={targetYear}
                          onChange={(e) => setTargetYear(e.target.value)}
                          placeholder="np. 2027/2028"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Stworzy nową unikalną bazę roczną na kolejny okres planowania.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Opcje kopiowania danych:</label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={copyData.schoolInfo} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, schoolInfo: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Dane szkoły i dzwonki</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={copyData.infrastructure} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, infrastructure: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Budynki i sale (Infrastruktura)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={copyData.subjects} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, subjects: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Przedmioty szkolne</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={copyData.teachers} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, teachers: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Grono Nauczycielskie</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none col-span-2">
                            <input 
                              type="checkbox" 
                              checked={copyData.classes} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, classes: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Klasy i podział na grupy</span>
                          </label>

                          {copyData.classes && (
                            <label className="flex items-center gap-2 cursor-pointer ml-5 text-blue-700 font-medium select-none col-span-2">
                              <input 
                                type="checkbox" 
                                checked={copyData.promoteClasses} 
                                onChange={(e) => setCopyData(prev => ({ ...prev, promoteClasses: e.target.checked }))}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>Promuj klasy o 1 rok wyżej (np. 1A → 2A, 2B → 3B)</span>
                            </label>
                          )}

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={copyData.assignments} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, assignments: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Przydziały nauczycieli</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={copyData.dutySpots} 
                              onChange={(e) => setCopyData(prev => ({ ...prev, dutySpots: e.target.checked }))}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Tereny dyżurów i dzwonki</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        type="button" 
                        onClick={handleCopySchoolYear}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer border-none"
                      >
                        <CheckCircle size={14} /> Rozpocznij nowy rok szkolny i skopiuj dane
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 leading-relaxed">
                      ⚠️ <strong>Uwaga:</strong> Obecny rok szkolny ({appState.yearLabel}) zostanie bezpiecznie zapisany w lokalnym archiwum bazy danych. Harmonogram lekcji zostanie zresetowany do stanu pustego (0 zaplanowanych lekcji), aby ułożyć go od nowa w następnym roku.
                    </div>
                  </div>
                )}

                {/* Archiwalne Lata szkolne */}
                {archive && archive.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Zarchiwizowane lata szkolne ({archive.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {archive.map((arch) => (
                        <div key={arch.yearKey} className="flex justify-between items-center bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">{arch.label}</span>
                            <span className="text-[9px] text-slate-400 font-medium block">Zapisano: {new Date(arch.savedAt).toLocaleDateString()} {new Date(arch.savedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button 
                              type="button" 
                              onClick={() => handleLoadArchiveYear(arch)}
                              className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded text-[10px] font-bold transition cursor-pointer"
                              title="Wczytaj tę bazę roczną"
                            >
                              Przywróć
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteArchiveYear(arch.yearKey)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Usuń z archiwum"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    Brak innych lat szkolnych w lokalnym archiwum. Kopiując ustawienia utworzysz nową pozycję w archiwum bazy danych.
                  </div>
                )}
              </div>
              
              {/* Sekcja: Ustawienia Godzin Lekcznych (Dzwonków) */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      ⏱️ Godziny lekcyjne (Dzwonki w szkole)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Zdefiniuj pory dzwonków dla lekcji w szkole.</p>
                  </div>
                  <div className="flex gap-2">
                    {!hoursList.some(h => h.num === 0) && (
                      <button
                        type="button"
                        onClick={handleAddHourZero}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-1 transition shadow-sm"
                      >
                        <Plus size={13} className="text-amber-600" /> Dodaj godzinę 0
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddHourRow}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 transition shadow-sm"
                    >
                      <Plus size={13} className="text-blue-600" /> Dodaj godzinę
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lista godzin */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Bieżący rozkład godzin:</span>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {hoursList.map((hour) => (
                        <div key={hour.num} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                            {hour.num}
                          </span>
                          
                          <div className="flex items-center gap-1.5 flex-1">
                            <input 
                              type="time"
                              required
                              value={hour.start}
                              onChange={(e) => handleUpdateHourTime(hour.num, 'start', e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none w-20 text-center focus:border-blue-500"
                            />
                            <span className="text-slate-400 font-bold">—</span>
                            <input 
                              type="time"
                              required
                              value={hour.end}
                              onChange={(e) => handleUpdateHourTime(hour.num, 'end', e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none w-20 text-center focus:border-blue-500"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveHourRow(hour.num)}
                            className="p-1 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Usuń tę godzinę"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generator dzwonków */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3.5">
                    <div>
                      <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1 text-left">
                        <Sparkles size={14} className="text-blue-600" /> Szybki generator dzwonków
                      </h4>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5 text-left">Automatycznie wylicz wszystkie godziny lekcyjne od zera.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">POCZĄTEK (1. lekcja)</label>
                        <input
                          type="time"
                          value={genStart}
                          onChange={(e) => setGenStart(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">DŁUGOŚĆ LEKCJI (MIN)</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={genLessonMin}
                          onChange={(e) => setGenLessonMin(parseInt(e.target.value) || 45)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">STANDARDOWA PRZERWA</label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={genBreakMin}
                          onChange={(e) => setGenBreakMin(parseInt(e.target.value) || 10)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">LICZBA GODZIN (1-15)</label>
                        <input
                          type="number"
                          min={1}
                          max={15}
                          required
                          value={genCount}
                          onChange={(e) => setGenCount(parseInt(e.target.value) || 7)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                        />
                      </div>
                    </div>

                    <div className="border-t border-blue-100/60 pt-2 grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-0.5 col-span-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">DŁUGA PRZERWA (MIN)</label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={genLongBreakMin}
                          onChange={(e) => setGenLongBreakMin(parseInt(e.target.value) || 20)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                        />
                      </div>
                      <div className="space-y-0.5 col-span-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">PO LEKCJI NR</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={genLongBreakAfter}
                          onChange={(e) => setGenLongBreakAfter(parseInt(e.target.value) || 3)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateHours}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition duration-200"
                    >
                      🚀 Wygeneruj rozkład dzwonków
                    </button>
                  </div>
                </div>

                {/* Checkbox do autozapisu przerw */}
                <div className="p-3 bg-slate-50 border border-slate-105 rounded-xl flex items-start gap-2.5 text-left">
                  <input
                    type="checkbox"
                    id="sync-breaks-checkbox"
                    checked={syncBreaks}
                    onChange={(e) => setSyncBreaks(e.target.checked)}
                    className="mt-0.5 cursor-pointer accent-blue-600"
                  />
                  <label htmlFor="sync-breaks-checkbox" className="text-slate-600 text-xs font-semibold cursor-pointer select-none leading-snug">
                    <span className="block font-bold text-slate-800">Automatycznie zsynchronizuj przerwy dyżurów korytarzowych</span>
                    Zalecane. System automatycznie ułoży pory przerw dla dyżurów na podstawie wprowadzonych dzwonków lekcyjnych.
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveStep1}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition"
                >
                  Zapisz i Przejdź Dalej <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Buildings */}
          {activeStep === 2 && (
            <div className="max-w-4xl mx-auto space-y-6">
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
                        Zlecona zewnętrzna (hala, basen itp.)
                      </label>
                    </div>

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
                          onClick={() => {
                            setEditingBldId(null);
                            setNewBldName('');
                            setNewBldAddress('');
                            setNewBldIsZlecony(false);
                            setNewBldHasCustomStructure(false);
                            setNewBldCustomFloors('');
                            setNewBldCustomSegments('');
                          }}
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
                                <span className="bg-amber-100 border border-amber-200 text-amber-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Zlecony</span>
                              ) : (
                                <span className="bg-blue-100 border border-blue-200 text-blue-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Własny</span>
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
          )}

          {/* STEP 3: Classrooms and specific/special purpose rooms */}
          {activeStep === 3 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 3</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">📐 Pracownie i specyficzne sale</h2>
                <p className="text-xs text-slate-500 mt-1">Wprowadź sale lekcyjne z oznaczeniem czy są przeznaczone do zajęć informatycznych, sportowych czy indywidualnych.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form to add sala */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
                  <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Dodaj salę</h3>
                  <form onSubmit={handleAddRoom} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Numer sali</label>
                        <input 
                          type="text" 
                          required
                          placeholder="np. 1, 12, 5"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold"
                          value={newRoomNum}
                          onChange={(e) => setNewRoomNum(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Budynek</label>
                        <select 
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                          value={newRoomBldIdx}
                          onChange={(e) => setNewRoomBldIdx(parseInt(e.target.value))}
                        >
                          {appState.buildings.map((b, idx) => (
                            <option key={b.id} value={idx}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Piętro</label>
                        {appState.buildings[newRoomBldIdx]?.hasCustomStructure && appState.buildings[newRoomBldIdx]?.customFloors ? (
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-semibold text-slate-700"
                            value={newRoomFloorNum}
                            onChange={(e) => setNewRoomFloorNum(e.target.value)}
                          >
                            {appState.buildings[newRoomBldIdx].customFloors?.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        ) : (
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-semibold text-slate-700"
                            value={newRoomFloorNum}
                            onChange={(e) => setNewRoomFloorNum(e.target.value)}
                          >
                            <option value="-1">Podziemie (-1)</option>
                            <option value="0">Parter (0)</option>
                            <option value="1">Piętro I (1)</option>
                            <option value="2">Piętro II (2)</option>
                            <option value="3">Piętro III (3)</option>
                            <option value="4">Piętro IV (4)</option>
                          </select>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Segment</label>
                        {appState.buildings[newRoomBldIdx]?.hasCustomStructure && appState.buildings[newRoomBldIdx]?.customSegments ? (
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-semibold text-slate-700"
                            value={newRoomSegmentChar}
                            onChange={(e) => setNewRoomSegmentChar(e.target.value)}
                          >
                            <option value="">Brak segmentu (Strefa Ogólna)</option>
                            {appState.buildings[newRoomBldIdx].customSegments?.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-semibold text-slate-700"
                            value={newRoomSegmentChar}
                            onChange={(e) => setNewRoomSegmentChar(e.target.value)}
                          >
                            <option value="">Brak segmentu (Strefa Ogólna)</option>
                            <option value="A">Segment A</option>
                            <option value="B">Segment B</option>
                            <option value="C">Segment C</option>
                            <option value="D">Segment D</option>
                            <option value="E">Segment E</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Pre-formatted room abbreviation pattern */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            checked={newRoomAutomaticAbbr}
                            onChange={(e) => setNewRoomAutomaticAbbr(e.target.checked)}
                          />
                          Skrót automatyczny [piętro+segment+nr]
                        </label>
                      </div>
                      {newRoomAutomaticAbbr ? (
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                          <span>Skrót sali:</span>
                          <span className="font-mono bg-blue-600 text-white px-2.5 py-0.5 rounded text-[11px] font-black tracking-wider animate-pulse">
                            {computedAbbr || 'Uzupełnij nr sali'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold">Dowolna nazwa/skrót sali</label>
                          <input 
                            type="text"
                            placeholder="np. Basen-A, SalaG"
                            className="w-full px-2.5 py-1 border border-slate-200 bg-white rounded-md text-xs font-mono outline-none"
                            value={newRoomCustomAbbr}
                            onChange={(e) => setNewRoomCustomAbbr(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">Przeznaczenie i Typ specjalny</label>
                      <select 
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 completed rounded-lg text-xs outline-none font-semibold text-slate-800"
                        value={newRoomType}
                        onChange={(e) => setNewRoomType(e.target.value as any)}
                      >
                        <option value="ogolna">Sala ogólna (klasowa)</option>
                        <option value="wczesnoszkolna">🧸 Sala dla klas 1-3 (Nauczanie początkowe)</option>
                        <option value="informatyka">🖥️ Informatyka / Pracownia komp.</option>
                        <option value="sport">🏊 Sportowe (sala gimn / basen)</option>
                        <option value="indywidualne">🗣️ Zajęcia indywidualne (rewalidacja)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">Krótki opis / specjalizacja</label>
                      <input 
                        type="text" 
                        placeholder="np. Gabinet polonistyczny, Logopedia"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-medium text-slate-700"
                        value={newRoomDesc}
                        onChange={(e) => setNewRoomDesc(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-1.5 transition">
                        {editingRoomId ? <RefreshCw size={14} /> : <Plus size={14} />} {editingRoomId ? 'Zapisz zmiany' : 'Dodaj salę'}
                      </button>
                      {editingRoomId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingRoomId(null);
                            setNewRoomNum('');
                            setNewRoomCustomAbbr('');
                            setNewRoomDesc('');
                          }}
                          className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition"
                        >
                          Anuluj
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Configuration List View */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Planowane gabinety w systemie</h3>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.planLekcji.rooms.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                    {appState.planLekcji.rooms.map((r) => (
                      <div key={r.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <span className="w-12 h-10 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-200">
                            {r.name}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-950">Sala {r.name}</span>
                              {r.type === 'informatyka' && (
                                <span className="bg-violet-100 text-violet-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Informatyka</span>
                              )}
                              {r.type === 'sport' && (
                                <span className="bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Zajęcia Sportowe</span>
                              )}
                              {r.type === 'indywidualne' && (
                                <span className="bg-yellow-100 text-yellow-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Zg. Indywidualne</span>
                              )}
                              {(r.type === 'ogolna' || !r.type) && (
                                <span className="bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded text-[9px] uppercase">Ogólna</span>
                              )}
                              {r.isGrade1_3 && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200/65 font-semibold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide flex items-center gap-0.5">🧸 Klasy 1-3</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{r.desc || 'Gabinet ogólny'}</p>
                            
                            {(() => {
                              const loc = getRoomLocationInfo(r.name);
                              if (loc) {
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-semibold text-slate-500">
                                    <span className="px-1.5 py-0.5 bg-slate-100/80 rounded border border-slate-200/50">🏢 {loc.bld}</span>
                                    <span className="px-1.5 py-0.5 bg-slate-100/80 rounded border border-slate-200/50">📶 {loc.floor}</span>
                                    <span className="px-1.5 py-0.5 bg-slate-100/80 rounded border border-slate-200/50">🧱 {loc.seg}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingRoomId(r.id);
                              setNewRoomNum(r.name);
                              setNewRoomAutomaticAbbr(false);
                              setNewRoomCustomAbbr(r.name);
                              setNewRoomDesc(r.desc);
                              setNewRoomType(r.isGrade1_3 ? 'wczesnoszkolna' : ((r.type || 'ogolna') as any));
                              
                              const loc = getRoomLocationInfo(r.name);
                              if (loc) {
                                const bldIdx = appState.buildings.findIndex(b => b.name === loc.bld);
                                if (bldIdx !== -1) {
                                  setNewRoomBldIdx(bldIdx);
                                  const bld = appState.buildings[bldIdx];
                                  if (bld.hasCustomStructure && bld.customFloors) {
                                    if (bld.customFloors.includes(loc.floor)) {
                                      setNewRoomFloorNum(loc.floor);
                                    }
                                  }
                                }
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 rounded transition-colors"
                            title="Edytuj"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveRoom(r.id, r.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Usuń"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {appState.planLekcji.rooms.length === 0 && (
                      <p className="p-10 text-center text-xs text-slate-400">Brak gabinetów. Wprowadź pierwszą salę!</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveStep(2)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
                  <ArrowLeft size={14} /> Wstecz
                </button>
                <button onClick={() => setActiveStep(4)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
                  Dalej: Klasy i Grupy <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Classes and Groups */}
          {activeStep === 4 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 4</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">👥 Klasy i podgrupy wewnątrzklasowe</h2>
                <p className="text-xs text-slate-500 mt-1">Zdefiniuj podstawowe klasy (np. 1A, 2A) oraz utwórz ich podgrupy do zajęć z informatyki lub języków obcych.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Class Creator Column */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Dodaj Klasę</h3>
                    <form onSubmit={handleAddClass} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Nazwa oddziału</label>
                        <input 
                          type="text" 
                          required
                          placeholder="np. 1A lub 8B"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                          value={newClsName}
                          onChange={(e) => setNewClsName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1.5">Kolor oddziału (Wybierz spośród 60 kolorów)</label>
                        <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto p-1.5 border border-slate-200 bg-slate-50 rounded-lg">
                          {PALETTE_COLORS.map(c => (
                            <button
                              type="button"
                              key={c}
                              onClick={() => setNewClsColor(c)}
                              className={`w-5 h-5 rounded-full border shrink-0 transition ${
                                newClsColor === c ? 'ring-2 ring-blue-500 border-white scale-110 shadow-sm' : 'border-slate-200 hover:scale-110'
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1 transition">
                          {editingClassId ? <RefreshCw size={13} /> : <Plus size={13} />} {editingClassId ? 'Zapisz klasę' : 'Dodaj klasę'}
                        </button>
                        {editingClassId && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingClassId(null);
                              setNewClsName('');
                            }}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                          >
                            Anuluj
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
 
                  {appState.classes.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Podział na podgrupy</h3>
                      <form onSubmit={handleAddGroup} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold">Wybierz klasę macierzystą</label>
                          <select 
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-semibold text-slate-700"
                            value={selectedClsForGrp || (appState.classes[0] ? appState.classes[0].id : '')}
                            onChange={(e) => setSelectedClsForGrp(e.target.value)}
                          >
                            {appState.classes.map(c => (
                              <option key={c.id} value={c.id}>Oddział {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold">Nazwa podgrupy</label>
                          <input 
                            type="text" 
                            required
                            placeholder="np. gr. językowa, gr. chłopców"
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                            value={newGrpName}
                            onChange={(e) => setNewGrpName(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1 transition">
                            {editingGroupId ? <RefreshCw size={13} /> : <Plus size={13} />} {editingGroupId ? 'Zapisz zmianę' : 'Stwórz podgrupę'}
                          </button>
                          {editingGroupId && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setEditingGroupId(null);
                                setNewGrpName('');
                              }}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                            >
                              Anuluj
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Database classes rendering */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Zdefiniowane klasy i ich podgrupy</h3>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.classes.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                    {appState.classes.map((c) => {
                      const cGrps = appState.planLekcji.schoolGroups.filter(g => g.classId === c.id);
                      return (
                        <div key={c.id} className="p-4 hover:bg-slate-50/40">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: c.color }} />
                              <span className="text-sm font-black text-slate-950 font-mono tracking-wider">Klasa {c.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingClassId(c.id);
                                  setNewClsName(c.name);
                                  setNewClsColor(c.color || '#2563eb');
                                }}
                                className="text-slate-400 hover:text-blue-500 p-1"
                                title="Edytuj klasę"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRemoveClass(c.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="Usuń klasę"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
 
                          {/* Render Groups within this class */}
                          <div className="mt-3 pl-5 space-y-1.5">
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">Struktura podziałów:</span>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                Cała klasa (domyślna)
                              </span>
                              {cGrps.map(g => (
                                <span 
                                  key={g.id} 
                                  className="bg-sky-50 border border-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0"
                                >
                                  <span 
                                    className="cursor-pointer hover:underline"
                                    onClick={() => {
                                      setEditingGroupId(g.id);
                                      setNewGrpName(g.name);
                                      setSelectedClsForGrp(g.classId);
                                    }}
                                    title="Kliknij, aby edytować podgrupę"
                                  >
                                    {g.name}
                                  </span>
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveGroup(g.id, c.id)}
                                    className="hover:text-red-500 font-black p-0.5 leading-none text-[8px]"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {appState.classes.length === 0 && (
                      <p className="p-10 text-center text-xs text-slate-400">Brak zarejestrowanych klas.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveStep(3)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
                  <ArrowLeft size={14} /> Wstecz
                </button>
                <button onClick={() => setActiveStep(5)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
                  Dalej: Przedmioty <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Subjects */}
          {activeStep === 5 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 5</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">📚 Przedmioty szkolne i edukacyjne</h2>
                <p className="text-xs text-slate-500 mt-1">Uporządkuj listę prowadzonych lekcji przedmiotowych i przydziel im kolory do wizualizacji na planach.</p>
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
                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                    {appState.subjects.map((sub) => (
                      <div key={sub.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 text-white font-mono font-black text-[10px] rounded-lg tracking-wider flex items-center justify-center border shadow-sm" style={{ backgroundColor: sub.color || '#cbd5e1' }}>
                            {sub.short}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 leading-none">{sub.name}</span>
                              {sub.defaultGroupPattern && (
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                                  Grupa: {sub.defaultGroupPattern}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Identyfikator planowy: {sub.id}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
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
            </div>
          )}

          {/* STEP 6: Teachers & limits */}
          {activeStep === 6 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 6</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">🧑‍🏫 Kadra nauczycielska i limity godzin</h2>
                <p className="text-xs text-slate-500 mt-1">Dodaj nauczycieli podając ich imię, nazwisko, inicjały tablicowe oraz maksymalną dopuszczalną liczbę godzin etatowych (pensum).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Form column */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
                  <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">
                    {editingTeacherId ? '📝 Edytuj dane nauczyciela' : '➕ Dodaj Nauczyciela'}
                  </h3>
                  <form onSubmit={handleAddTeacher} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">Imię</label>
                      <input 
                        type="text" 
                        required
                        placeholder="np. Jan"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                        value={newTFirst}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTFirst(val);
                          updateTAbbrAuto(val, newTLast);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">Nazwisko</label>
                      <input 
                        type="text" 
                        required
                        placeholder="np. Kowalski"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                        value={newTLast}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTLast(val);
                          updateTAbbrAuto(newTFirst, val);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">Inicjały (Abbr)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="np. JKOW"
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold"
                        value={newTAbbr}
                        onChange={(e) => {
                          setNewTAbbr(e.target.value.toUpperCase());
                          setIsTAbbrManual(true);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">Pensum (godz.)</label>
                        <input 
                          type="number" 
                          required
                          min={1}
                          max={40}
                          placeholder="18"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-semibold text-slate-800"
                          value={newTMaxHours}
                          onChange={(e) => setNewTMaxHours(parseInt(e.target.value) || 18)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-indigo-600 font-bold">Nadgodziny</label>
                        <input 
                          type="number" 
                          required
                          min={0}
                          max={40}
                          placeholder="0"
                          className="w-full px-3 py-1.5 border border-indigo-100 bg-indigo-50/35 rounded-lg text-xs outline-none font-semibold text-indigo-800"
                          value={newTOvertimeHours}
                          onChange={(e) => setNewTOvertimeHours(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-100/50 p-2.5 rounded-lg border border-slate-200 space-y-2 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                          checked={newTInactive}
                          onChange={(e) => {
                            setNewTInactive(e.target.checked);
                            if (!e.target.checked) {
                              setNewTInactiveComment('');
                            }
                          }}
                        />
                        <span className="text-xs font-black text-rose-700">🔴 Nauczyciel nieaktywny</span>
                      </label>
                      {newTInactive && (
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold">Komentarz / Powód nieobecności</label>
                          <input 
                            type="text" 
                            placeholder="np. L4, urlop zdrowotny"
                            className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none"
                            value={newTInactiveComment}
                            onChange={(e) => setNewTInactiveComment(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {!newTInactive && inactiveTeachersLessonsList.length > 0 && (
                      <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 space-y-2 mt-1 text-[11px]">
                        <span className="font-bold text-indigo-800 flex items-center gap-1">
                          🔀 Przydziel zastępstwo ({newTSubstitutions.length})
                        </span>
                        <p className="text-[9px] text-slate-500 leading-snug">
                          Wybierz lekcje nieaktywnych nauczycieli oddane w zastępstwo:
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto bg-white p-1.5 border border-slate-200 rounded-md">
                          {inactiveTeachersLessonsList.map(({ inactiveTeacher, lessons }) => (
                            <div key={inactiveTeacher.id} className="space-y-1">
                              <div className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-100 pb-0.5 mb-1 flex justify-between items-center">
                                <span>Za {inactiveTeacher.abbr}</span>
                                {inactiveTeacher.inactiveComment && (
                                  <span className="text-[8px] text-rose-600 font-normal italic">({inactiveTeacher.inactiveComment})</span>
                                )}
                              </div>
                              {lessons.length === 0 ? (
                                <p className="text-[9px] text-slate-400 italic">Brak zaplanowanych godzin</p>
                              ) : (
                                lessons.map(ls => {
                                  const isChecked = newTSubstitutions.includes(ls.key);
                                  return (
                                    <label key={ls.key} className="flex items-center gap-1.5 hover:bg-slate-50 p-1 rounded cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setNewTSubstitutions(newTSubstitutions.filter(k => k !== ls.key));
                                          } else {
                                            setNewTSubstitutions([...newTSubstitutions, ls.key]);
                                          }
                                        }}
                                      />
                                      <span className="text-[10px] text-slate-700 leading-tight">
                                        <strong>{ls.className}</strong>: {DAY_NAMES[ls.day]} l.{ls.hourNum} ({ls.subjectShort})
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5">Kolor profilu (Wybierz spośród 60 kolorów)</label>
                      <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto p-1.5 border border-slate-200 bg-slate-50 rounded-lg">
                        {PALETTE_COLORS.map(c => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setNewTColor(c)}
                            className={`w-5 h-5 rounded-full border shrink-0 transition ${
                              newTColor === c ? 'ring-2 ring-blue-500 scale-110 shadow-sm' : 'border-slate-200 hover:scale-110'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="submit" 
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow"
                      >
                        {editingTeacherId ? 'Zapisz zmiany' : 'Stwórz profil nauczyciela'}
                      </button>
                      {editingTeacherId && (
                        <button 
                          type="button" 
                          onClick={handleCancelEditTeacher}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200"
                        >
                          Anuluj
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Grid List rendering with counts */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Planowana kadra pedagogiczna</h3>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.teachers.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                    {appState.teachers.map((t) => {
                      const assignedHours = teacherTotalHoursMap[t.id] || 0;
                      const limitSum = (t.maxHours || 18) + (t.overtimeHours || 0);
                      const exceed = assignedHours > limitSum;
                      return (
                        <div key={t.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 text-white font-mono font-black text-[11px] rounded-lg tracking-wide flex items-center justify-center border shadow-sm" style={{ backgroundColor: t.color || '#3b82f6' }}>
                              {t.abbr}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 leading-none">{t.first} {t.last}</span>
                                {t.inactive && (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                    🔴 Nieaktywny
                                  </span>
                                )}
                              </div>
                              {t.inactive && t.inactiveComment && (
                                <p className="text-[10px] text-rose-600 font-semibold italic mt-0.5">
                                  Powód: {t.inactiveComment}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Pensum: {t.maxHours}h {t.overtimeHours ? `+ ${t.overtimeHours}h nadg.` : ''}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                                  exceed ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  Przydział: {assignedHours}h / {limitSum}h
                                </span>
                                {!t.inactive && t.substitutions && t.substitutions.length > 0 && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-black border border-indigo-200" title={t.substitutions.join(', ')}>
                                    🔀 Zastępstwa: {t.substitutions.length} lekcji
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => handleStartEditTeacher(t)}
                              className="p-1 px-2 text-slate-400 hover:text-blue-600 rounded"
                              title="Edytuj profil"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button 
                              onClick={() => handleRemoveTeacher(t.id)}
                              className="p-1 px-2 text-slate-400 hover:text-red-500 rounded"
                              title="Usuń nauczyciela"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {appState.teachers.length === 0 && (
                      <p className="p-10 text-center text-xs text-slate-400">Brak zarejestrowanych nauczycieli.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveStep(5)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
                  <ArrowLeft size={14} /> Wstecz
                </button>
                <button onClick={() => setActiveStep(7)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
                  Dalej: Korytarze i dyżury <ArrowRight size={14} />
                </button>
              </div>

              {/* 🧑‍🏫 Teacher Edit Modal Over Creator */}
              {editingTeacherId !== null && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🧑‍🏫</span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Edycja Profilu Nauczyciela</h3>
                          <p className="text-[11px] text-slate-500 font-medium">Identyfikator: <span className="font-mono text-slate-600">{editingTeacherId}</span></p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleCancelEditTeacher}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column: Form Details */}
                        <div className="lg:col-span-5 space-y-4">
                          <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            👤 Informacje podstawowe
                          </h4>
                          
                          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 font-bold col-span-2">Imię</label>
                              <input 
                                type="text" 
                                required
                                placeholder="np. Jan"
                                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                                value={newTFirst}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewTFirst(val);
                                  updateTAbbrAuto(val, newTLast);
                                }}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 font-bold col-span-2">Nazwisko</label>
                              <input 
                                type="text" 
                                required
                                placeholder="np. Kowalski"
                                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                                value={newTLast}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewTLast(val);
                                  updateTAbbrAuto(newTFirst, val);
                                }}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 font-bold col-span-2">Inicjały (Skrót na planie)</label>
                              <input 
                                type="text" 
                                required
                                placeholder="np. JKOW"
                                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-bold text-slate-800 uppercase focus:border-blue-500"
                                value={newTAbbr}
                                onChange={(e) => {
                                  setNewTAbbr(e.target.value.toUpperCase());
                                  setIsTAbbrManual(true);
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold col-span-2">Pensum (godz.)</label>
                                <input 
                                  type="number" 
                                  required
                                  min={1}
                                  max={40}
                                  placeholder="18"
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-semibold text-slate-800 focus:border-blue-500"
                                  value={newTMaxHours}
                                  onChange={(e) => setNewTMaxHours(parseInt(e.target.value) || 18)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-indigo-600 font-bold col-span-2">Nadgodziny</label>
                                <input 
                                  type="number" 
                                  required
                                  min={0}
                                  max={40}
                                  placeholder="0"
                                  className="w-full px-3 py-1.5 border border-indigo-150 bg-indigo-50/20 rounded-lg text-xs outline-none font-semibold text-indigo-800 focus:border-indigo-500"
                                  value={newTOvertimeHours}
                                  onChange={(e) => setNewTOvertimeHours(parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 col-span-2">
                              <label className="text-[10px] text-slate-500 font-bold block col-span-2">Kolor profilu</label>
                              <div className="grid grid-cols-8 gap-0.5 p-1.5 border border-slate-200 bg-white rounded-lg max-h-24 overflow-y-auto">
                                {PALETTE_COLORS.map(c => (
                                  <button
                                    type="button"
                                    key={c}
                                    onClick={() => setNewTColor(c)}
                                    className={`w-4.5 h-4.5 rounded-full border shrink-0 transition ${
                                      newTColor === c ? 'ring-2 ring-blue-500 scale-110 shadow-sm' : 'border-slate-100 hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="bg-slate-100/65 p-3 rounded-xl border border-slate-200/60 space-y-2 mt-2 col-span-2">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                                  checked={newTInactive}
                                  onChange={(e) => {
                                    setNewTInactive(e.target.checked);
                                    if (!e.target.checked) setNewTInactiveComment('');
                                  }}
                                />
                                <span className="text-xs font-black text-rose-700">🔴 Nauczyciel nieaktywny</span>
                              </label>
                              {newTInactive && (
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 font-bold">Komentarz / Powód nieobecności</label>
                                  <input 
                                    type="text" 
                                    placeholder="np. L4, urlop zdrowotny"
                                    className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none"
                                    value={newTInactiveComment}
                                    onChange={(e) => setNewTInactiveComment(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>

                            {!newTInactive && inactiveTeachersLessonsList.length > 0 && (
                              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-150 space-y-2.5 mt-2 col-span-2">
                                <span className="font-bold text-indigo-800 text-xs flex items-center gap-1.5">
                                  🔀 Przydzielone zastępstwa ({newTSubstitutions.length})
                                </span>
                                <p className="text-[10px] text-slate-500 leading-snug">
                                  Zaznacz, które z poniższych zajęć nieobecnych nauczycieli zostały przydzielone temu nauczycielowi w ramach zastępstwa:
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto bg-white p-2 border border-slate-200 rounded-lg">
                                  {inactiveTeachersLessonsList.map(({ inactiveTeacher, lessons }) => (
                                    <div key={inactiveTeacher.id} className="space-y-1 border-b last:border-0 border-slate-100 pb-1.5 last:pb-0 mb-1.5 last:mb-0">
                                      <div className="text-[9px] font-black text-slate-500 uppercase flex justify-between items-center bg-slate-50/80 px-1 py-0.5 rounded">
                                        <span>Za {inactiveTeacher.first} {inactiveTeacher.last} ({inactiveTeacher.abbr})</span>
                                        {inactiveTeacher.inactiveComment && (
                                          <span className="text-[8.5px] text-rose-600 font-semibold italic">({inactiveTeacher.inactiveComment})</span>
                                        )}
                                      </div>
                                      {lessons.length === 0 ? (
                                        <p className="text-[9px] text-slate-400 italic px-1 pt-1">Brak zaplanowanych godzin</p>
                                      ) : (
                                        lessons.map(ls => {
                                          const isChecked = newTSubstitutions.includes(ls.key);
                                          return (
                                            <label key={ls.key} className="flex items-center gap-2 hover:bg-slate-50/85 p-1.5 rounded cursor-pointer select-none border border-slate-50 text-[10.5px]">
                                              <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                                                checked={isChecked}
                                                onChange={() => {
                                                  if (isChecked) {
                                                    setNewTSubstitutions(newTSubstitutions.filter(k => k !== ls.key));
                                                  } else {
                                                    setNewTSubstitutions([...newTSubstitutions, ls.key]);
                                                  }
                                                }}
                                              />
                                              <div className="leading-tight shrink overflow-hidden">
                                                <div className="font-bold text-slate-800">{DAY_NAMES[ls.day]}, lekcja {ls.hourNum}</div>
                                                <div className="text-slate-500 text-[9px]">{ls.className} • <span className="font-semibold" style={{ color: ls.color }}>{ls.subjectShort}</span></div>
                                              </div>
                                            </label>
                                          );
                                        })
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Weekly Availability Grid */}
                        <div className="lg:col-span-7 space-y-3 flex flex-col">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                              📅 Godziny Dostępności Nauczyciela
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAllAvailability(true)}
                                className="text-[9px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold border border-emerald-200 transition"
                              >
                                Zaznacz wszystkie
                              </button>
                              <button
                                type="button"
                                onClick={() => setAllAvailability(false)}
                                className="text-[9px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-0.5 rounded font-bold border border-slate-300 transition"
                              >
                                Odznacz wszystkie
                              </button>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-normal">
                            Kliknij na poszczególne godziny na planie, aby przełączać status dostępności nauczyciela we wskazanych porach. Zielone komórki oznaczają gotowość do prowadzenia zajęć.
                          </p>

                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white flex-1 min-h-[250px] overflow-y-auto max-h-[300px]">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead className="sticky top-0 bg-white z-[10]">
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="p-2 font-bold text-slate-500 uppercase text-[9px] w-14 border-r border-slate-150 text-center">Lekcja</th>
                                  {['Pn', 'Wt', 'Śr', 'Cz', 'Pt'].map((dayName, dayIndex) => (
                                    <th key={dayIndex} className="p-2 font-bold text-slate-750 text-center uppercase tracking-wider text-[9px] border-r border-slate-100 last:border-r-0">
                                      {dayName}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                {(appState.planLekcji.hours && appState.planLekcji.hours.length > 0 ? appState.planLekcji.hours : hoursList).map((h) => (
                                  <tr key={h.num} className="hover:bg-slate-55">
                                    <td className="p-1 border-r border-slate-150 bg-slate-50 font-bold text-slate-600 text-center">
                                      <div className="text-[9px]">Lekcja {h.num}</div>
                                      <div className="text-[8px] text-slate-400 font-normal leading-none">{h.start}-{h.end}</div>
                                    </td>
                                    {[0, 1, 2, 3, 4].map((dayIndex) => {
                                      const code = `${dayIndex}-${h.num}`;
                                      const isAvailable = newTAvailability.includes(code);
                                      return (
                                        <td 
                                          key={dayIndex} 
                                          onClick={() => {
                                            if (newTAvailability.includes(code)) {
                                              setNewTAvailability(newTAvailability.filter(x => x !== code));
                                            } else {
                                              setNewTAvailability([...newTAvailability, code]);
                                            }
                                          }}
                                          className={`p-1.5 text-center cursor-pointer select-none transition-all border-r last:border-r-0 border-slate-100 ${
                                            isAvailable 
                                              ? 'bg-emerald-50 text-emerald-800' 
                                              : 'bg-rose-50 text-rose-500/80 line-through decoration-rose-300'
                                          }`}
                                        >
                                          <div className="font-extrabold uppercase text-[8px] tracking-wider">
                                            {isAvailable ? '✓ Dostępny' : '✗ Zajęty'}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      <button 
                        type="button" 
                        onClick={handleCancelEditTeacher}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        Anuluj
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAddTeacher}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        Zapisz zmiany profilu
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Corridor places & duty settings */}
          {activeStep === 7 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 7</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">🚪 Dyżury korytarzowe</h2>
                <p className="text-xs text-slate-500 mt-1">Stwórz punkty dyżurów korytarzowych/schodowych ze szczegółowym określeniem ilu nauczycieli powinno jednocześnie pilnować porządku na danej przerwie.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Addition Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
                  <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider">Dodaj punkt dyżurów</h3>
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
                          onChange={(e) => setNewCorridorCount(Math.max(1, parseInt(e.target.value) || 1))}
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

                    <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow mt-2">
                      Dodaj punkt dyżuru
                    </button>
                  </form>
                </div>

                {/* Summary corridors rendering */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Planowane punkty dozorowania porządku</h3>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.dyzury.miejsca.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                    {appState.dyzury.miejsca.map(place => (
                      <div key={place.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50">
                        <div className="flex items-start gap-3 w-[85%]">
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                            <Shield size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 leading-none">{place.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {place.floor && <span className="text-[10px] text-slate-400 font-semibold">{place.floor}</span>}
                              <span className="bg-indigo-100 text-indigo-800 font-black px-1.5 py-0.2 rounded text-[9px] uppercase">
                                Potrzeba: {place.teachersNeeded || 1} {place.teachersNeeded === 1 ? 'nauczyciel' : 'nauczycieli'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">{place.desc || '—'}</p>
                            
                            {/* Connected classroom badges */}
                            {place.connectedRooms && place.connectedRooms.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-2">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Przyległe sale:</span>
                                {place.connectedRooms.map(rm => (
                                  <span key={rm} className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-mono font-bold animate-fade-in">
                                    🚪 {rm}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveCorridor(place.id)}
                          className="p-1 px-2 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
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
                  Dalej: Przydziały lekcyjne <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: Assignments / Pairing Teachers to Classes in Subjects */}
          {activeStep === 8 && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 8</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">🔗 Przypisanie nauczycieli do klas (Przydziałylekcji)</h2>
                <p className="text-xs text-slate-500 mt-1">Zbuduj formalną matrycę przydziałów: który nauczyciel uczy jakiego przedmiotu w sprecyzowanej klasie i w jakim wymiarze godzin tygodniowo.</p>
              </div>

              {/* Form & details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Form pairing */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit space-y-3">
                  <h3 className="text-xs font-black text-slate-900 mb-2 uppercase tracking-wider">Dodaj Nowy Przydział</h3>
                  <form onSubmit={handleAddAssignment} className="space-y-4">
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block">1. Oddział Szkolny (Klasa) *</label>
                      <select 
                        required
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                        value={newAsgClass}
                        onChange={(e) => {
                          const clsId = e.target.value;
                          setNewAsgClass(clsId);
                          setNewAsgGroup(''); // reset group first
                          autoSelectGroupForAssignment(clsId, newAsgSubject);
                        }}
                      >
                        <option value="">Wybierz klasę...</option>
                        {appState.classes.map(c => (
                          <option key={c.id} value={c.id}>Oddział {c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional inner groups */}
                    {newAsgClass && appState.planLekcji.schoolGroups.filter(g => g.classId === newAsgClass).length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">Opcjonalna podgrupa</label>
                        <select 
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none text-blue-600 font-bold"
                          value={newAsgGroup}
                          onChange={(e) => setNewAsgGroup(e.target.value)}
                        >
                          <option value="">Uczy całą klasę</option>
                          {appState.planLekcji.schoolGroups.filter(g => g.classId === newAsgClass).map(g => (
                            <option key={g.id} value={g.id}>Grupa: {g.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">2. Nauczyciel</label>
                        <select 
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                          value={newAsgTeacher}
                          onChange={(e) => setNewAsgTeacher(e.target.value)}
                        >
                          <option value="">Brak (Wakat)</option>
                          {appState.teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.first[0]}. {t.last} ({t.abbr})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">3. Przedmiot *</label>
                        <select 
                          required
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                          value={newAsgSubject}
                          onChange={(e) => {
                            const subjId = e.target.value;
                            setNewAsgSubject(subjId);
                            autoSelectGroupForAssignment(newAsgClass, subjId);
                          }}
                        >
                          <option value="">Wybierz...</option>
                          {appState.subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">4. Sugerowana sala</label>
                        <select 
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                          value={newAsgRoom}
                          onChange={(e) => setNewAsgRoom(e.target.value)}
                        >
                          <option value="">Wybierz salę...</option>
                          {appState.planLekcji.rooms.map(r => (
                            <option key={r.id} value={r.id}>Gabin. {r.name} ({r.desc})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">Wymiar lekcji / tyg</label>
                        <input 
                          type="number" 
                          required
                          min={1}
                          max={15}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold text-center text-slate-800"
                          value={newAsgHours}
                          onChange={(e) => setNewAsgHours(parseInt(e.target.value) || 2)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block">5. Rozkład lekcji (Łączenie w bloki) *</label>
                      <select 
                        required
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none text-slate-700 font-bold bg-blue-50/40 focus:bg-white"
                        value={newAsgBlockSize}
                        onChange={(e) => setNewAsgBlockSize(Number(e.target.value))}
                      >
                        <option value={1}>Pojedyncze lekcje (1h)</option>
                        <option value={2}>Bloki dwugodzinne (2h)</option>
                        <option value={3}>Bloki trzygodzinne (3h)</option>
                        <option value={0}>Dowolny układ dzwonków / bloków</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1 select-none">
                        👥 Łączenie oddziałów (Grupa międzyoddziałowa)
                      </label>
                      <p className="text-[9px] text-slate-400 leading-normal select-none">
                        Chcesz połączyć te zajęcia w grupę międzyoddziałową (np. wspólny WF, religia, język)? Wybierz dodatkowe klasy biorące razem udział w tych lekcjach:
                      </p>
                      
                      {newAsgClass ? (
                        <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto pr-1">
                          {appState.classes
                            .filter(c => c.id !== newAsgClass)
                            .map(c => {
                              const isLinked = newAsgLinkedClasses.includes(c.id);
                              return (
                                <button
                                  type="button"
                                  key={c.id}
                                  onClick={() => {
                                    if (isLinked) {
                                      setNewAsgLinkedClasses(newAsgLinkedClasses.filter(id => id !== c.id));
                                    } else {
                                      setNewAsgLinkedClasses([...newAsgLinkedClasses, c.id]);
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                    isLinked
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {isLinked ? '✓ ' : ''}kl. {c.name}
                                </button>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-400 italic">Najpierw wybierz główną klasę powyżej.</p>
                      )}
                    </div>

                    <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow mt-3 flex items-center justify-center gap-1.5 transition">
                      <Plus size={14} /> Przypisz lekcję
                    </button>
                  </form>
                </div>

                {/* Assignments List grid */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Aktualna siatka przydziałów etatowych</h3>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">{appState.planLekcji.assignments.length} pozycji</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto flex-1">
                    {appState.planLekcji.assignments.map((asg) => {
                      const cls = classesMap.get(asg.classId);
                      const t = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                      const s = subjectsMap.get(asg.subjectId);
                      const room = asg.roomId ? roomsMap.get(asg.roomId) : null;
                      const grp = asg.groupId ? groupsMap.get(asg.groupId) : null;

                      if (!cls || !s) return null;

                      return (
                        <div key={asg.id} className="p-3.5 hover:bg-slate-50/50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 text-[10px] font-black text-white font-mono rounded-xl shadow-sm border flex items-center justify-center shrink-0" style={{ backgroundColor: cls.color || '#cbd5e1' }}>
                              {cls.name}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">{s.name}</span>
                                {grp && (
                                  <span className="bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.2 rounded text-[8px] uppercase">{grp.name}</span>
                                )}
                                {asg.linkedClassIds && asg.linkedClassIds.length > 0 && (
                                  <span className="bg-indigo-55 bg-indigo-50 text-indigo-750 border border-indigo-150 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase flex items-center gap-0.5">
                                    👥 Międzyoddziałowy: {[cls.name, ...asg.linkedClassIds.map(id => classesMap.get(id)?.name)].filter(Boolean).join(' + ')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                                  <GraduationCap size={11} /> Nauczyciel: {t ? `${t.first[0]}. ${t.last} (${t.abbr})` : 'WAKAT'}
                                </span>
                                {room && (
                                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                                    <MapPin size={11} /> Sala {room.name}
                                  </span>
                                )}
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-black">
                                  Wymiar: {asg.hoursPerWeek}h/tyg
                                </span>
                                {asg.preferredBlockSize !== undefined && (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    asg.preferredBlockSize === 2 
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : asg.preferredBlockSize === 3
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : asg.preferredBlockSize === 1
                                          ? 'bg-slate-50 text-slate-500 border border-slate-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {asg.preferredBlockSize === 2 
                                      ? '🧱 Blok 2h'
                                      : asg.preferredBlockSize === 3
                                        ? '🧱 Blok 3h'
                                        : asg.preferredBlockSize === 1
                                          ? '📄 Lekcje 1h'
                                          : '🔄 Dowolny rozkład'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveAssignment(asg.id)}
                            className="p-1 px-2 text-slate-400 hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                    {appState.planLekcji.assignments.length === 0 && (
                      <p className="p-10 text-center text-xs text-slate-400">Brak zarejestrowanych przydziałów. Stwórz kolejny po lewej!</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveStep(7)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
                  <ArrowLeft size={14} /> Wstecz
                </button>
                <button onClick={() => setActiveStep(9)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
                  Dalej: Uczniowie i IPET <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 9: Defining Pupils / Students with special needs (IPET, NI, Rewalidacja) */}
          {activeStep === 9 && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 9</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">🎓 Definiowanie uczniów i potrzeb wspomagania</h2>
                <p className="text-xs text-slate-500 mt-1">Zdefiniuj uczniów wymagających indywidualnych ścieżek edukacyjnych, przypisz ich do klas macierzystych, zdefiniuj program oraz nauczycieli wspomagających.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel Lewy: Lista i Dodawanie uczniów */}
                <div className="space-y-6 lg:col-span-1">
                  
                  {/* Formularz dodawania nowego ucznia */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1">
                      <Plus size={14} className="text-blue-500" /> Dodaj nowego ucznia
                    </h3>
                    <form onSubmit={handleAddStudent} className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Imię</label>
                          <input 
                            type="text"
                            placeholder="np. Jan"
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                            value={newStudFirstName}
                            onChange={(e) => setNewStudFirstName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Nazwisko *</label>
                          <input 
                            type="text"
                            required
                            placeholder="np. Kowalski"
                            className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                            value={newStudLastName}
                            onChange={(e) => setNewStudLastName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block">Klasa macierzysta *</label>
                        <select 
                          required
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none"
                          value={newStudClassId}
                          onChange={(e) => setNewStudClassId(e.target.value)}
                        >
                          <option value="">Wybierz klasę macierzystą...</option>
                          {appState.classes.map(c => (
                            <option key={c.id} value={c.id}>Klasa {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block">Rodzaj wsparcia / program</label>
                        <select
                          required
                          className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none text-blue-600 font-bold"
                          value={newStudType}
                          onChange={(e) => setNewStudType(e.target.value as 'ni' | 'rewa' | 'wsp')}
                        >
                          <option value="ni">Nauczanie Indywidualne (NI)</option>
                          <option value="rewa">Rewalidacja / Orzeczenie</option>
                          <option value="wsp">Wspomaganie w klasie (IPET)</option>
                        </select>
                      </div>

                      <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition">
                        Utwórz profil ucznia
                      </button>
                    </form>
                  </div>

                  {/* Lista uczniów */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Zarejestrowani uczniowie</h3>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-black">
                        {(appState.planLekcji.specialStudents || []).length}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                      {(appState.planLekcji.specialStudents || []).map((student) => {
                        const isSelected = activeStudentId === student.id;
                        const cls = student.classId ? classesMap.get(student.classId) : null;
                        
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => setActiveStudentId(student.id)}
                            className={`p-3 flex justify-between items-center cursor-pointer transition ${
                              isSelected ? 'bg-blue-50/50 border-l-4 border-blue-600' : 'hover:bg-slate-50/45'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className={`text-xs font-bold leading-tight block ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                {student.firstName} {student.lastName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {cls ? (
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                    Klasa: {cls.name}
                                  </span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded text-[9px] font-bold border border-rose-100">
                                    Brak klasy
                                  </span>
                                )}
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                                  student.type === 'ni'
                                    ? 'bg-purple-100 text-purple-800'
                                    : student.type === 'rewa'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {student.type === 'ni' ? 'NI' : student.type === 'rewa' ? 'Rewa' : 'Wsp'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openEditModal(student); }}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                                title="Edytuj szczegóły ucznia w modalu"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => handleRemoveStudent(student.id, e)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(appState.planLekcji.specialStudents || []).length === 0 && (
                        <p className="p-8 text-center text-xs text-slate-400 italic">Brak uczniów w bazie. Dodaj pierwszy profil powyżej!</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Panel Prawy: Szczegóły wybranego ucznia */}
                <div className="lg:col-span-2 space-y-6">
                  {activeStudentId && activeStudent ? (() => {
                    const student = activeStudent;
                    const cls = student.classId ? classesMap.get(student.classId) : null;
                    const studAssignments = activeStudentAssignments;
                    const supportTeacherIds = student.supportTeacherIds || [];

                    return (
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                        
                        {/* Nagłówek Informacyjny Ucznia */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                              👤 {student.firstName} {student.lastName}
                              <button 
                                type="button"
                                onClick={() => openEditModal(student)}
                                className="inline-flex items-center gap-1 text-[10px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-lg transition font-extrabold cursor-pointer select-none"
                                title="Konfiguracja w dedykowanym oknie"
                              >
                                <Edit3 size={11} /> Edytuj w modalu
                              </button>
                            </h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-1">
                              Edycja planu IPET/indywidualnego • Klasa: <strong className="text-slate-700">{cls ? cls.name : 'nieprzypisana'}</strong> • Wsparcie: <strong className="text-slate-700 uppercase">{student.type === 'ni' ? 'Nauczanie indywidualne' : student.type === 'rewa' ? 'Rewalidacja' : 'Wspomaganie/IPET'}</strong>
                            </p>
                          </div>
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-xl px-2.5 py-1 text-xs font-bold font-mono">
                            ID: {student.id}
                          </span>
                        </div>

                        {/* SEKCJA 1: Lista indywidualnych przedmiotów (z wymiarem godzin) i nauczyciel prowadzący */}
                        <div className="space-y-4">
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">📚 Przypisz nowy przedmiot indywidualny</h4>
                            <form onSubmit={handleAddStudentAssignment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                              <div className="space-y-1 sm:col-span-1.5">
                                <label className="text-[10px] text-slate-400 font-bold block">1. Przedmiot *</label>
                                <select 
                                  required
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none"
                                  value={newStudSubjId}
                                  onChange={(e) => setNewStudSubjId(e.target.value)}
                                >
                                  <option value="">Wybierz...</option>
                                  {appState.subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.short})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1 sm:col-span-1.5">
                                <label className="text-[10px] text-slate-400 font-bold block">2. Nauczyciel prowadzący *</label>
                                <select
                                  required
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none"
                                  value={newStudTeachId}
                                  onChange={(e) => setNewStudTeachId(e.target.value)}
                                >
                                  <option value="">Wybierz...</option>
                                  {appState.teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold block">3. Godziny / Tydzień *</label>
                                <input 
                                  type="number"
                                  required
                                  min={1}
                                  max={15}
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-bold text-center text-slate-800"
                                  value={newStudHours}
                                  onChange={(e) => setNewStudHours(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                              </div>

                              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1">
                                <Plus size={12} /> Dodaj
                              </button>
                            </form>
                          </div>

                          {/* Lista przypisanych przedmiotów */}
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase">Przedmiot</th>
                                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase">Prowadzący</th>
                                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase text-center">Tygodniowo</th>
                                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase text-right">Usuń</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {studAssignments.map(asg => {
                                  const sName = subjectsMap.get(asg.subjectId)?.name || 'Nieznany';
                                  const tObj = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                                  const tName = tObj ? `${tObj.first[0]}. ${tObj.last} (${tObj.abbr})` : 'Nieprzypisany';
                                  return (
                                    <tr key={asg.id} className="hover:bg-slate-50/50">
                                      <td className="p-3 font-bold text-slate-900">{sName}</td>
                                      <td className="p-3 font-semibold text-slate-500">{tName}</td>
                                      <td className="p-3 font-black text-center text-indigo-600">{asg.hoursPerWeek}h / tyg</td>
                                      <td className="p-3 text-right">
                                        <button 
                                          type="button" 
                                          onClick={() => handleRemoveStudentAssignment(asg.id)}
                                          className="text-slate-400 hover:text-red-500 p-1"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {studAssignments.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-6 text-center text-slate-400 italic">Brak zdefiniowanych przedmiotów indywidualnych dla tego ucznia. Szczegóły dodasz powyżej!</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* SEKCJA 2: Nauczyciele wspomagający na lekcjach ogólnych w klasie macierzystej */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              🕵️ Nauczyciele wspomagający obecni w klasie macierzystej
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-normal">
                              Chcesz zadeklarować obecność nauczyciela wspomagającego podczas zajęć ogólnych w klasie macierzystej ({cls ? cls.name : 'brak'})? Zaznacz go na liście poniżej:
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                            {appState.teachers.map((teacher) => {
                              const isChecked = supportTeacherIds.includes(teacher.id);
                              return (
                                <button
                                  type="button"
                                  key={teacher.id}
                                  onClick={() => {
                                    let newIds = [...supportTeacherIds];
                                    if (isChecked) {
                                      newIds = newIds.filter(id => id !== teacher.id);
                                    } else {
                                      newIds.push(teacher.id);
                                    }
                                    handleUpdateStudent({
                                      ...student,
                                      supportTeacherIds: newIds
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition duration-150 flex items-center gap-1.5 shrink-0 ${
                                    isChecked
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                  }`}
                                >
                                  <span>{isChecked ? '✓' : '+'}</span>
                                  {teacher.first[0]}. {teacher.last} ({teacher.abbr})
                                </button>
                              );
                            })}
                            {appState.teachers.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">Brak zarejestrowanych nauczycieli. Dodaj ich najpierw w Kroku 6.</p>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                      <span className="text-3xl">👈</span>
                      <h4 className="text-slate-800 font-black text-sm">Wybierz profil ucznia lub utwórz nowego po lewej</h4>
                      <p className="text-[11px] text-slate-400 max-w-sm">Po wybraniu ucznia będziesz mógł zdefiniować listę jego indywidualnych zajęć (np. rewalidacja, SI, kinezyterapia) oraz zaznaczyć nauczycieli wspomagających w jego klasie macierzystej.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Dolne przyciski nawigacji */}
              <div className="flex justify-between pt-2">
                <button onClick={() => setActiveStep(8)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition">
                  <ArrowLeft size={14} /> Wstecz
                </button>
                <button onClick={() => setActiveStep(10)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition">
                  Dalej: Podsumowanie bazy danych <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 10: Summary & launch instructions */}
          {activeStep === 10 && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <div className="border-b border-slate-200 pb-4 text-center">
                <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2.5 py-1 rounded-full uppercase">Krok 10: Finalizacja</span>
                <h2 className="text-xl font-black text-slate-900 mt-2">🏁 Dane wprowadzone poprawnie!</h2>
                <p className="text-xs text-slate-500 mt-1">Końcowe podsumowanie bazy danych oraz wytyczne ułożenia planu lekcji.</p>
              </div>

              {/* Stats bento layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Budynki</span>
                  <span className="text-2xl font-black text-slate-800">{statsSummary.blds}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sale / Gabinety</span>
                  <span className="text-2xl font-black text-slate-800">{statsSummary.rooms}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Klasy</span>
                  <span className="text-2xl font-black text-slate-800">{statsSummary.classes}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Nauczyciele</span>
                  <span className="text-2xl font-black text-slate-800">{statsSummary.teachers}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Przedmioty</span>
                  <span className="text-2xl font-black text-slate-800">{statsSummary.subjects}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Stanowiska dyżurów</span>
                  <span className="text-2xl font-black text-slate-800">{statsSummary.corridors}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Godzin łącznie</span>
                  <span className="text-2xl font-black text-slate-800 text-blue-600">{statsSummary.totalHours} h</span>
                </div>
              </div>

              {/* Special education stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm flex flex-col justify-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Zdefiniowani uczniowie wsparcia</span>
                  <span className="text-2xl font-black text-indigo-750 text-indigo-600">{statsSummary.specialStudents}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl text-center shadow-sm flex flex-col justify-center">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">Wymiar lekcji indywidualnych</span>
                  <span className="text-2xl font-black text-indigo-750 text-indigo-600">{statsSummary.specialHours} h/tyg</span>
                </div>
              </div>

              {/* Detailed Polish guide for scheduling next phases */}
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5 select-none font-sans">
                  <HelpCircle size={15} /> Jak krok po kroku ułożyć teraz harmonogram lekcji?
                </h3>
                
                <div className="space-y-3.5 text-slate-700 text-xs">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <h4 className="font-bold text-blue-950">Etap 1: Plan Klas (Solfeggio planowania lekcji)</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">Przejdź do zakładki <strong>„Etap 1: Plan Klas”</strong>. Tutaj przydzielasz lekcje do dni i godzin dla poszczególnych oddziałów. Wybierz klasę z menu bocznego, przeciągaj przydziały do komórek planu lekcji i eliminuj konflikty nauczycielskie w czasie rzeczywistym.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <h4 className="font-bold text-blue-950">Zsynchronizuj ułożone lekcje z siatką sal</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">Po ułożeniu Planu Klas skorzystaj z przycisku <strong>„Przenieś do Planu Sal”</strong> w nagłówku. System weźmie ułożone jednostki lekcyjne i przeniesie je do bazy gabinetów.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <h4 className="font-bold text-blue-950">Etap 2: Przypisanie gabinetów dla lekcji</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">W zakładce <strong>„Etap 2: Plan Sal”</strong> dokonujesz ostatecznego rozmieszczenia lekcji w gabinetach lekcyjnych, salach sportowych, basenach lub pracowniach komputerowych. Pozwoli to uniknąć konfliktatów lokalowych.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <h4 className="font-bold text-blue-950">Etap 3: Dyżury korytarzowe i schodowe</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">W zakładce <strong>„Etap 3: Dyżury”</strong> przypisujesz nauczycieli na przerwach korytarzowych. Program wykorzystuje wprowadzoną wymaganą liczbę nauczycieli i pozwala na losowanie lub ręczne obsadzanie pozycji na dyżurach.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action routes */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
                <button 
                  onClick={() => onNavigateToTab('plan_klas')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <ArrowRight size={14} className="animate-bounce" /> Przejdź do Etapu 1: Plan Klas
                </button>
                <button 
                  onClick={() => onNavigateToTab('dyzury')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs p-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 shadow transition"
                >
                  Zobacz Dyżury Nauczycieli
                </button>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* MODAL EDYCJI UCZNIA */}
      {isEditModalOpen && editingStudentId && (() => {
        const student = (appState.planLekcji.specialStudents || []).find(s => s.id === editingStudentId);
        if (!student) return null;

        const studAssignments = (appState.planLekcji.specialAssignments || []).filter(a => a.studentId === student.id);
        const supportTeacherIds = student.supportTeacherIds || [];

        return (
          <div className="fixed inset-0 z-[1000] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-fade-in text-left">
              
              {/* Nagłówek modalu */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                    ⚙️ Edycja szczegółowa: {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Konfigurujesz indywidualną ścieżkę nauczania IPET/NI oraz obecność nauczycieli wspomagających.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingStudentId(null); }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Formularz głównych danych ucznia */}
              <form onSubmit={handleSaveStudentEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Imię</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none text-slate-900"
                    value={editStudFirstName}
                    onChange={(e) => setEditStudFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Nazwisko *</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none font-bold text-slate-900"
                    value={editStudLastName}
                    onChange={(e) => setEditStudLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block text-left">Klasa macierzysta *</label>
                  <select 
                    required
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none text-slate-900"
                    value={editStudClassId}
                    onChange={(e) => setEditStudClassId(e.target.value)}
                  >
                    <option value="">Brak / nieprzypisany</option>
                    {appState.classes.map(c => (
                      <option key={c.id} value={c.id}>Klasa {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block text-left">Rodzaj wsparcia / program *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-none text-blue-600 font-bold"
                    value={editStudType}
                    onChange={(e) => setEditStudType(e.target.value as 'ni' | 'rewa' | 'wsp')}
                  >
                    <option value="ni">Nauczanie Indywidualne (NI)</option>
                    <option value="rewa">Rewalidacja / Orzeczenie</option>
                    <option value="wsp">Wspomaganie w klasie (IPET)</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 pt-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition">
                    Zapisz podstawowe dane
                  </button>
                </div>
              </form>

              {/* SEKCJA 1: Wymiar godzin zajęć indywidualnych i lista konkretnych przedmiotów */}
              <div className="border-t border-slate-100 pt-4 space-y-3 text-left">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">📚 Lekcje Indywidualne & Wymiar Godzin</h4>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">
                    Godzin łącznie: {studAssignments.reduce((sum, a) => sum + a.hoursPerWeek, 0)}h/tyg
                  </span>
                </div>

                {/* Formularz dopisywania przedmiotu wewnątrz modalu */}
                <form onSubmit={handleAddModalAssignment} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-left">
                  <div className="space-y-1 sm:col-span-1.5 text-left">
                    <label className="text-[10px] text-slate-500 font-bold block">Przedmiot</label>
                    <select 
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none text-slate-800"
                      value={editStudSubjId}
                      onChange={(e) => setEditStudSubjId(e.target.value)}
                    >
                      <option value="">Wybierz...</option>
                      {appState.subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.short})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-1.5 text-left">
                    <label className="text-[10px] text-slate-500 font-bold block">Prowadzący</label>
                    <select
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none text-slate-800"
                      value={editStudTeachId}
                      onChange={(e) => setEditStudTeachId(e.target.value)}
                    >
                      <option value="">Wybierz...</option>
                      {appState.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-slate-500 font-bold block">Godzin / Tydź.</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      max={15}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-bold text-center text-slate-800"
                      value={editStudHours}
                      onChange={(e) => setEditStudHours(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1">
                    <Plus size={12} /> Dodaj lekcję
                  </button>
                </form>

                {/* Tabela lekcji w modalu */}
                <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-2.5 pl-3">Przedmiot</th>
                        <th className="p-2.5">Prowadzący</th>
                        <th className="p-2.5 text-center">Wymiar lekcji</th>
                        <th className="p-2.5 text-right pr-3">Usuń</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {studAssignments.map(asg => {
                        const sName = subjectsMap.get(asg.subjectId)?.name || 'Nieznany';
                        const tObj = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                        const tName = tObj ? `${tObj.first[0]}. ${tObj.last} (${tObj.abbr})` : 'Nieprzypisany';
                        return (
                          <tr key={asg.id} className="hover:bg-slate-50/50">
                            <td className="p-2 pl-3 font-bold text-slate-900">{sName}</td>
                            <td className="p-2 font-semibold text-slate-500">{tName}</td>
                            <td className="p-2 font-black text-center text-indigo-600">{asg.hoursPerWeek}h / tydzień</td>
                            <td className="p-2 text-right pr-3">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveStudentAssignment(asg.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {studAssignments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 italic">Brak zdefiniowanych przedmiotów indywidualnych. Dodaj je powyżej!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEKCJA 2: Flaga nauczyciela wspomagającego w klasie macierzystej */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-left">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                    🕵️ Flaga nauczyciela wspomagającego
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">
                    Zaznacz flagę przy nauczycielu, aby zadeklarować go jako wspomagającego w klasie macierzystej tego ucznia.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {appState.teachers.map((teacher) => {
                    const isChecked = supportTeacherIds.includes(teacher.id);
                    return (
                      <button
                        type="button"
                        key={teacher.id}
                        onClick={() => {
                          let newIds = [...supportTeacherIds];
                          if (isChecked) {
                            newIds = newIds.filter(id => id !== teacher.id);
                          } else {
                            newIds.push(teacher.id);
                          }
                          
                          // Zapisujemy od razu flagę do obiektu ucznia
                          const updatedStudent = {
                            ...student,
                            supportTeacherIds: newIds
                          };
                          handleUpdateStudent(updatedStudent);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-[10px]">{isChecked ? '✓ WŁĄCZONY' : '+ DODAJ'}</span>
                        {teacher.first[0]}. {teacher.last} ({teacher.abbr})
                      </button>
                    );
                  })}
                  {appState.teachers.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic">Brak zarejestrowanych nauczycieli. Dodaj ich najpierw w Kroku 6.</p>
                  )}
                </div>
              </div>

              {/* Przycisk zamknięcia */}
              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingStudentId(null); }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Zamknij okno edycji
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Custom Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-black text-slate-900 leading-none">{confirmDialog.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 font-bold text-[10px] rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition cursor-pointer"
              >
                Tak, usuń
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
