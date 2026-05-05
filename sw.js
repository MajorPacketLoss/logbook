const CACHE_NAME = 'logbook-v1';
const ASSETS = [
  '/logbook/',
  '/logbook/index.html',
  '/logbook/style.css',
  '/logbook/app.js',
  '/logbook/db.js',
  '/logbook/manifest.json',
  '/logbook/pages/dashboard.js',
  '/logbook/pages/vehicles.js',
  '/logbook/pages/logTrip.js',
  '/logbook/pages/logFuel.js',
  '/logbook/pages/tripHistory.js',
  '/logbook/pages/fuelHistory.js',
  '/logbook/pages/summary.js',
  '/logbook/pages/exportPage.js',
  '/logbook/pages/settings.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
