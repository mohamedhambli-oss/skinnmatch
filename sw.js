// SkinMatch Service Worker — v1.0
const CACHE_NAME = 'skinmatch-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Installation — mise en cache des fichiers essentiels
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('SkinMatch PWA : mise en cache des fichiers');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('SkinMatch PWA : suppression ancien cache', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch — stratégie Network First puis Cache
self.addEventListener('fetch', function(event) {
  // Ne pas intercepter les appels API externes
  if (event.request.url.includes('api.anthropic.com') ||
      event.request.url.includes('youtube.com') ||
      event.request.url.includes('tiktok.com') ||
      event.request.url.includes('easypara.fr')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Si la requête réseau réussit, on met à jour le cache
        if (response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Si pas de réseau, on utilise le cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Page de fallback si rien en cache
          return caches.match('/index.html');
        });
      })
  );
});

// Notifications push (pour plus tard)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = event.data.json();
  self.registration.showNotification(data.title || 'SkinMatch', {
    body: data.body || 'Ta routine t\'attend !',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100]
  });
});
