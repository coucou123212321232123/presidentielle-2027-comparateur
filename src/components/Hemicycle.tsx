import { useMemo } from 'react'
import type { Scrutin, VotePosition } from '../data/schema'

/** Ce dont l'hémicycle a besoin d'un scrutin (grand texte commenté ou vote de l'index de recherche). */
type ScrutinCounts = Pick<Scrutin, 'groups' | 'totals' | 'censure'>
import { cx } from './ui'

export const VOTE_ORDER: VotePosition[] = ['pour', 'contre', 'abstention', 'non_votant', 'absent']

export const VOTE_COLORS: Record<VotePosition, string> = {
  pour: '#16a34a',
  contre: '#dc2626',
  abstention: '#f59e0b',
  non_votant: '#64748b',
  absent: 'transparent',
}

export function voteLabel(v: VotePosition, censure: boolean, plural = false) {
  if (censure) return v === 'pour' ? 'Pour la censure' : v === 'absent' ? 'Pas de vote pour la censure' : `Non-votant${plural ? 's' : ''}`
  const s = plural ? 's' : ''
  return { pour: 'Pour', contre: 'Contre', abstention: `Abstention${s}`, non_votant: `Non-votant${s}`, absent: `Absent${s}` }[v]
}

/** Pastille de couleur d'une position de vote (pleine, ou cerclée pour les absents). */
export function VoteDot({ vote, className = 'size-2.5' }: { vote: VotePosition; className?: string }) {
  return (
    <span
      className={cx('inline-block shrink-0 rounded-full', className)}
      style={{ backgroundColor: VOTE_COLORS[vote], boxShadow: vote === 'absent' ? 'inset 0 0 0 1.5px var(--color-muted)' : undefined }}
      aria-hidden="true"
    />
  )
}

/** Vote personnel d'un député (pastille de couleur + libellé). */
export function VoteBadge({ scrutin, vote, size = 'sm' }: { scrutin: Pick<Scrutin, 'censure'>; vote: VotePosition; size?: 'sm' | 'lg' }) {
  const label = vote === 'absent' && !scrutin.censure ? "N'a pas pris part au vote" : voteLabel(vote, scrutin.censure)
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs',
        vote === 'absent' ? 'border-dashed border-line text-muted' : 'border-transparent text-ink',
      )}
      style={vote !== 'absent' ? { backgroundColor: `${VOTE_COLORS[vote]}1f` } : undefined}
    >
      <VoteDot vote={vote} />
      {label}
    </span>
  )
}

interface Seat {
  x: number
  y: number
  angle: number
}

const INNER = 0.4

/**
 * Positions des sièges en demi-cercle : rangées réparties proportionnellement à leur longueur, puis sièges
 * triés de la gauche vers la droite (angle décroissant), ce qui donne à chaque groupe un secteur.
 */
function layout(total: number) {
  const rows = Math.max(4, Math.round(Math.sqrt(total / 3.4)))
  const radii = Array.from({ length: rows }, (_, i) => INNER + ((1 - INNER) * i) / (rows - 1))
  const sum = radii.reduce((a, b) => a + b, 0)
  const counts = radii.map((r) => Math.max(1, Math.round((total * r) / sum)))
  counts[rows - 1] += total - counts.reduce((a, b) => a + b, 0)
  const seats: Seat[] = []
  radii.forEach((r, i) => {
    const n = counts[i]
    for (let j = 0; j < n; j++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (n - 1)
      seats.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle })
    }
  })
  seats.sort((a, b) => b.angle - a.angle || a.y - b.y)
  const spacing = Math.min((1 - INNER) / (rows - 1), Math.PI / counts[rows - 1])
  return { seats, dot: spacing * 0.43 }
}

const polar = (r: number, a: number) => ({ x: r * Math.cos(a), y: -r * Math.sin(a) })
function arcPath(r: number, from: number, to: number) {
  const p1 = polar(r, from)
  const p2 = polar(r, to)
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`
}

export type HemicycleMode = 'vote' | 'groupe'

/**
 * Hémicycle de l'Assemblée : un point par député, groupes de la gauche vers la droite (arc et sigle autour),
 * colorés par position de vote ou par groupe. Un groupe survolé (ici ou dans la liste) est mis en évidence.
 */
export function Hemicycle({
  scrutin,
  mode,
  focus,
  onFocus,
}: {
  scrutin: ScrutinCounts
  mode: HemicycleMode
  focus: string | null
  onFocus: (group: string | null) => void
}) {
  const total = scrutin.groups.reduce((n, g) => n + g.members, 0)
  const { seats, dot } = useMemo(() => layout(total), [total])

  // Chaque groupe reçoit un secteur contigu ; à l'intérieur, les sièges sont rangés par position de vote.
  const { assigned, arcs } = useMemo(() => {
    const assigned: { group: string; color: string; vote: VotePosition }[] = []
    const arcs: { group: string; color: string; from: number; to: number }[] = []
    for (const g of scrutin.groups) {
      const start = assigned.length
      for (const v of VOTE_ORDER) for (let i = 0; i < g[v]; i++) assigned.push({ group: g.short, color: g.color, vote: v })
      const own = seats.slice(start, assigned.length)
      if (own.length) arcs.push({ group: g.short, color: g.color, from: Math.max(...own.map((s) => s.angle)), to: Math.min(...own.map((s) => s.angle)) })
    }
    return { assigned, arcs }
  }, [scrutin, seats])

  const headline = scrutin.censure
    ? { big: String(scrutin.totals.pour), small: 'pour la censure' }
    : { big: String(scrutin.totals.pour), small: `pour · ${scrutin.totals.contre} contre` }

  return (
    <svg viewBox="-1.5 -1.27 3 1.32" className="w-full select-none" role="img" aria-label={describe(scrutin)}>
      {/* Arcs et sigles des groupes */}
      {arcs.map((a) => {
        const mid = (a.from + a.to) / 2
        const label = polar(1.17, mid)
        const dim = focus !== null && focus !== a.group
        return (
          <g key={a.group} opacity={dim ? 0.3 : 1} onPointerEnter={() => onFocus(a.group)} onPointerLeave={() => onFocus(null)} className="transition-opacity">
            <path d={arcPath(1.065, a.from + 0.012, a.to - 0.012)} fill="none" stroke={a.color} strokeWidth={0.028} strokeLinecap="round" />
            {a.from - a.to > 0.14 && (
              <text
                x={label.x}
                y={label.y}
                textAnchor={Math.abs(Math.cos(mid)) < 0.25 ? 'middle' : Math.cos(mid) > 0 ? 'start' : 'end'}
                dominantBaseline="middle"
                className="fill-ink-2"
                style={{ fontSize: 0.058, fontWeight: 600 }}
              >
                {a.group}
              </text>
            )}
          </g>
        )
      })}

      {/* Sièges */}
      {seats.map((s, i) => {
        const a = assigned[i]
        if (!a) return null
        const dim = focus !== null && focus !== a.group
        const absent = a.vote === 'absent'
        const hollow = mode === 'vote' && absent
        return (
          <circle
            key={i}
            cx={s.x}
            cy={-s.y}
            r={hollow ? dot * 0.85 : dot}
            fill={hollow ? 'none' : mode === 'vote' ? VOTE_COLORS[a.vote] : a.color}
            stroke={hollow ? 'var(--color-muted)' : 'none'}
            strokeWidth={hollow ? dot * 0.28 : 0}
            opacity={dim ? 0.12 : mode === 'groupe' && absent ? 0.35 : hollow ? 0.6 : 1}
            onPointerEnter={() => onFocus(a.group)}
            onPointerLeave={() => onFocus(null)}
            className="transition-opacity"
          >
            <title>{`${a.group} · ${voteLabel(a.vote, scrutin.censure)}`}</title>
          </circle>
        )
      })}

      {/* Résultat au centre */}
      <text x="0" y="-0.1" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 0.15, fontWeight: 600 }}>
        {headline.big}
      </text>
      <text x="0" y="-0.02" textAnchor="middle" className="fill-muted" style={{ fontSize: 0.052 }}>
        {headline.small}
      </text>
    </svg>
  )
}

function describe(s: ScrutinCounts) {
  return `Hémicycle : ${
    s.censure ? `${s.totals.pour} députés pour la censure` : `${s.totals.pour} pour, ${s.totals.contre} contre, ${s.totals.abstention} abstentions`
  }, répartis par groupe politique de la gauche vers la droite`
}

/** Répartition des votes d'un groupe, en barre empilée sur l'ensemble de ses membres. */
export function GroupBar({ group, censure }: { group: Scrutin['groups'][number]; censure: boolean }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line">
      {VOTE_ORDER.filter((v) => v !== 'absent').map((v) =>
        group[v] ? (
          <span key={v} style={{ width: `${(100 * group[v]) / group.members}%`, backgroundColor: VOTE_COLORS[v] }} title={`${voteLabel(v, censure)} : ${group[v]}`} />
        ) : null,
      )}
    </div>
  )
}
