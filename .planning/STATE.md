# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** L'utilisateur obtient un plan de repas hebdomadaire optimise pour ses macros sans avoir a choisir les recettes lui-meme.
**Current focus:** Phase 3 complete. Ready for Phase 4: Authentication + User Profile

## Current Position

Phase: 3 of 9 (Recipe Catalogue) -- COMPLETE
Plan: 5 of 5 in current phase (all complete)
Status: Phase 3 complete
Last activity: 2026-02-08 - Completed Phase 3 gap closure (plans 04-05)

Progress: [####......] 42% (16/38 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 6min
- Total execution time: 1.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6/6 | 39min | 7min |
| 02 | 5/5 | 46min | 9min |
| 03 | 5/5 | 15min | 3min |

**Recent Trend:**
- Last 5 plans: 4min, 4min, 2min, 1min, 4min
- Trend: fast execution for UI/config/deploy plans

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 9 phases (revised from 8), Phase 9 added for fridge ingredient recipe selection
- [Roadmap]: Original 8 phases with algorithm split en 2 (basic Phase 6, batch cooking Phase 7)
- [Roadmap]: Deployment merged into Phase 1 -- deploy-first strategy eliminates release blocker early
- [Roadmap]: Phase 1 delivers Hello World frontend connecte a la DB en production avec auto-deploy
- [Roadmap]: ENH-01/02/03 inclus dans v1 (Phase 8), pas differes en v2
- [Roadmap]: Adapter pattern pour sources de recettes impose des Phase 1
- [01-01]: Biome v2 uses `includes` key (not `include`) and schema URL must match CLI version
- [01-01]: Non-null assertion suppressed in drizzle.config.ts (standard dotenv pattern)
- [01-01]: Docker Compose dev-only (no app service, Next.js runs locally for fast HMR)
- [01-03]: drizzle-kit push (not migrations) for test DB schema sync -- ephemeral test DB needs no migration history
- [01-03]: Hardcoded test DB URL in db-setup.ts -- test utilities independent of Next.js env validation
- [01-02]: real() for macro nutrients (sufficient precision, smaller than doublePrecision)
- [01-02]: Seed script uses standalone postgres+drizzle connection (avoids @t3-oss/env-nextjs Next.js runtime dependency)
- [01-04]: RecipeSource interface kept minimal (name + fetchRecipes + fetchRecipeById) -- adapter pattern for pluggable sources
- [01-04]: Unused parameters prefixed with underscore (_id) for Biome lint compliance
- [01-05]: Domain configured as mealprep.jimmydore.fr (actual value committed for team reference and reproducibility)
- [01-05]: Deploy user = main user (jimmydore) instead of dedicated deploy user -- simplifies SSH and permissions for solo developer workflow
- [01-05]: App directory /home/jimmydore/meal-prep instead of /opt/mealprep -- aligns with user home development workflow
- [01-06]: CI excludes DB integration tests (pnpm test run --exclude 'src/db/**') -- GitHub Actions runner has no live Postgres
- [01-06]: SKIP_ENV_VALIDATION=1 in CI type-check and Dockerfile build stage -- bypasses @t3-oss/env-nextjs validation for build-time
- [01-06]: Dockerfile build stage needs dummy DATABASE_URL for Next.js standalone build with dynamic pages -- @t3-oss/env-nextjs validation runs at build time
- [01-06]: Production DB migrations applied manually (docker compose exec) -- automation deferred to Phase 2+ when schema changes become frequent
- [02-01]: Applied migration SQL directly to dev DB -- drizzle-kit push interactive prompt not automatable
- [02-01]: PIPELINE_TOKEN added to .env with dev-pipeline-token placeholder
- [02-01]: Zod macro bounds: protein/carbs/fat 0-100 per 100g, calories 0-900 per 100g
- [02-03]: Claude CLI --tools "" instead of --max-turns 1 (flag absent) to prevent tool use and keep single-turn
- [02-03]: Claude CLI structured_output field (not result) contains --json-schema data in --output-format json mode
- [02-03]: All dynamic content (prompt, schema, recipe) via temp files to avoid shell expansion
- [02-03]: --model sonnet for cost efficiency on nutritional estimation tasks
- [02-04]: Tag upsert targets slug (not name) for case-insensitive deduplication -- "Rapide" and "rapide" resolve to same tag
- [02-04]: PIPELINE_TOKEN upgraded from placeholder to secure random 64-char hex for local dev
- [02-02]: Merge __NEXT_DATA__ and JSON-LD data sources for maximum recipe data coverage
- [02-02]: Jow difficulty mapped from numbers to labels (0=Tres facile, 1=Facile, 2=Moyen, 3=Difficile)
- [02-02]: Real Jow __NEXT_DATA__: directions[].label for steps, nutritionalFacts[{id,amount}] for nutrition, cookingTime/preparationTime as minute integers, coversCount for portions
- [02-05]: Upload relies on API upsert idempotency (no client-side dedup tracking needed)
- [02-05]: Per-recipe error handling: failures logged and counted, pipeline continues without aborting
- [03-01]: Batch tag fetch via inArray (not N+1) for getRecipes performance -- fetch recipes, then batch tags in single query
- [03-01]: Drizzle relational query (db.query.recipes.findFirst with nested with) for getRecipeById detail page
- [03-01]: AND logic for tag filters via exists subquery per slug -- recipe must have ALL selected tags
- [03-01]: Fixed db singleton typing with createDb factory pattern to preserve schema type through global cache
- [03-02]: URL search params as single source of truth for catalogue state (search, tags, page)
- [03-02]: 300ms debounce on search bar via setTimeout + useRef
- [03-02]: Home page (/) redirects to /recipes
- [03-03]: NutritionPerServing interface for jowNutritionPerServing JSONB typed casting
- [03-03]: generateMetadata for dynamic recipe titles in browser tab
- [03-04]: PIPELINE_TOKEN uses ${PIPELINE_TOKEN:-} empty default in docker-compose.prod.yml
- [03-04]: sha256 hash dedup for migration tracking in deploy workflow
- [03-04]: sleep 5 after container start ensures DB ready before migration psql commands
- [03-05]: UUID regex validation in getRecipeById prevents Postgres error on invalid UUID strings (returns 404 not 500)
- [03-05]: PIPELINE_TOKEN set on VPS via openssl rand -hex 32, persists in .env across deploys

### Pending Todos

1. **Test the Shannon tool on the website** (testing) - 2026-02-08
2. ~~**Set PIPELINE_TOKEN on production VPS**~~ DONE - set via openssl rand -hex 32
3. **Run pipeline at scale** (data) - scrape/enrich/upload 50+ recipes to populate catalogue

### Blockers/Concerns

- [Phase 1]: ~~VPS provider + domain name a confirmer avant debut de la Phase 1~~ RESOLVED - VPS configured at mealprep.jimmydore.fr with SSL
- [Phase 2]: ~~Migration automation needed before schema changes become frequent -- currently manual via docker compose exec~~ RESOLVED - Automated migration step added to deploy.yml in 03-04
- [Phase 2]: ~~Jow.fr structure a inspecter en live -- Playwright necessaire ou HTTP+Cheerio suffisant?~~ RESOLVED - Playwright used, __NEXT_DATA__ + JSON-LD merge strategy confirmed working for 3,214 recipes
- [Phase 2]: ~~End-to-end pipeline verification~~ RESOLVED - 5 recipes verified scrape->enrich->upload->DB
- [Phase 6]: Algorithme constraint-based a designer -- scoring function et poids a calibrer avec feedback utilisateur

## Session Continuity

Last session: 2026-02-08T19:00:00Z
Stopped at: Phase 3 complete (Recipe Catalogue) -- all 5 plans executed, verified, deployed to production
Resume file: None

## Phase 1 Status

**COMPLETE** - All 6 plans executed successfully

## Phase 2 Status

**COMPLETE** - All 5 plans executed successfully

Plan 01 complete: Schema extended with 11 recipe columns, ingredients.name unique constraint, PIPELINE_TOKEN env validation, pipeline shared library (types, schemas, JSONL utils, logger).

Plan 02 complete: Playwright scraper discovers 3,214 Jow.fr recipes via sitemap, merges __NEXT_DATA__ and JSON-LD for rich data extraction, writes resumable JSONL with 1.5s rate limiting.

Plan 03 complete: Claude CLI enrichment wrapper with --json-schema structured output, Zod bounds validation, retry on aberrant values, cross-validation against Jow nutrition, resumable JSONL pipeline.

Plan 04 complete: POST /api/recipes/upload endpoint with bearer auth, Zod validation, transactional upsert for recipes/ingredients/tags.

Plan 05 complete: Upload client maps EnrichedRecipe to API payload with bearer auth, end-to-end pipeline verified with 5 recipes (scrape->enrich->upload->DB confirmed).

## Phase 3 Status

**COMPLETE** - All 5 plans executed successfully

Plan 01 complete: 7 shadcn/ui components installed, Next.js image domains configured, Drizzle query layer (getRecipes with paginated search/filter + nested tags, getRecipeById with ingredients/tags, getAllTags), RecipeCard and MacroBadge server components.

Plan 02 complete: /recipes catalogue page with debounced search, AND-logic tag filtering, pagination, responsive grid, loading skeleton. Home page redirects to /recipes. URL search params drive all state.

Plan 03 complete: /recipes/[id] detail page with image, macros per serving from JSONB, ingredient list with per-100g macros, Jow external link, not-found handling, generateMetadata for dynamic titles.

Plan 04 complete: PIPELINE_TOKEN made optional in env.ts, passed to prod container via docker-compose.prod.yml, automated Drizzle migration step added to deploy.yml with sha256 dedup tracking.

Plan 05 complete: Code fixes deployed to production, PIPELINE_TOKEN set on VPS, 5 recipes uploaded, UUID validation fix for recipe detail 404. Production verified: mealprep.jimmydore.fr/recipes serves recipe catalogue.
