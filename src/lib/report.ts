import { create } from 'zustand'
import { candidateById, themeById } from '../data'
import type { Measure } from '../data/schema'
import { fullName } from './format'

export const REPO_URL = 'https://github.com/coucou123212321232123/presidentielle-2027-comparateur'

/** Candidat d'une mesure, d'après le préfixe de son identifiant (« dupont-aignan-energie-03 »). */
export function candidateOfMeasure(m: Measure) {
  const id = Object.keys(candidateById)
    .filter((c) => m.id.startsWith(`${c}-`))
    .sort((a, b) => b.length - a.length)[0]
  return id ? candidateById[id] : undefined
}

/**
 * Lien vers le formulaire « Signaler une erreur » du dépôt GitHub (.github/ISSUE_TEMPLATE/signalement.yml),
 * pré-rempli avec la mesure, le candidat et la source. Chaque signalement est traité par la routine hebdomadaire.
 */
export function reportUrl(m?: Measure) {
  const p = new URLSearchParams({ template: 'signalement.yml' })
  if (m) {
    const c = candidateOfMeasure(m)
    p.set('title', `Signalement : ${m.title}`.slice(0, 120))
    p.set('candidat', c ? `${fullName(c)} (${c.id})` : '')
    p.set('mesure', `${m.id} · ${themeById[m.theme]?.label ?? m.theme}\n${m.title}\n${m.description}`)
    p.set('source', `${m.source_title}\n${m.source_url}${m.source_page ? ` (${m.source_page})` : ''}`)
  } else {
    p.set('title', 'Signalement : ')
  }
  return `${REPO_URL}/issues/new?${p.toString()}`
}

interface ReportState {
  open: boolean
  /** Mesure concernée, ou null pour un signalement général. */
  measure: Measure | null
}

/** Formulaire « Signaler une erreur » (components/ReportDialog.tsx), ouvert depuis une mesure ou depuis le pied de page. */
export const useReport = create<ReportState>(() => ({ open: false, measure: null }))
export const openReport = (measure?: Measure) => useReport.setState({ open: true, measure: measure ?? null })
export const closeReport = () => useReport.setState({ open: false })
