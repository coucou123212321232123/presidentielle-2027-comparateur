import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { candidateById, candidates, changelog, glossary, meta, themes, totalMeasures } from '../data'
import { PrecisionBadge, SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Card, PageHeader } from '../components/ui'
import { PRECISION_LABELS, SOURCE_TYPE_LABELS } from '../lib/labels'
import type { Precision, SourceType } from '../data/schema'
import { formatDate, formatShortDate, fullName } from '../lib/format'
import { reportUrl } from '../lib/report'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-2xl font-semibold text-ink">{title}</h2>
      <div className="space-y-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  )
}

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Méthodologie" title="D'où viennent les données">
        Dernière mise à jour : <strong className="text-ink">{formatDate(meta.last_updated)}</strong> · {candidates.length} candidats ·{' '}
        {totalMeasures} mesures sourcées.
      </PageHeader>

      <Section title="Principes">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Neutralité :</strong> même structure, même ton et même niveau de détail pour chaque candidat. Aucun
            classement, aucune recommandation de vote.
          </li>
          <li>
            <strong className="text-ink">Pas de source, pas de mesure :</strong> chaque mesure renvoie à une URL ouverte et vérifiée. Aucune
            position n'est déduite : sans source, l'outil affiche « Pas de position publiée à ce jour ».
          </li>
          <li>
            <strong className="text-ink">Transparence :</strong> le programme officiel est distingué des déclarations, votes et analyses
            tierces par une étiquette sur chaque mesure.
          </li>
          <li>
            <strong className="text-ink">Équité :</strong> un candidat ayant publié moins de propositions apparaît tel quel ; les vides ne
            sont pas comblés.
          </li>
          <li>Les mesures sont reformulées en quelques phrases ; seul le document source fait foi.</li>
          <li>Les couleurs associées aux candidats sont des repères visuels inspirés des couleurs usuelles des partis, pas des jugements.</li>
        </ul>
      </Section>

      <Section title="Candidats présentés">
        <p>{meta.inclusion_rule}</p>
        <ul className="space-y-1 text-sm">
          {meta.inclusion_sources.map((s) => (
            <li key={s.url}>
              <ExternalLink href={s.url} className="text-accent hover:underline">
                {s.label}
              </ExternalLink>
            </li>
          ))}
        </ul>
        <Card className="mt-4 p-4">
          <h3 className="mb-2 text-sm font-semibold text-ink">Autres candidatures déclarées (sans fiche détaillée)</h3>
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {meta.other_declared.map((o) => (
              <li key={o.name}>
                <span className="font-medium text-ink">{o.name}</span> <span className="text-muted">· {o.party}</span>
                {o.declaration_date && <span className="text-muted"> · {formatShortDate(o.declaration_date)}</span>}
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-sm">
          Statuts : <em>déclarée</em> = candidature officiellement annoncée ; <em>probable</em> = intention exprimée sans annonce formelle ;{' '}
          <em>hypothèse</em> = personnalité citée ou testée dans les sondages sans intention déclarée.
        </p>
      </Section>

      <Section title="Classement des sources">
        <ul className="space-y-2">
          {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((s) => (
            <li key={s} className="flex flex-wrap items-center gap-2">
              <SourceTypeBadge type={s} />
              <span className="text-sm">{SOURCE_TYPE_LABELS[s].hint}.</span>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          Les sources officielles (programme, livrets, site de campagne ou du parti) sont prioritaires. Un lien vers le document officiel est
          préféré à un article de presse ; pour un PDF, l'ancre <code>#page=N</code> mène au plus près de la mesure.
        </p>
      </Section>

      <Section title="Niveau de précision">
        <ul className="space-y-2">
          {(Object.keys(PRECISION_LABELS) as Precision[]).map((p) => (
            <li key={p} className="flex flex-wrap items-center gap-2">
              <PrecisionBadge precision={p} />
              <span className="text-sm">{PRECISION_LABELS[p].hint}.</span>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          Un coût n'est affiché que s'il est publié, avec la source du chiffrage (candidat ou organisme tiers). Le positionnement sur l'axe
          gauche-droite est indicatif et reprend le classement usuel (lien « source » sur chaque fiche).
        </p>
      </Section>

      <Section title="Points de comparaison">
        <p>
          Pour certains thèmes, le comparateur indique si les candidats sélectionnés ont la même position ou des positions différentes —
          uniquement lorsque la valeur est écrite telle quelle dans la source (« 64 ans », « sortir du commandement intégré de l'OTAN »…).
          Toute interprétation est exclue : sinon, « Pas de position relevée ». La page{' '}
          <Link to="/positions" className="text-accent hover:underline">
            Positions
          </Link>{' '}
          rassemble toutes ces questions pour l'ensemble des candidats.
        </p>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {themes.flatMap((t) =>
            t.indicators.map((d) => (
              <li key={d.key}>
                <span className="text-ink">{d.label}</span> <span className="text-muted">· {t.short}</span>
              </li>
            )),
          )}
        </ul>
      </Section>

      <Section title="Chiffres de contexte et chiffrages">
        <p>
          L'encadré « Où en est-on aujourd'hui ? » donne, pour chaque thème, quelques chiffres de la situation actuelle (dette, chômage, âge
          de départ à la retraite, part du nucléaire…) publiés par des sources officielles ou de référence : Insee, DREES, RTE, ministères,
          Assemblée nationale. Chaque chiffre indique sa source et sa date ; ils sont mis à jour lors des vérifications hebdomadaires.
        </p>
        <p>
          La rubrique « Combien ça coûte ? » de la page Programmes reprend le chiffrage d'ensemble annoncé par chaque candidat (économies,
          recettes, déficit visé), sans le vérifier. Les évaluations d'organismes indépendants y seront ajoutées à leur parution, en citant
          plusieurs organismes de sensibilités différentes.
        </p>
      </Section>

      <Section title="Votes à l'Assemblée">
        <p>
          La page <Link to="/votes" className="text-accent hover:underline">Votes</Link> présente quelques grands textes (retraites,
          immigration, budgets, Constitution, fin de vie) avec le décompte officiel par groupe politique et le vote personnel des candidats
          qui étaient alors députés. Les chiffres sont importés automatiquement des données ouvertes de l'Assemblée nationale
          (data.assemblee-nationale.fr), sans saisie manuelle, et étiquetés « Vote / bilan ». Seuls les scrutins publics de l'Assemblée sont
          couverts : les votes au Sénat ou au Parlement européen n'y figurent pas. Une recherche porte en outre sur tous les textes votés depuis
          2022 (propositions et projets de loi, motions de censure, déclarations du gouvernement), hors amendements.
        </p>
      </Section>

      <Section title="Badge « Nouveau » et glossaire">
        <p>
          Chaque mesure porte sa date d'ajout. Le badge « Nouveau » signale celles ajoutées depuis votre dernière visite (à la première
          visite : celles de la dernière mise à jour). Cette date est conservée uniquement dans votre navigateur.
        </p>
        <p>
          Les {glossary.length} sigles les plus fréquents (ISF, PFU, EPR2, AME…) sont soulignés en pointillé : une définition courte et sourcée
          s'affiche au survol, ou au toucher sur téléphone. Ils sont tous réunis sur la page{' '}
          <Link to="/glossaire" className="text-accent hover:underline">
            Glossaire
          </Link>
          .
        </p>
      </Section>

      <Section title="Mises à jour et liens">
        <p>
          Chaque candidat et chaque mesure portent une date de dernière vérification. Les liens sont testés automatiquement ; un lien cassé
          bascule vers sa copie sur la Wayback Machine (archive.org) quand elle existe, sinon il est signalé « Lien indisponible ».
        </p>
      </Section>

      <Section title="Mises à jour automatiques">
        <p>
          Chaque semaine, une recherche automatisée examine l'actualité et les publications officielles de chaque candidat, avec la même grille
          pour tous. Chaque changement proposé est ensuite contre-vérifié de façon indépendante avant publication : fidélité au texte de la
          source, attribution au candidat lui-même, fiabilité de la source, recoupement (source officielle ou deux médias indépendants pour un
          fait de statut), absence de démenti plus récent. Tout changement non confirmé est écarté. L'application télécharge la dernière version
          au démarrage et conserve une copie pour un usage hors ligne.
        </p>
        <ul className="space-y-3">
          {changelog
            .slice()
            .reverse()
            .map((entry) => (
              <li key={entry.date + entry.summary} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="font-semibold text-ink">
                  {formatDate(entry.date)}
                  <span className="ml-2 font-normal text-muted">
                    {entry.accepted} changement(s) publié(s) · {entry.rejected} écarté(s) faute de confirmation
                  </span>
                </p>
                <p className="mt-1">{entry.summary}</p>
                {entry.changes.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
                    {entry.changes.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium text-ink">{candidateById[c.candidate] ? fullName(candidateById[c.candidate]) : c.candidate}</span> : {c.text}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
        </ul>
      </Section>

      <Section title="Signaler une erreur">
        <p>
          Une mesure mal résumée, une source cassée, une position manquante ? Chaque mesure comporte un lien « Signaler une erreur » qui
          ouvre un formulaire pré-rempli (mesure, candidat, source) sur le dépôt GitHub de l'outil ; un compte GitHub gratuit est nécessaire.
          Les signalements sont traités chaque semaine avec la même contre-vérification que les mises à jour : rien n'est corrigé sans
          source.
        </p>
        <p>
          <a
            href={reportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:text-ink"
          >
            <Flag className="size-4" aria-hidden="true" /> Signaler une erreur
            <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
          </a>
        </p>
      </Section>
    </div>
  )
}
