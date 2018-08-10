/**
 * Register Service Worker
 * */
if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(reg => {
      _msg.success();
      if (!navigator.serviceWorker.controller) {
        return;
      }
      if (reg.waiting) {
        navigator.serviceWorker.controller.postMessage({
          action: "skipWaiting"
        });
        return;
      }
      if (reg.installing) {
        navigator.serviceWorker.addEventListener("statechange", () => {
          if (navigator.serviceWorker.controller.state == "installed") {
            navigator.serviceWorker.controller.postMessage({
              action: "skipWaiting"
            });
          }
        });
      }
      reg.addEventListener("updatefound", function() {
        navigator.serviceWorker.addEventListener("statechange", () => {
          if (navigator.serviceWorker.controller.state == "installed") {
            navigator.serviceWorker.controller.postMessage({
              action: "skipWaiting"
            });
          }
        });
      });
    })
    .catch(err => {
      _msg.err(err);
    });
} else {
  _msg.err();
}

// Ensure refresh is only called once
let refreshing;
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (refreshing) {
    return;
  }
  window.location.reload();
  refreshing = true;
});
