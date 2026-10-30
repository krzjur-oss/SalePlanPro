/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Zaawansowane Raporty Excel i Mobilne Kody QR (EksportIRaporty.tsx)
 * Opis: Centrum eksportu arkuszy .xlsx z pełnym formatowaniem oraz generator
 *       kodów QR do planów mobilnych offline dla uczniów, nauczycieli i sal.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { AppState, SchedData, Class, Teacher, ClassRoom } from '../types';
import { QrItemConfig, QrPrintSheetTemplate, QrTargetType } from '../types/reports';
import { 
  FileSpreadsheet, QrCode, Download, Printer, Copy, Check, ExternalLink,
  Search, Filter, Smartphone, CheckCircle, Sparkles, Layers, User, MapPin,
  Calendar, Shield, Sliders, Info, Eye, X, BookOpen, AlertCircle
} from 'lucide-react';
import { 
  exportFullSchoolWorkbook, 
  createClassesSheet,
  createTeachersSheet,
  createRoomsSheet,
  createDutiesSheet,
  createWorkloadSheet,
  createSingleClassSheet,
  createSingleTeacherSheet,
  downloadWorkbook
} from '../services/excelExportService';
import * as XLSX from 'xlsx';
import { 
  generateClassesQrConfigs, 
  generateTeachersQrConfigs, 
  generateRoomsQrConfigs,
  downloadQrPng,
  generateQrPrintHtml
} from '../services/qrPlanService';
import MobilePlanViewer from './MobilePlanViewer';
import { Z_INDEX_CLASSES } from '../styles/zIndex';

interface EksportIRaportyProps {
  appState: AppState;
  schedData: SchedData;
  onOpenMobileViewer?: (type: QrTargetType, id: string) => void;
}

export default function EksportIRaporty({
  appState,
  schedData,
  onOpenMobileViewer
}: EksportIRaportyProps) {
  const pl = appState.planLekcji;

  // Główna podkarta: 'excel' lub 'qrcode'
  const [activeSubTab, setActiveSubTab] = useState<'excel' | 'qrcode'>('excel');

  // Stany opcji eksportu Excel
  const [separateClassSheets, setSeparateClassSheets] = useState(false);
  const [includeClasses, setIncludeClasses] = useState(true);
  const [includeTeachers, setIncludeTeachers] = useState(true);
  const [includeRooms, setIncludeRooms] = useState(true);
  const [includeDuties, setIncludeDuties] = useState(true);
  const [includeWorkload, setIncludeWorkload] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>(pl.classes[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(pl.teachers[0]?.id || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(pl.rooms[0]?.id || '');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Stany Kodów QR
  const [qrCategory, setQrCategory] = useState<QrTargetType>('class');
  const [qrSearchQuery, setQrSearchQuery] = useState('');
  const [qrItems, setQrItems] = useState<QrItemConfig[]>([]);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [printTemplate, setPrintTemplate] = useState<QrPrintSheetTemplate>('cards_6');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Symulator widoku mobilnego w aplikacji
  const [previewModalItem, setPreviewModalItem] = useState<{ type: QrTargetType; id: string } | null>(null);

  // Załadowanie konfiguracji kodów QR po zmianie kategorii
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingQr(true);

    const loadQr = async () => {
      try {
        let items: QrItemConfig[] = [];
        if (qrCategory === 'class') {
          items = await generateClassesQrConfigs(appState);
        } else if (qrCategory === 'teacher') {
          items = await generateTeachersQrConfigs(appState);
        } else if (qrCategory === 'room') {
          items = await generateRoomsQrConfigs(appState);
        }

        if (!isCancelled) {
          setQrItems(items);
          setIsLoadingQr(false);
        }
      } catch (err) {
        console.error('Błąd generowania kodów QR:', err);
        if (!isCancelled) setIsLoadingQr(false);
      }
    };

    loadQr();
    return () => {
      isCancelled = true;
    };
  }, [qrCategory, appState]);

  // Filtrowanie listy kodów QR
  const filteredQrItems = useMemo(() => {
    if (!qrSearchQuery.trim()) return qrItems;
    const q = qrSearchQuery.toLowerCase().trim();
    return qrItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.subtitle.toLowerCase().includes(q) ||
      (item.tag && item.tag.toLowerCase().includes(q))
    );
  }, [qrItems, qrSearchQuery]);

  // Obsługa pobrania pełnego pliku Excel
  const handleExportFullExcel = () => {
    setIsExportingExcel(true);
    setTimeout(() => {
      try {
        exportFullSchoolWorkbook(appState, schedData, {
          includeClasses,
          includeTeachers,
          includeRooms,
          includeDuties,
          includeWorkload,
          separateClassSheets,
          schoolName: appState.school?.name || appState.planLekcji?.meta?.schoolName,
          yearLabel: appState.yearLabel
        });
        setExportSuccessMsg('Pomyślnie wygenerowano i pobrano wieloarkuszowy plik Excel (.xlsx)!');
        setTimeout(() => setExportSuccessMsg(null), 4000);
      } catch (e) {
        console.error('Błąd eksportu Excel:', e);
      } finally {
        setIsExportingExcel(false);
      }
    }, 100);
  };

  // Obsługa eksportu pojedynczego arkusza
  const handleExportSingleClass = () => {
    const cls = pl.classes.find(c => c.id === selectedClassId);
    if (!cls) return;
    const wb = XLSX.utils.book_new();
    const ws = createSingleClassSheet(appState, schedData, cls);
    XLSX.utils.book_append_sheet(wb, ws, `Klasa_${cls.name}`);
    downloadWorkbook(wb, `Plan_Klasa_${cls.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportSingleTeacher = () => {
    const teacher = pl.teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;
    const wb = XLSX.utils.book_new();
    const ws = createSingleTeacherSheet(appState, schedData, teacher);
    XLSX.utils.book_append_sheet(wb, ws, `Plan_${teacher.abbr}`);
    downloadWorkbook(wb, `Plan_${teacher.last}_${teacher.first}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportSingleRooms = () => {
    const wb = XLSX.utils.book_new();
    const ws = createRoomsSheet(appState, schedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Oblozenie_Sal');
    downloadWorkbook(wb, `Oblozenie_Sal_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportDutiesOnly = () => {
    const wb = XLSX.utils.book_new();
    const ws = createDutiesSheet(appState);
    XLSX.utils.book_append_sheet(wb, ws, 'Dyżury_Nauczycielskie');
    downloadWorkbook(wb, `Grafik_Dyzurow_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportWorkloadOnly = () => {
    const wb = XLSX.utils.book_new();
    const ws = createWorkloadSheet(appState);
    XLSX.utils.book_append_sheet(wb, ws, 'Bilans_Pensum');
    downloadWorkbook(wb, `Bilans_Pensum_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Kopiowanie linku
  const handleCopyLink = (item: QrItemConfig) => {
    navigator.clipboard.writeText(item.targetUrl).then(() => {
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 2000);
    });
  };

  // Drukowanie kart kodów QR
  const handlePrintQrSheets = () => {
    const html = generateQrPrintHtml(filteredQrItems, printTemplate, appState);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      alert('Przeglądarka zablokowała wyskakujące okno. Zezwól na wyskakujące okna dla tej strony.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-slate-800 overflow-y-auto font-sans p-4 md:p-8 space-y-6">
      {/* GŁÓWNY BANER MODUŁU */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-black uppercase tracking-wider">
              <Sparkles size={13} className="text-emerald-400 animate-pulse" /> Moduł 3: Zaawansowane Raporty i Eksport
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="text-emerald-400" size={30} />
              Arkusze Excel (.xlsx) & Mobilne Kody QR
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Generuj profesjonalne skoroszyty kalkulacyjne Microsoft Excel z kompletem tabel i podsumowań oraz twórz gotowe do wydruku karty z kodami QR dla uczniów, nauczycieli i sal do błyskawicznego podglądu w smartfonie bez konieczności logowania.
            </p>
          </div>

          {/* SZYBKIE PRZEŁĄCZANIE PODKART */}
          <div className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex gap-1 self-start md:self-auto shrink-0 shadow-lg">
            <button
              onClick={() => setActiveSubTab('excel')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition flex items-center gap-2 ${
                activeSubTab === 'excel'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet size={16} />
              <span>Arkusze Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('qrcode')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition flex items-center gap-2 ${
                activeSubTab === 'qrcode'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <QrCode size={16} />
              <span>Mobilne Kody QR</span>
            </button>
          </div>
        </div>

        {/* KOMUNIKAT SUKCESU */}
        {exportSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle size={16} />
            <span>{exportSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PODKARTA 1: ARKUSZE EXCEL (.XLSX)                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'excel' && (
        <div className="space-y-6 animate-in fade-in">
          {/* GŁÓWNA KARTA 1-KLIK: PEŁNY SKOROSZYT */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} /> Kompletny pakiet dyrektorski
                </span>
                <h2 className="text-xl font-black text-white">
                  Pobierz Pełny Skoroszyt Szkoły (.xlsx)
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Zawiera w jednym pliku kompletne arkusze ze sformatowanymi tabelami: Plan wszystkich klas, Harmonogram nauczycieli, Obłożenie i wykorzystanie sal lekcyjnych, Grafik dyżurów oraz Bilans pensum i nadgodzin.
                </p>

                {/* OPCJE SKOROSZYTU */}
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={separateClassSheets}
                      onChange={(e) => setSeparateClassSheets(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Generuj oddzielną zakładkę dla każdego oddziału ({pl.classes.length} klas)</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleExportFullExcel}
                  disabled={isExportingExcel}
                  className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2.5 transition cursor-pointer"
                >
                  <Download size={18} className={isExportingExcel ? 'animate-bounce' : ''} />
                  <span>{isExportingExcel ? 'Generowanie Excela...' : 'Pobierz Pełny Skoroszyt (.xlsx)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* SIATKA POJEDYNCZYCH RAPORTÓW EXCEL */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* KARTA 1: PLAN WYBRANEJ KLASY */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <BookOpen size={18} />
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Arkusz Klasy</span>
                </div>
                <h3 className="text-base font-black text-white">Plan Lekcji Oddziału</h3>
                <p className="text-xs text-slate-400">
                  Tygodniowa siatka zajęć wybranej klasy ze skrótami nauczycieli, gabinetami i godzinami lekcji.
                </p>
                <div className="pt-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Wybierz klasę</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none"
                  >
                    {pl.classes.map(c => (
                      <option key={c.id} value={c.id}>Klasa {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleExportSingleClass}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Pobierz arkusz klasy (.xlsx)
              </button>
            </div>

            {/* KARTA 2: HARMONOGRAM NAUCZYCIELA */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <User size={18} />
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Arkusz Nauczyciela</span>
                </div>
                <h3 className="text-base font-black text-white">Plan Nauczyciela</h3>
                <p className="text-xs text-slate-400">
                  Indywidualny rozkład zajęć pedagoga z salami, oddziałami oraz przypisanymi dyżurami międzylekcyjnymi.
                </p>
                <div className="pt-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Wybierz pedagoga</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none"
                  >
                    {pl.teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.last} {t.first} ({t.abbr})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleExportSingleTeacher}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Pobierz plan pedagoga (.xlsx)
              </button>
            </div>

            {/* KARTA 3: OBŁOŻENIE SAL I GABINETÓW */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <MapPin size={18} />
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Raport Gabinetów</span>
                </div>
                <h3 className="text-base font-black text-white">Obłożenie Wszystkich Sal</h3>
                <p className="text-xs text-slate-400">
                  Zestawienie wykorzystania gabinetów (ogólne, sportowe, indywidualne) wraz z procentowym wskaźnikiem obłożenia.
                </p>
                <div className="pt-2 text-xs text-slate-400">
                  Liczba gabinetów w szkole: <strong className="text-white">{pl.rooms.length}</strong>
                </div>
              </div>

              <button
                onClick={handleExportSingleRooms}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Pobierz obłożenie sal (.xlsx)
              </button>
            </div>

            {/* KARTA 4: GRAFIK DYŻURÓW */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Shield size={18} />
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">BHP i Bezpieczeństwo</span>
                </div>
                <h3 className="text-base font-black text-white">Grafik Dyżurów Przerwowych</h3>
                <p className="text-xs text-slate-400">
                  Tabela obsadzenia stref, pięter i korytarzy podczas przerw międzylekcyjnych z godzinami i nazwiskami nauczycieli.
                </p>
              </div>

              <button
                onClick={handleExportDutiesOnly}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Pobierz grafik dyżurów (.xlsx)
              </button>
            </div>

            {/* KARTA 5: BILANS PENSUM I ETATÓW */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Calendar size={18} />
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kadry i Płace</span>
                </div>
                <h3 className="text-base font-black text-white">Bilans Pensum i Nadgodzin</h3>
                <p className="text-xs text-slate-400">
                  Tabela rozliczeniowa dla dyrekcji i księgowości: etat bazowy, godziny przydzielone, liczba nadgodzin, dyżury i dni pracy.
                </p>
              </div>

              <button
                onClick={handleExportWorkloadOnly}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Pobierz bilans pensum (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PODKARTA 2: MOBILNE KODY QR                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'qrcode' && (
        <div className="space-y-6 animate-in fade-in">
          {/* PASEK KONTROLNY: WYBÓR KATEGORII, SZABLONU I DRUKOWANIE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
            {/* PRZEŁĄCZNIK KATEGORII */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase">Kategoria:</span>
              <button
                onClick={() => setQrCategory('class')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  qrCategory === 'class' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <BookOpen size={14} /> Klasy ({pl.classes.length})
              </button>
              <button
                onClick={() => setQrCategory('teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  qrCategory === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <User size={14} /> Nauczyciele ({pl.teachers.length})
              </button>
              <button
                onClick={() => setQrCategory('room')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  qrCategory === 'room' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MapPin size={14} /> Sale Lekcyjne ({pl.rooms.length})
              </button>
            </div>

            {/* WYSZUKIWARKA I DRUK A4 */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Szukaj (np. 1A, Kowalski, 102)..."
                  value={qrSearchQuery}
                  onChange={(e) => setQrSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {/* WYBÓR SZABLONU WYDRUKU A4 */}
              <select
                value={printTemplate}
                onChange={(e) => setPrintTemplate(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none"
              >
                <option value="cards_6">Szablon: 6 kart A4 (Identyfikatory)</option>
                <option value="cards_12">Szablon: 12 naklejek A4 (Zeszyty/Legitymacje)</option>
                <option value="stickers_door">Szablon: Zawieszki na drzwi gabinetów</option>
              </select>

              <button
                onClick={handlePrintQrSheets}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg transition shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Wydrukuj wygenerowane karty z kodami QR na drukarce lub do pliku PDF"
              >
                <Printer size={15} /> Drukuj arkusze A4
              </button>
            </div>
          </div>

          {/* SIATKA KART Z KODAMI QR */}
          {isLoadingQr ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-400">Generowanie kodów QR wysokiej rozdzielczości...</p>
            </div>
          ) : filteredQrItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <AlertCircle size={28} className="mx-auto text-slate-500" />
              <h3 className="text-sm font-bold text-white">Nie znaleziono pasujących elementów</h3>
              <p className="text-xs text-slate-400">Zmień frazę wyszukiwania lub wybierz inną kategorię.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredQrItems.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded uppercase">
                        {item.tag || item.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">{appState.school?.name || appState.planLekcji?.meta?.schoolName || 'Szkoła'}</span>
                    </div>

                    <h4 className="text-base font-black text-white leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                      {item.subtitle}
                    </p>

                    {/* OBRAZEK KODU QR */}
                    <div className="bg-white p-3 rounded-lg flex items-center justify-center my-2 shadow-inner">
                      {item.qrDataUrl ? (
                        <img 
                          src={item.qrDataUrl} 
                          alt={item.title} 
                          className="w-36 h-36 object-contain" 
                        />
                      ) : (
                        <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                          Ładowanie QR...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRZYCISKI AKCJI */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setPreviewModalItem({ type: item.type, id: item.id })}
                        className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Otwórz symulator podglądu mobilnego"
                      >
                        <Smartphone size={13} /> Podgląd
                      </button>

                      <button
                        onClick={() => handleCopyLink(item)}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Kopiuj bezpośredni adres URL planu"
                      >
                        {copiedItemId === item.id ? (
                          <>
                            <Check size={13} className="text-emerald-400" /> Skopiowano
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Kopiuj link
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => item.qrDataUrl && downloadQrPng(item.qrDataUrl, `QR_${item.title.replace(/\s+/g, '_')}`)}
                      className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download size={12} /> Pobierz grafikę QR (.png)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SYMULATORA SMARTFONA (PODGLĄD MOBILNY)                               */}
      {/* ========================================================================= */}
      {previewModalItem && (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-md ${Z_INDEX_CLASSES.MODAL} flex items-center justify-center p-4`}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm h-[88vh] flex flex-col overflow-hidden shadow-2xl relative ring-1 ring-slate-700">
            {/* RAMKA GÓRNA SMARTFONA */}
            <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800 shrink-0">
              <span className="text-[10px] font-bold text-slate-400">📱 Symulator Smartfona</span>
              <button
                onClick={() => setPreviewModalItem(null)}
                className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* WIDOK MOBILNY WEWNĄTRZ SYMULATORA */}
            <div className="flex-1 overflow-y-auto">
              <MobilePlanViewer
                appState={appState}
                schedData={schedData}
                initialType={previewModalItem.type}
                initialId={previewModalItem.id}
                onBackToApp={() => setPreviewModalItem(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
