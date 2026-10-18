import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, Menu, Moon, RefreshCw, Sun, X } from 'lucide-react'
import { generatedAt, meta } from '../data'
import { checkForDataUpdate, useDataUpdate } from '../data/remote'
import { formatShortDate } from '../lib/format'
import { useColorMode } from '../lib/store'
import { cx } from './ui'
import { ErrorBoundary } from './ErrorBoundary'
import { GlossaryTooltip } from './Glossary'

const NAV = [
  { to: '/', label: 'Candidats', end: true },
  { to: '/comparateur', label: 'Comparateur' },
  { to: '/themes', label: 'Thèmes' },
  { to: '/programmes', label: 'Programmes' },
  { to: '/votes', label: 'Votes' },
  { to: '/methodologie', label: 'Méthodologie' },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Accueil – Présidentielle 2027">
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

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      'relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'text-ink' : 'text-muted hover:text-ink',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden md:block">
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
          <ThemeToggle />
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface md:hidden"
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
            className="overflow-hidden border-t border-line md:hidden"
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
        <p>
          Premier tour : {formatShortDate(meta.election.first_round)} · Second tour : {formatShortDate(meta.election.second_round)}
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
  }, [location.pathname])
  useEffect(() => {
    checkForDataUpdate({ last_updated: meta.last_updated, generated_at: generatedAt })
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
        Aller au contenu
      </a>
      <Banner />
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 sm:px-6 sm:pt-12">
        {/* Transition d'entrée uniquement : la nouvelle page s'affiche immédiatement, même en navigation rapide. */}
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          <ErrorBoundary resetKey={location.pathname}>{outlet}</ErrorBoundary>
        </motion.div>
      </main>
      <Footer />
      <GlossaryTooltip />
    </div>
  )
}
