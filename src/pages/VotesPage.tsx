import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Info, Landmark, MessageSquareQuote, Search, XCircle } from 'lucide-react'
import { candidateById, candidates, themeById } from '../data'
import { curatedViews, explanations, KIND_LABELS, useVoteIndex, votes, type IndexKind, type VoteView } from '../data/votes'
import type { VoteArgument, VotePosition } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Glossed } from '../components/Glossary'
import { GroupBar, Hemicycle, VOTE_COLORS, VOTE_ORDER, VoteBadge, VoteDot, voteLabel, type HemicycleMode } from '../components/Hemicycle'
import { ThemeIcon } from '../components/ThemeIcon'
import { Badge, Card, Chip, EmptyState, PageHeader, Skeleton, cx } from '../components/ui'
import { formatDate, formatShortDate, fullName, normalize, plural } from '../lib/format'
import NotFoundPage from './NotFoundPage'

/* ───────────────────────── Éléments communs ───────────────────────── */

// Sigles des groupes parlementaires (« EPR » = Ensemble pour la République) : à ne pas confondre avec ceux du glossaire.
const GROUP_ACRONYMS: ReadonlySet<string> = new Set(votes.scrutins.flatMap((sc) => sc.groups.map((g) => g.short)))

function ResultBadge({ s, size = 'sm' }: { s: VoteView; size?: 'sm' | 'lg' }) {
  const adopted = s.result === 'adopte'
  const label = s.censure ? (adopted ? 'Motion adoptée' : 'Motion rejetée') : adopted ? 'Adopté' : 'Rejeté'
  if (size === 'lg')
    return (
      <span
        className={cx(
          'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-semibold',
          adopted ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-ink text-bg',
        )}
      >
        {adopted ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <XCircle className="size-5" aria-hidden="true" />}
        {label}
      </span>
    )
  return (
    <Badge tone={adopted ? 'green' : 'neutral'}>
      {adopted ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <XCircle className="size-3" aria-hidden="true" />}
      {label}
    </Badge>
  )
}

/** Barre fine pour / abstention / contre (cartes et résultats de recherche). */
function MiniBar({ s }: { s: VoteView }) {
  const seats = s.groups.reduce((n, g) => n + g.members, 0) || 577
  const parts: [VotePosition, number][] = s.censure
    ? [['pour', s.totals.pour]]
    : [
        ['pour', s.totals.pour],
        ['abstention', s.totals.abstention],
        ['contre', s.totals.contre],
      ]
  const base = s.censure ? seats : s.totals.pour + s.totals.contre + s.totals.abstention || 1
  return (
    <div className="relative">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        {parts.map(([v, n]) => (n ? <span key={v} style={{ width: `${(100 * n) / base}%`, backgroundColor: VOTE_COLORS[v] }} /> : null))}
      </div>
      {s.censure && s.majority_required && (
        <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-ink" style={{ left: `${(100 * s.majority_required) / seats}%` }} aria-hidden="true" />
      )}
    </div>
  )
}

const shortCounts = (s: VoteView) =>
  s.censure ? `${s.totals.pour} pour la censure` : `${s.totals.pour} pour · ${s.totals.contre} contre · ${s.totals.abstention} abst.`

/* ───────────────────────── Liste : grands textes et recherche ───────────────────────── */

function VoteCard({ s }: { s: VoteView }) {
  const theme = s.theme ? themeById[s.theme] : undefined
  return (
    <Link
      to={`/votes/${s.id}`}
      className="flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          {theme && <ThemeIcon theme={theme} className="size-3.5" />}
          {theme?.short ?? KIND_LABELS[s.kind]}
        </span>
        <span className="tabular-nums">{formatShortDate(s.date)}</span>
      </div>
      <h3 className="font-semibold leading-snug text-ink">{s.short_title}</h3>
      <div className="mt-auto space-y-2 pt-4">
        <MiniBar s={s} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted">{shortCounts(s)}</span>
          <ResultBadge s={s} />
        </div>
        {s.candidates.length > 0 && (
          <div className="flex items-center gap-1.5 border-t border-line pt-2">
            {s.candidates.map((p) => {
              const c = candidateById[p.candidate]
              return c ? (
                <span key={p.candidate} className="relative" title={`${fullName(c)} : ${voteLabel(p.vote, s.censure)}`}>
                  <CandidateAvatar candidate={c} size="sm" decorative />
                  <VoteDot vote={p.vote} className="absolute -bottom-0.5 -right-0.5 size-3 ring-2 ring-surface" />
                </span>
              ) : null
            })}
            <span className="ml-1 text-[11px] text-muted">vote des candidats</span>
          </div>
        )}
      </div>
    </Link>
  )
}

const KIND_FILTERS: { kind: IndexKind | 'tous'; label: string }[] = [
  { kind: 'tous', label: 'Tous les votes' },
  { kind: 'proposition_de_loi', label: 'Propositions de loi' },
  { kind: 'projet_de_loi', label: 'Projets de loi' },
  { kind: 'motion_de_censure', label: 'Motions de censure' },
  { kind: 'declaration', label: 'Déclarations du gouvernement' },
]
const PAGE = 40

function SearchResults({ query, kind, candidate }: { query: string; kind: IndexKind | 'tous'; candidate: string }) {
  const { index, failed } = useVoteIndex(true)
  const [shown, setShown] = useState(PAGE)
  const results = useMemo(() => {
    if (!index) return []
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    return index.filter(
      (s) =>
        (kind === 'tous' || s.kind === kind) &&
        (!candidate || s.candidates.some((p) => p.candidate === candidate)) &&
        terms.every((t) => normalize(`${s.official_title} ${s.short_title}`).includes(t)),
    )
  }, [index, query, kind, candidate])

  if (failed) return <p className="text-sm text-muted">L'index des votes n'a pas pu être chargé. Rechargez la page pour réessayer.</p>
  if (!index)
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Chargement des votes">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  if (!results.length)
    return (
      <EmptyState icon={<Search className="size-8" />} title="Aucun texte voté ne correspond">
        Essayez un autre mot (ex. « retraite », « logement », « agriculteurs ») ou retirez un filtre.
      </EmptyState>
    )

  const c = candidate ? candidateById[candidate] : undefined
  return (
    <div aria-live="polite">
      <p className="mb-3 text-sm text-muted">{plural(results.length, 'vote trouvé', 'votes trouvés')}, du plus récent au plus ancien.</p>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {results.slice(0, shown).map((s) => {
          const own = c ? s.candidates.find((p) => p.candidate === c.id) : undefined
          return (
            <li key={s.id}>
              <Link
                to={`/votes/${s.id}`}
                className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center"
              >
                <span className="min-w-0">
                  <span className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span className="tabular-nums">{formatShortDate(s.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{KIND_LABELS[s.kind]}</span>
                    {s.curated && <Badge tone="blue">Grand texte</Badge>}
                  </span>
                  <span className="line-clamp-2 text-sm font-medium leading-snug text-ink">{s.short_title}</span>
                </span>
                <span className="space-y-1.5">
                  <MiniBar s={s} />
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    {own ? <VoteBadge scrutin={s} vote={own.vote} /> : <span className="text-xs tabular-nums text-muted">{shortCounts(s)}</span>}
                    <ResultBadge s={s} />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {results.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-auto mt-4 block rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-2 hover:text-ink"
        >
          Afficher plus ({results.length - shown} restants)
        </button>
      )}
    </div>
  )
}

/** Les grands textes commentés, filtrables par thème et regroupés par année. */
function CuratedList() {
  const [theme, setTheme] = useState<string>('')
  const themesUsed = [...new Set(curatedViews.map((s) => s.theme).filter(Boolean))]
    .map((id) => themeById[id!])
    .filter(Boolean)
    .sort((a, b) => a.short.localeCompare(b.short, 'fr'))
  const list = curatedViews.filter((s) => !theme || s.theme === theme)
  const years = [...new Set(list.map((s) => s.date.slice(0, 4)))]

  return (
    <section aria-labelledby="grands-textes">
      <h2 id="grands-textes" className="mb-1 font-display text-2xl font-semibold text-ink">
        Les grands textes
      </h2>
      <p className="mb-4 text-sm text-muted">
        {plural(curatedViews.length, 'vote commenté', 'votes commentés')} : contexte, hémicycle et vote des candidats alors députés.
      </p>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par thème">
        <Chip active={!theme} onClick={() => setTheme('')} className="text-xs">
          Tous les thèmes
        </Chip>
        {themesUsed.map((t) => (
          <Chip key={t.id} active={theme === t.id} onClick={() => setTheme(theme === t.id ? '' : t.id)} className="text-xs">
            <ThemeIcon theme={t} className="size-3.5" /> {t.short}
            <span className="tabular-nums opacity-60">{curatedViews.filter((s) => s.theme === t.id).length}</span>
          </Chip>
        ))}
      </div>
      {list.length ? (
        <div className="space-y-8">
          {years.map((y) => (
            <div key={y}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{y}</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list
                  .filter((s) => s.date.startsWith(y))
                  .map((s) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <VoteCard s={s} />
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Landmark className="size-8" />} title="Aucun scrutin importé pour le moment" />
      )}
    </section>
  )
}

function VotesList() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const kind = (params.get('type') as IndexKind | null) ?? 'tous'
  const candidate = params.get('candidat') ?? ''
  const searching = Boolean(query.trim() || kind !== 'tous' || candidate)
  const deputies = candidates.filter((c) => curatedViews.some((s) => s.candidates.some((p) => p.candidate === c.id)))

  const set = (key: string, value: string) => {
    const p = new URLSearchParams(params)
    if (value && value !== 'tous') p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }

  return (
    <div>
      <PageHeader eyebrow="Votes / bilan" title="Votes à l'Assemblée nationale">
        Les décomptes officiels de l'Assemblée, groupe par groupe, et le vote des candidats qui étaient députés. Ce sont des faits publics :
        ils complètent les programmes sans les remplacer.
      </PageHeader>

      <section aria-label="Rechercher un texte voté" className="mb-10 space-y-3">
        <label className="relative block">
          <span className="sr-only">Rechercher une proposition ou un projet de loi voté</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => set('q', e.target.value)}
            placeholder="Rechercher une proposition ou un projet de loi voté (ex. « logement », « agriculteurs »)…"
            className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-4 text-base text-ink shadow-soft placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {KIND_FILTERS.map((f) => (
            <Chip key={f.kind} active={kind === f.kind} onClick={() => set('type', f.kind)} className="text-xs">
              {f.label}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Vote de" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Vote de</span>
          <Chip active={!candidate} onClick={() => set('candidat', '')} className="text-xs">
            Tous les députés
          </Chip>
          {deputies.map((c) => (
            <Chip
              key={c.id}
              active={candidate === c.id}
              color={c.color}
              onClick={() => set('candidat', candidate === c.id ? '' : c.id)}
              className="py-1 pl-1 text-xs"
            >
              <CandidateAvatar candidate={c} size="sm" className="size-6! text-[10px]!" decorative />
              <span title={fullName(c)}>{c.last_name}</span>
            </Chip>
          ))}
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Votes sur l'ensemble d'un texte, votes solennels, motions de censure et déclarations du gouvernement depuis 2022 (16e et 17e
          législatures). Les votes sur les amendements ne sont pas inclus.
        </p>
      </section>

      {searching ? (
        <SearchResults key={`${query}|${kind}|${candidate}`} query={query} kind={kind} candidate={candidate} />
      ) : (
        <CuratedList />
      )}
    </div>
  )
}

/* ───────────────────────── Détail d'un scrutin ───────────────────────── */

/** Résultat en une barre : pour / abstention / contre ; pour une censure, voix obtenues face au seuil requis. */
function ResultBar({ s }: { s: VoteView }) {
  const seats = s.groups.reduce((n, g) => n + g.members, 0) || 577
  if (s.censure) {
    const need = s.majority_required ?? Math.floor(seats / 2) + 1
    const at = `${(100 * need) / seats}%`
    return (
      <div>
        <div className="relative pt-1">
          <div className="h-4 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line">
            <span className="block h-full rounded-full" style={{ width: `${(100 * s.totals.pour) / seats}%`, backgroundColor: VOTE_COLORS.pour }} />
          </div>
          <span className="absolute top-0 h-6 w-0.5 -translate-x-1/2 rounded bg-ink" style={{ left: at }} aria-hidden="true" />
        </div>
        <div className="relative mt-1 h-4 text-xs text-muted">
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at }}>
            seuil : {need}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-2">
          <strong className="text-ink">{s.totals.pour} députés</strong> ont voté la censure ; il en fallait {need} (majorité absolue des
          membres de l'Assemblée).
        </p>
      </div>
    )
  }
  const expressed = s.totals.pour + s.totals.contre
  const all = expressed + s.totals.abstention || 1
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <span>
          <span className="block font-display text-3xl font-semibold tabular-nums" style={{ color: VOTE_COLORS.pour }}>
            {s.totals.pour}
          </span>
          <span className="text-xs font-medium text-muted">pour</span>
        </span>
        {s.totals.abstention > 0 && (
          <span className="text-center">
            <span className="block font-display text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{s.totals.abstention}</span>
            <span className="text-xs font-medium text-muted">abstentions</span>
          </span>
        )}
        <span className="text-right">
          <span className="block font-display text-3xl font-semibold tabular-nums" style={{ color: VOTE_COLORS.contre }}>
            {s.totals.contre}
          </span>
          <span className="text-xs font-medium text-muted">contre</span>
        </span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2">
        <span style={{ width: `${(100 * s.totals.pour) / all}%`, backgroundColor: VOTE_COLORS.pour }} />
        <span style={{ width: `${(100 * s.totals.abstention) / all}%`, backgroundColor: VOTE_COLORS.abstention }} />
        <span style={{ width: `${(100 * s.totals.contre) / all}%`, backgroundColor: VOTE_COLORS.contre }} />
      </div>
      {s.majority_required !== null && (
        <p className="mt-2 text-xs text-muted">
          {expressed} suffrages exprimés · majorité requise : {s.majority_required}. Les abstentions ne sont pas des suffrages exprimés.
        </p>
      )}
    </div>
  )
}

function GroupRows({ s, focus, onFocus }: { s: VoteView; focus: string | null; onFocus: (g: string | null) => void }) {
  const positions = VOTE_ORDER.filter((v) => v !== 'absent' && (!s.censure || v === 'pour' || v === 'non_votant'))
  return (
    <ul className="divide-y divide-line">
      {s.groups.map((g) => {
        // Position la plus fréquente du groupe ; en cas d'égalité, le groupe est dit partagé.
        const ranked = positions.filter((v) => v !== 'non_votant').sort((a, b) => g[b] - g[a])
        const main = ranked.length > 1 && g[ranked[0]] === g[ranked[1]] ? null : ranked[0]
        return (
          <li
            key={g.ref}
            onPointerEnter={() => onFocus(g.short)}
            onPointerLeave={() => onFocus(null)}
            className={cx('px-5 py-3 transition-opacity sm:px-6', focus !== null && focus !== g.short && 'opacity-40')}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
              <span className="font-semibold text-ink">{g.short}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted" title={g.label}>
                {g.label} · {g.members} membres
              </span>
              {!s.censure && ranked.some((v) => g[v] > 0) && (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                  position la plus fréquente :{' '}
                  {main ? (
                    <>
                      <VoteDot vote={main} /> <strong className="text-ink">{voteLabel(main, false)}</strong>
                    </>
                  ) : (
                    <strong className="text-ink">groupe partagé</strong>
                  )}
                </span>
              )}
            </div>
            <GroupBar group={g} censure={s.censure} />
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted">
              {[...positions, 'absent' as const].map((v) =>
                g[v] ? (
                  <span key={v} className="inline-flex items-center gap-1">
                    <VoteDot vote={v} className="size-2" />
                    {g[v]} {s.censure && v === 'absent' ? 'sans vote pour la censure' : voteLabel(v, s.censure, g[v] > 1).toLowerCase()}
                  </span>
                ) : null,
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/** Arguments d'un camp : texte rapporté, groupes qui l'ont avancé, source. */
function ArgumentColumn({ s, side, items }: { s: VoteView; side: 'pour' | 'contre' | 'abstention'; items: VoteArgument[] }) {
  const title =
    side === 'abstention'
      ? 'Pourquoi certains se sont abstenus'
      : s.censure
        ? side === 'pour'
          ? 'Pourquoi ils ont voté la censure'
          : 'Pourquoi les autres ne l\'ont pas votée'
        : side === 'pour'
          ? 'Pourquoi ils ont voté pour'
          : 'Pourquoi ils ont voté contre'
  const color = side === 'pour' ? VOTE_COLORS.pour : side === 'contre' ? VOTE_COLORS.contre : VOTE_COLORS.abstention
  return (
    <div className="rounded-xl border border-line bg-surface p-4" style={{ borderTop: `3px solid ${color}` }}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <VoteDot vote={side} /> {title}
      </h3>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((a, i) => (
            <li key={i} className="text-sm leading-relaxed text-ink-2">
              <span className="mb-1 flex flex-wrap gap-1">
                {a.groups.map((g) => {
                  const grp = s.groups.find((x) => x.short === g)
                  return (
                    <span key={g} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink" title={grp?.label}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: grp?.color ?? '#9ca3af' }} aria-hidden="true" />
                      {g}
                    </span>
                  )
                })}
              </span>
              <Glossed text={a.text} skip={GROUP_ACRONYMS} />{' '}
              <ExternalLink href={a.source_url} className="inline break-words text-xs text-muted hover:text-ink" icon={false}>
                ({a.source_label})
              </ExternalLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucun argument sourcé n'a été trouvé pour ce camp.</p>
      )}
    </div>
  )
}

/** Contenu global du texte et arguments rapportés de chaque camp. */
function Explanation({ s }: { s: VoteView }) {
  const e = explanations.get(s.id)
  if (!e) return null
  const abst = e.arguments.abstention ?? []
  return (
    <Card className="mb-6 p-5 sm:p-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <FileText className="size-4 text-muted" aria-hidden="true" /> Ce que contient le texte
      </h2>
      <p className="leading-relaxed text-ink-2">
        <Glossed text={e.summary} skip={GROUP_ACRONYMS} />
      </p>
      {e.sources.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          Sources :
          {e.sources.map((src) => (
            <ExternalLink key={src.url} href={src.url} className="hover:text-ink">
              {src.label}
            </ExternalLink>
          ))}
        </p>
      )}

      <h2 className="mb-1 mt-6 flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageSquareQuote className="size-4 text-muted" aria-hidden="true" /> Les arguments de chaque camp
      </h2>
      <p className="mb-4 text-xs text-muted">
        Arguments avancés par les groupes lors des débats, rapportés d'après la presse et les comptes rendus, sans jugement sur leur bien-fondé.
      </p>
      <div className={cx('grid gap-4', abst.length ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
        <ArgumentColumn s={s} side="pour" items={e.arguments.pour} />
        <ArgumentColumn s={s} side="contre" items={e.arguments.contre} />
        {abst.length > 0 && <ArgumentColumn s={s} side="abstention" items={abst} />}
      </div>
    </Card>
  )
}

function Detail({ s }: { s: VoteView }) {
  const [mode, setMode] = useState<HemicycleMode>('vote')
  const [focus, setFocus] = useState<string | null>(null)
  const theme = s.theme ? themeById[s.theme] : undefined
  const legend = VOTE_ORDER.filter((v) => s.groups.some((g) => g[v] > 0))

  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto max-w-5xl">
      <Link to="/votes" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous les votes
      </Link>

      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceTypeBadge type="vote_ou_bilan" />
          <Badge>{KIND_LABELS[s.kind]}</Badge>
          {theme && (
            <Link to={`/comparateur?theme=${theme.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
              <ThemeIcon theme={theme} className="size-3.5" /> {theme.label}
            </Link>
          )}
        </div>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">{s.short_title}</h1>
        <p className="mt-2 text-sm text-muted">
          Vote du {formatDate(s.date)} · scrutin n° {s.numero} · {s.legislature}e législature
        </p>
      </header>

      {/* Verdict */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-10">
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Résultat</span>
            <ResultBadge s={s} size="lg" />
          </div>
          <ResultBar s={s} />
        </div>
        <div className="space-y-3 border-t border-line bg-surface-2/50 p-5 text-sm leading-relaxed text-ink-2 sm:p-6">
          {s.context && (
            <p>
              <Glossed text={s.context} skip={GROUP_ACRONYMS} />
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Intitulé officiel du scrutin</summary>
            <p className="mt-2 text-sm">{s.official_title}</p>
          </details>
        </div>
      </Card>

      <Explanation s={s} />

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Hémicycle */}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">L'hémicycle, député par député</h2>
            <div className="inline-flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label="Couleur des sièges">
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
                  className={cx('rounded-full px-3 py-1 text-xs font-medium', mode === m ? 'bg-ink text-bg' : 'text-muted hover:text-ink')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Hemicycle scrutin={s} mode={mode} focus={focus} onFocus={setFocus} />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2">
            {mode === 'vote'
              ? legend.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1.5">
                    <VoteDot vote={v} className="size-3" />
                    {s.censure && v === 'absent' ? 'Pas de vote pour la censure' : voteLabel(v, s.censure, true)}
                    <span className="tabular-nums text-muted">{s.groups.reduce((n, g) => n + g[v], 0)}</span>
                  </span>
                ))
              : s.groups.map((g) => (
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
          </div>
          <p className="mt-3 text-xs text-muted">
            Un bloc par groupe politique (de la gauche vers la droite, ordre indicatif), un point par député. Survolez ou touchez un bloc
            pour afficher le vote du groupe. La place d'un point ne correspond pas au siège réel.
          </p>
        </Card>

        {/* Vote des candidats */}
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold text-ink">Le vote des candidats</h2>
          <p className="mb-4 text-xs text-muted">Candidats qui étaient députés à cette date, vote enregistré par l'Assemblée.</p>
          {s.candidates.length ? (
            <ul className="space-y-2">
              {s.candidates.map((p) => {
                const c = candidateById[p.candidate]
                if (!c) return null
                return (
                  <li key={p.candidate}>
                    <Link to={`/candidats/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface-2/60">
                      <CandidateAvatar candidate={c} size="md" decorative />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{fullName(c)}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <VoteBadge scrutin={s} vote={p.vote} />
                          {p.group && <span className="text-xs text-muted">{p.group}</span>}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">Aucun des candidats n'était député à cette date.</p>
          )}
          {s.censure && (
            <p className="mt-4 text-xs text-muted">
              Pour une motion de censure, seuls les votes favorables sont recueillis : ne pas la voter revient à ne pas soutenir la censure.
            </p>
          )}
        </Card>
      </div>

      <Card className="mb-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-sm font-semibold text-ink sm:px-6">Vote par groupe politique</h2>
        <GroupRows s={s} focus={focus} onFocus={setFocus} />
      </Card>

      <p className="text-sm text-muted">
        Source :{' '}
        <ExternalLink href={s.source_url} className="font-medium text-accent hover:underline">
          Assemblée nationale, analyse du scrutin n° {s.numero}
        </ExternalLink>{' '}
        · décompte par groupe établi à partir des listes nominatives des{' '}
        <ExternalLink href={votes.source_url} className="hover:text-ink" icon={false}>
          données ouvertes de l'Assemblée
        </ExternalLink>
        , importées le {formatShortDate(votes.generated_at.slice(0, 10))}.
      </p>
    </motion.article>
  )
}

function DetailFromIndex({ id }: { id: string }) {
  const { index, failed } = useVoteIndex(true)
  if (failed) return <p className="text-sm text-muted">Ce vote n'a pas pu être chargé. Rechargez la page pour réessayer.</p>
  if (!index) return <Skeleton className="mx-auto h-[70vh] max-w-5xl" />
  const s = index.find((x) => x.id === id)
  return s ? <Detail s={s} /> : <NotFoundPage />
}

export default function VotesPage() {
  const { id } = useParams()
  if (!id) return <VotesList />
  const curated = curatedViews.find((s) => s.id === id)
  return curated ? <Detail key={id} s={curated} /> : <DetailFromIndex key={id} id={id} />
}
