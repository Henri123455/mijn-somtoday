// Bewaart de app-bestanden, zodat de app ook zonder internet opent. Somtoday zelf gaat altijd via internet.
const CACHE = 'mijn-somtoday-1.8.0-mw9u69ss';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Snel opstarten: meteen de bewaarde versie, en op de achtergrond de nieuwste ophalen voor de volgende keer.
  const net = fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  });
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || net).catch(() => net));
  e.waitUntil(net.catch(() => {}));
});

// Tik op een melding: de app openen (of naar voren halen) op het juiste tabblad.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list[0];
    if (c) { c.postMessage({ openTab: e.notification.data?.tab }); return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
