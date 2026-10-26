import { Link } from 'react-router-dom'
import { ChartNoAxesColumn, FileSearch } from 'lucide-react'
import type { Candidate, IndicatorDef, ThemeId } from '../data/schema'
import { countFor, summary, themes } from '../data'
import { budgets, context, hatvp } from '../data/insights'
import { formatShortDate, plural } from '../lib/format'
import { SourceTypeBadge } from './Badges'
import { ExternalLink } from './ExternalLink'
import { Card, cx } from './ui'

/** Libellé affiché d'une réponse à un point de comparaison. */
export const indicatorLabel = (def: IndicatorDef, value: string | number) =>
  def.type === 'enum' ? (def.options?.[String(value)] ?? String(value)) : `${value.toLocaleString('fr-FR')}${def.unit ? ` ${def.unit}` : ''}`

/** Date d'une source : « 2026 », « février 2026 » ou « 29/09/2026 ». */
const sourceDate = (d: string | null) => (!d ? null : d.length === 4 ? d : formatShortDate(d))

/** « Où en est-on aujourd'hui ? » : chiffres officiels de la situation actuelle sur un thème. */
export function ThemeContext({ theme, className }: { theme: ThemeId; className?: string }) {
  const figures = context.themes[theme] ?? []
  if (!figures.length) return null
  return (
    <Card className={cx('p-5', className)}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <ChartNoAxesColumn className="size-4 text-muted" aria-hidden="true" /> Où en est-on aujourd'hui ?
      </h2>
      <p className="mb-4 text-xs text-muted">Derniers chiffres publiés par des sources officielles ou de référence, pour situer les propositions.</p>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {figures.map((f) => (
          <div key={f.label} className="rounded-xl border border-line bg-surface-2/40 p-3">
            <dt className="text-xs font-medium text-muted">{f.label}</dt>
            <dd className="mt-0.5">
              <span className="block font-display text-xl font-semibold leading-tight text-ink">{f.value}</span>
              {f.detail && <span className="mt-1 block text-xs leading-relaxed text-ink-2">{f.detail}</span>}
              <ExternalLink href={f.source_url} className="mt-1.5 text-[11px] text-muted hover:text-ink" title={f.source_label}>
                <span className="line-clamp-1">
                  {f.source_label}
                  {sourceDate(f.date) && ` · ${sourceDate(f.date)}`}
                </span>
              </ExternalLink>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

const LEVEL_LABELS = {
  global: { label: 'Chiffrage d’ensemble publié', tone: 'green' },
  partiel: { label: 'Chiffrage partiel', tone: 'amber' },
  aucun: { label: 'Pas de chiffrage d’ensemble', tone: 'neutral' },
} as const

/** Niveau de chiffrage d'un candidat, pour le résumé de la section. */
export const budgetLevel = (candidate: Candidate) => LEVEL_LABELS[(budgets.candidates[candidate.id] ?? { level: 'aucun' }).level]

/** Chiffrage d'ensemble annoncé par un candidat (économies, recettes, déficit visé), avec sa source. */
export function BudgetDetails({ candidate }: { candidate: Candidate }) {
  const b = budgets.candidates[candidate.id] ?? { level: 'aucun' as const }
  return (
    <div>
      {b.level === 'aucun' ? (
        <p className="text-sm text-ink-2">
          Aucun chiffrage d'ensemble (économies, recettes, déficit visé) n'a été publié à notre connaissance au{' '}
          {formatShortDate(budgets.checked)}.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink-2">{b.summary}</p>
          <dl className="mt-3 space-y-1.5">
            {b.figures.map((f) => (
              <div key={f.label} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line/60 pb-1.5 text-sm last:border-0">
                <dt className="text-muted">{f.label}</dt>
                <dd className="font-semibold text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SourceTypeBadge type={b.source_type} />
            <ExternalLink href={b.source_url} className="text-xs font-medium text-accent hover:underline" title={b.source_label}>
              Source{b.source_date ? ` (${formatShortDate(b.source_date)})` : ''}
            </ExternalLink>
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-muted">
        Montants annoncés par le candidat ou son parti, non vérifiés.{' '}
        <Link to="/programmes#chiffrages" className="underline hover:text-ink">
          Comparer les chiffrages
        </Link>
      </p>
    </div>
  )
}

/** Résumé de la section HATVP. */
export const hatvpHint = (candidate: Candidate) => (hatvp.candidates[candidate.id] ? 'Déclarations publiées' : 'Pas de page à la HATVP')

/** Lien vers les déclarations d'intérêts et de patrimoine publiées par la HATVP, quand le candidat en a une. */
export function TransparencyDetails({ candidate }: { candidate: Candidate }) {
  const h = hatvp.candidates[candidate.id]
  return (
    <div>
      {h ? (
        <>
          <p className="text-sm leading-relaxed text-ink-2">
            Déclarations déposées auprès de la Haute Autorité pour la transparence de la vie publique (HATVP), au titre de son mandat :{' '}
            {h.mandate}.
          </p>
          <ExternalLink href={h.url} className="mt-2 text-sm font-medium text-accent hover:underline">
            Voir ses déclarations sur hatvp.fr
          </ExternalLink>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-ink-2">
          Aucune page à la HATVP : seuls les élus et responsables publics en fonction y déposent des déclarations publiées.
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Les candidats retenus par le Conseil constitutionnel déposent une déclaration de patrimoine, rendue publique avant le premier tour.
      </p>
    </div>
  )
}

const STATUS_TEXT = {
  publie: 'Programme complet publié : les mesures ci-dessous en sont tirées, complétées par ses déclarations.',
  partiel:
    'Programme partiel : le candidat a publié une partie de ses propositions (livrets, site de campagne) ; les autres positions viennent de ses déclarations.',
  en_cours_d_elaboration: 'Pas encore de programme : les positions ci-dessous sont tirées de ses déclarations publiques.',
} as const

/** Ce que couvre la fiche : nombre de mesures relevées, et de quoi il dépend (dépliable), pour lire les écarts entre candidats. */
export function CoverageNote({ candidate }: { candidate: Candidate }) {
  const total = countFor(candidate.id)
  const s = summary[candidate.id]
  const covered = Object.keys(s?.byTheme ?? {}).length
  return (
    <details className="group mt-4 rounded-xl border border-line bg-surface-2/40 px-4 py-2.5 text-sm">
      <summary className="flex cursor-pointer list-none items-start gap-2 text-ink-2 [&::-webkit-details-marker]:hidden">
        <FileSearch className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <strong className="font-semibold text-ink">{plural(total, 'mesure relevée', 'mesures relevées')}</strong> sur {covered} des{' '}
          {themes.length} thèmes, dont {s?.official ?? 0} tirée{(s?.official ?? 0) > 1 ? 's' : ''} du programme ou du site officiel.{' '}
          <span className="whitespace-nowrap text-xs font-medium text-muted underline-offset-2 group-open:hidden hover:underline">D'où vient ce nombre ?</span>
        </span>
      </summary>
      <p className="mt-2 leading-relaxed text-ink-2">{STATUS_TEXT[candidate.program.status]}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        Le nombre de mesures dépend de ce que le candidat a publié à ce jour : il ne juge ni la qualité ni le sérieux d'un programme.
      </p>
    </details>
  )
}
