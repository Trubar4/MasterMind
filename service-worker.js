const CACHE_NAME = 'philipp-mastermind-v1';
const urlsToCache = [
    '/philipp-mastermind-pwa/',
    '/philipp-mastermind-pwa/index.html',
    '/philipp-mastermind-pwa/styles.css',
    '/philipp-mastermind-pwa/script.js',
    '/philipp-mastermind-pwa/manifest.json',
    '/philipp-mastermind-pwa/icons/icon-192.png',
    '/philipp-mastermind-pwa/icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});