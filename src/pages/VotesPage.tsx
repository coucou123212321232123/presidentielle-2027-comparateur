import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Landmark, XCircle } from 'lucide-react'
import { candidateById, themeById, votes } from '../data'
import type { Scrutin } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { GroupBar, Hemicycle, VOTE_ORDER, VoteBadge, voteLabel } from '../components/Hemicycle'
import { ThemeIcon } from '../components/ThemeIcon'
import { Badge, Card, EmptyState, PageHeader, cx } from '../components/ui'
import { formatDate, formatShortDate, fullName } from '../lib/format'

function ResultBadge({ s }: { s: Scrutin }) {
  const adopted = s.result === 'adopte'
  return (
    <Badge tone={adopted ? 'green' : 'neutral'}>
      {adopted ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <XCircle className="size-3" aria-hidden="true" />}
      {s.censure ? (adopted ? 'Motion adoptée' : 'Motion rejetée') : adopted ? 'Adopté' : 'Rejeté'}
    </Badge>
  )
}

function Detail({ s }: { s: Scrutin }) {
  const theme = themeById[s.theme]
  return (
    <motion.article key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceTypeBadge type="vote_ou_bilan" />
          <ResultBadge s={s} />
          {theme && (
            <Link to={`/comparateur?theme=${theme.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
              <ThemeIcon theme={theme} className="size-3.5" /> {theme.label}
            </Link>
          )}
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink">{s.short_title}</h2>
        <p className="mt-1 text-sm text-muted">
          Scrutin n° {s.numero} · {formatDate(s.date)} · {s.legislature}e législature · {s.vote_type}
        </p>
        <p className="mt-3 leading-relaxed text-ink-2">{s.context}</p>
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
          <span className="font-medium text-ink">Intitulé officiel : </span>
          {s.official_title}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(s.censure
            ? [
                { label: 'Pour la censure', value: s.totals.pour },
                { label: 'Majorité requise', value: s.majority_required ?? '—' },
              ]
            : [
                { label: 'Pour', value: s.totals.pour },
                { label: 'Contre', value: s.totals.contre },
                { label: 'Abstentions', value: s.totals.abstention },
                { label: 'Majorité requise', value: s.majority_required ?? '—' },
              ]
          ).map((x) => (
            <div key={x.label} className="rounded-xl border border-line px-3 py-2">
              <dt className="text-xs text-muted">{x.label}</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-ink">{x.value}</dd>
            </div>
          ))}
        </dl>
        {s.censure && (
          <p className="mt-3 text-xs text-muted">
            Pour une motion de censure, seuls les votes favorables sont recueillis : les députés qui ne la votent pas ne sont pas décomptés.
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-ink">L'hémicycle, siège par siège</h3>
        <Hemicycle scrutin={s} />
        <p className="mt-3 text-xs text-muted">
          Un point par député, regroupés par groupe politique (ordre indicatif de la gauche vers la droite) puis par position de vote. La
          place d'un point ne correspond pas au siège réel du député.
        </p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-1 text-sm font-semibold text-ink">Vote des candidats alors députés</h3>
        <p className="mb-4 text-xs text-muted">
          Vote personnel tel qu'enregistré par l'Assemblée. Les autres candidats n'étaient pas députés à cette date.
        </p>
        {s.candidates.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.candidates.map((p) => {
              const c = candidateById[p.candidate]
              if (!c) return null
              return (
                <li key={p.candidate}>
                  <Link to={`/candidats/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface-2/60">
                    <CandidateAvatar candidate={c} size="md" decorative />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{fullName(c)}</span>
                      <span className="block text-xs text-muted">{p.group ? `Groupe ${p.group}` : 'Député(e)'}</span>
                    </span>
                    <VoteBadge scrutin={s} vote={p.vote} />
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun candidat n'était député à cette date.</p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <h3 className="p-5 pb-3 text-sm font-semibold text-ink sm:px-6">Détail par groupe</h3>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Votes par groupe politique</caption>
            <thead>
              <tr className="border-y border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th scope="col" className="p-3 pl-5 sm:pl-6">
                  Groupe
                </th>
                {VOTE_ORDER.filter((v) => !s.censure || v === 'pour' || v === 'absent').map((v) => (
                  <th key={v} scope="col" className="p-3 text-right">
                    {s.censure && v === 'absent' ? 'Autres' : voteLabel(v, s.censure, true).replace(' ou non inscrits', '')}
                  </th>
                ))}
                <th scope="col" className="w-40 p-3 pr-5 sm:pr-6">
                  <span className="sr-only">Répartition</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {s.groups.map((g) => (
                <tr key={g.ref} className="border-b border-line last:border-0">
                  <th scope="row" className="p-3 pl-5 text-left font-normal sm:pl-6">
                    <span className="flex items-center gap-2">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
                      <span>
                        <span className="block font-semibold text-ink">{g.short}</span>
                        <span className="block text-xs text-muted">
                          {g.label} · {g.members} membres
                        </span>
                      </span>
                    </span>
                  </th>
                  {VOTE_ORDER.filter((v) => !s.censure || v === 'pour' || v === 'absent').map((v) => (
                    <td key={v} className={cx('p-3 text-right tabular-nums', g[v] ? 'text-ink' : 'text-muted/60')}>
                      {g[v]}
                    </td>
                  ))}
                  <td className="p-3 pr-5 sm:pr-6">
                    <GroupBar group={g} censure={s.censure} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-muted">
        Source :{' '}
        <ExternalLink href={s.source_url} className="font-medium text-accent hover:underline">
          Assemblée nationale, analyse du scrutin n° {s.numero}
        </ExternalLink>{' '}
        · données ouvertes{' '}
        <ExternalLink href={votes.source_url} className="hover:text-ink" icon={false}>
          data.assemblee-nationale.fr
        </ExternalLink>{' '}
        importées le {formatShortDate(votes.generated_at.slice(0, 10))}.
      </p>
    </motion.article>
  )
}

export default function VotesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const list = votes.scrutins
  const current = list.find((s) => s.id === id) ?? list[0]

  return (
    <div>
      <PageHeader eyebrow="Votes / bilan" title="Votes à l'Assemblée sur les grands textes">
        Les décomptes officiels de l'Assemblée nationale, groupe par groupe, et le vote personnel des candidats qui étaient députés.
        Ce sont des faits publics : ils complètent les programmes sans les remplacer.
      </PageHeader>

      {!current ? (
        <EmptyState icon={<Landmark className="size-8" />} title="Aucun scrutin importé pour le moment">
          Les votes sont importés depuis les données ouvertes de l'Assemblée nationale.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <nav aria-label="Scrutins" className="lg:sticky lg:top-24 lg:self-start">
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-thin lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {list.map((s) => {
                const active = s.id === current.id
                return (
                  <li key={s.id} className="w-64 shrink-0 lg:w-auto">
                    <button
                      type="button"
                      onClick={() => navigate(`/votes/${s.id}`, { replace: true })}
                      aria-current={active ? 'true' : undefined}
                      className={cx(
                        'block h-full w-full rounded-xl border p-3 text-left transition-colors',
                        active ? 'border-ink bg-surface shadow-soft' : 'border-line bg-surface hover:border-ink-2/40',
                      )}
                    >
                      <span className="block text-xs text-muted">{formatShortDate(s.date)}</span>
                      <span className="mt-0.5 block text-sm font-semibold leading-snug text-ink">{s.short_title}</span>
                      <span className="mt-1.5 block">
                        <ResultBadge s={s} />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          <Detail s={current} />
        </div>
      )}
    </div>
  )
}
