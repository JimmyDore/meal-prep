---
phase: 01-project-foundation-database-deployment
plan: 02
subsystem: database
tags: [drizzle, postgres, schema, migrations, seed, uuid, soft-delete]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Drizzle ORM client singleton, Docker Compose with Postgres, project scaffolding"
provides:
  - "Drizzle schema: recipes, ingredients, recipe_ingredients, tags, recipe_tags tables"
  - "Versioned SQL migration in drizzle/"
  - "Idempotent seed script with 3 recipes, 10 ingredients, 4 tags"
  - "Reusable idColumn and timestamps column helpers"
affects: [01-03, 01-05, 02-scraper, 03-meal-planning, 06-algorithm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable column spreads (idColumn, timestamps) for consistent UUID + soft delete across all tables"
    - "Junction tables with unique constraints for many-to-many relationships"
    - "Idempotent seed using onConflictDoNothing with early exit pattern"
    - "Standalone DB connection in seed script (avoids @t3-oss/env-nextjs dependency)"

key-files:
  created:
    - src/db/schema/common.ts
    - src/db/schema/recipes.ts
    - src/db/schema/ingredients.ts
    - src/db/schema/tags.ts
    - src/db/schema/index.ts
    - src/db/seed.ts
    - drizzle/0000_nifty_shatterstar.sql
  modified:
    - src/db/index.ts
    - tsconfig.json

key-decisions:
  - "Used real() for macro nutrients (sufficient precision, smaller storage than doublePrecision)"
  - "Seed script creates standalone postgres+drizzle connection (not importing from src/db/index.ts which requires Next.js runtime)"
  - "Junction table names are explicit: recipe_ingredients, recipe_tags (not abbreviated)"

patterns-established:
  - "Spread ...idColumn and ...timestamps in every pgTable definition"
  - "Foreign keys via uuid().references(() => table.id) pattern"
  - "Unique constraints on junction tables via table callback: (t) => [unique().on(t.col1, t.col2)]"
  - "Seed idempotency: onConflictDoNothing + check returning values for early exit"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 1 Plan 2: Database Schema Summary

**Drizzle schema with 5 tables (recipes, ingredients, tags + 2 junction tables), versioned SQL migration, and idempotent seed with 3 French recipes and macro nutrient data**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T14:06:32Z
- **Completed:** 2026-02-08T14:10:50Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Complete domain schema: recipes, ingredients, tags with junction tables for many-to-many relationships
- All tables use UUID primary keys, soft delete (deletedAt), and timestamp tracking
- Versioned SQL migration generated with correct snake_case column names
- Idempotent seed populates 3 recipes, 10 ingredients with real macro data, 4 tags, and all relationships

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Drizzle schema for recipes, ingredients, and tags** - `44a0405` (feat)
2. **Task 2: Generate migrations, apply to dev DB, and create seed script** - `990c845` (feat)
3. **Bug fix: Add vitest/globals types to tsconfig** - `d0b4d23` (fix, Rule 1 deviation)

## Files Created/Modified

- `src/db/schema/common.ts` - Reusable idColumn (UUID) and timestamps (createdAt, updatedAt, deletedAt)
- `src/db/schema/recipes.ts` - recipes table with jowId, title, imageUrl, jowUrl, cookTimeMin, originalPortions
- `src/db/schema/ingredients.ts` - ingredients table with macro nutrients + recipe_ingredients junction table
- `src/db/schema/tags.ts` - tags table with name/slug + recipe_tags junction table
- `src/db/schema/index.ts` - Barrel export of all schema modules
- `src/db/index.ts` - Updated to import and bind schema to Drizzle client
- `src/db/seed.ts` - Idempotent seed with 3 recipes, 10 ingredients, 4 tags
- `drizzle/0000_nifty_shatterstar.sql` - Generated SQL migration (64 lines)
- `tsconfig.json` - Added vitest/globals types for test file compilation

## Decisions Made

- **real() for macro nutrients:** Sufficient precision for nutritional data (cal, protein, carbs, fat per 100g). Smaller storage than doublePrecision.
- **Standalone DB connection in seed:** Seed script imports dotenv/config and creates its own postgres+drizzle connection instead of importing from src/db/index.ts, which depends on @t3-oss/env-nextjs (Next.js runtime not available in tsx).
- **Explicit junction table names:** Used recipe_ingredients and recipe_tags (not abbreviated) for clarity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added vitest/globals types to tsconfig.json**
- **Found during:** Verification (pnpm tsc --noEmit)
- **Issue:** Pre-existing test files (from 01-01) use Vitest globals (describe, it, expect) but tsconfig had no type reference, causing tsc compilation errors
- **Fix:** Added `"types": ["vitest/globals"]` to compilerOptions in tsconfig.json
- **Files modified:** tsconfig.json
- **Verification:** pnpm tsc --noEmit passes cleanly
- **Committed in:** d0b4d23

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for TypeScript compilation. No scope creep.

## Issues Encountered

None - all operations (migration generation, migration application, seed execution) succeeded on first attempt.

## User Setup Required

None - no external service configuration required. Docker Compose dev DB handles everything locally.

## Next Phase Readiness

- Database schema is complete and populated with sample data
- All foreign keys and junction tables verified with real queries
- Schema barrel export ready for import in any server-side code
- Migration workflow established: generate -> commit -> migrate on deploy

---
*Phase: 01-project-foundation-database-deployment*
*Completed: 2026-02-08*
