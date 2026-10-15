import { create } from 'zustand'
import { DataBundleSchema, type DataBundle } from './schema'

/** Adresse du paquet de données publié (public-data/data.json sur GitHub), surchargeable par VITE_DATA_URL ; vide = désactivé. */
export const REMOTE_DATA_URL: string =
  import.meta.env.VITE_DATA_URL ??
  'https://raw.githubusercontent.com/coucou123212321232123/presidentielle-2027-comparateur/main/public-data/data.json'

const CACHE_KEY = 'donnees-presidentielle-2027'
const TIMEOUT_MS = 8000

/** Dernière version téléchargée et validée, conservée localement pour un usage hors ligne. */
export function readCachedBundle(): DataBundle | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = DataBundleSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

interface UpdateState {
  available: string | null
  setAvailable: (date: string) => void
}

/** Date des nouvelles données téléchargées, en attente d'un rechargement de la page. */
export const useDataUpdate = create<UpdateState>((set) => ({
  available: null,
  setAvailable: (available) => set({ available }),
}))

/**
 * Télécharge le paquet en ligne, le valide intégralement (schéma Zod) et le met en cache s'il est plus récent.
 * Données invalides, hors ligne ou serveur indisponible : on garde silencieusement la version actuelle.
 */
export async function checkForDataUpdate(current: { last_updated: string; generated_at: string }) {
  if (!REMOTE_DATA_URL) return
  try {
    const res = await fetch(`${REMOTE_DATA_URL}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return
    const parsed = DataBundleSchema.safeParse(await res.json())
    if (!parsed.success) return
    const remote = parsed.data
    const newer =
      remote.meta.last_updated > current.last_updated ||
      (remote.meta.last_updated === current.last_updated && remote.generated_at > current.generated_at)
    if (!newer) return
    localStorage.setItem(CACHE_KEY, JSON.stringify(remote))
    useDataUpdate.getState().setAvailable(remote.meta.last_updated)
  } catch {
    /* hors ligne ou stockage indisponible : version actuelle conservée */
  }
}
