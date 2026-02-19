const CACHE = 'silsilah-v1';
const ASSETS = [
 './silsilah.html',
 './silsilah.webmanifest',
 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap'
];

self.addEventListener('install', e => {
 e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
 );
});

self.addEventListener('activate', e => {
 e.waitUntil(
  caches.keys().then(keys =>
   Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim())
 );
});

self.addEventListener('fetch', e => {
 if (e.request.method !== 'GET') return;
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