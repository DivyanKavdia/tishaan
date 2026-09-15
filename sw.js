const CACHE_PREFIX = 'tishaan-game-zone-';
const CACHE = 'tishaan-game-zone-world-strike-1';
const BASE = new URL('./', self.location.href);
const ASSETS = ['./', './index.html', './assets/hub.css', './assets/hub.js', './assets/controller.svg', './games/catalog.json', './icon.svg', './icon-192.png', './icon-512.png', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    const catalog = await (await cache.match('./games/catalog.json')).json();
    await cache.addAll([...new Set(catalog.flatMap(game => [game.icon, game.cover]))]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const obsolete = (await caches.keys()).filter(key => (key.startsWith(CACHE_PREFIX) && key !== CACHE) || ['avengers-arena-v1', 'avengers-arena-v2'].includes(key));
    await Promise.all(obsolete.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin) return;
  if (url.pathname.startsWith(`${BASE.pathname}games/`) && event.request.mode === 'navigate') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(cache.put(event.request, copy));
      }
      return response;
    } catch {
      if (cached) return cached;
      if (event.request.mode === 'navigate' && [BASE.pathname, `${BASE.pathname}index.html`].includes(url.pathname)) return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
