# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** L'utilisateur obtient un plan de repas hebdomadaire optimise pour ses macros sans avoir a choisir les recettes lui-meme.
**Current focus:** Phase 2: Recipe Data Pipeline - Enrichment + upload ready, scraper and integration remaining

## Current Position

Phase: 2 of 8 (Recipe Data Pipeline)
Plan: 3 of 5 in current phase (01, 03, 04 complete)
Status: In progress
Last activity: 2026-02-08 - Completed 02-03-PLAN.md (Claude CLI Enrichment)

Progress: [##........] 24% (9/38 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 7min
- Total execution time: 1.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6/6 | 39min | 7min |
| 02 | 3/5 | 17min | 6min |

**Recent Trend:**
- Last 5 plans: 15min, 10min, 7min, 4min, 6min
- Trend: stable around 6-7min average

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 8 phases (revised from 9), comprehensive depth, algorithm split en 2 (basic Phase 6, batch cooking Phase 7)
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

### Pending Todos

1. **Test the Shannon tool on the website** (testing) - 2026-02-08
2. **Set PIPELINE_TOKEN on production VPS** (deployment) - before pipeline goes live

### Blockers/Concerns

- [Phase 1]: ~~VPS provider + domain name a confirmer avant debut de la Phase 1~~ RESOLVED - VPS configured at mealprep.jimmydore.fr with SSL
- [Phase 2]: Migration automation needed before schema changes become frequent -- currently manual via docker compose exec
- [Phase 2]: Jow.fr structure a inspecter en live -- Playwright necessaire ou HTTP+Cheerio suffisant?
- [Phase 6]: Algorithme constraint-based a designer -- scoring function et poids a calibrer avec feedback utilisateur

## Session Continuity

Last session: 2026-02-08T16:12:50Z
Stopped at: Completed 02-03-PLAN.md (Claude CLI Enrichment)
Resume file: None

## Phase 1 Status

**COMPLETE** - All 6 plans executed successfully

## Phase 2 Status

**IN PROGRESS** - 3/5 plans completed

Plan 01 complete: Schema extended with 11 recipe columns, ingredients.name unique constraint, PIPELINE_TOKEN env validation, pipeline shared library (types, schemas, JSONL utils, logger).

Plan 03 complete: Claude CLI enrichment wrapper with --json-schema structured output, Zod bounds validation, retry on aberrant values, cross-validation against Jow nutrition, resumable JSONL pipeline.

Plan 04 complete: POST /api/recipes/upload endpoint with bearer auth, Zod validation, transactional upsert for recipes/ingredients/tags.

Next: Plans 02 (scraper), 05 (integration test) remaining
