import React, { useState, useMemo } from 'react';
import { ClassRoom, PlanLekcjiState } from '../types';
import { ArrowUpDown, CheckCircle2, AlertCircle, Filter } from 'lucide-react';

export type RoomSortMode = 'free_first' | 'free_slots_weekly' | 'alphabetical' | 'free_only';

export interface AssignRoomDropdownProps {
  planLekcji: PlanLekcjiState;
  dayIdx?: number | null;
  hourIdx?: number | null;
  currentAssignmentId?: string | null;
  value?: string | null;
  onChange: (roomId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showSortControl?: boolean;
  compact?: boolean;
  id?: string;
}

export interface RoomAvailabilityInfo {
  room: ClassRoom;
  isFreeInSlot: boolean;
  occupantText?: string;
  freeSlotsWeekly: number;
  totalWeeklySlots: number;
  occupiedWeeklySlots: number;
}

export const AssignRoomDropdown: React.FC<AssignRoomDropdownProps> = ({
  planLekcji,
  dayIdx,
  hourIdx,
  currentAssignmentId,
  value,
  onChange,
  placeholder = '-- Wybierz salę --',
  className = '',
  disabled = false,
  showSortControl = true,
  compact = false,
  id
}) => {
  const [sortMode, setSortMode] = useState<RoomSortMode>('free_first');

  // Compute availability for every room at the specified time slot and weekly
  const roomsAnalysis = useMemo<RoomAvailabilityInfo[]>(() => {
    const pl: PlanLekcjiState = planLekcji || {
      meta: { schoolName: '', year: '' },
      hours: [],
      classes: [],
      teachers: [],
      rooms: [],
      subjects: [],
      schoolGroups: [],
      assignments: [],
      lessons: {},
      specialStudents: [],
      specialAssignments: [],
      specialLessons: {},
      specialAbsences: {}
    };
    const rooms = pl.rooms || [];
    const hours = pl.hours || [];
    const totalHoursPerDay = Math.max(1, hours.length || 8);
    const totalWeeklySlots = 5 * totalHoursPerDay;

    const hasSlot = dayIdx !== undefined && dayIdx !== null && hourIdx !== undefined && hourIdx !== null;

    // Pre-map assignments for O(1) lookup
    const asgMap = new Map((pl.assignments || []).map(a => [a.id, a]));
    const classMap = new Map((pl.classes || []).map(c => [c.id, c]));
    const subjMap = new Map((pl.subjects || []).map(s => [s.id, s]));
    const teachMap = new Map((pl.teachers || []).map(t => [t.id, t]));

    // Pre-map special assignments
    const spAsgMap = new Map((pl.specialAssignments || []).map(a => [a.id, a]));

    return rooms.map(room => {
      let isFreeInSlot = true;
      let occupantText: string | undefined = undefined;
      const occupiedSlotSet = new Set<string>(); // "day-hour"

      // 1. Check regular lessons
      Object.entries(pl.lessons || {}).forEach(([key, lesson]) => {
        if (!lesson || !lesson.assignmentId) return;
        if (currentAssignmentId && lesson.assignmentId === currentAssignmentId) return;

        const parts = key.split('|');
        const d = parseInt(parts[1], 10);
        const h = parseInt(parts[2], 10);
        const asg = asgMap.get(lesson.assignmentId);

        if (asg && asg.roomId === room.id) {
          occupiedSlotSet.add(`${d}-${h}`);

          if (hasSlot && d === dayIdx && h === hourIdx) {
            isFreeInSlot = false;
            const cls = classMap.get(asg.classId);
            const subj = subjMap.get(asg.subjectId);
            const teacher = asg.teacherId ? teachMap.get(asg.teacherId) : null;
            const details: string[] = [];
            if (cls) details.push(`kl. ${cls.name}`);
            if (subj) details.push(subj.short || subj.name);
            if (teacher) details.push(teacher.abbr);
            occupantText = details.join(' • ') || 'Zajęta';
          }
        }
      });

      // 2. Check special lessons (studentId|day|hour|specialAssignmentId)
      Object.entries(pl.specialLessons || {}).forEach(([key, spLesson]) => {
        if (!spLesson || !spLesson.assignmentId) return;
        if (currentAssignmentId && spLesson.assignmentId === currentAssignmentId) return;

        const parts = key.split('|');
        const d = parseInt(parts[1], 10);
        const h = parseInt(parts[2], 10);
        const spAsg = spAsgMap.get(spLesson.assignmentId);

        if (spAsg && spAsg.roomId === room.id) {
          occupiedSlotSet.add(`${d}-${h}`);

          if (hasSlot && d === dayIdx && h === hourIdx) {
            isFreeInSlot = false;
            occupantText = occupantText || 'Zajęcia specjalne';
          }
        }
      });

      // 3. Check spePlan slotAssignments
      if (pl.spePlan?.slotAssignments) {
        pl.spePlan.slotAssignments.forEach(slot => {
          if (slot.roomId === room.id && slot.id !== currentAssignmentId) {
            occupiedSlotSet.add(`${slot.dayIdx}-${slot.hourIdx}`);

            if (hasSlot && slot.dayIdx === dayIdx && slot.hourIdx === hourIdx) {
              isFreeInSlot = false;
              occupantText = occupantText || 'SPE / Terapia';
            }
          }
        });
      }

      const occupiedWeeklySlots = occupiedSlotSet.size;
      const freeSlotsWeekly = Math.max(0, totalWeeklySlots - occupiedWeeklySlots);

      return {
        room,
        isFreeInSlot,
        occupantText,
        freeSlotsWeekly,
        totalWeeklySlots,
        occupiedWeeklySlots
      };
    });
  }, [planLekcji, dayIdx, hourIdx, currentAssignmentId]);

  // Group and sort rooms based on selected sortMode
  const { freeRooms, occupiedRooms, sortedList, totalFreeCount } = useMemo(() => {
    const free = roomsAnalysis.filter(r => r.isFreeInSlot);
    const occupied = roomsAnalysis.filter(r => !r.isFreeInSlot);

    const sortFn = (a: RoomAvailabilityInfo, b: RoomAvailabilityInfo) => {
      if (sortMode === 'free_slots_weekly') {
        return b.freeSlotsWeekly - a.freeSlotsWeekly || a.room.name.localeCompare(b.room.name, undefined, { numeric: true });
      }
      if (sortMode === 'alphabetical') {
        return a.room.name.localeCompare(b.room.name, undefined, { numeric: true });
      }
      // 'free_first'
      if (a.isFreeInSlot !== b.isFreeInSlot) {
        return a.isFreeInSlot ? -1 : 1;
      }
      return b.freeSlotsWeekly - a.freeSlotsWeekly || a.room.name.localeCompare(b.room.name, undefined, { numeric: true });
    };

    let list = [...roomsAnalysis];
    if (sortMode === 'free_only') {
      list = list.filter(r => r.isFreeInSlot);
    }
    list.sort(sortFn);

    const sortedFree = [...free].sort(sortFn);
    const sortedOccupied = [...occupied].sort(sortFn);

    return {
      freeRooms: sortedFree,
      occupiedRooms: sortedOccupied,
      sortedList: list,
      totalFreeCount: free.length
    };
  }, [roomsAnalysis, sortMode]);

  const hasSlot = dayIdx !== undefined && dayIdx !== null && hourIdx !== undefined && hourIdx !== null;

  return (
    <div className={`assign-room-dropdown-container space-y-1.5 text-left ${compact ? 'text-xs' : ''}`}>
      {/* Pasek kontrolny sortowania (opcjonalny, zwinny) */}
      {showSortControl && (
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <ArrowUpDown size={11} className="text-indigo-600" />
            <span>Sortuj sale:</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortMode('free_first')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                sortMode === 'free_first'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Najpierw sale wolne w wybranej godzinie"
            >
              <CheckCircle2 size={10} className="text-emerald-600" />
              <span>Wolne w godz.</span>
            </button>

            <button
              type="button"
              onClick={() => setSortMode('free_slots_weekly')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer ${
                sortMode === 'free_slots_weekly'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Sortuj według liczby wolnych slotów w tygodniu (najwięcej wolnych na górze)"
            >
              <span>Wolne sloty</span>
            </button>

            <button
              type="button"
              onClick={() => setSortMode('alphabetical')}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer ${
                sortMode === 'alphabetical'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Sortuj alfabetycznie według numeru / nazwy sali"
            >
              <span>A-Z</span>
            </button>

            {hasSlot && (
              <button
                type="button"
                onClick={() => setSortMode(prev => prev === 'free_only' ? 'free_first' : 'free_only')}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  sortMode === 'free_only'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-teal-50 text-slate-600'
                }`}
                title="Pokaż wyłącznie sale wolne w wybranej godzinie"
              >
                <Filter size={10} />
                <span>Tylko wolne</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Główny selektor wyboru sali ze specjalną klasą assign-room-dropdown */}
      <div className="relative">
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`assign-room-dropdown w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
        >
          <option value="">{placeholder}</option>

          {hasSlot && sortMode !== 'alphabetical' && sortMode !== 'free_slots_weekly' ? (
            <>
              {/* Grupa 1: Sale wolne w danym czasie */}
              {freeRooms.length > 0 && (
                <optgroup label={`🟢 Wolne w tej godzinie (${freeRooms.length} sal)`}>
                  {freeRooms.map(({ room, freeSlotsWeekly }) => (
                    <option key={room.id} value={room.id}>
                      {room.name} — Wolne {room.desc ? `(${room.desc})` : ''} [{freeSlotsWeekly} wolnych w tyg.]
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Grupa 2: Sale zajęte w danym czasie */}
              {sortMode !== 'free_only' && occupiedRooms.length > 0 && (
                <optgroup label={`⚠️ Zajęte w tej godzinie (${occupiedRooms.length} sal)`}>
                  {occupiedRooms.map(({ room, occupantText, freeSlotsWeekly }) => (
                    <option key={room.id} value={room.id}>
                      {room.name} — Zajęta {occupantText ? `(${occupantText})` : ''} [{freeSlotsWeekly} wolnych w tyg.]
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          ) : (
            // Lista posortowana według wybranego kryterium (np. wolne sloty lub alfabetycznie)
            sortedList.map(({ room, isFreeInSlot, occupantText, freeSlotsWeekly }) => {
              const statusLabel = hasSlot
                ? (isFreeInSlot ? '— Wolne' : `— Zajęta ${occupantText ? `(${occupantText})` : ''}`)
                : `— ${freeSlotsWeekly} wolnych slotów`;

              return (
                <option key={room.id} value={room.id}>
                  {hasSlot && isFreeInSlot ? '🟢 ' : (hasSlot ? '⚠️ ' : '')}
                  {room.name} {statusLabel} {room.desc ? `(${room.desc})` : ''}
                </option>
              );
            })
          )}
        </select>
      </div>

      {/* Mini etykieta informacyjna o stanie wolnych sal */}
      {hasSlot && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Wolne w tym slocie: <strong className="text-emerald-700 font-bold">{totalFreeCount}</strong> z {roomsAnalysis.length} sal</span>
          </span>
          {value && (
            <span className="text-slate-400">
              {roomsAnalysis.find(r => r.room.id === value)?.isFreeInSlot ? (
                <span className="text-emerald-600 font-bold">✓ Wybrana sala jest Wolna</span>
              ) : (
                <span className="text-amber-600 font-bold">⚠️ Wybrana sala ma kolizję</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
