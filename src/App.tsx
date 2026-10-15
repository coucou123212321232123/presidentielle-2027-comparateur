import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
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

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageSkeleton />}>{node}</Suspense>

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="candidats/:id" element={lazyPage(<CandidatePage />)} />
            <Route path="comparateur" element={lazyPage(<ComparePage />)} />
            <Route path="themes" element={lazyPage(<ThemesPage />)} />
            <Route path="programmes" element={lazyPage(<ProgramsPage />)} />
            <Route path="methodologie" element={lazyPage(<MethodologyPage />)} />
            <Route path="*" element={lazyPage(<NotFoundPage />)} />
          </Route>
        </Routes>
      </Router>
    </MotionConfig>
  )
}
