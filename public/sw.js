/**
 * StackCrate Service Worker — KILL SWITCH
 *
 * The previous version of this worker used cache-first strategies that served
 * stale pages/API responses during development and kept requesting non-existent
 * PWA icons from an old cached manifest.
 *
 * This version exists only to self-destruct: when the browser picks up this
 * file as an "update", it unregisters itself and wipes all caches.
 * Do NOT re-register a service worker without fixing the caching strategy.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Wipe every cache this origin created
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // Unregister this worker
      await self.registration.unregister();
      // Tell open tabs to reload once so they get fresh, un-cached content
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
