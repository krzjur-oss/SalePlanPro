import React, { useState, useMemo, useRef } from 'react';
import { 
  AppState, Class, Teacher, Subject, ClassRoom, SchoolGroup, Assignment, Lesson, SpecialStudent, SpecialAssignment 
} from '../types';
import { esc, hexRgba, uid, subjectAbbr, genAbbr } from '../utils';
import { 
  User, BookOpen, Layers, MapPin, Plus, Trash2, Edit3, Check, RefreshCw, X, Calendar, Filter, Users, Settings, Info, Sparkles, CheckCircle, Award, Zap, RotateCcw, Ban,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronLeft, ChevronRight, GripVertical, Search
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

export const isSportsFacility = (room: ClassRoom | undefined | null): boolean => {
  if (!room) return false;
  if (room.type === 'sport') return true;
  const name = (room.name || '').toLowerCase().trim();
  const desc = (room.desc || '').toLowerCase().trim();
  const keywords = ['basen', 'hala', 'wf', 'gimn', 'sport', 'boisko', 'orlik', 'stadion', 'fitness', 'siłownia', 'silownia'];
  if (keywords.some(kw => name.includes(kw) || desc.includes(kw))) return true;
  if (name === 'sg' || name.startsWith('sg') || name.startsWith('sg_') || name.startsWith('sg-')) return true;
  return false;
};

interface PlanKlasProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onTransfer: () => void;
  presentationMode?: boolean;
  initialTab?: 'plan' | 'assign' | 'special' | 'teachers';
  initialStudentId?: string | null;
}

export default function PlanKlas({ 
  appState, 
  onChangeAppState, 
  onTransfer, 
  presentationMode = false,
  initialTab = 'plan',
  initialStudentId = null
}: PlanKlasProps) {
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
  const [activeTab, setActiveTab] = useState<'plan' | 'assign' | 'special' | 'teachers'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  React.useEffect(() => {
    if (presentationMode && activeTab !== 'plan') {
      setActiveTab('plan');
    }
  }, [presentationMode, activeTab]);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [speStudentSearch, setSpeStudentSearch] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [allViewSelectedClassId, setAllViewSelectedClassId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [draggedAssignId, setDraggedAssignId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const touchDragRef = useRef<HTMLDivElement | null>(null);
  const touchStartPosRef = useRef<{ x: number, y: number } | null>(null);
  const touchDraggedAssignIdRef = useRef<string | null>(null);
  const touchIsHandleRef = useRef<boolean>(false);
  const touchDragActiveRef = useRef<boolean>(false);
  const touchScrollDetectedRef = useRef<boolean>(false);
  const lastScrollTimeRef = useRef<number>(0);
  const [draggedLessonKey, setDraggedLessonKey] = useState<string | null>(null);
  const touchDraggedLessonKeyRef = useRef<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [hideCompletedAssignments, setHideCompletedAssignments] = useState<boolean>(false);

  // Form states for modal / quick inline adding
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState('');
  const [newTeacherFirst, setNewTeacherFirst] = useState('');
  const [newTeacherLast, setNewTeacherLast] = useState('');
  const [newTeacherAbbr, setNewTeacherAbbr] = useState('');
  const [isTeacherAbbrManual, setIsTeacherAbbrManual] = useState(false);
  const [newTeacherMaxHours, setNewTeacherMaxHours] = useState<number | ''>(18);
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
  const [assignLinkedClasses, setAssignLinkedClasses] = useState<string[]>([]);
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);

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
  const [specLastName, setSpecLastName] = useState<string>('');
  const [specType, setSpecType] = useState<'ni' | 'rewa' | 'wsp'>('wsp');
  const [specClassId, setSpecClassId] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(initialStudentId || null);
  const [speSubTab, setSpeSubTab] = useState<'schedule' | 'profile'>('schedule');

  // SPE Slot Configuration Modal State
  const [editingSpeSlot, setEditingSpeSlot] = useState<{
    dayIdx: number;
    hourIdx: number;
    mode: 'class_regular' | 'class_support' | 'individual' | 'exempt';
    supportTeacherId: string;
    specialAssignmentId: string;
    customSubjectId: string;
    customTeacherId: string;
    customRoomId: string;
    customType: 'ni' | 'rewa' | 'wsp' | 'korekta';
    exemptReason: string;
  } | null>(null);

  React.useEffect(() => {
    if (initialStudentId) {
      setActiveStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  React.useEffect(() => {
    if (!activeStudentId && pl.specialStudents && pl.specialStudents.length > 0) {
      setActiveStudentId(pl.specialStudents[0].id);
    }
  }, [activeStudentId, pl.specialStudents]);
  
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
  const groupsMap = useMemo(() => new Map((pl.schoolGroups || []).map(g => [g.id, g])), [pl.schoolGroups]);

  // Count placed hours per assignment (unique time slots day|hour per assignment so multi-class lessons count as 1h)
  const placedHours = useMemo(() => {
    const counts: { [asgnId: string]: number } = {};
    const seenSlots = new Set<string>();
    Object.entries(pl.lessons).forEach(([key, l]) => {
      const parts = key.split('|');
      if (parts.length >= 3) {
        const slotKey = `${l.assignmentId}|${parts[1]}|${parts[2]}`;
        if (!seenSlots.has(slotKey)) {
          seenSlots.add(slotKey);
          counts[l.assignmentId] = (counts[l.assignmentId] || 0) + 1;
        }
      }
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
    const classAsgs = pl.assignments.filter(a => a.classId === classId || (a.linkedClassIds && a.linkedClassIds.includes(classId)));
    if (classAsgs.length === 0) return false;

    // Has any assignment that is not fully placed?
    const hasAnyUnplacedWeekly = classAsgs.some(a => {
      const placed = placedHours[a.id] || 0;
      return placed < a.hoursPerWeek;
    });

    // Check if there is an empty slot on this day (where no lessons at all are placed)
    const hours = pl.hours && pl.hours.length > 0 ? pl.hours : [];
    const hasEmptySlot = hours.some((_, hourIndex) => {
      const matchingKeys = Object.keys(pl.lessons).filter(k => {
        const p = k.split('|');
        return p[0] === classId && parseInt(p[1], 10) === dayIndex && parseInt(p[2], 10) === hourIndex;
      });
      return matchingKeys.length === 0;
    });

    // Check if there are scheduled blocks on this day with NO teacher or NO room
    const hasIncompleteScheduled = hours.some((_, hourIndex) => {
      const matching = Object.entries(pl.lessons).filter(([k]) => {
        const p = k.split('|');
        return p[0] === classId && parseInt(p[1], 10) === dayIndex && parseInt(p[2], 10) === hourIndex;
      });
      return matching.some(([, lesson]) => {
        const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
        if (!asg) return false;
        return !asg.teacherId || !asg.roomId;
      });
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

    // Check teacher conflicts (same teacher assigned to multiple classes/groups at the same time)
    teacherSlots.forEach((list, tKey) => {
      if (list.length > 1) {
        const [teacherId] = tKey.split('|');
        const teacher = teachersMap.get(teacherId);
        const tName = teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nauczyciel';

        list.forEach((item) => {
          // Find other lessons at this slot with different assignment
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
              const otherLesson = pl.lessons[oi.key];
              const otherAsg = otherLesson ? pl.assignments.find(a => a.id === otherLesson.assignmentId) : null;
              const otherGroup = otherAsg?.groupId ? pl.schoolGroups?.find(g => g.id === otherAsg.groupId) : null;
              const roleName = oi.role === 'wspomagający' ? 'wspomagający' : 'prowadzący';
              
              if (oi.classId === item.classId) {
                return `${roleName} w innej grupie (${otherGroup?.name || 'inna gr.'})`;
              }
              return `${roleName} w kl. ${otherClassName}${otherGroup ? ` (gr. ${otherGroup.name})` : ''}`;
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

    // Check room conflicts (same room assigned to multiple classes/groups at the same time)
    roomSlots.forEach((list, rKey) => {
      if (list.length > 1) {
        const [roomId] = rKey.split('|');
        const room = roomsMap.get(roomId);
        const rName = room?.name || 'Sala';
        const isSport = isSportsFacility(room);
        const hasSingleClassLimit = room?.singleClassLimit === true;

        list.forEach((item) => {
          const otherEntries = list.filter(x => {
            if (x.key === item.key) return false;
            const itemL = pl.lessons[item.key];
            const xL = pl.lessons[x.key];
            if (itemL && xL && itemL.assignmentId === xL.assignmentId) {
              return false; // same joint lesson assignment - NOT a room conflict!
            }
            // For sports facilities (gyms, sports halls, pools, etc.):
            if (isSport) {
              // If without strict single-class limit: multiple classes and multiple groups are allowed without conflict!
              if (!hasSingleClassLimit) {
                return false;
              }
              // If strict single-class limit is set: multiple groups of the SAME class are still allowed!
              if (x.classId === item.classId) {
                return false;
              }
            }
            return true;
          });

          if (otherEntries.length > 0) {
            const conflictLabels = otherEntries.map(oi => {
              const otherClass = classesMap.get(oi.classId);
              const otherLesson = pl.lessons[oi.key];
              const otherAsg = otherLesson ? pl.assignments.find(a => a.id === otherLesson.assignmentId) : null;
              const otherGroup = otherAsg?.groupId ? pl.schoolGroups?.find(g => g.id === otherAsg.groupId) : null;
              if (oi.classId === item.classId) {
                return `inna grupa tej klasy (${otherGroup?.name || 'inna gr.'})`;
              }
              return `kl. ${otherClass?.name || 'Inna'}${otherGroup ? ` (gr. ${otherGroup.name})` : ''}`;
            });
            const uniqueConflictLabels = Array.from(new Set(conflictLabels));
            const desc = isSport && hasSingleClassLimit
              ? `Limit sali sportowej: Obiekt ${rName} ma limit 1 klasy, a przypisano także: ${uniqueConflictLabels.join(', ')}`
              : `Konflikt Sali: Sala ${rName} jest zajęta w tym samym czasie przez: ${uniqueConflictLabels.join(', ')}`;
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
  }, [pl.lessons, pl.assignments, pl.schoolGroups, teachersMap, roomsMap, classesMap]);

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
      assignments: pl.assignments
        .filter(a => a.classId !== id)
        .map(a => ({
          ...a,
          linkedClassIds: a.linkedClassIds ? a.linkedClassIds.filter(lid => lid !== id) : undefined
        })),
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
    setNewTeacherMaxHours(t.maxHours ?? 18);
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
            maxHours: newTeacherMaxHours === '' ? 18 : Number(newTeacherMaxHours),
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
        maxHours: newTeacherMaxHours === '' ? 18 : Number(newTeacherMaxHours),
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

    if (editingAssignId) {
      const updatedAsg: Assignment = {
        id: editingAssignId,
        classId: assignClass,
        subjectId: assignSubject,
        teacherId: assignTeacher || null,
        roomId: assignRoom || null,
        hoursPerWeek: Number(assignHours),
        groupId: assignGroup || null,
        preferredBlockSize: assignPreferredBlockSize,
        linkedClassIds: assignLinkedClasses.length > 0 ? assignLinkedClasses : undefined
      };

      const updatedPL = {
        ...pl,
        assignments: pl.assignments.map(a => a.id === editingAssignId ? updatedAsg : a)
      };

      onChangeAppState({
        ...appState,
        planLekcji: updatedPL
      });

      setEditingAssignId(null);
      setAssignSubject('');
      setAssignTeacher('');
      setAssignRoom('');
      setAssignHours(2);
      setAssignPreferredBlockSize(1);
      setAssignGroup('');
      setAssignLinkedClasses([]);
      return;
    }

    const newAsg: Assignment = {
      id: uid(),
      classId: assignClass,
      subjectId: assignSubject,
      teacherId: assignTeacher || null,
      roomId: assignRoom || null,
      hoursPerWeek: Number(assignHours),
      groupId: assignGroup || null,
      preferredBlockSize: assignPreferredBlockSize,
      linkedClassIds: assignLinkedClasses.length > 0 ? assignLinkedClasses : undefined
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
    setAssignLinkedClasses([]);
  };

  const handleStartEditAssignment = (asg: Assignment) => {
    setEditingAssignId(asg.id);
    setAssignClass(asg.classId);
    setAssignSubject(asg.subjectId);
    setAssignTeacher(asg.teacherId || '');
    setAssignRoom(asg.roomId || '');
    setAssignHours(asg.hoursPerWeek);
    setAssignPreferredBlockSize(asg.preferredBlockSize ?? 1);
    setAssignGroup(asg.groupId || '');
    setAssignLinkedClasses(asg.linkedClassIds || []);
  };

  const handleCancelEditAssignment = () => {
    setEditingAssignId(null);
    setAssignSubject('');
    setAssignTeacher('');
    setAssignRoom('');
    setAssignHours(2);
    setAssignPreferredBlockSize(1);
    setAssignGroup('');
    setAssignLinkedClasses([]);
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

  const getGroupBadgeColor = (groupName?: string) => {
    const g = (groupName || '').toLowerCase();
    if (g.includes('1') || g.includes('a') || g.includes('chł')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (g.includes('2') || g.includes('b') || g.includes('dz')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (g.includes('3') || g.includes('c')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  const getSlotLessons = (classId: string, dayIndex: number, hourIndex: number) => {
    const matching = Object.entries(pl.lessons).filter(([k]) => {
      const p = k.split('|');
      return p[0] === classId && parseInt(p[1], 10) === dayIndex && parseInt(p[2], 10) === hourIndex;
    });

    return matching.map(([key, lesson]) => {
      const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
      const subj = asg ? subjectsMap.get(asg.subjectId) : null;
      const teacher = asg && asg.teacherId ? teachersMap.get(asg.teacherId) : null;
      const room = asg && asg.roomId ? roomsMap.get(asg.roomId) : null;
      const group = asg && asg.groupId ? (pl.schoolGroups?.find(g => g.id === asg.groupId) || null) : null;
      const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;
      const confReasons = conflicts.get(key) || [];
      const isConf = confReasons.length > 0;

      return {
        key,
        lesson,
        asg,
        subj,
        teacher,
        room,
        group,
        suppTeacher,
        confReasons,
        isConf
      };
    }).filter((item): item is typeof item & { asg: Assignment } => !!item.asg);
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
      const isSport = isSportsFacility(targetRoom);
      const hasSingleClassLimit = targetRoom?.singleClassLimit === true;

      const conflictingLessons: { classId: string; assignmentId: string }[] = [];
      Object.entries(pl.lessons).forEach(([lessonKey, lessonVal]) => {
        const parts = lessonKey.split('|');
        if (parts.length >= 3) {
          const cId = parts[0];
          const d = parseInt(parts[1], 10);
          const h = parseInt(parts[2], 10);

          if (d === day && h === hour) {
            // Check if it has a different assignment ID
            if (lessonVal.assignmentId !== assignId) {
              const otherAsg = pl.assignments.find(a => a.id === lessonVal.assignmentId);
              if (otherAsg && otherAsg.roomId === asg.roomId) {
                // If it's a sports facility:
                if (isSport) {
                  // If singleClassLimit is true, only conflicting if from a different class
                  if (hasSingleClassLimit && !allInvolved.includes(cId)) {
                    conflictingLessons.push({ classId: cId, assignmentId: lessonVal.assignmentId });
                  }
                  // If !hasSingleClassLimit (default for sports facilities), multiple classes and groups are allowed without conflict!
                } else {
                  conflictingLessons.push({ classId: cId, assignmentId: lessonVal.assignmentId });
                }
              }
            }
          }
        }
      });

      if (conflictingLessons.length > 0) {
        const otherDescriptions = conflictingLessons.map(cl => {
          const c = pl.classes.find(cls => cls.id === cl.classId);
          const oAsg = pl.assignments.find(a => a.id === cl.assignmentId);
          const oGroup = oAsg?.groupId ? pl.schoolGroups?.find(g => g.id === oAsg.groupId) : null;
          if (allInvolved.includes(cl.classId)) {
            return `inna grupa tej klasy (${oGroup?.name || 'inna gr.'})`;
          }
          return `kl. ${c ? c.name : 'inna klasa'}${oGroup ? ` (gr. ${oGroup.name})` : ''}`;
        });
        const uniqueOtherDesc = Array.from(new Set(otherDescriptions));
        const currentClassName = allInvolved.map(clsId => pl.classes.find(cls => cls.id === clsId)?.name || 'bieżąca klasa').join(' + ');
        notify(
          isSport && hasSingleClassLimit
            ? `⚠️ Limit obiektu sportowego: Obiekt ${roomName} ma ustawiony limit 1 klasy, a w tym samym czasie (${DAYS[day]}, lekcja ${hour}) jest zajęty przez: ${uniqueOtherDesc.join(', ')}!`
            : `⚠️ Konflikt Sali: Próba przypisania sali ${roomName} dla ${currentClassName}, która w tym samym czasie (${DAYS[day]}, lekcja ${hour}) jest zajęta przez: ${uniqueOtherDesc.join(', ')}!`,
          'err'
        );
      }
    }

    allInvolved.forEach(clsId => {
      // Find all existing lesson keys for this slot
      const existingSlotKeys = Object.keys(updatedLessons).filter(k => {
        const p = k.split('|');
        return p[0] === clsId && parseInt(p[1], 10) === day && parseInt(p[2], 10) === hour;
      });

      if (asg && asg.groupId) {
        // Group lesson: remove whole-class lesson or lesson of the exact same group
        existingSlotKeys.forEach(exKey => {
          const exLesson = updatedLessons[exKey];
          const exAsg = exLesson ? pl.assignments.find(a => a.id === exLesson.assignmentId) : null;
          if (!exAsg || !exAsg.groupId || exAsg.groupId === asg.groupId) {
            delete updatedLessons[exKey];
          }
        });

        const targetKey = `${clsId}|${day}|${hour}|${asg.groupId}`;
        updatedLessons[targetKey] = {
          assignmentId: assignId,
          locked: false,
          supportTeacherId: defaultSupportTeacherId
        };
      } else {
        // Whole class lesson: replace all lessons in this slot
        existingSlotKeys.forEach(exKey => {
          delete updatedLessons[exKey];
        });

        const targetKey = `${clsId}|${day}|${hour}`;
        updatedLessons[targetKey] = {
          assignmentId: assignId,
          locked: false,
          supportTeacherId: defaultSupportTeacherId
        };
      }
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
      if (draggedLessonKey) {
        handleRemoveLesson(draggedLessonKey);
        setDraggedLessonKey(null);
      }
      placeAssignmentOnCell(draggedAssignId, day, hour, targetClassId);
      setDraggedAssignId(null);
    }
  };

  // Touch Drag-And-Drop Handlers
  const handleTouchStart = (e: React.TouchEvent, assignId: string, lessonKey?: string, isHandle?: boolean) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchDraggedAssignIdRef.current = assignId;
    touchDraggedLessonKeyRef.current = lessonKey || null;
    touchIsHandleRef.current = !!isHandle;
    touchDragActiveRef.current = false;
    touchScrollDetectedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent, assignId: string) => {
    if (!touchStartPosRef.current) return;
    if (touchScrollDetectedRef.current) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartPosRef.current.x;
    const diffY = touch.clientY - touchStartPosRef.current.y;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    const isHandle = touchIsHandleRef.current;
    const isFromGrid = !!touchDraggedLessonKeyRef.current;

    // If gesture started on a card body in sidebar (not the handle, not the grid):
    if (!isHandle && !isFromGrid) {
      if (!touchDragActiveRef.current) {
        // Natural vertical scroll detected: cancel dragging immediately so native scrolling proceeds freely
        if (absY > 7 && absY > absX * 1.1) {
          touchScrollDetectedRef.current = true;
          touchDraggedAssignIdRef.current = null;
          lastScrollTimeRef.current = Date.now();
          return;
        }

        // Only start drag from sidebar card body if movement is clearly directed leftward toward the plan
        if (!(diffX < -16 && absX > absY * 1.2)) {
          return;
        }
      }
    }

    if (distance > 8 || touchDragActiveRef.current) {
      touchDragActiveRef.current = true;
      if (e.cancelable) {
        e.preventDefault();
      }

      // Update coordinates & contents of the floating element directly via DOM
      if (touchDragRef.current) {
        if (touchDragRef.current.style.display === 'none' || touchDragRef.current.style.display === '') {
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
        }

        // Apply 3D translation based on current touch position
        touchDragRef.current.style.transform = `translate3d(${touch.clientX - 70}px, ${touch.clientY - 35}px, 0)`;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const activeId = touchDraggedAssignIdRef.current;
    const wasDragActive = touchDragActiveRef.current;

    if (touchScrollDetectedRef.current) {
      lastScrollTimeRef.current = Date.now();
    }

    // Hide the floating element immediately before checking elementFromPoint
    if (touchDragRef.current) {
      touchDragRef.current.style.display = 'none';
    }

    if (activeId && wasDragActive && touchStartPosRef.current) {
      const touch = e.changedTouches[0] || (e.touches && e.touches[0]);
      if (touch) {
        const x = touch.clientX;
        const y = touch.clientY;

        const element = document.elementFromPoint(x, y);

        if (element) {
          const deleteZone = element.closest('[data-cell-type="delete-zone"]');
          if (deleteZone) {
            const activeKey = touchDraggedLessonKeyRef.current;
            if (activeKey) {
              handleRemoveLesson(activeKey);
            }
          } else {
            const cell = element.closest('[data-cell-type="plan-cell"]');
            if (cell) {
              const dayStr = cell.getAttribute('data-day');
              const hourStr = cell.getAttribute('data-hour');
              const targetClassId = cell.getAttribute('data-class-id') || undefined;
              if (dayStr !== null && hourStr !== null) {
                const day = parseInt(dayStr, 10);
                const hour = parseInt(hourStr, 10);
                const activeKey = touchDraggedLessonKeyRef.current;
                if (activeKey) {
                  handleRemoveLesson(activeKey);
                }
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
    touchIsHandleRef.current = false;
    touchDragActiveRef.current = false;
    touchScrollDetectedRef.current = false;
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
            const k = asg.groupId ? `${clsId}|${day}|${hour}|${asg.groupId}` : `${clsId}|${day}|${hour}`;
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

  const handleSetSlotSupportTeacher = (dayIdx: number, hourIdx: number, teacherId: string | null) => {
    if (!currentStudent || !currentStudent.classId) return;
    const classKey = `${currentStudent.classId}|${dayIdx}|${hourIdx}`;
    const existingLesson = pl.lessons[classKey];

    let updatedLessons = { ...pl.lessons };
    if (existingLesson) {
      updatedLessons[classKey] = {
        ...existingLesson,
        supportTeacherId: teacherId || undefined
      };
    }

    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(
      s => !(s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx)
    );

    const specialKey = `${currentStudent.id}|${dayIdx}|${hourIdx}`;
    let updatedSpecialLessons = { ...pl.specialLessons };
    delete updatedSpecialLessons[specialKey];
    let updatedSpecialAbsences = { ...(pl.specialAbsences || {}) };
    delete updatedSpecialAbsences[specialKey];

    if (teacherId) {
      newSlotAssignments.push({
        id: `${currentStudent.id}|${dayIdx}|${hourIdx}|wsp`,
        studentId: currentStudent.id,
        dayIdx,
        hourIdx,
        mode: 'class_support',
        type: 'wsp',
        withClass: true,
        supportTeacherId: teacherId,
        teacherId: teacherId
      });
      notify(`Przypisano wsparcie (${teachersMap.get(teacherId)?.abbr || 'Wsparcie'})`);
    } else {
      newSlotAssignments.push({
        id: `${currentStudent.id}|${dayIdx}|${hourIdx}|reg`,
        studentId: currentStudent.id,
        dayIdx,
        hourIdx,
        mode: 'class_regular',
        withClass: true
      });
      notify(`Usunięto wsparcie (uczeń realizuje lekcję z klasą).`);
    }

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons,
        specialLessons: updatedSpecialLessons,
        specialAbsences: updatedSpecialAbsences,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });
  };

  const handleAssignSpecialLessonSlot = (dayIdx: number, hourIdx: number, specialAssignmentId: string | null) => {
    if (!currentStudent) return;
    const lessonKey = `${currentStudent.id}|${dayIdx}|${hourIdx}`;

    let updatedSpecialLessons = { ...pl.specialLessons };
    let updatedSpecialAbsences = { ...(pl.specialAbsences || {}) };
    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(
      s => !(s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx)
    );

    if (specialAssignmentId) {
      updatedSpecialLessons[lessonKey] = { assignmentId: specialAssignmentId };
      updatedSpecialAbsences[lessonKey] = true;
      const spAsg = pl.specialAssignments.find(a => a.id === specialAssignmentId);
      newSlotAssignments.push({
        id: `${currentStudent.id}|${dayIdx}|${hourIdx}|${spAsg?.supportType || 'ni'}`,
        studentId: currentStudent.id,
        dayIdx,
        hourIdx,
        mode: 'individual',
        type: spAsg?.supportType || 'ni',
        withClass: false,
        specialAssignmentId,
        teacherId: spAsg?.teacherId,
        supportTeacherId: spAsg?.supportTeacherId,
        subjectId: spAsg?.subjectId,
        roomId: spAsg?.roomId
      });
      notify(`Zastąpiono zajęciami 1:1 (${subjectsMap.get(spAsg?.subjectId || '')?.name || '1:1'}).`);
    } else {
      delete updatedSpecialLessons[lessonKey];
      delete updatedSpecialAbsences[lessonKey];
      notify(`Usunięto zajęcia 1:1.`);
    }

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        specialLessons: updatedSpecialLessons,
        specialAbsences: updatedSpecialAbsences,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });
  };

  const handleOpenSpeSlotModal = (dayIdx: number, hourIdx: number) => {
    if (!currentStudent) return;
    const classKey = currentStudent.classId ? `${currentStudent.classId}|${dayIdx}|${hourIdx}` : '';
    const classLesson = classKey ? pl.lessons[classKey] : null;
    const speSlot = (pl.spePlan?.slotAssignments || []).find(
      s => s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx
    );
    const specialKey = `${currentStudent.id}|${dayIdx}|${hourIdx}`;
    const specialLesson = pl.specialLessons ? pl.specialLessons[specialKey] : null;
    const isAbsent = Boolean(pl.specialAbsences?.[specialKey]);

    let initialMode: 'class_regular' | 'class_support' | 'individual' | 'exempt' = 'class_regular';
    let initialSupportTeacherId = currentStudent.supportTeacherIds?.[0] || '';
    let initialSpecialAsgId = '';
    let initialExemptReason = 'Zwolnienie z realizacji przedmiotu';

    if (speSlot) {
      if (speSlot.mode) {
        initialMode = speSlot.mode;
      } else if (!speSlot.withClass) {
        initialMode = 'individual';
      } else if (speSlot.supportTeacherId) {
        initialMode = 'class_support';
      }
      if (speSlot.supportTeacherId) initialSupportTeacherId = speSlot.supportTeacherId;
      if (speSlot.specialAssignmentId) initialSpecialAsgId = speSlot.specialAssignmentId;
      if (speSlot.exemptReason) initialExemptReason = speSlot.exemptReason;
    } else if (specialLesson) {
      initialMode = 'individual';
      initialSpecialAsgId = specialLesson.assignmentId;
    } else if (isAbsent) {
      initialMode = 'exempt';
    } else if (classLesson?.supportTeacherId) {
      initialMode = 'class_support';
      initialSupportTeacherId = classLesson.supportTeacherId;
    }

    // Pre-select 1:1 assignment if available and none selected
    const available1to1 = pl.specialAssignments.filter(a => a.studentId === currentStudent.id && !a.withClass);
    if (!initialSpecialAsgId && available1to1.length > 0) {
      initialSpecialAsgId = available1to1[0].id;
    }

    setEditingSpeSlot({
      dayIdx,
      hourIdx,
      mode: initialMode,
      supportTeacherId: initialSupportTeacherId,
      specialAssignmentId: initialSpecialAsgId,
      customSubjectId: pl.subjects[0]?.id || '',
      customTeacherId: currentStudent.supportTeacherIds?.[0] || pl.teachers[0]?.id || '',
      customRoomId: pl.rooms[0]?.id || '',
      customType: (currentStudent.type as 'ni' | 'wsp' | 'rewa' | 'korekta') || 'ni',
      exemptReason: initialExemptReason
    });
  };

  const handleSaveSpeSlot = (slotConfig: NonNullable<typeof editingSpeSlot>) => {
    if (!currentStudent) return;
    const { dayIdx, hourIdx, mode, supportTeacherId, specialAssignmentId, customSubjectId, customTeacherId, customRoomId, customType, exemptReason } = slotConfig;
    const classKey = currentStudent.classId ? `${currentStudent.classId}|${dayIdx}|${hourIdx}` : '';
    const existingClassLesson = classKey ? pl.lessons[classKey] : null;
    const specialKey = `${currentStudent.id}|${dayIdx}|${hourIdx}`;

    let updatedLessons = { ...pl.lessons };
    let updatedSpecialLessons = { ...pl.specialLessons };
    let updatedSpecialAssignments = [...pl.specialAssignments];
    let updatedSpecialAbsences = { ...(pl.specialAbsences || {}) };
    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(
      s => !(s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx)
    );

    if (mode === 'class_support') {
      if (existingClassLesson) {
        updatedLessons[classKey] = {
          ...existingClassLesson,
          supportTeacherId: supportTeacherId || undefined
        };
      }
      delete updatedSpecialLessons[specialKey];
      delete updatedSpecialAbsences[specialKey];

      newSlotAssignments.push({
        id: `${currentStudent.id}|${dayIdx}|${hourIdx}|wsp`,
        studentId: currentStudent.id,
        dayIdx,
        hourIdx,
        mode: 'class_support',
        type: 'wsp',
        withClass: true,
        supportTeacherId: supportTeacherId || undefined,
        teacherId: supportTeacherId || undefined
      });
      notify(`Przypisano wsparcie (${teachersMap.get(supportTeacherId)?.abbr || 'Wsparcie'})`);
    } else if (mode === 'class_regular') {
      if (existingClassLesson && existingClassLesson.supportTeacherId) {
        updatedLessons[classKey] = {
          ...existingClassLesson,
          supportTeacherId: undefined
        };
      }
      delete updatedSpecialLessons[specialKey];
      delete updatedSpecialAbsences[specialKey];

      newSlotAssignments.push({
        id: `${currentStudent.id}|${dayIdx}|${hourIdx}|reg`,
        studentId: currentStudent.id,
        dayIdx,
        hourIdx,
        mode: 'class_regular',
        withClass: true
      });
      notify(`Ustawiono uczestnictwo w lekcji z klasą.`);
    } else if (mode === 'individual') {
      let targetAsgId = specialAssignmentId;
      let targetTeacherId = '';
      let targetSubjectId = '';
      let targetRoomId: string | undefined = undefined;
      let targetType: 'ni' | 'wsp' | 'rewa' | 'korekta' = (customType as 'ni' | 'wsp' | 'rewa' | 'korekta') || 'ni';

      if (!targetAsgId && customSubjectId && customTeacherId) {
        const newAsg: SpecialAssignment = {
          id: uid(),
          studentId: currentStudent.id,
          subjectId: customSubjectId,
          teacherId: customTeacherId,
          roomId: customRoomId || undefined,
          hoursPerWeek: 1,
          withClass: false,
          supportType: (customType as 'ni' | 'wsp' | 'rewa' | 'korekta') || 'ni'
        };
        updatedSpecialAssignments.push(newAsg);
        targetAsgId = newAsg.id;
        targetTeacherId = customTeacherId;
        targetSubjectId = customSubjectId;
        targetRoomId = customRoomId || undefined;
      } else {
        const existingAsg = updatedSpecialAssignments.find(a => a.id === targetAsgId);
        if (existingAsg) {
          targetTeacherId = existingAsg.teacherId;
          targetSubjectId = existingAsg.subjectId;
          targetRoomId = existingAsg.roomId;
          targetType = (existingAsg.supportType as 'ni' | 'wsp' | 'rewa' | 'korekta') || 'ni';
        }
      }

      if (targetAsgId) {
        updatedSpecialLessons[specialKey] = { assignmentId: targetAsgId };
        updatedSpecialAbsences[specialKey] = true;

        newSlotAssignments.push({
          id: `${currentStudent.id}|${dayIdx}|${hourIdx}|${targetType}`,
          studentId: currentStudent.id,
          dayIdx,
          hourIdx,
          mode: 'individual',
          type: targetType,
          withClass: false,
          specialAssignmentId: targetAsgId,
          teacherId: targetTeacherId,
          subjectId: targetSubjectId,
          roomId: targetRoomId
        });
        notify(`Zastąpiono zajęciami 1:1 (${subjectsMap.get(targetSubjectId)?.name || '1:1'}).`);
      }
    } else if (mode === 'exempt') {
      delete updatedSpecialLessons[specialKey];
      updatedSpecialAbsences[specialKey] = true;

      newSlotAssignments.push({
        id: `${currentStudent.id}|${dayIdx}|${hourIdx}|exempt`,
        studentId: currentStudent.id,
        dayIdx,
        hourIdx,
        mode: 'exempt',
        withClass: false,
        exemptReason: exemptReason || 'Zwolnienie z lekcji'
      });
      notify(`Zarejestrowano zwolnienie ucznia z lekcji.`);
    }

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons,
        specialLessons: updatedSpecialLessons,
        specialAssignments: updatedSpecialAssignments,
        specialAbsences: updatedSpecialAbsences,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });

    setEditingSpeSlot(null);
  };

  const handleToggleExemptSlot = (dayIdx: number, hourIdx: number, defaultReason?: string) => {
    if (!currentStudent) return;
    const specialKey = `${currentStudent.id}|${dayIdx}|${hourIdx}`;
    const classKey = currentStudent.classId ? `${currentStudent.classId}|${dayIdx}|${hourIdx}` : '';
    
    // Check if currently exempt
    const isCurrentlyExempt = (pl.specialAbsences && pl.specialAbsences[specialKey]) ||
      (pl.spePlan?.slotAssignments?.some(s => s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx && s.mode === 'exempt'));

    if (isCurrentlyExempt) {
      // Revert/Restore to normal class lesson
      handleResetSpeSlot(dayIdx, hourIdx);
      return;
    }

    // Set to exempt (nie obowiązuje / zwolniony)
    let updatedSpecialAbsences = { ...(pl.specialAbsences || {}) };
    updatedSpecialAbsences[specialKey] = true;

    let updatedSpecialLessons = { ...pl.specialLessons };
    delete updatedSpecialLessons[specialKey];

    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(
      s => !(s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx)
    );

    const reason = defaultReason || 'Uczeń nie uczęszcza / zwolniony';
    newSlotAssignments.push({
      id: `${currentStudent.id}|${dayIdx}|${hourIdx}|exempt`,
      studentId: currentStudent.id,
      dayIdx,
      hourIdx,
      mode: 'exempt',
      type: 'zwolniony',
      withClass: false,
      exemptReason: reason
    });

    // Also remove supportTeacher if any on this class lesson
    let updatedLessons = { ...pl.lessons };
    if (classKey && updatedLessons[classKey]) {
      updatedLessons[classKey] = {
        ...updatedLessons[classKey],
        supportTeacherId: undefined
      };
    }

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons,
        specialLessons: updatedSpecialLessons,
        specialAbsences: updatedSpecialAbsences,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });

    notify(`Oznaczono: uczeń nie uczestniczy w tej lekcji (${reason}).`);
  };

  const handleResetSpeSlot = (dayIdx: number, hourIdx: number) => {
    if (!currentStudent) return;
    const classKey = currentStudent.classId ? `${currentStudent.classId}|${dayIdx}|${hourIdx}` : '';
    const specialKey = `${currentStudent.id}|${dayIdx}|${hourIdx}`;

    let updatedLessons = { ...pl.lessons };
    if (classKey && updatedLessons[classKey]) {
      updatedLessons[classKey] = {
        ...updatedLessons[classKey],
        supportTeacherId: undefined
      };
    }
    let updatedSpecialLessons = { ...pl.specialLessons };
    delete updatedSpecialLessons[specialKey];
    let updatedSpecialAbsences = { ...(pl.specialAbsences || {}) };
    delete updatedSpecialAbsences[specialKey];

    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(
      s => !(s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hourIdx)
    );

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons,
        specialLessons: updatedSpecialLessons,
        specialAbsences: updatedSpecialAbsences,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });
    notify(`Przywrócono domyślny status lekcji z klasą.`);
    setEditingSpeSlot(null);
  };

  const handleAutoAssignSupport = (teacherId?: string) => {
    if (!currentStudent || !currentStudent.classId) return;
    const targetTeacher = teacherId || currentStudent.supportTeacherIds?.[0] || pl.teachers[0]?.id;
    if (!targetTeacher) {
      notify('Wybierz lub dodaj nauczyciela do kadry ucznia.', 'err');
      return;
    }

    const quota = currentStudent.supportHours?.wsp || (currentStudent.type === 'wsp' ? 8 : 0);
    if (quota <= 0) {
      notify('Uczeń ma ustaloną pulę wsparcia: 0 godz. Zwiększ pulę w profilu ucznia.', 'err');
      return;
    }

    let assignedCount = 0;
    let updatedLessons = { ...pl.lessons };
    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(
      s => !(s.studentId === currentStudent.id && s.withClass)
    );

    const classSlots: Array<{ dayIdx: number; hIdx: number; subjName: string; priority: number }> = [];
    (pl.hours || []).forEach((_, hIdx) => {
      DAYS.forEach((_, dayIdx) => {
        const classKey = `${currentStudent.classId}|${dayIdx}|${hIdx}`;
        const lesson = pl.lessons[classKey];
        if (lesson) {
          const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
          const subj = asg ? subjectsMap.get(asg.subjectId) : null;
          const subjName = (subj?.name || '').toLowerCase();
          
          let prio = 5;
          if (subjName.includes('polski') || subjName.includes('matematyk')) prio = 1;
          else if (subjName.includes('angielski') || subjName.includes('obcy') || subjName.includes('niemiecki')) prio = 2;
          else if (subjName.includes('biolog') || subjName.includes('chem') || subjName.includes('fizyk') || subjName.includes('geograf')) prio = 3;
          else if (subjName.includes('histor') || subjName.includes('wos') || subjName.includes('przyrod')) prio = 4;

          classSlots.push({ dayIdx, hIdx, subjName, priority: prio });
        }
      });
    });

    classSlots.sort((a, b) => a.priority - b.priority || a.dayIdx - b.dayIdx || a.hIdx - b.hIdx);

    for (const slot of classSlots) {
      if (assignedCount >= quota) break;
      const classKey = `${currentStudent.classId}|${slot.dayIdx}|${slot.hIdx}`;
      const lesson = updatedLessons[classKey];
      if (lesson) {
        updatedLessons[classKey] = {
          ...lesson,
          supportTeacherId: targetTeacher
        };
        newSlotAssignments.push({
          id: `${currentStudent.id}|${slot.dayIdx}|${slot.hIdx}|wsp`,
          studentId: currentStudent.id,
          dayIdx: slot.dayIdx,
          hourIdx: slot.hIdx,
          mode: 'class_support',
          type: 'wsp',
          withClass: true,
          supportTeacherId: targetTeacher,
          teacherId: targetTeacher
        });
        assignedCount++;
      }
    }

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });

    notify(`Pomyślnie przydzielono ${assignedCount} godz. wsparcia dla ucznia (${teachersMap.get(targetTeacher)?.abbr || 'Wsparcie'}).`);
  };

  const handleClearAllStudentAssignments = () => {
    if (!currentStudent) return;
    if (!confirm(`Czy na pewno chcesz wyczyścić wszystkie przypisania wsparcia, zajęć 1:1 i zwolnień dla ucznia ${currentStudent.firstName} ${currentStudent.lastName}?`)) return;

    let updatedLessons = { ...pl.lessons };
    if (currentStudent.classId) {
      Object.keys(updatedLessons).forEach(k => {
        if (k.startsWith(`${currentStudent.classId}|`)) {
          updatedLessons[k] = { ...updatedLessons[k], supportTeacherId: undefined };
        }
      });
    }

    let updatedSpecialLessons = Object.fromEntries(
      Object.entries(pl.specialLessons || {}).filter(([k]) => !k.startsWith(`${currentStudent.id}|`))
    );

    let updatedSpecialAbsences = Object.fromEntries(
      Object.entries(pl.specialAbsences || {}).filter(([k]) => !k.startsWith(`${currentStudent.id}|`))
    );

    const currentSpePlan = pl.spePlan || { slotAssignments: [] };
    let newSlotAssignments = currentSpePlan.slotAssignments.filter(s => s.studentId !== currentStudent.id);

    onChangeAppState({
      ...appState,
      planLekcji: {
        ...pl,
        lessons: updatedLessons,
        specialLessons: updatedSpecialLessons,
        specialAbsences: updatedSpecialAbsences,
        spePlan: {
          ...currentSpePlan,
          slotAssignments: newSlotAssignments
        }
      }
    });

    notify(`Wyczyszczono rozkład wsparcia i przydziały dla ucznia.`);
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
        isLeftSidebarCollapsed ? (
          <div className="hidden md:flex flex-col items-center py-3 px-1 bg-white border-r border-slate-200 shrink-0 select-none shadow-xs w-11 transition-all">
            <button
              type="button"
              onClick={() => setIsLeftSidebarCollapsed(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition mb-3 cursor-pointer"
              title={activeTab === 'special' ? "Rozwiń listę uczniów specjalnych (SPE i NI)" : "Rozwiń listę klas"}
            >
              <PanelLeftOpen size={18} />
            </button>
            <div 
              onClick={() => setIsLeftSidebarCollapsed(false)}
              className="cursor-pointer [writing-mode:vertical-lr] rotate-180 text-[11px] font-extrabold text-slate-400 hover:text-blue-600 tracking-wider uppercase flex items-center gap-2 py-2"
              title={activeTab === 'special' ? "Rozwiń listę uczniów specjalnych (SPE i NI)" : "Rozwiń listę klas"}
            >
              {activeTab === 'special' ? (
                <span>🎓 Uczniowie SPE ({pl.specialStudents.length})</span>
              ) : (
                <span>🏫 Klasy ({filteredClasses.length})</span>
              )}
            </div>
            {activeTab === 'special' ? (
              currentStudent && (
                <div 
                  onClick={() => setIsLeftSidebarCollapsed(false)}
                  className="mt-auto mb-2 p-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black cursor-pointer text-center [writing-mode:vertical-lr] rotate-180 truncate max-h-32"
                  title={`Aktywny uczeń: ${currentStudent.lastName} ${currentStudent.firstName}. Kliknij aby rozwinąć.`}
                >
                  {currentStudent.lastName}
                </div>
              )
            ) : (
              currentClass && (
                <div 
                  onClick={() => setIsLeftSidebarCollapsed(false)}
                  className="mt-auto mb-2 p-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black cursor-pointer text-center"
                  title={`Aktywna klasa: ${currentClass.name}. Kliknij aby rozwinąć.`}
                >
                  {currentClass.name}
                </div>
              )
            )}
          </div>
        ) : (
          <aside className="w-full md:w-56 lg:w-60 xl:w-64 border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 select-none transition-all">
            {/* Nagłówek i przełącznik Klasy / Uczniowie SPE */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 pb-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {activeTab === 'special' ? (
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" /> Uczniowie SPE
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" /> Lista Klas
                    </span>
                  )}
                  <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-full border border-blue-200">
                    {activeTab === 'special' ? pl.specialStudents.length : filteredClasses.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLeftSidebarCollapsed(true)}
                  className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Zwiń lewy panel boczny"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>

              {/* Szybki przełącznik: Klasy vs Uczniowie SPE */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold select-none mb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('plan')}
                  className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab !== 'special' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🏫 Klasy</span>
                  <span className="text-[9px] opacity-75 font-mono">({pl.classes.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('special')}
                  className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'special' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🎓 Uczniowie SPE</span>
                  <span className="text-[9px] opacity-75 font-mono">({pl.specialStudents.length})</span>
                </button>
              </div>
            </div>

            {/* SEKCJA DLA ACTIVE TAB === 'special' (Uczniowie specjalni w lewym menu nawigacji) */}
            {activeTab === 'special' ? (
              <div className="p-3 sm:p-3.5 space-y-3 flex-1 overflow-y-auto">
                {/* Formularz dodawania nowego ucznia */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 shadow-3xs">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2 select-none">➕ Dodaj ucznia SPE</span>
                  <form onSubmit={handleAddSpecialStudent} className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <input 
                        type="text" 
                        placeholder="Imię" 
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                        value={specFirstName}
                        onChange={(e) => setSpecFirstName(e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Nazwisko *" 
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                        value={specLastName}
                        onChange={(e) => setSpecLastName(e.target.value)}
                      />
                    </div>
                    <select
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none font-semibold text-slate-700"
                      value={specType}
                      onChange={(e) => setSpecType(e.target.value as any)}
                    >
                      <option value="ni">Nauczanie Indywidualne (NI)</option>
                      <option value="rewa">Rewalidacja (Rewa)</option>
                      <option value="wsp">Wspomaganie (Wsp)</option>
                    </select>
                    <select
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none font-semibold text-slate-700"
                      value={specClassId}
                      onChange={(e) => setSpecClassId(e.target.value)}
                    >
                      <option value="">Wybierz klasę macierzystą</option>
                      {pl.classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer">
                      Dodaj Ucznia
                    </button>
                  </form>
                </div>

                {/* Szybka wyszukiwarka uczniów */}
                {pl.specialStudents.length > 3 && (
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Filtruj uczniów..." 
                      value={speStudentSearch}
                      onChange={(e) => setSpeStudentSearch(e.target.value)}
                      className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white text-slate-700"
                    />
                    {speStudentSearch && (
                      <button 
                        type="button"
                        onClick={() => setSpeStudentSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )}

                {/* Lista uczniów */}
                <div className="space-y-1">
                  {pl.specialStudents.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl select-none leading-relaxed">
                      Brak dodanych uczniów. Wypełnij formularz powyżej, aby dodać pierwszego ucznia.
                    </div>
                  ) : (
                    pl.specialStudents
                      .filter(s => {
                        if (!speStudentSearch.trim()) return true;
                        const q = speStudentSearch.toLowerCase().trim();
                        const clsName = s.classId ? (classesMap.get(s.classId)?.name || '') : '';
                        return `${s.firstName} ${s.lastName} ${clsName}`.toLowerCase().includes(q);
                      })
                      .map(s => {
                        const studentClass = s.classId ? classesMap.get(s.classId) : null;
                        const typeLabels = { ni: 'NI', rewa: 'Rewa', wsp: 'Wsp' };
                        const typeColors = {
                          ni: 'bg-amber-50 text-amber-700 border-amber-200',
                          rewa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          wsp: 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        };
                        const isActive = activeStudentId === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setActiveStudentId(s.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer select-none ${
                              isActive
                                ? 'bg-blue-50 text-blue-900 border-l-4 border-blue-600 shadow-xs' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setActiveStudentId(s.id);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <span className={`px-1 py-0.2 rounded text-[9px] font-black border shrink-0 ${typeColors[s.type] || 'bg-slate-100 text-slate-700'}`}>
                                {typeLabels[s.type] || s.type.toUpperCase()}
                              </span>
                              <span className="truncate font-bold text-slate-800">{s.lastName} {s.firstName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {studentClass && (
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono font-bold leading-normal border border-slate-200">
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
            ) : (
              /* SEKCJA DLA KLAS (activeTab !== 'special') */
              <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
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
            )}

            {/* Zakładki Nawigacji */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/50 mt-auto">
              <button 
                onClick={() => setActiveTab('plan')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${activeTab === 'plan' ? 'bg-blue-100 text-blue-900 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Layers size={14} className={activeTab === 'plan' ? 'text-blue-600' : 'text-slate-400'} />
                <span>🏫 Plan Lekcji (Klasy)</span>
              </button>
              <button 
                onClick={() => setActiveTab('assign')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${activeTab === 'assign' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Layers size={14} className="text-slate-400" />
                <span>📋 Przypisania Godzin</span>
              </button>
              <button 
                onClick={() => setActiveTab('teachers')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${activeTab === 'teachers' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <User size={14} className="text-slate-400" />
                <span>👤 Nauczyciele i Przedmioty</span>
              </button>
              <button 
                onClick={() => setActiveTab('special')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition ${activeTab === 'special' ? 'bg-blue-100 text-blue-900 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BookOpen size={14} className={activeTab === 'special' ? 'text-blue-600' : 'text-slate-400'} />
                <span>🌟 Nauczanie Specjalne</span>
              </button>
            </div>
          </aside>
        )
      )}

      {/* ── STREFA CENTRALNA (Siatka układania) ── */}
      <main className="flex-1 bg-slate-50 p-2 sm:p-3 md:p-4 overflow-y-auto min-w-0">
        {activeTab === 'plan' && (
          <div className="flex flex-col h-full animate-fade-in">
            {/* Header i Przyciski Akcji */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 select-none">
                  {viewMode === 'all' 
                    ? `Plan lekcji dla wszystkich klas (Dzień po dniu)`
                    : currentClass ? `Plan lekcji dla klasy ${currentClass.name}` : 'Plan lekcji klasowy'}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 select-none">
                  {viewMode === 'all'
                    ? `Przeglądaj i układaj plan lekcji dla wszystkich klas jednocześnie. Wybierz dzień tygodnia poniżej.`
                    : currentClass ? `Zdefiniowano zajęcia klasy: ${currentClass.group || 'cała klasa'}. Przeciągaj lekcje ze skrytki po prawej stronie na siatkę.` : 'Wybierz klasę z lewego panelu, aby rozpocząć układanie planu.'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {isLeftSidebarCollapsed && (
                  <button 
                    type="button"
                    onClick={() => setIsLeftSidebarCollapsed(false)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                    title="Rozwiń listę klas"
                  >
                    <PanelLeftOpen size={14} className="text-blue-600" />
                    <span>Klasy ({currentClass ? currentClass.name : 'wybierz'})</span>
                  </button>
                )}
                {isRightSidebarCollapsed && (
                  <button 
                    type="button"
                    onClick={() => setIsRightSidebarCollapsed(false)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                    title="Rozwiń skrytkę lekcji do umieszczenia"
                  >
                    <PanelRightOpen size={14} className="text-indigo-600" />
                    <span>Skrytka lekcji</span>
                  </button>
                )}
                {!presentationMode && (
                  <>
                    <button 
                      onClick={() => setShowGenerator(true)}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={14} /> <span className="hidden sm:inline">Autogenerator planu lekcji</span><span className="sm:hidden">Generator</span>
                    </button>
                    <button 
                      onClick={onTransfer}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={14} /> <span className="hidden sm:inline">Przenieś do planu sal (Etap 2)</span><span className="sm:hidden">Plan sal</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Przełącznik Widoku */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4 bg-slate-100 p-1 rounded-xl self-start">
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
                          const slotItems = getSlotLessons(cls.id, dayIndex, hourIndex);
                          const anyConf = slotItems.some(it => it.isConf);
                          const allConfReasons = Array.from(new Set(slotItems.flatMap(it => it.confReasons)));

                          return (
                            <td 
                              key={hourIndex}
                              title={anyConf ? allConfReasons.join('\n') : undefined}
                              className={`p-1.5 border-b border-r last:border-r-0 border-slate-200 align-top min-h-28 transition-all ${
                                anyConf ? 'bg-red-50/70 border-2 border-red-300' : ''
                              }`}
                              data-cell-type="plan-cell"
                              data-day={dayIndex}
                              data-hour={hourIndex}
                              data-class-id={cls.id}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropOnCell(dayIndex, hourIndex, cls.id)}
                            >
                              {slotItems.length > 0 ? (
                                <div className="flex flex-col gap-1.5 h-full">
                                  {slotItems.map(({ key, lesson, asg, subj, teacher, room, group, suppTeacher, confReasons, isConf }) => {
                                    const specStudentsInThisClassAndSubj = pl.specialStudents.filter(ss => {
                                      if (ss.classId !== cls.id) return false;
                                      return pl.specialAssignments.some(sa => sa.studentId === ss.id && sa.subjectId === asg.subjectId && sa.withClass);
                                    });

                                    return (
                                      <div 
                                        key={key}
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
                                        className={`rounded-lg p-2 border-l-4 relative select-none flex flex-col justify-between group transition-all cursor-grab active:cursor-grabbing touch-none ${
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
                                          ...({ WebkitUserDrag: 'none' } as any)
                                        }}
                                      >
                                        <div>
                                          <div className="flex items-start justify-between gap-1">
                                            <div className="flex flex-col min-w-0">
                                              {group && (
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border inline-flex items-center gap-1 w-fit mb-0.5 ${getGroupBadgeColor(group.name)}`}>
                                                  👥 {group.name}
                                                </span>
                                              )}
                                              <span className="text-xs font-bold truncate leading-tight" style={isConf ? {} : { color: subj?.color }}>
                                                {subj?.name}
                                              </span>
                                            </div>
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
                                              className="text-slate-400 hover:text-red-500 hover:scale-110 active:scale-90 transition-all p-1 bg-slate-100/50 hover:bg-red-50 rounded text-xs font-bold w-5 h-5 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 border border-slate-200/60 z-10 cursor-pointer shrink-0"
                                              title="Usuń tę lekcję z siatki"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                          <div className={`text-[10px] mt-1 font-medium truncate ${isConf ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                                            👤 {teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nieprzypisany'}
                                          </div>

                                          {suppTeacher && (
                                            <div className="text-[10px] text-indigo-700 font-bold mt-0.5 truncate">
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
                                            <div className="mt-1 flex flex-wrap gap-1">
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
                                            className="mt-1 pt-1 border-t border-slate-100" 
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
                                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1.5 font-mono">
                                          <span className={isConf ? 'text-red-700 font-bold' : ''}>🚪 {room ? room.name : 'Bez sali'}</span>
                                          {isConf && <span className="text-red-600 font-black tracking-tighter">⚠️ KOLIZJA</span>}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {slotItems.length === 1 && slotItems[0].asg.groupId && (
                                    <div
                                      onClick={() => {
                                        if (selectedAssignmentId) {
                                          placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex, cls.id);
                                        }
                                      }}
                                      className={`border border-dashed rounded p-1 text-[9px] font-bold flex items-center justify-center gap-1 transition select-none ${
                                        selectedAssignmentId
                                          ? 'border-indigo-300 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 cursor-pointer animate-pulse'
                                          : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer'
                                      }`}
                                      title="Możesz wstawić drugą grupę (np. gr2) na tę samą godzinę lekcyjną"
                                    >
                                      <span>+ Dodaj 2. grupę</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
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
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-1 sm:p-2 w-full">
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1 sm:p-2 border-b border-r border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 text-center w-12 sm:w-16 md:w-20 select-none">
                          Lekcja
                        </th>
                        {DAYS.map((day, i) => (
                          <th key={i} className="p-1.5 sm:p-2 border-b border-r last:border-r-0 border-slate-200 text-xs font-bold text-slate-700 text-center select-none w-1/5">
                            <span className="hidden lg:inline">{day}</span>
                            <span className="lg:hidden">{day.slice(0, 3)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pl.hours.map((h, hourIndex) => (
                        <tr key={hourIndex} className="hover:bg-slate-50/50">
                          {/* Godzina */}
                          <td className="p-1 sm:p-2 border-b border-r border-slate-200 text-center bg-slate-50/50 select-none align-middle">
                            <span className="block font-bold text-slate-700 text-xs sm:text-sm md:text-base">{h.num}</span>
                            <span className="block text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono mt-0.5 leading-tight">{h.start}–{h.end}</span>
                          </td>
                          {/* Dni */}
                          {DAYS.map((_, dayIndex) => {
                            const slotItems = getSlotLessons(activeClassId, dayIndex, hourIndex);
                            const anyConf = slotItems.some(it => it.isConf);
                            const allConfReasons = Array.from(new Set(slotItems.flatMap(it => it.confReasons)));

                            return (
                              <td 
                                key={dayIndex}
                                title={anyConf ? allConfReasons.join('\n') : undefined}
                                className={`p-1 sm:p-1.5 border-b border-r last:border-r-0 border-slate-200 align-top min-h-24 sm:min-h-28 transition-all overflow-hidden ${
                                  anyConf ? 'bg-red-50/70 border-2 border-red-300' : ''
                                }`}
                                data-cell-type="plan-cell"
                                data-day={dayIndex}
                                data-hour={hourIndex}
                                data-class-id={activeClassId}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDropOnCell(dayIndex, hourIndex)}
                              >
                                {slotItems.length > 0 ? (
                                  <div className="flex flex-col gap-1.5 h-full">
                                    {slotItems.map(({ key, lesson, asg, subj, teacher, room, group, suppTeacher, confReasons, isConf }) => {
                                      const specStudentsInThisClassAndSubj = pl.specialStudents.filter(ss => {
                                        if (ss.classId !== activeClassId) return false;
                                        return pl.specialAssignments.some(sa => sa.studentId === ss.id && sa.subjectId === asg.subjectId && sa.withClass);
                                      });

                                      return (
                                        <div 
                                          key={key}
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
                                          className={`rounded-lg p-1.5 sm:p-2 border-l-2 sm:border-l-4 relative select-none flex flex-col justify-between group transition-all cursor-grab active:cursor-grabbing touch-none ${
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
                                            ...({ WebkitUserDrag: 'none' } as any)
                                          }}
                                        >
                                          <div>
                                            <div className="flex items-start justify-between gap-1">
                                              <div className="flex flex-col min-w-0">
                                                {group && (
                                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border inline-flex items-center gap-1 w-fit mb-0.5 ${getGroupBadgeColor(group.name)}`}>
                                                    👥 {group.name}
                                                  </span>
                                                )}
                                                <span className="text-[11px] sm:text-xs font-bold truncate leading-tight" style={isConf ? {} : { color: subj?.color }}>
                                                  {subj?.name}
                                                </span>
                                              </div>
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
                                                className="text-slate-400 hover:text-red-500 hover:scale-110 active:scale-90 transition-all p-0.5 sm:p-1 bg-slate-100/50 hover:bg-red-50 rounded text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 border border-slate-200/60 z-10 cursor-pointer shrink-0"
                                                title="Usuń tę lekcję z siatki"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <div className={`text-[9.5px] sm:text-[10px] mt-0.5 sm:mt-1 font-medium truncate ${isConf ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                                              👤 {teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : 'Nieprzypisany'}
                                            </div>

                                            {suppTeacher && (
                                              <div className="text-[10px] text-indigo-700 font-bold mt-0.5 truncate">
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
                                              <div className="mt-1 flex flex-wrap gap-1">
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
                                              className="mt-1 pt-1 border-t border-slate-100" 
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
                                          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1.5 font-mono">
                                            <span className={isConf ? 'text-red-700 font-bold' : ''}>🚪 {room ? room.name : 'Bez sali'}</span>
                                            {isConf && <span className="text-red-600 font-black tracking-tighter">⚠️ KOLIZJA</span>}
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {slotItems.length === 1 && slotItems[0].asg.groupId && (
                                      <div
                                        onClick={() => {
                                          if (selectedAssignmentId) {
                                            placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex);
                                          }
                                        }}
                                        className={`border border-dashed rounded p-1 text-[9px] font-bold flex items-center justify-center gap-1 transition select-none ${
                                          selectedAssignmentId
                                            ? 'border-indigo-300 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 cursor-pointer animate-pulse'
                                            : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer'
                                        }`}
                                        title="Możesz wstawić drugą grupę (np. gr2) na tę samą godzinę lekcyjną"
                                      >
                                        <span>+ Dodaj 2. grupę</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => {
                                      if (selectedAssignmentId) {
                                        placeAssignmentOnCell(selectedAssignmentId, dayIndex, hourIndex);
                                      }
                                    }}
                                    className={`h-full border border-dashed rounded-lg flex flex-col items-center justify-center transition-all select-none min-h-[60px] sm:min-h-[75px] md:min-h-[85px] p-1 ${
                                      selectedAssignmentId 
                                        ? 'border-indigo-300 bg-indigo-50/40 text-indigo-550 hover:bg-indigo-50/80 hover:border-indigo-400 cursor-pointer' 
                                        : 'border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-default'
                                    }`}
                                  >
                                    <span className="text-base sm:text-lg font-light leading-none">+</span>
                                    {selectedAssignmentId && (
                                      <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-indigo-600 px-1 py-0.5 bg-white border border-indigo-200 rounded shadow-xs mt-0.5 animate-pulse">
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
            <div className={`bg-white border rounded-xl p-6 shadow-sm transition-all ${editingAssignId ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 select-none">
                  {editingAssignId ? '✏️ Edytuj przypisanie zajęć' : '📌 Dodaj nowe przypisanie (Kto, Czego, Ile, Gdzie)'}
                </h2>
                {editingAssignId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEditAssignment}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                  >
                    Anuluj edycję
                  </button>
                )}
              </div>
              <form onSubmit={handleAddAssignment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Klasa Główna</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                      value={assignClass}
                      onChange={(e) => {
                        const clsId = e.target.value;
                        setAssignClass(clsId);
                        setAssignLinkedClasses(prev => prev.filter(id => id !== clsId));
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
                    <button 
                      type="submit" 
                      className={`px-4 py-2 border border-transparent rounded-lg text-white font-bold text-xs self-end h-[34px] transition ${
                        editingAssignId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {editingAssignId ? 'Zapisz' : 'Dodaj'}
                    </button>
                  </div>
                </div>

                {/* Sekcja łączenia oddziałów (Grupa międzyoddziałowa) */}
                {assignClass && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                        <Users size={14} className="text-indigo-600" />
                        <span>Grupa międzyoddziałowa (Zajęcia łączone)</span>
                        <span className="text-[10px] font-normal text-indigo-700 ml-1">
                          — opcjonalnie zaznacz klasy, z których uczniowie łączą się na tej lekcji (np. język mniejszości, religia, WF)
                        </span>
                      </div>
                      {assignLinkedClasses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAssignLinkedClasses([])}
                          className="text-[10px] text-red-600 hover:underline font-bold"
                        >
                          Wyczyść łączenie
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pl.classes.filter(c => c.id !== assignClass).map(c => {
                        const isSelected = assignLinkedClasses.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setAssignLinkedClasses(prev => 
                                isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                            }`}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>Oddział {c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {assignLinkedClasses.length > 0 && (
                      <div className="text-[11px] font-bold text-indigo-800 bg-white/80 border border-indigo-200/60 p-2 rounded-lg mt-1">
                        🔗 Utworzona zostanie jedna wspólna godzina lekcyjna dla oddziałów:{' '}
                        <span className="font-extrabold underline">
                          {[classesMap.get(assignClass)?.name, ...assignLinkedClasses.map(id => classesMap.get(id)?.name)].filter(Boolean).join(' + ')}
                        </span>
                        . U nauczyciela zaliczy się jako <strong className="font-black">{assignHours}h</strong> (bez podwójnego liczenia), a lekcja pojawi się automatycznie w planie każdej z połączonych klas!
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 select-none">📋 Aktywne Przypisania (Pracochłonność)</h3>
                <span className="text-xs text-slate-500 font-bold">Łącznie przydziałów: {pl.assignments.length}</span>
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
                    const hasLinked = a.linkedClassIds && a.linkedClassIds.length > 0;

                    return (
                      <tr key={a.id} className={`hover:bg-slate-50/50 ${editingAssignId === a.id ? 'bg-indigo-50/30' : ''}`}>
                        <td className="p-3 text-xs font-bold text-slate-700 border-b border-slate-200">
                          <div>
                            {c ? `Oddział ${c.name}` : '?'}
                          </div>
                          {hasLinked && (
                            <div className="text-[9.5px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                              👥 Łączona: {[c?.name, ...a.linkedClassIds!.map(id => classesMap.get(id)?.name)].filter(Boolean).join(' + ')}
                            </div>
                          )}
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
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => handleStartEditAssignment(a)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Edytuj to przypisanie"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                              title="Usuń przypisanie"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
                      min={0}
                      max={40}
                      placeholder="18"
                      className="w-full px-3 py-1 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 font-semibold text-slate-800"
                      value={newTeacherMaxHours}
                      onChange={(e) => setNewTeacherMaxHours(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
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
                {pl.teachers.map(t => {
                  const teacherAssignedHours = pl.assignments.filter(a => a.teacherId === t.id).reduce((sum, a) => sum + a.hoursPerWeek, 0);
                  const pensum = t.maxHours ?? 18;
                  const assignedOvertime = Math.max(0, teacherAssignedHours - pensum);

                  return (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs gap-1.5 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-700 truncate">{t.first} {t.last}</span>
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[10px] font-black text-slate-500">{t.abbr}</span>
                        {t.inactive && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black uppercase">Nieaktywny</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>Pensum: {pensum}h {assignedOvertime > 0 ? `+ ${assignedOvertime}h nadg.` : t.overtimeHours ? `+ ${t.overtimeHours}h nadg.` : ''}</span>
                        {teacherAssignedHours > 0 && (
                          <span className={`px-1.5 py-0.2 rounded font-bold ${
                            teacherAssignedHours > 40
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : teacherAssignedHours > pensum
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : teacherAssignedHours === pensum
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            Przydział: {teacherAssignedHours}h
                          </span>
                        )}
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
                  );
                })}
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
                                min={0}
                                max={40}
                                placeholder="18"
                                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none font-semibold text-slate-800 focus:border-blue-500"
                                value={newTeacherMaxHours}
                                onChange={(e) => setNewTeacherMaxHours(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
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
          <div className="w-full space-y-4 animate-in fade-in duration-300">
            {currentStudent ? (() => {
                // Obliczenie statystyk godzin dla wybranego ucznia
                const classHours = studentAssignments
                  .filter(a => a.withClass)
                  .reduce((sum, a) => sum + a.hoursPerWeek, 0);
                  
                const individualHours = studentAssignments
                  .filter(a => !a.withClass)
                  .reduce((sum, a) => sum + a.hoursPerWeek, 0);

                const totalHours = classHours + individualHours;

                // Quota z orzeczenia
                const quotaWsp = currentStudent.supportHours?.wsp ?? (currentStudent.type === 'wsp' ? 8 : 0);
                const quotaRewa = currentStudent.supportHours?.rewa ?? (currentStudent.type === 'rewa' ? 2 : 0);
                const quotaNi = currentStudent.supportHours?.ni ?? (currentStudent.type === 'ni' ? 10 : 0);

                // Policz ile godzin wsparcia jest faktycznie przydzielonych w siatce lekcji klasy
                let scheduledWspCount = 0;
                let scheduledRewaCount = 0;
                let scheduledNiCount = 0;

                if (currentStudent.classId) {
                  for (let d = 0; d < 5; d++) {
                    (pl.hours || []).forEach((_, hIdx) => {
                      const classKey = `${currentStudent.classId}|${d}|${hIdx}`;
                      const lesson = pl.lessons[classKey];
                      const speSlot = pl.spePlan?.slotAssignments?.find(
                        s => s.studentId === currentStudent.id && s.dayIdx === d && s.hourIdx === hIdx && s.withClass
                      );
                      if (lesson?.supportTeacherId || speSlot?.supportTeacherId) {
                        scheduledWspCount++;
                      }
                    });
                  }
                }

                // Policz ile godzin 1:1 jest w planie specjalnym
                Object.keys(pl.specialLessons || {}).forEach(k => {
                  const parts = k.split('|');
                  if (parts[0] === currentStudent.id) {
                    const spLesson = pl.specialLessons[k];
                    const asg = pl.specialAssignments.find(a => a.id === spLesson.assignmentId);
                    if (asg?.supportType === 'rewa') scheduledRewaCount++;
                    else if (asg?.supportType === 'ni') scheduledNiCount++;
                  }
                });

                return (
                  <div className="space-y-4">
                    {/* Sub-tab Navigation */}
                    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 pt-2 rounded-t-2xl shadow-xs">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        {isLeftSidebarCollapsed && (
                          <button
                            type="button"
                            onClick={() => setIsLeftSidebarCollapsed(false)}
                            className="px-2.5 py-1.5 mr-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                            title="Rozwiń listę uczniów specjalnych (SPE i NI)"
                          >
                            <PanelLeftOpen size={14} className="text-blue-600" />
                            <span>Uczniowie ({pl.specialStudents.length})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSpeSubTab('schedule')}
                          className={`px-3.5 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                            speSubTab === 'schedule'
                              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/70 shadow-xs'
                              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <Calendar size={13} />
                          <span>📅 Plan SPE (Rozkład wsparcia i zajęć w siatce)</span>
                          {quotaWsp > 0 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${
                              scheduledWspCount === quotaWsp
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {scheduledWspCount}/{quotaWsp}h
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpeSubTab('profile')}
                          className={`px-3.5 py-2 text-xs font-black rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                            speSubTab === 'profile'
                              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/70 shadow-xs'
                              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <Settings size={13} />
                          <span>👤 Pula orzeczenia i Profil ucznia</span>
                        </button>
                      </div>

                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono hidden sm:inline-block">
                        Uczeń: {currentStudent.firstName} {currentStudent.lastName} {currentStudent.classId ? `(${classesMap.get(currentStudent.classId)?.name || 'brak'})` : ''}
                      </span>
                    </div>

                    {/* ZAKŁADKA 1: TYGODNIOWY PLAN SPE (Siatka rozkładu wsparcia) */}
                    {speSubTab === 'schedule' && (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        {/* Pasek postępu i bilans orzeczenia */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div>
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={14} className="text-indigo-600" />
                                Bilans przydziału godzin wsparcia w planie lekcji
                              </span>
                              <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                                Zarządzaj realizacją zajęć: oznaczaj lekcje z klasą, przypisuj nauczycieli wspomagających, zastępuj nauczaniem indywidualnym (1:1) lub rejestruj zwolnienia.
                              </p>
                            </div>
                            
                            {/* Status badge */}
                            <div className="flex items-center gap-2">
                              {quotaWsp > 0 && (
                                <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-xs ${
                                  scheduledWspCount === quotaWsp
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : scheduledWspCount < quotaWsp
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}>
                                  {scheduledWspCount === quotaWsp ? (
                                    <>
                                      <CheckCircle size={14} className="text-emerald-600" />
                                      <span>✓ Komplet: {scheduledWspCount} / {quotaWsp} godz. wsparcia</span>
                                    </>
                                  ) : scheduledWspCount < quotaWsp ? (
                                    <>
                                      <span>⚠️ Pozostało do przydzielenia: {quotaWsp - scheduledWspCount} godz. ({scheduledWspCount}/{quotaWsp}h)</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>⚠️ Nadmiar o {scheduledWspCount - quotaWsp} godz. ({scheduledWspCount}/{quotaWsp}h)</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Karty podsumowania godzin */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                            <div className="bg-indigo-50/70 border border-indigo-150 rounded-xl p-2.5 text-left">
                              <span className="text-[9.5px] font-black text-indigo-800 uppercase block">Pula orzeczenia (Wsp)</span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-black text-indigo-950 font-mono">{quotaWsp}</span>
                                <span className="text-[10px] font-bold text-indigo-600">godz./tyg.</span>
                              </div>
                            </div>

                            <div className="bg-emerald-50/70 border border-emerald-150 rounded-xl p-2.5 text-left">
                              <span className="text-[9.5px] font-black text-emerald-800 uppercase block">Rozdysponowano w klasie</span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-black text-emerald-950 font-mono">{scheduledWspCount}</span>
                                <span className="text-[10px] font-bold text-emerald-600">/ {quotaWsp}h</span>
                              </div>
                            </div>

                            <div className="bg-purple-50/70 border border-purple-150 rounded-xl p-2.5 text-left">
                              <span className="text-[9.5px] font-black text-purple-800 uppercase block">Zajęcia 1:1 (Rewa/NI)</span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-black text-purple-950 font-mono">{scheduledRewaCount + scheduledNiCount}</span>
                                <span className="text-[10px] font-bold text-purple-600">godz./tyg.</span>
                              </div>
                            </div>

                            <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-2.5 text-left">
                              <span className="text-[9.5px] font-black text-slate-700 uppercase block">Kadra wspomagająca</span>
                              <div className="text-[10px] font-bold text-slate-800 truncate mt-1" title={currentStudent.supportTeacherIds?.map(id => teachersMap.get(id)?.abbr).join(', ')}>
                                {currentStudent.supportTeacherIds && currentStudent.supportTeacherIds.length > 0
                                  ? `${currentStudent.supportTeacherIds.length} naucz. (${currentStudent.supportTeacherIds.map(id => teachersMap.get(id)?.abbr).filter(Boolean).join(', ')})`
                                  : 'Wszyscy dostępni'}
                              </div>
                            </div>
                          </div>

                          {/* Pasek Szybkich Akcji i Narzędzi */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAutoAssignSupport()}
                                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                                title="Automatycznie rozdziela godziny wsparcia z orzeczenia na przedmioty wiodące (Polski, Matematyka, Języki)"
                              >
                                <Zap size={13} className="text-amber-300" />
                                <span>⚡ Auto-przydział wsparcia ({quotaWsp}h)</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleClearAllStudentAssignments}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1"
                                title="Usuwa wszystkie modyfikacje SPE dla tego ucznia i przywraca stan domyślny"
                              >
                                <RotateCcw size={12} />
                                <span>Wyczyść plan ucznia</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Wsparcie w klasie</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span> Z klasą (ogólna)</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> 1:1 / NI / Rewalidacja</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Zwolnienie</span>
                            </div>
                          </div>
                        </div>

                        {/* Interaktywna Tygodniowa Siatka Rozkładu Wsparcia SPE */}
                        {!currentStudent.classId ? (
                          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                            <span className="text-2xl">⚠️</span>
                            <h5 className="font-bold text-slate-700 text-sm">Brak przypisanej klasy macierzystej</h5>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              Przejdź do zakładki <strong>👤 Pula orzeczenia i Profil ucznia</strong> i wybierz klasę macierzystą dla tego ucznia, aby wyświetlić siatkę lekcji i przydzielać wsparcie.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-4 shadow-sm space-y-3 overflow-hidden w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                📅 Tygodniowy Rozkład Zajęć SPE • Uczeń: {currentStudent.firstName} {currentStudent.lastName} (Klasa {classesMap.get(currentStudent.classId)?.name})
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                Kliknij na lekcję lub ikonę ⚙️, aby dostosować tryb
                              </span>
                            </div>

                            {/* Tabela siatki */}
                            <table className="w-full table-fixed text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                  <th className="py-2 px-1 text-center w-12 sm:w-14">Lekcja</th>
                                  {DAYS.map((dayName, dIdx) => (
                                    <th key={dIdx} className="py-2 px-1 sm:px-2.5 text-left border-l border-slate-200 font-bold w-1/5">
                                      <span className="hidden lg:inline">{dayName}</span>
                                      <span className="lg:hidden">{dayName.slice(0, 3)}</span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 text-xs">
                                {(pl.hours || []).map((hour, hIdx) => {
                                  return (
                                    <tr key={hIdx} className="hover:bg-slate-50/30 transition">
                                      {/* Kolumna godziny */}
                                      <td className="py-2.5 px-2 text-center bg-slate-50/50 border-r border-slate-200 select-none">
                                        <div className="font-mono font-black text-slate-800 text-xs">{hour.num}</div>
                                        <div className="text-[9px] text-slate-400 font-bold leading-tight">{hour.start} - {hour.end}</div>
                                      </td>

                                      {/* Kolumny poszczególnych dni Pon-Pt */}
                                      {DAYS.map((_, dayIdx) => {
                                        const classKey = `${currentStudent.classId}|${dayIdx}|${hIdx}`;
                                        const lesson = pl.lessons[classKey];
                                        const asg = lesson ? pl.assignments.find(a => a.id === lesson.assignmentId) : null;
                                        const subj = asg ? (subjectsMap.get(asg.subjectId) || pl.subjects.find(s => s.id === asg.subjectId)) : null;
                                        const leadTeacher = asg?.teacherId ? teachersMap.get(asg.teacherId) : null;
                                        
                                        // Wyszukanie przypisania SPE w modelu
                                        const speSlot = (pl.spePlan?.slotAssignments || []).find(
                                          s => s.studentId === currentStudent.id && s.dayIdx === dayIdx && s.hourIdx === hIdx
                                        );

                                        // Wyszukanie lekcji specjalnej 1:1
                                        const specialLessonKey = `${currentStudent.id}|${dayIdx}|${hIdx}`;
                                        const specialLesson = pl.specialLessons ? pl.specialLessons[specialLessonKey] : null;
                                        const specialAsg = specialLesson ? pl.specialAssignments.find(a => a.id === specialLesson.assignmentId) : null;
                                        const specialSubj = specialAsg ? (subjectsMap.get(specialAsg.subjectId) || pl.subjects.find(s => s.id === specialAsg.subjectId)) : null;
                                        const specialTeacher = specialAsg?.teacherId ? teachersMap.get(specialAsg.teacherId) : null;
                                        const isAbsent = Boolean(pl.specialAbsences?.[specialLessonKey]);

                                        // Wyznaczenie aktualnego trybu slotu
                                        let currentMode: 'class_regular' | 'class_support' | 'individual' | 'exempt' | 'empty' = 'empty';
                                        let currentSupportTeacherId: string | null = null;

                                        if (speSlot?.mode) {
                                          currentMode = speSlot.mode;
                                          currentSupportTeacherId = speSlot.supportTeacherId || null;
                                        } else if (speSlot) {
                                          if (!speSlot.withClass || speSlot.specialAssignmentId) {
                                            currentMode = 'individual';
                                          } else if (speSlot.exemptReason) {
                                            currentMode = 'exempt';
                                          } else if (speSlot.supportTeacherId) {
                                            currentMode = 'class_support';
                                            currentSupportTeacherId = speSlot.supportTeacherId;
                                          } else {
                                            currentMode = 'class_regular';
                                          }
                                        } else if (specialLesson) {
                                          currentMode = 'individual';
                                        } else if (isAbsent) {
                                          currentMode = 'exempt';
                                        } else if (lesson?.supportTeacherId) {
                                          currentMode = 'class_support';
                                          currentSupportTeacherId = lesson.supportTeacherId;
                                        } else if (lesson && asg) {
                                          currentMode = 'class_regular';
                                        }

                                        const supportTeacher = currentSupportTeacherId ? teachersMap.get(currentSupportTeacherId) : null;

                                        return (
                                          <td key={dayIdx} className="py-2 px-2 border-l border-slate-150 align-top">
                                            {/* TRYB 1: WSPOMAGANIE W KLASIE */}
                                            {currentMode === 'class_support' && lesson && asg && (
                                              <div className="p-2.5 rounded-xl border bg-emerald-50/90 border-emerald-300 text-xs space-y-2 transition-all shadow-xs group">
                                                <div className="flex items-start justify-between gap-1">
                                                  <div className="min-w-0">
                                                    <span 
                                                      className="font-black text-[11px] block truncate leading-tight"
                                                      style={{ color: subj?.color || '#065f46' }}
                                                      title={subj?.name}
                                                    >
                                                      🏫 {subj?.name || 'Lekcja'}
                                                    </span>
                                                    <span className="text-[9.5px] text-slate-600 font-semibold truncate block">
                                                      Prow: {leadTeacher ? `${leadTeacher.first.charAt(0)}. ${leadTeacher.last} (${leadTeacher.abbr})` : 'Brak'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {asg.roomId && (
                                                      <span className="text-[8.5px] font-bold bg-white/80 px-1 py-0.2 rounded text-emerald-800 border border-emerald-200">
                                                        s. {roomsMap.get(asg.roomId)?.name || asg.roomId}
                                                      </span>
                                                    )}
                                                    <button
                                                      type="button"
                                                      onClick={() => handleToggleExemptSlot(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-white hover:bg-amber-100 hover:text-amber-800 text-slate-500 transition cursor-pointer border border-emerald-200"
                                                      title="Oznacz, że uczeń nie uczęszcza na tę lekcję (Zwolnij/Usuń z planu ucznia)"
                                                    >
                                                      <Ban size={11} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenSpeSlotModal(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-white hover:bg-emerald-100 text-emerald-700 transition cursor-pointer border border-emerald-200"
                                                      title="Konfiguruj tę godzinę SPE"
                                                    >
                                                      <Settings size={11} />
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Badge Nauczyciela Wspomagającego */}
                                                <div className="bg-white/90 text-emerald-950 p-1.5 rounded-lg text-[10px] font-black border border-emerald-200 flex items-center justify-between gap-1 shadow-3xs">
                                                  <span className="truncate flex items-center gap-1 text-emerald-900">
                                                    🤝 Wsparcie: {supportTeacher ? `${supportTeacher.first.charAt(0)}. ${supportTeacher.last} (${supportTeacher.abbr})` : 'Wyznaczony'}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSetSlotSupportTeacher(dayIdx, hIdx, null)}
                                                    className="text-emerald-700 hover:text-rose-600 p-0.5 font-bold cursor-pointer transition text-xs"
                                                    title="Usuń wsparcie z tej lekcji"
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              </div>
                                            )}

                                            {/* TRYB 2: Z KLASĄ BEZ WSPOMAGANIA */}
                                            {currentMode === 'class_regular' && lesson && asg && (
                                              <div className="p-2.5 rounded-xl border bg-white border-slate-200 hover:border-slate-300 text-xs space-y-2 transition-all shadow-3xs group">
                                                <div className="flex items-start justify-between gap-1">
                                                  <div className="min-w-0">
                                                    <span 
                                                      className="font-bold text-[11px] block truncate leading-tight"
                                                      style={{ color: subj?.color || '#1e293b' }}
                                                      title={subj?.name}
                                                    >
                                                      {subj?.name || 'Lekcja'}
                                                    </span>
                                                    <span className="text-[9.5px] text-slate-500 font-semibold truncate block">
                                                      Prow: {leadTeacher ? `${leadTeacher.first.charAt(0)}. ${leadTeacher.last} (${leadTeacher.abbr})` : 'Brak'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {asg.roomId && (
                                                      <span className="text-[8.5px] font-bold bg-slate-100 px-1 py-0.2 rounded text-slate-600 border border-slate-200">
                                                        s. {roomsMap.get(asg.roomId)?.name || asg.roomId}
                                                      </span>
                                                    )}
                                                    <button
                                                      type="button"
                                                      onClick={() => handleToggleExemptSlot(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 transition cursor-pointer border border-slate-200"
                                                      title="Usuń tę lekcję z planu ucznia (Nie obowiązuje / Zwolniony)"
                                                    >
                                                      <Ban size={11} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenSpeSlotModal(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition cursor-pointer border border-slate-200"
                                                      title="Konfiguruj tę godzinę SPE"
                                                    >
                                                      <Settings size={11} />
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Szybkie akcje w komórce */}
                                                <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1">
                                                  <select
                                                    className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600 hover:border-indigo-400 outline-none cursor-pointer"
                                                    value=""
                                                    onChange={(e) => {
                                                      if (e.target.value) {
                                                        handleSetSlotSupportTeacher(dayIdx, hIdx, e.target.value);
                                                      }
                                                    }}
                                                  >
                                                    <option value="">+ Przydziel wsparcie...</option>
                                                    {currentStudent.supportTeacherIds && currentStudent.supportTeacherIds.length > 0 && (
                                                      <optgroup label="⭐ Kadra ucznia">
                                                        {currentStudent.supportTeacherIds.map(tId => {
                                                          const t = teachersMap.get(tId);
                                                          if (!t) return null;
                                                          return <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>;
                                                        })}
                                                      </optgroup>
                                                    )}
                                                    <optgroup label="Wszyscy nauczyciele">
                                                      {pl.teachers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                                                      ))}
                                                    </optgroup>
                                                  </select>
                                                </div>
                                              </div>
                                            )}

                                            {/* TRYB 3: ZASTĄPIENIE 1:1 / NI / REWALIDACJA */}
                                            {currentMode === 'individual' && (
                                              <div className="p-2.5 rounded-xl border bg-purple-50/95 border-purple-300 text-xs space-y-1.5 shadow-xs">
                                                <div className="flex items-start justify-between gap-1">
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-600 text-white tracking-wider">
                                                        👤 1:1 {speSlot?.type === 'rewa' ? 'Rewalidacja' : 'NI'}
                                                      </span>
                                                    </div>
                                                    <span className="font-black text-[11px] text-purple-950 truncate block mt-0.5" title={specialSubj?.name || 'Zajęcia 1:1'}>
                                                      {specialSubj?.name || subjectsMap.get(speSlot?.subjectId || '')?.name || 'Zajęcia 1:1 (NI)'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleResetSpeSlot(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-white hover:bg-rose-100 text-purple-700 hover:text-rose-700 transition cursor-pointer border border-purple-200"
                                                      title="Usuń przydział 1:1 i przywróć lekcję z klasą"
                                                    >
                                                      <Trash2 size={11} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenSpeSlotModal(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-white hover:bg-purple-100 text-purple-700 transition cursor-pointer border border-purple-200"
                                                      title="Edytuj przydział 1:1"
                                                    >
                                                      <Settings size={11} />
                                                    </button>
                                                  </div>
                                                </div>

                                                <div className="text-[9.5px] text-purple-800 font-bold leading-tight">
                                                  Prow: {specialTeacher ? `${specialTeacher.first.charAt(0)}. ${specialTeacher.last} (${specialTeacher.abbr})` : (speSlot?.teacherId ? teachersMap.get(speSlot.teacherId)?.abbr : 'Wyznaczony')}
                                                  {(specialAsg?.roomId || speSlot?.roomId) && (
                                                    <span className="ml-1 text-[8.5px] bg-white px-1 py-0.2 rounded border border-purple-200">
                                                      s. {roomsMap.get(specialAsg?.roomId || speSlot?.roomId || '')?.name}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Informacja co ma w tym czasie klasa */}
                                                <div className="pt-1 border-t border-purple-200/70 flex items-center justify-between text-[9px] text-purple-700">
                                                  <span className="truncate">
                                                    {lesson && asg ? `W klasie: ${subj?.short || subj?.name}` : 'Klasa ma wolne'}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleResetSpeSlot(dayIdx, hIdx)}
                                                    className="text-purple-600 hover:text-rose-600 font-bold ml-1 cursor-pointer flex items-center gap-0.5"
                                                    title="Usuń przydział 1:1 i przywróć lekcję z klasą"
                                                  >
                                                    <span>✕ usuń</span>
                                                  </button>
                                                </div>
                                              </div>
                                            )}

                                            {/* TRYB 4: ZWOLNIENIE Z LEKCJI (Nie obowiązuje) */}
                                            {currentMode === 'exempt' && (
                                              <div className="p-2.5 rounded-xl border bg-amber-50/90 border-amber-300 text-xs space-y-1.5 shadow-3xs">
                                                <div className="flex items-start justify-between gap-1">
                                                  <div>
                                                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-600 text-white tracking-wider inline-flex items-center gap-1">
                                                      <Ban size={9} /> Nie obowiązuje
                                                    </span>
                                                    <span className="font-bold text-[10px] text-amber-950 block mt-0.5 leading-tight" title={speSlot?.exemptReason || 'Uczeń nie uczęszcza na te zajęcia'}>
                                                      {speSlot?.exemptReason || 'Zwolniony z lekcji'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleResetSpeSlot(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-white hover:bg-emerald-100 text-amber-800 hover:text-emerald-700 transition cursor-pointer border border-amber-200"
                                                      title="Przywróć lekcję z klasą do planu ucznia"
                                                    >
                                                      <RotateCcw size={11} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenSpeSlotModal(dayIdx, hIdx)}
                                                      className="p-1 rounded bg-white hover:bg-amber-100 text-amber-800 transition cursor-pointer border border-amber-200"
                                                      title="Edytuj zwolnienie"
                                                    >
                                                      <Settings size={11} />
                                                    </button>
                                                  </div>
                                                </div>

                                                <div className="pt-1 border-t border-amber-200/70 flex items-center justify-between text-[9px] text-amber-800">
                                                  <span className="truncate">
                                                    {lesson && asg ? `Klasa ma: ${subj?.short || subj?.name}` : 'Klasa ma wolne'}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleResetSpeSlot(dayIdx, hIdx)}
                                                    className="text-amber-700 hover:text-emerald-700 font-bold ml-1 cursor-pointer flex items-center gap-0.5"
                                                    title="Przywróć tę lekcję do planu ucznia"
                                                  >
                                                    <span>↺ przywróć</span>
                                                  </button>
                                                </div>
                                              </div>
                                            )}

                                            {/* TRYB 5: PUSTA KOMÓRKA (Klasa nie ma lekcji) */}
                                            {currentMode === 'empty' && (
                                              <div className="h-16 border border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-1.5 flex flex-col items-center justify-center text-slate-400 transition bg-slate-50/30">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenSpeSlotModal(dayIdx, hIdx)}
                                                  className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-3xs"
                                                >
                                                  <Plus size={10} />
                                                  <span>Dodaj 1:1</span>
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ZAKŁADKA 2: PROFIL, PULA ORZECZENIA I PRZYPISANIA */}
                    {speSubTab === 'profile' && (
                      <div className="space-y-6 animate-in fade-in duration-150">
                        {/* Sekcja 1: Profil i wsparcie w klasie / Edycja uczniów */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 select-none">
                            <div className="flex items-center gap-2">
                              <Settings size={15} className="text-indigo-600" />
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Edycja Profilu ucznia i Pula Orzeczenia</h4>
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
                              <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Główny typ orzeczenia</label>
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
                                <option value="wsp">Wspomaganie w oddziale (Wsp)</option>
                                <option value="rewa">Rewalidacja (Rewa)</option>
                                <option value="ni">Nauczanie Indywidualne (NI)</option>
                                <option value="korekta">Terapia pedagogiczna (Korekta)</option>
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

                          {/* Pula godzin z orzeczenia (Wymiar wsparcia) */}
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                <Award size={12} className="text-indigo-500 shrink-0" />
                                Tygodniowy wymiar godzin wynikający z orzeczenia (Pula godzin)
                              </span>
                              <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed mt-0.5 select-none">
                                Wpisz zalecaną liczbę godzin tygodniowo dla poszczególnych form wsparcia ucznia:
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                              <div>
                                <label className="block text-[9.5px] font-bold text-slate-600 mb-1">🤝 Wspomaganie w klasie</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                                    value={currentStudent.supportHours?.wsp ?? (currentStudent.type === 'wsp' ? 8 : 0)}
                                    onChange={(e) => {
                                      handleUpdateSpecialStudent({
                                        ...currentStudent,
                                        supportHours: {
                                          ...(currentStudent.supportHours || {}),
                                          wsp: Number(e.target.value)
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold">h/tyg</span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9.5px] font-bold text-slate-600 mb-1">👤 Rewalidacja (1:1)</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                                    value={currentStudent.supportHours?.rewa ?? (currentStudent.type === 'rewa' ? 2 : 0)}
                                    onChange={(e) => {
                                      handleUpdateSpecialStudent({
                                        ...currentStudent,
                                        supportHours: {
                                          ...(currentStudent.supportHours || {}),
                                          rewa: Number(e.target.value)
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold">h/tyg</span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9.5px] font-bold text-slate-600 mb-1">📖 Nauczanie Indywidualne</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                                    value={currentStudent.supportHours?.ni ?? (currentStudent.type === 'ni' ? 10 : 0)}
                                    onChange={(e) => {
                                      handleUpdateSpecialStudent({
                                        ...currentStudent,
                                        supportHours: {
                                          ...(currentStudent.supportHours || {}),
                                          ni: Number(e.target.value)
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold">h/tyg</span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9.5px] font-bold text-slate-600 mb-1">🎯 Terapia pedagogiczna</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                                    value={currentStudent.supportHours?.korekta ?? 0}
                                    onChange={(e) => {
                                      handleUpdateSpecialStudent({
                                        ...currentStudent,
                                        supportHours: {
                                          ...(currentStudent.supportHours || {}),
                                          korekta: Number(e.target.value)
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold">h/tyg</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DODATKOWO: Nauczyciele wspomagający w klasie */}
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                <Users size={12} className="text-indigo-500 shrink-0" />
                                Wyznaczona kadra wspomagająca dla ucznia
                              </span>
                              <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed mt-0.5 select-none">
                                Zaznacz nauczycieli, którzy tworzą zespół wspomagający tego ucznia (będą wyróżnieni na liście szybkiego wyboru w Planie SPE):
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
                          </div>
                        </div>

                        {/* Sekcja 3: Dodawanie nowych zajęć dedykowanych (Indywidualne / Rewalidacja) */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 select-none">
                            <Sparkles size={15} className="text-indigo-600 animate-pulse" />
                            <h4 className="text-xs font-black text-slate-805 uppercase tracking-wider">Nowe zajęcia specjalne lub indywidualne (1:1)</h4>
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
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 select-none font-sans">Nauczyciel Prowadzący / Terapeuta</label>
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

                            {/* Forma zajęć */}
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
                                  onClick={() => setSpecWithClass(false)}
                                  className={`flex-1 p-2 rounded-xl border font-bold text-[10.5px] transition-all flex flex-col items-center justify-center cursor-pointer select-none leading-relaxed border-solid ${
                                    !specWithClass 
                                      ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-3xs' 
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <span className="font-extrabold uppercase text-[7.5px] tracking-wider mb-0.5 text-purple-600">Forma 1:1</span>
                                  👤 Indywidualne / Rewalidacja
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSpecWithClass(true)}
                                  className={`flex-1 p-2 rounded-xl border font-bold text-[10.5px] transition-all flex flex-col items-center justify-center cursor-pointer select-none leading-relaxed border-solid ${
                                    specWithClass 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs' 
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <span className="font-extrabold uppercase text-[7.5px] tracking-wider mb-0.5 text-emerald-600">Forma Klasowa</span>
                                  🏫 Z klasą
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
                                      a.withClass ? 'border-l-emerald-500 border-slate-200' : 'border-l-purple-500 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="min-w-0">
                                        <span className="font-bold text-[12.5px] block truncate leading-tight" style={{ color: subj?.color || '#334155' }}>
                                          {subj?.name}
                                        </span>
                                        <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border mt-1 leading-none ${
                                          a.withClass 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                            : 'bg-purple-50 text-purple-700 border-purple-150'
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

                                    <div className="space-y-1.5 mt-2 font-semibold text-slate-600 text-[10.5px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 text-[10px] select-none font-sans">Prowadzący:</span>
                                        {mainTeacher ? (
                                          <span className="text-slate-800 font-extrabold">{mainTeacher.first} {mainTeacher.last} (<strong className="font-mono">{mainTeacher.abbr}</strong>)</span>
                                        ) : (
                                          <span className="text-red-500 italic font-semibold">Brak przydziału</span>
                                        )}
                                      </div>

                                      {supportTeacher && (
                                        <div className="flex items-center gap-1.5 p-1 px-1.5 bg-indigo-50/70 border border-indigo-100 rounded-lg mt-1 font-sans">
                                          <span className="text-indigo-805 text-[8px] font-black uppercase tracking-wider bg-indigo-100 px-1 py-0.5 rounded shrink-0 leading-none">Wspomaganie</span>
                                          <span className="text-indigo-950 font-bold truncate leading-none">
                                            {supportTeacher.first} {supportTeacher.last} ({supportTeacher.abbr})
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 select-none bg-white border border-slate-200 rounded-2xl border-dashed min-h-[450px]">
                  <span className="text-4xl animate-bounce">🎓</span>
                  <span className="text-sm font-semibold mt-3 text-slate-700 font-sans">Wybierz ucznia z lewej listy</span>
                  {isLeftSidebarCollapsed && (
                    <button
                      type="button"
                      onClick={() => setIsLeftSidebarCollapsed(false)}
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <PanelLeftOpen size={15} />
                      <span>Rozwiń listę uczniów specjalnych ({pl.specialStudents.length})</span>
                    </button>
                  )}
                  <p className="text-[11px] text-slate-405 max-w-sm mt-2 leading-relaxed font-semibold">
                    Układaj Plan SPE przed etapem Planu Sal: rozdysponuj pulę godzin wsparcia (np. 8h w klasie) bezpośrednio na siatce lekcji klasy, planuj rewalidację oraz generuj rzetelny Arkusz SPE.
                  </p>
                </div>
              )}
          </div>
        )}
      </main>

      {/* ── SKRYTKA LEKCJI DO UMIESZCZENIA (PO_PRAWEJ) ── */}
      {activeTab === 'plan' && (viewMode === 'all' || currentClass) && (
        isRightSidebarCollapsed ? (
          <div className="hidden md:flex flex-col items-center py-3 px-1 bg-white border-l border-slate-200 shrink-0 select-none shadow-xs w-11 transition-all">
            <button
              type="button"
              onClick={() => setIsRightSidebarCollapsed(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition mb-3 cursor-pointer"
              title="Rozwiń skrytkę lekcji"
            >
              <PanelRightOpen size={18} />
            </button>
            <div 
              onClick={() => setIsRightSidebarCollapsed(false)}
              className="cursor-pointer [writing-mode:vertical-lr] text-[11px] font-extrabold text-slate-400 hover:text-indigo-600 tracking-wider uppercase flex items-center gap-2 py-2"
              title="Rozwiń skrytkę lekcji"
            >
              <span>🗂️ Skrytka lekcji</span>
            </div>
            {selectedAssignmentId && (
              <div 
                onClick={() => setIsRightSidebarCollapsed(false)}
                className="mt-auto mb-2 p-1 rounded-md bg-indigo-600 text-white text-[9px] font-black cursor-pointer text-center animate-pulse"
                title="Aktywny pędzel - kliknij aby rozwinąć"
              >
                Pędzel
              </div>
            )}
          </div>
        ) : (() => {
          const rawSidebarAssignments = (viewMode === 'all' 
            ? (allViewSelectedClassId 
                ? pl.assignments.filter(a => a.classId === allViewSelectedClassId || (a.linkedClassIds && a.linkedClassIds.includes(allViewSelectedClassId)))
                : pl.assignments)
            : classAssignments);

          const totalSidebarCount = rawSidebarAssignments.length;
          const completedSidebarCount = rawSidebarAssignments.filter(a => (placedHours[a.id] || 0) >= a.hoursPerWeek).length;

          const visibleSidebarAssignments = rawSidebarAssignments.filter(a => {
            const placed = placedHours[a.id] || 0;
            if (hideCompletedAssignments && placed >= a.hoursPerWeek) {
              return false;
            }
            if (sidebarSearch.trim()) {
              const q = sidebarSearch.toLowerCase().trim();
              const s = subjectsMap.get(a.subjectId);
              const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
              const targetClass = classesMap.get(a.classId);
              const matchSubj = s?.name?.toLowerCase().includes(q) || s?.short?.toLowerCase().includes(q);
              const matchTeach = t ? `${t.first} ${t.last} ${t.abbr}`.toLowerCase().includes(q) : false;
              const matchClass = targetClass ? targetClass.name.toLowerCase().includes(q) : false;
              if (!matchSubj && !matchTeach && !matchClass) {
                return false;
              }
            }
            return true;
          });

          return (
            <aside className="w-full md:w-60 lg:w-64 xl:w-72 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 select-none transition-all overflow-hidden shadow-xs">
              {/* STICKY HEADER */}
              <div className="p-3 border-b border-slate-200 bg-slate-50/80 space-y-2 shrink-0">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🗂️ Lekcje do umieszczenia</span>
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full">
                        {visibleSidebarAssignments.length}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRightSidebarCollapsed(true)}
                      className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                      title="Zwiń skrytkę lekcji, aby zyskać maksymalną szerokość na plan"
                    >
                      <PanelRightClose size={15} />
                    </button>
                  </div>
                </div>

                {viewMode === 'all' && (
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
                )}

                {/* Szybka wyszukiwarka przedmiotu / nauczyciela */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="Szukaj przedmiotu / nauczyciela..."
                    className="w-full pl-7.5 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition"
                  />
                  {sidebarSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                      title="Wyczyść szukanie"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filtry i wskaźnik zapełnienia */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span className="font-medium">
                    {totalSidebarCount > 0 ? `${visibleSidebarAssignments.length} z ${totalSidebarCount} przedm.` : '0 przedmiotów'}
                  </span>
                  {completedSidebarCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setHideCompletedAssignments(prev => !prev)}
                      className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                        hideCompletedAssignments
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                      }`}
                      title={hideCompletedAssignments ? "Pokaż także w pełni umieszczone lekcje" : "Ukryj lekcje, które mają już umieszczone wszystkie godziny"}
                    >
                      {hideCompletedAssignments ? '✓ Ukryto zapełnione' : `Ukryj zapełnione (${completedSidebarCount})`}
                    </button>
                  )}
                </div>

                {selectedAssignmentId && (
                  <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[9.5px] text-emerald-850 font-bold flex items-center justify-between shadow-xs">
                    <span className="truncate mr-1">🎯 Pędzel: {subjectsMap.get(pl.assignments.find(as => as.id === selectedAssignmentId)?.subjectId || '')?.name}</span>
                    <button 
                      type="button"
                      onClick={() => setSelectedAssignmentId(null)}
                      className="font-bold text-[9px] text-emerald-700 bg-white border border-emerald-300 rounded px-1.5 py-0.5 hover:bg-emerald-100 uppercase shrink-0 cursor-pointer"
                    >
                      Wyłącz
                    </button>
                  </div>
                )}
              </div>

              {/* SCROLLABLE LIST OF CARDS */}
              <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 touch-pan-y overscroll-contain">
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
                  className="p-2.5 border-2 border-dashed border-red-200 rounded-xl bg-red-50/40 hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-center text-center text-red-700 cursor-default gap-2 focus-within:ring-2 focus-within:ring-red-400"
                >
                  <Trash2 className="text-red-500 pointer-events-none shrink-0" size={18} />
                  <div className="pointer-events-none text-left">
                    <span className="text-[11px] font-bold block leading-tight">Usuń z planu</span>
                    <span className="text-[9px] text-red-500 font-medium leading-tight block">Przeciągnij tutaj lekcję z siatki</span>
                  </div>
                </div>

                {visibleSidebarAssignments.map(a => {
                  const s = subjectsMap.get(a.subjectId);
                  const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
                  const targetClass = classesMap.get(a.classId);
                  const placed = placedHours[a.id] || 0;
                  const limitAchieved = placed >= a.hoursPerWeek;
                  const isSelected = selectedAssignmentId === a.id;

                  return (
                    <div 
                      key={a.id}
                      draggable={true}
                      onDragStart={() => {
                        handleDragStart(a.id);
                      }}
                      onTouchStart={(e) => handleTouchStart(e, a.id, undefined, false)}
                      onTouchMove={(e) => handleTouchMove(e, a.id)}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => {
                        if (touchScrollDetectedRef.current || (lastScrollTimeRef.current && Date.now() - lastScrollTimeRef.current < 200)) {
                          return;
                        }
                        setSelectedAssignmentId(isSelected ? null : a.id);
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`p-2.5 rounded-xl border transition-all select-none group relative overflow-hidden touch-pan-y ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/60 shadow-md'
                          : limitAchieved 
                          ? 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300' 
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow shadow-xs'
                      }`}
                      style={{
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-bl uppercase tracking-widest leading-none">
                          Pędzel
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        {/* DEDYKOWANY UCHWYT PRZECIĄGANIA (GRIP HANDLE) */}
                        <div
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(a.id);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            handleTouchStart(e, a.id, undefined, true);
                          }}
                          onTouchMove={(e) => handleTouchMove(e, a.id)}
                          onTouchEnd={handleTouchEnd}
                          className="mt-0.5 p-1 -ml-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 rounded-md cursor-grab active:cursor-grabbing touch-none select-none transition shrink-0"
                          title="Chwyć ten uchwyt, aby przeciągnąć na plan"
                          aria-label="Uchwyt przeciągania lekcji"
                        >
                          <GripVertical size={16} />
                        </div>

                        {/* TREŚĆ KARTY */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-col truncate min-w-0">
                              {a.groupId && groupsMap.get(a.groupId) && (
                                <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded border inline-flex items-center gap-0.5 w-fit mb-0.5 ${getGroupBadgeColor(groupsMap.get(a.groupId)?.name || '')}`}>
                                  👥 {groupsMap.get(a.groupId)?.name}
                                </span>
                              )}
                              <span className="font-bold text-xs truncate" style={{ color: s?.color }}>{s?.name}</span>
                              {viewMode === 'all' && targetClass && (
                                <span className="text-[9px] text-slate-400 font-extrabold mt-0.5">Klasa: {targetClass.name}</span>
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

                          {a.linkedClassIds && a.linkedClassIds.length > 0 && (
                            <div className="text-[9px] text-indigo-700 font-bold mt-1 bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded truncate">
                              👥 Łączona: {[targetClass?.name, ...a.linkedClassIds.map(id => classesMap.get(id)?.name)].filter(Boolean).join(' + ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {visibleSidebarAssignments.length === 0 && (
                  <div className="text-center py-8 px-3 text-slate-400 text-xs">
                    {sidebarSearch ? (
                      <div>
                        <p className="font-bold text-slate-500">Brak wyników wyszukiwania</p>
                        <p className="text-[10px] mt-1 text-slate-400">Dla frazy „{sidebarSearch}” nie znaleziono żadnych przydziałów.</p>
                        <button
                          type="button"
                          onClick={() => setSidebarSearch('')}
                          className="mt-2 text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Wyczyść filtr
                        </button>
                      </div>
                    ) : hideCompletedAssignments ? (
                      <div>
                        <p className="font-bold text-slate-500">Wszystkie lekcje umieszczone!</p>
                        <p className="text-[10px] mt-1 text-slate-400">Wszystkie przydziały tej klasy są już w planie.</p>
                        <button
                          type="button"
                          onClick={() => setHideCompletedAssignments(false)}
                          className="mt-2 text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Pokaż zapełnione
                        </button>
                      </div>
                    ) : (
                      'Brak zdefiniowanych przydziałów. Dodaj je w zakładce „📋 Przypisania Godzin”.'
                    )}
                  </div>
                )}
              </div>
            </aside>
          );
        })()
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
      {/* Modal konfiguracji wybranego slotu / godziny lekcyjnej SPE */}
      {editingSpeSlot && currentStudent && (() => {
        const dayName = DAYS[editingSpeSlot.dayIdx] || `Dzień ${editingSpeSlot.dayIdx + 1}`;
        const hourObj = pl.hours[editingSpeSlot.hourIdx];
        const classKey = currentStudent.classId ? `${currentStudent.classId}|${editingSpeSlot.dayIdx}|${editingSpeSlot.hourIdx}` : '';
        const classLesson = classKey ? pl.lessons[classKey] : null;
        const classAsg = classLesson ? pl.assignments.find(a => a.id === classLesson.assignmentId) : null;
        const classSubj = classAsg ? subjectsMap.get(classAsg.subjectId) : null;
        const classTeacher = classAsg?.teacherId ? teachersMap.get(classAsg.teacherId) : null;
        const available1to1 = pl.specialAssignments.filter(a => a.studentId === currentStudent.id && !a.withClass);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Nagłówek Modalu */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                    Konfiguracja trybu realizacji godziny SPE
                  </span>
                  <h3 className="text-base font-black flex items-center gap-2 mt-0.5">
                    <span>{currentStudent.firstName} {currentStudent.lastName}</span>
                    <span className="text-xs font-normal text-slate-300">
                      • {dayName}, lekcja {hourObj?.num} ({hourObj?.start} - {hourObj?.end})
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSpeSlot(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Informacja o lekcji klasy macierzystej */}
              <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-bold flex items-center gap-1.5">
                  🏫 Lekcja oddziału ({classesMap.get(currentStudent.classId || '')?.name || 'brak klasy'}):
                </span>
                <div className="font-bold text-slate-800">
                  {classLesson && classAsg ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-indigo-700">{classSubj?.name}</span>
                      <span className="text-slate-400 font-normal">({classTeacher ? `${classTeacher.first.charAt(0)}. ${classTeacher.last}` : 'Brak naucz.'})</span>
                      {classAsg.roomId && <span className="bg-white px-1.5 py-0.2 rounded border text-[10px] text-slate-600">s. {roomsMap.get(classAsg.roomId)?.name}</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Oddział nie ma zaplanowanej lekcji w tej godzinie</span>
                  )}
                </div>
              </div>

              {/* Zawartość / Formularz wyboru trybu */}
              <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Wybierz sposób realizacji tej godziny:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Karta 1: Z klasą bez wsparcia */}
                  <div
                    onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_regular' })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      editingSpeSlot.mode === 'class_regular'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        🏫 Z klasą (ogólna)
                      </span>
                      <input
                        type="radio"
                        name="spe_mode"
                        checked={editingSpeSlot.mode === 'class_regular'}
                        onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_regular' })}
                        className="text-indigo-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Uczeń realizuje lekcję wspólnie z oddziałem bez nauczyciela wspomagającego.
                    </p>
                  </div>

                  {/* Karta 2: Z klasą ze wsparciem */}
                  <div
                    onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_support' })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      editingSpeSlot.mode === 'class_support'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
                        🤝 Wsparcie w klasie
                      </span>
                      <input
                        type="radio"
                        name="spe_mode"
                        checked={editingSpeSlot.mode === 'class_support'}
                        onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'class_support' })}
                        className="text-emerald-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Uczeń jest na lekcji z klasą z obecnością nauczyciela wspomagającego.
                    </p>
                  </div>

                  {/* Karta 3: Nauczanie indywidualne / 1:1 */}
                  <div
                    onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'individual' })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      editingSpeSlot.mode === 'individual'
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                        👤 Zajęcia 1:1 (NI/Rewa)
                      </span>
                      <input
                        type="radio"
                        name="spe_mode"
                        checked={editingSpeSlot.mode === 'individual'}
                        onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'individual' })}
                        className="text-purple-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Lekcja zostaje zastąpiona nauczaniem 1:1, rewalidacją lub terapią.
                    </p>
                  </div>

                  {/* Karta 4: Zwolnienie z lekcji */}
                  <div
                    onClick={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'exempt' })}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      editingSpeSlot.mode === 'exempt'
                        ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                        ⛔ Zwolnienie z lekcji
                      </span>
                      <input
                        type="radio"
                        name="spe_mode"
                        checked={editingSpeSlot.mode === 'exempt'}
                        onChange={() => setEditingSpeSlot({ ...editingSpeSlot, mode: 'exempt' })}
                        className="text-amber-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Zwolnienie (np. z II języka, WF) lub pobyt w gabinecie / świetlicy.
                    </p>
                  </div>
                </div>

                {/* Sekcja szczegółowa w zależności od wybranego trybu */}
                {editingSpeSlot.mode === 'class_support' && (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                    <label className="block text-[10.5px] font-black text-emerald-950 uppercase tracking-wider">
                      Wybierz nauczyciela wspomagającego dla tej godziny:
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editingSpeSlot.supportTeacherId || ''}
                      onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, supportTeacherId: e.target.value })}
                    >
                      <option value="">-- Wybierz nauczyciela --</option>
                      {currentStudent.supportTeacherIds && currentStudent.supportTeacherIds.length > 0 && (
                        <optgroup label="⭐ Wyznaczona kadra ucznia">
                          {currentStudent.supportTeacherIds.map(tId => {
                            const t = teachersMap.get(tId);
                            if (!t) return null;
                            return <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>;
                          })}
                        </optgroup>
                      )}
                      <optgroup label="Pozostali nauczyciele">
                        {pl.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {editingSpeSlot.mode === 'individual' && (
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10.5px] font-black text-purple-950 uppercase tracking-wider">
                        Zajęcia 1:1 dla ucznia:
                      </label>
                    </div>

                    {available1to1.length > 0 ? (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-purple-900">
                          Wybierz ze zdefiniowanych przydziałów 1:1:
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                          value={editingSpeSlot.specialAssignmentId || ''}
                          onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, specialAssignmentId: e.target.value })}
                        >
                          <option value="">-- Wybierz przydział 1:1 --</option>
                          {available1to1.map(asg => {
                            const s = subjectsMap.get(asg.subjectId);
                            const t = teachersMap.get(asg.teacherId || '');
                            return (
                              <option key={asg.id} value={asg.id}>
                                {s?.name} • Prow: {t ? `${t.first} ${t.last} (${t.abbr})` : 'Brak'} ({asg.supportType === 'rewa' ? 'Rewalidacja' : 'NI'})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="text-[10px] text-purple-800 font-bold bg-purple-100/60 p-2 rounded-lg">
                          💡 Brak wcześniej utworzonych przydziałów 1:1. Zdefiniuj zajęcia poniżej:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9.5px] font-bold text-purple-900 mb-1">Przedmiot</label>
                            <select
                              className="w-full px-2.5 py-1.5 border border-purple-200 rounded-lg text-xs bg-white font-bold"
                              value={editingSpeSlot.customSubjectId || ''}
                              onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, customSubjectId: e.target.value })}
                            >
                              {pl.subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-purple-900 mb-1">Nauczyciel</label>
                            <select
                              className="w-full px-2.5 py-1.5 border border-purple-200 rounded-lg text-xs bg-white font-bold"
                              value={editingSpeSlot.customTeacherId || ''}
                              onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, customTeacherId: e.target.value })}
                            >
                              {pl.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.first} {t.last} ({t.abbr})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editingSpeSlot.mode === 'exempt' && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in">
                    <label className="block text-[10.5px] font-black text-amber-950 uppercase tracking-wider">
                      Powód zwolnienia z lekcji:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Zwolnienie z II języka obcego',
                        'Zwolnienie z wychowania fizycznego',
                        'Pobyt w gabinecie terapeutycznym',
                        'Pobyt w świetlicy szkolnej',
                        'Zalecenie orzeczenia PPP'
                      ].map(template => (
                        <button
                          key={template}
                          type="button"
                          onClick={() => setEditingSpeSlot({ ...editingSpeSlot, exemptReason: template })}
                          className={`text-[9.5px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                            editingSpeSlot.exemptReason === template
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                      value={editingSpeSlot.exemptReason || ''}
                      onChange={(e) => setEditingSpeSlot({ ...editingSpeSlot, exemptReason: e.target.value })}
                      placeholder="Wpisz lub wybierz powód zwolnienia..."
                    />
                  </div>
                )}
              </div>

              {/* Stopka Akcji Modalu */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleResetSpeSlot(editingSpeSlot.dayIdx, editingSpeSlot.hourIdx);
                    setEditingSpeSlot(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
                >
                  🔄 Przywróć stan domyślny
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSpeSlot(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSpeSlot(editingSpeSlot);
                      setEditingSpeSlot(null);
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer"
                  >
                    Zapisz zmiany
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
