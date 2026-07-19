importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  workbox.setConfig({ debug: false });

  // Precache core assets
  workbox.precaching.precacheAndRoute([
    { url: 'index.html', revision: '1.0.0' },
    { url: 'manifest.json', revision: '1.0.0' },
    { url: 'assets/css/styles.css', revision: '1.0.0' },
    { url: 'assets/js/core/app.js', revision: '1.0.0' },
    { url: 'assets/js/core/config.js', revision: '1.0.0' },
    { url: 'assets/js/core/utils.js', revision: '1.0.0' },
    { url: 'assets/js/services/camera.service.js', revision: '1.0.0' },
    { url: 'assets/js/services/detection.service.js', revision: '1.0.0' },
    { url: 'assets/js/services/facts.service.js', revision: '1.0.0' },
    { url: 'assets/js/ui/ui.handler.js', revision: '1.0.0' },
    { url: 'assets/icons/icon-192x192.png', revision: '1.0.0' },
    { url: 'assets/icons/icon-512x512.png', revision: '1.0.0' },
    { url: 'assets/icons/favicon.ico', revision: '1.0.0' },
    { url: 'model/model.json', revision: '1.0.0' },
    { url: 'model/metadata.json', revision: '1.0.0' },
    { url: 'model/weights.bin', revision: '1.0.0' }
  ]);

  // Cache model files
  workbox.routing.registerRoute(
    ({ url }) => url.origin === self.location.origin && url.pathname.includes('/model/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'models-cache'
    })
  );

  // Cache external libraries and fonts
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://cdn.jsdelivr.net' || url.origin === 'https://unpkg.com' || url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'external-resources'
    })
  );
} else {
  console.log('Workbox failed to load');
}
