import React, { useState, useMemo } from 'react';
import { 
  AppState, Class, Teacher, Subject, ClassRoom, SchoolGroup, Assignment, Lesson, SpecialStudent, SpecialAssignment 
} from '../types';
import { esc, hexRgba, uid } from '../utils';
import { 
  User, BookOpen, Layers, MapPin, Plus, Trash2, Edit3, Check, RefreshCw 
} from 'lucide-react';

interface PlanKlasProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onTransfer: () => void;
}

export default function PlanKlas({ appState, onChangeAppState, onTransfer }: PlanKlasProps) {
  const pl = appState.planLekcji;

  const [activeClassId, setActiveClassId] = useState<string | null>(
    pl.classes.length > 0 ? pl.classes[0].id : null
  );
  const [activeTab, setActiveTab] = useState<'plan' | 'assign' | 'special' | 'teachers'>('plan');
  const [draggedAssignId, setDraggedAssignId] = useState<string | null>(null);

  // Form states for modal / quick inline adding
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState('');
  const [newTeacherFirst, setNewTeacherFirst] = useState('');
  const [newTeacherLast, setNewTeacherLast] = useState('');
  const [newTeacherAbbr, setNewTeacherAbbr] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectShort, setNewSubjectShort] = useState('');
  const [newRoomName, setNewRoomName] = useState('');

  // Assignments States
  const [assignClass, setAssignClass] = useState('');
  const [assignSubject, setAssignSubject] = useState('');
  const [assignTeacher, setAssignTeacher] = useState('');
  const [assignRoom, setAssignRoom] = useState('');
  const [assignHours, setAssignHours] = useState(2);
  const [assignPreferredBlockSize, setAssignPreferredBlockSize] = useState<number>(1); // default single 1h

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
    return pl.assignments.filter(a => a.classId === activeClassId);
  }, [activeClassId, pl.assignments]);

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
          const otherItems = list.filter(x => x.key !== item.key);
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
            .filter(x => x.classId !== item.classId)
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

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherLast.trim()) return;

    const initials = newTeacherFirst ? newTeacherFirst[0].toUpperCase() : '';
    const defAbbr = (initials + newTeacherLast.slice(0, 3).toUpperCase()).substring(0, 5);

    const newTeacher: Teacher = {
      id: uid(),
      first: newTeacherFirst.trim(),
      last: newTeacherLast.trim(),
      abbr: newTeacherAbbr.trim().toUpperCase() || defAbbr
    };

    const updatedPL = {
      ...pl,
      teachers: [...pl.teachers, newTeacher]
    };

    onChangeAppState({
      ...appState,
      teachers: [...appState.teachers, newTeacher],
      planLekcji: updatedPL
    });

    setNewTeacherFirst('');
    setNewTeacherLast('');
    setNewTeacherAbbr('');
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const defAbbr = newSubjectShort.trim().toUpperCase() || newSubjectName.slice(0, 3).toUpperCase();
    const newSubj: Subject = {
      id: uid(),
      name: newSubjectName.trim(),
      short: defAbbr,
      color: COLORS[pl.subjects.length % COLORS.length]
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
      groupId: null,
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
  const handleDragStart = (id: string) => {
    setDraggedAssignId(id);
  };

  const handleDropOnCell = (day: number, hour: number) => {
    if (!draggedAssignId || !activeClassId) return;

    const key = `${activeClassId}|${day}|${hour}`;
    const updatedLessons = { ...pl.lessons };
    
    // Check hours limits
    const asg = pl.assignments.find(a => a.id === draggedAssignId);
    if (asg) {
      const placed = placedHours[draggedAssignId] || 0;
      if (placed >= asg.hoursPerWeek) {
        if (!confirm(`Zrealizowano już limit ${asg.hoursPerWeek} godzin. Czy umieścić nadwymiarowo?`)) {
          setDraggedAssignId(null);
          return;
        }
      }
    }

    let defaultSupportTeacherId: string | null = null;
    if (asg) {
      const matchSpecialAsg = pl.specialAssignments.find(sa => {
        const student = pl.specialStudents.find(ss => ss.id === sa.studentId);
        return student && student.classId === activeClassId && sa.subjectId === asg.subjectId && sa.withClass && sa.supportTeacherId;
      });
      if (matchSpecialAsg) {
        defaultSupportTeacherId = matchSpecialAsg.supportTeacherId || null;
      }
    }

    updatedLessons[key] = {
      assignmentId: draggedAssignId,
      locked: false,
      supportTeacherId: defaultSupportTeacherId
    };

    const updatedPL = {
      ...pl,
      lessons: updatedLessons
    };

    onChangeAppState({
      ...appState,
      planLekcji: updatedPL
    });

    setDraggedAssignId(null);
  };

  const handleRemoveLesson = (key: string) => {
    const updatedLessons = { ...pl.lessons };
    delete updatedLessons[key];

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
      type: specType
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

  const currentStudent = useMemo(() => {
    if (!activeStudentId) return null;
    return pl.specialStudents.find(s => s.id === activeStudentId) || null;
  }, [activeStudentId, pl.specialStudents]);

  const studentAssignments = useMemo(() => {
    if (!activeStudentId) return [];
    return pl.specialAssignments.filter(a => a.studentId === activeStudentId);
  }, [activeStudentId, pl.specialAssignments]);

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden" id="page-plan-klas">
      {/* ── LEWY SIDEBAR (Nawigacja) ── */}
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

          <div className="space-y-1">
            {pl.classes.map(c => {
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
                      onClick={(e) => handleRemoveClass(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
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

      {/* ── STREFA CENTRALNA (Siatka układania) ── */}
      <main className="flex-1 bg-slate-50 p-6 overflow-y-auto">
        {activeTab === 'plan' && (
          <div className="flex flex-col h-full">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900 select-none">
                  {currentClass ? `Plan lekcji dla klasy ${currentClass.name}` : 'Plan lekcji klasowy'}
                </h1>
                <p className="text-xs text-slate-500 mt-1 select-none">
                  {currentClass ? `Zdefiniowano zajęcia klasy: ${currentClass.group || 'cała klasa'}. Przeciągaj lekcje ze skrytki po prawej stronie na siatkę.` : 'Wybierz klasę z lewego panelu, aby rozpocząć układanie planu.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={onTransfer}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Przenieś do planu sal (Etap 2)
                </button>
              </div>
            </div>

            {/* Siatka tygodniowa */}
            {currentClass ? (
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
                                    className={`h-full min-h-[90px] rounded-lg p-2 border-l-4 relative select-none flex flex-col justify-between group transition-shadow ${
                                      isConf 
                                        ? 'border-red-600 bg-red-50 text-red-900 shadow-sm'
                                        : 'bg-white shadow-sm hover:shadow-md'
                                    }`}
                                    style={isConf ? {} : { borderLeftColor: subj?.color || '#cbd5e1' }}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold truncate" style={isConf ? {} : { color: subj?.color }}>
                                          {subj?.name}
                                        </span>
                                        <button 
                                          onClick={() => handleRemoveLesson(key)}
                                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                      <div className="mt-1.5 pt-1 border-t border-slate-100">
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
                                <div className="h-full border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300 text-lg hover:border-blue-400 hover:text-blue-400 transition-colors select-none font-light min-h-[90px]">
                                  +
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
            )}
          </div>
        )}

        {/* ── LICZBA PRZYPISAŃ (Zajęcia) ── */}
        {activeTab === 'assign' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-4 select-none">📌 Dodaj nowe przypisanie (Kto, Czego, Ile, Gdzie)</h2>
              <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Klasa</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                    value={assignClass}
                    onChange={(e) => setAssignClass(e.target.value)}
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
                    onChange={(e) => setAssignSubject(e.target.value)}
                  >
                    <option value="">Wybierz przedmiot</option>
                    {pl.subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.short})</option>
                    ))}
                  </select>
                </div>
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
                          {c ? `${c.name} ${c.group && c.group !== 'cała klasa' ? `(${c.group})` : ''}` : '?'}
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
                <User size={14} /> 👨‍🏫 Nauczyciele
              </h3>
              <form onSubmit={handleAddTeacher} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Imię" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newTeacherFirst}
                  onChange={(e) => setNewTeacherFirst(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Nazwisko *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newTeacherLast}
                  onChange={(e) => setNewTeacherLast(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Skrót (np. JKOW)" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newTeacherAbbr}
                  onChange={(e) => setNewTeacherAbbr(e.target.value)}
                />
                <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  Dodaj Nauczyciela
                </button>
              </form>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {pl.teachers.map(t => (
                  <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{t.first} {t.last}</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-500">{t.abbr}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Słownik przedmiotów */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <BookOpen size={14} /> 📚 Przedmioty szkolne
              </h3>
              <form onSubmit={handleAddSubject} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Nazwa przedmiotu *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Skrót (np. MAT, POL)" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={newSubjectShort}
                  onChange={(e) => setNewSubjectShort(e.target.value)}
                />
                <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  Dodaj Przedmiot
                </button>
              </form>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {pl.subjects.map(s => (
                  <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-semibold text-slate-700">{s.name}</span>
                    </div>
                    <span className="font-bold font-mono text-[10px]" style={{ color: s.color }}>{s.short}</span>
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

          </div>
        )}

        {/* ── NAUCZANIE SPECJALNE (Moduł specjalny) ── */}
        {activeTab === 'special' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Uczniowie specjalni */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">🎓 Uczniowie specjalni</h3>
              
              <form onSubmit={handleAddSpecialStudent} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Imię" 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={specFirstName}
                  onChange={(e) => setSpecFirstName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Nazwisko *" 
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-slate-50"
                  value={specLastName}
                  onChange={(e) => setSpecLastName(e.target.value)}
                />
                <select
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                  value={specType}
                  onChange={(e) => setSpecType(e.target.value as any)}
                >
                  <option value="ni">Nauczanie Indywidualne (NI)</option>
                  <option value="rewa">Rewalidacja (Rewa)</option>
                  <option value="wsp">Wspomaganie (Wsp)</option>
                </select>
                <select
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                  value={specClassId}
                  onChange={(e) => setSpecClassId(e.target.value)}
                >
                  <option value="">Wybierz klasę macierzystą</option>
                  {pl.classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  Dodaj Ucznia
                </button>
              </form>

              <div className="space-y-1">
                {pl.specialStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setActiveStudentId(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer ${
                      activeStudentId === s.id ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setActiveStudentId(s.id);
                      }
                    }}
                  >
                    <span>{s.lastName} {s.firstName} ({s.type.toUpperCase()})</span>
                    <button 
                      onClick={(e) => handleRemoveSpecialStudent(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Przepustowość godzin spec. */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 md:col-span-2">
              {currentStudent ? (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    🌟 Przypisania zajęć dla: {currentStudent.firstName} {currentStudent.lastName}
                  </h3>
                  
                  <form onSubmit={handleAddSpecialAssignment} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Przedmiot</label>
                      <select
                        required
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                        value={specSubjectId}
                        onChange={(e) => setSpecSubjectId(e.target.value)}
                      >
                        <option value="">Przedmiot</option>
                        {pl.subjects.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nauczyciel Prowadzący</label>
                      <select
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                        value={specTeacherId}
                        onChange={(e) => setSpecTeacherId(e.target.value)}
                      >
                        <option value="">Wybierz nauczyciela</option>
                        {pl.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.first} {t.last}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Wspomagający nauczyciel</label>
                      <select
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none"
                        value={specSupportId}
                        onChange={(e) => setSpecSupportId(e.target.value)}
                      >
                        <option value="">Wybierz nauczyciela</option>
                        {pl.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.first} {t.last}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Godzin</label>
                        <input 
                          type="number"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                          value={specHoursPerW}
                          onChange={(e) => setSpecHoursPerW(Number(e.target.value))}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 select-none shrink-0">
                        <input 
                          type="checkbox"
                          checked={specWithClass}
                          onChange={(e) => setSpecWithClass(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Z klasą</span>
                      </label>
                      <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 mt-2 h-8">
                        Dodaj
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {studentAssignments.map(a => {
                      const subj = subjectsMap.get(a.subjectId);
                      const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
                      const supp = a.supportTeacherId ? teachersMap.get(a.supportTeacherId) : null;
                      
                      return (
                        <div key={a.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs bg-white shadow-sm">
                          <div>
                            <div className="font-bold" style={{ color: subj?.color }}>
                              {subj?.name} {a.withClass ? '(Z klasą)' : '(Indywidualnie)'}
                            </div>
                            <div className="text-slate-500 mt-1">
                              👤 Prowadzący: {t ? `${t.first} ${t.last}` : '—'} 
                              {supp && ` · 👥 Wspomaganie: ${supp.first} ${supp.last}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold underline">{a.hoursPerWeek}h/Tydz</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none">
                  <span>👶</span>
                  <span className="text-sm font-semibold mt-1">Wybierz ucznia, aby edytować karty zajęć specjalnych</span>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* ── SKRYTKA LEKCJI DO UMIESZCZENIA (PO_PRAWEJ) ── */}
      {activeTab === 'plan' && currentClass && (
        <aside className="w-full md:w-64 border-l border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 select-none">
          <div className="p-4 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">🗂️ Lekcje do umieszczenia</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Przeciągnij przedmioty na siatkę planu lekcji.</span>
          </div>

          <div className="p-3 space-y-2">
            {classAssignments.map(a => {
              const s = subjectsMap.get(a.subjectId);
              const t = a.teacherId ? teachersMap.get(a.teacherId) : null;
              const placed = placedHours[a.id] || 0;
              const limitAchieved = placed >= a.hoursPerWeek;

              return (
                <div 
                  key={a.id}
                  draggable
                  onDragStart={() => handleDragStart(a.id)}
                  className={`p-3 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow transition-all group ${
                    limitAchieved ? 'bg-slate-50/50 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs truncate" style={{ color: s?.color }}>{s?.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      limitAchieved ? 'bg-slate-200 text-slate-600' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {placed} / {a.hoursPerWeek}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 select-none font-medium truncate flex justify-between items-center flex-wrap gap-1">
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
            {classAssignments.length === 0 && (
              <div className="text-center p-6 text-slate-400 text-xs">Brak zdefiniowanych przypisań dla tej klasy. Dodaj je w zakładce „📋 Przypisania Godzin".</div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#ea580c', '#059669', '#db2777', '#65a30d',
];
