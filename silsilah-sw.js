const CACHE = 'silsilah-v2';

// Only pre-cache fonts — NOT the HTML (so updates always come through)
const PRECACHE = [
 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap'
];

self.addEventListener('install', e => {
 e.waitUntil(
  caches.open(CACHE)
   .then(c => c.addAll(PRECACHE).catch(() => { }))
   .then(() => self.skipWaiting())
 );
});

self.addEventListener('activate', e => {
 // Wipe ALL old caches (including silsilah-v1) so stale HTML is gone
 e.waitUntil(
  caches.keys()
   .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
   .then(() => self.clients.claim())
 );
});

self.addEventListener('fetch', e => {
 if (e.request.method !== 'GET') return;

 const url = new URL(e.request.url);

 // HTML & manifest: network-first — always fetch fresh, fall back to cache only if offline
 if (e.request.destination === 'document' ||
  url.pathname.endsWith('.html') ||
  url.pathname.endsWith('.webmanifest')) {
  e.respondWith(
   fetch(e.request)
    .then(resp => {
     const clone = resp.clone();
     caches.open(CACHE).then(c => c.put(e.request, clone));
     return resp;
    })
    .catch(() => caches.match(e.request))
  );
  return;
 }

 // Everything else (fonts, assets): cache-first
 e.respondWith(
  caches.match(e.request).then(cached => {
   if (cached) return cached;
   return fetch(e.request).then(resp => {
    if (resp && resp.status === 200 && resp.type === 'basic') {
     const clone = resp.clone();
     caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return resp;
   }).catch(() => cached);
  })
 );
});