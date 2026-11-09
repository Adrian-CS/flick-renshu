// Offline support. The build step stamps the version placeholder in out/sw.js so
// that every new build installs a fresh cache with the full precache list.
const VERSION = '__BUILD_VERSION__';
const CACHE = `flick-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
      const { files } = await res.json();
      const cache = await caches.open(CACHE);
      await cache.addAll(files);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // pages are cached under their path (trailingSlash: /practice/ → /practice/index.html)
      const hit = (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || (await cache.match(url.pathname));
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        if (req.mode === 'navigate') {
          const fallback = await cache.match('/');
          if (fallback) return fallback;
        }
        throw e;
      }
    })(),
  );
});
