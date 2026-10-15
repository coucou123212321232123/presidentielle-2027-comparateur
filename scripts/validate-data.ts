/**
 * Vérifie l'intégrité de toutes les données de /src/data :
 * champs requis, URLs de source, dates de vérification, thèmes valides, bloc `program`,
 * cohérence des indicateurs comparables. Sort en erreur (code 1) au moindre problème bloquant.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import {
  CandidateSchema,
  ChangelogSchema,
  LinkStatusSchema,
  MeasureFileSchema,
  MetaSchema,
  ThemeSchema,
  THEME_IDS,
  type Candidate,
  type Theme,
} from '../src/data/schema.ts'

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
    if (m.indicator) {
      const def = themes.find((t) => t.id === m.theme)?.indicators.find((d) => d.key === m.indicator!.key)
      if (!def) errors.push(`measures/${file} › ${m.id} : indicateur « ${m.indicator.key} » non défini pour le thème ${m.theme}`)
      else if (def.type === 'number' && typeof m.indicator.value !== 'number')
        errors.push(`measures/${file} › ${m.id} : l'indicateur ${def.key} attend un nombre`)
      else if (def.type === 'enum' && !(String(m.indicator.value) in (def.options ?? {})))
        errors.push(`measures/${file} › ${m.id} : valeur « ${m.indicator.value} » invalide pour ${def.key}`)
      if (seenIndicators.has(m.indicator.key)) errors.push(`measures/${file} : indicateur ${m.indicator.key} présent plusieurs fois`)
      seenIndicators.add(m.indicator.key)
    }
  }
}
for (const c of candidates) {
  if (!files.includes(`${c.id}.json`)) warnings.push(`${c.id} : aucun fichier de mesures`)
}

const total = measureIds.size
console.log(`\n${candidates.length} candidats · ${themes.length} thèmes · ${total} mesures\n`)
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
