# SalePlan Pro v3 🗓️🏫

Profesjonalny, bezpieczny i w pełni autonomiczny system do planowania lekcji, przydziału sal lekcyjnych oraz układania harmonogramów dyżurów nauczycielskich. Zaprojektowany z myślą o polskich szkołach podstawowych i ponadpodstawowych.

Aplikacja działa w architekturze **Offline-First** jako nowoczesna aplikacja **PWA (Progressive Web App)**, co oznacza, że po pierwszej instalacji nie wymaga dostępu do Internetu i uruchamia się błyskawicznie bezpośrednio z pulpitu komputera lub telefonu.

---

## 🚀 Główne Funkcje Systemu

- 🛠️ **Kompleksowy Kreator Planu**: Intuicyjny interfejs drag-and-drop do układania zajęć z uwzględnieniem klas, nauczycieli, przedmiotów oraz sal lekcyjnych.
- 👨‍🏫 **Zarządzanie Dyżurami**: Moduł planowania i walidacji dyżurów nauczycielskich podczas przerw międzylekcyjnych.
- 📊 **Statystyki i Audyt Planu**: Automatyczne wykrywanie "okienek" u nauczycieli i klas, analiza obłożenia sal oraz walidacja konfliktów czasowo-przestrzennych.
- 💾 **Lokalne Migawki (Snapshots)**: Możliwość tworzenia nieograniczonej liczby wersji planu bezpośrednio w pamięci przeglądarki z opcją szybkiego cofania zmian (Undo/Redo).
- 📴 **Pełna Praca Offline**: Niezależność od serwerów i awarii sieci dzięki zaawansowanym skryptom Service Workera.
- 🛡️ **Ochrona Prywatności (RODO / GDPR)**: Wszystkie dane planu lekcji i personalne przechowywane są wyłącznie na urządzeniu użytkownika. Aplikacja nie posiada zewnętrznej bazy danych w chmurze.
- 🩺 **Bezpieczny Dziennik Diagnostyki**: Wbudowany moduł logowania błędów technicznych i instalacyjnych (np. pod Google Chrome) z możliwością bezpiecznego eksportu (wyłącznie techniczne metryki, bez jakichkolwiek danych osobowych).

---

## 🛠️ Stos Technologiczny

- **Frontend**: [React 18+](https://react.dev/) z [TypeScript](https://www.typescriptlang.org/)
- **Budowanie aplikacji**: [Vite](https://vitejs.dev/)
- **Stylizowanie**: [Tailwind CSS](https://tailwindcss.com/)
- **Ikony**: [Lucide React](https://lucide.dev/)
- **Wielozadaniowość/Offline**: PWA, Service Workers (zoptymalizowany pod Chrome, Brave, Vivaldi i Firefox)

---

## 📦 Instalacja i Uruchomienie Lokalne

Aby uruchomić projekt na własnym komputerze, upewnij się, że masz zainstalowane środowisko [Node.js](https://nodejs.org/) (zalecana wersja 18 lub nowsza).

1. **Sklonuj repozytorium**:
   ```bash
   git clone https://github.com/KrzJur-oss/SalePlanPro.git
   cd SalePlanPro
   ```

2. **Zainstaluj zależności**:
   ```bash
   npm install
   ```

3. **Uruchom serwer deweloperski**:
   ```bash
   npm run dev
   ```
   Aplikacja będzie dostępna pod adresem: `http://localhost:3000` (lub innym wskazanym w terminalu).

4. **Zbuduj wersję produkcyjną**:
   ```bash
   npm run build
   ```
   Pliki produkcyjne zostaną wygenerowane w folderze `/dist`.

---

## 🐳 Instalacja jako Aplikacja (PWA)

Aplikację można zainstalować bezpośrednio w systemie operacyjnym (Windows, macOS, Linux, Android) jako samodzielny program:
1. Otwórz aplikację w przeglądarce (np. Google Chrome, Brave, Vivaldi).
2. W pasku adresu kliknij ikonę **Instaluj** (komputer z rzutem w dół lub plusik) bądź wybierz z menu przeglądarki opcję "Zainstaluj aplikację SalePlan Pro v3".
3. Program pojawi się na Twoim pulpicie i będzie działał całkowicie niezależnie od przeglądarki, również bez połączenia z Internetem.

---

## 🛡️ Bezpieczeństwo i Prywatność (Zgodność z RODO)

Program został zaprojektowany z zachowaniem najwyższych standardów ochrony danych osobowych (Privacy by Design):
- Wszystkie wprowadzane dane (nazwiska nauczycieli, plany zajęć, oddziały klasowe) są zapisywane wyłącznie w pamięci lokalnej Twojej przeglądarki (`localStorage`).
- Narzędzie diagnostyczne i dziennik błędów zapisuje jedynie parametry techniczne (takie jak wersja przeglądarki, rozdzielczość ekranu, rodzaj błędu javascript) w celu rozwiązywania problemów ze zgodnością na różnych przeglądarkach. Dane wprowadzane przez użytkownika są podczas diagnostyki w 100% pomijane.

---

## 📄 Licencja

Projekt dystrybuowany jest na warunkach otwartej licencji **MIT**. Szczegóły znajdują się w pliku `LICENSE`.
