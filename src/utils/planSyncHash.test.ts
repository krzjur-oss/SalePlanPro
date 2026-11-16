import { describe, it, expect } from 'vitest';
import { computePlanLessonsHash, isPlanRoomsOutOfSync, PLAN_SYNC_HASH_PREFIX } from './planSyncHash';
import { normalizeImportPayload } from './mergeEngine';
import { getDemoAppState, getDemoSchedData } from '../utils';

describe('planSyncHash & wykrywanie braku synchronizacji Planu Sal z Planem Lekcji', () => {
  it('wylicza deterministyczny hash z prefiksem v2: zmieniający się po modyfikacji lekcji', () => {
    const appState = getDemoAppState();
    const h1 = computePlanLessonsHash(appState.planLekcji);
    const h2 = computePlanLessonsHash(appState.planLekcji);
    expect(h1.startsWith(PLAN_SYNC_HASH_PREFIX)).toBe(true);
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

  it('przełączenie locked oraz supportTeacherId na lekcji nie zmienia hasha, natomiast zmiana teacherId przydziału zmienia hash', () => {
    const appState = getDemoAppState();
    appState.planLekcji.lessons = {
      'c1|0|0': { assignmentId: 'a1', locked: false }
    };
    const baseAssignment = appState.planLekcji.assignments[0] || {
      id: 'a1',
      classId: 'c1',
      subjectId: 's1',
      teacherId: 't1',
      groupId: null,
      roomId: null,
      hoursPerWeek: 1
    };
    appState.planLekcji.assignments = [baseAssignment];

    const baseHash = computePlanLessonsHash(appState.planLekcji);

    // Przełączenie locked i zmiana supportTeacherId na lekcji nie zmieniają hasha
    const toggledLocked = {
      ...appState.planLekcji,
      lessons: {
        'c1|0|0': { assignmentId: 'a1', locked: true, supportTeacherId: 't_sup' }
      }
    };
    expect(computePlanLessonsHash(toggledLocked)).toBe(baseHash);

    // Zmiana teacherId przydziału zmienia hash
    const changedAssignmentTeacher = {
      ...appState.planLekcji,
      assignments: [
        { ...baseAssignment, teacherId: 't_other' }
      ]
    };
    expect(computePlanLessonsHash(changedAssignmentTeacher)).not.toBe(baseHash);
  });

  it('isPlanRoomsOutOfSync zgłasza rozbieżność gdy hash różni się od ostatniej synchronizacji i traktuje stary hash bez v2: bez baneru', () => {
    const appState = getDemoAppState();
    // Puste lekcje i brak wcześniejszej synchronizacji -> brak fałszywego alarmu
    appState.planLekcji.lessons = {};
    appState.planSyncHash = undefined;
    expect(isPlanRoomsOutOfSync(appState)).toBe(false);

    // Dodano lekcję bez synchronizacji Planu Sal -> brak synchronizacji
    appState.planLekcji.lessons = { 'c1|0|0': { assignmentId: 'a1', locked: false } };
    expect(isPlanRoomsOutOfSync(appState)).toBe(true);

    // Stary hash bez prefiksu "v2:" -> traktowany jako do przeliczenia bez wyświetlania fałszywego baneru
    appState.planSyncHash = '0123456789abcdef';
    expect(isPlanRoomsOutOfSync(appState)).toBe(false);

    // Zapisanie hasha v2 synchronizacji przywraca spójność
    appState.planSyncHash = computePlanLessonsHash(appState.planLekcji);
    expect(isPlanRoomsOutOfSync(appState)).toBe(false);

    // Późniejsza zmiana w planie lekcji ponownie oznacza brak synchronizacji
    appState.planLekcji.lessons['c1|0|1'] = { assignmentId: 'a1', locked: false };
    expect(isPlanRoomsOutOfSync(appState)).toBe(true);
  });

  it('normalizeImportPayload przelicza przestarzały planSyncHash tylko wtedy, gdy plan sal nie jest pusty', () => {
    const appState = getDemoAppState();
    appState.planLekcji.lessons = { 'c1|0|0': { assignmentId: 'a1', locked: false } };
    appState.planSyncHash = 'legacy_hash_v1';

    const nonEmptySched = getDemoSchedData();
    const resWithRooms = normalizeImportPayload({ appState, schedData: nonEmptySched });
    const appWithRooms = resWithRooms.appState;
    expect(appWithRooms).toBeDefined();
    if (!appWithRooms) throw new Error('Expected normalized appState');
    expect(appWithRooms.planSyncHash).toBe(computePlanLessonsHash(appWithRooms.planLekcji));
    expect(isPlanRoomsOutOfSync(appWithRooms)).toBe(false);

    const resEmptyRooms = normalizeImportPayload({ appState, schedData: {} });
    const appEmptyRooms = resEmptyRooms.appState;
    expect(appEmptyRooms).toBeDefined();
    if (!appEmptyRooms) throw new Error('Expected normalized appState');
    expect(appEmptyRooms.planSyncHash).toBeUndefined();
    expect(isPlanRoomsOutOfSync(appEmptyRooms)).toBe(true);
  });
});
