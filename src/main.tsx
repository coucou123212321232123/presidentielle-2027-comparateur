import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces/opsz.css'
import './index.css'

// Version web publiée : service worker pour l'installation sur téléphone et l'usage hors ligne.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* sans service worker, l'application fonctionne normalement en ligne */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
