# SalePlan Pro v3.8.2 🗓️🏫 (SchedData Engine)

Profesjonalny, bezpieczny i w pełni autonomiczny system do kompleksowego planowania lekcji, optymalnego przydziału sal lekcyjnych oraz układania i walidacji harmonogramów dyżurów nauczycielskich. Zaprojektowany z myślą o polskich szkołach podstawowych i ponadpodstawowych.

Aplikacja działa w architekturze **Offline-First** jako nowoczesna aplikacja **PWA (Progressive Web App)**, co oznacza, że po pierwszej instalacji nie wymaga stałego dostępu do Internetu i uruchamia się błyskawicznie bezpośrednio z pulpitu komputera lub telefonu.

---

## 🚀 Główne Funkcje Systemu i Moduły

### 1. 🛠️ Kreator Szkół i Konfiguracji (KreatorSzkoly)
*   **Dynamiczny Wybór Roku Szkolnego**: System automatycznie oblicza bieżący rok szkolny na podstawie daty systemowej użytkownika przy pierwszym uruchomieniu programu (zapobiega to "zamrożeniu" roku szkolnego w kodzie źródłowym). Użytkownik ma do wyboru automatyczną listę lat (od 3 lat wstecz do 6 lat w przód) oraz opcję ręcznego zdefiniowania niestandardowego roku szkolnego.
*   **Słownik Przedmiotów (Kanon Przedmiotowy według Rodzaju Szkoły)**: Wbudowany asystent pozwala jednym kliknięciem zaimportować gotowy, predefiniowany zestaw przedmiotów dla wybranego rodzaju szkoły:
    *   **Szkoła Podstawowa (SP)**: Język polski, Matematyka, Przyroda, Technika, Muzyka, Religia/Etyka itp.
    *   **Liceum Ogólnokształcące (LO)**: Rozszerzenia przedmiotowe, Biznes i zarządzanie, Historia i teraźniejszość, Filozofia itp.
    *   **Technikum**: Podział na przedmioty ogólnokształcące, zawodowe, BHP oraz Język Obcy Zawodowy (JOZ).
    *   **Szkoła Branżowa**: Praktyczna nauka zawodu, BHP, przedmioty zawodowe i podstawowe.
*   **Wizualny Kreator Budynku**: Możliwość szczegółowego odwzorowania pięter oraz sal lekcyjnych z przypisaniem ich typu (np. sala ogólna, pracownia informatyczna, sala gimnastyczna).
*   **Wsparcie Kształcenia Specjalnego i Uczniów ze SPE (Kroki 8 i 9)**:
    *   **Krok 8 (Ewidencja i Pule Orzeczeniowe)**: Rejestracja uczniów ze SPE, przypisanie do oddziału lub toku indywidualnego oraz określenie puli godzin w ramach form wsparcia (Nauczanie Indywidualne – NI, Nauczyciel Wspomagający w klasie, Rewalidacja, Terapia Korekcyjno-Kompensacyjna).
    *   **Krok 9 (Dedykowany Tryb USPE i Rozdysponowanie Pul)**:
        *   Wybór ucznia SPE oraz interaktywny panel pul orzeczeniowych z dynamicznym licznikiem godzin zadeklarowanych, przydzielonych i pozostałych.
        *   Szczegółowy przydział godzin z puli: wskazanie nauczyciela, konkretnego przedmiotu szkolnego (np. Język angielski, Edukacja wczesnoszkolna, Informatyka, WF) lub formy terapeutycznej.
        *   Tryb realizacji: **Wspomaganie na lekcjach w oddziale** (🤝 z nauczycielem prowadzącym) vs **Zajęcia indywidualne / 1 na 1** (👤 gabinet).
        *   Wizualizacja siatki przydziałów w widoku **👤 Uczniami SPE** z podziałem na pule i przyciskami szybkiego przydziału `+ Przypisz z tej puli`.
*   **Zintegrowany Formularz Przydziałów Lekcyjnych (Krok 9)**:
    *   **3 Ergonomiczne Tryby Pracy**:
        *   `Klasami`: `Oddział -> Grupa -> Przedmiot -> Nauczyciel -> Sala -> Wymiar / Bloki`.
        *   `Nauczycielami`: `Nauczyciel -> Oddział / Grupa -> Przedmiot -> Sala -> Wymiar / Bloki`.
        *   `👤 USPE (Uczniowie SPE)`: `Uczeń SPE -> Pula orzeczeniowa -> Przedmiot/zajęcia -> Nauczyciel -> Tryb (W oddziale / Indywidualnie) -> Sala -> Wymiar / Bloki`.
    *   **Inteligentne Podpowiedzi i Pilnowanie Limitów**: Automatyczne sugerowanie zadeklarowanych dla danego ucznia form wsparcia, przedmiotów oraz pozostałego wymiaru godzin z puli.
    *   **Niezależność Kroków**: Wybór kolejnych pól formularza nie resetuje ani nie nadpisuje wcześniej ustalonych danych.
*   **Szablony Struktury Szkoły**: Zapisywanie i wczytywanie konfiguracji nowego roku szkolnego z automatyczną promocją klas o jeden poziom wyżej.

### 2. 👨‍🏫 Zaawansowane Zarządzanie Dyżurami Nauczycielskimi (Dyzury)
*   **Zarządzanie Obszarami Dyżurów (Miejsca)**: Definiowanie punktów kluczowych w szkole (np. korytarz parter, boisko, stołówka) wraz z przypisaniem ich do pięter.
*   **Konfiguracja Przerw**: Elastyczny kreator godzin trwania przerw obiadowych i krótkich.
*   **Matryca Harmonogramu**: Interaktywny panel przydzielania nauczycieli do określonych miejsc i przerw w poszczególne dni tygodnia.
*   **Lekcje WF a Dyżury Korytarzowe (Nadzór Szatni i Sal Sportowych)**:
    *   **Inteligentne rozróżnianie zajęć**: system weryfikuje charakter lekcji prowadzonej przez danego nauczyciela. Podczas zajęć wychowania fizycznego i sportowych nauczyciel ma obowiązek sprawować bezpośrednią opiekę nad klasą w szatniach sportowych/na sali gimnastycznej i jest automatycznie zwalniany z dyżurów korytarzowych na przyległych przerwach.
    *   **Pełna elastyczność dla nauczycieli dwuprzedmiotowych**: jeśli ten sam pedagog uczy innych przedmiotów (np. biologii, edukacji dla bezpieczeństwa, edukacji zdrowotnej), w trakcie tych lekcji system traktuje go jako w pełni dyspozycyjnego i normalnie planuje mu dyżury na korytarzach szkolnych.
    *   **Konfiguracja trybu opieki**: wybór przerw podlegających nadzorowi (przed i po lekcji WF, tylko po lekcji – opuszczenie szatni, tylko przed lekcją).
    *   **Wliczanie do pensum dyżurów**: opcjonalne zaliczanie minut spędzonych na nadzorze szatni do tygodniowego limitu dyżurów nauczyciela (FTE).
    *   **Wykaz i edycja przedmiotów sportowych**: interaktywny selektor przedmiotów umożliwiający dodanie lub wykluczenie dowolnych nietypowych nazw przedmiotów sportowych w szkole.
    *   **Dedykowany podgląd i bilans**: harmonogram dzienny z tabelą nadzoru szatni sportowych oraz wyszczególnieniem czasu WF w podsumowaniu obciążeń kadry.
*   **Dyżury Adaptacyjne i Odprowadzające w Klasach 1**:
    *   **Dyżur w sali lekcyjnej**: opieka wychowawców i nauczycieli edukacji wczesnoszkolnej w salach lekcyjnych klas pierwszych podczas przerw, chroniąca przed równoczesnym wyznaczeniem dyżuru na korytarzu.
    *   **Dyżur odprowadzający**: dedykowany czas (np. 15 minut) na bezpieczne odprowadzenie uczniów do szatni lub świetlicy po zakończeniu zajęć.

### 3. 👥 Równoległe Grupy oraz Zintegrowany Moduł Nauczania Specjalnego (SPE i NI) w Planie Klas
*   **Obsługa Wielu Grup na Jednej Godzinie**: Możliwość prowadzenia lekcji w grupach (np. Informatyka gr1 i gr2, WF chłopcy i dziewczęta) w tym samym slocie godzinowym przez różnych nauczycieli w osobnych salach z oznaczeniami graficznymi grup i brakiem fałszywych kolizji.
*   **Zintegrowany Moduł Nauczania Specjalnego (SPE i NI) w Lewym Pasku Bocznym (Sidebar)**:
    *   **Jednolita Nawigacja Boczna**: Bezpośrednie przełączanie w lewym panelu między widokiem oddziałów (`🏫 Oddziały klasowe`) a listą uczniów specjalnych (`👤 Uczniowie SPE i NI`), z wbudowaną wyszukiwarką uczniów i szybkim dodawaniem nowego orzeczenia.
    *   **Ergonomiczne Zwijanie Paska (100% Szerokości Ekranu)**: Panel boczny zwija się do smukłego paska z plakietką wybranego ucznia (`PanelLeftClose` / `PanelLeftOpen`), eliminując podwójne paski i uwalniając pełną szerokość ekranu dla głównej siatki zajęć.
    *   **Kompleksowy Plan Tygodniowy Ucznia SPE**:
        *   Wizualne rozróżnienie zajęć w oddziale (**🤝 Wspomaganie** z nauczycielem prowadzącym) oraz zajęć gabinetowych (**👤 1 na 1 / Indywidualne** – Nauczanie Indywidualne, Rewalidacja, Terapia).
        *   Dynamiczne podsumowanie wymiaru godzin (godziny z klasą vs godziny gabinetowe) aktualizowane na żywo.
    *   **Karty Wsparcia Psychologiczno-Pedagogicznego**: Wbudowane edytory zintegrowane bezpośrednio z profilem ucznia:
        *   **Orzeczenie i Profil**: Podstawa orzeczenia, zalecenia poradni PPP, termin ważności.
        *   **WOPFU**: Wielospecjalistyczna Ocena Poziomu Funkcjonowania Ucznia (mocne strony, trudności, bariery środowiskowe).
        *   **IPET**: Indywidualny Program Edukacyjno-Terapeutyczny (cele rozwojowe, zintegrowane działania nauczycieli i specjalistów, formy dostosowania wymagań).
        *   **Rewalidacja / Pomoc PP**: Zakres zajęć rewalidacyjnych, logopedycznych, korekcyjno-kompensacyjnych i socjoterapeutycznych.

### 4. 📊 Moduł Wydruków i Publikacji (Wydruki)
System oferuje zaawansowany generator czystych szablonów PDF/A4 do wydruku tradycyjnego lub zapisu cyfrowego:
*   **Plan Tygodniowy Nauczycieli z Rzeczywistymi Salami i Dyżurami**:
    *   W każdej komórce lekcji prezentowane są precyzyjne dane w czytelnym układzie pionowym: **Przedmiot** (wyraźny nagłówek), **Klasa / Grupa** (np. `3a (gr1)`) oraz **Rzeczywista Sala Lekcyjna** (np. `s. 104`).
    *   **Pobieranie Właściwych Sal z Planu Sal**: System weryfikuje faktyczne obłożenie w matrycy sal (`schedData` / Etap 2) i wyświetla salę, w której lekcja realnie się odbywa, a nie salę jedynie sugerowaną przez nauczyciela w notatce.
    *   **Dyżury Międzylekcyjne**: Pomiędzy godzinami lekcyjnymi automatycznie wstawiane są wiersze przerw z informacją o wyznaczonym dyżurze dla danego nauczyciela (dokładne miejsce dyżuru oraz piętro, np. `Parter - Korytarz główny`).
    *   Opcjonalny przełącznik włączania/wyłączania widoczności dyżurów w widoku pojedynczym i zbiorczym.
*   **Płachta Gabinetów i Sal (Matryca Sal na A4 Landscape)**:
    *   Czysty, minimalistyczny układ danych w komórkach (**Klasa**, **Grupa**, **Przedmiot**, **Nauczyciel**) ułożonych jedno pod drugim bez rozpraszających ramek i kolorowych obwódek – idealna czytelność dla uczniów i nauczycieli po wydrukowaniu na papierze.
    *   Wbudowany algorytm deduplikacji wpisów eliminujący powtarzanie się tych samych lekcji w jednym oknie godzinowym.
    *   Precyzyjne reguły podziału stron `@media print` (`break-inside: avoid`) zapobiegające rozcinaniu wierszy i generowaniu pustych arkuszy.
*   **Dynamiczny Podgląd Dyżurów (Duties Print Preview & Verification Modal)**:
    *   Osobny, interaktywny modal umożliwiający podgląd całego harmonogramu dyżurów ze skalowaniem w locie (Zoom 70-110%) oraz filtrowaniem dni.

### 5. 🤝 Centrum Wieloosobowego Scalania i Baza IndexedDB
*   **Scalanie Wieloplikowe**: Moduł łączenia planów klas 1-3, 4-8 oraz dyżurów od różnych autorów do jednego pliku bez nadpisywania danych.
*   **Baza IndexedDB**: Bezpieczne, nielimitowane przechowywanie danych szkolnych z automatycznym autozapisem i punktami przywracania stanu.

---

## 🧠 Zasady Działania Algorytmów i Generatorów

### 1. Integracja Planu Lekcji z Harmonogramem Dyżurów (Silnik SchedData)
Główną innowacją systemu jest **dynamiczna weryfikacja kontekstowa zajęć lekcyjnych** podczas planowania dyżurów nauczycieli na danej przerwie.
Dla każdego przypisanego dyżuru system przeszukuje bazę danych ułożonego planu lekcji (`etap2Schedule`):
*   **Lekcja Przed Przerwą**: Wyszukuje, jakie zajęcia nauczyciel prowadził bezpośrednio przed przerwą (pobiera klasę, przedmiot oraz numer sali lekcyjnej).
*   **Lekcja Po Przerwie**: Analizuje zajęcia nauczyciela zaraz po przerwie.
*   *Cel*: Pozwala to osobie układającej dyżury na natychmiastową ocenę logistyczną – czy nauczyciel zdąży przemieścić się ze swojej klasy na miejsce dyżuru (np. z 2. piętra na boisko szkolne).

### 2. Automatyczny Walidator Kolizji i Ostrzeżeń (Real-Time Safety Checks)
Podczas renderowania planu dyżurów, silnik walidacyjny w czasie rzeczywistym analizuje harmonogram i zgłasza dwa kluczowe typy alertów:
1.  **🚨 Kolizja: Jednoczesny dyżur w innych rejonach**: Wykrywa błędy polegające na przypisaniu tego samego nauczyciela na tej samej przerwie w tym samym dniu do dwóch lub więcej różnych fizycznie miejsc.
2.  **⚠️ Brak innych lekcji w tym dniu**: Ostrzega planistę, jeśli nauczyciel został wyznaczony do dyżuru w dniu, w którym według ułożonego planu lekcji nie ma żadnych zajęć.

### 3. Inteligentny Silnik Optymalizacji Dyżurów z Ochroną Szatni WF i Klas 1 (v3.8.2)
*   **Wielozadaniowość i kontekst przedmiotowy**: System weryfikuje charakter prowadzonych lekcji przez każdego nauczyciela. W czasie przerw przyległych do lekcji WF nauczyciel sprawuje opiekę nad klasą w szatniach i salach sportowych – algorytm automatycznie chroni go przed wyznaczeniem dyżuru na korytarzach szkolnych. W czasie lekcji z przedmiotów ogólnych ten sam pedagog jest traktowany jako w pełni dyspozycyjny.
*   **Ochrona edukacji wczesnoszkolnej**: Automatyczne uwzględnianie dyżurów adaptacyjnych w salach klas pierwszych oraz dyżurów odprowadzających do szatni/świetlicy.

---

## 📈 Podsumowanie Statusu Prac

### ✅ Co zostało zrobione (Zrealizowane)
1.  **Lekcje WF a Dyżury Korytarzowe (Nadzór Szatni) oraz Dyżury Adaptacyjne Klas 1 (v3.8.2)**:
    *   Wdrożono inteligentne rozróżnianie charakteru prowadzonych zajęć – zwolnienie z dyżurów korytarzowych przy lekcjach WF i nakierowanie uwagi na nadzór szatni sportowych.
    *   Obsługa nauczycieli łączących WF z innymi przedmiotami (np. biologia, edukacja zdrowotna) – pełna dyspozycyjność do dyżurów korytarzowych w blokach przedmiotów ogólnych.
    *   Konfiguracja przerw z nadzorem szatni (przed i po, tylko po, tylko przed) oraz opcja wliczania minut opieki do pensum dyżurów (FTE).
    *   Interaktywny selektor przedmiotów sportowych z dynamicznym wykrywaniem i możliwością ręcznego wykluczania/dodawania.
    *   Dedykowany podgląd harmonogramu dziennego nadzoru szatni i sal sportowych oraz integracja z bilansem tygodniowym.
    *   Wsparcie dla dyżurów adaptacyjnych i odprowadzających w klasach 1.
2.  **Zintegrowany Moduł Nauczania Specjalnego (SPE i NI) w Planie Klas (v3.8.1)**:
    *   Wdrożono jednolitą nawigację w lewym panelu bocznym z przełącznikiem między oddziałami klasowymi a uczniami SPE i NI.
    *   Zaimplementowano ergonomiczne zwijanie/rozwijanie paska bocznego do wąskiej kolumny (`PanelLeftClose` / `PanelLeftOpen`), uwalniając 100% szerokości ekranu na właściwą siatkę zajęć.
    *   Wyeliminowano zduplikowany lewy panel boczny wewnątrz modułu SPE, tworząc przejrzysty, harmonijny i spójny interfejs.
    *   Siatka tygodniowa ucznia ze SPE z podziałem na wspomaganie w oddziale (🤝) oraz zajęcia gabinetowe (👤) wraz z edytorami kart wsparcia: Profil, WOPFU, IPET oraz Rewalidacja.
3.  **Ewidencja Uczniów SPE i Pule Orzeczeniowe w Kreatorze Szkoły (Kroki 8 i 9)**:
    *   Dedykowany krok ewidencji uczniów SPE w Kreatorze Szkoły z obsługą wielu form wsparcia jednocześnie (NI, Wspomaganie w klasie, Rewalidacja, Terapia Korekcyjno-Kompensacyjna).
    *   Zintegrowany formularz przydziałów w trybie nauczycielskim oraz dedykowany tryb `👤 USPE` z pulami orzeczeniowymi i dynamicznym licznikiem godzin zadeklarowanych, przydzielonych i pozostałych.
    *   Wdrożono niezależność kroków w formularzu (brak resetowania wartości przy wyborze kolejnych pól).
    *   Uwzględniono godziny zajęć specjalnych i indywidualnych w kalkulacji pensum, obciążenia i nadgodzin kadry pedagogicznej.
    *   Rozszerzono zestawienie przydziałów o czytelny widok zajęć SPE dla klas, nauczycieli oraz toku indywidualnego.
4.  **Szczegółowy Plan Tygodniowy Nauczycieli z Rzeczywistymi Salami i Dyżurami (v3.7.2)**:
    *   Wdrożono pionowy układ danych w komórkach (Przedmiot -> Klasa/Grupa -> Rzeczywista sala z Planu Sal).
    *   Poprawiono resolver sal z faktycznego przydziału w Planie Sal (`schedData` / Etap 2).
    *   Zintegrowano wstrzykiwanie wierszy przerw z informacją o dyżurach nauczycielskich.
    *   Dodano opcję włączania/wyłączania dyżurów w widoku pojedynczym oraz zbiorczym.
5.  **Dedykowany Wydruk Płachty Sal (Optymalizacja A4 Landscape - v3.7.1)**:
    *   Wdrożono czytelny, pionowy układ informacji wewnątrz komórek bez zbędnych obramowań (Klasa -> Grupa -> Przedmiot -> Nauczyciel).
    *   Wprowadzono algorytm deduplikacji wpisów oraz reguły ochrony przed dzieleniem stron (`break-inside: avoid`).
6.  **Obsługa Równoległych Grup na Jednej Godzinie Lekcyjnej (v3.7.0)**:
    *   Możliwość planowania zajęć w grupach (np. Informatyka gr1 i gr2, WF) w tym samym slocie godzinowym bez fałszywych kolizji.
7.  **Szablony Struktury Szkoły (SchoolStructureTemplate - v3.6.0)**:
    *   Zapisywanie struktury szkoły jako wielorazowy szablon z automatyczną promocją roczników.
8.  **Centrum Scalania i Wieloosobowej Pracy (v3.5.0)**:
    *   Moduł łączenia planów klas 1-3, 4-8 oraz dyżurów od różnych autorów do jednego pliku.
9.  **Baza Danych IndexedDB i Autonaprawa Pamięci Podręcznej (v3.4.0)**:
    *   Zniesienie limitu 5 MB pamięci, moduł awaryjnego resetu pamięci podręcznej i automatyczna autokorekta danych.
10. **Automatyzacja Wyboru Roku Szkolnego i Profile Przedmiotowe**:
    *   Dynamiczny dobór roku szkolnego oraz profile przedmiotów dla SP, LO, Technikum i Szkoły Branżowej.

---

## 🛡️ Bezpieczeństwo i Prywatność (Zgodność z RODO)

Program został zaprojektowany z zachowaniem najwyższych standardów ochrony danych osobowych (Privacy by Design):
*   Wszystkie wprowadzane dane (nazwiska nauczycieli, plany zajęć, oddziały klasowe) są zapisywane wyłącznie w pamięci lokalnej Twojego urządzenia (IndexedDB / LocalStorage).
*   Narzędzie diagnostyczne i dziennik błędów zapisuje jedynie parametry techniczne w celu rozwiązywania problemów ze zgodnością. Dane wprowadzane przez użytkownika są podczas diagnostyki w 100% pomijane.

## 📄 Licencja

Projekt dystrybuowany jest na warunkach **Darmowej Licencji Edukacyjnej (Zastrzeżonej)**. Zezwala ona na bezpłatne użytkowanie oprogramowania w placówkach oświatowych, lecz zabrania kopiowania, dystrybuowania, modyfikowania oraz komercjalizacji kodu bez zgody autora. Szczegóły znajdują się w pliku `LICENSE`.
