import { motion } from 'framer-motion'
import { Coins } from 'lucide-react'
import type { Measure } from '../data/schema'
import { formatShortDate } from '../lib/format'
import { PrecisionBadge, SourceTypeBadge } from './Badges'
import { ExternalLink } from './ExternalLink'
import { cx } from './ui'

export function MeasureCard({ measure, accent, compact = false }: { measure: Measure; accent?: string; compact?: boolean }) {
  const secondary = measure.source_type !== 'officiel'
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cx('relative min-w-0 rounded-xl border border-line bg-surface', compact ? 'p-3.5' : 'p-4')}
    >
      {accent && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <SourceTypeBadge type={measure.source_type} />
        <PrecisionBadge precision={measure.precision} />
      </div>
      <h4 className="break-words text-[15px] font-semibold leading-snug text-ink">{measure.title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{measure.description}</p>

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
        <span className="ml-auto whitespace-nowrap" title="Date de dernière vérification">
          Vérifié le {formatShortDate(measure.last_verified)}
        </span>
      </footer>
    </motion.article>
  )
}
