/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: Główny punkt wejścia aplikacji (Application Entry Point)
 * Opis: Inicjalizacja drzewa React, globalne przechwytywanie błędów wykonawczych oraz rejestracja Service Workera (PWA).
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { logAppError } from './services/dbStorage.ts';
import './index.css';

// Udostępnienie funkcji rejestrowania błędów w obiekcie window
(window as any).__addAppError = logAppError;

// Nasłuchiwanie nieobsłużonych wyjątków środowiska wykonawczego
window.addEventListener('error', (event) => {
  const msg = event.message || 'Unknown runtime error';
  const stack = event.error ? event.error.stack : '';
  logAppError(msg, stack, 'runtime');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason ? (reason.message || String(reason)) : 'Unhandled Promise Rejection';
  const stack = reason ? reason.stack : '';
  logAppError(msg, stack, 'promise');
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
        logAppError('Błąd rejestracji Service Workera: ' + (error?.message || String(error)), error?.stack, 'sw');
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

