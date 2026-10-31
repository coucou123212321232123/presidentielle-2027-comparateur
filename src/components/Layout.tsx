import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Info, Menu, Moon, RefreshCw, Sun, X } from 'lucide-react'
import { generatedAt, meta } from '../data'
import { checkForDataUpdate, useDataUpdate } from '../data/remote'
import { countPage } from '../lib/analytics'
import { formatShortDate } from '../lib/format'
import { useColorMode } from '../lib/store'
import { openReport } from '../lib/report'
import { useSelection } from '../lib/selection'
import { ReportDialog } from './ReportDialog'
import { cx } from './ui'
import { ErrorBoundary } from './ErrorBoundary'
import { GlossaryTooltip } from './Glossary'

const NAV = [
  { to: '/', label: 'Candidats', end: true },
  { to: '/comparateur', label: 'Comparateur' },
  { to: '/positions', label: 'Positions' },
  { to: '/programmes', label: 'Programmes' },
  { to: '/chiffrages', label: 'Chiffrages' },
  { to: '/votes', label: 'Votes' },
  { to: '/election', label: 'Élection' },
  { to: '/glossaire', label: 'Glossaire' },
  { to: '/methodologie', label: 'Méthodologie' },
]

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg" aria-label="Accueil – Présidentielle 2027">
      <span className="flex h-7 items-end gap-[3px]" aria-hidden="true">
        <span className="h-4 w-1.5 rounded-full bg-blue-600" />
        <span className="h-7 w-1.5 rounded-full bg-ink" />
        <span className="h-5 w-1.5 rounded-full bg-red-600" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-[17px] font-semibold tracking-tight text-ink">Présidentielle 2027</span>
        <span className="block text-[11px] font-medium text-muted">Comparateur de programmes</span>
      </span>
    </Link>
  )
}

function ThemeToggle() {
  const { mode, toggle } = useColorMode()
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink"
      aria-label={mode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={mode} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
          {mode === 'dark' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

/** Accès à « Ma sélection », avec le nombre de mesures mises de côté. */
function SelectionLink() {
  const count = useSelection((s) => s.ids.length)
  return (
    <Link
      to="/selection"
      className="relative flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink"
      aria-label={count ? `Ma sélection : ${count} mesure${count > 1 ? 's' : ''}` : 'Ma sélection'}
      title="Ma sélection"
    >
      <Bookmark className="size-4" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-white" aria-hidden="true">
          {count}
        </span>
      )}
    </Link>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      'relative rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors 2xl:px-3',
      isActive ? 'text-ink' : 'text-muted hover:text-ink',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface-2" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                      )}
                      {n.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <SelectionLink />
          <ThemeToggle />
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface xl:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Navigation principale"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line xl:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) => cx('block rounded-xl px-3 py-2.5 text-base font-medium', isActive ? 'bg-surface-2 text-ink' : 'text-ink-2')}
                  >
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function Banner() {
  const available = useDataUpdate((s) => s.available)
  return (
    <div className="border-b border-line bg-surface-2/60 text-center text-xs text-muted">
      <AnimatePresence>
        {available && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden bg-ink text-bg" role="status">
            <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 px-4 py-2 text-sm">
              <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
              Nouvelles données du {formatShortDate(available)} téléchargées.
              <button type="button" onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">
                Actualiser
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-1.5 px-4 py-1.5">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Données mises à jour le {formatShortDate(meta.last_updated)} – Outil indépendant et non officiel ·{' '}
          <Link to="/methodologie" className="underline underline-offset-2 hover:text-ink">
            méthodologie
          </Link>
        </span>
      </p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Outil indépendant et non officiel, sans affiliation partisane. Aucune recommandation de vote.
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Premier tour : {formatShortDate(meta.election.first_round)} · Second tour : {formatShortDate(meta.election.second_round)}
          </span>
          <Link to="/nouveautes" className="underline underline-offset-2 hover:text-ink">
            Nouveautés
          </Link>
          <button type="button" onClick={() => openReport()} className="underline underline-offset-2 hover:text-ink">
            Signaler une erreur
          </button>
          <Link to="/mentions-legales" className="underline underline-offset-2 hover:text-ink">
            Mentions légales
          </Link>
        </p>
      </div>
    </footer>
  )
}

export function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  useEffect(() => {
    window.scrollTo({ top: 0 })
    countPage(location.pathname)
  }, [location.pathname])
  useEffect(() => {
    checkForDataUpdate({ last_updated: meta.last_updated, generated_at: generatedAt })
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        // Sans changer l'adresse : dans l'application de bureau, « #main » remplacerait la page affichée (#/glossaire…).
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
        Aller au contenu
      </a>
      <Banner />
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto focus:outline-none w-full max-w-7xl flex-1 px-4 pt-8 sm:px-6 sm:pt-12">
        {/* Transition d'entrée uniquement : la nouvelle page s'affiche immédiatement, même en navigation rapide. */}
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          <ErrorBoundary resetKey={location.pathname}>{outlet}</ErrorBoundary>
        </motion.div>
      </main>
      <Footer />
      <GlossaryTooltip />
      <ReportDialog />
    </div>
  )
}
