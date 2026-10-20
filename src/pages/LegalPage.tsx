import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from '../components/ExternalLink'
import { PageHeader } from '../components/ui'
import { CONTACT_EMAIL } from '../lib/site'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-2xl font-semibold text-ink">{title}</h2>
      <div className="space-y-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  )
}

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
    {CONTACT_EMAIL}
  </a>
)

export default function LegalPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Informations légales" title="Mentions légales">
        Informations sur l'éditeur et l'hébergeur du site, et sur l'utilisation des données.
      </PageHeader>

      <Section title="Éditeur">
        <p>
          Ce site est édité à titre personnel et non professionnel par un particulier, sans lien avec un candidat, un parti, une institution
          ou une entreprise. Conformément à l'article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie
          numérique, l'éditeur a choisi de ne pas rendre publique son identité ; les éléments permettant de l'identifier ont été communiqués à
          l'hébergeur.
        </p>
        <p>
          Directeur de la publication : l'éditeur. Contact : <Mail />.
        </p>
      </Section>

      <Section title="Hébergeur">
        <p>
          GitHub, Inc. (service GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis ·{' '}
          <ExternalLink href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" className="text-accent hover:underline">
            déclaration de confidentialité de GitHub
          </ExternalLink>
          .
        </p>
      </Section>

      <Section title="Objet du site">
        <p>
          Outil d'information indépendant et non officiel : il présente les candidats à l'élection présidentielle de 2027, leurs mesures avec
          un lien vers chaque source, des votes à l'Assemblée nationale et des données électorales publiques. Il ne contient ni publicité, ni
          recommandation de vote, et n'est financé par aucun candidat ni parti. Les règles de sélection et de vérification sont décrites dans
          la{' '}
          <Link to="/methodologie" className="text-accent hover:underline">
            méthodologie
          </Link>
          .
        </p>
        <p>
          Les informations sont données à titre indicatif : seuls les documents officiels des candidats et des institutions font foi. Une erreur
          peut être signalée depuis chaque mesure ou à l'adresse <Mail /> ; elle est vérifiée sur la source puis corrigée.
        </p>
      </Section>

      <Section title="Sources et droits">
        <p>
          Les programmes, déclarations et documents cités appartiennent à leurs auteurs ; le site en propose un résumé et renvoie vers chaque
          source. Les votes, parrainages et temps de parole proviennent des données publiques de l'Assemblée nationale, du Conseil
          constitutionnel et de l'Arcom. Les photos des candidats proviennent de Wikimedia Commons ; leur auteur et leur licence sont indiqués sur
          chaque fiche.
        </p>
      </Section>

      <Section title="Données personnelles et cookies">
        <p>
          Le site ne demande aucun compte et ne dépose aucun cookie. Quelques préférences (thème clair ou sombre, date de votre dernière visite
          pour le badge « Nouveau », filtres) sont enregistrées uniquement dans votre navigateur et ne sont transmises à personne.
        </p>
        <p>
          La fréquentation est mesurée de façon anonyme avec{' '}
          <ExternalLink href="https://www.goatcounter.com/help/privacy" className="text-accent hover:underline">
            GoatCounter
          </ExternalLink>
          , sans cookie ni identifiant persistant : seuls des totaux sont conservés (pages vues, site de provenance, type de navigateur et
          d'écran, pays). Ces statistiques sont réservées à l'éditeur. Cette mesure n'a pas lieu dans l'application de bureau.
        </p>
        <p>
          Le bouton « Signaler une erreur » ouvre un formulaire sur GitHub : ce que vous y saisissez est public et soumis aux conditions de
          GitHub. L'application de bureau télécharge les mises à jour des données depuis GitHub.
        </p>
      </Section>

      <p className="text-sm text-muted">Dernière mise à jour : 20 octobre 2026.</p>
    </div>
  )
}
