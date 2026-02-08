---
phase: 03-recipe-catalogue
plan: 04
subsystem: infra
tags: [docker, env-validation, deploy, drizzle, migrations, zod]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "docker-compose.prod.yml, deploy.yml, env.ts from initial setup"
  - phase: 02-data-pipeline
    provides: "PIPELINE_TOKEN env var introduced for upload auth"
provides:
  - "PIPELINE_TOKEN passed from host .env to app container in production"
  - "PIPELINE_TOKEN optional in env validation (non-pipeline routes unaffected)"
  - "Automated Drizzle migration application on every deploy"
affects: [04-auth, 05-meal-plan, 06-algorithm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sha256-based migration tracking via drizzle_migrations table"
    - "Optional env vars in @t3-oss/env-nextjs with .optional() suffix"
    - "Docker compose env var passthrough with empty default (${VAR:-})"

key-files:
  created: []
  modified:
    - docker-compose.prod.yml
    - src/lib/env.ts
    - .github/workflows/deploy.yml

key-decisions:
  - "PIPELINE_TOKEN uses ${PIPELINE_TOKEN:-} empty default so docker-compose never fails on missing var"
  - "sha256 hash dedup for migration tracking -- each .sql file applied at most once"
  - "sleep 5 after container start to ensure DB is ready before migration psql commands"

patterns-established:
  - "Deploy migration pattern: create tracking table, loop drizzle/*.sql, hash-check before apply"

# Metrics
duration: 1min
completed: 2026-02-08
---

# Phase 3 Plan 4: Fix Production 500 Error (Code-Level Root Causes) Summary

**PIPELINE_TOKEN made optional in env.ts, passed to prod container, and automated Drizzle migration step added to deploy workflow**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-08T18:44:18Z
- **Completed:** 2026-02-08T18:45:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Production app no longer crashes at module load when PIPELINE_TOKEN is missing from container environment
- Non-pipeline routes (/recipes, /recipes/[id]) function without PIPELINE_TOKEN set
- Deploy workflow automatically applies pending Drizzle SQL migrations on every push to main
- Migration tracking table prevents re-applying already-applied migrations

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix docker-compose.prod.yml and env.ts** - `1836b5c` (fix)
2. **Task 2: Add migration step to deploy workflow** - `ea757df` (feat)

## Files Created/Modified
- `docker-compose.prod.yml` - Added PIPELINE_TOKEN env var with empty default to app service
- `src/lib/env.ts` - Made PIPELINE_TOKEN validation optional via .optional() on Zod schema
- `.github/workflows/deploy.yml` - Added .env sourcing, sleep, migration loop with sha256 dedup

## Decisions Made
- Used `${PIPELINE_TOKEN:-}` (empty default) in docker-compose so compose never errors on missing host var -- app-level Zod validation handles the optional logic
- Migration tracking uses sha256 hash of file content (not filename) for dedup -- robust against file renames
- `set -a && source .env && set +a` loads all .env vars into deploy shell for POSTGRES_USER/POSTGRES_DB substitution
- `sleep 5` after `up -d` gives DB container time to become healthy before psql migration commands

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Production VPS still requires PIPELINE_TOKEN to be set in .env for the upload route to accept requests.** This is a VPS-level action (not a code change) tracked in Plan 05.

## Next Phase Readiness
- All 3 code-level root causes of the production 500 error are fixed
- Plan 05 (VPS remediation) can proceed to set PIPELINE_TOKEN on the VPS, run migrations, and verify
- Future schema changes will auto-deploy via the new migration step

---
*Phase: 03-recipe-catalogue*
*Completed: 2026-02-08*
