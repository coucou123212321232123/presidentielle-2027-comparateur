import { create } from 'zustand'
import { changelog, meta, summary } from '../data'
import type { Measure, ThemeId } from '../data/schema'

/**
 * Badge « Nouveau » : une mesure est nouvelle si elle a été ajoutée après les données vues lors de la visite précédente.
 * On mémorise la date des données affichées (`seen`) et le point de référence des nouveautés (`since`) :
 * les badges restent visibles jusqu'à la mise à jour suivante, ou jusqu'à « Marquer comme vu ».
 * Première visite : on signale les ajouts de la dernière mise à jour.
 */
const KEY = 'derniere-visite'

interface Stored {
  seen: string
  since: string | null
}

function read(): Stored | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && typeof v.seen === 'string' ? v : null
  } catch {
    return null
  }
}

function write(v: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* stockage indisponible : les badges valent pour cette visite */
  }
}

const previousUpdate = changelog.map((e) => e.date).filter((d) => d < meta.last_updated).sort().at(-1) ?? null

function initial(): { since: string | null; firstVisit: boolean } {
  const stored = read()
  const next: Stored = !stored
    ? { seen: meta.last_updated, since: previousUpdate }
    : stored.seen < meta.last_updated
      ? { seen: meta.last_updated, since: stored.seen }
      : stored
  write(next)
  return { since: next.since, firstVisit: !stored }
}

interface NoveltyState {
  /** Mesures ajoutées strictement après cette date = nouvelles ; null = rien de nouveau. */
  since: string | null
  firstVisit: boolean
  markSeen: () => void
}

export const useNovelty = create<NoveltyState>(() => ({
  ...initial(),
  markSeen: () => {
    write({ seen: meta.last_updated, since: meta.last_updated })
    useNovelty.setState({ since: meta.last_updated })
  },
}))

export const isNewMeasure = (m: Measure, since: string | null) => since !== null && m.added > since

/** Nombre de mesures nouvelles pour un candidat (et un thème), calculé sans charger les mesures. */
export function newCount(since: string | null, candidateId: string, themeId?: ThemeId) {
  if (since === null) return 0
  let n = 0
  for (const [day, themes] of Object.entries(summary[candidateId]?.added ?? {})) {
    if (day <= since) continue
    n += themeId ? (themes[themeId] ?? 0) : Object.values(themes).reduce((a, b) => a + (b ?? 0), 0)
  }
  return n
}
