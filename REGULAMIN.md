# Regulamin Korzystania i Polityka Prywatności Aplikacji SalePlan Pro v3 🛡️⚖️

Niniejszy dokument określa zasady korzystania z aplikacji **SalePlan Pro v3** (zwanej dalej „Aplikacją”) oraz zasady ochrony danych osobowych i politykę prywatności.

---

## § 1. Postanowienia Ogólne

1. Aplikacja **SalePlan Pro v3** jest darmowym, autonomicznym narzędziem wspomagającym tworzenie planów lekcji, przydział sal lekcyjnych oraz układanie harmonogramów dyżurów w szkołach i placówkach oświatowych.
2. Kod źródłowy Aplikacji jest publicznie dostępny i dystrybuowany na warunkach otwartoźródłowej licencji **MIT**.
3. Korzystanie z Aplikacji oznacza akceptację warunków niniejszego regulaminu.

---

## § 2. Architektura Aplikacji i Przechowywanie Danych (Offline-First)

1. **Brak Serwera i Baz Chmurowych**: Aplikacja nie korzysta z żadnych zewnętrznych baz danych ani chmur obliczeniowych do przechowywania planów lekcji utworzonych przez użytkownika.
2. **Lokalny Zapis (Local Storage)**: Wszystkie dane wprowadzane do Aplikacji (w tym: plany zajęć, przypisania nauczycieli, sal, nazwy klas, podziały na grupy, ustawienia) są zapisywane i przetwarzane **wyłącznie lokalnie w pamięci przeglądarki internetowej użytkownika** (`localStorage`).
3. **PWA i Service Worker**: Aplikacja jest przystosowana do pracy w trybie offline jako *Progressive Web App (PWA)*. Pliki aplikacji (HTML, JS, CSS, Ikony) są zapisywane w pamięci podręcznej przeglądarki użytkownika, umożliwiając uruchomienie programu bez dostępu do sieci.
4. **Czyszczenie Danych**: Wyczyszczenie danych przeglądarki (pamięci podręcznej, plików cookies lub danych lokalnych witryn) dla domeny, na której uruchomiona jest Aplikacja, spowoduje bezpowrotne usunięcie zapisanych planów lekcji, chyba że użytkownik wcześniej wykonał kopię zapasową (eksport pliku ze strukturą planu).

---

## § 3. Ochrona Danych Osobowych (RODO / GDPR)

1. **Privacy by Design**: Konstrukcja Aplikacji uniemożliwia autorom lub podmiotom trzecim wgląd w dane wprowadzane przez użytkownika. Żadne dane osobowe nie są przesyłane przez sieć na serwer zewnętrzny.
2. **Administrator Danych**: Administratorem danych osobowych w rozumieniu Ogólnego Rozporządzenia o Ochronie Danych (RODO) wprowadzanych do programu (np. nazwisk nauczycieli, uczniów czy klas) jest **wyłącznie użytkownik końcowy** (np. szkoła, dyrektor lub wyznaczony pracownik układający plan lekcji).
3. **Brak Powierzenia Przetwarzania**: Autorzy Aplikacji nie są podmiotem przetwarzającym dane (procesorem) w rozumieniu RODO, ponieważ nie mają żadnego technicznego ani fizycznego dostępu do wprowadzanych przez użytkownika danych.

---

## § 4. Dziennik Diagnostyki i Błędów (Error Log)

1. Aplikacja posiada wbudowany, lokalny **Dziennik Diagnostyki i Błędów**, ułatwiający diagnozowanie problemów z instalacją i działaniem programu (zwłaszcza w przeglądarce Google Chrome po wyczyszczeniu danych przeglądarek).
2. **Zasada Pełnej Anonimizacji (RODO Compliant)**: W celu ochrony prywatności i zachowania pełnej zgodności z przepisami o ochronie danych osobowych, dziennik błędów oraz funkcja eksportu logu diagnostycznego **nie rejestrują ani nie eksportują żadnych danych wprowadzonych przez użytkownika**.
3. **Zakres Zbieranych Danych Diagnostycznych**: Zapisowi i eksportowi podlegają wyłącznie techniczne parametry systemu:
   - Komunikaty błędów silnika JavaScript oraz stos wywołań (stack trace),
   - Informacje o przeglądarce i systemie operacyjnym (User Agent),
   - Rozdzielczość ekranu, okna oraz orientacja urządzenia (pion/poziom),
   - Status połączenia sieciowego (online/offline) oraz status instalacji PWA,
   - Numeryczne i w pełni zanonimizowane statystyki bazy danych (rozmiar w bajtach, ilość zdefiniowanych klas/sal/nauczycieli wyrażona liczbą, np. `classesCount: 5`, bez ujawniania ich nazw własnych).
4. Użytkownik ma pełną kontrolę nad dziennikiem diagnostycznym: może go w każdej chwili przeglądać w zakładce *Statystyki i Dziennik*, wyczyścić jednym kliknięciem lub pobrać w celu przekazania autorom w celu usunięcia błędów działania programu.

---

## § 5. Wyłączenie Odpowiedzialności

1. Aplikacja jest dostarczana w stanie „takim, jaki jest” (ang. *as is*), bez jakichkolwiek gwarancji, wyraźnych lub dorozumianych.
2. Autorzy Aplikacji nie ponoszą odpowiedzialności za:
   - Utratę danych spowodowaną awarią urządzenia użytkownika, wyczyszczeniem pamięci przeglądarki, działaniem oprogramowania antywirusowego lub reinstalacją systemu,
   - Błędy w ułożonym planie lekcji lub ewentualne konflikty organizacyjne w szkole powstałe w wyniku korzystania z programu,
   - Brak kompatybilności z określonymi wersjami przeglądarek lub systemów operacyjnych.
3. Rekomenduje się regularne pobieranie kopii zapasowej planu lekcji (plik eksportu struktury planu) na zewnętrzny nośnik danych.

---

## § 6. Kontakt i Zgłaszanie Błędów

Wszelkie uwagi, zapytania oraz zanonimizowane raporty diagnostyczne ułatwiające rozwój systemu można zgłaszać pod adresem e-mail: **KrzJur@gmail.com** lub bezpośrednio poprzez zakładkę wydań w repozytorium GitHub.
