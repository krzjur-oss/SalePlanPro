import React, { useState } from 'react';
import { 
  Info, User, FileText, Shield, Award, HelpCircle, Heart, HeartHandshake, CheckCircle2, ChevronRight, Mail, ExternalLink, Globe, KeyRound, Github, History
} from 'lucide-react';
import Changelog from './Changelog';

interface OProgramieProps {
  initialTab?: 'info' | 'changelog';
}

export default function OProgramie({ initialTab = 'info' }: OProgramieProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'changelog'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-8" id="page-o-programie">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* NAGŁÓWEK SEKCIJI */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-3 relative z-10 max-w-xl text-center md:text-left">
            <span className="bg-blue-600/35 text-blue-300 font-extrabold px-3 py-1 rounded-full text-[10px] uppercase font-mono tracking-wider">
              O programie & systemie
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              SalePlan Pro
            </h2>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-medium">
              Profesjonalny, lokalny system wspomagania układania tygodniowych planów zajęć lekcyjnych, przydziału gabinetów przedmiotowych oraz harmonogramowania dyżurów nauczycielskich na przerwach.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md font-bold text-4xl select-none z-10">
            SP
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-100 mt-1 font-mono">v3.2.1</span>
          </div>
        </div>

        {/* ZAKŁADKI / TABS SELECTOR */}
        <div className="flex border-b border-slate-200 gap-1 select-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info size={14} /> Informacje i regulaminy
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'changelog'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={14} /> Historia zmian i wersje
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEWA KOLUMNA: NAWIGACJA SZYBKA LUB STATYSTYKI */}
          <div className="space-y-6 md:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <HelpCircle size={14} className="text-blue-500" /> Skrypty programu
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <CheckCircle2 size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Etap 1: Plan Klas</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Konstrukcja siatki godzin oddziałów klasowych z automatycznym podziałem na grupy.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded bg-teal-50 text-teal-600 shrink-0 mt-0.5">
                    <CheckCircle2 size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Etap 2: Plan Sal</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Interaktywne przeciąganie i przydział sal, sprawdzanie dostępności gabinetów.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                    <CheckCircle2 size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Etap 3: Dyżury</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Ewidencja dyżurów ze wskaźnikami obciążeń nauczycieli na przerwach.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AUTOR - PODGLĄD */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <User size={14} className="text-blue-500" /> Informacje o Autorze
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                    KJ
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800">mgr Krzysztof Jureczek</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none mt-0.5">Full Stack Developer & Nauczyciel</p>
                  </div>
                </div>
                <div className="pt-2 space-y-1.5">
                  <a 
                    href="https://github.com/KrzJur-oss/SalePlanPro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-blue-600 transition font-medium"
                  >
                    <Github size={12} className="text-slate-400" /> github.com/KrzJur-oss
                  </a>
                  <a 
                    href="mailto:kjureczek@proton.me"
                    className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-blue-600 transition font-medium"
                  >
                    <Mail size={12} className="text-slate-400" /> kjureczek@proton.me
                  </a>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <Globe size={12} className="text-slate-400" /> Tarnowskie Góry, Śląskie, Polska
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed pt-1.5 border-t border-slate-100 italic">
                  Czynnie pracujący nauczyciel, pasjonat programowania oraz ułatwiania sobie i innym życia.
                </p>
                <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Inne moje programy:
                  </span>
                  <a 
                    href="https://krzjur-oss.github.io/IABK/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[11px] text-slate-600 hover:text-blue-600 transition font-semibold"
                  >
                    <span className="truncate">1. Interaktywny Atlas Budowy Komputera</span>
                    <ExternalLink size={10} className="text-slate-400 shrink-0 ml-1" />
                  </a>
                  <a 
                    href="https://krzjur-oss.github.io/Dziennik_Losowania_v2/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[11px] text-slate-600 hover:text-blue-600 transition font-semibold"
                  >
                    <span className="truncate">2. Dziennik losowania</span>
                    <ExternalLink size={10} className="text-slate-400 shrink-0 ml-1" />
                  </a>
                  <a 
                    href="https://krzjur-oss.github.io/Dziennik_pupila/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[11px] text-slate-600 hover:text-blue-600 transition font-semibold"
                  >
                    <span className="truncate">3. Dziennik Pupila</span>
                    <ExternalLink size={10} className="text-slate-400 shrink-0 ml-1" />
                  </a>
                  <a 
                    href="https://krzjur-oss.github.io/isk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[11px] text-slate-600 hover:text-blue-600 transition font-semibold"
                  >
                    <span className="truncate">4. SCANVENTORY</span>
                    <ExternalLink size={10} className="text-slate-400 shrink-0 ml-1" />
                  </a>
                  <a 
                    href="https://krzjur-oss.github.io/Szkola-myszki/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[11px] text-slate-600 hover:text-blue-600 transition font-semibold"
                  >
                    <span className="truncate">5. Szkoła Myszki</span>
                    <ExternalLink size={10} className="text-slate-400 shrink-0 ml-1" />
                  </a>
                </div>
              </div>
            </div>

            {/* OFFLINE FIRST */}
            <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-100 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-indigo-800">
                <Shield size={14} className="shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Bezpieczeństwo danych</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                SalePlan Pro działa w filozofii <strong>Offline First</strong>. Wszystkie wprowadzane dane, bazy roczne oraz archiwa są przechowywane wyłącznie w pamięci Twojej przeglądarki (localStorage). Żadne dane wrażliwe nie opuszczają Twojego urządzenia.
              </p>
            </div>
          </div>

          {/* PRAWA KOLUMNA: OPISY, REGULAMIN, LICENCJA */}
          <div className="md:col-span-2 space-y-6">
            
            {/* 1. OPIS PROGRAMU */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
                <Info size={16} className="text-blue-500" /> 🖥️ Szczegółowy opis programu
              </h3>
              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <p>
                  Aplikacja <strong>SalePlan Pro</strong> powstała z myślą o ułatwieniu pracy dyrektorów, wicedyrektorów i koordynatorów szkolnych odpowiedzialnych za tworzenie i nadzór nad tygodniowym harmonogramem lekcji. W odróżnieniu od klasycznych, skomplikowanych programów arkuszowych, SalePlan stawia na <strong>intuicyjność wizualną</strong> połączoną z <strong>natychmiastową walidacją konfliktów</strong>.
                </p>
                <p className="font-semibold text-slate-700">Kluczowe funkcjonalności platformy:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                  <li className="flex items-start gap-1.5">
                    <ChevronRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span><strong>Interaktywny Drag & Drop:</strong> Przeciąganie lekcji wprost z puli nieprzydzielonych na plan gabinetów lekcyjnych.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ChevronRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span><strong>Dwupoziomowe sprawdzanie konfliktów:</strong> Błyskawiczne wykrywanie kolizji godzinowych u nauczycieli, sal oraz klas oddziałowych.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ChevronRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span><strong>Elastyczny podział:</strong> Wsparcie dla sekcji językowych, grup wuefowych oraz łączenia klas na zajęcia zblokowane.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <ChevronRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span><strong>Grafik Dyżurów:</strong> Zarządzanie dyżurami nauczycieli na korytarzach i klatkach schodowych z limitem obciążeń w minutach.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. REGULAMIN KORZYSTANIA */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText size={16} className="text-indigo-500" /> ⚖️ Regulamin i Polityka Prywatności
              </h3>
              <div className="text-xs text-slate-600 space-y-4 leading-relaxed bg-slate-50/50 p-4 border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <div className="text-center pb-3 border-b border-slate-200">
                  <h4 className="font-black text-slate-800 text-sm">Regulamin i Polityka Prywatności aplikacji „SalePlan Pro”</h4>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold">Wersja v3.2.1 · Obowiązuje od 13 lipca 2026 r.</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 1. Postanowienia ogólne</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Niniejszy Regulamin określa zasady korzystania z aplikacji <strong>„SalePlan Pro”</strong> (dalej: „Aplikacja”), dostępnej pod bieżącym adresem internetowym.</li>
                    <li>Właścicielem, twórcą i jedynym autorem Aplikacji jest <strong>mgr Krzysztof Jureczek</strong> (dalej: „Autor”).</li>
                    <li>Aplikacja dystrybuowana jest na warunkach <strong>Wolnej Licencji Domowo-Edukacyjnej (Zastrzeżonej) — WLDE</strong>. Regulamin i Licencja stanowią całość i obowiązują łącznie.</li>
                    <li>Korzystanie z Aplikacji oznacza pełną akceptację niniejszego Regulaminu oraz Licencji.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 2. Przeznaczenie Aplikacji</h4>
                  <p>Aplikacja przeznaczona jest wyłącznie do:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li><strong>Użytku domowego / prywatnego</strong> — korzystanie przez osoby fizyczne w celach własnych, w tym rozrywkowych i samokształceniowych.</li>
                    <li><strong>Użytku edukacyjnego</strong> — wykorzystanie w placówkach oświatowych (przedszkola, szkoły, uczelnie, świetlice, placówki opiekuńczo-wychowawcze i terapeutyczne) w ramach zajęć dydaktycznych i organizacyjnych.</li>
                  </ol>
                  <p className="italic text-[11px] text-slate-500">Wszelkie inne zastosowania, w tym komercyjne, wymagają uprzedniej pisemnej zgody Autora.</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 3. Zasady korzystania</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Aplikacja jest całkowicie bezpłatna dla zakresu wskazanego w § 2.</li>
                    <li>Aplikacja nie zawiera reklam, mikropłatności ani płatnych subskrypcji.</li>
                    <li>Użytkownik zobowiązuje się korzystać z Aplikacji zgodnie z jej przeznaczeniem oraz obowiązującym prawem.</li>
                    <li>Zabronione jest podejmowanie działań mogących zakłócić działanie Aplikacji lub narazić innych użytkowników na szkodę.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 4. Prawa autorskie i licencja</h4>
                  <p>Wszelkie prawa do Aplikacji — kod źródłowy, interfejs graficzny, projekt wizualny, treści i dokumentacja — należą wyłącznie do Autora i są chronione prawem autorskim.</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden my-2 text-[11px]">
                    <div className="flex bg-slate-100 font-bold border-b border-slate-200">
                      <div className="w-1/4 p-2 border-r border-slate-200 text-center">Status</div>
                      <div className="w-3/4 p-2">Zakres uprawnień</div>
                    </div>
                    <div className="flex border-b border-slate-100">
                      <div className="w-1/4 p-2 border-r border-slate-200 font-bold text-red-600 text-center">❌ Zabronione</div>
                      <div className="w-3/4 p-2">Kopiowanie, modyfikowanie, dekompilowanie, rozpowszechnianie, sprzedaż lub komercjalizacja Aplikacji bądź jej części bez pisemnej zgody Autora.</div>
                    </div>
                    <div className="flex">
                      <div className="w-1/4 p-2 border-r border-slate-200 font-bold text-emerald-600 text-center">✅ Dozwolone</div>
                      <div className="w-3/4 p-2">Korzystanie z Aplikacji zgodnie z jej przeznaczeniem (§ 2) oraz udostępnianie linku do Aplikacji innym osobom.</div>
                    </div>
                  </div>
                  <p>Szczegółowe warunki licencyjne określa sekcja Licencji poniżej. W sprawach zgody na inne wykorzystanie prosimy o kontakt z Autorem.</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 5. Dane i prywatność (RODO/GDPR)</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Aplikacja <strong>nie wymaga rejestracji ani logowania</strong> i nie zbiera danych osobowych na zewnętrznych serwerach.</li>
                    <li>Dane wprowadzane do Aplikacji (w tym plany lekcji, wykazy nauczycieli, gabinetów i dyżurów) przechowywane są <strong>wyłącznie lokalnie w pamięci przeglądarki użytkownika</strong> (<code>localStorage</code>) i nigdy nie opuszczają jego urządzenia.</li>
                    <li>Administratorem danych osobowych wprowadzanych do programu (jeśli dotyczy) jest wyłącznie Użytkownik końcowy (np. szkoła, nauczyciel, opiekun) — Autor nie ma technicznego dostępu do tych danych.</li>
                    <li>Aplikacja nie używa plików cookie, narzędzi analitycznych ani reklamowych systemów śledzenia.</li>
                    <li>Użytkownik może w każdej chwili usunąć swoje dane, czyszcząc dane przeglądarki lub korzystając z funkcji czyszczenia w statystykach / resetu bazy.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 6. Odpowiedzialność</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Aplikacja udostępniana jest w stanie „takim, jakim jest” (<em>as is</em>), bez jakichkolwiek gwarancji.</li>
                    <li>Autor nie ponosi odpowiedzialności za utratę danych, błędy działania, awarie sprzętu lub szkody wynikające z korzystania bądź niemożności korzystania z Aplikacji.</li>
                    <li>Zaleca się regularne tworzenie kopii zapasowych danych poprzez eksport bazy danych do pliku JSON.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 7. Zmiany Regulaminu</h4>
                  <p>Autor zastrzega sobie prawo do zmiany Regulaminu oraz aktualizacji Aplikacji bez uprzedzenia. Dalsze korzystanie z Aplikacji po opublikowaniu zmian oznacza ich akceptację.</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 8. Postanowienia końcowe</h4>
                  <p>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego oraz ustawy o prawie autorskim i prawach pokrewnych.</p>
                  <p className="font-semibold text-[11px] text-slate-700">Kontakt: kjureczek@proton.me · github.com/krzjur-oss</p>
                </div>

                <div className="text-center pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-bold">
                  © 2026 Krzysztof Jureczek · Wszelkie prawa zastrzeżone
                </div>
              </div>
            </div>

            {/* 3. LICENCJA */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award size={16} className="text-emerald-500" /> 📄 Licencja Użytkowania Oprogramowania (WLDE)
              </h3>
              <div className="text-xs text-slate-600 space-y-4 leading-relaxed bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <div className="text-center pb-3 border-b border-slate-200">
                  <h4 className="font-black text-slate-800 text-sm">Wolna Licencja Domowo-Edukacyjna (Zastrzeżona) — WLDE</h4>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">Projekt: SalePlan Pro (wersja v3.2.1 i wyższe)</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Właściciel praw autorskich i twórca: mgr Krzysztof Jureczek</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Copyright © 2026 Krzysztof Jureczek. Wszelkie prawa zastrzeżone.</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">Kontakt: kjureczek@proton.me · GitHub: github.com/krzjur-oss</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-slate-500">Preambuła</h4>
                  <p className="italic text-slate-600">
                    Niniejsza licencja ma na celu zabezpieczenie niekomercyjnego charakteru projektu <strong>„SalePlan Pro”</strong>. Intencją Autora jest bezpłatne udostępnienie aplikacji do użytku domowego (prywatnego) oraz placówkom edukacyjnym, przy jednoczesnym pełnym zachowaniu praw autorskich, integralności kodu źródłowego oraz zakazie jakiejkolwiek komercjalizacji, kopiowania, modyfikacji i rozpowszechniania Oprogramowania bez pisemnej zgody Autora.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 1. Definicje</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li><strong>Oprogramowanie</strong> – aplikacja „SalePlan Pro” wraz z całym kodem źródłowym, plikami wykonywalnymi, grafiką, zasobami multimedialnymi oraz dokumentacją.</li>
                    <li><strong>Autor / Licencjodawca</strong> – mgr Krzysztof Jureczek, jedyny twórca i wyłączny dysponent autorskich praw majątkowych i osobistych do Oprogramowania.</li>
                    <li><strong>Użytkownik / Licencjobiorca</strong> – każda osoba fizyczna korzystająca z Oprogramowania w celach domowych/prywatnych, a także każda szkoła, przedszkole, uczelnia lub inna placówka oświatowo-wychowawcza korzystająca z Oprogramowania w celach dydaktycznych i organizacyjnych.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 2. Dozwolony użytek (Bezpłatny)</h4>
                  <p>Autor udziela Użytkownikowi bezpłatnej, niewyłącznej, nieprzenoszalnej i ograniczonej licencji na korzystanie z Oprogramowania wyłącznie w następujących celach:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li><strong>Użytek domowy / prywatny</strong> – instalowanie i uruchamianie Oprogramowania przez osoby fizyczne na własny, niekomercyjny użytek, w tym cele rozrywkowe i samokształceniowe.</li>
                    <li><strong>Użytek edukacyjny</strong> – wykorzystanie Oprogramowania w placówkach oświatowych (przedszkola, szkoły podstawowe i ponadpodstawowe, uczelnie wyższe, świetlice, placówki opiekuńczo-wychowawcze i terapeutyczne) na zajęciach, lekcjach, wykładach, kołach zainteresowań oraz do wewnętrznej organizacji zajęć.</li>
                    <li><strong>Instalacja lokalna</strong> – uruchamianie i przechowywanie Oprogramowania (w tym w trybie offline/PWA) na urządzeniach własnych Użytkownika lub placówki.</li>
                    <li><strong>Prezentacje niekomercyjne</strong> – publiczne demonstrowanie działania Oprogramowania w celach popularyzacji nauki i technologii, pod warunkiem wskazania autorstwa.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 3. Zakazy i ograniczenia</h4>
                  <p>Wszelkie działania wykraczające poza § 2 wymagają uprzedniej, pisemnej zgody Autora. W szczególności <strong>surowo zabrania się</strong>:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li><strong>Kopiowania kodu</strong> – kopiowania, powielania, pobierania w celu redystrybucji, dekompilacji lub inżynierii wstecznej kodu źródłowego lub skompilowanych plików Oprogramowania.</li>
                    <li><strong>Modyfikacji</strong> – wprowadzania jakichkolwiek zmian w kodzie źródłowym, interfejsie, grafice, logotypach, treściach lub innych zasobach Oprogramowania.</li>
                    <li><strong>Rozpowszechniania</strong> – dystrybuowania, udostępniania, sublicencjonowania, wynajmu, publikowania kopii lub „forków” Oprogramowania osobom trzecim, w tym poprzez repozytoria (GitHub, GitLab), sklepy z aplikacjami lub inne serwery pobierania.</li>
                    <li><strong>Sprzedaży i komercjalizacji</strong> – sprzedaży, pobierania jakichkolwiek opłat (bezpośrednich lub pośrednich) za dostęp, instalację lub użytkowanie Oprogramowania, umieszczania go w płatnych pakietach, za bramkami płatniczymi, w serwisach z reklamami czerpiącymi zysk z ruchu użytkowników, ani wykorzystywania go do świadczenia odpłatnych usług.</li>
                    <li><strong>Usuwania oznaczeń autorskich</strong> – usuwania, ukrywania lub modyfikowania informacji o Autorze, prawach autorskich, logotypach oraz odnośników do niniejszej licencji.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 4. Własność intelektualna i integralność</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Oprogramowanie oraz wszelkie związane z nim prawa autorskie i prawa własności intelektualnej stanowią wyłączną własność Autora.</li>
                    <li>Niniejsza licencja nie przenosi na Użytkownika żadnych praw własności do Oprogramowania — udziela wyłącznie prawa do bezpłatnego korzystania zgodnie z § 2.</li>
                    <li>Użytkownik zobowiązuje się zachować w niezmienionym stanie wszystkie oznaczenia praw autorskich i informacje o Autorze zawarte w Oprogramowaniu.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 5. Wyłączenie odpowiedzialności (As Is)</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Oprogramowanie dostarczane jest w stanie, w jakim się znajduje („AS IS”), bez jakichkolwiek gwarancji, wyraźnych lub dorozumianych, w tym gwarancji przydatności do określonego celu czy nieprzerwanego, bezbłędnego działania.</li>
                    <li>Autor nie ponosi odpowiedzialności za jakiekolwiek szkody bezpośrednie, pośrednie lub następcze wynikłe z użytkowania lub niemożności użytkowania Oprogramowania, w tym utratę danych.</li>
                  </ol>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 6. Rozwiązanie licencji</h4>
                  <p>Naruszenie któregokolwiek z warunków niniejszej licencji skutkuje jej natychmiastowym i automatycznym wygaśnięciem. Użytkownik zobowiązany jest wówczas do trwałego usunięcia wszystkich kopii Oprogramowania ze swoich nośników i systemów.</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 7. Postanowienia końcowe</h4>
                  <p>W sprawach nieuregulowanych niniejszą licencją zastosowanie mają przepisy ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych oraz Kodeksu cywilnego RP. Wszelkie spory rozstrzyga sąd właściwy dla siedziby Licencjodawcy.</p>
                </div>

                <div className="text-right pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-bold">
                  Tarnowskie Góry, Śląskie, lipiec 2026 r.
                </div>
              </div>
            </div>

          </div>
        </div>
        ) : (
          <Changelog />
        )}

        {/* STOPKA O PROGRAMIE */}
        <div className="text-center text-[10px] text-slate-400 font-bold border-t border-slate-200 pt-5 flex items-center justify-center gap-3">
          <span>SalePlan Pro © 2026. Wszystkie prawa zastrzeżone.</span>
          <span className="text-slate-300">|</span>
          <span className="text-red-500 flex items-center gap-0.5"><Heart size={8} fill="currentColor" /> Napisane z pasją dla polskiej edukacji</span>
        </div>

      </div>
    </div>
  );
}
