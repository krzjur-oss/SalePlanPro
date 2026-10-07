const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);

// Wstrzykiwane automatycznie podczas procesu budowania przez plugin Vite:
const BUILD_ID = "v_muy72d8a_59598ceb2e";
const CURRENT_ASSETS = ["assets/AssignRoomDropdown-Bge28eM5.js","assets/CompanionWindowView-DUvGwXIh.js","assets/DualScreenMasterView-Can1YZ4E.js","assets/Dyzury-BODOvinK.js","assets/KreatorSzkoly-CSK0qbmM.js","assets/OProgramie-B4UU4-0g.js","assets/PlanKlas-gUQhFlCa.js","assets/PlanSal-DBId8Maf.js","assets/PlanVariantsModal-D5fVCCWf.js","assets/SnapshotManager-DMq0lsTc.js","assets/Statystyki-Chie0sVn.js","assets/UstawieniaGeneratorow-CBg76e7J.js","assets/Wydruki-ZmAIcYnK.js","assets/adaptationDuty-t6i_g3Bp.js","assets/index-B0fp4MPv.css","assets/index-Dw1xUvGt.js","assets/roomUtils-gJMDp5Ow.js","assets/vendor-dnd-Dk37sCMx.js","assets/vendor-lucide-BXk39BLU.js","assets/vendor-motion-7o_NUGSZ.js","assets/vendor-react-M1a6ECPm.js","assets/vendor-recharts-BSefab-z.js","assets/vendor-zod-CMX-6PHh.js"];

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

// 1. Zdarzenie Instalacji: cache'owanie zasobów powłoki aplikacji (App Shell)
// ZAMIAST cichego skipWaiting, nowy worker czeka na sygnał od użytkownika (kliknięcie banera)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker ' + BUILD_ID + '] Pre-cache podstawowych zasobów powłoki...');
      return cache.addAll(PRE_CACHE_RESOURCES);
    }).catch(err => {
      console.warn('[Service Worker] Błąd przy pre-cache:', err);
    })
  );
});

// 2. Obsługa komunikatu SKIP_WAITING wysłanego przez baner UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
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
                const isCurrent = CURRENT_ASSETS.some(a => a.endsWith('/' + fileName) || a === fileName);
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

  // Obsługujemy tylko lokalne zapytania z tego samego origin
  if (requestUrl.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  // HTML (zapytania nawigacyjne): Network-First z fallbackiem do cache
  if (event.request.mode === 'navigate' || requestUrl.pathname === BASE_PATH || requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, response.clone());
            return response;
          }
          const fallback = await caches.match(BASE_PATH + 'index.html') || 
                           await caches.match(BASE_PATH) || 
                           await caches.match(event.request);
          return fallback || response;
        } catch (error) {
          const fallback = await caches.match(BASE_PATH + 'index.html') || 
                           await caches.match(BASE_PATH) || 
                           await caches.match(event.request);
          if (fallback) return fallback;
          throw error;
        }
      })()
    );
    return;
  }

  // Zasoby statyczne (JS, CSS, Obrazy, Fonty, JSON): Cache-First ze sprawdzaniem w tle
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        return new Response('Brak dostępu do sieci w trybie offline.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      });
    })
  );
});
