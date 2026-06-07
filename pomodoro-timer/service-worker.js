'use strict';

const CACHE_NAME = 'focus-loop-v16';
const STATIC_ASSETS = [
	'./',
	'./index.html',
	'./style.css',
	'./app.js',
	'./manifest.json',
	'./icon.svg',
];

/** 初回利用に必要なファイルをキャッシュする */
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
	);
	self.skipWaiting();
});

/** 新版で不要になったキャッシュを削除する */
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

/** ネットワーク失敗時は保存済みファイルを返す */
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const request_url = new URL(event.request.url);
	if (request_url.origin !== self.location.origin) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cached_response) => {
			const network_response = fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const response_clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response_clone));
					}
					return response;
				})
				.catch(() => cached_response || caches.match('./index.html'));

			return cached_response || network_response;
		})
	);
});
