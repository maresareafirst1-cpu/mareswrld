/* Service worker : l'application s'ouvre sans réseau ; photos, tuiles de carte
   et articles déjà consultés restent disponibles hors connexion. */
const SHELL = 'bi2-shell-v6', RUNTIME = 'bi2-runtime-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'i18n.js', 'geo.js', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/GLTFLoader.js', 'scene3d.js', 'textes.js', 'audio/index.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(SHELL).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bi2-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('index.html'))); return; }
  if (url.origin === location.origin) { e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(SHELL).then(x => x.put(req, c)); return r; }).catch(() => caches.match(req))); return; }
  // photos Wikimedia, tuiles de carte, polices, réponses Wikipédia : cache puis réseau
  if (/(upload\.wikimedia\.org|basemaps\.cartocdn\.com|server\.arcgisonline\.com|fonts\.(googleapis|gstatic)\.com|wikipedia\.org|wikimedia\.org)$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
