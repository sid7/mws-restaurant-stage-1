// worker file
const db_url = `${location.protocol}//${location.hostname}:1337`;

class Actions {
  static fetchData(url) {
    return fetch(url).then(res => res.json());
  }
  static postReview(data) {
    return fetch(`${db_url}/reviews/`, {
      method: "POST",
      body: typeof data === "string" ? data : JSON.stringify(data)
    }).then(res => res.json());
  }
  static fav(id, act) {
    return fetch(`${db_url}/restaurants/${id}/?is_favorite=${act}`, {
      method: "PUT"
    }).then(res => res.json());
  }
}

self.addEventListener("message", function({ data: { type, ...rest } }) {
  if (type === "fetch_data") {
    Actions.fetchData(rest).then(data => {
      self.postMessage({ state: "done", data });
    });
  } else if (type === "post_review") {
    Actions.postReview(rest)
      .then(data => {
        self.postMessage({ state: "done", data });
      })
      .catch(err => {
        self.postMessage({ state: "err", err });
      });
  } else if (type === "fav") {
    Actions.fav(rest)
      .then(data => {
        self.postMessage({ state: "done", data });
      })
      .catch(err => {
        self.postMessage({ state: "err", err });
      });
  }
});
