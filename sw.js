// VIP FARUK 999 - Service Worker
const CACHE_NAME = 'vip-faruk-999-cache-v1';
const urlsToCache = [ '/', '/index.html', '/assets/css/styles.css', '/assets/js/app.js', '/config/config.js' ];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
