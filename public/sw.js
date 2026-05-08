// Safe, transparent pass-through service worker for PWA compliance
// Does not lock index.html cache, preventing hashed JS bundle 404 white-screen crashes!

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
  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback if offline
      return caches.match(event.request);
    })
  );
});
