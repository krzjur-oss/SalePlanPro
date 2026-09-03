import React, { useMemo } from 'react';
import { AppState, SchedData, SpecialStudent, Hour, Subject, Class, Teacher, ClassRoom, SchoolGroup } from '../types';
import { User, Users, HeartHandshake, BookOpen, Clock, Shield, CheckCircle, FileText, Award, Sparkles, MapPin } from 'lucide-react';
import { sanitizeStudentNotes, sanitizeText, sanitizePrintMetric } from '../utils/sanitizer';

export interface ArkuszWsparciaUczniaProps {
  student: SpecialStudent;
  appState: AppState;
  scheduleVersion: 'etap1' | 'etap2';
  schedData: SchedData;
  hoursList: Hour[];
  subjectsMap: Map<string, Subject>;
  classesMap: Map<string, Class>;
  teachersMap: Map<string, Teacher>;
  roomsMap: Map<string, ClassRoom>;
  groupsMap: Map<string, SchoolGroup>;
  resolveRoomFromColKey: (colKey: string) => string;
  showSupportSummaryCards?: boolean;
  showSignatures?: boolean;
  showTeamTable?: boolean;
  isPrintOverlay?: boolean;
}

export interface StudentScheduleSlot {
  type: 'co_taught' | 'individual' | 'regular_class' | 'free';
  subjectName: string;
  subjectShort?: string;
  leadTeacher?: { name: string; abbr: string };
  supportTeacher?: { name: string; abbr: string };
  supportTypeLabel?: string;
  supportTypeCode?: string;
  roomName?: string;
  className?: string;
  groupShort?: string;
  modeDescription: string;
  withClass?: boolean;
}

const DAYS_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

export const SUPPORT_TYPE_INFO: Record<string, { label: string; short: string; badgeClass: string; icon: string }> = {
  ni: {
    label: 'Nauczanie Indywidualne',
    short: 'NI',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: '🎯'
  },
  wsp: {
    label: 'Nauczyciel Wspomagający',
    short: 'Wspomaganie',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: '🤝'
  },
  rewa: {
    label: 'Rewalidacja',
    short: 'Rewa',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    icon: '🧩'
  },
  korekta: {
    label: 'Terapia Korekcyjno-Kompensacyjna',
    short: 'Korekta',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    icon: '💡'
  }
};

export default function ArkuszWsparciaUcznia({
  student,
  appState,
  scheduleVersion,
  schedData,
  hoursList,
  subjectsMap,
  classesMap,
  teachersMap,
  roomsMap,
  groupsMap,
  resolveRoomFromColKey,
  showSupportSummaryCards = true,
  showSignatures = true,
  showTeamTable = true,
  isPrintOverlay = false
}: ArkuszWsparciaUczniaProps) {
  const pl = appState.planLekcji;

  // Student's base class
  const studentClass = useMemo(() => {
    if (!student.classId) return null;
    return classesMap.get(student.classId) || pl.classes.find(c => c.id === student.classId) || null;
  }, [student.classId, classesMap, pl.classes]);

  // Student's declared support types array
  const declaredSupportTypes = useMemo(() => {
    const list: string[] = [];
    if (student.supportTypes && Array.isArray(student.supportTypes)) {
      student.supportTypes.forEach(t => { if (t && !list.includes(t)) list.push(t); });
    }
    if (student.type && !list.includes(student.type)) {
      list.push(student.type);
    }
    if (list.length === 0) list.push('wsp');
    return list;
  }, [student.supportTypes, student.type]);

  // Student's special assignments
  const studentSpAssignments = useMemo(() => {
    return (pl.specialAssignments || []).filter(sa => sa.studentId === student.id);
  }, [pl.specialAssignments, student.id]);

  // Student's designated class support teachers
  const studentSupportTeachersList = useMemo(() => {
    const ids = student.supportTeacherIds || [];
    return ids.map(id => teachersMap.get(id) || pl.teachers.find(t => t.id === id)).filter(Boolean) as Teacher[];
  }, [student.supportTeacherIds, teachersMap, pl.teachers]);

  // Weekly timetable matrix computation for this student
  const timetableMatrix = useMemo(() => {
    const matrix: Record<number, Record<number, StudentScheduleSlot[]>> = {};

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      matrix[dayIdx] = {};

      hoursList.forEach((hour, hIdx) => {
        const slots: StudentScheduleSlot[] = [];
        const hourNum = Number(hour.num);
        const hourKeyStr = String(hourNum);
        const yk = appState.yearKey || 'default';

        // 1. Check for Individual Special Lessons (1 na 1 / SPE / Rewalidacja / NI)
        const specialLessonsMatches: Array<{ assignmentId: string }> = [];

        // Check spePlan slotAssignments for individual slots
        if (pl.spePlan?.slotAssignments && Array.isArray(pl.spePlan.slotAssignments)) {
          pl.spePlan.slotAssignments.forEach(slotAsg => {
            if (slotAsg.studentId === student.id && slotAsg.dayIdx === dayIdx && slotAsg.hourIdx === hIdx && !slotAsg.withClass) {
              if (slotAsg.specialAssignmentId) {
                specialLessonsMatches.push({ assignmentId: slotAsg.specialAssignmentId });
              }
            }
          });
        }

        // Scan pl.specialLessons
        if (pl.specialLessons && typeof pl.specialLessons === 'object') {
          Object.entries(pl.specialLessons).forEach(([k, item]) => {
            if (!item) return;
            const parts = k.split('|');
            // Format: "studentId|dayIdx|hourIdx" or "studentId|dayIdx|hourIdx|assignmentId"
            if (parts[0] === student.id && parseInt(parts[1], 10) === dayIdx && parseInt(parts[2], 10) === hIdx) {
              if (!specialLessonsMatches.some(m => m.assignmentId === item.assignmentId)) {
                specialLessonsMatches.push(item);
              }
            }
          });
        }

        specialLessonsMatches.forEach(item => {
          const spAsg = studentSpAssignments.find(sa => sa.id === item.assignmentId) ||
                        (pl.specialAssignments || []).find(sa => sa.id === item.assignmentId);
          if (spAsg) {
            const subjObj = subjectsMap.get(spAsg.subjectId) || pl.subjects.find(s => s.id === spAsg.subjectId);
            const rawType = spAsg.supportType || student.type || 'ni';
            const typeMeta = SUPPORT_TYPE_INFO[rawType] || { label: 'Zajęcia Indywidualne', short: 'SPE', badgeClass: 'bg-purple-100 text-purple-900 border-purple-300', icon: '👤' };

            let subjectName = subjObj?.name;
            if (!subjectName) {
              if (rawType === 'rewa') subjectName = 'Zajęcia rewalidacyjne';
              else if (rawType === 'ni') subjectName = 'Nauczanie Indywidualne';
              else if (rawType === 'korekta') subjectName = 'Terapia korekcyjno-kompensacyjna';
              else subjectName = 'Zajęcia wspierające';
            }

            const leadTeacherObj = spAsg.teacherId ? (teachersMap.get(spAsg.teacherId) || pl.teachers.find(t => t.id === spAsg.teacherId)) : null;
            const suppTeacherObj = spAsg.supportTeacherId ? (teachersMap.get(spAsg.supportTeacherId) || pl.teachers.find(t => t.id === spAsg.supportTeacherId)) : null;

            let roomName = '';
            if (spAsg.roomId) {
              const metaRoom = roomsMap.get(spAsg.roomId) || pl.rooms.find(r => r.id === spAsg.roomId);
              roomName = metaRoom ? metaRoom.name : String(spAsg.roomId);
            }

            // Check if Plan Sal (Etap 2) has assigned room
            if (scheduleVersion === 'etap2') {
              const daySlots = schedData[yk]?.[dayIdx]?.[hourKeyStr] || schedData[yk]?.[dayIdx]?.[hourNum] || {};
              for (const [colKey, rawCell] of Object.entries(daySlots)) {
                const cells = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
                const matchedCell = cells.find(c => {
                  if (!c) return false;
                  if (leadTeacherObj && c.teacherAbbr === leadTeacherObj.abbr) return true;
                  if (suppTeacherObj && c.supportTeacherAbbr === suppTeacherObj.abbr) return true;
                  if (c._bridgeMeta?.subjectId === spAsg.subjectId) return true;
                  return false;
                });
                if (matchedCell) {
                  const resolved = resolveRoomFromColKey(colKey);
                  if (resolved) {
                    roomName = resolved;
                    break;
                  }
                }
              }
            }

            slots.push({
              type: 'individual',
              subjectName,
              subjectShort: subjObj?.short,
              leadTeacher: leadTeacherObj ? { name: `${leadTeacherObj.first} ${leadTeacherObj.last}`, abbr: leadTeacherObj.abbr } : undefined,
              supportTeacher: suppTeacherObj ? { name: `${suppTeacherObj.first} ${suppTeacherObj.last}`, abbr: suppTeacherObj.abbr } : undefined,
              supportTypeLabel: typeMeta.label,
              supportTypeCode: rawType,
              roomName,
              className: studentClass ? `kl. ${studentClass.name}` : 'Tok indywidualny',
              modeDescription: 'Zajęcia indywidualne (1:1) / Gabinet',
              withClass: false
            });
          }
        });

        // 2. Check Class Lessons (if student belongs to a class and no individual lesson is overriding, or alongside)
        if (student.classId) {
          if (scheduleVersion === 'etap1') {
            const classLessons = Object.entries(pl.lessons || {}).filter(([k]) => {
              const p = k.split('|');
              return p[0] === student.classId && parseInt(p[1], 10) === dayIdx && parseInt(p[2], 10) === hIdx;
            });

            classLessons.forEach(([_, lesson]) => {
              if (!lesson) return;
              const asg = pl.assignments.find(a => a.id === lesson.assignmentId);
              if (!asg) return;

              const subjObj = subjectsMap.get(asg.subjectId) || pl.subjects.find(s => s.id === asg.subjectId);
              const subjectName = subjObj?.name || 'Przedmiot';
              const leadTeacherObj = asg.teacherId ? (teachersMap.get(asg.teacherId) || pl.teachers.find(t => t.id === asg.teacherId)) : null;

              // Check for explicit support teacher assigned to this specific slot
              let suppTeacherObj: Teacher | null = null;
              
              // A: Explicit support teacher in lesson object
              if (lesson.supportTeacherId) {
                suppTeacherObj = teachersMap.get(lesson.supportTeacherId) || pl.teachers.find(t => t.id === lesson.supportTeacherId) || null;
              }

              // B: Check spePlan slotAssignments for this student & slot
              if (!suppTeacherObj && pl.spePlan?.slotAssignments) {
                const speSlot = pl.spePlan.slotAssignments.find(
                  sa => sa.studentId === student.id && sa.dayIdx === dayIdx && sa.hourIdx === hIdx && sa.withClass
                );
                if (speSlot) {
                  const sId = speSlot.supportTeacherId || speSlot.teacherId;
                  if (sId) {
                    suppTeacherObj = teachersMap.get(sId) || pl.teachers.find(t => t.id === sId) || null;
                  }
                }
              }

              let roomName = '';
              if (asg.roomId) {
                const metaRoom = roomsMap.get(asg.roomId) || pl.rooms.find(r => r.id === asg.roomId);
                roomName = metaRoom ? metaRoom.name : String(asg.roomId);
              }

              const grpObj = asg.groupId ? (groupsMap.get(asg.groupId) || pl.schoolGroups.find(g => g.id === asg.groupId)) : null;

              if (suppTeacherObj) {
                slots.push({
                  type: 'co_taught',
                  subjectName,
                  subjectShort: subjObj?.short,
                  leadTeacher: leadTeacherObj ? { name: `${leadTeacherObj.first} ${leadTeacherObj.last}`, abbr: leadTeacherObj.abbr } : undefined,
                  supportTeacher: { name: `${suppTeacherObj.first} ${suppTeacherObj.last}`, abbr: suppTeacherObj.abbr },
                  supportTypeLabel: 'Wspomaganie w oddziale',
                  supportTypeCode: 'wsp',
                  roomName,
                  className: studentClass ? `kl. ${studentClass.name}` : '',
                  groupShort: grpObj?.name,
                  modeDescription: 'Wspomaganie na lekcji w oddziale (z nauczycielem wspomagającym)',
                  withClass: true
                });
              } else {
                slots.push({
                  type: 'regular_class',
                  subjectName,
                  subjectShort: subjObj?.short,
                  leadTeacher: leadTeacherObj ? { name: `${leadTeacherObj.first} ${leadTeacherObj.last}`, abbr: leadTeacherObj.abbr } : undefined,
                  supportTeacher: undefined,
                  supportTypeLabel: 'Zajęcia z klasą (ogólne)',
                  roomName,
                  className: studentClass ? `kl. ${studentClass.name}` : '',
                  groupShort: grpObj?.name,
                  modeDescription: 'Realizacja z klasą (bez nauczyciela wspomagającego)',
                  withClass: true
                });
              }
            });
          } else {
            // Etap 2: SchedData lookup
            const daySlots = schedData[yk]?.[dayIdx]?.[hourKeyStr] || schedData[yk]?.[dayIdx]?.[hourNum] || {};
            const matchedClassCells: Array<{ cell: any; roomName: string }> = [];

            Object.entries(daySlots).forEach(([colKey, rawCell]) => {
              const cells = Array.isArray(rawCell) ? rawCell : rawCell ? [rawCell] : [];
              cells.forEach(cell => {
                if (!cell) return;
                const matchesClass = (cell._bridgeMeta?.classId === student.classId) ||
                                     (studentClass && cell.className && (cell.className === studentClass.name || cell.className.includes(studentClass.name))) ||
                                     (studentClass && cell.classes && cell.classes.includes(studentClass.name));
                if (matchesClass) {
                  const roomName = resolveRoomFromColKey(colKey);
                  matchedClassCells.push({ cell, roomName });
                }
              });
            });

            matchedClassCells.forEach(({ cell, roomName }) => {
              const subjObj = (cell._bridgeMeta?.subjectId ? (subjectsMap.get(cell._bridgeMeta.subjectId) || pl.subjects.find(s => s.id === cell._bridgeMeta?.subjectId)) : null) ||
                              pl.subjects.find(s => s.name.toLowerCase().trim() === (cell.subject || '').toLowerCase().trim());
              const subjectName = cell.subject || subjObj?.name || 'Przedmiot';

              const leadTeacherObj = cell.teacherAbbr ? (pl.teachers.find(t => t.abbr === cell.teacherAbbr) || (cell._bridgeMeta?.teacherId ? teachersMap.get(cell._bridgeMeta.teacherId) : null)) : null;
              
              let suppTeacherObj = cell.supportTeacherAbbr ? (pl.teachers.find(t => t.abbr === cell.supportTeacherAbbr) || (cell._bridgeMeta?.supportTeacherId ? teachersMap.get(cell._bridgeMeta.supportTeacherId) : null)) : null;

              // Check spePlan slot assignments if not embedded directly in cell
              if (!suppTeacherObj && pl.spePlan?.slotAssignments) {
                const speSlot = pl.spePlan.slotAssignments.find(
                  sa => sa.studentId === student.id && sa.dayIdx === dayIdx && sa.hourIdx === hIdx && sa.withClass
                );
                if (speSlot) {
                  const sId = speSlot.supportTeacherId || speSlot.teacherId;
                  if (sId) {
                    suppTeacherObj = teachersMap.get(sId) || pl.teachers.find(t => t.id === sId) || null;
                  }
                }
              }

              if (suppTeacherObj) {
                slots.push({
                  type: 'co_taught',
                  subjectName,
                  subjectShort: subjObj?.short,
                  leadTeacher: leadTeacherObj ? { name: `${leadTeacherObj.first} ${leadTeacherObj.last}`, abbr: leadTeacherObj.abbr } : undefined,
                  supportTeacher: { name: `${suppTeacherObj.first} ${suppTeacherObj.last}`, abbr: suppTeacherObj.abbr },
                  supportTypeLabel: 'Wspomaganie w oddziale',
                  supportTypeCode: 'wsp',
                  roomName,
                  className: studentClass ? `kl. ${studentClass.name}` : '',
                  modeDescription: 'Wspomaganie na lekcji w oddziale (z nauczycielem wspomagającym)',
                  withClass: true
                });
              } else {
                slots.push({
                  type: 'regular_class',
                  subjectName,
                  subjectShort: subjObj?.short,
                  leadTeacher: leadTeacherObj ? { name: `${leadTeacherObj.first} ${leadTeacherObj.last}`, abbr: leadTeacherObj.abbr } : undefined,
                  supportTeacher: undefined,
                  supportTypeLabel: 'Zajęcia z klasą (ogólne)',
                  roomName,
                  className: studentClass ? `kl. ${studentClass.name}` : '',
                  modeDescription: 'Realizacja z klasą (bez nauczyciela wspomagającego)',
                  withClass: true
                });
              }
            });
          }
        }

        matrix[dayIdx][hIdx] = slots;
      });
    }

    return matrix;
  }, [hoursList, student, pl, studentClass, studentSpAssignments, studentSupportTeachersList, subjectsMap, teachersMap, roomsMap, groupsMap, scheduleVersion, schedData, appState.yearKey, resolveRoomFromColKey]);

  // Summary statistics for this student
  const stats = useMemo(() => {
    let coTaughtHours = 0;
    let individualHours = 0;
    let regularClassHours = 0;

    const teacherRolesMap = new Map<string, { teacher: Teacher; roles: Set<string>; hoursCount: number }>();

    const recordTeacher = (teacherAbbrOrId?: string, roleDesc?: string) => {
      if (!teacherAbbrOrId) return;
      const t = pl.teachers.find(tch => tch.id === teacherAbbrOrId || tch.abbr === teacherAbbrOrId);
      if (!t) return;
      const current = teacherRolesMap.get(t.id) || { teacher: t, roles: new Set<string>(), hoursCount: 0 };
      if (roleDesc) current.roles.add(roleDesc);
      current.hoursCount++;
      teacherRolesMap.set(t.id, current);
    };

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      hoursList.forEach((_, hIdx) => {
        const slots = timetableMatrix[dayIdx]?.[hIdx] || [];
        slots.forEach(slot => {
          if (slot.type === 'co_taught') {
            coTaughtHours++;
            if (slot.leadTeacher) recordTeacher(slot.leadTeacher.abbr, `Prowadzący (${slot.subjectName})`);
            if (slot.supportTeacher) recordTeacher(slot.supportTeacher.abbr, `Nauczyciel wspomagający w oddziale (${slot.subjectName})`);
          } else if (slot.type === 'individual') {
            individualHours++;
            if (slot.leadTeacher) recordTeacher(slot.leadTeacher.abbr, `Prowadzący 1:1 (${slot.supportTypeLabel || slot.subjectName})`);
            if (slot.supportTeacher) recordTeacher(slot.supportTeacher.abbr, `Terapeuta / Wspierający (${slot.subjectName})`);
          } else if (slot.type === 'regular_class') {
            regularClassHours++;
            if (slot.leadTeacher) recordTeacher(slot.leadTeacher.abbr, `Prowadzący w oddziale (${slot.subjectName})`);
          }
        });
      });
    }

    const totalHours = coTaughtHours + individualHours + regularClassHours;

    // Declared quotas and actual scheduled hours
    const declaredBreakdown: Array<{ typeKey: string; label: string; hours: number; allocated: number; scheduled: number }> = [];
    const quotas = student.supportHours || {};

    // Count scheduled hours by support type
    let scheduledWsp = coTaughtHours;
    const scheduledByType: Record<string, number> = { wsp: scheduledWsp };

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      hoursList.forEach((_, hIdx) => {
        const slots = timetableMatrix[dayIdx]?.[hIdx] || [];
        slots.forEach(slot => {
          if (slot.type === 'individual' && slot.supportTypeCode) {
            scheduledByType[slot.supportTypeCode] = (scheduledByType[slot.supportTypeCode] || 0) + 1;
          }
        });
      });
    }

    declaredSupportTypes.forEach(tKey => {
      const meta = SUPPORT_TYPE_INFO[tKey] || { label: tKey.toUpperCase() };
      const hours = Number(quotas[tKey] || 0);
      const allocated = studentSpAssignments
        .filter(sa => (sa.supportType === tKey || (!sa.supportType && tKey === student.type)))
        .reduce((sum, sa) => sum + (sa.hoursPerWeek || 0), 0);
      const scheduled = scheduledByType[tKey] || (tKey === 'wsp' ? coTaughtHours : 0);

      declaredBreakdown.push({
        typeKey: tKey,
        label: meta.label,
        hours,
        allocated,
        scheduled
      });
    });

    const totalDeclaredHours = declaredBreakdown.reduce((sum, item) => sum + item.hours, 0);

    const teamList = Array.from(teacherRolesMap.values()).map(item => ({
      teacher: item.teacher,
      roles: Array.from(item.roles),
      hoursCount: item.hoursCount
    }));

    return {
      coTaughtHours,
      individualHours,
      regularClassHours,
      totalHours,
      totalDeclaredHours,
      declaredBreakdown,
      teamList
    };
  }, [timetableMatrix, hoursList, declaredSupportTypes, student.supportHours, studentSpAssignments, student.type, pl.teachers]);

  return (
    <div 
      id={`arkusz-wsparcia-ucznia-${student.id}`} 
      className={`print-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none print:space-y-4`}
    >
      {/* ── NAGŁÓWEK RAPORTU / METRYKA UCZNIA ── */}
      <div className="border-b-2 border-slate-900 pb-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-900 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider shadow-xs">
                SPE • Kształcenie Specjalne
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">
                {sanitizePrintMetric(appState.school.name || 'Szkoła')} • Rok szkolny {sanitizePrintMetric(appState.yearLabel)}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
              <span>ARKUSZ WSPARCIA UCZNIA:</span>
              <span className="text-indigo-700 underline decoration-indigo-300 underline-offset-4 font-black">
                {sanitizeText(student.firstName)} {sanitizeText(student.lastName)}
              </span>
            </h1>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 pt-1 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                <Users size={13} className="text-slate-600" />
                <span>Oddział / Klasa: <strong className="text-slate-950">{studentClass ? `Klasa ${sanitizeText(studentClass.name)}` : 'Tok Indywidualny'}</strong></span>
              </div>

              {student.note && (
                <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                  <Shield size={13} className="text-amber-700" />
                  <span>Zalecenia orzeczenia: <strong>{sanitizeStudentNotes(student.note)}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right space-y-1 shrink-0">
            <div className="inline-block bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-left min-w-[200px]">
              <span className="text-[9.5px] font-black text-slate-400 uppercase block tracking-wider mb-1">
                Formy objęcia wsparciem:
              </span>
              <div className="flex flex-wrap gap-1">
                {declaredSupportTypes.map(tKey => {
                  const meta = SUPPORT_TYPE_INFO[tKey] || { label: tKey.toUpperCase(), badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' };
                  return (
                    <span 
                      key={tKey} 
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-400 uppercase">
              Tryb generatora: {scheduleVersion === 'etap1' ? 'Plan Klas (Etap 1)' : 'Plan Sal (Etap 2)'}
            </div>
          </div>
        </div>

        {/* ── KAFELKI PODSUMOWANIA GODZINOWEGO (BILANS WSPARCIA) ── */}
        {showSupportSummaryCards && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 text-left">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                <HeartHandshake size={18} />
              </div>
              <div>
                <span className="text-[9.5px] font-black text-emerald-800 uppercase block leading-tight">Wspomaganie w klasie</span>
                <span className="text-base font-black text-emerald-950">{stats.coTaughtHours} <span className="text-xs font-semibold">godz./tyg.</span></span>
              </div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5 flex items-center gap-3">
              <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0">
                <User size={18} />
              </div>
              <div>
                <span className="text-[9.5px] font-black text-purple-800 uppercase block leading-tight">Zajęcia indywidualne (1:1)</span>
                <span className="text-base font-black text-purple-950">{stats.individualHours} <span className="text-xs font-semibold">godz./tyg.</span></span>
              </div>
            </div>

            <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3">
              <div className="p-2 bg-slate-700 text-white rounded-lg shrink-0">
                <BookOpen size={18} />
              </div>
              <div>
                <span className="text-[9.5px] font-black text-slate-700 uppercase block leading-tight">Z klasą bez wsparcia</span>
                <span className="text-base font-black text-slate-900">{stats.regularClassHours} <span className="text-xs font-semibold">godz./tyg.</span></span>
              </div>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-2.5 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[9.5px] font-black text-indigo-800 uppercase block leading-tight">Łączny plan tygodnia</span>
                <span className="text-base font-black text-indigo-950">{stats.totalHours} <span className="text-xs font-semibold">godz./tyg.</span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LEGENDA OZNACZEŃ TYPÓW LEKCJI DLA CZYTELNOŚCI WYDRUKU ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Legenda realizacji zajęć:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold text-[10px]">
              <HeartHandshake size={12} className="text-emerald-700" />
              <span>🤝 Zajęcia ze wsparciem (Prowadzący + Nauczyciel Wspomagający)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 text-purple-950 border border-purple-300 font-extrabold text-[10px]">
              <User size={12} className="text-purple-700" />
              <span>👤 Zajęcia indywidualne / 1 na 1 (NI, Rewalidacja, Terapia)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-200/80 text-slate-900 border border-slate-300 font-extrabold text-[10px]">
              <BookOpen size={12} className="text-slate-600" />
              <span>🏫 Zajęcia realizowane z klasą bez wsparcia (ogólne)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── TYGODNIOWY HARMONOGRAM LEKCJI (TABELA GŁÓWNA) ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse border border-slate-300 shadow-xs">
          <thead>
            <tr className="bg-slate-900 text-white uppercase font-black print:bg-slate-100 print:text-slate-900 print:border-slate-400">
              <th className="w-20 border border-slate-300 p-2.5 text-center text-[10px] bg-slate-950 print:bg-slate-200">
                Nr / Godz
              </th>
              {DAYS_NAMES.map(d => (
                <th key={d} className="border border-slate-300 p-2.5 text-center text-[10px] min-w-[150px]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {hoursList.map((hour, hIdx) => {
              return (
                <tr key={hour.num} className="hover:bg-slate-50/50">
                  {/* Godzina lekcyjna */}
                  <td className="border border-slate-300 p-2 font-mono text-center text-[10px] bg-slate-50/70 align-middle">
                    <span className="font-black text-slate-900 text-xs block">{hour.num}</span>
                    <span className="block text-[8.5px] text-slate-500 font-bold leading-tight mt-0.5">
                      {hour.start}–{hour.end}
                    </span>
                  </td>

                  {/* Dni tygodnia */}
                  {[0, 1, 2, 3, 4].map(dayIdx => {
                    const slots = timetableMatrix[dayIdx]?.[hIdx] || [];

                    return (
                      <td 
                        key={dayIdx} 
                        className="border border-slate-300 p-1.5 align-top text-center min-h-[60px] bg-white"
                      >
                        {slots.length === 0 ? (
                          <div className="h-full min-h-[44px] flex items-center justify-center">
                            <span className="text-[9px] text-slate-300 font-bold font-mono">-</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-left">
                            {slots.map((slot, sIdx) => {
                              // Styling based on slot type
                              if (slot.type === 'co_taught') {
                                return (
                                  <div 
                                    key={sIdx} 
                                    className="p-2 rounded-lg bg-emerald-50/90 border border-emerald-300 text-emerald-950 space-y-1 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-emerald-950 leading-tight">
                                        {slot.subjectName}
                                      </span>
                                      <span className="bg-emerald-600 text-white text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded shrink-0">
                                        🤝 Wspomaganie
                                      </span>
                                    </div>

                                    {/* Nauczyciel Prowadzący */}
                                    <div className="text-[9.5px] text-emerald-900 font-semibold flex items-center gap-1">
                                      <span className="text-[8px] uppercase font-black text-emerald-800">Prowadzi:</span>
                                      <span className="font-extrabold text-slate-900">
                                        {slot.leadTeacher?.name || slot.leadTeacher?.abbr || 'Nauczyciel oddziału'}
                                      </span>
                                      {slot.leadTeacher?.abbr && (
                                        <span className="text-[8px] bg-emerald-200/70 px-1 rounded font-mono font-bold">
                                          {slot.leadTeacher.abbr}
                                        </span>
                                      )}
                                    </div>

                                    {/* Nauczyciel Wspomagający */}
                                    <div className="text-[9.5px] text-emerald-950 font-black bg-emerald-100/90 p-1 rounded border border-emerald-200 flex items-center gap-1">
                                      <HeartHandshake size={11} className="text-emerald-700 shrink-0" />
                                      <span className="text-[8px] uppercase font-black text-emerald-800">Wspomaga:</span>
                                      <span className="font-black text-emerald-950">
                                        {slot.supportTeacher?.name || slot.supportTeacher?.abbr || 'Nauczyciel wspomagający'}
                                      </span>
                                      {slot.supportTeacher?.abbr && (
                                        <span className="text-[8px] bg-emerald-700 text-white px-1 rounded font-mono font-bold">
                                          {slot.supportTeacher.abbr}
                                        </span>
                                      )}
                                    </div>

                                    {/* Sala i Klasa */}
                                    <div className="flex items-center justify-between text-[8px] font-bold text-emerald-800 pt-0.5">
                                      <span>{slot.className} {slot.groupShort ? `(${slot.groupShort})` : ''}</span>
                                      {slot.roomName && (
                                        <span className="bg-white/80 border border-emerald-200 px-1 rounded text-emerald-900 font-semibold">
                                          sala {slot.roomName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              if (slot.type === 'individual') {
                                return (
                                  <div 
                                    key={sIdx} 
                                    className="p-2 rounded-lg bg-purple-50/90 border border-purple-300 text-purple-950 space-y-1 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-purple-950 leading-tight">
                                        {slot.subjectName}
                                      </span>
                                      <span className="bg-purple-700 text-white text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded shrink-0">
                                        👤 1 na 1
                                      </span>
                                    </div>

                                    <div className="text-[8.5px] font-black uppercase text-purple-800">
                                      {slot.supportTypeLabel || 'Zajęcia Indywidualne'}
                                    </div>

                                    {/* Nauczyciel / Terapeuta */}
                                    <div className="text-[9.5px] text-purple-900 font-semibold flex items-center gap-1">
                                      <span className="text-[8px] uppercase font-black text-purple-800">Nauczyciel:</span>
                                      <span className="font-black text-slate-900">
                                        {slot.leadTeacher?.name || slot.leadTeacher?.abbr || 'Nauczyciel prowadzący'}
                                      </span>
                                      {slot.leadTeacher?.abbr && (
                                        <span className="text-[8px] bg-purple-200/80 px-1 rounded font-mono font-bold">
                                          {slot.leadTeacher.abbr}
                                        </span>
                                      )}
                                    </div>

                                    {/* Sala / Gabinet */}
                                    <div className="flex items-center justify-between text-[8px] font-bold text-purple-800 pt-0.5">
                                      <span>Zajęcia gabinetowe (1:1)</span>
                                      {slot.roomName && (
                                        <span className="bg-white/80 border border-purple-200 px-1 rounded text-purple-900 font-semibold">
                                          gab. {slot.roomName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // slot.type === 'regular_class' (z klasą bez wsparcia)
                              return (
                                <div 
                                  key={sIdx} 
                                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-black text-xs text-slate-900 leading-tight">
                                      {slot.subjectName}
                                    </span>
                                    <span className="bg-slate-200 text-slate-700 text-[7px] font-bold uppercase px-1 py-0.2 rounded shrink-0">
                                      Z klasą
                                    </span>
                                  </div>

                                  {/* Nauczyciel Prowadzący */}
                                  <div className="text-[9.5px] text-slate-600 font-medium flex items-center gap-1">
                                    <span className="text-[8px] uppercase font-bold text-slate-400">Prowadzi:</span>
                                    <span className="font-bold text-slate-800">
                                      {slot.leadTeacher?.name || slot.leadTeacher?.abbr || 'Nauczyciel oddziału'}
                                    </span>
                                    {slot.leadTeacher?.abbr && (
                                      <span className="text-[8px] bg-slate-200/70 px-1 rounded font-mono font-bold text-slate-600">
                                        {slot.leadTeacher.abbr}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[8px] text-slate-400 italic font-medium">
                                    Udział z oddziałem bez wsparcia
                                  </div>

                                  {/* Sala i Klasa */}
                                  <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 pt-0.5">
                                    <span>{slot.className} {slot.groupShort ? `(${slot.groupShort})` : ''}</span>
                                    {slot.roomName && (
                                      <span className="bg-slate-100 border border-slate-200 px-1 rounded text-slate-700 font-semibold">
                                        s. {slot.roomName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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

      {/* ── WYKAZ KADRY PEDAGOGICZNEJ REALIZUJĄCEJ WSPARCIE ── */}
      {showTeamTable && stats.teamList.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 text-left space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
            <Award size={15} className="text-indigo-600" />
            <span>Wykaz nauczycieli i specjalistów realizujących plan wsparcia ucznia</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs bg-white border border-slate-200 rounded-lg">
              <thead>
                <tr className="bg-slate-100 uppercase font-black text-slate-700 border-b border-slate-200 text-[9.5px]">
                  <th className="p-2 text-left w-10">Lp.</th>
                  <th className="p-2 text-left">Nauczyciel / Specjalista</th>
                  <th className="p-2 text-left">Skrót</th>
                  <th className="p-2 text-left">Funkcja w realizacji orzeczenia</th>
                  <th className="p-2 text-right">Liczba godz. w planie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.teamList.map((item, idx) => (
                  <tr key={item.teacher.id} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-400 text-[10px]">{idx + 1}.</td>
                    <td className="p-2 font-black text-slate-900">
                      {sanitizeText(item.teacher.last)} {sanitizeText(item.teacher.first)}
                    </td>
                    <td className="p-2 font-mono font-bold text-slate-600 text-[10px]">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {sanitizeText(item.teacher.abbr)}
                      </span>
                    </td>
                    <td className="p-2 text-slate-700 font-medium">
                      <div className="flex flex-wrap gap-1">
                        {item.roles.map((r, rIdx) => (
                          <span 
                            key={rIdx} 
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                              r.includes('wspomagający')
                                ? 'bg-emerald-100 text-emerald-900'
                                : r.includes('1:1') || r.includes('Rewalidacja') || r.includes('NI')
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 text-right font-black text-slate-900 font-mono">
                      {item.hoursCount} h/tyg.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── METRYKA PODPISÓW DO OFICJALNEGO WYDRUKU SZKOLNEGO ── */}
      {showSignatures && (
        <div className="pt-6 border-t-2 border-slate-300 print:pt-4 text-left">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4">
            Zatwierdzenie arkusza wsparcia i organizacji kształcenia specjalnego:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="border-t border-slate-400 pt-2">
              <span className="text-[9.5px] font-black text-slate-800 block uppercase">Wychowawca oddziału</span>
              <span className="text-[8px] text-slate-400 italic block mt-0.5">(podpis)</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="text-[9.5px] font-black text-slate-800 block uppercase">Nauczyciel wspomagający</span>
              <span className="text-[8px] text-slate-400 italic block mt-0.5">(podpis)</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="text-[9.5px] font-black text-slate-800 block uppercase">Pedagog specjalny</span>
              <span className="text-[8px] text-slate-400 italic block mt-0.5">(podpis)</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="text-[9.5px] font-black text-slate-800 block uppercase">Dyrektor szkoły</span>
              <span className="text-[8px] text-slate-400 italic block mt-0.5">(data i podpis)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
