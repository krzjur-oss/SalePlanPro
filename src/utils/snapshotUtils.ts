/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Narzędzia zarządzania migawkami (Snapshot Utilities)
 * 
 * Odpowiada za:
 * - Ograniczenie liczby migawek (domyślnie do 30)
 * - Bezwzględną ochronę migawek ręcznych przed automatycznym usunięciem
 * - Usuwanie najstarszych migawek automatycznych w pierwszej kolejności
 * - Obliczanie rozmiaru pamięci zajmowanego przez punkty przywracania
 */

import { SnapshotEntry } from '../types';

export const MAX_SNAPSHOTS_LIMIT = 30;
export const SNAPSHOTS_SIZE_WARNING_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Sprawdza czy dany punkt przywracania jest migawką ręczną (utworzoną celowo przez użytkownika).
 * Obsługuje wsteczną kompatybilność ze starszymi migawkami bez jawnej flagi isManual.
 */
export function isSnapshotManual(snap: SnapshotEntry): boolean {
  if (!snap) return false;
  if (typeof snap.isManual === 'boolean') {
    return snap.isManual;
  }
  
  // Heurystyka wsteczna dla punktów wygenerowanych automatycznie przed wprowadzeniem flagi
  const id = snap.id || '';
  const name = (snap.name || '').toLowerCase();
  
  if (
    id.startsWith('conflict_') ||
    id.startsWith('auto_') ||
    name.includes('inna karta') ||
    name.includes('przed nadpisaniem') ||
    name.includes('automatyczn')
  ) {
    return false;
  }
  
  return true;
}

/**
 * Przycina listę migawek do zadanego limitu (domyślnie 30).
 * Zasady:
 * 1. Migawki ręczne (isManual = true) są bezwzględnie chronione.
 * 2. W pierwszej kolejności usuwane są najstarsze migawki automatyczne (isManual = false).
 * 3. Jeśli łączna liczba migawek ręcznych przekracza limit, żadna ręczna nie jest usuwana.
 */
export function pruneSnapshots(
  snapshots: SnapshotEntry[],
  limit = MAX_SNAPSHOTS_LIMIT
): SnapshotEntry[] {
  if (!Array.isArray(snapshots)) return [];
  if (snapshots.length <= limit) return snapshots;

  const manualSnaps: SnapshotEntry[] = [];
  const autoSnaps: SnapshotEntry[] = [];

  for (const s of snapshots) {
    if (!s) continue;
    if (isSnapshotManual(s)) {
      manualSnaps.push(s);
    } else {
      autoSnaps.push(s);
    }
  }

  // Jeśli nawet same migawki ręczne wyczerpują limit, usuwamy wszystkie automatyczne i chronimy wszystkie ręczne
  if (manualSnaps.length >= limit) {
    return manualSnaps.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  // Sortujemy automatyczne od najnowszych do najstarszych
  autoSnaps.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // Liczba automatycznych kopii, które możemy zachować
  const allowedAutoCount = Math.max(0, limit - manualSnaps.length);
  const keptAutoSnaps = autoSnaps.slice(0, allowedAutoCount);

  // Zwracamy połączone punkty posortowane malejąco wg daty utworzenia
  const combined = [...manualSnaps, ...keptAutoSnaps].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return combined;
}

/**
 * Szacuje całkowity rozmiar zserializowanych punktów przywracania w bajtach.
 */
export function calculateSnapshotsSize(snapshots: SnapshotEntry[]): number {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return 0;
  try {
    if (typeof Blob !== 'undefined') {
      return new Blob([JSON.stringify(snapshots)]).size;
    }
    return JSON.stringify(snapshots).length;
  } catch {
    let total = 0;
    for (const s of snapshots) {
      try {
        total += JSON.stringify(s).length;
      } catch {}
    }
    return total;
  }
}
