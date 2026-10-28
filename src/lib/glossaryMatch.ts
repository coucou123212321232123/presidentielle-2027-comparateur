import type { GlossaryEntry } from '../data/schema'

/**
 * Repérage des termes du glossaire dans un texte, partagé par l'application (soulignés explicatifs) et par la
 * génération des pages pour les moteurs de recherche (« cité par tel candidat »).
 */
export function glossaryMatcher(glossary: GlossaryEntry[]) {
  const byForm = new Map<string, GlossaryEntry>()
  // Les notions écrites en toutes lettres (« taxe Zucman ») sont reconnues aussi en début de phrase (« Taxe Zucman ») ;
  // les sigles, eux, seulement en capitales (« PAC », pas « pac »).
  const isWord = (form: string) => /\p{Ll}/u.test(form)
  const flipFirst = (form: string) => {
    const first = form.charAt(0)
    const other = first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase()
    return other + form.slice(1)
  }
  for (const g of glossary)
    for (const form of [g.term, ...g.aliases]) {
      byForm.set(form, g)
      if (isWord(form) && !byForm.has(flipFirst(form))) byForm.set(flipFirst(form), g)
    }

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Formes les plus longues d'abord (« EPR2 » avant « EPR »), et jamais au milieu d'un mot.
  const pattern = byForm.size
    ? new RegExp(
        `(?<![\\p{L}\\p{N}])(${[...byForm.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\p{L}\\p{N}])`,
        'gu',
      )
    : null

  /** Identifiants des termes présents dans le texte. */
  const termsIn = (text: string) => new Set(pattern ? [...text.matchAll(pattern)].map((m) => byForm.get(m[0])!.id) : [])

  return { byForm, pattern, termsIn }
}

/** Autres noms à afficher (« Aussi appelé ») : sans les simples variantes d'écriture servant au repérage (pluriel, apostrophe…). */
export function shownAliases(g: GlossaryEntry) {
  const words = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/’/g, "'")
      .split(/\s+/)
      .map((w) => w.replace(/[sx]$/, ''))
      .join(' ')
  const term = words(g.term)
  const expansion = words(g.expansion)
  return g.aliases.filter((a) => {
    const w = words(a)
    return !term.includes(w) && !w.includes(term) && w !== expansion
  })
}
