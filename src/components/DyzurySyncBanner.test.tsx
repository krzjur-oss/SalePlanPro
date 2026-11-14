import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dyzury from './Dyzury';
import { getDemoAppState, getDemoSchedData } from '../utils';
import { computePlanLessonsHash } from '../utils/planSyncHash';

describe('Dyzury — baner synchronizacji Planu Sal z Planem Lekcji', () => {
  it('pokazuje baner „Plan sal nie jest zsynchronizowany z planem lekcji", gdy hash lekcji się różni, i ukrywa go po synchronizacji', () => {
    const appState = getDemoAppState();
    appState.planLekcji.lessons = {
      'c1|0|0': { assignmentId: appState.planLekcji.assignments[0]?.id || 'a1', locked: false }
    };
    appState.planSyncHash = 'stary_niezgodny_hash';

    const schedData = getDemoSchedData();
    const onNavigate = vi.fn();

    const { rerender } = render(
      <Dyzury
        appState={appState}
        onChangeAppState={() => {}}
        schedData={schedData}
        onNavigateToTab={onNavigate}
      />
    );

    expect(screen.getByText(/Plan sal nie jest zsynchronizowany z planem lekcji/i)).toBeTruthy();
    const navBtn = screen.getByRole('button', { name: /Przejdź do Planu Sal/i });
    fireEvent.click(navBtn);
    expect(onNavigate).toHaveBeenCalledWith('plan_sal');

    // Po zaktualizowaniu hasha do aktualnego planu lekcji baner znika
    const syncedState = {
      ...appState,
      planSyncHash: computePlanLessonsHash(appState.planLekcji)
    };
    rerender(
      <Dyzury
        appState={syncedState}
        onChangeAppState={() => {}}
        schedData={schedData}
        onNavigateToTab={onNavigate}
      />
    );

    expect(screen.queryByText(/Plan sal nie jest zsynchronizowany z planem lekcji/i)).toBeNull();
  });
});
