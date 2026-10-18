import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Columns3, Globe, Users, Target, Briefcase, History, FileSearch, Landmark } from 'lucide-react'
import { byTheme, candidateById, countFor, meta, summary, themes, useMeasures, useMeasuresFailed } from '../data'
import { votes } from '../data/votes'
import type { ThemeId } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { NewCountBadge, SourceTypeBadge, StatusBadge } from '../components/Badges'
import { VoteBadge } from '../components/Hemicycle'
import { PositionScale } from '../components/PositionScale'
import { ProgramBlock, ThemeProgramLink } from '../components/Program'
import { ExternalLink } from '../components/ExternalLink'
import { Accordion } from '../components/Accordion'
import { MeasureCard } from '../components/MeasureCard'
import { MeasureFilters } from '../components/MeasureFilters'
import { ThemeIcon } from '../components/ThemeIcon'
import { Card, EmptyState, Skeleton } from '../components/ui'
import { useMeasureFilter } from '../lib/store'
import { newCount, useNovelty } from '../lib/novelty'
import { ageAt, formatDate, formatShortDate, fullName, plural } from '../lib/format'
import NotFoundPage from './NotFoundPage'

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-muted">{icon}</span>
        {title}
      </h2>
      {children}
    </Card>
  )
}

export default function CandidatePage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const candidate = candidateById[id]
  const initialTheme = params.get('theme') as ThemeId | null
  const since = useNovelty((s) => s.since)
  // Depuis le bandeau des nouveautés : les thèmes qui contiennent de nouvelles mesures sont dépliés.
  const [open, setOpen] = useState<Set<ThemeId>>(() =>
    params.get('nouveautes') ? new Set(themes.filter((t) => newCount(since, id, t.id) > 0).map((t) => t.id)) : new Set(initialTheme ? [initialTheme] : []),
  )
  const { apply, active } = useMeasureFilter()
  const loaded = useMeasures(candidate ? [candidate.id] : [])
  const failed = useMeasuresFailed()

  if (!candidate) return <NotFoundPage />

  const all = loaded?.[candidate.id] ?? null
  const total = countFor(candidate.id)
  const age = ageAt(candidate.birth_date, meta.last_updated)
  const covered = themes.filter((t) => summary[candidate.id]?.byTheme[t.id])
  const uncovered = themes.filter((t) => !summary[candidate.id]?.byTheme[t.id])
  const myVotes = votes.scrutins.flatMap((s) => s.candidates.filter((p) => p.candidate === candidate.id).map((p) => ({ s, vote: p.vote })))
  const toggle = (t: ThemeId) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })

  return (
    <div>
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous les candidats
      </Link>

      {/* En-tête */}
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
        <div
          className="h-24 sm:h-28"
          style={{ background: `linear-gradient(120deg, ${candidate.color}, ${candidate.color}66 60%, ${candidate.color}22)` }}
          aria-hidden="true"
        />
        <div className="relative -mt-14 flex flex-col gap-5 px-6 pb-6 sm:-mt-16 sm:flex-row sm:items-end sm:px-8 sm:pb-8">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <CandidateAvatar candidate={candidate} size="xl" />
          </motion.div>
          <div className="min-w-0 flex-1 sm:pt-20">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={candidate.status} />
              {candidate.declaration_date && <span className="text-xs text-muted">Déclaration : {formatDate(candidate.declaration_date)}</span>}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{fullName(candidate)}</h1>
            <p className="mt-1 text-base text-ink-2">
              {candidate.party} ({candidate.party_short}){age !== null && <> · {age} ans</>}
            </p>
            {candidate.slogan && (
              <p className="mt-3 font-display text-lg italic text-ink-2">
                « {candidate.slogan} »{' '}
                {candidate.slogan_source_url && (
                  <ExternalLink href={candidate.slogan_source_url} className="align-middle text-xs not-italic text-muted hover:text-ink" icon={false}>
                    source
                  </ExternalLink>
                )}
              </p>
            )}
          </div>
          <div className="w-full sm:w-64">
            <PositionScale candidate={candidate} showSource />
          </div>
        </div>
        {candidate.status_note && (
          <p className="relative border-t border-line px-6 py-3 text-sm text-ink-2 sm:px-8">
            {candidate.status_note}{' '}
            {candidate.status_source_url && (
              <ExternalLink href={candidate.status_source_url} className="text-xs text-muted hover:text-ink">
                source
              </ExternalLink>
            )}
          </p>
        )}
        <div className="relative flex flex-wrap items-center gap-2 border-t border-line px-6 py-3 sm:px-8">
          <Link
            to={`/comparateur?c=${candidate.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg"
          >
            <Columns3 className="size-4" aria-hidden="true" /> Comparer avec d'autres candidats
          </Link>
          {candidate.website && (
            <ExternalLink href={candidate.website} className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink">
              <Globe className="size-4" aria-hidden="true" /> Site officiel
            </ExternalLink>
          )}
          {candidate.socials.map((s) => (
            <ExternalLink key={s.url} href={s.url} className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink">
              {s.platform}
            </ExternalLink>
          ))}
        </div>
      </section>

      <div className="mb-10">
        <ProgramBlock candidate={candidate} />
      </div>

      {/* Portrait */}
      <section aria-labelledby="portrait" className="mb-12">
        <h2 id="portrait" className="sr-only">
          Portrait
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <InfoCard icon={<History className="size-4" />} title="Parcours">
              <p className="leading-relaxed text-ink-2">{candidate.bio_summary}</p>
            </InfoCard>
            {candidate.main_axes.length > 0 && (
              <InfoCard icon={<Target className="size-4" />} title="Axes principaux du projet">
                <ol className="space-y-2">
                  {candidate.main_axes.map((a, i) => (
                    <li key={a} className="flex gap-3 text-ink-2">
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: `${candidate.color}1f`, color: candidate.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{a}</span>
                    </li>
                  ))}
                </ol>
                {candidate.main_axes_source_url && (
                  <p className="mt-3 text-xs text-muted">
                    <ExternalLink href={candidate.main_axes_source_url} className="hover:text-ink">
                      Source des axes
                    </ExternalLink>
                  </p>
                )}
              </InfoCard>
            )}
          </div>
          <div className="space-y-4">
            <InfoCard icon={<Briefcase className="size-4" />} title="Fonctions">
              {candidate.current_roles.length > 0 && (
                <>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Actuelles</h3>
                  <ul className="mb-3 list-disc space-y-1 pl-4 text-sm text-ink-2">
                    {candidate.current_roles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
              {candidate.past_roles.length > 0 && (
                <>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Passées</h3>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-ink-2">
                    {candidate.past_roles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
            </InfoCard>
            {myVotes.length > 0 && (
              <InfoCard icon={<Landmark className="size-4" />} title="Votes à l'Assemblée sur les grands textes">
                <div className="mb-3">
                  <SourceTypeBadge type="vote_ou_bilan" />
                </div>
                <ul className="space-y-3 text-sm">
                  {myVotes.slice(0, 6).map(({ s, vote }) => (
                    <li key={s.id}>
                      <Link to={`/votes/${s.id}`} className="block rounded-lg hover:bg-surface-2/60">
                        <span className="block font-medium text-ink">{s.short_title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <VoteBadge scrutin={s} vote={vote} />
                          {formatShortDate(s.date)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  <Link to={`/votes?candidat=${candidate.id}`} className="hover:text-ink hover:underline">
                    {myVotes.length > 6 ? `Voir ses ${myVotes.length} votes sur les grands textes` : 'Voir tous ses votes'}
                  </Link>{' '}
                  · source : Assemblée nationale
                </p>
              </InfoCard>
            )}
            {candidate.key_people.length > 0 && (
              <InfoCard icon={<Users className="size-4" />} title="Équipe et porte-parole">
                <ul className="space-y-2 text-sm">
                  {candidate.key_people.map((p) => (
                    <li key={p.name + p.role}>
                      <span className="font-medium text-ink">{p.name}</span>
                      <span className="block text-muted">{p.role}</span>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            )}
            <InfoCard icon={<FileSearch className="size-4" />} title="Sources de la fiche">
              <ul className="space-y-1.5 text-sm">
                {candidate.sources.map((s) => (
                  <li key={s.url}>
                    <ExternalLink href={s.url} className="text-accent hover:underline">
                      {s.label}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Fiche vérifiée le {formatShortDate(candidate.last_verified)}</p>
              {candidate.photo && (
                <p className="mt-1 text-xs text-muted">
                  Photo :{' '}
                  <ExternalLink href={candidate.photo.commons_page} className="hover:text-ink" icon={false}>
                    {candidate.photo.author ?? 'Wikimedia Commons'}, {candidate.photo.license}
                  </ExternalLink>
                </p>
              )}
            </InfoCard>
          </div>
        </div>
      </section>

      {/* Programme par thème */}
      <section aria-labelledby="mesures">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="mesures" className="font-display text-2xl font-semibold text-ink">
              Mesures par thème
            </h2>
            <p className="mt-1 text-sm text-muted">
              {plural(total, 'mesure sourcée', 'mesures sourcées')} sur {plural(covered.length, 'thème', 'thèmes')}.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <button type="button" className="font-medium text-muted hover:text-ink" onClick={() => setOpen(new Set(covered.map((t) => t.id)))}>
              Tout déplier
            </button>
            <span className="text-line" aria-hidden="true">|</span>
            <button type="button" className="font-medium text-muted hover:text-ink" onClick={() => setOpen(new Set())}>
              Tout replier
            </button>
          </div>
        </div>

        <div className="mb-5">
          <MeasureFilters />
        </div>

        {covered.length === 0 && (
          <EmptyState title="Pas de position publiée à ce jour">Aucune mesure sourcée n'a été recensée pour ce candidat.</EmptyState>
        )}

        <div className="space-y-3">
          {failed && !all && (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2" role="alert">
              Les mesures n'ont pas pu être chargées (connexion interrompue ou nouvelle version publiée).{' '}
              <button type="button" onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">
                Recharger la page
              </button>
            </p>
          )}
          {covered.map((t) => {
            const list = all ? apply(byTheme(all, t.id)) : []
            const count = countFor(candidate.id, t.id)
            const fresh = newCount(since, candidate.id, t.id)
            return (
              <Accordion
                key={t.id}
                open={open.has(t.id)}
                onToggle={() => toggle(t.id)}
                header={
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                      <ThemeIcon theme={t} />
                    </span>
                    <span>
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {t.label}
                        {fresh > 0 && <NewCountBadge n={fresh} />}
                      </span>
                      <span className="block text-xs text-muted">
                        {active && all ? `${list.length} / ${count} mesures (filtrées)` : plural(count, 'mesure', 'mesures')}
                      </span>
                    </span>
                  </span>
                }
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <ThemeProgramLink candidate={candidate} theme={t.id} />
                  <Link to={`/comparateur?theme=${t.id}&c=${candidate.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
                    <Columns3 className="size-4" aria-hidden="true" /> Comparer ce thème
                  </Link>
                </div>
                {all ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <AnimatePresence mode="popLayout">
                        {list.map((m) => (
                          <MeasureCard key={m.id} measure={m} accent={candidate.color} />
                        ))}
                      </AnimatePresence>
                    </div>
                    {list.length === 0 && <p className="text-sm text-muted">Aucune mesure ne correspond aux filtres actifs.</p>}
                  </>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Chargement des mesures">
                    {Array.from({ length: Math.min(count, 4) }, (_, i) => (
                      <Skeleton key={i} className="h-36" />
                    ))}
                  </div>
                )}
              </Accordion>
            )
          })}
        </div>

        {uncovered.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-2 text-sm font-semibold text-ink">Pas de position publiée à ce jour</h3>
            <p className="mb-3 text-sm text-muted">
              Aucune source n'a été trouvée pour ces thèmes à la date de vérification. Rien n'est déduit ni complété.
            </p>
            <ul className="flex flex-wrap gap-2">
              {uncovered.map((t) => (
                <li key={t.id} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted">
                  <ThemeIcon theme={t} className="size-3.5" />
                  {t.short}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
