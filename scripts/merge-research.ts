/**
 * Assemble les fiches de `research/candidates/*.json` dans `src/data/candidates.json`
 * en leur attribuant leur couleur de repère visuel.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

// Couleurs de repère (inspirées des couleurs usuelles des partis), choisies pour rester distinctes entre elles.
export const COLORS: Record<string, string> = {
  arthaud: '#7F1D1D',
  roussel: '#DC2626',
  melenchon: '#C0265A',
  ruffin: '#EA580C',
  glucksmann: '#DB2777',
  tondelier: '#16A34A',
  attal: '#D97706',
  philippe: '#0284C7',
  villepin: '#64748B',
  bertrand: '#0F766E',
  retailleau: '#1D4ED8',
  lisnard: '#4F46E5',
  'dupont-aignan': '#7C3AED',
  'le-pen': '#1E3A8A',
  zemmour: '#334155',
}

const dir = join(ROOT, 'research', 'candidates')
const merged = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    const color = COLORS[c.id]
    if (!color) throw new Error(`Pas de couleur définie pour ${c.id}`)
    return { ...c, color }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

writeFileSync(join(ROOT, 'src', 'data', 'candidates.json'), JSON.stringify(merged, null, 2) + '\n')
console.log(`${merged.length} fiches fusionnées dans src/data/candidates.json`)
