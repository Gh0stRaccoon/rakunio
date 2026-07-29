const CACHE_NAME_SHELL = 'rakunio-shell-v2';
const CACHE_NAME_MEDIA = 'rakunio-media-v1';

const PRECACHE_SHELL = [
  './',
  './manifest.webmanifest',
  './rakunio_logo.jpeg',
  './rakunio_logo.webp',
  './favicon.svg',
  './favicon.ico'
];

// Service Worker Install Phase
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME_SHELL).then((cache) => {
      return cache.addAll(PRECACHE_SHELL).catch((err) => {
        console.warn('[SW] Precache partial error (ignoring non-critical):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate Phase
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME_SHELL && cacheName !== CACHE_NAME_MEDIA) {
            console.log('[SW] Deleting legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper for Range requests on Audio files (HTTP 206 Partial Content support)
async function handleAudioFetch(request) {
  const cache = await caches.open(CACHE_NAME_MEDIA);
  const cleanUrl = request.url.split('?')[0];

  // Try finding cached response first (ignoring search params)
  let response = await cache.match(cleanUrl);

  if (!response) {
    try {
      response = await fetch(request);
      if (response && (response.status === 200 || response.status === 206)) {
        // Store full 200 response in cache if full stream was fetched
        if (response.status === 200) {
          cache.put(cleanUrl, response.clone());
        }
      }
    } catch (err) {
      console.warn('[SW] Audio network fetch failed (offline):', cleanUrl);
    }
  }

  if (!response) {
    return new Response('Audio unavailable offline', { status: 503, statusText: 'Service Unavailable' });
  }

  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) {
    return response;
  }

  // Parse Range header e.g. "bytes=0-" or "bytes=0-1024"
  try {
    const blob = await response.blob();
    const totalSize = blob.size;
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);

    if (!match) {
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Length': `${totalSize}`
        }
      });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
    const chunkSize = (end - start) + 1;
    const slicedBlob = blob.slice(start, end + 1);

    return new Response(slicedBlob, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': `${chunkSize}`,
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg'
      }
    });
  } catch (err) {
    return response;
  }
}

// Fetch event listener
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Is audio file or range request?
  const isAudio = request.destination === 'audio' || 
                  url.pathname.endsWith('.mp3') || 
                  request.headers.has('range');

  if (isAudio) {
    event.respondWith(handleAudioFetch(request));
    return;
  }

  // Navigation / HTML page requests (Stale-While-Revalidate with App Shell fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME_SHELL).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const shellIndex = await caches.match('./');
          return shellIndex || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Images, LRC lyrics, WebP, Webmanifest)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            const targetCache = (url.pathname.includes('/music/') || url.pathname.endsWith('.lrc')) 
              ? CACHE_NAME_MEDIA 
              : CACHE_NAME_SHELL;
            caches.open(targetCache).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
