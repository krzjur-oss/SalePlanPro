import os

headers = {
    'ArkuszWsparciaUcznia.tsx': ('Moduł: Arkusz Wsparcia Ucznia ze SPE i NI', 'Kompleksowy widok profilu ucznia ze specjalnymi potrzebami, orzeczenia, IPET, WOPFU oraz siatki zajęć indywidualnych i terapeutycznych.'),
    'AssignRoomDropdown.tsx': ('Moduł: Szybki Przydział Sali Lekcyjnej (AssignRoomDropdown)', 'Komponent listy rozwijanej umożliwiający natychmiastowe przypisanie lub zmianę gabinetu w widoku planu lekcji.'),
    'BackupPasswordModal.tsx': ('Moduł: Okno Hasła Kopii Zapasowej (BackupPasswordModal)', 'Modal wprowadzania i potwierdzania hasła szyfrowania plików eksportu i importu bazy danych.'),
    'Changelog.tsx': ('Moduł: Historia Zmian i Wersje (Changelog)', 'Prezentacja wydań systemu SalePlan Pro z podziałem na nowości, ulepszenia, poprawki i zabezpieczenia RODO.'),
    'CompanionWindowView.tsx': ('Moduł: Okno Towarzyszące Drugiego Ekranu (CompanionWindowView)', 'Niezależny pulpit roboczy na drugim monitorze wyświetlający matrycę sal, rzut budynku oraz podgląd obciążeń.'),
    'DndWrapper.tsx': ('Moduł: Adapter Obsługi Przeciągania (DndWrapper)', 'Integracja biblioteki @dnd-kit z obsługą przeciągania kafelków lekcji i przydziałów w siatce planu.'),
    'DualScreen2Kreator.tsx': ('Moduł: Towarzyszący Podgląd Kreatora (DualScreen2Kreator)', 'Widok pomocniczy na drugim ekranie dla modułu Kreatora Szkoły (struktura, pule i sale).'),
    'DualScreen2PlanKlas.tsx': ('Moduł: Towarzysząca Matryca Sal dla Planu Klas (DualScreen2PlanKlas)', 'Podgląd obłożenia gabinetów w czasie rzeczywistym podczas układania lekcji oddziałów na ekranie głównym.'),
    'DualScreen2PlanSal.tsx': ('Moduł: Towarzyszący Podgląd dla Planu Sal (DualScreen2PlanSal)', 'Widok pomocniczy na drugim monitorze prezentujący płachtę zbiorczą i weryfikację konfliktów gabinetów.'),
    'DualScreenMasterView.tsx': ('Moduł: Główny Przełącznik Widoków Okna Towarzyszącego (DualScreenMasterView)', 'Router drugiego ekranu wybierający odpowiedni widok pomocniczy na podstawie aktywnego modułu planisty.'),
    'Dyzury.tsx': ('Moduł: Harmonogram Dyżurów Nauczycielskich (Dyzury)', 'Układanie, automatyczna optymalizacja i kontrola dyżurów na przerwach, nadzór szatni WF oraz ochrona klas pierwszych.'),
    'ErrorBoundary.tsx': ('Moduł: Granica Błędów Wykonawczych (ErrorBoundary)', 'Przechwytywanie krytycznych wyjątków renderowania React z opcją bezpiecznego restartu i zachowania kopii roboczej.'),
    'ExportModal.tsx': ('Moduł: Kreator Eksportu Danych (ExportModal)', 'Eksport bazy danych szkoły, planu lekcji i sal do plików JSON, zaszyfrowanych archiwów lub arkuszy.'),
    'ImportModal.tsx': ('Moduł: Kreator Importu Danych (ImportModal)', 'Wczytywanie i scalanie plików planów, weryfikacja integralności schematów Zod oraz ochrona przed nadpisaniem.'),
    'Instrukcje.tsx': ('Moduł: Podręcznik Użytkownika i Instrukcje Obsługi (Instrukcje)', 'Interaktywny przewodnik krok po kroku po wszystkich funkcjonalnościach i etapach pracy w programie.'),
    'KioskMode.tsx': ('Moduł: Tablica Informacyjna TV i Tryb Rzutnika (KioskMode)', 'Pełnoekranowy widok na monitory w holu szkoły z zegarem na żywo, odliczaniem do dzwonka i karuzelą klas.'),
    'KreatorSzkoly.tsx': ('Moduł: Kreator Szkoły i Konfiguracja Wstępna (KreatorSzkoly)', 'Konfiguracja roku szkolnego, przedmiotów, oddziałów, nauczycieli, sal, uczniów SPE oraz przydziałów lekcyjnych.'),
    'LockManagerModal.tsx': ('Moduł: Menedżer Blokad Lekcji (LockManagerModal)', 'Zarządzanie zamrożonymi slotami w planie lekcji, zapobiegającymi przesuwaniu wybranych zajęć przez autogenerator.'),
    'MultiTabConflictModal.tsx': ('Moduł: Okno Rozwiązywania Konfliktów Wielu Kart (MultiTabConflictModal)', 'Wskazanie karty dokonującej zapisu, porównanie rewizji oraz zaawansowany podgląd bilansu różnic (Conflict Diff).'),
    'MultiTabRefreshBanner.tsx': ('Moduł: Baner Powiadomień o Aktualizacji z Innej Karty (MultiTabRefreshBanner)', 'Dyskretny pasek informujący o zapisaniu nowszej wersji planu w innej karcie z opcją natychmiastowego odświeżenia.'),
    'OProgramie.tsx': ('Moduł: Informacje o Programie i Licencje (OProgramie)', 'Metryka autorska, Regulamin, Polityka Prywatności RODO, licencja WLDE oraz skróty do podręcznika i historii zmian.'),
    'PlachtaDyrektorska.tsx': ('Moduł: Płachta Dyrektorska A3/A2 (PlachtaDyrektorska)', 'Wielkoformatowy arkusz organizacyjny całej szkoły dla oddziałów, kadry i gabinetów z podziałem wielostronicowym.'),
    'PlanGenerator.tsx': ('Moduł: Autogenerator Planu Lekcji (PlanGenerator)', 'Inteligentny silnik heurystyczny do automatycznego rozmieszczania lekcji w siatce godzinowej oddziałów.'),
    'PlanKlas.tsx': ('Moduł: Plan Klas – Siatka Godzinowa Oddziałów (PlanKlas)', 'Główny pulpit układania planu zajęć metodą Drag & Drop, obsługa grup, pędzla przydziałów oraz uczniów SPE.'),
    'PlanSal.tsx': ('Moduł: Plan Sal – Przypisanie Gabinetów Lekcyjnych (PlanSal)', 'Weryfikacja obłożenia pracowni przedmiotowych, wykrywanie kolizji sal oraz automatyczny optymalizator gabinetów.'),
    'PlanVariantsModal.tsx': ('Moduł: Warianty i Semestry Planu (PlanVariantsModal)', 'Tworzenie, porównywanie i przełączanie alternatywnych scenariuszy planu lekcji oraz planów semestralnych.'),
    'SWUpdateBanner.tsx': ('Moduł: Baner Aktualizacji Aplikacji PWA (SWUpdateBanner)', 'Powiadomienie o dostępności nowej wersji kodu w Service Workerze z możliwością szybkiego przeładowania.'),
    'SecurityModal.tsx': ('Moduł: Panel Bezpieczeństwa RODO i Szyfrowania (SecurityModal)', 'Zarządzanie hasłem głównym bazy danych, aktywacja szyfrowania AES-256-GCM oraz konfiguracja auto-blokady.'),
    'SioImport.tsx': ('Moduł: Kreator Importu z Systemu SIO (SioImport)', 'Pobieranie i mapowanie danych struktury kadry i oddziałów ze szkolnych zestawień Systemu Informacji Oświatowej.'),
    'SnapshotManager.tsx': ('Moduł: Menedżer Migawek i Punktów Przywracania (SnapshotManager)', 'Zarządzanie automatycznymi i ręcznymi kopiami bezpieczeństwa z możliwością natychmiastowego cofnięcia zmian.'),
    'Statystyki.tsx': ('Moduł: Statystyki, Higiena Planu i Analiza Pensum (Statystyki)', 'Weryfikacja okienek kadry, bilansu godzin nauczycieli, obciążenia sal oraz automatyczny audyt higieny planu.'),
    'StructureTemplatesModal.tsx': ('Moduł: Szablony Struktury Szkoły (StructureTemplatesModal)', 'Wczytywanie i zapisywanie gotowych konfiguracji typów szkół (SP, LO, Technikum) oraz awans roczników.'),
    'SwapAssistantModal.tsx': ('Moduł: Asystent Szybkiej Zamiany Lekcji (SwapAssistantModal)', 'Inteligentne podpowiedzi bezkolizyjnych zamian godzin pomiędzy nauczycielami lub klasami.'),
    'TermsModal.tsx': ('Moduł: Okno Akceptacji Regulaminu i Licencji WLDE (TermsModal)', 'Bramka startowa pierwszego uruchomienia aplikacji z pełnym tekstem Regulaminu i Wolnej Licencji Edukacyjnej.'),
    'UnlockScreen.tsx': ('Moduł: Ekran Odblokowania Zaszyfrowanej Bazy (UnlockScreen)', 'Monit o hasło główne przy zablokowanej sesji chroniący dane osobowe uczniów i nauczycieli przed niepowołanym dostępem.'),
    'UstawieniaGeneratorow.tsx': ('Moduł: Parametry Generatorów i Higieny Planu (UstawieniaGeneratorow)', 'Konfiguracja wag heurystycznych, limitów okienek, preferencji bloków przedmiotowych i przerw obiadowych.'),
    'Wydruki.tsx': ('Moduł: Centrum Wydruków i Publikacji PDF (Wydruki)', 'Generowanie czystych arkuszy A4 i A3: plany oddziałów, nauczycieli, sal, dyżurów, arkusze SPE oraz eksport iCal.')
}

common_comment_replacements = {
    '// Filter sections and steps based on search query': '// Filtrowanie sekcji i kroków na podstawie wpisanego hasła',
    '// If submitted with empty password on export, treat as skip/unencrypted': '// W przypadku pustego hasła przy eksporcie zapisz plik w postaci niezaszyfrowanej',
    '// Initialise all teachers to 0': '// Inicjalizacja liczników wszystkich nauczycieli wartością 0',
    '// Theoretical maximum capacity is 5 days * number of timeslots': '// Teoretyczna maksymalna pojemność wynosi 5 dni * liczba slotów lekcyjnych',
    '// If lessons have distinct non-null groups (e.g. G1 vs G2), it\'s a valid split': '// Jeśli lekcje mają różne grupy (np. gr1 vs gr2), podział jest poprawny',
    '// Helper for validity schedule status': '// Funkcja pomocnicza sprawdzająca ważność harmonogramu',
    '// Initialize comparison targets when opening or changing variants': '// Inicjalizacja celów porównania przy zmianie wariantów',
    '// Set default selected class for diff': '// Ustawienie domyślnej klasy dla podglądu różnic',
    '// Helper to get lesson details safely': '// Bezpieczne pobranie szczegółów lekcji',
    '// Fallback local sync': '// Zapasowa synchronizacja lokalna',
    '// Filtered rooms based on active toggles and search query:': '// Sale przefiltrowane na podstawie aktywnych przełączników i wyszukiwania:',
    '// Default matching names containing religia, etyka, mniejszość, wdż, wdżwr': '// Domyślne dopasowanie przedmiotów: religia, etyka, mniejszość, wdż',
    '// Helper to change configs': '// Funkcja pomocnicza do aktualizacji konfiguracji',
    '// Check basic clashes': '// Weryfikacja podstawowych kolizji godzinowych',
    '// Check computer science labs limit': '// Sprawdzenie limitu pracowni informatycznych',
    '// Check builder parameters': '// Sprawdzenie parametrów generatora',
    '// Find best adjacent slots (hour, hour+1)': '// Wyszukanie najlepszych sąsiadujących slotów (godzina, godzina+1)',
    '// Filter only individual (withClass = false, which needs scheduling)': '// Filtrowanie wyłącznie zajęć indywidualnych (wymagających zaplanowania)',
    '// Filter harmonogram': '// Filtrowanie harmonogramu dyżurów',
    '// Helper to check if teacher can be assigned to a break': '// Sprawdzenie, czy nauczyciel może objąć dyżur na danej przerwie',
    '// Check if they are active on this day and during this break': '// Sprawdzenie obecności w szkole w danym dniu i na przerwie',
    '// Check if teacher is busy with grade 1 adaptation duty during this break (classroom or escort)': '// Sprawdzenie, czy nauczyciel pełni dyżur adaptacyjny w klasie pierwszej',
    '// Check if teacher is busy with PE locker room / gym supervision during this break': '// Sprawdzenie, czy nauczyciel pełni nadzór nad szatnią WF',
    '// Check if they have already hit their limit (with buffer)': '// Sprawdzenie limitu minut dyżurów nauczyciela',
    '// Check if already assigned in this identical break (to another place)': '// Sprawdzenie, czy nauczyciel nie ma już dyżuru w innym miejscu na tej przerwie',
    '// Check consecutive duties rule': '// Kontrola zasady unikania dyżurów na bezpośrednio sąsiadujących przerwach',
    '// Default to Monday on weekends': '// Domyślnie poniedziałek w weekendy',
    '// If before first lesson': '// Przed rozpoczęciem pierwszej lekcji',
    '// Helper to retrieve lesson for a class at a given hour': '// Pobranie lekcji dla klasy o danej godzinie',
    '// Check Etap 2 first': '// Sprawdzenie najpierw Etapu 2 (Plan Sal)',
    '// Check Etap 1': '// Sprawdzenie Etapu 1 (Plan Klas)',
    '// Filtered lists': '// Przefiltrowane listy elementów',
    '// Check if currently exempt': '// Sprawdzenie, czy uczeń jest aktualnie zwolniony',
    '// Set to exempt (nie obowiązuje / zwolniony)': '// Ustawienie statusu zwolnienia z zajęć',
    '// Find all existing lesson keys for this slot': '// Znalezienie wszystkich istniejących kluczy lekcji w tym slocie',
    '// If gesture started on a card in the grid (from schedule):': '// Obsługa gestu rozpoczętego na kafelku w siatce planu:',
    '// If gesture started on a card body in sidebar (not the handle, not the grid):': '// Obsługa gestu rozpoczętego na kafelku w zasobniku bocznym:',
    '// Initial scale application': '// Początkowe przeskalowanie widoku'
}

for filename, (title, desc) in headers.items():
    path = os.path.join('src/components', filename)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not content.startswith('/**\n * SalePlan Pro'):
        header_text = f'''/**\n * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich\n * {title}\n * Opis: {desc}\n */\n\n'''
        content = header_text + content

    for old, new in common_comment_replacements.items():
        content = content.replace(old, new)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Zaktualizowano nagłówek i komentarze: {filename}')
