import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppState, SchoolStructureTemplate, Class, Teacher, Subject, ClassRoom, 
  Building, Floor, SchoolGroup, Assignment, MiejsceDyzuru, Przerwa, HomeroomState, Hour 
} from '../types';
import { 
  Sparkles, Download, Upload, Trash2, CheckCircle, Copy, Eye, X, 
  Plus, Bookmark, Landmark, Users, GraduationCap, BookOpen, Shield, 
  Clock, ArrowRight, RefreshCw, Layers, Check, Search, FileJson
} from 'lucide-react';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../services/dbStorage';
import { uid } from '../utils';

interface StructureTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAppState: AppState;
  onApplyTemplate: (newAppState: AppState, targetYearLabel: string, templateName: string) => void;
  onShowNotification?: (text: string, type?: 'info' | 'success') => void;
}

// Built-in starter templates for Polish education system
const BUILT_IN_TEMPLATES: SchoolStructureTemplate[] = [
  {
    id: 'builtin_sp_standard',
    name: 'Wzorzec: Szkoła Podstawowa (Klasy 1–8)',
    description: 'Kompletna struktura dla 8-klasowej szkoły podstawowej (16 oddziałów: 1A–8B), 20 gabinetów lekcyjnych, sala gimnastyczna, pracownia informatyczna oraz baza 28 nauczycieli.',
    createdAt: '2026-08-29T00:00:00.000Z',
    sourceYear: 'Wzorzec',
    isBuiltIn: true,
    schoolType: 'sp',
    tags: ['Podstawowa', 'Klasy 1-8', '20 sal', '28 nauczycieli'],
    stats: {
      classesCount: 16,
      teachersCount: 28,
      roomsCount: 20,
      subjectsCount: 18,
      buildingsCount: 1,
      dutySpotsCount: 6
    },
    structure: {
      school: {
        name: 'Szkoła Podstawowa Wzorcowa',
        short: 'SP Wzorzec',
        phone: '+48 22 100 20 30',
        web: 'sekretariat@sp-wzorzec.edu.pl'
      },
      timeslots: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' },
        { num: 4, start: '10:55', end: '11:40' },
        { num: 5, start: '11:50', end: '12:35' },
        { num: 6, start: '12:45', end: '13:30' },
        { num: 7, start: '13:40', end: '14:25' },
        { num: 8, start: '14:35', end: '15:20' }
      ],
      hours: ['1', '2', '3', '4', '5', '6', '7', '8'],
      buildings: [
        {
          id: 'bld_main',
          name: 'Budynek Główny',
          address: 'ul. Szkolna 1',
          multi: true
        }
      ],
      floors: [
        {
          id: 'fl_0',
          name: 'Parter (Edukacja Wczesnoszkolna)',
          color: '#10b981',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg_0_0',
              name: 'Skrzydło Klas 1-3 & Świetlica',
              rooms: [
                { id: 'r_101', num: '101' },
                { id: 'r_102', num: '102' },
                { id: 'r_103', num: '103' },
                { id: 'r_104', num: '104' },
                { id: 'r_105', num: '105' },
                { id: 'r_106', num: '106' },
                { id: 'r_gym', num: 'SG' }
              ]
            }
          ]
        },
        {
          id: 'fl_1',
          name: 'Piętro I (Humanistyczne & Językowe)',
          color: '#3b82f6',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg_1_0',
              name: 'Korytarz Główny I',
              rooms: [
                { id: 'r_201', num: '201' },
                { id: 'r_202', num: '202' },
                { id: 'r_203', num: '203' },
                { id: 'r_204', num: '204' },
                { id: 'r_205', num: '205' },
                { id: 'r_206', num: '206' },
                { id: 'r_inf1', num: 'INF1' }
              ]
            }
          ]
        },
        {
          id: 'fl_2',
          name: 'Piętro II (Matematyczno-Przyrodnicze)',
          color: '#8b5cf6',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg_2_0',
              name: 'Korytarz Główny II',
              rooms: [
                { id: 'r_301', num: '301' },
                { id: 'r_302', num: '302' },
                { id: 'r_303', num: '303' },
                { id: 'r_304', num: '304' },
                { id: 'r_305', num: '305' },
                { id: 'r_306', num: '306' }
              ]
            }
          ]
        }
      ],
      rooms: [
        { id: 'r_101', name: '101', desc: 'Edukacja wczesnoszkolna 1A', capacity: 25, isGrade1_3: true },
        { id: 'r_102', name: '102', desc: 'Edukacja wczesnoszkolna 1B', capacity: 25, isGrade1_3: true },
        { id: 'r_103', name: '103', desc: 'Edukacja wczesnoszkolna 2A', capacity: 25, isGrade1_3: true },
        { id: 'r_104', name: '104', desc: 'Edukacja wczesnoszkolna 2B', capacity: 25, isGrade1_3: true },
        { id: 'r_105', name: '105', desc: 'Edukacja wczesnoszkolna 3A', capacity: 25, isGrade1_3: true },
        { id: 'r_106', name: '106', desc: 'Edukacja wczesnoszkolna 3B', capacity: 25, isGrade1_3: true },
        { id: 'r_gym', name: 'SG', desc: 'Duża Sala Gimnastyczna', capacity: 60, singleClassLimit: false },
        { id: 'r_201', name: '201', desc: 'Pracownia Języka Polskiego I', capacity: 30 },
        { id: 'r_202', name: '202', desc: 'Pracownia Języka Polskiego II', capacity: 30 },
        { id: 'r_203', name: '203', desc: 'Pracownia Języka Angielskiego', capacity: 20 },
        { id: 'r_204', name: '204', desc: 'Pracownia Języka Niemieckiego', capacity: 20 },
        { id: 'r_205', name: '205', desc: 'Pracownia Historyczna', capacity: 30 },
        { id: 'r_206', name: '206', desc: 'Pracownia Muzyczno-Plastyczna', capacity: 30 },
        { id: 'r_inf1', name: 'INF1', desc: 'Pracownia Informatyczna (24 st.)', capacity: 26 },
        { id: 'r_301', name: '301', desc: 'Pracownia Matematyczna I', capacity: 30 },
        { id: 'r_302', name: '302', desc: 'Pracownia Matematyczna II', capacity: 30 },
        { id: 'r_303', name: '303', desc: 'Pracownia Biologiczna', capacity: 30 },
        { id: 'r_304', name: '304', desc: 'Pracownia Chemiczna', capacity: 30 },
        { id: 'r_305', name: '305', desc: 'Pracownia Fizyczna', capacity: 30 },
        { id: 'r_306', name: '306', desc: 'Pracownia Geograficzna', capacity: 30 }
      ],
      classes: [
        { id: 'c_1a', name: '1A', color: '#2563eb', groupIds: [] },
        { id: 'c_1b', name: '1B', color: '#3b82f6', groupIds: [] },
        { id: 'c_2a', name: '2A', color: '#16a34a', groupIds: [] },
        { id: 'c_2b', name: '2B', color: '#10b981', groupIds: [] },
        { id: 'c_3a', name: '3A', color: '#d97706', groupIds: [] },
        { id: 'c_3b', name: '3B', color: '#f59e0b', groupIds: [] },
        { id: 'c_4a', name: '4A', color: '#dc2626', groupIds: [] },
        { id: 'c_4b', name: '4B', color: '#ef4444', groupIds: [] },
        { id: 'c_5a', name: '5A', color: '#7c3aed', groupIds: [] },
        { id: 'c_5b', name: '5B', color: '#8b5cf6', groupIds: [] },
        { id: 'c_6a', name: '6A', color: '#0d9488', groupIds: [] },
        { id: 'c_6b', name: '6B', color: '#14b8a6', groupIds: [] },
        { id: 'c_7a', name: '7A', color: '#ea580c', groupIds: [] },
        { id: 'c_7b', name: '7B', color: '#f97316', groupIds: [] },
        { id: 'c_8a', name: '8A', color: '#4f46e5', groupIds: [] },
        { id: 'c_8b', name: '8B', color: '#6366f1', groupIds: [] }
      ],
      schoolGroups: [],
      subjects: [
        { id: 's_ew', name: 'Edukacja wczesnoszkolna', short: 'EW', color: '#10b981' },
        { id: 's_jp', name: 'Język polski', short: 'JP', color: '#dc2626' },
        { id: 's_mat', name: 'Matematyka', short: 'MAT', color: '#16a34a' },
        { id: 's_ang', name: 'Język angielski', short: 'ANG', color: '#2563eb' },
        { id: 's_niem', name: 'Język niemiecki', short: 'NIEM', color: '#0284c7' },
        { id: 's_hist', name: 'Historia', short: 'HIST', color: '#9333ea' },
        { id: 's_przyr', name: 'Przyroda', short: 'PRZYR', color: '#65a30d' },
        { id: 's_biol', name: 'Biologia', short: 'BIOL', color: '#059669' },
        { id: 's_chem', name: 'Chemia', short: 'CHEM', color: '#d97706' },
        { id: 's_fiz', name: 'Fizyka', short: 'FIZ', color: '#7c3aed' },
        { id: 's_geog', name: 'Geografia', short: 'GEOG', color: '#ea580c' },
        { id: 's_inf', name: 'Informatyka', short: 'INF', color: '#0d9488' },
        { id: 's_muz', name: 'Muzyka', short: 'MUZ', color: '#db2777' },
        { id: 's_plas', name: 'Plastyka', short: 'PLAS', color: '#ec4899' },
        { id: 's_tech', name: 'Technika', short: 'TECH', color: '#475569' },
        { id: 's_wf', name: 'Wychowanie fizyczne', short: 'WF', color: '#334155', defaultGroupPattern: 'wf' },
        { id: 's_rel', name: 'Religia / Etyka', short: 'REL', color: '#14b8a6', defaultGroupPattern: 'religia' },
        { id: 's_gw', name: 'Godzina z wychowawcą', short: 'GW', color: '#06b6d4' }
      ],
      teachers: [
        { id: 't_akow', first: 'Anna', last: 'Kowalska', abbr: 'AKOW', maxHours: 18, color: '#2563eb' },
        { id: 't_jnow', first: 'Jan', last: 'Nowak', abbr: 'JNOW', maxHours: 18, color: '#16a34a' },
        { id: 't_mwis', first: 'Maria', last: 'Wiśniewska', abbr: 'MWIS', maxHours: 18, color: '#dc2626' },
        { id: 't_pwoj', first: 'Piotr', last: 'Wójcik', abbr: 'PWOJ', maxHours: 18, color: '#d97706' },
        { id: 't_kkow', first: 'Katarzyna', last: 'Kowalczyk', abbr: 'KKOW', maxHours: 18, color: '#7c3aed' },
        { id: 't_tziel', first: 'Tomasz', last: 'Zieliński', abbr: 'TZIEL', maxHours: 18, color: '#0d9488' },
        { id: 't_aszym', first: 'Agnieszka', last: 'Szymańska', abbr: 'ASZYM', maxHours: 18, color: '#ea580c' },
        { id: 't_mwoz', first: 'Michał', last: 'Woźniak', abbr: 'MWOZ', maxHours: 18, color: '#4f46e5' },
        { id: 't_ekoz', first: 'Ewa', last: 'Kozłowska', abbr: 'EKOZ', maxHours: 18, color: '#db2777' },
        { id: 't_kjan', first: 'Krzysztof', last: 'Jankowski', abbr: 'KJAN', maxHours: 18, color: '#0284c7' },
        { id: 't_bmaz', first: 'Barbara', last: 'Mazur', abbr: 'BMAZ', maxHours: 18, color: '#10b981' },
        { id: 't_wkwia', first: 'Wojciech', last: 'Kwiatkowski', abbr: 'WKWIA', maxHours: 18, color: '#b45309' },
        { id: 't_dkraw', first: 'Dorota', last: 'Krawczyk', abbr: 'DKRAW', maxHours: 18, color: '#b91c1c' },
        { id: 't_rpaw', first: 'Robert', last: 'Pawlak', abbr: 'RPAW', maxHours: 18, color: '#6d28d9' },
        { id: 't_mpod', first: 'Magdalena', last: 'Piotrowska', abbr: 'MPIOT', maxHours: 18, color: '#0f766e' },
        { id: 't_ggrab', first: 'Grzegorz', last: 'Grabowski', abbr: 'GGRAB', maxHours: 18, color: '#d35400' },
        { id: 't_jnowa', first: 'Joanna', last: 'Nowakowska', abbr: 'JNOWA', maxHours: 18, color: '#3949ab' },
        { id: 't_apad', first: 'Adam', last: 'Pawłowski', abbr: 'APAW', maxHours: 18, color: '#c026d3' },
        { id: 't_mwal', first: 'Monika', last: 'Walczak', abbr: 'MWAL', maxHours: 18, color: '#0369a1' },
        { id: 't_lolsz', first: 'Łukasz', last: 'Olszewski', abbr: 'LOLSZ', maxHours: 18, color: '#15803d' },
        { id: 't_ajab', first: 'Aleksandra', last: 'Jabłońska', abbr: 'AJAB', maxHours: 18, color: '#f59e0b' },
        { id: 't_kmaj', first: 'Kamil', last: 'Majewski', abbr: 'KMAJ', maxHours: 18, color: '#f87171' },
        { id: 't_sdud', first: 'Sylwia', last: 'Dudek', abbr: 'SDUD', maxHours: 18, color: '#8b5cf6' },
        { id: 't_mstas', first: 'Marcin', last: 'Stępień', abbr: 'MSTEP', maxHours: 18, color: '#14b8a6' },
        { id: 't_iadm', first: 'Izabela', last: 'Adamczyk', abbr: 'IADM', maxHours: 18, color: '#fb923c' },
        { id: 't_ddud', first: 'Damian', last: 'Dudek', abbr: 'DDUD', maxHours: 18, color: '#6366f1' },
        { id: 't_nwie', first: 'Natalia', last: 'Wieczorek', abbr: 'NWIE', maxHours: 18, color: '#ec4899' },
        { id: 't_plis', first: 'Paweł', last: 'Lis', abbr: 'PLIS', maxHours: 18, color: '#38bdf8' }
      ],
      dutySpots: [
        { id: 'm_p_l', name: 'Parter – Skrzydło Lewe (Klasy 1-3)', desc: 'Korytarz edukacji wczesnoszkolnej', teachersNeeded: 1 },
        { id: 'm_p_p', name: 'Parter – Hol Główny & Szatnie', desc: 'Wejście główne i szatnie', teachersNeeded: 1 },
        { id: 'm_p1_l', name: 'Piętro I – Skrzydło Lewe', desc: 'Sale 201-203', teachersNeeded: 1 },
        { id: 'm_p1_p', name: 'Piętro I – Skrzydło Prawe', desc: 'Sale 204-206 i INF', teachersNeeded: 1 },
        { id: 'm_p2_l', name: 'Piętro II – Skrzydło Lewe', desc: 'Sale 301-303', teachersNeeded: 1 },
        { id: 'm_p2_p', name: 'Piętro II – Skrzydło Prawe', desc: 'Sale 304-306', teachersNeeded: 1 }
      ],
      dutyBreaks: [
        { num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' },
        { num: 2, start: '09:40', end: '09:50', name: 'Przerwa 2' },
        { num: 3, start: '10:35', end: '10:55', name: 'Przerwa obiadowa (20 min)' },
        { num: 4, start: '11:40', end: '11:50', name: 'Przerwa 4' },
        { num: 5, start: '12:35', end: '12:45', name: 'Przerwa 5' },
        { num: 6, start: '13:30', end: '13:40', name: 'Przerwa 6' },
        { num: 7, start: '14:25', end: '14:35', name: 'Przerwa 7' }
      ]
    }
  },
  {
    id: 'builtin_lo_standard',
    name: 'Wzorzec: Liceum Ogólnokształcące (4-letnie)',
    description: 'Struktura 4-letniego liceum ogólnokształcącego z profilami klasowymi (1A–4D, 16 oddziałów), pracowniami specjalistycznymi, siatką przedmiotów rozszerzonych i 30 nauczycielami.',
    createdAt: '2026-08-29T00:00:00.000Z',
    sourceYear: 'Wzorzec',
    isBuiltIn: true,
    schoolType: 'lo',
    tags: ['Liceum', '4-letnie', 'Klasy 1-4', 'Profile', '30 nauczycieli'],
    stats: {
      classesCount: 16,
      teachersCount: 30,
      roomsCount: 22,
      subjectsCount: 20,
      buildingsCount: 1,
      dutySpotsCount: 6
    },
    structure: {
      school: {
        name: 'I Liceum Ogólnokształcące im. Komisji Edukacji Narodowej',
        short: 'I LO',
        phone: '+48 22 800 90 10',
        web: 'sekretariat@ilo-liceum.edu.pl'
      },
      timeslots: [
        { num: 1, start: '08:00', end: '08:45' },
        { num: 2, start: '08:55', end: '09:40' },
        { num: 3, start: '09:50', end: '10:35' },
        { num: 4, start: '10:45', end: '11:30' },
        { num: 5, start: '11:45', end: '12:30' },
        { num: 6, start: '12:45', end: '13:30' },
        { num: 7, start: '13:40', end: '14:25' },
        { num: 8, start: '14:35', end: '15:20' }
      ],
      hours: ['1', '2', '3', '4', '5', '6', '7', '8'],
      buildings: [
        { id: 'bld_lo', name: 'Gmach Główny LO', address: 'ul. Mickiewicza 15', multi: true }
      ],
      floors: [
        {
          id: 'fl_lo_0',
          name: 'Parter (Administracja & Sport)',
          color: '#0284c7',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg_lo_0',
              name: 'Hol Główny',
              rooms: [
                { id: 'r_lo_sg1', num: 'SG1' },
                { id: 'r_lo_sg2', num: 'SG2' },
                { id: 'r_lo_01', num: '01' }
              ]
            }
          ]
        },
        {
          id: 'fl_lo_1',
          name: 'Piętro I (Humanistyka & Języki)',
          color: '#7c3aed',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg_lo_1',
              name: 'Skrzydło I',
              rooms: [
                { id: 'r_lo_101', num: '101' },
                { id: 'r_lo_102', num: '102' },
                { id: 'r_lo_103', num: '103' },
                { id: 'r_lo_104', num: '104' },
                { id: 'r_lo_105', num: '105' },
                { id: 'r_lo_106', num: '106' }
              ]
            }
          ]
        },
        {
          id: 'fl_lo_2',
          name: 'Piętro II (Ścisłe & Przyrodnicze)',
          color: '#10b981',
          buildingIdx: 0,
          segments: [
            {
              id: 'seg_lo_2',
              name: 'Skrzydło II',
              rooms: [
                { id: 'r_lo_201', num: '201' },
                { id: 'r_lo_202', num: '202' },
                { id: 'r_lo_203', num: '203' },
                { id: 'r_lo_204', num: '204' },
                { id: 'r_lo_205', num: '205' },
                { id: 'r_lo_206', num: '206' }
              ]
            }
          ]
        }
      ],
      rooms: [
        { id: 'r_lo_sg1', name: 'SG1', desc: 'Duża Hala Sportowa', capacity: 60 },
        { id: 'r_lo_sg2', name: 'SG2', desc: 'Sala Fitness / Siłownia', capacity: 30 },
        { id: 'r_lo_01', name: '01', desc: 'Aula Wykładowa', capacity: 90 },
        { id: 'r_lo_101', name: '101', desc: 'Pracownia Języka Polskiego I', capacity: 32 },
        { id: 'r_lo_102', name: '102', desc: 'Pracownia Języka Polskiego II', capacity: 32 },
        { id: 'r_lo_103', name: '103', desc: 'Pracownia Języka Angielskiego I', capacity: 20 },
        { id: 'r_lo_104', name: '104', desc: 'Pracownia Języka Angielskiego II', capacity: 20 },
        { id: 'r_lo_105', name: '105', desc: 'Pracownia Języków Romańskich', capacity: 20 },
        { id: 'r_lo_106', name: '106', desc: 'Pracownia Historyczna / WOS', capacity: 32 },
        { id: 'r_lo_201', name: '201', desc: 'Pracownia Matematyczna A', capacity: 32 },
        { id: 'r_lo_202', name: '202', desc: 'Pracownia Matematyczna B', capacity: 32 },
        { id: 'r_lo_203', name: '203', desc: 'Laboratorium Fizyczne', capacity: 32 },
        { id: 'r_lo_204', name: '204', desc: 'Laboratorium Chemiczne', capacity: 32 },
        { id: 'r_lo_205', name: '205', desc: 'Laboratorium Biologiczne', capacity: 32 },
        { id: 'r_lo_206', name: '206', desc: 'Pracownia Geograficzna', capacity: 32 }
      ],
      classes: [
        { id: 'c_lo_1a', name: '1A (mat-fiz)', color: '#2563eb', groupIds: [] },
        { id: 'c_lo_1b', name: '1B (biol-chem)', color: '#16a34a', groupIds: [] },
        { id: 'c_lo_1c', name: '1C (hum)', color: '#dc2626', groupIds: [] },
        { id: 'c_lo_1d', name: '1D (jęz-geog)', color: '#d97706', groupIds: [] },
        { id: 'c_lo_2a', name: '2A (mat-fiz)', color: '#3b82f6', groupIds: [] },
        { id: 'c_lo_2b', name: '2B (biol-chem)', color: '#10b981', groupIds: [] },
        { id: 'c_lo_2c', name: '2C (hum)', color: '#ef4444', groupIds: [] },
        { id: 'c_lo_2d', name: '2D (jęz-geog)', color: '#f59e0b', groupIds: [] },
        { id: 'c_lo_3a', name: '3A (mat-fiz)', color: '#60a5fa', groupIds: [] },
        { id: 'c_lo_3b', name: '3B (biol-chem)', color: '#34d399', groupIds: [] },
        { id: 'c_lo_3c', name: '3C (hum)', color: '#f87171', groupIds: [] },
        { id: 'c_lo_3d', name: '3D (jęz-geog)', color: '#fbbf24', groupIds: [] },
        { id: 'c_lo_4a', name: '4A (mat-fiz)', color: '#7c3aed', groupIds: [] },
        { id: 'c_lo_4b', name: '4B (biol-chem)', color: '#0d9488', groupIds: [] },
        { id: 'c_lo_4c', name: '4C (hum)', color: '#e11d48', groupIds: [] },
        { id: 'c_lo_4d', name: '4D (jęz-geog)', color: '#ea580c', groupIds: [] }
      ],
      schoolGroups: [],
      subjects: [
        { id: 's_lo_jp', name: 'Język polski', short: 'JP', color: '#dc2626' },
        { id: 's_lo_mat', name: 'Matematyka', short: 'MAT', color: '#16a34a' },
        { id: 's_lo_ang', name: 'Język angielski', short: 'ANG', color: '#2563eb' },
        { id: 's_lo_niem', name: 'Język niemiecki', short: 'NIEM', color: '#0284c7' },
        { id: 's_lo_hisz', name: 'Język hiszpański', short: 'HISZ', color: '#ea580c' },
        { id: 's_lo_hist', name: 'Historia', short: 'HIST', color: '#9333ea' },
        { id: 's_lo_wos', name: 'Wiedza o społeczeństwie', short: 'WOS', color: '#c026d3' },
        { id: 's_lo_hit', name: 'Historia i teraźniejszość', short: 'HIT', color: '#475569' },
        { id: 's_lo_filo', name: 'Filozofia', short: 'FILO', color: '#a55eea' },
        { id: 's_lo_biol', name: 'Biologia', short: 'BIOL', color: '#059669' },
        { id: 's_lo_chem', name: 'Chemia', short: 'CHEM', color: '#d97706' },
        { id: 's_lo_fiz', name: 'Fizyka', short: 'FIZ', color: '#7c3aed' },
        { id: 's_lo_geog', name: 'Geografia', short: 'GEOG', color: '#f97316' },
        { id: 's_lo_inf', name: 'Informatyka', short: 'INF', color: '#0d9488' },
        { id: 's_lo_biz', name: 'Biznes i zarządzanie', short: 'BIZ', color: '#0284c7' },
        { id: 's_lo_edb', name: 'Edukacja dla bezpieczeństwa', short: 'EDB', color: '#ff4757' },
        { id: 's_lo_wf', name: 'Wychowanie fizyczne', short: 'WF', color: '#334155', defaultGroupPattern: 'wf' },
        { id: 's_lo_rel', name: 'Religia / Etyka', short: 'REL', color: '#14b8a6', defaultGroupPattern: 'religia' },
        { id: 's_lo_gw', name: 'Godzina z wychowawcą', short: 'GW', color: '#06b6d4' }
      ],
      teachers: [
        { id: 't_lo_1', first: 'Aleksander', last: 'Nowicki', abbr: 'ANOW', maxHours: 18, color: '#2563eb' },
        { id: 't_lo_2', first: 'Beata', last: 'Pawłowska', abbr: 'BPAW', maxHours: 18, color: '#16a34a' },
        { id: 't_lo_3', first: 'Cezary', last: 'Kaczmarek', abbr: 'CKACZ', maxHours: 18, color: '#dc2626' },
        { id: 't_lo_4', first: 'Danuta', last: 'Borkowska', abbr: 'DBORK', maxHours: 18, color: '#d97706' },
        { id: 't_lo_5', first: 'Edward', last: 'Sikora', abbr: 'ESIK', maxHours: 18, color: '#7c3aed' },
        { id: 't_lo_6', first: 'Felicja', last: 'Włodarczyk', abbr: 'FWLOD', maxHours: 18, color: '#0d9488' },
        { id: 't_lo_7', first: 'Gabriel', last: 'Czarnecki', abbr: 'GCZAR', maxHours: 18, color: '#ea580c' },
        { id: 't_lo_8', first: 'Helena', last: 'Sawicka', abbr: 'HSAW', maxHours: 18, color: '#4f46e5' },
        { id: 't_lo_9', first: 'Igor', last: 'Głowacki', abbr: 'IGLOW', maxHours: 18, color: '#db2777' },
        { id: 't_lo_10', first: 'Justyna', last: 'Marciniak', abbr: 'JMARC', maxHours: 18, color: '#0284c7' }
      ],
      dutySpots: [
        { id: 'm_lo_h1', name: 'Hol Główny & Szatnie', teachersNeeded: 1 },
        { id: 'm_lo_p1', name: 'Piętro I – Korytarz Główny', teachersNeeded: 1 },
        { id: 'm_lo_p2', name: 'Piętro II – Korytarz Główny', teachersNeeded: 1 }
      ],
      dutyBreaks: [
        { num: 1, start: '08:45', end: '08:55', name: 'Przerwa 1' },
        { num: 2, start: '09:40', end: '09:50', name: 'Przerwa 2' },
        { num: 3, start: '10:35', end: '10:45', name: 'Przerwa 3' },
        { num: 4, start: '11:30', end: '11:45', name: 'Przerwa obiadowa I' },
        { num: 5, start: '12:30', end: '12:45', name: 'Przerwa obiadowa II' }
      ]
    }
  }
];

export default function StructureTemplatesModal({
  isOpen,
  onClose,
  currentAppState,
  onApplyTemplate,
  onShowNotification
}: StructureTemplatesModalProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'save' | 'preview'>('browse');
  const [userTemplates, setUserTemplates] = useState<SchoolStructureTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SchoolStructureTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // --- Save Template Form State ---
  const [saveName, setSaveName] = useState(() => {
    return `Szablon struktury – ${currentAppState.school?.short || currentAppState.school?.name || 'Moja Szkoła'} (${currentAppState.yearLabel || 'Bieżący'})`;
  });
  const [saveDesc, setSaveDesc] = useState('');
  const [saveSchoolType, setSaveSchoolType] = useState<'sp' | 'lo' | 'tech' | 'bs' | 'zsp' | 'custom'>('sp');
  
  const [saveOptions, setSaveOptions] = useState({
    schoolInfo: true,
    infrastructure: true,
    subjects: true,
    teachers: true,
    classes: true,
    homerooms: true,
    assignments: true,
    dutySpots: true
  });

  // --- Apply Template Options State ---
  const [targetYear, setTargetYear] = useState(() => {
    const current = currentAppState.yearLabel || '2026/2027';
    const match = current.match(/^(\d{4})\/(\d{4})$/);
    if (match) {
      const y1 = parseInt(match[1]) + 1;
      const y2 = parseInt(match[2]) + 1;
      return `${y1}/${y2}`;
    }
    const curYear = new Date().getFullYear();
    return `${curYear + 1}/${curYear + 2}`;
  });

  const [applyMode, setApplyMode] = useState<'promote' | 'exact'>('promote');
  const [clearLessons, setClearLessons] = useState(true);
  const [applyOptions, setApplyOptions] = useState({
    schoolInfo: true,
    infrastructure: true,
    subjects: true,
    teachers: true,
    classes: true,
    homerooms: true,
    assignments: true,
    dutySpots: true
  });

  // Load user templates from DB
  useEffect(() => {
    if (!isOpen) return;
    const loadTemplates = async () => {
      try {
        const stored = await getStorageItem<SchoolStructureTemplate[]>(STORAGE_KEYS.STRUCTURE_TEMPLATES);
        if (stored && Array.isArray(stored)) {
          setUserTemplates(stored);
        }
      } catch (err) {
        console.error('Error loading structure templates:', err);
      }
    };
    loadTemplates();
  }, [isOpen]);

  // Combine built-in + user templates
  const allTemplates = useMemo(() => {
    return [...userTemplates, ...BUILT_IN_TEMPLATES];
  }, [userTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      if (filterType === 'all') return true;
      if (filterType === 'builtin') return t.isBuiltIn;
      if (filterType === 'user') return !t.isBuiltIn;
      if (filterType === 'sp') return t.schoolType === 'sp';
      if (filterType === 'lo') return t.schoolType === 'lo';
      return true;
    });
  }, [allTemplates, searchQuery, filterType]);

  const notify = (msg: string, type: 'info' | 'success' = 'success') => {
    if (onShowNotification) {
      onShowNotification(msg, type);
    }
  };

  // --- SAVE CURRENT STRUCTURE AS TEMPLATE ---
  const handleSaveCurrentAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) {
      notify('Podaj nazwę dla nowego szablonu!', 'info');
      return;
    }

    const templateId = `tpl_usr_${uid()}`;
    const newTemplate: SchoolStructureTemplate = {
      id: templateId,
      name: saveName.trim(),
      description: saveDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
      sourceYear: currentAppState.yearLabel || 'Bieżący',
      isBuiltIn: false,
      schoolType: saveSchoolType,
      tags: [
        saveSchoolType.toUpperCase(),
        `${currentAppState.classes.length} klas`,
        `${currentAppState.teachers.length} naucz.`,
        `${currentAppState.planLekcji.rooms.length} sal`
      ],
      stats: {
        classesCount: saveOptions.classes ? currentAppState.classes.length : 0,
        teachersCount: saveOptions.teachers ? currentAppState.teachers.length : 0,
        roomsCount: saveOptions.infrastructure ? currentAppState.planLekcji.rooms.length : 0,
        subjectsCount: saveOptions.subjects ? currentAppState.subjects.length : 0,
        buildingsCount: saveOptions.infrastructure ? currentAppState.buildings.length : 0,
        dutySpotsCount: saveOptions.dutySpots ? currentAppState.dyzury.miejsca.length : 0
      },
      structure: {
        school: saveOptions.schoolInfo ? { ...currentAppState.school } : { name: '', short: '' },
        timeslots: saveOptions.schoolInfo ? JSON.parse(JSON.stringify(currentAppState.timeslots || [])) : [],
        hours: saveOptions.schoolInfo ? [...currentAppState.hours] : [],
        buildings: saveOptions.infrastructure ? JSON.parse(JSON.stringify(currentAppState.buildings)) : [],
        floors: saveOptions.infrastructure ? JSON.parse(JSON.stringify(currentAppState.floors)) : [],
        rooms: saveOptions.infrastructure ? JSON.parse(JSON.stringify(currentAppState.planLekcji.rooms)) : [],
        subjects: saveOptions.subjects ? JSON.parse(JSON.stringify(currentAppState.subjects)) : [],
        teachers: saveOptions.teachers ? JSON.parse(JSON.stringify(currentAppState.teachers)) : [],
        classes: saveOptions.classes ? JSON.parse(JSON.stringify(currentAppState.classes)) : [],
        schoolGroups: saveOptions.classes ? JSON.parse(JSON.stringify(currentAppState.planLekcji.schoolGroups || [])) : [],
        homerooms: saveOptions.homerooms ? JSON.parse(JSON.stringify(currentAppState.homerooms || {})) : {},
        assignments: saveOptions.assignments ? JSON.parse(JSON.stringify(currentAppState.planLekcji.assignments || [])) : [],
        specialStudents: saveOptions.classes ? JSON.parse(JSON.stringify(currentAppState.planLekcji.specialStudents || [])) : [],
        dutySpots: saveOptions.dutySpots ? JSON.parse(JSON.stringify(currentAppState.dyzury.miejsca || [])) : [],
        dutyBreaks: saveOptions.dutySpots ? JSON.parse(JSON.stringify(currentAppState.dyzury.przerwy || [])) : [],
        dutySettings: saveOptions.dutySpots ? JSON.parse(JSON.stringify(currentAppState.dyzury.settings || {})) : undefined
      }
    };

    const updated = [newTemplate, ...userTemplates];
    setUserTemplates(updated);
    await setStorageItem(STORAGE_KEYS.STRUCTURE_TEMPLATES, updated);

    notify(`Zapisano szablon struktury: „${newTemplate.name}”!`, 'success');
    setActiveTab('browse');
    setSelectedTemplate(newTemplate);
  };

  // --- DELETE TEMPLATE ---
  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć szablon „${templateName}”?`)) return;

    const updated = userTemplates.filter(t => t.id !== templateId);
    setUserTemplates(updated);
    await setStorageItem(STORAGE_KEYS.STRUCTURE_TEMPLATES, updated);

    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
    notify(`Usunięto szablon: ${templateName}`, 'info');
  };

  // --- APPLY TEMPLATE TO APP STATE ---
  const handleExecuteApply = () => {
    if (!selectedTemplate) return;

    if (!targetYear.trim()) {
      notify('Wpisz prawidłowy docelowy rok szkolny (np. 2027/2028)!', 'info');
      return;
    }

    const tStruct = selectedTemplate.structure;
    const newYearKey = 'y_' + targetYear.trim().replace(/[\/\s-]/g, '_');

    // 1. School Info & Bell hours
    const finalSchool = applyOptions.schoolInfo && tStruct.school
      ? { ...tStruct.school }
      : { ...currentAppState.school };

    const finalTimeslots = applyOptions.schoolInfo && tStruct.timeslots && tStruct.timeslots.length > 0
      ? JSON.parse(JSON.stringify(tStruct.timeslots))
      : JSON.parse(JSON.stringify(currentAppState.timeslots));

    const finalHours = applyOptions.schoolInfo && tStruct.hours && tStruct.hours.length > 0
      ? [...tStruct.hours]
      : [...currentAppState.hours];

    // 2. Infrastructure
    const finalBuildings = applyOptions.infrastructure && tStruct.buildings
      ? JSON.parse(JSON.stringify(tStruct.buildings))
      : JSON.parse(JSON.stringify(currentAppState.buildings));

    const finalFloors = applyOptions.infrastructure && tStruct.floors
      ? JSON.parse(JSON.stringify(tStruct.floors))
      : JSON.parse(JSON.stringify(currentAppState.floors));

    const finalRooms: ClassRoom[] = applyOptions.infrastructure && tStruct.rooms
      ? JSON.parse(JSON.stringify(tStruct.rooms))
      : JSON.parse(JSON.stringify(currentAppState.planLekcji.rooms));

    // 3. Subjects & Teachers
    const finalSubjects = applyOptions.subjects && tStruct.subjects
      ? JSON.parse(JSON.stringify(tStruct.subjects))
      : JSON.parse(JSON.stringify(currentAppState.subjects));

    const finalTeachers = applyOptions.teachers && tStruct.teachers
      ? JSON.parse(JSON.stringify(tStruct.teachers))
      : JSON.parse(JSON.stringify(currentAppState.teachers));

    // 4. Classes (Promote or 1:1)
    let finalClasses: Class[] = [];
    if (applyOptions.classes && tStruct.classes) {
      const sourceClasses: Class[] = JSON.parse(JSON.stringify(tStruct.classes));
      if (applyMode === 'promote') {
        sourceClasses.forEach(cl => {
          const match = cl.name.match(/^(\d+)(.*)$/) || cl.name.match(/^(Klasa\s+)(\d+)(.*)$/i);
          if (match) {
            let prefix = "";
            let numStr = "";
            let suffix = "";
            if (match.length === 3) {
              numStr = match[1];
              suffix = match[2];
            } else if (match.length === 4) {
              prefix = match[1];
              numStr = match[2];
              suffix = match[3];
            }
            const currentLevel = parseInt(numStr);
            const nextLevel = currentLevel + 1;

            // Maximum grade detection
            let maxGrade = 8;
            sourceClasses.forEach(c => {
              const m = c.name.match(/^(\d+)/);
              if (m) {
                const lvl = parseInt(m[1]);
                if (lvl > maxGrade) maxGrade = lvl;
              }
            });

            if (nextLevel <= maxGrade) {
              finalClasses.push({
                ...cl,
                name: `${prefix}${nextLevel}${suffix}`,
                abbr: `${prefix}${nextLevel}${suffix}`
              });
            }
          } else {
            finalClasses.push(cl);
          }
        });

        // Add newly incoming grade 1 classes based on original grade 1 structure
        sourceClasses.forEach(cl => {
          const match = cl.name.match(/^1(.*)$/);
          if (match) {
            const suffix = match[1];
            const exists = finalClasses.some(nc => nc.name === `1${suffix}`);
            if (!exists) {
              finalClasses.push({
                id: `cl_${uid()}`,
                name: `1${suffix}`,
                color: cl.color,
                groupIds: [],
                group: cl.group,
                year: cl.year,
                students: cl.students,
                abbr: `1${suffix}`,
                baseClass: cl.baseClass
              });
            }
          }
        });
      } else {
        finalClasses = sourceClasses;
      }
    } else {
      finalClasses = JSON.parse(JSON.stringify(currentAppState.classes));
    }

    const finalGroups = applyOptions.classes && tStruct.schoolGroups
      ? JSON.parse(JSON.stringify(tStruct.schoolGroups))
      : JSON.parse(JSON.stringify(currentAppState.planLekcji.schoolGroups || []));

    // 5. Homerooms & Assignments
    const finalHomerooms = applyOptions.homerooms && tStruct.homerooms
      ? JSON.parse(JSON.stringify(tStruct.homerooms))
      : (applyOptions.homerooms ? {} : JSON.parse(JSON.stringify(currentAppState.homerooms || {})));

    let finalAssignments: Assignment[] = [];
    if (applyOptions.assignments && tStruct.assignments) {
      const activeClassIds = new Set(finalClasses.map(c => c.id));
      const activeTeacherIds = new Set(finalTeachers.map((t: Teacher) => t.id));
      const activeSubjectIds = new Set(finalSubjects.map((s: Subject) => s.id));

      finalAssignments = (tStruct.assignments as Assignment[]).filter(asg => {
        return activeClassIds.has(asg.classId) &&
          (asg.teacherId === null || activeTeacherIds.has(asg.teacherId)) &&
          activeSubjectIds.has(asg.subjectId);
      });
    } else if (!applyOptions.assignments) {
      finalAssignments = JSON.parse(JSON.stringify(currentAppState.planLekcji.assignments || []));
    }

    // 6. Duties
    let finalDyzury = { ...currentAppState.dyzury };
    if (applyOptions.dutySpots && tStruct.dutySpots) {
      finalDyzury = {
        miejsca: JSON.parse(JSON.stringify(tStruct.dutySpots)),
        przerwy: tStruct.dutyBreaks ? JSON.parse(JSON.stringify(tStruct.dutyBreaks)) : currentAppState.dyzury.przerwy,
        settings: tStruct.dutySettings ? JSON.parse(JSON.stringify(tStruct.dutySettings)) : currentAppState.dyzury.settings,
        harmonogram: {}
      };
    }

    const newAppState: AppState = {
      yearKey: newYearKey,
      yearLabel: targetYear.trim(),
      hours: finalHours,
      timeslots: finalTimeslots,
      school: finalSchool,
      buildings: finalBuildings,
      floors: finalFloors,
      classes: finalClasses,
      teachers: finalTeachers,
      subjects: finalSubjects,
      homerooms: finalHomerooms,
      planLekcji: {
        meta: {
          schoolName: finalSchool.name,
          year: targetYear.trim(),
          modifiedAt: new Date().toISOString()
        },
        hours: finalTimeslots,
        classes: finalClasses,
        teachers: finalTeachers,
        rooms: finalRooms,
        subjects: finalSubjects,
        schoolGroups: finalGroups,
        assignments: finalAssignments,
        lessons: clearLessons ? {} : JSON.parse(JSON.stringify(currentAppState.planLekcji.lessons || {})),
        specialStudents: applyOptions.classes && tStruct.specialStudents ? JSON.parse(JSON.stringify(tStruct.specialStudents)) : [],
        specialAssignments: [],
        specialLessons: {},
        specialAbsences: {}
      },
      dyzury: finalDyzury
    };

    onApplyTemplate(newAppState, targetYear.trim(), selectedTemplate.name);
    notify(`Zastosowano szablon „${selectedTemplate.name}” dla roku ${targetYear.trim()}!`, 'success');
    onClose();
  };

  // --- EXPORT TEMPLATE TO JSON FILE ---
  const handleExportTemplate = (template: SchoolStructureTemplate) => {
    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = template.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    a.download = `szablon_struktury_${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Wyeksportowano szablon do pliku JSON`, 'info');
  };

  // --- IMPORT TEMPLATE FROM JSON FILE ---
  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawContent = evt.target?.result as string;
        const parsed = JSON.parse(rawContent);

        if (!parsed.structure || !parsed.name) {
          alert('Wybrany plik nie jest prawidłowym plikiem szablonu struktury szkoły SalePlan Pro.');
          return;
        }

        const importedTemplate: SchoolStructureTemplate = {
          ...parsed,
          id: `tpl_usr_imp_${uid()}`,
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          name: parsed.name.includes('(Zaimportowany)') ? parsed.name : `${parsed.name} (Zaimportowany)`
        };

        const updated = [importedTemplate, ...userTemplates];
        setUserTemplates(updated);
        await setStorageItem(STORAGE_KEYS.STRUCTURE_TEMPLATES, updated);

        setSelectedTemplate(importedTemplate);
        notify(`Zaimportowano szablon: „${importedTemplate.name}”!`, 'success');
      } catch (err) {
        alert('Błąd podczas odczytu pliku JSON szablonu: ' + String(err));
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md font-black text-lg">
              <Bookmark size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Szablony Struktury Szkoły
                </h3>
                <span className="text-[10px] bg-blue-500/30 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-400/30">
                  Klasy · Nauczyciele · Sale
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Zapisuj kompletną bazę szkoły jako szablon i używaj jej w kolejnych latach szkolnych bez ręcznego wpisywania.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Zamknij okno"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL TABS BAR */}
        <div className="flex items-center justify-between px-6 bg-slate-100/80 border-b border-slate-200 shrink-0 text-xs font-bold">
          <div className="flex gap-1 py-2">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles size={14} className={activeTab === 'browse' ? 'text-blue-600' : 'text-slate-400'} />
              Przeglądaj szablony ({allTemplates.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setSaveName(`Szablon struktury – ${currentAppState.school?.short || currentAppState.school?.name || 'Szkoła'} (${currentAppState.yearLabel || 'Bieżący'})`);
                setActiveTab('save');
              }}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'save'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Plus size={14} className={activeTab === 'save' ? 'text-blue-600' : 'text-slate-400'} />
              💾 Zapisz bieżącą strukturę jako Szablon
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
              <Upload size={13} className="text-blue-600" /> Importuj z pliku JSON
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportTemplate} 
              />
            </label>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          
          {/* TAB 1: BROWSE & APPLY TEMPLATES */}
          {activeTab === 'browse' && (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
              
              {/* LEFT: TEMPLATES LIST */}
              <div className="w-full md:w-5/12 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 overflow-hidden">
                
                {/* Search & Filter */}
                <div className="p-3.5 border-b border-slate-200 bg-white space-y-2 shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Szukaj szablonu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded-md font-bold shrink-0 transition cursor-pointer ${
                        filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Wszystkie ({allTemplates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('user')}
                      className={`px-2.5 py-1 rounded-md font-bold shrink-0 transition cursor-pointer ${
                        filterType === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Moje szablony ({userTemplates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('builtin')}
                      className={`px-2.5 py-1 rounded-md font-bold shrink-0 transition cursor-pointer ${
                        filterType === 'builtin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Wzorce systemowe ({BUILT_IN_TEMPLATES.length})
                    </button>
                  </div>
                </div>

                {/* Templates Scrollable List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                template.isBuiltIn ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {template.isBuiltIn ? 'Wzorzec' : 'Własny'}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {template.name}
                              </h4>
                            </div>
                            {template.description && (
                              <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Stats Pill Grid */}
                        <div className="grid grid-cols-3 gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                          <span className="flex items-center gap-1">
                            <Users size={11} className="text-blue-500" /> {template.stats.classesCount} klas
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap size={11} className="text-amber-500" /> {template.stats.teachersCount} naucz.
                          </span>
                          <span className="flex items-center gap-1">
                            <Landmark size={11} className="text-emerald-500" /> {template.stats.roomsCount} sal
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-12 px-4 text-slate-400 space-y-2">
                      <Bookmark size={28} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">Brak szablonów spełniających kryteria</p>
                      <p className="text-[10px]">Kliknij „Zapisz bieżącą strukturę jako Szablon” powyżej, aby utworzyć pierwszy szablon!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: TEMPLATE DETAILS & APPLY FORM */}
              <div className="w-full md:w-7/12 flex flex-col h-full bg-white overflow-y-auto p-5 sm:p-6 space-y-5">
                {selectedTemplate ? (
                  <>
                    {/* Template Card Details */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              selectedTemplate.isBuiltIn ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {selectedTemplate.isBuiltIn ? 'Wzorzec Systemowy' : 'Szablon Użytkownika'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              Źródło: {selectedTemplate.sourceYear || 'Baza szkoły'}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 mt-1">
                            {selectedTemplate.name}
                          </h3>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleExportTemplate(selectedTemplate)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Eksportuj do pliku JSON"
                          >
                            <Download size={13} />
                            <span className="hidden sm:inline text-[10px]">Pobierz JSON</span>
                          </button>

                          {!selectedTemplate.isBuiltIn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(selectedTemplate.id, selectedTemplate.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Usuń ten szablon"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedTemplate.description && (
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {selectedTemplate.description}
                        </p>
                      )}

                      {/* Full Stats Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
                        <div className="bg-white border border-slate-200/80 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Oddziały</span>
                          <span className="text-sm font-black text-slate-800">{selectedTemplate.stats.classesCount}</span>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Nauczyciele</span>
                          <span className="text-sm font-black text-slate-800">{selectedTemplate.stats.teachersCount}</span>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Sale i Gabinety</span>
                          <span className="text-sm font-black text-slate-800">{selectedTemplate.stats.roomsCount}</span>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Przedmioty</span>
                          <span className="text-sm font-black text-slate-800">{selectedTemplate.stats.subjectsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* APPLY TEMPLATE CONFIGURATION SECTION */}
                    <div className="border border-indigo-150 bg-indigo-50/40 rounded-2xl p-4.5 space-y-4">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={16} className="text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          🚀 Konfiguracja wdrożenia szablonu
                        </h4>
                      </div>

                      {/* Year input & Class Promotion mode */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Docelowy rok szkolny *
                          </label>
                          <input 
                            type="text" 
                            value={targetYear}
                            onChange={(e) => setTargetYear(e.target.value)}
                            placeholder="np. 2027/2028"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Tryb adaptacji klas
                          </label>
                          <select
                            value={applyMode}
                            onChange={(e) => setApplyMode(e.target.value as 'promote' | 'exact')}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none"
                          >
                            <option value="promote">🎓 Promuj klasy o +1 rok wyżej (1A → 2A)</option>
                            <option value="exact">📋 Wczytaj strukturę klas 1:1 (bez zmian)</option>
                          </select>
                        </div>
                      </div>

                      {/* Element Checkboxes */}
                      <div className="space-y-2 pt-1 text-left">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          Elementy struktury do zastosowania:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.schoolInfo} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, schoolInfo: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Dane szkoły i dzwonki</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.infrastructure} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, infrastructure: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Budynki i sale lekcyjne</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.subjects} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, subjects: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Przedmioty szkolne</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.teachers} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, teachers: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Grono Nauczycielskie</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.classes} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, classes: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Klasy i oddziały</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.homerooms} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, homerooms: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Gabinety domowe klas</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.dutySpots} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, dutySpots: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Tereny dyżurów</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={applyOptions.assignments} 
                              onChange={(e) => setApplyOptions(prev => ({ ...prev, assignments: e.target.checked }))}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="font-semibold text-slate-800">Ramowe przydziały lekcji</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                          <input 
                            type="checkbox" 
                            checked={clearLessons} 
                            onChange={(e) => setClearLessons(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                          <span>Wyczyść siatkę ułożonych lekcji (przygotuj czysty plan na nowy rok)</span>
                        </label>
                      </div>

                      {/* Execute Button */}
                      <button
                        type="button"
                        onClick={handleExecuteApply}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer border-none"
                      >
                        <CheckCircle size={16} /> Zastosuj szablon i rozpocznij rok szkolny {targetYear}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                    <Bookmark size={36} className="text-slate-300 animate-pulse" />
                    <h4 className="text-sm font-black text-slate-700">Wybierz szablon z listy po lewej</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Wybierz wzorzec lub własny szablon, aby podglądnąć szczegóły i zaaplikować go na bieżący lub kolejny rok szkolny.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SAVE CURRENT STRUCTURE AS TEMPLATE */}
          {activeTab === 'save' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-3xl mx-auto w-full">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                  Zapis Szablonu
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  💾 Zapisz bieżącą strukturę szkoły jako Szablon
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Zapisana konfiguracja pozwoli Ci błyskawicznie zainicjalizować kolejny rok szkolny lub założyć nową szkołę o tym samym układzie.
                </p>
              </div>

              <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                    Nazwa szablonu *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="np. Szablon SP 15 – Struktura Bazowa"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Typ szkoły
                    </label>
                    <select
                      value={saveSchoolType}
                      onChange={(e) => setSaveSchoolType(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-500 outline-none"
                    >
                      <option value="sp">🏫 Szkoła Podstawowa</option>
                      <option value="lo">🎓 Liceum Ogólnokształcące</option>
                      <option value="tech">⚙️ Technikum</option>
                      <option value="bs">🔧 Szkoła Branżowa</option>
                      <option value="zsp">🧸 Zespół Szkolno-Przedszkolny</option>
                      <option value="custom">🏛️ Inna / Własna</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Opis lub notatki (opcjonalnie)
                    </label>
                    <input 
                      type="text" 
                      value={saveDesc}
                      onChange={(e) => setSaveDesc(e.target.value)}
                      placeholder="np. Zawiera ułożone gabinety 1-3, pracownie i pensum"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Scope selection */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                    Wybierz dane do uwzględnienia w szablonie:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.schoolInfo} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, schoolInfo: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Dane szkoły i dzwonki lekcyjne</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.infrastructure} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, infrastructure: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Budynki, piętra i gabinety ({currentAppState.planLekcji.rooms.length} sal)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.subjects} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, subjects: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Przedmioty ({currentAppState.subjects.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.teachers} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, teachers: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Nauczyciele z pensum ({currentAppState.teachers.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.classes} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, classes: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Klasy i oddziały ({currentAppState.classes.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.homerooms} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, homerooms: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Gabinety domowe klas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.assignments} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, assignments: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Siatka przydziałów ({currentAppState.planLekcji.assignments.length} pozycji)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={saveOptions.dutySpots} 
                        onChange={(e) => setSaveOptions(prev => ({ ...prev, dutySpots: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Tereny dyżurów ({currentAppState.dyzury.miejsca.length})</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle size={15} /> Zapisz szablon w pamięci programu
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
