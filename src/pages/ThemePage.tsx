import { Link, useParams } from 'react-router-dom'
import { Columns3 } from 'lucide-react'
import { allCandidateIds, byTheme, candidates, countFor, themeById, themes, useMeasures } from '../data'
import type { ThemeId } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { ThemeContext } from '../components/Insights'
import { ThemeIcon } from '../components/ThemeIcon'
import { Card, PageHeader, Skeleton } from '../components/ui'
import { fullName, plural } from '../lib/format'
import { Question } from './PositionsPage'
import NotFoundPage from './NotFoundPage'

/** Un thème, tous les candidats (/themes/immigration/, pages indexées) : questions clés puis mesures de chacun. */
export default function ThemePage() {
  const { theme: id = '' } = useParams()
  const theme = themeById[id as ThemeId]
  const all = useMeasures(allCandidateIds)
  if (!theme) return <NotFoundPage />

  const withMeasures = candidates.filter((c) => countFor(c.id, theme.id) > 0)
  const without = candidates.filter((c) => countFor(c.id, theme.id) === 0)
  return (
    <div>
      <PageHeader eyebrow={theme.short} title={`${theme.label} : que proposent les candidats ?`}>
        {theme.description} Les mesures de chaque candidat, chacune avec sa source : {plural(withMeasures.length, 'candidat', 'candidats')} sur{' '}
        {candidates.length} ont publié des propositions sur ce thème.
      </PageHeader>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          to={`/comparateur?theme=${theme.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg"
        >
          <Columns3 className="size-4" aria-hidden="true" /> Comparer côte à côte
        </Link>
      </div>

      <ThemeContext theme={theme.id} className="mb-8" />

      {theme.indicators.length > 0 && (
        <section aria-labelledby="questions" className="mb-10">
          <h2 id="questions" className="mb-3 font-display text-xl font-semibold text-ink">
            Les questions clés
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {theme.indicators.map((def) => (
              <Question key={def.key} def={def} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="propositions">
        <h2 id="propositions" className="mb-3 flex items-center gap-3 font-display text-xl font-semibold text-ink">
          <ThemeIcon theme={theme} className="size-5 text-muted" />
          Les propositions, candidat par candidat
        </h2>
        <ul className="grid gap-4 lg:grid-cols-2">
          {withMeasures.map((c) => {
            const list = all ? byTheme(all[c.id] ?? [], theme.id) : null
            return (
              <li key={c.id}>
                <Card className="h-full p-4 sm:p-5" style={{ borderTop: `4px solid ${c.color}` }}>
                  <Link to={`/candidats/${c.id}/${theme.id}`} className="flex items-center gap-2.5 hover:underline">
                    <CandidateAvatar candidate={c} size="sm" decorative />
                    <span className="font-semibold text-ink">{fullName(c)}</span>
                    <span className="text-xs text-muted">
                      {c.party_short} · {plural(countFor(c.id, theme.id), 'mesure', 'mesures')}
                    </span>
                  </Link>
                  {list ? (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {list.map((m) => (
                        <li key={m.id} className="leading-snug">
                          <Link to={`/candidats/${c.id}/${theme.id}?mesure=${m.id}`} className="text-ink-2 hover:text-ink hover:underline">
                            {m.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Skeleton className="mt-3 h-20" />
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
        {without.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            <span className="font-medium">Pas de position publiée à ce jour :</span> {without.map((c) => fullName(c)).join(', ')}.
          </p>
        )}
      </section>

      <nav aria-label="Les autres thèmes" className="mt-10 border-t border-line pt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">Les autres thèmes</h2>
        <ul className="flex flex-wrap gap-2">
          {themes
            .filter((t) => t.id !== theme.id)
            .map((t) => (
              <li key={t.id}>
                <Link
                  to={`/themes/${t.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2 hover:text-ink"
                >
                  <ThemeIcon theme={t} className="size-3.5 text-muted" />
                  {t.short}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  )
}
