# SalePlan Pro v3.13.0 🗓️🏫 (SchedData Engine)

Profesjonalny, bezpieczny i w pełni autonomiczny system do kompleksowego planowania lekcji, optymalnego przydziału sal lekcyjnych oraz układania i walidacji harmonogramów dyżurów nauczycielskich. Zaprojektowany z myślą o polskich szkołach podstawowych i ponadpodstawowych.

Aplikacja działa w architekturze **Offline-First** jako nowoczesna aplikacja **PWA (Progressive Web App)**, co oznacza, że po pierwszej instalacji nie wymaga stałego dostępu do Internetu i uruchamia się błyskawicznie bezpośrednio z pulpitu komputera lub telefonu. Wszystkie dane pozostają wyłącznie w lokalnej pamięci Twojego urządzenia.

---

## 🚀 Główne Funkcje Systemu i Moduły

### 1. 🛠️ Kreator Szkół i Konfiguracji (`KreatorSzkoly`)
*   **Dynamiczny Wybór Roku Szkolnego**: System automatycznie oblicza bieżący rok szkolny na podstawie daty systemowej użytkownika przy pierwszym uruchomieniu programu. Użytkownik ma do wyboru automatyczną listę lat oraz opcję ręcznego zdefiniowania niestandardowego roku szkolnego.
*   **Słownik Przedmiotów (Kanon Przedmiotowy według Rodzaju Szkoły)**: Wbudowany asystent pozwala jednym kliknięciem zaimportować gotowy zestaw przedmiotów dla wybranego typu placówki:
    *   **Szkoła Podstawowa (SP)**: Język polski, Matematyka, Przyroda, Technika, Muzyka, Religia/Etyka itp.
    *   **Liceum Ogólnokształcące (LO)**: Rozszerzenia przedmiotowe, Biznes i zarządzanie, Historia i teraźniejszość, Filozofia itp.
    *   **Technikum**: Podział na przedmioty ogólnokształcące, zawodowe, BHP oraz Język Obcy Zawodowy (JOZ).
    *   **Szkoła Branżowa**: Praktyczna nauka zawodu, BHP, przedmioty zawodowe i podstawowe.
*   **Wizualny Kreator Budynku**: Szczegółowe odwzorowanie pięter oraz sal lekcyjnych z przypisaniem ich typu (np. sala ogólna, pracownia informatyczna, sala gimnastyczna/sportowa).
*   **Wsparcie Kształcenia Specjalnego i Uczniów ze SPE (Kroki 8 i 9)**:
    *   **Ewidencja i Pule Orzeczeniowe**: Rejestracja uczniów ze SPE, przypisanie do oddziału lub toku indywidualnego oraz określenie puli godzin (Nauczanie Indywidualne – NI, Nauczyciel Wspomagający w klasie, Rewalidacja, Terapia Korekcyjno-Kompensacyjna).
    *   **Lokalizacja Nauczania Indywidualnego**: Wybór miejsca realizacji zajęć NI – w budynku szkoły (sala/gabinet) lub w domu ucznia (poza szkołą).
    *   **Dedykowany Tryb USPE i Rozdysponowanie Pul**: Przydział godzin z puli, wskazanie nauczyciela wspomagającego, przedmiotu szkolnego lub formy terapeutycznej oraz trybu realizacji (w oddziale vs gabinet 1 na 1).
*   **Szablony Struktury Szkoły**: Zapisywanie i wczytywanie konfiguracji z automatyczną promocją klas o jeden poziom wyżej.

### 2. 👨‍🏫 Zaawansowane Zarządzanie Dyżurami Nauczycielskimi (`Dyzury`)
*   **Zarządzanie Obszarami Dyżurów (Miejsca)**: Definiowanie punktów kluczowych w szkole wraz z przypisaniem do pięter i kondygnacji.
*   **Konfiguracja Przerw**: Elastyczny kreator godzin trwania przerw obiadowych i krótkich.
*   **Matryca Harmonogramu**: Interaktywny panel przydzielania nauczycieli do określonych miejsc i przerw w poszczególne dni tygodnia.
*   **Lekcje WF a Dyżury Korytarzowe (Nadzór Szatni i Sal Sportowych)**:
    *   Nauczyciel prowadzący zajęcia WF ma obowiązek opieki nad uczniami w szatniach i salach sportowych — system automatycznie zwalnia go z dyżuru na przyległych przerwach.
    *   Dla nauczycieli dwuprzedmiotowych system inteligentnie rozróżnia charakter prowadzonych lekcji (przy przedmiotach ogólnych nauczyciel jest w pełni dyspozycyjny).
*   **Dyżury Adaptacyjne i Odprowadzające w Klasach 1**: Opieka wychowawców w salach lekcyjnych klas pierwszych oraz dedykowany czas odprowadzania do szatni/świetlicy.
*   **Zadania Poza Tablicą i Personel Niepedagogiczny**: Ewidencja czynności świetlicowych, bibliotecznych, psychologów i pedagogów oraz pracowników obsługi w siatce dyżurów.
*   **Sprawiedliwe Bilansowanie Limitów (FTE)**: Przeliczanie obciążenia wg ekwiwalentu pełnego etatu (18h pensum vs 40h Kodeks Pracy).
*   **Ręczne Oznaczanie Zbędnych Dyżurów**: Możliwość wyłączenia pojedynczego dyżuru (np. zamknięte piętro) jednym kliknięciem z automatyczną korektą zapotrzebowania minutowego.

### 3. 👥 Plan Klas, Równoległe Grupy i Uczniowie ze SPE (`PlanKlas`)
*   **Interaktywny Modal Szybkiej Edycji Komórki**: Błyskawiczny przydział z puli klasy, zastępowanie istniejącej lekcji, przypisanie nauczyciela wspomagającego i wybór sali.
*   **Zaawansowany Model Grup i Partycji**: Obsługa wielu grup w tym samym slocie (np. język angielski gr1 i gr2, WF dziewczęta i chłopcy) bez fałszywych kolizji.
*   **Zajęcia Specjalne w Grupach Łączonych**: Łączenie uczniów ze SPE z różnych oddziałów na zajęcia logopedyczne, psychologiczne i rewalidacyjne ze zsynchronizowanym zapisem.
*   **Karty Wsparcia Psychologiczno-Pedagogicznego**: Wbudowane edytory orzeczeń, WOPFU, IPET oraz planów rewalidacji bezpośrednio w profilu ucznia w panelu bocznym.

### 4. 🏢 Plan Sal i Obłożenie Gabinetów (`PlanSal`)
*   **Wizualna Matryca Obłożenia Sal**: Wgląd w stan każdego gabinetu w szkole, piętro po piętrze i godzina po godzinie.
*   **Bezpośrednie Mapowanie Strukturalne**: Pełne wsparcie grup oddziałowych i międzyoddziałowych oparte na bezpiecznych metadanych strukturalnych (`_bridgeMeta.classId`, `_bridgeMeta.groupId`), bez podatnego na błędy parsowania ciągów tekstowych.
*   **Wykrywanie Kolizji Sal**: Automatyczne ostrzeżenia o podwójnym zajęciu gabinetu z inteligentnym uwzględnieniem sal gimnastycznych i boisk.
*   **Automatyczny Optymalizator Przydziału Sal**: Algorytm dopasowujący gabinety lekcyjne do preferencji klasowych (pracownie stałe oddziałów) i przedmiotowych (np. laboratoria, pracownie komputerowe).

### 5. 🔍 Tryb Porównywania Wariantów Split-Screen Diff (`SplitScreenDiffViewer`)
*   **Równoległe Zestawienie Wariantów Planu**: Widok side-by-side dla dowolnych dwóch wersji lub semestrów planu zajęć.
*   **Wizualny Silnik Różnicowy**: Dynamiczne podświetlanie dodanych (+), usuniętych (-), zmienionych (~) i identycznych komórek lekcji.
*   **Cherry-picking Lekcji**: Selektywne przenoszenie pojedynczych zajęć z wariantu alternatywnego do głównego za pomocą jednego kliknięcia z bieżącą kontrolą kolizji.

### 6. 📊 Moduł Wydruków, Płachta Dyrektorska i Tablica TV (`Wydruki`)
*   **📜 Płachta Dyrektorska (Wielkoformatowy Arkusz Szkoły A3 / A2 / A4)**:
    *   Panoramiczne zestawienie pracy całej szkoły w jednym arkuszu (dla 25–50 klas lub 40–60 pedagogów).
    *   Wielostronicowy podział na dni (Pn–Pt, każdy dzień na osobnej karcie A3 Poziomo z kompletem godzin).
    *   Auto-dopasowanie rozmiaru czcionek, podział kolumn na części (Część 1 / Część 2), oficjalne skróty z Kreatora oraz metryka podpisu Dyrektora Szkoły.
*   **📺 Tablica Informacyjna TV / Tryb Rzutnika (Kiosk Mode)**:
    *   Pełnoekranowy interfejs na telewizory i monitory w holu szkoły lub pokoju nauczycielskim.
    *   Zegar czasu rzeczywistego, odliczanie do najbliższego dzwonka oraz dynamiczne ukrywanie okienek.

### 7. 🤖 Inteligentny Generator Planu Lekcji (`PlanGenerator`)
*   **Zaawansowany Model Zajętości Grup**: Układanie zajęć z uwzględnieniem podziałów na grupy (`klasa|dzień|godzina|groupId`), partycji grup i preferencji równoległego układania.
*   **Wsparcie Klas Powiązanych i Nauczycieli Wspomagających**: Weryfikacja jednoczesnej dostępności nauczycieli prowadzących i wspomagających oraz sal lekcyjnych.
*   **Zintegrowana Kontrola Końcowa**: Sprawdzenie ułożonego planu przez dedykowany silnik detekcji konfliktów `detectConflicts`.

### 8. 🛡️ Niezawodna Architektura Trwałości i Bezpieczeństwo RODO
*   **Kryptografia AES-256-GCM (Format encrypted-v2)**: 600 000 iteracji PBKDF2 (SHA-256), jednorazowy klucz sesyjny w pamięci RAM, brak haseł w `sessionStorage`.
*   **Atomowa Transakcja Zapisu (`commitState`) i Web Locks**: Bezpieczny zapis stanu z weryfikacją numeru rewizji, kolejkowaniem promisów i wykluczeniem wzajemnym między kartami przez `navigator.locks`.
*   **Niezawodny Autozapis z Przerzedzaniem**: Zapis w dyskretnych kluczach `autosave_<ts>` z redukcją do 3 wersji na godzinę przez 24 h i 1 na dobę przez 14 dni.
*   **Menedżer Punktów Przywracania (Limit 30 Migawek)**: Bezwzględna ochrona kopii ręcznych (`isManual: true`), automatyczna rotacja najstarszych kopii technicznych oraz ostrzeżenia o rozmiarze pamięci (> 10 MB).
*   **Scentralizowany Dziennik Błędów (`logAppError`)**: Bezpieczne rejestrowanie błędów w `dbStorage` z limitem 50 wpisów i obcinaniem śladu stosu do 1 kB.

---

## 🛠️ Stack Technologiczny

| Warstwa | Technologia | Zastosowanie |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **TypeScript** | Deklaratywny interfejs, ścisłe typowanie modeli szkolnych |
| **Narzędzie budowania** | **Vite 6** | Błyskawiczny bundler i serwer deweloperski |
| **Stylowanie** | **Tailwind CSS v4** | Nowoczesny, responsywny interfejs |
| **Trwałość danych** | **IndexedDB** (Promise-based) + **Web Locks API** | Lokalna baza danych bez limitu 5 MB, atomowe transakcje |
| **Kryptografia** | **Web Crypto API** (AES-256-GCM, PBKDF2) | Pełne szyfrowanie danych placówki i ochrony RODO w RAM |
| **Walidacja** | **Zod** | Walidacja integralności struktur danych i odporność na uszkodzenia |
| **Drag & Drop** | **@dnd-kit/core** | Ergonomiczne przeciąganie lekcji i sal |
| **PWA** | **Service Worker** (Cache-First + Navigation Race) | Praca w trybie offline, instalacja jako aplikacja pulpitu |
| **Testy** | **Vitest** + **@testing-library/react** + **fake-indexeddb** | Ponad 200 zautomatyzowanych testów jednostkowych i integracyjnych |

---

## 💻 Uruchomienie Lokalne i Budowanie

### Wymagania wstępne:
*   Node.js w wersji **18.0** lub nowszej
*   Menedżer pakietów **npm**

### Instalacja zależności:
```bash
npm install
```

### Uruchomienie serwera deweloperskiego:
```bash
npm run dev
```
Aplikacja będzie dostępna pod adresem: `http://localhost:3000`.

### Uruchomienie testów jednostkowych:
```bash
npm test
```

### Budowanie wersji produkcyjnej:
```bash
npm run build
```
Zoptymalizowane pliki wynikowe zostaną wygenerowane w katalogu `dist/`.

---

## 📜 Historia Wydań i Wprowadzane Zmiany

Szczegółowy wykaz wszystkich zmian, nowości, poprawek oraz historii kolejnych wersji programu znajduje się w dedykowanym pliku:

👉 **[Zobacz pełną historię wydań w pliku CHANGELOG.md](./CHANGELOG.md)**

---

## 📄 Licencja

Projekt objęty jest **Wolną Licencją Domowo-Edukacyjną (Zastrzeżoną) — WLDE**.  
Bezpłatny do użytku prywatnego oraz w placówkach oświatowych. Kopiowanie, odsprzedaż i komercjalizacja bez pisemnej zgody Autora są zabronione.

**Autor**: mgr Krzysztof Jureczek  
Copyright © 2026 Krzysztof Jureczek. Wszelkie prawa zastrzeżone.
