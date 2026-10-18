/**
 * Votes à l'Assemblée nationale : télécharge l'open data officiel (scrutins + députés et groupes),
 * extrait les scrutins listés dans research/votes/selection.json et écrit src/data/votes.json :
 * décompte par groupe politique (pour, contre, abstention, non-votant, absent) et vote personnel
 * des candidats qui étaient alors députés. Aucun chiffre n'est saisi à la main.
 *
 *   npm run fetch-votes                    # met à jour src/data/votes.json
 *   npm run fetch-votes -- --list "regex"  # liste les scrutins dont l'intitulé correspond (aide au choix)
 *
 * Exécuté par .github/workflows/votes.yml (les serveurs de GitHub ont accès à data.assemblee-nationale.fr).
 * Les téléchargements sont gardés dans .cache/votes/ pour les exécutions locales.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { THEME_IDS, VotesFileSchema, type Candidate, type Scrutin, type ThemeId, type VotePosition } from '../src/data/schema.ts'

const ROOT = join(import.meta.dirname, '..')
const CACHE = join(ROOT, '.cache', 'votes')
const OPEN_DATA = 'https://data.assemblee-nationale.fr/static/openData/repository'

const scrutinsZip = (leg: number) => [`${OPEN_DATA}/${leg}/loi/scrutins/Scrutins.json.zip`]
const actorsZip = (leg: number) => [
  `${OPEN_DATA}/${leg}/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip`,
  `${OPEN_DATA}/${leg}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`,
]

interface Selection {
  legislature: number
  numero?: number
  date?: string
  match?: string
  short_title: string
  theme: ThemeId
  context: string
}

// Ordre d'affichage des groupes dans l'hémicycle, de la gauche vers la droite (sigles successifs des législatures 16 et 17).
const SEAT_ORDER = [
  'LFI-NFP', 'LFI-NUPES', 'LFI', 'GDR', 'GDR-NUPES', 'ECOS', 'ECOLO', 'ECO', 'SOC', 'SOC-A', 'LIOT', 'DEM', 'MODEM',
  'EPR', 'RE', 'REN', 'HOR', 'DR', 'LR', 'UDR', 'RN', 'NI',
]

/** Les fichiers de l'Assemblée représentent une liste à un élément par un objet seul : on normalise. */
const list = <T,>(v: T | T[] | null | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])
const num = (v: unknown) => Number(v ?? 0) || 0
const text = (v: unknown): string => (typeof v === 'string' ? v : v && typeof v === 'object' && '#text' in v ? String((v as { '#text': unknown })['#text']) : '')
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

async function download(urls: string[]): Promise<Uint8Array> {
  mkdirSync(CACHE, { recursive: true })
  for (const url of urls) {
    const file = join(CACHE, url.replace(/^.*\/repository\//, '').replace(/\//g, '_'))
    if (existsSync(file)) return new Uint8Array(readFileSync(file))
    console.log(`↓ ${url}`)
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(300_000) })
      if (!res.ok) {
        console.warn(`  ${res.status} ${res.statusText}`)
        continue
      }
      const buf = new Uint8Array(await res.arrayBuffer())
      writeFileSync(file, buf)
      return buf
    } catch (e) {
      console.warn(`  échec : ${(e as Error).message}`)
    }
  }
  throw new Error(`Téléchargement impossible : ${urls.join(' | ')}`)
}

function readZipJson(buf: Uint8Array, keep: (name: string) => boolean) {
  const files = unzipSync(buf, { filter: (f) => f.name.endsWith('.json') && keep(f.name) })
  return Object.entries(files).map(([name, data]) => ({ name, json: JSON.parse(strFromU8(data)) }))
}

interface Organe {
  ref: string
  short: string
  label: string
  color: string
}

interface Mandat {
  legislature: number
  start: string
  end: string | null
}

interface Actor {
  ref: string
  name: string
  deputy: Mandat[]
}

async function loadActors(leg: number) {
  const entries = readZipJson(await download(actorsZip(leg)), (n) => /\/(acteur|organe)\//.test(n))
  const organes = new Map<string, Organe>()
  const actors = new Map<string, Actor>()
  for (const { json } of entries) {
    if (json.organe) {
      const o = json.organe
      if (o.codeType !== 'GP') continue
      const color = typeof o.couleurAssociee === 'string' && /^#[0-9a-f]{6}$/i.test(o.couleurAssociee) ? o.couleurAssociee : '#9ca3af'
      organes.set(text(o.uid), { ref: text(o.uid), short: o.libelleAbrev ?? o.libelleAbrege ?? text(o.uid), label: o.libelle ?? '', color })
    } else if (json.acteur) {
      const a = json.acteur
      const ident = a.etatCivil?.ident ?? {}
      const deputy = list(a.mandats?.mandat)
        .filter((m: any) => m.typeOrgane === 'ASSEMBLEE')
        .map((m: any) => ({ legislature: num(m.legislature), start: String(m.dateDebut ?? '').slice(0, 10), end: m.dateFin ? String(m.dateFin).slice(0, 10) : null }))
      actors.set(text(a.uid), { ref: text(a.uid), name: `${ident.prenom ?? ''} ${ident.nom ?? ''}`.trim(), deputy })
    }
  }
  console.log(`  législature ${leg} : ${actors.size} acteurs, ${organes.size} groupes politiques`)
  return { organes, actors }
}

const VOTE_KEYS: [string, VotePosition][] = [
  ['pours', 'pour'],
  ['contres', 'contre'],
  ['abstentions', 'abstention'],
  ['nonVotants', 'non_votant'],
]

async function main() {
  const listArg = process.argv.indexOf('--list')
  const listPattern = listArg > -1 ? new RegExp(process.argv[listArg + 1] ?? '.', 'i') : null
  const selection: Selection[] = JSON.parse(readFileSync(join(ROOT, 'research', 'votes', 'selection.json'), 'utf8')).scrutins
  const candidates: Candidate[] = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'candidates.json'), 'utf8'))
  const legislatures = [...new Set(selection.map((s) => s.legislature))].sort()
  const out: Scrutin[] = []
  const problems: string[] = []

  for (const leg of legislatures) {
    const { organes, actors } = await loadActors(leg)
    const byName = new Map([...actors.values()].map((a) => [norm(a.name), a]))
    const scrutins = readZipJson(await download(scrutinsZip(leg)), () => true)
      .map(({ json }) => json.scrutin)
      .filter(Boolean)
    console.log(`  législature ${leg} : ${scrutins.length} scrutins`)
    const label = (s: any) => `${s.titre ?? ''} ${s.objet?.libelle ?? ''}`

    if (listPattern) {
      for (const s of scrutins.filter((x: any) => listPattern.test(label(x))).sort((a: any, b: any) => num(a.numero) - num(b.numero))) {
        const d = s.syntheseVote?.decompte ?? {}
        console.log(`  L${leg} n°${s.numero} ${s.dateScrutin} [${s.typeVote?.codeTypeVote}] ${s.sort?.code} pour=${d.pour} contre=${d.contre} abst=${d.abstentions} · ${String(s.titre).slice(0, 220)}`)
      }
    }

    for (const sel of selection.filter((s) => s.legislature === leg)) {
      if (!THEME_IDS.includes(sel.theme)) problems.push(`${sel.short_title} : thème inconnu ${sel.theme}`)
      const re = sel.match ? new RegExp(sel.match, 'i') : null
      const found = scrutins.filter(
        (s: any) =>
          (sel.numero === undefined || num(s.numero) === sel.numero) &&
          (!sel.date || String(s.dateScrutin).startsWith(sel.date)) &&
          (!re || re.test(label(s))),
      )
      if (found.length !== 1) {
        problems.push(`${sel.short_title} : ${found.length} scrutin(s) trouvé(s) au lieu d'un`)
        for (const s of found.length ? found : scrutins.filter((s: any) => sel.date && String(s.dateScrutin).startsWith(sel.date)))
          console.log(`    candidat : L${leg} n°${s.numero} ${s.dateScrutin} · ${String(s.titre).slice(0, 200)}`)
        continue
      }
      const s = found[0]
      const date = String(s.dateScrutin).slice(0, 10)
      const censure = s.typeVote?.codeTypeVote === 'MOC' || /motion de censure/i.test(label(s))
      const seen = new Map<string, { vote: VotePosition; group: string }>()
      const groups = list(s.ventilationVotes?.organe?.groupes?.groupe).map((g: any) => {
        const ref = text(g.organeRef)
        const o = organes.get(ref) ?? { ref, short: ref, label: ref, color: '#9ca3af' }
        const d = g.vote?.decompteVoix ?? {}
        for (const [key, vote] of VOTE_KEYS)
          for (const v of list(g.vote?.decompteNominatif?.[key]?.votant)) seen.set(text(v.acteurRef), { vote, group: o.short })
        const counts = { pour: num(d.pour), contre: num(d.contre), abstention: num(d.abstentions), non_votant: num(d.nonVotants) + num(d.nonVotantsVolontaires) }
        const members = num(g.nombreMembresGroupe)
        const voted = counts.pour + counts.contre + counts.abstention + counts.non_votant
        return { ref, short: o.short, label: o.label, color: o.color, members: Math.max(members, voted), ...counts, absent: Math.max(0, members - voted) }
      })
      groups.sort((a, b) => {
        const ia = SEAT_ORDER.indexOf(a.short)
        const ib = SEAT_ORDER.indexOf(b.short)
        return (ia < 0 ? SEAT_ORDER.length - 1.5 : ia) - (ib < 0 ? SEAT_ORDER.length - 1.5 : ib)
      })
      for (const g of groups) if (!SEAT_ORDER.includes(g.short)) problems.push(`Groupe sans place définie dans l'hémicycle : ${g.short} (${g.label})`)

      const personal: Scrutin['candidates'] = []
      for (const c of candidates) {
        const actor = byName.get(norm(`${c.first_name} ${c.last_name}`))
        if (!actor) continue
        const deputy = actor.deputy.some((m) => m.start <= date && (!m.end || m.end >= date))
        const v = seen.get(actor.ref)
        if (v) personal.push({ candidate: c.id, group: v.group, vote: v.vote })
        else if (deputy) {
          // Député à cette date mais absent des listes nominatives : n'a pas pris part au vote.
          personal.push({ candidate: c.id, group: '', vote: 'absent' })
        }
      }

      const d = s.syntheseVote?.decompte ?? {}
      const code = String(s.sort?.code ?? '')
      out.push({
        id: `l${leg}-${num(s.numero)}`,
        legislature: leg,
        numero: num(s.numero),
        date,
        short_title: sel.short_title,
        theme: sel.theme,
        context: sel.context,
        official_title: String(s.titre ?? s.objet?.libelle ?? '').replace(/^./, (c) => c.toUpperCase()),
        vote_type: String(s.typeVote?.libelleTypeVote ?? ''),
        censure,
        result: /adopt/i.test(code) ? 'adopte' : 'rejete',
        majority_required: s.syntheseVote?.nbrSuffragesRequis ? num(s.syntheseVote.nbrSuffragesRequis) : null,
        totals: { pour: num(d.pour), contre: num(d.contre), abstention: num(d.abstentions), non_votant: num(d.nonVotants) + num(d.nonVotantsVolontaires) },
        groups,
        candidates: personal,
        source_url: `https://www.assemblee-nationale.fr/dyn/${leg}/scrutins/${num(s.numero)}`,
      })
      console.log(`  ✔ ${sel.short_title} → n°${s.numero} (${date}) · ${personal.map((p) => `${p.candidate}=${p.vote}`).join(', ') || 'aucun candidat député'}`)
    }
  }

  if (listPattern) return
  out.sort((a, b) => b.date.localeCompare(a.date))
  const parsed = VotesFileSchema.safeParse({
    generated_at: new Date().toISOString(),
    source_label: 'Assemblée nationale – données ouvertes (scrutins, députés et groupes)',
    source_url: 'https://data.assemblee-nationale.fr/',
    scrutins: out,
  })
  if (!parsed.success) {
    for (const i of parsed.error.issues) console.error(`✖ ${i.path.map(String).join('.')} : ${i.message}`)
    process.exit(1)
  }
  for (const p of problems) console.warn(`⚠ ${p}`)
  writeFileSync(join(ROOT, 'src', 'data', 'votes.json'), JSON.stringify(parsed.data, null, 2) + '\n')
  console.log(`✔ src/data/votes.json : ${out.length}/${selection.length} scrutins`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
