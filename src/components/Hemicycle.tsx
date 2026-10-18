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
  row: number
}

interface Sector {
  from: number
  to: number
  seats: Seat[]
}

const INNER = 0.4
/** Espace angulaire laissé entre deux groupes, pour que chaque parti forme un bloc bien distinct. */
const GAP = 0.035

/**
 * Un secteur par groupe politique, de la gauche vers la droite, proportionnel à son nombre de membres.
 * Dans chaque secteur, les sièges sont répartis sur les rangées proportionnellement à leur longueur,
 * puis triés par angle : les positions de vote d'un groupe forment des tranches contiguës.
 */
function sectorLayout(sizes: number[]) {
  const total = sizes.reduce((a, b) => a + b, 0) || 1
  const rows = Math.max(4, Math.round(Math.sqrt(total / 3.4)))
  const radii = Array.from({ length: rows }, (_, i) => INNER + ((1 - INNER) * i) / (rows - 1))
  const sumR = radii.reduce((a, b) => a + b, 0)
  const available = Math.PI - GAP * Math.max(0, sizes.length - 1)
  let start = Math.PI
  const sectors: Sector[] = sizes.map((n) => {
    const span = (available * n) / total
    const from = start
    const to = start - span
    start = to - GAP
    // Sièges par rangée (méthode du plus fort reste), pour que le total du groupe soit exact.
    const raw = radii.map((r) => (n * r) / sumR)
    const counts = raw.map(Math.floor)
    raw
      .map((v, i) => ({ i, rest: v - Math.floor(v) }))
      .sort((a, b) => b.rest - a.rest)
      .slice(0, n - counts.reduce((a, b) => a + b, 0))
      .forEach(({ i }) => counts[i]++)
    const seats: Seat[] = []
    radii.forEach((r, row) => {
      for (let j = 0; j < counts[row]; j++) {
        const angle = from - (span * (j + 0.5)) / counts[row]
        seats.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle, row })
      }
    })
    seats.sort((a, b) => b.angle - a.angle || a.row - b.row)
    return { from, to, seats }
  })
  const radial = (1 - INNER) / (rows - 1)
  const along = (available * sumR) / total
  return { sectors, dot: Math.min(radial, along) * 0.42 }
}

const polar = (r: number, a: number) => ({ x: r * Math.cos(a), y: -r * Math.sin(a) })
function arcPath(r: number, from: number, to: number) {
  const p1 = polar(r, from)
  const p2 = polar(r, to)
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`
}
/** Secteur d'anneau (zone de survol d'un groupe, y compris l'espace entre les points). */
function wedgePath(r0: number, r1: number, from: number, to: number) {
  const a = polar(r1, from)
  const b = polar(r1, to)
  const c = polar(r0, to)
  const d = polar(r0, from)
  return `M ${a.x} ${a.y} A ${r1} ${r1} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${r0} ${r0} 0 0 0 ${d.x} ${d.y} Z`
}

export type HemicycleMode = 'vote' | 'groupe'

/**
 * Hémicycle de l'Assemblée : un bloc par groupe politique (de la gauche vers la droite), un point par député,
 * coloré par position de vote ou par groupe. Survoler (ou toucher) un bloc met le groupe en évidence et
 * affiche son décompte au centre.
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
  const groups = useMemo(() => scrutin.groups.filter((g) => g.members > 0), [scrutin])
  const { sectors, dot } = useMemo(() => sectorLayout(groups.map((g) => g.members)), [groups])
  const focused = groups.find((g) => g.short === focus)
  const r0 = INNER - dot * 2
  const r1 = 1 + dot * 2

  return (
    <svg viewBox="-1.5 -1.27 3 1.32" className="w-full touch-manipulation select-none" role="img" aria-label={describe(scrutin)}>
      {groups.map((g, gi) => {
        const sec = sectors[gi]
        const dim = focus !== null && focus !== g.short
        const mid = (sec.from + sec.to) / 2
        const label = polar(1.16, mid)
        const votes = VOTE_ORDER.flatMap((v) => Array.from({ length: g[v] }, () => v))
        return (
          <g key={g.ref} opacity={dim ? 0.15 : 1} className="transition-opacity duration-150">
            <path d={arcPath(1.065, sec.from, sec.to)} fill="none" stroke={g.color} strokeWidth={0.03} strokeLinecap="round" />
            {sec.from - sec.to > 0.12 && (
              <text
                x={label.x}
                y={label.y}
                textAnchor={Math.abs(Math.cos(mid)) < 0.25 ? 'middle' : Math.cos(mid) > 0 ? 'start' : 'end'}
                dominantBaseline="middle"
                className="fill-ink-2"
                style={{ fontSize: 0.058, fontWeight: 600 }}
              >
                {g.short}
              </text>
            )}
            {sec.seats.map((s, i) => {
              const v = votes[i] ?? 'absent'
              const hollow = mode === 'vote' && v === 'absent'
              return (
                <circle
                  key={i}
                  cx={s.x}
                  cy={-s.y}
                  r={hollow ? dot * 0.82 : dot}
                  fill={hollow ? 'none' : mode === 'vote' ? VOTE_COLORS[v] : g.color}
                  stroke={hollow ? 'var(--color-muted)' : 'none'}
                  strokeWidth={hollow ? dot * 0.3 : 0}
                  opacity={mode === 'groupe' && v === 'absent' ? 0.3 : hollow ? 0.6 : 1}
                />
              )
            })}
          </g>
        )
      })}

      {/* Zones de survol : un secteur entier par groupe, posé au-dessus des points. */}
      {groups.map((g, gi) => {
        const sec = sectors[gi]
        return (
          <path
            key={g.ref}
            d={wedgePath(r0, r1 + 0.12, sec.from + GAP / 2, sec.to - GAP / 2)}
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={(e) => e.pointerType === 'mouse' && onFocus(g.short)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && onFocus(null)}
            onClick={() => onFocus(focus === g.short ? null : g.short)}
          >
            <title>{g.label}</title>
          </path>
        )
      })}

      {/* Centre : résultat d'ensemble, ou décompte du groupe survolé */}
      {focused ? (
        <g pointerEvents="none">
          <text x="0" y="-0.21" textAnchor="middle" className="font-display" fill={focused.color} style={{ fontSize: 0.105, fontWeight: 700 }}>
            {focused.short}
          </text>
          <text x="0" y="-0.12" textAnchor="middle" className="fill-ink" style={{ fontSize: 0.05, fontWeight: 600 }}>
            {scrutin.censure ? `${focused.pour} pour la censure` : `${focused.pour} pour · ${focused.contre} contre`}
          </text>
          <text x="0" y="-0.055" textAnchor="middle" className="fill-muted" style={{ fontSize: 0.042 }}>
            {scrutin.censure
              ? `sur ${focused.members} membres`
              : `${focused.abstention} abst. · ${focused.absent + focused.non_votant} sans vote · ${focused.members} membres`}
          </text>
        </g>
      ) : (
        <g pointerEvents="none">
          <text x="0" y="-0.1" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 0.15, fontWeight: 600 }}>
            {scrutin.totals.pour}
          </text>
          <text x="0" y="-0.02" textAnchor="middle" className="fill-muted" style={{ fontSize: 0.05 }}>
            {scrutin.censure ? 'pour la censure' : `pour · ${scrutin.totals.contre} contre`}
          </text>
        </g>
      )}
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
