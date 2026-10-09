/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Główny punkt wejścia aplikacji (Application Entry Point)
 * Opis: Inicjalizacja drzewa React, globalne przechwytywanie błędów wykonawczych oraz rejestracja Service Workera (PWA).
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Globalne śledzenie błędów środowiskowych (bezpieczne, bez danych osobowych)
const addGlobalError = (message: string, stack?: string, type: 'runtime' | 'promise' | 'manual' | 'sw' = 'runtime') => {
  try {
    const saved = localStorage.getItem('saleplan_v3_error_logs');
    let logs = [];
    if (saved) {
      try {
        logs = JSON.parse(saved);
        if (!Array.isArray(logs)) logs = [];
      } catch (e) {}
    }
    const newError = {
      id: 'err-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now(),
      timestamp: new Date().toISOString(),
      message,
      stack: stack || '',
      type,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    logs.unshift(newError);
    localStorage.setItem('saleplan_v3_error_logs', JSON.stringify(logs.slice(0, 100)));
    
    // Emitowanie zdarzenia informującego komponenty React o nowym błędzie
    window.dispatchEvent(new CustomEvent('app-error-added', { detail: newError }));
  } catch (e) {
    console.warn('Failed to save error log:', e);
  }
};

// Udostępnienie funkcji pomocniczej w obiekcie window
(window as any).__addAppError = addGlobalError;

// Nasłuchiwanie nieobsłużonych wyjątków środowiska wykonawczego
window.addEventListener('error', (event) => {
  const msg = event.message || 'Unknown runtime error';
  const stack = event.error ? event.error.stack : '';
  addGlobalError(msg, stack, 'runtime');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason ? (reason.message || String(reason)) : 'Unhandled Promise Rejection';
  const stack = reason ? reason.stack : '';
  addGlobalError(msg, stack, 'promise');
});

// Rejestracja Service Workera dla pełnej obsługi trybu offline (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('[Service Worker] Aktywny i zarejestrowany na zakresie:', registration.scope);
      })
      .catch((error) => {
        console.warn('[Service Worker] Błąd rejestracji:', error);
        addGlobalError('Błąd rejestracji Service Workera: ' + (error?.message || String(error)), error?.stack, 'sw');
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

