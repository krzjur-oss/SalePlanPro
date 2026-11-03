import { Building } from '../../types';

export const PALETTE_COLORS = [
  '#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', // Blues
  '#16a34a', '#15803d', '#10b981', '#34d399', // Greens / Teals
  '#d97706', '#b45309', '#f59e0b', '#fbbf24', // Ambers / Yellows
  '#dc2626', '#b91c1c', '#f87171', '#ef4444', // Reds
  '#e11d48', '#be123c', '#fb7185', '#fda4af', // Roses
  '#7c3aed', '#6d28d9', '#8b5cf6', '#a78bfa', // Purples
  '#db2777', '#c026d3', '#ec4899', '#f472b6', // Pinks
  '#0d9488', '#0f766e', '#14b8a6', '#2dd4bf', // Teals
  '#0891b2', '#06b6d4', '#22d3ee', '#0097a7', // Cyans / Turquoises
  '#ea580c', '#d35400', '#f97316', '#fb923c', // Oranges
  '#4f46e5', '#3949ab', '#6366f1', '#818cf8', // Indigos
  '#65a30d', '#4d7c0f', '#84cc16', '#a3e635', // Limes
  '#0284c7', '#0369a1', '#38bdf8', '#075985', // Sky blues
  '#5b21b6', '#311b92', '#701a75', '#4a148c', // Deep rich shades
  '#475569', '#334155', '#64748b', '#4b5563'  // Slate / Dark Grays
];

export const getFloorAbbr = (floorOption: string, bld: Building | undefined): string => {
  if (!bld || !bld.hasCustomStructure || !bld.customFloors || bld.customFloors.length === 0) {
    return floorOption;
  }
  
  const parterIndex = bld.customFloors.findIndex(f => {
    const lf = f.toLowerCase();
    return lf.includes('parter') || lf === '0' || lf.includes('ground') || lf.includes('zero');
  });

  const idx = bld.customFloors.indexOf(floorOption);
  if (idx === -1) return floorOption;

  if (parterIndex !== -1) {
    const diff = idx - parterIndex;
    return diff > 0 ? `${diff}` : `${diff}`;
  } else {
    const numMatch = floorOption.match(/-?\d+/);
    if (numMatch) {
      return numMatch[0];
    }
    const romanMatch = floorOption.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
    if (romanMatch) {
      const rom = romanMatch[1].toUpperCase();
      const romanMap: Record<string, string> = {
        I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10'
      };
      return romanMap[rom];
    }
    return idx.toString();
  }
};

export const getFloorDisplayName = (floorNum: string, bld: Building | undefined): string => {
  if (bld?.hasCustomStructure) {
    return floorNum;
  }
  const floorNames: Record<string, string> = {
    '-1': 'Podziemie',
    '0': 'Parter',
    '1': 'Piętro I',
    '2': 'Piętro II',
    '3': 'Piętro III',
    '4': 'Piętro IV'
  };
  return floorNames[floorNum] || `Piętro ${floorNum}`;
};

export const getDefaultSchoolYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 4) { // May to Dec
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

export const getDynamicSchoolYears = (extraYears: (string | undefined)[] = []): string[] => {
  const currentYear = new Date().getFullYear();
  const yearsSet = new Set<string>();
  
  for (let i = -3; i <= 6; i++) {
    yearsSet.add(`${currentYear + i}/${currentYear + i + 1}`);
  }
  
  extraYears.forEach(y => {
    if (y && typeof y === 'string' && y.trim().length > 0) {
      yearsSet.add(y.trim());
    }
  });
  
  return Array.from(yearsSet).sort();
};

export interface SchoolTypeDictionaryItem {
  name: string;
  short: string;
  color: string;
  defaultGroupPattern?: string;
}

export interface SchoolTypeDictionary {
  name: string;
  icon: string;
  subjects: SchoolTypeDictionaryItem[];
}

export const SCHOOL_TYPES_DICTIONARIES: Record<string, SchoolTypeDictionary> = {
  sp: {
    name: "Szkoła Podstawowa",
    icon: "🏫",
    subjects: [
      { name: "Język polski", short: "JP", color: "#dc2626" },
      { name: "Matematyka", short: "MAT", color: "#16a34a" },
      { name: "Język angielski", short: "ANG", color: "#2563eb" },
      { name: "Biologia", short: "BIOL", color: "#059669" },
      { name: "Chemia", short: "CHEM", color: "#d97706" },
      { name: "Fizyka", short: "FIZ", color: "#7c3aed" },
      { name: "Geografia", short: "GEOG", color: "#ea580c" },
      { name: "Historia", short: "HIST", color: "#9333ea" },
      { name: "Wiedza o społeczeństwie", short: "WOS", color: "#db2777" },
      { name: "Informatyka", short: "INF", color: "#0d9488" },
      { name: "Plastyka", short: "PLAS", color: "#eab308" },
      { name: "Muzyka", short: "MUZ", color: "#f43f5e" },
      { name: "Technika", short: "TECH", color: "#8b5cf6" },
      { name: "Wychowanie fizyczne", short: "WF", color: "#475569", defaultGroupPattern: "wf" },
      { name: "Religia", short: "REL", color: "#14b8a6", defaultGroupPattern: "religia" },
      { name: "Etyka", short: "ETY", color: "#64748b" },
      { name: "Przyroda", short: "PRZY", color: "#22c55e" },
      { name: "Edukacja dla bezpieczeństwa", short: "EDB", color: "#f97316" },
      { name: "Godzina z wychowawcą", short: "GW", color: "#06b6d4" }
    ]
  },
  lo: {
    name: "Liceum Ogólnokształcące",
    icon: "🏛️",
    subjects: [
      { name: "Język polski", short: "JP", color: "#dc2626" },
      { name: "Matematyka", short: "MAT", color: "#16a34a" },
      { name: "Język angielski", short: "ANG", color: "#2563eb" },
      { name: "Język niemiecki", short: "NIEM", color: "#10b981", defaultGroupPattern: "niem" },
      { name: "Biologia", short: "BIOL", color: "#059669" },
      { name: "Chemia", short: "CHEM", color: "#d97706" },
      { name: "Fizyka", short: "FIZ", color: "#7c3aed" },
      { name: "Geografia", short: "GEOG", color: "#ea580c" },
      { name: "Historia", short: "HIST", color: "#9333ea" },
      { name: "Wiedza o społeczeństwie", short: "WOS", color: "#db2777" },
      { name: "Informatyka", short: "INF", color: "#0d9488" },
      { name: "Biznes i zarządzanie", short: "BIZ", color: "#0284c7" },
      { name: "Historia i teraźniejszość", short: "HIT", color: "#475569" },
      { name: "Wychowanie fizyczne", short: "WF", color: "#475569", defaultGroupPattern: "wf" },
      { name: "Religia", short: "REL", color: "#14b8a6", defaultGroupPattern: "religia" },
      { name: "Edukacja dla bezpieczeństwa", short: "EDB", color: "#f97316" },
      { name: "Godzina z wychowawcą", short: "GW", color: "#06b6d4" },
      { name: "Filozofia", short: "FILO", color: "#a55eea" }
    ]
  },
  tech: {
    name: "Technikum",
    icon: "⚙️",
    subjects: [
      { name: "Język polski", short: "JP", color: "#dc2626" },
      { name: "Matematyka", short: "MAT", color: "#16a34a" },
      { name: "Język angielski", short: "ANG", color: "#2563eb" },
      { name: "Fizyka", short: "FIZ", color: "#7c3aed" },
      { name: "Chemia", short: "CHEM", color: "#d97706" },
      { name: "Geografia", short: "GEOG", color: "#ea580c" },
      { name: "Historia", short: "HIST", color: "#9333ea" },
      { name: "Informatyka", short: "INF", color: "#0d9488" },
      { name: "Wychowanie fizyczne", short: "WF", color: "#475569", defaultGroupPattern: "wf" },
      { name: "Religia", short: "REL", color: "#14b8a6", defaultGroupPattern: "religia" },
      { name: "Godzina z wychowawcą", short: "GW", color: "#06b6d4" },
      { name: "Przedmioty zawodowe", short: "ZAW", color: "#2d3436" },
      { name: "Język obcy zawodowy", short: "JOZ", color: "#57606f" },
      { name: "Bezpieczeństwo i higiena pracy", short: "BHP", color: "#ff4757" }
    ]
  },
  bs: {
    name: "Szkoła Branżowa",
    icon: "🔧",
    subjects: [
      { name: "Język polski", short: "JP", color: "#dc2626" },
      { name: "Matematyka", short: "MAT", color: "#16a34a" },
      { name: "Język angielski", short: "ANG", color: "#2563eb" },
      { name: "Fizyka", short: "FIZ", color: "#7c3aed" },
      { name: "Chemia", short: "CHEM", color: "#d97706" },
      { name: "Geografia", short: "GEOG", color: "#ea580c" },
      { name: "Historia", short: "HIST", color: "#9333ea" },
      { name: "Informatyka", short: "INF", color: "#0d9488" },
      { name: "Wychowanie fizyczne", short: "WF", color: "#475569", defaultGroupPattern: "wf" },
      { name: "Godzina z wychowawcą", short: "GW", color: "#06b6d4" },
      { name: "Przedmioty zawodowe", short: "ZAW", color: "#2d3436" },
      { name: "Bezpieczeństwo i higiena pracy", short: "BHP", color: "#ff4757" }
    ]
  }
};
