---
phase: 01-project-foundation-database-deployment
plan: 06
subsystem: infra
tags: [github-actions, cicd, docker, nextjs, deployment, vps]

# Dependency graph
requires:
  - phase: 01-02
    provides: Database schema and seed data for production
  - phase: 01-03
    provides: Test infrastructure and Vitest configuration
  - phase: 01-05
    provides: VPS setup with Docker, Nginx, SSL certificate
provides:
  - GitHub Actions CI/CD pipeline (lint, type-check, test, deploy)
  - Hello World page with live Postgres connection proof
  - Automated deployment on push to main
  - Production-ready Dockerfile with build-time env handling
affects: [02-recipe-ingestion, 03-ui-foundations, all-future-phases]

# Tech tracking
tech-stack:
  added: [github-actions, appleboy/ssh-action]
  patterns: [ci-cd-pipeline, atomic-task-commits, ssh-based-deployment]

key-files:
  created:
    - .github/workflows/deploy.yml
    - src/app/page.tsx
  modified:
    - Dockerfile
    - src/app/layout.tsx

key-decisions:
  - "CI excludes DB integration tests (runs unit tests only with dummy DATABASE_URL)"
  - "Type-check step uses SKIP_ENV_VALIDATION=1 to bypass @t3-oss/env-nextjs validation in CI"
  - "Dockerfile build stage sets SKIP_ENV_VALIDATION=1 and dummy DATABASE_URL for Next.js standalone build"
  - "SSH deployment to /home/jimmydore/meal-prep (user home, not /opt/mealprep)"
  - "Manual production DB migrations (automated migration approach deferred to Phase 2+)"
  - "appleboy/ssh-action v1.2.4 for deployment automation"

patterns-established:
  - "CI/CD pattern: lint -> type-check -> test -> deploy on main branch push"
  - "Dockerfile pattern: separate build and runtime env vars for Next.js standalone"
  - "Server component pattern: force-dynamic for DB-querying pages"
  - "Error handling pattern: try/catch with user-friendly error display"

# Metrics
duration: 10min (excluding user verification checkpoint)
completed: 2026-02-08
---

# Phase 1 Plan 6: CI/CD and Hello World Summary

**GitHub Actions pipeline deploys Next.js to VPS via SSH on push to main, with Hello World page querying production Postgres and displaying server time and recipe count**

## Performance

- **Duration:** 10 min (task execution) + user verification checkpoint
- **Started:** 2026-02-08 (after Plan 05 completion)
- **Completed:** 2026-02-08T14:45:33Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments

- GitHub Actions CI/CD pipeline functional: lint + type-check + test + SSH deploy (1m56s total runtime)
- Hello World page deployed at https://mealprep.jimmydore.fr with live Postgres connection
- Production deployment verified: shows "Meal Prep" heading, "Database connected successfully", server time, recipe count
- Dockerfile build-time env var issue resolved (SKIP_ENV_VALIDATION + dummy DATABASE_URL)
- Phase 1 complete: Full stack proven from code push to production DB query to browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GitHub Actions CI/CD workflow** - `e56431e` (feat)
2. **Task 2: Create Hello World frontend with DB connection proof** - `d0a18f5` (feat)
3. **Dockerfile build-time fix** - `fe7b910` (fix) - auto-fix deviation during checkpoint verification

**Plan metadata:** (to be committed after this summary)

## Files Created/Modified

- `.github/workflows/deploy.yml` - CI/CD pipeline: checkout -> pnpm setup -> lint (biome) -> type-check (tsc) -> test (vitest, DB tests excluded) -> SSH deploy to VPS
- `src/app/page.tsx` - Hello World React Server Component with DB connection proof (SELECT NOW(), recipe count query)
- `src/app/layout.tsx` - Updated metadata (title: "Meal Prep")
- `Dockerfile` - Added build-time env vars (SKIP_ENV_VALIDATION=1, dummy DATABASE_URL) to fix Next.js standalone build with dynamic pages

## Decisions Made

1. **CI test exclusion:** `pnpm test run --exclude 'src/db/**'` excludes DB integration tests in CI (no live Postgres in GitHub Actions runner). Unit tests only. Dummy DATABASE_URL provided for env validation.

2. **Type-check env skip:** `SKIP_ENV_VALIDATION=1` in CI type-check step to bypass @t3-oss/env-nextjs runtime validation (no real DATABASE_URL in CI).

3. **Dockerfile build-time env vars:** Next.js standalone build with dynamic pages requires DATABASE_URL at build time (even though it's runtime-only). Solution: Set `SKIP_ENV_VALIDATION=1` and dummy `DATABASE_URL="postgresql://build:build@localhost:5432/build"` in builder stage. Runtime uses real DATABASE_URL from environment.

4. **Manual production migrations:** Production DB migrations applied manually via `docker compose exec` during checkpoint verification. Automated migration approach (entrypoint script or deploy step) deferred to Phase 2+ when migration complexity increases.

5. **SSH deployment path:** Deploy to `/home/jimmydore/meal-prep` (aligns with Plan 05 decision to use main user instead of dedicated deploy user).

6. **GitHub Secrets:** VPS_HOST, VPS_USER, VPS_SSH_KEY configured by user during Plan 05 setup, referenced in workflow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dockerfile build-time env vars for dynamic pages**

- **Found during:** Checkpoint verification - production deployment failed with "Error: DATABASE_URL is not set" during Docker build
- **Issue:** Next.js standalone build with `force-dynamic` pages requires DATABASE_URL at build time, but Dockerfile didn't set it. @t3-oss/env-nextjs validation runs during build and fails without DATABASE_URL, even though DB isn't accessed until runtime.
- **Fix:** Added to Dockerfile builder stage:
  ```dockerfile
  ENV SKIP_ENV_VALIDATION=1
  ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
  ```
  This bypasses env validation and provides dummy URL for build. Runtime uses real DATABASE_URL from docker-compose.prod.yml environment.
- **Files modified:** Dockerfile
- **Verification:** `docker compose -f docker-compose.prod.yml build` succeeds, production deployment works
- **Committed in:** `fe7b910` (fix(01-06): add build-time env vars to Dockerfile for dynamic pages)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Auto-fix essential for production deployment. Discovered during user verification, fixed and re-verified. No scope creep.

## Issues Encountered

**1. Dockerfile build fails with "DATABASE_URL is not set"**

- **Context:** Next.js standalone build with Server Components using `force-dynamic` export triggers @t3-oss/env-nextjs validation at build time
- **Root cause:** Dockerfile didn't set DATABASE_URL environment variable in builder stage
- **Solution:** Added SKIP_ENV_VALIDATION=1 and dummy DATABASE_URL to builder stage (see Deviations section)
- **Outcome:** Production build succeeds, deployment verified

**2. Production DB migrations not automated**

- **Context:** Plan suggested adding migration automation to deploy workflow or Docker entrypoint
- **Decision:** Applied migrations manually via `docker compose exec -T app npx drizzle-kit push` during checkpoint verification
- **Rationale:** Phase 1 schema is stable (3 tables). Migration automation adds complexity. Defer to Phase 2+ when schema changes become frequent.
- **Documented:** Added to STATE.md as architectural decision for future phases

## Authentication Gates

None - all automation completed without external authentication requirements.

## User Setup Required

None - VPS secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY) were configured during Plan 05 and referenced in workflow. No additional external service configuration required for this plan.

## Next Phase Readiness

**Ready for Phase 2 (Recipe Ingestion):**

- ✅ CI/CD pipeline functional: all code changes auto-deploy on push to main
- ✅ Production environment verified: Postgres connected, SSL working, domain accessible
- ✅ Database schema deployed: recipes, ingredients, recipe_ingredients tables exist
- ✅ Seed data in production: 3 recipes from Plan 02 seed script
- ✅ Development workflow established: local dev with Docker Compose, production with GitHub Actions

**Blockers/Concerns:**

- **Migration automation:** Production DB migrations currently manual. Need automated approach before schema changes become frequent (recommend addressing in Phase 2 Plan 1 or 2).
- **Jow.fr scraping approach:** Need to inspect live Jow.fr structure to determine if Playwright visual testing is required or if HTTP + Cheerio suffices (noted in STATE.md, to be explored in Phase 2 research).

**Phase 1 Complete:**

All 7 success criteria from ROADMAP.md Phase 1 met:

1. ✅ Next.js 15 + TypeScript + Tailwind configured
2. ✅ shadcn/ui initialized
3. ✅ Biome (linter/formatter) configured
4. ✅ Postgres schema with Drizzle ORM (recipes, ingredients, recipe_ingredients)
5. ✅ Database integration tests with Vitest
6. ✅ VPS deployed with Docker + Nginx + SSL (mealprep.jimmydore.fr)
7. ✅ GitHub Actions CI/CD auto-deploys on push to main

**Capstone verified:** Full stack works end-to-end from code push to production DB query to browser.

---
*Phase: 01-project-foundation-database-deployment*
*Completed: 2026-02-08*
