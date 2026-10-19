import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Coins, Flag, Link2 } from 'lucide-react'
import type { Measure } from '../data/schema'
import { formatShortDate } from '../lib/format'
import { isNewMeasure, useNovelty } from '../lib/novelty'
import { reportUrl } from '../lib/report'
import { copyText, measureUrl } from '../lib/share'
import { NewBadge, PrecisionBadge, SourceTypeBadge } from './Badges'
import { ExternalLink } from './ExternalLink'
import { Glossed } from './Glossary'
import { cx } from './ui'

export function MeasureCard({
  measure,
  accent,
  compact = false,
  highlight = false,
}: {
  measure: Measure
  accent?: string
  compact?: boolean
  /** Mesure ouverte depuis la recherche : encadrée pour être repérée tout de suite. */
  highlight?: boolean
}) {
  const secondary = measure.source_type !== 'officiel'
  const since = useNovelty((s) => s.since)
  return (
    <motion.article
      id={`mesure-${measure.id}`}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cx('relative min-w-0 scroll-mt-24 rounded-xl border border-line bg-surface', compact ? 'p-3.5' : 'p-4', highlight && 'ring-2 ring-accent')}
    >
      {accent && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <SourceTypeBadge type={measure.source_type} />
        <PrecisionBadge precision={measure.precision} />
        {isNewMeasure(measure, since) && <NewBadge added={measure.added} />}
      </div>
      <h4 className="break-words text-[15px] font-semibold leading-snug text-ink">
        <Glossed text={measure.title} />
      </h4>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
        <Glossed text={measure.description} />
      </p>

      {measure.cost && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2">
          <Coins className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Coût estimé : {measure.cost.label}</span>
            {' · '}
            {measure.cost.source_url ? (
              <ExternalLink href={measure.cost.source_url} className="underline decoration-line underline-offset-2 hover:text-ink" icon={false}>
                {measure.cost.source_label}
              </ExternalLink>
            ) : (
              measure.cost.source_label
            )}
          </span>
        </p>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-xs text-muted">
        <ExternalLink href={measure.source_url} className="font-medium text-accent hover:underline">
          Source{measure.source_page ? ` (${measure.source_page})` : ''}
        </ExternalLink>
        <span className="line-clamp-2 min-w-0 max-w-full break-words" title={measure.source_title}>
          {measure.source_title}
          {measure.source_date && ` · ${formatShortDate(measure.source_date)}`}
        </span>
        {secondary && (
          <span className="italic">
            {measure.source_type === 'analyse_tierce' ? 'Source externe : ne provient pas du candidat' : 'Hors programme écrit'}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          <span className="whitespace-nowrap" title="Date de dernière vérification">
            Vérifié le {formatShortDate(measure.last_verified)}
          </span>
          <CopyLinkButton measure={measure} />
          <a
            href={reportUrl(measure)}
            target="_blank"
            rel="noopener noreferrer"
            className="no-print inline-flex items-center gap-1 whitespace-nowrap hover:text-ink"
            title="Ouvre un formulaire pré-rempli sur GitHub (compte GitHub nécessaire)"
            data-no-export="true"
          >
            <Flag className="size-3" aria-hidden="true" /> Signaler une erreur
            <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
          </a>
        </span>
      </footer>
    </motion.article>
  )
}

function CopyLinkButton({ measure }: { measure: Measure }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copied = state === 'copied'
  return (
    <button
      type="button"
      onClick={async () => {
        const url = measureUrl(measure)
        let result: typeof state = (await copyText(url)) ? 'copied' : 'failed'
        // Dernier recours (téléphones) : la feuille de partage du système.
        if (result === 'failed' && navigator.share) result = await navigator.share({ title: measure.title, url }).then(() => 'idle' as const, () => 'failed' as const)
        setState(result)
        window.setTimeout(() => setState('idle'), 2500)
      }}
      className="no-print inline-flex items-center gap-1 whitespace-nowrap hover:text-ink"
      title="Copier un lien direct vers cette mesure, à partager"
      data-no-export="true"
    >
      {copied ? <Check className="size-3 text-green-600" aria-hidden="true" /> : <Link2 className="size-3" aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Lien copié' : state === 'failed' ? 'Copie impossible' : 'Copier le lien'}</span>
    </button>
  )
}
