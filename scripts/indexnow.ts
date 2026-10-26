/**
 * IndexNow : prévient Bing (et par lui DuckDuckGo, Ecosia, la recherche de ChatGPT…) des pages modifiées.
 * Compare dist/page-hashes.json (écrit par share-pages.ts) à celui du site en ligne, avant publication, et écrit
 * la liste des adresses changées dans indexnow-urls.json. L'envoi lui-même se fait après la publication
 * (.github/workflows/pages.yml), pour que les robots trouvent la nouvelle version.
 * La clé est publique par nature : le fichier public/<clé>.txt prouve que le site l'a choisie.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const INDEXNOW_KEY = '0718a81ee96cf923a5e2b8d77d6ddc82'
const ROOT = join(import.meta.dirname, '..')
const SITE = (process.env.SITE_URL ?? 'https://programmes-2027.fr/').replace(/\/?$/, '/')

const next: Record<string, string> = JSON.parse(readFileSync(join(ROOT, 'dist', 'page-hashes.json'), 'utf8'))
let live: Record<string, string> = {}
try {
  const res = await fetch(`${SITE}page-hashes.json`, { signal: AbortSignal.timeout(15000) })
  if (res.ok) live = (await res.json()) as Record<string, string>
} catch {
  /* première publication ou site injoignable : toutes les pages sont signalées */
}
const changed = Object.keys(next).filter((url) => live[url] !== next[url])
writeFileSync(
  join(ROOT, 'indexnow-urls.json'),
  JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}${INDEXNOW_KEY}.txt`, urlList: changed }),
)
console.log(`IndexNow : ${changed.length} page(s) modifiée(s) sur ${Object.keys(next).length}`)
