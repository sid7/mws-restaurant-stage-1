/** Service Worker file */

/**
 * name of caches
 */
const static_cache_name = "restaurant-reviews-v1";

/**
 * list of static files which to be cache
 */
const static_files = [
  "/",
  "css/styles.css",
  "data/restaurants.json",
  "img/",
  "js/dbhelper.js",
  "js/main.js",
  "js/restaurant_info.js"
];

/**
 * cache file on install event
 */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(static_cache_name).then(cache => {
      return cache.addAll(static_files);
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return (
              cacheName.startsWith("restaurant-") &&
              cacheName != static_cache_name
            );
          })
          .map(cacheName => {
            return caches.delete(cacheName);
          })
      );
    })
  );
});

/**
 * serve file from cache
 * if file is not in cache then add them to cache
 */
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(Res => {
      if (Res) {
        return Res;
      }
      return fetch(e.request).then(res =>
        caches.open(static_cache_name).then(cache => {
          cache.put(e.request.url, res.clone());
          return res;
        })
      );
    })
  );
});

self.addEventListener("message", e => {
  if (e.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
