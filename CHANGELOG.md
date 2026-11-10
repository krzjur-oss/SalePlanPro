# Historia Zmian — SalePlan Pro (CHANGELOG)

Wszystkie istotne zmiany i wydania w projekcie **SalePlan Pro** są dokumentowane w tym pliku.  
Projekt stosuje konwencję wersjonowania semantycznego (SemVer) oraz standardy dokumentacji wydań.

---

## [3.13.0] — 2026-11-09
### 🚀 Niezależny Silnik Detekcji Konfliktów, Partycje Grup i Międzyoddziały, Inteligentny Generator z Dostępnością Sal, Rotacja 30 Migawek i Bezpieczny Dziennik Błędów

#### Nowości i Usprawnienia:
*   **Niezależny silnik detekcji konfliktów (`src/utils/conflictEngine.ts`)**: Czysta, modułowa i w 100% testowalna funkcja `detectConflicts(planLekcji)` zwracająca listę konfliktów (`teacher`, `room`, `class`, `availability`).
    *   Ten sam `assignmentId` stanowi legalną lekcję łączoną (brak fałszywych kolizji).
    *   Lekcja całej klasy koliduje z każdą inną lekcją tej samej klasy w danym slocie (inną całą klasą lub dowolną grupą).
    *   Dwie różne grupy tej samej klasy nie kolidują pod warunkiem różnych nauczycieli i sal.
    *   Uwzględnienie nauczycieli wspomagających (`supportTeacherId`), dostępności kadry oraz limitów sal sportowych.
    *   Zintegrowany z `PlanKlas`, `swapAdvisorService`, `PlanGenerator` i procedurą scalania.
*   **Model partycji grup (`partitionId`) oraz uczniów (`studentIds`)**:
    *   Grupy o tym samym `partitionId` wzajemnie się wykluczają i mogą odbywać się równolegle w tym samym oddziale (np. gr1 i gr2).
    *   Grupy o różnych identyfikatorach partycji kolidują w przypadku posiadania wspólnych uczniów (`studentIds` lub domyślny podział klasy).
*   **Grupy międzyoddziałowe (`linkedGroupIds`)**:
    *   Pełna obsługa blokowania i synchronizacji zajęć łączonych między oddziałami w `placeAssignmentOnCell`, `PlanSal` i `PlanGenerator`.
*   **Plan Sal bez parsowania tekstu**:
    *   Zastąpienie zawodnego parsowania napisów typu `5A (gr1)` bezpośrednimi metadanymi strukturalnymi `_bridgeMeta.classId` oraz `_bridgeMeta.groupId`.
*   **Bezpieczne wstawianie lekcji z potwierdzeniem**:
    *   Funkcja `placeAssignmentOnCell` wyświetla interaktywne potwierdzenie z listą usuwanych lekcji zamiast cichego kasowania istniejących przydziałów.
*   **Zaawansowany generator planu (`PlanGenerator.tsx`)**:
    *   Zastąpienie uproszczonego `classBusy` wielowymiarowym modelem zajętości z grupami (`klasa|dzień|godzina|groupId`).
    *   Preferowane równoległe układanie jednostek tego samego oddziału o różnych nauczycielach i grupach.
    *   Obsługa klas powiązanych (`linkedClassIds`), nauczycieli wspomagających oraz modelu `roomBusy` z wyjątkami dla sal gimnastycznych.
    *   Końcowa weryfikacja poprawności wygenerowanego planu przez silnik `detectConflicts`.
*   **Rotacja 30 punktów przywracania i ostrzeżenie o rozmiarze (`SnapshotManager` / `snapshotUtils.ts`)**:
    *   Wprowadzenie limitu `MAX_SNAPSHOTS_LIMIT = 30`.
    *   W pierwszej kolejności usuwane są najstarsze migawki automatyczne, natomiast migawki ręczne (`isManual: true`) podlegają **bezwzględnej ochronie**.
    *   Dynamiczne szacowanie rozmiaru pamięci (`calculateSnapshotsSize`) oraz ostrzeżenie bursztynowe przy zajętości > 10 MB lub zbliżaniu się do limitu 30 kopii.
    *   Wskaźnik pamięci i odznaki `Ręczny (chroniony)` / `Automatyczny` w interfejsie.
*   **Dziennik błędów w `dbStorage` ze skracaniem stosu do 1 kB**:
    *   Funkcja `logAppError` rejestrująca błędy w IndexedDB i localStorage z limitem 50 wpisów (`MAX_ERROR_LOGS_LIMIT = 50`).
    *   Automatyczne skracanie śladu stosu do 1024 znaków (`MAX_ERROR_STACK_LENGTH = 1024`) z dopiskiem `... [skrócono do 1 kB]`.
*   **Szyfrowanie i deduplikacja kopii ratunkowych**:
    *   `saveRecoveryBackup` zapisuje dane z wykorzystaniem szyfrowania AES-256-GCM przy odblokowanej sesji.
    *   Przed utworzeniem nowej kopii ratunkowej weryfikuje hash zawartości, eliminując powielanie identycznych kopii awaryjnych.
*   **Trwałość transakcji w `persistence.ts`**:
    *   `executeCommit` zwraca obiekt `{ status: 'ok' | 'conflict' | 'error', error? }`.
    *   Błędy braku miejsca (`QuotaExceededError`) są precyzyjnie raportowane jako błąd pamięci.
    *   Awaria połączenia z bazą `getDB()` nie kończy się fałszywym statusem sukcesu.

---

## [3.12.0] — 2026-11-07
### ⚡ Atomowa Architektura Trwałości Danych, Niezawodny Autozapis z Przerzedzaniem (3/h, 1/doba), Wzmocnione PWA i Oficjalny Pipeline GitHub Pages

*   **Atomowa transakcja zapisu stanu (`commitState`)**: Zapis `APP_STATE`, `SCHED_DATA` i `STATE_META` w pojedynczej transakcji IndexedDB z atomowym porównaniem rewizji. Kosztowne szyfrowanie kryptograficzne AES-256-GCM / PBKDF2 odbywa się przed otwarciem transakcji, co zapobiega timeoutom transakcji IndexedDB (`TransactionInactiveError`).
*   **Kolejka promisów i koordynacja Web Locks (`saleplan-write`)**: Wszystkie wywołania zapisu zbiegają się w pojedynczej kolejce promisów – ostatni zgłoszony stan wygrywa, a oczekujące promisy są łączone i rozstrzygane wspólnie. Między równoległymi kartami przeglądarki wykluczenie wzajemne realizowane jest przez natywne `navigator.locks.request('saleplan-write', ...)`.
*   **Lekka detekcja konfliktów kart (`checkSaveConflict`)**: Weryfikacja konfliktu odczytuje wyłącznie kompaktowy rekord metadanych `STATE_META`, bez konieczności pobierania i deszyfrowania setek kilobajtów całego planu.
*   **Dyskretna architektura autozapisu (`pushAutosaveVersion`)**: Każda wersja autozapisu zapisywana jest pod osobnym kluczem `autosave_<ts>`. Wersja generowana jest nie częściej niż co 5 minut lub po 50 zmianach (porównanie po numerze rewizji, bez ciężkiego `JSON.stringify`).
*   **Wbudowany algorytm redukcji/przerzedzania autozapisu**: Przechowywanie do 3 wersji z bieżącej godziny oraz po 1 wersji z każdej wcześniejszej doby (do 14 dni wstecz), gwarantując pełną ochronę historii bez zapychania IndexedDB.
*   **Wymuszone opróżnianie bufora (`flushNow`) i ochrona przed utratą danych**: Zrzut bufora zapisu w tle na zdarzeniach `visibilitychange` (stan `hidden`) oraz `pagehide`. Blokada przypadkowego zamknięcia lub odświeżenia karty (`beforeunload` z `event.returnValue`), gdy stan nie został jeszcze utrwalony (`saveStatus !== 'saved'`).
*   **Odporność na uszkodzenia bazy i selektywne blokady**: Wyraźne rozróżnienie braku rekordu od błędu walidacji Zod. W przypadku uszkodzenia rekordu tworzona jest kopia `*_recovery_backup_` (ograniczona do 3 najświeższych kopii), a blokada zapisu dotyczy wyłącznie uszkodzonego klucza (`blockedWrites`), nie paraliżując pozostałych modułów.
*   **Zarządzanie kluczami i bezpieczna zmiana hasła**: Wyodrębnienie stałej `ENCRYPTED_KEYS` oraz funkcji `listManagedKeys()`, obejmującej dynamiczne klucze awaryjne i autozapisu. Zmiana hasła głównego deszyfruje i ponownie szyfruje wszystkie zarządzane rekordy, w tym moduł zastępstw `DAILY_SUBSTITUTIONS`.
*   **Optymalizacja statystyk pamięci (`refreshStorageStats`)**: Pomiary pamięci z 30-sekundowym debouncem oparte na `navigator.storage.estimate()` oraz żądanie trwałego magazynu `navigator.storage.persist()` po pierwszym zapisie.
*   **Wzmocniony Service Worker PWA (`public/sw.js`)**: Dynamiczny pre-cache z `CURRENT_ASSETS` (błąd pre-cache przerywa instalację), czysta strategia Cache-First dla `/assets/*` z `cache.put` opakowanym w `event.waitUntil`, wyścig z 3-sekundowym timeoutem dla nawigacji oraz przeładowanie strony po aktualizacji wyłącznie na żądanie użytkownika.
*   **Deterministyczny `buildId` w `vite.config.ts`**: Identyfikator kompilacji oparty na skrócie SHA-256 z nazw wygenerowanych plików pakietu, eliminujący niestabilny `Date.now()`.
*   **Oficjalny dwuetapowy workflow wdrażania GitHub Actions (`.github/workflows/deploy.yml`)**: Podział na niezależne joby `build` i `deploy`, eliminacja równoczesnych wdrożeń i błędu `Deployment cancelled`, automatyczne generowanie `.nojekyll` oraz oficjalna akcja `actions/deploy-pages@v4`.

---

## [3.11.0] — 2026-11-04
### 🧩 Modularyzacja Architektury (Kreator i Plan Klas), Optymalizacja Silnika Diff i Wariantów, Integracja Pensum w Dyżurach

*   **Modularyzacja komponentów monolitycznych**: Dekompozycja `KreatorSzkoly.tsx` na niezależne podkomponenty (`KreatorStepBuildings`, `KreatorStepSubjects`, `KreatorStepCorridors`, `KreatorStepSummary`, `constants.ts`) oraz `PlanKlas.tsx` na dedykowane moduły (`PlanKlasAssignTab`, `PlanKlasTeachersTab`, `PlanKlasSpeSlotModal`, `PlanKlasEditCellModal`) – zmniejszenie złożoności o ponad 2400 linii i znaczące przyspieszenie renderowania.
*   **Optymalizacja silnika Split-Screen Diff**: Budowanie zbiorów zmienionych nauczycieli i sal bezpośrednio ze zmian oddziałów w `computeAllDiffs` bez nadmiarowych podwójnych wywołań.
*   **Indeksowanie slotów wg sal i nauczycieli (`lessonsBySlot`)**: Wprowadzenie jednolinijkowego indeksu `dzień|godzina -> lista lekcji` zamiast powtarzanych przeszukiwań `Object.entries`, z pełną obsługą podziału na grupy.
*   **Ścisła ekwiwalencja komórek planu**: Rozszerzenie reguł `areSlotsEquivalent` o identyfikator oddziału (`classId`) oraz przynależność do grup.
*   **Sanityzacja eksportu diff do Excela**: Bezpieczne oczyszczanie nazw plików ze znaków specjalnych `/[\\/:*?"<>|]/g` oraz ochrona przed przekroczeniem limitu długości ścieżki.
*   **Integracja pensum w kalkulatorze limitów dyżurów**: Przekazywanie szkolnego pensum bazowego (`appState.school.basePensumConfig`) oraz reguł nadgodzin (`appState.school.overtimeDefaultHandling`) w funkcji `getPersonFteProportion` w module `Dyzury.tsx`.
*   **Audyt i higiena kodu**: Usunięcie zbędnych zmiennych w `calculateTeacherWorkload`, zabezpieczenie plików tymczasowych w `.gitignore`, pełna zgodność ESLint/TypeScript oraz 100% zdanych testów w 20 pakietach Vitest.

---

## [3.10.0] — 2026-10-28
### ⚖️ Kompleksowa Reforma Pensum i Obliczania Nadgodzin w Szkole Podstawowej (Karta Nauczyciela art. 42), Moduł Split-Screen Diff

*   **Zróżnicowane pensum wg stanowisk w SP**: Przedmiotowy 18h, wspomagający 20h, świetlica 26h, biblioteka 30h, specjaliści (pedagog, psycholog, logopeda, terapeuta) 22h, doradca 22h oraz obsługa niepedagogiczna 40h (Kodeks Pracy).
*   **Wzór pensum łączonego**: Proporcjonalna formuła organu prowadzącego $P = \sum h_i / \sum (h_i / P_i)$ z dynamicznym wyliczaniem ułamka etatu (FTE) i godzin ponadwymiarowych (nadgodzin).
*   **Zróżnicowanie jednostek czasu (45 min lekcyjne vs 60 min świetlica/opieka)**: Prezentacja w odrębnych kolumnach w tabelach obciążeń, statystykach i arkuszach Excel `.xlsx`.
*   **Proporcjonalne limity dyżurów na przerwach**: Przydział minutowy dyżurów skalowany ściśle wg godzin bezpośrednio prowadzonych przy tablicy ($h_{\text{tablica}} / 18$) oraz etatu, z opcją zwolnienia personelu opiekuńczo-specjalistycznego.
*   **Kontrola 40-godzinnego tygodniowego budżetu czasu pracy**: Weryfikacja łącznego czasu (pensum + dyżury + przygotowanie do zajęć i czynności statutowe) z ostrzeżeniami o przeciążeniu.
*   **Nowy edytor TeacherWorkloadEditor w Kreatorze Szkoły**: Błyskawiczny dobór szablonu stanowiska, konfiguracja wielu ról i pensum łączonego z podglądem KPI na żywo.
*   **Zaktualizowany moduł Statystyk i raporty Excel**: Nowa tabela obciążeń, kafelki KPI, wykresy oraz arkusz „Czas Pracy i Pensum” w eksporcie `.xlsx`.
*   **Tryb Porównywania Wariantów Planu Lekcji Split-Screen Diff (Dual-View • Moduł 4)**:
    *   Widok side-by-side dla dowolnych dwóch wersji lub semestrów planu zajęć.
    *   Dynamiczne podświetlanie dodanych (+), usuniętych (-), zmienionych (~) i identycznych komórek lekcji.
    *   Cherry-picking lekcji: Selektywne przenoszenie pojedynczych zajęć z wariantu alternatywnego do głównego jednym kliknięciem.
    *   Sprawdzanie dostępności sal, nauczycieli i oddziałów w czasie rzeczywistym przed zatwierdzeniem zmian.

---

## [3.9.13] — 2026-10-20
*   **Identyfikacja wizualna**: Nowa stała ikona oraz logotyp zawierające duże, drukowane białe litery „SP” oraz dynamiczny, żółty odręczny dopisek „pro” pismem pisanym na głębokim kobaltowym tle.
*   **Ręczne układanie kolejności miejsc dyżurów**: Przeciąganie Drag & Drop, przyciski strzałek, szybkie sortowanie po piętrach (piwnica → parter → piętra) i nazwach (A-Z) z odzwierciedleniem w harmonogramie i wydrukach.

---

## [3.9.12] — 2026-10-15
*   **Ręczne oznaczanie zbędnych dyżurów w Etapie 3**: Oznaczanie dyżuru jako zbędny (niepotrzebny) w pustych komórkach harmonogramu dziennego, etykieta uzasadnienia i odznaka 🚫 ZBĘDNY.
*   **Ochrona przed autogeneratorem**: Silnik auto-sugestii dyżurów nie nadpisuje zbędnych slotów i nie przydziela na nie personelu.
*   **Korekta statystyk i zapotrzebowania**: Czas zbędnych przerw jest automatycznie odejmowany z sumarycznego zapotrzebowania tygodniowego.

---

## [3.9.11] — 2026-10-10
*   **Zadania poza tablicą w profilu nauczyciela**: Ewidencja czynności świetlicowych, bibliotecznych, wsparcia pedagogicznego, psychologicznego, logopedycznego i współorganizującego (wspomagającego).
*   **Personel niepedagogiczny**: Autonomiczny rejestr pracowników obsługi, asystentów ucznia i woźnych z wymiarem 40h tygodniowo i dyspozycyjnością.
*   **Bilansowanie FTE**: Proporcjonalne przeliczanie obciążenia (18h pensum vs 40h Kodeks Pracy).

---

## [3.9.10] — 2026-10-05
*   **Wielokartowy silnik różnicowy (Conflict Diff Engine)**: Identyfikacja karty dokonującej zmian, czas zapisu, wizualne pigułki bilansu i kategoryzowana lista wprowadzonych zmian.
*   **Metadane karty w `STATE_META`**: Bezpieczna rejestracja identyfikatorów i aktywnych modułów.

---

## [3.9.9] — 2026-09-28
*   **Nauczanie Indywidualne (NI) w szkole vs w domu**: Dedykowany przełącznik miejsca realizacji zajęć (w budynku szkoły / w domu ucznia) z pełną wizualizacją w profilach, arkuszu wsparcia i wydrukach.

---

## [3.9.8] — 2026-09-20
*   **Naprawa przewijania tabeli dyżurów**: Niezależny kontener `overflow-x-auto`, przypięta kolumna przerw (`sticky left-0`) oraz przełącznik zwijania bocznego panelu bilansu.

---

## [3.9.7] — 2026-09-15
*   **Tolerancyjna walidacja Zod**: Schematy `SegmentRoomSchema`, obsługa numerów pokoi jako string i number oraz auto-normalizacja w `initStorage`.

---

## [3.9.6] — 2026-09-08
*   **Tarcza Bezpieczeństwa RODO v2**: Derywacja klucza podniesiona do 600 000 iteracji PBKDF2 (SHA-256) z szyfrowaniem AES-256-GCM.
*   **Klucz sesji w pamięci RAM**: Brak haseł w `sessionStorage`, operacje poniżej 1 sekundy dla baz powyżej 5 MB.
*   **Pre-Encryption Backup**: Kopia zapasowa przed włączeniem szyfrowania z automatycznym rollbackiem.

---

## [3.9.5] — 2026-09-01
*   **Tryb Dwóch Ekranów (Dual-Screen Workspace)**: Wykrywanie drugiego monitora przez Screen Details API i niezależne okno towarzyszące (`?mode=companion`).

---

## [3.9.0] do [3.0.0]
*   **Oficjalne skróty przedmiotów z Kreatora na Płachcie Dyrektorskiej** (`[JP]`, `[MAT]`, `[ANG]`, `[WF]` itp.) oraz urzędowy Słownik Skrótów.
*   **Płachta Dyrektorska A3/A2**: Wydruki wielkoformatowe dla 25–50 klas, podział na dni, auto-dopasowanie czcionek i zoom ekranowy.
*   **Tablica TV / Kiosk**: Pełnoekranowy widok na monitory korytarzowe z zegarem i odliczaniem do dzwonka.
*   **Grupy równoległe i Nauczanie Specjalne (SPE i NI)**: Pule orzeczeniowe, WOPFU, IPET, grupy łączone terapii i profil ucznia w panelu bocznym.
*   **Offline-First & PWA**: Pełna funkcjonalność bez połączenia z siecią, instalacja na komputerach i urządzeniach mobilnych.
