import React, { useState } from 'react';
import { 
  Calendar, Tag, Sparkles, CheckCircle2, AlertTriangle, ArrowUpCircle, Info, HelpCircle, ChevronRight, Activity, Filter
} from 'lucide-react';

interface ChangeItem {
  type: 'feature' | 'improvement' | 'fix' | 'security';
  text: string;
  badgeText?: string;
}

interface Version {
  version: string;
  date: string;
  title: string;
  description: string;
  badge?: string;
  changes: ChangeItem[];
}

export default function Changelog() {
  const [filter, setFilter] = useState<'all' | 'feature' | 'improvement' | 'fix'>('all');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const versions: Version[] = [
    {
      version: 'v3.7.2',
      date: 'Wrzesień 2026',
      title: 'Szczegółowy Plan Nauczycieli z Właściwymi Salami i Dyżurami Międzylekcyjnymi',
      description: 'Kompleksowa rozbudowa modułu Wydruki i Publikacje: w komórkach planu tygodniowego nauczycieli wyświetlane są pełne dane (przedmiot, klasa z oznaczeniem grupy oraz rzeczywista sala przypisana w Planie Sal / Etap 2, zamiast sal sugerowanych), a pomiędzy godzinami lekcyjnymi zintegrowano wiersze przerw z wyznaczonymi dyżurami nauczycielskimi i ich lokalizacją.',
      badge: 'Najnowsza',
      changes: [
        { type: 'fix', text: 'Precyzyjne pobieranie sali z Planu Sal: Wyeliminowano problem wyświetlania sal sugerowanych lub notatek – w planach nauczycieli i klas na wydrukach wyświetlana jest teraz rzeczywista sala lekcyjna wynikająca z faktycznego przydziału w matrycy sal (Plan Sal / schedData).', badgeText: 'Plan Sal' },
        { type: 'feature', text: 'Zintegrowano wyświetlanie dyżurów międzylekcyjnych w planie nauczycieli – harmonogram dyżurów jest automatycznie wstrzykiwany w wiersze przerw pomiędzy lekcjami (wraz z nazwą miejsca i piętrem).', badgeText: 'Dyżury' },
        { type: 'feature', text: 'Wdrożono czytelny, pionowy układ danych w komórkach planu nauczyciela: Przedmiot (wyraźny nagłówek), Klasa (z grupą np. "3a (gr1)") oraz Sala lekcyjna (np. "s. 104"), bez zbędnych obwódek.', badgeText: 'Układ Lekcji' },
        { type: 'improvement', text: 'Dodano przełącznik „Dyżury na przerwach” w panelu sterowania wydrukami oraz w widoku podglądu tygodniowego, pozwalający na elastyczne włączanie lub ukrywanie przerw z dyżurami.', badgeText: 'Kontrola Druku' },
        { type: 'improvement', text: 'Zapewniono pełną zgodność z oboma etapami planowania: Etap 1 (Plan Klas) oraz Etap 2 (Plan Sal / Obłożenie Gabinetów) oraz przy eksporcie do kalendarza (.ics).', badgeText: 'Kompatybilność' }
      ]
    },
    {
      version: 'v3.7.1',
      date: 'Sierpień / Wrzesień 2026',
      title: 'Optymalizacja Wydruków Płachty Gabinetów oraz Autonaprawa Pamięci Podręcznej',
      description: 'Aktualizacja usprawniająca generowanie i drukowanie macierzy gabinetów (płachty sal) w orientacji poziomej, wdrożenie minimalistycznego, wysoce czytelnego układu pionowego danych w komórkach (klasa, grupa, przedmiot, nauczyciel bez zbędnych ramek i obwódek) oraz zaawansowanych mechanizmów autokorekty stanu i awaryjnego resetu pamięci podręcznej.',
      badge: 'Stabilna',
      changes: [
        { type: 'feature', text: 'Zoptymalizowano prezentację danych w komórkach płachty sal: dane ułożone przejrzyście jedno pod drugim (Klasa, Grupa, Przedmiot, Nauczyciel) bez zbędnych ramek, cieni i plakietek, co zapewnia maksymalną ostrość i czytelność dla uczniów i nauczycieli po wydrukowaniu.', badgeText: 'Układ Komórek' },
        { type: 'fix', text: 'Wyeliminowano powtórzenia wpisów i dublowanie etykiet w komórkach płachty sal na wydrukach (deduplikacja lekcji, oczyszczenie nazw klas ze wstrzykniętych nazw przedmiotów).', badgeText: 'Wydruki Sal' },
        { type: 'improvement', text: 'Zoptymalizowano formatowanie i dopełnienia tabeli wydruku gabinetów z regułami ochrony przed dzieleniem stron (break-inside: avoid), zapewniając idealne dopasowanie arkusza do formatu A4.', badgeText: 'Druk A4' },
        { type: 'improvement', text: 'Wdrożono automatyczną autokorektę i łagodne uzgadnianie powiązań (sortAppState i sanitizeAppState), zapobiegając błędom aplikacji przy wczytywaniu niekompletnych struktur danych.', badgeText: 'Stabilność' },
        { type: 'feature', text: 'Dodano funkcję „Awaryjny reset pamięci podręcznej” w module ErrorBoundary umożliwiającą natychmiastowe przywrócenie poprawnego działania aplikacji jednym kliknięciem.', badgeText: 'Autonaprawa' }
      ]
    },
    {
      version: 'v3.7.0',
      date: 'Wrzesień 2026',
      title: 'Obsługa Równoległych Zajęć w Grupach na Tej Samej Godzinie w Planie Klas',
      description: 'Przełomowa funkcja w module Plan Klas umożliwiająca jednoczesne prowadzenie zajęć w grupach (np. Informatyka gr1 i Informatyka gr2, Język angielski gr1 i gr2, WF chłopcy i WF dziewczęta) w tym samym slocie godzinowym przez różnych nauczycieli w oddzielnych salach, z czytelnym oznaczeniem grup i brakiem fałszywych kolizji.',
      badge: 'Stabilna',
      changes: [
        { type: 'feature', text: 'Wprowadzono możliwość wstawiania wielu zajęć grupowych w tym samym oknie godzinowym (np. gr1 i gr2) dla tej samej klasy – każda grupa ma przypisanego swojego nauczyciela i salę.', badgeText: 'Grupy' },
        { type: 'feature', text: 'Dodano czytelne, kolorowe plakietki grup (np. "👥 gr1", "👥 gr2", "👥 chł", "👥 dz") wewnątrz kafelków lekcji w planie pojedynczym oraz w widoku wszystkich klas.', badgeText: 'Wizualizacja' },
        { type: 'improvement', text: 'Zmodernizowano silnik detekcji kolizji – system nie zgłasza fałszywego konfliktu dla różnych grup tej samej klasy odbywających lekcje w tej samej godzinie, ani dla obiektów sportowych (hala, basen, sale gimnastyczne, orlik), na których może przebywać wiele grup/klas jednocześnie.', badgeText: 'Obiekty Sportowe' },
        { type: 'improvement', text: 'Dodano przycisk szybkiego wstawiania "+ Dodaj 2. grupę" w zajętych częściowo slotach godzinowych oraz pełne wsparcie dla przeciągania i pędzla.', badgeText: 'Ergonomia' },
        { type: 'improvement', text: 'Zsynchronizowano generowanie wydruków i transfer do Planu Sal (Etap 2) z pełną obsługą wielu grup na jednej godzinie lekcyjnej.', badgeText: 'Wydruki & Mostek' }
      ]
    },
    {
      version: 'v3.6.0',
      date: 'Wrzesień 2026',
      title: 'Szablony Struktury Szkoły – Zapis i Wczytywanie Konfiguracji Nowego Roku Szkolnego',
      description: 'Nowy, kompleksowy moduł w Kreatorze Szkoły umożliwiający błyskawiczny zapis aktualnej struktury organizacyjnej szkoły (klasy i grupy, grono pedagogiczne z pensum, przedmioty, budynki, sale i pracownie) jako wielorazowy szablon. Pozwala to na zainicjowanie nowego roku szkolnego bez żmudnego, ręcznego wpisywania danych od zera z opcjonalną automatyczną promocją roczników.',
      badge: 'Stabilna',
      changes: [
        { type: 'feature', text: 'Dodano funkcję zapisu bieżącego stanu szkoły do uniwersalnego szablonu struktury (SchoolStructureTemplate) z możliwością wyboru zapisywanych modułów (klasy, nauczyciele, sale, przedmioty, dyżury).', badgeText: 'Szablony' },
        { type: 'feature', text: 'Wprowadzono automatyczną promocję klas o jeden poziom wyżej (np. 1A → 2A, 2B → 3B, a oddziały 8/4LO opuszczają szkołę) z zachowaniem wychowawstw i sal.', badgeText: 'Promocja Klas' },
        { type: 'feature', text: 'Dodano wbudowane szablony wzorcowe dla Szkoły Podstawowej (SP 1-8) oraz Liceum Ogólnokształcącego (LO 1-4) z kompletną siatką przedmiotów MEN i strukturą sal.', badgeText: 'Wzorce' },
        { type: 'feature', text: 'Wdrożono eksport i import szablonów struktury do pojedynczego pliku JSON – możliwość współdzielenia sprawdzonych struktur między placówkami i administratorami.', badgeText: 'Eksport / Import' },
        { type: 'feature', text: 'Zintegrowano szybki dostęp do Szablonów Struktury bezpośrednio z poziomu paska bocznego Kreatora Szkoły, Kroku 1 (Dane Szkoły) oraz Kroku 10 (Podsumowanie i Start).', badgeText: 'Kreator Szkoły' },
        { type: 'improvement', text: 'Wszystkie szablony są trwale przechowywane w lokalnej bazie IndexedDB (klucz STRUCTURE_TEMPLATES) z automatyczną kopią bezpieczeństwa w archiwum przed wdrożeniem nowego roku.', badgeText: 'Trwałość' }
      ]
    },
    {
      version: 'v3.5.0',
      date: 'Sierpień 2026',
      title: 'Centrum Wieloosobowego Scalania i Selektywnego Importu Danych (Klasy 1-3, 4-8, Dyżury)',
      description: 'Przełomowy moduł pracy zespołowej umożliwiający scalanie planów przygotowywanych przez różne osoby (np. siatka lekcji od dyrekcji, sale edukacji wczesnoszkolnej 1-3 od jednego zespołu, sale klas 4-8 od drugiego oraz harmonogram dyżurów od koordynatora) w jeden spójny, kompletny plan szkolny bez ryzyka nadpisania pracy innych.',
      badge: 'Stabilna',
      changes: [
        { type: 'feature', text: 'Wprowadzono wieloplikowe wczytywanie i kolejkę plików JSON (możliwość zaznaczenia wielu plików naraz, dodawania kolejnych oraz przeciągania Drag & Drop).', badgeText: 'Praca Zespołowa' },
        { type: 'feature', text: 'Dodano inteligentne profile scalania jednym kliknięciem: "🌟 Inteligentny podział ról", "🎓 Siatka lekcji", "🧸 Sale klas 1-3", "🏫 Sale klas 4-8", "🛡️ Dyżury" oraz "🔄 Wszystko (Zastąp)".', badgeText: 'HIT' },
        { type: 'feature', text: 'Wdrożono granularne filtry zakresu klas (wszystkie oddziały, tylko edukacja wczesnoszkolna 1-3, tylko klasy 4-8 lub precyzyjny wybór z listy klas).', badgeText: 'Filtry' },
        { type: 'feature', text: 'Zaimplementowano selektywne scalanie obłożenia sal (Plan Sal / Etap 2) z zachowaniem już przypisanych gabinetów pozostałych roczników oraz obsługą sal wieloklasowych (np. sale gimnastyczne).', badgeText: 'Plan Sal' },
        { type: 'feature', text: 'Dodano możliwość łączenia bazy nauczycieli i przedmiotów w trybie "Dołącz nowych / uzupełnij brakujące" (bez niszczenia istniejących danych).', badgeText: 'Kadra & Zasoby' },
        { type: 'feature', text: 'Wdrożono interaktywną kartę "Podgląd Scalenia" prezentującą dokładny bilans wynikowy (liczba oddziałów, nauczycieli, lekcji, obłożenie sal 1-3 vs 4-8 oraz dyżury) przed zatwierdzeniem.', badgeText: 'Podgląd' },
        { type: 'security', text: 'Dodano automatyczne tworzenie punktu przywracania (Undo) przed wykonaniem każdego scalenia wieloplikowego, gwarantując 100% bezpieczeństwo danych.', badgeText: 'Bezpieczeństwo' }
      ]
    },
    {
      version: 'v3.4.0',
      date: 'Sierpień 2026',
      title: 'Migracja silnika bazy danych na IndexedDB – zniesienie limitu 5 MB dla dużych szkół',
      description: 'Przełomowa modernizacja warstwy przechowywania danych. Dotychczasowy magazyn localStorage z limitem 5 MB został zastąpiony zaawansowanym adapterem IndexedDB o niemal nieograniczonej pojemności (setki megabajtów / gigabajty), zapewniając płynną pracę największym placówkom oświatowym z setkami oddziałów i rozbudowaną historią autozapisów.',
      badge: 'Stabilna',
      changes: [
        { type: 'feature', text: 'Wprowadzono moduł Selektywnego Eksportu i Importu danych (JSON) – możliwość precyzyjnego wyboru, które elementy mają zostać zapisane lub wczytane (plan lekcji, konfiguracja zasobów i sal, archiwum roczne, migawki snapshotów, dziennik zdarzeń).', badgeText: 'Eksport/Import' },
        { type: 'feature', text: 'Wdrożono maskowanie wpisywanego hasła (kropki/gwiazdki) z dedykowanym przełącznikiem oraz checkboxem „Pokaż hasło” w oknach eksportu i odszyfrowywania kopii.', badgeText: 'Bezpieczeństwo' },
        { type: 'feature', text: 'Wdrożono asynchroniczny silnik IndexedDB jako główne źródło prawdy (Source of Truth) dla stanu aplikacji, siatki lekcji, archiwum rocznego, punktów przywracania (snapshotów) oraz logów audytowych.', badgeText: 'Baza Danych' },
        { type: 'feature', text: 'Wprowadzono automatyczną, bezstratną migrację danych z dotychczasowego localStorage do IndexedDB przy pierwszym uruchomieniu po aktualizacji.', badgeText: 'Migracja' },
        { type: 'feature', text: 'Dodano dynamiczny wskaźnik stanu bazy IndexedDB w stopce aplikacji z podglądem zajętości oraz informacją o dostępnej przestrzeni bez ograniczeń.', badgeText: 'UI' },
        { type: 'improvement', text: 'Zwiększono liczbę bezpiecznych wersji autozapisu w locie oraz rozbudowano przestrzeń na punkty przywracania stanu bez obaw o przekroczenie limitów przeglądarki.', badgeText: 'Wydajność' },
        { type: 'security', text: 'Zachowano 100% filozofię Offline-First: żadne dane szkolne, osobowe czy harmonogramy nie opuszczają urządzenia i nie są wysyłane do chmury.', badgeText: 'RODO/GDPR' }
      ]
    },
    {
      version: 'v3.3.0',
      date: 'Lipiec 2026',
      title: 'Optymalizacja wydajności, podział kodu (Code Splitting) oraz porządki w zależnościach',
      description: 'Główna aktualizacja optymalizacyjna wprowadzająca dynamiczne ładowanie modułów (React.lazy / Suspense), zaawansowany podział paczek (manualChunks w Rollup/Vite), redukcję nieużywanych pakietów oraz czyszczenie logów produkcyjnych.',
      badge: 'Stabilna',
      changes: [
        { type: 'improvement', text: 'Wdrożono leniwe ładowanie modułów (React.lazy + Suspense) dla wszystkich głównych zakładek aplikacji (Kreator, Plan Klas, Plan Sal, Dyżury, Wydruki, Statystyki, Ustawienia, O programie, Menedżer snapshotów), znacznie przyspieszając wstępne ładowanie strony.', badgeText: 'Wydajność' },
        { type: 'improvement', text: 'Skonfigurowano podział paczek produkcyjnych (Code Splitting / manualChunks) w Vite dla zewnętrznych bibliotek (Recharts, Lucide, Motion, React), redukując rozmiar głównego pliku JS poniżej 500 kB.', badgeText: 'Vite' },
        { type: 'improvement', text: 'Usunięto nieużywane zależności z package.json (express, dotenv, @google/genai, sharp) oraz zaktualizowano plik lockfile, zmniejszając rozmiar instalacji projektu.', badgeText: 'Pakiety' },
        { type: 'security', text: 'Owinięto bloki logowania i diagnostyki snapshotów warunkiem import.meta.env.DEV, eliminując zbędne komunikaty w konsoli na środowisku produkcyjnym.', badgeText: 'Bezpieczeństwo' },
        { type: 'fix', text: 'Zaktualizowano dane kontaktowe w pliku licencji (kjureczek@proton.me oraz organizacja GitHub krzjur-oss) oraz poprawiono konfigurację weryfikacyjną GitHub Actions (node-version: 20).', badgeText: 'Poprawka' }
      ]
    },
    {
      version: 'v3.2.1',
      date: 'Lipiec 2026',
      title: 'Zarządzanie rejestrem błędów diagnostycznych oraz rozbudowa portfolio projektów autorskich',
      description: 'Aktualizacja wprowadza możliwość bezpośredniego usuwania logów diagnostycznych z pamięci przeglądarki z poziomu panelu Statystyk oraz rozszerza wykaz polecanych, przydatnych aplikacji oświatowych i użytkowych w zakładce O programie.',
      changes: [
        { type: 'feature', text: 'Dodano dedykowany przycisk czyszczenia rejestru błędów systemowych z pamięci lokalnej przeglądarki (localStorage) w module Statystyk (Dziennik Błędów).', badgeText: 'Logi' },
        { type: 'feature', text: 'Dodano aplikację SCANVENTORY (https://krzjur-oss.github.io/isk/) do wykazu innych programów autorskich w zakładce informacyjnej.', badgeText: 'Projekty' },
        { type: 'feature', text: 'Dodano grę edukacyjną Szkoła Myszki (https://krzjur-oss.github.io/Szkola-myszki/) do sekcji oprogramowania wspierającego uczniów i nauczycieli.', badgeText: 'Projekty' },
        { type: 'improvement', text: 'Wdrożono okno dialogowe z potwierdzeniem chęci usunięcia logów diagnostycznych w celu zabezpieczenia przed przypadkowym skasowaniem wpisów.', badgeText: 'Bezpieczeństwo' }
      ]
    },
    {
      version: 'v3.2.0',
      date: 'Lipiec 2026',
      title: 'Szybka zbiorcza edycja pensum, pasek wyszukiwania nauczycieli i natychmiastowy autozapis',
      description: 'Najnowsza wersja koncentruje się na znacznym przyspieszeniu zarządzania pensum całej kadry nauczycielskiej jednocześnie, wprowadzeniu błyskawicznego wyszukiwania w bazie kadrowej oraz bezkompromisowym bezpieczeństwie danych dzięki natychmiastowemu autozapisowi przy przełączaniu modułów.',
      changes: [
        { type: 'feature', text: 'Dodano dynamiczną tabelę do szybkiej edycji pensum (etatów) oraz nadgodzin wszystkich nauczycieli jednocześnie w Kroku 6 Kreatora Szkoły.', badgeText: 'HIT' },
        { type: 'feature', text: 'Wdrożono inteligentne filtry kategorii kadry (Wszyscy, Kadra kierownicza, Obniżone pensum, Standard, Nieaktywni) z licznikami w czasie rzeczywistym.', badgeText: 'Kadra' },
        { type: 'feature', text: 'Dodano szablony jednego kliknięcia (Dyrektor 0h, Wicedyrektor 12h, Obniżone 15h, Etat 18h) do błyskawicznego nadawania pensum.', badgeText: 'Błyskawiczne' },
        { type: 'feature', text: 'Dodano responsywny pasek wyszukiwania nad tabelą szybkiej edycji pensum, umożliwiający błyskawiczne znajdowanie nauczycieli w dużej bazie kadrowej.', badgeText: 'Szukaj' },
        { type: 'improvement', text: 'Wprowadzono mechanizm wymuszający natychmiastowy, bezpośredni zapis stanu do localStorage przy każdym przełączeniu modułu/zakładki w bocznej nawigacji, całkowicie eliminując ryzyko utraty danych.', badgeText: 'Bezpieczeństwo' },
        { type: 'improvement', text: 'Dodano w czasie rzeczywistym podsumowanie statystyczne w stopce szybkiej edycji (średnie pensum w szkole, całkowita suma nadgodzin, licznik odfiltrowanych osób).', badgeText: 'Statystyka' }
      ]
    },
    {
      version: 'v3.1.0',
      date: 'Lipiec 2026',
      title: 'Wykresy zapotrzebowania na dyżury, funkcje administracyjne kadry oraz przestrzenie przejściowe',
      description: 'Aktualizacja wprowadzająca zaawansowaną analitykę "godzin szczytu" dyżurów za pomocą biblioteki recharts, możliwość oznaczania ról administracyjnych kadry pedagogicznej oraz graficzne oznaczenie korytarzy i schodów o charakterze przejściowym.',
      changes: [
        { type: 'feature', text: 'Dodano interaktywny wykres słupkowy (Recharts) w zakładce Statystyki, wizualizujący zapotrzebowanie na dyżury z podziałem na poszczególne przerwy w celu identyfikacji godzin szczytu.', badgeText: 'HIT' },
        { type: 'feature', text: 'Wprowadzono funkcjonalność oznaczania ról administracyjnych nauczycieli (np. Dyrektor, Wicedyrektor, Kierownik) w kroku 6 Kreatora Szkoły.', badgeText: 'Kadra' },
        { type: 'improvement', text: 'Dodano graficzne wyróżnienie ("Przejściowy 🚶‍♂️") dla miejsc dyżurowania o charakterze przejściowym (łączniki, szatnie, przejścia) w module Dyżurów.', badgeText: 'Wizualne' },
        { type: 'improvement', text: 'Dodano filtry analizy dyżurów według dni tygodnia (oraz widok zbiorczy całego tygodnia) wraz ze szczegółowymi wskaźnikami KPI (pokrycie, wakaty).', badgeText: 'Analityka' },
        { type: 'fix', text: 'Naprawiono błąd dopasowania pięter przy weryfikacji i walidacji aktywności korytarzy w harmonogramie dyżurów.' }
      ]
    },
    {
      version: 'v3.0.0',
      date: 'Lipiec 2026',
      title: 'Wdrożenie trybu prezentacji, optymalizacja drag & drop oraz ulepszenia administracyjne',
      description: 'Główna aktualizacja koncentrująca się na ułatwieniu demonstrowania planu lekcji i dyżurów, poprawie ergonomii pracy oraz znacznym zwiększeniu wydajności przy renderowaniu dużych siatek godzinowych.',
      changes: [
        { type: 'feature', text: 'Dodano pełnoekranowy "Tryb Prezentacji" (Eye / EyeOff), który ukrywa boczne panele nawigacyjne, ułatwiając wyświetlanie planu na rzutnikach lub dużych ekranach.', badgeText: 'HIT' },
        { type: 'improvement', text: 'Zablokowano możliwość edycji i przeciągania elementów (lekcji i nauczycieli) w trybie prezentacji, zapobiegając przypadkowym zmianom.', badgeText: 'Bezpieczeństwo' },
        { type: 'improvement', text: 'Przebudowano układ dyżurów w trybie prezentacji na czysty, czterokolumnowy widok bez zbędnych statystyk i pustych przycisków.', badgeText: 'Ergonomia' },
        { type: 'fix', text: 'Naprawiono problem z brakiem eksportu niektórych ikon ("TvOff") w bibliotece lucide-react poprzez przejście na standardowe, uniwersalne ikony "Eye" i "EyeOff".' },
        { type: 'improvement', text: 'Optymalizacja pozycjonowania i zachowania kursora podczas operacji drag & drop na ekranach dotykowych i urządzeniach mobilnych.' },
        { type: 'improvement', text: 'Zaktualizowano sekcję "O programie" o precyzyjne informacje o autorze, jego lokalizacji (Tarnowskie Góry) oraz motywacji (porządek i automatyzacja administracji).' }
      ]
    },
    {
      version: 'v2.1.0',
      date: 'Czerwiec 2026',
      title: 'Wyszukiwarka i zaawansowany system walidacji w czasie rzeczywistym',
      description: 'Wprowadzenie ulepszeń usprawniających codzienną pracę administracyjną, kładących nacisk na błyskawiczne lokalizowanie zasobów i automatyczną ewidencję braków.',
      changes: [
        { type: 'feature', text: 'Wdrożono real-time filtry wyszukiwania nauczycieli i klas w panelach bocznych.' },
        { type: 'improvement', text: 'Zintegrowano automatyczny kalkulator wymiaru godzin lekcyjnych nauczyciela (etat / siatka godzin) w panelu bilansu dyżurów.' },
        { type: 'feature', text: 'Wprowadzono system ostrzeżeń o kolizjach sal lekcyjnych (gdy ta sama sala zostanie przydzielona dwóm klasom jednocześnie).' },
        { type: 'fix', text: 'Rozwiązano błąd nakładania się tooltipów z notatkami w widoku tygodniowym planu klas.' }
      ]
    },
    {
      version: 'v2.0.0',
      date: 'Kwiecień 2026',
      title: 'Moduł Planowania Sal i Grafik Dyżurów Nauczycielskich',
      description: 'Ogromny krok naprzód – rozbudowa aplikacji o Etap 2 (Plan Sal) i Etap 3 (Dyżury), czyniąca z SalePlan Pro kompletny system organizacji tygodnia szkolnego.',
      badge: 'Stabilna',
      changes: [
        { type: 'feature', text: 'Uruchomiono Etap 2: Plan Sal z dynamiczną siatką gabinetów lekcyjnych i podglądem zajętości w poszczególnych godzinach.' },
        { type: 'feature', text: 'Uruchomiono Etap 3: Dyżury Nauczycielskie z interaktywną mapą rejonów dyżurowania i czasem trwania przerw.' },
        { type: 'feature', text: 'Wdrożono zaawansowany algorytm "Auto-sugestia dyżurów" analizujący okienka i dostępność nauczycieli.' },
        { type: 'security', text: 'Dodano mechanizm szyfrowania i deszyfrowania lokalnych kopii zapasowych (backupów JSON) kluczem użytkownika.' }
      ]
    },
    {
      version: 'v1.0.0',
      date: 'Luty 2026',
      title: 'Inicjalne wydanie SalePlan Pro',
      description: 'Premiera pierwszego wydania systemu, oferującego nowoczesne, w pełni lokalne środowisko do zarządzania bazowym planem lekcji klas oświatowych.',
      changes: [
        { type: 'feature', text: 'Stworzono Etap 1: Plan Klas – interaktywna siatka godzin lekcyjnych z inteligentnym podziałem na grupy językowe i WF.' },
        { type: 'feature', text: 'Zaimplementowano bazę danych nauczycieli, oddziałów klasowych oraz przedmiotów szkolnych.' },
        { type: 'improvement', text: 'Wprowadzono system Offline-First oparty o localStorage – zero wysyłania danych na zewnętrzne serwery.' },
        { type: 'feature', text: 'Stworzono panel statystyk z automatycznym audytem braków kadrowych i błędów w siatce.' }
      ]
    }
  ];

  // Statystyki zmian
  const totalVersions = versions.length;
  const totalChangesCount = versions.reduce((sum, v) => sum + v.changes.length, 0);
  const featuresCount = versions.reduce((sum, v) => sum + v.changes.filter(c => c.type === 'feature').length, 0);

  const getFilteredVersions = () => {
    if (filter === 'all') return versions;
    return versions.map(v => ({
      ...v,
      changes: v.changes.filter(c => c.type === filter)
    })).filter(v => v.changes.length > 0);
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'improvement':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'fix':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'security':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'feature': return 'Nowość';
      case 'improvement': return 'Ulepszenie';
      case 'fix': return 'Poprawka';
      case 'security': return 'Bezpieczeństwo';
      default: return 'Inne';
    }
  };

  const toggleExpand = (ver: string) => {
    setExpandedVersion(expandedVersion === ver ? null : ver);
  };

  const filteredVersions = getFilteredVersions();

  return (
    <div className="space-y-6 animate-fade-in" id="component-changelog">
      {/* PANEL STATYSTYK I FILTRÓW */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Activity size={16} className="text-blue-500 animate-pulse" /> Statystyki rozwoju systemu
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Chronologiczny zapis prac, poprawek i ulepszeń podnoszących komfort administracji.</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <div className="text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Wydania</p>
              <p className="text-sm font-black text-slate-800">{totalVersions}</p>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">Zmiany</p>
              <p className="text-sm font-black text-slate-800">{totalChangesCount}</p>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Nowe Funkcje</p>
              <p className="text-sm font-black text-emerald-600">{featuresCount}</p>
            </div>
          </div>
        </div>

        {/* PRZYCISKI FILTROWANIA */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1 mr-1">
            <Filter size={11} /> Filtruj zmiany:
          </span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'all' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Wszystkie ({totalChangesCount})
          </button>
          <button
            onClick={() => setFilter('feature')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'feature' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nowości ({featuresCount})
          </button>
          <button
            onClick={() => setFilter('improvement')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'improvement' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ulepszenia ({versions.reduce((sum, v) => sum + v.changes.filter(c => c.type === 'improvement').length, 0)})
          </button>
          <button
            onClick={() => setFilter('fix')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'fix' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Poprawki ({versions.reduce((sum, v) => sum + v.changes.filter(c => c.type === 'fix').length, 0)})
          </button>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-8 py-2">
        {filteredVersions.map((v, vIdx) => {
          const isExpanded = expandedVersion === v.version;
          return (
            <div key={v.version} className="relative group animate-fade-in">
              {/* Kropka osi czasu */}
              <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                vIdx === 0 
                  ? 'border-blue-600 ring-4 ring-blue-50 scale-110' 
                  : 'border-slate-300 group-hover:border-slate-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${vIdx === 0 ? 'bg-blue-600' : 'bg-slate-400'}`} />
              </div>

              {/* Karta wersji */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-xs">
                {/* Nagłówek Karty */}
                <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black text-slate-800 font-mono tracking-tight">{v.version}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                        <Calendar size={10} /> {v.date}
                      </span>
                      {v.badge && (
                        <span className="bg-blue-100 text-blue-800 font-black text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                          {v.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-700 leading-snug">
                      {v.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => toggleExpand(v.version)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition shrink-0 cursor-pointer"
                  >
                    {isExpanded ? 'Ukryj opis' : 'Szczegóły wydania'}
                  </button>
                </div>

                {/* Opis / Rozwinięcie */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 text-[11px] md:text-xs text-slate-500 leading-relaxed animate-fade-in flex gap-2.5 items-start">
                    <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <p>{v.description}</p>
                  </div>
                )}

                {/* Lista zmian */}
                <div className="p-5 md:p-6 space-y-3.5">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    Lista wprowadzonych zmian ({v.changes.length}):
                  </p>
                  <div className="space-y-2.5">
                    {v.changes.map((change, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
                        {/* Ikona / znacznik typu */}
                        <span className={`shrink-0 border px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getBadgeStyle(change.type)}`}>
                          {getBadgeLabel(change.type)}
                        </span>
                        
                        {/* Treść */}
                        <div className="flex-1 font-semibold text-slate-700 pt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{change.text}</span>
                          {change.badgeText && (
                            <span className="bg-slate-900 text-amber-300 font-black font-mono text-[8px] uppercase px-1.5 rounded-sm tracking-wide leading-none py-0.5">
                              {change.badgeText}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STOPKA PODPOWIEDZI */}
      <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-500">
        <HelpCircle size={15} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-slate-700 block">Wskazówka dla Użytkownika</span>
          Aplikacja jest stale ulepszana. Masz pomysł na usprawnienie lub znalazłeś błąd? Zgłoś to na naszym repozytorium GitHub, klikając link w panelu informacyjnym po lewej stronie.
        </div>
      </div>
    </div>
  );
}
