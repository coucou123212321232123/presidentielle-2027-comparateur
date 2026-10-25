import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Calculator } from 'lucide-react'
import { candidates } from '../data'
import { budgets } from '../data/insights'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { FormatIcon, ProgramStatusBadge, SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Badge, Card, PageHeader } from '../components/ui'
import { FORMAT_LABELS } from '../lib/labels'
import { formatShortDate, fullName } from '../lib/format'

const LEVELS = {
  global: { label: 'Chiffrage d’ensemble', tone: 'green' },
  partiel: { label: 'Chiffrage partiel', tone: 'amber' },
  aucun: { label: 'Aucun publié', tone: 'neutral' },
} as const
const LEVEL_ORDER = { global: 0, partiel: 1, aucun: 2 }

/** Chiffrages d'ensemble annoncés par les candidats, puis évaluations indépendantes (publiées ou annoncées). */
function Budgets() {
  const rows = candidates
    .map((c) => ({ c, b: budgets.candidates[c.id] ?? { level: 'aucun' as const } }))
    .sort((x, y) => LEVEL_ORDER[x.b.level] - LEVEL_ORDER[y.b.level])
  return (
    <section id="chiffrages" className="mt-14 scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <Calculator className="size-5 text-muted" aria-hidden="true" /> Combien ça coûte ?
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
        Les chiffrages d'ensemble annoncés par les candidats eux-mêmes (économies, recettes, déficit visé), tels qu'ils les présentent : ils
        ne sont pas vérifiés et reposent sur leurs propres hypothèses. Vérifié au {formatShortDate(budgets.checked)}.
      </p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
        <table className="w-full min-w-[760px] text-sm">
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
                  {b.level === 'aucun' ? (
                    <span className="text-muted">Pas de chiffrage d'ensemble publié à notre connaissance</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {b.figures.map((f) => (
                        <li key={f.label}>
                          <span className="text-muted">{f.label} :</span> <span className="font-medium text-ink">{f.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-3">
                  {b.level !== 'aucun' && (
                    <span className="flex flex-col items-start gap-1">
                      <SourceTypeBadge type={b.source_type} />
                      <ExternalLink href={b.source_url} className="text-xs text-accent hover:underline" title={b.source_label}>
                        {b.source_date ? formatShortDate(b.source_date) : 'Source'}
                      </ExternalLink>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-ink">Évaluations indépendantes</h3>
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
    </section>
  )
}

export default function ProgramsPage() {
  const { hash } = useLocation()
  // Lien direct vers une section (ex. /programmes#chiffrages depuis une fiche candidat).
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])
  return (
    <div>
      <PageHeader eyebrow="Programmes" title="Accès aux programmes officiels">
        Tous les documents de programme recensés, avec leur format, leur date de publication et leur statut. Les liens s'ouvrent dans un
        nouvel onglet ; un lien qui ne répond plus bascule automatiquement vers sa copie archivée lorsqu'elle existe.
      </PageHeader>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Récapitulatif des programmes des candidats</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th scope="col" className="p-3">Candidat</th>
              <th scope="col" className="p-3">Document</th>
              <th scope="col" className="p-3">Format</th>
              <th scope="col" className="p-3">Publication</th>
              <th scope="col" className="p-3">Statut</th>
              <th scope="col" className="p-3">Livrets</th>
              <th scope="col" className="p-3">Archive</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const p = c.program
              return (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 text-left font-normal">
                    <Link to={`/candidats/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                      <CandidateAvatar candidate={c} size="sm" decorative />
                      <span>
                        <span className="block font-semibold text-ink">{fullName(c)}</span>
                        <span className="block text-xs text-muted">{c.party_short}</span>
                      </span>
                    </Link>
                  </th>
                  <td className="max-w-xs p-3">
                    {p.main_url ? (
                      <ExternalLink href={p.main_url} archiveUrl={p.archive_url} className="font-medium text-accent hover:underline">
                        {p.title ?? 'Voir le programme'}
                      </ExternalLink>
                    ) : (
                      <span className="text-muted">
                        Programme pas encore publié
                        {c.news_url && (
                          <>
                            {' · '}
                            <ExternalLink href={c.news_url} className="text-accent hover:underline">
                              actualité
                            </ExternalLink>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <FormatIcon format={p.format} className="size-4" /> {FORMAT_LABELS[p.format]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 tabular-nums text-ink-2">{formatShortDate(p.published_date)}</td>
                  <td className="p-3">
                    <ProgramStatusBadge status={p.status} />
                  </td>
                  <td className="p-3 tabular-nums text-ink-2">{p.thematic_links.length || '—'}</td>
                  <td className="p-3">
                    {p.archive_url ? (
                      <ExternalLink href={p.archive_url} className="text-xs text-muted hover:text-ink">
                        Wayback
                      </ExternalLink>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Budgets />
    </div>
  )
}
