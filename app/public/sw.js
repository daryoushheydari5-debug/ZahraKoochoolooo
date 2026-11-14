/* Adventure Atlas offline cache: the app itself (network first), and map tiles, photos and fonts as you view them. */
const APP = "aa-app-v1";
const MEDIA = "aa-media-v1";
const MAX_MEDIA = 4000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-192.png"]).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== APP && k !== MEDIA).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const isMedia = (u) => /(^|\.)tile\.openstreetmap\.org$/.test(u.hostname) || u.hostname === "upload.wikimedia.org" || u.hostname === "fonts.gstatic.com" || u.hostname === "fonts.googleapis.com" || (u.hostname === "commons.wikimedia.org" && u.pathname.endsWith("/api.php"));

async function trim() {
  const c = await caches.open(MEDIA);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_MEDIA; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    // App: try the network so updates arrive, fall back to the saved copy offline.
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(APP).then((c) => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html"))));
    return;
  }
  if (isMedia(u)) {
    // Map tiles, photos, fonts: saved copy first, fetched and saved the first time.
    e.respondWith(caches.open(MEDIA).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok || r.type === "opaque") { c.put(req, r.clone()); trim(); }
      return r;
    }))));
  }
});
