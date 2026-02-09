---
phase: 05-macro-calculation-engine
plan: 03
subsystem: api
tags: [tdee, macros, nutrition, pure-functions, mifflin-st-jeor, met]

# Dependency graph
requires:
  - phase: 05-01
    provides: "types.ts (UserProfile, SportSession, BMRResult, TDEEResult, MacroTargets), constants.ts (multipliers, MET values, goal adjustments), calculateBMR"
  - phase: 05-02
    provides: "convertToGrams, calculateRecipeMacros for barrel re-export"
provides:
  - "calculateTDEE with hybrid lifestyle+sport approach"
  - "calculateMacroTargets with goal-based calorie/macro derivation"
  - "index.ts barrel export for full nutrition public API"
affects: [05-04, 06-meal-planning-algorithm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hybrid TDEE: base activity multiplier + MET sport addition (subtract 1 MET for resting)"
    - "Protein from g/kg body weight (not flat percentage)"
    - "Carbs as remainder after protein and fat, with 50g minimum safety"

key-files:
  created:
    - "src/lib/nutrition/tdee.ts"
    - "src/lib/nutrition/macro-targets.ts"
    - "src/lib/nutrition/index.ts"
    - "src/lib/nutrition/__tests__/tdee.test.ts"
    - "src/lib/nutrition/__tests__/macro-targets.test.ts"
  modified: []

key-decisions:
  - "Hybrid TDEE approach avoids double-counting by subtracting 1 MET from sport calculations"
  - "Weekly sport calories divided by 7 for daily average (not per-day tracking)"
  - "Minimum 50g carbs safety check reduces fat allocation when protein+fat exceed calorie budget"

patterns-established:
  - "Barrel export pattern: index.ts re-exports all public functions and types from submodules"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 5 Plan 3: TDEE and Macro Targets Summary

**Hybrid TDEE calculation (lifestyle multiplier + MET sport addition) and goal-based macro targets with g/kg protein and 50g minimum carbs safety**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T22:58:54Z
- **Completed:** 2026-02-09T23:01:45Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- calculateTDEE using hybrid approach: base lifestyle multiplier + MET-based sport calorie addition spread across 7 days
- calculateMacroTargets with evidence-based g/kg protein per goal, fat percentage allocation, and carbs as remainder
- Safety check enforcing minimum 50g carbs by reallocating from fat budget
- index.ts barrel export providing clean public API for the entire nutrition module (5 functions, 6 types)
- 23 new unit tests (11 TDEE + 12 macro-targets), bringing nutrition module total to 87

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TDEE calculation with tests** - `ecfae41` (feat)
2. **Task 2: Create macro targets calculation with tests, plus index.ts** - `604ed60` (feat)

## Files Created/Modified
- `src/lib/nutrition/tdee.ts` - TDEE calculation with hybrid sport adjustment
- `src/lib/nutrition/macro-targets.ts` - Daily macro targets per nutritional goal
- `src/lib/nutrition/index.ts` - Barrel export for nutrition module public API
- `src/lib/nutrition/__tests__/tdee.test.ts` - 11 TDEE unit tests
- `src/lib/nutrition/__tests__/macro-targets.test.ts` - 12 macro targets unit tests

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full BMR -> TDEE -> MacroTargets calculation chain complete and tested
- index.ts barrel export ready for consumption by plan 05-04 (integration/profile connection)
- All 87 nutrition module tests passing

---
*Phase: 05-macro-calculation-engine*
*Completed: 2026-02-09*
