---
phase: 06-basic-meal-plan-generation
plan: 03
subsystem: algorithm
tags: [hill-climbing, meal-plan, optimization, seeded-random, tdd]

# Dependency graph
requires:
  - phase: 06-01
    provides: "scorePlan, types (ScoredRecipe, MealSlot, PlanResult, GenerationParams), constants (TOTAL_MEALS, DEFAULT_ITERATIONS)"
provides:
  - "generateMealPlan function -- core algorithm for weekly meal plan generation"
  - "Random-restart hill-climbing with local single-swap optimization"
  - "Confidence-based recipe pool filtering"
  - "16 comprehensive unit tests for generation algorithm"
affects: [06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Random-restart hill-climbing with local optimization for combinatorial selection"
    - "Seeded random parameter injection for deterministic testing"
    - "Confidence-based pre-filtering with fallback to full pool"

key-files:
  created:
    - "src/lib/meal-plan/generate.ts"
    - "src/lib/meal-plan/__tests__/generate.test.ts"
  modified:
    - "src/lib/meal-plan/index.ts"

key-decisions:
  - "sampleUnique clamps index to prevent out-of-bounds when random() returns 1.0"
  - "ZERO_SCORE constant extracted to avoid throwaway PlanResult allocations"
  - "Local optimization uses greedy first-improvement strategy per slot (not best-of-all)"

patterns-established:
  - "Algorithm accepts random function parameter for deterministic test seeding"
  - "ZERO_SCORE constant as initial comparator for hill-climbing"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 6 Plan 03: Meal Plan Generation Algorithm Summary

**Random-restart hill-climbing algorithm with seeded PRNG, confidence filtering, and local single-swap optimization producing 14-slot weekly plans**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T10:36:10Z
- **Completed:** 2026-02-10T10:39:58Z
- **Tasks:** 3 (RED-GREEN-REFACTOR TDD cycle)
- **Files modified:** 3

## Accomplishments
- generateMealPlan selects 14 unique recipes optimized for weekly macro targets
- Algorithm: N random candidate plans (default 50), keep best, then local single-swap optimization (default 3 passes)
- Seeded random function makes algorithm fully deterministic in tests
- Pre-filters low-confidence recipes, falls back to full pool with warning when filtered pool too small
- Warnings for empty pool, small pool (<14), limited variety (<30)
- 16 test cases covering generation, slot assignment, determinism, edge cases, confidence filtering, and local optimization

## Task Commits

Each TDD phase was committed atomically:

1. **RED: Write failing tests** - `78c4bc0` (test)
2. **GREEN: Implement algorithm** - `a9c2d64` (feat)
3. **REFACTOR: Extract ZERO_SCORE constant** - `b650747` (refactor)

## Files Created/Modified
- `src/lib/meal-plan/generate.ts` - Core generation algorithm (186 lines): sampleUnique, assignSlots, emptyResult, generateMealPlan
- `src/lib/meal-plan/__tests__/generate.test.ts` - 16 test cases (404 lines) with makeRecipe helper, seededRandom PRNG, perfect/partial/empty pool scenarios
- `src/lib/meal-plan/index.ts` - Updated barrel export to include generateMealPlan

## Decisions Made
- **sampleUnique index clamping**: The seeded LCG PRNG can return exactly 1.0, causing `Math.floor(1.0 * length) = length` (out of bounds). Fixed with `Math.min(idx, length - 1)` clamp.
- **ZERO_SCORE constant**: Extracted from emptyResult to avoid creating throwaway PlanResult objects when initializing bestScore.
- **Greedy first-improvement**: Local optimization accepts the first improving swap per slot and moves on, rather than evaluating all possible swaps. This keeps complexity manageable while still demonstrably improving scores.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed sampleUnique out-of-bounds when random() returns 1.0**
- **Found during:** GREEN phase (tests failing with fewer slots than expected)
- **Issue:** LCG PRNG `s / 0x7fffffff` can equal 1.0, causing `splice(array.length, 1)` to return empty array
- **Fix:** Added `Math.min(idx, copy.length - 1)` clamp to sampleUnique
- **Files modified:** src/lib/meal-plan/generate.ts
- **Verification:** All 16 tests pass with correct slot counts
- **Committed in:** a9c2d64 (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness with any PRNG that can return 1.0. No scope creep.

## Issues Encountered
None beyond the PRNG edge case documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- generateMealPlan is ready for integration with the server action (Plan 04)
- All 43 meal-plan module tests pass (27 score + 16 generate)
- Barrel export updated -- consumers can import via `@/lib/meal-plan`
- No blockers for Plan 04 (server action) or Plan 05 (UI)

---
*Phase: 06-basic-meal-plan-generation*
*Completed: 2026-02-10*
