import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Columns3, GitCompareArrows } from 'lucide-react'
import { candidates, summary, themes } from '../data'
import type { Candidate, IndicatorDef, Theme } from '../data/schema'
import type { Stance } from '../data/summary'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { ThemeIcon } from '../components/ThemeIcon'
import { ThemeContext, indicatorLabel } from '../components/Insights'
import { Card, PageHeader, cx } from '../components/ui'
import { plural } from '../lib/format'

const withIndicators = themes.filter((t) => t.indicators.length > 0)
const questionCount = withIndicators.reduce((n, t) => n + t.indicators.length, 0)

/** Réponses des candidats à un point de comparaison, regroupées par réponse (dans l'ordre des options). */
function groupsFor(def: IndicatorDef) {
  const answered = candidates.flatMap((c) => {
    const s = summary[c.id]?.positions[def.key]
    return s ? [{ c, s }] : []
  })
  const values =
    def.type === 'enum'
      ? Object.keys(def.options ?? {}).filter((v) => answered.some((a) => String(a.s.value) === v))
      : [...new Set(answered.map((a) => a.s.value))].sort((a, b) => Number(a) - Number(b)).map(String)
  return {
    groups: values.map((v) => ({ value: v, label: indicatorLabel(def, def.type === 'number' ? Number(v) : v), items: answered.filter((a) => String(a.s.value) === v) })),
    missing: candidates.filter((c) => !summary[c.id]?.positions[def.key]),
  }
}

function CandidateChip({ candidate, stance }: { candidate: Candidate; stance: Stance }) {
  return (
    <li>
      <Link
        to={`/candidats/${candidate.id}?theme=${stance.theme}&mesure=${stance.measure}`}
        title={`${candidate.first_name} ${candidate.last_name} : « ${stance.title} » (voir la mesure et sa source)`}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-2.5 text-sm text-ink transition-colors hover:border-ink-2/40"
      >
        <CandidateAvatar candidate={candidate} size="sm" className="!size-6 !text-[10px]" decorative />
        {candidate.last_name}
      </Link>
    </li>
  )
}

export function Question({ def, linked = true }: { def: IndicatorDef; linked?: boolean }) {
  const { groups, missing } = groupsFor(def)
  return (
    <div className="rounded-xl border border-line p-4">
      <h3 className="font-semibold text-ink">
        {linked ? (
          <Link to={`/positions/${def.key}`} className="hover:underline">
            {def.label}
          </Link>
        ) : (
          def.label
        )}
      </h3>
      {groups.length > 1 && (
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
          <GitCompareArrows className="size-3.5" aria-hidden="true" /> {groups.length} positions différentes
        </p>
      )}
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g.value}>
            <p className="mb-1.5 text-sm font-medium text-ink-2">
              {g.label} <span className="font-normal text-muted">· {plural(g.items.length, 'candidat', 'candidats')}</span>
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {g.items.map(({ c, s }) => (
                <CandidateChip key={c.id} candidate={c} stance={s} />
              ))}
            </ul>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-muted">Aucune position relevée pour l'instant.</p>}
      </div>
      {missing.length > 0 && (
        <p className="mt-3 border-t border-line pt-2 text-xs leading-relaxed text-muted">
          <span className="font-medium">Pas de position relevée :</span> {missing.map((c) => c.last_name).join(', ')}
        </p>
      )}
    </div>
  )
}

function ThemeSection({ theme }: { theme: Theme }) {
  return (
    <section id={`theme-${theme.id}`} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 font-display text-xl font-semibold text-ink">
          <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
            <ThemeIcon theme={theme} />
          </span>
          {theme.label}
        </h2>
        <Link to={`/comparateur?theme=${theme.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <Columns3 className="size-4" aria-hidden="true" /> Toutes les mesures du thème
        </Link>
      </div>
      <ThemeContext theme={theme.id} className="mb-3" />
      <div className="grid gap-3 md:grid-cols-2">
        {theme.indicators.map((def) => (
          <Question key={def.key} def={def} />
        ))}
      </div>
    </section>
  )
}

/** Une seule question (/positions/isf/, pages indexées) : la question, ses réponses et les chiffres de contexte du thème. */
function QuestionPage({ def, theme }: { def: IndicatorDef; theme: Theme }) {
  return (
    <div>
      <Link to="/positions" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Toutes les questions
      </Link>
      <PageHeader eyebrow={theme.label} title={`${def.label} : qui propose quoi ?`}>
        La position de chaque candidat, telle qu'elle est écrite dans sa source : cliquez sur un nom pour voir la mesure et sa source.
        « Pas de position relevée » signifie qu'aucune source n'a été trouvée, pas que le candidat n'a pas d'avis.
      </PageHeader>
      <div className="max-w-3xl">
        <Question def={def} linked={false} />
      </div>
      <ThemeContext theme={theme.id} className="mt-8" />
      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link to={`/themes/${theme.id}`} className="font-medium text-accent hover:underline">
          {theme.label} : toutes les propositions des candidats
        </Link>
        <Link to={`/positions?theme=${theme.id}`} className="font-medium text-accent hover:underline">
          Les autres questions du thème
        </Link>
      </p>
    </div>
  )
}

export default function PositionsPage() {
  const { question } = useParams()
  const [params, setParams] = useSearchParams()
  const asked = withIndicators.flatMap((t) => t.indicators.map((def) => ({ def, theme: t }))).find((q) => q.def.key === question)
  if (asked) return <QuestionPage {...asked} />
  const current = withIndicators.find((t) => t.id === params.get('theme'))
  const shown = current ? [current] : withIndicators
  const chip = (active: boolean) =>
    cx(
      'whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition-colors',
      active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:text-ink',
    )
  return (
    <div>
      <PageHeader eyebrow="Positions clés" title="Qui propose quoi ?">
        {questionCount} questions qui divisent les candidats, de la retraite au nucléaire. Une réponse n'est affichée que si elle est écrite
        telle quelle dans une source : cliquez sur un nom pour voir la mesure et sa source. « Pas de position relevée » signifie qu'aucune
        source n'a été trouvée, pas que le candidat n'a pas d'avis.
      </PageHeader>

      <nav aria-label="Filtrer par thème" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" className={chip(!current)} aria-pressed={!current} onClick={() => setParams({}, { replace: true })}>
          Tous les thèmes
        </button>
        {withIndicators.map((t) => (
          <button
            key={t.id}
            type="button"
            className={chip(current?.id === t.id)}
            aria-pressed={current?.id === t.id}
            onClick={() => setParams({ theme: t.id }, { replace: true })}
          >
            {t.short}
          </button>
        ))}
      </nav>

      <div className="space-y-12">
        {shown.map((t) => (
          <ThemeSection key={t.id} theme={t} />
        ))}
      </div>

      <Card className="mt-12 p-5 text-sm text-ink-2">
        Ces questions ne résument pas les programmes : elles servent de repères. Pour tout voir, ouvrez le{' '}
        <Link to="/comparateur" className="font-medium text-accent hover:underline">
          comparateur
        </Link>{' '}
        ou la fiche de chaque candidat.
      </Card>
    </div>
  )
}
