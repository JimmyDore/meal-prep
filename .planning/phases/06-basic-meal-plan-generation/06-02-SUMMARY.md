---
phase: 06-basic-meal-plan-generation
plan: 02
subsystem: database
tags: [drizzle, postgresql, pgEnum, jsonb, transactions, relational-queries]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Drizzle ORM setup, recipes/ingredients/user tables"
  - phase: 04-user-profiles
    provides: "user table with auth, user_profiles for userId FK"
provides:
  - "mealPlans table for storing generated plans"
  - "mealPlanSlots table for 14 per-plan recipe assignments"
  - "mealTypeEnum pgEnum (midi, soir)"
  - "getAllRecipesWithIngredients query for recipe pool"
  - "saveMealPlan transactional insert"
  - "getUserMealPlan fetch most recent plan"
affects: [06-03-generation-algorithm, 06-04-server-action, 06-05-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["pgEnum for meal type constraint", "transactional multi-table insert", "relational query with nested joins"]

key-files:
  created:
    - "src/db/schema/meal-plans.ts"
    - "src/db/queries/meal-plans.ts"
    - "drizzle/0003_oval_the_santerians.sql"
  modified:
    - "src/db/schema/index.ts"
    - "src/db/schema/recipes.ts"
    - "src/db/schema/auth.ts"

key-decisions:
  - "mealPlanSlots relation added to recipesRelations and mealPlans to userRelations for bidirectional traversal"
  - "real() for overallScore consistent with existing nutrient column pattern"

patterns-established:
  - "Transactional plan+slots insert: single transaction wraps parent insert + batch child insert with returning()"
  - "Relational query for getUserMealPlan: nested with for slots->recipe in one query"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 06 Plan 02: DB Schema & Queries Summary

**Two meal plan tables (mealPlans, mealPlanSlots) with mealType pgEnum, Drizzle migration, and three query functions (recipe pool fetch, transactional save, most-recent load)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T10:29:07Z
- **Completed:** 2026-02-10T10:32:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- mealPlans table with userId FK (cascade), weekStart, overallScore, macroSummary JSONB
- mealPlanSlots table with planId FK (cascade), dayIndex, mealType enum, recipeId FK, macrosSnapshot JSONB
- getAllRecipesWithIngredients: single relational query returns all recipes with nested ingredient data
- saveMealPlan: transactional insert of plan + batch slots with returning()
- getUserMealPlan: fetches most recent plan ordered by createdAt desc with slots and recipe data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create meal plan schema and migration** - `67e3e35` (feat)
2. **Task 2: Create meal plan query functions** - `6bffd71` (feat)

## Files Created/Modified
- `src/db/schema/meal-plans.ts` - mealTypeEnum, mealPlans table, mealPlanSlots table, relations
- `src/db/queries/meal-plans.ts` - getAllRecipesWithIngredients, saveMealPlan, getUserMealPlan
- `drizzle/0003_oval_the_santerians.sql` - Migration creating enum + 2 tables + 3 FKs
- `src/db/schema/index.ts` - Added meal-plans export
- `src/db/schema/recipes.ts` - Added mealPlanSlots to recipesRelations
- `src/db/schema/auth.ts` - Added mealPlans to userRelations

## Decisions Made
- Added mealPlanSlots to recipesRelations and mealPlans to userRelations for bidirectional Drizzle relational queries (needed for getUserMealPlan to traverse slots->recipe)
- Used real() for overallScore, consistent with existing pattern for rating/nutrients columns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema and queries ready for the generation algorithm (plan 03)
- getAllRecipesWithIngredients provides the recipe pool data the algorithm needs
- saveMealPlan ready for the server action (plan 04) to persist generated plans
- getUserMealPlan ready for the UI (plan 05) to display saved plans

---
*Phase: 06-basic-meal-plan-generation*
*Completed: 2026-02-10*
