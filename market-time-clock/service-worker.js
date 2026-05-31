'use strict';

const CACHE_NAME = 'market-time-clock-v1';

/** オフライン用にキャッシュする静的ファイル */
const STATIC_ASSETS = [
	'./',
	'./index.html',
	'./style.css',
	'./app.js',
	'./manifest.json',
];

/** インストール時に静的アセットをキャッシュ */
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
	);
	self.skipWaiting();
});

/** 古いキャッシュを削除 */
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			)
		)
	);
	self.clients.claim();
});

/** ネットワーク優先、失敗時はキャッシュから返す */
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const request_url = new URL(event.request.url);

	// 同一オリジンのリクエストのみ処理
	if (request_url.origin !== self.location.origin) {
		return;
	}

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok) {
					const response_clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, response_clone);
					});
				}
				return response;
			})
			.catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
	);
});
