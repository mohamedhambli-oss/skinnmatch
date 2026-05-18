// ─── SkinMatch Service Worker ────────────────────────────────────────────────
// Version : met à jour ce numéro à chaque déploiement pour invalider le cache
const CACHE_NAME = 'skinmatch-v1';

// Assets essentiels mis en cache dès l'installation
const PRECACHE_ASSETS = [
  '/skinnmatch/',
  '/skinnmatch/index.html',
  '/skinnmatch/style.css',
  '/skinnmatch/app.js',
  '/skinnmatch/products.js',
  '/skinnmatch/manifest.json',
];

// ── Install : précache les assets essentiels ─────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function() {
      // Forcer l'activation immédiate sans attendre la fermeture des onglets
      return self.skipWaiting();
    })
  );
});

// ── Activate : supprimer les anciens caches ───────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      // Prendre le contrôle immédiatement de tous les onglets ouverts
      return self.clients.claim();
    })
  );
});

// ── Fetch : stratégie Cache First pour les assets, Network First pour le reste ─
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Ignorer les requêtes Firebase / Firestore / Google APIs (toujours réseau)
  if (
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return; // Laisser passer sans interception
  }

  // Assets statiques → Cache First
  if (
    event.request.method === 'GET' && (
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff')
    )
  ) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          // Mettre en cache la réponse pour la prochaine fois
          if (response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Pages HTML → Network First avec fallback cache (offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        // Hors ligne → servir index.html depuis le cache
        return caches.match('/skinnmatch/index.html');
      })
    );
    return;
  }

  // Tout le reste → réseau direct
});
