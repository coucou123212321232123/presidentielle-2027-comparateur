import type { Candidate, Changelog, DataBundle, LinkStatus, Measure, Meta, Theme, ThemeId } from './schema'
import candidatesRaw from './candidates.json'
import themesRaw from './themes.json'
import metaRaw from './meta.json'
import linkStatusRaw from './link-status.json'
import changelogRaw from './changelog.json'
import { readCachedBundle } from './remote'

// Données intégrées à l'application (validées par Zod au build : scripts/validate-data.ts).
const measureModules = import.meta.glob<Measure[]>('./measures/*.json', { eager: true, import: 'default' })

const embedded: DataBundle = {
  version: 1,
  generated_at: '',
  meta: metaRaw as Meta,
  themes: themesRaw as Theme[],
  candidates: candidatesRaw as Candidate[],
  measures: Object.fromEntries(Object.entries(measureModules).map(([path, list]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), list])),
  link_status: linkStatusRaw as LinkStatus,
  changelog: changelogRaw as Changelog,
}

// Une version plus récente téléchargée lors d'un précédent lancement (déjà validée) prend le pas sur les données intégrées.
const cached = readCachedBundle()
const bundle = cached && cached.meta.last_updated >= embedded.meta.last_updated ? cached : embedded

export const dataSource: 'integrees' | 'en_ligne' = bundle === embedded ? 'integrees' : 'en_ligne'
export const generatedAt = bundle.generated_at
export const meta = bundle.meta
export const themes = bundle.themes
export const linkStatus = bundle.link_status
export const changelog = bundle.changelog

export const candidates: Candidate[] = bundle.candidates.slice().sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'))

export const measuresByCandidate: Record<string, Measure[]> = Object.fromEntries(
  candidates.map((c) => [c.id, bundle.measures[c.id] ?? []]),
)

export const themeById = Object.fromEntries(themes.map((t) => [t.id, t])) as Record<ThemeId, Theme>
export const candidateById: Record<string, Candidate> = Object.fromEntries(candidates.map((c) => [c.id, c]))

export function measuresFor(candidateId: string, themeId?: ThemeId): Measure[] {
  const all = measuresByCandidate[candidateId] ?? []
  return themeId ? all.filter((m) => m.theme === themeId) : all
}

export const totalMeasures = Object.values(measuresByCandidate).reduce((n, list) => n + list.length, 0)
