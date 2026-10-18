import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { glossary } from "../data";
import { ExternalLink } from "../components/ExternalLink";
import { cx, EmptyState, PageHeader } from "../components/ui";
import { normalize, plural } from "../lib/format";

const letterOf = (term: string) => {
  const l = normalize(term).charAt(0).toUpperCase();
  return /[A-Z]/.test(l) ? l : "#";
};

const sorted = glossary
  .slice()
  .sort((a, b) => normalize(a.term).localeCompare(normalize(b.term), "fr"));

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const { hash } = useLocation();
  const target = decodeURIComponent(hash.slice(1));

  // Lien direct vers un terme (/glossaire#isf, depuis la bulle d'explication) : on l'amène à l'écran.
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

  return (
    <div>
      <PageHeader eyebrow="Glossaire" title="Les sigles et termes expliqués">
        Les {glossary.length} sigles et termes techniques les plus fréquents
        dans les programmes et les textes votés, avec une définition courte et
        sa source officielle. Dans le reste du site, ils sont soulignés en
        pointillé : survolez-les ou touchez-les pour voir leur définition.
      </PageHeader>

      <label className="relative mb-4 block max-w-xl">
        <span className="sr-only">Rechercher un sigle ou un terme</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un sigle ou un terme (ex. « ISF », « retraite »)…"
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-4 text-base text-ink shadow-soft placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      {!query && (
        <nav
          aria-label="Accès par lettre"
          className="mb-8 flex flex-wrap gap-1"
        >
          {groups.map(([l]) => (
            <a
              key={l}
              href={`#lettre-${l}`}
              className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-sm font-semibold text-ink-2 hover:text-ink"
            >
              {l}
            </a>
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
                        <span className="font-semibold text-ink">{g.term}</span>
                        {normalize(g.expansion) !== normalize(g.term) && (
                          <span className="text-muted"> · {g.expansion}</span>
                        )}
                      </dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">
                        <p>{g.definition}</p>
                        {g.aliases.length > 0 && (
                          <p className="mt-1.5 text-xs text-muted">
                            Aussi appelé : {g.aliases.join(", ")}
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
