import { useEffect } from 'react'
import { create } from 'zustand'
import { summarize, type MeasureSummary } from './summary'
import type { Candidate, Changelog, GlossaryEntry, VotesFile, LinkStatus, Measure, Meta, Theme, ThemeId } from './schema'
import candidatesRaw from './candidates.json'
import themesRaw from './themes.json'
import metaRaw from './meta.json'
import linkStatusRaw from './link-status.json'
import changelogRaw from './changelog.json'
import glossaryRaw from './glossary.json'
import votesRaw from './votes.json'
import bundleInfo from './bundle-info.json'
import embeddedSummary from 'virtual:measure-summary'
import { isDesktop, readCachedBundle } from './remote'

// Données intégrées à l'application (validées par Zod au build : scripts/validate-data.ts).
// Les mesures (~1 Mo) ne sont pas dans le bundle principal : un fichier par candidat, chargé à la demande.
const measureLoaders = Object.fromEntries(
  Object.entries(import.meta.glob<Measure[]>('./measures/*.json', { import: 'default' })).map(([path, load]) => [
    path.replace(/^.*\/(.+)\.json$/, '$1'),
    load,
  ]),
)

// Application de bureau : une version plus récente téléchargée lors d'un précédent lancement (déjà validée)
// prend le pas sur les données intégrées. La version web est republiée à chaque mise à jour : elle n'en a pas besoin.
const cachedBundle = isDesktop ? readCachedBundle() : null
const cached = cachedBundle && cachedBundle.meta.last_updated >= (metaRaw as Meta).last_updated ? cachedBundle : null

export const dataSource: 'integrees' | 'en_ligne' = cached ? 'en_ligne' : 'integrees'
export const generatedAt = cached?.generated_at ?? bundleInfo.generated_at
export const meta: Meta = cached?.meta ?? (metaRaw as Meta)
export const themes: Theme[] = cached?.themes ?? (themesRaw as Theme[])
export const linkStatus: LinkStatus = cached?.link_status ?? (linkStatusRaw as LinkStatus)
export const changelog: Changelog = cached?.changelog ?? (changelogRaw as Changelog)
export const glossary: GlossaryEntry[] = cached?.glossary ?? (glossaryRaw as GlossaryEntry[])
export const votes: VotesFile = cached?.votes ?? (votesRaw as VotesFile)

export const candidates: Candidate[] = (cached?.candidates ?? (candidatesRaw as Candidate[]))
  .slice()
  .sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'))

export const themeById = Object.fromEntries(themes.map((t) => [t.id, t])) as Record<ThemeId, Theme>
export const candidateById: Record<string, Candidate> = Object.fromEntries(candidates.map((c) => [c.id, c]))

/** Nombre de mesures par candidat et par thème, disponible immédiatement. */
export const summary: MeasureSummary = cached ? summarize(cached.measures) : embeddedSummary

export const countFor = (candidateId: string, themeId?: ThemeId) =>
  (themeId ? summary[candidateId]?.byTheme[themeId] : summary[candidateId]?.total) ?? 0

export const totalMeasures = candidates.reduce((n, c) => n + countFor(c.id), 0)

export const byTheme = (list: Measure[], themeId: ThemeId) => list.filter((m) => m.theme === themeId)

interface MeasureStore {
  loaded: Record<string, Measure[]>
  failed: boolean
}

const useMeasureStore = create<MeasureStore>(() => ({
  loaded: cached ? Object.fromEntries(candidates.map((c) => [c.id, cached.measures[c.id] ?? []])) : {},
  failed: false,
}))

const pending = new Map<string, Promise<void>>()

function load(id: string): Promise<void> {
  if (useMeasureStore.getState().loaded[id]) return Promise.resolve()
  let p = pending.get(id)
  if (!p) {
    p = (measureLoaders[id]?.() ?? Promise.resolve([]))
      .then((list) => useMeasureStore.setState((s) => ({ loaded: { ...s.loaded, [id]: list } })))
      .catch(() => {
        // Fichier introuvable (version mise à jour pendant la visite, hors ligne) : on autorise un nouvel essai.
        pending.delete(id)
        useMeasureStore.setState({ failed: true })
      })
    pending.set(id, p)
  }
  return p
}

export const allCandidateIds = candidates.map((c) => c.id)

/**
 * Mesures des candidats demandés, chargées à la demande et gardées en mémoire.
 * Renvoie `null` tant qu'une partie est en cours de chargement.
 */
export function useMeasures(ids: string[]): Record<string, Measure[]> | null {
  const loaded = useMeasureStore((s) => s.loaded)
  const key = ids.join(',')
  useEffect(() => {
    for (const id of key.split(',')) if (id) load(id)
  }, [key])
  return ids.every((id) => loaded[id]) ? Object.fromEntries(ids.map((id) => [id, loaded[id]])) : null
}

/** Vrai si un fichier de mesures n'a pas pu être chargé (le plus souvent : nouvelle version publiée pendant la visite). */
export const useMeasuresFailed = () => useMeasureStore((s) => s.failed)

/** Précharge les mesures en tâche de fond (ex. après l'affichage de l'accueil). */
export function prefetchMeasures(ids: string[]) {
  for (const id of ids) load(id)
}
