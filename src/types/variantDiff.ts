/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Typy danych dla Porównywarki Wariantów Split-Screen Diff (Module 4)
 * Opis: Definicje różnic pomiędzy wersjami planu, wskaźniki KPI oraz kolizje.
 */

import { Lesson, PlanVariant } from '../types';

export type DiffScope = 'class' | 'teacher' | 'room' | 'duty';

export type DiffChangeStatus = 
  | 'added'           // Lekcja obecna tylko w Wariancie B
  | 'removed'         // Lekcja obecna tylko w Wariancie A
  | 'changed'         // Całkowita zmiana przedmiotu/przydziału
  | 'room_changed'    // Ten sam przedmiot i nauczyciel, inna sala
  | 'teacher_changed' // Ten sam przedmiot, inny nauczyciel
  | 'duty_changed';   // Zmiana dyżuru nauczycielskiego

export interface DiffSlotItem {
  subject?: string;
  subjectColor?: string;
  teacher?: string;
  teacherAbbr?: string;
  teacherId?: string;
  room?: string;
  roomId?: string;
  className?: string;
  classId?: string;
  groupId?: string;
  groupName?: string;
  group?: string;
  lesson?: Lesson;
  lessonKey?: string;
  note?: string;
  isUnneeded?: boolean;
}

export interface DetailedDiffItem {
  id: string; // np. "class_c1_0_1"
  scope: DiffScope;
  entityId: string;
  entityName: string;
  dayIdx: number;
  dayName: string;
  hourIdx: number;
  hourNum: number;
  timeRange: string;
  status: DiffChangeStatus;
  itemA: DiffSlotItem | null;
  itemB: DiffSlotItem | null;
  collisionRisk?: boolean;
  collisionReason?: string;
}

export interface DiffSummaryKPI {
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  roomChangedCount: number;
  teacherChangedCount: number;
  dutyChangedCount: number;
  affectedClassesCount: number;
  affectedTeachersCount: number;
  affectedRoomsCount: number;
  potentialCollisionsCount: number;
}

export type SplitViewDisplayMode = 'split_screen' | 'unified' | 'table';

export type DiffFilterEntity = 'class' | 'teacher' | 'room' | 'duty' | 'all';

export interface VariantComparisonState {
  variantA: PlanVariant | null;
  variantB: PlanVariant | null;
  diffItems: DetailedDiffItem[];
  kpi: DiffSummaryKPI;
}
