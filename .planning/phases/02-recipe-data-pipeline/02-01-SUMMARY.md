---
phase: 02-recipe-data-pipeline
plan: 01
subsystem: database, pipeline
tags: [drizzle, postgres, zod, jsonl, pipeline, migration]

# Dependency graph
requires:
  - phase: 01-project-foundation-database-deployment
    provides: "Base recipes/ingredients schema, Drizzle ORM setup, Docker Compose Postgres"
provides:
  - "Extended recipes table with 11 new Jow data columns"
  - "Ingredients unique name constraint for upsert"
  - "PIPELINE_TOKEN env validation"
  - "Pipeline Zod validation schemas (scrapedRecipeSchema, enrichedRecipeSchema)"
  - "JSONL async streaming read/write/append/count utilities"
  - "Pipeline step-aware logger with file output"
  - "Pipeline type definitions (ScrapedRecipe, EnrichedRecipe, PipelineStats)"
affects: [02-02-scraper, 02-03-enricher, 02-04-upload-api, 02-05-uploader]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSONL async generator streaming for pipeline data"
    - "Zod schemas with numeric bounds for macro validation"
    - "Pipeline logger with dual console+file output"

key-files:
  created:
    - "drizzle/0001_crazy_husk.sql"
    - "scripts/pipeline/lib/types.ts"
    - "scripts/pipeline/lib/schemas.ts"
    - "scripts/pipeline/lib/jsonl.ts"
    - "scripts/pipeline/lib/logger.ts"
    - "scripts/pipeline/prompts/.gitkeep"
  modified:
    - "src/db/schema/recipes.ts"
    - "src/db/schema/ingredients.ts"
    - "src/lib/env.ts"
    - ".env.example"
    - ".gitignore"

key-decisions:
  - "[02-01]: Applied migration SQL directly to dev DB -- drizzle-kit push interactive prompt not automatable"
  - "[02-01]: PIPELINE_TOKEN added to .env with dev-pipeline-token placeholder"
  - "[02-01]: Zod macro bounds: protein/carbs/fat 0-100 per 100g, calories 0-900 per 100g"

patterns-established:
  - "Pipeline scripts live in scripts/pipeline/lib/ with shared types/schemas/utils"
  - "Pipeline data output lives in data/ (gitignored) in JSONL format"
  - "Pipeline prompts directory at scripts/pipeline/prompts/ for future LLM prompts"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 2 Plan 1: Schema Extension and Pipeline Infrastructure Summary

**Extended recipes table with 11 Jow columns, added ingredients.name unique constraint, and built pipeline shared library (Zod schemas, JSONL streaming, typed logger)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T15:55:32Z
- **Completed:** 2026-02-08T16:02:12Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Extended recipes table with all rich Jow data columns (description, prepTimeMin, totalTimeMin, difficulty, instructions, nutriScore, rating, ratingCount, cuisine, category, jowNutritionPerServing)
- Added unique constraint on ingredients.name enabling upsert-by-name pattern for pipeline uploads
- Created pipeline shared library with Zod validation schemas enforcing macro bounds, async JSONL streaming utilities, and step-aware logger
- Added PIPELINE_TOKEN to env validation for the upload API endpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend database schema and generate migration** - `a52a58c` (feat)
2. **Task 2: Create pipeline scaffolding (schemas, types, JSONL utils, logger)** - `804b968` (feat)

## Files Created/Modified
- `src/db/schema/recipes.ts` - Extended with 11 new columns (description, prepTimeMin, totalTimeMin, difficulty, instructions, nutriScore, rating, ratingCount, cuisine, category, jowNutritionPerServing)
- `src/db/schema/ingredients.ts` - Added unique constraint on name column
- `src/lib/env.ts` - Added PIPELINE_TOKEN to server env validation
- `.env.example` - Added PIPELINE_TOKEN placeholder
- `drizzle/0001_crazy_husk.sql` - Migration adding 11 recipe columns and ingredients unique constraint
- `.gitignore` - Added data/ directory exclusion
- `scripts/pipeline/lib/types.ts` - Pipeline type definitions (ScrapedRecipe, EnrichedRecipe, PipelineStats, etc.)
- `scripts/pipeline/lib/schemas.ts` - Zod validation schemas with macro bounds enforcement
- `scripts/pipeline/lib/jsonl.ts` - Async streaming JSONL read/write/append/count utilities
- `scripts/pipeline/lib/logger.ts` - Step-aware pipeline logger with dual console+file output
- `scripts/pipeline/prompts/.gitkeep` - Placeholder for future LLM prompts directory

## Decisions Made
- Applied migration SQL directly via psql instead of drizzle-kit push -- the interactive TUI prompt for unique constraint on existing data is not automatable in CI-like environments
- Added dev-pipeline-token placeholder in .env for local development; production token to be set on VPS
- Zod macro validation bounds set to protein/carbs/fat: 0-100g per 100g and calories: 0-900 per 100g (covers all realistic food values)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added PIPELINE_TOKEN to .env and .env.example**
- **Found during:** Task 1 (env validation)
- **Issue:** Plan specified adding PIPELINE_TOKEN to env.ts validation but did not mention updating .env/.env.example, which would cause runtime validation failure
- **Fix:** Added PIPELINE_TOKEN=dev-pipeline-token to .env and PIPELINE_TOKEN=changeme to .env.example
- **Files modified:** .env, .env.example
- **Verification:** pnpm tsc --noEmit passes, tests pass
- **Committed in:** a52a58c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for env validation to not break at runtime. No scope creep.

## Issues Encountered
- drizzle-kit push uses an interactive TUI selector for the unique constraint prompt (not a simple yes/no), making it impossible to pipe input. Resolved by applying the generated migration SQL directly via psql, which is equivalent.

## User Setup Required

None - no external service configuration required. PIPELINE_TOKEN is already set in local .env.

## Next Phase Readiness
- Schema extended and migration applied -- upload API can now accept all Jow recipe fields
- Pipeline shared library ready for scraper (02-02), enricher (02-03), and uploader (02-05)
- data/ and prompts/ directories created for pipeline output and LLM prompts

---
*Phase: 02-recipe-data-pipeline*
*Completed: 2026-02-08*
