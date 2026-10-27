// Stim Lab offline support, shared by the homepage and every app page.
// Pages are fetched fresh when you're online (so updates show up) and served from the cache when you're not.
// When you add an app page, list it in CORE and bump the CACHE number.
// DOOM's engine and shareware WAD (doom/, about 6.5 MB) are left out of CORE so the homepage stays light;
// they're cached the first time you press Play, and bumping CACHE also refreshes them.
const CACHE = 'artifacts-v35';
const CORE = [
  './',
  './index.html',
  './spectrum-bench.html',
  './resonant-ink.html',
  './drift-pad.html',
  './gravity-wells.html',
  './grainfall.html',
  './little-orrery.html',
  './xy-scope.html',
  './earworm.html',
  './beamline.html',
  './mirrorfold.html',
  './doom.html',
  './resonant-ink.webmanifest',
  './resonant-ink-apple-touch-icon.png',
  './resonant-ink-icon-192.png',
  './resonant-ink-icon-512.png',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    // Each page is cached under its own address, so opening one app never replaces another's offline copy.
    // The folder address and index.html are the same page: the homepage.
    const isHome = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    const key = isHome ? './index.html' : req;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.match(key, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  // Grainfall and Little Orrery load a pinned three.js version from jsDelivr; keep it so the room builds offline too.
  const isThree = url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/three@');
  if (!sameOrigin && !isFont && !isThree) return;

  event.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))
    )
  );
});
