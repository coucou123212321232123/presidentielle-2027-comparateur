import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import { candidateById, changelog, summary, themeById, useMeasures } from '../data'
import type { Candidate } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { Card, PageHeader, cx } from '../components/ui'
import { formatDate, fullName, plural } from '../lib/format'

const entries = changelog.slice().sort((a, b) => b.date.localeCompare(a.date))

/** Mesures d'un candidat ajoutées à une date, chargées seulement quand on les déplie. */
function AddedMeasures({ candidate, date }: { candidate: Candidate; date: string }) {
  const loaded = useMeasures([candidate.id])
  const list = (loaded?.[candidate.id] ?? []).filter((m) => m.added === date)
  if (!loaded) return <p className="mt-2 text-sm text-muted">Chargement…</p>
  return (
    <ul className="mt-2 space-y-1.5 border-l-2 pl-3" style={{ borderColor: candidate.color }}>
      {list.map((m) => (
        <li key={m.id} className="text-sm">
          <Link to={`/candidats/${candidate.id}?theme=${m.theme}&mesure=${m.id}`} className="text-ink hover:underline">
            {m.title}
          </Link>{' '}
          <span className="text-xs text-muted">· {themeById[m.theme]?.short}</span>
        </li>
      ))}
    </ul>
  )
}

function CandidateAdditions({ candidate, date, count }: { candidate: Candidate; date: string; count: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-line p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <CandidateAvatar candidate={candidate} size="sm" decorative />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{fullName(candidate)}</span>
          <span className="block text-xs text-muted">{plural(count, 'nouvelle mesure', 'nouvelles mesures')}</span>
        </span>
        <ChevronDown className={cx('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <AddedMeasures candidate={candidate} date={date} />}
    </li>
  )
}

export default function NewsPage() {
  return (
    <div>
      <PageHeader eyebrow="Nouveautés" title="Ce qui a changé, semaine après semaine">
        Chaque lundi, les sites et documents de tous les candidats sont relus, avec le même effort pour chacun ; chaque ajout est vérifié sur
        sa source par une seconde relecture indépendante. Voici le journal de ces mises à jour.
      </PageHeader>
      <ol className="space-y-8">
        {entries.map((e) => {
          const added = Object.entries(summary)
            .map(([id, s]) => ({ c: candidateById[id], n: Object.values(s.added[e.date] ?? {}).reduce((a, b) => a + (b ?? 0), 0) }))
            .filter((x) => x.c && x.n > 0)
            .sort((a, b) => a.c.last_name.localeCompare(b.c.last_name, 'fr'))
          return (
            <li key={e.date + e.summary}>
              <Card className="p-5 sm:p-6">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  <Sparkles className="size-3.5" aria-hidden="true" /> Mise à jour du {formatDate(e.date)}
                </p>
                <p className="mt-2 leading-relaxed text-ink">{e.summary}</p>
                <p className="mt-1 text-xs text-muted">
                  {plural(e.accepted, 'changement retenu', 'changements retenus')}
                  {e.rejected > 0 && ` · ${plural(e.rejected, 'proposition écartée', 'propositions écartées')} à la vérification`}
                </p>
                {e.changes.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                    {e.changes.map((ch) => {
                      const c = candidateById[ch.candidate]
                      return (
                        <li key={ch.candidate + ch.text}>
                          <span className="font-medium text-ink">{c ? fullName(c) : ch.candidate}</span> : {ch.text}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {added.length > 0 && (
                  <>
                    <h2 className="mb-2 mt-5 text-sm font-semibold text-ink">Mesures ajoutées ce jour-là</h2>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {added.map(({ c, n }) => (
                        <CandidateAdditions key={c.id} candidate={c} date={e.date} count={n} />
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
