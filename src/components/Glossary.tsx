import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { glossary } from '../data'
import type { GlossaryEntry } from '../data/schema'
import { ExternalLink } from './ExternalLink'

const byForm = new Map<string, GlossaryEntry>()
for (const g of glossary) for (const form of [g.term, ...g.aliases]) byForm.set(form, g)

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Formes les plus longues d'abord (« EPR2 » avant « EPR »), et jamais au milieu d'un mot.
const pattern = byForm.size
  ? new RegExp(
      `(?<![\\p{L}\\p{N}])(${[...byForm.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\p{L}\\p{N}])`,
      'gu',
    )
  : null

interface TipState {
  entry: GlossaryEntry | null
  anchor: HTMLElement | null
  pinned: boolean
}

const useTip = create<TipState>(() => ({ entry: null, anchor: null, pinned: false }))
let closeTimer: number | undefined

const open = (entry: GlossaryEntry, anchor: HTMLElement, pinned: boolean) => {
  window.clearTimeout(closeTimer)
  useTip.setState({ entry, anchor, pinned })
}
const close = () => useTip.setState({ entry: null, anchor: null, pinned: false })
const closeSoon = () => {
  window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => !useTip.getState().pinned && close(), 150)
}

function Term({ entry, children }: { entry: GlossaryEntry; children: ReactNode }) {
  const active = useTip((s) => s.entry?.id === entry.id && s.anchor !== null)
  return (
    <button
      type="button"
      // Souris : explication au survol. Toucher : au premier appui (le survol simulé des écrans tactiles est ignoré).
      onPointerEnter={(e) => e.pointerType === 'mouse' && open(entry, e.currentTarget, false)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
      onFocus={(e) => open(entry, e.currentTarget, false)}
      onBlur={closeSoon}
      onClick={(e) => {
        e.stopPropagation()
        const s = useTip.getState()
        if (s.anchor === e.currentTarget && s.pinned) close()
        else open(entry, e.currentTarget, true)
      }}
      aria-expanded={active}
      aria-describedby={active ? 'glossary-tip' : undefined}
      className="cursor-help underline decoration-muted/60 decoration-dotted underline-offset-[3px] hover:decoration-ink"
    >
      {children}
    </button>
  )
}

/**
 * Texte dont les sigles du glossaire (ISF, PFU, EPR2…) sont expliqués au survol ou au toucher.
 * Seule la première occurrence de chaque sigle est soulignée, pour garder le texte lisible.
 */
export function Glossed({ text }: { text: string }) {
  if (!pattern) return <>{text}</>
  const seen = new Set<string>()
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const entry = byForm.get(match[0])!
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    parts.push(text.slice(last, match.index))
    parts.push(
      <Term key={match.index} entry={entry}>
        {match[0]}
      </Term>,
    )
    last = match.index + match[0].length
  }
  if (!parts.length) return <>{text}</>
  parts.push(text.slice(last))
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  )
}

const WIDTH = 288
const MARGIN = 8

/** Bulle d'explication unique, affichée au-dessus de la page (rendue une fois dans la mise en page). */
export function GlossaryTooltip() {
  const { entry, anchor } = useTip()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return setPos(null)
    const r = anchor.getBoundingClientRect()
    const h = ref.current.offsetHeight
    const width = Math.min(WIDTH, window.innerWidth - 2 * MARGIN)
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, MARGIN), window.innerWidth - width - MARGIN)
    const below = r.bottom + 6 + h <= window.innerHeight - MARGIN
    setPos({ left, top: below ? r.bottom + 6 : Math.max(MARGIN, r.top - 6 - h) })
  }, [anchor, entry])

  useEffect(() => {
    if (!anchor) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchor.contains(t)) close()
    }
    // La bulle est positionnée par rapport à l'écran : on la referme dès que la page défile.
    const onScroll = () => close()
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [anchor])

  if (!entry || !anchor) return null
  return createPortal(
    <div
      ref={ref}
      id="glossary-tip"
      role="tooltip"
      onPointerEnter={() => window.clearTimeout(closeTimer)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, width: Math.min(WIDTH, window.innerWidth - 2 * MARGIN), visibility: pos ? 'visible' : 'hidden' }}
      className="fixed z-50 rounded-xl border border-line bg-surface p-3 text-left text-sm shadow-lift"
    >
      <p className="font-semibold text-ink">
        {entry.term} <span className="font-normal text-muted">· {entry.expansion}</span>
      </p>
      <p className="mt-1 leading-relaxed text-ink-2">{entry.definition}</p>
      <p className="mt-2 text-xs">
        <ExternalLink href={entry.source_url} className="text-accent hover:underline">
          {entry.source_label}
        </ExternalLink>
      </p>
    </div>,
    document.body,
  )
}
