importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  workbox.setConfig({ debug: false });

  // Skip waiting and claim clients
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Precache assets
  workbox.precaching.precacheAndRoute([
    { url: '/manifest.json', revision: '1' },
    { url: '/offline.html', revision: '1' },
    // Add other critical assets here
  ]);

  // Background sync for outbox mutations
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkOnly({
      plugins: [
        new workbox.backgroundSync.BackgroundSyncPlugin('outbox-queue', {
          maxRetentionTime: 24 * 60, // Retry for up to 24 hours
          onSync: async ({ queue }) => {
            console.log('Background sync triggered for outbox queue');
            // Notify the app that sync is happening
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({ type: 'SYNC_START' });
            });
          }
        })
      ]
    }),
    'POST'
  );

  // Cache API responses for offline reading
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/') && url.searchParams.get('cache') === 'true',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  );

  // Offline fallback for navigation
  workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkOnly({
      plugins: [
        {
          handlerDidError: async ({ request }) => {
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            return Response.error();
          }
        }
      ]
    })
  );

  // Handle messages from the main thread
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }

    if (event.data && event.data.type === 'SYNC_OUTBOX') {
      // Trigger background sync
      workbox.backgroundSync.BackgroundSyncPlugin.getQueue('outbox-queue').replayRequests();
    }
  });

  // Handle push notifications (optional)
  self.addEventListener('push', (event) => {
    if (event.data) {
      const data = event.data.json()
      const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: data.url
      }

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      )
    }
  })

  // Handle background sync
  self.addEventListener('sync', (event) => {
    if (event.tag === 'outbox-sync') {
      event.waitUntil(processOutboxSync())
    }
  })

  // Process outbox during background sync
  async function processOutboxSync() {
    try {
      // Import the outbox processing logic
      // Since we can't directly import modules in SW, we'll use fetch to trigger processing
      const response = await fetch('/api/offline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        console.log('Background sync completed successfully')
      } else {
        console.error('Background sync failed:', response.statusText)
      }
    } catch (error) {
      console.error('Background sync error:', error)
    }
  }

  // Handle notification clicks
  self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    )
  })
} else {
  console.log('Workbox could not be loaded. No offline functionality available.');
}