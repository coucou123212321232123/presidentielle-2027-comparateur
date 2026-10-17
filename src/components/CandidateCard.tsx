import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Candidate } from '../data/schema'
import { measuresFor } from '../data'
import { fullName, plural } from '../lib/format'
import { CandidateAvatar } from './CandidateAvatar'
import { StatusBadge } from './Badges'
import { PositionScale } from './PositionScale'
import { ProgramButton } from './Program'

export const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  const measures = measuresFor(candidate.id)
  const themeCount = new Set(measures.map((m) => m.theme)).size
  return (
    <motion.article
      variants={cardVariants}
      layout
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="h-1.5" style={{ backgroundColor: candidate.color }} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <CandidateAvatar candidate={candidate} size="lg" />
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="font-display text-xl font-semibold leading-tight text-ink">
              <Link to={`/candidats/${candidate.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                {fullName(candidate)}
              </Link>
            </h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-2" title={candidate.party}>
              {candidate.party}
            </p>
            <div className="mt-2">
              <StatusBadge status={candidate.status} />
            </div>
          </div>
        </div>

        {candidate.slogan && (
          <p className="mt-4 line-clamp-2 font-display text-[15px] italic leading-snug text-ink-2">« {candidate.slogan} »</p>
        )}

        {/* Échelle et actions ancrées en bas : alignées d'une carte à l'autre quelle que soit la hauteur de l'en-tête. */}
        <div className="mt-auto pt-5">
          <PositionScale candidate={candidate} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <ProgramButton candidate={candidate} className="relative z-10 whitespace-nowrap" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted transition-colors group-hover:text-ink">
              {plural(measures.length, 'mesure', 'mesures')} · {plural(themeCount, 'thème', 'thèmes')}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
