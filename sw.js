const VERSION = 'v2';
const CACHE = 'inv-cache-' + VERSION;
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './lib/xlsx.full.min.js',
  './lib/quagga.min.js',
  './lib/zxing.min.js',
  './inventory.xlsx'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const p of PRECACHE) {
        try { await cache.add(p); } catch (err) { console.warn('Не удалось закэшировать', p); }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isData = url.pathname.endsWith('inventory.xlsx');
  const isApp  = url.pathname.endsWith('index.html') || url.pathname.endsWith('/');
  if (isData || isApp) e.respondWith(networkFirst(e.request));
  else e.respondWith(cacheFirst(e.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Офлайн и нет в кэше', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    return new Response('Офлайн', { status: 503 });
  }
}