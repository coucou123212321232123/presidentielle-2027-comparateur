import { motion } from 'framer-motion'
import type { Candidate } from '../data/schema'
import { POSITION_LABELS, POSITION_ORDER } from '../lib/labels'
import { ExternalLink } from './ExternalLink'

/** Échelle gauche-droite indicative : un repère visuel, pas une mesure. */
export function PositionScale({ candidate, showSource = false }: { candidate: Candidate; showSource?: boolean }) {
  const idx = POSITION_ORDER.indexOf(candidate.position)
  const pct = (idx / (POSITION_ORDER.length - 1)) * 100
  // Libellé placé sous le point, sans déborder de l'échelle aux extrémités.
  const labelAlign = pct < 20 ? 'left' : pct > 80 ? 'right' : 'center'
  const labelStyle =
    labelAlign === 'left' ? { left: 0 } : labelAlign === 'right' ? { right: 0 } : { left: `${pct}%`, transform: 'translateX(-50%)' }

  return (
    <div>
      {/* Pas de libellés aux extrémités : « Gauche » à côté d'« Extrême gauche » serait contradictoire. Seule la position est nommée. */}
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted/80" aria-hidden="true">
        Positionnement indicatif
      </p>
      <div
        className="relative h-1.5 rounded-full bg-surface-2"
        role="img"
        aria-label={`Positionnement indicatif : ${POSITION_LABELS[candidate.position]}`}
      >
        {POSITION_ORDER.map((p, i) => (
          <span
            key={p}
            className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line"
            style={{ left: `${(i / (POSITION_ORDER.length - 1)) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        <motion.span
          initial={{ left: '50%', opacity: 0 }}
          animate={{ left: `${pct}%`, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
          style={{ backgroundColor: candidate.color }}
          aria-hidden="true"
        />
      </div>
      <div className="relative mt-2 h-4" aria-hidden="true">
        <span className="absolute whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-ink-2" style={labelStyle}>
          {POSITION_LABELS[candidate.position]}
        </span>
      </div>
      {showSource && candidate.position_source_url && (
        <p className="mt-1 text-[11px] text-muted">
          Positionnement indicatif, selon le classement usuel —{' '}
          <ExternalLink href={candidate.position_source_url} className="underline underline-offset-2 hover:text-ink" icon={false}>
            source
          </ExternalLink>
        </p>
      )}
    </div>
  )
}
