---
phase: 02-recipe-data-pipeline
plan: 04
subsystem: api
tags: [next.js, drizzle, zod, upsert, bearer-auth, rest-api]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Extended recipe schema with 11 Jow columns, ingredients.name unique constraint, PIPELINE_TOKEN env validation"
provides:
  - "POST /api/recipes/upload endpoint with auth, validation, and transactional upsert"
  - "Recipe upsert by jowId with all related entities (ingredients, tags, junctions)"
affects: ["02-05", "pipeline-integration"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bearer token auth pattern for pipeline endpoints"
    - "Drizzle transactional upsert with onConflictDoUpdate"
    - "Zod inline schema validation for API request bodies"
    - "Slugify helper with French diacritics normalization"

key-files:
  created:
    - "src/app/api/recipes/upload/route.ts"
  modified:
    - ".env.example"

key-decisions:
  - "Tag upsert targets slug (not name) to handle case-insensitive deduplication"
  - "PIPELINE_TOKEN updated to secure random 64-char hex for local dev"

patterns-established:
  - "API route auth: extract Bearer token, compare against env var, return 401"
  - "API validation: Zod safeParse, return 400 with flatten() details"
  - "DB upsert: Drizzle transaction wrapping insert().onConflictDoUpdate().returning()"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 2 Plan 4: Recipe Upload Endpoint Summary

**POST /api/recipes/upload with bearer auth, Zod validation, and Drizzle transactional upsert for recipes, ingredients, and tags**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T16:07:51Z
- **Completed:** 2026-02-08T16:12:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POST /api/recipes/upload endpoint fully functional with bearer token authentication
- Zod validation rejects malformed payloads with descriptive field-level errors
- Transactional upsert: recipe by jowId, ingredients by name, tags by slug, all junction tables
- Endpoint is idempotent -- same payload twice produces same result without duplicates
- French diacritics handled in tag slugification (normalize NFD, strip combining marks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create recipe upload API endpoint with auth, validation, and upsert** - `fb1625f` (feat)
2. **Task 2: Add PIPELINE_TOKEN to local .env and production environment** - `7d855b4` (chore)

## Files Created/Modified
- `src/app/api/recipes/upload/route.ts` - POST endpoint: auth, validation, transactional upsert (227 lines)
- `.env.example` - Updated PIPELINE_TOKEN placeholder to descriptive value

## Decisions Made
- **Tag upsert targets slug instead of name:** The seed data contained tag "Rapide" while the pipeline sends "rapide". Using `onConflictDoUpdate` targeting `tags.slug` (the normalized form) ensures case-insensitive tag deduplication. The `name` field is updated to the latest version on conflict.
- **PIPELINE_TOKEN upgraded to secure random hex:** Replaced `dev-pipeline-token` placeholder with 64-char cryptographically random hex string for local development. Production VPS will need its own token set in the environment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tag upsert slug conflict causing 500 error**
- **Found during:** Task 1 (curl idempotency testing)
- **Issue:** Plan specified `onConflictDoUpdate` targeting `tags.name`, but seed data has tag "Rapide" (capital R) while pipeline sends "rapide" (lowercase). Different names produce identical slugs, causing a unique constraint violation on `tags_slug_unique` that wasn't caught by the name-based conflict resolution.
- **Fix:** Changed conflict target from `tags.name` to `tags.slug`, and added `name: tagName` to the update set so the name also gets refreshed on conflict.
- **Files modified:** `src/app/api/recipes/upload/route.ts`
- **Verification:** Tested inserting tag "rapide" when "Rapide" already exists in DB -- upsert succeeds, no duplicate, slug-based dedup works correctly.
- **Committed in:** fb1625f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness. Without it, any tag with case variation from seed data would cause a 500 error. No scope creep.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
- **Production VPS:** Set `PIPELINE_TOKEN` environment variable to a secure random string (e.g., `openssl rand -hex 32`). This is required for the pipeline upload step to authenticate against the endpoint.

## Next Phase Readiness
- Upload endpoint ready to receive enriched recipe data from the pipeline
- Pipeline scripts (scrape, enrich) can now POST to this endpoint with bearer auth
- All success criteria verified: auth (401), validation (400), upsert (201), idempotency (same ID on repeat)

---
*Phase: 02-recipe-data-pipeline*
*Completed: 2026-02-08*
