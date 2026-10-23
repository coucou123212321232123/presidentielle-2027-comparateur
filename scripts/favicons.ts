/**
 * Icônes du site à partir de public/favicon.svg : favicon.ico (16, 32 et 48 px) et favicon-96.png.
 * Google affiche l'icône d'un site dans ses résultats à partir d'une image d'au moins 48 px, de préférence un
 * multiple de 48 ; les navigateurs anciens lisent /favicon.ico. À relancer si le logo change :
 *
 *   npx tsx scripts/favicons.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const PUBLIC = join(import.meta.dirname, '..', 'public')
const svg = readFileSync(join(PUBLIC, 'favicon.svg'))
const png = (size: number) => new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng())

// Fichier ICO contenant directement des images PNG (format accepté par tous les navigateurs actuels).
function ico(images: { size: number; data: Uint8Array }[]) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4) // plans
    header.writeUInt16LE(32, e + 6) // bits par pixel
    header.writeUInt32LE(data.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map((i) => Buffer.from(i.data))])
}

writeFileSync(join(PUBLIC, 'favicon.ico'), ico([16, 32, 48].map((size) => ({ size, data: png(size) }))))
writeFileSync(join(PUBLIC, 'favicon-96.png'), png(96))
console.log('✔ public/favicon.ico (16, 32, 48 px) et public/favicon-96.png')
