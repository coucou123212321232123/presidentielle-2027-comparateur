/**
 * Teste toutes les URLs des données (programmes, sources, sites, photos…).
 * - Requête HEAD puis GET si besoin, redirections suivies (max 5), timeout 20 s.
 * - Pour un lien cassé, cherche une copie sur la Wayback Machine.
 * Produit `link-report.md` et `src/data/link-status.json` (utilisé par l'interface
 * pour basculer sur l'archive ou afficher « Lien indisponible »).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Budgets, Candidate, Context, Hatvp, LinkStatus, Measure, Meta } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const DATA = join(ROOT, 'src', 'data')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const TIMEOUT_MS = 20_000
const CONCURRENCY = 8
// Codes renvoyés par les protections anti-robots : le lien existe probablement mais n'est pas vérifiable automatiquement.
const BLOCKED = new Set([401, 402, 403, 429, 999])
// Facebook répond 400 à toute requête automatisée.
const isBlocked = (url: string, status: number) => BLOCKED.has(status) || (status === 400 && /(^|\.)facebook\.com$/.test(new URL(url).hostname))

type Kind = 'ok' | 'redirect' | 'blocked' | 'broken' | 'timeout' | 'error'
interface Result {
  url: string
  kind: Kind
  status: number | null
  finalUrl?: string
  archive?: string
  usedBy: string[]
}

const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const candidates = json<Candidate[]>(join(DATA, 'candidates.json'))
const meta = json<Meta>(join(DATA, 'meta.json'))

const usage = new Map<string, Set<string>>()
const add = (url: string | null | undefined, where: string) => {
  if (!url) return
  const key = url.split('#')[0]
  if (!usage.has(key)) usage.set(key, new Set())
  usage.get(key)!.add(where)
}

for (const c of candidates) {
  add(c.website, `${c.id} · site`)
  add(c.news_url, `${c.id} · actualités`)
  add(c.photo?.url, `${c.id} · photo`)
  add(c.photo?.commons_page, `${c.id} · photo (Commons)`)
  add(c.position_source_url, `${c.id} · positionnement`)
  add(c.status_source_url, `${c.id} · statut`)
  add(c.slogan_source_url, `${c.id} · slogan`)
  add(c.main_axes_source_url, `${c.id} · axes`)
  c.socials.forEach((s) => add(s.url, `${c.id} · ${s.platform}`))
  c.sources.forEach((s) => add(s.url, `${c.id} · source fiche`))
  add(c.program.main_url, `${c.id} · programme`)
  add(c.program.archive_url, `${c.id} · programme (archive)`)
  c.program.thematic_links.forEach((l) => add(l.url, `${c.id} · livret ${l.theme}`))
}
for (const f of readdirSync(join(DATA, 'measures')).filter((f) => f.endsWith('.json'))) {
  for (const m of json<Measure[]>(join(DATA, 'measures', f))) {
    add(m.source_url, `mesure ${m.id}`)
    add(m.cost?.source_url, `chiffrage ${m.id}`)
  }
}
meta.inclusion_sources.forEach((s) => add(s.url, 'méthodologie'))
for (const [theme, figures] of Object.entries(json<Context>(join(DATA, 'context.json')).themes))
  figures.forEach((f) => add(f.source_url, `contexte ${theme} · ${f.label}`))
const budgets = json<Budgets>(join(DATA, 'budgets.json'))
for (const [id, b] of Object.entries(budgets.candidates)) if (b.level !== 'aucun') add(b.source_url, `chiffrage ${id}`)
budgets.independent.items.forEach((i) => add(i.source_url, `évaluation ${i.org}`))
for (const [id, h] of Object.entries(json<Hatvp>(join(DATA, 'hatvp.json')).candidates)) add(h.url, `${id} · HATVP`)

async function request(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      method,
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'fr-FR,fr;q=0.9' },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function probe(url: string): Promise<Omit<Result, 'usedBy' | 'archive'>> {
  let current = url
  let redirected = false
  try {
    for (let hop = 0; hop < 6; hop++) {
      let res = await request(current, 'HEAD')
      // Certains serveurs gèrent mal HEAD : toute réponse autre que 2xx/3xx est confirmée en GET.
      if (res.status >= 400) res = await request(current, 'GET')
      res.body?.cancel().catch(() => {})
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location')!, current).toString()
        redirected = true
        continue
      }
      if (res.ok) return { url, kind: redirected ? 'redirect' : 'ok', status: res.status, finalUrl: redirected ? current : undefined }
      if (isBlocked(current, res.status)) return { url, kind: 'blocked', status: res.status }
      return { url, kind: 'broken', status: res.status, finalUrl: redirected ? current : undefined }
    }
    return { url, kind: 'error', status: null, finalUrl: current }
  } catch (e) {
    return { url, kind: (e as Error).name === 'AbortError' ? 'timeout' : 'error', status: null }
  }
}

async function findArchive(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const data = (await res.json()) as { archived_snapshots?: { closest?: { available: boolean; url: string } } }
    const snap = data.archived_snapshots?.closest
    return snap?.available ? snap.url.replace(/^http:/, 'https:') : undefined
  } catch {
    return undefined
  }
}

const urls = [...usage.keys()]
const results: Result[] = []
let done = 0
async function worker() {
  while (urls.length) {
    const url = urls.shift()!
    const r: Result = { ...(await probe(url)), usedBy: [...usage.get(url)!] }
    if (r.kind === 'broken' || r.kind === 'timeout' || r.kind === 'error') r.archive = await findArchive(url)
    results.push(r)
    done++
    if (process.stdout.isTTY) process.stdout.write(`\r${done}/${usage.size} liens testés`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
console.log()

const now = new Date().toISOString()
const status: LinkStatus = {}
for (const r of results.sort((a, b) => a.url.localeCompare(b.url))) {
  const ok = r.kind === 'ok' || r.kind === 'redirect' || r.kind === 'blocked'
  status[r.url] = {
    ok,
    status: r.status,
    checked_at: now,
    ...(r.kind === 'blocked' ? { note: 'Protection anti-robot : non vérifiable automatiquement' } : {}),
    ...(r.archive ? { archive: r.archive } : {}),
  }
}
writeFileSync(join(DATA, 'link-status.json'), JSON.stringify(status, null, 2) + '\n')

const by = (k: Kind[]) => results.filter((r) => k.includes(r.kind))
const failing = by(['broken', 'timeout', 'error'])
const lines: string[] = [
  '# Rapport de vérification des liens',
  '',
  `Généré le ${now.slice(0, 10)} à ${now.slice(11, 16)} UTC — ${results.length} URL uniques testées.`,
  '',
  '| Résultat | Nombre |',
  '|---|---|',
  `| ✅ OK | ${by(['ok']).length} |`,
  `| ↪️ Redirection vers une page valide | ${by(['redirect']).length} |`,
  `| 🛡️ Bloqué par une protection anti-robot (non compté comme cassé) | ${by(['blocked']).length} |`,
  `| ❌ Cassé / timeout / erreur | ${failing.length} |`,
  `| 🗄️ dont avec copie archivée (bascule automatique) | ${failing.filter((r) => r.archive).length} |`,
  '',
]
const section = (title: string, list: Result[], extra: (r: Result) => string) => {
  if (!list.length) return
  lines.push(`## ${title}`, '')
  for (const r of list) lines.push(`- ${r.url} — ${extra(r)} — utilisé par : ${r.usedBy.join(', ')}`)
  lines.push('')
}
section('Liens cassés', failing, (r) =>
  `${r.kind}${r.status ? ` (HTTP ${r.status})` : ''} → ${r.archive ? `archive : ${r.archive}` : '**Lien indisponible** (aucune archive)'}`,
)
section('Redirections', by(['redirect']), (r) => `→ ${r.finalUrl}`)
section('Non vérifiables automatiquement', by(['blocked']), (r) => `HTTP ${r.status}`)
writeFileSync(join(ROOT, 'link-report.md'), lines.join('\n'))

console.log(`OK ${by(['ok', 'redirect']).length} · bloqués ${by(['blocked']).length} · cassés ${failing.length} (dont ${failing.filter((r) => r.archive).length} archivés)`)
console.log('→ link-report.md et src/data/link-status.json mis à jour')
