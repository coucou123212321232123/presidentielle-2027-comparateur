/**
 * Veille des sites des candidats, sans IA : repère les pages modifiées (avec leurs passages nouveaux) et les pages
 * nouvelles, pour que la routine hebdomadaire ne relise que ce qui a changé au lieu de tout reparcourir.
 *
 * - Pages suivies : site, page d'actualité, programme et livrets de chaque candidat (src/data/candidates.json).
 *   Page web : on compare les blocs de texte visibles et on garde les passages apparus. PDF : taille et date (HEAD).
 * - Pages nouvelles : plans de site (sitemap.xml) du site de campagne et du site d'actualité.
 *
 * L'état (textes et adresses déjà vus, plusieurs Mo) reste hors du dépôt, dans .watch-cache/ (cache du workflow).
 * Seul le rapport research/watch/changes.json est publié : ce qui a changé depuis la dernière relecture de la
 * routine, dont la date est dans research/watch/last-review.txt. Sans état précédent, le passage sert de référence.
 *
 *   npm run watch-sources
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Candidate } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'research', 'watch')
const CACHE = join(ROOT, '.watch-cache')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const TIMEOUT_MS = 20_000
const CONCURRENCY = 6
const MAX_SITEMAP_FILES = 40
/** Passages nouveaux gardés par page dans le rapport (les plus longs d'abord). */
const MAX_EXCERPTS = 25
const today = new Date().toISOString().slice(0, 10)

interface PageState {
  candidate: string
  /** Empreintes des blocs de texte (pages web) ou de l'en-tête (PDF). */
  blocks: string[]
  changed_at: string
  /** Passages apparus lors des derniers changements, conservés jusqu'à la relecture de la routine. */
  added: { date: string; text: string }[]
  removed: number
}
interface State {
  pages: Record<string, PageState>
  /** Adresses des plans de site, par candidat : URL → date de première apparition. */
  sitemaps: Record<string, Record<string, string>>
}

const json = <T>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback)
const candidates = json<Candidate[]>(join(ROOT, 'src', 'data', 'candidates.json'), [])
const fresh = !existsSync(join(CACHE, 'state.json'))
const state = json<State>(join(CACHE, 'state.json'), { pages: {}, sitemaps: {} })
const lastReview = existsSync(join(OUT, 'last-review.txt')) ? readFileSync(join(OUT, 'last-review.txt'), 'utf8').trim() : '0000-00-00'
const BASELINE = '0000-00-00'

async function get(url: string, method: 'GET' | 'HEAD' = 'GET') {
  return fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } })
}

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12)
const decode = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&apos;/g, '’').replace(/&quot;|&laquo;|&raquo;/g, '"').replace(/&[a-z#0-9]+;/gi, ' ')

/** Blocs de texte visibles (paragraphes, titres, éléments de liste) d'au moins 40 caractères. */
function textBlocks(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|iframe|template|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .split(/<\/?(?:p|h[1-6]|li|div|section|article|td|blockquote|br)[^>]*>/i)
    .map((b) => decode(b.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((b) => b.length >= 40)
}
// Les nombres seuls (compteurs, dates de publication, jetons) ne suffisent pas à signaler un changement.
const blockKey = (b: string) => sha(b.replace(/\d+/g, '#').toLowerCase())

/** Blocs d'une page (texte complet pour les nouveaux passages), ou null si elle ne répond pas. */
async function read(url: string): Promise<{ keys: string[]; texts: Map<string, string> } | null> {
  try {
    if (/\.pdf($|[?#])/i.test(url)) {
      const res = await get(url.split('#')[0], 'HEAD')
      if (!res.ok) return null
      return { keys: [sha(`${res.headers.get('content-length')}|${res.headers.get('last-modified')}|${res.headers.get('etag')}`)], texts: new Map() }
    }
    const res = await get(url)
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null
    const texts = new Map(textBlocks(await res.text()).map((b) => [blockKey(b), b]))
    return { keys: [...texts.keys()], texts }
  } catch {
    return null
  }
}

/** Toutes les adresses d'un plan de site (index de plans compris), ou null s'il n'y en a pas. */
async function sitemapUrls(origin: string): Promise<string[] | null> {
  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    const queue = [origin + path]
    const urls = new Set<string>()
    let files = 0
    try {
      while (queue.length && files < MAX_SITEMAP_FILES) {
        const res = await get(queue.shift()!)
        files++
        if (!res.ok) break
        const xml = await res.text()
        if (!/<(urlset|sitemapindex)/i.test(xml)) break
        const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&'))
        if (/<sitemapindex/i.test(xml)) queue.push(...locs)
        else locs.forEach((u) => urls.add(u))
      }
    } catch {
      /* plan suivant */
    }
    if (urls.size) return [...urls]
  }
  return null
}

async function pool<T>(items: T[], run: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) await run(items[i++])
    }),
  )
}

const pages = new Map<string, string>()
for (const c of candidates)
  for (const u of [c.website, c.news_url, c.program.main_url, ...c.program.thematic_links.map((l) => l.url)]) if (u && !pages.has(u)) pages.set(u, c.id)

let changed = 0
await pool([...pages], async ([url, candidate]) => {
  const page = await read(url)
  if (!page) return
  const prev = state.pages[url]
  if (!prev) {
    state.pages[url] = { candidate, blocks: page.keys, changed_at: fresh ? BASELINE : today, added: [], removed: 0 }
    return
  }
  const before = new Set(prev.blocks)
  const after = new Set(page.keys)
  const added = page.keys.filter((k) => !before.has(k))
  const removed = prev.blocks.filter((k) => !after.has(k)).length
  if (!added.length && !removed) return
  changed++
  // Passages déjà relus par la routine : on ne garde que ceux postérieurs à sa dernière relecture.
  const kept = prev.added.filter((a) => a.date > lastReview)
  const appeared = added
    .map((k) => page.texts.get(k))
    .filter((t): t is string => Boolean(t))
    .map((text) => ({ date: today, text: text.slice(0, 400) }))
  state.pages[url] = { candidate, blocks: page.keys, changed_at: today, added: [...kept, ...appeared], removed: (prev.changed_at > lastReview ? prev.removed : 0) + removed }
})
for (const url of Object.keys(state.pages)) if (!pages.has(url)) delete state.pages[url]

let discovered = 0
for (const c of candidates) {
  const origins = [...new Set([c.website, c.news_url].filter((u): u is string => Boolean(u)).map((u) => new URL(u).origin))]
  const urls = (await Promise.all(origins.map(sitemapUrls))).flatMap((l) => l ?? [])
  if (!urls.length) continue
  const known = state.sitemaps[c.id]
  const next: Record<string, string> = {}
  for (const u of urls) {
    next[u] = known?.[u] ?? (known ? today : BASELINE)
    if (known && !known[u]) discovered++
  }
  state.sitemaps[c.id] = next
}

// Rapport : ce qui a changé depuis la dernière relecture de la routine, candidat par candidat.
const report: Record<string, unknown> = {}
for (const c of candidates) {
  const changedPages = Object.entries(state.pages)
    .filter(([, p]) => p.candidate === c.id && p.changed_at > lastReview && p.changed_at !== BASELINE)
    .map(([url, p]) => ({
      url,
      changed_at: p.changed_at,
      removed_blocks: p.removed,
      added: p.added
        .filter((a) => a.date > lastReview)
        .map((a) => a.text)
        .sort((a, b) => b.length - a.length)
        .slice(0, MAX_EXCERPTS),
    }))
  const newPages = Object.entries(state.sitemaps[c.id] ?? {})
    .filter(([, d]) => d > lastReview && d !== BASELINE)
    .map(([url, first_seen]) => ({ url, first_seen }))
  if (changedPages.length || newPages.length) report[c.id] = { changed_pages: changedPages, new_pages: newPages }
}

mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })
writeFileSync(join(CACHE, 'state.json'), JSON.stringify(state))
writeFileSync(
  join(OUT, 'changes.json'),
  JSON.stringify(
    {
      since: lastReview,
      generated: today,
      note: 'Pages des candidats modifiées ou apparues depuis la dernière relecture (research/watch/last-review.txt), avec les passages nouveaux. Pages sans réponse ou protégées contre les robots : non suivies.',
      candidates: report,
    },
    null,
    2,
  ) + '\n',
)
console.log(`✔ ${pages.size} pages suivies${fresh ? ' (première référence)' : ''} · aujourd'hui : ${changed} modifiée(s), ${discovered} nouvelle(s)`)
console.log(`  Depuis le ${lastReview} : ${Object.keys(report).join(', ') || 'aucun changement'}`)
