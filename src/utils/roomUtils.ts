/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Narzędzia Geometrii i Numeracji Sal Lekcyjnych (Room Utils)
 * Opis: Generowanie i parsowanie etykiet sal, kondygnacji i segmentów budynku szkolnego.
 */
import { ClassRoom } from '../types';

/**
 * Checks whether a classroom is a sports facility (gym, sports hall, swimming pool, pitch, etc.)
 * Used across PlanKlas, PlanSal, and DualScreen views for multi-class allocations and conflict detection.
 */
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
