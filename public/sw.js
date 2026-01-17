const CACHE_VERSION = 'v1-2026-01-17';
const CACHE_NAME = `conneclify-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/robots.txt'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
        // Don't fail the install if some assets can't be cached
        return Promise.resolve();
      });
    })
  );
  // Force new service worker to take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API calls: network first, fallback to cache
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache errors or redirects
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clone and cache successful responses
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page or generic offline response
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
    return;
  }

  // For other resources (JS, CSS, etc): cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((response) => {
          // Don't cache errors or non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          // Clone and cache successful responses
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Return a basic offline response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Try to sync pending messages
      fetch('/api/messages/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {
        // Reschedule if sync fails
        return self.registration.sync.register('sync-messages');
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
