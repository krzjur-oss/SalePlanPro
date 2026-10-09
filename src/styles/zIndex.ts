/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Globalna skala indeksów warstw (Z-Index)
 * 
 * Zapewnia spójną hierarchię nakładania warstw interfejsu w całej aplikacji:
 * - Zawartość bazowa: 0
 * - Przyklejone nagłówki (Sticky headers): 20
 * - Pływające powiadomienia (Toasts / notyfikacje): 60
 * - Listy rozwijane / menu / popovery: 70
 * - Standardowe okna modalne / dialogi: 100
 * - TermsModal / bramka akceptacji regulaminu: 110 (powyżej toastów i standardowych modali)
 * - Blokada przetwarzania w tle: 200
 * - Krytyczna nakładka przywracania awaryjnego (isRestoring): 9999 (dozwolony wyjątek)
 */

export const Z_INDEX = {
  STICKY: 20,
  TOAST: 60,
  DROPDOWN: 70,
  MODAL: 100,
  TERMS_MODAL: 110,
  PROCESSING: 200,
  RESTORING_OVERLAY: 9999,
} as const;

export const Z_INDEX_CLASSES = {
  STICKY: 'z-[20]',
  TOAST: 'z-[60]',
  DROPDOWN: 'z-[70]',
  MODAL: 'z-[100]',
  TERMS_MODAL: 'z-[110]',
  PROCESSING: 'z-[200]',
  RESTORING_OVERLAY: 'z-[9999]',
} as const;
