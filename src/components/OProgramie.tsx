import React from 'react';
import { 
  Info, User, FileText, Shield, Award, HelpCircle, Heart, HeartHandshake, CheckCircle2, ChevronRight, Mail, ExternalLink, Globe, KeyRound, Github
} from 'lucide-react';

export default function OProgramie() {
  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-8" id="page-o-programie">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        
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
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-100 mt-1">v3.0</span>
          </div>
        </div>

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
                    <p className="font-extrabold text-slate-800">Krzysztof J. (KrzJur)</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none mt-0.5">Full Stack Developer</p>
                  </div>
                </div>
                <div className="pt-2 space-y-1.5">
                  <a 
                    href="https://github.com/KrzJur-oss/SalePlanPro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-blue-600 transition"
                  >
                    <Github size={12} className="text-slate-400" /> github.com/KrzJur-oss/SalePlanPro
                  </a>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Globe size={12} className="text-slate-400" /> Rzeszów / Warszawa, Polska
                  </div>
                </div>
                <p className="text-[10px] text-slate-450 leading-relaxed pt-1.5 border-t border-slate-100 italic">
                  Pasjonat systemów optymalizacji czasu pracy w jednostkach oświatowych i algorytmiki harmonogramowania.
                </p>
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
                <FileText size={16} className="text-indigo-500" /> ⚖️ Regulamin korzystania z programu
              </h3>
              <div className="text-xs text-slate-600 space-y-4 leading-relaxed">
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 1. Postanowienia ogólne</h4>
                  <p>
                    Niniejsze oprogramowanie jest udostępniane na zasadach określonych w niniejszym regulaminie jako bezpłatny asystent planowania i organizowania pracy placówek oświatowych. Użytkowanie programu jest dobrowolne.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 2. Zasady korzystania i dane</h4>
                  <p>
                    Aplikacja przetwarza i zapisuje dane (nazwy szkół, imiona i nazwiska nauczycieli, plany lekcji) wyłącznie lokalnie na urządzeniu Użytkownika. Administrator ani autor oprogramowania nie zbiera, nie kopiuje ani nie przechowuje danych wprowadzanych przez użytkowników na serwerach zewnętrznych.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 3. Ograniczenie odpowiedzialności</h4>
                  <p>
                    Użytkownik przed wdrożeniem wygenerowanego i ułożonego w programie planu lekcji ma obowiązek manualnej weryfikacji poprawności ułożenia zajęć pod kątem polskiego prawa oświatowego oraz BHP szkoły. Autor nie ponosi odpowiedzialności za jakiekolwiek błędy w organizacji pracy placówki wynikające bezpośrednio lub pośrednio ze stosowania oprogramowania.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-700">§ 4. Wersje i kopie zapasowe</h4>
                  <p>
                    Ponieważ pamięć podręczna przeglądarki może ulec wyczyszczeniu podczas reinstallacji lub czyszczenia systemu operacyjnego, zaleca się regularne pobieranie i eksportowanie kopii zapasowej planów do zewnętrznych plików JSON.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. LICENCJA */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award size={16} className="text-emerald-500" /> 📄 Darmowa Licencja Edukacyjna (Zastrzeżona)
              </h3>
              <div className="text-xs text-slate-650 space-y-3 leading-relaxed bg-slate-50 p-4 border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
                <p className="font-bold text-slate-850 border-b border-slate-200 pb-1.5">Warunki licencyjne SalePlan Pro v3:</p>
                <p><strong>1. Dozwolony użytek:</strong> Licencja udziela bezpłatnego, niewyłącznego prawa do korzystania z Oprogramowania na terenie i na potrzeby placówek oświatowych (np. szkół i przedszkoli).</p>
                <p><strong>2. Zastrzeżenie praw i zakazy:</strong> Użytkownik ani osoby trzecie nie mają prawa do:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>kopiowania i powielania kodu źródłowego poza potrzebami własnymi placówki,</li>
                  <li>dystrybuowania, rozpowszechniania lub udostępniania kodu bez zgody autora,</li>
                  <li>modyfikowania, zmieniania kodu źródłowego lub tworzenia projektów zależnych,</li>
                  <li>komercjalizacji, sprzedaży lub czerpania korzyści majątkowych z oprogramowania.</li>
                </ul>
                <p className="pt-2"><strong>3. Brak gwarancji:</strong> Oprogramowanie dostarczane jest w stanie "takim, jakie jest" (AS IS). Autor nie odpowiada za ewentualne błędy i skutki ich wystąpienia.</p>
              </div>
            </div>

          </div>
        </div>

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
