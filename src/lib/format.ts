const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const parse = (iso: string) => new Date(`${iso}T12:00:00`)

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(parse(iso)) : '—')
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** Date courte (JJ/MM/AAAA), ou « juillet 2026 » pour une date connue seulement au mois près (YYYY-MM). */
export const formatShortDate = (iso: string | null | undefined) =>
  !iso ? '—' : iso.length === 7 ? monthFmt.format(parse(`${iso}-15`)) : shortFmt.format(parse(iso))

export function ageAt(birthIso: string | null, refIso: string): number | null {
  if (!birthIso) return null
  const b = parse(birthIso)
  const r = parse(refIso)
  let age = r.getFullYear() - b.getFullYear()
  if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) age--
  return age
}

export const initials = (first: string, last: string) =>
  `${first[0] ?? ''}${last.replace(/^(de |d')/i, '')[0] ?? ''}`.toUpperCase()

/** Couleur de texte (noir/blanc) offrant le meilleur contraste sur un fond donné. */
export function readableOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.4 ? '#111111' : '#ffffff'
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const fullName = (c: { first_name: string; last_name: string }) => `${c.first_name} ${c.last_name}`

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
