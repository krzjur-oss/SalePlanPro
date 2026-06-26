const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);

const CACHE_NAME = 'saleplan-cache-v3';
const PRE_CACHE_RESOURCES = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.svg'
];

// 1. Zdarzenie Instalacji: cache'owanie zasobów powłoki aplikacji (App Shell)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-cache-owanie podstawowych zasobów powłoki...');
      return cache.addAll(PRE_CACHE_RESOURCES);
    }).catch(err => {
      console.warn('[Service Worker] Błąd przy pre-cache:', err);
    })
  );
});

// 2. Zdarzenie Aktywacji: czyszczenie starych wersji pamięci podręcznej i przejmowanie kontroli
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('saleplan-cache-') && cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Usuwanie starych plików cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Obsługa Zapytań Sieciowych (Fetch) z inteligentną strategią Cache / Network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Obsługujemy tylko lokalne zapytania z tej samej domeny (origin)
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Ignorujemy zapytania typu POST lub inne metody modyfikujące dane
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategia dla stron HTML (zapytania nawigacyjne): "Network-First" (Najpierw Sieć) z zapasowym Cache
  // Pozwala to na pobieranie świeżego HTML, a gdy jesteśmy całkowicie offline - odpala z cache.
  if (event.request.mode === 'navigate' || requestUrl.pathname === BASE_PATH || requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            // Zapisz świeżą wersję strony do pamięci podręcznej
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, response.clone());
            return response;
          }
          // Jeśli odpowiedź sieciowa nie jest prawidłowa (np. 404), spróbuj wczytać z cache
          const fallback = await caches.match(BASE_PATH + 'index.html') || 
                           await caches.match(BASE_PATH) || 
                           await caches.match(event.request);
          return fallback || response;
        } catch (error) {
          // W przypadku awarii sieci odpalamy bezpieczny, lokalny index.html
          const fallback = await caches.match(BASE_PATH + 'index.html') || 
                           await caches.match(BASE_PATH) || 
                           await caches.match(event.request);
          if (fallback) {
            return fallback;
          }
          throw error;
        }
      })()
    );
    return;
  }

  // Strategia dla zasobów statycznych (JS, CSS, Obrazy, Fonty, JSON): "Cache-First" (Najpierw Cache) z tłem sieciowym
  // Ponieważ Vite generuje hashowane pliki (np. index-[hash].js), są one niezmienne (immutable).
  // Serwujemy je natychmiast z pamięci, a jeśli ich nie ma - dociągamy i zapisujemy.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Zwracamy z pamięci natychmiast, ale w tle pobieramy najnowszą wersję (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignorujemy tymczasowe błędy sieci w tle */});
        
        return cachedResponse;
      }

      // Jeżeli nie ma w cache - pobierz z sieci i zapisz
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.warn('[Service Worker] Brak połączenia i brak w cache dla:', event.request.url);
        return new Response('Brak dostępu do sieci w trybie offline.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      });
    })
  );
});
