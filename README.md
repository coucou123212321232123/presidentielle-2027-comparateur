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
npm run fetch-votes    # importe les scrutins de l'Assemblée (open data) → src/data/votes.json
npm run og-images      # régénère les vignettes de partage public/og/*.png (police Inter installée)
```

### Version web et téléphone (GitHub Pages)

Site publié : https://coucou123212321232123.github.io/presidentielle-2027-comparateur/

Le workflow `.github/workflows/pages.yml` reconstruit et publie le site à chaque push sur `main` (dont les mises à jour hebdomadaires des données), via `npm run build:pages`. Celui-ci génère aussi, pour chaque adresse partageable (fiches candidats, votes, `/partage/<thème>/` et `/partage/<thème>/<a>/<b>/` pour chaque paire de candidats), une page avec titre, description et vignette (Open Graph) : un lien partagé sur WhatsApp ou un réseau social affiche un aperçu. La version web n'embarque que le résumé des mesures : le détail est chargé candidat par candidat, à la demande. L'application est installable sur téléphone (manifeste + service worker `public/sw.js`) : iPhone → Safari → Partager → « Sur l'écran d'accueil » ; Android → Chrome → ⋮ → « Installer l'application ». Elle fonctionne hors ligne après une première visite.

### Application Windows (Electron)

**Télécharger** : https://github.com/coucou123212321232123/presidentielle-2027-comparateur/releases/latest (`Presidentielle-2027-Setup-….exe` à installer, ou `…-Portable-….exe` sans installation).

Le workflow `.github/workflows/desktop.yml` construit l'application sur un serveur Windows de GitHub et la publie comme « release » à chaque mise à jour du code sur `main` (version `1.1.<numéro>`). Au démarrage, l'application vérifie s'il existe une version plus récente et propose de l'installer : plus besoin de reconstruire l'exécutable à la main. Les données, elles, sont mises à jour au démarrage sans réinstallation.

Construction locale (facultative) :

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
| `/votes?q=…&type=…&candidat=…` | Votes à l'Assemblée : grands textes commentés et recherche dans tous les textes votés depuis 2022 (propositions et projets de loi, motions de censure, déclarations) |
| `/votes/:id` | Détail d'un vote : résultat, hémicycle député par député, vote des candidats alors députés, vote par groupe |
| `/partage/:theme/:a?/:b?` | Lien de partage d'une comparaison (aperçu soigné), redirige vers le comparateur |
| `/methodologie` | Sources, classement, critères d'inclusion, signalement d'erreur |

## Données (`src/data/`)

```
src/data/
  schema.ts          # schémas Zod + types TypeScript (source de vérité)
  candidates.json    # fiches candidats (généré par merge-research)
  themes.json        # 20 thèmes + indicateurs comparables
  measures/<id>.json # mesures d'un candidat
  meta.json          # date de mise à jour, règle d'inclusion, autres candidatures
  glossary.json      # sigles expliqués au survol (définition + source officielle)
  votes.json         # grands textes commentés de l'Assemblée (généré par fetch-votes)
  votes-index.json   # tous les textes votés depuis 2022, pour la recherche (généré par fetch-votes)
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
| `indicator` | `{ key, value }` (ou une liste) pour les points de comparaison (ex. `age_legal`, `nucleaire`, `otan`) |
| `last_verified` | Date de vérification |
| `added` | Date d'ajout à l'outil (badge « Nouveau ») |

## Mettre à jour les données

**Ajouter ou mettre à jour un candidat**
1. Créez/éditez `research/candidates/<id>.json` (format dans `research/SCHEMA.md`).
2. Ajoutez sa couleur dans `COLORS` (`scripts/merge-research.ts`).
3. `npm run merge-research && npm run validate-data`.

**Mettre à jour un programme** : modifiez le bloc `program` (URL principale, `published_date`, `status: "publie"`, livrets dans `thematic_links`), puis vérifiez une capture sur `https://archive.org/wayback/available?url=<url>` pour `archive_url`.

**Ajouter une mesure** : ajoutez un objet dans `src/data/measures/<id>.json` avec une URL ouverte et vérifiée, la date de la source, `last_verified` et `added` (date du jour). Pas de source = pas de mesure.

**Signalements** : le bouton « Signaler une erreur » de chaque mesure ouvre un formulaire GitHub pré-rempli (`.github/ISSUE_TEMPLATE/signalement.yml`, label `signalement`), traité par la routine hebdomadaire (`research/UPDATE_PROCEDURE.md`, étape 0).

Puis : `npm run check-links` (met à jour `link-status.json` : un lien cassé bascule automatiquement sur son archive ou affiche « Lien indisponible »), mettez à jour `last_updated` dans `meta.json`, et `npm run build`.

## Principes éditoriaux

Neutralité stricte (même structure et même ton pour tous, aucun classement ni recommandation), factualité (chaque mesure sourcée, aucune position déduite : « Pas de position publiée à ce jour »), transparence (programme officiel distingué des autres sources), équité (les vides ne sont pas comblés).

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · React Router · Zustand · Zod · html-to-image · lucide-react · fflate et resvg (scripts).
