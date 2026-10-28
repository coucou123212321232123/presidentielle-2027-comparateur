import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { allCandidateIds, candidates, glossary, useMeasures } from "../data";
import type { Candidate, GlossaryEntry, Measure } from "../data/schema";
import { CandidateAvatar } from "../components/CandidateAvatar";
import { ExternalLink } from "../components/ExternalLink";
import { Card, cx, EmptyState, PageHeader, Skeleton } from "../components/ui";
import { glossaryMatcher, shownAliases } from "../lib/glossaryMatch";
import { fullName, normalize, plural } from "../lib/format";

const letterOf = (term: string) => {
  const l = normalize(term).charAt(0).toUpperCase();
  return /[A-Z]/.test(l) ? l : "#";
};

const sorted = glossary
  .slice()
  .sort((a, b) => normalize(a.term).localeCompare(normalize(b.term), "fr"));

const { termsIn } = glossaryMatcher(glossary);

type Citations = Record<string, { candidate: Candidate; measures: Measure[] }[]>;

/** Pour chaque terme, les candidats dont une mesure le cite (titre ou description), avec ces mesures. */
function useCitations(): Citations | null {
  const all = useMeasures(allCandidateIds);
  return useMemo(() => {
    if (!all) return null;
    const out: Citations = {};
    for (const c of candidates) {
      const byTerm = new Map<string, Measure[]>();
      for (const m of all[c.id] ?? [])
        for (const id of termsIn(`${m.title} ${m.description}`))
          byTerm.set(id, [...(byTerm.get(id) ?? []), m]);
      for (const [id, measures] of byTerm)
        (out[id] ??= []).push({ candidate: c, measures });
    }
    return out;
  }, [all]);
}

function CitedBy({ entry, citations }: { entry: GlossaryEntry; citations: Citations | null }) {
  const list = citations?.[entry.id];
  if (!list?.length) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      Cité dans les mesures de {list.map((x) => x.candidate.last_name).join(", ")} ·{" "}
      <Link to={`/glossaire/${entry.id}`} className="font-medium text-accent hover:underline">
        voir les mesures
      </Link>
    </p>
  );
}

/** Un terme (/glossaire/taxe-zucman/, pages indexées) : sa définition et les mesures des candidats qui le citent. */
function EntryPage({ entry, citations }: { entry: GlossaryEntry; citations: Citations | null }) {
  const list = citations?.[entry.id] ?? [];
  return (
    <div>
      <Link to="/glossaire" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tout le glossaire
      </Link>
      <PageHeader eyebrow="Glossaire" title={`${entry.term} : de quoi parle-t-on ?`}>
        {entry.expansion}
      </PageHeader>
      <Card className="max-w-3xl p-5">
        <p className="leading-relaxed text-ink-2">{entry.definition}</p>
        {shownAliases(entry).length > 0 && <p className="mt-2 text-sm text-muted">Aussi appelé : {shownAliases(entry).join(", ")}</p>}
        <p className="mt-3 text-sm">
          Source :{" "}
          <ExternalLink href={entry.source_url} className="text-accent hover:underline">
            {entry.source_label}
          </ExternalLink>
        </p>
      </Card>

      <section aria-labelledby="candidats" className="mt-10">
        <h2 id="candidats" className="mb-3 font-display text-xl font-semibold text-ink">
          Les candidats qui en parlent
        </h2>
        {!citations ? (
          <Skeleton className="h-40" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">Aucune mesure relevée ne cite ce terme à ce jour.</p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {list.map(({ candidate: c, measures }) => (
              <li key={c.id}>
                <Card className="h-full p-4 sm:p-5" style={{ borderTop: `4px solid ${c.color}` }}>
                  <Link to={`/candidats/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                    <CandidateAvatar candidate={c} size="sm" decorative />
                    <span className="font-semibold text-ink">{fullName(c)}</span>
                    <span className="text-xs text-muted">{c.party_short}</span>
                  </Link>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {measures.map((m) => (
                      <li key={m.id} className="leading-snug">
                        <Link to={`/candidats/${c.id}/${m.theme}?mesure=${m.id}`} className="text-ink-2 hover:text-ink hover:underline">
                          {m.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          Les mesures sont reprises telles que les candidats les présentent ; la définition ci-dessus décrit la situation actuelle, sans
          juger les propositions.
        </p>
      </section>
    </div>
  );
}

export default function GlossaryPage() {
  const { term } = useParams();
  const [query, setQuery] = useState("");
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));
  const citations = useCitations();

  // Lien direct vers un terme (/glossaire#isf, anciens liens) : on l'amène à l'écran.
  useEffect(() => {
    if (!target) return;
    document.getElementById(target)?.scrollIntoView({ block: "center" });
  }, [target]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return sorted;
    return sorted.filter((g) =>
      normalize(
        [g.term, g.expansion, ...g.aliases, g.definition].join(" "),
      ).includes(q),
    );
  }, [query]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof sorted>();
    for (const g of results) {
      const l = letterOf(g.term);
      m.set(l, [...(m.get(l) ?? []), g]);
    }
    return [...m];
  }, [results]);

  const entry = glossary.find((g) => g.id === term);
  if (entry) return <EntryPage entry={entry} citations={citations} />;

  return (
    <div>
      <PageHeader eyebrow="Glossaire" title="Les sigles et notions expliqués">
        Les {glossary.length} sigles et notions les plus fréquents dans les
        programmes et les textes votés (ISF, taxe Zucman, 49.3, droit du sol…),
        avec une définition courte et sa source officielle, et les candidats
        qui en parlent. Dans le reste du site, ils sont soulignés en
        pointillé : survolez-les ou touchez-les pour voir leur définition.
      </PageHeader>

      <label className="relative mb-4 block max-w-xl">
        <span className="sr-only">Rechercher un sigle ou une notion</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un sigle ou une notion (ex. « ISF », « retraite »)…"
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-4 text-base text-ink shadow-soft placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      {!query && (
        <nav
          aria-label="Accès par lettre"
          className="mb-8 flex flex-wrap gap-1"
        >
          {groups.map(([l]) => (
            // Bouton et non lien « #lettre-A » : dans l'application de bureau, l'ancre remplacerait l'adresse de la page (#/glossaire).
            <button
              key={l}
              type="button"
              onClick={() => document.getElementById(`lettre-${l}`)?.scrollIntoView({ behavior: 'smooth' })}
              aria-label={`Aller à la lettre ${l}`}
              className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-sm font-semibold text-ink-2 hover:text-ink"
            >
              {l}
            </button>
          ))}
        </nav>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={<Search className="size-8" />}
          title="Aucun terme ne correspond"
        >
          Essayez un autre mot, ou le sigle sans points (ex. « SMIC »).
        </EmptyState>
      ) : (
        <div aria-live="polite">
          {query && (
            <p className="mb-4 text-sm text-muted">
              {plural(results.length, "terme trouvé", "termes trouvés")}
            </p>
          )}
          <div className="space-y-8">
            {groups.map(([letter, entries]) => (
              <section
                key={letter}
                id={`lettre-${letter}`}
                aria-labelledby={`titre-${letter}`}
                className="scroll-mt-24"
              >
                <h2
                  id={`titre-${letter}`}
                  className="mb-3 font-display text-2xl font-semibold text-ink"
                >
                  {letter}
                </h2>
                <dl className="grid gap-3 md:grid-cols-2">
                  {entries.map((g) => (
                    <div
                      key={g.id}
                      id={g.id}
                      className={cx(
                        "scroll-mt-24 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5",
                        target === g.id && "ring-2 ring-accent",
                      )}
                    >
                      <dt>
                        <Link to={`/glossaire/${g.id}`} className="font-semibold text-ink hover:underline">
                          {g.term}
                        </Link>
                        {normalize(g.expansion) !== normalize(g.term) && (
                          <span className="text-muted"> · {g.expansion}</span>
                        )}
                      </dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">
                        <p>{g.definition}</p>
                        {shownAliases(g).length > 0 && (
                          <p className="mt-1.5 text-xs text-muted">
                            Aussi appelé : {shownAliases(g).join(", ")}
                          </p>
                        )}
                        <p className="mt-2 text-xs">
                          <ExternalLink
                            href={g.source_url}
                            className="text-accent hover:underline"
                          >
                            {g.source_label}
                          </ExternalLink>
                        </p>
                        <CitedBy entry={g} citations={citations} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
