/* ============================================================
   🚀 Sales Tracker PWA Service Worker v4
   Provides offline caching, SPA routing, and fallback page
============================================================ */

const CACHE_NAME = "sales-tracker-cache-v4";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
];

// Install: Cache core files
self.addEventListener("install", (event) => {
  console.log("📦 Installing Service Worker v4...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Remove old cache versions
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker v4 activated");
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

// Fetch: Handle all requests with SPA-friendly routing
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API calls - let them go to network
  if (url.pathname.startsWith("/api/") || 
      url.pathname.startsWith("/uploads/") ||
      url.hostname.includes("onrender.com") ||
      url.hostname.includes("render.com")) {
    return;
  }

  // 🔄 SPA Navigation: For ALL navigation requests, serve index.html
  // This is the key fix for "not found" on page refresh/scroll
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html")
        .then((cached) => {
          if (cached) {
            // Also try to update cache in background
            fetch(event.request).then((response) => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put("/index.html", response);
                });
              }
            }).catch(() => {});
            return cached;
          }
          // No cache, try network
          return fetch(event.request).catch(() => {
            return caches.match("/offline.html");
          });
        })
    );
    return;
  }

  // For static assets, use cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          
          // Cache JS, CSS, and image files
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("javascript") || 
              contentType.includes("text/css") ||
              contentType.includes("image/")) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          // If navigation fails, serve index.html
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
