# Phase 2: Recipe Data Pipeline - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Un pipeline local fonctionnel scrape les recettes Jow, les enrichit en macros via Claude CLI, et les uploade au serveur via API. Le pipeline est concu pour etre source-agnostic (Jow est la premiere source, d'autres pourront etre ajoutees via l'adapter pattern RecipeSource deja en place). Le catalogue frontend et la consultation de recettes sont hors scope (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Scraping strategy
- Scraper tout le catalogue Jow disponible (pas de limite arbitraire)
- Rate limiting poli : 1-2 secondes de delai entre les requetes
- Extraire toutes les donnees disponibles sur Jow (titre, ingredients, portions, temps, photo, URL, instructions, tips, ratings, categories, tags, difficulte, etc.)
- La methode de scraping (Playwright vs HTTP/API) reste a determiner par le researcher — l'utilisateur n'a pas explore la structure de Jow

### Macro enrichment
- Appel Claude CLI avec un prompt dedie et une recette en input (pas un skill Claude Code, un script qui appelle `claude` en CLI)
- Sortie structuree JSON validee avec Zod (schema strict pour les macros par ingredient)
- Cross-validation : Claude estime les macros, puis comparaison avec les donnees Jow si disponibles — divergence significative = flag pour review
- Bornes de coherence : si les macros semblent aberrantes, auto-retry une fois avec indication que le resultat semble incorrect, puis flag si toujours hors bornes
- Macros par ingredient pour 100g : proteines, glucides, lipides

### Upload & dedup logic
- Auth simple : bearer token en variable d'environnement (shared secret) — seul le pipeline local appelle l'API
- Cle de deduplication : Claude's discretion pour determiner l'identifiant unique le plus fiable depuis les donnees Jow (URL ou ID interne)
- Re-run : skip l'enrichissement si la recette a deja des macros en base (economie d'appels Claude)
- Upsert idempotent cote serveur (pas de doublons)
- Reponse API minimale : HTTP 200/201 avec recipe ID uniquement

### Pipeline orchestration
- Commandes separees pour chaque etape (scrape, enrich, upload) — executables independamment
- Le pipeline doit rester source-agnostic : les etapes travaillent sur un format intermediaire commun, Jow est juste la premiere implementation du RecipeSource
- Resumabilite : si l'enrichissement echoue apres N recettes, le prochain run reprend la ou il s'est arrete (skip des recettes deja enrichies)
- Reporting : log file detaille + summary console a chaque etape (compteurs succes/skip/fail)

### Claude's Discretion
- Format de stockage local entre les etapes (JSON files vs JSONL vs autre)
- Choix de l'identifiant unique pour la deduplication (URL Jow ou ID interne)
- Methode de scraping (sera determine par le researcher apres inspection de Jow)

</decisions>

<specifics>
## Specific Ideas

- L'adapter pattern RecipeSource existe deja (Phase 1) — le pipeline doit s'appuyer dessus pour rester extensible a d'autres sources futures
- Claude CLI appele comme processus externe avec un prompt et un JSON en input, pas comme skill integre
- Le pipeline est un outil local de dev/ops, pas un service expose aux utilisateurs

</specifics>

<deferred>
## Deferred Ideas

- Ajout d'autres sources de recettes au-dela de Jow — futur pipeline (meme pattern, nouvelle implementation RecipeSource)
- Automatisation des migrations DB — note dans STATE.md, a traiter quand les changements de schema deviennent frequents

</deferred>

---

*Phase: 02-recipe-data-pipeline*
*Context gathered: 2026-02-08*
