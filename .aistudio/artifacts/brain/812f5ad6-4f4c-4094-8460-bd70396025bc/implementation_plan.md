# Plan Rozwoju i Katalog Możliwości Usprawnień: SalePlan Pro

Niniejszy dokument przedstawia pełne zestawienie potencjalnych kierunków rozwoju systemu **SalePlan Pro** opracowane na podstawie szczegółowego audytu architektury, modułów planistycznych i bazy danych, z uwzględnieniem preferencji planisty dotyczących asysty w zamianach oraz optymalizacji dużych siatek.

---

## 1. Dwa Wiodące Priorytety Użytkownika

### Priorytet A: Asystent Sugerowania Optymalnych Zamian i Wolnych Sal (Smart Swap & Room Engine)
1. **Inteligentny analizator slotu**:
   - Po kliknięciu w dowolną komórkę lekcji lub pusty slot w siatce (w Planie Klas, Sal lub Nauczycieli) aktywuje się panel sugestii.
   - Analiza dostępności sal: wyszukiwanie sal spełniających wymóg pojemności i specyfiki (np. pracownia chemiczna, sala gimnastyczna, pracownia informatyczna), które w danym slocie są w 100% wolne.
   - Sugestie zamiany lekcji (Swap Suggestions): algorytm skanuje plan danej klasy lub nauczyciela i wskazuje bezkolizyjne sloty, w które można przenieść daną lekcję (np. *„Możesz przenieść Historię na wtorek g. 11:30 – sala 204 i nauczyciel są wtedy wolni”*).
2. **Kalkulator wpływu i podgląd przed zatwierdzeniem**:
   - Wizualizacja skutków zamiany (brak nowych okienek, brak kolizji dyżurów korytarzowych) z opcją zatwierdzenia jednym kliknięciem (*„Zastosuj zamianę”* z możliwością natychmiastowego cofnięcia `Ctrl+Z`).

### Priorytet B: Optymalizacja Wydajności Renderowania Dużych Siatek Lekcji
1. **Dekompozycja i memoizacja komórek siatki (`React.memo`)**:
   - Siatki w `PlanKlas.tsx` i `PlanSal.tsx` generują setki komórek DOM jednocześnie. Przesunięcie kursora z wybranym pędzlem lub zaznaczenie pojedynczej lekcji powoduje re-render całej matrycy.
   - Wdrożenie zoptymalizowanych komponentów komórek (`LessonCellMemo`, `SlotDroppableMemo`) z selektywnym porównywaniem propsów (`arePropsEqual`).
2. **Zaawansowana wirtualizacja i `content-visibility: auto`**:
   - Zastosowanie natywnej właściwości CSS `content-visibility: auto` oraz `contain-intrinsic-size` dla dni i oddziałów poza widocznym obszarem przewijania ekranu.
   - Wirtualizacja wierszy/kolumn przy wyświetlaniu 20–40 oddziałów jednocześnie w widoku horyzontalnym.
3. **Optymalizacja bufora transakcyjnego IndexedDB**:
   - Zwiększenie responsywności UI podczas seryjnego wstawiania lekcji poprzez odroczenie zapisu na dysku (`debounce` 600 ms z natychmiastowym optymistycznym stanem w pamięci RAM).

---

## 2. Katalog Pozostałych Możliwości Usprawnień Aplikacji

### Kategoria 1: Automatyzacja i Generator Planu
- **Półautomatyczny asystent wypełniania okienek**: narzędzie wykrywające pojedyncze luki w planie nauczycieli i proponujące przesunięcia lekcji skracające dzień pracy.
- **Audytor higieny planu ucznia (zgodność z wytycznymi MEN)**:
  - Automatyczna weryfikacja równomiernego rozłożenia przedmiotów ścisłych i trudnych w tygodniu (unikanie kumulacji w piątki po południu).
  - Ostrzeżenia o zbyt dużej liczbie lekcji w jednym ciągu bez przerwy obiadowej.

### Kategoria 2: Zastępstwa i Organizacja Dnia
- **Dedykowany Moduł Szybkich Zastępstw Dziennych**:
  - Rejestracja nagłej nieobecności nauczyciela na dany dzień.
  - Podpowiedź wolnych nauczycieli z uprawnieniami do danego przedmiotu lub z okienkiem w tym samym czasie.
  - Generowanie estetycznego zestawienia zastępstw na tablicę ogłoszeń lub do e-dziennika (PDF/wydruk).

### Kategoria 3: Wydruki, Raporty i Wymiana Danych
- **Eksport do formatu Excel (.xlsx) i CSV**:
  - Eksport planów zbiorczych i indywidualnych do gotowych arkuszy kalkulacyjnych z zachowaniem formatowania i kolorów.
- **Generowanie wektorowych planów PDF (A4 / A3)**:
  - Dedykowane szablony do gabloty szkolnej z nagłówkiem szkoły, logo i legendą sal.
- **Kody QR dla uczniów i nauczycieli**:
  - Generowanie unikalnego kodu QR na wydruku, którego zeskanowanie smartfonem otwiera interaktywny plan danej klasy w trybie offline PWA.

### Kategoria 4: Ergonomia i Doświadczenie Użytkownika (UX)
- **Kompletna obsługa skrótów klawiszowych**:
  - Nawigacja strzałkami po siatce, szybkie usuwanie (`Delete`/`Backspace`), szybki pędzel (`1-9` dla ulubionych przedmiotów), `Ctrl+Z` / `Ctrl+Y`.
- **Wielokrotne cofanie/ponawianie (Historia Akcji z osią czasu)**:
  - Panel historii umożliwiający cofnięcie się do dowolnego momentu sesji planowania.
- **Tryb porównywania wariantów (Split-Screen Diff)**:
  - Możliwość otwarcia wersji A i wersji B planu obok siebie z podświetleniem różnic w salach i godzinach.

---

## 3. Plan Wdrożenia (Krok po Kroku)

Gdy zdecydujesz o rozpoczęciu prac, rekomendowane wdrożenie przebiegnie w następujących fazach:

- **Krok 1 (Wydajność)**: Profilowanie `PlanKlas.tsx` i `PlanSal.tsx`, memoizacja komponentów komórek, dodanie `content-visibility: auto` oraz zoptymalizowanie stanu hover/drag.
- **Krok 2 (Silnik Asystenta)**: Utworzenie modułu `src/services/swapAdvisorService.ts` obliczającego bezkolizyjne sloty, wolne sale i alternatywne godziny dla wskazanego przedmiotu.
- **Krok 3 (Interfejs Asystenta)**: Dodanie bocznego paska / wyskakującego okna sugestii zamiany z podglądem na żywo i przyciskiem aplikowania zamiany jednym kliknięciem.
- **Krok 4 (Weryfikacja)**: Uruchomienie pełnego zestawu testów jednostkowych, testów e2e i testów wydajnościowych renderowania siatki.
