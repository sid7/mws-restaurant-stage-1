var restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
  initMap();
  // star rating
  for (const el of $$(".star")) {
    el.addEventListener("click", function() {
      if (this.classList.contains("sel")) {
        this.classList.remove("sel");
      } else {
        const sel = $(".star.sel");
        if (sel) {
          sel.classList.remove("sel");
        }
        this.classList.add("sel");
      }
    });
  }

  // clear the review in post form
  $("#post-review .cls").addEventListener("click", () => {
    const star = $(".star");
    $("#user_name").value = "";
    if (star.classList.contains("sel")) {
      star.classList.remove("sel");
    }
    $("#post-review textarea").value = "";
  });
  // esc to cls text
  for (const el of $$("#post-review input, #post-review textarea")) {
    el.addEventListener("keydown", function({ keyCode }) {
      if (keyCode === 27) {
        this.value = "";
      }
    });
  }

  // post the review
  $("#post-review .snd").addEventListener("click", function() {
    const params = {
      restaurant_id: getParameterByName("id"),
      name: $("#user_name").value,
      rating: $(".star.sel")
        ? $(".star.sel").className.split(" ")[1]
        : undefined,
      comments: $("#post-review textarea").value
    };
    for (const [a, b] of Object.entries(params)) {
      if (!b) {
        return Toast.show(`${a} value is empty`);
      }
    }
    const url = `http://${location.hostname}:1337/reviews/`;
    fetch(url, { method: "POST", body: JSON.stringify(params) })
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error(res.status);
      })
      .then(data => {
        store.add("reviews", data).then(() => {
          location.reload();
        });
      })
      .catch(() => {
        Toast.show(
          "Failed to add New Review to Server, We will try again later"
        );
        Sync.add({
          type: "rev",
          method: "POST",
          url,
          json: params
        }).then(() => {
          // location.reload();
        });
      });
  });

  addEventListener("online", Sync.do);

  addEventListener("offline", function () {
    Toast.show("You are offline!");
  });
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, rest) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      window.newMap = L.map("map", {
        center: [rest.latlng.lat, rest.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer(
        "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",
        {
          mapboxToken:
            "pk.eyJ1Ijoic2lkNyIsImEiOiJjamp1OGJvd2QwMzAzM3ByejRnd2x2NXY4In0.fkA6CjOQbzCkLVqJ1Wm4lA",
          maxZoom: 18,
          attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          id: "mapbox.streets"
        }
      ).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(rest, window.newMap);
      restaurant = rest;
    }
  });
};

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      window.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(window.restaurant, window.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = callback => {
  if (window.restaurant) {
    // restaurant already fetched!
    callback(null, window.restaurant);
    return;
  }
  let id = getParameterByName("id");
  if (!id) {
    // no id found in URL
    error = "No restaurant id in URL";
    callback(error, null);
    Toast.show("Invalid URL");
  } else {
    id = Number(id);
    DBHelper.fetchRestaurantWithReview(id, (err, rest) => {
      if (!rest) {
        restaurant = rest;
        console.error(err);
        return;
      }
      if (err) {
        Toast.show("Failed to get Reviews, try again later");
      }
      DBHelper.fetchLocalReviewsById(id).then(lrev => {
        restaurant = rest;
        restaurant.local_reviews = lrev;
        fillRestaurantHTML();
        callback(null, restaurant);
      });
    });
  }
};

/**
 * zoom and move image on hover
 */
imgHov = ({ pageX, pageY, target: el }) => {
  const origin =
    ((pageX - el.offsetLeft) / el.width) * 100 +
    "% " +
    ((pageY - el.offsetTop) / el.height) * 100 +
    "%";
  el.style.cssText = "transform-origin: " + origin;
};

function ImgError() {
  this.classList.add("style-image-alt");
  this.onmousemove = null;
}
function toggleFav() {
  const state = this.classList.contains("yes");
  DBHelper.fav(this.dataset.id, !state);
  this.classList.toggle("yes");
  const [a, b] = state ? ["add", "remove"] : ["remove", "add"];
  this.setAttribute(
    "aria-label",
    this.getAttribute("aria-label").replace(a, b)
  );
}
/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (rest = window.restaurant) => {
  const name = document.getElementById("restaurant-name");
  name.innerHTML = rest.name;
  $("title").textContent += rest.name;
  $("#post-review textarea").setAttribute(
    "placeholder",
    `Write your views about ${rest.name}`
  );
  const fav = document.createElement("button");
  fav.textContent = "❤";
  let isFav = rest.is_favorite ? JSON.parse(rest.is_favorite) : false;
  const locFavs = localStorage.getItem("loc_rest_fav");
  if (locFavs) {
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

  const address = document.getElementById("restaurant-address");
  address.innerHTML = rest.address;
  const image = document.getElementById("restaurant-img");

  image.className = "restaurant-img";
  image.src = DBHelper.imageUrlForRestaurant(rest.photograph);
  image.alt = `Image of ${rest.name} Restaurant`;
  image.onmousemove = imgHov;
  image.onerror = ImgError;

  const cuisine = document.getElementById("restaurant-cuisine");
  cuisine.innerHTML = rest.cuisine_type;

  // fill operating hours
  if (rest.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (
  operatingHours = window.restaurant.operating_hours
) => {
  const hours = document.getElementById("restaurant-hours");
  for (let key in operatingHours) {
    const row = document.createElement("tr");

    const day = document.createElement("th");
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement("td");
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (
  reviews = window.restaurant.reviews,
  local_reviews = window.restaurant.local_reviews
) => {
  const container = document.getElementById("reviews-container");
  const title = document.createElement("h2");
  title.innerHTML = "Reviews";
  container.appendChild(title);

  if (reviews === 404) {
    const rev404 = document.createElement("p");
    rev404.innerHTML = "Failed to Fetch reviews!";
    container.appendChild(rev404);
    if (local_reviews.length !== 0) {
      const ul = document.getElementById("reviews-list");
      local_reviews.forEach(lr => {
        ul.appendChild(createReviewHTML(lr, true));
      });
      container.appendChild(ul);
    }
    return;
  }

  if (!reviews && local_reviews.length === 0) {
    const noReviews = document.createElement("p");
    noReviews.innerHTML = "No reviews yet!";
    container.appendChild(noReviews);
    return;
  }
  if(!reviews || reviews === 404) {
    const noReviews = document.createElement("p");
    noReviews.innerHTML = reviews === 404 ? "Failed to Fetch reviews!" : "No reviews yet!";
    container.appendChild(noReviews);
  }
  const ul = document.getElementById("reviews-list");
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  if (local_reviews.length !== 0) {
    local_reviews.forEach(lr => {
      ul.appendChild(createReviewHTML(lr, true));
    });
  }
  container.appendChild(ul);
};

/**
 * rating
 * @param r
 */
star = r => ["☆", "☆", "☆", "☆", "☆"].fill("★", 0, r).join("");
function format_time(t) {
  const [, m, date, y] = new Date(t).toDateString().split(" ");
  return `${m} ${date}, ${y}`;
}
/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review, isLoc) => {
  const li = document.createElement("li");
  li.setAttribute("tabindex", 0);
  li.setAttribute("aria-label", "Review");
  const name = document.createElement("p");
  name.classList.add("user-name");
  name.setAttribute("aria-label", "Review by");
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement("p");
  date.classList.add("date");
  date.innerHTML = isLoc ? "Offline Review" : format_time(review.createdAt);
  if (review.createdAt - review.updatedAt !== 0) {
    date.title = `edit: ${format_time(review.updatedAt)}`;
  }
  date.setAttribute("aria-label", "Review post date");
  li.appendChild(date);

  const rating = document.createElement("p");
  rating.classList.add("rate");
  rating.innerHTML = `Rating: <span>${star(review.rating)}</span>`;
  rating.setAttribute("aria-label", `Review rating - ${review.rating}`);
  li.appendChild(rating);

  const comments = document.createElement("p");
  comments.classList.add("comments");
  comments.innerHTML = review.comments;
  comments.setAttribute("aria-label", "Review text");
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = window.restaurant) => {
  const breadcrumb = document.querySelector("#breadcrumb ol");
  const li = document.createElement("li");
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current", "page");
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};
