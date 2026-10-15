import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Application de bureau : les fichiers sont chargés en local (file://), d'où des chemins relatifs.
  base: mode === 'electron' ? './' : '/',
  server: { host: '127.0.0.1', port: 5173 },
  // Le bundle principal embarque volontairement toutes les données (~700 mesures) : app 100 % statique.
  build: { chunkSizeWarningLimit: 1200, outDir: mode === 'electron' ? 'dist-electron' : 'dist' },
}))
