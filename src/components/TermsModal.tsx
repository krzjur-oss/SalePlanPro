import React, { useState } from 'react';
import { Shield, FileText, Award, CheckCircle2, Lock, Scale, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  isReviewMode?: boolean;
  onClose?: () => void;
}

export default function TermsModal({ isOpen, onAccept, isReviewMode = false, onClose }: TermsModalProps) {
  const [activeTab, setActiveTab] = useState<'regulamin' | 'licencja'>('regulamin');
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* NAGŁÓWEK */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 shrink-0 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                <Scale size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 font-mono">
                    SalePlan Pro v3.8.5
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {isReviewMode ? 'Podgląd dokumentów prawnych' : 'Wymagana akceptacja warunków'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Regulamin i Licencja Użytkowania
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                  Prosimy o zapoznanie się z warunkami korzystania oraz zasadami ochrony prywatności przed rozpoczęciem pracy.
                </p>
              </div>
            </div>

            {isReviewMode && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Zamknij"
              >
                ✕
              </button>
            )}
          </div>

          {/* 3 KROKI BEZPIECZEŃSTWA / HIGHLIGHTS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                <Lock size={14} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-black text-slate-100 truncate">100% Prywatności (RODO)</h4>
                <p className="text-[9.5px] text-slate-400 leading-tight">Dane zostają wyłącznie w Twojej przeglądarce</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                <Award size={14} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-black text-slate-100 truncate">Wolna Licencja WLDE</h4>
                <p className="text-[9.5px] text-slate-400 leading-tight">Bezpłatne dla placówek oświatowych w Polsce</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                <Shield size={14} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-black text-slate-100 truncate">Brak reklam i śledzenia</h4>
                <p className="text-[9.5px] text-slate-400 leading-tight">Brak ciasteczek i komercyjnego trackingu</p>
              </div>
            </div>
          </div>
        </div>

        {/* ZAKŁADKI: REGULAMIN / LICENCJA */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('regulamin')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'regulamin'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl border-t border-x'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={14} /> 1. Regulamin i Polityka Prywatności
          </button>
          <button
            onClick={() => setActiveTab('licencja')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'licencja'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl border-t border-x'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award size={14} /> 2. Wolna Licencja Edukacyjna (WLDE)
          </button>
        </div>

        {/* TREŚĆ DOKUMENTÓW (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-600 leading-relaxed custom-scrollbar bg-slate-50/30">
          {activeTab === 'regulamin' ? (
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="border-b border-slate-100 pb-3 text-center">
                <h3 className="font-black text-slate-800 text-sm">
                  Regulamin i Polityka Prywatności aplikacji „SalePlan Pro”
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  Wersja v3.8.5 · Obowiązuje od 29 lipca 2026 r.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 1. Postanowienia ogólne</h4>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Niniejszy Regulamin określa zasady korzystania z aplikacji <strong>„SalePlan Pro”</strong> (dalej: „Aplikacja”), dostępnej pod bieżącym adresem internetowym.</li>
                  <li>Właścicielem, twórcą i jedynym autorem Aplikacji jest <strong>mgr Krzysztof Jureczek</strong> (dalej: „Autor”).</li>
                  <li>Aplikacja dystrybuowana jest na warunkach <strong>Wolnej Licencji Domowo-Edukacyjnej (Zastrzeżonej) — WLDE</strong>. Regulamin i Licencja stanowią całość i obowiązują łącznie.</li>
                  <li>Korzystanie z Aplikacji oznacza pełną akceptację niniejszego Regulaminu oraz Licencji.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 2. Przeznaczenie Aplikacji</h4>
                <p>Aplikacja przeznaczona jest wyłącznie do:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><strong>Użytku domowego / prywatnego</strong> — korzystanie przez osoby fizyczne w celach własnych, w tym samokształceniowych.</li>
                  <li><strong>Użytku edukacyjnego</strong> — wykorzystanie w placówkach oświatowych (przedszkola, szkoły podstawowe i ponadpodstawowe, uczelnie, świetlice, placówki opiekuńczo-wychowawcze i terapeutyczne) w ramach zajęć dydaktycznych i organizacyjnych.</li>
                </ol>
                <p className="italic text-[11px] text-slate-500">Wszelkie inne zastosowania, w tym komercyjna odsprzedaż lub usługi odpłatne na bazie kodu, wymagają uprzedniej pisemnej zgody Autora.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 3. Zasady korzystania i bezpłatność</h4>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Aplikacja jest całkowicie <strong>bezpłatna</strong> dla zakresu wskazanego w § 2.</li>
                  <li>Aplikacja nie zawiera żadnych reklam, ukrytych mikropłatności ani płatnych subskrypcji.</li>
                  <li>Użytkownik zobowiązuje się korzystać z Aplikacji zgodnie z jej przeznaczeniem oraz obowiązującym prawem oświatowym RP.</li>
                </ol>
              </div>

              <div className="space-y-1.5 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <h4 className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                  <Lock size={13} className="text-emerald-700" /> § 4. Ochrona danych osobowych i prywatność (RODO / GDPR)
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-emerald-800">
                  <li>Aplikacja <strong>nie wymaga rejestracji ani logowania</strong> i nie gromadzi danych na zewnętrznych serwerach w chmurze.</li>
                  <li>Wszystkie dane wprowadzane do programu (plany lekcji, nazwiska nauczycieli, gabinety, harmonogramy dyżurów, dane orzeczeń uczniów ze SPE/NI) są przetwarzane i przechowywane <strong>wyłącznie lokalnie w pamięci przeglądarki użytkownika (baza danych IndexedDB)</strong>.</li>
                  <li>Żadne dane osobowe ani dokumentacja szkolna nigdy nie opuszczają urządzenia użytkownika bez jego świadomej akcji (np. ręcznego eksportu pliku JSON lub wydruku).</li>
                  <li>Administratorem danych osobowych wprowadzanych do programu jest wyłącznie Użytkownik końcowy (np. szkoła, dyrektor, planista) — Autor nie posiada technicznego dostępu do wprowadzanych informacji.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 5. Odpowiedzialność</h4>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Aplikacja udostępniana jest w stanie „takim, jakim jest” (<em>as is</em>), jako zaawansowane narzędzie wspomagające pracę dyrektora i planisty.</li>
                  <li>Autor dokłada najwyższej staranności, aby algorytmy optymalizacji i wykrywania kolizji działały precyzyjnie, jednak ostateczna weryfikacja zgodności planu z przepisami prawa oświatowego oraz higieny pracy spoczywa na dyrekcji szkoły.</li>
                  <li>Zaleca się regularne tworzenie kopii zapasowych bazy danych poprzez funkcję eksportu do pliku JSON.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 6. Postanowienia końcowe</h4>
                <p>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego oraz ustawy o prawie autorskim i prawach pokrewnych.</p>
                <p className="font-semibold text-slate-700 mt-1">Autor: mgr Krzysztof Jureczek · Kontakt: kjureczek@proton.me</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="border-b border-slate-100 pb-3 text-center">
                <h3 className="font-black text-slate-800 text-sm">
                  Wolna Licencja Domowo-Edukacyjna (Zastrzeżona) — WLDE
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  Projekt: SalePlan Pro (wersje v3.3.0–v3.8.5) · Copyright © 2026 Krzysztof Jureczek
                </p>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <h4 className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider text-slate-500">Preambuła</h4>
                <p className="italic text-slate-700 leading-relaxed">
                  Niniejsza licencja ma na celu zabezpieczenie niekomercyjnego i publicznie użytecznego charakteru projektu <strong>„SalePlan Pro”</strong>. Intencją Autora jest bezpłatne udostępnienie aplikacji do użytku domowego oraz placówkom edukacyjnym, przy jednoczesnym pełnym zachowaniu praw autorskich, integralności kodu źródłowego oraz zakazie jakiejkolwiek komercjalizacji, odsprzedaży i nieautoryzowanej modyfikacji.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 1. Przedmiot Licencji</h4>
                <p>Przedmiotem niniejszej licencji jest oprogramowanie <strong>SalePlan Pro</strong>, w tym kod źródłowy, interfejs graficzny, baza algorytmów optymalizacyjnych oraz dołączona dokumentacja techniczna.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 2. Uprawnienia Licencjobiorcy (Dozwolony użytek)</h4>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Licencjobiorca otrzymuje bezpłatną, niewyłączną licencję na uruchamianie i użytkowanie Oprogramowania w celach edukacyjnych oraz organizacyjnych w szkołach i placówkach oświatowych.</li>
                  <li>Dozwolone jest wprowadzanie danych placówki, generowanie planów zajęć, eksportowanie harmonogramów do plików PDF i JSON oraz ich drukowanie i publikowanie dla społeczności szkolnej (uczniowie, rodzice, nauczyciele).</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 3. Ograniczenia i zakazy</h4>
                <div className="border border-red-200 bg-red-50/50 rounded-xl p-3 text-red-900 space-y-1">
                  <p className="font-bold text-xs flex items-center gap-1.5 text-red-700">
                    <AlertTriangle size={13} /> Działania bezwzględnie zabronione:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-800">
                    <li>Odpłatna dystrybucja, sublicencjonowanie, dzierżawa lub sprzedaż Oprogramowania lub jego fragmentów.</li>
                    <li>Usuwanie lub ukrywanie informacji o prawach autorskich, oznaczeń wersji i autorstwa mgr Krzysztofa Jureczka.</li>
                    <li>Dekomplikacja, inżynieria wsteczna w celach komercyjnych lub tworzenie produktów pochodnych bez pisemnej zgody Autora.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-xs">§ 4. Wyłączenie gwarancji i jurysdykcja</h4>
                <p>Oprogramowanie dostarczane jest w stanie, w jakim się znajduje („AS IS”). W sprawach nieuregulowanych zastosowanie mają przepisy ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych.</p>
                <div className="text-right pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                  Tarnowskie Góry, Śląskie, lipiec–wrzesień 2026 r.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STOPKA Z FORMULARZEM AKCEPTACJI */}
        <div className="p-5 sm:p-6 bg-white border-t border-slate-200 shrink-0 space-y-4 shadow-lg">
          {!isReviewMode ? (
            <>
              <label className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 cursor-pointer select-none hover:bg-indigo-50 transition">
                <input
                  type="checkbox"
                  checked={acceptedCheckbox}
                  onChange={(e) => setAcceptedCheckbox(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  Oświadczam, że zapoznałem/am się z treścią <strong>Regulaminu, Polityki Prywatności (RODO)</strong> oraz <strong>Warunków Wolnej Licencji Domowo-Edukacyjnej (WLDE)</strong> aplikacji SalePlan Pro i w pełni akceptuję ich postanowienia.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-400 font-medium text-center sm:text-left">
                  Akceptacja jest wymagana jednorazowo przy pierwszym uruchomieniu programu.
                </p>
                <button
                  type="button"
                  disabled={!acceptedCheckbox}
                  onClick={onAccept}
                  className={`w-full sm:w-auto px-7 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    acceptedCheckbox
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-indigo-500/25 scale-[1.01]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>Akceptuję i przechodzę do programu</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Dokumenty prawne i polityka prywatności aplikacji SalePlan Pro.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
