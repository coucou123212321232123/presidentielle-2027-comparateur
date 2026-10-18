import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Measure } from './src/data/schema.ts'
import { summarize } from './src/data/summary.ts'

// electron : fichiers chargés en local (file://), chemins relatifs.
// pages : site publié sous https://<compte>.github.io/presidentielle-2027-comparateur/.
const BASES: Record<string, string> = { electron: './', pages: '/presidentielle-2027-comparateur/' }

const MEASURES_DIR = join(import.meta.dirname, 'src', 'data', 'measures')
const SUMMARY_ID = 'virtual:measure-summary'

/**
 * Résumé des mesures (nombre par candidat, par thème et par date d'ajout), calculé au build :
 * les pages s'affichent sans attendre les ~1 300 mesures, chargées ensuite candidat par candidat.
 */
function measureSummary(): Plugin {
  return {
    name: 'measure-summary',
    resolveId: (id) => (id === SUMMARY_ID ? `\0${SUMMARY_ID}` : undefined),
    load(id) {
      if (id !== `\0${SUMMARY_ID}`) return
      const files = readdirSync(MEASURES_DIR).filter((f) => f.endsWith('.json'))
      const measures: Record<string, Measure[]> = {}
      for (const f of files) {
        const path = join(MEASURES_DIR, f)
        this.addWatchFile(path)
        measures[basename(f, '.json')] = JSON.parse(readFileSync(path, 'utf8'))
      }
      return `export default ${JSON.stringify(summarize(measures))}`
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), measureSummary()],
  base: BASES[mode] ?? '/',
  server: { host: '127.0.0.1', port: 5173 },
  // Bundle principal : React, fiches candidats et statut des liens ; les mesures sont chargées à part.
  build: { chunkSizeWarningLimit: 700, outDir: mode === 'electron' ? 'dist-electron' : 'dist' },
}))
