var restaurants, neighborhoods, cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, n) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      neighborhoods = n;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (n = neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  n.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, c) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      cuisines = c;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (c = cuisines) => {
  const select = document.getElementById("cuisines-select");

  c.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  newMap = L.map('map', {
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

  const c = cSelect[cIndex].value;
  const n = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(c, n, (error, rests) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(rests);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = rests => {
  // Remove all restaurants
  restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  if (markers) {
    markers.forEach(marker => marker.remove());
  }
  markers = [];
  restaurants = rests;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (rests = restaurants) => {
  const ul = document.getElementById('restaurants-list');
  rests.forEach(rest => {
    ul.append(createRestaurantHTML(rest));
  });
  addMarkersToMap();
}

/**
 * zoom and move image on hover
 */
imgHov = ({ pageX, pageY, target: el }) => {
  const origin = ((pageX - el.offsetLeft) / el.width) * 100 + '% ' + ((pageY - el.offsetTop) / el.height) * 100 + '%';
  el.style.cssText = 'transform-origin: ' + origin;
}

function ImgError() {
  this.classList.add("style-image-alt");
  this.onmousemove = null;
}
function toggleFav() {
  const state = this.classList.contains("yes");
  DBHelper.fav(this.dataset.id, !state);
  this.classList.toggle("yes");
  const [a, b] = state ? ["add", "remove"] : ["remove", "add"];
  this.setAttribute("aria-label", this.getAttribute("aria-label").replace(a, b));
}
/**
 * Create restaurant HTML.
 */
createRestaurantHTML = rest => {
  const li = document.createElement("li");
  const container = document.createElement("div");
  li.setAttribute("tabindex", 0);
  container.className = "img-container";

  const image = document.createElement("img");
  image.className = "restaurant-img";
  image.src = DBHelper.imageUrlForRestaurant(rest.photograph);
  image.alt = `Image of ${rest.name} Restaurant`;
  image.onmousemove = imgHov;
  image.onerror = ImgError;

  container.append(image);
  li.append(container);

  const name = document.createElement("h2");
  name.innerHTML = rest.name;
  li.append(name);

  const fav = document.createElement("button");
  fav.textContent = "❤";
  let isFav = rest.is_favorite ? JSON.parse(rest.is_favorite) : false;
  const locFavs = localStorage.getItem("loc_rest_fav");
  if(locFavs) {
    isFav = JSON.parse(locFavs)[rest.id] || isFav;
  }
  fav.className = "is-fav" + (isFav ? " yes" : "");
  fav.dataset.id = rest.id;
  fav.onclick = toggleFav;
  fav.setAttribute(
    "aria-label",
    `click to ${isFav ? "remove" : "add"} ${rest.name} to favorite`
  );
  name.append(fav);

  const neighborhoodHTML = document.createElement("p");
  neighborhoodHTML.innerHTML = rest.neighborhood;
  li.append(neighborhoodHTML);

  const address = document.createElement("p");
  address.innerHTML = rest.address;
  li.append(address);

  const more = document.createElement("a");
  more.innerHTML = "View Details";
  more.href = DBHelper.urlForRestaurant(rest);
  more.setAttribute("aria-label", `Click to open ${rest.name}'s details page`);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (rests = restaurants) => {
  rests.forEach(rest => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(rest, newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    markers.push(marker);
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

