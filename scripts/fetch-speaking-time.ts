/**
 * Temps de parole des candidats à la télévision et à la radio, d'après les relevés mensuels publiés par l'Arcom
 * hors période électorale (fichiers CSV « personnalités politiques », environ trois mois après la diffusion).
 * Écrit src/data/speaking-time.json : pour chaque candidat du comparateur, le total mensuel (toutes chaînes et
 * radios, tous types d'émissions), sur les douze derniers mois publiés. Aucun chiffre n'est saisi à la main.
 *
 *   npm run fetch-speaking-time
 *
 * Les fichiers sont listés sur https://www.arcom.fr/temps-parole/hors-elections (« Accéder à la liste des fichiers ») ;
 * leur adresse suit le modèle Export_web_Personnalites_avec_seuil_<premier jour>_<dernier jour>.csv. Un mois absent
 * (404) n'est simplement pas encore publié. Exécuté par .github/workflows/elections.yml.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SpeakingTimeSchema, type Candidate, type SpeakingTime } from '../src/data/schema.ts'
import { csvRows, matchCandidate } from './lib/open-data.ts'

const ROOT = join(import.meta.dirname, '..')
const FILES = 'https://www.arcom.fr/sites/default/files/tphe/files/speaking_time_files'
const PAGE = 'https://www.arcom.fr/temps-parole/hors-elections'
const FIRST = { year: 2025, month: 1 } // premiers relevés publiés sous cette forme (janvier 2025)
const KEEP = 12

const candidates = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'candidates.json'), 'utf8')) as Candidate[]
const pad = (n: number) => String(n).padStart(2, '0')
const seconds = (cell: string) => {
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(cell.trim())
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0
}

async function fetchMonth(year: number, month: number): Promise<string | null> {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const url = `${FILES}/Export_web_Personnalites_avec_seuil_01-${pad(month)}-${year}_${pad(last)}-${pad(month)}-${year}.csv`
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (comparateur presidentielle 2027)' }, signal: AbortSignal.timeout(60_000) })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return await res.text()
    } catch (e) {
      console.warn(`  ${year}-${pad(month)} : échec (${(e as Error).message}), essai ${attempt}`)
      if (attempt === 4) throw new Error(`Relevé Arcom ${year}-${pad(month)} inaccessible`)
      await new Promise((r) => setTimeout(r, 10_000 * attempt))
    }
  }
  return null
}

const now = new Date()
const months: string[] = []
const result: SpeakingTime['candidates'] = {}
for (let y = FIRST.year, m = FIRST.month; y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth() + 1); m === 12 ? ((m = 1), y++) : m++) {
  const csv = await fetchMonth(y, m)
  if (!csv) continue
  const id = `${y}-${pad(m)}`
  const rows = csvRows(csv)
  // Trois lignes d'en-tête (service, type de service, type d'émission), puis une ligne par personnalité.
  if (!/type d'émission/i.test(rows[2]?.[0] ?? '')) throw new Error(`Relevé ${id} : format inattendu (en-têtes modifiés ?)`)
  let matched = 0
  for (const r of rows.slice(3)) {
    const c = matchCandidate(r[0] ?? '', candidates)
    if (!c) continue
    matched++
    const entry = (result[c.id] ??= { name: r[0].trim(), affiliation: (r[1] ?? '').trim(), seconds: {} })
    entry.seconds[id] = (entry.seconds[id] ?? 0) + r.slice(2).reduce((sum, cell) => sum + seconds(cell), 0)
    entry.affiliation = (r[1] ?? '').trim() || entry.affiliation
  }
  months.push(id)
  console.log(`  ${id} : ${rows.length - 3} personnalités, ${matched} candidat(s) du comparateur`)
}
if (!months.length) throw new Error('Aucun relevé Arcom récupéré : rien n’est publié')

const kept = months.slice(-KEEP)
for (const c of Object.values(result)) c.seconds = Object.fromEntries(kept.map((m) => [m, c.seconds[m] ?? 0]))
const out = SpeakingTimeSchema.parse({
  source_label: 'Arcom – Relevés des temps de parole hors périodes électorales',
  source_url: PAGE,
  fetched_at: new Date().toISOString(),
  months: kept,
  candidates: result,
})
writeFileSync(join(ROOT, 'src', 'data', 'speaking-time.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`✔ src/data/speaking-time.json : ${kept[0]} → ${kept.at(-1)}, ${Object.keys(result).length} candidats trouvés dans les relevés`)
