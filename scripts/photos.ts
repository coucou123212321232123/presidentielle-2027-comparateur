/**
 * Portraits des candidats servis par le site : public/photos/<id>-<taille>.webp, recadrés au carré (haut de l'image,
 * comme l'affichage) et réduits aux tailles d'affichage. Le navigateur n'a plus à réduire une image de 500 px à 32 px
 * (rendu crénelé), et les visiteurs ne sollicitent plus Wikimedia. sources.json garde l'URL d'origine de chaque
 * portrait : validate-data signale un portrait à régénérer quand la photo d'un candidat change. À relancer alors :
 *
 *   npm run photos
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import type { Candidate } from '../src/data/schema.ts'

/** Largeurs générées (px) : avatars de 32 à 128 px, écrans haute densité compris. */
export const PHOTO_WIDTHS = [64, 128, 256, 384]

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'public', 'photos')
const SOURCES = join(OUT, 'sources.json')
const candidates: Candidate[] = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'candidates.json'), 'utf8'))
const previous: Record<string, string> = existsSync(SOURCES) ? JSON.parse(readFileSync(SOURCES, 'utf8')) : {}
const sources: Record<string, string> = {}
const download = (url: string) => fetch(url, { headers: { 'User-Agent': 'programmes-2027-photos/1.0' } })
const done = (id: string) => PHOTO_WIDTHS.every((w) => existsSync(join(OUT, `${id}-${w}.webp`)))

mkdirSync(OUT, { recursive: true })
for (const c of candidates) {
  if (!c.photo) continue
  sources[c.id] = c.photo.url
  if (previous[c.id] === c.photo.url && done(c.id)) continue
  let res = await download(c.photo.url)
  // Wikimedia limite les téléchargements rapprochés (429) : on patiente puis on réessaie.
  for (let attempt = 1; res.status === 429 && attempt <= 5; attempt++) {
    await new Promise((r) => setTimeout(r, 15_000 * attempt))
    res = await download(c.photo.url)
  }
  if (!res.ok) throw new Error(`${c.id} : ${res.status} ${c.photo.url}`)
  const image = sharp(Buffer.from(await res.arrayBuffer()))
  const { width = 0, height = 0 } = await image.metadata()
  const side = Math.min(width, height)
  const square = image.extract({ left: Math.floor((width - side) / 2), top: 0, width: side, height: side })
  for (const w of PHOTO_WIDTHS) {
    await square.clone().resize(w, w, { kernel: 'lanczos3' }).webp({ quality: 82 }).toFile(join(OUT, `${c.id}-${w}.webp`))
  }
  console.log(`✔ ${c.id} (${width}×${height})`)
  await new Promise((r) => setTimeout(r, 3000))
}
// Portraits des candidats retirés ou sans photo.
for (const f of readdirSync(OUT)) {
  const id = f.replace(/-\d+\.webp$/, '')
  if (f.endsWith('.webp') && !(id in sources)) rmSync(join(OUT, f))
}
writeFileSync(SOURCES, JSON.stringify(sources, null, 2) + '\n')
console.log(`✔ public/photos : ${Object.keys(sources).length} portraits`)
