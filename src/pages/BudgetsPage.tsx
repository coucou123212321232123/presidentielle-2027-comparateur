import { Link } from 'react-router-dom'
import { candidates } from '../data'
import { budgets } from '../data/insights'
import type { CandidateBudget } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Badge, Card, PageHeader } from '../components/ui'
import { formatShortDate, fullName } from '../lib/format'

const LEVELS = {
  global: { label: 'Chiffrage d’ensemble', tone: 'green' },
  partiel: { label: 'Chiffrage partiel', tone: 'amber' },
  aucun: { label: 'Aucun publié', tone: 'neutral' },
} as const
const LEVEL_ORDER = { global: 0, partiel: 1, aucun: 2 }

function Figures({ b }: { b: CandidateBudget }) {
  if (b.level === 'aucun') return <span className="text-muted">Pas de chiffrage d'ensemble publié à notre connaissance</span>
  return (
    <ul className="space-y-0.5">
      {b.figures.map((f) => (
        <li key={f.label}>
          <span className="text-muted">{f.label} :</span> <span className="font-medium text-ink">{f.value}</span>
        </li>
      ))}
    </ul>
  )
}

function Source({ b }: { b: CandidateBudget }) {
  if (b.level === 'aucun') return null
  return (
    <span className="flex flex-wrap items-center gap-2">
      <SourceTypeBadge type={b.source_type} />
      <ExternalLink href={b.source_url} className="text-xs text-accent hover:underline" title={b.source_label}>
        {b.source_date ? formatShortDate(b.source_date) : 'Source'}
      </ExternalLink>
    </span>
  )
}

/** Chiffrages d'ensemble annoncés par les candidats, puis évaluations indépendantes (publiées ou annoncées). */
export default function BudgetsPage() {
  const rows = candidates
    .map((c) => ({ c, b: budgets.candidates[c.id] ?? ({ level: 'aucun' } as const) }))
    .sort((x, y) => LEVEL_ORDER[x.b.level] - LEVEL_ORDER[y.b.level])
  return (
    <div>
      <PageHeader eyebrow="Chiffrages" title="Combien ça coûte ?">
        Les chiffrages d'ensemble annoncés par les candidats eux-mêmes (économies, recettes, déficit visé), tels qu'ils les présentent : ils
        ne sont pas vérifiés et reposent sur leurs propres hypothèses. Vérifié au {formatShortDate(budgets.checked)}.
      </PageHeader>

      {/* Téléphone : une carte par candidat. */}
      <ul className="space-y-3 md:hidden">
        {rows.map(({ c, b }) => (
          <li key={c.id}>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Link to={`/candidats/${c.id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                  <CandidateAvatar candidate={c} size="sm" decorative />
                  <span className="truncate font-semibold text-ink">{fullName(c)}</span>
                </Link>
                <Badge tone={LEVELS[b.level].tone}>{LEVELS[b.level].label}</Badge>
              </div>
              <div className="mt-3 text-sm text-ink-2">
                <Figures b={b} />
              </div>
              {b.level !== 'aucun' && (
                <div className="mt-3">
                  <Source b={b} />
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {/* Ordinateur et tablette : tableau. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Chiffrages annoncés par les candidats</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th scope="col" className="p-3">Candidat</th>
              <th scope="col" className="p-3">Chiffrage</th>
              <th scope="col" className="p-3">Principaux chiffres annoncés</th>
              <th scope="col" className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, b }) => (
              <tr key={c.id} className="border-b border-line align-top last:border-0">
                <th scope="row" className="p-3 text-left font-normal">
                  <Link to={`/candidats/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                    <CandidateAvatar candidate={c} size="sm" decorative />
                    <span className="font-semibold text-ink">{fullName(c)}</span>
                  </Link>
                </th>
                <td className="p-3">
                  <Badge tone={LEVELS[b.level].tone}>{LEVELS[b.level].label}</Badge>
                </td>
                <td className="p-3 text-ink-2">
                  <Figures b={b} />
                </td>
                <td className="p-3">
                  <Source b={b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="mt-4 p-5">
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
      </Card>
    </div>
  )
}
