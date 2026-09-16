const CACHE_PREFIX = 'tishaan-game-zone-';
const CACHE = 'tishaan-game-zone-c49d0cc4c03e';
const BASE = new URL('./', self.location.href);
const CORE = [
  './',
  './index.html',
  './assets/hub.css',
  './assets/hub.js',
  './assets/player.js',
  './studio/passport.js',
  './assets/controller.svg',
  './games/catalog.json',
  './icon.svg',
  './manifest.webmanifest',
  './games/monterra/cover.webp'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const update = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  return (await update) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return;

  // Game pages always come from the network first so newly deployed games and
  // gameplay fixes are never trapped behind an old app-shell cache.
  if (url.pathname.startsWith(`${BASE.pathname}games/`) && request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // The shell, scripts and catalog are update-sensitive.
  const updateSensitive = request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    /\.(?:js|css|html|json|webmanifest)$/.test(url.pathname) ||
    url.pathname.endsWith('/games/catalog.json') ||
    url.pathname.endsWith('/sw.js');
  if (updateSensitive) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, event));
});