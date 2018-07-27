let restaurant;
var newMap;

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
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
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
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  const p = document.createElement("picture");
  document.querySelector(".img-container").appendChild(p);
  p.innerHTML = `<source media="(max-width: 400px)" srcset="${resImgUrl(restaurant.photograph, "sm")}" />`;
  p.innerHTML += `<source media="(min-width: 401px)" srcset="${resImgUrl(restaurant.photograph, "md")}" />`;

  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant).replace(/\.jpg/, "-400_sm.jpg");
  image.alt = `Image of ${restaurant.name} Restaurant`;
  image.onmousemove = imgHov;
  p.appendChild(image);
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('th');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * rating
 * @param r
 */
star = r => ['☆', '☆', '☆', '☆', '☆'].fill('★', 0, r).join('');
/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('tabindex', 0);
  li.setAttribute('aria-label', 'Review');
  const name = document.createElement('p');
  name.setAttribute("aria-label", "Review by");
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  date.setAttribute("aria-label", "Review post date");
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: <span>${star(review.rating)}</span>`;
  rating.setAttribute("aria-label", `Review rating - ${review.rating}`);
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.setAttribute("aria-label", "Review text");
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.querySelector('#breadcrumb ol');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current", "page");
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
