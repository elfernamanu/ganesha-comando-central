const CACHE_NAME = 'ganesha-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Borrar TODOS los caches anteriores
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls → siempre red, NUNCA cachear
  if (url.pathname.startsWith('/api/')) return;

  // Solo cachear chunks estáticos de Next.js (tienen hash, son inmutables)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Todo lo demás (páginas, etc.) → red directa, sin cachear
  // Esto evita el error "Response body already used" y errores de hydration
});
