import type { ReactNode } from 'react'
import { candidateById, candidates, changelog, meta, totalMeasures } from '../data'
import { PrecisionBadge, SourceTypeBadge } from '../components/Badges'
import { ExternalLink } from '../components/ExternalLink'
import { Card, PageHeader } from '../components/ui'
import { PRECISION_LABELS, SOURCE_TYPE_LABELS } from '../lib/labels'
import type { Precision, SourceType } from '../data/schema'
import { formatDate, formatShortDate, fullName } from '../lib/format'

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
          Pour certains thèmes (âge de départ à la retraite, nucléaire, SMIC, ISF, proportionnelle, référendum sur l'immigration, rapport à
          l'Union européenne), le comparateur indique si les candidats sélectionnés ont la même position ou des positions différentes —
          uniquement lorsque cette position est explicitement énoncée dans une source.
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
          Une mesure mal résumée, une source cassée, une position manquante ? Les données sont de simples fichiers JSON dans{' '}
          <code>src/data/</code> : signalez l'erreur au mainteneur de l'outil en indiquant le candidat, la mesure (identifiant affiché dans
          l'URL ou le titre) et la source correcte. Toute correction est vérifiée sur le document officiel avant publication.
        </p>
      </Section>
    </div>
  )
}
