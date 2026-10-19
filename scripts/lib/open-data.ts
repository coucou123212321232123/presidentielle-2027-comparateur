/** Outils communs aux imports de données ouvertes (Conseil constitutionnel, Arcom). */
import type { Candidate } from '../../src/data/schema.ts'

/** CSV séparé par des points-virgules, champs éventuellement entre guillemets (format des administrations françaises). */
export function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ';') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim()))
}

const key = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()

/** « LE PEN Marine », « MELENCHON Jean-Luc »… → candidat du comparateur (nom puis prénom, sans accents ni casse). */
export function matchCandidate(label: string, candidates: Candidate[]): Candidate | undefined {
  const k = key(label)
  return candidates.find((c) => k === key(`${c.last_name} ${c.first_name}`) || k === key(`${c.first_name} ${c.last_name}`))
}
