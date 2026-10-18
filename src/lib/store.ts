import { create } from 'zustand'
import type { Measure, Precision, SourceType } from '../data/schema'
import { isNewMeasure, useNovelty } from './novelty'

interface FilterState {
  sourceTypes: SourceType[]
  precisions: Precision[]
  onlyCosted: boolean
  onlyNew: boolean
  toggleSourceType: (s: SourceType) => void
  togglePrecision: (p: Precision) => void
  setOnlyCosted: (v: boolean) => void
  setOnlyNew: (v: boolean) => void
  reset: () => void
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Filtres de mesures partagés entre la fiche candidat, le comparateur et la matrice. Vide = tout afficher. */
export const useFilters = create<FilterState>((set) => ({
  sourceTypes: [],
  precisions: [],
  onlyCosted: false,
  onlyNew: false,
  toggleSourceType: (s) => set((st) => ({ sourceTypes: toggle(st.sourceTypes, s) })),
  togglePrecision: (p) => set((st) => ({ precisions: toggle(st.precisions, p) })),
  setOnlyCosted: (onlyCosted) => set({ onlyCosted }),
  setOnlyNew: (onlyNew) => set({ onlyNew }),
  reset: () => set({ sourceTypes: [], precisions: [], onlyCosted: false, onlyNew: false }),
}))

export const isCosted = (m: Measure) => m.precision === 'chiffre' || Boolean(m.cost)

export function useMeasureFilter() {
  const { sourceTypes, precisions, onlyCosted, onlyNew } = useFilters()
  const since = useNovelty((s) => s.since)
  const active = sourceTypes.length > 0 || precisions.length > 0 || onlyCosted || onlyNew
  const apply = (list: Measure[]) =>
    list.filter(
      (m) =>
        (sourceTypes.length === 0 || sourceTypes.includes(m.source_type)) &&
        (precisions.length === 0 || precisions.includes(m.precision)) &&
        (!onlyCosted || isCosted(m)) &&
        (!onlyNew || isNewMeasure(m, since)),
    )
  return { apply, active }
}

type Mode = 'light' | 'dark'

interface ThemeState {
  mode: Mode
  toggle: () => void
}

export const useColorMode = create<ThemeState>((set, get) => ({
  mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  toggle: () => {
    const mode: Mode = get().mode === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', mode === 'dark')
    try {
      localStorage.setItem('theme', mode)
    } catch {
      /* stockage indisponible : le choix reste valable pour la session */
    }
    set({ mode })
  },
}))
