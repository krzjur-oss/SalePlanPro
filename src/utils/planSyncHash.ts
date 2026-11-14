/**
 * SalePlan Pro – Narzędzia synchronizacji Planu Lekcji (Etap 1) z Planem Sal (Etap 2)
 * Wylicza deterministyczny skrót (hash) lekcji i przydziałów w Etapie 1, aby wykryć rozbieżność z Planem Sal.
 */

import { AppState, PlanLekcjiState } from '../types';

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
 * Wylicza deterministyczny hash aktualnego planu lekcji (lekcje regularne, NI, powiązane przydziały oraz siatka godzin).
 */
export function computePlanLessonsHash(pl: PlanLekcjiState | undefined): string {
  if (!pl) return 'empty';

  const lessonsEntries = Object.entries(pl.lessons || {})
    .filter(([, v]) => Boolean(v))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, v.assignmentId, Boolean(v.locked), v.supportTeacherId || '']);

  const specialEntries = Object.entries(pl.specialLessons || {})
    .filter(([, v]) => Boolean(v))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, v.assignmentId, Boolean(v.locked)]);

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

  return fnv1aHash(payload);
}

/**
 * Zwraca true, jeśli plan lekcji (Etap 1) zawiera lekcje lub był wcześniej synchronizowany,
 * a obecny hash lekcji różni się od ostatnio zapisanego hash synchronizacji z Planem Sal (`appState.planSyncHash`).
 */
export function isPlanRoomsOutOfSync(appState: AppState): boolean {
  const pl = appState.planLekcji;
  const lessonsCount = Object.keys(pl?.lessons || {}).length;
  const specialCount = Object.keys(pl?.specialLessons || {}).length;

  if (lessonsCount === 0 && specialCount === 0 && !appState.planSyncHash) {
    return false;
  }

  const currentHash = computePlanLessonsHash(pl);
  return appState.planSyncHash !== currentHash;
}
