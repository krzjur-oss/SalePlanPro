import React, { useState, useMemo } from 'react';
import { 
  AppState, Class, Teacher, Subject, ClassRoom, SchoolGroup, Assignment, Lesson, SpecialStudent, SpecialAssignment, SpecialLesson 
} from '../types';
import { 
  Sparkles, X, Settings, HelpCircle, AlertCircle, Play, CheckCircle, RefreshCw, Undo2, Users, Calendar, Award 
} from 'lucide-react';

interface PlanGeneratorProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onClose: () => void;
}

interface TeacherRoleConfig {
  teacherId: string;
  role: 'teacher' | 'director' | 'deputy';
  maxGaps: number;
  spreadObligation: boolean;
}

export default function PlanGenerator({ appState, onChangeAppState, onClose }: PlanGeneratorProps) {
  const pl = appState.planLekcji;

  // ── GENERATOR OPTIONS STATED BY USER ──
  const [maxGapsPerTeacher, setMaxGapsPerTeacher] = useState<number>(() => appState.generatorSettings?.maxGapsPerTeacher ?? 2);
  const [obeyAvailability, setObeyAvailability] = useState<boolean>(() => appState.generatorSettings?.obeyAvailability ?? true);
  const [avoidExtremes, setAvoidExtremes] = useState<boolean>(() => appState.generatorSettings?.avoidExtremes ?? true);
  const [noStudentGaps, setNoStudentGaps] = useState<boolean>(() => appState.generatorSettings?.noStudentGaps ?? true);
  const [allowDoubleBlocks, setAllowDoubleBlocks] = useState<boolean>(() => appState.generatorSettings?.allowDoubleBlocks ?? true);
  const [includeSpecialNI, setIncludeSpecialNI] = useState<boolean>(() => appState.generatorSettings?.includeSpecialNI ?? true);
  const [limitComputerLabs, setLimitComputerLabs] = useState<boolean>(() => appState.generatorSettings?.limitComputerLabs ?? true);
  const [customComputerLabsCount, setCustomComputerLabsCount] = useState<number>(() => {
    if (appState.generatorSettings?.customComputerLabsCount !== undefined) {
      return appState.generatorSettings.customComputerLabsCount;
    }
    const fromRooms = pl.rooms?.filter(r => r.type === 'informatyka').length || 0;
    return fromRooms > 0 ? fromRooms : 1;
  });

  // Maintain custom role settings for teachers during this generator session
  const [teacherConfigs, setTeacherConfigs] = useState<Record<string, TeacherRoleConfig>>(() => {
    const configs: Record<string, TeacherRoleConfig> = {};
    pl.teachers.forEach(t => {
      // Guess some roles or default to teacher
      configs[t.id] = {
        teacherId: t.id,
        role: 'teacher',
        maxGaps: 2,
        spreadObligation: false,
      };
    });
    return configs;
  });

  // Simple state for feedback on running
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    success: boolean;
    placedRegular: number;
    totalRegular: number;
    placedSpecial: number;
    totalSpecial: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Helper to change configs
  const updateTeacherConfig = (teacherId: string, updates: Partial<TeacherRoleConfig>) => {
    setTeacherConfigs(prev => {
      const current = prev[teacherId];
      if (!current) return prev;
      const updated = { ...current, ...updates };
      // Dyrektor and wicedyrektor get default recommended gaps
      if (updates.role === 'director') {
        updated.maxGaps = 1;
      } else if (updates.role === 'deputy') {
        updated.maxGaps = 2;
      }
      return { ...prev, [teacherId]: updated };
    });
  };

  // Maps of state
  const teachersMap = useMemo(() => new Map(pl.teachers.map(t => [t.id, t])), [pl.teachers]);
  const subjectsMap = useMemo(() => new Map(pl.subjects.map(s => [s.id, s])), [pl.subjects]);
  const classesMap = useMemo(() => new Map(pl.classes.map(c => [c.id, c])), [pl.classes]);

  // ── CORE SCHEDULING ALGORITHM ──
  const runAutoGeneration = () => {
    setIsGenerating(true);
    setGenerationResult(null);

    // Run slightly deferred so the spinner renders
    setTimeout(() => {
      try {
        const daysCount = 5; // Monday to Friday
        const maxHoursCount = pl.hours.length || 9; // usually 0 to 8 or 9
        
        const isINFSubject = (subjectId: string) => {
          const sub = subjectsMap.get(subjectId);
          if (!sub) return false;
          const name = (sub.name || '').toLowerCase();
          const short = (sub.short || '').toLowerCase();
          return (
            short.includes('inf') ||
            short.includes('e-inf') ||
            name.includes('informatyk') ||
            name.includes('edukacja informatyczna')
          );
        };

        // Track computer science lessons scheduled at each slot: "day|hour" -> count
        const infLessonsCount = new Map<string, number>();

        // 1. Initialize result lessons state and lock state
        // Keep all currently locked lessons intact!
        const generatedLessons: Record<string, Lesson> = {};
        const generatedSpecialLessons: Record<string, SpecialLesson> = {};

        // Track who is busy where:
        // teacherBusy["teacherId|dayIndex|hourIndex"] = boolean
        const teacherBusy = new Set<string>();
        // classBusy["classId|dayIndex|hourIndex"] = boolean
        const classBusy = new Set<string>();
        // specialStudentBusy["studentId|dayIndex|hourIndex"] = boolean
        const specialStudentBusy = new Set<string>();

        // Copy locked lessons first
        Object.entries(pl.lessons).forEach(([key, value]) => {
          if (value.locked) {
            generatedLessons[key] = { ...value };
            const parts = key.split('|');
            const classId = parts[0];
            const day = parseInt(parts[1], 10);
            const hour = parseInt(parts[2], 10);
            classBusy.add(`${classId}|${day}|${hour}`);

            const asg = pl.assignments.find(a => a.id === value.assignmentId);
            if (asg) {
              if (asg.teacherId) {
                teacherBusy.add(`${asg.teacherId}|${day}|${hour}`);
              }
              if (isINFSubject(asg.subjectId)) {
                const slotKey = `${day}|${hour}`;
                infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
              }
            }
          }
        });

        // Copy locked special lessons (if we have any structure for them, or just preserve them)
        Object.entries(pl.specialLessons).forEach(([key, value]) => {
          generatedSpecialLessons[key] = { ...value };
          const parts = key.split('|');
          if (parts.length >= 3) {
            const studentId = parts[0];
            const day = parseInt(parts[1], 10);
            const hour = parseInt(parts[2], 10);
            specialStudentBusy.add(`${studentId}|${day}|${hour}`);

            const spAsg = pl.specialAssignments.find(sa => sa.id === value.assignmentId);
            if (spAsg && spAsg.teacherId) {
              teacherBusy.add(`${spAsg.teacherId}|${day}|${hour}`);
            }
          }
        });

        // 2. Identify remaining items to schedule:
        // For regular assignments, count how many hours are left to place
        interface WorkUnit {
          assignmentId: string;
          classId: string;
          teacherId: string | null;
          subjectId: string;
          groupId: string | null;
          preferredBlockSize: number;
        }

        const regularUnits: WorkUnit[] = [];
        pl.assignments.forEach(asg => {
          // Count currently locked lessons for this assignment
          const lockedCount = Object.values(generatedLessons).filter(
            l => l.assignmentId === asg.id && l.locked
          ).length;

          const remainingHours = Math.max(0, asg.hoursPerWeek - lockedCount);
          const blockPrefer = asg.preferredBlockSize || (allowDoubleBlocks ? 2 : 1);

          for (let i = 0; i < remainingHours; i++) {
            regularUnits.push({
              assignmentId: asg.id,
              classId: asg.classId,
              teacherId: asg.teacherId,
              subjectId: asg.subjectId,
              groupId: asg.groupId,
              preferredBlockSize: blockPrefer,
            });
          }
        });

        // Sort work units heuristically:
        // - Place assignments with teachers first, especially those with lower availability or high hours (most constrained variable)
        const getTeacherDifficulty = (teacherId: string | null) => {
          if (!teacherId) return 0;
          const t = teachersMap.get(teacherId);
          const config = teacherConfigs[teacherId];
          const availabilityCount = t?.availability?.length || 45; // 5 days * 9 hours = 45 possible slots
          const totalHours = pl.assignments
            .filter(a => a.teacherId === teacherId)
            .reduce((sum, a) => sum + a.hoursPerWeek, 0);
          
          let score = totalHours * 10 - availabilityCount * 2;
          if (config) {
            if (config.role === 'director') score += 15;
            if (config.role === 'deputy') score += 10;
          }
          return score;
        };

        regularUnits.sort((a, b) => {
          const diffA = getTeacherDifficulty(a.teacherId);
          const diffB = getTeacherDifficulty(b.teacherId);
          return diffB - diffA; // High difficulty first
        });

        // 3. Place regular lessons
        const warnings: string[] = [];
        const errors: string[] = [];
        let placedRegularCount = 0;

        // Simple scoring heuristic for a slot (day, hour)
        const scoreSlot = (
          unit: WorkUnit,
          day: number,
          hour: number,
          isDouble: boolean
        ) => {
          let score = 1000;

          // Check basic clashes
          if (classBusy.has(`${unit.classId}|${day}|${hour}`)) return -1;
          if (unit.teacherId && teacherBusy.has(`${unit.teacherId}|${day}|${hour}`)) return -1;

          // Check computer science labs limit
          if (limitComputerLabs && isINFSubject(unit.subjectId)) {
            const currentCount = infLessonsCount.get(`${day}|${hour}`) || 0;
            if (currentCount >= customComputerLabsCount) {
              return -1; // No free computer labs in this slot
            }
          }

          // Check builder parameters
          // Teacher availability
          if (obeyAvailability && unit.teacherId) {
            const t = teachersMap.get(unit.teacherId);
            if (t && t.availability && t.availability.length > 0) {
              const checkCode = `${day}-${hour}`;
              if (!t.availability.includes(checkCode)) {
                return -1; // hard constraint
              }
            }
          }

          // Extremes avoidance
          if (avoidExtremes) {
            // Hour 0 is heavily penalized
            if (hour === 0) {
              score -= 100;
            }
            // Hours after 6 are penalized
            if (hour >= 6) {
              score -= (hour - 5) * 40;
            }
          }

          // Teacher role specials
          if (unit.teacherId) {
            const config = teacherConfigs[unit.teacherId];
            if (config) {
              if (config.role === 'director' && (hour === 0 || hour >= 6)) {
                score -= 150; // Directors keep a cleaner center schedule
              }
              if (config.role === 'deputy' && (hour === 0 || hour >= 7)) {
                score -= 100;
              }
            }
          }

          // Students continuity (no gaps) - calculate distance to current scheduled classes
          if (noStudentGaps) {
            // Check if class has other lessons scheduled on this day
            let hasAdjacent = false;
            let dayMin = 99;
            let dayMax = -1;

            for (let h = 0; h < maxHoursCount; h++) {
              if (classBusy.has(`${unit.classId}|${day}|${h}`)) {
                dayMin = Math.min(dayMin, h);
                dayMax = Math.max(dayMax, h);
              }
            }

            if (dayMax !== -1) {
              if (hour >= dayMin - 1 && hour <= dayMax + 1) {
                // Next to a lesson - high score!
                score += 500;
                if (hour >= dayMin && hour <= dayMax) {
                  // Filling a hole! Even better
                  score += 400;
                }
              } else {
                // Isolated lesson - penalized!
                score -= 300;
              }
            } else {
              // First lesson of the day for this class. Prioritize standard hours (hour 1 or 2)
              if (hour === 1 || hour === 2) {
                score += 200;
              }
            }
          }

          // Avoid placing the same subject twice on the same day unless blockSize is preferred
          const sameDaySameSubject = Object.entries(generatedLessons).some(([key, val]) => {
            const parts = key.split('|');
            const cId = parts[0];
            const d = parseInt(parts[1], 10);
            if (cId === unit.classId && d === day) {
              const otherAsg = pl.assignments.find(a => a.id === val.assignmentId);
              return otherAsg && otherAsg.subjectId === unit.subjectId;
            }
            return false;
          });

          if (sameDaySameSubject) {
            if (isDouble) {
              score += 150; // Boost double block
            } else {
              score -= 200; // Penalize separate same-subject lessons on same day
            }
          }

          // Teacher window avoidance: check if teacher has other classes on this day
          if (unit.teacherId) {
            let hasTeacherAdjacent = false;
            for (let h = Math.max(0, hour - 1); h <= Math.min(maxHoursCount - 1, hour + 1); h++) {
              if (h !== hour && teacherBusy.has(`${unit.teacherId}|${day}|${h}`)) {
                hasTeacherAdjacent = true;
                break;
              }
            }
            if (hasTeacherAdjacent) {
              score += 150; // Prefers compact schedule for teachers
            }
          }

          return score;
        };

        // Try to place each regular unit
        let index = 0;
        while (index < regularUnits.length) {
          const unit = regularUnits[index];

          // Determine if we can try to place as double block
          let placed = false;
          let bestScore = -99999;
          let bestDay = -1;
          let bestHour = -1;
          let isBlock = false;

          // Check if we can schedule a consecutive 2-hr block (if pref is >= 2 and we have another matching unscheduled unit)
          const findNextMatchingIndex = () => {
            for (let k = index + 1; k < regularUnits.length; k++) {
              if (
                regularUnits[k].classId === unit.classId &&
                regularUnits[k].subjectId === unit.subjectId &&
                regularUnits[k].assignmentId === unit.assignmentId
              ) {
                return k;
              }
            }
            return -1;
          };

          const nextMatchIdx = findNextMatchingIndex();
          const shouldTryBlock = allowDoubleBlocks && nextMatchIdx !== -1;

          if (shouldTryBlock) {
            // Find best adjacent slots (hour, hour+1)
            for (let d = 0; d < daysCount; d++) {
              for (let h = 0; h < maxHoursCount - 1; h++) {
                const s1 = scoreSlot(unit, d, h, true);
                const s2 = scoreSlot(unit, d, h + 1, true);

                if (s1 > 0 && s2 > 0) {
                  const combined = s1 + s2;
                  if (combined > bestScore) {
                    bestScore = combined;
                    bestDay = d;
                    bestHour = h;
                    isBlock = true;
                  }
                }
              }
            }
          }

          // If block not possible or not preferred, check single slot
          if (bestHour === -1) {
            isBlock = false;
            for (let d = 0; d < daysCount; d++) {
              for (let h = 0; h < maxHoursCount; h++) {
                const s = scoreSlot(unit, d, h, false);
                if (s > bestScore && s > 0) {
                  bestScore = s;
                  bestDay = d;
                  bestHour = h;
                }
              }
            }
          }

          if (bestHour !== -1) {
            // We have a placement!
            if (isBlock && nextMatchIdx !== -1) {
              // Place both
              const secondUnit = regularUnits[nextMatchIdx];

              // Cell 1
              const k1 = `${unit.classId}|${bestDay}|${bestHour}`;
              generatedLessons[k1] = { assignmentId: unit.assignmentId, locked: false };
              classBusy.add(`${unit.classId}|${bestDay}|${bestHour}`);
              if (unit.teacherId) teacherBusy.add(`${unit.teacherId}|${bestDay}|${bestHour}`);
              if (isINFSubject(unit.subjectId)) {
                const slotKey = `${bestDay}|${bestHour}`;
                infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
              }

              // Cell 2
              const k2 = `${secondUnit.classId}|${bestDay}|${bestHour + 1}`;
              generatedLessons[k2] = { assignmentId: secondUnit.assignmentId, locked: false };
              classBusy.add(`${secondUnit.classId}|${bestDay}|${bestHour + 1}`);
              if (secondUnit.teacherId) teacherBusy.add(`${secondUnit.teacherId}|${bestDay}|${bestHour + 1}`);
              if (isINFSubject(secondUnit.subjectId)) {
                const slotKey = `${bestDay}|${bestHour + 1}`;
                infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
              }

              // Remove second unit from queue
              regularUnits.splice(nextMatchIdx, 1);
              placedRegularCount += 2;
            } else {
              // Place single
              const k = `${unit.classId}|${bestDay}|${bestHour}`;
              generatedLessons[k] = { assignmentId: unit.assignmentId, locked: false };
              classBusy.add(`${unit.classId}|${bestDay}|${bestHour}`);
              if (unit.teacherId) teacherBusy.add(`${unit.teacherId}|${bestDay}|${bestHour}`);
              if (isINFSubject(unit.subjectId)) {
                const slotKey = `${bestDay}|${bestHour}`;
                infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
              }
              placedRegularCount += 1;
            }
            placed = true;
          }

          if (!placed) {
            // Fallback: place in any empty slot regardless of quality score (softly ignoring hours extremes or availability if crucial)
            let fallbackPlaced = false;
            for (let d = 0; d < daysCount; d++) {
              for (let h = 0; h < maxHoursCount; h++) {
                if (!classBusy.has(`${unit.classId}|${d}|${h}`)) {
                  if (!unit.teacherId || !teacherBusy.has(`${unit.teacherId}|${d}|${h}`)) {
                    if (limitComputerLabs && isINFSubject(unit.subjectId)) {
                      const currentCount = infLessonsCount.get(`${d}|${h}`) || 0;
                      if (currentCount >= customComputerLabsCount) {
                        continue;
                      }
                    }

                    const k = `${unit.classId}|${d}|${h}`;
                    generatedLessons[k] = { assignmentId: unit.assignmentId, locked: false };
                    classBusy.add(`${unit.classId}|${d}|${h}`);
                    if (unit.teacherId) teacherBusy.add(`${unit.teacherId}|${d}|${h}`);
                    if (isINFSubject(unit.subjectId)) {
                      const slotKey = `${d}|${h}`;
                      infLessonsCount.set(slotKey, (infLessonsCount.get(slotKey) || 0) + 1);
                    }
                    placedRegularCount += 1;
                    fallbackPlaced = true;
                    break;
                  }
                }
              }
              if (fallbackPlaced) break;
            }

            if (!fallbackPlaced) {
              const subj = subjectsMap.get(unit.subjectId);
              const cls = classesMap.get(unit.classId);
              const teacher = unit.teacherId ? teachersMap.get(unit.teacherId) : null;
              
              let reasonSuffix = '';
              if (limitComputerLabs && isINFSubject(unit.subjectId)) {
                reasonSuffix = ' (możliwe przekroczenie limitu wolnych pracowni komputerowych)';
              }

              warnings.push(
                `Nie udało się dopasować godziny przedmiotu: "${subj?.name || 'Przedmiot'}" dla klasy ${cls?.name || 'Klasa'} (Nauczyciel: ${teacher ? teacher.abbr : 'Brak'})${reasonSuffix}.`
              );
            }
          }

          index++;
        }

        // 4. Place Special assignments (Nauczanie indywidualne) if toggled
        let placedSpecialCount = 0;
        let totalSpecialCount = 0;

        if (includeSpecialNI) {
          interface SpecialWorkUnit {
            specialAsg: SpecialAssignment;
            studentId: string;
            teacherId: string | null;
            subjectId: string;
          }

          const specialUnits: SpecialWorkUnit[] = [];
          pl.specialAssignments.forEach(sa => {
            // Filter only individual (withClass = false, which needs scheduling)
            if (!sa.withClass) {
              totalSpecialCount += sa.hoursPerWeek;
              for (let i = 0; i < sa.hoursPerWeek; i++) {
                specialUnits.push({
                  specialAsg: sa,
                  studentId: sa.studentId,
                  teacherId: sa.teacherId,
                  subjectId: sa.subjectId,
                });
              }
            }
          });

          specialUnits.forEach(unit => {
            let placedSp = false;

            // Search for an hour where student is free and teacher is free
            for (let d = 0; d < daysCount; d++) {
              for (let h = 0; h < maxHoursCount; h++) {
                // Must ensure:
                // 1. Student has no other special lesson at this hour
                if (specialStudentBusy.has(`${unit.studentId}|${d}|${h}`)) continue;

                // 2. Teacher has no lesson/special lesson at this hour
                if (unit.teacherId && teacherBusy.has(`${unit.teacherId}|${d}|${h}`)) continue;

                // 3. Teacher is available
                if (obeyAvailability && unit.teacherId) {
                  const t = teachersMap.get(unit.teacherId);
                  if (t && t.availability && t.availability.length > 0) {
                    if (!t.availability.includes(`${d}-${h}`)) continue;
                  }
                }

                // Place!
                const specKey = `${unit.studentId}|${d}|${h}|${unit.specialAsg.id}`;
                generatedSpecialLessons[specKey] = { assignmentId: unit.specialAsg.id };
                specialStudentBusy.add(`${unit.studentId}|${d}|${h}`);
                if (unit.teacherId) teacherBusy.add(`${unit.teacherId}|${d}|${h}`);

                placedSpecialCount++;
                placedSp = true;
                break;
              }
              if (placedSp) break;
            }

            if (!placedSp) {
              const stud = pl.specialStudents.find(s => s.id === unit.studentId);
              const subj = subjectsMap.get(unit.subjectId);
              warnings.push(
                `Zajęcia indywidualne: "${subj?.name || 'Zajęcie'}" dla ucznia ${stud ? `${stud.lastName} ${stud.firstName}` : 'Uczeń'} nie zmieściły się w żadnym wolnym slocie.`
              );
            }
          });
        }

        // Apply state changes!
        const totalRegularTarget = placedRegularCount + warnings.length;
        const totalSpecialTarget = totalSpecialCount;

        const updatedPL = {
          ...pl,
          lessons: generatedLessons,
          specialLessons: generatedSpecialLessons
        };

        onChangeAppState({
          ...appState,
          planLekcji: updatedPL
        });

        setGenerationResult({
          success: warnings.length === 0,
          placedRegular: placedRegularCount,
          totalRegular: totalRegularTarget,
          placedSpecial: placedSpecialCount,
          totalSpecial: totalSpecialTarget,
          errors,
          warnings
        });

      } catch (err: any) {
        setGenerationResult({
          success: false,
          placedRegular: 0,
          totalRegular: 0,
          placedSpecial: 0,
          totalSpecial: 0,
          errors: [err.message || 'Wystąpił nieznany błąd podczas generowania planu.'],
          warnings: []
        });
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200" id="generator-modal">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-150 transform transition-all scale-100">
        
        {/* NAGŁÓWEK MODALA */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles className="text-amber-300 animate-pulse" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Generator Automatyczny Planu Lekcji</h2>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">Algorytmiczne układanie optymalnych lekcji i nauczania indywidualnego</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 rounded-full transition text-white"
            title="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* ZAWARTOŚĆ */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 select-none">
              <RefreshCw className="text-indigo-600 animate-spin" size={48} />
              <div className="text-center">
                <p className="font-bold text-slate-800 text-base">Generowanie planu lekcji...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Przeliczanie kryteriów, unikanie okienek u klas i optymalizacja dostępności kadry.</p>
              </div>
            </div>
          ) : generationResult ? (
            // WYNIK GENERATORA
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                {generationResult.warnings.length === 0 ? (
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={28} />
                ) : (
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={28} />
                )}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {generationResult.warnings.length === 0 
                      ? 'Plan wygenerowany perfekcyjnie!' 
                      : 'Plan wygenerowany z uwagami'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Rozmieszczanie zakończyło się pomyślnie. Stare i odblokowane lekcje zostały zastąpione nowym harmonogramem.
                  </p>
                </div>
              </div>

              {/* STATYSTYKI REZULTATU */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Lekcje klasowe</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-blue-950 font-mono">
                      {generationResult.placedRegular} / {generationResult.totalRegular}
                    </span>
                    <span className="text-xs font-bold text-blue-600">godz.</span>
                  </div>
                  <span className="text-[10px] text-blue-500 font-extrabold mt-1">Lekcje w siatce głównej</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Zajęcia indywidualne (NI)</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-amber-950 font-mono">
                      {generationResult.placedSpecial} / {generationResult.totalSpecial}
                    </span>
                    <span className="text-xs font-bold text-amber-600">godz.</span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-extrabold mt-1">Indywidualne + Rewalidacja</span>
                </div>

                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider block">Sprawność dopasowania</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-violet-950 font-mono">
                      {generationResult.totalRegular > 0 
                        ? Math.round((generationResult.placedRegular / generationResult.totalRegular) * 100)
                        : 100}%
                    </span>
                  </div>
                  <span className="text-[10px] text-violet-500 font-extrabold mt-1">Skuteczność algorytmu</span>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Niewprowadzone lekcje</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-black text-rose-950 font-mono">
                      {generationResult.warnings.length}
                    </span>
                    <span className="text-xs font-bold text-rose-600">konfliktów</span>
                  </div>
                  <span className="text-[10px] text-rose-500 font-extrabold mt-1">Brak wolnych nauczycieli / sal</span>
                </div>
              </div>

              {/* LISTA OSTRZEŻEŃ / KONFLIKTÓW */}
              {generationResult.warnings.length > 0 && (
                <div className="space-y-2 select-none">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">⚠️ Szczegóły alertów ({generationResult.warnings.length})</span>
                  <div className="border border-red-150 rounded-2xl p-4 bg-red-50/20 max-h-48 overflow-y-auto space-y-1.5">
                    {generationResult.warnings.map((warn, i) => (
                      <div key={i} className="text-xs text-red-800 leading-normal font-semibold flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-medium italic mt-1 leading-normal">
                    Wskazówka: Zwiększ dostępność nauczycieli lub zredukuj nakładające się zadania w danej godzinie przed ponownym generowaniem.
                  </p>
                </div>
              )}

              {/* PRZYCISKI PO WYGENEROWANIU */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGenerationResult(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo2 size={14} /> Dopasuj ustawienia i spróbuj ponownie
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Zobacz gotowy plan
                </button>
              </div>
            </div>
          ) : (
            // WYBÓR KRYTERIÓW GENEROWANIA
            <div className="space-y-6">
              
              {/* Sekcja 1: Główne reguły optymalizacji */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3.5 select-none">⚙️ Ogólne reguły optymalizacji</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Maks okienek */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition bg-slate-50/50">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 select-none leading-none">
                        📈 Główne pensum okienek nauczycieli
                      </label>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1">
                        Maksymalna liczba nieobsadzonych lekcji (górna granica "okienek") dla pojedynczego nauczyciela w tygodniu.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        value={maxGapsPerTeacher}
                        onChange={(e) => setMaxGapsPerTeacher(Number(e.target.value))}
                      />
                      <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0 leading-none">
                        {maxGapsPerTeacher === 0 ? 'Bez okienek (0)' : `${maxGapsPerTeacher} okienka`}
                      </span>
                    </div>
                  </div>

                  {/* Ciągłość lekcji u klas (Brak okienek dla klas) */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setNoStudentGaps(!noStudentGaps)}>
                    <input 
                      type="checkbox"
                      checked={noStudentGaps}
                      onChange={() => {}} // handled by div
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">🏫 Ciągłość zajęć dla uczniów (Brak okienek)</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Lekcje każdej z klas będą układane jedna po drugiej w sprawnym bloku bez żadnych luźnych przerw w środku dnia.
                      </p>
                    </div>
                  </div>

                  {/* Skrajne godziny */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setAvoidExtremes(!avoidExtremes)}>
                    <input 
                      type="checkbox"
                      checked={avoidExtremes}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">⏰ Omijaj skrajne godziny (godzina zerowa / późne)</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Unikaj w miarę możliwości planowania lekcji na godzinę 0 (przed 8:00) oraz późnych lekcjach (od 7. godziny wzwyż).
                      </p>
                    </div>
                  </div>

                  {/* Dostępność nauczycieli */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setObeyAvailability(!obeyAvailability)}>
                    <input 
                      type="checkbox"
                      checked={obeyAvailability}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">📅 Respektuj deklarowaną dostępność nauczycieli</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Blokuje wstawianie zajęć w slotach określonych u nauczyciela jako wyłączone lub niedostępne.
                      </p>
                    </div>
                  </div>

                  {/* Lekcje pod rząd */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setAllowDoubleBlocks(!allowDoubleBlocks)}>
                    <input 
                      type="checkbox"
                      checked={allowDoubleBlocks}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">📚 Łączenie godzin (bloki dwugodzinne pod rząd)</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Jeśli dany przedmiot ma ≥ 2 godziny tygodniowo, system może połączyć je w blok lekcji pod rząd w tym samym dniu.
                      </p>
                    </div>
                  </div>

                  {/* Nauczanie indywidualne */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex items-start gap-3 hover:border-blue-400 transition cursor-pointer bg-slate-50/50" onClick={() => setIncludeSpecialNI(!includeSpecialNI)}>
                    <input 
                      type="checkbox"
                      checked={includeSpecialNI}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block select-none">🌟 Uwzględnij nauczanie indywidualne (NI) i Rewalidację</span>
                      <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                        Automatycznie dopasuje wolne sloty nauczycieli do zajęć zindywidualizowanych dla zgłoszonych uczniów ze specjalnymi potrzebami.
                      </p>
                    </div>
                  </div>

                  {/* Limit pracowni informatycznych */}
                  <div className="p-4 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-blue-400 transition bg-slate-50/50">
                    <div>
                      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setLimitComputerLabs(!limitComputerLabs)}>
                        <input 
                          type="checkbox"
                          checked={limitComputerLabs}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-800 block select-none">🖥️ Limit zajęć informatycznych (pracownia komp.)</span>
                          <p className="text-[10.5px] text-slate-450 font-medium leading-relaxed mt-1 select-none">
                            Ogranicza liczbę jednoczesnych zajęć z informatyki / edukacji informatycznej do liczby sprawnych pracowni komputerowych w szkole.
                          </p>
                        </div>
                      </div>
                    </div>
                    {limitComputerLabs && (
                      <div className="flex items-center gap-3 mt-4 border-t border-slate-100 pt-3">
                        <span className="text-[10.5px] text-slate-500 font-bold select-none whitespace-nowrap">Dostępne pracownie:</span>
                        <input 
                          type="number"
                          min="1"
                          max="10"
                          className="w-16 px-2 py-1 text-xs font-black font-mono border border-slate-250 bg-white rounded-lg outline-none focus:border-indigo-500"
                          value={customComputerLabsCount}
                          onChange={(e) => setCustomComputerLabsCount(Math.max(1, Number(e.target.value)))}
                        />
                        <span className="text-[10px] text-slate-450 font-medium select-none">
                          {pl.rooms?.filter(r => r.type === 'informatyka').length > 0 
                            ? `(wykryto ${pl.rooms.filter(r => r.type === 'informatyka').length} w rejestrze sal)` 
                            : '(brak zarejestrowanych sal typu informatyka)'}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Sekcja 2: Role i redukcja obciążeń (Dyrektor / Wicedyrektor) */}
              <div>
                <div className="flex items-center justify-between mb-3.5 select-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">🧑‍🏫 Funkcje kadry kierowniczej i priorytety nauczycieli ({pl.teachers.length})</span>
                  <div className="text-[9.5px] text-slate-400 font-semibold italic">Wyznacz dyrektorom i wicedyrektorom ulgi i ograniczenia obciążeń</div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs max-h-64 overflow-y-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs bg-white">
                    <thead className="bg-slate-50 select-none">
                      <tr>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nauczyciel</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funkcja / Rola</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit okienek</th>
                        <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wymóg obecności</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {pl.teachers.map(t => {
                        const config = teacherConfigs[t.id] || {
                          teacherId: t.id,
                          role: 'teacher',
                          maxGaps: 2,
                          spreadObligation: false,
                        };
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900">{t.first} {t.last}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Abbr: {t.abbr} | Pensum: {t.maxHours || 18}h</div>
                            </td>
                            <td className="p-3">
                              <select
                                value={config.role}
                                onChange={(e) => updateTeacherConfig(t.id, { role: e.target.value as any })}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-slate-800"
                              >
                                <option value="teacher">Zwykły nauczyciel</option>
                                <option value="director">👑 Dyrektor szkoły</option>
                                <option value="deputy">🎓 Wicedyrektor</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                value={config.maxGaps}
                                onChange={(e) => updateTeacherConfig(t.id, { maxGaps: Number(e.target.value) })}
                                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none font-bold text-slate-800"
                              >
                                <option value="0">Max 0 okienek</option>
                                <option value="1">Max 1 okienko</option>
                                <option value="2">Max 2 okienka</option>
                                <option value="3">Max 3 okienka</option>
                                <option value="4">Max 4 okienka</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={config.spreadObligation}
                                  onChange={(e) => updateTeacherConfig(t.id, { spreadObligation: e.target.checked })}
                                  className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-500 font-bold leading-tight select-none">
                                  Codzienna obecność
                                </span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRZYCISKI MODALA */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-105 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={runAutoGeneration}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={13} fill="currentColor" /> Rozpocznij automatyczne układanie
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
