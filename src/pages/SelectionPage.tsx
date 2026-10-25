import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Check, Copy, Printer, Trash2 } from 'lucide-react'
import { candidates, useMeasures } from '../data'
import { CandidateAvatar } from '../components/CandidateAvatar'
import { MeasureCard } from '../components/MeasureCard'
import { EmptyState, PageHeader, Skeleton } from '../components/ui'
import { useSelection } from '../lib/selection'
import { copyText, measureUrl } from '../lib/share'
import { fullName, plural } from '../lib/format'

/** Candidat d'un identifiant de mesure (« dupont-aignan-energie-03 ») : le plus long préfixe connu. */
const candidateIdOf = (measureId: string) =>
  candidates
    .map((c) => c.id)
    .filter((id) => measureId.startsWith(`${id}-`))
    .sort((a, b) => b.length - a.length)[0]

export default function SelectionPage() {
  const { ids, clear } = useSelection()
  const [copied, setCopied] = useState(false)
  const owners = [...new Set(ids.map(candidateIdOf).filter(Boolean))]
  const loaded = useMeasures(owners)
  const groups = candidates
    .filter((c) => owners.includes(c.id))
    .map((c) => ({ c, list: (loaded?.[c.id] ?? []).filter((m) => ids.includes(m.id)) }))
  const total = groups.reduce((n, g) => n + g.list.length, 0)

  async function copyList() {
    const text = groups
      .map(({ c, list }) => [`${fullName(c)} (${c.party_short})`, ...list.map((m) => `- ${m.title} : ${measureUrl(m)}`)].join('\n'))
      .join('\n\n')
    setCopied(await copyText(`Ma sélection – Présidentielle 2027\n\n${text}`))
    window.setTimeout(() => setCopied(false), 2500)
  }

  const button = 'no-print inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 hover:text-ink'
  return (
    <div>
      <PageHeader eyebrow="Ma sélection" title="Les mesures que vous avez gardées">
        Mettez de côté les mesures qui vous intéressent, de tous les candidats, avec le bouton « Garder » sous chaque mesure. Votre sélection
        reste dans ce navigateur : rien n'est envoyé ni enregistré ailleurs.
      </PageHeader>

      {ids.length === 0 ? (
        <EmptyState icon={<Bookmark className="size-8" />} title="Aucune mesure gardée pour l'instant">
          Ouvrez la fiche d'un candidat ou le{' '}
          <Link to="/comparateur" className="text-accent hover:underline">
            comparateur
          </Link>{' '}
          et cliquez sur « Garder » sous une mesure.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm text-muted">{loaded ? plural(total, 'mesure', 'mesures') : 'Chargement…'}</span>
            <button type="button" onClick={() => window.print()} className={button}>
              <Printer className="size-4" aria-hidden="true" /> Imprimer
            </button>
            <button type="button" onClick={copyList} className={button}>
              {copied ? <Check className="size-4 text-green-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? 'Liste copiée' : 'Copier la liste'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.confirm('Retirer toutes les mesures de votre sélection ?') && clear()}
              className={button}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Tout retirer
            </button>
          </div>
          <div className="space-y-10">
            {groups.map(({ c, list }) => (
              <section key={c.id} aria-label={fullName(c)}>
                <Link to={`/candidats/${c.id}`} className="mb-3 inline-flex items-center gap-3 hover:underline">
                  <CandidateAvatar candidate={c} size="md" decorative />
                  <span>
                    <span className="block font-display text-xl font-semibold text-ink">{fullName(c)}</span>
                    <span className="block text-sm text-muted">{c.party}</span>
                  </span>
                </Link>
                {loaded ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map((m) => (
                      <MeasureCard key={m.id} measure={m} accent={c.color} />
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-36" />
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
