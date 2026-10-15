import type { ReactNode } from 'react'
import { Archive, ArrowUpRight, Link2Off } from 'lucide-react'
import { resolveLink } from '../lib/links'
import { cx } from './ui'

/**
 * Lien externe sécurisé (nouvel onglet, noopener) qui tient compte du rapport de liens :
 * bascule sur l'archive si le lien est cassé, ou affiche « Lien indisponible ».
 */
export function ExternalLink({
  href,
  archiveUrl,
  children,
  className,
  icon = true,
  title,
}: {
  href: string | null | undefined
  archiveUrl?: string | null
  children: ReactNode
  className?: string
  icon?: boolean
  title?: string
}) {
  const { href: resolved, state } = resolveLink(href, archiveUrl)
  if (!resolved) {
    return (
      <span className={cx('inline-flex items-center gap-1 text-muted', className)} title="Ce lien ne répond plus et aucune archive n'a été trouvée">
        <Link2Off className="size-3.5" aria-hidden="true" />
        Lien indisponible
      </span>
    )
  }
  return (
    <a
      href={resolved}
      target="_blank"
      rel="noopener noreferrer"
      title={state === 'archive' ? 'Le lien original ne répond plus : copie archivée (Wayback Machine)' : title}
      className={cx('inline-flex items-center gap-1', className)}
    >
      {children}
      {state === 'archive' && (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <Archive className="size-3" aria-hidden="true" />
          archive
        </span>
      )}
      {icon && <ArrowUpRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />}
      <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
    </a>
  )
}
