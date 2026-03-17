const CACHE_NAME = "iykmavian-v1";
const assetsToCache = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/scripts/app.js",
  "/scripts/api.js",
  "/images/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assetsToCache)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request)),
  );
});
