// Service worker : permet d'installer l'application et de l'utiliser hors ligne.
// - Pages : réseau d'abord (nouvelle version dès qu'elle est publiée), sinon copie locale.
// - Fichiers versionnés (assets/*) : copie locale d'abord (leur nom change à chaque version).
// - Données en ligne et photos : réseau d'abord, copie locale en secours.
const CACHE = 'presidentielle-2027-v1'
const SCOPE = new URL(self.registration.scope).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([SCOPE, `${SCOPE}manifest.webmanifest`])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    // Les photos d'un autre domaine arrivent « opaques » (statut 0) : elles restent conservables.
    if (response.ok || response.type === 'opaque') cache.put(fallbackUrl ?? request, response.clone())
    return response
  } catch {
    return (await cache.match(fallbackUrl ?? request)) ?? Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Navigation dans l'application : toujours la même page (routage côté client).
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, SCOPE))
    return
  }
  if (url.origin === self.location.origin && url.pathname.startsWith(`${SCOPE}assets/`)) {
    event.respondWith(cacheFirst(request))
    return
  }
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'upload.wikimedia.org' || url.origin === self.location.origin) {
    // Les paramètres anti-cache (?t=…) sont ignorés pour la copie locale.
    event.respondWith(networkFirst(request, `${url.origin}${url.pathname}`))
  }
})
