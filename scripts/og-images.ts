/**
 * Vignettes de partage (1200 × 630) affichées par les messageries et réseaux sociaux : public/og/*.png.
 * Une image par défaut, une par candidat, une par thème et une pour la page Votes.
 * Elles ne contiennent que des informations stables (noms, partis, thèmes) : à relancer quand un candidat
 * ou un thème change (`npm run og-images`, police Inter installée sur le poste).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import type { Candidate, Theme } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'public', 'og')
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(ROOT, 'src', 'data', f), 'utf8'))
const candidates = read<Candidate[]>('candidates.json').sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'))
const themes = read<Theme[]>('themes.json')

const W = 1200
const H = 630
const INK = '#1c1917'
const MUTED = '#6b6560'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Découpe un texte en lignes d'après une largeur moyenne de caractère (police Inter). */
function wrap(text: string, size: number, maxWidth: number, maxLines = 3) {
  const perLine = Math.floor(maxWidth / (size * 0.56))
  const lines: string[] = []
  let cur = ''
  for (const word of text.split(' ')) {
    if ((cur + ' ' + word).trim().length > perLine && cur) {
      lines.push(cur)
      cur = word
    } else cur = (cur + ' ' + word).trim()
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…')
  }
  return lines
}

function textBlock(lines: string[], x: number, y: number, size: number, weight: number, color: string, gap = 1.15) {
  return lines
    .map((l, i) => `<text x="${x}" y="${y + i * size * gap}" font-family="Inter Display, Inter" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(l)}</text>`)
    .join('')
}

const initials = (c: Candidate) => `${c.first_name[0]}${c.last_name.replace(/^(de |d')/i, '')[0]}`.toUpperCase()

function frame(body: string, accent?: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafaf9"/>
  ${accent ? `<rect width="${W}" height="18" fill="${accent}"/>` : ''}
  <g transform="translate(72 70)">
    <rect x="0" y="14" width="10" height="26" rx="5" fill="#2563eb"/>
    <rect x="16" y="0" width="10" height="40" rx="5" fill="${INK}"/>
    <rect x="32" y="8" width="10" height="32" rx="5" fill="#dc2626"/>
    <text x="62" y="30" font-family="Inter Display, Inter" font-size="30" font-weight="700" fill="${INK}">Présidentielle 2027</text>
    <text x="352" y="30" font-family="Inter" font-size="26" font-weight="500" fill="${MUTED}">· Comparateur de programmes</text>
  </g>
  ${body}
  <text x="72" y="${H - 56}" font-family="Inter" font-size="24" font-weight="500" fill="${MUTED}">Sources officielles · Outil indépendant et non officiel · Aucune recommandation de vote</text>
</svg>`
}

function dots(list: Candidate[], y: number) {
  return list
    .map((c, i) => {
      const x = 72 + 34 + i * 74
      const fg = luminance(c.color) > 0.4 ? INK : '#ffffff'
      return `<circle cx="${x}" cy="${y}" r="32" fill="${c.color}"/><text x="${x}" y="${y + 9}" text-anchor="middle" font-family="Inter" font-size="24" font-weight="700" fill="${fg}">${initials(c)}</text>`
    })
    .join('')
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function render(name: string, svg: string) {
  const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Inter' }, fitTo: { mode: 'width', value: W } }).render().asPng()
  writeFileSync(join(OUT, `${name}.png`), png)
}

mkdirSync(OUT, { recursive: true })

render(
  'accueil',
  frame(
    textBlock(['Les candidats et leurs', 'programmes, côte à côte.'], 72, 250, 80, 700, INK) +
      textBlock([`${candidates.length} candidats · 20 thèmes · mesures sourcées et datées`], 72, 420, 32, 500, MUTED) +
      dots(candidates, 500),
  ),
)

for (const c of candidates) {
  const fg = luminance(c.color) > 0.4 ? INK : '#ffffff'
  const name = wrap(`${c.first_name} ${c.last_name}`, 84, 760, 2)
  const party = wrap(c.party, 36, 760, 2)
  render(
    `candidat-${c.id}`,
    frame(
      `<circle cx="1000" cy="320" r="130" fill="${c.color}"/>
       <text x="1000" y="360" text-anchor="middle" font-family="Inter Display, Inter" font-size="110" font-weight="700" fill="${fg}">${initials(c)}</text>` +
        textBlock(name, 72, 250, 84, 700, INK, 1.08) +
        textBlock(party, 72, 250 + name.length * 91 + 20, 36, 500, MUTED) +
        textBlock(['Programme, mesures par thème, votes'], 72, 500, 32, 600, c.color === '#ffffff' ? INK : c.color),
      c.color,
    ),
  )
}

for (const t of themes) {
  const label = wrap(t.label, 84, 1050, 2)
  const descY = 285 + label.length * 88 - 4
  render(
    `theme-${t.id}`,
    frame(
      textBlock(['Comparer les programmes'], 72, 178, 34, 600, MUTED) +
        textBlock(label, 72, 285, 84, 700, INK, 1.05) +
        textBlock(wrap(t.description, 30, 1050, label.length === 1 ? 2 : 1), 72, descY, 30, 500, MUTED) +
        dots(candidates, 512),
    ),
  )
}

// Petit hémicycle décoratif pour la page Votes.
const seats: string[] = []
for (let row = 0; row < 7; row++) {
  const r = 70 + row * 16
  const n = Math.round(14 + row * 3.2)
  for (let j = 0; j < n; j++) {
    const a = Math.PI - (Math.PI * j) / (n - 1)
    const color = j / n < 0.42 ? '#15803d' : j / n < 0.5 ? '#f59e0b' : '#ef4444'
    seats.push(`<circle cx="${1000 + r * Math.cos(a)}" cy="${520 - r * Math.sin(a)}" r="6" fill="${color}"/>`)
  }
}
render(
  'votes',
  frame(
    textBlock(['Votes à l’Assemblée'], 72, 260, 64, 700, INK) +
      textBlock(['sur les grands textes'], 72, 335, 64, 700, MUTED) +
      textBlock(['Retraites, immigration, budgets : décomptes', 'officiels et vote des candidats députés'], 72, 430, 30, 500, MUTED) +
      seats.join(''),
  ),
)

console.log(`✔ ${2 + candidates.length + themes.length} vignettes dans public/og/`)
