// Safe, transparent pass-through service worker for PWA compliance
// Only intercepts GET requests. Non-GET mutations (PATCH, POST, DELETE) are passed through natively to prevent CORS 403 errors!

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear any old caches that could be causing white-screens
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

// Simple network-first transparent fetch handler
self.addEventListener('fetch', (event) => {
  // 🚨 Core Safeguard: Only intercept standard GET requests!
  // Cross-origin mutations (POST, PATCH, PUT, DELETE) MUST bypass Service Worker completely!
  if (event.request.method !== 'GET') {
    return; // Let the browser handle the request natively!
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return a fallback Response instead of undefined to prevent TypeError crashes inside browser WKWebView!
        return new Response('Offline fallback', { status: 480, statusText: 'Offline' });
      })
  );
});
