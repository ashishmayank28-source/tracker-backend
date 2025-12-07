/* ============================================================
   🚀 Sales Tracker PWA Service Worker
   Provides offline caching, app shell support, and fallback page
============================================================ */

const CACHE_NAME = "sales-tracker-cache-v3";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: Cache core files
self.addEventListener("install", (event) => {
  console.log("📦 Installing Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Remove old cache versions
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activated");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("🗑️ Removing old cache:", name);
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Serve cached content or fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API calls - don't cache them
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || 
      url.hostname.includes("onrender.com") ||
      url.hostname.includes("localhost") ||
      url.hostname === "127.0.0.1") {
    return; // Let browser handle API requests normally
  }

  // 🔄 SPA Navigation: For HTML document requests, always serve index.html
  // This fixes the "not found" issue on page refresh in mobile
  if (event.request.mode === "navigate" || 
      event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we got a valid response, cache and return it
          if (response && response.status === 200) {
            return response;
          }
          // If 404 or error, serve cached index.html for SPA routing
          return caches.match("/index.html") || caches.match("/");
        })
        .catch(() => {
          // 📴 Offline: serve cached index.html or offline page
          return caches.match("/index.html") || 
                 caches.match("/") || 
                 caches.match("/offline.html");
        })
    );
    return;
  }

  // For other assets (JS, CSS, images), use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => {
          // 📴 Offline fallback for other documents
          if (event.request.destination === "document") {
            return caches.match("/offline.html");
          }
        });
    })
  );
});
