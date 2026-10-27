import { Link } from 'react-router-dom'
import { ChevronDown, Info } from 'lucide-react'
import { candidates, summary, themeById } from '../data'
import { budgets, context } from '../data/insights'
import type { BudgetKind, Candidate, CandidateBudget } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Badge, Card, PageHeader } from '../components/ui'
import { formatShortDate, fullName, plural } from '../lib/format'

const LEVELS = {
  global: { label: 'Chiffrage d’ensemble', tone: 'green' },
  partiel: { label: 'Chiffrage partiel', tone: 'amber' },
  aucun: { label: 'Aucun chiffrage d’ensemble', tone: 'neutral' },
} as const
const LEVEL_ORDER = { global: 0, partiel: 1, aucun: 2 }

/** Grille commune : les mêmes cases pour chaque candidat, « Non précisé » quand rien n'est annoncé. */
const GRID: { kind: Exclude<BudgetKind, 'autre'>; label: string }[] = [
  { kind: 'economies', label: 'Économies' },
  { kind: 'recettes', label: 'Recettes nouvelles' },
  { kind: 'depenses', label: 'Dépenses nouvelles' },
  { kind: 'baisse_prelevements', label: 'Baisses d’impôts ou de cotisations' },
  { kind: 'deficit', label: 'Déficit visé' },
  { kind: 'dette', label: 'Dette visée' },
]

/** Repères officiels, repris des chiffres de contexte (Insee) : on les retrouve par leur libellé. */
const REFERENCE_LABELS = ['Déficit public', 'Dette publique', 'Prélèvements obligatoires', 'PIB (richesse produite en 2025)']
const references = REFERENCE_LABELS.map((label) => Object.values(context.themes).flat().find((f) => f.label === label)).filter((f) => f !== undefined)

function References() {
  if (!references.length) return null
  return (
    <section aria-labelledby="reperes" className="mb-8">
      <h2 id="reperes" className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Repères : où en sont les finances publiques ?
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {references.map((f) => (
          <li key={f.label}>
            <Card className="h-full p-4">
              <p className="text-xs font-medium text-muted">{f.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{f.value}</p>
              {f.detail && <p className="mt-1 text-xs leading-relaxed text-ink-2">{f.detail}</p>}
              <ExternalLink href={f.source_url} className="mt-2 text-[11px] text-muted hover:text-ink" title={f.source_label}>
                {f.source_label.split(' – ')[0]}
                {f.date ? `, ${formatShortDate(f.date)}` : ''}
              </ExternalLink>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Grid({ b }: { b: CandidateBudget }) {
  const figures = b.level === 'aucun' ? [] : b.figures
  const others = figures.filter((f) => f.kind === 'autre')
  return (
    <>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {GRID.map((g) => {
          const values = figures.filter((f) => f.kind === g.kind)
          return (
            <div key={g.kind} className="bg-surface p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{g.label}</dt>
              {values.length ? (
                values.map((f) => (
                  <dd key={f.label} className="mt-1 text-sm font-semibold text-ink">
                    {f.label !== g.label && <span className="block text-xs font-normal text-muted">{f.label}</span>}
                    {f.value}
                  </dd>
                ))
              ) : (
                <dd className="mt-1 text-sm text-muted">Non précisé</dd>
              )}
            </div>
          )
        })}
      </dl>
      {others.length > 0 && (
        <p className="mt-2 text-sm text-ink-2">
          {others.map((f) => (
            <span key={f.label} className="mr-3">
              <span className="text-muted">{f.label} :</span> <span className="font-semibold text-ink">{f.value}</span>
            </span>
          ))}
        </p>
      )}
    </>
  )
}

/** Montants annoncés mesure par mesure (coût, économie, recette), tels que la source les donne. */
function CostedMeasures({ c }: { c: Candidate }) {
  const list = summary[c.id]?.costed ?? []
  if (!list.length) return <p className="mt-4 text-sm text-muted">Aucun montant relevé mesure par mesure à ce jour.</p>
  return (
    <details className="group mt-4">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink hover:underline [&::-webkit-details-marker]:hidden">
        Ses montants annoncés, mesure par mesure ({list.length})
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {list.map((m) => (
          <li key={m.measure} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <span className="min-w-0">
              <Link to={`/candidats/${c.id}?theme=${m.theme}&mesure=${m.measure}`} className="text-sm font-medium text-ink hover:underline">
                {m.title}
              </Link>
              <span className="block text-xs text-muted">{themeById[m.theme]?.short}</span>
            </span>
            <span className="shrink-0 text-sm sm:max-w-[45%] sm:text-right">
              <span className="font-semibold text-ink">{m.cost}</span>
              {m.source_url && (
                <ExternalLink href={m.source_url} className="ml-2 text-xs text-accent hover:underline" title={m.source_label}>
                  Source
                </ExternalLink>
              )}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** Chiffrages d'ensemble annoncés par les candidats, montants mesure par mesure, puis évaluations indépendantes. */
export default function BudgetsPage() {
  const rows = candidates
    .map((c) => ({ c, b: budgets.candidates[c.id] ?? ({ level: 'aucun' } as const) }))
    .sort((x, y) => LEVEL_ORDER[x.b.level] - LEVEL_ORDER[y.b.level])
  const costedTotal = candidates.reduce((n, c) => n + (summary[c.id]?.costed.length ?? 0), 0)
  return (
    <div>
      <PageHeader eyebrow="Chiffrages" title="Combien ça coûte ?">
        Les chiffrages annoncés par les candidats eux-mêmes (économies, recettes, déficit visé), tels qu'ils les présentent : ils ne sont
        pas vérifiés et reposent sur leurs propres hypothèses. Vérifié au {formatShortDate(budgets.checked)}.
      </PageHeader>

      <References />

      <p className="mb-6 flex items-start gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <span>
          Chaque candidat a la même grille. « Non précisé » signifie qu'aucun chiffre n'a été annoncé sur ce point. Sous chaque candidat, les
          montants donnés mesure par mesure ({plural(costedTotal, 'mesure', 'mesures')} à ce jour) : certains candidats publient plus de
          chiffres que d'autres, et le relevé se poursuit. L'absence de montant ne veut pas dire qu'une mesure ne coûte rien.
        </span>
      </p>

      <ul className="space-y-4">
        {rows.map(({ c, b }) => (
          <li key={c.id}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to={`/candidats/${c.id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                  <CandidateAvatar candidate={c} size="sm" decorative />
                  <span className="truncate font-semibold text-ink">{fullName(c)}</span>
                  <span className="text-xs text-muted">{c.party_short}</span>
                </Link>
                <Badge tone={LEVELS[b.level].tone}>{LEVELS[b.level].label}</Badge>
              </div>
              {b.level !== 'aucun' && <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.summary}</p>}
              <div className="mt-3">
                <Grid b={b} />
              </div>
              {b.level !== 'aucun' && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <SourceTypeBadge type={b.source_type} />
                  <ExternalLink href={b.source_url} className="text-accent hover:underline">
                    {b.source_label}
                    {b.source_date ? ` (${formatShortDate(b.source_date)})` : ''}
                  </ExternalLink>
                </p>
              )}
              <CostedMeasures c={c} />
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-8 p-5">
        <h2 className="text-sm font-semibold text-ink">Évaluations indépendantes</h2>
        <p className="mt-1 text-sm text-ink-2">{budgets.independent.note}</p>
        {budgets.independent.items.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {budgets.independent.items.map((i) => (
              <li key={i.org + i.label} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-ink">{i.org}</span>
                <span className="text-ink-2">· {i.label}</span>
                <Badge tone={i.status === 'publie' ? 'green' : 'neutral'}>{i.when}</Badge>
                <ExternalLink href={i.source_url} className="text-xs text-accent hover:underline" title={i.source_label}>
                  Source
                </ExternalLink>
              </li>
            ))}
          </ul>
        )}
        {budgets.independent.precedents && budgets.independent.precedents.length > 0 && (
          <>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Lors de la présidentielle précédente</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {budgets.independent.precedents.map((p) => (
                <li key={p.org + p.label} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-ink">{p.org}</span>
                  <span className="text-ink-2">· {p.label}</span>
                  <span className="text-xs text-muted">({p.when})</span>
                  <ExternalLink href={p.source_url} className="text-xs text-accent hover:underline" title={p.source_label}>
                    Source
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
