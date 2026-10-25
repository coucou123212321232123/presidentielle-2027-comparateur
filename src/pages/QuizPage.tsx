import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RotateCcw, Share2, Sparkles, X } from 'lucide-react'
import { allCandidateIds, candidateById, candidates, themeById, useMeasures, useMeasuresFailed } from '../data'
import type { Candidate, Measure } from '../data/schema'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { ThemeIcon } from '../components/ThemeIcon'
import { Card, PageHeader, Skeleton, cx } from '../components/ui'
import { copyText, siteBase } from '../lib/share'
import { fullName, normalize } from '../lib/format'

const ROUND = 10
const CHOICES = 4

// Mots qui trahiraient l'auteur d'une mesure : noms, partis, mouvements. Les mesures dont le titre en contient sont écartées.
const EXTRA_GIVEAWAYS = ['RN', 'LFI', 'insoumis', 'Reconquête', 'Lutte ouvrière', 'PCF', 'communiste', 'Horizons', 'Renaissance', 'écologiste', 'Debout', 'Place publique', 'Nouvelle Énergie', 'France humaniste', 'Républicains']
const giveaways = [
  ...candidates.flatMap((c) => [c.last_name.replace(/^de /, ''), c.party_short, c.party]),
  ...EXTRA_GIVEAWAYS,
].map(normalize)
const reveals = (title: string) => {
  const t = ` ${normalize(title)} `
  return giveaways.some((g) => (g.length <= 3 ? new RegExp(`[^a-z]${g}[^a-z]`).test(t) : t.includes(g)))
}

interface Question {
  measure: Measure
  answer: Candidate
  options: Candidate[]
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const shuffle = <T,>(list: T[]) => list.map((v) => ({ v, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.v)

/**
 * Une manche : chaque question tire d'abord un candidat au hasard (même chance pour tous), puis l'une de ses mesures
 * officielles ou chiffrées dont le titre ne le trahit pas, et trois autres candidats comme fausses réponses.
 */
function newRound(all: Record<string, Measure[]>): Question[] {
  const eligible = Object.fromEntries(
    candidates.map((c) => [c.id, (all[c.id] ?? []).filter((m) => m.source_type !== 'analyse_tierce' && m.precision !== 'orientation_generale' && !reveals(m.title))]),
  )
  const pool = candidates.filter((c) => eligible[c.id].length > 0)
  const used = new Set<string>()
  const round: Question[] = []
  // Pas deux fois de suite le même candidat, pas deux fois la même mesure.
  for (let attempt = 0; round.length < ROUND && pool.length >= CHOICES && attempt < 200; attempt++) {
    const answer = pick(pool.filter((c) => c.id !== round.at(-1)?.answer.id))
    const measure = pick(eligible[answer.id].filter((m) => !used.has(m.id)))
    if (!measure) continue
    used.add(measure.id)
    const others = shuffle(pool.filter((c) => c.id !== answer.id)).slice(0, CHOICES - 1)
    round.push({ measure, answer, options: shuffle([answer, ...others]) })
  }
  return round
}

function Result({ score, onReplay }: { score: number; onReplay: () => void }) {
  const [shared, setShared] = useState(false)
  const text = `J'ai reconnu ${score} propositions sur ${ROUND} au jeu « Qui propose quoi ? » sur les programmes de la présidentielle 2027. À vous :`
  const url = `${siteBase()}jeu/`
  async function share() {
    if (navigator.share) {
      await navigator.share({ text, url }).catch(() => {})
      return
    }
    setShared(await copyText(`${text} ${url}`))
    window.setTimeout(() => setShared(false), 2500)
  }
  return (
    <Card className="p-6 text-center sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Score</p>
      <p className="mt-1 font-display text-5xl font-semibold text-ink">
        {score}
        <span className="text-2xl text-muted"> / {ROUND}</span>
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-2">
        Les programmes se ressemblent parfois plus qu'on ne le pense. Pour aller plus loin, comparez les mesures thème par thème.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onReplay} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg">
          <RotateCcw className="size-4" aria-hidden="true" /> Rejouer
        </button>
        <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink-2 hover:text-ink">
          {shared ? <Check className="size-4 text-green-600" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
          <span aria-live="polite">{shared ? 'Copié, à coller où vous voulez' : 'Partager mon score'}</span>
        </button>
        <Link to="/comparateur" className="inline-flex items-center rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink-2 hover:text-ink">
          Ouvrir le comparateur
        </Link>
      </div>
    </Card>
  )
}

export default function QuizPage() {
  const all = useMeasures(allCandidateIds)
  const failed = useMeasuresFailed()
  const [seed, setSeed] = useState(0)
  const round = useMemo(() => (all ? newRound(all) : []), [all, seed])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [score, setScore] = useState(0)

  const replay = () => {
    setSeed((s) => s + 1)
    setIndex(0)
    setChosen(null)
    setScore(0)
  }
  const q = round[index]
  const done = round.length > 0 && index >= round.length

  function answer(id: string) {
    if (chosen || !q) return
    setChosen(id)
    if (id === q.answer.id) setScore((s) => s + 1)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Jeu" title="Qui propose quoi ?">
        Une proposition s'affiche : devinez quel candidat la défend. {ROUND} questions, tirées au hasard dans les programmes ; chaque candidat a
        la même chance d'apparaître. Le jeu ne calcule aucune proximité politique.
      </PageHeader>

      {!all ? (
        failed ? (
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2" role="alert">
            Les mesures n'ont pas pu être chargées.{' '}
            <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
              Recharger la page
            </button>
          </p>
        ) : (
          <Skeleton className="h-80" />
        )
      ) : done ? (
        <Result score={score} onReplay={replay} />
      ) : q ? (
        <Card className="p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted">
            <span>
              Question {index + 1} / {round.length}
            </span>
            <span>
              Score : <span className="font-semibold text-ink">{score}</span>
            </span>
          </div>
          <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / round.length) * 100}%` }} />
          </div>

          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-ink-2">
            <ThemeIcon theme={themeById[q.measure.theme]} className="size-3.5" /> {themeById[q.measure.theme]?.label}
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-ink">« {q.measure.title} »</h2>

          <div className="mt-6 grid gap-2 sm:grid-cols-2" role="group" aria-label="Qui propose cette mesure ?">
            {q.options.map((c) => {
              const right = chosen && c.id === q.answer.id
              const wrong = chosen === c.id && c.id !== q.answer.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => answer(c.id)}
                  disabled={Boolean(chosen)}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                    !chosen && 'border-line bg-surface hover:border-ink-2/40',
                    right && 'border-green-600 bg-green-600/10',
                    wrong && 'border-rose-600 bg-rose-600/10',
                    chosen && !right && !wrong && 'border-line opacity-60',
                  )}
                >
                  <CandidateAvatar candidate={c} size="md" decorative />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{fullName(c)}</span>
                    <span className="block truncate text-xs text-muted">{c.party_short}</span>
                  </span>
                  {right && <Check className="size-5 shrink-0 text-green-600" aria-label="Bonne réponse" />}
                  {wrong && <X className="size-5 shrink-0 text-rose-600" aria-label="Mauvaise réponse" />}
                </button>
              )
            })}
          </div>

          {chosen && (
            <div className="mt-6 rounded-2xl border border-line bg-surface-2/40 p-4" aria-live="polite">
              <p className="flex items-center gap-2 font-semibold text-ink">
                {chosen === q.answer.id ? (
                  <>
                    <Sparkles className="size-4 text-green-600" aria-hidden="true" /> Bonne réponse !
                  </>
                ) : (
                  <>C'est une proposition de {fullName(candidateById[q.answer.id] ?? q.answer)}.</>
                )}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{q.measure.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <SourceTypeBadge type={q.measure.source_type} />
                <ExternalLink href={q.measure.source_url} className="font-medium text-accent hover:underline">
                  Source
                </ExternalLink>
                <Link to={`/candidats/${q.answer.id}?theme=${q.measure.theme}&mesure=${q.measure.id}`} className="font-medium text-muted hover:text-ink">
                  Voir dans sa fiche
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIndex((i) => i + 1)
                  setChosen(null)
                }}
                className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg"
                autoFocus
              >
                {index + 1 < round.length ? 'Question suivante' : 'Voir mon score'}
              </button>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  )
}
