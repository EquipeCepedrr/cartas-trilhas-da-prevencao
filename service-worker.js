'use strict';

var CACHE_NAME = 'trilhas-prevencao-v1.3.1';
var APP_SHELL = [
  './',
  './index.html',
  './PERGUNTAS_OFFLINE.html',
  './modulos/perguntas-offline/index.html',
  './manifest.json',
  './css/style.css',
  './js/polyfills.js',
  './js/questions.js',
  './js/game.js',
  './js/accessibility.js',
  './js/app.js',
  './data/questions.json',
  './data/cards.json',
  './assets/images/board.jpg',
  './assets/images/logo-projeto.png',
  './assets/images/setrabes.png',
  './assets/images/governo-roraima.png',
  './assets/images/partners-strip.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/audio/correct.wav',
  './assets/audio/wrong.wav',
  './assets/audio/dice.wav',
  './assets/audio/roulette.wav',
  './assets/audio/move.wav',
  './assets/audio/card.wav',
  './assets/audio/victory.wav'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('Recurso indisponível offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
