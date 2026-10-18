import { useEffect, useState } from 'react'
import type { Scrutin, ThemeId, VotesFile, VotesIndex } from './schema'
import votesRaw from './votes.json'
import { cachedData } from '.'

// Module à part : les votes ne sont chargés qu'avec les pages qui les affichent (Votes, fiches candidats).
export const votes: VotesFile = cachedData?.votes ?? (votesRaw as VotesFile)

export type IndexKind = VotesIndex['scrutins'][number]['kind']

/** Scrutin affichable : grand texte commenté (contexte, thème) ou vote issu de l'index de recherche. */
export type VoteView = Omit<Scrutin, 'theme' | 'context'> & { theme?: ThemeId; context?: string; kind: IndexKind; curated: boolean }

export const KIND_LABELS: Record<IndexKind, string> = {
  proposition_de_loi: 'Proposition de loi',
  projet_de_loi: 'Projet de loi',
  motion_de_censure: 'Motion de censure',
  declaration: 'Déclaration du gouvernement',
  resolution: 'Résolution',
  autre: 'Autre vote',
}

export function kindOf(title: string, censure: boolean): IndexKind {
  if (censure) return 'motion_de_censure'
  if (/d[ée]claration/i.test(title)) return 'declaration'
  if (/projet de loi/i.test(title)) return 'projet_de_loi'
  if (/proposition de loi/i.test(title)) return 'proposition_de_loi'
  if (/proposition de r[ée]solution/i.test(title)) return 'resolution'
  return 'autre'
}

/** « L'ensemble du projet de loi de finances pour 2026 (première lecture). » → « Projet de loi de finances pour 2026 (première lecture) » */
export function prettyTitle(official: string) {
  return official
    .replace(/^l['’]ensemble (du |de la |de l['’]|des )/i, '')
    .replace(/^(la |le |l['’])(?=(motion|d[ée]claration|premi[èe]re partie))/i, '')
    .replace(/\.\s*$/, '')
    .replace(/^./, (c) => c.toUpperCase())
}

export const curatedViews: VoteView[] = votes.scrutins.map((s) => ({ ...s, kind: kindOf(s.official_title, s.censure), curated: true }))

let indexPromise: Promise<VoteView[]> | null = null

/** Index de recherche (tous les textes votés depuis 2022), chargé à la première recherche. */
export function loadVoteIndex(): Promise<VoteView[]> {
  indexPromise ??= import('./votes-index.json').then(({ default: raw }) => {
    const idx = raw as unknown as VotesIndex
    const curated = new Map(curatedViews.map((v) => [v.id, v]))
    return idx.scrutins.map(
      (e) =>
        curated.get(e.id) ?? {
          id: e.id,
          legislature: e.legislature,
          numero: e.numero,
          date: e.date,
          short_title: prettyTitle(e.title),
          official_title: e.title,
          vote_type: '',
          kind: e.kind,
          censure: e.censure,
          result: e.result,
          majority_required: e.majority_required,
          totals: e.totals,
          groups: e.groups.map(([ref, members, pour, contre, abstention, non_votant, absent]) => {
            const [short, label, color] = idx.groups[ref] ?? [ref, ref, '#9ca3af']
            return { ref, short, label, color, members, pour, contre, abstention, non_votant, absent }
          }),
          candidates: e.candidates,
          source_url: `https://www.assemblee-nationale.fr/dyn/${e.legislature}/scrutins/${e.numero}`,
          curated: false,
        },
    )
  })
  return indexPromise
}

/** Index de recherche chargé à la demande (`null` tant qu'il n'est pas prêt ou pas demandé). */
export function useVoteIndex(enabled: boolean) {
  const [index, setIndex] = useState<VoteView[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!enabled || index) return
    let alive = true
    loadVoteIndex()
      .then((v) => alive && setIndex(v))
      .catch(() => {
        indexPromise = null
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [enabled, index])
  return { index, failed }
}
