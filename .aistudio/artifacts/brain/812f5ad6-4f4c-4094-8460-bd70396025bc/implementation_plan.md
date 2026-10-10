# Obsługa Zadań Poza Tablicą i Personelu Niepedagogicznego w Puli Dyżurów

Kompleksowa rozbudowa systemu SalePlan Pro o ewidencję czynności poza tablicą (świetlica, biblioteka, pedagog, psycholog, logopeda, nauczyciel wspomagający) bezpośrednio w profilu nauczyciela, utworzenie dedykowanego modułu dla personelu nieuczącego (pracownicy obsługi i wsparcia) oraz ich pełną integrację z silnikiem bilansowania dyżurów korytarzowych.

## User Review & Critical Decisions

> [!IMPORTANT]
> Zgodnie z ustaleniami:
> 1. **Nauczyciele z zadaniami poza tablicą**: Definiowani i zarządzani w module **Nauczyciele** (Kreator Szkoły – Krok 3). Dodane zostają dedykowane pola ról specjalistycznych (świetlica, biblioteka, pedagog, psycholog, logopeda, wspomagający) oraz pule godzin poza tablicą, które wliczają się do ich pensum i dostępności.
> 2. **Pracownicy nieuczący (personel niepedagogiczny)**: Zorganizowani w **osobnym, dedykowanym module** w Kreatorze Szkoły i panelu szkoły (pracownicy wsparcia, asystenci, woźni, obsługa), którzy posiadają własny grafik dyspozycyjności i mogą być włączani do dyżurów na korytarzach, szatniach i stołówkach.
> 3. **Obecność i dyżury**: Dla osób bez lekcji tablicowych ich obecność w szkole podczas przerw weryfikowana jest na podstawie indywidualnej siatki dostępności (dni i godziny dyżurowania) z zachowaniem pełnej ergonomii pracy.

## 1. Overview & Core Concept

* **Cel modułu**: W szkołach wielu pracowników nie prowadzi tradycyjnych lekcji przedmiotowych przy tablicy, lecz realizuje zadania o kluczowym znaczeniu (świetlica, biblioteka, pomoc psychologiczno-pedagogiczna, wsparcie uczniów ze SPE czy obsługa szkoły). Dotychczasowy algorytm dyżurów bazował wyłącznie na godzinach lekcyjnych w planie zajęć, przez co osoby te miały zerowy wymiar godzin w puli dyżurów.
* **Grupa docelowa**: Dyrektorzy szkół, wicedyrektorzy układający plan lekcji i harmonogram dyżurów oraz koordynatorzy bezpieczeństwa.
* **Kluczowa wartość**: Sprawiedliwe, automatyczne i proporcjonalne włączenie wszystkich pracowników szkoły do dyżurów korytarzowych z uwzględnieniem ich realnego czasu pracy i obecności w placówce.

## 2. User Experience & Visual Design

### Ścieżka Użytkownika (User Flows)
1. **Kreator Szkoły – Krok Nauczyciele (Zadania Poza Tablicą)**:
   * W formularzu dodawania/edycji nauczyciela pojawia się sekcja *Czynności i zadania poza tablicą*.
   * Możliwość zaznaczenia ról: Wychowawca świetlicy, Bibliotekarz, Pedagog szkolny / specjalny, Psycholog, Logopeda, Nauczyciel współorganizujący / wspomagający.
   * Wprowadzenie tygodniowej puli godzin poza tablicą (np. 15h świetlicy, 20h biblioteki).
   * Przełącznik: *Uwzględniaj w puli dyżurów korytarzowych* z automatycznym przeliczeniem ekwiwalentu etatu.
   * Ustalenie godzin dostępności w szkole w tygodniowej siatce dni/godzin.

2. **Dedykowany Moduł Pracowników Niepedagogicznych**:
   * Nowy, przejrzysty widok personelu wsparcia i obsługi w Kreatorze Szkoły oraz panelu szkoły.
   * Karta pracownika: Imię, nazwisko, identyfikator/skrót, stanowisko (np. pomoc nauczyciela, asystent ucznia, woźny/ochrona, szatniarz), tygodniowy wymiar obecności.
   * Siatka dostępności (dni i godziny, w których pracownik pełni dyżury lub przebywa w strefach wspólnych).
   * Uprawnienia do dyżurów: możliwość przypisania do konkretnych stref (korytarz, parter, stołówka, szatnia, plac szkolny).

3. **Moduł Dyżurów (Harmonogram i Bilans)**:
   * Tabela personelu dyżurującego zawiera zakładki/filtry: *Wszyscy*, *Nauczyciele tablicowi*, *Specjaliści i poza tablicą*, *Pracownicy niepedagogiczni*.
   * Wskaźnik obciążenia (minuty dyżurów) uwzględnia godziny poza tablicą i etat personelu.
   * W menu wyboru dyżurnego na danej przerwie widoczni są wszyscy pracownicy dostępni w tym slocie, z czytelnym oznaczeniem ich roli (np. `Jan Kowalski (Świetlica)`, `Anna Nowak (Pedagog)`, `Piotr Wiśniewski (Obsługa)`).
   * Generator automatyczny równomiernie przydziela dyżury wszystkim uprawnionym osobom.

### Visual Identity & Theme
* **Aestetyka**: Spójna z dotychczasowym systemem SalePlan Pro – profesjonalny interfejs szkolny, stonowana paleta neutralna (slate), akcenty indygo/błękitu dla działań kluczowych.
* **Typografia**: Czytelny krój bezszeryfowy, liczby i minuty w układzie monospace (`tabular-nums font-mono`).
* **Karty i tabele**: Pojedyncza głębokość, delikatne obramowania 1px, brak zbędnych badge'ów-pigułek, elegancka typografia i czytelne etykiety tekstowe.

## 3. Key Product Decisions & Trade-Offs

* **Decyzja 1: Rozdzielenie nauczycieli z zadaniami poza tablicą od personelu niepedagogicznego**:
  * *Podejście*: Nauczyciele (nawet pracujący wyłącznie w świetlicy lub poradnictwie) podlegają Karcie Nauczyciela i są zarządzani w module Nauczyciele, z opcją łączenia godzin tablicowych i pozatablicowych. Pracownicy niepedagogiczni (Kodeks Pracy / administracja i obsługa) otrzymują dedykowaną, autonomiczną ewidencję.
  * *Dlaczego*: Zapewnia to logiczny podział prawno-organizacyjny w polskich szkołach oraz maksymalną przejrzystość arkusza organizacyjnego.
  * *Alternatywy*: Wrzucenie wszystkich do jednej listy mieszało typy umów i pensum; rozdzielenie na dwa zupełnie osobne programy uniemożliwiłoby wspólne planowanie dyżurów.

* **Decyzja 2: Algorytm sprawdzania obecności na przerwie**:
  * *Podejście*: Dla nauczycieli tablicowych system sprawdza lekcje przyległe do przerwy. Dla osób z godzinami poza tablicą lub personelu obsługi system bazuje na zdefiniowanej siatce dostępności godzinowej (dostępność w szkole) oraz oznaczeniu obecności w wybranym dniu i godzinie.
  * *Dlaczego*: Pedagog czy bibliotekarz nie mają wpisanych klas i sal w planie lekcji, ale przebywają w szkole w konkretnych przedziałach godzinowych.

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SalePlan Pro Data Model                         │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Teacher (Rozszerzony)            │ SupportStaff (Nowy model)           │
│ - nonTeachingHours?: number      │ - id: string                        │
│ - nonTeachingRoles?: string[]    │ - first: string, last: string       │
│ - nonTeachingDutyEligible: bool  │ - abbr: string, role: string        │
│ - availability: string[]         │ - weeklyHours: number               │
│ - maxHours / pensum              │ - availability: string[]            │
│                                  │ - dutyEligible: boolean             │
└─────────────────┬────────────────┴──────────────────┬──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Moduł Dyżurów (Duty Allocation Engine)                 │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Unified Eligible Personnel Pool (Nauczyciele + Pracownicy Wsparcia) │
│ 2. Obliczanie etatu i wag dyżurów:                                     │
│    totalHours = teachingHours + nonTeachingHours + staffHours          │
│ 3. Weryfikacja obecności w slocie przerwy (lekcje LUB dostępność)      │
│ 4. Generator automatyczny + ręczna edycja harmonogramu dyżurów         │
└────────────────────────────────────────────────────────────────────────┘
```

### Zmiany w Modelu Danych (`types.ts` i walidacja)
1. Rozszerzenie interfejsu `Teacher`:
   * `nonTeachingHours?: number` – tygodniowa liczba godzin poza tablicą.
   * `nonTeachingRoles?: string[]` – role: świetlica, biblioteka, pedagog, psycholog, logopeda, wspomagający.
   * `nonTeachingDutyEligible?: boolean` – włączony do puli dyżurów korytarzowych.
2. Nowy interfejs `SupportStaff`:
   * `id: string`, `first: string`, `last: string`, `abbr: string`, `role: string`, `color?: string`, `weeklyHours?: number`, `availability?: string[]`, `dutyEligible?: boolean`, `notes?: string`.
3. Rozszerzenie `AppState`:
   * `supportStaff?: SupportStaff[]`.
4. Dostosowanie silnika `Dyzury.tsx`:
   * Połączona pula kandydatów do dyżurów.
   * Aktualizacja statystyk etatu, limitu minut oraz algorytmu optymalizatora dyżurów.
   * Obsługa wydruków i eksportu dyżurów z uwzględnieniem nowego personelu.
