# Procédure de mise à jour automatique (hebdomadaire)

Cette procédure est suivie à la lettre par la tâche planifiée. Les données publiées doivent rester **neutres, sourcées et vérifiées** : en cas de doute, on ne publie pas.
Le format des données est défini dans `research/SCHEMA.md` (règles impératives incluses).

## Étape 1 — Collecte (un agent par candidat, même grille pour tous)

Pour **chaque** candidat de `src/data/candidates.json`, avec les mêmes requêtes et le même effort :
1. Ouvrir son site de campagne / de parti (`website`, `news_url`, `program.main_url`, `program.thematic_links`) : nouveau programme, nouveau livret, page modifiée ?
2. Rechercher l'actualité depuis `meta.last_updated` : déclaration ou retrait de candidature, investiture, nouveau programme, nouvelles propositions, changement d'équipe.
3. Rechercher toute personnalité nouvellement déclarée et testée dans les sondages nationaux (critère de `meta.inclusion_rule`).

Chaque changement proposé est écrit dans `research/pending/<AAAA-MM-JJ>.json` :
```json
{ "candidate": "attal", "kind": "add_measure | update_measure | remove_measure | update_candidate | update_program | new_candidate",
  "data": { ... objet au format SCHEMA.md ... },
  "evidence": [{ "url": "https://...", "excerpt": "extrait < 15 mots prouvant l'affirmation" }],
  "reason": "pourquoi ce changement" }
```

## Étape 2 — Contre-vérification indépendante (obligatoire)

Un **second agent**, qui ne reçoit que le fichier `pending` (pas le raisonnement de la collecte), rouvre chaque source et applique la grille ci-dessous. Un changement n'est **accepté que si tous les critères sont remplis** ; sinon il est rejeté avec son motif.

| # | Critère | Règle |
|---|---|---|
| 1 | **Fidélité** | Le titre et la description disent exactement ce que dit la source : mêmes chiffres, mêmes conditions et exceptions (ex. « 62 ans *pour les carrières longues* »), même temps (proposé / envisagé / au conditionnel). |
| 2 | **Attribution** | La position est celle du candidat lui-même. Une proposition d'un allié, d'un porte-parole ou du parti n'est retenue que si elle figure dans un document officiel de la campagne, et le `source_title` le mentionne. |
| 3 | **Type de source** | `source_type` correspond réellement : programme/livret/site officiel → `officiel` ; propos rapportés → `declaration` ; etc. |
| 4 | **Fiabilité** | Source officielle, ou média / institution identifiable. Interdits : agrégateurs et sites de pronostics (voir liste ci-dessous), sites d'opinion comme source de faits, réseaux sociaux non officiels. |
| 5 | **Recoupement** | Les faits de statut (candidature, retrait, investiture, date) exigent **une source officielle ou deux médias indépendants**. Une mesure issue d'une déclaration rapportée exige la source primaire (vidéo/transcription officielle) **ou** deux médias indépendants concordants. |
| 6 | **Indicateurs** | Un `indicator` n'est accepté que si la valeur est **littéralement** énoncée (ex. « 64 ans », « nouveaux réacteurs »). Toute interprétation → pas d'indicateur. |
| 7 | **Fraîcheur et contradiction** | Rechercher une source plus récente qui dément, corrige ou nuance. Si contradiction non résolue → rejet, et la mesure existante reste inchangée. |
| 8 | **Neutralité** | Aucun adjectif évaluatif ajouté ; reformulation propre ; citation < 15 mots. |
| 9 | **URL** | L'URL est ouverte et confirmée (WebFetch ou `curl -sIL`), avec `#page=N` pour un PDF quand la page est connue. Jamais d'URL reconstruite. |
| 10 | **Suppression** | Une mesure n'est retirée que si le candidat l'a explicitement abandonnée ou si un nouveau programme officiel la remplace (source à l'appui). Un lien mort seul ne justifie pas une suppression (bascule sur l'archive). |

Sources interdites (non fiables ou non primaires) : `elyseescope.com`, `votons-2027.fr`, `repere2027.fr`, `programmescandidats.fr`, `monvote2027.fr`, `france-vote.fr`, `candidats2027.org`, `electionpresidentielle2027.com`, `sondages-presidentielle2027.fr`, `parlons-politique.fr`, `putsch.media`, `bvoltaire.fr`, `marinelepen.fr` (domaine non officiel).

## Étape 3 — Contrôle d'équité

- Vérifier que **chaque candidat** a bien été traité à l'étape 1 (journal par candidat, même si « aucun changement »).
- Si un candidat reçoit beaucoup plus d'ajouts qu'un autre, s'assurer que cela reflète une publication réelle (ex. nouveau programme) et non une différence d'effort de recherche.

## Étape 4 — Application et publication

1. Appliquer les seuls changements acceptés (fiches dans `research/candidates/`, mesures dans `src/data/measures/`), avec `last_verified` = date du jour.
2. Mettre à jour `meta.last_updated` et ajouter une entrée dans `src/data/changelog.json` (date, résumé neutre par candidat, nombre de changements acceptés / rejetés).
3. Lancer, et **ne publier que si tout passe** :
   ```bash
   npm run merge-research
   npm run validate-data
   npm run check-links
   npm run export-data
   ```
4. Commit et push sur la branche `main` (message : `Données : mise à jour du <date>`). L'application télécharge `public-data/data.json` au démarrage.
5. Archiver le fichier `pending` dans `research/pending/done/` avec les décisions (acceptée / rejetée + motif), pour audit.

Si une étape échoue (validation, build, push), **rien n'est publié** et le rapport de la tâche indique pourquoi.
