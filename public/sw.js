
const BASE = new URL(self.registration.scope).pathname;
const CACHE = 'platform-lab-public-v2-' + BASE;
const PUBLIC_PATHS = [
  'offline.html',
  'manifest.json',
  'resources/lab-icon-180.png',
  'resources/lab-icon-192.png',
  'resources/lab-icon-512.png'
].map(path => BASE + path);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_PATHS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('platform-lab-public-') && key !== CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept API, authorization, non-GET, or cross-origin traffic.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.headers.has('Authorization') ||
      url.pathname.startsWith('/api/') || url.pathname.startsWith('/__appdeploy/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const offline = await caches.match(BASE + 'offline.html');
      return offline || new Response('You are offline. Reconnect to open Platform Practice Lab.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }));
    return;
  }

  if (PUBLIC_PATHS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
