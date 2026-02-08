# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** L'utilisateur obtient un plan de repas hebdomadaire optimise pour ses macros sans avoir a choisir les recettes lui-meme.
**Current focus:** Phase 1 complete - Ready for Phase 2: Recipe Data Pipeline

## Current Position

Phase: 1 of 8 (Project Foundation + Database + Deployment)
Plan: 6 of 6 in current phase
Status: Phase complete - Awaiting Phase 2 planning
Last activity: 2026-02-08 - Completed 01-06-PLAN.md (CI/CD and Hello World)

Progress: [##........] 16% (6/38 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 7min
- Total execution time: 0.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6/6 | 39min | 7min |

**Recent Trend:**
- Last 5 plans: 1min, 3min, 4min, 15min, 10min
- Trend: variable (Plan 05 included user VPS setup time, Plan 06 included user verification checkpoint)

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

### Pending Todos

1. **Test the Shannon tool on the website** (testing) - 2026-02-08

### Blockers/Concerns

- [Phase 1]: ~~VPS provider + domain name a confirmer avant debut de la Phase 1~~ RESOLVED - VPS configured at mealprep.jimmydore.fr with SSL
- [Phase 2]: Migration automation needed before schema changes become frequent -- currently manual via docker compose exec
- [Phase 2]: Jow.fr structure a inspecter en live -- Playwright necessaire ou HTTP+Cheerio suffisant?
- [Phase 6]: Algorithme constraint-based a designer -- scoring function et poids a calibrer avec feedback utilisateur

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 01-06-PLAN.md (CI/CD and Hello World) - PHASE 1 COMPLETE
Resume file: None

## Phase 1 Status

**COMPLETE** - All 6 plans executed successfully

✅ Full stack verified end-to-end:
- Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Postgres schema (recipes, ingredients, recipe_ingredients) with Drizzle ORM
- Database integration tests with Vitest
- VPS deployment with Docker + Nginx + SSL (mealprep.jimmydore.fr)
- GitHub Actions CI/CD auto-deploys on push to main
- Hello World page in production queries Postgres and displays server time + recipe count

Ready for Phase 2: Recipe Ingestion (Jow.fr adapter, Shannon tool integration)
