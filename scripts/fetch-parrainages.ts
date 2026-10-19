/**
 * Parrainages de l'élection présidentielle : lit le fichier CSV officiel publié par le Conseil constitutionnel
 * (adresse dans research/parrainages/source.json) et écrit src/data/parrainages.json : nombre de parrainages
 * validés par candidat, nombre de départements, plus grand nombre venant d'un même département.
 * Aucun chiffre n'est saisi à la main. Tant qu'aucune adresse n'est renseignée, la collecte est « non commencée ».
 *
 *   npm run fetch-parrainages
 *   npm run fetch-parrainages -- --test <fichier.csv>   # contrôle du format sur un fichier local (rien n'est écrit)
 *
 * Exécuté par .github/workflows/elections.yml.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ParrainagesSchema, type Candidate, type Parrainages } from '../src/data/schema.ts'
import { csvRows, matchCandidate } from './lib/open-data.ts'

const ROOT = join(import.meta.dirname, '..')
const source = JSON.parse(readFileSync(join(ROOT, 'research', 'parrainages', 'source.json'), 'utf8')) as {
  csv_url: string | null
  page_url: string | null
  page_label: string | null
  closed: boolean
}
const candidates = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'candidates.json'), 'utf8')) as Candidate[]

const RULE: Parrainages['rule'] = {
  text: "Pour figurer sur la liste des candidats, il faut au moins 500 présentations d'élus, venant d'au moins 30 départements ou collectivités d'outre-mer, sans que plus d'un dixième (50) viennent d'un même département.",
  source_label: 'Conseil constitutionnel – Les parrainages à l’élection présidentielle',
  source_url: 'https://www.conseil-constitutionnel.fr/nouveaux-cahiers-du-conseil-constitutionnel/les-parrainages-a-l-election-presidentielle',
}

function summarise(csv: string) {
  const [header, ...rows] = csvRows(csv)
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === name)
    if (i < 0) throw new Error(`Colonne « ${name} » absente du fichier (format modifié ?) : ${header.join(' | ')}`)
    return i
  }
  const [cCandidate, cDepartment, cDate] = [col('candidat'), col('département'), col('date de publication')]
  const byName = new Map<string, Map<string, number>>()
  let latest = ''
  for (const r of rows) {
    if (r.length <= cCandidate || !r[cCandidate]?.trim()) continue
    const name = r[cCandidate].trim()
    const dep = r[cDepartment]?.trim() || '?'
    const deps = byName.get(name) ?? new Map<string, number>()
    deps.set(dep, (deps.get(dep) ?? 0) + 1)
    byName.set(name, deps)
    const [d, m, y] = (r[cDate] ?? '').trim().split('/')
    const iso = y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : ''
    if (iso > latest) latest = iso
  }
  const list = [...byName].map(([name, deps]) => ({
    name,
    candidate: matchCandidate(name, candidates)?.id ?? null,
    total: [...deps.values()].reduce((a, b) => a + b, 0),
    departments: deps.size,
    max_department: Math.max(...deps.values()),
  }))
  list.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fr'))
  return { list, latest: latest || null }
}

const testArg = process.argv.indexOf('--test')
if (testArg > 0) {
  const { list, latest } = summarise(readFileSync(process.argv[testArg + 1], 'utf8'))
  console.log(`Format reconnu · dernière publication ${latest} · ${list.length} personnes parrainées`)
  for (const c of list.slice(0, 15)) console.log(`  ${c.name.padEnd(30)} ${String(c.total).padStart(5)} · ${c.departments} dép. · max ${c.max_department}${c.candidate ? ` → ${c.candidate}` : ''}`)
  process.exit(0)
}

let out: Parrainages
if (!source.csv_url) {
  out = { status: 'non_commence', threshold: 500, rule: RULE, source_label: null, source_url: null, published_at: null, fetched_at: null, candidates: [] }
} else {
  const res = await fetch(source.csv_url, { signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${source.csv_url}`)
  const { list, latest } = summarise(await res.text())
  if (!list.length) throw new Error('Fichier des parrainages vide : rien n’est publié')
  out = {
    status: source.closed ? 'clos' : 'en_cours',
    threshold: 500,
    rule: RULE,
    source_label: source.page_label ?? 'Conseil constitutionnel – parrainages',
    source_url: source.page_url ?? source.csv_url,
    published_at: latest,
    fetched_at: new Date().toISOString(),
    candidates: list,
  }
}

const parsed = ParrainagesSchema.parse(out)
writeFileSync(join(ROOT, 'src', 'data', 'parrainages.json'), JSON.stringify(parsed, null, 2) + '\n')
console.log(`✔ src/data/parrainages.json : ${parsed.status}${parsed.candidates.length ? ` · ${parsed.candidates.length} personnes parrainées · publication du ${parsed.published_at}` : ''}`)
