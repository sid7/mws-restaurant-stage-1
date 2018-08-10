const _uniChar = { logo: "🍽" }
class sw_msgs {
  constructor() {
    this.pic = {
      worker: "👷",
      success: "✔️" || "✓",
      err: "⚠️" || "⚠",
      local: "💾"
    }
  }
  base(a) { return "%c" + this.pic.worker + " " + a + " "; }
  success(s = "font-size: 20px") {
    return console.log(this.base("Service Worker Registered") + this.pic.success, s);
  }
  err(s = "font-size: 20px;color: #f00", e) {
    return console.log(this.base(e ? "Service worker registration failed" : "This browser does not support Service Worker!") + this.pic.err, s, e);
  }
  fromLocal(s = "font-size: 16px;") {
    return console.log(this.base("data fetch from indexDB(idb)") + this.pic.local, s);
  }
}
const _msg = new sw_msgs();

class utils {
  static get __metaInfo() {
    return { indexDB_ver: 1, storeName: "restaurants" };
  }
  static __openiDB() {
    return idb.open("restaurants-reviews", this.__metaInfo.indexDB_ver, DB => {
      let store = DB.createObjectStore(this.__metaInfo.storeName, {
        keyPath: "id"
      });
      store.createIndex("by-id", "id");
    });
  }
  static getData() {
    return this.__openiDB().then(db => {
      if (!db) {
        return;
      }
      let tx = db.transaction(this.__metaInfo.storeName);
      let store = tx.objectStore(this.__metaInfo.storeName);
      return store.getAll();
    });
  }
  static addData(data) {
    this.__openiDB().then(db => {
      let tx = db.transaction(this.__metaInfo.storeName, "readwrite");
      let store = tx.objectStore(this.__metaInfo.storeName);
      data.forEach(a => {
        store.put(a);
      });
      return data;
    });
  }
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
    const port = 1337; // Change this to your server port
    let url = new URL(location.origin);
    url.port = port;
    url.pathname = "restaurants";
    // return `http://localhost:${port}/restaurants`;
    return url;
  }

  /**
   * Fetch all restaurants.
   * */
  static fetchRestaurants(callback) {
    fetch(this.DATABASE_URL)
      .then(res => res.json())
      .then(json => {
        if(json) {
          utils.addData(json);
          return callback(null, json);
        }
      }).catch(() => {
        _msg.fromLocal();
        utils
          .getData()
          .then(json => callback(null, json))
          .catch(err => callback(err, null))
      })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          // Got the restaurant
          callback(null, restaurant);
        } else {
          // Restaurant does not exist in the database
          callback("Restaurant does not exist", null);
        }
      }
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
}
