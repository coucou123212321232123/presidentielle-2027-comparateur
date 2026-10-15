/**
 * Assemble toutes les données en un seul paquet `public-data/data.json`, publié en ligne et
 * téléchargé par l'application au démarrage. Le paquet est validé intégralement avant écriture.
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
  version: 1,
  generated_at: new Date().toISOString(),
  meta: read('meta.json'),
  themes: read('themes.json'),
  candidates: read('candidates.json'),
  measures,
  link_status: read('link-status.json'),
  changelog: read('changelog.json'),
})

if (!parsed.success) {
  for (const i of parsed.error.issues) console.error(`✖ ${i.path.map(String).join('.')} : ${i.message}`)
  process.exit(1)
}

mkdirSync(join(ROOT, 'public-data'), { recursive: true })
writeFileSync(join(ROOT, 'public-data', 'data.json'), JSON.stringify(parsed.data))
const count = Object.values(parsed.data.measures).reduce((n, l) => n + l.length, 0)
console.log(`✔ public-data/data.json : ${parsed.data.candidates.length} candidats, ${count} mesures (données du ${parsed.data.meta.last_updated})`)
