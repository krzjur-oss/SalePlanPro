import { describe, it, expect } from 'vitest';
import { computePlanLessonsHash, isPlanRoomsOutOfSync } from './planSyncHash';
import { getDemoAppState } from '../utils';

describe('planSyncHash & wykrywanie braku synchronizacji Planu Sal z Planem Lekcji', () => {
  it('wylicza deterministyczny hash zmieniający się po modyfikacji lekcji', () => {
    const appState = getDemoAppState();
    const h1 = computePlanLessonsHash(appState.planLekcji);
    const h2 = computePlanLessonsHash(appState.planLekcji);
    expect(h1).toBe(h2);

    const modified = {
      ...appState.planLekcji,
      lessons: {
        ...appState.planLekcji.lessons,
        'c1|4|4': { assignmentId: 'a1', locked: false }
      }
    };
    const h3 = computePlanLessonsHash(modified);
    expect(h3).not.toBe(h1);
  });

  it('isPlanRoomsOutOfSync zgłasza rozbieżność gdy hash różni się od ostatniej synchronizacji i znika po aktualizacji hasha', () => {
    const appState = getDemoAppState();
    // Puste lekcje i brak wcześniejszej synchronizacji -> brak fałszywego alarmu
    appState.planLekcji.lessons = {};
    appState.planSyncHash = undefined;
    expect(isPlanRoomsOutOfSync(appState)).toBe(false);

    // Dodano lekcję bez synchronizacji Planu Sal -> brak synchronizacji
    appState.planLekcji.lessons = { 'c1|0|0': { assignmentId: 'a1', locked: false } };
    expect(isPlanRoomsOutOfSync(appState)).toBe(true);

    // Zapisanie hasha synchronizacji przywraca spójność
    appState.planSyncHash = computePlanLessonsHash(appState.planLekcji);
    expect(isPlanRoomsOutOfSync(appState)).toBe(false);

    // Późniejsza zmiana w planie lekcji ponownie oznacza brak synchronizacji
    appState.planLekcji.lessons['c1|0|1'] = { assignmentId: 'a1', locked: false };
    expect(isPlanRoomsOutOfSync(appState)).toBe(true);
  });
});
