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

### 2. 👨‍🏫 Zaawansowane Zarządzanie Dyżurami Nauczycielskimi (Dyzury)
*   **Zarządzanie Obszarami Dyżurów (Miejsca)**: Definiowanie punktów kluczowych w szkole (np. korytarz parter, boisko, stołówka) wraz z przypisaniem ich do pięter.
*   **Konfiguracja Przerw**: Elastyczny kreator godzin trwania przerw obiadowych i krótkich.
*   **Matryca Harmonogramu**: Interaktywny panel przydzielania nauczycieli do określonych miejsc i przerw w poszczególne dni tygodnia.

### 3. 📊 Moduł Wydruków i Publikacji (Wydruki)
System oferuje zaawansowany generator czystych szablonów PDF/A4 do wydruku tradycyjnego lub zapisu cyfrowego:
*   **Dynamiczny Podgląd Dyżurów (Duties Print Preview & Verification Modal)**:
    *   Osobny, interaktywny modal umożliwiający podgląd całego harmonogramu dyżurów.
    *   **Skalowanie w locie (Zoom)**: Regulacja gęstości tabeli (od 70% do 110%) w celu idealnego dopasowania wydruku do jednej strony A4 w układzie poziomym (Landscape).
    *   **Filtrowanie Dni**: Możliwość wyizolowania konkretnego dnia tygodnia (np. tylko poniedziałek) lub podglądu całego tygodnia zbiorczo.
*   **Filtry Wydruków Klasowych, Nauczycielskich oraz Sal**: Pełne plany tygodniowe z opcją personalizacji układów graficznych.

---

## 🧠 Zasady Działania Algorytmów i Generatorów

### 1. Integracja Planu Lekcji z Harmonogramem Dyżurów (Silnik SchedData)
Główną innowacją systemu jest ** dynamiczna weryfikacja kontekstowa zajęć lekcyjnych** podczas planowania dyżurów nauczycieli na danej przerwie.
Dla każdego przypisanego dyżuru system przeszukuje bazę danych ułożonego planu lekcji (`etap2Schedule`):
*   **Lekcja Przed Przerwą**: Wyszukuje, jakie zajęcia nauczyciel prowadził bezpośrednio przed przerwą (pobiera klasę, przedmiot oraz numer sali lekcyjnej).
*   **Lekcja Po Przerwie**: Analizuje zajęcia nauczyciela zaraz po przerwie.
*   *Cel*: Pozwala to osobie układającej dyżury na natychmiastową ocenę logistyczną – czy nauczyciel zdąży przemieścić się ze swojej klasy na miejsce dyżuru (np. z 2. piętra na boisko szkolne).

### 2. Automatyczny Walidator Kolizji i Ostrzeżeń (Real-Time Safety Checks)
Podczas renderowania planu dyżurów, silnik walidacyjny w czasie rzeczywistym analizuje harmonogram i zgłasza dwa kluczowe typy alertów:
1.  **🚨 Kolizja: Jednoczesny dyżur w innych rejonach**: Wykrywa błędy polegające na przypisaniu tego samego nauczyciela na tej samej przerwie w tym samym dniu do dwóch lub więcej różnych fizycznie miejsc (np. jednocześnie dyżur na Parterze i na Boisku).
2.  **⚠️ Brak innych lekcji w tym dniu**: Ostrzega planistę, jeśli nauczyciel został wyznaczony do dyżuru w dniu, w którym według ułożonego planu lekcji nie ma żadnych zajęć (tzw. "pusty dzień" lub dzień wolny od pracy nauczyciela).

---

## 📈 Podsumowanie Statusu Prac

### ✅ Co zostało zrobione (Zrealizowane)
1.  **Automatyzacja Wyboru Roku Szkolnego**:
    *   Zlikwidowano twardo zakodowaną wartość `2026/2027` w Kreatorze Szkoły.
    *   Wdrożono funkcję `getDefaultSchoolYear()` opartą o bieżący czas systemowy. Jeśli użytkownik wejdzie do programu np. w maju 2026 r., system zaproponuje rok szkolny `2026/2027`. Jeśli wejdzie w marcu 2026 r., zaproponuje rok `2025/2026`.
    *   Dodano dynamiczną listę wyboru `getDynamicSchoolYears()` obejmującą lata od -3 do +6 wstecz/w przód.
    *   Wprowadzono opcję `"custom"`, dającą pełną wolność wpisania nietypowego roku szkolnego za pomocą bezpiecznego monitu.
2.  **Słownik Przedmiotów dedykowany dla Rodzajów Szkół**:
    *   Zaimplementowano cztery oficjalne profile szkolne: Szkoła Podstawowa (SP), Liceum Ogólnokształcące (LO), Technikum oraz Szkoła Branżowa.
    *   Dla każdego profilu zdefiniowano kanoniczne przedmioty nauczania wraz ze spójnym kodowaniem kolorów, skrótami (np. JP, MAT, BIOL) oraz domyślnymi flagami podgrup (np. podgrupy na WF czy językach obcych).
    *   Stworzono przyjazny interfejs checklisty w Kreatorze Szkoły z funkcjami *Zaznacz/Odznacz wszystko* oraz automatyczną eliminacją duplikatów (jeśli dany skrót przedmiotu już istnieje w bazie, system go nie nadpisze ani nie zdubluje).
3.  **Dynamiczny Modal Podglądu Dyżurów w Wydrukach**:
    *   Dodano przycisk podglądu otwierający interaktywny modal w sekcji "Wydruki".
    *   Wdrożono w pełni funkcjonalny suwak skali (zoomu) pozwalający dopasować wielkość tabeli dyżurów do specyfiki ekranu oraz wydruku.
    *   Wprowadzono filtrację według dni tygodnia oraz podgląd powiązanych lekcji SchedData bezpośrednio przed i po przerwie.

---

### 📅 Co mamy jeszcze do zrobienia (Roadmap)
1.  **Szybkie Szablony Przerw**: Możliwość wyboru jednego z kilku gotowych szablonów dzwonków (np. lekcje 45-minutowe z przerwami 5, 10 i 20 minut na obiad) zamiast ręcznego wpisywania każdej godziny.
2.  **Eksport do Formatu XLS / CSV**: Dodanie natywnego pobierania ułożonego harmonogramu dyżurów bezpośrednio do pliku arkusza kalkulacyjnego, ułatwiającego edycję w programach MS Excel lub LibreOffice Calc.
3.  **Wersjonowanie Dyżurów (Wielowariantowość)**: Możliwość zapisania osobnych wariantów dyżurów (np. "Wariant zimowy" – dyżury wewnątrz szkoły, "Wariant letni" – dyżury na boisku szkolnym).

---

### 🛠️ Co należy zmodyfikować / usprawnić
1.  **Filtrowanie Nauczycieli na Dyżurach**: Wprowadzenie wyszukiwarki/filtru w matrycy dyżurów – przy dużej liczbie nauczycieli (np. powyżej 60) tabela wyboru staje się długa i wyszukiwanie skrótu nauczyciela na liście rozwijanej może być uciążliwe.
2.  **Optymalizacja Druku Bezpośredniego (CSS print)**: Dostrojenie arkusza stylów `@media print` dla przeglądarek mobilnych, aby zapewnić, że modal wydruku na telefonach poprawnie ukrywa elementy interfejsu systemu operacyjnego.
3.  **Automatyczne Sugerowanie Zastępstw na Dyżurach**: Powiązanie modułu dyżurów z nieobecnościami nauczycieli, tak aby przy absencji danego pedagoga system automatycznie sugerował innego nauczyciela mającego okienko lub wolną lekcję w pobliżu tego rejonu.

---

## 🛡️ Bezpieczeństwo i Prywatność (Zgodność z RODO)

Program został zaprojektowany z zachowaniem najwyższych standardów ochrony danych osobowych (Privacy by Design):
*   Wszystkie wprowadzane dane (nazwiska nauczycieli, plany zajęć, oddziały klasowe) są zapisywane wyłącznie w pamięci lokalnej Twojej przeglądarki (`localStorage`).
*   Narzędzie diagnostyczne i dziennik błędów zapisuje jedynie parametry techniczne (takie jak wersja przeglądarki, rozdzielczość ekranu, rodzaj błędu javascript) w celu rozwiązywania problemów ze zgodnością na różnych przeglądarkach. Dane wprowadzane przez użytkownika są podczas diagnostyki w 100% pomijane.

## 📄 Licencja

Projekt dystrybuowany jest na warunkach **Darmowej Licencji Edukacyjnej (Zastrzeżonej)**. Zezwala ona na bezpłatne użytkowanie oprogramowania w placówkach oświatowych, lecz zabrania kopiowania, dystrybuowania, modyfikowania oraz komercjalizacji kodu bez zgody autora. Szczegóły znajdują się w pliku `LICENSE`.
