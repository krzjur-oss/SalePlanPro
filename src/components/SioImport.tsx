import React, { useState, useMemo, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, 
  Settings, Users, BookOpen, GraduationCap, Layers, Check, X, Info, RefreshCw
} from 'lucide-react';
import { AppState, Teacher, Class, Subject, Assignment } from '../types';
import { uid, genAbbr, ensureUniqueAbbr, subjectAbbr } from '../utils';

const PALETTE_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', 
  '#0d9488', '#db2777', '#4f46e5', '#0284c7', '#ea580c', 
  '#84cc16', '#06b6d4', '#ec4899', '#a855f7', '#6366f1'
];

interface SioImportProps {
  appState: AppState;
  onChangeAppState: (newState: AppState) => void;
  onClose: () => void;
  onShowNotification?: (text: string, type?: 'success' | 'info') => void;
}

export default function SioImport({ appState, onChangeAppState, onClose, onShowNotification }: SioImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<string[][] | null>(null);
  const [delimiter, setDelimiter] = useState<string>(';');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [activeSubStep, setActiveSubStep] = useState<'map' | 'preview'>('map');

  // Mappings
  const [teacherCol, setTeacherCol] = useState<number>(-1);
  const [firstNameCol, setFirstNameCol] = useState<number>(-1); // Optional split first name
  const [classCol, setClassCol] = useState<number>(-1);
  const [subjectCol, setSubjectCol] = useState<number>(-1);
  const [hoursCol, setHoursCol] = useState<number>(-1);

  // Selection state for items to import
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, boolean>>({});
  const [selectedClasses, setSelectedClasses] = useState<Record<string, boolean>>({});
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, boolean>>({});
  const [selectedAssignments, setSelectedAssignments] = useState<Record<number, boolean>>({});

  // Additional settings
  const [clearExistingAssignments, setClearExistingAssignments] = useState<boolean>(false);
  const [clearExistingTeachersAndClasses, setClearExistingTeachersAndClasses] = useState<boolean>(false);

  // Active validation tab
  const [activeTab, setActiveTab] = useState<'teachers' | 'classes' | 'subjects' | 'assignments'>('assignments');
  const [filterStatus, setFilterStatus] = useState<'all' | 'errors' | 'warnings' | 'duplicates' | 'valid'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Raw string CSV parser that supports quotes and comma/semicolon separation
  const parseCSV = (text: string, delim: string): string[][] => {
    const lines = text.split(/\r?\n/);
    const result: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row: string[] = [];
      let inQuotes = false;
      let currentVal = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          row.push(currentVal.trim().replace(/^"|"$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim().replace(/^"|"$/g, ''));
      result.push(row);
    }
    return result;
  };

  // Helper to trigger file reading and autodetect structure
  const handleFileContent = (text: string) => {
    setRawText(text);

    // Detect delimiter: count semicolons vs commas in the first 3 lines
    const firstLines = text.split('\n').slice(0, 3).join('\n');
    const semicolons = (firstLines.match(/;/g) || []).length;
    const commas = (firstLines.match(/,/g) || []).length;
    const tabs = (firstLines.match(/\t/g) || []).length;

    let detectedDelim = ';';
    if (commas > semicolons && commas > tabs) detectedDelim = ',';
    if (tabs > semicolons && tabs > commas) detectedDelim = '\t';
    setDelimiter(detectedDelim);

    const rows = parseCSV(text, detectedDelim);
    setParsedRows(rows);

    if (rows.length > 0) {
      const headers = rows[0].map(h => h.toLowerCase().trim());
      
      // Attempt auto-mapping
      let tIdx = -1;
      let fIdx = -1;
      let cIdx = -1;
      let sIdx = -1;
      let hIdx = -1;

      headers.forEach((h, idx) => {
        if (h.includes('nauczyciel') || h.includes('nazwisko') || h === 'nauczyciele' || h.includes('prowadzący') || h.includes('prowadzacy')) {
          if (tIdx === -1) tIdx = idx;
        }
        if (h.includes('imię') || h.includes('imie') || h === 'imiona') {
          if (fIdx === -1) fIdx = idx;
        }
        if (h.includes('klasa') || h.includes('oddział') || h.includes('oddzial') || h === 'klasy' || h === 'oddzialy') {
          if (cIdx === -1) cIdx = idx;
        }
        if (h.includes('przedmiot') || h.includes('zajęcia') || h.includes('zajecia') || h.includes('nazwa zajęć') || h.includes('nazwa zajec')) {
          if (sIdx === -1) sIdx = idx;
        }
        if (h.includes('godzin') || h.includes('wymiar') || h.includes('etat') || h === 'godz' || h === 'godziny') {
          if (hIdx === -1) hIdx = idx;
        }
      });

      // If we found "imię" separate from "nazwisko", set accordingly
      if (tIdx !== -1 && fIdx !== -1 && tIdx === fIdx) {
        // Overlap, reset first name
        fIdx = -1;
      }

      setTeacherCol(tIdx);
      setFirstNameCol(fIdx);
      setClassCol(cIdx);
      setSubjectCol(sIdx);
      setHoursCol(hIdx);
    }

    setActiveSubStep('map');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleFileContent(evt.target.result as string);
        }
      };
      reader.readAsText(droppedFile, 'UTF-8');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleFileContent(evt.target.result as string);
        }
      };
      reader.readAsText(selectedFile, 'UTF-8');
    }
  };

  const handleDelimiterChange = (delim: string) => {
    setDelimiter(delim);
    if (rawText) {
      const rows = parseCSV(rawText, delim);
      setParsedRows(rows);
    }
  };

  // 2. Data extraction and validation
  const validationData = useMemo(() => {
    if (!parsedRows || parsedRows.length < (hasHeader ? 2 : 1)) {
      return { 
        teachers: [], classes: [], subjects: [], assignments: [], errorsCount: 0,
        countMissingClass: 0, countMissingSubject: 0, countInvalidHours: 0,
        countMissingTeacher: 0, countHighHours: 0, countDuplicates: 0
      };
    }

    const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;

    // Helper unique structures
    const rawTeachers = new Map<string, { first: string; last: string; rawName: string }>();
    const rawClasses = new Set<string>();
    const rawSubjects = new Set<string>();

    let countMissingClass = 0;
    let countMissingSubject = 0;
    let countInvalidHours = 0;
    let countMissingTeacher = 0;
    let countHighHours = 0;
    let countDuplicates = 0;

    const assignmentsToValidate: Array<{
      index: number;
      rawClass: string;
      rawTeacher: string;
      rawTeacherFirst?: string;
      rawSubject: string;
      rawHours: string;
      parsedHours: number;
      isValid: boolean;
      errors: string[];
      isDuplicate: boolean;
    }> = [];

    dataRows.forEach((row, idx) => {
      const rawClass = classCol >= 0 && row[classCol] ? row[classCol].trim() : '';
      const rawTeacherRaw = teacherCol >= 0 && row[teacherCol] ? row[teacherCol].trim() : '';
      const rawTeacherFirst = firstNameCol >= 0 && row[firstNameCol] ? row[firstNameCol].trim() : '';
      const rawSubject = subjectCol >= 0 && row[subjectCol] ? row[subjectCol].trim() : '';
      const rawHours = hoursCol >= 0 && row[hoursCol] ? row[hoursCol].trim() : '';

      // Clean up class
      let clsName = rawClass.toUpperCase().replace(/\s+/g, '');
      if (clsName) {
        rawClasses.add(clsName);
      }

      // Clean up subject
      let subjName = rawSubject.replace(/\s+/g, ' ');
      if (subjName) {
        rawSubjects.add(subjName);
      }

      // Clean up teacher
      let teacherKey = '';
      let teacherFirst = '';
      let teacherLast = '';

      if (rawTeacherRaw) {
        // Check if we split name
        if (rawTeacherFirst) {
          teacherFirst = rawTeacherFirst;
          teacherLast = rawTeacherRaw;
        } else {
          // Parse single combined column: "Kowalski Jan" or "Jan Kowalski"
          const parts = rawTeacherRaw.split(/\s+/).filter(Boolean);
          if (parts.length >= 2) {
            // Usually SIO lists "Nazwisko Imię"
            teacherLast = parts[0];
            teacherFirst = parts.slice(1).join(' ');
          } else {
            teacherLast = rawTeacherRaw;
            teacherFirst = '';
          }
        }

        teacherKey = `${teacherLast} ${teacherFirst}`.trim().toLowerCase();
        if (teacherKey) {
          rawTeachers.set(teacherKey, {
            first: teacherFirst,
            last: teacherLast,
            rawName: rawTeacherRaw + (rawTeacherFirst ? ` ${rawTeacherFirst}` : '')
          });
        }
      }

      // Parse hours
      let parsedHours = parseFloat(rawHours.replace(',', '.'));
      if (isNaN(parsedHours)) parsedHours = 0;

      // Validate
      const errors: string[] = [];
      if (!rawClass) {
        errors.push('Brak klasy/oddziału');
        countMissingClass++;
      }
      if (!rawSubject) {
        errors.push('Brak przedmiotu');
        countMissingSubject++;
      }
      if (isNaN(parseFloat(rawHours.replace(',', '.'))) || parsedHours <= 0) {
        errors.push('Nieprawidłowy wymiar godzin');
        countInvalidHours++;
      }
      if (rawClass && rawSubject && !rawTeacherRaw) {
        countMissingTeacher++;
      }
      if (parsedHours > 40) {
        countHighHours++;
      }

      // Check duplicate in existing assignments
      let isDuplicate = false;
      if (rawClass && rawSubject) {
        const foundExisting = appState.planLekcji.assignments.some(a => {
          const cls = appState.classes.find(c => c.id === a.classId);
          const subj = appState.subjects.find(s => s.id === a.subjectId);
          const t = appState.teachers.find(teacher => teacher.id === a.teacherId);

          const classMatch = cls?.name.toUpperCase() === clsName;
          const subjectMatch = subj?.name.toLowerCase() === subjName.toLowerCase();
          
          let teacherMatch = false;
          if (!t && !rawTeacherRaw) teacherMatch = true;
          if (t && rawTeacherRaw) {
            const tFullName = `${t.last} ${t.first}`.toLowerCase();
            const tReverseName = `${t.first} ${t.last}`.toLowerCase();
            teacherMatch = tFullName.includes(teacherLast.toLowerCase()) || tReverseName.includes(teacherLast.toLowerCase());
          }

          return classMatch && subjectMatch && teacherMatch && a.hoursPerWeek === parsedHours;
        });
        if (foundExisting) {
          isDuplicate = true;
          countDuplicates++;
        }
      }

      assignmentsToValidate.push({
        index: idx,
        rawClass: clsName,
        rawTeacher: rawTeacherRaw ? `${teacherLast} ${teacherFirst}`.trim() : '',
        rawTeacherFirst,
        rawSubject: subjName,
        rawHours,
        parsedHours,
        isValid: errors.length === 0,
        errors,
        isDuplicate
      });
    });

    // Structure mapped list of teachers
    const processedTeachers = Array.from(rawTeachers.values()).map(t => {
      // Look for match in existing database
      const existing = appState.teachers.find(et => {
        const etFull = `${et.last} ${et.first}`.toLowerCase();
        const etRev = `${et.first} ${et.last}`.toLowerCase();
        const tFull = `${t.last} ${t.first}`.toLowerCase();
        return etFull === tFull || etRev === tFull || et.abbr.toLowerCase() === genAbbr(t.first, t.last).toLowerCase();
      });

      return {
        first: t.first,
        last: t.last,
        rawName: t.rawName,
        existingId: existing?.id || null,
        existingAbbr: existing?.abbr || null,
        status: existing ? 'exists' : 'new'
      };
    });

    // Structure mapped list of classes
    const processedClasses = Array.from(rawClasses).map(cls => {
      const existing = appState.classes.find(ec => ec.name.toUpperCase() === cls);
      return {
        name: cls,
        existingId: existing?.id || null,
        status: existing ? 'exists' : 'new'
      };
    });

    // Structure mapped list of subjects
    const processedSubjects = Array.from(rawSubjects).map(subj => {
      const existing = appState.subjects.find(es => es.name.toLowerCase() === subj.toLowerCase());
      return {
        name: subj,
        existingId: existing?.id || null,
        existingShort: existing?.short || null,
        status: existing ? 'exists' : 'new'
      };
    });

    const errorsCount = assignmentsToValidate.reduce((sum, a) => sum + (a.isValid ? 0 : 1), 0);

    return {
      teachers: processedTeachers,
      classes: processedClasses,
      subjects: processedSubjects,
      assignments: assignmentsToValidate,
      errorsCount,
      countMissingClass,
      countMissingSubject,
      countInvalidHours,
      countMissingTeacher,
      countHighHours,
      countDuplicates
    };
  }, [parsedRows, hasHeader, classCol, teacherCol, firstNameCol, subjectCol, hoursCol, appState]);

  const filteredAssignments = useMemo(() => {
    return validationData.assignments.filter(a => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'errors') return !a.isValid;
      if (filterStatus === 'warnings') return a.isValid && (!a.rawTeacher || a.parsedHours > 40 || a.isDuplicate);
      if (filterStatus === 'duplicates') return a.isDuplicate;
      if (filterStatus === 'valid') return a.isValid && !a.isDuplicate;
      if (filterStatus === 'missing_class') return !a.rawClass;
      if (filterStatus === 'missing_subject') return !a.rawSubject;
      if (filterStatus === 'invalid_hours') {
        const parsed = parseFloat(a.rawHours.replace(',', '.'));
        return isNaN(parsed) || parsed <= 0;
      }
      if (filterStatus === 'missing_teacher') return !a.rawTeacher;
      if (filterStatus === 'high_hours') return a.parsedHours > 40;
      return true;
    });
  }, [validationData.assignments, filterStatus]);

  // Handle setting all select-checkbox states on first transition to preview
  const handleProceedToPreview = () => {
    // Select all teachers, classes, subjects, and assignments without errors by default
    const newTeachersSel: Record<string, boolean> = {};
    validationData.teachers.forEach(t => {
      newTeachersSel[`${t.last}|${t.first}`] = true;
    });

    const newClassesSel: Record<string, boolean> = {};
    validationData.classes.forEach(c => {
      newClassesSel[c.name] = true;
    });

    const newSubjectsSel: Record<string, boolean> = {};
    validationData.subjects.forEach(s => {
      newSubjectsSel[s.name] = true;
    });

    const newAsgSel: Record<number, boolean> = {};
    validationData.assignments.forEach(a => {
      newAsgSel[a.index] = a.isValid && !a.isDuplicate; // skip duplicates by default, let user enable them
    });

    setSelectedTeachers(newTeachersSel);
    setSelectedClasses(newClassesSel);
    setSelectedSubjects(newSubjectsSel);
    setSelectedAssignments(newAsgSel);

    setActiveSubStep('preview');
    // Pre-select first appropriate active tab
    if (validationData.assignments.length > 0) {
      setActiveTab('assignments');
    } else if (validationData.teachers.length > 0) {
      setActiveTab('teachers');
    } else if (validationData.classes.length > 0) {
      setActiveTab('classes');
    } else {
      setActiveTab('subjects');
    }
  };

  // Perform importing data
  const handleImportExecute = () => {
    let nextTeachers = clearExistingTeachersAndClasses ? [] : [...appState.teachers];
    let nextClasses = clearExistingTeachersAndClasses ? [] : [...appState.classes];
    let nextSubjects = [...appState.subjects];
    let nextAssignments = clearExistingAssignments ? [] : [...appState.planLekcji.assignments];

    const existingTeacherAbbrs = nextTeachers.map(t => t.abbr);

    // 1. Create chosen teachers
    const teacherIdMap = new Map<string, string>(); // mapped "last|first" -> finalTeacherId
    
    validationData.teachers.forEach(t => {
      const isSelected = selectedTeachers[`${t.last}|${t.first}`];
      if (t.existingId && !clearExistingTeachersAndClasses) {
        teacherIdMap.set(`${t.last}|${t.first}`.toLowerCase(), t.existingId);
      } else if (isSelected) {
        // Generate Unique Abbr
        const rawAbbr = genAbbr(t.first, t.last) || t.last.slice(0, 3).toUpperCase();
        const finalAbbr = ensureUniqueAbbr(rawAbbr, existingTeacherAbbrs);
        existingTeacherAbbrs.push(finalAbbr);

        const newTeacherId = 't_' + uid();
        const colorIdx = nextTeachers.length % PALETTE_COLORS.length;
        const newTeacher: Teacher = {
          id: newTeacherId,
          first: t.first,
          last: t.last,
          abbr: finalAbbr,
          color: PALETTE_COLORS[colorIdx] || '#2563eb',
          overtimeHours: 0,
          maxHours: 40
        };

        nextTeachers.push(newTeacher);
        teacherIdMap.set(`${t.last}|${t.first}`.toLowerCase(), newTeacherId);
      }
    });

    // 2. Create chosen classes
    const classIdMap = new Map<string, string>(); // mapped class name -> finalClassId
    validationData.classes.forEach(c => {
      const isSelected = selectedClasses[c.name];
      if (c.existingId && !clearExistingTeachersAndClasses) {
        classIdMap.set(c.name, c.existingId);
      } else if (isSelected) {
        const newClassId = 'cls_' + uid();
        const colorIdx = nextClasses.length % PALETTE_COLORS.length;
        const newClass: Class = {
          id: newClassId,
          name: c.name,
          color: PALETTE_COLORS[colorIdx] || '#16a34a',
          groupIds: [],
          group: 'cała klasa'
        };

        nextClasses.push(newClass);
        classIdMap.set(c.name, newClassId);
      }
    });

    // 3. Create chosen subjects
    const subjectIdMap = new Map<string, string>(); // mapped subject name -> finalSubjectId
    validationData.subjects.forEach(s => {
      const isSelected = selectedSubjects[s.name];
      if (s.existingId) {
        subjectIdMap.set(s.name.toLowerCase(), s.existingId);
      } else if (isSelected) {
        const newSubjId = 's_' + uid();
        const short = subjectAbbr(s.name) || s.name.slice(0, 3).toUpperCase();
        const colorIdx = nextSubjects.length % PALETTE_COLORS.length;
        const newSubj: Subject = {
          id: newSubjId,
          name: s.name,
          short,
          color: PALETTE_COLORS[colorIdx] || '#ea580c'
        };

        nextSubjects.push(newSubj);
        subjectIdMap.set(s.name.toLowerCase(), newSubjId);
      }
    });

    // 4. Create assignments
    let countAsg = 0;
    validationData.assignments.forEach(a => {
      const isSelected = selectedAssignments[a.index];
      if (isSelected && a.isValid) {
        const finalClassId = classIdMap.get(a.rawClass);
        const finalSubjectId = subjectIdMap.get(a.rawSubject.toLowerCase());
        const finalTeacherId = a.rawTeacher ? teacherIdMap.get(a.rawTeacher.toLowerCase()) : null;

        if (finalClassId && finalSubjectId) {
          const newAsg: Assignment = {
            id: 'a_' + uid(),
            classId: finalClassId,
            teacherId: finalTeacherId || null,
            subjectId: finalSubjectId,
            roomId: null,
            groupId: null,
            hoursPerWeek: a.parsedHours,
            preferredBlockSize: 1
          };
          nextAssignments.push(newAsg);
          countAsg++;
        }
      }
    });

    // Commit changes
    onChangeAppState({
      ...appState,
      classes: nextClasses,
      teachers: nextTeachers,
      subjects: nextSubjects,
      planLekcji: {
        ...appState.planLekcji,
        classes: nextClasses,
        teachers: nextTeachers,
        subjects: nextSubjects,
        assignments: nextAssignments
      }
    });

    onShowNotification?.(`Pomyślnie zaimportowano ${countAsg} przydziałów z SIO!`, 'success');

    // Reset and exit
    onClose();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 space-y-6 max-w-5xl mx-auto" id="sio-import-component">
      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-700">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">📥 Import z SIO / Arkusza Organizacyjnego (CSV)</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Szybkie wprowadzanie nauczycieli, klas, przedmiotów i przydziałów z zewnętrznego pliku.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* STEP 1: UPLOAD ZONE */}
      {!parsedRows && (
        <div 
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
            dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto text-slate-300 mb-4 animate-bounce" size={40} />
          <h4 className="text-xs font-bold text-slate-800">Przeciągnij i upuść plik CSV lub kliknij przycisk poniżej</h4>
          <p className="text-[10px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Plik powinien być w formacie CSV rozdzielanym średnikami (;) lub przecinkami (,) zawierającym kolumny przydziałów (np. klasa, nauczyciel, przedmiot, godziny).
          </p>

          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.txt"
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet size={14} /> Wybierz plik z dysku
          </button>
        </div>
      )}

      {/* STEP 2: CONFIG & PREVIEW */}
      {parsedRows && (
        <div className="space-y-6">
          
          {/* Wizard sub-tabs */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              activeSubStep === 'map' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>
              1. Konfiguracja i mapowanie
            </span>
            <ArrowRight size={14} className="text-slate-400" />
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              activeSubStep === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>
              2. Walidacja i podgląd ({validationData.assignments.length})
            </span>
          </div>

          {/* SubStep 1: COLUMN MAPPING */}
          {activeSubStep === 'map' && (
            <div className="space-y-6">
              
              {/* CSV Parameters */}
              <div className="bg-slate-50/60 p-4 border border-slate-200/60 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">Separator kolumn</label>
                  <select 
                    value={delimiter}
                    onChange={(e) => handleDelimiterChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value=";">Średnik (;)</option>
                    <option value=",">Przecinek (,)</option>
                    <option value="	">Tabulator (\t)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">Wiersz nagłówkowy</label>
                  <div className="flex items-center h-8">
                    <input 
                      type="checkbox" 
                      id="has-header-checkbox"
                      checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-350"
                    />
                    <label htmlFor="has-header-checkbox" className="ml-2 text-xs font-bold text-slate-700 cursor-pointer">Pierwszy wiersz zawiera nagłówki</label>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-[10px] text-slate-450 font-semibold block">Wykryty plik: <strong>{file?.name}</strong></span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Liczba wierszy: <strong>{parsedRows.length}</strong></span>
                </div>
              </div>

              {/* Mapper Fields */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-100 pb-2.5">
                  <Settings size={14} className="text-slate-400" /> Dopasuj kolumny pliku do pól programu
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  {/* Class mapping */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Oddział / Klasa *</label>
                    <select
                      value={classCol}
                      onChange={(e) => setClassCol(parseInt(e.target.value))}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-semibold outline-none ${
                        classCol >= 0 ? 'border-slate-200 bg-emerald-50/20 text-emerald-950 font-bold' : 'border-amber-300 bg-amber-50/20 text-amber-950'
                      }`}
                    >
                      <option value="-1">-- Wybierz kolumnę --</option>
                      {parsedRows[0]?.map((col, idx) => (
                        <option key={idx} value={idx}>{hasHeader ? col : `Kolumna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teacher mapping */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Nauczyciel *</label>
                    <select
                      value={teacherCol}
                      onChange={(e) => setTeacherCol(parseInt(e.target.value))}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-semibold outline-none ${
                        teacherCol >= 0 ? 'border-slate-200 bg-emerald-50/20 text-emerald-950 font-bold' : 'border-amber-300 bg-amber-50/20 text-amber-950'
                      }`}
                    >
                      <option value="-1">-- Wybierz kolumnę --</option>
                      {parsedRows[0]?.map((col, idx) => (
                        <option key={idx} value={idx}>{hasHeader ? col : `Kolumna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Split First Name mapping */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Imię (opcjonalnie)</label>
                    <select
                      value={firstNameCol}
                      onChange={(e) => setFirstNameCol(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none bg-slate-50"
                    >
                      <option value="-1">-- Imię i Nazwisko razem --</option>
                      {parsedRows[0]?.map((col, idx) => (
                        <option key={idx} value={idx}>{hasHeader ? col : `Kolumna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject mapping */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Przedmiot *</label>
                    <select
                      value={subjectCol}
                      onChange={(e) => setSubjectCol(parseInt(e.target.value))}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-semibold outline-none ${
                        subjectCol >= 0 ? 'border-slate-200 bg-emerald-50/20 text-emerald-950 font-bold' : 'border-amber-300 bg-amber-50/20 text-amber-950'
                      }`}
                    >
                      <option value="-1">-- Wybierz kolumnę --</option>
                      {parsedRows[0]?.map((col, idx) => (
                        <option key={idx} value={idx}>{hasHeader ? col : `Kolumna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Hours mapping */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Liczba godzin *</label>
                    <select
                      value={hoursCol}
                      onChange={(e) => setHoursCol(parseInt(e.target.value))}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-semibold outline-none ${
                        hoursCol >= 0 ? 'border-slate-200 bg-emerald-50/20 text-emerald-950 font-bold' : 'border-amber-300 bg-amber-50/20 text-amber-950'
                      }`}
                    >
                      <option value="-1">-- Wybierz kolumnę --</option>
                      {parsedRows[0]?.map((col, idx) => (
                        <option key={idx} value={idx}>{hasHeader ? col : `Kolumna ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* Parsed CSV File Preview Grid (First 3 Rows) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 border-b border-slate-200 py-2.5 px-4 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">📋 Szybki podgląd surowej zawartości pliku (Pierwsze wiersze)</span>
                  <span className="text-[9px] text-slate-400">Pomaga zweryfikować poprawność separacji pól</span>
                </div>
                <div className="overflow-x-auto max-h-40 custom-scrollbar">
                  <table className="w-full text-[11px] text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-2 border-r border-slate-200 text-center text-slate-450 w-10">#</th>
                        {parsedRows[0]?.map((col, colIdx) => {
                          const isMapped = colIdx === classCol || colIdx === teacherCol || colIdx === firstNameCol || colIdx === subjectCol || colIdx === hoursCol;
                          return (
                            <th 
                              key={colIdx} 
                              className={`p-2 border-r border-slate-200 text-left font-bold ${
                                isMapped ? 'bg-indigo-50/60 text-indigo-900 border-b-2 border-b-indigo-500' : 'text-slate-700'
                              }`}
                            >
                              {col}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(1, 4).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-400 bg-slate-50/50">{rowIdx + 2}</td>
                          {row.map((cell, cellIdx) => {
                            const isMapped = cellIdx === classCol || cellIdx === teacherCol || cellIdx === firstNameCol || cellIdx === subjectCol || cellIdx === hoursCol;
                            return (
                              <td 
                                key={cellIdx} 
                                className={`p-2 border-r border-slate-200 ${
                                  isMapped ? 'bg-indigo-50/20 font-semibold' : ''
                                }`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons Step 1 */}
              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => setParsedRows(null)}
                  className="px-4 py-2 text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Wybierz inny plik
                </button>
                <button 
                  disabled={classCol === -1 || subjectCol === -1 || hoursCol === -1}
                  onClick={handleProceedToPreview}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  Dalej: Analiza i Walidacja <ArrowRight size={14} />
                </button>
              </div>

            </div>
          )}

          {/* SubStep 2: DYNAMIC PREVIEW & VALIDATION DASHBOARD */}
          {activeSubStep === 'preview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Main stats counters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                
                {/* Teachers count */}
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`p-3.5 border rounded-2xl text-left transition ${
                    activeTab === 'teachers' 
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <GraduationCap size={16} className="text-blue-500" />
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-black font-mono">
                      {validationData.teachers.filter(t => t.status === 'new').length} nowi
                    </span>
                  </div>
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase mt-2">Nauczyciele</h5>
                  <div className="text-lg font-black text-slate-800 leading-none mt-1">
                    {validationData.teachers.length}
                  </div>
                </button>

                {/* Classes count */}
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`p-3.5 border rounded-2xl text-left transition ${
                    activeTab === 'classes' 
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <Users size={16} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-black font-mono">
                      {validationData.classes.filter(c => c.status === 'new').length} nowe
                    </span>
                  </div>
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase mt-2">Klasy (Oddziały)</h5>
                  <div className="text-lg font-black text-slate-800 leading-none mt-1">
                    {validationData.classes.length}
                  </div>
                </button>

                {/* Subjects count */}
                <button
                  onClick={() => setActiveTab('subjects')}
                  className={`p-3.5 border rounded-2xl text-left transition ${
                    activeTab === 'subjects' 
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <BookOpen size={16} className="text-amber-500" />
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-black font-mono">
                      {validationData.subjects.filter(s => s.status === 'new').length} nowe
                    </span>
                  </div>
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase mt-2">Przedmioty</h5>
                  <div className="text-lg font-black text-slate-800 leading-none mt-1">
                    {validationData.subjects.length}
                  </div>
                </button>

                {/* Assignments count */}
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`p-3.5 border rounded-2xl text-left transition ${
                    activeTab === 'assignments' 
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <Layers size={16} className="text-indigo-500" />
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-black font-mono">
                      {validationData.assignments.filter(a => a.isValid).length} OK
                    </span>
                  </div>
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase mt-2">Przydziały Lekcji</h5>
                  <div className="text-lg font-black text-slate-800 leading-none mt-1">
                    {validationData.assignments.length}
                  </div>
                </button>

                {/* Validation status info block */}
                <div className="p-3.5 border border-slate-200 bg-slate-50 rounded-2xl text-left">
                  <div className="flex justify-between items-center">
                    <AlertTriangle size={16} className={validationData.errorsCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'} />
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black font-mono ${
                      validationData.errorsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {validationData.errorsCount} uwagi
                    </span>
                  </div>
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase mt-2">Status Walidacji</h5>
                  <div className="text-xs font-bold text-slate-700 leading-tight mt-1.5">
                    {validationData.errorsCount > 0 
                      ? 'Wykryto rekordy wymagające korekty' 
                      : 'Dane poprawne, gotowe do importu!'}
                  </div>
                </div>

              </div>

              {/* RAPORT WALIDACJI I BŁĘDÓW SIO (AUDITOR PANEL) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                      <AlertTriangle size={16} className="text-amber-500" />
                      Raport Walidacyjny Weryfikatora SIO
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Analiza spójności danych, formatów i potencjalnych błędów w pliku CSV przed importem
                    </p>
                  </div>
                  {filterStatus !== 'all' && (
                    <button
                      onClick={() => setFilterStatus('all')}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] rounded-lg border border-indigo-200 transition cursor-pointer"
                    >
                      Pokaż wszystkie rekordy
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Błędy Krytyczne (Blokujące import konkretnych wierszy) */}
                  <div className="bg-white border border-red-100 rounded-xl p-4 space-y-3">
                    <h4 className="text-[11px] font-black text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                      Błędy Krytyczne ({validationData.countMissingClass + validationData.countMissingSubject + validationData.countInvalidHours})
                    </h4>
                    <div className="space-y-2 text-xs">
                      
                      {/* 1. Brak oddziału */}
                      <div className="flex items-center justify-between p-2 bg-red-50/40 rounded-lg hover:bg-red-50 transition">
                        <span className="text-slate-700 font-medium">Brak klasy / oddziału w wierszu:</span>
                        <button
                          onClick={() => {
                            setActiveTab('assignments');
                            setFilterStatus('missing_class');
                          }}
                          disabled={validationData.countMissingClass === 0}
                          className={`px-2.5 py-1 rounded font-black font-mono text-[10.5px] transition ${
                            validationData.countMissingClass > 0
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {validationData.countMissingClass} {validationData.countMissingClass === 1 ? 'wiersz' : 'wiersze'}
                        </button>
                      </div>

                      {/* 2. Brak przedmiotu */}
                      <div className="flex items-center justify-between p-2 bg-red-50/40 rounded-lg hover:bg-red-50 transition">
                        <span className="text-slate-700 font-medium">Brak nazwy przedmiotu lekcyjnego:</span>
                        <button
                          onClick={() => {
                            setActiveTab('assignments');
                            setFilterStatus('missing_subject');
                          }}
                          disabled={validationData.countMissingSubject === 0}
                          className={`px-2.5 py-1 rounded font-black font-mono text-[10.5px] transition ${
                            validationData.countMissingSubject > 0
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {validationData.countMissingSubject} {validationData.countMissingSubject === 1 ? 'wiersz' : 'wiersze'}
                        </button>
                      </div>

                      {/* 3. Błędny wymiar godzin */}
                      <div className="flex items-center justify-between p-2 bg-red-50/40 rounded-lg hover:bg-red-50 transition">
                        <span className="text-slate-700 font-medium">Błędny format / brak liczby godzin:</span>
                        <button
                          onClick={() => {
                            setActiveTab('assignments');
                            setFilterStatus('invalid_hours');
                          }}
                          disabled={validationData.countInvalidHours === 0}
                          className={`px-2.5 py-1 rounded font-black font-mono text-[10.5px] transition ${
                            validationData.countInvalidHours > 0
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {validationData.countInvalidHours} {validationData.countInvalidHours === 1 ? 'wiersz' : 'wiersze'}
                        </button>
                      </div>

                    </div>
                    {(validationData.countMissingClass + validationData.countMissingSubject + validationData.countInvalidHours) > 0 && (
                      <p className="text-[10px] text-red-600/85 italic leading-normal">
                        * Wiersze zawierające błędy krytyczne zostaną automatycznie pominięte podczas importu, aby zapobiec błędnym danym. Kliknij liczbę powyżej, by przefiltrować listę.
                      </p>
                    )}
                  </div>

                  {/* Ostrzeżenia i uwagi (Zalecane sprawdzenie) */}
                  <div className="bg-white border border-amber-100 rounded-xl p-4 space-y-3">
                    <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      Ostrzeżenia i Uwagi ({validationData.countMissingTeacher + validationData.countHighHours + validationData.countDuplicates})
                    </h4>
                    <div className="space-y-2 text-xs">
                      
                      {/* 1. Lekcje nieobsadzone */}
                      <div className="flex items-center justify-between p-2 bg-amber-50/40 rounded-lg hover:bg-amber-50 transition">
                        <span className="text-slate-700 font-medium">Wakat (brak nauczyciela / nieobsadzona lekcja):</span>
                        <button
                          onClick={() => {
                            setActiveTab('assignments');
                            setFilterStatus('missing_teacher');
                          }}
                          disabled={validationData.countMissingTeacher === 0}
                          className={`px-2.5 py-1 rounded font-black font-mono text-[10.5px] transition ${
                            validationData.countMissingTeacher > 0
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {validationData.countMissingTeacher} {validationData.countMissingTeacher === 1 ? 'wiersz' : 'wiersze'}
                        </button>
                      </div>

                      {/* 2. Bardzo wysoki wymiar godzin */}
                      <div className="flex items-center justify-between p-2 bg-amber-50/40 rounded-lg hover:bg-amber-50 transition">
                        <span className="text-slate-700 font-medium">Bardzo wysoki wymiar zajęć (&gt;40h tygodniowo):</span>
                        <button
                          onClick={() => {
                            setActiveTab('assignments');
                            setFilterStatus('high_hours');
                          }}
                          disabled={validationData.countHighHours === 0}
                          className={`px-2.5 py-1 rounded font-black font-mono text-[10.5px] transition ${
                            validationData.countHighHours > 0
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {validationData.countHighHours} {validationData.countHighHours === 1 ? 'wiersz' : 'wiersze'}
                        </button>
                      </div>

                      {/* 3. Duplikaty przydziałów */}
                      <div className="flex items-center justify-between p-2 bg-amber-50/40 rounded-lg hover:bg-amber-50 transition">
                        <span className="text-slate-700 font-medium">Przydziały już istniejące w programie:</span>
                        <button
                          onClick={() => {
                            setActiveTab('assignments');
                            setFilterStatus('duplicates');
                          }}
                          disabled={validationData.countDuplicates === 0}
                          className={`px-2.5 py-1 rounded font-black font-mono text-[10.5px] transition ${
                            validationData.countDuplicates > 0
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {validationData.countDuplicates} {validationData.countDuplicates === 1 ? 'wiersz' : 'wiersze'}
                        </button>
                      </div>

                    </div>
                    <p className="text-[10px] text-slate-450 leading-normal">
                      * Uwagi te nie blokują importu. Wakaty można przypisać później. Duplikaty są domyślnie wyłączone z zaznaczenia.
                    </p>
                  </div>

                </div>
              </div>

              {/* LISTS DISPLAY */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                
                {/* 1. TEACHERS LISTING */}
                {activeTab === 'teachers' && (
                  <div className="divide-y divide-slate-100">
                    <div className="bg-slate-50 py-2.5 px-4 flex justify-between items-center text-[10.5px]">
                      <span className="font-black text-slate-500 uppercase tracking-wider">Lista Nauczycieli do zaimportowania</span>
                      <button 
                        onClick={() => {
                          const allChecked = Object.values(selectedTeachers).every(Boolean);
                          const next: Record<string, boolean> = {};
                          validationData.teachers.forEach(t => {
                            next[`${t.last}|${t.first}`] = !allChecked;
                          });
                          setSelectedTeachers(next);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-black"
                      >
                        {Object.values(selectedTeachers).every(Boolean) ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
                      </button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 text-xs">
                      {validationData.teachers.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-semibold italic">Brak wykrytych nauczycieli w wyznaczonych kolumnach</div>
                      ) : (
                        validationData.teachers.map((t, idx) => {
                          const selKey = `${t.last}|${t.first}`;
                          const isSelected = !!selectedTeachers[selKey];
                          return (
                            <div key={idx} className={`p-3 flex justify-between items-center hover:bg-slate-50/50 transition ${!isSelected ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-2.5">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => setSelectedTeachers(p => ({ ...p, [selKey]: !p[selKey] }))}
                                  className="rounded text-indigo-600 w-4 h-4 border-slate-350 cursor-pointer"
                                />
                                <div>
                                  <span className="font-bold text-slate-800 text-[12px]">{t.last} {t.first}</span>
                                  <span className="text-[10px] text-slate-450 block font-mono">Skrót systemowy: {t.existingAbbr || genAbbr(t.first, t.last) || '??'}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {t.status === 'exists' ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                    Dopasowano: ID Istniejące
                                  </span>
                                ) : (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                    Nowy (Zostanie utworzony)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 2. CLASSES LISTING */}
                {activeTab === 'classes' && (
                  <div className="divide-y divide-slate-100">
                    <div className="bg-slate-50 py-2.5 px-4 flex justify-between items-center text-[10.5px]">
                      <span className="font-black text-slate-500 uppercase tracking-wider">Lista Klas / Oddziałów</span>
                      <button 
                        onClick={() => {
                          const allChecked = Object.values(selectedClasses).every(Boolean);
                          const next: Record<string, boolean> = {};
                          validationData.classes.forEach(c => {
                            next[c.name] = !allChecked;
                          });
                          setSelectedClasses(next);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-black"
                      >
                        {Object.values(selectedClasses).every(Boolean) ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 text-xs">
                      {validationData.classes.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-semibold italic">Brak klas w pliku</div>
                      ) : (
                        validationData.classes.map((c, idx) => {
                          const isSelected = !!selectedClasses[c.name];
                          return (
                            <div key={idx} className={`p-3 flex justify-between items-center hover:bg-slate-50/50 transition ${!isSelected ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-2.5">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => setSelectedClasses(p => ({ ...p, [c.name]: !p[c.name] }))}
                                  className="rounded text-indigo-600 w-4 h-4 border-slate-350 cursor-pointer"
                                />
                                <span className="font-black text-slate-800 bg-slate-100 text-[11px] px-2 py-1 rounded-lg border border-slate-200">{c.name}</span>
                              </div>
                              
                              <div>
                                {c.status === 'exists' ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                    Dopasowano: Klasa istnieje
                                  </span>
                                ) : (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                    Nowa (Zostanie utworzona)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 3. SUBJECTS LISTING */}
                {activeTab === 'subjects' && (
                  <div className="divide-y divide-slate-100">
                    <div className="bg-slate-50 py-2.5 px-4 flex justify-between items-center text-[10.5px]">
                      <span className="font-black text-slate-500 uppercase tracking-wider">Lista Przedmiotów lekcyjnych</span>
                      <button 
                        onClick={() => {
                          const allChecked = Object.values(selectedSubjects).every(Boolean);
                          const next: Record<string, boolean> = {};
                          validationData.subjects.forEach(s => {
                            next[s.name] = !allChecked;
                          });
                          setSelectedSubjects(next);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-black"
                      >
                        {Object.values(selectedSubjects).every(Boolean) ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100 text-xs">
                      {validationData.subjects.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-semibold italic">Brak przedmiotów w pliku</div>
                      ) : (
                        validationData.subjects.map((s, idx) => {
                          const isSelected = !!selectedSubjects[s.name];
                          return (
                            <div key={idx} className={`p-3 flex justify-between items-center hover:bg-slate-50/50 transition ${!isSelected ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-2.5">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => setSelectedSubjects(p => ({ ...p, [s.name]: !p[s.name] }))}
                                  className="rounded text-indigo-600 w-4 h-4 border-slate-350 cursor-pointer"
                                />
                                <div>
                                  <span className="font-bold text-slate-800">{s.name}</span>
                                  <span className="text-[9.5px] text-slate-400 block font-mono">Skrót przedmiotu: {s.existingShort || subjectAbbr(s.name) || '??'}</span>
                                </div>
                              </div>
                              
                              <div>
                                {s.status === 'exists' ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                    Dopasowano: Przedmiot istnieje
                                  </span>
                                ) : (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                    Nowy (Zostanie utworzony)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 4. ASSIGNMENTS LISTING & REAL-TIME VALIDATION */}
                {activeTab === 'assignments' && (
                  <div className="divide-y divide-slate-100">
                    <div className="bg-slate-50 py-2.5 px-4 flex justify-between items-center text-[10.5px]">
                      <span className="font-black text-slate-500 uppercase tracking-wider">
                        Przydziały do weryfikacji i importu ({filteredAssignments.length} z {validationData.assignments.length} wierszy)
                      </span>
                      <div className="flex items-center gap-3">
                        {filterStatus !== 'all' && (
                          <button 
                            onClick={() => setFilterStatus('all')}
                            className="text-red-650 hover:text-red-800 font-extrabold bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition"
                          >
                            Wyłącz filtr
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const allChecked = filteredAssignments.every(a => !a.isValid || selectedAssignments[a.index]);
                            const next = { ...selectedAssignments };
                            filteredAssignments.forEach(a => {
                              if (a.isValid) {
                                next[a.index] = !allChecked;
                              }
                            });
                            setSelectedAssignments(next);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-black"
                        >
                          {filteredAssignments.length > 0 && filteredAssignments.every(a => !a.isValid || selectedAssignments[a.index]) ? 'Odznacz wszystkie' : 'Zaznacz widoczne'}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100 text-[11px]">
                      {filteredAssignments.length === 0 ? (
                        <div className="p-8 text-center text-slate-450 font-semibold italic">
                          Brak przydziałów spełniających kryteria wybranego filtra ({filterStatus})
                        </div>
                      ) : (
                        filteredAssignments.map((a, idx) => {
                          const isSelected = !!selectedAssignments[a.index];
                          const hasErrors = !a.isValid;
                          
                          return (
                            <div 
                              key={idx} 
                              className={`p-2.5 flex justify-between items-center hover:bg-slate-50/50 transition ${
                                hasErrors ? 'bg-red-50/30' : a.isDuplicate ? 'bg-amber-50/10' : ''
                              } ${!isSelected && !hasErrors ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-4">
                                <input 
                                  type="checkbox" 
                                  disabled={hasErrors}
                                  checked={isSelected}
                                  onChange={() => setSelectedAssignments(p => ({ ...p, [a.index]: !p[a.index] }))}
                                  className="rounded text-indigo-600 w-4 h-4 border-slate-350 disabled:opacity-30 cursor-pointer"
                                />
                                
                                <div className="grid grid-cols-4 gap-4 flex-1 items-center min-w-0">
                                  {/* Class */}
                                  <div className="min-w-0">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Klasa</span>
                                    <span className="font-black text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] inline-block truncate max-w-full">
                                      {a.rawClass || 'Brak'}
                                    </span>
                                  </div>
                                  {/* Teacher */}
                                  <div className="min-w-0 col-span-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Nauczyciel</span>
                                    <span className="font-bold text-slate-700 truncate block">
                                      {a.rawTeacher || <span className="text-slate-405 font-medium italic">Nieprzypisany</span>}
                                    </span>
                                  </div>
                                  {/* Subject */}
                                  <div className="min-w-0 col-span-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Przedmiot</span>
                                    <span className="font-bold text-slate-700 truncate block">
                                      {a.rawSubject || 'Brak'}
                                    </span>
                                  </div>
                                  {/* Hours */}
                                  <div className="min-w-0">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Godzin</span>
                                    <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                      {a.parsedHours} godz
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Row validation status tag */}
                              <div className="shrink-0 flex items-center gap-2">
                                {hasErrors ? (
                                  <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                                    <X size={10} /> {a.errors[0]}
                                  </span>
                                ) : a.isDuplicate ? (
                                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                                    <AlertTriangle size={10} /> Już istnieje (Duplikat)
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                                    <Check size={10} /> Poprawny
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* INTEGRATION SETTINGS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-200 pb-2">
                  <Settings size={14} className="text-slate-400" /> Opcje Wprowadzania i Czyszczenia Bazy
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <label className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none hover:border-slate-300">
                    <input 
                      type="checkbox" 
                      checked={clearExistingAssignments}
                      onChange={(e) => setClearExistingAssignments(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 border-slate-350"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Wyczyść dotychczasowe przydziały lekcyjne</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                        Zaznacz to, jeśli chcesz całkowicie zastąpić obecny plan nową siatką godzin z SIO.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none hover:border-slate-300">
                    <input 
                      type="checkbox" 
                      checked={clearExistingTeachersAndClasses}
                      onChange={(e) => setClearExistingTeachersAndClasses(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 border-slate-350"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Skasuj wszystkich obecnych nauczycieli i klasy</span>
                      <span className="text-[10px] text-red-650 font-semibold block mt-0.5 leading-normal">
                        ⚠️ UWAGA: Spowoduje to całkowity reset obecnych zasobów kadrowych i oddziałów w programie.
                      </span>
                    </div>
                  </label>

                </div>
              </div>

              {/* ACTION FOOTER BAR */}
              <div className="flex justify-between items-center border-t border-slate-150 pt-4">
                <button 
                  onClick={() => setActiveSubStep('map')}
                  className="px-4 py-2 text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Cofnij do mapowania
                </button>
                
                <button 
                  onClick={handleImportExecute}
                  disabled={validationData.assignments.length === 0}
                  className="px-6 py-3 bg-emerald-650 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Zatwierdź i importuj dane do programu
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
