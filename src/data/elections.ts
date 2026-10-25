import type { Calendar, Parrainages, Results, SpeakingTime } from './schema'
import calendarRaw from './calendar.json'
import parrainagesRaw from './parrainages.json'
import speakingRaw from './speaking-time.json'
import resultsRaw from './results.json'
import { cachedData } from '.'

// Module à part : chargé seulement par les pages qui l'affichent (page Élection, encart de l'accueil).
export const calendar: Calendar = cachedData?.calendar ?? (calendarRaw as Calendar)
export const parrainages: Parrainages = cachedData?.parrainages ?? (parrainagesRaw as Parrainages)
export const speakingTime: SpeakingTime = cachedData?.speaking_time ?? (speakingRaw as SpeakingTime)
export const results: Results = cachedData?.results ?? (resultsRaw as Results)

const DAY = 86_400_000
/** Nombre de jours (calendaires, heure de Paris) entre aujourd'hui et une date AAAA-MM-JJ. */
export function daysUntil(iso: string, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now)
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY)
}

/** Prochaine étape datée du calendrier (aujourd'hui compris), ou null une fois l'élection passée. */
export function nextEvent(now = new Date()) {
  return calendar.events.find((e) => daysUntil(e.date, now) >= 0) ?? null
}

/** « 12 h 05 min » à partir d'un nombre de secondes. */
export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}
