/** Service Worker file */

/**
 * name of caches
 */
const static_cache = "restaurant-reviews-v2.0.29";
const img_cache = "restaurant-reviews-imgs";
const map_imgs_cache = "restaurant-reviews-map_imgs";

const all_cache = [static_cache, img_cache, map_imgs_cache];
/**
 * list of static files which to be cache
 */
const cache_files = {
  [static_cache]: [
    "/",
    "/restaurant.html",
    "css/styles.min.css",
    "img/",
    "js/idb-with-store.min.js",
    "js/lib.min.js",
    "js/main.min.js",
    "js/restaurant_info.min.js"
  ],
  [img_cache]: [
    ...new Array(10).fill().map((_, i) => `img/${++i}.jpg`),
    "img/img404.png"
  ]
};

/**
 * cache file on install event
 */
self.addEventListener("install", e => {
  e.waitUntil(
    Promise.all(
      Object.entries(cache_files).map(([key, files]) => {
        return caches.open(key).then(cache => cache.addAll(files));
      })
    )
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(
              cacheName =>
                cacheName.startsWith("restaurant-reviews-") &&
                !all_cache.includes(cacheName)
            )
            .map(cacheName => caches.delete(cacheName))
        )
      )
  );
});

/**
 * serve file from cache
 * if file is not in cache then add them to cache
 */
function srv_cache(store, url, db) {
  return caches
    .open(store)
    .then(cache =>
      cache.match(url).then(cRes => {
        if (cRes) {
          return cRes;
        }
        return fetch(url).then(fRes => {
          cache.put(url, fRes.clone());
          return fRes;
        });
      })
    )
    .catch(err => console.log(err));
}

// function handle_db(db, res) {
//   res.json().then(data => {
//     store.addAll(db, data);
//   });
// }
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname === "/restaurant.html") {
    url.search = "";
    e.respondWith(caches.match("/restaurant.html"));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      srv_cache(
        url.pathname.startsWith("/img/") ? img_cache : static_cache,
        url.href
      )
    );
    return;
  }
  if (url.origin.endsWith(1337)) {
    e.respondWith(fetch(url.href));
    return;
  }
  if (url.host === "api.tiles.mapbox.com") {
    e.respondWith(srv_cache(map_imgs_cache, url.href));
    return;
  }
  e.respondWith(caches.match(e.request).then(cRes => cRes || fetch(e.request)));
});

self.addEventListener("message", e => {
  if (e.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
