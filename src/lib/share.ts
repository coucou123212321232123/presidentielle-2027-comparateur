import { candidates } from '../data'
import type { ThemeId } from '../data/schema'

/**
 * Lien de partage d'une comparaison. Les pages /partage/… sont générées au build (scripts/share-pages.ts) avec
 * un aperçu (titre, description, vignette) lisible par les messageries ; elles redirigent ensuite vers le comparateur.
 * Deux candidats : page dédiée à la paire ; sinon page du thème, la sélection passant par ?c=.
 */
export function shareUrl(theme: ThemeId, ids: string[]) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  const ordered = candidates.map((c) => c.id).filter((id) => ids.includes(id))
  if (ordered.length === 2) return `${base}partage/${theme}/${ordered[0]}/${ordered[1]}/`
  return `${base}partage/${theme}/${ordered.length ? `?c=${ordered.join(',')}` : ''}`
}
