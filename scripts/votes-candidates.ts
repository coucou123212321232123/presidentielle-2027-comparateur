/**
 * Repère, dans l'index officiel des votes (src/data/votes-index.json, mis à jour par .github/workflows/votes.yml),
 * les nouveaux scrutins susceptibles d'entrer dans la liste des grands textes de la page Votes.
 * Critères mécaniques, identiques pour tous les groupes (aucun choix éditorial ici) :
 *   - vote sur l'ensemble d'un texte, vote solennel ou déclaration du gouvernement : au moins 400 suffrages
 *     (pour + contre + abstentions), signe d'un vote solennel ou d'un texte très suivi ;
 *   - motion de censure : adoptée, ou au moins 250 voix pour (proche de la majorité absolue).
 * Ne liste que les scrutins postérieurs à research/votes/suivi.json (last_checked) et absents de la sélection.
 *
 *   npm run votes-candidates                 # liste les candidats depuis last_checked
 *   npm run votes-candidates -- --since 2026-09-01
 *
 * La décision d'ajout, le contexte et les explications suivent research/UPDATE_PROCEDURE.md (étape V).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { VotesFile, VotesIndex } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const json = <T>(...p: string[]): T => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8')) as T

export const MIN_SUFFRAGES = 400
export const MIN_CENSURE = 250

const index = json<VotesIndex>('src', 'data', 'votes-index.json')
const votes = json<VotesFile>('src', 'data', 'votes.json')
const suivi = json<{ last_checked: string }>('research', 'votes', 'suivi.json')
const arg = process.argv.indexOf('--since')
const since = arg > 0 ? process.argv[arg + 1] : suivi.last_checked

const selected = new Set(votes.scrutins.map((s) => s.id))
const short = (ref: string) => index.groups[ref]?.[0] ?? ref
const suffrages = (s: VotesIndex['scrutins'][number]) => s.totals.pour + s.totals.contre + s.totals.abstention

const found = index.scrutins
  .filter((s) => s.date > since && !selected.has(s.id))
  .filter((s) => (s.censure ? s.result === 'adopte' || s.totals.pour >= MIN_CENSURE : suffrages(s) >= MIN_SUFFRAGES))
  .sort((a, b) => a.date.localeCompare(b.date) || a.numero - b.numero)

const latest = index.scrutins.reduce((d, s) => (s.date > d ? s.date : d), since)
console.log(`Index du ${index.generated_at.slice(0, 10)} · scrutins examinés après le ${since} · dernier scrutin indexé : ${latest}`)
console.log(`${found.length} grand(s) texte(s) candidat(s) (≥ ${MIN_SUFFRAGES} suffrages, ou censure adoptée / ≥ ${MIN_CENSURE} voix) :\n`)
for (const s of found) {
  const t = s.totals
  const counts = s.censure ? `${t.pour} voix pour la censure` : `${t.pour} pour, ${t.contre} contre, ${t.abstention} abstentions`
  console.log(`- ${s.id} · ${s.date} · ${s.kind} · ${s.result} · ${counts}`)
  console.log(`  ${s.title}`)
  console.log(`  https://www.assemblee-nationale.fr/dyn/${s.legislature}/scrutins/${s.numero}`)
  const groups = s.groups.map(([ref, members, pour, contre, abst]) => `${short(ref)} ${pour}/${contre}/${abst} (${members})`).join(' · ')
  console.log(`  Groupes (pour/contre/abst. (membres)) : ${groups}`)
  if (s.candidates.length) console.log(`  Candidats : ${s.candidates.map((c) => `${c.candidate} ${c.vote}`).join(', ')}`)
  console.log()
}
console.log(`Après traitement, mettre research/votes/suivi.json → { "last_checked": "${latest}" }`)
