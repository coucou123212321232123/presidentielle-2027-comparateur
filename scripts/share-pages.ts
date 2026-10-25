/**
 * Aperçus de partage (Open Graph) pour la version web. Les messageries (WhatsApp, Signal, réseaux sociaux)
 * n'exécutent pas l'application : chaque adresse partageable reçoit donc une copie de dist/index.html dont
 * le titre, la description et la vignette (public/og/*.png) décrivent la page. Exécuté après `vite build --mode pages`.
 *
 * Pages générées : accueil et rubriques, fiches candidats, votes, et liens de partage du comparateur
 * (/partage/<thème>/ et /partage/<thème>/<a>/<b>/ pour chaque paire de candidats).
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { Candidate, IndicatorDef, Measure, Theme, VotesFile } from '../src/data/schema.ts'
import { indicatorsOf } from '../src/data/summary.ts'

const ROOT = join(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist')
const SITE = (process.env.SITE_URL ?? 'https://programmes-2027.fr/').replace(/\/?$/, '/')
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(ROOT, 'src', 'data', f), 'utf8'))

const candidates = read<Candidate[]>('candidates.json').sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'))
const themes = read<Theme[]>('themes.json')
const votes = read<VotesFile>('votes.json')
const measures: Record<string, Measure[]> = Object.fromEntries(
  readdirSync(join(ROOT, 'src', 'data', 'measures')).map((f) => [basename(f, '.json'), read<Measure[]>(join('measures', f))]),
)
const template = readFileSync(join(DIST, 'index.html'), 'utf8')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const name = (c: Candidate) => `${c.first_name} ${c.last_name}`
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const shortDate = (iso: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${iso}T12:00:00`))
const DISCLAIMER = 'Outil indépendant et non officiel.'

interface Meta {
  title: string
  description: string
  image: string
}

let count = 0
/** Pages proposées aux moteurs de recherche (sitemap.xml) : toutes sauf les liens de partage, qui redirigent. */
const indexable: string[] = []
function page(path: string, m: Meta) {
  const url = SITE + path
  // « Ma sélection » est propre à chaque visiteur : rien à indexer.
  if (!path.startsWith('partage/') && path !== 'selection/') indexable.push(url)
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Présidentielle 2027 – Comparateur de programmes" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${SITE}og/${m.image}.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
  ].join('\n    ')
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(m.description)}" />`)
    .replace('</head>', `    ${tags}\n  </head>`)
  const dir = join(DIST, path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  count++
}

const home: Meta = {
  title: 'Présidentielle 2027 – Comparateur de programmes',
  description: `Les ${candidates.length} candidats et leurs mesures, comparées par thème avec un lien vers chaque source officielle. ${DISCLAIMER}`,
  image: 'accueil',
}
page('', home)
page('comparateur/', { ...home, title: 'Comparer les programmes par thème – Présidentielle 2027' })
page('positions/', {
  ...home,
  title: 'Qui propose quoi ? Les positions des candidats – Présidentielle 2027',
  description: `Retraite par capitalisation, nucléaire, droit du sol, taxe Zucman… la position de chaque candidat sur les grandes questions, avec sa source. ${DISCLAIMER}`,
})
page('themes/', { ...home, title: 'Thèmes × candidats – Présidentielle 2027' })
page('nouveautes/', { ...home, title: 'Nouveautés : le journal des mises à jour – Présidentielle 2027' })
page('selection/', { ...home, title: 'Ma sélection de mesures – Présidentielle 2027' })
page('programmes/', { ...home, title: 'Programmes officiels des candidats – Présidentielle 2027' })
page('methodologie/', { ...home, title: 'Méthodologie et sources – Présidentielle 2027' })
page('election/', {
  ...home,
  title: 'Calendrier, parrainages et temps de parole – Présidentielle 2027',
  description: `Dates officielles de l'élection, parrainages publiés par le Conseil constitutionnel et temps de parole relevé par l'Arcom. ${DISCLAIMER}`,
})
page('mentions-legales/', { ...home, title: 'Mentions légales – Présidentielle 2027' })
page('glossaire/', {
  ...home,
  title: 'Glossaire des sigles et termes – Présidentielle 2027',
  description: `ISF, PFU, AME, EPR2… les sigles des programmes et des textes votés, expliqués en quelques mots avec leur source officielle. ${DISCLAIMER}`,
})

for (const c of candidates) {
  const list = measures[c.id] ?? []
  const nThemes = new Set(list.map((m) => m.theme)).size
  page(`candidats/${c.id}/`, {
    title: `${name(c)} (${c.party_short}) – programme et mesures`,
    description: `${c.party}. ${plural(list.length, 'mesure sourcée', 'mesures sourcées')} sur ${plural(nThemes, 'thème', 'thèmes')}, lien vers le programme officiel. ${DISCLAIMER}`,
    image: `candidat-${c.id}`,
  })
}

/** Valeur d'un point de comparaison, telle qu'affichée dans le comparateur. */
function indicator(def: IndicatorDef, c: Candidate) {
  for (const m of measures[c.id] ?? []) {
    const ind = indicatorsOf(m).find((i) => i.key === def.key)
    if (ind) return def.type === 'enum' ? (def.options?.[String(ind.value)] ?? String(ind.value)) : `${ind.value.toLocaleString('fr-FR')}${def.unit ? ` ${def.unit}` : ''}`
  }
  return 'pas de position relevée'
}

for (const t of themes) {
  const withPosition = candidates.filter((c) => (measures[c.id] ?? []).some((m) => m.theme === t.id)).length
  page(`partage/${t.id}/`, {
    title: `${t.label} : comparer les programmes – Présidentielle 2027`,
    description: `${t.description} Positions de ${withPosition} candidats sur ${candidates.length}, sources officielles à l'appui. ${DISCLAIMER}`,
    image: `theme-${t.id}`,
  })
  for (let i = 0; i < candidates.length; i++)
    for (let j = i + 1; j < candidates.length; j++) {
      const [a, b] = [candidates[i], candidates[j]]
      const n = (c: Candidate) => (measures[c.id] ?? []).filter((m) => m.theme === t.id).length
      const points = t.indicators
        .map((def) => ({ def, va: indicator(def, a), vb: indicator(def, b) }))
        .filter((p) => p.va !== 'non précisé' || p.vb !== 'non précisé')
        .map((p) => `${p.def.label} : ${a.last_name} ${p.va}, ${b.last_name} ${p.vb}.`)
      page(`partage/${t.id}/${a.id}/${b.id}/`, {
        title: `${t.label} : ${name(a)} et ${name(b)}`,
        description: [
          ...points,
          `${a.last_name} : ${plural(n(a), 'mesure', 'mesures')} · ${b.last_name} : ${plural(n(b), 'mesure', 'mesures')}, avec leurs sources. ${DISCLAIMER}`,
        ].join(' '),
        image: `theme-${t.id}`,
      })
    }
}

page('votes/', {
  title: 'Votes à l’Assemblée sur les grands textes – Présidentielle 2027',
  description: `Retraites, immigration, budgets : les décomptes officiels de l'Assemblée nationale, groupe par groupe, et le vote des candidats qui étaient députés. ${DISCLAIMER}`,
  image: 'votes',
})
for (const s of votes.scrutins) {
  const result = s.censure ? `${s.totals.pour} voix pour la censure` : `${s.totals.pour} pour, ${s.totals.contre} contre, ${s.totals.abstention} abstentions`
  const personal = s.candidates
    .map((p) => {
      const c = candidates.find((x) => x.id === p.candidate)
      const v = { pour: 'pour', contre: 'contre', abstention: 'abstention', non_votant: 'non-votant', absent: s.censure ? 'pas de vote pour la censure' : 'absent' }[p.vote]
      return c ? `${c.last_name} : ${v}` : ''
    })
    .filter(Boolean)
  page(`votes/${s.id}/`, {
    title: `${s.short_title} – vote à l’Assemblée`,
    description: `Scrutin du ${shortDate(s.date)} : ${result}.${personal.length ? ` ${personal.join(' · ')}.` : ''} Source : Assemblée nationale. ${DISCLAIMER}`,
    image: 'votes',
  })
}

// Adresse inconnue (et anciennes adresses du comparateur) : application avec l'aperçu par défaut.
writeFileSync(join(DIST, '404.html'), readFileSync(join(DIST, 'index.html')))

// Moteurs de recherche : plan du site et robots.txt (tout est public, sauf les liens de partage redondants).
const lastmod = new Date().toISOString().slice(0, 10)
const urls = indexable.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
)
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /partage/\n\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`✔ sitemap.xml : ${indexable.length} pages · robots.txt`)
console.log(`✔ ${count} pages d'aperçu de partage (${SITE})`)
