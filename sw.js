// Service worker for the Site Visit H&S Checklist.
// Caches the app so it keeps working with no signal after the first successful load.
// This file must sit in the same folder as the checklist's index.html on the server.

const CACHE = 'hs-checklist-offline-v3';
const SHELL_URLS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        SHELL_URLS.map((url) =>
          fetch(url, { cache: 'reload' }).then((response) => {
            if (response && response.ok) return cache.put(url, response.clone());
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);

        if (cached) return cached;

        return networkFetch.then((networkResponse) => {
          if (networkResponse) return networkResponse;
          // Offline and no exact match cached — for a page load, fall back
          // to the cached app shell rather than failing outright.
          if (isNavigation) {
            return cache.match('./index.html').then((shell) => shell || cache.match('./'));
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
    )
  );
});
