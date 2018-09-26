/** Service Worker file */

/**
 * name of caches
 */
const static_cache_name = "restaurant-reviews-v2";
const img_cache = "restaurant-imgs";
const map_imgs = "map-imgs";
/**
 * list of static files which to be cache
 */
const static_files = [
  "/",
  "css/styles.min.css",
  "img/",
  "js/lib.min.js",
  "js/main.min.js",
  "js/restaurant_info.min.js"
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
    caches
      .keys()
      .then(cacheNames => {
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
      .catch(err => console.log(err))
  );
});

/**
 * serve file from cache
 * if file is not in cache then add them to cache
 */
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(cRes => {
      if (cRes) {
        return cRes;
      }
      return fetch(e.request).then(fRes => {
        return caches.open(static_cache_name).then(cache => {
          cache.put(e.request.url, fRes.clone());
          return fRes;
        });
      });
    })
  );
});

self.addEventListener("message", e => {
  if (e.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
