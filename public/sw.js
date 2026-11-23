/* Random Quizz — fonctionnement hors connexion et mises à jour automatiques.
   Pages : réseau d'abord (toujours la dernière version), cache si hors ligne.
   Fichiers du site : cache immédiat, rafraîchi en arrière-plan. */
const CACHE = "random-quizz-v2";
const CORE = ["./", "./join/", "./manifest.webmanifest", "./icons/icon-192.png"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(() => {}));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request, { ignoreSearch: true })) || (await caches.match(url.pathname.includes("/join") ? "./join/" : "./"))));
    return;
  }
  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    })));
    return;
  }
  event.respondWith(caches.match(request).then(hit => {
    const network = fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(() => hit);
    return hit || network;
  }));
});
