import { linkStatus } from '../data'

export type LinkState = 'ok' | 'unchecked' | 'archive' | 'unavailable'

export interface ResolvedLink {
  href: string | null
  state: LinkState
}

/**
 * Résout l'URL à afficher à partir du rapport `npm run check-links` :
 * lien cassé → copie archivée (explicite ou trouvée sur la Wayback Machine) → sinon « Lien indisponible ».
 */
export function resolveLink(url: string | null | undefined, archiveUrl?: string | null): ResolvedLink {
  if (!url) return { href: archiveUrl ?? null, state: archiveUrl ? 'archive' : 'unavailable' }
  const status = linkStatus[url.split('#')[0]]
  if (!status) return { href: url, state: 'unchecked' }
  if (status.ok) return { href: url, state: 'ok' }
  const fallback = archiveUrl ?? status.archive
  return fallback ? { href: fallback, state: 'archive' } : { href: null, state: 'unavailable' }
}

export const isPdf = (url: string) => /\.pdf($|[#?])/i.test(url)
