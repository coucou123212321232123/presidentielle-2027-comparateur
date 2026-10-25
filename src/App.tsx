import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Layout } from './components/Layout'
import { Skeleton } from './components/ui'
import { HomePage } from './pages/HomePage'

const CandidatePage = lazy(() => import('./pages/CandidatePage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const ThemesPage = lazy(() => import('./pages/ThemesPage'))
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'))
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const VotesPage = lazy(() => import('./pages/VotesPage'))
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'))
const ElectionPage = lazy(() => import('./pages/ElectionPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const PositionsPage = lazy(() => import('./pages/PositionsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const SelectionPage = lazy(() => import('./pages/SelectionPage'))
const NewsPage = lazy(() => import('./pages/NewsPage'))

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}

// Ouverte comme fichier local (application de bureau), l'app utilise un routage par ancre (#/comparateur).
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter
// Sous-dossier de publication éventuel (BASE_URL) ; vide à la racine du domaine et en local.
const basename = window.location.protocol === 'file:' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

/** Lien de partage (/partage/energie/attal/philippe/) : redirige vers le comparateur correspondant. */
function ShareRedirect() {
  const { theme = '', a, b } = useParams()
  const [params] = useSearchParams()
  const ids = a && b ? [a, b] : (params.get('c') ?? '').split(',').filter(Boolean)
  const q = new URLSearchParams({ theme })
  const c = ids.length ? `&c=${ids.join(',')}` : ''
  return <Navigate to={`/comparateur?${q.toString()}${c}`} replace />
}

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageSkeleton />}>{node}</Suspense>

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router basename={basename}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="candidats/:id" element={lazyPage(<CandidatePage />)} />
            <Route path="comparateur" element={lazyPage(<ComparePage />)} />
            <Route path="positions" element={lazyPage(<PositionsPage />)} />
            <Route path="themes" element={lazyPage(<ThemesPage />)} />
            <Route path="jeu" element={lazyPage(<QuizPage />)} />
            <Route path="selection" element={lazyPage(<SelectionPage />)} />
            <Route path="nouveautes" element={lazyPage(<NewsPage />)} />
            <Route path="programmes" element={lazyPage(<ProgramsPage />)} />
            <Route path="votes" element={lazyPage(<VotesPage />)} />
            <Route path="votes/:id" element={lazyPage(<VotesPage />)} />
            <Route path="election" element={lazyPage(<ElectionPage />)} />
            <Route path="glossaire" element={lazyPage(<GlossaryPage />)} />
            <Route path="mentions-legales" element={lazyPage(<LegalPage />)} />
            <Route path="methodologie" element={lazyPage(<MethodologyPage />)} />
            <Route path="partage/:theme/:a?/:b?" element={<ShareRedirect />} />
            <Route path="*" element={lazyPage(<NotFoundPage />)} />
          </Route>
        </Routes>
      </Router>
    </MotionConfig>
  )
}
