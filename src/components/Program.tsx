import { useState } from 'react'
import { Archive, BookOpenText, CalendarDays, ChevronDown, Newspaper } from 'lucide-react'
import type { Candidate, ThemeId } from '../data/schema'
import { themeById } from '../data'
import { formatDate } from '../lib/format'
import { FORMAT_LABELS } from '../lib/labels'
import { FormatIcon, ProgramStatusBadge } from './Badges'
import { ExternalLink } from './ExternalLink'
import { Card, cx } from './ui'

/** Bouton secondaire « Voir le programme » (cartes de la page d'accueil). */
export function ProgramButton({ candidate, className }: { candidate: Candidate; className?: string }) {
  const p = candidate.program
  const base =
    'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:border-ink-2/40 hover:text-ink'
  if (!p.main_url) {
    return candidate.news_url ? (
      <ExternalLink href={candidate.news_url} className={cx(base, className)} title="Programme pas encore publié : page d'actualité officielle">
        <Newspaper className="size-3.5" aria-hidden="true" /> Programme pas encore publié
      </ExternalLink>
    ) : (
      <span className={cx(base, 'cursor-default opacity-70', className)}>Programme pas encore publié</span>
    )
  }
  return (
    <ExternalLink href={p.main_url} archiveUrl={p.archive_url} className={cx(base, className)} title={`${p.title ?? 'Programme'} (${FORMAT_LABELS[p.format]})`}>
      <FormatIcon format={p.format} className="size-3.5" /> Voir le programme
    </ExternalLink>
  )
}

/** Lien « Lire cette partie du programme » pour un thème : livret thématique → document principal → mention explicite. */
export function ThemeProgramLink({ candidate, theme }: { candidate: Candidate; theme: ThemeId }) {
  const links = candidate.program.thematic_links.filter((l) => l.theme === theme)
  if (links.length) {
    return (
      <div className="flex flex-col gap-1">
        {links.map((l) => (
          <ExternalLink key={l.url} href={l.url} className="text-sm font-medium text-accent hover:underline">
            <FormatIcon format={l.format} className="size-3.5" />
            Lire cette partie du programme
            {l.page_range && <span className="text-muted"> · {l.page_range}</span>}
          </ExternalLink>
        ))}
      </div>
    )
  }
  if (candidate.program.main_url) {
    return (
      <ExternalLink href={candidate.program.main_url} archiveUrl={candidate.program.archive_url} className="text-sm font-medium text-accent hover:underline">
        <FormatIcon format={candidate.program.format} className="size-3.5" />
        Lire le programme complet
        <span className="text-muted"> (pas de document dédié à ce thème)</span>
      </ExternalLink>
    )
  }
  return <p className="text-sm text-muted">Pas de document sur ce thème</p>
}

/** Bloc « Programme officiel » en tête de fiche candidat. */
/** Livrets affichés d'emblée : les autres restent accessibles par un bouton (et dans chaque thème, plus bas). */
const LIVRETS_VISIBLE = 6

export function ProgramBlock({ candidate }: { candidate: Candidate }) {
  const p = candidate.program
  const [allLinks, setAllLinks] = useState(false)
  const [fullNote, setFullNote] = useState(false)
  const links = allLinks ? p.thematic_links : p.thematic_links.slice(0, LIVRETS_VISIBLE)
  const hidden = p.thematic_links.length - LIVRETS_VISIBLE
  const longNote = (p.note?.length ?? 0) > 320
  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: candidate.color }} aria-hidden="true" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Programme officiel</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink sm:text-2xl">
              {p.title ?? (p.main_url ? 'Document de programme' : 'Programme pas encore publié')}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <ProgramStatusBadge status={p.status} />
              <span className="inline-flex items-center gap-1">
                <FormatIcon format={p.format} className="size-3.5" /> {FORMAT_LABELS[p.format]}
              </span>
              {p.published_date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden="true" /> Publié le {formatDate(p.published_date)}
                </span>
              )}
            </div>
          </div>
          {p.main_url ? (
            <ExternalLink
              href={p.main_url}
              archiveUrl={p.archive_url}
              className="rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span className="inline-flex items-center gap-1.5" style={{ color: candidate.color }}>
                <BookOpenText className="size-4" aria-hidden="true" /> Ouvrir le programme
              </span>
            </ExternalLink>
          ) : (
            candidate.news_url && (
              <ExternalLink href={candidate.news_url} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:text-ink">
                <Newspaper className="size-4" aria-hidden="true" /> Actualité officielle du candidat
              </ExternalLink>
            )
          )}
        </div>

        {p.note && (
          <div className="mt-4 text-sm leading-relaxed text-ink-2">
            <p className={cx(longNote && !fullNote && 'line-clamp-3')}>{p.note}</p>
            {longNote && (
              <button type="button" onClick={() => setFullNote((v) => !v)} className="mt-1 text-xs font-medium text-muted hover:text-ink">
                {fullNote ? 'Réduire' : 'Lire la suite'}
              </button>
            )}
          </div>
        )}
        {!p.main_url && (
          <p className="mt-4 text-sm text-ink-2">
            Programme en cours d'élaboration : seules les positions sourcées publiquement sont affichées ci-dessous.
          </p>
        )}

        {p.thematic_links.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Livrets et pages thématiques</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {links.map((l) => (
                <li key={l.url + l.theme} className="min-w-0">
                  <ExternalLink href={l.url} className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:border-ink-2/40 hover:text-ink">
                    <FormatIcon format={l.format} className="size-3.5 shrink-0" />
                    <span className="line-clamp-2 min-w-0 flex-1 break-words">
                      <span className="font-medium text-ink">{themeById[l.theme]?.short}</span> · {l.title}
                      {l.page_range && ` (${l.page_range})`}
                    </span>
                  </ExternalLink>
                </li>
              ))}
            </ul>
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setAllLinks((v) => !v)}
                aria-expanded={allLinks}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
              >
                {allLinks ? 'Réduire la liste' : `Voir les ${hidden} autres livrets`}
                <ChevronDown className={cx('size-4 transition-transform', allLinks && 'rotate-180')} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {p.archive_url && (
          <p className="mt-4 text-xs text-muted">
            <ExternalLink href={p.archive_url} className="hover:text-ink">
              <Archive className="size-3.5" aria-hidden="true" /> Copie archivée du programme (Wayback Machine)
            </ExternalLink>
          </p>
        )}
      </div>
    </Card>
  )
}
