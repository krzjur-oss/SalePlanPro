import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Search, CheckCircle2, ChevronRight, ChevronDown, 
  Settings, Calendar, DoorClosed, Coffee, Users, BarChart3, 
  Printer, ShieldCheck, HelpCircle, Sparkles, Lightbulb, 
  AlertTriangle, Layers, Clock, Award, Compass, FileText, ArrowUpRight
} from 'lucide-react';

interface InstructionSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  description: string;
  steps: {
    title: string;
    description: string;
    points: string[];
    tip?: string;
    warning?: string;
  }[];
  faqs?: {
    q: string;
    a: string;
  }[];
}

export default function Instrukcje() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('kreator');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const sections: InstructionSection[] = useMemo(() => [
    {
      id: 'wprowadzenie',
      title: '🧭 Wprowadzenie i Koncepcja Pracy w SalePlan Pro',
      shortTitle: 'Wprowadzenie',
      icon: <Compass size={18} />,
      badge: 'Podstawy',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Poznaj architekturę systemu, zalecany przepływ pracy krok po kroku oraz zasady 100% lokalnego bezpieczeństwa danych szkolnych.',
      steps: [
        {
          title: 'Zalecany optymalny cykl tworzenia planu szkolnego',
          description: 'Układanie planu lekcji w SalePlan Pro przebiega według logicznego, 5-etapowego łańcucha operacji:',
          points: [
            'Krok 1: Kreator Szkoły (Kroki 1–10) – zdefiniuj dni, dzwonki, sale, nauczycieli, grupy, orzeczenia SPE oraz przydziały pensum.',
            'Krok 2: Plan Klas – uruchom automatyczny generator lub ułóż plan ręcznie z wykorzystaniem pędzla, przeciągania (Drag & Drop) i szybkiej edycji komórek.',
            'Krok 3: Plan Sal – przypisz gabinety lekcyjne do zajęć z zachowaniem dedykowanych pracowni (chemia, informatyka, WF) oraz sal stałych klas 1–3.',
            'Krok 4: Grafik Dyżurów – wygeneruj lub rozpisz dyżury nauczycielskie na przerwach, z uwzględnieniem opieki w salach klas pierwszych i dyżurów odprowadzających.',
            'Krok 5: Weryfikacja i Wydruki – sprawdź higienę planu w Statystykach i wydrukuj lub wyeksportuj harmonogramy dla uczniów i nauczycieli w formacie PDF/A4.'
          ],
          tip: 'Przed przystąpieniem do układania siatki godzin upewnij się, że w Kreatorze Szkoły w Kroku 10 bilans godzin przydzielonych dla każdej klasy i nauczyciela jest całkowicie zgodny z arkuszem organizacyjnym.'
        },
        {
          title: '100% lokalna baza danych (IndexedDB) i ochrona RODO',
          description: 'Aplikacja nie wymaga zewnętrznego serwera ani logowania – wszystkie dane chronione są wewnątrz urządzenia:',
          points: [
            'Wszystkie dane szkoły, nazwiska nauczycieli, sale oraz orzeczenia uczniów SPE zapisywane są bezpośrednio w pamięci podręcznej przeglądarki.',
            'Brak wysyłania wrażliwych danych na zewnętrzne serwery w chmurze – pełna zgodność z polskimi przepisami o ochronie danych osobowych (RODO).',
            'Możliwość zabezpieczenia bazy hasłem głównym (szyfrowanie AES-GCM) w menu Bezpieczeństwo.',
            'Funkcja migawek (snapshots) pozwala cofnąć dowolną błędną operację do wcześniejszego stanu w kilka sekund.'
          ],
          warning: 'Czyszczenie historii przeglądarki (pamięci podręcznej i plików cookie) może usunąć bazę danych. Zawsze regularnie pobieraj kopię zapasową pliku JSON (przycisk Kopia / Eksport).'
        }
      ]
    },
    {
      id: 'kreator',
      title: '🏫 Kreator Szkoły (Kroki 1–10 Konfiguracji Placówki)',
      shortTitle: 'Kreator Szkoły',
      icon: <Settings size={18} />,
      badge: 'Etap 1',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      description: 'Kompleksowy przewodnik wprowadzania struktury organizacyjnej szkoły, kadry, pracowni, uczniów ze SPE oraz macierzy przydziałów.',
      steps: [
        {
          title: 'Krok 1 i 2: Dane podstawowe, dni robocze oraz dzwonki lekcyjne',
          description: 'Skonfiguruj ramowy kalendarz tygodniowy oraz godziny lekcyjne szkoły:',
          points: [
            'Wpisz nazwę szkoły, rok szkolny i semestr (np. 2026/2027, Semestr I).',
            'Zdefiniuj dni tygodnia, w których odbywają się zajęcia (domyślnie Poniedziałek – Piątek).',
            'W Kroku 2 dodaj godziny lekcyjne: podaj czas rozpoczęcia i zakończenia każdej lekcji (np. 8:00 – 8:45).',
            'System automatycznie wylicza długość przerw między lekcjami na potrzeby modułu dyżurów.'
          ],
          tip: 'Jeżeli szkoła ma długą przerwę obiadową (np. 20–25 minut), oznacz ją odpowiednio – ułatwi to późniejsze zrównoważenie dyżurów na stołówce.'
        },
        {
          title: 'Krok 3 i 4: Oddziały klasowe oraz sale i pracownie',
          description: 'Wprowadź klasy szkolne oraz bazę lokalową:',
          points: [
            'Dla każdej klasy ustal nazwę (np. 1A, 4B, 8A), poziom nauczania oraz unikalny kolor identyfikacyjny.',
            'Przypisz klasie salę bazową (wychowawczą), co zoptymalizuje przydział gabinetów w edukacji wczesnoszkolnej.',
            'W Kroku 4 zdefiniuj gabinety: podaj numer/nazwę, pojemność, budynek oraz typ pracowni (ogólna, językowa, informatyczna, sala gimnastyczna, gabinet terapii/rewalidacji).'
          ],
          tip: 'W salach specjalistycznych (np. WF, informatyka) warto zaznaczyć odpowiedni typ, aby generator sal automatycznie kierował zajęcia do dedykowanych pracowni.'
        },
        {
          title: 'Krok 5 i 6: Kadra pedagogiczna i przedmioty nauczania',
          description: 'Zarządzaj zespołem nauczycieli i katalogiem przedmiotów:',
          points: [
            'Dla każdego nauczyciela określ imię, nazwisko, skrót do planu (np. JKOW), pensum etatowe (np. 18h) oraz kolor.',
            'Wskaż przedmioty nauczane przez nauczyciela oraz jego dyspozycyjność (dni bez lekcji lub ograniczenia godzinowe).',
            'W Kroku 6 zdefiniuj przedmioty nauczania, ich skróty i przypisany typ pracowni.'
          ]
        },
        {
          title: 'Krok 7: Podziały na grupy międzyoddziałowe i oddziałowe',
          description: 'Skonfiguruj podział uczniów na grupy w ramach przedmiotów wymagających mniejszych zespołów:',
          points: [
            'Twórz grupy oddziałowe (np. Klasa 4A: Język angielski gr1 i gr2, Informatyka gr1 i gr2).',
            'Twórz grupy międzyoddziałowe (np. WF chłopcy z klas 7A i 7B) łączone w jeden blok lekcyjny.',
            'W planie lekcji system umożliwia obsadzenie grup na tej samej godzinie z różnymi nauczycielami bez wywoływania kolizji.'
          ]
        },
        {
          title: 'Krok 8 i 9: Uczniowie ze SPE i NI oraz przydziały wsparcia',
          description: 'Zarządzanie kształceniem specjalnym i pomocą psychologiczno-pedagogiczną:',
          points: [
            'Wprowadź dane ucznia: oddział macierzysty, rodzaj orzeczenia PPP (autyzm/Asperger, niepełnosprawność intelektualna, ruchowa, zagrożenie niedostosowaniem).',
            'W Kroku 9 określ tygodniowy wymiar godzin: godziny z nauczycielem wspomagającym w oddziale, godziny nauczania indywidualnego (NI), rewalidację oraz specjalistyczną pomoc PP (logopedia, psycholog, pedagog, terapia pedagogiczna).',
            'Wprowadź zalecenia poradni, mocne strony i trudności do zintegrowanego arkusza WOPFU/IPET.'
          ],
          tip: 'Zajęcia logopedyczne, z psychologiem i pedagogiem mogą być realizowane w grupach łączonych międzyoddziałowych, co pozwala planować wsparcie dla kilku uczniów jednocześnie.'
        },
        {
          title: 'Krok 10: Przydziały godzinowe (Macierz pensum)',
          description: 'Finalizacja wprowadzania tygodniowych obciążeń lekcyjnych:',
          points: [
            'Przypisz nauczycieli i przedmioty do poszczególnych oddziałów i grup.',
            'Określ tygodniowy wymiar godzin (np. 4h Język polski, 3h Matematyka).',
            'Monitoruj bilans pensum nauczyciela w czasie rzeczywistym – kolor zielony oznacza pełne pensum, żółty/czerwony ostrzega o nadgodzinach lub niedoborze.',
            'Po uzupełnieniu kliknij przycisk „Zakończ konfigurację i przejdź do Planu Klas”.'
          ]
        }
      ]
    },
    {
      id: 'plan_klas',
      title: '📅 Plan Klas (Układanie Planu, Generator i Edycja)',
      shortTitle: 'Plan Klas',
      icon: <Calendar size={18} />,
      badge: 'Etap 2',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Zarządzaj siatką godzin lekcyjnych oddziałów. Korzystaj z automatycznego algorytmu optymalizacyjnego lub układaj plan manualnie.',
      steps: [
        {
          title: 'Szybka edycja komórki planu (kliknięcie w siatkę)',
          description: 'Najwygodniejszy sposób wstawiania i modyfikacji lekcji wprowadzony w wersji v3.8.5:',
          points: [
            'Kliknij w dowolną komórkę planu lekcji (pustą lub zawierającą już zajęcia).',
            'Otworzy się przejrzysty modal, w którym natychmiast widzisz aktualną lekcję, ewentualne kolizje oraz listę wszystkich przydziałów danej klasy.',
            'Jednym kliknięciem możesz wstawić wybrany przedmiot, zastąpić istniejący wpis lub usunąć zajęcia.',
            'W modalu możesz również bezpośrednio przypisać lub zmienić nauczyciela wspomagającego dla danej lekcji.'
          ],
          tip: 'Nie musisz wcześniej wybierać przedmiotu z dolnego paska – modal komórki sam podpowiada wszystkie przydziały i informuje o stopniu ich realizacji (np. 3/4h).'
        },
        {
          title: 'Tradycyjny tryb „Pędzla” i przeciąganie (Drag & Drop)',
          description: 'Narzędzia przyspieszające seryjne wprowadzanie zajęć:',
          points: [
            'Wybierz przydział z dolnej puli kart klasy – karta podświetli się na fioletowo (aktywny tryb pędzla).',
            'Klikaj kolejne komórki w siatce dni i godzin, aby szybko nanieść lekcje (np. 4 godziny matematyki w całym tygodniu).',
            'Możesz również przeciągać zaplanowane klocki lekcyjne pomiędzy komórkami (Drag & Drop), aby zamieniać godziny miejscami.',
            'Na urządzeniach dotykowych klocki przesuwają się precyzyjnie bez blokowania pionowego przewijania ekranu.'
          ]
        },
        {
          title: 'Automatyczny Generator Planu Klas',
          description: 'Algorytm genetyczno-heurystyczny optymalizujący rozkład lekcji:',
          points: [
            'Kliknij przycisk „Generuj plan automatycznie” w prawym górnym rogu Planu Klas.',
            'Ustal wagi optymalizacji: unikanie okienek u nauczycieli, przedmioty ścisłe rano, równomierny rozkład godzin w tygodniu.',
            'Wybierz czy chcesz wygenerować plan dla wszystkich klas, czy tylko dla wybranych oddziałów.',
            'Generator na bieżąco raportuje postęp i jakość rozwiązania (fitness score).'
          ]
        },
        {
          title: 'Zajęcia Uczniów ze SPE i Nauczania Indywidualnego w Planie',
          description: 'Planowanie wsparcia specjalnego bezpośrednio w siatce godzin:',
          points: [
            'W lewym panelu przełącz widok z „🏫 Oddziały klasowe” na „👤 Uczniowie SPE i NI”.',
            'Wybierz ucznia, aby zobaczyć jego dedykowany plan tygodniowy z podziałem na zajęcia w klasie (wspomagane) oraz zajęcia gabinetowe 1:1.',
            'Dla logopedii, psychologa i pedagoga możesz tworzyć grupy łączone międzyoddziałowe (`group_special`) – wstawienie zajęć u jednego ucznia automatycznie aktualizuje plan pozostałych dzieci w grupie!'
          ]
        },
        {
          title: 'Wykrywanie i sygnalizacja kolizji',
          description: 'Czuły system ochrony przed błędami planistycznymi:',
          points: [
            'Kolizja nauczyciela: nauczyciel nie może prowadzić dwóch różnych lekcji w tej samej godzinie (chyba że to zadeklarowane grupy łączone).',
            'Kolizja sali: ta sama sala nie może być zajęta przez dwie różne klasy jednocześnie.',
            'Kolizja klasy: oddział nie może mieć dwóch sprzecznych przedmiotów (z wyjątkiem zdefiniowanych grup gr1/gr2).',
            'Komórki z kolizją oznaczane są na czerwono z ikoną ostrzegawczą i szczegółowym opisem przyczyny konfliktu.'
          ]
        }
      ]
    },
    {
      id: 'plan_sal',
      title: '🚪 Plan Sal (Przydział Gabinetów Lekcyjnych)',
      shortTitle: 'Plan Sal',
      icon: <DoorClosed size={18} />,
      badge: 'Etap 3',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Optymalizuj wykorzystanie przestrzeni szkolnej, przypisuj pracownie specjalistyczne i unikaj konfliktów lokalowych.',
      steps: [
        {
          title: 'Widok obłożenia gabinetów w ciągu tygodnia',
          description: 'Przeglądaj plan z perspektywy pracowni szkolnych:',
          points: [
            'Wybierz pracownię z listy sal (lub widok zbiorczy), aby sprawdzić kiedy sala jest wolna, a kiedy zajęta.',
            'Kolorowe klocki reprezentują klasy odbywające lekcje w danej sali z podaniem przedmiotu i nauczyciela.',
            'Sale pogrupowane są według budynków i kategorii (np. sale wczesnoszkolne, humanistyczne, przyrodnicze, WF).'
          ]
        },
        {
          title: 'Automatyczny generator przydziału sal',
          description: 'Inteligentny algorytm kierujący lekcje do odpowiednich pracowni:',
          points: [
            'Algorytm w pierwszej kolejności kieruje lekcje do sal bazowych oddziału (wychowawczych).',
            'Lekcje chemii, fizyki, informatyki i WF automatycznie otrzymują pierwszeństwo w pracowniach specjalistycznych.',
            'System pilnuje, aby pojemność gabinetu nie była mniejsza niż liczebność zespołu klasowego.'
          ]
        },
        {
          title: 'Ręczna zmiana gabinetu na lekcji',
          description: 'Błyskawiczne korekty lokalowe w planie:',
          points: [
            'Przeciągnij klocek lekcji na inną wolną salę w tym samym slocie godzinowym.',
            'W razie konfliktu system wyświetla powiadomienie o zajętości sali przez inny oddział.'
          ]
        }
      ]
    },
    {
      id: 'dyzury',
      title: '☕ Grafik Dyżurów Nauczycielskich na Przerwach',
      shortTitle: 'Dyżury',
      icon: <Coffee size={18} />,
      badge: 'Etap 4',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      description: 'Zarządzanie bezpieczeństwem uczniów na korytarzach, klatkach schodowych i boisku z zachowaniem równego obciążenia nauczycieli.',
      steps: [
        {
          title: 'Definiowanie stref dyżurów i punktów newralgicznych',
          description: 'Dostosuj punkty dyżurowe do topografii szkoły:',
          points: [
            'Dodaj strefy dyżurowe (np. Hol główny, Korytarz I piętro, Klatka wschodnia, Szatnia, Boisko szkolne, Stołówka).',
            'Dla każdej strefy możesz zdefiniować wymagany poziom obsady (np. 1 lub 2 nauczycieli na dużej przerwie).',
            'Możliwość zdefiniowania dyżuru w salach edukacji wczesnoszkolnej (klasy 1–3).'
          ]
        },
        {
          title: 'Dyżury odprowadzające (15 minut po lekcjach)',
          description: 'Opieka nad dziećmi po zakończonych zajęciach:',
          points: [
            'Funkcja dedykowana dla nauczycieli klas młodszych odprowadzających uczniów do szatni lub świetlicy.',
            'Czas dyżuru odprowadzającego jest wliczany do łącznego bilansu minutowego nauczyciela.'
          ]
        },
        {
          title: 'Automatyczny generator harmonogramu dyżurów',
          description: 'Generowanie dyżurów z poszanowaniem planu lekcji kadry:',
          points: [
            'Generator nie przydziela dyżuru nauczycielowi, który w danym dniu nie ma lekcji lub skończył zajęcia znacznie wcześniej.',
            'Dyżury są równomiernie bilansowane pod kątem łącznej liczby minut w tygodniu dla każdego pedagoga.',
            'Uwzględniane są przerwy na posiłek i regenerację nauczyciela.'
          ]
        }
      ]
    },
    {
      id: 'spe',
      title: '👥 Moduł Uczniów ze SPE i Arkusze Wsparcia',
      shortTitle: 'Uczniowie SPE',
      icon: <Users size={18} />,
      badge: 'Wsparcie PP',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Kompletne narzędzie do organizacji nauczania specjalnego, IPET, WOPFU oraz rewalidacji i terapii grupowej.',
      steps: [
        {
          title: 'Karta profilowa ucznia ze specjalnymi potrzebami',
          description: 'Centralny rejestr orzeczeń poradni psychologiczno-pedagogicznych:',
          points: [
            'Wprowadź podstawę orzeczenia, numer dokumentu i okres ważności (etap edukacyjny lub dany rok szkolny).',
            'Określ szczegółowe formy wsparcia: nauczyciel wspomagający w klasie, nauczanie indywidualne w gabinecie (NI), rewalidacja.',
            'Zdefiniuj wymiar godzin specjalistycznych: zajęcia logopedyczne, psychologiczne, pedagogiczne oraz korekcyjno-kompensacyjne.'
          ]
        },
        {
          title: 'Zintegrowany arkusz WOPFU i plan IPET',
          description: 'Dokumentacja postępów i celów terapeutycznych:',
          points: [
            'Wielospecjalistyczna Ocena Poziomu Funkcjonowania Ucznia (WOPFU): wprowadzaj mocne strony, predyspozycje, trudności szkolne i bariery środowiskowe.',
            'Cele edukacyjno-terapeutyczne w ramach IPET z podziałem na semestry.',
            'Możliwość wygenerowania i wydruku kompletnego Arkusza Wsparcia Ucznia gotowego do podpisu zespołu nauczycieli i rodziców.'
          ]
        },
        {
          title: 'Zajęcia w grupach łączonych dla form specjalistycznych',
          description: 'Efektywne wykorzystanie godzin specjalistów szkolnych:',
          points: [
            'Logopedia, psycholog i pedagog mogą prowadzić zajęcia w grupach łączących uczniów z różnych oddziałów.',
            'Wystarczy zaznaczyć opcję grupy łączonej przy tworzeniu zajęć – system automatycznie synchronizuje slot u wszystkich powiązanych uczniów.'
          ]
        }
      ]
    },
    {
      id: 'statystyki',
      title: '📊 Statystyki, Higiena Planu i Analiza Pensum',
      shortTitle: 'Statystyki',
      icon: <BarChart3 size={18} />,
      badge: 'Analiza',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      description: 'Narzędzia analityczne badające ergonomię planu, higienę pracy umysłowej uczniów oraz wykorzystanie etatów.',
      steps: [
        {
          title: 'Higiena pracy umysłowej ucznia (Rozporządzenie MEN)',
          description: 'Weryfikacja zgodności z zasadami higieny szkolnej:',
          points: [
            'Wykres trudności przedmiotów: badanie czy przedmioty wymagające intensywnego wysiłku umysłowego (matematyka, fizyka, chemia) umieszczane są na wczesnych godzinach (lekcje 2–4).',
            'Unikanie kumulacji trudnych przedmiotów pod koniec dnia lub w piątki.',
            'Równomierność obciążenia: monitorowanie liczby godzin w poszczególne dni tygodnia (brak skoków z 4 na 8 godzin).'
          ]
        },
        {
          title: 'Rozliczenie pensum i godzin ponadwymiarowych',
          description: 'Nadzór nad czasem pracy kadry pedagogicznej:',
          points: [
            'Tabela zbiorcza wszystkich nauczycieli: etat bazowy, godziny zrealizowane w planie, nadgodziny, godziny dyżurów.',
            'Szybka identyfikacja nieobsadzonych wakatów lub przeciążonych nauczycieli.'
          ]
        },
        {
          title: 'Wskaźnik okienek i dni wolnych',
          description: 'Optymalizacja komfortu pracy nauczycieli:',
          points: [
            'Zliczanie okienek w planie każdego pedagoga.',
            'Raport dni wolnych od zajęć dydaktycznych dla nauczycieli na niepełnych etatach.'
          ]
        }
      ]
    },
    {
      id: 'wydruki',
      title: '🖨️ Wydruki, Publikacja i Eksport Harmonogramów',
      shortTitle: 'Wydruki',
      icon: <Printer size={18} />,
      badge: 'Publikacja',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      description: 'Przygotuj estetyczne plany lekcji i dyżurów do druku na papierze lub zapisu do plików PDF.',
      steps: [
        {
          title: 'Formaty wydruków dostosowane do potrzeb szkoły',
          description: 'Szeroki wybór szablonów wydruku:',
          points: [
            'Plan oddziału klasowego (indywidualny lub zbiorczy dla wszystkich klas).',
            'Plan nauczyciela (zestawienie tygodniowe z salami i dyżurami na przerwach).',
            'Plan gabinetu lekcyjnego (do powieszenia na drzwiach pracowni).',
            'Plan ogólny szkoły (zbiorcza siatka ścienna dla dyrekcji i pokoju nauczycielskiego).',
            'Harmonogram dyżurów nauczycielskich (czytelna siatka stref i dni).'
          ]
        },
        {
          title: 'Opcje optymalizacji druku',
          description: 'Dostosowanie parametrów graficznych wydruku:',
          points: [
            'Tryb oszczędzania tonera (czarno-biały) o wysokim kontraście do wydruku na kserokopiarce szkolnej.',
            'Formaty A4 w orientacji pionowej lub poziomej z automatycznym skalowaniem tabeli.',
            'Drukowanie bezpośrednie z poziomu przeglądarki (Ctrl+P) lub zapis do pliku PDF.'
          ]
        }
      ]
    },
    {
      id: 'bezpieczenstwo',
      title: '💾 Kopia Zapasowa, Szyfrowanie i Bezpieczeństwo',
      shortTitle: 'Kopia i Bezpieczeństwo',
      icon: <ShieldCheck size={18} />,
      badge: 'Bezpieczeństwo',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Zabezpiecz bazę danych szkoły, twórz cykliczne kopie zapasowe i korzystaj z ochrony hasłem głównym.',
      steps: [
        {
          title: 'Pobieranie i wczytywanie kopii zapasowej (Plik JSON SchedData)',
          description: 'Podstawowa i najważniejsza procedura bezpieczeństwa:',
          points: [
            'Kliknij ikonę „Pobierz kopię zapasową” na górnym pasku aplikacji.',
            'Pobrany plik `.json` zawiera kompletną bazę szkoły: strukturę, nauczycieli, sale, plany klas, dyżury i orzeczenia SPE.',
            'Aby wczytać plan na innym komputerze, skorzystaj z przycisku „Wczytaj bazę danych” – plik zostanie natychmiast zwalidowany i zaimportowany.'
          ],
          tip: 'Zapisuj kopię zapasową na szkolnym dysku sieciowym lub pendrive po każdej większej zmianie organizacyjnej.'
        },
        {
          title: 'Szyfrowanie bazy danych hasłem (AES-GCM)',
          description: 'Ochrona przed niepowołanym dostępem na współdzielonym komputerze:',
          points: [
            'W menu „Bezpieczeństwo” możesz ustawić hasło główne aplikacji.',
            'Wszystkie dane zapisywane w przeglądarce zostaną zaszyfrowane silnym algorytmem AES-256 GCM.',
            'Po zamknięciu przeglądarki nikt bez znajomości hasła nie będzie mógł podejrzeć planu ani danych orzeczeń uczniów.'
          ]
        },
        {
          title: 'Automatyczne wersjonowanie i migawki (Snapshots)',
          description: 'Cofanie błędnych operacji bez stresu:',
          points: [
            'Program automatycznie tworzy punkty przywracania przed każdą kluczową operacją (np. przed uruchomieniem generatora lub importem).',
            'W Menedżerze Migawek możesz cofnąć plan do dowolnego stanu z ostatnich dni kilkoma kliknięciami.'
          ]
        }
      ]
    }
  ], []);

  // Filter sections and steps based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();

    return sections.map(sec => {
      const matchSection = sec.title.toLowerCase().includes(q) || sec.description.toLowerCase().includes(q);
      const matchingSteps = sec.steps.filter(step => 
        step.title.toLowerCase().includes(q) || 
        step.description.toLowerCase().includes(q) ||
        step.points.some(p => p.toLowerCase().includes(q)) ||
        (step.tip && step.tip.toLowerCase().includes(q))
      );

      if (matchSection || matchingSteps.length > 0) {
        return {
          ...sec,
          steps: matchingSteps.length > 0 ? matchingSteps : sec.steps
        };
      }
      return null;
    }).filter(Boolean) as InstructionSection[];
  }, [sections, searchQuery]);

  const activeSection = useMemo(() => {
    const found = filteredSections.find(s => s.id === selectedSectionId);
    return found || filteredSections[0] || sections[0];
  }, [filteredSections, selectedSectionId, sections]);

  const toggleStep = (stepKey: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepKey]: !prev[stepKey]
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    activeSection.steps.forEach((_, idx) => {
      next[`${activeSection.id}-${idx}`] = true;
    });
    setExpandedSteps(next);
  };

  const collapseAll = () => {
    setExpandedSteps({});
  };

  return (
    <div className="space-y-6 animate-fade-in" id="instrukcje-modul">
      
      {/* PASEK WYSZUKIWANIA I SZYBKIEGO WSTĘPU */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">
              Interaktywny Podręcznik i Instrukcja Obsługi
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Kompleksowy poradnik krok po kroku do wszystkich modułów SalePlan Pro v3.8.5
            </p>
          </div>
        </div>

        {/* WYSZUKIWARKA */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj w instrukcji (np. SPE, pensum, sale, dyżury)..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* GŁÓWNY UKŁAD: MENU KATEGORII (LEWA) + TREŚĆ INSTRUKCJI (PRAWA) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEWA KOLUMNA: LISTA KATEGORII / SEKCJI */}
        <div className="lg:col-span-1 space-y-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Kategorie podręcznika
          </div>
          <div className="space-y-1">
            {filteredSections.map(sec => {
              const isSelected = activeSection.id === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isSelected ? 'text-white' : 'text-slate-500'}>
                      {sec.icon}
                    </span>
                    <span className="truncate">{sec.shortTitle}</span>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : sec.badgeColor
                  }`}>
                    {sec.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 px-2 text-[10px] text-slate-400 leading-snug">
            💡 <strong>Wskazówka:</strong> Kliknij wybrany dział, aby wyświetlić instrukcję krok po kroku oraz dobre praktyki planistyczne.
          </div>
        </div>

        {/* PRAWA KOLUMNA: TREŚĆ WYBRANEJ SEKCJI */}
        <div className="lg:col-span-3 space-y-5">
          {activeSection ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              
              {/* NAGŁÓWEK ROZDZIAŁU */}
              <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${activeSection.badgeColor}`}>
                      {activeSection.badge}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Instrukcja krok po kroku
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    {activeSection.title}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {activeSection.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={expandAll}
                    className="px-2.5 py-1 text-[10.5px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200 cursor-pointer"
                  >
                    Rozwiń wszystkie
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-2.5 py-1 text-[10.5px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200 cursor-pointer"
                  >
                    Zwiń wszystkie
                  </button>
                </div>
              </div>

              {/* LISTA KROKÓW / PROCEDUR */}
              <div className="space-y-4">
                {activeSection.steps.map((step, idx) => {
                  const stepKey = `${activeSection.id}-${idx}`;
                  const isExpanded = expandedSteps[stepKey] !== false; // default expanded

                  return (
                    <div 
                      key={idx}
                      className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 bg-slate-50/40"
                    >
                      {/* TYTUŁ KROKU */}
                      <button
                        type="button"
                        onClick={() => toggleStep(stepKey)}
                        className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-slate-100/70 transition cursor-pointer bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-black text-xs shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-800">
                              {step.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {step.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-slate-400 shrink-0 mt-1">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </button>

                      {/* ROZWINIĘTE SZCZEGÓŁY KROKU */}
                      {isExpanded && (
                        <div className="p-4 pt-2 border-t border-slate-100 space-y-3 bg-slate-50/50">
                          {/* PUNKTY */}
                          <ul className="space-y-1.5 pl-2">
                            {step.points.map((pt, pIdx) => (
                              <li key={pIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                                <span className="text-blue-500 shrink-0 mt-1">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>

                          {/* WSKAZÓWKA (PRO-TIP) */}
                          {step.tip && (
                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 leading-relaxed">
                              <Lightbulb size={15} className="text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-black text-amber-800">Dobra praktyka planisty:</strong> {step.tip}
                              </div>
                            </div>
                          )}

                          {/* OSTRZEŻENIE */}
                          {step.warning && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 leading-relaxed">
                              <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-black text-rose-800">Ważna uwaga:</strong> {step.warning}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              Nie znaleziono wyników dla podanej frazy wyszukiwania.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
