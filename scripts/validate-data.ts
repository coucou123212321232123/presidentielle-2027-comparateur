/**
 * Vérifie l'intégrité de toutes les données de /src/data :
 * champs requis, URLs de source, dates de vérification, thèmes valides, bloc `program`,
 * cohérence des indicateurs comparables. Sort en erreur (code 1) au moindre problème bloquant.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import {
  BudgetsSchema,
  CalendarSchema,
  ContextSchema,
  HatvpSchema,
  ResultsSchema,
  CandidateSchema,
  ParrainagesSchema,
  SpeakingTimeSchema,
  ChangelogSchema,
  GlossarySchema,
  VotesFileSchema,
  VotesIndexSchema,
  VoteExplanationsSchema,
  LinkStatusSchema,
  MeasureFileSchema,
  MetaSchema,
  ThemeSchema,
  THEME_IDS,
  type Candidate,
  type Theme,
} from '../src/data/schema.ts'
import { indicatorsOf } from '../src/data/summary.ts'

const DATA = join(import.meta.dirname, '..', 'src', 'data')
const errors: string[] = []
const warnings: string[] = []

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    errors.push(`${basename(path)} : JSON invalide (${(e as Error).message})`)
    return null
  }
}

function zodIssues(file: string, issues: { path: PropertyKey[]; message: string }[]) {
  for (const i of issues) errors.push(`${file} › ${i.path.map(String).join('.') || '(racine)'} : ${i.message}`)
}

// Thèmes
const themesParsed = ThemeSchema.array().safeParse(readJson(join(DATA, 'themes.json')))
let themes: Theme[] = []
if (!themesParsed.success) zodIssues('themes.json', themesParsed.error.issues)
else {
  themes = themesParsed.data
  const missing = THEME_IDS.filter((id) => !themes.some((t) => t.id === id))
  if (missing.length) errors.push(`themes.json : thèmes manquants ${missing.join(', ')}`)
}

// Méta + statut des liens
const metaParsed = MetaSchema.safeParse(readJson(join(DATA, 'meta.json')))
if (!metaParsed.success) zodIssues('meta.json', metaParsed.error.issues)
const linkParsed = LinkStatusSchema.safeParse(readJson(join(DATA, 'link-status.json')))
if (!linkParsed.success) zodIssues('link-status.json', linkParsed.error.issues)
const changelogParsed = ChangelogSchema.safeParse(readJson(join(DATA, 'changelog.json')))
if (!changelogParsed.success) zodIssues('changelog.json', changelogParsed.error.issues)
const votesParsed = VotesFileSchema.safeParse(readJson(join(DATA, 'votes.json')))
if (!votesParsed.success) zodIssues('votes.json', votesParsed.error.issues)
const votesIndexParsed = VotesIndexSchema.safeParse(readJson(join(DATA, 'votes-index.json')))
if (!votesIndexParsed.success) zodIssues('votes-index.json', votesIndexParsed.error.issues.slice(0, 20))
const explanationsParsed = VoteExplanationsSchema.safeParse(readJson(join(DATA, 'votes-explanations.json')))
if (!explanationsParsed.success) zodIssues('votes-explanations.json', explanationsParsed.error.issues)
else if (votesParsed.success) {
  const byId = new Map(votesParsed.data.scrutins.map((s) => [s.id, s]))
  for (const e of explanationsParsed.data) {
    const s = byId.get(e.id)
    if (!s) {
      // Une explication n'est publiée qu'avec les décomptes officiels du scrutin (npm run fetch-votes), qui permettent de vérifier l'attribution des arguments.
      errors.push(`votes-explanations.json › ${e.id} : scrutin absent de votes.json (lancer npm run fetch-votes après l'ajout dans research/votes/selection.json)`)
      continue
    }
    // Un argument n'est attribué qu'à des groupes qui ont voté dans ce sens (au moins en partie).
    for (const side of ['pour', 'contre', 'abstention'] as const)
      for (const a of e.arguments[side] ?? [])
        for (const g of a.groups) {
          const grp = s.groups.find((x) => x.short === g)
          const counted = side === 'contre' && s.censure ? (grp ? grp.members - grp.pour : 0) : (grp?.[side] ?? 0)
          if (!grp) errors.push(`votes-explanations.json › ${e.id} : groupe « ${g} » inconnu pour ce scrutin`)
          else if (!counted) errors.push(`votes-explanations.json › ${e.id} : « ${g} » n'a pas voté ${side}`)
        }
  }
}
// Calendrier, parrainages (Conseil constitutionnel) et temps de parole (Arcom) : schéma et cohérence.
const calendarParsed = CalendarSchema.safeParse(readJson(join(DATA, 'calendar.json')))
if (!calendarParsed.success) zodIssues('calendar.json', calendarParsed.error.issues)
else {
  const dates = calendarParsed.data.events.map((e) => e.date)
  if (dates.some((d, i) => i > 0 && d < dates[i - 1])) errors.push('calendar.json : les étapes doivent être dans l’ordre chronologique')
  const debateDates = calendarParsed.data.debates.map((d) => d.date)
  if (debateDates.some((d, i) => i > 0 && d < debateDates[i - 1])) errors.push('calendar.json : les débats doivent être dans l’ordre chronologique')
  const known = new Set((readJson(join(DATA, 'candidates.json')) as Candidate[]).map((c) => c.id))
  for (const d of calendarParsed.data.debates)
    for (const id of d.participants ?? []) if (!known.has(id)) errors.push(`calendar.json › débat du ${d.date} : candidat inconnu « ${id} »`)
}
const parrainagesParsed = ParrainagesSchema.safeParse(readJson(join(DATA, 'parrainages.json')))
if (!parrainagesParsed.success) zodIssues('parrainages.json', parrainagesParsed.error.issues)
else if (parrainagesParsed.data.status !== 'non_commence' && !parrainagesParsed.data.source_url)
  errors.push('parrainages.json : source officielle manquante')
const speakingParsed = SpeakingTimeSchema.safeParse(readJson(join(DATA, 'speaking-time.json')))
if (!speakingParsed.success) zodIssues('speaking-time.json', speakingParsed.error.issues)
// Chiffres de contexte par thème et chiffrages des candidats.
const contextParsed = ContextSchema.safeParse(readJson(join(DATA, 'context.json')))
if (!contextParsed.success) zodIssues('context.json', contextParsed.error.issues)
const hatvpParsed = HatvpSchema.safeParse(readJson(join(DATA, 'hatvp.json')))
if (!hatvpParsed.success) zodIssues('hatvp.json', hatvpParsed.error.issues)
const resultsParsed = ResultsSchema.safeParse(readJson(join(DATA, 'results.json')))
if (!resultsParsed.success) zodIssues('results.json', resultsParsed.error.issues)
else
  for (const r of resultsParsed.data.rounds)
    if (r.status !== 'a_venir' && (!r.source_url || !r.exprimes || r.candidates.length < 2))
      errors.push(`results.json › tour du ${r.date} : source, suffrages exprimés et candidats requis`)
const budgetsParsed = BudgetsSchema.safeParse(readJson(join(DATA, 'budgets.json')))
if (!budgetsParsed.success) zodIssues('budgets.json', budgetsParsed.error.issues)
const glossaryParsed = GlossarySchema.safeParse(readJson(join(DATA, 'glossary.json')))
if (!glossaryParsed.success) zodIssues('glossary.json', glossaryParsed.error.issues)
else {
  const seen = new Set<string>()
  for (const g of glossaryParsed.data)
    for (const form of [g.term, ...g.aliases]) {
      if (seen.has(form)) errors.push(`glossary.json : « ${form} » défini plusieurs fois`)
      seen.add(form)
    }
}

// Candidats
const candParsed = CandidateSchema.array().safeParse(readJson(join(DATA, 'candidates.json')))
let candidates: Candidate[] = []
if (!candParsed.success) zodIssues('candidates.json', candParsed.error.issues)
else candidates = candParsed.data

const ids = new Set<string>()
for (const c of candidates) {
  if (ids.has(c.id)) errors.push(`candidates.json : id dupliqué « ${c.id} »`)
  ids.add(c.id)
  const p = c.program
  if (p.status === 'publie' && !p.main_url) errors.push(`${c.id} : programme « publié » sans main_url`)
  if (p.format !== 'aucun' && !p.main_url) errors.push(`${c.id} : format « ${p.format} » sans main_url`)
  if (!p.main_url && !c.news_url) warnings.push(`${c.id} : ni programme ni page d'actualité officielle`)
  if (c.main_axes.length < 3) warnings.push(`${c.id} : ${c.main_axes.length} axe(s) principal(aux) (3 à 5 attendus)`)
  if (!c.photo) warnings.push(`${c.id} : pas de photo libre de droits (avatar à initiales utilisé)`)
}

// Mesures
const measureDir = join(DATA, 'measures')
const measureIds = new Set<string>()
const files = readdirSync(measureDir).filter((f) => f.endsWith('.json'))
for (const file of files) {
  const candidateId = basename(file, '.json')
  if (!ids.has(candidateId)) errors.push(`measures/${file} : aucun candidat « ${candidateId} » dans candidates.json`)
  const parsed = MeasureFileSchema.safeParse(readJson(join(measureDir, file)))
  if (!parsed.success) {
    zodIssues(`measures/${file}`, parsed.error.issues)
    continue
  }
  const seenIndicators = new Set<string>()
  for (const m of parsed.data) {
    if (measureIds.has(m.id)) errors.push(`measures/${file} : id de mesure dupliqué « ${m.id} »`)
    measureIds.add(m.id)
    if (!m.source_date) warnings.push(`measures/${file} › ${m.id} : date de source inconnue`)
    for (const ind of indicatorsOf(m)) {
      // Un point de comparaison est affiché dans un thème, mais la mesure qui l'énonce peut relever d'un autre thème.
      const def = themes.flatMap((t) => t.indicators).find((d) => d.key === ind.key)
      if (!def) errors.push(`measures/${file} › ${m.id} : indicateur « ${ind.key} » non défini`)
      else if (def.type === 'number' && typeof ind.value !== 'number')
        errors.push(`measures/${file} › ${m.id} : l'indicateur ${def.key} attend un nombre`)
      else if (def.type === 'enum' && !(String(ind.value) in (def.options ?? {})))
        errors.push(`measures/${file} › ${m.id} : valeur « ${ind.value} » invalide pour ${def.key}`)
      if (seenIndicators.has(ind.key)) errors.push(`measures/${file} : indicateur ${ind.key} présent plusieurs fois`)
      seenIndicators.add(ind.key)
    }
  }
}
for (const c of candidates) {
  if (!files.includes(`${c.id}.json`)) warnings.push(`${c.id} : aucun fichier de mesures`)
}

const total = measureIds.size
console.log(`\n${candidates.length} candidats · ${themes.length} thèmes · ${total} mesures\n`)
// Groupe du parti de chaque candidat : candidat connu, et sigle présent dans les scrutins de la législature.
const partyGroups = readJson(join(DATA, 'party-groups.json')) as { candidates: Record<string, { groups: Record<string, string> }> }
for (const [id, p] of Object.entries(partyGroups.candidates)) {
  if (!ids.has(id)) errors.push(`party-groups.json : candidat inconnu « ${id} »`)
  if (votesParsed.success)
    for (const [leg, short] of Object.entries(p.groups))
      if (!votesParsed.data.scrutins.some((s) => String(s.legislature) === leg && s.groups.some((g) => g.short === short)))
        errors.push(`party-groups.json › ${id} : groupe « ${short} » absent des scrutins de la ${leg}e législature`)
}
if (parrainagesParsed.success)
  for (const c of parrainagesParsed.data.candidates)
    if (c.candidate && !ids.has(c.candidate)) errors.push(`parrainages.json : candidat inconnu « ${c.candidate} »`)
if (budgetsParsed.success) {
  for (const id of Object.keys(budgetsParsed.data.candidates)) if (!ids.has(id)) errors.push(`budgets.json : candidat inconnu « ${id} »`)
  for (const id of ids) if (!(id in budgetsParsed.data.candidates)) errors.push(`budgets.json : candidat « ${id} » absent (mettre level: aucun)`)
}
if (hatvpParsed.success)
  for (const id of Object.keys(hatvpParsed.data.candidates)) if (!ids.has(id)) errors.push(`hatvp.json : candidat inconnu « ${id} »`)
if (resultsParsed.success)
  for (const r of resultsParsed.data.rounds)
    for (const c of r.candidates) if (c.candidate && !ids.has(c.candidate)) errors.push(`results.json : candidat inconnu « ${c.candidate} »`)
if (speakingParsed.success)
  for (const id of Object.keys(speakingParsed.data.candidates)) if (!ids.has(id)) errors.push(`speaking-time.json : candidat inconnu « ${id} »`)

if (warnings.length) {
  console.log(`⚠  ${warnings.length} avertissement(s) :`)
  for (const w of warnings) console.log(`   - ${w}`)
}
if (errors.length) {
  console.error(`\n✖  ${errors.length} erreur(s) :`)
  for (const e of errors) console.error(`   - ${e}`)
  process.exit(1)
}
console.log('\n✔  Données valides.')
