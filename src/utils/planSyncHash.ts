/**
 * SalePlan Pro – Narzędzia synchronizacji Planu Lekcji (Etap 1) z Planem Sal (Etap 2)
 * Wylicza deterministyczny skrót (hash) lekcji i przydziałów w Etapie 1, aby wykryć rozbieżność z Planem Sal.
 */

import { AppState, PlanLekcjiState, SchedData } from '../types';

export const PLAN_SYNC_HASH_PREFIX = 'v2:';

function fnv1aHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

/**
 * Sprawdza, czy harmonogram sal (SchedData) zawiera co najmniej jedną wpisaną komórkę lekcji.
 */
export function hasSchedDataEntries(schedData: SchedData | Record<string, unknown> | undefined): boolean {
  if (!schedData || typeof schedData !== 'object') return false;
  for (const yearVal of Object.values(schedData)) {
    if (!yearVal || typeof yearVal !== 'object') continue;
    for (const dayVal of Object.values(yearVal as Record<string, unknown>)) {
      if (!dayVal || typeof dayVal !== 'object') continue;
      for (const hourVal of Object.values(dayVal as Record<string, unknown>)) {
        if (!hourVal || typeof hourVal !== 'object') continue;
        for (const cellVal of Object.values(hourVal as Record<string, unknown>)) {
          if (cellVal && typeof cellVal === 'object') {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Wylicza deterministyczny hash aktualnego planu lekcji (klucz slotu i assignmentId lekcji regularnych i NI,
 * przydziały oraz siatka godzin — bez pól locked i supportTeacherId lekcji).
 */
export function computePlanLessonsHash(pl: PlanLekcjiState | undefined): string {
  if (!pl) return `${PLAN_SYNC_HASH_PREFIX}empty`;

  const lessonsEntries = Object.entries(pl.lessons || {})
    .filter(([, v]) => Boolean(v))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, v.assignmentId]);

  const specialEntries = Object.entries(pl.specialLessons || {})
    .filter(([, v]) => Boolean(v))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, v.assignmentId]);

  const assignmentsSummary = (pl.assignments || [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(a => [
      a.id,
      a.classId,
      a.subjectId,
      a.teacherId || '',
      a.supportTeacherId || '',
      a.groupId || '',
      a.roomId || '',
      (a.linkedClassIds || []).slice().sort().join(','),
      (a.linkedGroupIds || []).slice().sort().join(','),
    ]);

  const hoursNums = (pl.hours || []).map(h => h.num);

  const payload = JSON.stringify({
    lessonsEntries,
    specialEntries,
    assignmentsSummary,
    hoursNums,
  });

  return `${PLAN_SYNC_HASH_PREFIX}${fnv1aHash(payload)}`;
}

/**
 * Zwraca true, jeśli plan lekcji (Etap 1) zawiera lekcje lub był wcześniej synchronizowany,
 * a obecny hash lekcji różni się od ostatnio zapisanego hash synchronizacji z Planem Sal (`appState.planSyncHash`).
 * Starsze hashe bez prefiksu "v2:" są traktowane jako wymagające przeliczenia bez wywoływania baneru.
 */
export function isPlanRoomsOutOfSync(appState: AppState): boolean {
  const pl = appState.planLekcji;
  const lessonsCount = Object.keys(pl?.lessons || {}).length;
  const specialCount = Object.keys(pl?.specialLessons || {}).length;

  if (lessonsCount === 0 && specialCount === 0 && !appState.planSyncHash) {
    return false;
  }

  if (
    typeof appState.planSyncHash === 'string' &&
    appState.planSyncHash.length > 0 &&
    !appState.planSyncHash.startsWith(PLAN_SYNC_HASH_PREFIX)
  ) {
    return false;
  }

  const currentHash = computePlanLessonsHash(pl);
  return appState.planSyncHash !== currentHash;
}
