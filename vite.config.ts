import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// electron : fichiers chargés en local (file://), chemins relatifs.
// pages : site publié sous https://<compte>.github.io/presidentielle-2027-comparateur/.
const BASES: Record<string, string> = { electron: './', pages: '/presidentielle-2027-comparateur/' }

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: BASES[mode] ?? '/',
  server: { host: '127.0.0.1', port: 5173 },
  // Le bundle principal embarque volontairement toutes les données (~1 300 mesures) : app 100 % statique.
  build: { chunkSizeWarningLimit: 1500, outDir: mode === 'electron' ? 'dist-electron' : 'dist' },
}))
