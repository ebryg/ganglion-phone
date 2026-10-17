/* Keeps the page installable and quick to open. Messages to ntfy always go to the network. */
const V = "ganglion-phone-v20";
const base = new URL("./", self.location).href;
self.addEventListener("install", (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(["", "phone.js", "phone.css", "icon-192.png"].map((p) => base + p))).then(() => self.skipWaiting())));
// Only this page's own older caches ("ganglion-phone-v<n>"): other pages and applications share the address.
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^ganglion-phone-v\d+$/.test(k) && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(base)) return;
  // Only the page's own answers are kept: behind a login, an expired session answers with the login page
  // (a redirect), which must not take the place of the page offline.
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && r.type === "basic" && !r.redirected) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); } return r; }).catch(() => caches.open(V).then((x) => x.match(e.request))));
});
