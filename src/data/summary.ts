// Sans dépendance à Zod : ce module fait partie du chargement initial de l'application.
import type { IndicatorValue, Measure, ThemeId } from './schema'

/** Indicateurs d'une mesure, toujours sous forme de liste. */
export const indicatorsOf = (m: Measure): IndicatorValue[] => (!m.indicator ? [] : Array.isArray(m.indicator) ? m.indicator : [m.indicator])

/** Nombre de mesures par thème et par date d'ajout, pour un candidat (calculé au build, sans charger les mesures). */
export interface CandidateSummary {
  total: number
  byTheme: Partial<Record<ThemeId, number>>
  /** Nombre de mesures par date d'ajout puis par thème. */
  added: Record<string, Partial<Record<ThemeId, number>>>
}
export type MeasureSummary = Record<string, CandidateSummary>

export function summarize(measures: Record<string, Measure[]>): MeasureSummary {
  return Object.fromEntries(
    Object.entries(measures).map(([id, list]) => {
      const s: CandidateSummary = { total: list.length, byTheme: {}, added: {} }
      for (const m of list) {
        s.byTheme[m.theme] = (s.byTheme[m.theme] ?? 0) + 1
        const day = (s.added[m.added] ??= {})
        day[m.theme] = (day[m.theme] ?? 0) + 1
      }
      return [id, s]
    }),
  )
}
