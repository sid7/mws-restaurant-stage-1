class __store {
  prefy(a) {
    return `${this.__prefex}_${a}`;
  }
  constructor(store_lst, { prefex = "store" } = {}) {
    this.__db = {};
    this.__prefex = prefex;
    for (let { name, ver, keyPath, index } of store_lst) {
      name = this.prefy(name);
      this.__db[name] = idb.open(name, ver, udb => {
        if (!udb.objectStoreNames.contains(name)) {
          const store = udb.createObjectStore(name, { keyPath });
          if (index) {
            if (typeof index === "string") {
              store.createIndex(`by-${index}`, index);
            } else {
              index.forEach(i => {
                store.createIndex(`by-${i}`, i);
              });
            }
          }
        }
      });
    }
  }
  db(name) {
    return this.__db[this.prefy(name)];
  }
  add(name, value) {
    name = this.prefy(name);
    if (!(name in this.__db)) {
      throw new Error(`db "${name}" not found!`);
    }
    return this.__db[name].then(db => {
      const tx = db.transaction(name, "readwrite");
      const store = tx.objectStore(name);
      store.put(value);
      return tx.complete;
    });
  }
  ob(store) {
    store = this.prefy(store);
    return this.__db[store].then(db =>
      db.transaction(store, "readwrite").objectStore(store)
    );
  }
  addAll(db, items) {
    return Promise.all(items.map(item => this.add(db, item)));
  }
  getAllById(store, id) {
    store = this.prefy(store);
    return this.__db[store].then(db =>
      db
        .transaction(store)
        .objectStore(store)
        .getAll(id)
    );
  }
  getAllByIndex(store, index) {
    store = this.prefy(store);
    return this.__db[store].then(db => {
      return db
        .transaction(store)
        .objectStore(store)
        .index(`by-${index}`)
        .getAll();
    });
  }
  getAll(store) {
    store = this.prefy(store);
    if (!(store in this.__db)) {
      throw new Error(`db "${store}" not found!`);
    }
    return this.__db[store].then(db => {
      if (!db) {
        return;
      }
      const tx = db.transaction(store);
      return tx.objectStore(store).getAll();
    });
  }
  del(store, rm) {
    store = this.prefy(store);
    return this.__db[store]
      .then(db =>
        db
          .transaction(store, "readwrite")
          .objectStore(store)
          .openCursor()
      )
      .then(function _del(cursor) {
        if (!cursor) {
          return;
        }
        if (rm.includes(cursor.value._$id)) {
          cursor.delete();
        }
        return cursor.continue().then(_del);
      });
  }
}
const store = new __store([
  { name: "restaurants", keyPath: "id", ver: 1, index: "id" },
  { name: "reviews", keyPath: "id", ver: 1, index: ["id", "restaurant_id"] },
  { name: "offline-reviews", ver: 1, keyPath: "_$id" }
]);
