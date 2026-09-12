// Minimal service worker — registered by the app. No aggressive caching for now,
// so the dashboard always gets fresh data. Expanded later for offline/PWA install.
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {});