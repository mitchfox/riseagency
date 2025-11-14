// UPDATE THIS VERSION NUMBER WHEN YOU DEPLOY NEW CHANGES
const CACHE_VERSION = 'rise-portal-v1.0.2';
const CACHE_NAME = `${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json'
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
          if (cacheName !== CACHE_NAME) {
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

// Fetch event - network-first strategy with timeout
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and browser extensions
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Try network first with 5 second timeout
    Promise.race([
      fetch(event.request).then((response) => {
        // Only cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      }),
      // Timeout after 5 seconds
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ])
    .catch(() => {
      // If network fails, try cache
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Offline - RISE Portal</title>
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
                'Content-Type': 'text/html'
              })
            }
          );
        }
        
        return new Response('Offline - Content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
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
