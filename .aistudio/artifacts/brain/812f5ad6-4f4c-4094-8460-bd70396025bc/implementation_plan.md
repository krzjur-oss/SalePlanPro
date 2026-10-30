# Plan Realizacji: Kompleksowy System Pensum, Pensum Łączonego, Nadgodzin i Dyżurów w Szkole Podstawowej

System zostanie zaktualizowany zgodnie z przepisami **Karty Nauczyciela (art. 42)**, przepisami samorządowymi oraz precyzyjnymi odpowiedziami użytkownika dotyczącymi algorytmów przeliczania.

---

## 1. Tabela Stanowisk i Wymiarów Pensum w Szkole Podstawowej

| Stanowisko / Rodzaj zajęć | Pensum bazowe ($P_i$) | Jednostka czasu | Podstawa prawna / Uwagi |
|---|---|---|---|
| **Nauczyciel przedmiotowy** (np. j. polski, matematyka, informatyka) | **18 godz.** | **45 min** (lekcyjna) | KN art. 42 ust. 3 |
| **Nauczyciel współorganizujący** (pedagog specjalny / wspierający) | **20 godz.** | **45 min** (lekcyjna) | KN art. 42 ust. 3 |
| **Wychowawca świetlicy szkolnej** | **26 godz.** | **60 min** (zegarowa) | KN art. 42 ust. 3 |
| **Nauczyciel bibliotekarz** | **30 godz.** | **60 min** (zegarowa) | KN art. 42 ust. 3 |
| **Specjaliści** (pedagog, psycholog, logopeda, terapeuta pedagogiczny) | **maks. 22 godz.** (domyślnie 22) | **60 min** (zegarowa) | Uchwała organu prowadzącego (KN art. 42 ust. 7 pkt 3) |
| **Doradca zawodowy** | **maks. 22 godz.** (domyślnie 22) | **45 / 60 min** | Uchwała organu prowadzącego (nie więcej niż 22) |
| **Pracownik niepedagogiczny** (administracja, obsługa) | **40 godz.** | **60 min** (zegarowa) | Kodeks pracy / Ustawa o pracownikach samorządowych |

---

## 2. Kluczowe Algorytmy i Wzory Matematyczne

### A. Wzór na Pensum Łączone (zgodnie z decyzją użytkownika)
Gdy nauczyciel łączy stanowiska o różnym pensum (np. $h_1$ godzin przedmiotowych o pensum $P_1 = 18$ i $h_2$ godzin świetlicy o pensum $P_2 = 26$):
1. **Suma ułamków etatu ($E$)**:
   $$E = \sum_{i} \frac{h_i}{P_i}$$
2. **Łączna liczba przydzielonych godzin ($H$)**:
   $$H = \sum_{i} h_i$$
3. **Uśredniony wymiar pensum ($P_{\text{uśrednione}}$)**:
   $$P_{\text{uśrednione}} = \frac{H}{E} = \frac{\sum h_i}{\sum \frac{h_i}{P_i}}$$
4. Zaokrąglenie do 2 miejsc po przecinku (z opcją podglądu zaokrąglenia w dół/górę zgodnie z regulaminem organu prowadzącego).

### B. Przeliczanie Godzin Ponadwymiarowych (Nadgodzin)
- **Nauczyciel pełnoetatowy ($E \ge 1.0$)**:
  $$\text{Nadgodziny} = \max\left(0, H - P_{\text{uśrednione}}\right)$$
- **Nauczyciel niepełnoetatowy ($E < 1.0$)**:
  Wszelkie godziny ponad ustaloną w umowie normę (lub podział na godziny doraźne / stałe ponadwymiarowe).

### C. Podział Jednostek Czasu: 45 min vs 60 min
- **Godziny 45-minutowe** ($h_{45}$): zajęcia dydaktyczne przy tablicy i zajęcia współorganizujące.
- **Godziny 60-minutowe** ($h_{60}$): świetlica, biblioteka, gabinety specjalistyczne, doradztwo.
- Prezentacja w raportach i statystykach:
  - Osobna kolumna: *Godziny lekcyjne (45 min)*
  - Osobna kolumna: *Godziny zegarowe (60 min)*
  - Kolumna syntetyczna: *Suma godzin przeliczeniowych i etat łączny*.

### D. Limit i Sugerowany Przydział Dyżurów na Przerwach
Zgodnie z decyzją użytkownika, limit dyżurów wyliczany jest **proporcjonalnie do wymiaru etatu i godzin bezpośrednio przy tablicy ($h_{\text{tablica}}$)**:
$$\text{Sugerowany limit dyżurów} = \text{round}\left( L_{\text{baza}} \times \frac{h_{\text{tablica}}}{18} \times \min(1.0, E) \right)$$
- Nauczyciele wyłącznie świetlicy lub biblioteki nie są nadmiernie obciążani dyżurami na korytarzach w trakcie trwania ich godzin zegarowych opieki.
- Możliwość ręcznego nadpisania indywidualnego limitu dyżurów w profilu nauczyciela.

### E. Monitor 40-Godzinnego Tygodnia Pracy (KN art. 42 ust. 1)
Wykres i wskaźnik pokazujący szacowany całkowity czas pracy:
- Realizacja pensum ($h_{45} \times 45\text{ min} + h_{60} \times 60\text{ min}$)
- Dyżury międzylekcyjne ($\text{liczba dyżurów} \times \text{średni czas przerwy, np. 15 min}$)
- Pula na zadania statutowe, przygotowanie lekcji, sprawdzanie sprawdzianów i konsultacje (uzupełnienie do 40h).

---

## 3. Zakres Zmian w Kodzie Systemu

### Krok 1: Model Danych (`src/types.ts`)
- Nowy typ `TeacherRolePosition`:
  - `roleId`: `'przedmiotowy' | 'wspomagajacy' | 'swietlica' | 'biblioteka' | 'specjalista' | 'doradca' | 'inny'`
  - `name`: nazwa stanowiska
  - `hours`: liczba godzin tygodniowo
  - `basePensum`: pensum bazowe (18, 20, 26, 30, 22, 22)
  - `unitMinutes`: 45 lub 60
- Rozszerzenie interfejsu `Teacher`:
  - `workloadPositions?: TeacherWorkloadPosition[]`
  - `customPensum?: number` (nadpisanie ręczne pensum)
  - `maxDutyCount?: number` (indywidualny limit dyżurów)
  - `dutyExempt?: boolean` (zwolnienie z dyżurów)
- Struktura wyniku kalkulacji: `TeacherWorkloadAnalysis` (zawiera sumy 45 min, 60 min, łączny etat, pensum uśrednione, nadgodziny, limit dyżurów, rozkład 40h).
- Pełna kompatybilność wsteczna z dotychczasowymi polami (`maxHours`, `nonTeachingHours`, `overtimeHours`).

### Krok 2: Silnik Matematyczny (`src/utils/workloadUtils.ts` + Testy)
- Funkcja `calculateTeacherWorkload(teacher: Teacher, assignments: Assignment[], specialAssignments?: SpecialAssignment[]): TeacherWorkloadAnalysis`
- Funkcja `calculateCombinedPensum(positions: { hours: number; basePensum: number }[]): { totalHours: number; totalFte: number; averagedPensum: number; overtimeHours: number }`
- Funkcja `calculateSuggestedDutyLimit(workload: TeacherWorkloadAnalysis, baseDutyPerFullTime?: number): number`
- Utworzenie testów jednostkowych w `src/utils/workloadUtils.test.ts` weryfikujących wszystkie scenariusze (18h, 20h, 26h, 30h, 22h, łączenie 10h+10h, niepełne etaty, nadgodziny).

### Krok 3: Edytor Nauczyciela (`src/components/KreatorSzkoly.tsx`)
- Nowa sekcja w modalu edycji nauczyciela: **"Rozliczenie Pensum i Stanowisk (Karta Nauczyciela)"**:
  - Tabela przypisanych ról ze wskaźnikami pensum (18h, 20h, 26h, 30h, 22h).
  - Przycisk "Dodaj stanowisko / przydział godzin".
  - Kalkulator na żywo w czasie rzeczywistym:
    - Podsumowanie: Godziny 45 min | Godziny 60 min | Suma godzin | Wymiar etatu ($E$) | Uśrednione pensum ($P$) | Nadgodziny | Sugerowane dyżury.
  - Szybkie szablony (np. "Pełny etat przedmiotowy 18h", "Wspomagający 20h", "Świetlica 26h", "Bibliotekarz 30h", "Łączony przedmiot + świetlica").

### Krok 4: Tabela Obciążenia i Statystyk (`src/components/Statystyki.tsx`)
- Rozbudowa zakładki **Obciążenie nauczycieli**:
  - Kolumny:
    1. *Nauczyciel*
    2. *Stanowiska / Funkcje*
    3. *Godz. 45 min (lekcyjne)*
    4. *Godz. 60 min (świetlica/gabinet)*
    5. *Wymiar etatu (FTE)*
    6. *Pensum (bazowe / łączone)*
    7. *Nadgodziny*
    8. *Dyżury (przypisane / limit wyliczony)*
    9. *Budżet 40h (pasek obciążenia)*
  - Karty analityczne KPI: Łączna liczba nadgodzin w szkole, suma etatów przedmiotowych vs świetlicowych/specjalistycznych, wskaźnik bezpieczeństwa przerw.

### Krok 5: Generator i Równoważenie Dyżurów (`src/components/Dyzury.tsx`)
- Aktualizacja algorytmu przydziału dyżurów:
  - Automatyczne pobieranie wyliczonego limitu dyżurów dla każdego nauczyciela proporcjonalnie do $h_{\text{tablica}}$ i etatu.
  - Ostrzeżenie wizualne (czerwony/żółty badge) przy przekroczeniu wyliczonego limitu.
  - Ochrona nauczycieli realizujących wyłącznie godziny 60-minutowe (np. biblioteka, świetlica w tych samych godzinach).

### Krok 6: Wydruki i Raporty Excel (`src/components/Wydruki.tsx` i `src/services/excelExportService.ts`)
- Aktualizacja generowania arkuszy Excel i widoków do druku A4:
  - Zestawienie pensum i czasu pracy z podziałem na godziny 45 min i 60 min.
  - Prezentacja pensum łączonego i godzin ponadwymiarowych do zatwierdzenia przez dyrekcję i księgowość oświatową.

---

## 4. Weryfikacja i Testy (ZAKOŃCZONE POMYŚLNIE ✅)
- Testy jednostkowe silnika pensum i eksportu: `src/utils/workloadUtils.test.ts` oraz `src/services/excelExportService.test.ts` – 17 testów zaliczonych (100% sukces).
- Cała bateria testów aplikacji (19 plików testowych, 129 testów) – zaliczona.
- Weryfikacja statyczna `tsc --noEmit && eslint src`: 0 błędów.
- Kompilacja produkcyjna `compile_applet`: Build succeeded.

---

## 5. Podsumowanie Wdrożonych Zmian

1. **Wymiary pensum w SP**:
   - Nauczyciel przedmiotowy: 18h (45 min)
   - Nauczyciel współorganizujący (wspierający/SPE): 20h (45 min)
   - Wychowawca świetlicy: 26h (60 min)
   - Nauczyciel bibliotekarz: 30h (60 min)
   - Specjaliści (pedagog, psycholog, logopeda, terapeuta): 22h (60 min)
   - Doradca zawodowy: 22h (45 min)
   - Pracownicy niepedagogiczni: 40h zegarowych tygodniowo (Kodeks Pracy)

2. **Wzór na pensum łączone**:
   - $E = \sum \frac{h_i}{P_i}$ (suma ułamków etatu)
   - $P = \frac{\sum h_i}{\sum (h_i / P_i)}$ (uśrednione pensum)
   - Nadgodziny: $\max(0, H - P)$ dla $E \ge 1.0$

3. **Limit dyżurów**:
   - Proporcjonalny do wymiaru etatu i godzin bezpośrednio przy tablicy ($h_{\text{tablica}} / 18$)
   - Ochrona nauczycieli realizujących wyłącznie godziny zegarowe lub zwolnionych z dyżurów

4. **Widoki i Raporty**:
   - Edytor `TeacherWorkloadEditor` w Kreatorze Szkoły z szablonami 1-klikowymi i podglądem na żywo.
   - Nowa tabela w Statystykach Kadry z osobnymi kolumnami dla godzin 45m i 60m, pensum łączonego, nadgodzin i paska 40h.
   - Zaktualizowany arkusz Excel `Bilans_Pensum` z pełnym rozbiciem na 45m / 60m i pensum łączone.

