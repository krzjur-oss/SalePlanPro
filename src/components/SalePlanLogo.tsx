/**
 * SalePlan Pro – Oficjalny Znak Marki, Logo i Ikona Systemu
 * Wytyczne: Białe duże drukowane litery "SP" oraz żółty dopisek "pro" pismem pisanym (odręcznym).
 */

import React from 'react';

// Precyzyjnie zoptymalizowane ścieżki wektorowe w bezpośrednich współrzędnych SVG (bez odwracania skali)
const SP_PATH = "M46.14 46.53Q46.14 48.78 45.32 50.62Q44.50 52.46 42.78 53.77Q41.05 55.09 38.37 55.80Q35.69 56.52 31.98 56.52Q28.70 56.52 26.20 55.93Q23.69 55.34 21.89 54.20Q20.10 53.05 18.99 51.35Q17.88 49.65 17.38 47.45L24.06 46.34Q24.34 47.45 24.88 48.36Q25.42 49.27 26.37 49.94Q27.32 50.61 28.74 50.97Q30.16 51.34 32.17 51.34Q35.69 51.34 37.55 50.27Q39.41 49.20 39.41 46.93Q39.41 45.57 38.66 44.70Q37.91 43.84 36.67 43.27Q35.43 42.71 33.81 42.34Q32.20 41.96 30.44 41.61Q29.03 41.28 27.63 40.93Q26.22 40.58 24.94 40.09Q23.66 39.59 22.56 38.91Q21.46 38.23 20.65 37.24Q19.84 36.24 19.39 34.91Q18.93 33.57 18.93 31.77Q18.93 29.30 19.91 27.55Q20.90 25.79 22.64 24.68Q24.39 23.56 26.80 23.05Q29.22 22.53 32.08 22.53Q35.31 22.53 37.62 23.04Q39.93 23.54 41.49 24.57Q43.05 25.60 43.95 27.16Q44.85 28.72 45.27 30.80L38.57 31.72Q38.05 29.59 36.47 28.51Q34.89 27.43 31.94 27.43Q30.11 27.43 28.90 27.75Q27.70 28.06 26.98 28.60Q26.27 29.14 25.96 29.86Q25.66 30.57 25.66 31.37Q25.66 32.59 26.24 33.37Q26.83 34.16 27.88 34.68Q28.94 35.21 30.40 35.57Q31.87 35.94 33.63 36.31Q35.17 36.64 36.70 37.00Q38.22 37.37 39.60 37.86Q40.98 38.35 42.18 39.05Q43.38 39.76 44.25 40.78Q45.13 41.80 45.64 43.20Q46.14 44.61 46.14 46.53M78.39 33.48Q78.39 35.61 77.68 37.59Q76.96 39.57 75.48 41.09Q74.01 42.62 71.73 43.52Q69.46 44.42 66.34 44.42L58.14 44.42L58.14 56.05L51.23 56.05L51.23 23.02L66.06 23.02Q69.23 23.02 71.55 23.79Q73.87 24.55 75.39 25.93Q76.91 27.31 77.65 29.23Q78.39 31.16 78.39 33.48M71.43 33.59Q71.43 31.04 69.89 29.71Q68.36 28.39 65.29 28.39L58.14 28.39L58.14 39.10L65.48 39.10Q67.02 39.10 68.14 38.70Q69.25 38.30 69.99 37.58Q70.73 36.85 71.08 35.83Q71.43 34.81 71.43 33.59";

const PRO_PATH = "M50.01 82.24Q49.88 82.24 49.63 82.26Q49.39 82.27 49.22 81.97Q49.09 81.81 48.83 81.33Q48.56 80.85 48.73 79.99Q48.89 79.43 48.99 78.89Q49.09 78.34 49.09 78.08Q49.09 77.95 49.17 77.57Q49.25 77.19 49.25 77.02Q49.42 76.76 49.52 76.30Q49.62 75.84 49.62 75.47Q49.62 75.08 50.01 74.75Q50.01 74.48 50.13 74.09Q50.24 73.69 50.24 73.56Q50.34 73.10 50.69 71.93Q51.04 70.75 51.55 69.27Q52.06 67.78 52.55 66.37Q53.05 64.95 53.45 63.96Q53.84 63.03 54.11 62.24Q54.37 61.45 54.37 61.12Q54.37 60.99 54.44 60.90Q54.50 60.82 54.73 60.56Q55.06 60.23 55.61 60.31Q56.15 60.39 56.51 60.66Q56.78 61.09 56.89 61.43Q57.01 61.78 56.88 62.50Q56.88 63.00 56.65 63.41Q56.42 63.82 56.25 64.06Q56.09 64.29 56.12 64.29Q56.12 64.29 56.12 64.29Q57.57 63.40 58.74 63.31Q59.91 63.23 60.72 63.71Q61.53 64.19 61.96 65.01Q62.39 65.84 62.39 66.79Q62.39 67.19 62.12 67.85Q61.86 68.51 61.53 69.09Q61.20 69.67 61.00 69.86Q60.87 69.86 60.74 70.08Q60.61 70.29 60.47 70.56Q60.21 70.89 59.60 71.30Q58.99 71.71 58.36 71.96Q57.74 72.21 57.47 72.11L57.41 72.17Q57.31 72.24 57.31 72.40Q57.31 72.47 56.84 72.67Q56.38 72.87 55.76 73.03Q55.13 73.20 54.60 73.20Q53.91 73.20 53.61 72.93Q53.54 73.00 53.46 73.13Q53.38 73.26 53.38 73.36Q53.38 73.56 53.23 73.99Q53.08 74.42 52.88 74.76Q52.69 75.11 52.52 75.11L52.46 75.21Q52.39 75.31 52.52 75.47L52.52 75.84Q52.49 76.23 52.32 76.50Q52.32 76.76 52.22 77.29Q52.13 77.82 51.99 78.08Q51.99 78.48 51.88 78.86Q51.76 79.24 51.63 79.24Q51.50 79.27 51.47 79.65Q51.43 80.03 51.43 80.19Q51.40 81.02 50.90 81.63Q50.41 82.24 50.01 82.24M54.24 70.69Q54.50 70.69 55.19 70.46Q55.89 70.23 56.65 69.88Q57.41 69.53 57.83 69.17Q58.69 68.41 59.17 67.69Q59.65 66.96 59.09 66.07Q58.82 65.61 58.25 65.69Q57.67 65.77 56.98 66.23Q56.28 66.70 55.56 67.39Q55.16 67.82 54.83 68.38Q54.50 68.94 54.29 69.47Q54.07 70.00 54.04 70.33Q54.01 70.59 54.11 70.66Q54.17 70.69 54.24 70.69M64.40 73.66Q64.10 73.43 63.76 73.06Q63.41 72.70 63.51 72.04Q63.61 71.12 63.77 70.41Q63.94 69.70 64.17 68.77Q64.24 68.38 64.52 67.42Q64.80 66.46 65.19 65.34Q65.59 64.22 66.02 63.21Q66.45 62.21 66.78 61.71Q67.14 61.38 67.85 61.38Q68.56 61.38 68.82 61.65Q69.19 61.94 69.05 62.69Q68.92 63.43 68.13 64.98Q67.96 65.38 67.72 65.82Q67.47 66.27 67.37 66.53Q67.30 66.73 67.37 66.79Q67.37 66.79 67.44 66.79Q67.64 66.43 68.16 65.95Q68.69 65.47 69.29 65.01Q69.88 64.55 70.41 64.19Q70.94 63.82 71.13 63.73Q71.40 63.56 71.74 63.45Q72.09 63.33 72.22 63.26Q72.98 62.90 73.89 62.98Q74.80 63.07 74.99 63.56Q75.03 63.82 75.23 63.96L75.39 64.09Q75.52 64.09 75.55 64.19L75.55 64.29Q75.55 64.52 75.11 64.95Q74.66 65.38 74.14 65.41Q73.71 65.44 73.38 65.57Q73.05 65.71 72.59 65.90Q71.33 66.63 70.32 67.19Q69.32 67.75 68.26 68.91Q68.03 69.17 67.77 69.40Q67.50 69.63 67.24 70.06Q67.07 70.23 66.91 70.79Q66.74 71.35 66.63 71.86Q66.51 72.37 66.51 72.47L66.41 72.77Q66.32 73.10 66.08 73.39Q65.69 73.92 65.31 74.05Q64.93 74.19 64.40 73.66M77.90 74.32Q77.47 74.32 77.22 74.15Q76.97 73.99 76.61 73.69Q75.98 73.03 75.60 72.27Q75.22 71.51 75.32 70.95Q75.42 70.69 75.42 70.42L75.39 70.19Q75.26 70.06 75.29 70.00Q75.29 70.00 75.29 69.96Q75.36 69.93 75.42 69.80Q75.49 69.80 75.52 69.76Q75.59 69.70 75.55 69.43Q75.49 69.17 75.77 68.30Q76.05 67.42 76.54 66.63Q76.74 66.30 77.14 65.76Q77.54 65.21 78.01 64.67Q78.49 64.12 78.89 63.79Q79.71 63.10 80.42 62.67Q81.13 62.24 81.86 62.08Q82.58 61.91 83.36 61.91Q84.13 61.91 84.63 62.44Q85.39 62.77 85.70 63.33Q86.02 63.89 86.12 64.78Q86.21 65.77 85.92 67.21Q85.62 68.64 84.30 70.52Q83.48 71.71 82.68 72.37Q81.89 73.03 80.93 73.59Q80.24 74.05 79.45 74.15Q78.66 74.25 77.90 74.32M81.26 70.29Q81.99 69.67 82.30 68.91Q82.62 68.15 82.98 67.12Q83.11 66.93 83.16 66.46Q83.21 66.00 83.18 65.56Q83.14 65.11 82.95 65.05Q82.65 64.81 82.35 64.93Q82.06 65.05 81.59 65.38Q80.60 66.20 79.76 67.27Q78.92 68.35 78.59 69.90Q78.49 70.72 78.77 71.13Q79.05 71.55 79.70 71.37Q80.34 71.18 81.26 70.29";

export interface SalePlanLogoMarkProps {
  size?: number | string;
  className?: string;
  title?: string;
}

/**
 * Oficjalna stała ikona / emblemat programu:
 * - Duże białe drukowane SP
 * - Żółty mały napis "pro" pismem pisanym
 */
export function SalePlanLogoMark({ size = 32, className = '', title = 'SalePlan Pro' }: SalePlanLogoMarkProps) {
  const pixelSize = typeof size === 'number' ? size : parseInt(size, 10) || 32;

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={pixelSize} 
      height={pixelSize} 
      className={`shrink-0 select-none ${className}`}
      aria-label={title}
      role="img"
    >
      <defs>
        <linearGradient id="sp-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="sp-pro-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <filter id="sp-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0a101d" floodOpacity="0.6"/>
        </filter>
        <filter id="pro-glow-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#090d16" floodOpacity="0.8"/>
        </filter>
      </defs>

      {/* Tło ikony - Zaokrąglony squircle */}
      <rect width="100" height="100" rx="22" fill="url(#sp-logo-bg)" />
      
      {/* Subtelna ramka wewnętrzna (efekt głębi) */}
      <rect x="1.5" y="1.5" width="97" height="97" rx="20.5" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />

      {/* Siatka architektoniczna planisty */}
      <line x1="8" y1="33" x2="92" y2="33" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="8" y1="67" x2="92" y2="67" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="33" y1="8" x2="33" y2="92" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="67" y1="8" x2="67" y2="92" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Białe duże drukowane litery SP - czysta, prawidłowa orientacja pionowa */}
      <g filter="url(#sp-drop-shadow)">
        <path d={SP_PATH} fill="#ffffff" />
      </g>

      {/* Żółte małe litery pismem pisanym 'pro' - naturalny bieg pisma odręcznego */}
      <g filter="url(#pro-glow-shadow)">
        <path d={PRO_PATH} fill="none" stroke="#713f12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={PRO_PATH} fill="url(#sp-pro-yellow)" />
      </g>
    </svg>
  );
}

export interface SalePlanLogoProps {
  size?: number | string;
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
}

/**
 * Pełne logo programu: Ikona SP pro + logotyp tekstowy
 */
export function SalePlanLogo({
  size = 36,
  showSubtitle = false,
  subtitleText = 'System Planowania Lekcji, Sal i Dyżurów',
  className = ''
}: SalePlanLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      <SalePlanLogoMark size={size} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-black text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
            SalePlan
          </span>
          <span className="font-serif italic font-black text-amber-400 text-sm sm:text-base leading-none -ml-0.5 transform rotate-2 inline-block" style={{ fontFamily: 'Georgia, cursive, serif' }}>
            pro
          </span>
          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase font-mono tracking-wide hidden sm:inline-block leading-none ml-1">
            PWA
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
            {subtitleText}
          </p>
        )}
      </div>
    </div>
  );
}

export default SalePlanLogo;
