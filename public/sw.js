/**
 * Service Worker MÍNIMO — solo para PWA (ícono instalable)
 *
 * NO cachea nada. Todo va directo a la red.
 * El navegador gestiona su propio cache de forma nativa.
 *
 * Razón: el SW anterior causaba "This page couldn't load" cuando
 * un chunk de Next.js fallaba al cargar y el SW no tenía fallback.
 */

const CACHE_NAME = 'ganesha-v6-clean';

self.addEventListener('install', () => {
  // Tomar control inmediatamente, sin esperar que se cierren pestañas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Borrar TODOS los caches anteriores (v1–v5 incluidos)
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// SIN handler de fetch → todo va directo a la red
// El browser usa su propio cache HTTP (Cache-Control headers de Vercel)
