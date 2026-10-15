import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="py-16">
      <EmptyState icon={<Compass className="size-10" />} title="Page introuvable">
        Cette adresse ne correspond à aucune page ni à aucun candidat.{' '}
        <Link to="/" className="font-medium text-accent underline underline-offset-2">
          Retour à l'accueil
        </Link>
      </EmptyState>
    </div>
  )
}
