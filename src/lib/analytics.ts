import { GOATCOUNTER_CODE, PUBLIC_SITE } from './site'

/**
 * Mesure d'audience anonyme (GoatCounter : sans cookie ni identifiant persistant, tableau de bord privé).
 * Active uniquement sur le site public : ni en développement, ni dans l'application de bureau.
 */
type GoatCounter = { no_onload?: boolean; count?: (vars: { path: string }) => void }
declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

const enabled = typeof window !== 'undefined' && window.location.origin === new URL(PUBLIC_SITE).origin
let pending: string | null = null

if (enabled) {
  // Application monopage : chaque changement de page est compté à la main (pas de comptage automatique au chargement).
  window.goatcounter = { no_onload: true }
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://gc.zgo.at/count.js'
  script.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`
  script.addEventListener('load', () => {
    if (pending) countPage(pending)
  })
  document.head.appendChild(script)
}

/** Compte une page vue (chemin sans les paramètres, qui peuvent contenir une recherche). */
export function countPage(path: string) {
  if (!enabled) return
  if (window.goatcounter?.count) {
    window.goatcounter.count({ path })
    pending = null
  } else pending = path
}
