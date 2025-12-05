// UPDATE THIS VERSION NUMBER WHEN YOU DEPLOY NEW CHANGES
const CACHE_VERSION = 'rise-v1.3.5';
const CACHE_NAME = `${CACHE_VERSION}`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;

// Critical files to cache - minimal set for faster updates
const urlsToCache = [
  '/',
  '/manifest.json',
  '/lovable-uploads/icon-192x192.png',
  '/lovable-uploads/icon-512x512.png',
  '/RISEWhite.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching essential resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete, skipping waiting');
        // Notify clients that update is ready
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION
            });
          });
        });
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ASSETS_CACHE && !cacheName.startsWith('rise-offline-')) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Taking control of all clients');
      return self.clients.claim();
    })
  );
});

// Helper function to add COOP/COEP headers for SharedArrayBuffer support
function addCrossOriginHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
  newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Fetch event - cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and browser extensions
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Skip service worker and manifest
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(addCrossOriginHeaders)
    );
    return;
  }

  // Network-first strategy for JS and CSS (always get latest code)
  const isCodeAsset = /\.(js|css)$/.test(url.pathname);
  
  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(ASSETS_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return addCrossOriginHeaders(response);
      }).catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving code from cache (offline):', url.pathname);
            return addCrossOriginHeaders(cachedResponse);
          }
          console.log('[Service Worker] Code not available offline:', url.pathname);
          return new Response('Asset not available offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Cache-first strategy for static assets (images, fonts) - these change rarely
  const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|otf)$/.test(url.pathname);
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving asset from cache:', url.pathname);
          return addCrossOriginHeaders(cachedResponse);
        }
        
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(ASSETS_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return addCrossOriginHeaders(response);
        }).catch(() => {
          console.log('[Service Worker] Asset not available offline:', url.pathname);
          return new Response('Asset not available offline', { status: 503 });
        });
      })
    );
    return;
  }

  // For navigation requests (HTML pages), try cache first to enable offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving index from cache for navigation');
          return addCrossOriginHeaders(cachedResponse);
        }
        
        // If not cached, try network
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', responseToCache);
            });
          }
          return addCrossOriginHeaders(response);
        }).catch(() => {
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Offline - RISE Portal</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: system-ui; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    min-height: 100vh; 
                    margin: 0;
                    background: #000;
                    color: #C8A871;
                  }
                  .container { text-align: center; max-width: 400px; padding: 2rem; }
                  h1 { font-size: 2rem; margin-bottom: 1rem; }
                  p { color: #999; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>You're Offline</h1>
                  <p>RISE Portal is not available right now. Please check your internet connection and try again.</p>
                </div>
              </body>
            </html>`,
            {
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': 'text/html',
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'credentialless'
              })
            }
          );
        });
      })
    );
    return;
  }

  // For API requests, network-first with cache fallback
  event.respondWith(
    fetch(event.request).then((response) => {
      // Cache successful GET requests
      if (response && response.status === 200 && event.request.method === 'GET') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return addCrossOriginHeaders(response);
    }).catch(() => {
      // Try cache if network fails
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving API from cache:', url.pathname);
          return addCrossOriginHeaders(cachedResponse);
        }
        return new Response('Offline - Content not available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);
  
  let notificationData = {
    title: 'RISE Portal',
    body: 'You have a new notification',
    icon: '/lovable-uploads/icon-192x192.png',
    badge: '/lovable-uploads/icon-192x192.png',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: payload.data || {}
      };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/portal');
        }
      })
  );
});
