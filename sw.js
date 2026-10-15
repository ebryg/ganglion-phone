/* Keeps the page installable and quick to open. Messages to ntfy always go to the network. */
const V = "ganglion-phone-v15";
const base = new URL("./", self.location).href;
self.addEventListener("install", (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(["", "phone.js", "phone.css", "icon-192.png"].map((p) => base + p))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(base)) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
