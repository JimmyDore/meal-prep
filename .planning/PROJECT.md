# Meal Prep

## What This Is

Un outil intelligent de meal prep qui scrape les recettes de Jow, les enrichit en macronutriments (protéines, glucides, lipides), et recommande automatiquement un plan de repas hebdomadaire adapté au profil sportif et aux objectifs nutritionnels de l'utilisateur. Web app avec ambition SaaS multi-utilisateurs.

## Core Value

L'utilisateur obtient un plan de repas hebdomadaire optimisé pour ses macros sans avoir à choisir les recettes lui-même — le bottleneck du choix est éliminé.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Scraper les recettes Jow (titre, ingrédients, portions, temps, photo) avec détection des doublons
- [ ] Enrichir chaque recette avec ses macronutriments (protéines, glucides, lipides) via un skill Claude Code manuel
- [ ] Uploader les recettes enrichies vers le serveur via API
- [ ] Stocker les recettes dans une base Postgres sur le serveur
- [ ] Profil utilisateur configurable (poids, taille, objectif, préférences alimentaires)
- [ ] Saisie des séances de sport prévues dans la semaine
- [ ] Calcul d'un target macro hebdomadaire global basé sur le profil et l'activité sportive
- [ ] Algorithme de sélection de recettes qui optimise l'atteinte des targets macros
- [ ] Support du batch cooking (x2, x3) avec calcul réel des portions via les macros
- [ ] Génération d'un plan de repas hebdo (midi + soir) avec détail des macros par portion
- [ ] Interface web avec authentification pour multi-utilisateurs
- [ ] Lien vers les recettes Jow pour faciliter la commande manuelle

### Out of Scope

- Automatisation de la commande sur Jow/Leclerc Drive — complexité trop élevée, pas le core value
- Application mobile — web-first, mobile plus tard
- Adaptation jour par jour selon le sport — target hebdo global suffit pour le v1
- Calcul de calories détaillé — focus sur les macros (protéines, glucides, lipides)

## Context

- L'utilisateur utilise Jow pour commander ses courses sur Leclerc Drive. Le process de commande est satisfaisant, le bottleneck est le choix des recettes.
- Le scraping se fait en local (machine dev). L'enrichissement macros est fait manuellement via un skill Claude Code (le plan Claude Code Max est disponible).
- Les recettes enrichies sont uploadées au serveur via l'API de la web app.
- Le problème des portions Jow : les multiplicateurs (x2, x3) ne sont pas toujours justes. L'outil doit calculer le nombre réel de portions à partir des quantités d'ingrédients et des macros.
- Vision SaaS : tout doit être configurable par utilisateur (profil, objectifs, préférences).
- URL source des recettes : https://jow.fr/cooking/recipes

## Constraints

- **Hébergement**: VPS (Hetzner/OVH) — choix de l'utilisateur pour le contrôle et le coût fixe
- **Synchro données**: Upload via API — le script local envoie les recettes au serveur
- **Enrichissement**: Manuel via Claude Code — pas d'API nutritionnelle automatique, utilisation du plan Max
- **Source de données**: Jow uniquement — pas d'autres sources de recettes pour le v1
- **Qualité code**: Tests unitaires et d'intégration obligatoires — couverture de test béton. **Chaque plan de phase DOIT inclure des taches de tests unitaires pour le code produit dans ce plan.** Pas de code sans tests. Les fonctions pures sont testees directement, les appels externes sont mockes (vi.mock). Les schemas Zod sont testes aux bornes. Les composants React interactifs sont testes avec @testing-library/react.
- **Tests manuels IA**: Les agents executors/verifiers doivent lancer le projet en local et tester visuellement via MCP Puppeteer (navigateur Chrome) quand c'est pertinent — pas juste des tests automatisés, aussi une vérification visuelle par l'agent
- **Architecture**: Abstraire la source de recettes (interface/adapter pattern) — Jow aujourd'hui, d'autres sources demain

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Postgres sur le serveur | Besoin de requêtes complexes pour l'algo de sélection + multi-utilisateurs SaaS | — Pending |
| Upload via API plutôt que DB partagée | Séparation claire entre scraping local et serveur, plus propre architecturalement | — Pending |
| Enrichissement macros via Claude Code | Utilisation du plan Max, flexibilité sur le format, pas de dépendance à une API tierce | — Pending |
| Target macro hebdomadaire global | Plus simple que jour par jour, suffisant pour le v1 | — Pending |
| Portions calculées via macros | Les portions Jow ne sont pas fiables, le calcul via macros est plus précis | — Pending |

---
*Last updated: 2026-02-08 after initialization*
