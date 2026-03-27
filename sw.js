/* ── Water Refill Finder – Service Worker (sw.js) ─────────────────── */
'use strict';

const CACHE_STATIC  = 'refill-static-v1';
const CACHE_API     = 'refill-api-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/manifest.json',
  '/data/mock-stations.js',
  // Leaflet (CDN) – cached on first fetch, not pre-cached to keep install fast
];

// ── Install ────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_API)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API requests: network-first, fall back to cached response
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirstApi(request));
    return;
  }

  // Static assets (and CDN): cache-first
  e.respondWith(cacheFirstStatic(request));
});

/** Network-first strategy for API calls; caches successful responses */
async function networkFirstApi(request) {
  const cache = await caches.open(CACHE_API);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone()); // update cached copy
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/** Cache-first strategy for static / CDN assets */
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a minimal offline fallback for HTML navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}
