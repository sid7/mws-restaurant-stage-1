const $ = q => document.querySelector(q);
const $$ = q => document.querySelectorAll(q);
const _uniChar = { logo: "🍽" };
const db_url = `http://${location.hostname}:1337`;

class sw_msgs {
  constructor() {
    this.pic = {
      worker: "👷",
      success: "✔️" || "✓",
      err: "⚠️" || "⚠",
      local: "💾"
    };
  }
  base(a) {
    return "%c" + this.pic.worker + " " + a + " ";
  }
  success(s = "font-size: 20px") {
    return console.log(
      this.base("Service Worker Registered") + this.pic.success,
      s
    );
  }
  err(s = "font-size: 20px;color: #f00", e) {
    return console.log(
      this.base(
        e
          ? "Service worker registration failed"
          : "This browser does not support Service Worker!"
      ) + this.pic.err,
      s,
      e
    );
  }
  fromLocal(s = "font-size: 16px;") {
    return console.log(
      this.base("data fetch from indexDB(idb)") + this.pic.local,
      s
    );
  }
}
const _msg = new sw_msgs();

class Toast {
  constructor() {
    this.timer = null;
  }
  static action(type) {
    const [add, remove] = type === "show" ? ["show", "hide"] : ["hide", "show"];
    $(".toast").classList.add(add);
    $(".toast").classList.remove(remove);
    if (type === "hide") {
      this.timer = null;
    }
  }
  static show(text, time = 5000) {
    $(".toast-text").textContent = text;
    this.action("show");
    this.timer = window.setTimeout(() => {
      this.action("hide");
    }, time);
  }
  static hide() {
    this.action("hide");
  }
}

function inLoc(key) {
  return JSON.parse(localStorage.getItem(key) || "false");
}
function fetch_json_err_check(res) {
  if (!res.ok) {
    throw new Error(res.status);
  }
  return res.json();
}

/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return `${db_url}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   * */
  static fetchRestaurants(callback) {
    if (inLoc("loc_all_rest")) {
      store.getAll("restaurants").then(rest => callback(null, rest));
    } else {
      fetch(`${db_url}/restaurants`)
        .then(fetch_json_err_check)
        .then(data => {
          callback(null, data);
          store.addAll("restaurants", data).then(() => {
            localStorage.setItem("loc_all_rest", true);
          });
        })
        .catch(err => {
          callback(err, null);
        });
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback, loc = true) {
    if (loc && inLoc("loc_all_rest")) {
      store.getAllById("restaurants", id).then(rest => {
        if (rest.length === 0) {
          callback("Restaurant does not exist!", null);
        } else {
          callback(null, rest[0]);
        }
      });
    } else {
      fetch(`${db_url}/restaurants`)
        .then(fetch_json_err_check)
        .then(data => {
          const rest = data.find(r => r.id === id);
          if (rest) {
            callback(null, rest);
          } else {
            callback("Restaurant does not exist", null);
          }
          store.addAll("restaurants", data).then(() => {
            localStorage.setItem("loc_all_rest", true);
          });
        })
        .catch(err => {
          callback(err, null);
        });
    }
  }
  static fetchLocalReviewsById(id) {
    // return store.getAllRevsByRestId_from_offline(id);
    return store
      .getAll("offline-reviews")
      .then(items =>
        items
          .filter(item => Number(item.json.restaurant_id) === id)
          .map(a => a.json)
      );
  }
  /**
   *
   * Fetch Restaurant's review by Restaurant id
   */
  static fetchRestaurantReview(id, callback) {
    const loc_rev = JSON.parse(localStorage.getItem("loc_rev") || "[]");
    if (loc_rev.includes(id)) {
      store.getAllByIndex("reviews", "restaurant_id", id).then(rev => {
        callback(null, rev);
      });
    } else {
      fetch(`${db_url}/reviews/?restaurant_id=${id}`)
        .then(fetch_json_err_check)
        .then(rev => {
          callback(null, rev);
          store.addAll("reviews", rev).then(() => {
            loc_rev.push(id);
            localStorage.setItem("loc_rev", JSON.stringify(loc_rev));
          });
        })
        .catch(err => {
          callback(err, null);
        });
    }
  }

  static fetchRestaurantWithReview(id, callback) {
    this.fetchRestaurantById(id, (err1, rest) => {
      if (err1) {
        callback(err, null);
        return;
      }
      this.fetchRestaurantReview(id, (err2, rev) => {
        rest.reviews = rev;
        if (err2) {
          callback(err2, null);
        } else {
          callback(null, rest);
        }
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != "all") {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != "all") {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(a) {
    return a ? `img/${a}.jpg` : "img/img404.png";
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker(
      [restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      }
    );
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */
  static fav(id, act) {
    const url = `${db_url}/restaurants/${id}/?is_favorite=${act}`;
    if (navigator.onLine) {
      fetch(url, { method: "PUT" })
        .then(fetch_json_err_check)
        .then(data => {
          console.log(data);
          return store.add("restaurants", data);
        })
        .catch(err => {
          console.log("Action: Failed!", err);
        });
    } else {
      loc_fav(id, act);
    }
  }
}

function loc_fav(id, bool) {
  const locFavs = JSON.parse(localStorage.getItem("loc_rest_fav") || "{}");
  locFavs[id] = bool;
  localStorage.setItem("loc_rest_fav", JSON.stringify(locFavs));
}
