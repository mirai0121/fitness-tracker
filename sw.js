/* トレーニング記録アプリ — オフライン対応サービスワーカー */
const CACHE = 'tore-tracker-v1';

// アプリ本体（オフラインで必ず必要なもの）を事前キャッシュ
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュ優先 + バックグラウンド更新。オフライン時はキャッシュにフォールバック。
// CDN の Chart.js は初回オンライン表示時に自動でキャッシュされ、以後オフラインでも動作。
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const network = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (cached) return cached;
    const res = await network;
    if (res) return res;

    // 完全オフラインで未キャッシュのページ遷移 → アプリ本体を返す
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return Response.error();
  })());
});
