# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** L'utilisateur obtient un plan de repas hebdomadaire optimise pour ses macros sans avoir a choisir les recettes lui-meme.
**Current focus:** Phase 5: Macro Calculation Engine (COMPLETE)

## Current Position

Phase: 5 (Macro Calculation Engine)
Plan: 04 of 4 complete
Status: Phase complete
Last activity: 2026-02-10 - Completed 05-04-PLAN.md (macro dashboard and recipe macros UI)

Progress: [########..] 84% (32/38 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 32
- Average duration: 6min
- Total execution time: 2.86 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6/6 | 39min | 7min |
| 02 | 5/5 | 46min | 9min |
| 03 | 5/5 | 15min | 3min |
| 03.1 | 2/2 | 6min | 3min |
| 04 | 4/4 | 28min | 7min |
| 04.1 | 6/6 | 25min | 4min |
| 05 | 4/4 | 13min | 3min |

**Recent Trend:**
- Last 5 plans: 3min, 2min, 3min, 3min, 5min
- Trend: consistent speed, UI integration slightly longer than pure-function modules

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 10 added -- ingredient pricing + recipe cost estimation, integrated into meal plan algorithm selection
- [Roadmap]: Phase 4.1 inserted -- comprehensive unit tests for all existing code (pipeline, API, DB, schemas, React components) before building Phase 5+
- [Roadmap]: Phase 3.1 inserted -- pipeline enrichment optimization (deduplicate ingredients, enrich unique ones once via Claude CLI instead of per-recipe)
- [Roadmap]: 10 phases (revised from 9), Phase 10 added for ingredient pricing and recipe cost
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
- [03.1-01]: IngredientMacro structurally identical to EnrichedIngredient -- same Zod bounds, separate type for semantic clarity
- [03.1-01]: Batch count validation: throw if Claude returns fewer/more ingredients than input count
- [03.1-01]: Prompt updated for ingredient-list context, backward compatible with recipe context
- [03.1-02]: crossValidateNutrition imported directly in enrich.ts orchestrator, not re-exported from recipe-assembler
- [03.1-02]: Missing ingredients produce partial enriched recipes with _flags rather than dropping entire recipe
- [03.1-02]: --stage flag allows running Stage 1 or Stage 2 independently for debugging
- [04-01]: proxy.ts must be at src/proxy.ts (not project root) for Next.js 16 App Router detection
- [04-01]: Better Auth CLI generates auth schema with text() IDs and explicit column name mappings
- [04-01]: baseURL added to Better Auth server config to suppress base URL warning
- [04-01]: shadcn/ui form components pre-installed for Plans 02-04
- [04-03]: pgEnum for all constrained values (sex, activity_level, goal, dietary_preference, activity_type) -- DB-level enforcement
- [04-03]: Transactional delete+insert for set operations (dietary preferences, sport activities) -- simpler than diff-based upsert
- [04-03]: isProfileComplete checks 6 required fields (weight, height, age, sex, activityLevel, goal)
- [04-04]: Sonner for toast notifications -- lightweight, works with server actions
- [04-04]: x-pathname header from proxy for server-side path detection in layout -- Next.js 16 server layouts cannot access pathname directly
- [04.1-03]: Profile age bounds tested against actual schema (14-100) not plan estimate (10-120) -- tests must match code
- [04.1-01]: Exported parseClaudeOutput, validateIngredients, boundsCheck from claude-enricher.ts -- pure helpers only, impure functions stay private
- [04.1-01]: Pipeline tests use relative imports (../jow-parser) since @/* resolves to src/* only
- [04.1-04]: DB integration tests must run with --fileParallelism=false to avoid deadlocks on shared test DB truncation
- [04.1-04]: API route tests fully mocked (db.transaction, env) -- no Docker dependency for unit tests
- [04.1-06]: vi.hoisted() required for mock functions referenced in vi.mock factory -- vitest hoists vi.mock above const declarations
- [04.1-06]: window.location.href stubbed via Object.defineProperty -- auth forms use window.location.href not router.push
- [04.1-06]: ResizeObserver + hasPointerCapture polyfills needed for Radix UI in jsdom
- [04.1-06]: Wizard navigation tests use defaultValues to skip Radix Select interaction -- jsdom lacks scrollIntoView
- [04.1-02]: vi.mock(import("node:fs")) with importOriginal + default export spread required for vitest 4.x Node.js built-in CJS module mocking
- [05-01]: Constants typed with Record<EnumType, number> for compile-time exhaustiveness -- adding a new DB enum value without updating the constant triggers a type error
- [05-01]: export interface (not export type) for all nutrition types -- consistent with plan convention
- [05-02]: Naive French singularization (strip trailing s) for plural ingredient piece weight matching
- [05-02]: PIECE_WEIGHTS sorted longest-key-first to prevent partial matches (citron vert > citron, tomate cerise > tomate)
- [05-04]: Server component dashboard runs full BMR->TDEE->MacroTargets chain server-side, client components handle display only
- [05-04]: Confidence indicator uses three color-coded levels (green/yellow/orange) for recipe macro data quality
- [05-04]: Both computed and Jow-sourced nutrition shown side-by-side on recipe detail for comparison

### Pending Todos

1. **Test the Shannon tool on the website** (testing) - 2026-02-08
2. ~~**Set PIPELINE_TOKEN on production VPS**~~ DONE - set via openssl rand -hex 32
3. **Run pipeline at scale** (data) - scrape/enrich/upload 50+ recipes to populate catalogue
4. **Add Google login** (auth) - 2026-02-08
5. **Add recipe instructions to detail page** (ui) - 2026-02-08
6. **Accent-insensitive recipe search** (database) - 2026-02-08 — "pates" should match "pâtes"
7. **UX revamp of app and onboarding page** (ui) - 2026-02-08 — visual overhaul, better usability
8. **Detecteur de carences via prise de sang** (general) - 2026-02-08 — import/saisie resultats sanguins, detection carences micronutriments, suggestions alimentaires
9. **Parametres ajustables sur le calcul macro** (general) - 2026-02-08 — coefficients metaboliques personnalisables, override targets P/G/L, feedback loop poids
10. **Ajouter intensite et duree aux activites sportives** (ui) - 2026-02-08 — duree par seance, niveau d'intensite, impact sur calcul TDEE
11. **Suggerer des aliments pour combler les ecarts macros** (general) - 2026-02-09 — apres generation du plan, proposer snacks/aliments pour remplir les gaps P/G/L

### Blockers/Concerns

- [Phase 1]: ~~VPS provider + domain name a confirmer avant debut de la Phase 1~~ RESOLVED - VPS configured at mealprep.jimmydore.fr with SSL
- [Phase 2]: ~~Migration automation needed before schema changes become frequent -- currently manual via docker compose exec~~ RESOLVED - Automated migration step added to deploy.yml in 03-04
- [Phase 2]: ~~Jow.fr structure a inspecter en live -- Playwright necessaire ou HTTP+Cheerio suffisant?~~ RESOLVED - Playwright used, __NEXT_DATA__ + JSON-LD merge strategy confirmed working for 3,214 recipes
- [Phase 2]: ~~End-to-end pipeline verification~~ RESOLVED - 5 recipes verified scrape->enrich->upload->DB
- [Phase 6]: Algorithme constraint-based a designer -- scoring function et poids a calibrer avec feedback utilisateur

## Session Continuity

Last session: 2026-02-10T00:20:00Z
Stopped at: Completed 05-04-PLAN.md (macro dashboard and recipe macros UI) -- Phase 5 COMPLETE
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

## Phase 3.1 Status

**COMPLETE** - All 2 plans executed successfully

Plan 01 complete: Ingredient extractor (924 unique from 19,239 occurrences), batch Claude CLI enrichment with Zod validation and count checking, IngredientMacro type and schema.

Plan 02 complete: Recipe assembler module (loadMacroLookup + assembleEnrichedRecipe), enrich.ts rewritten as two-stage pipeline orchestrator. Stage 1 batch-enriches unique ingredients to reference file (~47 Claude CLI calls). Stage 2 assembles enriched recipes by joining macros, with cross-validation and resumability. Output format identical for upload pipeline.

## Phase 4 Status

**COMPLETE** - All 4 plans executed successfully

Plan 01 complete: Better Auth 1.4.18 with Drizzle adapter, 4 auth tables (user, session, account, verification), API handler at /api/auth/[...all], proxy.ts route protection, BETTER_AUTH_SECRET + NEXT_PUBLIC_APP_URL env vars, 7 shadcn/ui components pre-installed.

Plan 02 complete: Auth page with login/register tab forms, authenticated route group layout with server-side session check, Header with user avatar and logout, recipe pages moved to (authenticated) group.

Plan 03 complete: 3 DB tables (user_profiles, user_dietary_preferences, user_sport_activities) with 5 pgEnum types. Zod validation schemas for onboarding wizard. Query layer with CRUD, transactional set operations, getFullUserProfile, isProfileComplete.

Plan 04 complete: 4-step onboarding wizard (Physique, Objectif, Alimentation, Sport) with react-hook-form + Zod validation. Server action saves profile via query layer. Onboarding page redirects completed profiles. Settings page pre-populates wizard. Layout redirects incomplete profiles to /onboarding. Header has "Mon profil" link.

## Phase 4.1 Status

**COMPLETE** - All 6 plans executed successfully

Plan 01 complete: 67 unit tests for pipeline pure functions -- jow-parser (35 tests), recipe-assembler (6 tests), claude-enricher pure helpers (26 tests). Vitest config updated for scripts/**/*.test.ts discovery. Exported parseClaudeOutput, validateIngredients, boundsCheck.

Plan 02 complete: 39 unit tests for pipeline impure functions -- JSONL utilities (13 tests with mocked fs), API client (7 tests with mocked fetch), Claude enricher impure (13 tests with mocked execSync/fs/os/crypto), ingredient extractor (6 tests with mocked readJsonl).

Plan 03 complete: 71 boundary tests for all Zod validation schemas -- pipeline schemas (enrichedIngredient, ingredientMacro, scrapedRecipe, enrichedRecipe) and profile schemas (physical, goal, dietary, sportActivity, sport, profile composite). All numeric bounds and enum values tested.

Plan 04 complete: 35 tests for API upload route (11 unit tests with mocked DB/env: auth 401, validation 400, success 201, error 500) + recipe DB queries (12 integration tests: pagination, search, tag AND filter, getById) + profile DB queries (12 integration tests: upsert, isComplete, dietary preferences).

Plan 05 complete: 33 unit tests for catalogue interactive components -- SearchBar (9 tests: debounce timing, URL params), TagFilter (10 tests: toggle on/off, variant assertion), PaginationControls (14 tests: page links, nav buttons, ellipsis, param preservation).

Plan 06 complete: 27 unit tests for auth forms and onboarding wizard -- LoginForm (8 tests: rendering, validation, signIn, redirect, errors), RegisterForm (8 tests: rendering, password mismatch, signUp+signIn flow, errors), OnboardingWizard (11 tests: step rendering, navigation, validation blocking, submit in both modes, error handling).

## Phase 5 Status

**COMPLETE** - All 4 plans executed successfully

Plan 01 complete: Nutrition module foundation -- 6 shared interfaces (UserProfile, SportSession, BMRResult, TDEEResult, MacroTargets, RecipeMacrosResult), 8 evidence-based constants (MET values, activity multipliers, macro ratios), calculateBMR with Mifflin-St Jeor equation, 10 unit tests.

Plan 02 complete: Unit conversion and recipe macros -- convertToGrams for 18 French cooking units with accent-stripped piece lookups and French plural singularization, calculateRecipeMacros with confidence scoring and missing ingredient tracking, 54 tests.

Plan 03 complete: TDEE and macro targets -- calculateTDEE with hybrid lifestyle multiplier + MET sport addition (subtract 1 MET), calculateMacroTargets with g/kg protein and 50g min carbs safety, index.ts barrel export for full nutrition module public API, 23 tests (87 total).

Plan 04 complete: Macro dashboard at /dashboard with daily calorie/P/G/L targets and expandable BMR/TDEE breakdown. Recipe detail page updated with computed per-serving macros and confidence indicator. Header nav link to dashboard added. User-approved via checkpoint.
