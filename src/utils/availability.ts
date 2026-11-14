/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Narzędzia Dostępności Nauczycieli i Pracowników (Availability)
 * Opis: Kanoniczne mapowanie indeksów godzin siatki na numery lekcji/przerw ("dayIndex-hourNum").
 */

import { Hour } from '../types';

export interface WithAvailability {
  availability?: string[];
}

/**
 * Buduje kanoniczny klucz dostępności w formacie "indeksDnia-numerLekcji" (np. "0-1").
 */
export const formatAvailabilityKey = (day: number, hourNum: number): string => `${day}-${hourNum}`;

/**
 * Sprawdza dostępność nauczyciela/pracownika dla jawnego numeru lekcji lub przerwy (1-based num, jak w KreatorSzkoly/Dyzury).
 * Pusta tablica lub brak pola availability oznacza brak ograniczeń (zwraca true).
 */
export function isTeacherAvailableAtNum(
  teacher: WithAvailability | null | undefined,
  day: number,
  hourNum: number
): boolean {
  if (!teacher || !teacher.availability || teacher.availability.length === 0) {
    return true;
  }
  return teacher.availability.includes(formatAvailabilityKey(day, hourNum));
}

/**
 * Sprawdza czy nauczyciel/pracownik ma JAWNIE zaznaczony dany slot (gdy lista availability jest zdefiniowana i niepusta).
 * W przeciwieństwie do isTeacherAvailableAtNum zwraca false przy pustej tablicy availability
 * (przydatne np. przy wyjątkach dla godzin poza tablicą po ostatniej lekcji w module Dyżury).
 */
export function hasExplicitAvailabilityAtNum(
  teacher: WithAvailability | null | undefined,
  day: number,
  hourNum: number
): boolean {
  if (!teacher || !teacher.availability || teacher.availability.length === 0) {
    return false;
  }
  return teacher.availability.includes(formatAvailabilityKey(day, hourNum));
}

/**
 * Sprawdza dostępność nauczyciela dla danego dnia (0..4) i 0-based indeksu godziny w siatce (hourIndex).
 * Mapuje hourIndex na numer lekcji z tablicy hours (hours[hourIndex].num; fallback: hourIndex + 1)
 * i weryfikuje klucz `${day}-${num}` w teacher.availability.
 * Pusta tablica lub brak pola availability oznacza brak ograniczeń (zwraca true).
 */
export function isTeacherAvailableAt(
  teacher: WithAvailability | null | undefined,
  day: number,
  hourIndex: number,
  hours?: Hour[]
): boolean {
  if (!teacher || !teacher.availability || teacher.availability.length === 0) {
    return true;
  }
  const resolvedNum =
    hours && hourIndex >= 0 && hourIndex < hours.length && hours[hourIndex] !== undefined
      ? hours[hourIndex].num
      : hourIndex + 1;
  return isTeacherAvailableAtNum(teacher, day, resolvedNum);
}
