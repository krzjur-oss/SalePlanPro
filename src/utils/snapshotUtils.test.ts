import { describe, it, expect } from 'vitest';
import { 
  pruneSnapshots, 
  isSnapshotManual, 
  calculateSnapshotsSize, 
  MAX_SNAPSHOTS_LIMIT 
} from './snapshotUtils';
import { SnapshotEntry, AppState, SchedData } from '../types';

const mockAppState = {} as AppState;
const mockSchedData = {} as SchedData;

function createSnapshot(id: string, name: string, date: string, isManual?: boolean): SnapshotEntry {
  return {
    id,
    name,
    createdAt: date,
    isManual,
    appState: mockAppState,
    schedData: mockSchedData,
  };
}

describe('snapshotUtils (Menedżer Migawek)', () => {
  it('poprawnie rozpoznaje migawki ręczne i automatyczne (w tym heurystyka wsteczna)', () => {
    const manual1 = createSnapshot('snap-1', 'Przed zmianami', '2026-05-10T10:00:00.000Z', true);
    expect(isSnapshotManual(manual1)).toBe(true);

    const auto1 = createSnapshot('snap-2', 'Automatyczna kopia', '2026-05-10T10:00:00.000Z', false);
    expect(isSnapshotManual(auto1)).toBe(false);

    // Heurystyka dla wpisów ze starszych wersji bez jawnej flagi isManual
    const legacyConflict = createSnapshot('conflict_12345', 'Kopia z innej karty - Rewizja #3', '2026-05-10T10:00:00.000Z');
    expect(isSnapshotManual(legacyConflict)).toBe(false);

    const legacyAuto = createSnapshot('auto_999', 'Automatyczny zapis', '2026-05-10T10:00:00.000Z');
    expect(isSnapshotManual(legacyAuto)).toBe(false);

    const legacyManual = createSnapshot('snap-100', 'Moja kopia ręczna', '2026-05-10T10:00:00.000Z');
    expect(isSnapshotManual(legacyManual)).toBe(true);
  });

  it('nie usuwa migawek gdy łączna liczba jest <= 30', () => {
    const snapshots: SnapshotEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      snapshots.push(createSnapshot(`snap-${i}`, `Kopia ${i}`, new Date(2026, 4, i).toISOString(), i % 2 === 0));
    }

    const pruned = pruneSnapshots(snapshots, MAX_SNAPSHOTS_LIMIT);
    expect(pruned).toHaveLength(20);
  });

  it('gdy jest 10 ręcznych i 35 automatycznych (razem 45 > 30), zachowuje wszystkie 10 ręcznych i 20 najnowszych automatycznych', () => {
    const snapshots: SnapshotEntry[] = [];

    // 10 ręcznych
    for (let i = 1; i <= 10; i++) {
      snapshots.push(
        createSnapshot(`manual-${i}`, `Ręczna ${i}`, new Date(2026, 1, i, 12, 0).toISOString(), true)
      );
    }

    // 35 automatycznych (dni od 1 do 35 marca)
    for (let i = 1; i <= 35; i++) {
      snapshots.push(
        createSnapshot(`auto-${i}`, `Auto ${i}`, new Date(2026, 2, i, 12, 0).toISOString(), false)
      );
    }

    expect(snapshots).toHaveLength(45);

    const pruned = pruneSnapshots(snapshots, MAX_SNAPSHOTS_LIMIT);

    // Wynik musi mieć dokładnie limit 30
    expect(pruned).toHaveLength(MAX_SNAPSHOTS_LIMIT);
    expect(pruned).toHaveLength(30);

    // Wszystkie 10 ręcznych musi zostać zachowane
    const retainedManuals = pruned.filter(s => s.isManual === true);
    expect(retainedManuals).toHaveLength(10);
    for (let i = 1; i <= 10; i++) {
      expect(retainedManuals.some(s => s.id === `manual-${i}`)).toBe(true);
    }

    // Z automatycznych powinno zostać 20 najnowszych (czyli auto-16 do auto-35)
    const retainedAutos = pruned.filter(s => s.isManual === false);
    expect(retainedAutos).toHaveLength(20);

    // Najstarsze automatyczne (auto-1 do auto-15) zostały usunięte
    for (let i = 1; i <= 15; i++) {
      expect(retainedAutos.some(s => s.id === `auto-${i}`)).toBe(false);
    }
    // Najnowsze automatyczne (auto-16 do auto-35) są obecne
    for (let i = 16; i <= 35; i++) {
      expect(retainedAutos.some(s => s.id === `auto-${i}`)).toBe(true);
    }
  });

  it('gdy liczba ręcznych przekracza 30 (np. 35 ręcznych i 10 automatycznych), chroni wszystkie 35 ręcznych i usuwa automatyczne', () => {
    const snapshots: SnapshotEntry[] = [];

    // 35 ręcznych
    for (let i = 1; i <= 35; i++) {
      snapshots.push(
        createSnapshot(`manual-${i}`, `Ręczna ${i}`, new Date(2026, 1, i, 12, 0).toISOString(), true)
      );
    }

    // 10 automatycznych
    for (let i = 1; i <= 10; i++) {
      snapshots.push(
        createSnapshot(`auto-${i}`, `Auto ${i}`, new Date(2026, 2, i, 12, 0).toISOString(), false)
      );
    }

    const pruned = pruneSnapshots(snapshots, MAX_SNAPSHOTS_LIMIT);

    // Ręczne są bezwzględnie chronione – wynik to 35 migawek ręcznych
    expect(pruned).toHaveLength(35);
    expect(pruned.every(s => s.isManual === true)).toBe(true);
  });

  it('calculateSnapshotsSize zwraca szacunkowy rozmiar w bajtach', () => {
    const emptySize = calculateSnapshotsSize([]);
    expect(emptySize).toBe(0);

    const testSnaps = [
      createSnapshot('snap-1', 'Punkt 1', new Date().toISOString(), true),
      createSnapshot('snap-2', 'Punkt 2', new Date().toISOString(), false),
    ];
    const size = calculateSnapshotsSize(testSnaps);
    expect(size).toBeGreaterThan(50);
  });
});
