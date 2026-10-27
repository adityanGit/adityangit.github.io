/* Expense Tracker – offline app shell. Bump VERSION when you upload new files. */
const VERSION = 'et-v7';
const SHELL = ['./', './index.html', './manifest.webmanifest', './config.js', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Same-origin GET only (your Google Sheet calls are never cached). Serve from cache instantly, refresh in background.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const key = e.request.mode === 'navigate' ? './index.html' : e.request;
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
