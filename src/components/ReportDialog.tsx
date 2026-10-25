import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, Flag, X } from 'lucide-react'
import { themeById } from '../data'
import { closeReport, candidateOfMeasure, reportUrl, useReport } from '../lib/report'
import { CONTACT_EMAIL, WEB3FORMS_KEY } from '../lib/site'
import { fullName } from '../lib/format'

const KINDS = ['Mesure mal résumée ou inexacte', 'Source ou lien cassé', 'Position manquante', 'Autre'] as const

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * « Signaler une erreur » sans quitter le site : le message part à l'adresse de contact (Web3Forms),
 * ou, sans clé configurée, ouvre la messagerie du visiteur pré-remplie. Chaque signalement est vérifié sur la source.
 */
export function ReportDialog() {
  const { open, measure } = useReport()
  const ref = useRef<HTMLDialogElement>(null)
  const [kind, setKind] = useState<string>(KINDS[0])
  const [message, setMessage] = useState('')
  const [source, setSource] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setStatus('idle')
      setMessage('')
      setSource('')
      setKind(measure ? KINDS[0] : KINDS[3])
      d.showModal()
    }
    if (!open && d.open) d.close()
  }, [open, measure])

  const candidate = measure ? candidateOfMeasure(measure) : undefined
  const context = measure
    ? [
        `Mesure : ${measure.id} (${themeById[measure.theme]?.label ?? measure.theme})`,
        candidate ? `Candidat : ${fullName(candidate)}` : '',
        `Titre : ${measure.title}`,
        `Source actuelle : ${measure.source_url}`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''
  const subject = `Signalement : ${kind}${measure ? ` – ${measure.title}` : ''}`.slice(0, 140)
  const body = [`Type : ${kind}`, context, '', message, source ? `\nSource proposée : ${source}` : ''].join('\n').trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!WEB3FORMS_KEY) {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      setStatus('sent')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject,
          from_name: 'Programmes 2027 – signalement',
          ...(email ? { email, replyto: email } : {}),
          message: body,
          botcheck: '',
        }),
        signal: AbortSignal.timeout(15_000),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink-2 focus:outline-none'
  return (
    <dialog
      ref={ref}
      onClose={closeReport}
      onClick={(e) => e.target === ref.current && closeReport()}
      aria-labelledby="report-title"
      className="m-auto max-h-[90dvh] w-[min(560px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-line bg-bg p-0 text-ink shadow-lift backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="report-title" className="flex items-center gap-2 font-display text-xl font-semibold">
            <Flag className="size-5 text-muted" aria-hidden="true" /> Signaler une erreur
          </h2>
          <button type="button" onClick={closeReport} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Fermer">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-green-600" aria-hidden="true" />
            <p className="font-semibold">{WEB3FORMS_KEY ? 'Merci, votre signalement est envoyé.' : 'Votre messagerie va s’ouvrir avec le message prêt à envoyer.'}</p>
            <p className="mt-1 text-sm text-ink-2">Il sera vérifié sur la source lors de la prochaine mise à jour hebdomadaire.</p>
            <button type="button" onClick={closeReport} className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {measure && (
              <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
                <span className="block text-xs text-muted">{candidate ? fullName(candidate) : 'Mesure'}</span>
                {measure.title}
              </p>
            )}
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Type de problème</legend>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <label key={k} className="cursor-pointer">
                    <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="peer sr-only" />
                    <span className="inline-block rounded-full border border-line px-3 py-1 text-sm text-ink-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                      {k}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Votre message</span>
              <textarea
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={field}
                placeholder="Qu'est-ce qui est inexact ou manquant ?"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Source qui le montre <span className="font-normal text-muted">(facultatif, mais elle accélère la correction)</span>
              </span>
              <input type="url" value={source} onChange={(e) => setSource(e.target.value)} className={field} placeholder="https://…" />
            </label>
            {WEB3FORMS_KEY && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Votre e-mail <span className="font-normal text-muted">(facultatif, seulement pour vous répondre)</span>
                </span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} autoComplete="email" />
              </label>
            )}
            {status === 'error' && (
              <p className="text-sm text-rose-600" role="alert">
                L'envoi n'a pas abouti. Réessayez, ou écrivez à{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a href={reportUrl(measure ?? undefined)} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline hover:text-ink">
                Ou signaler publiquement sur GitHub
              </a>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg disabled:opacity-60"
              >
                {status === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Aucune correction n'est faite sans vérification sur une source. Votre message n'est utilisé que pour traiter ce signalement.
            </p>
          </form>
        )}
      </div>
    </dialog>
  )
}
