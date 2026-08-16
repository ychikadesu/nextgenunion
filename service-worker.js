// Songbook service worker — offline-first app shell + data cache.
// Bump CACHE_VERSION whenever shipped files change so clients pick up updates.
const CACHE_VERSION = 'songbook-v0.0.11';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './config.js',
  './lang/config.js',
  './lang/eng.js',
  './lang/mn.js',
  './lang/kr.js',

  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './icons/app-icon-maskable-192.png',
  './icons/app-icon-maskable-512.png',
  './icons/splash-logo.png',
  './icons/about-logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) =>
        cache.addAll(APP_SHELL)
          .then(() => fetch('./data/songs/manifest.json'))
          .then((res) => res.json())
          .then((songFiles) => {
            const songUrls = songFiles.map((f) => `./data/songs/${f}`);
            return cache.addAll(['./data/songs/manifest.json', ...songUrls]);
          })
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Strategy: cache-first for app shell/assets, falling back to network,
// and updating the cache in the background when the network succeeds.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to cache

      return cached || networkFetch;
    })
  );
});
