import { describe, it, expect } from 'vitest';
import {
  formatAvailabilityKey,
  isTeacherAvailableAt,
  isTeacherAvailableAtNum,
  hasExplicitAvailabilityAtNum
} from './availability';
import { Hour } from '../types';

describe('availability utils', () => {
  const standardHours: Hour[] = [
    { num: 1, start: '08:00', end: '08:45' },
    { num: 2, start: '08:55', end: '09:40' },
    { num: 3, start: '09:50', end: '10:35' },
    { num: 4, start: '10:50', end: '11:35' },
    { num: 5, start: '11:45', end: '12:30' },
    { num: 6, start: '12:40', end: '13:25' },
    { num: 7, start: '13:35', end: '14:20' },
    { num: 8, start: '14:25', end: '15:10' }
  ];

  it('formatuje klucz dostępności jako day-hourNum', () => {
    expect(formatAvailabilityKey(0, 1)).toBe('0-1');
    expect(formatAvailabilityKey(2, 8)).toBe('2-8');
  });

  it('pusta lub niezdefiniowana dostępność oznacza brak ograniczeń (zwraca true)', () => {
    expect(isTeacherAvailableAt(null, 0, 0, standardHours)).toBe(true);
    expect(isTeacherAvailableAt(undefined, 0, 0, standardHours)).toBe(true);
    expect(isTeacherAvailableAt({}, 0, 0, standardHours)).toBe(true);
    expect(isTeacherAvailableAt({ availability: [] }, 0, 0, standardHours)).toBe(true);
    expect(isTeacherAvailableAtNum({ availability: [] }, 0, 1)).toBe(true);
  });

  it('hasExplicitAvailabilityAtNum zwraca false przy pustej liście i true tylko dla jawnie zaznaczonych slotów', () => {
    expect(hasExplicitAvailabilityAtNum({ availability: [] }, 0, 1)).toBe(false);
    expect(hasExplicitAvailabilityAtNum({ availability: ['0-1'] }, 0, 1)).toBe(true);
    expect(hasExplicitAvailabilityAtNum({ availability: ['0-1'] }, 0, 2)).toBe(false);
  });

  it('mapuje 0-based indeks godziny na hours[hourIndex].num', () => {
    const teacher = { availability: ['0-1', '0-8'] };
    // Indeks 0 -> lekcja nr 1 -> dostępny
    expect(isTeacherAvailableAt(teacher, 0, 0, standardHours)).toBe(true);
    // Indeks 1 -> lekcja nr 2 -> niedostępny
    expect(isTeacherAvailableAt(teacher, 0, 1, standardHours)).toBe(false);
    // Indeks 7 -> lekcja nr 8 -> dostępny
    expect(isTeacherAvailableAt(teacher, 0, 7, standardHours)).toBe(true);
  });

  it('obsługuje niestandardową numerację godzin (np. lekcja zerowa num: 0)', () => {
    const hoursWithZero: Hour[] = [
      { num: 0, start: '07:10', end: '07:55' },
      { num: 1, start: '08:00', end: '08:45' }
    ];
    const teacher = { availability: ['0-0'] };
    expect(isTeacherAvailableAt(teacher, 0, 0, hoursWithZero)).toBe(true);
    expect(isTeacherAvailableAt(teacher, 0, 1, hoursWithZero)).toBe(false);
  });

  it('stosuje bezpieczny fallback hourIndex + 1 gdy brak hours', () => {
    const teacher = { availability: ['0-1', '0-8'] };
    expect(isTeacherAvailableAt(teacher, 0, 0, undefined)).toBe(true);
    expect(isTeacherAvailableAt(teacher, 0, 7, [])).toBe(true);
    expect(isTeacherAvailableAt(teacher, 0, 1, [])).toBe(false);
  });
});
