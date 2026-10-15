import { useState } from 'react'
import type { Candidate } from '../data/schema'
import { fullName, initials, readableOn } from '../lib/format'
import { cx } from './ui'

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-20 text-xl',
  xl: 'size-28 sm:size-32 text-3xl',
}

export function CandidateAvatar({
  candidate,
  size = 'md',
  className,
  decorative = false,
}: {
  candidate: Candidate
  size?: keyof typeof SIZES
  className?: string
  decorative?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const photo = candidate.photo && !failed ? candidate.photo : null
  const alt = decorative ? '' : `Portrait de ${fullName(candidate)}`

  return (
    <span
      className={cx('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold', SIZES[size], className)}
      style={{ backgroundColor: candidate.color, color: readableOn(candidate.color), boxShadow: `0 0 0 2px var(--color-surface), 0 0 0 4px ${candidate.color}` }}
      role={photo || decorative ? undefined : 'img'}
      aria-label={photo || decorative ? undefined : alt}
    >
      {photo ? (
        <>
          {!loaded && <span className="absolute inset-0 animate-pulse bg-surface-2" aria-hidden="true" />}
          <img
            src={photo.url}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cx('size-full object-cover object-top transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          />
        </>
      ) : (
        <span aria-hidden="true">{initials(candidate.first_name, candidate.last_name)}</span>
      )}
    </span>
  )
}
