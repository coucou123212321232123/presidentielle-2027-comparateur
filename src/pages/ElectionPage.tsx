import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Info, PenLine, Radio, Tv } from 'lucide-react'
import { candidateById, candidates } from '../data'
import { calendar, daysUntil, formatDuration, nextEvent, parrainages, speakingTime } from '../data/elections'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { ExternalLink } from '../components/ExternalLink'
import { Card, Chip, cx, PageHeader } from '../components/ui'
import { formatDate, formatShortDate, fullName, plural } from '../lib/format'

const firstRound = calendar.events.find((e) => e.id === 'premier-tour')

function Countdown() {
  const next = nextEvent()
  const days = firstRound ? daysUntil(firstRound.date) : null
  return (
    <Card className="mb-10 grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-8">
      {days !== null && days >= 0 && (
        <div>
          <p className="font-display text-6xl font-semibold tabular-nums leading-none text-ink">{days}</p>
          <p className="mt-2 text-sm text-muted">{days > 1 ? 'jours avant le premier tour' : days === 1 ? 'jour avant le premier tour' : "C'est le jour du premier tour"}</p>
        </div>
      )}
      {next && (
        <div className="min-w-0 border-line sm:border-l sm:pl-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Prochaine étape</p>
          <p className="mt-1 text-lg font-semibold text-ink">{next.label}</p>
          <p className="mt-0.5 text-sm text-ink-2">
            {next.qualifier === 'au_plus_tard' ? 'Au plus tard le ' : 'Le '}
            {formatDate(next.date)}
            {daysUntil(next.date) > 0 && <span className="text-muted"> · dans {plural(daysUntil(next.date), 'jour', 'jours')}</span>}
          </p>
        </div>
      )}
    </Card>
  )
}

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const at = (iso: string) => new Date(`${iso}T12:00:00`)

/** Bloc de date (mois, jour en grand, année) en tête de chaque étape. */
function DateBlock({ iso, strong, muted }: { iso: string; strong?: boolean; muted?: boolean }) {
  const d = at(iso)
  return (
    <div
      className={cx(
        'flex w-16 shrink-0 flex-col items-center justify-center self-start rounded-xl py-2 text-center sm:w-20',
        strong ? 'bg-ink text-bg' : 'bg-surface-2 text-ink',
        muted && 'opacity-70',
      )}
      aria-hidden="true"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{MONTH.format(d).replace('.', '')}</span>
      <span className="font-display text-3xl font-semibold leading-none tabular-nums">{d.getDate()}</span>
      <span className="text-[11px] tabular-nums opacity-70">{d.getFullYear()}</span>
    </div>
  )
}

/** « Dans 144 jours », « Demain », « Aujourd'hui » ou « Passé ». */
function DaysLeft({ iso, upTo }: { iso: string; upTo?: boolean }) {
  const n = daysUntil(iso)
  const label = n < 0 ? 'Passé' : n === 0 ? "Aujourd'hui" : n === 1 ? 'Demain' : `${upTo ? 'Au plus tard dans' : 'Dans'} ${n} jours`
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        n < 0 ? 'bg-surface-2 text-muted' : n <= 7 ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' : 'bg-surface-2 text-ink',
      )}
    >
      {label}
    </span>
  )
}

function Timeline() {
  // Étapes regroupées par date (ex. clôture des parrainages et des inscriptions le même jour).
  const days = [...new Set(calendar.events.map((e) => e.date))].map((date) => ({
    date,
    events: calendar.events.filter((e) => e.date === date),
  }))
  return (
    <section aria-labelledby="calendrier" className="mb-12">
      <h2 id="calendrier" className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <CalendarDays className="size-5 text-muted" aria-hidden="true" /> Calendrier officiel
      </h2>
      <ol className="space-y-3">
        {days.map(({ date, events }) => {
          const past = daysUntil(date) < 0
          const main = events.some((e) => e.main)
          const upTo = events.every((e) => e.qualifier === 'au_plus_tard')
          return (
            <li key={date}>
              <Card className={cx('flex gap-4 p-3 sm:p-4', main && !past && 'ring-1 ring-ink/20', past && 'opacity-60')}>
                <DateBlock iso={date} strong={main && !past} muted={past} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-xs font-medium text-muted first-letter:uppercase">
                      {upTo ? 'au plus tard le ' : ''}
                      {WEEKDAY.format(at(date))} {formatDate(date)}
                    </p>
                    <DaysLeft iso={date} upTo={upTo} />
                  </div>
                  <ul className="mt-1 space-y-2">
                    {events.map((e) => (
                      <li key={e.id}>
                        <p className={cx('text-ink', e.main ? 'text-lg font-semibold' : 'font-semibold')}>{e.label}</p>
                        {e.note && <p className="text-sm leading-relaxed text-ink-2">{e.note}</p>}
                        <ExternalLink href={e.source_url} className="text-xs text-muted hover:text-ink">
                          Source : {e.source_label}
                        </ExternalLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </li>
          )
        })}
        {calendar.pending.map((p) => (
          <li key={p.label}>
            <Card className="flex gap-4 border-dashed p-3 sm:p-4">
              <div
                className="flex w-16 shrink-0 flex-col items-center justify-center self-start rounded-xl border border-dashed border-line py-2 text-center text-muted sm:w-20"
                aria-hidden="true"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide">Date</span>
                <span className="font-display text-2xl font-semibold leading-none">?</span>
                <span className="text-[11px]">à venir</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{p.label}</p>
                <p className="text-sm text-muted">{p.note}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DebateCard({ d }: { d: (typeof calendar.debates)[number] }) {
  const past = daysUntil(d.date) < 0
  return (
    <Card className={cx('flex gap-4 p-3 sm:p-4', past && 'opacity-75')}>
      <DateBlock iso={d.date} muted={past} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-xs font-medium text-muted">
            {d.channels.join(' · ')}
            {d.time && ` · ${d.time.replace(':', ' h ')}`}
          </p>
          <DaysLeft iso={d.date} />
        </div>
        <p className="mt-1 font-semibold text-ink">{d.title}</p>
        {((d.participants?.length ?? 0) > 0 || (d.others?.length ?? 0) > 0) && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {(d.participants ?? []).map((id) => {
              const c = candidateById[id]
              return c ? (
                <Link
                  key={id}
                  to={`/candidats/${id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 text-xs text-ink-2 hover:text-ink"
                >
                  <CandidateAvatar candidate={c} size="sm" decorative />
                  {fullName(c)}
                </Link>
              ) : null
            })}
            {(d.others ?? []).map((name) => (
              <span key={name} className="inline-flex items-center rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-ink-2">
                {name}
              </span>
            ))}
          </p>
        )}
        {d.note && <p className="mt-2 text-sm leading-relaxed text-ink-2">{d.note}</p>}
        <ExternalLink href={d.source_url} className="mt-1 inline-flex text-xs text-muted hover:text-ink">
          Source : {d.source_label}
        </ExternalLink>
      </div>
    </Card>
  )
}

function Debates() {
  const upcoming = calendar.debates.filter((d) => daysUntil(d.date) >= 0)
  const past = calendar.debates.filter((d) => daysUntil(d.date) < 0).reverse()
  return (
    <section aria-labelledby="debats" className="mb-12">
      <h2 id="debats" className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <Tv className="size-5 text-muted" aria-hidden="true" /> Débats télévisés
      </h2>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">À venir</h3>
      {upcoming.length ? (
        <ul className="mb-6 space-y-3">
          {upcoming.map((d) => (
            <li key={`${d.date}-${d.title}`}>
              <DebateCard d={d} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mb-6 flex items-start gap-3 p-4 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <p>Aucun débat à venir n'a encore été confirmé. Les prochains s'afficheront ici dès leur annonce par une chaîne.</p>
        </Card>
      )}
      {past.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Déjà diffusés</h3>
          <ul className="space-y-3">
            {past.map((d) => (
              <li key={`${d.date}-${d.title}`}>
                <DebateCard d={d} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Parrainages() {
  const p = parrainages
  const list = p.candidates.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <section aria-labelledby="parrainages" className="mb-12">
      <h2 id="parrainages" className="mb-2 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <PenLine className="size-5 text-muted" aria-hidden="true" /> Parrainages
      </h2>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">
        {p.rule.text}{' '}
        <ExternalLink href={p.rule.source_url} className="text-xs text-muted hover:text-ink">
          {p.rule.source_label}
        </ExternalLink>
      </p>
      {p.status === 'non_commence' || !list.length ? (
        <Card className="flex items-start gap-3 p-5 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <p>
            La collecte des parrainages n'a pas encore commencé. Dès que le Conseil constitutionnel publiera les parrainages validés (plusieurs
            fois par semaine pendant la collecte), leur nombre par candidat s'affichera ici automatiquement, d'après son fichier officiel.
          </p>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="mb-4 text-xs text-muted">
            {p.status === 'clos' ? 'Collecte close' : 'Collecte en cours'} · parrainages validés publiés au {formatShortDate(p.published_at)} ·
            ordre alphabétique · source :{' '}
            {p.source_url && (
              <ExternalLink href={p.source_url} className="hover:text-ink">
                {p.source_label}
              </ExternalLink>
            )}
          </p>
          <ul className="space-y-3">
            {list.map((c) => {
              const cand = c.candidate ? candidateById[c.candidate] : undefined
              const pct = Math.min(100, (c.total / p.threshold) * 100)
              return (
                <li key={c.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[13rem_minmax(0,1fr)_auto]">
                  <span className="flex min-w-0 items-center gap-2">
                    {cand && <CandidateAvatar candidate={cand} size="sm" decorative />}
                    {cand ? (
                      <Link to={`/candidats/${cand.id}`} className="truncate font-medium text-ink hover:underline">
                        {fullName(cand)}
                      </Link>
                    ) : (
                      <span className="truncate text-ink-2">{c.name}</span>
                    )}
                  </span>
                  <span className="relative order-last col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-2 sm:order-none sm:col-span-1" aria-hidden="true">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: cand?.color ?? 'var(--color-muted)' }} />
                  </span>
                  <span className="whitespace-nowrap text-right tabular-nums text-ink">
                    {c.total} <span className="text-xs text-muted">· {c.departments} dép.</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-muted">Barre pleine : {p.threshold} parrainages atteints.</p>
        </Card>
      )}
    </section>
  )
}

type Period = 1 | 3 | 12

function SpeakingTime() {
  const st = speakingTime
  const [period, setPeriod] = useState<Period>(3)
  const months = st.months.slice(-period)
  const label = (m: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${m}-01T12:00:00Z`))
  const rows = candidates.map((c) => {
    const e = st.candidates[c.id]
    return { c, e, total: months.reduce((sum, m) => sum + (e?.seconds[m] ?? 0), 0) }
  })
  const max = Math.max(1, ...rows.map((r) => r.total))
  const range = months.length > 1 ? `de ${label(months[0])} à ${label(months.at(-1)!)}` : `en ${label(months[0])}`

  return (
    <section aria-labelledby="temps-de-parole" className="mb-12">
      <h2 id="temps-de-parole" className="mb-2 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <Radio className="size-5 text-muted" aria-hidden="true" /> Temps de parole à la télévision et à la radio
      </h2>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">
        Temps de parole de chaque candidat, toutes chaînes et radios suivies par l'Arcom et tous types d'émissions confondus, d'après les relevés
        mensuels publiés par l'Arcom (environ trois mois après la diffusion).
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([1, 3, 12] as Period[]).map((p) => (
          <Chip key={p} active={period === p} onClick={() => setPeriod(p)} className="text-xs">
            {p === 1 ? 'Dernier mois publié' : `${p} derniers mois`}
          </Chip>
        ))}
      </div>
      <Card className="p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden="true" /> Total {range} · ordre alphabétique
        </p>
        <ul className="space-y-3">
          {rows.map(({ c, e, total }) => (
            <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[13rem_minmax(0,1fr)_5.5rem]">
              <Link to={`/candidats/${c.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                <CandidateAvatar candidate={c} size="sm" decorative />
                <span className="truncate font-medium text-ink">{fullName(c)}</span>
              </Link>
              <span className="relative order-last col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-2 sm:order-none sm:col-span-1" aria-hidden="true">
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(total / max) * 100}%`, backgroundColor: c.color }} />
              </span>
              <span className="text-right tabular-nums text-ink">{e ? formatDuration(total) : <span className="text-xs text-muted">non relevé</span>}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-1 border-t border-line pt-3 text-xs text-muted">
          <p>
            Relevés déclarés par les chaînes et radios puis contrôlés par l'Arcom, hors période électorale : ils comptent toutes les interventions
            de la personne, quel que soit son rôle. Les vidéos en ligne et les podcasts ne sont pas couverts. « Non relevé » : personne absente des
            relevés publiés sur la période.
          </p>
          <p>
            Source :{' '}
            <ExternalLink href={st.source_url} className="hover:text-ink">
              {st.source_label}
            </ExternalLink>{' '}
            · dernier mois publié : {label(st.months.at(-1)!)}
          </p>
        </div>
      </Card>
    </section>
  )
}

export default function ElectionPage() {
  return (
    <div>
      <PageHeader eyebrow="L'élection" title={calendar.election}>
        Les dates officielles, les débats télévisés, l'avancée des parrainages et le temps de parole des candidats, d'après les sources officielles et mis à jour
        automatiquement.
      </PageHeader>
      <Countdown />
      <Timeline />
      <Debates />
      <Parrainages />
      <SpeakingTime />
    </div>
  )
}
