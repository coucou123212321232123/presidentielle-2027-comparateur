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
/** Largeur affichée de chaque taille, pour que le navigateur choisisse le portrait adapté (scripts/photos.ts). */
const SIZES_ATTR = { sm: '32px', md: '48px', lg: '80px', xl: '(min-width: 640px) 128px, 112px' }
const WIDTHS = [64, 128, 256, 384]
const local = (id: string) => WIDTHS.map((w) => `${import.meta.env.BASE_URL}photos/${id}-${w}.webp ${w}w`).join(', ')

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
  // Portrait servi par le site, puis l'original sur Wikimedia s'il manque, puis les initiales.
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const photo = candidate.photo && attempt < 2 ? candidate.photo : null
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
            key={attempt}
            src={attempt === 0 ? `${import.meta.env.BASE_URL}photos/${candidate.id}-384.webp` : photo.url}
            srcSet={attempt === 0 ? local(candidate.id) : undefined}
            sizes={attempt === 0 ? SIZES_ATTR[size] : undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setAttempt((a) => a + 1)}
            className={cx('size-full object-cover object-top transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          />
        </>
      ) : (
        <span aria-hidden="true">{initials(candidate.first_name, candidate.last_name)}</span>
      )}
    </span>
  )
}
