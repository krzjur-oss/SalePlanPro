# SalePlan Pro v3 🗓️🏫 (SchedData Engine)

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
*   **Wsparcie Kształcenia Specjalnego i Uczniów ze SPE**: Dedykowany krok ewidencji uczniów o specjalnych potrzebach edukacyjnych (Nauczanie Indywidualne – NI, Nauczyciel Wspomagający w klasie, Rewalidacja, Terapia Korekcyjno-Kompensacyjna) z deklaracją tygodniowego wymiaru godzin i form wsparcia.
*   **Zintegrowany Formularz Przydziałów Lekcyjnych (Krok 9)**:
    *   **Tryb Nauczycielski**: Ergonomiczny ciąg kroków: `1. Nauczyciel` -> `2. Oddział szkolny lub uczeń SPE` -> `3. Opcjonalna podgrupa` -> `4. Przedmiot / rodzaj zajęć wspierających` -> `5. Sugerowana sala` -> `6. Rozkład i bloki lekcyjne`.
    *   **Inteligentne Podpowiedzi**: Automatyczne sugerowanie zadeklarowanych dla danego ucznia form wsparcia oraz wymiaru godzin.
    *   **Niezależność Kroków**: Wybór kolejnych pól formularza nie resetuje ani nie nadpisuje wcześniej ustalonych danych.
*   **Szablony Struktury Szkoły**: Zapisywanie i wczytywanie konfiguracji nowego roku szkolnego z automatyczną promocją klas o jeden poziom wyżej.

### 2. 👨‍🏫 Zaawansowane Zarządzanie Dyżurami Nauczycielskimi (Dyzury)
*   **Zarządzanie Obszarami Dyżurów (Miejsca)**: Definiowanie punktów kluczowych w szkole (np. korytarz parter, boisko, stołówka) wraz z przypisaniem ich do pięter.
*   **Konfiguracja Przerw**: Elastyczny kreator godzin trwania przerw obiadowych i krótkich.
*   **Matryca Harmonogramu**: Interaktywny panel przydzielania nauczycieli do określonych miejsc i przerw w poszczególne dni tygodnia.

### 3. 👥 Równoległe Grupy i Zajęcia Specjalne w Planie Klas
*   **Obsługa Wielu Grup na Jednej Godzinie**: Możliwość prowadzenia lekcji w grupach (np. Informatyka gr1 i gr2, WF chłopcy i dziewczęta) w tym samym slocie godzinowym przez różnych nauczycieli w osobnych salach.
*   **Zajęcia Specjalne i Indywidualne (SPE)**: Przydział nauczycieli prowadzących oraz nauczycieli wspomagających w klasie z automatyczną weryfikacją obecności i braku kolizji w planie oddziału.

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

---

## 📈 Podsumowanie Statusu Prac

### ✅ Co zostało zrobione (Zrealizowane)
1.  **Obsługa Uczniów ze Specjalnymi Potrzebami Edukacyjnymi (SPE / NI / Rewalidacja)**:
    *   Wdrożono dedykowany krok ewidencji uczniów SPE w Kreatorze Szkoły z obsługą wielu form wsparcia jednocześnie.
    *   Zintegrowano formularz przydziałów w trybie nauczycielskim (sekwencja pól: Nauczyciel -> Oddział / Uczeń SPE -> Podgrupa -> Przedmiot -> Sala -> Bloki).
    *   Wdrożono niezależność kroków w formularzu (brak resetowania wartości przy zmianie innych pól).
    *   Uwzględniono godziny zajęć specjalnych i indywidualnych w kalkulacji pensum, obciążenia i nadgodzin kadry.
    *   Rozszerzono podsumowanie przydziałów o widok zajęć SPE dla klas, nauczycieli oraz toku indywidualnego.
2.  **Szczegółowy Plan Tygodniowy Nauczycieli z Rzeczywistymi Salami i Dyżurami**:
    *   Wdrożono pionowy układ danych w komórkach (Przedmiot -> Klasa/Grupa -> Rzeczywista sala z Planu Sal).
    *   Poprawiono resolver sal z faktycznego przydziału w Planie Sal (`schedData` / Etap 2).
    *   Zintegrowano wstrzykiwanie wierszy przerw z informacją o dyżurach nauczycielskich.
    *   Dodano opcję włączania/wyłączania dyżurów w widoku pojedynczym oraz zbiorczym.
3.  **Dedykowany Wydruk Płachty Sal (Optymalizacja A4 Landscape)**:
    *   Wdrożono czytelny, pionowy układ informacji wewnątrz komórek bez zbędnych obramowań (Klasa -> Grupa -> Przedmiot -> Nauczyciel).
    *   Wprowadzono algorytm deduplikacji wpisów oraz reguły ochrony przed dzieleniem stron (`break-inside: avoid`).
4.  **Obsługa Równoległych Grup na Jednej Godzinie Lekcyjnej**:
    *   Możliwość planowania zajęć w grupach (np. Informatyka gr1 i gr2, WF) w tym samym slocie godzinowym bez fałszywych kolizji.
5.  **Szablony Struktury Szkoły (SchoolStructureTemplate)**:
    *   Zapisywanie struktury szkoły jako wielorazowy szablon z automatyczną promocją roczników.
6.  **Centrum Scalania i Wieloosobowej Pracy**:
    *   Moduł łączenia planów klas 1-3, 4-8 oraz dyżurów od różnych autorów do jednego pliku.
7.  **Baza Danych IndexedDB i Autonaprawa Pamięci Podręcznej**:
    *   Zniesienie limitu 5 MB pamięci, moduł awaryjnego resetu pamięci podręcznej i automatyczna autokorekta danych.
8.  **Automatyzacja Wyboru Roku Szkolnego i Profile Przedmiotowe**:
    *   Dynamiczny dobór roku szkolnego oraz profile przedmiotów dla SP, LO, Technikum i Szkoły Branżowej.

---

## 🛡️ Bezpieczeństwo i Prywatność (Zgodność z RODO)

Program został zaprojektowany z zachowaniem najwyższych standardów ochrony danych osobowych (Privacy by Design):
*   Wszystkie wprowadzane dane (nazwiska nauczycieli, plany zajęć, oddziały klasowe) są zapisywane wyłącznie w pamięci lokalnej Twojego urządzenia (IndexedDB / LocalStorage).
*   Narzędzie diagnostyczne i dziennik błędów zapisuje jedynie parametry techniczne w celu rozwiązywania problemów ze zgodnością. Dane wprowadzane przez użytkownika są podczas diagnostyki w 100% pomijane.

## 📄 Licencja

Projekt dystrybuowany jest na warunkach **Darmowej Licencji Edukacyjnej (Zastrzeżonej)**. Zezwala ona na bezpłatne użytkowanie oprogramowania w placówkach oświatowych, lecz zabrania kopiowania, dystrybuowania, modyfikowania oraz komercjalizacji kodu bez zgody autora. Szczegóły znajdują się w pliku `LICENSE`.
