import { describe, it, expect } from 'vitest';
import { MiejsceDyzuru } from '../types';

describe('Dyzury Places Ordering Logic', () => {
  const initialPlaces: MiejsceDyzuru[] = [
    { id: 'p1', name: 'Korytarz Parter', floor: 'Parter' },
    { id: 'p2', name: 'I Piętro Zachód', floor: 'I Piętro' },
    { id: 'p3', name: 'Szatnia WF', floor: 'Piwnica' },
    { id: 'p4', name: 'II Piętro Wschód', floor: 'II Piętro' },
  ];

  it('moves place up correctly', () => {
    const list = [...initialPlaces];
    const fromIdx = 2; // Szatnia WF
    const toIdx = 1;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    expect(list.map(p => p.id)).toEqual(['p1', 'p3', 'p2', 'p4']);
  });

  it('moves place down correctly', () => {
    const list = [...initialPlaces];
    const fromIdx = 0; // Korytarz Parter
    const toIdx = 1;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    expect(list.map(p => p.id)).toEqual(['p2', 'p1', 'p3', 'p4']);
  });

  it('moves place to top and bottom edge', () => {
    const listTop = [...initialPlaces];
    const [movedTop] = listTop.splice(3, 1); // II Piętro Wschód
    listTop.unshift(movedTop);
    expect(listTop[0].id).toBe('p4');

    const listBottom = [...initialPlaces];
    const [movedBottom] = listBottom.splice(0, 1); // Korytarz Parter
    listBottom.push(movedBottom);
    expect(listBottom[listBottom.length - 1].id).toBe('p1');
  });

  it('sorts places alphabetically A-Z', () => {
    const sorted = [...initialPlaces].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    expect(sorted.map(p => p.name)).toEqual([
      'I Piętro Zachód',
      'II Piętro Wschód',
      'Korytarz Parter',
      'Szatnia WF',
    ]);
  });

  it('sorts places by floor hierarchy (Piwnica -> Parter -> I Piętro -> II Piętro)', () => {
    const floorRank = (fl?: string) => {
      if (!fl) return 99;
      const low = fl.toLowerCase().trim();
      if (low.includes('piwnic') || low.includes('-1')) return 1;
      if (low.includes('parter') || low.includes('0')) return 2;
      if (low.includes('i piętro') || low.includes('1 piętro')) return 3;
      if (low.includes('ii piętro') || low.includes('2 piętro')) return 4;
      return 50;
    };

    const sorted = [...initialPlaces].sort((a, b) => {
      const rA = floorRank(a.floor);
      const rB = floorRank(b.floor);
      if (rA !== rB) return rA - rB;
      return a.name.localeCompare(b.name, 'pl');
    });

    expect(sorted.map(p => p.id)).toEqual(['p3', 'p1', 'p2', 'p4']);
  });

  it('reverses order accurately', () => {
    const rev = [...initialPlaces].reverse();
    expect(rev.map(p => p.id)).toEqual(['p4', 'p3', 'p2', 'p1']);
  });
});
