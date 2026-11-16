// sw.js: lets the public site open without internet after the first visit.
// Network first, so people always get the newest version when they are online;
// the saved copy is only used when the network fails.
var CACHE = 'scheme-check-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(['./']); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request).then(function (response) {
      var copy = response.clone();
      if (response.ok) caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
      return response;
    }).catch(function () {
      return caches.match(request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./'); });
    })
  );
});
