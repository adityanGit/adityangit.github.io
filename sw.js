/* Expense Tracker – offline app shell.
 * Online: always fetches the newest files (skips the browser's 10-minute cache) and saves a copy.
 * Offline / very slow: falls back to the saved copy so the app still opens.
 * Bump VERSION whenever you upload new files.
 */
const VERSION = 'et-v10';
const SHELL = ['./', './index.html', './manifest.webmanifest', './config.js', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'reload' }).then(r => r.ok && c.put(u, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // never touch Google Sheet calls
  const key = e.request.mode === 'navigate' ? './index.html' : url.pathname.replace(/^.*\//, './');
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // network first, bypassing the HTTP cache; give up after 4 s and use the saved copy
      const net = fetch(e.request.mode === 'navigate' ? './index.html' : e.request, { cache: 'no-cache' });
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000));
      const r = await Promise.race([net, timeout]);
      if (r && r.ok) cache.put(key, r.clone());
      return r;
    } catch (err) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      return fetch(e.request);
    }
  })());
});
