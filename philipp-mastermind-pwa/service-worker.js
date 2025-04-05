// Replace this with your actual app version - must match script.js
const CACHE_VERSION = '1.0.9';
const CACHE_NAME = `mastermind-cache-${CACHE_VERSION}`;

// List all files to cache
const filesToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  // Add any other resources your app uses
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  
  // Skip waiting forces the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(filesToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  
  // Claim clients forces the service worker to become the active service worker
  // for all clients in its scope
  self.clients.claim();
  
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        // If a cached item doesn't match the current cache name, delete it
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  console.log('[ServiceWorker] Fetch', event.request.url);
  
  // For HTML requests, use network-first approach to always get latest
  if (event.request.mode === 'navigate' || 
      event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // For other requests (JS, CSS, images), check cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If resource is in cache, return it
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }
        
        // If resource isn't in cache, fetch it from network
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache 404s or other error responses
            if (!networkResponse || networkResponse.status !== 200 || 
                networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Cache the new resource for later
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          });
      })
  );
});