/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `skillswap-${version}`;
const ASSETS = [...build, ...files.filter((f) => !f.endsWith('.webmanifest')), '/offline'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== location.origin) return;
	// Never cache private pages: inbox, settings, moderation.
	if (/^\/(inbox|me|auth|api)\b/.test(url.pathname) || /\/(mod|settings)$/.test(url.pathname))
		return;
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then((c) => c.match(request).then((r) => r ?? fetch(request)))
		);
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(() =>
				caches.open(CACHE).then((c) => c.match('/offline').then((r) => r ?? Response.error()))
			)
		);
	}
});
