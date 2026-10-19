/**
 * Assemble toutes les données en un seul paquet `public-data/data-v2.json`, publié en ligne et
 * téléchargé par l'application de bureau au démarrage. Le paquet est validé intégralement avant écriture.
 * `public-data/data.json` reste publié au format 1 pour les applications installées avant la version 2.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { DataBundleSchema } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const DATA = join(ROOT, 'src', 'data')
const read = (file: string) => JSON.parse(readFileSync(join(DATA, file), 'utf8'))

const measures = Object.fromEntries(
  readdirSync(join(DATA, 'measures'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [basename(f, '.json'), read(join('measures', f))]),
)

const parsed = DataBundleSchema.safeParse({
  version: 2,
  generated_at: new Date().toISOString(),
  meta: read('meta.json'),
  themes: read('themes.json'),
  candidates: read('candidates.json'),
  measures,
  link_status: read('link-status.json'),
  changelog: read('changelog.json'),
  glossary: read('glossary.json'),
  votes: read('votes.json'),
  vote_explanations: read('votes-explanations.json'),
  calendar: read('calendar.json'),
  parrainages: read('parrainages.json'),
  speaking_time: read('speaking-time.json'),
})

if (!parsed.success) {
  for (const i of parsed.error.issues) console.error(`✖ ${i.path.map(String).join('.')} : ${i.message}`)
  process.exit(1)
}

mkdirSync(join(ROOT, 'public-data'), { recursive: true })
writeFileSync(join(ROOT, 'public-data', 'data-v2.json'), JSON.stringify(parsed.data))
// Format 1 : un seul indicateur par mesure (le premier) ; les champs ajoutés depuis sont ignorés par ces versions.
const legacy = {
  ...parsed.data,
  version: 1,
  measures: Object.fromEntries(
    Object.entries(parsed.data.measures).map(([id, list]) => [
      id,
      list.map((m) => ({ ...m, indicator: Array.isArray(m.indicator) ? m.indicator[0] : m.indicator })),
    ]),
  ),
}
writeFileSync(join(ROOT, 'public-data', 'data.json'), JSON.stringify(legacy))
// Horodatage repris par l'application : des données intégrées identiques à la version en ligne ne déclenchent pas de mise à jour.
writeFileSync(join(DATA, 'bundle-info.json'), JSON.stringify({ generated_at: parsed.data.generated_at }, null, 2) + '\n')
const count = Object.values(parsed.data.measures).reduce((n, l) => n + l.length, 0)
console.log(`✔ public-data/data-v2.json : ${parsed.data.candidates.length} candidats, ${count} mesures (données du ${parsed.data.meta.last_updated})`)
