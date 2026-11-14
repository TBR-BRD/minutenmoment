// Einfacher Offline-Cache für die App-Hülle. Wetterdaten werden immer live geladen.
const CACHE = "minutenmoment-v3";
const ASSETS = ["./", "index.html", "css/style.css", "js/app.js", "data/facts.json", "data/facts.js", "icon.svg", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Wetter-API nicht cachen
  if (url.pathname.endsWith("/news.json")) return; // Schlagzeilen immer frisch
  // Netz zuerst (damit Updates ankommen), Cache als Fallback
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
