# Présidentielle 2027 – Comparateur de programmes

Outil **indépendant et non officiel** pour consulter les candidats à l'élection présidentielle française de 2027 et comparer leurs mesures par thème, avec un lien direct vers les documents officiels. Application 100 % statique : aucune base de données, aucun backend.

## Installation et lancement

```bash
npm install
npm run dev            # http://127.0.0.1:5173
npm run build          # valide les données, vérifie les types puis construit dans dist/
npm run preview        # sert le build
npm run validate-data  # contrôle d'intégrité des données (Zod)
npm run check-links    # teste toutes les URLs → link-report.md + src/data/link-status.json
npm run merge-research # fusionne research/candidates/*.json dans src/data/candidates.json
```

### Application Windows (Electron)

```bash
npm run app        # construit puis ouvre l'application de bureau
npm run dist:win   # génère release/Presidentielle-2027-Setup-x.y.z.exe (installeur) et release/Presidentielle-2027-Portable-x.y.z.exe
```

L'application fonctionne hors ligne (données et polices embarquées) ; seules les photos (Wikimedia) et les liens vers les programmes nécessitent Internet — ceux-ci s'ouvrent dans le navigateur par défaut. Le runtime Electron est lu depuis `node_modules/.electron-dist` (extraction locale du zip Electron, pour contourner un verrouillage antivirus lors du packaging) : en cas d'absence, extraire `electron-v<version>-win32-x64.zip` du cache `%LOCALAPPDATA%\electron\Cache` dans ce dossier, ou retirer `build.electronDist` du `package.json`. Les exécutables ne sont pas signés : Windows SmartScreen peut demander « Informations complémentaires → Exécuter quand même ».

Le routage utilise des URLs « propres » (`/candidats/attal`, `/comparateur?theme=energie&c=attal,philippe`). En hébergement statique, configurez une réécriture de toutes les routes vers `index.html` (ex. `_redirects` Netlify : `/* /index.html 200`).

## Pages

| Route | Contenu |
|---|---|
| `/` | Cartes candidats, filtres (famille, statut), tri, recherche globale (candidats et mesures) |
| `/candidats/:id` | Fiche complète, bloc « Programme officiel », mesures par thème (accordéons), filtres |
| `/comparateur?theme=…&c=a,b&vue=tableau` | Comparateur par thème (2 à 4 candidats), vues colonnes/tableau, indicateurs de convergence, partage, export image/PDF |
| `/themes` | Matrice thèmes × candidats, détail au clic |
| `/programmes` | Tableau récapitulatif des programmes |
| `/methodologie` | Sources, classement, critères d'inclusion, signalement d'erreur |

## Données (`src/data/`)

```
src/data/
  schema.ts          # schémas Zod + types TypeScript (source de vérité)
  candidates.json    # fiches candidats (généré par merge-research)
  themes.json        # 20 thèmes + indicateurs comparables
  measures/<id>.json # mesures d'un candidat
  meta.json          # date de mise à jour, règle d'inclusion, autres candidatures
  link-status.json   # généré par check-links
research/
  SCHEMA.md          # format détaillé et règles de collecte
  candidates/<id>.json
```

### Candidat (extrait)

| Champ | Description |
|---|---|
| `id`, `first_name`, `last_name`, `birth_date` | Identité (l'âge est calculé) |
| `party`, `party_short`, `position`, `position_source_url` | Parti et positionnement indicatif (`extreme_gauche` … `extreme_droite`) |
| `color` | Couleur de repère (définie dans `scripts/merge-research.ts`) |
| `status` (`declare`/`probable`/`hypothese`), `status_note`, `declaration_date` | Statut de candidature |
| `photo` | Wikimedia Commons uniquement (URL, page, auteur, licence) ou `null` → avatar à initiales |
| `bio_summary`, `current_roles`, `past_roles`, `key_people`, `slogan`, `main_axes` | Portrait (slogan et axes sourcés) |
| `website`, `news_url`, `socials` | Liens officiels |
| `program` | `title`, `main_url`, `format`, `published_date`, `status`, `note`, `thematic_links[]`, `archive_url` |
| `sources`, `last_verified` | Sources de la fiche et date de vérification |

### Mesure

| Champ | Description |
|---|---|
| `id`, `theme`, `title`, `description` | Mesure reformulée (1 à 3 phrases) |
| `source_type` | `officiel` · `declaration` · `vote_ou_bilan` · `analyse_tierce` |
| `source_title`, `source_url`, `source_date`, `source_page` | Source (ancre `#page=N` pour les PDF) |
| `precision` | `chiffre` · `precis` · `orientation_generale` |
| `cost` | `{ label, source_label, source_url }` si un chiffrage est publié |
| `indicator` | `{ key, value }` pour les points de comparaison (ex. `age_legal`, `nucleaire`) |
| `last_verified` | Date de vérification |

## Mettre à jour les données

**Ajouter ou mettre à jour un candidat**
1. Créez/éditez `research/candidates/<id>.json` (format dans `research/SCHEMA.md`).
2. Ajoutez sa couleur dans `COLORS` (`scripts/merge-research.ts`).
3. `npm run merge-research && npm run validate-data`.

**Mettre à jour un programme** : modifiez le bloc `program` (URL principale, `published_date`, `status: "publie"`, livrets dans `thematic_links`), puis vérifiez une capture sur `https://archive.org/wayback/available?url=<url>` pour `archive_url`.

**Ajouter une mesure** : ajoutez un objet dans `src/data/measures/<id>.json` avec une URL ouverte et vérifiée, la date de la source et `last_verified`. Pas de source = pas de mesure.

Puis : `npm run check-links` (met à jour `link-status.json` : un lien cassé bascule automatiquement sur son archive ou affiche « Lien indisponible »), mettez à jour `last_updated` dans `meta.json`, et `npm run build`.

## Principes éditoriaux

Neutralité stricte (même structure et même ton pour tous, aucun classement ni recommandation), factualité (chaque mesure sourcée, aucune position déduite : « Pas de position publiée à ce jour »), transparence (programme officiel distingué des autres sources), équité (les vides ne sont pas comblés).

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · React Router · Zustand · Zod · html-to-image · lucide-react.
