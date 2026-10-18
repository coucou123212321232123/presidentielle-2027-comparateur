import { useMemo, useState } from 'react'
import type { Scrutin, VotePosition } from '../data/schema'
import { cx } from './ui'

export const VOTE_ORDER: VotePosition[] = ['pour', 'contre', 'abstention', 'non_votant', 'absent']

export const VOTE_COLORS: Record<VotePosition, string> = {
  pour: '#15803d',
  contre: '#ef4444',
  abstention: '#f59e0b',
  non_votant: '#64748b',
  absent: 'transparent',
}

export function voteLabel(v: VotePosition, censure: boolean, plural = false) {
  if (censure) return v === 'pour' ? 'Pour la censure' : v === 'absent' ? 'Pas de vote pour la censure' : 'Non-votant'
  const s = plural ? 's' : ''
  return { pour: 'Pour', contre: 'Contre', abstention: 'Abstention', non_votant: `Non-votant${s}`, absent: `Absent${s} ou non inscrit${s}` }[v]
}

interface Seat {
  x: number
  y: number
  angle: number
}

const ROWS = 12
const INNER = 0.38

/**
 * Positions des sièges en demi-cercle, réparties par rangées proportionnellement à leur longueur,
 * puis triées de la gauche vers la droite (angle décroissant) : chaque groupe occupe un secteur.
 */
function layout(total: number): { seats: Seat[]; dot: number } {
  const radii = Array.from({ length: ROWS }, (_, i) => INNER + ((1 - INNER) * i) / (ROWS - 1))
  const sum = radii.reduce((a, b) => a + b, 0)
  const counts = radii.map((r) => Math.max(1, Math.round((total * r) / sum)))
  counts[ROWS - 1] += total - counts.reduce((a, b) => a + b, 0)
  const seats: Seat[] = []
  radii.forEach((r, i) => {
    const n = counts[i]
    for (let j = 0; j < n; j++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (n - 1)
      seats.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle })
    }
  })
  seats.sort((a, b) => b.angle - a.angle || a.y - b.y)
  const spacing = Math.min((1 - INNER) / (ROWS - 1), Math.PI / counts[ROWS - 1])
  return { seats, dot: spacing * 0.42 }
}

type Mode = 'vote' | 'groupe'

/** Hémicycle de l'Assemblée : un point par député, groupes de la gauche vers la droite, colorés par vote ou par groupe. */
export function Hemicycle({ scrutin }: { scrutin: Scrutin }) {
  const [mode, setMode] = useState<Mode>('vote')
  const [focus, setFocus] = useState<string | null>(null)
  const total = scrutin.groups.reduce((n, g) => n + g.members, 0)
  const { seats, dot } = useMemo(() => layout(total), [total])

  // Chaque groupe reçoit un secteur contigu ; à l'intérieur, les sièges sont rangés par position de vote.
  const assigned = useMemo(() => {
    const out: { group: string; color: string; vote: VotePosition }[] = []
    for (const g of scrutin.groups)
      for (const v of VOTE_ORDER) for (let i = 0; i < g[v]; i++) out.push({ group: g.short, color: g.color, vote: v })
    return out
  }, [scrutin])

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-line bg-surface p-1 text-sm" role="radiogroup" aria-label="Couleur des sièges">
          {(
            [
              ['vote', 'Par vote'],
              ['groupe', 'Par groupe'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx('rounded-full px-3 py-1 font-medium', mode === m ? 'bg-ink text-bg' : 'text-muted hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{total} sièges · groupes de la gauche vers la droite</p>
      </div>

      <svg viewBox="-1.05 -1.04 2.1 1.1" className="w-full" role="img" aria-label={`Hémicycle : ${describe(scrutin)}`}>
        {seats.map((s, i) => {
          const a = assigned[i]
          if (!a) return null
          const dim = focus !== null && focus !== a.group
          const fill = mode === 'vote' ? VOTE_COLORS[a.vote] : a.color
          const outline = mode === 'vote' && a.vote === 'absent'
          return (
            <circle
              key={i}
              cx={s.x}
              cy={-s.y}
              r={dot}
              fill={fill}
              stroke={outline ? 'var(--color-muted)' : 'none'}
              strokeWidth={outline ? dot * 0.22 : 0}
              opacity={dim ? 0.18 : outline ? 0.55 : 1}
            >
              <title>{`${a.group} · ${voteLabel(a.vote, scrutin.censure)}`}</title>
            </circle>
          )
        })}
        <text x="0" y="-0.12" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 0.15, fontWeight: 600 }}>
          {scrutin.totals.pour}
        </text>
        <text x="0" y="-0.02" textAnchor="middle" className="fill-muted" style={{ fontSize: 0.055 }}>
          {scrutin.censure ? 'pour la censure' : `pour · ${scrutin.totals.contre} contre`}
        </text>
      </svg>

      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
        {mode === 'vote'
          ? VOTE_ORDER.filter((v) => v !== 'absent' || scrutin.groups.some((g) => g.absent > 0))
              .filter((v) => !scrutin.censure || v === 'pour' || v === 'absent')
              .map((v) => (
                <span key={v} className="inline-flex items-center gap-1.5">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: VOTE_COLORS[v], border: v === 'absent' ? '1.5px solid var(--color-muted)' : undefined }}
                    aria-hidden="true"
                  />
                  {voteLabel(v, scrutin.censure, true)}{' '}
                  <span className="tabular-nums text-muted">{scrutin.groups.reduce((n, g) => n + g[v], 0)}</span>
                </span>
              ))
          : scrutin.groups.map((g) => (
              <button
                key={g.ref}
                type="button"
                onPointerEnter={() => setFocus(g.short)}
                onPointerLeave={() => setFocus(null)}
                onFocus={() => setFocus(g.short)}
                onBlur={() => setFocus(null)}
                className="inline-flex items-center gap-1.5"
                title={g.label}
              >
                <span className="size-3 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
                {g.short} <span className="tabular-nums text-muted">{g.members}</span>
              </button>
            ))}
      </figcaption>
    </figure>
  )
}

function describe(s: Scrutin) {
  return s.censure
    ? `${s.totals.pour} députés pour la censure`
    : `${s.totals.pour} pour, ${s.totals.contre} contre, ${s.totals.abstention} abstentions`
}

/** Répartition des votes d'un groupe, en barre empilée. */
export function GroupBar({ group, censure, onFocus }: { group: Scrutin['groups'][number]; censure: boolean; onFocus?: (g: string | null) => void }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2" onPointerEnter={() => onFocus?.(group.short)} onPointerLeave={() => onFocus?.(null)}>
      {VOTE_ORDER.filter((v) => v !== 'absent').map((v) =>
        group[v] ? (
          <span key={v} style={{ width: `${(100 * group[v]) / group.members}%`, backgroundColor: VOTE_COLORS[v] }} title={`${voteLabel(v, censure)} : ${group[v]}`} />
        ) : null,
      )}
    </div>
  )
}

/** Vote personnel d'un député (pastille de couleur + libellé). */
export function VoteBadge({ scrutin, vote }: { scrutin: Scrutin; vote: VotePosition }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: VOTE_COLORS[vote], border: vote === 'absent' ? '1.5px solid var(--color-muted)' : undefined }}
        aria-hidden="true"
      />
      {vote === 'absent' && !scrutin.censure ? "N'a pas pris part au vote" : voteLabel(vote, scrutin.censure)}
    </span>
  )
}

