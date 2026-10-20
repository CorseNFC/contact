const VERSION = "kt-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const IMAGES = `${VERSION}-images`;
const SHELL = "/__app-shell";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

async function networkFirst(request, cacheName, { timeout = 5000, extraKey } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const res = await withTimeout(fetch(request), timeout);
    if (res && (res.ok || res.type === "opaque")) {
      cache.put(request, res.clone());
      if (extraKey) cache.put(extraKey, res.clone());
    }
    return res;
  } catch (e) {
    const cached = (await cache.match(request, { ignoreVary: true })) || (extraKey && (await cache.match(extraKey)));
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith("http")) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, PAGES, { timeout: 4000, extraKey: SHELL }));
    return;
  }
  if (/\/api\/profile\/[^/]+$/.test(url.pathname)) {
    event.respondWith(networkFirst(req, PAGES, { timeout: 4000 }));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname.includes("hot-update") || url.pathname.startsWith("/ws")) return;

  if (req.destination === "image") {
    event.respondWith(cacheFirst(req, IMAGES));
    return;
  }
  if (["script", "style", "font", "manifest"].includes(req.destination)) {
    event.respondWith(networkFirst(req, ASSETS, { timeout: 5000 }));
  }
});
