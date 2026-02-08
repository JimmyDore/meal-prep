---
phase: 03-recipe-catalogue
plan: 01
subsystem: ui, database
tags: [shadcn, drizzle, next-image, react-server-components, pagination]

# Dependency graph
requires:
  - phase: 02-recipe-data-pipeline
    provides: recipes/ingredients/tags schema and seeded data in DB
provides:
  - getRecipes paginated query with search + tag filter + nested tags
  - getRecipeById with nested ingredients and tags
  - getAllTags sorted alphabetically
  - RecipeWithTags type for downstream components
  - RecipeCard server component (image, title, time, difficulty, tags)
  - MacroBadge component for macro value display
  - 7 shadcn/ui components (card, badge, input, button, pagination, skeleton, separator)
  - Next.js image domains for static.jow.fr and img.jow.fr
affects: [03-02, 03-03, 05-03, 06-03]

# Tech tracking
tech-stack:
  added: [shadcn/ui components via CLI]
  patterns: [batch tag fetching for N+1 avoidance, Drizzle relational queries with nested with, escapeIlike for safe search]

key-files:
  created:
    - src/db/queries/recipes.ts
    - src/db/queries/tags.ts
    - src/components/recipe-card.tsx
    - src/components/macro-badge.tsx
    - src/components/ui/card.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/input.tsx
    - src/components/ui/button.tsx
    - src/components/ui/pagination.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/separator.tsx
  modified:
    - next.config.ts
    - src/db/index.ts

key-decisions:
  - "Batch tag fetch via inArray (not N+1 per recipe) for getRecipes performance"
  - "Drizzle relational query API (db.query.recipes.findFirst with nested with) for getRecipeById"
  - "Fixed db singleton typing to preserve schema type through global cache (createDb factory pattern)"
  - "AND logic for tag filters via exists subquery per tag slug"

patterns-established:
  - "Query layer pattern: src/db/queries/*.ts exports typed async functions"
  - "Batch relation loading: fetch main rows, then batch-fetch related rows via inArray, merge in app code"
  - "Server component pattern: RecipeCard has no 'use client', Link wraps entire card for navigation"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 3 Plan 1: Foundation Summary

**Drizzle query layer with paginated search/filter, RecipeCard/MacroBadge server components, 7 shadcn/ui components, and Next.js image domain config**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T17:50:59Z
- **Completed:** 2026-02-08T17:54:30Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Installed 7 shadcn/ui components (card, badge, input, button, pagination, skeleton, separator) as shared UI library
- Created getRecipes with pagination, title search (ilike with special char escaping), and AND-logic tag filtering via exists subqueries, with batch tag fetching to avoid N+1
- Created getRecipeById with nested ingredients (including macros) and tags via Drizzle relational queries
- Created getAllTags sorted alphabetically for filter UI
- Built RecipeCard server component displaying image, title, time, difficulty, and up to 3 tag badges
- Built MacroBadge component for colored macro value pills (protein/carbs/fat/calories)
- Configured Next.js image remotePatterns for static.jow.fr and img.jow.fr

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn/ui components + configure Next.js image domains** - `ddd56ac` (chore)
2. **Task 2: Create DB query functions and shared UI components** - `59de949` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/db/queries/recipes.ts` - getRecipes (paginated, search, tag filter, nested tags), getRecipeById (full detail), RecipeWithTags type
- `src/db/queries/tags.ts` - getAllTags sorted alphabetically
- `src/components/recipe-card.tsx` - RecipeCard server component with Image, title, time, difficulty, tag badges
- `src/components/macro-badge.tsx` - MacroBadge colored pill component for P/C/F/cal values
- `src/components/ui/*.tsx` - 7 shadcn/ui components (card, badge, input, button, pagination, skeleton, separator)
- `next.config.ts` - Added images.remotePatterns for static.jow.fr and img.jow.fr
- `src/db/index.ts` - Fixed db typing to preserve schema through global singleton (createDb factory)

## Decisions Made
- **Batch tag fetching via inArray:** getRecipes fetches paginated recipes first, then batch-fetches all tags for those recipe IDs in a single query using inArray, avoiding N+1 queries
- **Drizzle relational query for detail:** getRecipeById uses db.query.recipes.findFirst with nested `with` for ingredients and tags, leveraging Drizzle's relational query API
- **AND logic for tag filters:** Each tag slug creates a separate exists subquery, combined with AND -- a recipe must have ALL selected tags to match
- **Fixed db singleton typing:** The global db cache was typed as generic `ReturnType<typeof drizzle>` which lost schema information. Introduced createDb factory function so the type preserves schema, enabling db.query.recipes access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed db singleton typing to preserve schema type**
- **Found during:** Task 2 (creating getRecipeById)
- **Issue:** `db.query.recipes` caused TS2339 because globalForDb.db was typed as `ReturnType<typeof drizzle>` (no schema), and the union with the schema-aware drizzle call lost type info
- **Fix:** Introduced createDb() factory function, typed Database as its ReturnType, and used it for the global singleton cache
- **Files modified:** src/db/index.ts
- **Verification:** `pnpm tsc --noEmit` passes, db.query.recipes.findFirst resolves correctly
- **Committed in:** 59de949 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Applied Biome formatting to shadcn/ui auto-generated components**
- **Found during:** Task 2 (running pnpm check)
- **Issue:** shadcn CLI generates components with formatting that doesn't match project's Biome config (import ordering, quote style, semicolons)
- **Fix:** Ran pnpm check --write which auto-formatted all UI components to project standards
- **Files modified:** src/components/ui/*.tsx, src/app/api/recipes/upload/route.ts
- **Verification:** `pnpm biome check` passes on all modified files
- **Committed in:** 59de949 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for type safety and code consistency. No scope creep.

## Issues Encountered
None - shadcn CLI installed cleanly, all queries and components compiled on first pass after the db typing fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Query layer ready for catalogue page (03-02) to call getRecipes with pagination/search/filter
- RecipeCard and MacroBadge ready for use in recipe grid
- shadcn/ui components ready for search bar, tag filter pills, pagination controls, loading skeletons
- Image domains configured for recipe photos from Jow CDN
- getRecipeById ready for recipe detail page (03-03)

---
*Phase: 03-recipe-catalogue*
*Completed: 2026-02-08*
