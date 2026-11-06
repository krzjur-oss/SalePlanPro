/**
 * SalePlan Pro – System Planowania Lekcji, Sal i Dyżurów Nauczycielskich
 * Moduł: PWA Service Worker (public/sw.js)
 * Opis: Obsługa trybu offline (Cache-First), pre-cache powłoki aplikacji oraz płynna aktualizacja zasobów.
 */
const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);

// Wstrzykiwane automatycznie podczas procesu budowania przez plugin Vite:
const BUILD_ID = '__BUILD_ID__';
const CURRENT_ASSETS = typeof __BUILD_ASSETS__ !== 'undefined' ? __BUILD_ASSETS__ : [];

// Nazwa cache unikalna dla danego builda
const CACHE_NAME = 'saleplan-cache-' + (typeof BUILD_ID === 'string' && !BUILD_ID.startsWith('__') ? BUILD_ID : 'dev');

const PRE_CACHE_RESOURCES = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'favicon.svg',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png',
  BASE_PATH + 'icon-maskable-192.png',
  BASE_PATH + 'icon-maskable-512.png'
];

/**
 * Zwraca kompletną listę zasobów do pre-cache, łącząc bazowe pliki powłoki
 * oraz wygenerowane pliki produkcyjne CURRENT_ASSETS.
 */
function getPreCacheList() {
  const dynamicAssets = (Array.isArray(CURRENT_ASSETS) ? CURRENT_ASSETS : [])
    .filter((asset) => typeof asset === 'string' && !asset.endsWith('.map'))
    .map((asset) => {
      if (asset.startsWith('http://') || asset.startsWith('https://') || asset.startsWith('/')) {
        return asset;
      }
      return BASE_PATH + asset.replace(/^\.\//, '');
    });

  return Array.from(new Set([...PRE_CACHE_RESOURCES, ...dynamicAssets]));
}

// 1. Zdarzenie Instalacji: cache'owanie zasobów powłoki aplikacji (App Shell) oraz CURRENT_ASSETS
// Błąd pre-cache przerywa instalację workera (brak tłumiącego .catch)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const resourcesToCache = getPreCacheList();
      console.log('[Service Worker ' + BUILD_ID + '] Pre-cache zasobów (' + resourcesToCache.length + ' pozycji)...');
      return cache.addAll(resourcesToCache);
    })
  );
});

// 2. Obsługa komunikatu SKIP_WAITING wysłanego przez baner UI
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    console.log('[Service Worker ' + BUILD_ID + '] Otrzymano SKIP_WAITING z banera, przejmowanie kontroli...');
    self.skipWaiting();
  }
});

// 3. Zdarzenie Aktywacji: usuwanie starych wersji pamięci podręcznej i przestarzałych plików hashowanych
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Usunięcie starych całych cache'y z poprzednich wersji aplikacji
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name.startsWith('saleplan-cache-') && name !== CACHE_NAME) {
            console.log('[Service Worker] Usuwanie starej pamięci podręcznej:', name);
            return caches.delete(name);
          }
        })
      );

      // Usunięcie starych hashowanych zasobów niewystępujących w aktualnym manifeście builda
      if (Array.isArray(CURRENT_ASSETS) && CURRENT_ASSETS.length > 0) {
        try {
          const currentCache = await caches.open(CACHE_NAME);
          const cachedRequests = await currentCache.keys();
          await Promise.all(
            cachedRequests.map(async (req) => {
              const url = new URL(req.url);
              if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
                const fileName = url.pathname.split('/').pop();
                const isCurrent = CURRENT_ASSETS.some((a) => a.endsWith('/' + fileName) || a === fileName);
                if (!isCurrent) {
                  console.log('[Service Worker] Usuwanie przestarzałego hashowanego pliku z cache:', fileName);
                  return currentCache.delete(req);
                }
              }
            })
          );
        } catch (e) {
          console.warn('[Service Worker] Błąd podczas czyszczenia hashowanych plików:', e);
        }
      }

      await self.clients.claim();
    })()
  );
});

// 4. Obsługa Zapytań Sieciowych (Fetch) z inteligentną strategią Cache / Network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Obsługujemy tylko lokalne zapytania z tego samego origin metodą GET
  if (requestUrl.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  // A. Nawigacja (HTML): ścigaj sieć z timeoutem 3 s i fallbackiem do cache
  if (event.request.mode === 'navigate' || requestUrl.pathname === BASE_PATH || requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await Promise.race([
            fetch(event.request).then((response) => {
              if (response && response.ok) {
                const responseClone = response.clone();
                event.waitUntil(
                  caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
                );
                return response;
              }
              throw new Error('Odpowiedź sieciowa niepoprawna: ' + (response ? response.status : 'brak'));
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Przekroczono limit czasu sieci (timeout 3 s)')), 3000);
            })
          ]);
          return networkResponse;
        } catch (error) {
          // Fallback do pamięci podręcznej w przypadku braku sieci lub przekroczenia 3 s
          const fallback =
            (await caches.match(BASE_PATH + 'index.html')) ||
            (await caches.match(BASE_PATH)) ||
            (await caches.match(event.request));

          if (fallback) {
            return fallback;
          }
          throw error;
        }
      })()
    );
    return;
  }

  // B. Hashowane zasoby produkcyjne (/assets/*): czyste Cache-First; cache.put opakowane w event.waitUntil
  if (requestUrl.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Czyste cache-first: brak zbędnych zapytań sieciowych w tle
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseToCache = networkResponse.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache))
            );
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Pozostałe zasoby statyczne (ikony, manifest, favicon): Cache-First ze sprawdzaniem
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseToCache = networkResponse.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache))
          );
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Brak dostępu do zasobu w trybie offline.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      });
    })
  );
});
