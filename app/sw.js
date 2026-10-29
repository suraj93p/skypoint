/*
 * Offline support. Bump VERSION whenever you add or rename files in APP_SHELL.
 * Strategy: network first (fresh code while online, handy during development),
 * falling back to the cache when offline.
 */
const VERSION = 'v1';
const CACHE = `skypoint-${ VERSION }`;

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/app.css',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './js/main.js',
    './js/config.js',
    './js/math.js',
    './js/store.js',
    './js/astro/index.js',
    './js/astro/time.js',
    './js/astro/sun.js',
    './js/astro/moon.js',
    './js/astro/horizon.js',
    './js/core/guidance.js',
    './js/render/overlay.js',
    './js/sensors/camera.js',
    './js/sensors/location.js',
    './js/sensors/orientation.js',
    './js/ui/hud.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
                }
                return response;
            })
            .catch(async () => (await caches.match(request, { ignoreSearch: true })) ?? caches.match('./index.html')),
    );
});
