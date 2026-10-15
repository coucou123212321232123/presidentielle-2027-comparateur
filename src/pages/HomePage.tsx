import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Columns3, Search, UserX } from 'lucide-react'
import { candidates, candidateById, measuresByCandidate, meta, themeById, totalMeasures } from '../data'
import type { CandidateStatus } from '../data/schema'
import { CandidateCard } from '../components/CandidateCard'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { SourceTypeBadge } from '../components/Badges'
import { Chip, EmptyState } from '../components/ui'
import { FAMILY_LABELS, POSITION_ORDER, STATUS_LABELS, familyOf, type Family } from '../lib/labels'
import { formatDate, fullName, normalize, plural } from '../lib/format'

type Sort = 'alpha' | 'axis'

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(`${iso}T08:00:00`).getTime() - Date.now()) / 86_400_000))
}

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [families, setFamilies] = useState<Family[]>([])
  const [statuses, setStatuses] = useState<CandidateStatus[]>([])
  const [sort, setSort] = useState<Sort>('alpha')

  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true })
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const presentFamilies = useMemo(
    () => (Object.keys(FAMILY_LABELS) as Family[]).filter((f) => candidates.some((c) => familyOf(c.position) === f)),
    [],
  )
  const presentStatuses = useMemo(
    () => (Object.keys(STATUS_LABELS) as CandidateStatus[]).filter((s) => candidates.some((c) => c.status === s)),
    [],
  )

  const q = normalize(query.trim())
  const filtered = useMemo(() => {
    const list = candidates.filter(
      (c) =>
        (families.length === 0 || families.includes(familyOf(c.position))) &&
        (statuses.length === 0 || statuses.includes(c.status)) &&
        (!q || normalize(`${fullName(c)} ${c.party} ${c.party_short}`).includes(q)),
    )
    return sort === 'axis'
      ? list.slice().sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
      : list
  }, [families, statuses, q, sort])

  const measureHits = useMemo(() => {
    if (q.length < 3) return []
    return Object.entries(measuresByCandidate)
      .flatMap(([cid, list]) => list.map((m) => ({ m, c: candidateById[cid] })))
      .filter(({ m }) => normalize(`${m.title} ${m.description}`).includes(q))
      .slice(0, 40)
  }, [q])

  return (
    <div>
      <section className="mb-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Élection présidentielle · 1er tour le {formatDate(meta.election.first_round)}
          </motion.p>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Les candidats et leurs programmes, <span className="text-muted">côte à côte.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
            Consultez la fiche de chaque candidat, comparez leurs mesures par thème et accédez directement aux documents officiels.
            Chaque mesure est sourcée et datée.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/comparateur"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <Columns3 className="size-4" aria-hidden="true" /> Comparer par thème
            </Link>
            <Link to="/themes" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 hover:text-ink">
              Vue d'ensemble <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: 'candidats présentés', value: candidates.length },
            { label: 'mesures sourcées', value: totalMeasures },
            { label: 'jours avant le 1er tour', value: daysUntil(meta.election.first_round) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <dt className="text-xs leading-tight text-muted">{s.label}</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Recherche et filtres" className="mb-6 space-y-4">
        <label className="relative block">
          <span className="sr-only">Rechercher un candidat, un parti ou une mesure</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un candidat, un parti ou une mesure (ex. « nucléaire », « SMIC »)…"
            className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-4 text-base text-ink shadow-soft placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par famille politique">
            {presentFamilies.map((f) => (
              <Chip key={f} active={families.includes(f)} onClick={() => setFamilies(toggle(families, f))}>
                {FAMILY_LABELS[f]}
              </Chip>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            {presentStatuses.map((s) => (
              <Chip key={s} active={statuses.includes(s)} onClick={() => setStatuses(toggle(statuses, s))}>
                {STATUS_LABELS[s]}
              </Chip>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            Trier
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink"
            >
              <option value="alpha">Ordre alphabétique</option>
              <option value="axis">Axe gauche → droite</option>
            </select>
          </label>
        </div>
      </section>

      {filtered.length > 0 ? (
        <motion.div
          key={`${families.join()}-${statuses.join()}-${sort}`}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </motion.div>
      ) : (
        candidates.length > 0 && (
          <EmptyState icon={<UserX className="size-8" />} title="Aucun candidat ne correspond à ces critères">
            Modifiez la recherche ou retirez des filtres.
          </EmptyState>
        )
      )}

      <AnimatePresence>
        {measureHits.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-12" aria-live="polite">
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
              {plural(measureHits.length, 'mesure correspond', 'mesures correspondent')} à « {query} »
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {measureHits.map(({ m, c }) => (
                <li key={m.id}>
                  <Link to={`/candidats/${c.id}?theme=${m.theme}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60">
                    <CandidateAvatar candidate={c} size="sm" decorative />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{m.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {fullName(c)} · {themeById[m.theme].label}
                      </span>
                    </span>
                    <SourceTypeBadge type={m.source_type} />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
