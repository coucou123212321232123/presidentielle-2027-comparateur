import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Columns3, X } from 'lucide-react'
import { allCandidateIds, byTheme, candidates, countFor, themes, useMeasures } from '../data'
import type { Candidate, Measure, Precision, SourceType, Theme } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { MeasureCard } from '../components/MeasureCard'
import { MeasureFilters } from '../components/MeasureFilters'
import { ThemeIcon } from '../components/ThemeIcon'
import { ThemeProgramLink } from '../components/Program'
import { PageHeader, Skeleton } from '../components/ui'
import { useMeasureFilter } from '../lib/store'
import { fullName } from '../lib/format'

const SOURCE_RANK: Record<SourceType, number> = { officiel: 0, vote_ou_bilan: 1, declaration: 2, analyse_tierce: 3 }
const PRECISION_RANK: Record<Precision, number> = { chiffre: 0, precis: 1, orientation_generale: 2 }

/** Mesure mise en avant dans la cellule : la plus officielle puis la plus précise (règle identique pour tous). */
const headline = (list: Measure[]) =>
  list.slice().sort((a, b) => SOURCE_RANK[a.source_type] - SOURCE_RANK[b.source_type] || PRECISION_RANK[a.precision] - PRECISION_RANK[b.precision])[0]

interface Selection {
  candidate: Candidate
  theme: Theme
}

function DetailDialog({
  selection,
  onClose,
  apply,
  all,
}: {
  selection: Selection | null
  onClose: () => void
  apply: (l: Measure[]) => Measure[]
  all: Record<string, Measure[]>
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (selection && !d.open) d.showModal()
    if (!selection && d.open) d.close()
  }, [selection])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="detail-title"
      className="m-auto max-h-[85dvh] w-[min(720px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-bg p-0 text-ink shadow-lift backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <AnimatePresence>
        {selection && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex max-h-[85dvh] flex-col">
            <header className="flex items-center gap-3 border-b border-line bg-surface p-4" style={{ borderTop: `4px solid ${selection.candidate.color}` }}>
              <CandidateAvatar candidate={selection.candidate} size="md" decorative />
              <div className="min-w-0 flex-1">
                <h2 id="detail-title" className="font-semibold text-ink">
                  {fullName(selection.candidate)}
                </h2>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <ThemeIcon theme={selection.theme} className="size-3.5" /> {selection.theme.label}
                </p>
              </div>
              <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Fermer">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(() => {
                const mine = byTheme(all[selection.candidate.id] ?? [], selection.theme.id)
                const list = apply(mine)
                if (!mine.length) return <p className="text-sm text-muted">Pas de position publiée à ce jour.</p>
                if (!list.length) return <p className="text-sm text-muted">Aucune mesure ne correspond aux filtres actifs.</p>
                return list.map((m) => <MeasureCard key={m.id} measure={m} accent={selection.candidate.color} />)
              })()}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface p-4">
              <ThemeProgramLink candidate={selection.candidate} theme={selection.theme.id} />
              <Link
                to={`/comparateur?theme=${selection.theme.id}&c=${selection.candidate.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg"
              >
                <Columns3 className="size-4" aria-hidden="true" /> Comparer ce thème
              </Link>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}

export default function ThemesPage() {
  const { apply } = useMeasureFilter()
  const [selection, setSelection] = useState<Selection | null>(null)
  // La matrice résume tous les candidats : c'est la seule page qui charge l'ensemble des mesures.
  const all = useMeasures(allCandidateIds)

  return (
    <div>
      <PageHeader eyebrow="Thèmes" title="Vue d'ensemble : thèmes × candidats">
        Chaque cellule résume en une ligne la mesure la plus directement issue du programme (puis la plus précise). Cliquez pour voir le
        détail et les sources. Une cellule vide signifie qu'aucune position publiée n'a été trouvée.
      </PageHeader>

      <div className="mb-6">
        <MeasureFilters />
      </div>

      {!all ? (
        <Skeleton className="h-[70vh]" />
      ) : (
      <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
        <table className="border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Matrice des mesures par thème et par candidat</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-20 min-w-40 border-b border-r border-line bg-surface p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Thème
              </th>
              {candidates.map((c) => (
                <th key={c.id} scope="col" className="min-w-48 border-b border-line bg-surface p-3 text-left align-bottom" style={{ borderTop: `4px solid ${c.color}` }}>
                  <Link to={`/candidats/${c.id}`} className="flex items-center gap-2 hover:underline">
                    <CandidateAvatar candidate={c} size="sm" decorative />
                    <span className="font-semibold leading-tight text-ink">{c.last_name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {themes.map((t) => (
              <tr key={t.id} className="group">
                <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface p-3 text-left align-top font-medium">
                  <Link to={`/comparateur?theme=${t.id}`} className="flex items-center gap-2 text-ink hover:underline">
                    <ThemeIcon theme={t} className="size-4 shrink-0 text-muted" />
                    {t.short}
                  </Link>
                </th>
                {candidates.map((c) => {
                  const total = countFor(c.id, t.id)
                  const list = apply(byTheme(all[c.id], t.id))
                  const top = headline(list)
                  return (
                    <td key={c.id} className="border-b border-line p-1.5 align-top">
                      {top ? (
                        <button
                          type="button"
                          onClick={() => setSelection({ candidate: c, theme: t })}
                          className="block w-full rounded-lg p-2 text-left transition-colors hover:bg-surface-2"
                          aria-label={`${fullName(c)}, ${t.label} : ${top.title}${list.length > 1 ? ` et ${list.length - 1} autre(s) mesure(s)` : ''}`}
                        >
                          <span className="line-clamp-2 text-[13px] leading-snug text-ink-2">{top.title}</span>
                          {list.length > 1 && <span className="mt-1 block text-[11px] font-medium text-muted">+{list.length - 1} autre{list.length > 2 ? 's' : ''}</span>}
                        </button>
                      ) : (
                        <span className="block p-2 text-[13px] text-muted/60" title={total ? 'Filtré' : 'Pas de position publiée à ce jour'}>
                          {total ? '·' : '—'}
                          <span className="sr-only">{total ? 'Mesures masquées par les filtres' : 'Pas de position publiée à ce jour'}</span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {all && <DetailDialog selection={selection} onClose={() => setSelection(null)} apply={apply} all={all} />}
    </div>
  )
}
