import React, { useState, useMemo } from 'react';
import { 
  AppState, SchedData, PlanVariant, PlanVariantTag, PlanDiffItem, Lesson, Class, Teacher, ClassRoom 
} from '../types';
import { 
  Layers, GitCompare, Plus, Trash2, Edit2, Copy, Check, X, Download, Upload, 
  ArrowRight, ArrowLeftRight, Sparkles, FileText, Printer, Eye, Tag, Calendar, 
  CheckCircle, AlertCircle, Search, RefreshCw, Clock, Building, User, BookOpen, 
  HelpCircle, ShieldCheck, CheckCheck
} from 'lucide-react';
import { uid, downloadFile } from '../utils';

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

interface PlanVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  schedData: SchedData;
  planVariants: PlanVariant[];
  activeVariantId: string;
  onSwitchVariant: (variantId: string) => void;
  onSaveVariants: (variants: PlanVariant[]) => void;
  onUpdateActiveVariant: (updatedVariant: PlanVariant) => void;
  onApplySelectiveClassSync?: (sourceVariantId: string, targetVariantId: string, classId: string) => void;
  onApplyTeacherDutySync?: (sourceVariantId: string, targetVariantId: string, teacherAbbr: string) => void;
  onShowNotification?: (text: string, type?: 'info' | 'success' | 'err') => void;
}

const TAG_CONFIG: Record<PlanVariantTag, { label: string; bg: string; text: string; border: string }> = {
  semestr_1: { label: 'Semestr I', bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' },
  semestr_2: { label: 'Semestr II', bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' },
  roboczy: { label: 'Wariant roboczy', bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-200' },
  awaryjny: { label: 'Wariant awaryjny', bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200' },
  praktyki: { label: 'Praktyki / Staże', bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', border: 'border-purple-200' },
  inna: { label: 'Własny wariant', bg: 'bg-slate-100 text-slate-700', text: 'text-slate-700', border: 'border-slate-300' }
};

const COLOR_PRESETS = [
  '#3b82f6', // Niebieski
  '#10b981', // Szmaragdowy
  '#8b5cf6', // Fioletowy
  '#f59e0b', // Bursztynowy
  '#ef4444', // Czerwony
  '#06b6d4', // Turkusowy
  '#ec4899', // Różowy
  '#64748b'  // Łupkowy
];

export default function PlanVariantsModal({
  isOpen,
  onClose,
  appState,
  schedData,
  planVariants,
  activeVariantId,
  onSwitchVariant,
  onSaveVariants,
  onUpdateActiveVariant,
  onApplySelectiveClassSync,
  onApplyTeacherDutySync,
  onShowNotification
}: PlanVariantsModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'diff' | 'create'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for creating a new variant
  const [newVarName, setNewVarName] = useState('');
  const [newVarTag, setNewVarTag] = useState<PlanVariantTag>('semestr_2');
  const [newVarColor, setNewVarColor] = useState(COLOR_PRESETS[1]);
  const [newVarDesc, setNewVarDesc] = useState('');
  const [newVarValidFrom, setNewVarValidFrom] = useState('');
  const [newVarValidTo, setNewVarValidTo] = useState('');
  const [newVarSourceMode, setNewVarSourceMode] = useState<'clone_active' | 'clone_other' | 'blank'>('clone_active');
  const [newVarSourceOtherId, setNewVarSourceOtherId] = useState<string>('');

  // Editing modal state
  const [editingVariant, setEditingVariant] = useState<PlanVariant | null>(null);

  // Helper for validity schedule status
  const getVariantScheduleStatus = (v: PlanVariant) => {
    const today = new Date().toISOString().slice(0, 10);
    if (!v.validFrom && !v.validTo) {
      return { status: 'continuous', label: 'Ciągły / Bezterminowy', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (v.validFrom && today < v.validFrom) {
      return { status: 'future', label: `Zaplanowany (od ${v.validFrom})`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (v.validTo && today > v.validTo) {
      return { status: 'expired', label: `Archiwalny (do ${v.validTo})`, color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { status: 'current', label: 'Obecnie obowiązujący', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold' };
  };

  // Diff comparison states
  const [diffVariantAId, setDiffVariantAId] = useState<string>(activeVariantId);
  const [diffVariantBId, setDiffVariantBId] = useState<string>('');
  const [diffMode, setDiffMode] = useState<'class' | 'teacher' | 'room' | 'table'>('class');
  const [diffSelectedClassId, setDiffSelectedClassId] = useState<string>('');
  const [diffSelectedTeacherId, setDiffSelectedTeacherId] = useState<string>('');
  const [diffSelectedRoomId, setDiffSelectedRoomId] = useState<string>('');
  const [diffFilterOnlyChanged, setDiffFilterOnlyChanged] = useState<boolean>(true);

  const pl = appState.planLekcji;

  // Initialize comparison targets when opening or changing variants
  React.useEffect(() => {
    if (planVariants.length > 0) {
      if (!diffVariantAId || !planVariants.some(v => v.id === diffVariantAId)) {
        setDiffVariantAId(activeVariantId || planVariants[0].id);
      }
      if (!diffVariantBId || diffVariantBId === diffVariantAId || !planVariants.some(v => v.id === diffVariantBId)) {
        const other = planVariants.find(v => v.id !== diffVariantAId);
        if (other) {
          setDiffVariantBId(other.id);
        }
      }
    }
  }, [planVariants, activeVariantId, diffVariantAId, diffVariantBId]);

  // Set default selected class for diff
  React.useEffect(() => {
    if (pl.classes.length > 0 && !diffSelectedClassId) {
      setDiffSelectedClassId(pl.classes[0].id);
    }
    if (pl.teachers.length > 0 && !diffSelectedTeacherId) {
      setDiffSelectedTeacherId(pl.teachers[0].id);
    }
    if (pl.rooms.length > 0 && !diffSelectedRoomId) {
      setDiffSelectedRoomId(pl.rooms[0].id);
    }
  }, [pl.classes, pl.teachers, pl.rooms, diffSelectedClassId, diffSelectedTeacherId, diffSelectedRoomId]);

  const activeVariant = useMemo(() => {
    return planVariants.find(v => v.id === activeVariantId) || planVariants[0];
  }, [planVariants, activeVariantId]);

  const variantA = useMemo(() => {
    return planVariants.find(v => v.id === diffVariantAId);
  }, [planVariants, diffVariantAId]);

  const variantB = useMemo(() => {
    return planVariants.find(v => v.id === diffVariantBId);
  }, [planVariants, diffVariantBId]);

  // Helper to get lesson details safely
  const getLessonDetails = (lesson: Lesson | undefined, variant: PlanVariant | undefined) => {
    if (!lesson) return null;
    const assignmentsPool = variant?.data.assignments || pl.assignments;
    const asg = assignmentsPool.find(a => a.id === lesson.assignmentId);
    const sub = pl.subjects.find(s => s.id === asg?.subjectId);
    const tch = pl.teachers.find(t => t.id === asg?.teacherId);
    const room = pl.rooms.find(r => r.id === asg?.roomId);
    const supp = pl.teachers.find(t => t.id === lesson.supportTeacherId);

    return {
      lesson,
      assignment: asg,
      subjectName: sub ? sub.name : (asg?.subjectId || 'Lekcja'),
      subjectShort: sub ? (sub.short || sub.name.substring(0, 4)) : 'Lek',
      teacherName: tch ? `${tch.first} ${tch.last}` : '',
      teacherAbbr: tch ? (tch.abbr || tch.last) : '',
      roomName: room ? room.name : '',
      supportTeacherAbbr: supp ? (supp.abbr || supp.last) : ''
    };
  };

  // Compute all differences between Variant A and Variant B
  const diffItems = useMemo<PlanDiffItem[]>(() => {
    if (!variantA || !variantB) return [];

    const results: PlanDiffItem[] = [];
    const lessonsA = variantA.data.lessons || {};
    const lessonsB = variantB.data.lessons || {};

    pl.classes.forEach(cls => {
      DAYS.forEach((_, dayIdx) => {
        pl.hours.forEach((h, hIdx) => {
          const slotNum = h.num ?? (hIdx + 1);
          // Standard key patterns
          const key1 = `${cls.id}|${dayIdx}|${slotNum}`;
          const key2 = `${cls.id}|${dayIdx}|${hIdx}`;

          const lessonA = lessonsA[key1] || lessonsA[key2];
          const lessonB = lessonsB[key1] || lessonsB[key2];

          if (!lessonA && !lessonB) return;

          const detA = getLessonDetails(lessonA, variantA);
          const detB = getLessonDetails(lessonB, variantB);

          let status: PlanDiffItem['status'] | null = null;

          if (!lessonA && lessonB) {
            status = 'added';
          } else if (lessonA && !lessonB) {
            status = 'removed';
          } else if (lessonA && lessonB && detA && detB) {
            const subDiff = detA.assignment?.subjectId !== detB.assignment?.subjectId;
            const tchDiff = detA.assignment?.teacherId !== detB.assignment?.teacherId;
            const roomDiff = detA.assignment?.roomId !== detB.assignment?.roomId;
            const suppDiff = lessonA.supportTeacherId !== lessonB.supportTeacherId;

            if (subDiff) {
              status = 'changed';
            } else if (tchDiff && !roomDiff && !suppDiff) {
              status = 'teacher_changed';
            } else if (roomDiff && !tchDiff && !suppDiff) {
              status = 'room_changed';
            } else if (tchDiff || roomDiff || suppDiff) {
              status = 'changed';
            }
          }

          if (status) {
            results.push({
              id: `${cls.id}_${dayIdx}_${hIdx}`,
              classId: cls.id,
              className: cls.name,
              day: dayIdx,
              hour: slotNum,
              hourLabel: `${h.start} - ${h.end}`,
              status,
              variantALesson: lessonA || null,
              variantBLesson: lessonB || null,
              details: {
                subjectA: detA?.subjectName,
                subjectB: detB?.subjectName,
                teacherA: detA?.teacherAbbr,
                teacherB: detB?.teacherAbbr,
                roomA: detA?.roomName,
                roomB: detB?.roomName
              }
            });
          }
        });
      });
    });

    return results;
  }, [variantA, variantB, pl.classes, pl.hours, pl.assignments, pl.subjects, pl.teachers, pl.rooms]);

  // Differences grouped by class
  const diffsByClass = useMemo(() => {
    const map = new Map<string, PlanDiffItem[]>();
    pl.classes.forEach(c => map.set(c.id, []));
    diffItems.forEach(item => {
      const arr = map.get(item.classId) || [];
      arr.push(item);
      map.set(item.classId, arr);
    });
    return map;
  }, [diffItems, pl.classes]);

  // Differences grouped by teacher
  const diffsByTeacher = useMemo(() => {
    const map = new Map<string, PlanDiffItem[]>();
    pl.teachers.forEach(t => map.set(t.id, []));
    diffItems.forEach(item => {
      const tchA = variantA?.data.assignments?.find(a => a.id === item.variantALesson?.assignmentId)?.teacherId ||
                   pl.assignments.find(a => a.id === item.variantALesson?.assignmentId)?.teacherId;
      const tchB = variantB?.data.assignments?.find(a => a.id === item.variantBLesson?.assignmentId)?.teacherId ||
                   pl.assignments.find(a => a.id === item.variantBLesson?.assignmentId)?.teacherId;

      if (tchA) {
        const arr = map.get(tchA) || [];
        arr.push(item);
        map.set(tchA, arr);
      }
      if (tchB && tchB !== tchA) {
        const arr = map.get(tchB) || [];
        arr.push(item);
        map.set(tchB, arr);
      }
    });
    return map;
  }, [diffItems, pl.teachers, variantA, variantB, pl.assignments]);

  // Handle creating a new variant
  const handleCreateVariant = (switchAfterCreate: boolean = false) => {
    if (!newVarName.trim()) {
      onShowNotification?.('Podaj nazwę nowego wariantu planu.', 'err');
      return;
    }

    let baseData = {
      lessons: JSON.parse(JSON.stringify(pl.lessons)),
      schedData: JSON.parse(JSON.stringify(schedData)),
      assignments: JSON.parse(JSON.stringify(pl.assignments)),
      specialLessons: JSON.parse(JSON.stringify(pl.specialLessons || {})),
      specialAbsences: JSON.parse(JSON.stringify(pl.specialAbsences || {})),
      spePlan: JSON.parse(JSON.stringify(pl.spePlan || { slotAssignments: [] })),
      dyzury: JSON.parse(JSON.stringify(appState.dyzury?.harmonogram || {}))
    };

    if (newVarSourceMode === 'clone_other') {
      const source = planVariants.find(v => v.id === newVarSourceOtherId);
      if (source) {
        baseData = JSON.parse(JSON.stringify(source.data));
      }
    } else if (newVarSourceMode === 'blank') {
      baseData = {
        lessons: {},
        schedData: {},
        assignments: JSON.parse(JSON.stringify(pl.assignments)),
        specialLessons: {},
        specialAbsences: {},
        spePlan: { slotAssignments: [] },
        dyzury: {}
      };
    }

    const createdVariant: PlanVariant = {
      id: `var_${Date.now()}_${uid()}`,
      name: newVarName.trim(),
      tag: newVarTag,
      color: newVarColor,
      description: newVarDesc.trim() || undefined,
      validFrom: newVarValidFrom.trim() || undefined,
      validTo: newVarValidTo.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: baseData,
      stats: {
        totalLessons: Object.keys(baseData.lessons || {}).length,
        classesCount: pl.classes.length,
        teachersCount: pl.teachers.length,
        roomsUsedCount: pl.rooms.length
      }
    };

    const updated = [...planVariants, createdVariant];
    onSaveVariants(updated);
    onShowNotification?.(`Utworzono wariant: „${createdVariant.name}”.`, 'success');

    // Reset form
    setNewVarName('');
    setNewVarDesc('');
    setNewVarValidFrom('');
    setNewVarValidTo('');
    setActiveTab('list');

    if (switchAfterCreate) {
      onSwitchVariant(createdVariant.id);
    }
  };

  // Handle duplicating an existing variant
  const handleDuplicateVariant = (variant: PlanVariant) => {
    const copy: PlanVariant = {
      id: `var_${Date.now()}_${uid()}`,
      name: `${variant.name} (Kopia)`,
      tag: variant.tag,
      color: variant.color,
      description: variant.description ? `${variant.description} — zduplikowano` : undefined,
      validFrom: variant.validFrom,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(variant.data)),
      stats: variant.stats ? { ...variant.stats } : undefined
    };

    onSaveVariants([...planVariants, copy]);
    onShowNotification?.(`Zduplikowano wariant „${variant.name}”.`, 'success');
  };

  // Handle saving edits
  const handleSaveEdit = () => {
    if (!editingVariant) return;
    if (!editingVariant.name.trim()) {
      onShowNotification?.('Nazwa wariantu nie może być pusta.', 'err');
      return;
    }

    const updated = planVariants.map(v => {
      if (v.id === editingVariant.id) {
        return {
          ...editingVariant,
          updatedAt: new Date().toISOString()
        };
      }
      return v;
    });

    onSaveVariants(updated);
    if (editingVariant.id === activeVariantId) {
      onUpdateActiveVariant(editingVariant);
    }
    setEditingVariant(null);
    onShowNotification?.('Zaktualizowano dane wariantu.', 'success');
  };

  // Handle delete
  const handleDeleteVariant = (variantId: string) => {
    if (planVariants.length <= 1) {
      onShowNotification?.('Nie można usunąć jedynego wariantu planu.', 'err');
      return;
    }
    if (variantId === activeVariantId) {
      onShowNotification?.('Nie można usunąć aktywnego wariantu. Najpierw przełącz się na inny wariant.', 'err');
      return;
    }

    const target = planVariants.find(v => v.id === variantId);
    if (!confirm(`Czy na pewno chcesz trwale usunąć wariant „${target?.name || 'wybrany'}”?`)) {
      return;
    }

    const updated = planVariants.filter(v => v.id !== variantId);
    onSaveVariants(updated);
    onShowNotification?.('Wariant został pomyślnie usunięty.', 'info');
  };

  // Export variant to JSON
  const handleExportVariant = (variant: PlanVariant) => {
    const filename = `SalePlan_Wariant_${variant.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(JSON.stringify(variant, null, 2), filename, 'application/json');
    onShowNotification?.(`Wyeksportowano wariant „${variant.name}”.`, 'success');
  };

  // Import variant from JSON
  const handleImportVariant = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as PlanVariant;
        if (!parsed || !parsed.name || !parsed.data || !parsed.data.lessons) {
          throw new Error('Plik nie zawiera poprawnej struktury wariantu SalePlan Pro.');
        }

        const newVar: PlanVariant = {
          ...parsed,
          id: `var_${Date.now()}_${uid()}`,
          name: `${parsed.name} (Zaimportowany)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        onSaveVariants([...planVariants, newVar]);
        onShowNotification?.(`Zaimportowano wariant: „${newVar.name}”.`, 'success');
      } catch (err: any) {
        alert(`Błąd podczas importu wariantu: ${err?.message || 'Niepoprawny format pliku'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Selective sync for one class: Copy class schedule from B to A (or vice versa)
  const handleSyncClass = (fromVar: PlanVariant, toVar: PlanVariant, classId: string) => {
    const targetClass = pl.classes.find(c => c.id === classId);
    if (!targetClass) return;

    if (!confirm(`Czy na pewno chcesz zastąpić rozkład lekcji klasy ${targetClass.name} w wariancie „${toVar.name}” danymi z wariantu „${fromVar.name}”?`)) {
      return;
    }

    if (onApplySelectiveClassSync) {
      onApplySelectiveClassSync(fromVar.id, toVar.id, classId);
    } else {
      // Fallback local sync
      const lessonsFrom = fromVar.data.lessons || {};
      const newLessonsTo = { ...toVar.data.lessons };

      // Remove current class lessons from target
      Object.keys(newLessonsTo).forEach(k => {
        if (k.startsWith(`${classId}|`)) {
          delete newLessonsTo[k];
        }
      });

      // Copy from source
      Object.entries(lessonsFrom).forEach(([k, l]) => {
        if (k.startsWith(`${classId}|`)) {
          newLessonsTo[k] = JSON.parse(JSON.stringify(l));
        }
      });

      const updatedToVar: PlanVariant = {
        ...toVar,
        data: {
          ...toVar.data,
          lessons: newLessonsTo
        },
        updatedAt: new Date().toISOString()
      };

      const updatedVariants = planVariants.map(v => v.id === toVar.id ? updatedToVar : v);
      onSaveVariants(updatedVariants);

      if (toVar.id === activeVariantId) {
        onUpdateActiveVariant(updatedToVar);
      }
      onShowNotification?.(`Przeniesiono rozkład klasy ${targetClass.name} z „${fromVar.name}” do „${toVar.name}”.`, 'success');
    }
  };

  // Selective sync for teacher duties: Copy duties for one teacher from B to A (or vice versa)
  const handleSyncTeacherDuty = (fromVar: PlanVariant, toVar: PlanVariant, teacherAbbr: string) => {
    const teacher = pl.teachers.find(t => t.abbr.toLowerCase() === teacherAbbr.toLowerCase());
    const teacherName = teacher ? `${teacher.first} ${teacher.last} (${teacher.abbr})` : teacherAbbr;

    if (!confirm(`Czy na pewno chcesz skopiować dyżury nauczyciela ${teacherName} z wariantu „${fromVar.name}” do wariantu „${toVar.name}”?`)) {
      return;
    }

    if (onApplyTeacherDutySync) {
      onApplyTeacherDutySync(fromVar.id, toVar.id, teacherAbbr);
    } else {
      // Fallback local sync
      const dutiesFrom = fromVar.data.dyzury || {};
      const dutiesTo = { ...(toVar.data.dyzury || {}) };

      // Remove existing duties of this teacher in target variant
      Object.keys(dutiesTo).forEach(k => {
        if (dutiesTo[k]?.teacherAbbr?.toLowerCase() === teacherAbbr.toLowerCase()) {
          delete dutiesTo[k];
        }
      });

      // Copy duties from source variant
      let copiedCount = 0;
      Object.entries(dutiesFrom).forEach(([key, entry]) => {
        if (entry && entry.teacherAbbr?.toLowerCase() === teacherAbbr.toLowerCase()) {
          dutiesTo[key] = JSON.parse(JSON.stringify(entry));
          copiedCount++;
        }
      });

      const updatedToVar: PlanVariant = {
        ...toVar,
        data: {
          ...toVar.data,
          dyzury: dutiesTo
        },
        updatedAt: new Date().toISOString()
      };

      const updatedVariants = planVariants.map(v => v.id === toVar.id ? updatedToVar : v);
      onSaveVariants(updatedVariants);

      if (toVar.id === activeVariantId) {
        onUpdateActiveVariant(updatedToVar);
      }
      onShowNotification?.(`Skopiowano ${copiedCount} dyżurów nauczyciela ${teacherName} z „${fromVar.name}” do „${toVar.name}”.`, 'success');
    }
  };

  // Print diff report
  const handlePrintDiffReport = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div 
        id="plan-variants-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Wariantowanie i Scenariusze Planu
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Semestry I / II & Diff
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Równoległe wersje rozkładu zajęć, porównywarka różnic i bezpieczne planowanie kolejnego semestru
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Variant Indicator */}
            {activeVariant && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeVariant.color }} />
                <span className="text-xs font-bold text-slate-700 max-w-[160px] truncate">
                  {activeVariant.name}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Aktywny
                </span>
              </div>
            )}
            <button
              id="close-variants-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Zamknij (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL TABS NAVIGATION */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              id="tab-variants-list"
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Lista Wariantów ({planVariants.length})</span>
            </button>

            <button
              id="tab-variants-diff"
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'diff'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-4 h-4 text-indigo-600" />
              <span>Porównywarka Planów (Diff)</span>
              {diffItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                  {diffItems.length}
                </span>
              )}
            </button>

            <button
              id="tab-variants-create"
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Nowy Wariant / Semestr</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Importuj wariant JSON</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportVariant} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: LISTA WARIANTÓW */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              {/* Informative Banner */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    Jak działa bezpieczne wariantowanie planu lekcji?
                  </p>
                  <p className="text-blue-800/90 leading-relaxed">
                    Każdy wariant przechowuje niezależny rozkład lekcji, dyżurów i slotów SPE, zachowując wspólną bazę szkoły (klasy, nauczycieli, sale). 
                    Możesz w każdej chwili przełączać się między semestrami bez ryzyka utraty wprowadzonych zmian. Przed każdym przełączeniem stan aktywnego wariantu jest automatycznie archiwizowany.
                  </p>
                </div>
              </div>

              {/* SCHEDULE / TIMELINE CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800">
                        Harmonogram i Kalendarium Wariantów
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Porządek czasowy obowiązywania planów w roku szkolnym oraz automatyczna detekcja aktywnego terminu.
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                    Dzisiaj: <span className="text-indigo-600 font-extrabold">{new Date().toLocaleDateString('pl-PL', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {planVariants.map(v => {
                    const sched = getVariantScheduleStatus(v);
                    const isCurrent = v.id === activeVariantId;
                    return (
                      <div 
                        key={`sched_${v.id}`}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent 
                            ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200' 
                            : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                            <span className="text-xs font-black text-slate-800 truncate">{v.name}</span>
                          </div>
                          <span className={`text-[9.5px] px-2 py-0.5 rounded-full border shrink-0 ${sched.color}`}>
                            {sched.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {v.validFrom && v.validTo 
                              ? `${v.validFrom} — ${v.validTo}` 
                              : v.validFrom 
                                ? `Od: ${v.validFrom}` 
                                : v.validTo 
                                  ? `Do: ${v.validTo}` 
                                  : 'Termin nieokreślony'}
                          </span>
                        </div>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onSwitchVariant(v.id)}
                            className="mt-2 text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <span>Aktywuj ten wariant</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Variants Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planVariants.map(variant => {
                  const isActive = variant.id === activeVariantId;
                  const tagInfo = TAG_CONFIG[variant.tag] || TAG_CONFIG.inna;
                  const lessonsCount = Object.keys(variant.data?.lessons || {}).length;

                  return (
                    <div
                      key={variant.id}
                      className={`relative bg-white rounded-2xl border transition-all duration-150 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                        isActive 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-indigo-50/50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top color bar */}
                      <div 
                        className="h-1.5 w-full" 
                        style={{ backgroundColor: variant.color || '#3b82f6' }} 
                      />

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        {/* Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${tagInfo.bg} ${tagInfo.border}`}>
                              {tagInfo.label}
                            </span>
                            {isActive ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                                <CheckCircle className="w-3 h-3" />
                                Aktywny
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSwitchVariant(variant.id)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors"
                              >
                                <span>Przełącz na ten</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <h3 className="text-base font-extrabold text-slate-800 mt-2 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: variant.color }} />
                            <span>{variant.name}</span>
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {(variant.validFrom || variant.validTo) ? (
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                <span>
                                  {variant.validFrom && variant.validTo 
                                    ? `${variant.validFrom} — ${variant.validTo}`
                                    : variant.validFrom 
                                      ? `Od: ${variant.validFrom}`
                                      : `Do: ${variant.validTo}`}
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>Bezterminowy</span>
                              </div>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getVariantScheduleStatus(variant).color}`}>
                              {getVariantScheduleStatus(variant).label}
                            </span>
                          </div>

                          {variant.description && (
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {variant.description}
                            </p>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Zaplanowane lekcje</span>
                            <span className="text-sm font-black text-slate-700">{lessonsCount} godz.</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ostatnia edycja</span>
                            <span className="text-[11px] font-bold text-slate-600 truncate block">
                              {new Date(variant.updatedAt).toLocaleDateString('pl-PL')}
                            </span>
                          </div>
                        </div>

                        {/* Actions bar */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDiffVariantAId(activeVariantId);
                                setDiffVariantBId(variant.id);
                                setActiveTab('diff');
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Porównaj z bieżącym planem (Diff)"
                            >
                              <GitCompare className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateVariant(variant)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Duplikuj wariant"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVariant({ ...variant })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edytuj nazwę i notatkę"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportVariant(variant)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Eksportuj do JSON"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>

                          {!isActive && planVariants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(variant.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Usuń wariant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PORÓWNYWARKA PLANÓW (DIFF A <-> B) */}
          {activeTab === 'diff' && (
            <div className="space-y-6">
              {/* Variant Selector Bar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Variant A Selector */}
                  <div className="flex-1 md:w-56">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Wariant A (Baza / Wzorzec):
                    </label>
                    <select
                      value={diffVariantAId}
                      onChange={e => setDiffVariantAId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      {planVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.id === activeVariantId ? '(Aktywny)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const temp = diffVariantAId;
                        setDiffVariantAId(diffVariantBId);
                        setDiffVariantBId(temp);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                      title="Zamień kolejność porównania (A ↔ B)"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Variant B Selector */}
                  <div className="flex-1 md:w-56">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Wariant B (Porównywany):
                    </label>
                    <select
                      value={diffVariantBId}
                      onChange={e => setDiffVariantBId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      {planVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.id === activeVariantId ? '(Aktywny)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Diff Summary Stats */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                    Łącznie różnic: <span className="font-black text-indigo-600">{diffItems.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintDiffReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Drukuj raport</span>
                  </button>
                </div>
              </div>

              {/* View Sub-tabs */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDiffMode('class')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      diffMode === 'class' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Oddziały (Klasy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiffMode('teacher')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      diffMode === 'teacher' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nauczyciele
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiffMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      diffMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wykaz zbiorczy zmian
                  </button>
                </div>

                {/* Entity Filter */}
                {diffMode === 'class' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Wybrany oddział:</span>
                    <select
                      value={diffSelectedClassId}
                      onChange={e => setDiffSelectedClassId(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800"
                    >
                      {pl.classes.map(cls => {
                        const classDiffs = diffsByClass.get(cls.id) || [];
                        return (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} {classDiffs.length > 0 ? `(${classDiffs.length} zmian)` : '(brak zmian)'}
                          </option>
                        );
                      })}
                    </select>

                    {/* Selective Sync Buttons */}
                    {variantA && variantB && diffSelectedClassId && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSyncClass(variantB, variantA, diffSelectedClassId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Zastąp plan wybranej klasy w wariancie A planem z wariantu B"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Przenieś rozkład z B do A</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncClass(variantA, variantB, diffSelectedClassId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Zastąp plan wybranej klasy w wariancie B planem z wariantu A"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                          <span>Przenieś z A do B</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {diffMode === 'teacher' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500">Nauczyciel:</span>
                    <select
                      value={diffSelectedTeacherId}
                      onChange={e => setDiffSelectedTeacherId(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800"
                    >
                      {pl.teachers.map(t => {
                        const tchDiffs = diffsByTeacher.get(t.id) || [];
                        return (
                          <option key={t.id} value={t.id}>
                            {t.first} {t.last} ({t.abbr}) {tchDiffs.length > 0 ? `(${tchDiffs.length} zmian)` : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Selective Duty Sync Button */}
                    {variantA && variantB && diffSelectedTeacherId && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const teacher = pl.teachers.find(t => t.id === diffSelectedTeacherId);
                            if (teacher) handleSyncTeacherDuty(variantB, variantA, teacher.abbr);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Skopiuj dyżury tego nauczyciela z wariantu B do wariantu A"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Skopiuj dyżury z B do A</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const teacher = pl.teachers.find(t => t.id === diffSelectedTeacherId);
                            if (teacher) handleSyncTeacherDuty(variantA, variantB, teacher.abbr);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Skopiuj dyżury tego nauczyciela z wariantu A do wariantu B"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                          <span>Skopiuj dyżury z A do B</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* VIEW 1: TIMETABLE GRID FOR SELECTED CLASS */}
              {diffMode === 'class' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Porównanie planu klasy: {pl.classes.find(c => c.id === diffSelectedClassId)?.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Wariant A: <span className="font-bold text-slate-700">{variantA?.name}</span> vs Wariant B: <span className="font-bold text-indigo-700">{variantB?.name}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
                        Lekcja dodana w B
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <span className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" />
                        Lekcja usunięta w B
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
                        Zmiana przedmiotu/sali
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <th className="p-3 w-16 text-center">Nr</th>
                          <th className="p-3 w-28 text-center">Godziny</th>
                          {DAYS.map((dayName, dIdx) => (
                            <th key={dIdx} className="p-3 text-center">
                              {dayName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {pl.hours.map((h, hIdx) => {
                          const slotNum = h.num ?? (hIdx + 1);

                          return (
                            <tr key={hIdx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-black text-slate-400 text-center bg-slate-50/50">
                                {slotNum}
                              </td>
                              <td className="p-3 text-slate-500 text-center font-mono text-[11px] bg-slate-50/50">
                                {h.start} - {h.end}
                              </td>
                              {DAYS.map((_, dayIdx) => {
                                const key1 = `${diffSelectedClassId}|${dayIdx}|${slotNum}`;
                                const key2 = `${diffSelectedClassId}|${dayIdx}|${hIdx}`;

                                const lessonA = variantA?.data.lessons?.[key1] || variantA?.data.lessons?.[key2];
                                const lessonB = variantB?.data.lessons?.[key1] || variantB?.data.lessons?.[key2];

                                const detA = getLessonDetails(lessonA, variantA);
                                const detB = getLessonDetails(lessonB, variantB);

                                const isSame = (!lessonA && !lessonB) || (
                                  lessonA && lessonB && 
                                  detA?.assignment?.subjectId === detB?.assignment?.subjectId &&
                                  detA?.assignment?.teacherId === detB?.assignment?.teacherId &&
                                  detA?.assignment?.roomId === detB?.assignment?.roomId
                                );

                                if (!lessonA && !lessonB) {
                                  return (
                                    <td key={dayIdx} className="p-2.5 text-center text-slate-300 font-mono text-[11px]">
                                      —
                                    </td>
                                  );
                                }

                                if (isSame && detA) {
                                  return (
                                    <td key={dayIdx} className="p-2.5 text-center bg-slate-50/30">
                                      <div className="font-extrabold text-slate-700">{detA.subjectName}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">
                                        {detA.teacherAbbr} {detA.roomName ? `· s. ${detA.roomName}` : ''}
                                      </div>
                                    </td>
                                  );
                                }

                                // Difference Cell
                                return (
                                  <td key={dayIdx} className="p-2 text-center bg-amber-50/30 border border-amber-200/50 rounded-lg">
                                    <div className="space-y-1.5">
                                      {/* State in A */}
                                      <div className="p-1.5 rounded-md bg-rose-50 border border-rose-200 text-left">
                                        <div className="text-[9px] font-black uppercase tracking-wider text-rose-500">
                                          Wariant A:
                                        </div>
                                        {detA ? (
                                          <div className="text-[11px] font-bold text-rose-900 leading-tight">
                                            {detA.subjectName}
                                            <span className="block text-[9.5px] text-rose-600 font-normal">
                                              {detA.teacherAbbr} {detA.roomName ? `· s. ${detA.roomName}` : ''}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-rose-400 italic">Brak lekcji (okienko)</span>
                                        )}
                                      </div>

                                      {/* State in B */}
                                      <div className="p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-left">
                                        <div className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                          Wariant B:
                                        </div>
                                        {detB ? (
                                          <div className="text-[11px] font-bold text-emerald-900 leading-tight">
                                            {detB.subjectName}
                                            <span className="block text-[9.5px] text-emerald-700 font-normal">
                                              {detB.teacherAbbr} {detB.roomName ? `· s. ${detB.roomName}` : ''}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-emerald-400 italic">Brak lekcji (okienko)</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: FULL CHANGES TABLE (WYKAZ ZBIORCZY) */}
              {diffMode === 'table' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Zbiorczy wykaz różnic pomiędzy wariantami
                      </h4>
                      <p className="text-xs text-slate-500">
                        Łączna liczba wykrytych odchyleń w planie szkoły: <span className="font-black text-indigo-600">{diffItems.length}</span>
                      </p>
                    </div>
                  </div>

                  {diffItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-extrabold text-slate-700">Warianty są w 100% identyczne!</p>
                      <p className="text-xs text-slate-400 mt-1">Brak jakichkolwiek różnic w obsadzie sal, nauczycieli czy lekcji.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[480px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 z-10">
                          <tr>
                            <th className="p-3">Oddział</th>
                            <th className="p-3">Dzień i godzina</th>
                            <th className="p-3">Rodzaj zmiany</th>
                            <th className="p-3 bg-rose-50 text-rose-900">Stan w Wariancie A</th>
                            <th className="p-3 bg-emerald-50 text-emerald-900">Stan w Wariancie B</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {diffItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-3 font-extrabold text-slate-800">{item.className}</td>
                              <td className="p-3 text-slate-600 font-medium">
                                {DAYS[item.day]}, lekcja {item.hour} ({item.hourLabel})
                              </td>
                              <td className="p-3">
                                {item.status === 'added' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                    + Nowa lekcja
                                  </span>
                                )}
                                {item.status === 'removed' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                                    - Usunięta lekcja
                                  </span>
                                )}
                                {item.status === 'changed' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                                    Zmiana przedmiotu
                                  </span>
                                )}
                                {item.status === 'room_changed' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                                    Zmiana sali
                                  </span>
                                )}
                                {item.status === 'teacher_changed' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                                    Zmiana nauczyciela
                                  </span>
                                )}
                              </td>
                              <td className="p-3 bg-rose-50/40 text-rose-950 font-bold">
                                {item.details.subjectA ? (
                                  <div>
                                    {item.details.subjectA}
                                    <span className="block text-[10px] text-rose-600 font-normal">
                                      {item.details.teacherA} {item.details.roomA ? `· s. ${item.details.roomA}` : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic font-normal">Brak (okienko)</span>
                                )}
                              </td>
                              <td className="p-3 bg-emerald-50/40 text-emerald-950 font-bold">
                                {item.details.subjectB ? (
                                  <div>
                                    {item.details.subjectB}
                                    <span className="block text-[10px] text-emerald-700 font-normal">
                                      {item.details.teacherB} {item.details.roomB ? `· s. ${item.details.roomB}` : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic font-normal">Brak (okienko)</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TWORZENIE NOWEGO WARIANTU */}
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Kreator Nowego Wariantu Planu</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Utwórz równoległą wersję planu (np. na drugi semestr, czas remontu lub praktyk zawodowych).
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Variant Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nazwa wariantu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newVarName}
                    onChange={e => setNewVarName(e.target.value)}
                    placeholder="np. Semestr II (od 16 lutego 2026)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Category / Tag & Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategoria wariantu
                    </label>
                    <select
                      value={newVarTag}
                      onChange={e => setNewVarTag(e.target.value as PlanVariantTag)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="semestr_2">Semestr II</option>
                      <option value="semestr_1">Semestr I</option>
                      <option value="roboczy">Wariant roboczy (wersja próbna)</option>
                      <option value="awaryjny">Wariant awaryjny (remont / zastępstwa)</option>
                      <option value="praktyki">Praktyki zawodowe</option>
                      <option value="inna">Inny scenariusz</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kolor wyróżniający
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewVarColor(c)}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            newVarColor === c ? 'scale-125 ring-2 ring-indigo-400 border-white' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Validity Period (Dates Schedule) */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/80">
                  <label className="block text-xs font-black text-indigo-950 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Harmonogram dat obowiązywania wariantu (opcjonalnie)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Podaj zakres dat, w którym plan ma obowiązywać (np. początek i koniec semestru).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Obowiązuje od (początek):
                      </label>
                      <input
                        type="date"
                        value={newVarValidFrom}
                        onChange={e => setNewVarValidFrom(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Obowiązuje do (koniec):
                      </label>
                      <input
                        type="date"
                        value={newVarValidTo}
                        onChange={e => setNewVarValidTo(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Source Data Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Stan początkowy siatki lekcji:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 cursor-pointer">
                      <input
                        type="radio"
                        name="sourceMode"
                        checked={newVarSourceMode === 'clone_active'}
                        onChange={() => setNewVarSourceMode('clone_active')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">
                          Sklonuj aktualnie edytowany plan (zalecane)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Skopiuje bieżące lekcje, dyżury i sloty SPE. Pozwala łatwo nanieść poprawki semestralne bez niszczenia planu z I semestru.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 cursor-pointer">
                      <input
                        type="radio"
                        name="sourceMode"
                        checked={newVarSourceMode === 'clone_other'}
                        onChange={() => setNewVarSourceMode('clone_other')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block">
                          Sklonuj z innego wariantu
                        </span>
                        {newVarSourceMode === 'clone_other' && (
                          <select
                            value={newVarSourceOtherId}
                            onChange={e => setNewVarSourceOtherId(e.target.value)}
                            className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          >
                            <option value="">Wybierz wariant źródłowy...</option>
                            {planVariants.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 cursor-pointer">
                      <input
                        type="radio"
                        name="sourceMode"
                        checked={newVarSourceMode === 'blank'}
                        onChange={() => setNewVarSourceMode('blank')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">
                          Czysta siatka godzin (układanie od zera)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Zachowa wszystkie oddziały, nauczycieli, sale i przydziały, ale zresetuje ułożenie lekcji w siatce tygodniowej.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notatka organizacyjna / Opis
                  </label>
                  <textarea
                    rows={2}
                    value={newVarDesc}
                    onChange={e => setNewVarDesc(e.target.value)}
                    placeholder="np. Wprowadzono zmiany sal po remoncie pracowni chemicznej oraz uwzględniono praktyki oddziałów technikum."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateVariant(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    Utwórz wariant
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateVariant(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Utwórz i przełącz teraz</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EDIT METADATA OVERLAY MODAL */}
        {editingVariant && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-black text-slate-800">
                Edycja danych wariantu
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nazwa wariantu</label>
                  <input
                    type="text"
                    value={editingVariant.name}
                    onChange={e => setEditingVariant({ ...editingVariant, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategoria</label>
                  <select
                    value={editingVariant.tag}
                    onChange={e => setEditingVariant({ ...editingVariant, tag: e.target.value as PlanVariantTag })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="semestr_1">Semestr I</option>
                    <option value="semestr_2">Semestr II</option>
                    <option value="roboczy">Wariant roboczy</option>
                    <option value="awaryjny">Wariant awaryjny</option>
                    <option value="praktyki">Praktyki zawodowe</option>
                    <option value="inna">Własny scenariusz</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Obowiązuje od (data)</label>
                    <input
                      type="date"
                      value={editingVariant.validFrom || ''}
                      onChange={e => setEditingVariant({ ...editingVariant, validFrom: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Obowiązuje do (data)</label>
                    <input
                      type="date"
                      value={editingVariant.validTo || ''}
                      onChange={e => setEditingVariant({ ...editingVariant, validTo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notatka</label>
                  <textarea
                    rows={2}
                    value={editingVariant.description || ''}
                    onChange={e => setEditingVariant({ ...editingVariant, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kolor</label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingVariant({ ...editingVariant, color: c })}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          editingVariant.color === c ? 'scale-125 ring-2 ring-indigo-400 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVariant(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Zapisz zmiany
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Wariant aktywny: <strong className="text-slate-700">{activeVariant?.name || '—'}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
