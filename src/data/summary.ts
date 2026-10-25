// Sans dépendance à Zod : ce module fait partie du chargement initial de l'application.
import type { IndicatorValue, Measure, ThemeId } from './schema'

/** Indicateurs d'une mesure, toujours sous forme de liste. */
export const indicatorsOf = (m: Measure): IndicatorValue[] => (!m.indicator ? [] : Array.isArray(m.indicator) ? m.indicator : [m.indicator])

/** Réponse d'un candidat à un point de comparaison, avec la mesure qui l'énonce. */
export interface Stance {
  value: string | number
  measure: string
  theme: ThemeId
  title: string
}

/** Nombre de mesures par thème et par date d'ajout, pour un candidat (calculé au build, sans charger les mesures). */
export interface CandidateSummary {
  total: number
  /** Mesures issues du programme officiel (ou du site de campagne). */
  official: number
  byTheme: Partial<Record<ThemeId, number>>
  /** Nombre de mesures par date d'ajout puis par thème. */
  added: Record<string, Partial<Record<ThemeId, number>>>
  /** Points de comparaison renseignés, par clé d'indicateur. */
  positions: Record<string, Stance>
}
export type MeasureSummary = Record<string, CandidateSummary>

export function summarize(measures: Record<string, Measure[]>): MeasureSummary {
  return Object.fromEntries(
    Object.entries(measures).map(([id, list]) => {
      const s: CandidateSummary = { total: list.length, official: 0, byTheme: {}, added: {}, positions: {} }
      for (const m of list) {
        if (m.source_type === 'officiel') s.official++
        s.byTheme[m.theme] = (s.byTheme[m.theme] ?? 0) + 1
        const day = (s.added[m.added] ??= {})
        day[m.theme] = (day[m.theme] ?? 0) + 1
        for (const ind of indicatorsOf(m)) s.positions[ind.key] ??= { value: ind.value, measure: m.id, theme: m.theme, title: m.title }
      }
      return [id, s]
    }),
  )
}
