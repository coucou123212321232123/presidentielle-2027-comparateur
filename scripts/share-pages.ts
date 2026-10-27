/**
 * Aperçus de partage (Open Graph) pour la version web. Les messageries (WhatsApp, Signal, réseaux sociaux)
 * n'exécutent pas l'application : chaque adresse partageable reçoit donc une copie de dist/index.html dont
 * le titre, la description et la vignette (public/og/*.png) décrivent la page. Exécuté après `vite build --mode pages`.
 *
 * Les pages indexables reçoivent aussi leur contenu réel en HTML simple dans <div id="root"> (mesures, sources,
 * liens entre pages) : les moteurs et assistants qui n'exécutent pas JavaScript lisent ainsi la page. L'application
 * remplace ce contenu dès son démarrage. page-hashes.json permet de ne signaler à IndexNow que les pages modifiées.
 *
 * Pages générées : accueil et rubriques, fiches candidats, votes, et liens de partage du comparateur
 * (/partage/<thème>/ et /partage/<thème>/<a>/<b>/ pour chaque paire de candidats).
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { Budgets, Candidate, GlossaryEntry, IndicatorDef, Measure, Theme, VotesFile } from '../src/data/schema.ts'
import { indicatorsOf } from '../src/data/summary.ts'
import { POSITION_LABELS, PROGRAM_STATUS_LABELS, STATUS_LABELS } from '../src/lib/labels.ts'

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
const glossary = read<GlossaryEntry[]>('glossary.json')
const budgets = read<Budgets>('budgets.json')
const siteMeta = read<{ last_updated: string; election: { first_round: string; second_round: string } }>('meta.json')
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

// --- Contenu HTML simple des pages indexables -------------------------------------------------------------
/** Chemin du site (« / », ou « /depot/ » sur github.io) pour les liens internes. */
const BASE = new URL(SITE).pathname
const href = (path: string) => esc(BASE + path)
const link = (path: string, text: string) => `<a href="${href(path)}">${esc(text)}</a>`
const ext = (url: string, text: string) => `<a href="${esc(url)}" rel="noopener">${esc(text)}</a>`
const SECTIONS: [string, string][] = [
  ['comparateur/', 'Comparateur par thème'],
  ['positions/', 'Qui propose quoi ?'],
  ['themes/', 'Thèmes × candidats'],
  ['programmes/', 'Programmes officiels'],
  ['chiffrages/', 'Combien ça coûte ?'],
  ['votes/', "Votes à l'Assemblée"],
  ['election/', 'Calendrier et parrainages'],
  ['glossaire/', 'Glossaire'],
  ['methodologie/', 'Méthodologie'],
  ['nouveautes/', 'Nouveautés'],
  ['mentions-legales/', 'Mentions légales'],
]
// Mise en forme minimale, aux couleurs du site, le temps que l'application démarre (elle remplace ce bloc).
const STYLE = `<style>.seo{max-width:64rem;margin:0 auto;padding:1.5rem 1rem 4rem;line-height:1.6;color:var(--color-ink-2)}.seo h1,.seo h2{font-family:var(--font-display);color:var(--color-ink);line-height:1.2}.seo h1{font-size:2rem;margin:1.5rem 0 1rem}.seo h2{font-size:1.35rem;margin:2.25rem 0 .5rem}.seo h3{font-size:1rem;font-weight:600;color:var(--color-ink);margin:1.25rem 0 .25rem}.seo p{margin:.5rem 0}.seo ul,.seo ol{padding-left:1.25rem;margin:.5rem 0}.seo ul{list-style:disc}.seo ol{list-style:decimal}.seo li{margin:.35rem 0}.seo a{color:var(--color-accent)}.seo small,.seo footer{color:var(--color-muted);font-size:.85rem}.seo dt{font-weight:600;color:var(--color-ink);margin-top:.75rem}.seo footer{margin-top:3rem;border-top:1px solid var(--color-line);padding-top:1rem}</style>`
function shell(body: string) {
  const people = candidates.map((c) => link(`candidats/${c.id}/`, name(c))).join(' · ')
  const sections = SECTIONS.map(([p, t]) => link(p, t)).join(' · ')
  return `${STYLE}<div class="seo"><p>${link('', 'Présidentielle 2027 – Comparateur de programmes')}</p>${body}<footer><p>Candidats : ${people}</p><p>${sections}</p><p>${DISCLAIMER} Données mises à jour le ${shortDate(siteMeta.last_updated)}.</p></footer></div>`
}
const measuresOf = (c: Candidate, theme?: string) => (measures[c.id] ?? []).filter((m) => !theme || m.theme === theme)
function measureItem(m: Measure) {
  const date = m.source_date ? `, ${shortDate(m.source_date)}` : ''
  const cost = m.cost ? ` <small>Coût annoncé : ${esc(m.cost.label)}.</small>` : ''
  return `<li><strong>${esc(m.title)}</strong> — ${esc(m.description)}${cost} <small>Source : ${ext(m.source_url, m.source_title)}${esc(date)}</small></li>`
}

let count = 0
/** Accueil sans contenu écrit, pour la page 404 (adresses inconnues, que l'application traite elle-même). */
let homeShell = ''
/** Pages proposées aux moteurs de recherche (sitemap.xml) : toutes sauf les liens de partage, qui redirigent. */
const indexable: string[] = []
/** Empreinte du contenu de chaque page indexable : sert à ne signaler à IndexNow que ce qui a changé. */
const hashes: Record<string, string> = {}
function page(path: string, m: Meta, body?: string) {
  const url = SITE + path
  const content = body === undefined ? '' : shell(body)
  // « Ma sélection » est propre à chaque visiteur : rien à indexer.
  if (!path.startsWith('partage/') && path !== 'selection/') {
    indexable.push(url)
    hashes[url] = createHash('sha1').update(m.title + m.description + content).digest('hex').slice(0, 16)
  }
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
  if (path === '') homeShell = html
  const dir = join(DIST, path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html.replace('<div id="root"></div>', () => `<div id="root">${content}</div>`))
  count++
}

const home: Meta = {
  title: 'Présidentielle 2027 – Comparateur de programmes',
  description: `Les ${candidates.length} candidats et leurs mesures, comparées par thème avec un lien vers chaque source officielle. ${DISCLAIMER}`,
  image: 'accueil',
}
const candidateList = candidates
  .map((c) => {
    const n = measuresOf(c).length
    return `<li>${link(`candidats/${c.id}/`, name(c))} — ${esc(c.party)} (${esc(c.party_short)}) · ${plural(n, 'mesure sourcée', 'mesures sourcées')}</li>`
  })
  .join('')
const themeList = themes.map((t) => `<li><strong>${esc(t.label)}</strong> — ${esc(t.description)}</li>`).join('')
page(
  '',
  home,
  `<h1>Présidentielle 2027 : comparer les programmes des candidats</h1>
<p>Les mesures des ${candidates.length} candidats à l'élection présidentielle de 2027, classées par thème, avec pour chacune le lien vers sa source officielle (programme, site de campagne, déclaration). Premier tour le ${shortDate(siteMeta.election.first_round)}, second tour le ${shortDate(siteMeta.election.second_round)}.</p>
<h2>Les candidats</h2><ul>${candidateList}</ul>
<h2>Les thèmes comparés</h2><ul>${themeList}</ul>`,
)
page(
  'comparateur/',
  { ...home, title: 'Comparer les programmes 2027 par thème – Présidentielle 2027' },
  `<h1>Comparer les programmes 2027 par thème</h1>
<p>Choisissez un thème et des candidats : leurs mesures s'affichent côte à côte, chacune avec sa source.</p>
<ul>${themes.map((t) => `<li><a href="${href(`comparateur?theme=${t.id}`)}">${esc(t.label)}</a> — ${esc(t.description)}</li>`).join('')}</ul>`,
)
page(
  'positions/',
  {
    ...home,
    title: 'Qui propose quoi ? Les positions des candidats – Présidentielle 2027',
    description: `Retraite par capitalisation, nucléaire, droit du sol, taxe Zucman… la position de chaque candidat sur les grandes questions, avec sa source. ${DISCLAIMER}`,
  },
  `<h1>Qui propose quoi ? Les positions des candidats à la présidentielle 2027</h1>
<p>Pour chaque grande question, la position relevée dans les sources de chaque candidat. « Pas de position relevée » signifie qu'aucune source ne l'énonce à ce jour : rien n'est déduit.</p>
${themes
  .filter((t) => t.indicators.length)
  .map(
    (t) =>
      `<h2>${esc(t.label)}</h2>${t.indicators
        .map((def) => {
          const rows = candidates.map((c) => ({ c, v: indicator(def, c) }))
          const known = rows.filter((r) => r.v !== 'pas de position relevée')
          const unknown = rows.filter((r) => r.v === 'pas de position relevée')
          return `<h3>${esc(def.label)}</h3><ul>${known.map((r) => `<li>${link(`candidats/${r.c.id}/`, name(r.c))} : ${esc(r.v)}</li>`).join('')}${
            unknown.length ? `<li>Pas de position relevée : ${unknown.map((r) => esc(r.c.last_name)).join(', ')}</li>` : ''
          }</ul>`
        })
        .join('')}`,
  )
  .join('')}`,
)
page(
  'themes/',
  { ...home, title: 'Thèmes × candidats – Présidentielle 2027' },
  `<h1>Thèmes × candidats : qui a des propositions sur quoi</h1>
${themes
  .map((t) => {
    const rows = candidates.map((c) => ({ c, n: measuresOf(c, t.id).length })).filter((r) => r.n > 0)
    return `<h2>${esc(t.label)}</h2><p>${esc(t.description)}</p><ul>${rows.map((r) => `<li>${link(`candidats/${r.c.id}/`, name(r.c))} : ${plural(r.n, 'mesure', 'mesures')}</li>`).join('')}</ul>`
  })
  .join('')}`,
)
page(
  'nouveautes/',
  { ...home, title: 'Nouveautés : le journal des mises à jour – Présidentielle 2027' },
  `<h1>Nouveautés : le journal des mises à jour</h1><p>Les mesures et informations ajoutées au fil de la campagne, mise à jour par mise à jour.</p>`,
)
page('selection/', { ...home, title: 'Ma sélection de mesures – Présidentielle 2027' })
page(
  'programmes/',
  { ...home, title: 'Programmes officiels des candidats – Présidentielle 2027' },
  `<h1>Les programmes officiels des candidats à la présidentielle 2027</h1>
<ul>${candidates
    .map((c) => {
      const p = c.program
      const doc = p.main_url ? ext(p.main_url, p.title ?? 'Programme') : 'pas encore de programme publié'
      return `<li>${link(`candidats/${c.id}/`, name(c))} (${esc(c.party_short)}) — ${esc(PROGRAM_STATUS_LABELS[p.status])} : ${doc}</li>`
    })
    .join('')}</ul>`,
)
page(
  'chiffrages/',
  {
    ...home,
    title: 'Combien ça coûte ? Les chiffrages des programmes – Présidentielle 2027',
    description: `Économies, recettes, déficit visé : les chiffrages d'ensemble annoncés par chaque candidat à la présidentielle 2027, avec leur source, et les évaluations indépendantes. ${DISCLAIMER}`,
  },
  `<h1>Combien ça coûte ? Les chiffrages des programmes de la présidentielle 2027</h1>
<p>Les chiffrages d'ensemble annoncés par les candidats eux-mêmes, tels qu'ils les présentent : ils ne sont pas vérifiés et reposent sur leurs propres hypothèses. Vérifié au ${shortDate(budgets.checked)}.</p>
<ul>${candidates
    .map((c) => {
      const b = budgets.candidates[c.id]
      if (!b || b.level === 'aucun') return `<li>${link(`candidats/${c.id}/`, name(c))} : pas de chiffrage d'ensemble publié à notre connaissance.</li>`
      const figures = b.figures.map((f) => `${esc(f.label)} : ${esc(f.value)}`).join(' · ')
      return `<li>${link(`candidats/${c.id}/`, name(c))} (${b.level === 'global' ? "chiffrage d'ensemble" : 'chiffrage partiel'}) — ${esc(b.summary)} ${figures}. <small>Source : ${ext(b.source_url, b.source_label)}</small></li>`
    })
    .join('')}</ul>
<h2>Évaluations indépendantes</h2><p>${esc(budgets.independent.note)}</p>`,
)
page(
  'methodologie/',
  { ...home, title: 'Méthodologie et sources – Présidentielle 2027' },
  `<h1>Méthodologie et sources</h1>
<p>Chaque mesure est relevée dans une source publique du candidat ou de son parti (programme, site de campagne, déclaration), avec le lien et la date. Les points de comparaison ne sont renseignés que lorsque la source les énonce littéralement. Les votes viennent des données ouvertes de l'Assemblée nationale. Rien n'est déduit ni complété.</p>`,
)
page(
  'election/',
  {
    ...home,
    title: 'Calendrier, parrainages et temps de parole – Présidentielle 2027',
    description: `Dates officielles de l'élection, parrainages publiés par le Conseil constitutionnel et temps de parole relevé par l'Arcom. ${DISCLAIMER}`,
  },
  `<h1>Présidentielle 2027 : calendrier, parrainages et temps de parole</h1>
<p>Premier tour le ${shortDate(siteMeta.election.first_round)}, second tour le ${shortDate(siteMeta.election.second_round)}. Parrainages publiés par le Conseil constitutionnel et temps de parole relevé par l'Arcom.</p>`,
)
page('mentions-legales/', { ...home, title: 'Mentions légales – Présidentielle 2027' }, `<h1>Mentions légales</h1><p>${DISCLAIMER}</p>`)
page(
  'glossaire/',
  {
    ...home,
    title: 'Glossaire des sigles et termes – Présidentielle 2027',
    description: `ISF, PFU, AME, EPR2… les sigles des programmes et des textes votés, expliqués en quelques mots avec leur source officielle. ${DISCLAIMER}`,
  },
  `<h1>Glossaire des sigles et termes de la présidentielle 2027</h1>
<dl>${glossary
    .map((g) => `<dt>${esc(g.term)}${g.expansion ? ` (${esc(g.expansion)})` : ''}</dt><dd>${esc(g.definition)} <small>Source : ${ext(g.source_url, g.source_label)}</small></dd>`)
    .join('')}</dl>`,
)

for (const c of candidates) {
  const list = measuresOf(c)
  const covered = themes.filter((t) => list.some((m) => m.theme === t.id))
  const p = c.program
  const axes = c.main_axes.length ? `<h2>Axes principaux du projet</h2><ol>${c.main_axes.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''
  page(
    `candidats/${c.id}/`,
    {
      title: `${name(c)} 2027 : programme et mesures (${c.party_short})`,
      description: `Programme de ${name(c)} (${c.party}) pour la présidentielle 2027 : ${plural(list.length, 'mesure sourcée', 'mesures sourcées')} sur ${plural(covered.length, 'thème', 'thèmes')}, lien vers le programme officiel. ${DISCLAIMER}`,
      image: `candidat-${c.id}`,
    },
    `<h1>${esc(name(c))} 2027 : programme et mesures</h1>
<p>${esc(c.party)} (${esc(c.party_short)}) · ${esc(STATUS_LABELS[c.status])} · positionnement indicatif : ${esc(POSITION_LABELS[c.position])}</p>
${c.slogan ? `<p>« ${esc(c.slogan)} »</p>` : ''}
<h2>Parcours</h2><p>${esc(c.bio_summary)}</p>
${axes}
<h2>Programme officiel</h2><p>${esc(PROGRAM_STATUS_LABELS[p.status])}${p.main_url ? ` : ${ext(p.main_url, p.title ?? 'ouvrir le programme')}` : ''}.</p>${p.note ? `<p>${esc(p.note)}</p>` : ''}
<h2>Les ${plural(list.length, 'mesure', 'mesures')} de ${esc(name(c))} par thème</h2>
${covered
  .map((t) => {
    const inTheme = list.filter((m) => m.theme === t.id)
    return `<h3>${esc(t.label)} (${inTheme.length})</h3><ul>${inTheme.map(measureItem).join('')}</ul>`
  })
  .join('')}
${c.sources.length ? `<h2>Sources de la fiche</h2><ul>${c.sources.map((s) => `<li>${ext(s.url, s.label)}</li>`).join('')}</ul>` : ''}`,
  )
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

const voteResult = (s: VotesFile['scrutins'][number]) =>
  s.censure ? `${s.totals.pour} voix pour la censure` : `${s.totals.pour} pour, ${s.totals.contre} contre, ${s.totals.abstention} abstentions`
page(
  'votes/',
  {
    title: 'Votes à l’Assemblée sur les grands textes – Présidentielle 2027',
    description: `Retraites, immigration, budgets : les décomptes officiels de l'Assemblée nationale, groupe par groupe, et le vote des candidats qui étaient députés. ${DISCLAIMER}`,
    image: 'votes',
  },
  `<h1>Votes à l'Assemblée nationale sur les grands textes</h1>
<p>Les décomptes officiels de l'Assemblée, groupe par groupe, et le vote des candidats qui étaient députés.</p>
<ul>${votes.scrutins.map((s) => `<li>${link(`votes/${s.id}/`, s.short_title)} — ${esc(shortDate(s.date))} : ${esc(voteResult(s))}</li>`).join('')}</ul>`,
)
for (const s of votes.scrutins) {
  const result = voteResult(s)
  const personal = s.candidates
    .map((p) => {
      const c = candidates.find((x) => x.id === p.candidate)
      const v = { pour: 'pour', contre: 'contre', abstention: 'abstention', non_votant: 'non-votant', absent: s.censure ? 'pas de vote pour la censure' : 'absent' }[p.vote]
      return c ? `${c.last_name} : ${v}` : ''
    })
    .filter(Boolean)
  page(
    `votes/${s.id}/`,
    {
      title: `${s.short_title} – vote à l’Assemblée`,
      description: `Scrutin du ${shortDate(s.date)} : ${result}.${personal.length ? ` ${personal.join(' · ')}.` : ''} Source : Assemblée nationale. ${DISCLAIMER}`,
      image: 'votes',
    },
    `<h1>${esc(s.short_title)} : le vote à l'Assemblée nationale</h1>
<p>${esc(s.official_title)}</p>
<p>Scrutin du ${esc(shortDate(s.date))} : ${esc(result)}.</p>
${s.context ? `<p>${esc(s.context)}</p>` : ''}
${personal.length ? `<h2>Le vote des candidats alors députés</h2><ul>${personal.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<p><small>Source : ${ext(s.source_url, 'Assemblée nationale')}</small></p>`,
  )
}

// Adresse inconnue (et anciennes adresses du comparateur) : application avec l'aperçu par défaut.
writeFileSync(join(DIST, '404.html'), homeShell)

// Moteurs de recherche : plan du site et robots.txt (tout est public, sauf les liens de partage redondants).
const lastmod = new Date().toISOString().slice(0, 10)
const urls = indexable.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
)
writeFileSync(join(DIST, 'page-hashes.json'), JSON.stringify(hashes))
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /partage/\n\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`✔ sitemap.xml : ${indexable.length} pages · robots.txt`)
console.log(`✔ ${count} pages d'aperçu de partage (${SITE})`)
