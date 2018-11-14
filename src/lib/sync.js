class Sync {
  static action_fav(url) {
    return fetch(url, { method: "PUT" }).then(res => {
      if (res.ok) {
        return res.json().then(data => ({ data, err: false }));
      }
      return { err: res.status, data: false };
    });
  }

  static action_rev(url, json) {
    console.log("pre", JSON.stringify(json));
    // json.restaurant_id = Number(json.restaurant_id);
    console.log("post", JSON.stringify(json));
    return fetch(url, {
      method: "POST",
      body: JSON.stringify(json)
    }).then(res => {
      if (res.ok) {
        return res.json().then(rev => ({ data: rev, err: false }));
      }
      return { err: res.status, data: false };
    });
  }
  static async rev() {
    const items = await store.getAll("offline-reviews");
    if (items.length === 0) {
      console.log("Sync: Reviews - User have no offline reviews");
      return;
    }
    const log = { rm: [], errs: [] };
    for (const { url, _$id, json } of items) {
      const { data, err } = await Sync.action_rev(url, json);
      if (data) {
        log.rm.push(_$id);
        store.add("reviews", data);
      } else {
        log.errs.push([err, _$id]);
      }
    }
    if (log.rm.length > 0) {
      store.del("offline-reviews", log.rm).then(() => {
        Toast.show("Sync: offline reviews sync complete");
      });
    }
    if (log.errs.length > 0) {
      errs.forEach(err => console.log(...err));
      console.log("Sync: check ended!");
    }
  }
  static async fav() {
    let locFavs = localStorage.getItem("loc_rest_fav");
    if (!locFavs) {
      console.log("Sync: fav - User have not offline fav action for sync");
      return;
    }
    locFavs = JSON.parse(locFavs);
    const log = { rm: [], errs: [] };
    for (const [id, bool] of Object.entries(locFavs)) {
      const { data, err } = await Sync.action_fav(
        `${db_url}/restaurants/${id}/?is_favorite=${bool}`
      );
      if (data) {
        log.rm.push(id);
        store.add("restaurants", data);
      } else {
        log.errs.push([err, id]);
      }
      if (log.rm.length > 0) {
        log.rm.forEach(a => {
          delete locFavs[a];
        });
        if (log.errs.length > 0) {
          log.errs.forEach(err => console.log(...err));
        }
        localStorage.setItem("loc_rest_fav", JSON.stringify(locFavs));
        Toast.show("Sync: offline Fav actions sync complete");
      }
    }
  }

  static do() {
    console.log("Sync: check begain");
    Sync.fav();
    Sync.rev();
  }

  static add(info) {
    if (typeof info !== "object") {
      throw new Error({ info, err: "arg is not typeof object" });
    }
    info._$id = Date.now();
    return store.add("offline-reviews", info);
  }
}