import { PUBLIC_SITE, UMAMI_WEBSITE_ID } from './site'

/**
 * Mesure d'audience anonyme (Umami Cloud : sans cookie, tableau de bord privé).
 * Active uniquement sur le site public : ni en développement, ni dans l'application de bureau.
 */
type Umami = { track: (payload?: (props: Record<string, unknown>) => Record<string, unknown>) => void }
declare global {
  interface Window {
    umami?: Umami
  }
}

const enabled = typeof window !== 'undefined' && window.location.origin === new URL(PUBLIC_SITE).origin
let pending: string | null = null

if (enabled) {
  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://cloud.umami.is/script.js'
  script.dataset.websiteId = UMAMI_WEBSITE_ID
  // Comptage manuel : la recherche modifie l'adresse à chaque lettre tapée (?q=…), elle ne doit ni compter
  // comme une visite ni être transmise.
  script.dataset.autoTrack = 'false'
  script.dataset.domains = new URL(PUBLIC_SITE).hostname
  script.addEventListener('load', () => {
    if (pending) countPage(pending)
  })
  document.head.appendChild(script)
}

/** Compte une page vue (chemin seul, sans les paramètres d'adresse). */
export function countPage(path: string) {
  if (!enabled) return
  if (window.umami) {
    window.umami.track((props) => ({ ...props, url: path, title: document.title }))
    pending = null
  } else pending = path
}
