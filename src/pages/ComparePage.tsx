import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Columns3, Download, Equal, GitCompareArrows, Link2, Plus, Printer, Table2, X } from 'lucide-react'
import { toPng } from 'html-to-image'
import { byTheme, candidates, candidateById, countFor, themeById, themes, useMeasures, useMeasuresFailed } from '../data'
import { indicatorsOf, type Candidate, type IndicatorDef, type Measure, type Theme, type ThemeId } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { MeasureCard } from '../components/MeasureCard'
import { MeasureFilters } from '../components/MeasureFilters'
import { ThemeProgramLink } from '../components/Program'
import { ThemeIcon } from '../components/ThemeIcon'
import { SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Badge, Card, EmptyState, PageHeader, Skeleton, cx } from '../components/ui'
import { Glossed } from '../components/Glossary'
import { useMeasureFilter } from '../lib/store'
import { fullName, plural } from '../lib/format'
import { shareUrl } from '../lib/share'

const MAX = 4
type View = 'colonnes' | 'tableau'

/** Valeur d'un point de comparaison pour un candidat, cherchée dans toutes ses mesures (elle peut relever d'un autre thème). */
function indicatorValue(def: IndicatorDef, list: Measure[] | undefined) {
  for (const m of list ?? []) {
    const ind = indicatorsOf(m).find((i) => i.key === def.key)
    if (!ind) continue
    const v = ind.value
    return { raw: String(v), label: def.type === 'enum' ? (def.options?.[String(v)] ?? String(v)) : `${v}${def.unit ? ` ${def.unit}` : ''}`, measure: m }
  }
  return null
}

function Indicators({ theme, selected, all }: { theme: Theme; selected: Candidate[]; all: Record<string, Measure[]> | null }) {
  if (!theme.indicators.length || selected.length < 2) return null
  if (!all) return <Skeleton className="mb-6 h-40" />
  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <GitCompareArrows className="size-4 text-muted" aria-hidden="true" /> Points de comparaison factuels
      </h2>
      <p className="mb-4 text-xs text-muted">Uniquement lorsque la position est explicitement énoncée dans une source. Sinon : « Non précisé ».</p>
      <div className="space-y-4">
        {theme.indicators.map((def) => {
          const values = selected.map((c) => ({ c, v: indicatorValue(def, all[c.id]) }))
          const known = values.filter((x) => x.v)
          const distinct = new Set(known.map((x) => x.v!.raw))
          const verdict = known.length < 2 ? null : distinct.size === 1 ? 'convergence' : 'divergence'
          return (
            <div key={def.key}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{def.label}</span>
                {verdict === 'convergence' && (
                  <Badge tone="green">
                    <Equal className="size-3" aria-hidden="true" /> Même position ({known.length} candidats)
                  </Badge>
                )}
                {verdict === 'divergence' && (
                  <Badge tone="rose">
                    <GitCompareArrows className="size-3" aria-hidden="true" /> Positions différentes
                  </Badge>
                )}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
                {values.map(({ c, v }) => (
                  <div key={c.id} className="rounded-xl border border-line px-3 py-2" style={{ borderTopColor: c.color, borderTopWidth: 3 }}>
                    <span className="block truncate text-[11px] text-muted">{c.last_name}</span>
                    {v ? (
                      <ExternalLink href={v.measure.source_url} className="text-sm font-semibold text-ink hover:underline" icon={false} title={v.measure.title}>
                        {v.label}
                      </ExternalLink>
                    ) : (
                      <span className="text-sm text-muted">Non précisé</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Column({ candidate, theme, list, total }: { candidate: Candidate; theme: Theme; list: Measure[] | null; total: number }) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      aria-label={fullName(candidate)}
      className="flex w-[85vw] max-w-sm shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2/40 sm:w-auto sm:max-w-none"
    >
      <header className="border-b border-line bg-surface p-4" style={{ borderTop: `4px solid ${candidate.color}` }}>
        <Link to={`/candidats/${candidate.id}?theme=${theme.id}`} className="flex items-center gap-3 rounded-lg">
          <CandidateAvatar candidate={candidate} size="md" decorative />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{fullName(candidate)}</span>
            <span className="block truncate text-xs text-muted">{candidate.party}</span>
          </span>
        </Link>
        <p className="mt-2 text-xs text-muted">
          {!list || total === list.length ? plural(total, 'mesure', 'mesures') : `${list.length} / ${total} mesures (filtrées)`}
        </p>
      </header>
      <div className="flex-1 space-y-3 p-3">
        {list ? (
          <AnimatePresence mode="popLayout">
            {list.map((m) => (
              <MeasureCard key={m.id} measure={m} accent={candidate.color} compact />
            ))}
          </AnimatePresence>
        ) : (
          Array.from({ length: Math.min(total, 3) }, (_, i) => <Skeleton key={i} className="h-32" />)
        )}
        {total === 0 && (
          <EmptyState title="Pas de position publiée à ce jour">Aucune source trouvée sur ce thème à la date de vérification.</EmptyState>
        )}
        {total > 0 && list?.length === 0 && <p className="px-1 text-sm text-muted">Aucune mesure ne correspond aux filtres.</p>}
      </div>
      <footer className="border-t border-line bg-surface p-4">
        <ThemeProgramLink candidate={candidate} theme={theme.id} />
      </footer>
    </motion.section>
  )
}

function TableView({ theme, selected, lists, all }: { theme: Theme; selected: Candidate[]; lists: Record<string, Measure[]>; all: Record<string, Measure[]> }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface scrollbar-thin">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">Comparaison des mesures sur le thème {theme.label}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-36 border-b border-line p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              {theme.short}
            </th>
            {selected.map((c) => (
              <th key={c.id} scope="col" className="border-b border-l border-line p-3 text-left align-bottom" style={{ borderTop: `4px solid ${c.color}` }}>
                <span className="flex items-center gap-2">
                  <CandidateAvatar candidate={c} size="sm" decorative />
                  <span className="font-semibold text-ink">{fullName(c)}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {theme.indicators.map((def) => (
            <tr key={def.key}>
              <th scope="row" className="border-b border-line p-3 text-left align-top text-xs font-medium text-ink-2">
                {def.label}
              </th>
              {selected.map((c) => {
                const v = indicatorValue(def, all[c.id])
                return (
                  <td key={c.id} className="border-b border-l border-line p-3 align-top">
                    {v ? <span className="font-semibold text-ink">{v.label}</span> : <span className="text-muted">Non précisé</span>}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className="border-b border-line p-3 text-left align-top text-xs font-medium text-ink-2">
              Mesures
            </th>
            {selected.map((c) => (
              <td key={c.id} className="border-b border-l border-line p-3 align-top">
                {lists[c.id].length ? (
                  <ul className="space-y-3">
                    {lists[c.id].map((m) => (
                      <li key={m.id}>
                        <span className="block font-medium text-ink">
                          <Glossed text={m.title} />
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-2">
                          <Glossed text={m.description} />
                        </span>
                        {m.cost && <span className="mt-0.5 block text-xs font-medium text-ink">Coût estimé : {m.cost.label}</span>}
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <SourceTypeBadge type={m.source_type} />
                          <ExternalLink href={m.source_url} className="text-xs font-medium text-accent hover:underline">
                            Source{m.source_page ? ` (${m.source_page})` : ''}
                          </ExternalLink>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted">
                    {countFor(c.id, theme.id) ? 'Aucune mesure ne correspond aux filtres.' : 'Pas de position publiée à ce jour'}
                  </span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="p-3 text-left align-top text-xs font-medium text-ink-2">
              Programme
            </th>
            {selected.map((c) => (
              <td key={c.id} className="border-l border-line p-3 align-top">
                <ThemeProgramLink candidate={c} theme={theme.id} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const themeId = (params.get('theme') as ThemeId) ?? themes[0]?.id
  const theme = themeById[themeId] ?? themes[0]
  const selectedIds = (params.get('c') ?? '').split(',').filter((id) => candidateById[id]).slice(0, MAX)
  const selected = selectedIds.map((id) => candidateById[id])
  const view: View = params.get('vue') === 'tableau' ? 'tableau' : 'colonnes'
  const { apply } = useMeasureFilter()
  const exportRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const update = (next: { theme?: string; c?: string[]; vue?: View }) => {
    const p = new URLSearchParams(params)
    if (next.theme) p.set('theme', next.theme)
    if (next.c) {
      if (next.c.length) p.set('c', next.c.join(','))
      else p.delete('c')
    }
    if (next.vue) {
      if (next.vue === 'tableau') p.set('vue', 'tableau')
      else p.delete('vue')
    }
    // Virgules conservées telles quelles pour un lien de partage lisible (?c=attal,philippe).
    setParams(p.toString().replace(/%2C/g, ','), { replace: true })
  }

  const toggleCandidate = (id: string) => {
    if (selectedIds.includes(id)) update({ c: selectedIds.filter((x) => x !== id) })
    else if (selectedIds.length < MAX) update({ c: [...selectedIds, id] })
  }

  const all = useMeasures(selectedIds)
  const failed = useMeasuresFailed()
  const lists: Record<string, Measure[]> | null = all && Object.fromEntries(selected.map((c) => [c.id, apply(byTheme(all[c.id], theme.id))]))

  const share = async () => {
    // Lien de partage dédié : il affiche une vignette (thème, candidats) dans les messageries et réseaux sociaux.
    const url = shareUrl(theme.id, selectedIds)
    const title = selected.length
      ? `${theme.label} : ${selected.map((c) => fullName(c)).join(', ')}`
      : `Comparer les programmes : ${theme.label}`
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copiez ce lien :', url)
    }
  }

  const exportImage = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
      const url = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: bg, filter: (n) => !(n instanceof HTMLElement && n.dataset.noExport) })
      const a = document.createElement('a')
      a.href = url
      a.download = `comparaison-${theme.id}-${selectedIds.join('-')}.png`
      a.click()
    } catch {
      window.print()
    } finally {
      setExporting(false)
    }
  }

  const counts = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, candidates.filter((c) => countFor(c.id, t.id) > 0).length])), [])

  return (
    <div>
      <PageHeader eyebrow="Comparateur" title="Comparer les mesures par thème">
        Choisissez un thème puis 2 à {MAX} candidats.
        {window.location.protocol !== 'file:' && ' Le lien de la page conserve votre sélection pour la partager.'}
      </PageHeader>

      {/* 1. Thème */}
      <section aria-labelledby="step-theme" className="mb-6">
        <h2 id="step-theme" className="mb-3 text-sm font-semibold text-ink">
          <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-bg">1</span>
          Thème
        </h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="radiogroup" aria-label="Thème">
          {themes.map((t) => {
            const active = t.id === theme.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ theme: t.id })}
                className={cx(
                  'relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'border-transparent text-bg' : 'border-line bg-surface text-ink-2 hover:text-ink',
                )}
              >
                {active && <motion.span layoutId="theme-pill" className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative inline-flex items-center gap-1.5">
                  <ThemeIcon theme={t} className="size-3.5" />
                  {t.short}
                  <span className={cx('text-[11px] tabular-nums', active ? 'opacity-70' : 'text-muted')}>{counts[t.id]}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 2. Candidats */}
      <section aria-labelledby="step-candidates" className="mb-6">
        <h2 id="step-candidates" className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-bg">2</span>
          Candidats
          <span className="font-normal text-muted">
            {selected.length}/{MAX} sélectionnés
          </span>
          {selected.length > 0 && (
            <button type="button" onClick={() => update({ c: [] })} className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
              Vider
            </button>
          )}
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sélection des candidats">
          {candidates.map((c) => {
            const active = selectedIds.includes(c.id)
            const n = countFor(c.id, theme.id)
            const disabled = !active && selectedIds.length >= MAX
            return (
              <motion.button
                key={c.id}
                type="button"
                layout
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleCandidate(c.id)}
                disabled={disabled}
                aria-pressed={active}
                title={disabled ? `Maximum ${MAX} candidats` : undefined}
                className={cx(
                  'inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  active ? 'bg-surface font-semibold text-ink' : 'border-line bg-surface text-ink-2 hover:text-ink',
                )}
                style={active ? { borderColor: c.color, boxShadow: `inset 0 0 0 1px ${c.color}` } : undefined}
              >
                <CandidateAvatar candidate={c} size="sm" decorative />
                {c.last_name}
                <span className="text-[11px] tabular-nums text-muted" aria-label={plural(n, 'mesure', 'mesures')}>
                  {n}
                </span>
                <AnimatePresence initial={false} mode="wait">
                  {active ? (
                    <motion.span key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <X className="size-3.5" aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <motion.span key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-muted">
                      <Plus className="size-3.5" aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* Barre d'outils */}
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label="Mode d'affichage">
          {(
            [
              { v: 'colonnes', label: 'Colonnes', Icon: Columns3 },
              { v: 'tableau', label: 'Tableau', Icon: Table2 },
            ] as const
          ).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => update({ vue: v })}
              className={cx('relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium', view === v ? 'text-bg' : 'text-muted hover:text-ink')}
            >
              {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative inline-flex items-center gap-1.5">
                <Icon className="size-4" aria-hidden="true" /> {label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink"
          >
            Filtres
          </button>
          {/* Un lien n'est partageable que depuis la version web (pas depuis l'application de bureau). */}
          {window.location.protocol !== 'file:' && (
            <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink">
              {copied ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
              {copied ? 'Lien copié' : 'Partager'}
            </button>
          )}
          <button
            type="button"
            onClick={exportImage}
            disabled={selected.length === 0 || exporting}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink disabled:opacity-40"
          >
            <Download className="size-4" aria-hidden="true" /> {exporting ? 'Export…' : 'Image'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={selected.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink disabled:opacity-40"
          >
            <Printer className="size-4" aria-hidden="true" /> PDF
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="no-print mb-5 overflow-hidden">
            <MeasureFilters />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Résultat */}
      <div ref={exportRef}>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-ink">
            <ThemeIcon theme={theme} className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">{theme.label}</h2>
            <p className="text-sm text-muted">{theme.description}</p>
          </div>
        </div>

        {selected.length === 0 ? (
          <EmptyState icon={<Columns3 className="size-8" />} title="Sélectionnez au moins deux candidats">
            Cliquez sur les noms ci-dessus pour afficher leurs mesures côte à côte.
          </EmptyState>
        ) : (
          <>
            {selected.length === 1 && (
              <p className="mb-4 rounded-xl bg-surface-2 px-4 py-2 text-sm text-ink-2" data-no-export="true">
                Ajoutez au moins un autre candidat pour comparer.
              </p>
            )}
            {failed && !all && (
              <p className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2" role="alert">
                Les mesures n'ont pas pu être chargées (connexion interrompue ou nouvelle version publiée).{' '}
                <button type="button" onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">
                  Recharger la page
                </button>
              </p>
            )}
            <Indicators theme={theme} selected={selected} all={all} />
            {view === 'colonnes' ? (
              <div
                className={cx(
                  'snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-thin sm:mx-0 sm:grid sm:overflow-visible sm:px-0',
                  selected.length === 2 && 'sm:grid-cols-2',
                  selected.length === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                  selected.length >= 4 && 'sm:grid-cols-2 xl:grid-cols-4',
                )}
              >
                <AnimatePresence mode="popLayout">
                  {selected.map((c) => (
                    <Column key={c.id} candidate={c} theme={theme} list={lists?.[c.id] ?? null} total={countFor(c.id, theme.id)} />
                  ))}
                </AnimatePresence>
              </div>
            ) : lists && all ? (
              <TableView theme={theme} selected={selected} lists={lists} all={all} />
            ) : (
              <Skeleton className="h-96" />
            )}
            {selected.length > 1 && (
              <p className="mt-2 text-center text-xs text-muted sm:hidden" data-no-export="true">
                Faites glisser horizontalement pour passer d'un candidat à l'autre.
              </p>
            )}
          </>
        )}
        <p className="mt-6 text-xs text-muted">
          Sources : documents officiels des candidats et sources secondaires étiquetées. Outil indépendant et non officiel —{' '}
          <Link to="/methodologie" className="underline underline-offset-2">
            méthodologie
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
