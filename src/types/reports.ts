/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Typy danych dla Zaawansowanych Raportów Excel i Kodów QR (Module 3)
 */

export type QrTargetType = 'class' | 'teacher' | 'room' | 'school';

export interface QrItemConfig {
  id: string;
  type: QrTargetType;
  title: string;
  subtitle: string;
  tag?: string;
  targetUrl: string;
  qrDataUrl?: string;
}

export type QrPrintSheetTemplate = 
  | 'cards_6'      // 6 dużych kart A4 (np. identyfikatory / tabliczki)
  | 'cards_12'     // 12 mniejszych etykiet A4 (naklejki na zeszyty / legitymacje)
  | 'stickers_door' // Eleganckie zawieszki na drzwi gabinetu z opisem sali
  | 'table_summary'; // Zbiorcza tabela kontrolna dla sekretariatu i dyrekcji

export interface ExcelExportOptions {
  includeClasses?: boolean;
  includeTeachers?: boolean;
  includeRooms?: boolean;
  includeDuties?: boolean;
  includeWorkload?: boolean;
  includeHygieneStats?: boolean;
  separateClassSheets?: boolean;
  schoolName?: string;
  yearLabel?: string;
  scheduleVersion?: 'etap1' | 'etap2';
}

export interface WorkloadTeacherSummary {
  teacherId: string;
  name: string;
  abbr: string;
  positions?: string;
  subjects: string[];
  hours45min: number;
  hours60min: number;
  totalHours: number;
  totalFte: number;
  isCombined: boolean;
  classesCount: number;
  dutiesCount: number;
  suggestedDutyLimit?: number;
  daysWithLessons: number;
  baseQuota: number; // pensum bazowe lub uśrednione łączone
  overtimeHours: number; // nadgodziny
}

