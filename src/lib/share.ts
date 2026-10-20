import { candidates } from '../data'
import type { Measure, ThemeId } from '../data/schema'

/** Adresse publique du site : l'application de bureau (fichier local) partage des liens vers la version web. */
const PUBLIC_SITE = 'https://programmes-2027.fr/'
const siteBase = () => (window.location.protocol === 'file:' ? PUBLIC_SITE : `${window.location.origin}${import.meta.env.BASE_URL}`)

/**
 * Lien de partage d'une comparaison. Les pages /partage/… sont générées au build (scripts/share-pages.ts) avec
 * un aperçu (titre, description, vignette) lisible par les messageries ; elles redirigent ensuite vers le comparateur.
 * Deux candidats : page dédiée à la paire ; sinon page du thème, la sélection passant par ?c=.
 */
export function shareUrl(theme: ThemeId, ids: string[]) {
  const base = siteBase()
  const ordered = candidates.map((c) => c.id).filter((id) => ids.includes(id))
  if (ordered.length === 2) return `${base}partage/${theme}/${ordered[0]}/${ordered[1]}/`
  return `${base}partage/${theme}/${ordered.length ? `?c=${ordered.join(',')}` : ''}`
}

/** Lien direct vers une mesure : fiche du candidat, thème déplié, mesure encadrée (?mesure=…). */
export function measureUrl(measure: Measure) {
  const candidate = candidates.find((c) => measure.id.startsWith(`${c.id}-`))
  return `${siteBase()}candidats/${candidate?.id ?? ''}/?theme=${measure.theme}&mesure=${measure.id}`
}

/** Copie un texte dans le presse-papiers (avec repli pour les contextes où l'API n'est pas disponible). */
export async function copyText(text: string) {
  try {
    // Certaines fenêtres laissent la demande sans réponse : au-delà d'une seconde, on passe à la méthode de repli.
    await Promise.race([navigator.clipboard.writeText(text), new Promise((_, reject) => setTimeout(() => reject(new Error('délai')), 1000))])
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
