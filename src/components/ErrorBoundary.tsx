import { Component, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { EmptyState } from './ui'

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: Error | null; key: string }) {
    // Réinitialise l'erreur lors d'un changement de page.
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="py-16">
        <EmptyState icon={<TriangleAlert className="size-10" />} title="Cette page n'a pas pu s'afficher">
          Une erreur inattendue s'est produite.{' '}
          <button type="button" onClick={() => window.location.reload()} className="font-medium text-accent underline underline-offset-2">
            Recharger la page
          </button>
        </EmptyState>
      </div>
    )
  }
}
