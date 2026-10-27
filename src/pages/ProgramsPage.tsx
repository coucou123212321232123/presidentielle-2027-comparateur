import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowRight, Calculator } from 'lucide-react'
import { candidates } from '../data'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { FormatIcon, ProgramStatusBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Card, PageHeader } from '../components/ui'
import { FORMAT_LABELS } from '../lib/labels'
import { formatShortDate, fullName } from '../lib/format'

export default function ProgramsPage() {
  const { hash } = useLocation()
  // Anciens liens vers la section des chiffrages, devenue la page /chiffrages.
  if (hash === '#chiffrages') return <Navigate to="/chiffrages" replace />
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
      <Link to="/chiffrages" className="group mt-6 block">
        <Card className="flex items-center gap-4 p-5 transition-colors group-hover:bg-surface-2/60">
          <Calculator className="size-6 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">Combien ça coûte ?</span>
            <span className="block text-sm text-ink-2">Les chiffrages annoncés par chaque candidat, et les évaluations indépendantes.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Card>
      </Link>
    </div>
  )
}
