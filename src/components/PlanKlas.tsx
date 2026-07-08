import React, { useState, useMemo, useRef } from 'react';
import { 
  AppState, Class, Teacher, Subject, ClassRoom, SchoolGroup, Assignment, Lesson, SpecialStudent, SpecialAssignment 
} from '../types';
import { esc, hexRgba, uid, subjectAbbr, genAbbr } from '../utils';
import { 
  User, BookOpen, Layers, MapPin, Plus, Trash2, Edit3, Check, RefreshCw, X, Calendar, Filter, Users, Settings, Info, Sparkles 
} from 'lucide-react';
import PlanGenerator from './PlanGenerator';

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

const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

interface PlanKlasProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onTransfer: () => void;
  presentationMode?: boolean;
}

export default function PlanKlas({ appState, onChangeAppState, onTransfer, presentationMode = false }: PlanKlasProps) {
  const pl = appState.planLekcji;

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg transition-transform z-[9999] ${
      type === 'ok' ? 'border-emerald-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  };

  const [activeClassId, setActiveClassId] = useState<string | null>(
    pl.classes.length > 0 ? pl.classes[0].id : null
  );
  const [activeTab, setActiveTab] = useState<'plan' | 'assign' | 'special' | 'teachers'>('plan');

  React.useEffect(() => {
    if (presentationMode && activeTab !== 'plan') {
      setActiveTab('plan');
    }
  }, [presentationMode, activeTab]);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [allViewSelectedClassId, setAllViewSelectedClassId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [draggedAssignId, setDraggedAssignId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const touchDragRef = useRef<HTMLDivElement | null>(null);
  const touchStartPosRef = useRef<{ x: number, y: number } | null>(null);
  const touchDraggedAssignIdRef = useRef<string | null>(null);
  const [draggedLessonKey, setDraggedLessonKey] = useState<string | null>(null);
  const touchDraggedLessonKeyRef = useRef<string | null>(null);

  // Form states for modal / quick inline adding
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState('');
  const [newTeacherFirst, setNewTeacherFirst] = useState('');
  const [newTeacherLast, setNewTeacherLast] = useState('');
  const [newTeacherAbbr, setNewTeacherAbbr] = useState('');
  const [isTeacherAbbrManual, setIsTeacherAbbrManual] = useState(false);
  const [newTeacherMaxHours, setNewTeacherMaxHours] = useState(18);
  const [newTeacherOvertimeHours, setNewTeacherOvertimeHours] = useState(0);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [newTeacherAvailability, setNewTeacherAvailability] = useState<string[]>([]);
  const [newTeacherColor, setNewTeacherColor] = useState('#3b82f6');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectShort, setNewSubjectShort] = useState('');
  const [isSubjectShortManual, setIsSubjectShortManual] = useState(false);
  const [newSubjectColor, setNewSubjectColor] = useState('#3b82f6');
  const [newSubjectPattern, setNewSubjectPattern] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');

  // Assignments States
  const [assignClass, setAssignClass] = useState('');
  const [assignSubject, setAssignSubject] = useState('');
  const [assignTeacher, setAssignTeacher] = useState('');
  const [assignRoom, setAssignRoom] = useState('');
  const [assignHours, setAssignHours] = useState(2);
  const [assignPreferredBlockSize, setAssignPreferredBlockSize] = useState<number>(1); // default single 1h
  const [assignGroup, setAssignGroup] = useState('');

  const autoSelectGroupForAssignTab = (clsId: string, subjId: string) => {
    if (!clsId || !subjId) {
      setAssignGroup('');
      return;
    }
    const selectedSubj = pl.subjects.find(s => s.id === subjId);
    if (selectedSubj && selectedSubj.defaultGroupPattern) {
      const pattern = selectedSubj.defaultGroupPattern.toLowerCase();
      const classGrps = pl.schoolGroups.filter(g => g.classId === clsId);
      const foundGrp = classGrps.find(g => g.name.toLowerCase().includes(pattern));
      if (foundGrp) {
        setAssignGroup(foundGrp.id);
        return;
      }
    }
    setAssignGroup('');
  };

  // Special (NI / Rewa / Wsp) States
  const [specFirstName, setSpecFirstName] = useState('');
  const [specLastName, setSpecLastName] = useState('');
  const [specType, setSpecType] = useState<'ni' | 'rewa' | 'wsp'>('ni');
  const [specClassId, setSpecClassId] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  
  // Special Hours States
  const [specSubjectId, setSpecSubjectId] = useState('');
  const [specTeacherId, setSpecTeacherId] = useState('');
  const [specSupportId, setSpecSupportId] = useState('');
  const [specHoursPerW, setSpecHoursPerW] = useState(2);
  const [specWithClass, setSpecWithClass] = useState(false);

  // Days list
  const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

  // ── LOOKUPS ──
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const roomsMap = useMemo(() => new Map(pl.rooms.map(r => [r.id, r])), [pl.rooms]);

  // Count placed hours per assignment
  const placedHours = useMemo(() => {
    const counts: { [asgnId: string]: number } = {};
    Object.values(pl.lessons).forEach(l => {
      counts[l.assignmentId] = (counts[l.assignmentId] || 0) + 1;
    });
    return counts;
  }, [pl.lessons]);

  // Current class details
  const currentClass = useMemo(() => {
    if (!activeClassId) return null;
    return classesMap.get(activeClassId) || null;
  }, [activeClassId, classesMap]);

  // Current class assignments
  const classAssignments = useMemo(() => {
    if (!activeClassId) return [];
    return pl.assignments.filter(a => a.classId === activeClassId || (a.linkedClassIds && a.linkedClassIds.includes(activeClassId)));
  }, [activeClassId, pl.assignments]);

  // ── FILTER STATES FOR CLASSES ──
  const [selectedGradeFilters, setSelectedGradeFilters] = useState<string[]>([]);
  const [onlyWithUnassignedOnDay, setOnlyWithUnassignedOnDay] = useState<boolean>(false);
  const [unassignedDayFilter, setUnassignedDayFilter] = useState<number>(0);

  // Helper to extract the grade level (rocznik) from a class name
  const getRocznik = (name: string) => {
    const match = name.trim().match(/^(\d+)/);
    return match ? match[1] : name.trim().charAt(0) || '';
  };

  // Generate unique sorted grade list
  const availableRoczniki = useMemo(() => {
    const rSet = new Set<string>();
    pl.classes.forEach(c => {
      const r = getRocznik(c.name);
      if (r) rSet.add(r);
    });
    return Array.from(rSet).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, 'pl');
    });
  }, [pl.classes]);

  // Helper to check if a class has unplaced assignments on a specific day
  const classHasUnplacedOnDay = (classId: string, dayIndex: number) => {
    const classAsgs = pl.assignments.filter(a => a.classId === classId);
    if (classAsgs.length === 0) return false;

    // Has any assignment that is not fully placed?
    const hasAnyUnplacedWeekly = classAsgs.some(a => {
      const placed = placedHours[a.id] || 0;
      return placed < a.hoursPerWeek;
    });

    // Check if there is an empty slot on this day
    const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [];
    const hasEmptySlot = hours.some((_, hourIndex) => {
      const key = `${classId}|${dayIndex}|${hourIndex}`;
      return !pl.lessons[key];
    });

    // Check if there are scheduled blocks on this day with NO teacher or NO room
    const hasIncompleteScheduled = hours.some((_, hourIndex) => {
      const key = `${classId}|${dayIndex}|${hourIndex}`;
      const lesson = pl.lessons[key];
      if (!lesson) return false;
      const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
      if (!asg) return false;
      return !asg.teacherId || !asg.roomId;
    });

    return (hasAnyUnplacedWeekly && hasEmptySlot) || hasIncompleteScheduled;
  };

  // Memoized filtered classes list
  const filteredClasses = useMemo(() => {
    return pl.classes.filter(c => {
      // 1. Grade (Rocznik) filter
      if (selectedGradeFilters.length > 0) {
        const rocznik = getRocznik(c.name);
        if (!selectedGradeFilters.includes(rocznik)) {
          return false;
        }
      }

      // 2. Unassigned lessons on day filter
      if (onlyWithUnassignedOnDay) {
        if (!classHasUnplacedOnDay(c.id, unassignedDayFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [pl.classes, selectedGradeFilters, onlyWithUnassignedOnDay, unassignedDayFilter, pl.assignments, pl.hours, pl.lessons, placedHours]);

  // Conflicts checking
  const conflicts = useMemo(() => {
    // teacherSlots: "teacherId|day|hour" -> Array of { key, classId, role: string }
    const teacherSlots = new Map<string, { key: string; classId: string; role: string }[]>();
    // roomSlots: "roomId|day|hour" -> Array of { key, classId }
    const roomSlots = new Map<string, { key: string; classId: string }[]>();

    // key -> array of error messages
    const detected = new Map<string, string[]>();

    Object.entries(pl.lessons).forEach(([key, lesson]) => {
      const parts = key.split('|');
      const classId = parts[0];
      const day = parts[1];
      const hour = parts[2];
      const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
      if (!asg) return;

      const slotKey = `${day}|${hour}`;

      // Check availability of teacher
      if (asg.teacherId) {
        const teacher = teachersMap.get(asg.teacherId);
        if (teacher && teacher.availability) {
          const checkCode = `${day}-${hour}`;
          if (!teacher.availability.includes(checkCode)) {
            const desc = `⚠️ Niedostępność nauczyciela: ${teacher.first} ${teacher.last} (${teacher.abbr}) nie ma wyznaczonej dostępności w tym terminie!`;
            const existing = detected.get(key) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(key, existing);
            }
          }
        }
      }

      // Check availability of support teacher
      if (lesson.supportTeacherId) {
        const supportTeacher = teachersMap.get(lesson.supportTeacherId);
        if (supportTeacher && supportTeacher.availability) {
          const checkCode = `${day}-${hour}`;
          if (!supportTeacher.availability.includes(checkCode)) {
            const desc = `⚠️ Niedostępność nauczyciela wsp.: ${supportTeacher.first} ${supportTeacher.last} (${supportTeacher.abbr}) nie ma wyznaczonej dostępności w tym terminie!`;
            const existing = detected.get(key) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(key, existing);
            }
          }
        }
      }

      if (asg.teacherId) {
        const tKey = `${asg.teacherId}|${slotKey}`;
        const existing = teacherSlots.get(tKey) || [];
        existing.push({ key, classId, role: 'prowadzący' });
        teacherSlots.set(tKey, existing);
      }

      if (lesson.supportTeacherId) {
        const tKey = `${lesson.supportTeacherId}|${slotKey}`;
        const existing = teacherSlots.get(tKey) || [];
        existing.push({ key, classId, role: 'wspomagający' });
        teacherSlots.set(tKey, existing);
      }

      if (asg.roomId) {
        const rKey = `${asg.roomId}|${slotKey}`;
        const existing = roomSlots.get(rKey) || [];
        existing.push({ key, classId });
        roomSlots.set(rKey, existing);
      }
    });

    // Check teacher conflicts (same teacher assigned to multiple classes/lessons at the same time)
    teacherSlots.forEach((list, tKey) => {
      if (list.length > 1) {
        const [teacherId, day, hour] = tKey.split('|');
        const teacher = teachersMap.get(teacherId);
        const tName = teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nauczyciel';

        list.forEach((item) => {
          // Find other lessons at this slot
          const otherItems = list.filter(x => {
            if (x.key === item.key) return false;
            const itemL = pl.lessons[item.key];
            const xL = pl.lessons[x.key];
            if (itemL && xL && itemL.assignmentId === xL.assignmentId) {
              return false; // same joint lesson assignment - NOT a teacher conflict!
            }
            return true;
          });
          if (otherItems.length > 0) {
            const descriptions = otherItems.map(oi => {
              const otherClassName = classesMap.get(oi.classId)?.name || 'Inna klasa';
              const roleName = oi.role === 'wspomagający' ? 'wspomagający' : 'prowadzący';
              return `${roleName} w kl. ${otherClassName}`;
            });
            const desc = `Konflikt Nauczyciela: ${tName} jest zajęty równolegle (${descriptions.join(', ')})`;
            const existing = detected.get(item.key) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(item.key, existing);
            }
          }
        });
      }
    });

    // Check room conflicts (same room assigned to multiple classes/lessons at the same time)
    roomSlots.forEach((list, rKey) => {
      if (list.length > 1) {
        const [roomId, day, hour] = rKey.split('|');
        const rName = roomsMap.get(roomId)?.name || 'Sala';

        list.forEach((item) => {
          const otherClasses = list
            .filter(x => {
              if (x.classId === item.classId) return false;
              const itemL = pl.lessons[item.key];
              const xL = pl.lessons[x.key];
              if (itemL && xL && itemL.assignmentId === xL.assignmentId) {
                return false; // same joint lesson assignment - NOT a room conflict!
              }
              return true;
            })
            .map(x => classesMap.get(x.classId)?.name || 'Inna klasa');
          
          const uniqueOtherClasses = Array.from(new Set(otherClasses));
          if (uniqueOtherClasses.length > 0) {
            const desc = `Konflikt Sali: Sala ${rName} jest zajęta w tym samym czasie przez klasy: ${uniqueOtherClasses.join(', ')}`;
            const existing = detected.get(item.key) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(item.key, existing);
            }
          }
        });
      }
    });

    return detected;
  }, [pl.lessons, pl.assignments, teachersMap, roomsMap, classesMap]);

  // ── HANDLERS ──

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const classId = uid();
    const newClassEntry: Class = {
      id: classId,
      name: newClassName.trim().toUpperCase(),
      color: COLORS[pl.classes.length % COLORS.length],
      groupIds: [],
      group: newClassGroup ? newClassGroup.trim() : 'cała klasa'
    };

    const updatedPL = {
      ...pl,
      classes: [...pl.classes, newClassEntry]
    };

    onChangeAppState({
      ...appState,
      classes: [...appState.classes, newClassEntry],
      planLekcji: updatedPL
    });

    setNewClassName('');
    setNewClassGroup('');
    setActiveClassId(classId);
  };

  const handleRemoveClass = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Czy na pewno chcesz usunąć tę klasę wraz ze wszystkimi jej zajęciami?')) return;

    const updatedPL = {
      ...pl,
      classes: pl.classes.filter(c => c.id !== id),
      assignments: pl.assignments.filter(a => a.classId !== id),
      lessons: Object.fromEntries(
        Object.entries(pl.lessons).filter(([key]) => !key.startsWith(id + '|'))
      )
    };

    onChangeAppState({
      ...appState,
      planLekcji: updatedPL
    });

    if (activeClassId === id) {
      setActiveClassId(updatedPL.classes.length > 0 ? updatedPL.classes[0].id : null);
    }
  };

  const updateTeacherAbbrAuto = (f: string, l: string) => {
    if (!isTeacherAbbrManual) {
      setNewTeacherAbbr(genAbbr(f, l));
    }
  };

  const handleStartEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setNewTeacherFirst(t.first);
    setNewTeacherLast(t.last);
    setNewTeacherAbbr(t.abbr);
    setIsTeacherAbbrManual(true);
    setNewTeacherMaxHours(t.maxHours || 18);
    setNewTeacherOvertimeHours(t.overtimeHours || 0);
    setNewTeacherColor(t.color || '#3b82f6');

    // Load or generate list of available slots
    if (t.availability) {
      setNewTeacherAvailability(t.availability);
    } else {
      const defaultAvail: string[] = [];
      const hList = pl.hours && pl.hours.length > 0 ? pl.hours : [];
      for (let day = 0; day < 5; day++) {
        hList.forEach(h => {
          defaultAvail.push(`${day}-${h.num}`);
        });
      }
      setNewTeacherAvailability(defaultAvail);
    }
  };

  const handleCancelEditTeacher = () => {
    setEditingTeacherId(null);
    setNewTeacherFirst('');
    setNewTeacherLast('');
    setNewTeacherAbbr('');
    setIsTeacherAbbrManual(false);
    setNewTeacherMaxHours(18);
    setNewTeacherOvertimeHours(0);
    setNewTeacherAvailability([]);
    setNewTeacherColor(PALETTE_COLORS[pl.teachers?.length % PALETTE_COLORS.length] || '#3b82f6');
  };

  const setAllTeacherAvailability = (active: boolean) => {
    if (active) {
      const list: string[] = [];
      const hList = pl.hours && pl.hours.length > 0 ? pl.hours : [];
      for (let d = 0; d < 5; d++) {
        hList.forEach(h => {
          list.push(`${d}-${h.num}`);
        });
      }
      setNewTeacherAvailability(list);
    } else {
      setNewTeacherAvailability([]);
    }
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherLast.trim() || !newTeacherAbbr.trim()) return;

    const formattedAbbr = newTeacherAbbr.trim().toUpperCase();

    // Check for unique abbr
    if (pl.teachers.some(t => t.id !== editingTeacherId && t.abbr.toUpperCase() === formattedAbbr)) {
      alert('Ten skrót nauczyciela jest już zajęty!');
      return;
    }

    if (editingTeacherId) {
      // Edycja nauczyciela
      const nextT = pl.teachers.map(t => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            first: newTeacherFirst.trim(),
            last: newTeacherLast.trim(),
            abbr: formattedAbbr,
            color: newTeacherColor,
            maxHours: Number(newTeacherMaxHours),
            overtimeHours: Number(newTeacherOvertimeHours) || undefined,
            availability: newTeacherAvailability
          };
        }
        return t;
      });

      const updatedPL = {
        ...pl,
        teachers: nextT
      };

      onChangeAppState({
        ...appState,
        teachers: nextT,
        planLekcji: updatedPL
      });

      setEditingTeacherId(null);
      setNewTeacherFirst('');
      setNewTeacherLast('');
      setNewTeacherAbbr('');
      setIsTeacherAbbrManual(false);
      setNewTeacherMaxHours(18);
      setNewTeacherOvertimeHours(0);
      setNewTeacherAvailability([]);
      setNewTeacherColor(PALETTE_COLORS[(nextT?.length || 0) % PALETTE_COLORS.length] || '#3b82f6');
    } else {
      // Nowy nauczyciel
      const newTeacher: Teacher = {
        id: uid(),
        first: newTeacherFirst.trim(),
        last: newTeacherLast.trim(),
        abbr: formattedAbbr,
        color: newTeacherColor,
        maxHours: Number(newTeacherMaxHours),
        overtimeHours: Number(newTeacherOvertimeHours) || undefined
      };

      const nextT = [...pl.teachers, newTeacher];
      const updatedPL = {
        ...pl,
        teachers: nextT
      };

      onChangeAppState({
        ...appState,
        teachers: nextT,
        planLekcji: updatedPL
      });

      setNewTeacherFirst('');
      setNewTeacherLast('');
      setNewTeacherAbbr('');
      setIsTeacherAbbrManual(false);
      setNewTeacherMaxHours(18);
      setNewTeacherOvertimeHours(0);
      setNewTeacherColor(PALETTE_COLORS[(nextT?.length || 0) % PALETTE_COLORS.length] || '#3b82f6');
    }
  };

  const handleRemoveTeacher = (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego nauczyciela? Usunie to również jego przydziały lekcyjne.')) {
      return;
    }

    const nextT = pl.teachers.filter(t => t.id !== id);
    const updatedPL = {
      ...pl,
      teachers: nextT,
      assignments: pl.assignments.filter(a => a.teacherId !== id)
    };

    onChangeAppState({
      ...appState,
      teachers: nextT,
      planLekcji: updatedPL
    });

    if (editingTeacherId === id) {
      handleCancelEditTeacher();
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    if (editingSubjectId) {
      // Edycja przedmiotu
      const nextSubjs = pl.subjects.map(s => {
        if (s.id === editingSubjectId) {
          return {
            ...s,
            name: newSubjectName.trim(),
            short: newSubjectShort.trim().toUpperCase() || s.short,
            color: newSubjectColor,
            defaultGroupPattern: newSubjectPattern.trim() || undefined
          };
        }
        return s;
      });

      const updatedPL = {
        ...pl,
        subjects: nextSubjs
      };

      onChangeAppState({
        ...appState,
        subjects: nextSubjs,
        planLekcji: updatedPL
      });

      setEditingSubjectId(null);
      setNewSubjectName('');
      setNewSubjectShort('');
      setIsSubjectShortManual(false);
      setNewSubjectPattern('');
      setNewSubjectColor('#3b82f6');
    } else {
      // Dodawanie nowego przedmiotu
      const defAbbr = newSubjectShort.trim().toUpperCase() || newSubjectName.slice(0, 3).toUpperCase();
      const newSubj: Subject = {
        id: uid(),
        name: newSubjectName.trim(),
        short: defAbbr,
        color: newSubjectColor || COLORS[pl.subjects.length % COLORS.length],
        defaultGroupPattern: newSubjectPattern.trim() || undefined
      };

      const updatedPL = {
        ...pl,
        subjects: [...pl.subjects, newSubj]
      };

      onChangeAppState({
        ...appState,
        subjects: [...appState.subjects, newSubj],
        planLekcji: updatedPL
      });

      setNewSubjectName('');
      setNewSubjectShort('');
      setIsSubjectShortManual(false);
      setNewSubjectPattern('');
      setNewSubjectColor('#3b82f6');
    }
  };

  const handleStartEditSubject = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setNewSubjectName(sub.name);
    setNewSubjectShort(sub.short);
    setIsSubjectShortManual(true);
    setNewSubjectColor(sub.color || '#3b82f6');
    setNewSubjectPattern(sub.defaultGroupPattern || '');
  };

  const handleCancelEditSubject = () => {
    setEditingSubjectId(null);
    setNewSubjectName('');
    setNewSubjectShort('');
    setIsSubjectShortManual(false);
    setNewSubjectPattern('');
    setNewSubjectColor('#3b82f6');
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoom: ClassRoom = {
      id: uid(),
      name: newRoomName.trim()
    };

    const updatedPL = {
      ...pl,
      rooms: [...pl.rooms, newRoom]
    };

    onChangeAppState({
      ...appState,
      planLekcji: updatedPL
    });

    setNewRoomName('');
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClass || !assignSubject) return;

    const newAsg: Assignment = {
      id: uid(),
      classId: assignClass,
      subjectId: assignSubject,
      teacherId: assignTeacher || null,
      roomId: assignRoom || null,
      hoursPerWeek: Number(assignHours),
      groupId: assignGroup || null,
      preferredBlockSize: assignPreferredBlockSize
    };

    const updatedPL = {
      ...pl,
      assignments: [...pl.assignments, newAsg]
    };

    onChangeAppState({
      ...appState,
      planLekcji: updatedPL
    });

    setAssignSubject('');
    setAssignTeacher('');
    setAssignRoom('');
    setAssignHours(2);
    setAssignPreferredBlockSize(1);
    setAssignGroup('');
  };

  const handleRemoveAssignment = (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to przypisanie?')) return;

    const updatedPL = {
      ...pl,
      assignments: pl.assignments.filter(a => a.id !== id),
      lessons: Object.fromEntries(
        Object.entries(pl.lessons).filter(([, val]) => val.assignmentId !== id)
      )
    };

    onChangeAppState({
      ...appState,
      planLekcji: updatedPL
    });
  };

  // Drag and Drop
  const handleDragStart = (id: string, lessonKey?: string) => {
    setDraggedAssignId(id);
    if (lessonKey) {
      setDraggedLessonKey(lessonKey);
    } else {
      setDraggedLessonKey(null);
    }
  };

  const placeAssignmentOnCell = (assignId: string, day: number, hour: number, targetClassId?: string) => {
    const classIdToUse = targetClassId || activeClassId;
    if (!assignId || !classIdToUse) return;

    const updatedLessons = { ...pl.lessons };
    
    // Check hours limits
    const asg = pl.assignments.find(a => a.id === assignId);
    if (asg) {
      const placed = placedHours[assignId] || 0;
      if (placed >= asg.hoursPerWeek) {
        if (!confirm(`Zrealizowano już limit ${asg.hoursPerWeek} godzin dla tego przydziału. Czy umieścić nadwymiarowo?`)) {
          return;
        }
      }
    }

    let defaultSupportTeacherId: string | null = null;
    if (asg) {
      const matchSpecialAsg = pl.specialAssignments.find(sa => {
        const student = pl.specialStudents.find(ss => ss.id === sa.studentId);
        return student && student.classId === classIdToUse && sa.subjectId === asg.subjectId && sa.withClass && sa.supportTeacherId;
      });
      if (matchSpecialAsg) {
        defaultSupportTeacherId = matchSpecialAsg.supportTeacherId || null;
      }
    }

    const allInvolved = asg ? [asg.classId, ...(asg.linkedClassIds || [])] : [classIdToUse];

    // Real-time Room conflict detection
    if (asg && asg.roomId) {
      const targetRoom = pl.rooms.find(r => r.id === asg.roomId);
      const roomName = targetRoom ? targetRoom.name : 'nieznanej';

      const conflictingLessons: { classId: string; assignmentId: string }[] = [];
      Object.entries(pl.lessons).forEach(([lessonKey, lessonVal]) => {
        const parts = lessonKey.split('|');
        if (parts.length >= 3) {
          const cId = parts[0];
          const d = parseInt(parts[1], 10);
          const h = parseInt(parts[2], 10);

          if (d === day && h === hour) {
            // Check if it's NOT in our newly assigned classes, and has a different assignment ID
            if (!allInvolved.includes(cId) && lessonVal.assignmentId !== assignId) {
              const otherAsg = pl.assignments.find(a => a.id === lessonVal.assignmentId);
              if (otherAsg && otherAsg.roomId === asg.roomId) {
                conflictingLessons.push({ classId: cId, assignmentId: lessonVal.assignmentId });
              }
            }
          }
        }
      });

      if (conflictingLessons.length > 0) {
        const otherClassNames = Array.from(new Set(conflictingLessons.map(cl => {
          const c = pl.classes.find(cls => cls.id === cl.classId);
          return c ? c.name : 'inna klasa';
        })));
        const currentClassName = allInvolved.map(clsId => pl.classes.find(cls => cls.id === clsId)?.name || 'bieżąca klasa').join(' + ');
        notify(
          `⚠️ Konflikt Sali: Próba przypisania sali ${roomName} dla ${currentClassName}, która w tym samym czasie (${DAYS[day]}, lekcja ${hour}) jest zajęta przez klasy: ${otherClassNames.join(', ')}!`,
          'err'
        );
      }
    }

    allInvolved.forEach(clsId => {
      const lessonKey = `${clsId}|${day}|${hour}`;
      updatedLessons[lessonKey] = {
        assignmentId: assignId,
        locked: false,
        supportTeacherId: defaultSupportTeacherId
      };
    });

    const updatedPL = {
      ...pl,
      lessons: updatedLessons
    };

    onChangeAppState({
      ...appState,
      planLekcji: updatedPL
    });
  };

  const handleDropOnCell = (day: number, hour: number, targetClassId?: string) => {
    if (draggedAssignId) {
      placeAssignmentOnCell(draggedAssignId, day, hour, targetClassId);
      setDraggedAssignId(null);
    }
  };

  // Touch Drag-And-Drop Handlers
  const handleTouchStart = (e: React.TouchEvent, assignId: string, lessonKey?: string) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchDraggedAssignIdRef.current = assignId;
    touchDraggedLessonKeyRef.current = lessonKey || null;
    console.log('[TOUCH_DND] touchstart:', { assignId, lessonKey, clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent, assignId: string) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartPosRef.current.x;
    const diffY = touch.clientY - touchStartPosRef.current.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    if (distance > 8) {
      if (e.cancelable) {
        e.preventDefault();
      }

      // Update coordinates & contents of the floating element directly via DOM
      if (touchDragRef.current) {
        if (touchDragRef.current.style.display === 'none' || touchDragRef.current.style.display === '') {
          // Initialize display and contents once drag is recognized
          const asgVal = pl.assignments.find(a => a.id === assignId);
          const subjVal = asgVal ? subjectsMap.get(asgVal.subjectId) : null;
          const teacherVal = asgVal && asgVal.teacherId ? teachersMap.get(asgVal.teacherId) : null;

          touchDragRef.current.style.display = 'flex';
          touchDragRef.current.style.borderLeftColor = subjVal?.color || '#3b82f6';

          const labelSubj = touchDragRef.current.querySelector('[data-role="subject-name"]') as HTMLElement;
          if (labelSubj) {
            labelSubj.textContent = subjVal?.name || 'Przedmiot';
            labelSubj.style.color = subjVal?.color || '#1e1b4b';
          }

          const labelTeacher = touchDragRef.current.querySelector('[data-role="teacher-name"]') as HTMLElement;
          if (labelTeacher) {
            labelTeacher.textContent = teacherVal ? `👤 ${teacherVal.first[0]}. ${teacherVal.last}` : '👤 Nieprzypisany';
          }

          console.log('[TOUCH_DND] Drag visually initialized via DOM:', assignId);
        }

        // Apply 3D translation based on current touch position
        touchDragRef.current.style.transform = `translate3d(${touch.clientX - 70}px, ${touch.clientY - 35}px, 0)`;
      }

      console.log('[TOUCH_DND] touchmove坐标:', { clientX: touch.clientX, clientY: touch.clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const activeId = touchDraggedAssignIdRef.current;
    console.log('[TOUCH_DND] touchend triggered. Active assignment ID:', activeId);

    // Hide the floating element immediately before checking elementFromPoint
    if (touchDragRef.current) {
      touchDragRef.current.style.display = 'none';
    }

    if (activeId && touchStartPosRef.current) {
      const touch = e.changedTouches[0] || (e.touches && e.touches[0]);
      if (touch) {
        const x = touch.clientX;
        const y = touch.clientY;
        console.log('[TOUCH_DND] Release coordinates:', { x, y });

        const element = document.elementFromPoint(x, y);
        console.log('[TOUCH_DND] Element at release point:', element ? `${element.tagName}.${element.className}` : 'null');

        if (element) {
          const deleteZone = element.closest('[data-cell-type="delete-zone"]');
          if (deleteZone) {
            const activeKey = touchDraggedLessonKeyRef.current;
            console.log('[TOUCH_DND] Dropped into delete-zone. Key:', activeKey);
            if (activeKey) {
              handleRemoveLesson(activeKey);
            }
          } else {
            const cell = element.closest('[data-cell-type="plan-cell"]');
            console.log('[TOUCH_DND] Resolved target cell element:', cell ? `${cell.tagName}[data-day="${cell.getAttribute('data-day')}"][data-hour="${cell.getAttribute('data-hour')}"]` : 'null');

            if (cell) {
              const dayStr = cell.getAttribute('data-day');
              const hourStr = cell.getAttribute('data-hour');
              const targetClassId = cell.getAttribute('data-class-id') || undefined;
              if (dayStr !== null && hourStr !== null) {
                const day = parseInt(dayStr, 10);
                const hour = parseInt(hourStr, 10);
                console.log('[TOUCH_DND] Dropping assignment inside cell:', { day, hour, targetClassId });
                placeAssignmentOnCell(activeId, day, hour, targetClassId);
              }
            }
          }
        }
      }
    }

    touchDraggedAssignIdRef.current = null;
    touchDraggedLessonKeyRef.current = null;
    touchStartPosRef.current = null;
  };

  const handleRemoveLesson = (key: string) => {
    const updatedLessons = { ...pl.lessons };
    const lessonToRemove = updatedLessons[key];
    if (lessonToRemove) {
      const asg = pl.assignments.find(a => a.id === lessonToRemove.assignmentId);
      if (asg && asg.linkedClassIds && asg.linkedClassIds.length > 0) {
        const parts = key.split('|');
        if (parts.length >= 3) {
          const day = parts[1];
          const hour = parts[2];
          const allInvolved = [asg.classId, ...asg.linkedClassIds];
          allInvolved.forEach(clsId => {
            const k = `${clsId}|${day}|${hour}`;
            delete updatedLessons[k];
          });
        }
      } else {
        delete updatedLessons[key];
      }
    } else {
      delete updatedLessons[key];
    }

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons
      }
    });
  };

  // Special Students adding
  const handleAddSpecialStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specLastName.trim()) return;

    const newStudent: SpecialStudent = {
      id: uid(),
      firstName: specFirstName.trim(),
      lastName: specLastName.trim(),
      classId: specClassId || null,
      type: specType,
      supportTeacherIds: []
    };

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        specialStudents: [...pl.specialStudents, newStudent]
      }
    });

    setSpecFirstName('');
    setSpecLastName('');
    setSpecClassId('');
    setActiveStudentId(newStudent.id);
  };

  const handleUpdateSpecialStudent = (updatedStudent: SpecialStudent) => {
    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        specialStudents: pl.specialStudents.map(s => s.id === updatedStudent.id ? updatedStudent : s)
      }
    });
  };

  const handleRemoveSpecialStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Usunąć ucznia oraz powiązane z nim lekcje indywidualne?')) return;

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        specialStudents: pl.specialStudents.filter(s => s.id !== id),
        specialAssignments: pl.specialAssignments.filter(a => a.studentId !== id),
        specialLessons: Object.fromEntries(
          Object.entries(pl.specialLessons).filter(([k]) => !k.startsWith(id + '|'))
        )
      }
    });

    if (activeStudentId === id) setActiveStudentId(null);
  };

  const handleAddSpecialAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentId || !specSubjectId) return;

    const newSpAsg: SpecialAssignment = {
      id: uid(),
      studentId: activeStudentId,
      subjectId: specSubjectId,
      teacherId: specTeacherId || null,
      supportTeacherId: specSupportId || null,
      roomId: null,
      hoursPerWeek: specHoursPerW,
      withClass: specWithClass
    };

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        specialAssignments: [...pl.specialAssignments, newSpAsg]
      }
    });

    setSpecSubjectId('');
    setSpecTeacherId('');
    setSpecSupportId('');
    setSpecHoursPerW(2);
    setSpecWithClass(false);
  };

  const handleRemoveSpecialAssignment = (asgId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to przypisanie zajęć?')) return;
    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        specialAssignments: pl.specialAssignments.filter(a => a.id !== asgId),
        specialLessons: Object.fromEntries(
          Object.entries(pl.specialLessons).filter(([_, l]) => l.assignmentId !== asgId)
        )
      }
    });
  };

  const currentStudent = useMemo(() => {
    if (!activeStudentId) return null;
    return pl.specialStudents.find(s => s.id === activeStudentId) || null;
  }, [activeStudentId, pl.specialStudents]);

  const studentAssignments = useMemo(() => {
    if (!activeStudentId) return [];
    return pl.specialAssignments.filter(a => a.studentId === activeStudentId);
  }, [activeStudentId, pl.specialAssignments]);

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden px-0 mx-0" id="page-plan-klas">
      {/* ── LEWY SIDEBAR (Nawigacja) ── */}
      {!presentationMode && !(viewMode === 'all' && activeTab === 'plan') && (
        <aside className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 select-none">
          
          {/* Zarządzanie Klasami */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">🏫 Lista Klas</span>
            </div>
            
            <form onSubmit={handleAddClass} className="flex flex-col gap-1.5 mb-3">
              <input 
                type="text" 
                placeholder="np. 4A, 1B" 
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Grupa (np. cała klasa, gr.1)" 
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                value={newClassGroup}
                onChange={(e) => setNewClassGroup(e.target.value)}
              />
              <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1">
                <Plus size={14} /> Dodaj Klasę
              </button>
            </form>

            {/* Panel Filtrów */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                  <Filter size={11} className="text-slate-400" /> Filtry Listy Klas
                </span>
                {(selectedGradeFilters.length > 0 || onlyWithUnassignedOnDay) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGradeFilters([]);
                      setOnlyWithUnassignedOnDay(false);
                    }}
                    className="text-[9px] text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-0.5"
                  >
                    <X size={10} /> Wyczyść
                  </button>
                )}
              </div>

              {/* Roczniki Pills */}
              {availableRoczniki.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block select-none">Roczniki (Poziomy):</label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                    {availableRoczniki.map(r => {
                      const isActive = selectedGradeFilters.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setSelectedGradeFilters(selectedGradeFilters.filter(item => item !== r));
                            } else {
                              setSelectedGradeFilters([...selectedGradeFilters, r]);
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isNaN(parseInt(r)) ? r : `Klasa ${r}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lekcje do przypisania w danym dniu */}
              <div className="space-y-1.5 pt-1">
                <label className="flex items-start gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3 w-3"
                    checked={onlyWithUnassignedOnDay}
                    onChange={(e) => setOnlyWithUnassignedOnDay(e.target.checked)}
                  />
                  <span className="text-[10px] font-bold text-slate-600 leading-tight select-none">
                    Lekcje do przypisania w dniu:
                  </span>
                </label>

                {onlyWithUnassignedOnDay && (
                  <div className="pl-4.5">
                    <select
                      className="w-full px-2 py-1 border border-slate-200 bg-white rounded-md text-[10px] outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={unassignedDayFilter}
                      onChange={(e) => setUnassignedDayFilter(Number(e.target.value))}
                    >
                      {DAYS.map((dayName, idx) => (
                        <option key={idx} value={idx}>
                          {dayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 mt-2">
              {filteredClasses.length > 0 ? (
                filteredClasses.map(c => {
                  const count = Object.keys(pl.lessons).filter(k => k.startsWith(c.id + '|')).length;
                  return (
                    <div
                      key={c.id}
                      onClick={() => { setActiveClassId(c.id); setActiveTab('plan'); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between group cursor-pointer ${
                        activeClassId === c.id && activeTab === 'plan'
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveClassId(c.id);
                          setActiveTab('plan');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 overflow-hidden truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || '#cbd5e1' }} />
                        <span className="truncate">{c.name} {c.group && c.group !== 'cała klasa' ? `(${c.group})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-100 text-slate-500 group-hover:bg-slate-200 px-1.5 py-0.5 rounded font-mono">{count}h</span>
                        <button 
                          type="button"
                          onClick={(e) => handleRemoveClass(c.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-[10px] text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  Brak klas spełniających kryteria filtrów
                </div>
              )}
            </div>
          </div>

          {/* Zakładki Nawigacji */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <button 
              onClick={() => setActiveTab('assign')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${activeTab === 'assign' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Layers size={14} className="text-slate-400" />
              <span>📋 Przypisania Godzin</span>
            </button>
            <button 
              onClick={() => setActiveTab('teachers')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <User size={14} className="text-slate-400" />
              <span>👤 Nauczyciele i Przedmioty</span>
            </button>
            <button 
              onClick={() => setActiveTab('special')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${activeTab === 'special' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <BookOpen size={14} className="text-slate-400" />
              <span>🌟 Nauczanie Specjalne</span>
            </button>
          </div>
        </aside>
      )}

      {/* ── STREFA CENTRALNA (Siatka układania) ── */}
      <main className="flex-1 bg-slate-50 p-4 md:p-5 overflow-y-auto">
        {activeTab === 'plan' && (
          <div className="flex flex-col h-full animate-fade-in">
            {/* Header i Przyciski Akcji */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900 select-none">
                  {viewMode === 'all' 
                    ? `Plan lekcji dla wszystkich klas (Dzień po dniu)`
                    : currentClass ? `Plan lekcji dla klasy ${currentClass.name}` : 'Plan lekcji klasowy'}
                </h1>
                <p className="text-xs text-slate-500 mt-1 select-none">
                  {viewMode === 'all'
                    ? `Przeglądaj i układaj plan lekcji dla wszystkich klas jednocześnie. Wybierz dzień tygodnia poniżej.`
                    : currentClass ? `Zdefiniowano zajęcia klasy: ${currentClass.group || 'cała klasa'}. Przeciągaj lekcje ze skrytki po prawej stronie na siatkę.` : 'Wybierz klasę z lewego panelu, aby rozpocząć układanie planu.'}
                </p>
              </div>
              {!presentationMode && (
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setShowGenerator(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    <Sparkles size={14} /> Autogenerator planu lekcji
                  </button>
                  <button 
                    onClick={onTransfer}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Przenieś do planu sal (Etap 2)
                  </button>
                </div>
              )}
            </div>

            {/* Przełącznik Widoku */}
            <div className="flex items-center gap-2 mb-5 bg-slate-100 p-1 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'single'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🏫 Widok jednej klasy (tydzień)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                📅 Wszystkie klasy (dzień po dniu)
              </button>
            </div>

            {/* Selektor Dnia dla widoku wszystkich klas */}
            {viewMode === 'all' && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-5 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mr-1">Wybierz Dzień:</span>
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveDayIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          activeDayIndex === idx
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/65">
                  Widok dla <strong className="text-slate-700 font-extrabold">{filteredClasses.length} klas</strong> na dzień: <strong className="text-indigo-700 font-black">{DAYS[activeDayIndex]}</strong>
                </div>
              </div>
            )}

            {/* TABELA PLANU */}
            {viewMode === 'all' ? (
              /* ==================== WIDOK WSZYSTKICH KLAS ==================== */
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto p-2">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 border-b border-r border-slate-200 text-xs font-bold text-slate-400 text-center w-24">Klasa</th>
                      {pl.hours.map((h, i) => (
                        <th key={i} className="p-3 border-b border-slate-200 text-xs font-bold text-slate-600 text-center min-w-[150px] select-none">
                          <div className="font-extrabold text-slate-750">Lekcja {h.num}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{h.start}–{h.end}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-50/50">
                        {/* Kolumna Klasy */}
                        <td className="p-3 border-b border-r border-slate-200 text-center bg-slate-50/50 select-none align-middle font-bold text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveClassId(cls.id);
                              setViewMode('single');
                            }}
                            className="hover:underline text-left inline-flex flex-col items-center gap-1 group/btn"
                            title="Przejdź do planu tygodniowego tej klasy"
                          >
                            <span className="w-3 h-3 rounded-full shadow-sm group-hover/btn:scale-110 transition" style={{ backgroundColor: cls.color || '#cbd5e1' }} />
                            <span className="text-slate-800 font-extrabold tracking-tight text-center leading-none group-hover/btn:text-blue-600">{cls.name}</span>
                            <span className="text-[8.5px] text-slate-400 font-normal leading-tight">{cls.group && cls.group !== 'cała klasa' ? cls.group : 'cała klasa'}</span>
                          </button>
                        </td>
                        
                        {/* Godziny lekcyjne w wybranym dniu */}
                        {pl.hours.map((_, hourIndex) => {
                          const dayIndex = activeDayIndex;
                          const key = `${cls.id}|${dayIndex}|${hourIndex}`;
                          const lesson = pl.lessons[key];
                          const asg = lesson ? pl.assignments.find(a => a.id === lesson.assignmentId) : null;
                          const subj = asg ? subjectsMap.get(asg.subjectId) : null;
                          const teacher = asg && asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                          const room = asg && asg.roomId ? roomsMap.get(asg.roomId) : null;
                          const confReasons = conflicts.get(key) || [];
                          const isConf = confReasons.length > 0;

                          return (
                            <td 
                              key={hourIndex}
                              title={isConf ? confReasons.join('\n') : undefined}
                              className={`p-1.5 border-b border-r last:border-r-0 border-slate-200 align-top h-28 transition-all ${
                                isConf ? 'bg-red-50/70 border-2 border-red-300' : ''
                              }`}
                              data-cell-type="plan-cell"
                              data-day={dayIndex}
                              data-hour={hourIndex}
                              data-class-id={cls.id}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropOnCell(dayIndex, hourIndex, cls.id)}
                            >
                              {asg ? (() => {
                                const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;
                                const specStudentsInThisClassAndSubj = pl.specialStudents.filter(ss => {
                                  if (ss.classId !== cls.id) return false;
                                  return pl.specialAssignments.some(sa => sa.studentId === ss.id && sa.subjectId === asg.subjectId && sa.withClass);
                                });

                                return (
                                  <div 
                                    onClick={() => {
                                      if (selectedAssignmentId) {
                                        placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex, cls.id);
                                      } else {
                                        setAllViewSelectedClassId(cls.id);
                                      }
                                    }}
                                    draggable={!isTouchDevice}
                                    onDragStart={(e) => {
                                      if (isTouchDevice) {
                                        e.preventDefault();
                                        return;
                                      }
                                      handleDragStart(asg.id, key);
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, asg.id, key)}
                                    onTouchMove={(e) => handleTouchMove(e, asg.id)}
                                    onTouchEnd={handleTouchEnd}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className={`h-full min-h-[90px] rounded-lg p-2 border-l-4 relative select-none flex flex-col justify-between group transition-all cursor-grab active:cursor-grabbing touch-none ${
                                      selectedAssignmentId 
                                        ? 'ring-2 ring-indigo-400 ring-offset-1 cursor-pointer hover:bg-slate-50' 
                                        : 'hover:shadow-md'
                                    } ${
                                      isConf 
                                        ? 'border-red-600 bg-red-50 text-red-900 shadow-sm'
                                        : 'bg-white shadow-sm'
                                    }`}
                                    style={{
                                      ...(isConf ? {} : { borderLeftColor: subj?.color || '#cbd5e1' }),
                                      WebkitTouchCallout: 'none',
                                      WebkitUserSelect: 'none',
                                      KhtmlUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none',
                                      userSelect: 'none',
                                      WebkitUserDrag: 'none'
                                    }}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold truncate" style={isConf ? {} : { color: subj?.color }}>
                                          {subj?.name}
                                        </span>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveLesson(key);
                                          }}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          onTouchEnd={(e) => {
                                            e.stopPropagation();
                                            handleRemoveLesson(key);
                                          }}
                                          className="text-slate-400 hover:text-red-500 hover:scale-110 active:scale-90 transition-all p-1 bg-slate-100/50 hover:bg-red-50 rounded text-xs font-bold w-6 h-6 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 border border-slate-200/60 z-10 cursor-pointer"
                                          title="Usuń lekcję z siatki"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <div className={`text-[10px] mt-0.5 font-medium truncate ${isConf ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                                        👤 {teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nieprzypisany'}
                                      </div>

                                      {suppTeacher && (
                                        <div className="text-[10px] text-indigo-700 font-bold mt-1 truncate">
                                          👥 Wspomaganie: {suppTeacher.first} {suppTeacher.last} ({suppTeacher.abbr})
                                        </div>
                                      )}

                                      {asg.linkedClassIds && asg.linkedClassIds.length > 0 && (
                                        <div className="text-[9px] text-indigo-850 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-1 font-bold truncate flex items-center gap-0.5" title="Zajęcia łączone (grupa międzyoddziałowa)">
                                          🔗 Wspólnie z: {[classesMap.get(asg.classId)?.name, ...asg.linkedClassIds.map(id => classesMap.get(id)?.name)].filter(n => n && n !== cls.name).join(' + ')}
                                        </div>
                                      )}

                                      {/* Specjalni uczniowie */}
                                      {specStudentsInThisClassAndSubj.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                          {specStudentsInThisClassAndSubj.map(ss => {
                                            const typeLabel = ss.type === 'ni' ? 'NI' : ss.type === 'rewa' ? 'Rewa' : 'Wsp';
                                            return (
                                              <span 
                                                key={ss.id} 
                                                className="text-[9px] font-bold px-1 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded flex items-center gap-0.5"
                                                title={`${ss.firstName} ${ss.lastName} (${typeLabel}) - ma zajęcia z klasą`}
                                              >
                                                🎓 {ss.lastName} {ss.firstName[0]}. ({typeLabel})
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Wybór nauczyciela wspomagającego */}
                                      <div 
                                        className="mt-1.5 pt-1 border-t border-slate-100" 
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchEnd={(e) => e.stopPropagation()}
                                      >
                                        <select
                                          title="Nauczyciel wspomagający"
                                          className={`w-full text-[9px] font-semibold border rounded px-1.5 py-0.5 outline-none transition cursor-pointer ${
                                            lesson.supportTeacherId 
                                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' 
                                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                          }`}
                                          value={lesson.supportTeacherId || ''}
                                          onChange={(e) => {
                                            const val = e.target.value || null;
                                            const updatedLessons = { ...pl.lessons };
                                            updatedLessons[key] = {
                                              ...updatedLessons[key],
                                              supportTeacherId: val
                                            };
                                            onChangeAppState({
                                              ...appState,
                                              planLekcji: {
                                                ...pl,
                                                lessons: updatedLessons
                                              }
                                            });
                                          }}
                                        >
                                          <option value="">👥 Dodaj wspomagającego...</option>
                                          {pl.teachers.map(t => (
                                            <option key={t.id} value={t.id}>
                                              Wspomaga: {t.first[0]}. {t.last} ({t.abbr})
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {isConf && (
                                        <div className="text-[9px] text-red-600 font-bold bg-white/80 border border-red-200 p-1 rounded font-sans leading-tight mt-1 animate-pulse">
                                          {confReasons[0]}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 font-mono">
                                      <span className={isConf ? 'text-red-700 font-bold' : ''}>🚪 {room ? room.name : 'Bez sali'}</span>
                                      {isConf && <span className="text-red-600 font-black tracking-tighter">⚠️ KOLIZJA</span>}
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div 
                                  onClick={() => {
                                    if (selectedAssignmentId) {
                                      placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex, cls.id);
                                    } else {
                                      setAllViewSelectedClassId(cls.id);
                                    }
                                  }}
                                  className={`h-full border border-dashed rounded-lg flex flex-col items-center justify-center transition-all select-none min-h-[90px] ${
                                    selectedAssignmentId 
                                      ? 'border-indigo-300 bg-indigo-50/40 text-indigo-550 hover:bg-indigo-50/80 hover:border-indigo-400 cursor-pointer' 
                                      : 'border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-pointer'
                                  }`}
                                >
                                  <span className="text-lg font-light">+</span>
                                  {selectedAssignmentId && (
                                    <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 px-1.5 py-0.5 bg-white border border-indigo-200 rounded shadow-xs mt-1 animate-pulse">
                                      Wstaw
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ==================== WIDOK JEDNEJ KLASY ==================== */
              currentClass ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto p-2">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-3 border-b border-r border-slate-200 text-xs font-bold text-slate-400 text-center w-24">Lekcja</th>
                        {DAYS.map((day, i) => (
                          <th key={i} className="p-3 border-b border-slate-200 text-xs font-bold text-slate-600 text-center min-w-[140px] select-none">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pl.hours.map((h, hourIndex) => (
                        <tr key={hourIndex} className="hover:bg-slate-50/50">
                          {/* Godzina */}
                          <td className="p-3 border-b border-r border-slate-200 text-center bg-slate-50/50 select-none">
                            <span className="block font-bold text-slate-700">{h.num}</span>
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{h.start}–{h.end}</span>
                          </td>
                          {/* Dni */}
                          {DAYS.map((_, dayIndex) => {
                            const key = `${activeClassId}|${dayIndex}|${hourIndex}`;
                            const lesson = pl.lessons[key];
                            const asg = lesson ? pl.assignments.find(a => a.id === lesson.assignmentId) : null;
                            const subj = asg ? subjectsMap.get(asg.subjectId) : null;
                            const teacher = asg && asg.teacherId ? teachersMap.get(asg.teacherId) : null;
                            const room = asg && asg.roomId ? roomsMap.get(asg.roomId) : null;
                            const confReasons = conflicts.get(key) || [];
                            const isConf = confReasons.length > 0;

                            return (
                              <td 
                                key={dayIndex}
                                title={isConf ? confReasons.join('\n') : undefined}
                                className={`p-1.5 border-b border-r last:border-r-0 border-slate-200 align-top h-28 transition-all ${
                                  isConf ? 'bg-red-50/70 border-2 border-red-300' : ''
                                }`}
                                data-cell-type="plan-cell"
                                data-day={dayIndex}
                                data-hour={hourIndex}
                                data-class-id={activeClassId}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDropOnCell(dayIndex, hourIndex)}
                              >
                                {asg ? (() => {
                                  const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;
                                  const specStudentsInThisClassAndSubj = pl.specialStudents.filter(ss => {
                                    if (ss.classId !== activeClassId) return false;
                                    return pl.specialAssignments.some(sa => sa.studentId === ss.id && sa.subjectId === asg.subjectId && sa.withClass);
                                  });

                                  return (
                                    <div 
                                      onClick={() => {
                                        if (selectedAssignmentId) {
                                          placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex);
                                        }
                                      }}
                                      draggable={!isTouchDevice}
                                      onDragStart={(e) => {
                                        if (isTouchDevice) {
                                          e.preventDefault();
                                          return;
                                        }
                                        handleDragStart(asg.id, key);
                                      }}
                                      onTouchStart={(e) => handleTouchStart(e, asg.id, key)}
                                      onTouchMove={(e) => handleTouchMove(e, asg.id)}
                                      onTouchEnd={handleTouchEnd}
                                      onContextMenu={(e) => e.preventDefault()}
                                      className={`h-full min-h-[90px] rounded-lg p-2 border-l-4 relative select-none flex flex-col justify-between group transition-all cursor-grab active:cursor-grabbing touch-none ${
                                        selectedAssignmentId 
                                          ? 'ring-2 ring-indigo-400 ring-offset-1 cursor-pointer hover:bg-slate-50' 
                                          : 'hover:shadow-md'
                                      } ${
                                        isConf 
                                          ? 'border-red-600 bg-red-50 text-red-900 shadow-sm'
                                          : 'bg-white shadow-sm'
                                      }`}
                                      style={{
                                        ...(isConf ? {} : { borderLeftColor: subj?.color || '#cbd5e1' }),
                                        WebkitTouchCallout: 'none',
                                        WebkitUserSelect: 'none',
                                        KhtmlUserSelect: 'none',
                                        MozUserSelect: 'none',
                                        msUserSelect: 'none',
                                        userSelect: 'none',
                                        WebkitUserDrag: 'none'
                                      }}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs font-bold truncate" style={isConf ? {} : { color: subj?.color }}>
                                            {subj?.name}
                                          </span>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveLesson(key);
                                            }}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            onTouchEnd={(e) => {
                                              e.stopPropagation();
                                              handleRemoveLesson(key);
                                            }}
                                            className="text-slate-400 hover:text-red-500 hover:scale-110 active:scale-90 transition-all p-1 bg-slate-100/50 hover:bg-red-50 rounded text-xs font-bold w-6 h-6 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 border border-slate-200/60 z-10 cursor-pointer"
                                            title="Usuń lekcję z siatki"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        <div className={`text-[10px] mt-0.5 font-medium truncate ${isConf ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                                          👤 {teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nieprzypisany'}
                                        </div>

                                        {suppTeacher && (
                                          <div className="text-[10px] text-indigo-700 font-bold mt-1 truncate">
                                            👥 Wspomaganie: {suppTeacher.first} {suppTeacher.last} ({suppTeacher.abbr})
                                          </div>
                                        )}

                                        {asg.linkedClassIds && asg.linkedClassIds.length > 0 && (
                                          <div className="text-[9px] text-indigo-850 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-1 font-bold truncate flex items-center gap-0.5" title="Zajęcia łączone (grupa międzyoddziałowa)">
                                            🔗 Wspólnie z: {[classesMap.get(asg.classId)?.name, ...asg.linkedClassIds.map(id => classesMap.get(id)?.name)].filter(n => n && n !== currentClass?.name).join(' + ')}
                                          </div>
                                        )}

                                        {/* Specjalni uczniowie */}
                                        {specStudentsInThisClassAndSubj.length > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1">
                                            {specStudentsInThisClassAndSubj.map(ss => {
                                              const typeLabel = ss.type === 'ni' ? 'NI' : ss.type === 'rewa' ? 'Rewa' : 'Wsp';
                                              return (
                                                <span 
                                                  key={ss.id} 
                                                  className="text-[9px] font-bold px-1 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded flex items-center gap-0.5"
                                                  title={`${ss.firstName} ${ss.lastName} (${typeLabel}) - ma zajęcia z klasą`}
                                                >
                                                  🎓 {ss.lastName} {ss.firstName[0]}. ({typeLabel})
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* Wybór nauczyciela wspomagającego */}
                                        <div 
                                          className="mt-1.5 pt-1 border-t border-slate-100" 
                                          onClick={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          onTouchEnd={(e) => e.stopPropagation()}
                                        >
                                          <select
                                            title="Nauczyciel wspomagający"
                                            className={`w-full text-[9px] font-semibold border rounded px-1.5 py-0.5 outline-none transition cursor-pointer ${
                                              lesson.supportTeacherId 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' 
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                            value={lesson.supportTeacherId || ''}
                                            onChange={(e) => {
                                              const val = e.target.value || null;
                                              const updatedLessons = { ...pl.lessons };
                                              updatedLessons[key] = {
                                                ...updatedLessons[key],
                                                supportTeacherId: val
                                              };
                                              onChangeAppState({
                                                ...appState,
                                                planLekcji: {
                                                  ...pl,
                                                  lessons: updatedLessons
                                                }
                                              });
                                            }}
                                          >
                                            <option value="">👥 Dodaj wspomagającego...</option>
                                            {pl.teachers.map(t => (
                                              <option key={t.id} value={t.id}>
                                                Wspomaga: {t.first[0]}. {t.last} ({t.abbr})
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {isConf && (
                                          <div className="text-[9px] text-red-600 font-bold bg-white/80 border border-red-200 p-1 rounded font-sans leading-tight mt-1 animate-pulse">
                                            {confReasons[0]}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 font-mono">
                                        <span className={isConf ? 'text-red-700 font-bold' : ''}>🚪 {room ? room.name : 'Bez sali'}</span>
                                        {isConf && <span className="text-red-600 font-black tracking-tighter">⚠️ KOLIZJA</span>}
                                      </div>
                                    </div>
                                  );
                                })() : (
                                  <div 
                                    onClick={() => {
                                      if (selectedAssignmentId) {
                                        placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex);
                                      }
                                    }}
                                    className={`h-full border border-dashed rounded-lg flex flex-col items-center justify-center transition-all select-none min-h-[90px] ${
                                      selectedAssignmentId 
                                        ? 'border-indigo-300 bg-indigo-50/40 text-indigo-550 hover:bg-indigo-50/80 hover:border-indigo-400 cursor-pointer' 
                                        : 'border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-default'
                                    }`}
                                  >
                                    <span className="text-lg font-light">+</span>
                                    {selectedAssignmentId && (
                                      <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 px-1.5 py-0.5 bg-white border border-indigo-200 rounded shadow-xs mt-1 animate-pulse">
                                        Wstaw
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-slate-200 bg-white rounded-xl flex flex-col items-center justify-center p-6 text-center select-none">
                  <span className="text-4xl">🤖</span>
                  <span className="text-slate-500 text-sm mt-2 font-semibold">Aktualnie nie wybrano klasy</span>
                  <span className="text-slate-400 text-xs mt-1">Sugerujemy wybrać jedną z klas z lewego panelu bocznego, aby przystąpić do budowy planu lekcji.</span>
                </div>
              )
            )}
          </div>
        )}

        {/* ── LICZBA PRZYPISAŃ (Zajęcia) ── */}
        {activeTab === 'assign' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-4 select-none">📌 Dodaj nowe przypisanie (Kto, Czego, Ile, Gdzie)</h2>
              <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Klasa</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                    value={assignClass}
                    onChange={(e) => {
                      const clsId = e.target.value;
                      setAssignClass(clsId);
                      autoSelectGroupForAssignTab(clsId, assignSubject);
                    }}
                  >
                    <option value="">Wybierz klasę</option>
                    {pl.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.group ? `(${c.group})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Przedmiot</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                    value={assignSubject}
                    onChange={(e) => {
                      const subjId = e.target.value;
                      setAssignSubject(subjId);
                      autoSelectGroupForAssignTab(assignClass, subjId);
                    }}
                  >
                    <option value="">Wybierz przedmiot</option>
                    {pl.subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.short})</option>
                    ))}
                  </select>
                </div>

                {assignClass && pl.schoolGroups.filter(g => g.classId === assignClass).length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Podgrupa (Wybór auto)</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-indigo-50/50 border-indigo-200 text-indigo-700 font-bold outline-none"
                      value={assignGroup}
                      onChange={(e) => setAssignGroup(e.target.value)}
                    >
                      <option value="">Cała klasa</option>
                      {pl.schoolGroups.filter(g => g.classId === assignClass).map(g => (
                        <option key={g.id} value={g.id}>Grupa: {g.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Główny Nauczyciel</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                    value={assignTeacher}
                    onChange={(e) => setAssignTeacher(e.target.value)}
                  >
                    <option value="">Wybierz nauczyciela</option>
                    {pl.teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dedykowana Sala</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                    value={assignRoom}
                    onChange={(e) => setAssignRoom(e.target.value)}
                  >
                    <option value="">Wybierz salę</option>
                    {pl.rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} {r.desc ? `(${r.desc})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rozkład lekcji (Bloki)</label>
                  <select 
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-slate-700 bg-blue-50/45 focus:bg-white"
                    value={assignPreferredBlockSize}
                    onChange={(e) => setAssignPreferredBlockSize(Number(e.target.value))}
                  >
                    <option value={1}>Pojedyncze lekcje (1h)</option>
                    <option value={2}>Bloki dwugodzinne (2h)</option>
                    <option value={3}>Bloki trzygodzinne (3h)</option>
                    <option value={0}>Dowolny układ lekcji / bloków</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Godzin/Tydz.</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-center"
                      value={assignHours}
                      onChange={(e) => setAssignHours(Number(e.target.value))}
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 border border-transparent rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs self-end h-[34px]">
                    Dodaj
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 select-none">📋 Aktywne Przypisania (Pracochłonność)</h3>
              </div>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Klasa</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Przedmiot</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Nauczyciel</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 border-b border-slate-200">Dedykowana Sala</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 border-b border-slate-200">Godzin/Tydz</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 border-b border-slate-200">Umieszczone</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 border-b border-slate-200">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {pl.assignments.map(a => {
                    const c = classesMap.get(a.classId);
                    const s = subjectsMap.get(a.subjectId);
                    const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
                    const r = a.roomId ? roomsMap.get(a.roomId) : null;
                    const placed = placedHours[a.id] || 0;

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-xs font-bold text-slate-700 border-b border-slate-200">
                          <div>
                            {c ? `Oddział ${c.name}` : '?'}
                          </div>
                          {a.groupId && (() => {
                            const grp = pl.schoolGroups.find(g => g.id === a.groupId);
                            return grp ? (
                              <div className="text-[9.5px] text-indigo-600 font-bold mt-0.5">
                                👥 Grupa: {grp.name}
                              </div>
                            ) : null;
                          })()}
                        </td>
                        <td className="p-3 text-xs border-b border-slate-200" style={{ color: s?.color }}>{s?.name}</td>
                        <td className="p-3 text-xs text-slate-600 border-b border-slate-200">
                          {t ? `${t.first} ${t.last} (${t.abbr})` : '—'}
                        </td>
                        <td className="p-3 text-xs text-slate-500 font-mono border-b border-slate-200">
                          {r ? r.name : 'Dowolna'}
                        </td>
                        <td className="p-3 text-xs text-center border-b border-slate-200">
                          <div className="font-semibold text-slate-800">{a.hoursPerWeek}h</div>
                          {a.preferredBlockSize !== undefined && (
                            <div className={`inline-block px-1 mt-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              a.preferredBlockSize === 2 
                                ? 'bg-purple-100 text-purple-700'
                                : a.preferredBlockSize === 3
                                  ? 'bg-amber-100 text-amber-700'
                                  : a.preferredBlockSize === 1
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {a.preferredBlockSize === 2 
                                ? 'blok 2h'
                                : a.preferredBlockSize === 3
                                  ? 'blok 3h'
                                  : a.preferredBlockSize === 1
                                    ? 'poj. 1h'
                                    : 'dowolny'}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs text-center border-b border-slate-200">
                          <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                            placed >= a.hoursPerWeek 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {placed} / {a.hoursPerWeek}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-center border-b border-slate-200">
                          <button 
                            onClick={() => handleRemoveAssignment(a.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pl.assignments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">Brak aktywnych przypisań szkolnych. Dodaj je u góry.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── NAUCZYCIELE I PRZEDMIOTY ── */}
        {activeTab === 'teachers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Lista i dodawanie nauczycieli */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <User size={14} /> 👨‍🏫 {editingTeacherId ? 'Edytuj Nauczyciela' : 'Dodaj Nauczyciela'}
              </h3>
              <form onSubmit={handleAddTeacher} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Imię" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newTeacherFirst}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTeacherFirst(val);
                    updateTeacherAbbrAuto(val, newTeacherLast);
                  }}
                />
                <input 
                  type="text" 
                  placeholder="Nazwisko *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newTeacherLast}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTeacherLast(val);
                    updateTeacherAbbrAuto(newTeacherFirst, val);
                  }}
                />
                <input 
                  type="text" 
                  placeholder="Skrót (np. JKOW) *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-bold"
                  value={newTeacherAbbr}
                  onChange={(e) => {
                    setNewTeacherAbbr(e.target.value.toUpperCase());
                    setIsTeacherAbbrManual(true);
                  }}
                />
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Pensum (godz.)</label>
                    <input 
                      type="number" 
                      required
                      min={1}
                      max={40}
                      placeholder="18"
                      className="w-full px-3 py-1 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 font-semibold text-slate-800"
                      value={newTeacherMaxHours}
                      onChange={(e) => setNewTeacherMaxHours(parseInt(e.target.value) || 18)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-indigo-500 font-bold block mb-0.5">Nadgodziny</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      max={40}
                      placeholder="0"
                      className="w-full px-3 py-1 border border-indigo-150 rounded-lg text-xs outline-none bg-indigo-50/20 font-semibold text-indigo-800"
                      value={newTeacherOvertimeHours}
                      onChange={(e) => setNewTeacherOvertimeHours(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm">
                    {editingTeacherId ? 'Zapisz zmiany Nick' : 'Dodaj Nauczyciela'}
                  </button>
                  {editingTeacherId && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditTeacher}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
                    >
                      Anuluj
                    </button>
                  )}
                </div>
              </form>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {pl.teachers.map(t => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs gap-1.5 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-700 truncate">{t.first} {t.last}</span>
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[10px] font-black text-slate-500">{t.abbr}</span>
                        {t.inactive && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black uppercase">Nieaktywny</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>Pensum: {t.maxHours || 18}h {t.overtimeHours ? `+ ${t.overtimeHours}h nadg.` : ''}</span>
                        {t.inactive && t.inactiveComment && (
                          <span className="text-rose-600 font-semibold italic">({t.inactiveComment})</span>
                        )}
                        {!t.inactive && t.substitutions && t.substitutions.length > 0 && (
                          <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">🔀 Zastępstwa: {t.substitutions.length} lekcji</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStartEditTeacher(t)}
                        className="text-slate-400 hover:text-blue-600 p-1"
                        title="Edytuj dane"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTeacher(t.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Usuń nauczyciela"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Słownik przedmiotów */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <BookOpen size={14} /> {editingSubjectId ? '📝 Edytuj przedmiot' : '📚 Przedmioty szkolne'}
              </h3>
              <form onSubmit={handleAddSubject} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Nazwa przedmiotu *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newSubjectName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewSubjectName(val);
                    if (!isSubjectShortManual) {
                      setNewSubjectShort(subjectAbbr(val));
                    }
                  }}
                />
                <input 
                  type="text" 
                  placeholder="Skrót (np. MAT, POL)" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newSubjectShort}
                  onChange={(e) => {
                    setNewSubjectShort(e.target.value);
                    setIsSubjectShortManual(true);
                  }}
                />

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Słowo kluczowe podgrupy (opcjonalnie)</label>
                  <input 
                    type="text" 
                    placeholder="np. religia, ang, niem, wf" 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50 font-bold text-indigo-600"
                    value={newSubjectPattern}
                    onChange={(e) => setNewSubjectPattern(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3 py-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kolor kafelka:</label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="color" 
                      className="w-7 h-7 border border-slate-200 rounded cursor-pointer p-0 bg-transparent"
                      value={newSubjectColor}
                      onChange={(e) => setNewSubjectColor(e.target.value)}
                    />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{newSubjectColor}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="grow py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition">
                    {editingSubjectId ? 'Zapisz zmiany' : 'Dodaj Przedmiot'}
                  </button>
                  {editingSubjectId && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditSubject}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer transition"
                    >
                      Anuluj
                    </button>
                  )}
                </div>
              </form>

              <div className="divide-y divide-slate-100 max-h-90 overflow-y-auto">
                {pl.subjects.map(s => (
                  <div key={s.id} className="py-2 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded px-1 transition duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">{s.name}</p>
                        {s.defaultGroupPattern && (
                          <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1 rounded uppercase tracking-wide inline-block mt-0.5">
                            Wzorzec gr: {s.defaultGroupPattern}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold font-mono text-[10px]" style={{ color: s.color }}>{s.short}</span>
                      <button 
                        onClick={() => handleStartEditSubject(s)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer select-none"
                        title="Edytuj przedmiot"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rekomendowane sale */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <MapPin size={14} /> 🚪 Sale lekcyjne (Etap 1)
              </h3>
              <form onSubmit={handleAddRoom} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Nazwa/Nr Sali *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  Dodaj Salę
                </button>
              </form>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {pl.rooms.map(r => (
                  <div key={r.id} className="py-2 flex items-center justify-between text-xs text-slate-700 font-semibold">
                    <span>Sala {r.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{r.desc || 'Klasyczna'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 🧑‍🏫 Teacher Edit Modal Overlay over Planner */}
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
                              value={newTeacherFirst}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewTeacherFirst(val);
                                updateTeacherAbbrAuto(val, newTeacherLast);
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
                              value={newTeacherLast}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewTeacherLast(val);
                                updateTeacherAbbrAuto(newTeacherFirst, val);
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
                              value={newTeacherAbbr}
                              onChange={(e) => {
                                setNewTeacherAbbr(e.target.value.toUpperCase());
                                setIsTeacherAbbrManual(true);
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
                                value={newTeacherMaxHours}
                                onChange={(e) => setNewTeacherMaxHours(parseInt(e.target.value) || 18)}
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
                                value={newTeacherOvertimeHours}
                                onChange={(e) => setNewTeacherOvertimeHours(parseInt(e.target.value) || 0)}
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
                                  onClick={() => setNewTeacherColor(c)}
                                  className={`w-4.5 h-4.5 rounded-full border shrink-0 transition ${
                                    newTeacherColor === c ? 'ring-2 ring-blue-500 scale-110 shadow-sm' : 'border-slate-100 hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: c }}
                                  title={c}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Weekly Availability Grid */}
                      <div className="lg:col-span-7 space-y-3 flex flex-col font-sans">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            📅 Godziny Dostępności Nauczyciela
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAllTeacherAvailability(true)}
                              className="text-[9px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold border border-emerald-200 transition"
                            >
                              Zaznacz wszystkie
                            </button>
                            <button
                              type="button"
                              onClick={() => setAllTeacherAvailability(false)}
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
                              {(pl.hours && pl.hours.length > 0 ? pl.hours : []).map((h) => (
                                <tr key={h.num} className="hover:bg-slate-55">
                                  <td className="p-1 border-r border-slate-150 bg-slate-50 font-bold text-slate-600 text-center">
                                    <div className="text-[9px]">Lekcja {h.num}</div>
                                    <div className="text-[8px] text-slate-400 font-normal leading-none">{h.start}-{h.end}</div>
                                  </td>
                                  {[0, 1, 2, 3, 4].map((dayIndex) => {
                                    const code = `${dayIndex}-${h.num}`;
                                    const isAvailable = newTeacherAvailability.includes(code);
                                    return (
                                      <td 
                                        key={dayIndex} 
                                        onClick={() => {
                                          if (newTeacherAvailability.includes(code)) {
                                            setNewTeacherAvailability(newTeacherAvailability.filter(x => x !== code));
                                          } else {
                                            setNewTeacherAvailability([...newTeacherAvailability, code]);
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

        {/* ── NAUCZANIE SPECJALNE (Moduł specjalny) ── */}
        {activeTab === 'special' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
            
            {/* Lewy panel: Uczniowie specjalni */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
                <Users size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">🎓 Uczniowie specjalni</h3>
              </div>
              
              {/* Formularz dodawania nowego ucznia */}
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 shadow-3xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 select-none">➕ Dodaj nowego ucznia</span>
                <form onSubmit={handleAddSpecialStudent} className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Imię" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                      value={specFirstName}
                      onChange={(e) => setSpecFirstName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Nazwisko *" 
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                      value={specLastName}
                      onChange={(e) => setSpecLastName(e.target.value)}
                    />
                  </div>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none font-semibold text-slate-700"
                    value={specType}
                    onChange={(e) => setSpecType(e.target.value as any)}
                  >
                    <option value="ni">Nauczanie Indywidualne (NI)</option>
                    <option value="rewa">Rewalidacja (Rewa)</option>
                    <option value="wsp">Wspomaganie (Wsp)</option>
                  </select>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none font-semibold text-slate-700"
                    value={specClassId}
                    onChange={(e) => setSpecClassId(e.target.value)}
                  >
                    <option value="">Wybierz klasę macierzystą</option>
                    {pl.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer">
                    Dodaj Ucznia
                  </button>
                </form>
              </div>

              {/* Lista uczniów */}
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {pl.specialStudents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl select-none leading-relaxed">
                    Brak dodanych uczniów. Wypełnij formularz powyżej, aby dodać pierwszego ucznia.
                  </div>
                ) : (
                  pl.specialStudents.map(s => {
                    const studentClass = s.classId ? classesMap.get(s.classId) : null;
                    const typeLabels = { ni: 'NI', rewa: 'Rewa', wsp: 'Wsp' };
                    const typeColors = {
                      ni: 'bg-amber-50 text-amber-700 border-amber-200',
                      rewa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      wsp: 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    };
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveStudentId(s.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer select-none ${
                          activeStudentId === s.id 
                            ? 'bg-blue-50/60 border-blue-400 text-blue-900 shadow-xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveStudentId(s.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0 ${typeColors[s.type] || 'bg-slate-100 text-slate-700'}`}>
                            {typeLabels[s.type] || s.type.toUpperCase()}
                          </span>
                          <span className="truncate font-bold text-slate-805">{s.lastName} {s.firstName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {studentClass && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold leading-normal border border-slate-200">
                              {studentClass.name}
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={(e) => handleRemoveSpecialStudent(s.id, e)}
                            className="bg-transparent border-none opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-opacity"
                            title="Usuń profil ucznia"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
 
            {/* Prawy panel: Edycja przypisań, profilu i statystyk wybranego ucznia */}
            <div className="lg:col-span-8 space-y-6">
              {currentStudent ? (() => {
                // Obliczenie statystyk godzin dla wybranego ucznia
                const classHours = studentAssignments
                  .filter(a => a.withClass)
                  .reduce((sum, a) => sum + a.hoursPerWeek, 0);
                  
                const individualHours = studentAssignments
                  .filter(a => !a.withClass)
                  .reduce((sum, a) => sum + a.hoursPerWeek, 0);

                const totalHours = classHours + individualHours;

                return (
                  <div className="space-y-6">
                    
                    {/* Sekcja 1: Profil i wsparcie w klasie / Edycja uczniów */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 select-none">
                        <div className="flex items-center gap-2">
                          <Settings size={15} className="text-indigo-600" />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Edycja Profilu ucznia i Wsparcie w klasie</h4>
                        </div>
                        <span className="text-[10px] bg-slate-150 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-205 font-mono">
                          ID: {currentStudent.id.substring(0, 5)}...
                        </span>
                      </div>

                      {/* Pola formularza edycji profilu */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Imię</label>
                          <input 
                            type="text"
                            value={currentStudent.firstName}
                            onChange={(e) => {
                              handleUpdateSpecialStudent({
                                ...currentStudent,
                                firstName: e.target.value
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-slate-50 font-bold text-slate-850"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Nazwisko</label>
                          <input 
                            type="text"
                            value={currentStudent.lastName}
                            onChange={(e) => {
                              handleUpdateSpecialStudent({
                                ...currentStudent,
                                lastName: e.target.value
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-slate-50 font-bold text-slate-850"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Typ wsparcia</label>
                          <select
                            value={currentStudent.type}
                            onChange={(e) => {
                              handleUpdateSpecialStudent({
                                ...currentStudent,
                                type: e.target.value as any
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 font-bold text-slate-850"
                          >
                            <option value="ni">Nauczanie Indywidualne (NI)</option>
                            <option value="rewa">Rewalidacja (Rewa)</option>
                            <option value="wsp">Wspomaganie (Wsp)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Klasa macierzysta</label>
                          <select
                            value={currentStudent.classId || ''}
                            onChange={(e) => {
                              handleUpdateSpecialStudent({
                                ...currentStudent,
                                classId: e.target.value || null
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 font-bold text-slate-850"
                          >
                            <option value="">Brak klasy macierzystej</option>
                            {pl.classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* DODATKOWO: Nauczyciele wspomagający w klasie */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <Users size={12} className="text-indigo-500 shrink-0" />
                            Nauczyciele wspomagający na lekcjach klasowych (Zajęcia z klasą)
                          </span>
                          <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed mt-0.5 select-none">
                            Wskąż kadrę wspomagającą, która wspiera ucznia bezpośrednio na jego regularnych zajęciach grupowych z klasą macierzystą (możesz zaznaczyć wielu nauczycieli):
                          </p>
                        </div>

                        {/* Lista nauczycieli - grid checkboxów */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-24 overflow-y-auto pr-1 border border-slate-205 rounded-xl p-2.5 bg-slate-50/50 custom-scrollbar">
                          {pl.teachers.map(t => {
                            const isChecked = (currentStudent.supportTeacherIds || []).includes(t.id);
                            return (
                              <label 
                                key={t.id} 
                                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer select-none transition-all leading-tight ${
                                  isChecked 
                                    ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-900 shadow-3xs' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const currentList = currentStudent.supportTeacherIds || [];
                                    const updatedList = e.target.checked 
                                      ? [...currentList, t.id]
                                      : currentList.filter(id => id !== t.id);
                                    handleUpdateSpecialStudent({
                                      ...currentStudent,
                                      supportTeacherIds: updatedList
                                    });
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 h-3 w-3 cursor-pointer shrink-0"
                                />
                                <span className="truncate" title={`${t.first} ${t.last}`}>{t.first.charAt(0)}. {t.last} ({t.abbr})</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium select-none flex items-center gap-1">
                          Wykaz nauczycieli wspomagających w klasie: {currentStudent.supportTeacherIds && currentStudent.supportTeacherIds.length > 0 ? (
                            <span className="font-bold text-slate-800 bg-slate-100 py-0.5 px-2 rounded-md border border-slate-200 ml-1">
                              {currentStudent.supportTeacherIds.length === 1 ? '1 nauczyciel' : `${currentStudent.supportTeacherIds.length} nauczycieli`} (
                              {currentStudent.supportTeacherIds.map(id => teachersMap.get(id)?.abbr).filter(Boolean).join(', ')}
                              )
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Brak przypisanego wsparcia kadrowego na lekcjach w klasie.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sekcja 2: Statystyki Wymiaru Godzin */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Suma godzin */}
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-2xl p-4 flex flex-col justify-between shadow-3xs select-none">
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Łączne pensum ucznia</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-black text-indigo-950 font-mono">{totalHours}</span>
                          <span className="text-xs font-extrabold text-indigo-500">godz. / tydz.</span>
                        </div>
                        <p className="text-[9.5px] text-indigo-805 font-bold leading-normal mt-2">
                          Sumaryczny tygodniowy wymiar lekcji i innych zajęć dedykowanych.
                        </p>
                      </div>

                      {/* Z klasą */}
                      <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/30 border border-emerald-150 rounded-2xl p-4 flex flex-col justify-between shadow-3xs select-none">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Zajęcia z klasą</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-black text-emerald-950 font-mono">{classHours}</span>
                          <span className="text-xs font-extrabold text-emerald-600 bg-white/40 px-1.5 py-0.2 rounded border border-emerald-100">godz. / tydz.</span>
                        </div>
                        <p className="text-[9.5px] text-emerald-805 font-bold leading-normal mt-2">
                          Lekcje zintegrowane, na których uczeń realizuje program wspólnie ze swoją klasą.
                        </p>
                      </div>

                      {/* Indywidualnie */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-150 rounded-2xl p-4 flex flex-col justify-between shadow-3xs select-none">
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">Zajęcia indywidualne</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-black text-amber-950 font-mono">{individualHours}</span>
                          <span className="text-xs font-extrabold text-amber-600 bg-white/40 px-1.5 py-0.2 rounded border border-amber-100">godz. / tydz.</span>
                        </div>
                        <p className="text-[9.5px] text-amber-805 font-bold leading-normal mt-2">
                          Przedmioty w systemie zindywidualizowanym (sam na sam z nauczycielem).
                        </p>
                      </div>
                    </div>

                    {/* Sekcja 3: Dodawanie nowych zajęć (Z klasą / Indywidualnie) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 select-none">
                        <Sparkles size={15} className="text-indigo-600 animate-pulse" />
                        <h4 className="text-xs font-black text-slate-805 uppercase tracking-wider">Nowe zajęcia specjalne lub indywidualne</h4>
                      </div>

                      <form onSubmit={handleAddSpecialAssignment} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 select-none font-sans">Przedmiot</label>
                            <select
                              required
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-indigo-500 font-bold text-slate-800"
                              value={specSubjectId}
                              onChange={(e) => setSpecSubjectId(e.target.value)}
                            >
                              <option value="">Wybierz przedmiot...</option>
                              {pl.subjects.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name} ({sub.short})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 select-none font-sans">Nauczyciel Prowadzący</label>
                            <select
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-indigo-500 font-bold text-slate-805"
                              value={specTeacherId}
                              onChange={(e) => setSpecTeacherId(e.target.value)}
                            >
                              <option value="">Nauczyciel prowadzący...</option>
                              {pl.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 select-none font-sans">Wspomagający na tym przedmiocie</label>
                            <select
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:border-indigo-500 font-bold text-slate-805"
                              value={specSupportId}
                              onChange={(e) => setSpecSupportId(e.target.value)}
                            >
                              <option value="">Brak wspomagającego do tych zajęć...</option>
                              {pl.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Forma zajęć: Zajęcia z klasą vs Indywidualne */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 select-none font-sans">Tygodniowy wymiar godzin</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number"
                                min="1"
                                max="40"
                                required
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-bold"
                                value={specHoursPerW}
                                onChange={(e) => setSpecHoursPerW(Number(e.target.value))}
                              />
                              <span className="text-xs text-slate-500 font-bold shrink-0">godz. / tydz.</span>
                            </div>
                          </div>

                          {/* Selektor form i form integracji */}
                          <div className="sm:col-span-5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSpecWithClass(true)}
                              className={`flex-1 p-2 rounded-xl border font-bold text-[10.5px] transition-all flex flex-col items-center justify-center cursor-pointer select-none leading-relaxed border-solid ${
                                specWithClass 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span className="font-extrabold uppercase text-[7.5px] tracking-wider mb-0.5 text-emerald-600">Forma Integracji</span>
                              🏫 Zajęcia z klasą
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpecWithClass(false)}
                              className={`flex-1 p-2 rounded-xl border font-bold text-[10.5px] transition-all flex flex-col items-center justify-center cursor-pointer select-none leading-relaxed border-solid ${
                                !specWithClass 
                                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-3xs' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                              }`}
                            >
                              <span className="font-extrabold uppercase text-[7.5px] tracking-wider mb-0.5 text-amber-600">Forma Osobna</span>
                              👤 Indywidualne
                            </button>
                          </div>

                          <div className="sm:col-span-3">
                            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition-all flex items-center justify-center gap-1 cursor-pointer">
                              <Plus size={13} /> Dodaj zajęcie
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Sekcja 4: Wykaz zajęć przypisanych do tego ucznia */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Wykaz zdefiniowanych zajęć ({studentAssignments.length})</span>
                        <p className="text-[10px] text-slate-400 font-bold leading-normal select-none">
                          Zadania te zostaną udostępnione w bazie do rozpisania planu godzin.
                        </p>
                      </div>

                      {studentAssignments.length === 0 ? (
                        <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 italic text-xs py-10 select-none">
                          Brak zdefiniowanych zajęć i przedmiotów dla tego ucznia. Użyj formularza powyżej, aby stworzyć pierwszą pozycję.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {studentAssignments.map(a => {
                            const subj = subjectsMap.get(a.subjectId);
                            const mainTeacher = a.teacherId ? teachersMap.get(a.teacherId) : null;
                            const supportTeacher = a.supportTeacherId ? teachersMap.get(a.supportTeacherId) : null;
                            
                            return (
                              <div 
                                key={a.id} 
                                className={`p-4 border rounded-2xl flex flex-col justify-between text-xs bg-white transition hover:shadow-xs relative border-l-4 group ${
                                  a.withClass ? 'border-l-emerald-500 border-slate-200' : 'border-l-amber-500 border-slate-200'
                                }`}
                              >
                                {/* Przedmiot i usunięcie */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <span className="font-bold text-[12.5px] block truncate leading-tight" style={{ color: subj?.color || '#334155' }}>
                                      {subj?.name}
                                    </span>
                                    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border mt-1 leading-none ${
                                      a.withClass 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                        : 'bg-amber-50 text-amber-700 border-amber-150'
                                    }`}>
                                      {a.withClass ? '🏫 Z klasą' : '👤 Indywidualnie'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="font-black text-[10.5px] bg-slate-100/80 border border-slate-200 text-slate-705 px-1.5 py-0.5 rounded font-mono">
                                      {a.hoursPerWeek}h/tydz
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSpecialAssignment(a.id)}
                                      className="text-slate-400 hover:text-red-500 transition p-1 rounded-md hover:bg-rose-50 bg-transparent border-none cursor-pointer"
                                      title="Usuń to przypisanie zajęć"
                                    >
                                      <Trash2 size={12.5} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </div>

                                {/* Nauczyciele na lekcji */}
                                <div className="space-y-1.5 mt-2 font-semibold text-slate-600 text-[10.5px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 text-[10px] select-none font-sans">Prowadzący:</span>
                                    {mainTeacher ? (
                                      <span className="text-slate-800 font-extrabold">{mainTeacher.first} {mainTeacher.last} (<strong className="font-mono">{mainTeacher.abbr}</strong>)</span>
                                    ) : (
                                      <span className="text-red-500 italic font-semibold">Brak przydziału</span>
                                    )}
                                  </div>

                                  {supportTeacher ? (
                                    <div className="flex items-center gap-1.5 p-1 px-1.5 bg-indigo-50/70 border border-indigo-100 rounded-lg mt-1 font-sans">
                                      <span className="text-indigo-805 text-[8px] font-black uppercase tracking-wider bg-indigo-100 px-1 py-0.5 rounded shrink-0 leading-none">Wspomaganie lekcyjne</span>
                                      <span className="text-indigo-950 font-bold truncate leading-none">
                                        {supportTeacher.first} {supportTeacher.last} ({supportTeacher.abbr})
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-slate-400 italic select-none font-sans mt-0.5">Brak dodatkowego wspomagania na tym przedmiocie.</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 select-none bg-white border border-slate-200 rounded-2xl border-dashed min-h-[450px]">
                  <span className="text-4xl animate-bounce">🎓</span>
                  <span className="text-sm font-semibold mt-3 text-slate-700 font-sans">Wybierz ucznia z lewej listy</span>
                  <p className="text-[11px] text-slate-405 max-w-sm mt-1 leading-relaxed font-semibold">
                    Zdefiniujesz tutaj klasę macierzystą ucznia, jego formę wsparcia (NI / Rewalidacja / Wspomaganie), indywidualne przedmioty z ich kadrą, wymiarem godzin oraz wieloma nauczycielami wspomagającymi na lekcjach klasowych.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* ── SKRYTKA LEKCJI DO UMIESZCZENIA (PO_PRAWEJ) ── */}
      {activeTab === 'plan' && (viewMode === 'all' || currentClass) && (
        <aside className="w-full md:w-64 border-l border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 select-none">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">🗂️ Lekcje do umieszczenia</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Przeciągnij przedmiot na siatkę lub użyj ułatwienia dotykowego:</span>
            </div>

            {viewMode === 'all' && (
              <div className="bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-150 space-y-2">
                <div>
                  <label className="block text-[9px] font-bold text-indigo-850 uppercase tracking-wider mb-1">Klasa (filtr przydziałów):</label>
                  <select
                    className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-xs font-semibold outline-none text-slate-800"
                    value={allViewSelectedClassId || 'all'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllViewSelectedClassId(val === 'all' ? null : val);
                    }}
                  >
                    <option value="all">🌐 Wszystkie klasy ({pl.assignments.length})</option>
                    {pl.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.group && c.group !== 'cała klasa' ? `(${c.group})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[9.5px] text-indigo-900 leading-normal">
                  💡 Kliknięcie komórki lub klasy w tabeli automatycznie filtruje przydziały do tej klasy!
                </div>
              </div>
            )}

            <div className="p-2 bg-indigo-50 border border-indigo-150 rounded-lg text-[9.5px] text-indigo-900 font-medium leading-normal">
              📱 <strong>Ekran dotykowy?</strong> Kliknij lekcję poniżej, a potem tapnij pole w siatce (puste lub zajęte) aby ją wstawić/podmienić. Ten sam przedmiot możesz wstawić w wiele miejsc!
            </div>
            
            {selectedAssignmentId && (
              <div className="mt-2.5 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[9.5px] text-emerald-850 font-bold flex items-center justify-between">
                <span>🎯 Aktywny pędzel: {subjectsMap.get(pl.assignments.find(as => as.id === selectedAssignmentId)?.subjectId || '')?.name}</span>
                <button 
                  onClick={() => setSelectedAssignmentId(null)}
                  className="font-bold text-[10px] text-emerald-600 bg-white border border-emerald-300 rounded px-1.5 py-0.5 hover:bg-emerald-100 uppercase"
                >
                  Anuluj
                </button>
              </div>
            )}
          </div>

          <div className="p-3 space-y-2">
            {/* STREFA USUWANIA Z PLANU (DND) */}
            <div 
              data-cell-type="delete-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedLessonKey) {
                  handleRemoveLesson(draggedLessonKey);
                  setDraggedLessonKey(null);
                }
                setDraggedAssignId(null);
              }}
              className="p-4 border-2 border-dashed border-red-300 rounded-xl bg-red-50/50 hover:bg-red-50 hover:border-red-400 transition-all flex flex-col items-center justify-center text-center text-red-700 min-h-[90px] cursor-default gap-1.5 focus-within:ring-2 focus-within:ring-red-400 mb-4"
            >
              <Trash2 className="text-red-500 pointer-events-none" size={24} />
              <div className="pointer-events-none">
                <span className="text-xs font-bold block">Usuń z planu</span>
                <span className="text-[10px] text-red-500 font-semibold leading-tight block mt-0.5">Przeciągnij tutaj kafelek lekcji z siatki, aby go usunąć</span>
              </div>
            </div>

            {(viewMode === 'all' 
              ? (allViewSelectedClassId 
                  ? pl.assignments.filter(a => a.classId === allViewSelectedClassId || (a.linkedClassIds && a.linkedClassIds.includes(allViewSelectedClassId)))
                  : pl.assignments)
              : classAssignments
            ).map(a => {
              const s = subjectsMap.get(a.subjectId);
              const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
              const targetClass = classesMap.get(a.classId);
              const placed = placedHours[a.id] || 0;
              const limitAchieved = placed >= a.hoursPerWeek;
              const isSelected = selectedAssignmentId === a.id;

              return (
                <div 
                  key={a.id}
                  draggable={!isTouchDevice}
                  onDragStart={(e) => {
                    if (isTouchDevice) {
                      e.preventDefault();
                      return;
                    }
                    handleDragStart(a.id);
                  }}
                  onTouchStart={(e) => handleTouchStart(e, a.id)}
                  onTouchMove={(e) => handleTouchMove(e, a.id)}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => {
                    setSelectedAssignmentId(isSelected ? null : a.id);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none group relative overflow-hidden touch-none ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50 shadow'
                      : limitAchieved 
                      ? 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300' 
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow shadow-sm'
                  }`}
                  style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    KhtmlUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    userSelect: 'none',
                    WebkitUserDrag: 'none'
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl uppercase tracking-widest leading-none">
                      Pędzel
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-xs truncate" style={{ color: s?.color }}>{s?.name}</span>
                      {viewMode === 'all' && targetClass && (
                        <span className="text-[9px] text-slate-400 font-extrabold mt-0.5">Klasa: {targetClass.name} {a.groupId ? `(gr)` : ''}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : limitAchieved 
                          ? 'bg-slate-200 text-slate-600' 
                          : 'bg-blue-50 text-blue-700'
                    }`}>
                      {placed} / {a.hoursPerWeek}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium truncate flex justify-between items-center flex-wrap gap-1">
                    <span>👤 {t ? `${t.first} ${t.last} (${t.abbr})` : 'Nieprzypisany'}</span>
                    {a.preferredBlockSize !== undefined && a.preferredBlockSize > 1 && (
                      <span className="text-[8px] tracking-wider text-purple-700 bg-purple-50 font-black px-1.5 py-0.2 rounded border border-purple-100 uppercase">
                        🧱 blok {a.preferredBlockSize}h
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {(viewMode === 'all' 
              ? (allViewSelectedClassId 
                  ? pl.assignments.filter(a => a.classId === allViewSelectedClassId || (a.linkedClassIds && a.linkedClassIds.includes(allViewSelectedClassId)))
                  : pl.assignments)
              : classAssignments
            ).length === 0 && (
              <div className="text-center p-6 text-slate-400 text-xs">Brak zdefiniowanych przydziałów. Dodaj je w zakładce „📋 Przypisania Godzin".</div>
            )}
          </div>
        </aside>
      )}

      {/* Element pływający (podążający za palcem) przy przeciąganiu dotykowym */}
      <div 
        ref={touchDragRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          display: 'none',
          transform: 'translate3d(0px, 0px, 0)'
        }}
        className="bg-white/95 border border-indigo-450 p-2.5 rounded-xl shadow-xl w-40 flex flex-col justify-between font-sans leading-tight border-l-4"
      >
        <span data-role="subject-name" className="text-xs font-bold truncate">
          Przedmiot
        </span>
        <span data-role="teacher-name" className="text-[10px] text-slate-500 mt-1 truncate">
          👤 Nieprzypisany
        </span>
      </div>
      {showGenerator && (
        <PlanGenerator 
          appState={appState} 
          onChangeAppState={onChangeAppState} 
          onClose={() => setShowGenerator(false)} 
        />
      )}
    </div>
  );
}

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#ea580c', '#059669', '#db2777', '#65a30d',
];
