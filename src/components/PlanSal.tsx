import React, { useState, useMemo } from 'react';
import { AppState, SchedData, SchedCell, Floor, Room, Building, Assignment, Teacher, Subject, ClassRoom, Class } from '../types';
import { colKey, flattenColumns, esc, hexRgba, mergeClassNames } from '../utils';
import { 
  Building2, MapPin, Grid, AlertTriangle, UserCheck, RefreshCw, Trash2, Edit, Grab, Sparkles, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { DraggableItem, DroppableCell } from './DndWrapper';

interface PlanSalProps {
  appState: AppState;
  schedData: SchedData;
  onChangeAppState: (newState: AppState) => void;
  onChangeSchedData: (newData: SchedData) => void;
  onImportFromPlanKlas: () => void;
}

function cleanFloorName(floorName: string, buildingName?: string): string {
  if (!buildingName) return floorName;
  const bNameLower = buildingName.toLowerCase().trim();
  const fNameLower = floorName.toLowerCase().trim();
  
  if (fNameLower.startsWith(bNameLower)) {
    let remaining = floorName.substring(buildingName.length).trim();
    if (remaining.startsWith('–') || remaining.startsWith('-')) {
      remaining = remaining.substring(1).trim();
    }
    if (remaining) {
      return remaining.charAt(0).toUpperCase() + remaining.slice(1);
    }
  }
  return floorName;
}

export default function PlanSal({ 
  appState, 
  schedData, 
  onChangeAppState, 
  onChangeSchedData,
  onImportFromPlanKlas
}: PlanSalProps) {
  const [activeDay, setActiveDay] = useState<number>(0);
  const [activeRoomCategory, setActiveRoomCategory] = useState<'main' | 'individual' | 'sport'>('main');
  const [editingCell, setEditingCell] = useState<{ hour: string; colKey: string; slotIdx?: number } | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // States for the D&D Pool sidebar
  const [showPoolSidebar, setShowPoolSidebar] = useState<boolean>(true);
  const [poolFilter, setPoolFilter] = useState<'all' | 'unassigned'>('unassigned');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form edit states
  const [cellClass, setCellClass] = useState<string>('');
  const [cellTeacher, setCellTeacher] = useState<string>('');
  const [cellSupportTeacher, setCellSupportTeacher] = useState<string>('');
  const [cellSubject, setCellSubject] = useState<string>('');
  const [cellNote, setCellNote] = useState<string>('');
  const [isCustomClass, setIsCustomClass] = useState<boolean>(false);
  const [isCustomTeacher, setIsCustomTeacher] = useState<boolean>(false);
  const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
  const [isCustomSupportTeacher, setIsCustomSupportTeacher] = useState<boolean>(false);
  const [isAddingClassInline, setIsAddingClassInline] = useState<boolean>(false);
  const [newInlineClassName, setNewInlineClassName] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['']);

  // Homeroom / Custodians edit states
  const [editingHomeroom, setEditingHomeroom] = useState<{ colKey: string; roomNum: string; sub?: string } | null>(null);
  const [hrClassName, setHrClassName] = useState<string>('');
  const [hrTeacherAbbr, setHrTeacherAbbr] = useState<string>('');
  const [hrClassName2, setHrClassName2] = useState<string>('');
  const [hrTeacherAbbr2, setHrTeacherAbbr2] = useState<string>('');

  // Sched generator states
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [genPriorityHomerooms, setGenPriorityHomerooms] = useState<boolean>(() => appState.generatorSettings?.genPriorityHomerooms ?? true);
  const [genPriorityTeachers, setGenPriorityTeachers] = useState<boolean>(() => appState.generatorSettings?.genPriorityTeachers ?? true);
  const [genExcludeWF, setGenExcludeWF] = useState<boolean>(() => appState.generatorSettings?.genExcludeWF ?? true);
  const [genAutoPlaceWF, setGenAutoPlaceWF] = useState<boolean>(() => appState.generatorSettings?.genAutoPlaceWF ?? true);
  const [genClearExisting, setGenClearExisting] = useState<boolean>(() => appState.generatorSettings?.genClearExisting ?? true);
  const [teacherSearch, setTeacherSearch] = useState<string>('');

  // List of all classrooms from columns in the layout
  const allRoomsList = useMemo(() => {
    const rawCols = flattenColumns(appState.floors);
    return rawCols.map(col => {
      const roomKey = colKey(col);
      return {
        key: roomKey,
        num: col.room.num,
        sub: col.room.sub || '',
        floorName: col.floor.name,
        bldName: appState.buildings[col.floor.buildingIdx]?.name || ''
      };
    });
  }, [appState.floors, appState.buildings]);

  const handleAddPreferredRoom = (teacherId: string, roomKey: string) => {
    const updatedTeachers = appState.teachers.map(t => {
      if (t.id === teacherId) {
        const preferred = t.preferredRooms || [];
        if (!preferred.includes(roomKey)) {
          return { ...t, preferredRooms: [...preferred, roomKey] };
        }
      }
      return t;
    });

    onChangeAppState({
      ...appState,
      teachers: updatedTeachers,
      planLekcji: {
        ...appState.planLekcji,
        teachers: updatedTeachers
      }
    });
    notify('Dodano preferowaną salę', 'ok');
  };

  const handleRemovePreferredRoom = (teacherId: string, roomKey: string) => {
    const updatedTeachers = appState.teachers.map(t => {
      if (t.id === teacherId) {
        const preferred = t.preferredRooms || [];
        return { ...t, preferredRooms: preferred.filter(k => k !== roomKey) };
      }
      return t;
    });

    onChangeAppState({
      ...appState,
      teachers: updatedTeachers,
      planLekcji: {
        ...appState.planLekcji,
        teachers: updatedTeachers
      }
    });
    notify('Usunięto preferowaną salę', 'ok');
  };

  const handleAutoGenerateRooms = () => {
    // Save current to undo in parent
    const yearKey = appState.yearKey;
    const pl = appState.planLekcji;

    if (!pl || !pl.assignments) {
      notify('Brak przydziałów lekcyjnych w Etapie 1!', 'err');
      return;
    }

    const assignmentsMap = new Map<string, Assignment>((pl.assignments || []).map(a => [a.id, a]));
    const teachersMap = new Map<string, Teacher>((pl.teachers || []).map(t => [t.id, t]));
    const subjectsMap = new Map<string, Subject>((pl.subjects || []).map(s => [s.id, s]));
    
    // Support lookups by ID and by clean room name
    const roomsMap = new Map<string, ClassRoom>();
    (pl.rooms || []).forEach(r => {
      roomsMap.set(r.id, r);
      roomsMap.set(r.name.toLowerCase().trim(), r);
    });

    const allRoomCols = flattenColumns(appState.floors);
    if (allRoomCols.length === 0) {
      notify('Brak sal w układzie architektonicznym szkoły!', 'err');
      return;
    }

    const nextSchedData = { ...schedData };
    if (!nextSchedData[yearKey]) {
      nextSchedData[yearKey] = {};
    }

    let totalPlaced = 0;
    let totalSkippedPE = 0;
    let totalUnassigned = 0;

    const isPESubject = (subjectId: string, teacherId: string | null) => {
      const sub = subjectsMap.get(subjectId);
      if (!sub) return false;
      const name = (sub.name || '').toLowerCase();
      const s = (sub.short || '').toLowerCase();

      const teacher = teacherId ? teachersMap.get(teacherId) : null;
      const tAbbr = teacher ? (teacher.abbr || '').toLowerCase() : '';

      return (
        s.includes('wf') ||
        s.includes('w-f') ||
        name.includes('wychowanie fizyczne') ||
        name.includes('w-f') ||
        name.includes('wf') ||
        tAbbr === 'wf'
      );
    };

    // Main 5-day solver loop
    for (let day = 0; day < 5; day++) {
      if (!nextSchedData[yearKey][day]) {
        nextSchedData[yearKey][day] = {};
      }

      appState.hours.forEach(hourKey => {
        const hourIdx = pl.hours.findIndex(h => String(h.num) === hourKey);
        if (hourIdx === -1) return;

        if (genClearExisting) {
          nextSchedData[yearKey][day][hourKey] = {};
        }

        const colKeyCells = nextSchedData[yearKey][day][hourKey] || {};
        nextSchedData[yearKey][day][hourKey] = colKeyCells;

        const lessonsToAssign: any[] = [];

        pl.classes.forEach(cls => {
          const lessonKey = `${cls.id}|${day}|${hourIdx}`;
          const lesson = pl.lessons[lessonKey];
          if (!lesson) return;

          const asg = assignmentsMap.get(lesson.assignmentId);
          if (!asg) return;

          // Deduplicate multi-class assignments
          if (asg.linkedClassIds && asg.linkedClassIds.length > 0 && cls.id !== asg.classId) {
            return;
          }

          const teacher = asg.teacherId ? teachersMap.get(asg.teacherId) : null;
          const subject = subjectsMap.get(asg.subjectId);
          const roomEtap1 = asg.roomId ? roomsMap.get(asg.roomId) : null;

          const suppTeacher = lesson.supportTeacherId ? teachersMap.get(lesson.supportTeacherId) : null;
          const extraClasses = asg.linkedClassIds && asg.linkedClassIds.length > 0
            ? (asg.linkedClassIds.map(id => pl.classes.find(c => c.id === id)?.name).filter(Boolean) as string[])
            : [];
          const combinedClasses = [cls.name, ...extraClasses];

          const isPE = isPESubject(asg.subjectId, asg.teacherId);

          lessonsToAssign.push({
            id: lessonKey,
            assignmentId: asg.id,
            classId: cls.id,
            className: cls.name,
            classYear: cls.year,
            groupId: asg.groupId,
            combinedClasses,
            teacherId: asg.teacherId,
            teacherAbbr: teacher?.abbr || '?',
            suppTeacherAbbr: suppTeacher?.abbr,
            subjectId: asg.subjectId,
            subjectShort: subject?.short || 'Zajęcia',
            subjectName: subject?.name || 'Zajęcia',
            suggestedRoomId: asg.roomId,
            suggestedRoomName: roomEtap1 ? roomEtap1.name : null,
            isPE
          });
        });

        const availableMainCols = allRoomCols.filter(col => {
          const roomNameClean = (col.room.num || '').toLowerCase().trim();
          const meta = roomsMap.get(roomNameClean);
          const bld = appState.buildings[col.floor.buildingIdx];
          const isIndividual = meta?.type === 'indywidualne';
          const isSport = meta?.type === 'sport' || bld?.multi === true;
          return !isIndividual && !isSport;
        });

        const availableSportCols = allRoomCols.filter(col => {
          const roomNameClean = (col.room.num || '').toLowerCase().trim();
          const meta = roomsMap.get(roomNameClean);
          const bld = appState.buildings[col.floor.buildingIdx];
          return meta?.type === 'sport' || bld?.multi === true;
        });

        const occupiedKeys = new Set<string>();
        Object.keys(colKeyCells).forEach(ck => {
          const cell = colKeyCells[ck];
          if (cell) {
            occupiedKeys.add(ck);
          }
        });

        const standardLessons = lessonsToAssign.filter(l => !l.isPE);
        const peLessons = lessonsToAssign.filter(l => l.isPE);

        // A. Place PE Lessons
        if (genExcludeWF) {
          if (genAutoPlaceWF) {
            peLessons.forEach(lesson => {
              let assignedKey = '';
              for (const col of availableSportCols) {
                const key = colKey(col);
                if (!occupiedKeys.has(key)) {
                  assignedKey = key;
                  break;
                }
              }

              if (!assignedKey) {
                totalUnassigned++;
              } else {
                occupiedKeys.add(assignedKey);
                colKeyCells[assignedKey] = {
                  teacherAbbr: lesson.teacherAbbr,
                  supportTeacherAbbr: lesson.suppTeacherAbbr,
                  classes: lesson.combinedClasses,
                  className: mergeClassNames(lesson.combinedClasses).join('+'),
                  subject: lesson.subjectName,
                  note: 'Zajęcia sportowe (W-F)',
                  _bridgeMeta: {
                    classId: lesson.classId,
                    teacherId: lesson.teacherId,
                    subjectId: lesson.subjectId,
                    roomId: lesson.suggestedRoomId,
                    groupId: null,
                    suggestedRoom: lesson.suggestedRoomName
                  }
                };
                totalPlaced++;
              }
            });
          } else {
            totalSkippedPE += peLessons.length;
          }
        } else {
          standardLessons.push(...peLessons);
        }

        // B. Place Standard Lessons (Greedy heuristic matching with custom priorities)
        let unassignedStandard = [...standardLessons];

        while (unassignedStandard.length > 0) {
          const candidates: { lessonIdx: number; colKey: string; score: number }[] = [];

          unassignedStandard.forEach((lesson, lIdx) => {
            allRoomCols.forEach(col => {
              const key = colKey(col);
              if (occupiedKeys.has(key)) return;

              const roomNameClean = (col.room.num || '').toLowerCase().trim();
              const meta = roomsMap.get(roomNameClean);
              const bld = appState.buildings[col.floor.buildingIdx];
              const isSport = meta?.type === 'sport' || bld?.multi === true;
              const isIndividual = meta?.type === 'indywidualne';

              let score = 0;

              // Rule 1: Homerooms (Sala wychowawcza klasy lub gospodarz sali)
              const hr = appState.homerooms?.[key];
              if (genPriorityHomerooms && hr) {
                if (hr.className && lesson.combinedClasses.some(cName => cName.toUpperCase().trim() === hr.className.toUpperCase().trim())) {
                  score += 2000;
                }
                if (hr.teacherAbbr && lesson.teacherAbbr && hr.teacherAbbr.toUpperCase().trim() === lesson.teacherAbbr.toUpperCase().trim()) {
                  score += 1200;
                }
                if (hr.className2 && lesson.combinedClasses.some(cName => cName.toUpperCase().trim() === hr.className2.toUpperCase().trim())) {
                  score += 800;
                }
                if (hr.teacherAbbr2 && lesson.teacherAbbr && hr.teacherAbbr2.toUpperCase().trim() === lesson.teacherAbbr.toUpperCase().trim()) {
                  score += 500;
                }
              }

              // Rule 2: Teacher's Preferred Classroom
              if (genPriorityTeachers && lesson.teacherId) {
                const tObj = appState.teachers.find(t => t.id === lesson.teacherId);
                if (tObj?.preferredRooms && tObj.preferredRooms.includes(key)) {
                  score += 1500;
                }
              }

              // Rule 3: Suggested Room from Etap 1
              if (lesson.suggestedRoomName && roomNameClean === lesson.suggestedRoomName.toLowerCase().trim()) {
                score += 300;
              }

              // Teacher's consecutive lessons: if advisor taught in this colKey at the previous hour, stay in same room
              if (hourIdx > 0 && lesson.teacherId) {
                const prevHourKey = appState.hours[hourIdx - 1];
                const prevColKeyCells = nextSchedData[yearKey][day][prevHourKey] || {};
                const prevCell = prevColKeyCells[key]; // key is the colKey of the room candidate
                if (prevCell) {
                  const cellsList = Array.isArray(prevCell) ? prevCell : [prevCell];
                  const hasSameTeacher = cellsList.some(cell => {
                    const cellMeta = cell?._bridgeMeta;
                    return cellMeta && cellMeta.teacherId === lesson.teacherId;
                  });
                  if (hasSameTeacher) {
                    score += 5000; // Large bonus to stay in same room!
                  }
                }
              }

              // Special younger classes (1-3) rule: standard lessons (except PE/Informatics) must reside in homerooms
              const isGrade1_3 = (lesson.classYear && lesson.classYear >= 1 && lesson.classYear <= 3) || 
                                 ['1', '2', '3'].includes((lesson.className || '').trim().charAt(0));
                                 
              const isINFSubject = (subjectId: string) => {
                const sub = subjectsMap.get(subjectId);
                if (!sub) return false;
                const name = (sub.name || '').toLowerCase();
                const short = (sub.short || '').toLowerCase();
                return (
                  short.includes('inf') ||
                  short.includes('e-inf') ||
                  name.includes('informatyk') ||
                  name.includes('edukacja informatyczna') ||
                  name.includes('zajęcia komputerowe')
                );
              };
              
              const isPEOrInf = lesson.isPE || isINFSubject(lesson.subjectId);
              
              // Find if this classroom is registered as this class's homeroom
              const isClassHomeroom = hr && hr.className && (
                hr.className.toUpperCase().trim() === lesson.className.toUpperCase().trim() ||
                (hr.className2 && hr.className2.toUpperCase().trim() === lesson.className.toUpperCase().trim())
              );
              
              if (isGrade1_3 && !isPEOrInf) {
                const classHasHomeroomDefined = Object.values(appState.homerooms || {}).some(hObj => 
                  hObj.className?.toUpperCase().trim() === lesson.className.toUpperCase().trim() ||
                  hObj.className2?.toUpperCase().trim() === lesson.className.toUpperCase().trim()
                );
                
                if (classHasHomeroomDefined) {
                  if (isClassHomeroom) {
                    score += 50000; // Enormous bonus to enforce placement in own homeroom
                  } else {
                    score -= 50000; // Enormous penalty to prevent placement in other classrooms
                  }
                }

                // Dedicated 1-3 room allocation rule
                if (meta?.isGrade1_3) {
                  score += 15000; // Prefer designated 1-3 classrooms
                } else {
                  score -= 5000;  // Discourage placement of 1-3 classes in generic classrooms
                }
              } else if (!isGrade1_3) {
                // Prevent older classes from stealing rooms marked explicitly for 1-3
                if (meta?.isGrade1_3) {
                  score -= 20000; // Strong penalty to leave 1-3 classrooms empty for juniors
                }
              }

              // Whole-class lessons versus group-divided lessons prioritization in large/small rooms
              const isWholeClass = !lesson.groupId;
              const capacity = meta?.capacity || 30; // standard room defaults to 30
              
              if (isWholeClass) {
                // If taking whole class, prefer larger rooms
                if (capacity >= 25) {
                  score += capacity * 30; // e.g. up to +1500 score bonus for large capacity
                } else {
                  score -= (30 - capacity) * 30; // penalty for placing whole class in small rooms
                }
              } else {
                // For group split classes, prefer smaller rooms so we leave large ones to whole classes
                if (capacity >= 25) {
                  score -= capacity * 40; // penalize group-split lesson taking large room (e.g. up to -1200)
                } else {
                  score += (30 - capacity) * 40; // bonus for choosing smaller room
                }
              }

              // Adjustments/Penalties for sport or individual rooms when placing standard lessons
              if (isSport) {
                score -= 800;
              }
              if (isIndividual) {
                score -= 400;
              }

              candidates.push({
                lessonIdx: lIdx,
                colKey: key,
                score
              });
            });
          });

          if (candidates.length === 0) {
            unassignedStandard.forEach(() => {
              totalUnassigned++;
            });
            break;
          }

          candidates.sort((a, b) => b.score - a.score);
          const best = candidates[0];

          if (best.score < -4000) {
            unassignedStandard.forEach(() => {
              totalUnassigned++;
            });
            break;
          }

          const chosenLesson = unassignedStandard[best.lessonIdx];
          const chosenRoomKey = best.colKey;

          colKeyCells[chosenRoomKey] = {
            teacherAbbr: chosenLesson.teacherAbbr,
            supportTeacherAbbr: chosenLesson.suppTeacherAbbr,
            classes: chosenLesson.combinedClasses,
            className: mergeClassNames(chosenLesson.combinedClasses).join('+'),
            subject: chosenLesson.subjectName,
            note: chosenLesson.suggestedRoomName ? `(sugestia: ${chosenLesson.suggestedRoomName})` : undefined,
            _bridgeMeta: {
              classId: chosenLesson.classId,
              teacherId: chosenLesson.teacherId,
              subjectId: chosenLesson.subjectId,
              roomId: chosenLesson.suggestedRoomId,
              groupId: null,
              suggestedRoom: chosenLesson.suggestedRoomName
            }
          };

          occupiedKeys.add(chosenRoomKey);
          totalPlaced++;

          unassignedStandard.splice(best.lessonIdx, 1);
        }
      });
    }

    onChangeSchedData(nextSchedData);

    let summary = `Wygenerowano plan dla sal lekcyjnych!\n`;
    summary += `🔹 Przydzielono pomyślnie: ${totalPlaced} godzin\n`;
    if (totalSkippedPE > 0) {
      summary += `🔹 Pominięte lekcje W-F: ${totalSkippedPE} godzin\n`;
    }
    if (totalUnassigned > 0) {
      summary += `⚠️ Brak wolnych sal dla: ${totalUnassigned} lekcji (wypchnięte do puli bocznej)`;
    }

    notify(summary, 'ok');
    setShowGenerator(false);
  };

  const sortedClasses = useMemo(() => {
    return [...appState.classes].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [appState.classes]);

  const sortedTeachers = useMemo(() => {
    return [...appState.teachers].sort((a, b) => {
      const aName = `${a.last || ''} ${a.first || ''}`.trim() || a.abbr || '';
      const bName = `${b.last || ''} ${b.first || ''}`.trim() || b.abbr || '';
      return aName.localeCompare(bName, 'pl');
    });
  }, [appState.teachers]);

  const handleEditHomeroom = (col: any, cKey: string) => {
    const hr = appState.homerooms?.[cKey] || { className: '', teacherAbbr: '', className2: '', teacherAbbr2: '' };
    setHrClassName(hr.className || '');
    setHrTeacherAbbr(hr.teacherAbbr || '');
    setHrClassName2(hr.className2 || '');
    setHrTeacherAbbr2(hr.teacherAbbr2 || '');
    setEditingHomeroom({ colKey: cKey, roomNum: col.room.num, sub: col.room.sub });
  };

  const handleSaveHomeroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHomeroom) return;

    const { colKey: cKey } = editingHomeroom;
    const currentHomerooms = { ...(appState.homerooms || {}) };

    const cName = hrClassName.trim();
    const tAbbr = hrTeacherAbbr.trim();
    const cName2 = hrClassName2.trim();
    const tAbbr2 = hrTeacherAbbr2.trim();

    if (!cName && !tAbbr && !cName2 && !tAbbr2) {
      delete currentHomerooms[cKey];
    } else {
      currentHomerooms[cKey] = {
        className: cName || '',
        teacherAbbr: tAbbr || undefined,
        className2: cName2 || undefined,
        teacherAbbr2: tAbbr2 || undefined,
      };
    }

    onChangeAppState({
      ...appState,
      homerooms: currentHomerooms
    });

    setEditingHomeroom(null);
    notify('Zapisano opiekuna/gospodarza sali', 'ok');
  };

  const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

  // Map room name to metadata classroom object
  const roomsMap = useMemo(() => {
    return new Map(appState.planLekcji.rooms.map(r => [r.name.toLowerCase().trim(), r]));
  }, [appState.planLekcji.rooms]);

  // Classified and sorted columns (rooms) list
  const classifiedCols = useMemo(() => {
    const rawCols = flattenColumns(appState.floors);

    const mainCols: typeof rawCols = [];
    const individualCols: typeof rawCols = [];
    const sportCols: typeof rawCols = [];

    rawCols.forEach(col => {
      const roomNameClean = (col.room.num || '').toLowerCase().trim();
      const meta = roomsMap.get(roomNameClean);
      const bld = appState.buildings[col.floor.buildingIdx];

      const isIndividual = meta?.type === 'indywidualne';
      const isSport = meta?.type === 'sport' || bld?.multi === true;

      if (isIndividual) {
        individualCols.push(col);
      } else if (isSport) {
        sportCols.push(col);
      } else {
        mainCols.push(col);
      }
    });

    // Sort alphanumerically by room.num
    const sortFn = (a: typeof rawCols[0], b: typeof rawCols[0]) => {
      const numA = a.room.num || '';
      const numB = b.room.num || '';
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    };

    mainCols.sort(sortFn);
    individualCols.sort(sortFn);
    sportCols.sort(sortFn);

    return {
      main: mainCols,
      individual: individualCols,
      sport: sportCols
    };
  }, [appState.floors, appState.buildings, roomsMap]);

  // Flat list of active columns
  const cols = useMemo(() => {
    return classifiedCols[activeRoomCategory];
  }, [classifiedCols, activeRoomCategory]);

  // Group columns for layout merging
  const buildingGroups = useMemo(() => {
    const groups: { startIdx: number; span: number; buildingIdx: number; name: string }[] = [];
    let currentGroup = null as any;

    cols.forEach((col, idx) => {
      const bIdx = col.floor.buildingIdx;
      const bld = appState.buildings[bIdx];
      const name = bld?.name || 'Budynek';

      if (!currentGroup || currentGroup.buildingIdx !== bIdx) {
        currentGroup = { startIdx: idx, span: 1, buildingIdx: bIdx, name };
        groups.push(currentGroup);
      } else {
        currentGroup.span++;
      }
    });

    return groups;
  }, [cols, appState.buildings]);

  const floorGroups = useMemo(() => {
    const groups: { startIdx: number; span: number; name: string; buildingName?: string }[] = [];
    let currentGroup = null as any;

    cols.forEach((col, idx) => {
      const bIdx = col.floor.buildingIdx;
      const bld = appState.buildings[bIdx];
      const buildingName = bld?.name || '';
      const fId = col.floor.id;
      const name = col.floor.name;
      const key = `${bIdx}|${fId}`;

      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { startIdx: idx, span: 1, key, name, buildingName };
        groups.push(currentGroup);
      } else {
        currentGroup.span++;
      }
    });

    return groups;
  }, [cols, appState.buildings]);

  const segmentGroups = useMemo(() => {
    const groups: { startIdx: number; span: number; name: string }[] = [];
    let currentGroup = null as any;

    cols.forEach((col, idx) => {
      const bIdx = col.floor.buildingIdx;
      const fId = col.floor.id;
      const sId = col.seg?.id || 'default_seg';
      const name = col.seg?.name || 'Główny';
      const key = `${bIdx}|${fId}|${sId}`;

      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { startIdx: idx, span: 1, key, name };
        groups.push(currentGroup);
      } else {
        currentGroup.span++;
      }
    });

    return groups;
  }, [cols]);

  // Current day sched data
  const currentDayData = useMemo(() => {
    return schedData[appState.yearKey]?.[activeDay] || {};
  }, [schedData, appState.yearKey, activeDay]);

  // Resolvers for Etap 1 -> Etap 2 Bridging
  const assignmentsMap = useMemo(() => {
    return new Map((appState.planLekcji.assignments || []).map(a => [a.id, a]));
  }, [appState.planLekcji.assignments]);

  const teachersMap = useMemo(() => {
    return new Map((appState.planLekcji.teachers || []).map(t => [t.id, t]));
  }, [appState.planLekcji.teachers]);

  const subjectsMap = useMemo(() => {
    return new Map((appState.planLekcji.subjects || []).map(s => [s.id, s]));
  }, [appState.planLekcji.subjects]);

  const rMap = useMemo(() => {
    return new Map((appState.planLekcji.rooms || []).map(r => [r.id, r]));
  }, [appState.planLekcji.rooms]);

  // Set of classes assigned at any given hour on current active day in plan sal
  const isAssigned = useMemo(() => {
    const map = new Set<string>();
    appState.hours.forEach(h => {
      const row = currentDayData[h] || {};
      Object.keys(row).forEach(cKey => {
        const cell = row[cKey];
        if (!cell) return;
        const slots = Array.isArray(cell) ? cell : [cell];
        slots.forEach(slot => {
          if (!slot) return;
          const classes = slot.classes || (slot.className ? [slot.className] : []);
          classes.forEach(c => {
            if (c) {
              map.add(`${h}|${c.toUpperCase()}`);
            }
          });
        });
      });
    });
    return map;
  }, [currentDayData, appState.hours]);

  // Flat list of all scheduled lessons for chosen activeDay from Etap 1
  const poolLessons = useMemo(() => {
    const pl = appState.planLekcji;
    if (!pl || !pl.classes) return [];

    const list: {
      id: string;
      className: string;
      subject: string;
      teacherAbbr: string;
      hourKey: string;
      suggestedRoom: string;
      isAssigned: boolean;
    }[] = [];

    pl.classes.forEach(cls => {
      appState.hours.forEach((hKey) => {
        const hIdx = pl.hours.findIndex(h => String(h.num) === hKey);
        if (hIdx === -1) return;

        const lessonKey = `${cls.id}|${activeDay}|${hIdx}`;
        const lesson = pl.lessons?.[lessonKey];
        if (!lesson) return;

        const asg = assignmentsMap.get(lesson.assignmentId);
        if (!asg) return;

        const className = cls.name;
        const subject = subjectsMap.get(asg.subjectId)?.name || 'Przedmiot';
        const teacherAbbr = asg.teacherId ? teachersMap.get(asg.teacherId)?.abbr || '' : '';
        const suggestedRoom = asg.roomId ? rMap.get(asg.roomId)?.name || '' : '';
        
        const assigned = isAssigned.has(`${hKey}|${className.toUpperCase()}`);

        list.push({
          id: `${cls.id}-${activeDay}-${hKey}`,
          className,
          subject,
          teacherAbbr,
          hourKey: hKey,
          suggestedRoom,
          isAssigned: assigned
        });
      });
    });

    return list;
  }, [appState.planLekcji, appState.hours, activeDay, assignmentsMap, subjectsMap, rMap, isAssigned]);

  const hourLessons = useMemo(() => {
    if (!editingCell) return [];
    return poolLessons.filter(l => l.hourKey === editingCell.hour);
  }, [poolLessons, editingCell]);

  const scheduledClasses = useMemo(() => {
    return Array.from(new Set(hourLessons.map(l => l.className))).sort();
  }, [hourLessons]);

  const unassignedScheduledClasses = useMemo(() => {
    if (!editingCell) return [];
    const hour = editingCell.hour;
    
    const otherAssignedClasses = new Set<string>();
    const yearKey = appState.yearKey;
    const hourRow = schedData[yearKey]?.[activeDay]?.[hour] || {};
    
    Object.entries(hourRow).forEach(([cKey, cell]) => {
      const isCurrentEditing = cKey === editingCell.colKey;
      if (!cell) return;
      const slots = Array.isArray(cell) ? cell : [cell];
      slots.forEach((slot, slIdx) => {
        if (isCurrentEditing && (editingCell.slotIdx === undefined || editingCell.slotIdx === slIdx)) {
          return;
        }
        if (!slot) return;
        const clses = slot.classes || (slot.className ? [slot.className] : []);
        clses.forEach(c => {
          if (c) otherAssignedClasses.add(c.trim().toUpperCase());
        });
      });
    });

    return scheduledClasses.filter(cls => {
      return !otherAssignedClasses.has(cls.trim().toUpperCase());
    });
  }, [editingCell, scheduledClasses, schedData, appState.yearKey, activeDay]);

  const getScheduledOptionsForIndex = (index: number) => {
    return unassignedScheduledClasses.filter(clsName => {
      const isSelectedElsewhere = selectedClasses.some((c, idx) => idx !== index && c && c.toUpperCase() === clsName.toUpperCase());
      return !isSelectedElsewhere;
    });
  };

  const getOtherOptionsForIndex = (index: number) => {
    const schedSet = new Set(unassignedScheduledClasses.map(c => c.toUpperCase()));
    return sortedClasses
      .map(c => c.name)
      .filter(clsName => {
        if (schedSet.has(clsName.toUpperCase())) return false;
        const isSelectedElsewhere = selectedClasses.some((c, idx) => idx !== index && c && c.toUpperCase() === clsName.toUpperCase());
        return !isSelectedElsewhere;
      });
  };

  const canAddMoreClasses = useMemo(() => {
    if (!editingCell) return false;
    const selectedSet = new Set(selectedClasses.map(c => c ? c.toUpperCase() : ''));
    return sortedClasses.some(c => !selectedSet.has(c.name.toUpperCase()));
  }, [editingCell, sortedClasses, selectedClasses]);

  const scheduledTeachers = useMemo(() => {
    return Array.from(new Set(hourLessons.map(l => l.teacherAbbr).filter(Boolean))).sort();
  }, [hourLessons]);

  const scheduledSubjects = useMemo(() => {
    return Array.from(new Set(hourLessons.map(l => l.subject).filter(Boolean))).sort();
  }, [hourLessons]);

  const sortedSubjects = useMemo(() => {
    return [...appState.subjects].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [appState.subjects]);

  // Collision Checking (School-wide checked)
  const collisions = useMemo(() => {
    // Map teacher abbreviations to Teacher objects for availability checks
    const teachersByAbbr = new Map<string, typeof appState.planLekcji.teachers[0]>();
    (appState.planLekcji.teachers || []).forEach(t => {
      if (t.abbr) {
        teachersByAbbr.set(t.abbr.toUpperCase().trim(), t);
      }
    });

    // teacherLocations: "teacherAbbr|hour" -> list of { colKey, slotIdx, isSupport?: boolean }
    const teacherLocations = new Map<string, { colKey: string; slotIdx?: number; isSupport?: boolean }[]>();
    // classLocations: "classAbbr|hour" -> list of { colKey, slotIdx }
    const classLocations = new Map<string, { colKey: string; slotIdx?: number }[]>();

    // detected: "hour|colKey" -> set of conflict descriptions / reasons
    const detected = new Map<string, string[]>();
    
    // specific slots in conflict: "hour|colKey|slotIdx" -> array of descriptions
    const slotConflicts = new Map<string, string[]>();

    const allCols = flattenColumns(appState.floors);

    // Phase 1: Collect all bookings for teachers and classes at each hour
    appState.hours.forEach(h => {
      const row = currentDayData[h] || {};
      allCols.forEach(col => {
        const cKey = colKey(col);
        const cell = row[cKey];
        if (!cell) return;

        const bld = appState.buildings[col.floor.buildingIdx];
        const roomNameClean = (col.room.num || '').toLowerCase().trim();
        const meta = roomsMap.get(roomNameClean);
        const isSport = meta?.type === 'sport' || bld?.multi === true;

        const slots: SchedCell[] = Array.isArray(cell) ? cell : [cell];

        slots.forEach((slot, slIdx) => {
          if (!slot) return;

          // Register teacher
          if (slot.teacherAbbr) {
            const tAbbrUpper = slot.teacherAbbr.toUpperCase().trim();
            const tKey = `${tAbbrUpper}|${h}`;
            const list = teacherLocations.get(tKey) || [];
            list.push({ colKey: cKey, slotIdx: isSport ? slIdx : undefined });
            teacherLocations.set(tKey, list);

            // Check availability of teacher
            const teacher = teachersByAbbr.get(tAbbrUpper);
            if (teacher && teacher.availability) {
              const hIdx = appState.planLekcji.hours.findIndex(hourObj => String(hourObj.num) === h);
              if (hIdx !== -1) {
                const checkCode = `${activeDay}-${hIdx}`;
                if (!teacher.availability.includes(checkCode)) {
                  const desc = `⚠️ Niedostępność: Nauczyciel: ${teacher.first} ${teacher.last} (${teacher.abbr}) nie ma wyznaczonej dostępności w tym terminie!`;
                  const keyInCol = `${h}|${cKey}`;
                  const existing = detected.get(keyInCol) || [];
                  if (!existing.includes(desc)) {
                    existing.push(desc);
                    detected.set(keyInCol, existing);
                  }
                  
                  const sKey = `${h}|${cKey}|${slIdx}`;
                  const sExisting = slotConflicts.get(sKey) || [];
                  if (!sExisting.includes(desc)) {
                    sExisting.push(desc);
                    slotConflicts.set(sKey, sExisting);
                  }
                }
              }
            }
          }

          // Register support teacher
          if (slot.supportTeacherAbbr) {
            const tAbbrUpper = slot.supportTeacherAbbr.toUpperCase().trim();
            const tKey = `${tAbbrUpper}|${h}`;
            const list = teacherLocations.get(tKey) || [];
            list.push({ colKey: cKey, slotIdx: isSport ? slIdx : undefined, isSupport: true });
            teacherLocations.set(tKey, list);

            // Check availability of support teacher
            const teacher = teachersByAbbr.get(tAbbrUpper);
            if (teacher && teacher.availability) {
              const hIdx = appState.planLekcji.hours.findIndex(hourObj => String(hourObj.num) === h);
              if (hIdx !== -1) {
                const checkCode = `${activeDay}-${hIdx}`;
                if (!teacher.availability.includes(checkCode)) {
                  const desc = `⚠️ Niedostępność nauczyciela wsp.: ${teacher.first} ${teacher.last} (${teacher.abbr}) nie ma wyznaczonej dostępności w tym terminie!`;
                  const keyInCol = `${h}|${cKey}`;
                  const existing = detected.get(keyInCol) || [];
                  if (!existing.includes(desc)) {
                    existing.push(desc);
                    detected.set(keyInCol, existing);
                  }
                  
                  const sKey = `${h}|${cKey}|${slIdx}`;
                  const sExisting = slotConflicts.get(sKey) || [];
                  if (!sExisting.includes(desc)) {
                    sExisting.push(desc);
                    slotConflicts.set(sKey, sExisting);
                  }
                }
              }
            }
          }

          // Register classes (including split entries to detect split group conflicts)
          const classNames = slot.classes || (slot.className ? [slot.className] : []);
          const expandedClasses: string[] = [];
          
          classNames.forEach(cls => {
            if (!cls) return;
            const list = cls.split(/[\s,+/]+|(?:\bi\b)/i).map(c => c.trim().toUpperCase()).filter(Boolean);
            expandedClasses.push(...list);
          });

          expandedClasses.forEach(cls => {
            const cKeyCombined = `${cls}|${h}`;
            const list = classLocations.get(cKeyCombined) || [];
            list.push({ colKey: cKey, slotIdx: isSport ? slIdx : undefined });
            classLocations.set(cKeyCombined, list);
          });
        });
      });
    });

    // Phase 2: Analyze and flag school-wide overlaps
    // For Teachers:
    teacherLocations.forEach((list, tKey) => {
      if (list.length > 1) {
        const [teacherAbbr, h] = tKey.split('|');
        const distinctCols = Array.from(new Set(list.map(item => item.colKey)));
        if (distinctCols.length > 1) {
          list.forEach(item => {
            const keyInCol = `${h}|${item.colKey}`;
            const otherRms = distinctCols.filter(c => c !== item.colKey).map(c => {
               const foundCol = allCols.find(x => colKey(x) === c);
               return foundCol ? foundCol.room.num : c;
            }).join(', ');
            const desc = `Szkolny konflikt: Nauczyciel ${teacherAbbr} ${item.isSupport ? '(wspomagający)' : ''} przypisany równolegle do sal: ${otherRms}`;

            // Add to room detected
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            // Add to slot conflict if present
            if (item.slotIdx !== undefined) {
              const sKey = `${h}|${item.colKey}|${item.slotIdx}`;
              const sExisting = slotConflicts.get(sKey) || [];
              if (!sExisting.includes(desc)) {
                sExisting.push(desc);
                slotConflicts.set(sKey, sExisting);
              }
            }
          });
        }
      }
    });

    // For Classes:
    classLocations.forEach((list, cKeyCombined) => {
      if (list.length > 1) {
        const [cls, h] = cKeyCombined.split('|');
        const distinctCols = Array.from(new Set(list.map(item => item.colKey)));
        if (distinctCols.length > 1) {
          list.forEach(item => {
            const keyInCol = `${h}|${item.colKey}`;
            const otherRms = distinctCols.filter(c => c !== item.colKey).map(c => {
               const foundCol = allCols.find(x => colKey(x) === c);
               return foundCol ? foundCol.room.num : c;
            }).join(', ');
            const desc = `Szkolny konflikt: Klasa ${cls} przypisana równolegle do sal: ${otherRms}`;

            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            if (item.slotIdx !== undefined) {
              const sKey = `${h}|${item.colKey}|${item.slotIdx}`;
              const sExisting = slotConflicts.get(sKey) || [];
              if (!sExisting.includes(desc)) {
                sExisting.push(desc);
                slotConflicts.set(sKey, sExisting);
              }
            }
          });
        }
      }
    });

    // Phase 3: Local Room Conflicts (Duplicate teachers/classes in the single room at the same hour)
    appState.hours.forEach(h => {
      const row = currentDayData[h] || {};
      allCols.forEach(col => {
        const cKey = colKey(col);
        const cell = row[cKey];
        if (!cell) return;

        const bld = appState.buildings[col.floor.buildingIdx];
        const roomNameClean = (col.room.num || '').toLowerCase().trim();
        const meta = roomsMap.get(roomNameClean);
        const isSport = meta?.type === 'sport' || bld?.multi === true;

        const slots: SchedCell[] = Array.isArray(cell) ? cell : [cell];

        if (slots.length === 0) return;

        const keyInCol = `${h}|${cKey}`;

        // 1. Check if the classes in this room are part of combined/integrated groups in the timetable (zajęcia międzyoddziałowe)
        const teachersInThisRoom = slots.map(s => s?.teacherAbbr?.trim().toUpperCase()).filter(Boolean);
        const classesInThisRoom: string[] = [];
        slots.forEach(s => {
          const classNames = s?.classes || (s?.className ? [s?.className] : []);
          classNames.forEach(cls => {
            if (cls?.trim()) {
              const individualList = cls.split(/[\s,+/]+|(?:\bi\b)/i).map(c => c.trim().toUpperCase()).filter(Boolean);
              classesInThisRoom.push(...individualList);
            }
          });
        });

        const uniqueClasses = Array.from(new Set(classesInThisRoom));

        let classesAreCombined = false;
        if (uniqueClasses.length > 1) {
          const hIdx = appState.planLekcji.hours.findIndex(hourObj => String(hourObj.num) === h);
          if (hIdx !== -1) {
            const classObjs = uniqueClasses.map(name => 
              appState.planLekcji.classes.find(c => c.name.toUpperCase().trim() === name.toUpperCase().trim())
            ).filter(Boolean);

            if (classObjs.length === uniqueClasses.length) {
              const targetClassIds = new Set(classObjs.map(c => c.id));
              
              // Helper to get assignments of class at hour h on activeDay
              const getAssignmentsForClass = (classId: string) => {
                const prefix = `${classId}|${activeDay}|${hIdx}`;
                const asgIds: string[] = [];
                Object.keys(appState.planLekcji.lessons || {}).forEach(k => {
                  if (k === prefix || k.startsWith(prefix + '|')) {
                    const lesson = appState.planLekcji.lessons[k];
                    if (lesson && lesson.assignmentId) {
                      asgIds.push(lesson.assignmentId);
                    }
                  }
                });
                return asgIds;
              };

              // Check if any assignment covers all target class IDs
              for (const cls of classObjs) {
                const asgIds = getAssignmentsForClass(cls.id);
                for (const asgId of asgIds) {
                  const asg = assignmentsMap.get(asgId);
                  if (!asg) continue;

                  const coveredClassIds = new Set<string>();
                  coveredClassIds.add(asg.classId);
                  if (asg.linkedClassIds) {
                    asg.linkedClassIds.forEach(id => coveredClassIds.add(id));
                  }

                  let coversAll = true;
                  for (const id of targetClassIds) {
                    if (!coveredClassIds.has(id)) {
                      coversAll = false;
                      break;
                    }
                  }

                  if (coversAll) {
                    classesAreCombined = true;
                    break;
                  }
                }
                if (classesAreCombined) break;
              }
            }
          }
        }

        // 2. Standard Room Check: a standard room model only expects maximum 1 lesson.
        // If there are multiple entries or lessons, that is a local room conflict, unless they are combined classes.
        if (!isSport && slots.length > 1 && !classesAreCombined) {
          const desc = `Lokalny konflikt: Więcej niż 1 przydział lekcji w tej samej standardowej sali`;
          const existing = detected.get(keyInCol) || [];
          if (!existing.includes(desc)) {
            existing.push(desc);
            detected.set(keyInCol, existing);
          }
        }

        // 3. Class duplicates / Teacher duplicates in the SAME room at the same time
        // If standard room:
        // By definition, a standard room should not have multiple different teachers or different classes, unless they are combined groups in the timetable
        if (!isSport) {
          const uniqueTeachers = Array.from(new Set(teachersInThisRoom));

          if (uniqueTeachers.length > 1) {
            const desc = `Konflikt Sali: Dwóch różnych nauczycieli (${uniqueTeachers.join(', ')}) w tej samej sali w tym samym czasie!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }
          }

          if (uniqueClasses.length > 1 && !classesAreCombined) {
            const desc = `Konflikt Sali: Dwie różne klasy (${uniqueClasses.join(', ')}) w tej samej sali w tym samym czasie!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }
          }
        } else {
          // If multi room (gym/sports), detect duplicate teacher or duplicate class WITHIN the gym slots
          // (They shouldn't be assigned twice in different slots of the same gym at the same hour)
          const teacherCounts = new Map<string, number>();
          teachersInThisRoom.forEach(t => teacherCounts.set(t, (teacherCounts.get(t) || 0) + 1));
          
          let duplicatedTeacher = '';
          teacherCounts.forEach((count, t) => {
            if (count > 1) duplicatedTeacher = t;
          });

          if (duplicatedTeacher) {
            const desc = `Lokalny konflikt: Nauczyciel ${duplicatedTeacher} przypisany podwójnie w tej samej sali sportowej!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            slots.forEach((s, slIdx) => {
              if (s?.teacherAbbr?.trim().toUpperCase() === duplicatedTeacher) {
                const sKey = `${h}|${cKey}|${slIdx}`;
                const sExisting = slotConflicts.get(sKey) || [];
                if (!sExisting.includes(desc)) {
                  sExisting.push(desc);
                  slotConflicts.set(sKey, sExisting);
                }
              }
            });
          }

          const classCounts = new Map<string, number>();
          classesInThisRoom.forEach(c => classCounts.set(c, (classCounts.get(c) || 0) + 1));

          let duplicatedClass = '';
          classCounts.forEach((count, c) => {
            if (count > 1) duplicatedClass = c;
          });

          if (duplicatedClass) {
            const desc = `Lokalny konflikt: Klasa ${duplicatedClass} przypisana podwójnie w tej samej sali sportowej!`;
            const existing = detected.get(keyInCol) || [];
            if (!existing.includes(desc)) {
              existing.push(desc);
              detected.set(keyInCol, existing);
            }

            slots.forEach((s, slIdx) => {
              const sClasses = s?.classes || (s?.className ? [s?.className] : []);
              if (sClasses.some(cls => cls?.trim().toUpperCase() === duplicatedClass)) {
                const sKey = `${h}|${cKey}|${slIdx}`;
                const sExisting = slotConflicts.get(sKey) || [];
                if (!sExisting.includes(desc)) {
                  sExisting.push(desc);
                  slotConflicts.set(sKey, sExisting);
                }
              }
            });
          }
        }
      });
    });

    return {
      detected,       // key: "h|cKey", value: array of description strings
      slotConflicts   // key: "h|cKey|slotIdx", value: array of description strings
    };
  }, [currentDayData, appState.hours, appState.floors, appState.buildings, roomsMap]);

  // ── HANDLING MODAL ACTIONS ──

  const handleOpenEdit = (hour: string, cKey: string, slotIdx?: number) => {
    const raw = currentDayData[hour]?.[cKey];
    let cell: SchedCell | null = null;
    if (Array.isArray(raw)) {
      cell = (slotIdx !== undefined ? raw[slotIdx] : raw[0]) || null;
    } else {
      cell = (raw as SchedCell) || null;
    }

    setEditingCell({ hour, colKey: cKey, slotIdx });
    const initClass = cell?.className || cell?.classes?.[0] || '';
    const rawClasses = cell?.classes || (cell?.className ? [cell.className] : []);
    setSelectedClasses(rawClasses.length > 0 ? rawClasses.map(c => c.trim()) : ['']);
    const initTeacher = cell?.teacherAbbr || '';
    const initSupportTeacher = cell?.supportTeacherAbbr || '';
    const initSubject = cell?.subject || '';
    const initNote = cell?.note || '';

    setCellClass(initClass);
    setCellTeacher(initTeacher);
    setCellSupportTeacher(initSupportTeacher);
    setCellSubject(initSubject);
    setCellNote(initNote);

    // Determine custom flags
    const hLessons = poolLessons.filter(l => l.hourKey === hour);

    const isClassKnown = initClass === '' || hLessons.some(l => l.className.toUpperCase() === initClass.toUpperCase()) || appState.classes.some(c => c.name.toUpperCase() === initClass.toUpperCase());
    setIsCustomClass(!isClassKnown);

    const isTeacherKnown = initTeacher === '' || hLessons.some(l => l.teacherAbbr.toUpperCase() === initTeacher.toUpperCase()) || appState.teachers.some(t => t.abbr?.toUpperCase() === initTeacher.toUpperCase());
    setIsCustomTeacher(!isTeacherKnown);

    const isSupportTeacherKnown = initSupportTeacher === '' || appState.teachers.some(t => t.abbr?.toUpperCase() === initSupportTeacher.toUpperCase());
    setIsCustomSupportTeacher(!isSupportTeacherKnown);

    const isSubjectKnown = initSubject === '' || hLessons.some(l => l.subject.toUpperCase() === initSubject.toUpperCase()) || appState.subjects.some(s => s.name.toUpperCase() === initSubject.toUpperCase());
    setIsCustomSubject(!isSubjectKnown);
  };

  const handleAddNewClassInline = () => {
    const trimmed = newInlineClassName.trim().toUpperCase();
    if (!trimmed) {
      notify('Nazwa klasy nie może być pusta!', 'err');
      return;
    }

    // Check if class already exists
    if (appState.classes.some(c => c.name.toUpperCase() === trimmed)) {
      notify('Klasa o tej nazwie już istnieje!', 'err');
      setCellClass(trimmed);
      setSelectedClasses(prev => {
        const copy = [...prev];
        if (copy.length === 0) return [trimmed];
        copy[copy.length - 1] = trimmed;
        return copy;
      });
      setIsCustomClass(false);
      setIsAddingClassInline(false);
      setNewInlineClassName('');
      return;
    }

    const newClass: Class = {
      id: 'cls_' + Math.random().toString(36).substring(2, 9),
      name: trimmed,
      color: '#6366f1',
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

    setCellClass(trimmed);
    setSelectedClasses(prev => {
      const copy = [...prev];
      if (copy.length === 0) return [trimmed];
      copy[copy.length - 1] = trimmed;
      return copy;
    });
    setIsCustomClass(false);
    setIsAddingClassInline(false);
    setNewInlineClassName('');
    notify(`Dodano nową klasę: ${trimmed}`, 'ok');
  };

  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;

    const { hour, colKey: cKey, slotIdx } = editingCell;
    const yearKey = appState.yearKey;

    const finalClasses = selectedClasses.map(c => c.trim().toUpperCase()).filter(Boolean);
    const combinedClassName = finalClasses.join(' + ');

    const newCell: SchedCell = {
      teacherAbbr: cellTeacher.trim().toUpperCase(),
      supportTeacherAbbr: cellSupportTeacher.trim().toUpperCase() || undefined,
      className: combinedClassName,
      classes: finalClasses,
      subject: cellSubject.trim(),
      note: cellNote.trim()
    };

    const newSchedData = { ...schedData };
    if (!newSchedData[yearKey]) newSchedData[yearKey] = {};
    if (!newSchedData[yearKey][activeDay]) newSchedData[yearKey][activeDay] = {};
    if (!newSchedData[yearKey][activeDay][hour]) newSchedData[yearKey][activeDay][hour] = {};

    const raw = newSchedData[yearKey][activeDay][hour][cKey];

    if (Array.isArray(raw)) {
      const arr = [...raw];
      if (slotIdx !== undefined && slotIdx < arr.length) {
        arr[slotIdx] = newCell;
      } else {
        arr.push(newCell);
      }
      newSchedData[yearKey][activeDay][hour][cKey] = arr;
    } else {
      newSchedData[yearKey][activeDay][hour][cKey] = newCell;
    }

    onChangeSchedData(newSchedData);
    setEditingCell(null);
    notify('Zapisano przydział sali', 'ok');
  };

  const handleClearCell = () => {
    if (!editingCell) return;
    const { hour, colKey: cKey, slotIdx } = editingCell;
    const yearKey = appState.yearKey;

    const newSchedData = { ...schedData };
    if (newSchedData[yearKey]?.[activeDay]?.[hour]) {
      const raw = newSchedData[yearKey][activeDay][hour][cKey];
      if (Array.isArray(raw)) {
        if (slotIdx !== undefined) {
          const arr = [...raw];
          arr.splice(slotIdx, 1);
          newSchedData[yearKey][activeDay][hour][cKey] = arr;
        } else {
          newSchedData[yearKey][activeDay][hour][cKey] = [];
        }
      } else {
        delete newSchedData[yearKey][activeDay][hour][cKey];
      }
      onChangeSchedData(newSchedData);
    }

    setEditingCell(null);
    notify('Wyczyszczono przydział', 'ok');
  };

  const handleAddWFSlot = (hour: string, cKey: string) => {
    const yearKey = appState.yearKey;
    const newSchedData = { ...schedData };
    if (!newSchedData[yearKey]) newSchedData[yearKey] = {};
    if (!newSchedData[yearKey][activeDay]) newSchedData[yearKey][activeDay] = {};
    if (!newSchedData[yearKey][activeDay][hour]) newSchedData[yearKey][activeDay][hour] = {};

    const raw = newSchedData[yearKey][activeDay][hour][cKey];
    const arr = Array.isArray(raw) ? [...raw] : raw ? [raw] : [];

    arr.push({
      teacherAbbr: '',
      classes: [],
      className: '',
      subject: 'Wychowanie fizyczne',
      note: 'Nowa grupa WF'
    });

    newSchedData[yearKey][activeDay][hour][cKey] = arr;
    onChangeSchedData(newSchedData);
    notify('Dodano grupę do obiektu sportowego', 'ok');
  };

  const handleRemoveWFSlot = (hour: string, cKey: string, slotIdx: number) => {
    const yearKey = appState.yearKey;
    const newSchedData = { ...schedData };
    if (newSchedData[yearKey]?.[activeDay]?.[hour]) {
      const raw = newSchedData[yearKey][activeDay][hour][cKey];
      if (Array.isArray(raw)) {
        const arr = [...raw];
        arr.splice(slotIdx, 1);
        newSchedData[yearKey][activeDay][hour][cKey] = arr;
        onChangeSchedData(newSchedData);
        notify('Usunięto grupę ze slotu sportowego', 'ok');
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as any;
    const dropData = over.data.current as any;

    if (!dragData || !dropData) return;

    const { type, hour: srcHour, colKey: srcColKey, slotIdx: srcSlotIdx, cellData } = dragData;
    const { hour: destHour, colKey: destColKey, isSport: destIsSport } = dropData;

    const yearKey = appState.yearKey;
    const dayIdx = activeDay;

    const nextSchedData = JSON.parse(JSON.stringify(schedData));

    if (!nextSchedData[yearKey]) nextSchedData[yearKey] = {};
    if (!nextSchedData[yearKey][dayIdx]) nextSchedData[yearKey][dayIdx] = {};

    let cellToMove: SchedCell | null = null;

    if (type === 'grid-cell') {
      if (!srcHour || !srcColKey) return;

      const sourceCellVal = nextSchedData[yearKey][dayIdx][srcHour]?.[srcColKey];
      if (!sourceCellVal) return;

      if (srcHour === destHour && srcColKey === destColKey) {
        return;
      }

      if (Array.isArray(sourceCellVal)) {
        if (srcSlotIdx !== undefined && srcSlotIdx < sourceCellVal.length) {
          cellToMove = sourceCellVal[srcSlotIdx];
          sourceCellVal.splice(srcSlotIdx, 1);
          nextSchedData[yearKey][dayIdx][srcHour][srcColKey] = sourceCellVal;
        }
      } else {
        cellToMove = sourceCellVal;
        delete nextSchedData[yearKey][dayIdx][srcHour][srcColKey];
      }
    } else if (type === 'pool-lesson') {
      if (!cellData) return;
      cellToMove = {
        className: cellData.className,
        classes: cellData.classes,
        teacherAbbr: cellData.teacherAbbr,
        subject: cellData.subject,
        note: cellData.note || '',
        _bridgeMeta: cellData._bridgeMeta
      };
    }

    if (!cellToMove) return;

    if (!nextSchedData[yearKey][dayIdx][destHour]) {
      nextSchedData[yearKey][dayIdx][destHour] = {};
    }

    const targetCellVal = nextSchedData[yearKey][dayIdx][destHour][destColKey];

    if (destIsSport) {
      const arr = Array.isArray(targetCellVal) ? [...targetCellVal] : targetCellVal ? [targetCellVal] : [];
      arr.push(cellToMove);
      nextSchedData[yearKey][dayIdx][destHour][destColKey] = arr;
    } else {
      if (targetCellVal) {
        const arr = Array.isArray(targetCellVal) ? [...targetCellVal] : [targetCellVal];
        arr.push(cellToMove);
        nextSchedData[yearKey][dayIdx][destHour][destColKey] = arr;
      } else {
        nextSchedData[yearKey][dayIdx][destHour][destColKey] = cellToMove;
      }
    }

    onChangeSchedData(nextSchedData);
    notify('Zaktualizowano przydział sali korporacyjnie', 'ok');
  };

  const renderSidebar = () => {
    // Filter pool lessons
    const filteredPool = poolLessons.filter(lesson => {
      const matchesFilter = poolFilter === 'all' || !lesson.isAssigned;
      const matchesSearch = 
        lesson.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.teacherAbbr.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    if (!showPoolSidebar) {
      return (
        <button
          type="button"
          onClick={() => setShowPoolSidebar(true)}
          className="bg-slate-900 border-l border-slate-800 text-slate-300 w-10 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-slate-850 hover:text-white transition shadow-lg shrink-0 select-none"
          title="Rozwiń pulę zajęć"
        >
          <ChevronLeft size={16} />
          <div className="origin-center -rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-slate-400 mt-8">
            Pula zajęć ({poolLessons.filter(l => !l.isAssigned).length})
          </div>
        </button>
      );
    }

    const unassignedCount = poolLessons.filter(l => !l.isAssigned).length;

    return (
      <div className="w-80 bg-slate-900 border-l border-slate-950 flex flex-col shadow-2xl overflow-hidden shrink-0 transition-all duration-300 select-none">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Sparkles size={13} className="text-amber-400" /> Pula zajęć (Plan Klas)
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">
              Przeciągnij lekcję do wybranej sali korytarza
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPoolSidebar(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="Zwiń panel"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-850 space-y-2 shrink-0">
          <div className="flex rounded-lg bg-slate-950 p-1 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setPoolFilter('unassigned')}
              className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                poolFilter === 'unassigned' 
                  ? 'bg-slate-800 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Do przydziału ({unassignedCount})
            </button>
            <button
              type="button"
              onClick={() => setPoolFilter('all')}
              className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                poolFilter === 'all' 
                  ? 'bg-slate-800 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wszystkie ({poolLessons.length})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filtruj np. 4A, Matemat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none border border-slate-800/80 font-medium"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* List of Draggable Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-900/60 custom-scrollbar">
          {filteredPool.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-[11px] font-medium border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20 p-4">
              {searchQuery ? 'Brak zajęć odpowiadających filtrom' : 'Brak wolnych lekcji dla wybranego filtru! 🎉'}
            </div>
          ) : (
            filteredPool.map((lesson) => {
              const dragId = `pool-${lesson.id}`;
              return (
                <DraggableItem
                  key={lesson.id}
                  id={dragId}
                  data={{
                    type: 'pool-lesson',
                    cellData: {
                      className: lesson.className,
                      classes: [lesson.className],
                      teacherAbbr: lesson.teacherAbbr,
                      subject: lesson.subject,
                      _bridgeMeta: {
                        className: lesson.className,
                        subject: lesson.subject,
                        teacherAbbr: lesson.teacherAbbr
                      }
                    }
                  }}
                >
                  <div className={`p-2.5 border-l-4 rounded-lg bg-slate-950 shadow-xs transition select-none flex flex-col justify-between ${
                    lesson.isAssigned 
                      ? 'border-indigo-500 bg-slate-950/40 opacity-55' 
                      : 'border-amber-500 hover:border-amber-400 hover:bg-slate-950/90'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-100 flex items-center gap-1">
                        Klasa {lesson.className}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        lesson.isAssigned 
                          ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/80' 
                          : 'bg-amber-950 text-amber-400 border border-amber-900'
                      }`}>
                        lekcja {lesson.hourKey}
                      </span>
                    </div>

                    <div className="text-[10.5px] font-bold text-slate-300 truncate" title={lesson.subject}>
                      {lesson.subject}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-1.5 border-t border-slate-900/40 pt-1.5">
                      <span className="text-slate-400">👤 {lesson.teacherAbbr || 'N/N'}</span>
                      {lesson.suggestedRoom && (
                        <span className="text-amber-500/90 text-[9px] font-bold flex items-center gap-1 bg-amber-950/30 border border-amber-950 px-1 py-0.5 rounded leading-none">
                          🚪 {lesson.suggestedRoom}
                        </span>
                      )}
                    </div>
                  </div>
                </DraggableItem>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-10 right-10 bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border-l-4 shadow-lg transition-transform z-[9999] ${
      type === 'ok' ? 'border-emerald-500' : 'border-red-500'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 overflow-hidden h-full" id="page-plan-sal">
        {/* ── PASEK KONTROLI / DNIE ── */}
        <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            {DAYS.map((day, dIdx) => (
              <button
                key={dIdx}
                type="button"
                onClick={() => setActiveDay(dIdx)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeDay === dIdx
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowGenerator(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-indigo-750 bg-indigo-50 border border-indigo-200 hover:bg-indigo-150 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sparkles size={14} className="text-indigo-650 animate-pulse" /> Inteligentny Generator Sal
            </button>
            <button
              onClick={onImportFromPlanKlas}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={14} /> Synchronizuj z Planem Klas (Etap 1)
            </button>
          </div>
        </div>

        {/* ── PASEK KATEGORII SAL ── */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveRoomCategory('main')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition ${
                activeRoomCategory === 'main'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              🏢 Budynek Główny ({classifiedCols.main.length})
            </button>
            <button
              onClick={() => setActiveRoomCategory('individual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition ${
                activeRoomCategory === 'individual'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              🗣️ Nauczanie Indywidualne ({classifiedCols.individual.length})
            </button>
            <button
              onClick={() => setActiveRoomCategory('sport')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition ${
                activeRoomCategory === 'sport'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              🏆 Sale Sportowe ({classifiedCols.sport.length})
            </button>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Filtr kategorii obiektów
          </div>
        </div>

        {/* ── DRAG AND DROP CONTENT ZONE (Siatka + Sidebar) ── */}
        <div className="flex-1 flex overflow-hidden bg-slate-50">
          
          {/* Lewa strona: Siatka sal */}
          <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
            {cols.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 font-medium text-xs shadow-xs max-w-md mx-auto select-none mt-8">
                <div className="text-3xl mb-3">🚪</div>
                <p className="font-bold text-slate-700 mb-1">Brak sal w wybranej kategorii</p>
                <p className="text-slate-400">Dodaj sale odpowiedniego typu w Kreatorze Szkoły (Krok 3 - Sale i gabinety), aby układać dla nich dzwonki.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-md p-4 overflow-x-auto">
                <table className="w-full border-collapse table-fixed" style={{ minWidth: `${cols.length * 150 + 100}px` }}>
                  <colgroup>
                    <col style={{ width: '100px' }} />
                    {cols.map((col, idx) => (
                      <col key={`col-${idx}`} style={{ width: '150px' }} />
                    ))}
                  </colgroup>
                  <thead>
                    {/* Budynki / Piętra / Segmenty / Sale w 4 rzędach */}
                    <tr>
                      <th 
                        rowSpan={4} 
                        className="border-b border-r border-slate-200 p-3 text-xs font-bold text-slate-500 text-center select-none bg-slate-100 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                      >
                        Godz.
                      </th>
                      {buildingGroups.map((g, idx) => {
                        const bColor = BUILDING_COLORS[g.buildingIdx % BUILDING_COLORS.length];
                        return (
                          <th 
                            key={`bld-grp-${idx}`} 
                            colSpan={g.span}
                            className="border-b border-r last:border-r-0 border-slate-200 p-2 text-center text-[10px] uppercase font-black tracking-wide select-none bg-white font-black"
                            style={{ color: bColor }}
                          >
                            🏢 {g.name}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      {floorGroups.map((g, idx) => (
                        <th 
                          key={`floor-grp-${idx}`} 
                          colSpan={g.span}
                          className="border-b border-r last:border-r-0 border-slate-200 p-2 text-center text-xs font-black text-slate-700 select-none bg-slate-50/50"
                        >
                          📍 {cleanFloorName(g.name, g.buildingName)}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {segmentGroups.map((g, idx) => (
                        <th 
                          key={`seg-grp-${idx}`} 
                          colSpan={g.span}
                          className="border-b border-r last:border-r-0 border-slate-105 p-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-tight select-none bg-white"
                        >
                          🧩 {g.name}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {cols.map((col, idx) => {
                        const cKey = colKey(col);
                        const homeroom = appState.homerooms?.[cKey];
                        return (
                          <th 
                            key={`room-${idx}`} 
                            className="border-b border-r last:border-r-0 border-slate-200 p-2 text-center select-none bg-slate-50/10 relative group overflow-visible"
                          >
                            <button
                              type="button"
                              onClick={() => handleEditHomeroom(col, cKey)}
                              title="Zarządzaj opiekunem/gospodarzem sali"
                              className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 hover:opacity-100 text-slate-500 hover:text-blue-700 hover:bg-slate-100 p-1 rounded-md transition-all cursor-pointer z-10"
                            >
                              <UserCheck size={12} />
                            </button>

                            <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200/80 rounded px-1.5 py-0.5 inline-block">
                              🚪 {col.room.num}
                            </div>
                            {col.room.sub && (
                              <div className="text-[9px] text-slate-400 font-medium normal-case mt-0.5 leading-none">
                                ({col.room.sub})
                              </div>
                            )}

                            {homeroom && (homeroom.className || homeroom.teacherAbbr || homeroom.className2 || homeroom.teacherAbbr2) ? (
                              <div className="mt-1.5 text-[9px] text-blue-800 bg-blue-50/80 border border-blue-105/80 rounded-lg p-1 leading-tight flex flex-col items-center gap-0.5 max-w-[130px] mx-auto select-none shadow-xs">
                                <span className="font-extrabold flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-blue-600 justify-center">
                                  👑 GOSPODARZ
                                </span>
                                <div className="font-black text-slate-800 break-words text-center leading-normal">
                                  {[
                                    homeroom.className,
                                    homeroom.teacherAbbr ? `(${homeroom.teacherAbbr})` : ''
                                  ].filter(Boolean).join(' ')}
                                </div>
                                {(homeroom.className2 || homeroom.teacherAbbr2) && (
                                  <div className="font-normal text-slate-650 break-words text-[8.5px] text-center border-t border-blue-150/50 mt-1 pt-0.5 leading-normal w-full">
                                    {[
                                      homeroom.className2,
                                      homeroom.teacherAbbr2 ? `(${homeroom.teacherAbbr2})` : ''
                                    ].filter(Boolean).join(' ')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEditHomeroom(col, cKey)}
                                className="mt-1.5 text-[9px] text-slate-400 hover:text-blue-700 hover:bg-blue-50/50 border border-dashed border-slate-200 hover:border-blue-300 rounded px-1.5 py-0.5 inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                              >
                                + Ustaw gospodarza
                              </button>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                  {appState.hours.map((h, hourIndex) => {
                    const ts = appState.timeslots.find(t => String(t.num) === h);
                    return (
                      <tr key={hourIndex} className="hover:bg-slate-50/50">
                        {/* Hour cell */}
                        <td className="border-b border-r border-slate-200 p-3 text-center bg-slate-100 select-none sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                          <span className="block font-bold text-slate-700">{h}</span>
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                            {ts ? `${ts.start}–${ts.end}` : ''}
                          </span>
                        </td>

                        {/* Rooms cells */}
                        {cols.map((col, colIdx) => {
                          const cKey = colKey(col);
                          const raw = currentDayData[h]?.[cKey];
                          const bld = appState.buildings[col.floor.buildingIdx];
                          const roomNameClean = (col.room.num || '').toLowerCase().trim();
                          const meta = roomsMap.get(roomNameClean);
                          const isSport = meta?.type === 'sport' || bld?.multi === true;

                          // Render for Multi-slot (Gym/WF Columns)
                          if (isSport) {
                            const slots = Array.isArray(raw) ? raw : raw ? [raw] : [];
                            const cellConfReasons = collisions.detected.get(`${h}|${cKey}`) || [];
                            const isCellConf = cellConfReasons.length > 0;

                            return (
                              <td 
                                key={colIdx} 
                                className={`border-b border-r last:border-r-0 border-slate-200 p-2 align-top transition-colors ${
                                  isCellConf ? 'bg-red-50/70 border-2 border-red-300' : 'bg-slate-50/20'
                                }`}
                                title={isCellConf ? cellConfReasons.join('\n') : undefined}
                              >
                                <DroppableCell 
                                  id={`drop-${h}-${cKey}`} 
                                  data={{ hour: h, colKey: cKey, isSport: true }}
                                >
                                  <div className="space-y-1.5 font-mono text-[11px] h-full min-h-[56px]">
                                    {isCellConf && (
                                      <div className="text-[9px] font-black text-red-700 bg-red-150 border border-red-200 rounded px-1.5 py-0.5 leading-none flex items-center gap-1 mb-1 shadow-xs animate-pulse select-none">
                                        <AlertTriangle size={10} className="stroke-[3]" /> KOLIZJA
                                      </div>
                                    )}
                                    {slots.map((slot, slIdx) => {
                                      const rawClasses = slot.classes || (slot.className ? [slot.className] : []);
                                      const classes = mergeClassNames(rawClasses);
                                      const slotKey = `${h}|${cKey}|${slIdx}`;
                                      const slotConfReasons = collisions.slotConflicts.get(slotKey) || [];
                                      const isSlotConf = slotConfReasons.length > 0;

                                      return (
                                        <DraggableItem
                                          key={slIdx}
                                          id={`drag-${h}-${cKey}-${slIdx}`}
                                          data={{
                                            type: 'grid-cell',
                                            hour: h,
                                            colKey: cKey,
                                            slotIdx: slIdx,
                                            cellData: slot
                                          }}
                                        >
                                          <div 
                                            title={isSlotConf ? slotConfReasons.join('\n') : undefined}
                                            className={`p-2 border rounded-lg text-[11px] relative shadow-xs transition-all ${
                                              isSlotConf 
                                                ? 'border-red-500 bg-red-50 text-red-950 font-semibold shadow-red-100/50' 
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-950 font-medium'
                                            }`}
                                          >
                                            <div className="font-bold flex items-center justify-between">
                                              <span className={`flex items-center gap-1 ${isSlotConf ? 'text-red-700' : ''}`}>
                                                {isSlotConf && <AlertTriangle size={11} className="text-red-600 animate-pulse shrink-0" />}
                                                {classes.join(', ') || 'Wolny sport'}
                                              </span>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button 
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEdit(h, cKey, slIdx);
                                                  }}
                                                  className={`${isSlotConf ? 'text-red-700 hover:text-red-950' : 'text-emerald-700 hover:text-emerald-950'} text-[10px]`}
                                                >
                                                  ✏️
                                                </button>
                                                <button 
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveWFSlot(h, cKey, slIdx);
                                                  }}
                                                  className="text-red-500 hover:text-red-700 text-[10px]"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            </div>
                                            <div className="mt-0.5 text-slate-700">{slot.subject}</div>
                                            {slot.teacherAbbr && (
                                              <div className={`text-[10px] mt-1 select-all font-bold flex items-center gap-1 ${isSlotConf ? 'text-red-600' : 'text-emerald-700'}`}>
                                                {isSlotConf && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                                                <span>👤 {slot.teacherAbbr}</span>
                                              </div>
                                            )}
                                            {slot.supportTeacherAbbr && (
                                              <div className="text-[10px] text-indigo-700 font-bold select-all mt-0.5">
                                                👥 {slot.supportTeacherAbbr} (wspomag.)
                                              </div>
                                            )}
                                            {isSlotConf && (
                                              <div className="text-[9px] font-medium text-red-500 leading-tight mt-1 bg-white/70 p-1.5 rounded border border-red-200/40 flex items-start gap-1">
                                                <AlertTriangle size={10} className="text-red-500 mt-0.5 shrink-0" />
                                                <span>{slotConfReasons[0]}</span>
                                              </div>
                                            )}
                                          </div>
                                        </DraggableItem>
                                      );
                                    })}
                                    <button 
                                      type="button"
                                      onClick={() => handleAddWFSlot(h, cKey)}
                                      className="w-full py-1.5 border border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-600 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      ＋ Dodaj grupę WF
                                    </button>
                                  </div>
                                </DroppableCell>
                              </td>
                            );
                          }

                          // Standard Room Cell
                          const slots = Array.isArray(raw) ? raw : raw ? [raw] : [];
                          const hasL = slots.length > 0;
                          const confReasons = collisions.detected.get(`${h}|${cKey}`) || [];
                          const isConf = confReasons.length > 0;

                          return (
                            <td 
                              key={colIdx} 
                              className={`border-b border-r last:border-r-0 border-slate-200 p-2 align-top transition-colors ${
                                isConf ? 'bg-red-50/70 border-2 border-red-300' : 'hover:bg-blue-50/40'
                              }`}
                            >
                              <DroppableCell 
                                id={`drop-${h}-${cKey}`} 
                                data={{ hour: h, colKey: cKey, isSport: false }}
                              >
                                {hasL ? (
                                  <div className="space-y-2 h-full min-h-[56px] justify-center flex flex-col">
                                    {isConf && (
                                      <div className="text-[9px] font-black text-red-700 bg-red-100 border border-red-200 rounded px-1.5 py-0.5 leading-none flex items-center gap-1 select-none animate-pulse">
                                        <AlertTriangle size={10} /> KOLIZJA SALI
                                      </div>
                                    )}
                                    {slots.map((slot, slIdx) => {
                                      const rawClasses = slot?.classes || (slot?.className ? [slot?.className] : []);
                                      const classes = mergeClassNames(rawClasses);
                                      const isSpecificConf = isConf;
                                      return (
                                        <DraggableItem
                                          key={slIdx}
                                          id={`drag-${h}-${cKey}-${slIdx}`}
                                          data={{
                                            type: 'grid-cell',
                                            hour: h,
                                            colKey: cKey,
                                            slotIdx: slIdx,
                                            cellData: slot
                                          }}
                                        >
                                          <div 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenEdit(h, cKey, slIdx);
                                            }}
                                            className={`rounded-lg p-2.5 border-l-4 relative select-none flex flex-col justify-between shadow-sm cursor-pointer transition hover:scale-[1.01] ${
                                              isSpecificConf 
                                                ? 'border-red-600 bg-red-50 text-red-950 font-semibold' 
                                                : 'border-blue-500 bg-white hover:bg-slate-50'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                                <span className={`flex items-center gap-1 ${isSpecificConf ? 'text-red-700 font-extrabold' : ''}`}>
                                                  {isSpecificConf && <AlertTriangle size={12} className="text-red-600 shrink-0" />}
                                                  {classes.join(', ') || '—'}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  {isSpecificConf && (
                                                    <span className="text-[8px] text-red-600 font-bold bg-white border border-red-200 px-1 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                                                      <AlertTriangle size={8} className="text-red-500" />
                                                      KOLIZJA
                                                    </span>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenEdit(h, cKey, slIdx);
                                                    }}
                                                    className="text-slate-400 hover:text-blue-600 text-[11px] p-1 rounded transition hover:bg-slate-100 cursor-pointer"
                                                    title="Edytuj przydział"
                                                  >
                                                    ✏️
                                                  </button>
                                                </div>
                                              </div>
                                              <div className="text-[10px] text-slate-500 font-semibold mt-1">{slot.subject}</div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-[10px] mt-2 font-medium">
                                              <div className="flex items-center justify-between">
                                                <span className={`flex items-center gap-1 ${isSpecificConf ? 'text-red-700 font-bold' : 'text-slate-600 font-semibold'}`}>
                                                  {isSpecificConf && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                                                  <span>👤 {slot.teacherAbbr || 'Wychowawca'}</span>
                                                </span>
                                                {slot.note && <span className="text-[9px] italic text-slate-400 truncate max-w-[80px]" title={slot.note}>{slot.note}</span>}
                                              </div>
                                              {slot.supportTeacherAbbr && (
                                                <div className="text-indigo-600 font-semibold flex items-center gap-1">
                                                  <span>👥 {slot.supportTeacherAbbr}</span>
                                                  <span className="text-[8px] bg-indigo-50 border border-indigo-100 rounded px-1 shrink-0">wspom.</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </DraggableItem>
                                      );
                                    })}
                                    {isConf && confReasons.length > 0 && (
                                      <div className="text-[9.5px] font-bold text-red-700 leading-normal bg-red-100/80 p-2 rounded border border-red-200 space-y-1 text-left">
                                        {confReasons.map((reason, rIdx) => (
                                          <div key={rIdx} className="flex items-start gap-1">
                                            <AlertTriangle size={10} className="text-red-700 mt-0.5 shrink-0" />
                                            <span>{reason}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleOpenEdit(h, cKey)}
                                    className="h-full min-h-[56px] flex items-center justify-center text-slate-200 font-light cursor-pointer hover:text-blue-500 hover:bg-blue-50/20 rounded transition-colors"
                                  >
                                    +
                                  </div>
                                )}
                              </DroppableCell>
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

          {/* Prawa strona: sidebar lekcji z Planu Klas */}
          {renderSidebar()}

        </div>

        {/* ── MODAL EDYCJI PRZYDZIAŁU SALI ── */}
        {editingCell && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form 
              onSubmit={handleSaveCell}
              className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between select-none">
                <h3 className="font-bold text-slate-800">🏠 Edytuj przydział sali</h3>
                <button 
                  type="button" 
                  onClick={() => setEditingCell(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* ⚡ Szybki wybór z planu lekcji */}
                {hourLessons.length > 0 && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3.5 space-y-1.5 select-none shadow-xs">
                    <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">
                      ⚡ Szybki wybór z planu lekcji (godz. {editingCell.hour})
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [cls, sub, teach] = val.split('|');
                        setCellClass(cls || '');
                        setSelectedClasses([cls || '']);
                        setCellTeacher(teach || '');
                        setCellSubject(sub || '');
                        setIsCustomClass(false);
                        setIsCustomTeacher(false);
                        setIsCustomSubject(false);
                      }}
                      className="w-full px-2 py-1.5 border border-indigo-200 bg-white rounded-lg text-xs outline-none focus:border-indigo-550 text-indigo-900 font-semibold cursor-pointer"
                    >
                      <option value="">-- Wybierz zaplanowaną lekcję --</option>
                      {hourLessons.map((l, idx) => (
                        <option key={idx} value={`${l.className}|${l.subject}|${l.teacherAbbr}`}>
                          {l.className} • {l.subject} ({l.teacherAbbr})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Klasa / Grupy */}
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wide">Klasa / Grupy</label>
                  </div>

                  <div className="space-y-2.5">
                    {selectedClasses.map((cls, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          {isFirst ? (
                            <select
                              value={cls}
                              onChange={(e) => {
                                const val = e.target.value;
                                const copy = [...selectedClasses];
                                copy[0] = val;
                                setSelectedClasses(copy);
                                setCellClass(val);
                              }}
                              className="flex-1 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="">-- wybierz klasę --</option>
                              {scheduledClasses.length > 0 && (
                                <optgroup label="Zaplanowane na tę godzinę">
                                  {scheduledClasses.map(clsName => (
                                    <option key={clsName} value={clsName}>{clsName}</option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Wszystkie pozostałe klasy">
                                {sortedClasses.map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </optgroup>
                            </select>
                          ) : (
                              <div className="flex-1 flex items-center gap-2">
                                <select
                                  value={cls}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const copy = [...selectedClasses];
                                    copy[idx] = val;
                                    setSelectedClasses(copy);
                                  }}
                                  className="flex-1 px-3 py-2 border border-indigo-200 bg-white rounded-lg text-xs font-semibold text-indigo-900 outline-none focus:border-indigo-550 cursor-pointer"
                                >
                                  <option value="">-- wybierz kolejną klasę --</option>
                                  {cls && !getScheduledOptionsForIndex(idx).some(o => o.toUpperCase() === cls.toUpperCase()) && 
                                          !getOtherOptionsForIndex(idx).some(o => o.toUpperCase() === cls.toUpperCase()) && (
                                    <option value={cls}>{cls}</option>
                                  )}
                                  
                                  {getScheduledOptionsForIndex(idx).length > 0 && (
                                    <optgroup label="Zaplanowane na tę godzinę (nieprzypisane)">
                                      {getScheduledOptionsForIndex(idx).map(clsName => (
                                        <option key={clsName} value={clsName}>{clsName}</option>
                                      ))}
                                    </optgroup>
                                  )}

                                  {getOtherOptionsForIndex(idx).length > 0 && (
                                    <optgroup label="Wszystkie pozostałe klasy">
                                      {getOtherOptionsForIndex(idx).map(clsName => (
                                        <option key={clsName} value={clsName}>{clsName}</option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...selectedClasses];
                                    copy.splice(idx, 1);
                                    setSelectedClasses(copy);
                                  }}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                                  title="Usuń tę klasę"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add more class button */}
                      {selectedClasses.length > 0 && selectedClasses[0] !== '' && canAddMoreClasses && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClasses([...selectedClasses, '']);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition py-1 px-2 hover:bg-indigo-50 rounded-lg cursor-pointer mt-1"
                        >
                          ➕ Dodaj klasę/grupę do tej sali
                        </button>
                      )}
                    </div>
                  </div>

                {/* Nauczyciel */}
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">Nauczyciel</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTeacher(!isCustomTeacher)}
                      className="text-[9px] font-extrabold text-blue-655 hover:text-blue-800 transition select-none cursor-pointer"
                    >
                      {isCustomTeacher ? '📋 Wybierz z listy' : '✍️ Wpisz ręcznie'}
                    </button>
                  </div>
                  {isCustomTeacher ? (
                    <input 
                      type="text" 
                      value={cellTeacher}
                      onChange={(e) => setCellTeacher(e.target.value)}
                      placeholder="np. JKOW, ANOW"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  ) : (
                    <select
                      value={cellTeacher}
                      onChange={(e) => setCellTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- wybierz nauczyciela --</option>
                      {scheduledTeachers.length > 0 && (
                        <optgroup label="Zaplanowane na tę godzinę">
                          {scheduledTeachers.map(tAbbr => {
                            const teacherObj = appState.teachers.find(t => t.abbr === tAbbr);
                            const label = teacherObj ? `${teacherObj.last} ${teacherObj.first} (${tAbbr})` : tAbbr;
                            return <option key={tAbbr} value={tAbbr}>{label}</option>;
                          })}
                        </optgroup>
                      )}
                      <optgroup label="Wszyscy nauczyciele">
                        {sortedTeachers.map(t => (
                          <option key={t.id} value={t.abbr}>{t.last} {t.first} ({t.abbr})</option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>

                {/* Nauczyciel Wspomagający */}
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">Nauczyciel Wspomagający</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSupportTeacher(!isCustomSupportTeacher)}
                      className="text-[9px] font-extrabold text-blue-655 hover:text-blue-800 transition select-none cursor-pointer"
                    >
                      {isCustomSupportTeacher ? '📋 Wybierz z listy' : '✍️ Wpisz ręcznie'}
                    </button>
                  </div>
                  {isCustomSupportTeacher ? (
                    <input 
                      type="text" 
                      value={cellSupportTeacher}
                      onChange={(e) => setCellSupportTeacher(e.target.value)}
                      placeholder="np. KOWW, WSPM"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  ) : (
                    <select
                      value={cellSupportTeacher}
                      onChange={(e) => setCellSupportTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- brak nauczyciela wspomagającego --</option>
                      <optgroup label="Wszyscy nauczyciele">
                        {sortedTeachers.map(t => (
                          <option key={t.id} value={t.abbr}>{t.last} {t.first} ({t.abbr})</option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>

                {/* Przedmiot */}
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wide">Przedmiot</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSubject(!isCustomSubject)}
                      className="text-[9px] font-extrabold text-blue-655 hover:text-blue-800 transition select-none cursor-pointer"
                    >
                      {isCustomSubject ? '📋 Wybierz z listy' : '✍️ Wpisz ręcznie'}
                    </button>
                  </div>
                  {isCustomSubject ? (
                    <input 
                      type="text" 
                      value={cellSubject}
                      onChange={(e) => setCellSubject(e.target.value)}
                      placeholder="np. Matematyka"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  ) : (
                    <select
                      value={cellSubject}
                      onChange={(e) => setCellSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- wybierz przedmiot --</option>
                      {scheduledSubjects.length > 0 && (
                        <optgroup label="Zaplanowane na tę godzinę">
                          {scheduledSubjects.map(subjName => (
                            <option key={subjName} value={subjName}>{subjName}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Wszystkie przedmioty">
                        {sortedSubjects.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>

                {/* Uwagi */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Uwagi</label>
                  <input 
                    type="text" 
                    value={cellNote}
                    onChange={(e) => setCellNote(e.target.value)}
                    placeholder="np. Lekcja łączona"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button 
                  type="button" 
                  onClick={handleClearCell}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 cursor-pointer"
                >
                  Wyczyść
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingCell(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── MODAL EDYCJI GOSPODARZA SALI ── */}
        {editingHomeroom && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form 
              onSubmit={handleSaveHomeroom}
              className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between select-none">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>👑 Gospodarze Sali {editingHomeroom.roomNum}</span>
                  {editingHomeroom.sub && <span className="text-[10px] text-slate-400 font-normal">({editingHomeroom.sub})</span>}
                </h3>
                <button 
                  type="button" 
                  onClick={() => setEditingHomeroom(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar">
                <div className="border bg-amber-50/50 border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 leading-normal">
                  Wskaż klasę oraz nauczyciela opiekującego się tą salą lekcyjną (gospodarza). Możesz także wyznaczyć drugiego współgospodarza.
                </div>

                <div className="border border-slate-100 rounded-lg p-3 space-y-3 bg-slate-50/35">
                  <div className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                    Główny Gospodarz (Klasa i Opiekun)
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Klasa</label>
                    <select
                      value={hrClassName}
                      onChange={(e) => setHrClassName(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">-- brak klasy --</option>
                      {sortedClasses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nauczyciel Opiekun</label>
                    <select
                      value={hrTeacherAbbr}
                      onChange={(e) => setHrTeacherAbbr(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">-- brak nauczyciela --</option>
                      {sortedTeachers.map(t => (
                        <option key={t.id} value={t.abbr}>{t.last} {t.first} ({t.abbr})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-lg p-3 space-y-3 bg-slate-50/35">
                  <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Współgospodarz / Drugi opiekun (Opcjonalnie)
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Druga Klasa</label>
                    <select
                      value={hrClassName2}
                      onChange={(e) => setHrClassName2(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">-- brak klasy --</option>
                      {sortedClasses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Drugi Opiekun</label>
                    <select
                      value={hrTeacherAbbr2}
                      onChange={(e) => setHrTeacherAbbr2(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">-- brak nauczyciela --</option>
                      {sortedTeachers.map(t => (
                        <option key={t.id} value={t.abbr}>{t.last} {t.first} ({t.abbr})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button 
                  type="button" 
                  onClick={() => {
                    setHrClassName('');
                    setHrTeacherAbbr('');
                    setHrClassName2('');
                    setHrTeacherAbbr2('');
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 cursor-pointer"
                >
                  Wyczyść wszystko
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingHomeroom(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {showGenerator && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
              {/* Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl bg-indigo-50">
                    <Sparkles size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">🧠 Inteligentny Generator i Optymalizator Sal Lekcyjnych</h3>
                    <p className="text-[10px] text-slate-500 font-medium font-sans">Automatyczny przydział gabinetów lekcyjnych w oparciu o hierarchię pierwszeństwa i wymagania</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="text-slate-450 hover:text-slate-700 text-sm font-bold cursor-pointer transition p-1 bg-slate-100 hover:bg-slate-200 rounded-lg w-7 h-7 flex items-center justify-center font-mono"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                {/* Left Side: Parameters / Settings */}
                <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-150 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar bg-slate-50/40">
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-1.5 uppercase tracking-wider">⚙️ Parametry i Reguły Algorytmu</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-3">Włącz lub wyłącz reguły optymalizacji, które determinują przydział sal lekcyjnych.</p>

                      <div className="space-y-3">
                        <label className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-150 rounded-xl hover:bg-white/80 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={genPriorityHomerooms}
                            onChange={(e) => setGenPriorityHomerooms(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-slate-800 block">👑 Pierwszeństwo sal wychowawczych</span>
                            <span className="text-[9.5px] text-slate-500 mt-0.5 block font-medium">Klasa otrzymuje salę przypisaną do niej jako gabinet wychowawczy (gospodarz).</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-150 rounded-xl hover:bg-white/80 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={genPriorityTeachers}
                            onChange={(e) => setGenPriorityTeachers(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-slate-800 block">⭐ Preferowane gabinety nauczycieli</span>
                            <span className="text-[9.5px] text-slate-500 mt-0.5 block font-medium">Algorytm w drugiej kolejności dobiera sale oznaczone jako preferowane przez wybranego wykładowcę.</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-150 rounded-xl hover:bg-white/80 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={genExcludeWF}
                            onChange={(e) => {
                              setGenExcludeWF(e.target.checked);
                              if (!e.target.checked) setGenAutoPlaceWF(false);
                            }}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-slate-800 block">🚫 Wyklucz wychowanie fizyczne (W-F)</span>
                            <span className="text-[9.5px] text-slate-500 mt-0.5 block font-medium">Lekcje W-F nie rezerwują klasycznych sal lekcyjnych w budynku głównym.</span>
                          </div>
                        </label>

                        {genExcludeWF && (
                          <label className="flex items-start gap-2.5 p-3 px-4 bg-indigo-50 border border-indigo-150 rounded-xl hover:bg-indigo-50 cursor-pointer transition select-none ml-2">
                            <input
                              type="checkbox"
                              checked={genAutoPlaceWF}
                              onChange={(e) => setGenAutoPlaceWF(e.target.checked)}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="leading-tight">
                              <span className="text-xs font-bold text-indigo-900 block">🏟️ Auto-przydział sal sportowych dla W-F</span>
                              <span className="text-[9.5px] text-indigo-750 mt-0.5 block font-medium">Automatycznie rozmieszcza lekcje W-F na sali gimnastycznej i obiektach sportowych.</span>
                            </div>
                          </label>
                        )}

                        <label className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-150 rounded-xl hover:bg-white/80 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={genClearExisting}
                            onChange={(e) => setGenClearExisting(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-rose-800 block">🗑️ Wyczyść dotychczasowy plan sal przed wygenerowaniem</span>
                            <span className="text-[9.5px] text-rose-600 mt-0.5 block font-bold uppercase tracking-wider">Resetuje układ sal w planie lekcji przed przydzieleniem nowych sal.</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
                    <div className="bg-slate-100 p-3 rounded-lg text-[10.5px] text-slate-600 font-medium space-y-1">
                      <div className="flex justify-between">
                        <span>Liczba klas:</span>
                        <span className="font-bold text-slate-800">{appState.classes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Liczba nauczycieli:</span>
                        <span className="font-bold text-slate-800">{appState.teachers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Zgłoszone gabinety lekcyjne:</span>
                        <span className="font-bold text-slate-800">{allRoomsList.length}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoGenerateRooms}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Sparkles size={15} /> ⚡ Uruchom Generowanie Gabinetów
                    </button>
                  </div>
                </div>

                {/* Right Side: Preferred Rooms Config */}
                <div className="w-full md:w-7/12 p-6 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3 shrink-0 gap-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">👩‍🏫 Preferencje Nauczycieli (Pokoje i Gabinety)</h4>
                      <p className="text-[10px] text-slate-500 font-medium font-sans">Ustal sale lekcyjne, w których nauczyciele najchętniej prowadzą swoje zajęcia.</p>
                    </div>

                    <div className="relative max-w-[200px]">
                      <input
                        type="text"
                        placeholder="Szukaj nauczyciela..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-250 bg-white rounded-lg text-xs outline-none focus:border-indigo-500 w-full font-medium"
                      />
                    </div>
                  </div>

                  {/* Table with list of teachers */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white p-1 custom-scrollbar">
                    {appState.teachers
                      .filter(t => {
                        const q = teacherSearch.toLowerCase();
                        return (
                          t.first.toLowerCase().includes(q) ||
                          t.last.toLowerCase().includes(q) ||
                          t.abbr.toLowerCase().includes(q)
                        );
                      })
                      .map(t => {
                        return (
                          <div key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/40">
                            <div>
                              <div className="font-extrabold text-slate-800 text-[11px] leading-tight">
                                {t.last} {t.first}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Skrót: <span className="font-bold text-slate-650 bg-slate-100 px-1 py-0.2 rounded">{t.abbr}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Selected preferred badges */}
                              {t.preferredRooms && t.preferredRooms.length > 0 ? (
                                t.preferredRooms.map(rk => {
                                  const rObj = allRoomsList.find(r => r.key === rk);
                                  return (
                                    <span key={rk} className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-md text-[10px] font-black leading-none">
                                      Sala {rObj ? rObj.num : rk}
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePreferredRoom(t.id, rk)}
                                        className="text-indigo-450 hover:text-indigo-700 font-extrabold text-[10px] ml-1 cursor-pointer transition shrink-0"
                                        title="Usuń"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Brak preferencji</span>
                              )}

                              {/* Dropdown select to add new */}
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddPreferredRoom(t.id, e.target.value);
                                  }
                                }}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-[10px] text-slate-700 rounded-lg p-0.5 px-1.5 focus:outline-none focus:border-indigo-500 max-w-[120px] cursor-pointer"
                              >
                                <option value="">+ Dodaj</option>
                                {allRoomsList.map(rm => {
                                  const alreadyHas = t.preferredRooms?.includes(rm.key);
                                  if (alreadyHas) return null;
                                  return (
                                    <option key={rm.key} value={rm.key}>
                                      Sala {rm.num} {rm.sub ? `(${rm.sub})` : ''} - {rm.floorName}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-5 py-2 hover:bg-slate-200 text-slate-700 bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Zamknij okno preferencji
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DndContext>
  );
}

const BUILDING_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
