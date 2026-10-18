/**
 * Fusionne les explications de votes rédigées dans research/votes/explications/*.json (contenu du texte,
 * arguments sourcés de chaque camp) dans src/data/votes-explanations.json, après validation (schéma Zod).
 * Les entrées sans résumé sont écartées ; les notes de recherche ne sont pas publiées.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { VoteExplanationsSchema } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const DIR = join(ROOT, 'research', 'votes', 'explications')

const raw = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Record<string, any>[])

const kept = raw
  .filter((e) => typeof e.summary === 'string' && e.summary.trim())
  .map(({ notes: _notes, ...e }) => ({
    ...e,
    arguments: { pour: e.arguments?.pour ?? [], contre: e.arguments?.contre ?? [], ...(e.arguments?.abstention?.length ? { abstention: e.arguments.abstention } : {}) },
    sources: e.sources ?? [],
  }))

const parsed = VoteExplanationsSchema.safeParse(kept)
if (!parsed.success) {
  for (const i of parsed.error.issues) console.error(`✖ ${i.path.map(String).join('.')} : ${i.message}`)
  process.exit(1)
}
const ids = new Set<string>()
for (const e of parsed.data) {
  if (ids.has(e.id)) {
    console.error(`✖ ${e.id} en double`)
    process.exit(1)
  }
  ids.add(e.id)
}
writeFileSync(join(ROOT, 'src', 'data', 'votes-explanations.json'), JSON.stringify(parsed.data, null, 2) + '\n')
console.log(`✔ src/data/votes-explanations.json : ${parsed.data.length} scrutins expliqués (${raw.length - parsed.data.length} écartés faute de résumé)`)
