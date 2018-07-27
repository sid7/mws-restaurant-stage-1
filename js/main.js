let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []



if(navigator.serviceWorker) {
  /**
   * Register Service Worker
   * */
  navigator.serviceWorker.register("./sw.js").then(reg => {
    console.log("Service Worker Registered");
    if(!navigator.serviceWorker.controller) {
      return;
    }
    if(reg.waiting) {
      navigator.serviceWorker.controller.postMessage({action: 'skipWaiting'});
      return;
    }
    if(reg.installing) {
      navigator.serviceWorker.addEventListener('statechange', () => {
        if (navigator.serviceWorker.controller.state == 'installed') {
          navigator.serviceWorker.controller.postMessage({action: 'skipWaiting'});
        }
      });
    }
    reg.addEventListener('updatefound', function() {
      navigator.serviceWorker.addEventListener('statechange', () => {
        if (navigator.serviceWorker.controller.state == 'installed') {
          navigator.serviceWorker.controller.postMessage({action: 'skipWaiting'});
        }
      });
    });
  }).catch(err => { console.log("Service worker registration failed", err)});
} else {
  console.log("This browser does not support Service Worker!");
}

// Ensure refresh is only called once
let refreshing;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) { return; }
  window.location.reload();
  refreshing = true;
});

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1Ijoic2lkNyIsImEiOiJjamp1OGJvd2QwMzAzM3ByejRnd2x2NXY4In0.fkA6CjOQbzCkLVqJ1Wm4lA',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * zoom and move image on hover
 */
imgHov = ({pageX, pageY, target: el}) => {
  const origin = ((pageX - el.offsetLeft) / el.width) * 100 + '% ' + ((pageY - el.offsetTop) / el.height) * 100 +'%';
  el.style.cssText = 'transform-origin: ' + origin;
}

/**
 * res image url
 */
resImgUrl = (r, s) => {
  s = s === "sm" ? "-400_sm" : "-800_md";
  r = r.replace(/\.jpg/, s + ".jpg");
  return "/images_src/" + r;
}
/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  const container = document.createElement('div');
  li.setAttribute('tabindex', 0);
  container.className = "img-container";

  const p = document.createElement('picture');
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = resImgUrl(restaurant.photograph, "sm");
  image.alt = " ";
  image.onmousemove = imgHov;

  p.innerHTML = `<source media="(max-width: 400px)" srcset="${resImgUrl(restaurant.photograph, "sm")}" />`;
  p.innerHTML += `<source media="(min-width: 401px)" srcset="${resImgUrl(restaurant.photograph, "md")}" />`;
  p.appendChild(image);

  container.append(p);
  li.append(container);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute("aria-label", `Click to open ${restaurant.name}'s details page`);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

