# Format des données de recherche (à respecter strictement)

Date du jour : 2026-10-15. Toutes les dates au format `YYYY-MM-DD`.

## 1. Fichier candidat : `research/candidates/<id>.json`

```json
{
  "id": "melenchon",
  "first_name": "Jean-Luc",
  "last_name": "Mélenchon",
  "birth_date": "1951-08-19",
  "party": "La France insoumise",
  "party_short": "LFI",
  "position": "gauche_radicale",
  "position_source_url": "https://fr.wikipedia.org/wiki/La_France_insoumise",
  "status": "declare",
  "status_note": "Candidature validée par les instances de LFI le 3 mai 2026.",
  "status_source_url": "https://...",
  "declaration_date": "2026-05-03",
  "photo": {
    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/.../400px-....jpg",
    "commons_page": "https://commons.wikimedia.org/wiki/File:....jpg",
    "author": "Nom de l'auteur",
    "license": "CC BY-SA 4.0"
  },
  "bio_summary": "2 à 4 phrases factuelles et neutres sur le parcours.",
  "current_roles": ["..."],
  "past_roles": ["..."],
  "key_people": [{ "name": "...", "role": "Directeur de campagne" }],
  "slogan": null,
  "slogan_source_url": null,
  "main_axes": ["3 à 5 axes, formulés neutrement, tirés des documents/déclarations du candidat"],
  "main_axes_source_url": "https://...",
  "website": "https://...",
  "news_url": "https://... (page actualités officielle du candidat / du parti)",
  "socials": [{ "platform": "X", "url": "https://x.com/..." }],
  "program": {
    "title": "Intitulé officiel ou null",
    "main_url": "https://... ou null",
    "format": "page_web | pdf | livret | video | aucun",
    "published_date": "YYYY-MM-DD ou null",
    "status": "publie | partiel | en_cours_d_elaboration",
    "note": "Précision factuelle éventuelle (ex. 'Programme du parti mis à jour en 2025, le programme présidentiel 2027 n'est pas encore publié').",
    "thematic_links": [
      { "theme": "energie", "title": "Livret Énergie", "url": "https://...", "format": "pdf", "page_range": "p. 12-18" }
    ],
    "archive_url": "https://web.archive.org/web/2026.../https://... ou null"
  },
  "sources": [{ "label": "Wikipédia – Jean-Luc Mélenchon", "url": "https://..." }],
  "last_verified": "2026-10-15"
}
```

Valeurs autorisées :
- `position` : `extreme_gauche` | `gauche_radicale` | `gauche` | `centre_gauche` | `centre` | `centre_droit` | `droite` | `extreme_droite`.
  Utilise le classement usuellement retenu (infobox Wikipédia du parti, presse de référence) et donne l'URL dans `position_source_url`.
- `status` : `declare` (candidature officiellement annoncée) | `probable` | `hypothese`.
- Ne renseigne PAS de couleur (elle est attribuée ensuite).

## 2. Fichier mesures : `src/data/measures/<id>.json`

Tableau JSON :

```json
[
  {
    "id": "melenchon-energie-01",
    "theme": "energie",
    "title": "Titre court (max ~80 caractères)",
    "description": "1 à 3 phrases, reformulées avec tes mots, ton neutre.",
    "source_type": "officiel | declaration | vote_ou_bilan | analyse_tierce",
    "source_title": "Nom du document ou de l'article",
    "source_url": "https://...pdf#page=42",
    "source_date": "2026-03-01",
    "source_page": "p. 42",
    "precision": "chiffre | precis | orientation_generale",
    "cost": { "label": "≈ 10 Md€ par an", "source_label": "Chiffrage du candidat", "source_url": "https://..." },
    "indicator": { "key": "nucleaire", "value": "relance" },
    "last_verified": "2026-10-15"
  }
]
```

- `cost` et `indicator` : optionnels (omets-les ou `null` si inconnus). `source_page` : `null` si inconnu.
- `precision` : `chiffre` = contient une valeur chiffrée (montant, âge, nombre…) ; `precis` = mesure concrète et identifiable sans chiffre ; `orientation_generale` = intention/principe.
- `source_type` :
  - `officiel` : programme, livret, site de campagne, site du parti, document officiel du candidat ;
  - `declaration` : interview, discours, tribune, post officiel du candidat ;
  - `vote_ou_bilan` : proposition de loi déposée, vote au Parlement, bilan de gestion ;
  - `analyse_tierce` : fact-checking, chiffrage par un institut (Montaigne, IPP, OFCE…), Décodeurs, AFP Factuel…
  Pour une interview citée par un média, `source_type` = `declaration` et `source_url` = l'article qui la rapporte.

### Thèmes (identifiants obligatoires)
`economie` (Économie et pouvoir d'achat) · `fiscalite` · `emploi` (Emploi et travail) · `retraites` · `energie` · `ecologie` (Écologie et climat) · `agriculture` · `logement` · `sante` · `education` · `securite` (Sécurité et justice) · `immigration` (Immigration et asile) · `institutions` (Institutions et démocratie) · `europe` · `international` (International et défense) · `numerique` (Numérique et IA) · `culture` (Culture et médias) · `outre_mer` · `services_publics` (Services publics et territoires) · `famille` (Famille et société)

### Indicateurs comparables (champ `indicator`, uniquement si la source l'énonce explicitement)
- `retraites` → `{ "key": "age_legal", "value": 62 }` (nombre : âge légal de départ proposé)
- `energie` → `{ "key": "nucleaire", "value": "relance" | "maintien" | "sortie" }`
- `economie` → `{ "key": "smic_net", "value": 1600 }` (nombre : SMIC net mensuel proposé en €)
- `fiscalite` → `{ "key": "isf", "value": "retablissement" | "pas_de_retablissement" }`
- `institutions` → `{ "key": "proportionnelle", "value": "integrale" | "partielle" | "contre" }`
- `immigration` → `{ "key": "referendum_immigration", "value": "oui" | "non" }`
- `europe` → `{ "key": "rapport_ue", "value": "approfondissement" | "reforme" | "souverainete_nationale" | "sortie" }`
Une seule mesure par candidat porte un indicateur donné.

## 3. Règles impératives
1. **Aucune URL inventée.** Chaque URL enregistrée doit avoir été ouverte avec WebFetch (ou `curl -sIL` via Bash si WebFetch échoue) et son contenu confirmé. En cas de doute → champ `null`.
2. **Pas de source = pas de mesure.** Ne déduis jamais une position. Si rien n'est trouvé pour un thème, n'écris rien pour ce thème.
3. Priorité aux sources officielles (site de campagne, programme, livrets du parti). Une source presse n'est acceptable que comme `declaration` (propos rapportés du candidat) ou `analyse_tierce`.
4. Positions récentes : privilégie les sources depuis 2025. Un programme de parti antérieur n'est utilisable que s'il est présenté par le parti comme son programme actuel, et la date doit être indiquée.
5. Neutralité stricte : aucun adjectif valorisant/dévalorisant, aucun jugement. Reformule ; citation courte (< 15 mots) seulement si nécessaire.
6. Pour un PDF : ajoute `#page=N` à l'URL quand tu connais la page (tu peux télécharger le PDF dans ton dossier scratchpad avec curl et l'extraire avec `pdftotext` / Python si disponibles), et renseigne `source_page`.
7. Archive : pour `program.archive_url`, vérifie l'existence d'une capture via `https://archive.org/wayback/available?url=<url>` et n'enregistre que l'URL renvoyée.
8. Photo : uniquement Wikimedia Commons, avec licence et auteur relevés sur la page du fichier. Sinon `null`.
9. JSON valide, encodage UTF-8.
