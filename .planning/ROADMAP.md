# Roadmap: Meal Prep

## Overview

Ce projet construit un outil de meal prep macro-optimise en 9 phases. On commence par le socle technique complet incluant base de donnees ET deploiement production (Phase 1), eliminant le bloqueur release des le depart. Ensuite le pipeline de donnees recettes (Phase 2), le catalogue consultable (Phase 3), l'authentification et profils (Phase 4), le moteur de calcul macros (Phase 5), l'algorithme de generation de plans basique (Phase 6), le batch cooking et l'historique (Phase 7), les enhancements utilisateur (Phase 8), et la suggestion de recettes a partir des ingredients restants dans le frigo (Phase 9). Chaque phase livre une capacite complete et verifiable avant de passer a la suivante.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Foundation + Database + Deployment** - Socle technique, schema Postgres, infra de tests, Docker, VPS, domain + SSL, auto-deploy, Hello World connecte a la DB
- [x] **Phase 2: Recipe Data Pipeline** - Scraper local Jow, enrichissement macros Claude Code, upload API serveur
- [ ] **Phase 3: Recipe Catalogue** - Interface de consultation des recettes avec recherche, filtres et details
- [ ] **Phase 4: Authentication + User Profile** - Comptes utilisateurs, profil sportif, preferences alimentaires
- [ ] **Phase 5: Macro Calculation Engine** - Calcul TDEE, targets macros hebdo, macros par portion
- [ ] **Phase 6: Basic Meal Plan Generation** - Algorithme de selection de recettes pour plan hebdo sans batch cooking
- [ ] **Phase 7: Batch Cooking + Plan History** - Support batch cooking avec portions reelles et historique des plans
- [ ] **Phase 8: Plan Customization + Enhancements** - Lock/swap de repas, liste de courses, favoris
- [ ] **Phase 9: Fridge Ingredient Recipe Selection** - Suggestion de recettes a partir des ingredients restants dans le frigo

## Phase Details

### Phase 1: Project Foundation + Database + Deployment
**Goal**: Le projet a un socle technique solide avec base de donnees, infra de tests, et est deploye en production sur VPS avec SSL et auto-deploy -- un mini frontend Hello World connecte a la DB prouve que tout fonctionne de bout en bout
**Depends on**: Nothing (first phase)
**Requirements**: DATA-04
**Success Criteria** (what must be TRUE):
  1. Le schema Postgres est deploye avec migrations (tables recipes, ingredients, tags) et le serveur Next.js demarre sans erreur
  2. Docker Compose lance l'environnement de dev complet (Postgres + app) en une seule commande
  3. La suite de tests s'execute (unit + integration) avec une base de test isolee, et les tests existants passent au vert
  4. L'architecture adapter pattern pour les sources de recettes est en place (interface RecipeSource abstraite, implementation Jow concrete)
  5. L'application tourne sur le VPS accessible via HTTPS avec certificat SSL Let's Encrypt valide sur le nom de domaine configure
  6. Un push sur main/master declenche automatiquement le deploiement de l'application en production
  7. Un mini frontend Hello World est accessible en production, se connecte a la base Postgres, et affiche une confirmation que la connexion DB fonctionne
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md -- Next.js scaffolding, Drizzle ORM config, Docker Compose dev, Dockerfile, Biome
- [x] 01-02-PLAN.md -- Schema Postgres (recipes, ingredients, tags), migrations, seed data
- [x] 01-03-PLAN.md -- Test infrastructure (Vitest, test DB utilities, smoke tests)
- [x] 01-04-PLAN.md -- Adapter pattern pour sources de recettes (RecipeSource interface + JowRecipeSource stub)
- [x] 01-05-PLAN.md -- Production Docker Compose, Nginx config, VPS setup script
- [x] 01-06-PLAN.md -- GitHub Actions CI/CD pipeline + Hello World frontend connecte a la DB

### Phase 2: Recipe Data Pipeline
**Goal**: Un pipeline local fonctionnel scrape les recettes Jow, les enrichit en macros via Claude CLI, et les uploade au serveur via API
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Le script local scrape au moins 50 recettes Jow avec titre, ingredients, portions, temps, photo et URL, et detecte les doublons au re-run
  2. Le skill Claude Code enrichit une recette avec les macros (proteines, glucides, lipides) par ingredient pour 100g, avec validation de coherence (bornes de calories par portion)
  3. L'endpoint API du serveur recoit les recettes enrichies et les persiste en base via upsert idempotent (pas de doublons cote serveur)
  4. Le pipeline complet (scrape -> enrich -> upload) est executable de bout en bout et les recettes sont consultables en base apres execution
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md -- Schema migration (new recipe columns, ingredients.name unique) + pipeline scaffolding (types, schemas, JSONL utils, logger)
- [x] 02-02-PLAN.md -- Jow.fr scraper (Playwright, sitemap discovery, recipe detail extraction, JSONL output, resumability)
- [x] 02-03-PLAN.md -- Claude CLI macro enrichment (enricher wrapper, prompt, validation, retry, cross-validation)
- [x] 02-04-PLAN.md -- Upload API endpoint (bearer token auth, Zod validation, Drizzle upsert transaction)
- [x] 02-05-PLAN.md -- Upload client + end-to-end pipeline integration and verification

### Phase 3: Recipe Catalogue
**Goal**: L'utilisateur peut parcourir, rechercher et consulter les recettes avec leurs macros dans une interface web
**Depends on**: Phase 2
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05
**Success Criteria** (what must be TRUE):
  1. L'utilisateur voit la liste des recettes avec pagination et peut naviguer entre les pages
  2. L'utilisateur peut rechercher une recette par nom (full-text search) et obtenir des resultats pertinents
  3. L'utilisateur peut filtrer les recettes par tags alimentaires (vegetarien, sans gluten, sans porc) et les filtres se combinent
  4. L'utilisateur peut ouvrir le detail d'une recette et voir les ingredients, macros par portion, temps de preparation et photo
  5. L'utilisateur peut cliquer un lien qui ouvre la recette Jow originale dans un nouvel onglet
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Foundation: shadcn/ui components, image config, DB query functions, shared UI components
- [ ] 03-02-PLAN.md -- Catalogue page: recipe grid, search bar, tag filters, pagination, loading skeleton
- [ ] 03-03-PLAN.md -- Recipe detail page: ingredients, macros, photo, Jow link, not-found handling

### Phase 4: Authentication + User Profile
**Goal**: Les utilisateurs peuvent creer un compte, se connecter, et configurer leur profil sportif et alimentaire
**Depends on**: Phase 1
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut creer un compte avec email/password, se connecter, rester connecte entre les sessions, et se deconnecter depuis n'importe quelle page
  2. L'utilisateur peut saisir et modifier son profil physique (poids, taille, age, sexe, niveau d'activite)
  3. L'utilisateur peut definir son objectif nutritionnel (seche, prise de masse, maintien) et ses preferences alimentaires (vegetarien, sans gluten, sans porc, etc.)
  4. L'utilisateur peut saisir ses seances de sport prevues dans la semaine (type d'activite, frequence)
  5. Les donnees d'un utilisateur sont isolees des autres (multi-tenant via RLS) -- un utilisateur ne voit jamais les donnees d'un autre
**Plans**: TBD

Plans:
- [ ] 04-01: Better Auth integration (register, login, sessions, logout, middleware)
- [ ] 04-02: Schema profil utilisateur + sport sessions, RLS policies
- [ ] 04-03: Pages profil frontend (formulaire physique, objectif, preferences alimentaires)
- [ ] 04-04: Page sport schedule (saisie seances hebdomadaires)

### Phase 5: Macro Calculation Engine
**Goal**: Le systeme calcule automatiquement les targets macros hebdomadaires et les macros reelles par portion de recette
**Depends on**: Phase 4
**Requirements**: MACRO-01, MACRO-02, MACRO-03, MACRO-04
**Success Criteria** (what must be TRUE):
  1. Le systeme calcule le TDEE de l'utilisateur a partir de son profil via la formule Mifflin-St Jeor et le resultat est affiche
  2. Le TDEE est ajuste en fonction des seances de sport saisies pour la semaine (plus de sport = plus de calories)
  3. Les targets macros hebdomadaires (proteines, glucides, lipides en grammes) sont calcules selon l'objectif (seche/masse/maintien) et affiches a l'utilisateur
  4. Les macros reelles par portion de chaque recette sont calculees a partir des macros par ingredient/100g et des quantites dans la recette
**Plans**: TBD

Plans:
- [ ] 05-01: Service calcul TDEE (Mifflin-St Jeor) + ajustement sport
- [ ] 05-02: Service targets macros hebdo (repartition P/G/L selon objectif)
- [ ] 05-03: Service macros par portion de recette (calcul depuis macros/100g des ingredients)
- [ ] 05-04: Affichage targets macros dans le profil utilisateur

### Phase 6: Basic Meal Plan Generation
**Goal**: L'utilisateur peut generer un plan de repas hebdomadaire (14 repas) optimise pour ses targets macros, sans batch cooking
**Depends on**: Phase 5
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-06, PLAN-07
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut generer un plan de repas hebdomadaire (midi + soir, 7 jours = 14 repas) en un clic
  2. L'algorithme selectionne les recettes pour que les macros totales du plan approchent les targets hebdomadaires (+/- 10%)
  3. L'algorithme exclut automatiquement les recettes incompatibles avec les preferences alimentaires de l'utilisateur
  4. L'utilisateur voit le resume macros du plan (totaux journaliers et hebdo vs objectifs) avec indicateurs visuels
  5. L'utilisateur peut regenerer le plan complet en un clic et obtenir un nouveau plan different
**Plans**: TBD

Plans:
- [ ] 06-01: Algorithme de selection (greedy constraint-based, variete, preferences, scoring macro)
- [ ] 06-02: API generation de plan + stockage meal_plans/meal_plan_items
- [ ] 06-03: Page plan hebdo frontend (grille 7j x 2 repas, resume macros, bouton regenerer)

### Phase 7: Batch Cooking + Plan History
**Goal**: L'algorithme supporte le batch cooking avec calcul reel des portions, et l'utilisateur peut consulter ses plans precedents
**Depends on**: Phase 6
**Requirements**: PLAN-04, PLAN-05, PLAN-08
**Success Criteria** (what must be TRUE):
  1. L'algorithme peut assigner une meme recette a plusieurs repas (x2, x3) pour du batch cooking, et le plan affiche clairement quels repas partagent une recette
  2. Les portions en batch cooking sont calculees via les macros reelles (pas les multiplicateurs Jow), et les macros par portion restent correctes apres scaling
  3. L'utilisateur peut consulter la liste de ses plans generes precedemment et en ouvrir un pour revoir le detail
**Plans**: TBD

Plans:
- [ ] 07-01: Extension algorithme batch cooking (assignation multi-slots, scoring variete)
- [ ] 07-02: Calcul portions reelles en batch (scaling macros, validation coherence)
- [ ] 07-03: Historique des plans (liste, consultation detail, API + frontend)

### Phase 8: Plan Customization + Enhancements
**Goal**: L'utilisateur peut personnaliser son plan (lock/swap), generer une liste de courses, et noter ses recettes favorites
**Depends on**: Phase 7
**Requirements**: ENH-01, ENH-02, ENH-03
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut verrouiller un ou plusieurs repas dans son plan et regenerer uniquement les repas non verrouilles, avec les macros des repas verrouilles comptees dans le budget
  2. Le systeme genere une liste de courses agregee a partir du plan (ingredients groupes par categorie, quantites additionnees) avec prise en compte du batch cooking
  3. L'utilisateur peut noter ou favoriser des recettes, et les recettes favorites sont favorisees dans les futures generations de plans
**Plans**: TBD

Plans:
- [ ] 08-01: Lock/swap de repas (verrouillage, regeneration partielle, budget macro ajuste)
- [ ] 08-02: Generation liste de courses (agregation ingredients, normalisation unites, batch cooking)
- [ ] 08-03: Systeme de favoris/notes recettes (notation, poids dans l'algorithme de selection)

### Phase 9: Fridge Ingredient Recipe Selection
**Goal**: L'utilisateur peut saisir les ingredients qu'il a dans son frigo et obtenir des suggestions de recettes qui les utilisent, pour reduire le gaspillage alimentaire
**Depends on**: Phase 8
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut saisir une liste d'ingredients disponibles dans son frigo (avec autocompletion depuis la base d'ingredients existante)
  2. Le systeme suggere des recettes qui maximisent l'utilisation des ingredients saisis, triees par pertinence (nombre d'ingredients matches)
  3. L'utilisateur peut voir quels ingredients de chaque recette suggeree sont deja dans son frigo et lesquels manquent
**Plans**: TBD

Plans:
- [ ] 09-01: TBD (run /gsd:plan-phase 9 to break down)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation + Database + Deployment | 6/6 | ✓ Complete | 2026-02-08 |
| 2. Recipe Data Pipeline | 5/5 | ✓ Complete | 2026-02-08 |
| 3. Recipe Catalogue | 1/3 | In progress | - |
| 4. Authentication + User Profile | 0/4 | Not started | - |
| 5. Macro Calculation Engine | 0/4 | Not started | - |
| 6. Basic Meal Plan Generation | 0/3 | Not started | - |
| 7. Batch Cooking + Plan History | 0/3 | Not started | - |
| 8. Plan Customization + Enhancements | 0/3 | Not started | - |
| 9. Fridge Ingredient Recipe Selection | 0/? | Not started | - |
