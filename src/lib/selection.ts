import { create } from 'zustand'

/**
 * « Ma sélection » : identifiants des mesures mises de côté par le visiteur, gardés dans ce navigateur seulement
 * (rien n'est envoyé). Une mesure retirée des données disparaît simplement de la liste affichée.
 */
const KEY = 'ma-selection'

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* stockage indisponible : la sélection vaut pour cette visite */
  }
}

interface SelectionState {
  ids: string[]
  toggle: (id: string) => void
  clear: () => void
}

export const useSelection = create<SelectionState>((set, get) => ({
  ids: read(),
  toggle: (id) => {
    const ids = get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [...get().ids, id]
    write(ids)
    set({ ids })
  },
  clear: () => {
    write([])
    set({ ids: [] })
  },
}))

// Même sélection dans tous les onglets ouverts.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) useSelection.setState({ ids: read() })
})
