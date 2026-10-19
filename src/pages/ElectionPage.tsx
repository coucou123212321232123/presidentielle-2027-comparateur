import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Info, PenLine, Radio } from 'lucide-react'
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

function Timeline() {
  return (
    <section aria-labelledby="calendrier" className="mb-12">
      <h2 id="calendrier" className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <CalendarDays className="size-5 text-muted" aria-hidden="true" /> Calendrier officiel
      </h2>
      <ol className="relative space-y-3 border-l-2 border-line pl-6">
        {calendar.events.map((e) => {
          const past = daysUntil(e.date) < 0
          return (
            <li key={e.id} className={cx('relative', past && 'opacity-60')}>
              <span
                className={cx('absolute -left-[31px] top-1.5 size-3.5 rounded-full border-2 border-bg', e.main ? 'bg-ink' : 'bg-muted')}
                aria-hidden="true"
              />
              <p className="text-sm font-semibold tabular-nums text-muted">
                {e.qualifier === 'au_plus_tard' ? 'Au plus tard le ' : ''}
                {formatDate(e.date)}
                {past && ' · passé'}
              </p>
              <p className={cx('text-ink', e.main ? 'text-lg font-semibold' : 'font-medium')}>{e.label}</p>
              {e.note && <p className="mt-0.5 text-sm text-ink-2">{e.note}</p>}
              <ExternalLink href={e.source_url} className="mt-0.5 inline-flex text-xs text-muted hover:text-ink">
                {e.source_label}
              </ExternalLink>
            </li>
          )
        })}
      </ol>
      {calendar.pending.length > 0 && (
        <div className="mt-6 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
          <p className="mb-1 font-medium text-ink">Dates à venir</p>
          <ul className="list-disc space-y-1 pl-5">
            {calendar.pending.map((p) => (
              <li key={p.label}>
                {p.label} : <span className="text-muted">{p.note}</span>
              </li>
            ))}
          </ul>
        </div>
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
        Les dates officielles, l'avancée des parrainages et le temps de parole des candidats, d'après les sources officielles et mis à jour
        automatiquement.
      </PageHeader>
      <Countdown />
      <Timeline />
      <Parrainages />
      <SpeakingTime />
    </div>
  )
}
