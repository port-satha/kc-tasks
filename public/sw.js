const CACHE_NAME = 'kc-tasks-v2'

// Install - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate - clean ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch strategy:
// - Static assets (/_next/static/): cache-first (filenames are hashed, safe to cache)
// - HTML/navigation: network-only (always get fresh content)
// - Everything else: network-only
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Never intercept API, auth, or Supabase calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return
  if (url.hostname.includes('supabase')) return

  // Static assets with hashed filenames - cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // HTML / navigation requests - always go to network, cache for offline fallback only
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') || new Response('Offline', { status: 503 })
      })
    )
    return
  }

  // Everything else - network only
})
