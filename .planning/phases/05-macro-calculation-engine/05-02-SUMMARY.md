---
phase: 05-macro-calculation-engine
plan: 02
subsystem: api
tags: [nutrition, unit-conversion, macros, french-cooking, recipe-calculation]

# Dependency graph
requires:
  - phase: 05-macro-calculation-engine/01
    provides: RecipeMacrosResult type in types.ts
  - phase: 02
    provides: DB schema with recipeIngredients (quantity, unit) and ingredients (macros per 100g)
provides:
  - convertToGrams function for all 18 French cooking units
  - calculateRecipeMacros function for per-serving macro computation
  - PIECE_WEIGHTS lookup table with 33 French ingredient entries
affects: [05-macro-calculation-engine/03, 05-macro-calculation-engine/04]

# Tech tracking
tech-stack:
  added: []
  patterns: [accent-stripping via NFD normalization, naive French singularization for plural matching, longest-key-first substring matching]

key-files:
  created:
    - src/lib/nutrition/unit-conversion.ts
    - src/lib/nutrition/recipe-macros.ts
    - src/lib/nutrition/__tests__/unit-conversion.test.ts
    - src/lib/nutrition/__tests__/recipe-macros.test.ts
  modified: []

key-decisions:
  - "Naive singularization (strip trailing s) for French plural ingredient matching"
  - "Both accented and unaccented unit variants stored in UNIT_TO_GRAMS for direct O(1) lookup"
  - "RecipeMacrosResult imported from types.ts (plan 05-01) rather than defining locally"
  - "PIECE_WEIGHTS sorted longest-key-first to prevent partial matches (citron vert > citron)"

patterns-established:
  - "Accent stripping: NFD decomposition + diacritical mark regex for case-insensitive French matching"
  - "Confidence scoring: high >= 90%, medium >= 70%, low < 70% converted ingredients"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 5 Plan 02: Unit Conversion and Recipe Macros Summary

**convertToGrams for 18 French cooking units with accent-stripped piece lookups, calculateRecipeMacros with confidence scoring and 54 passing tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T22:52:09Z
- **Completed:** 2026-02-09T22:55:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Unit conversion module handles all 18 DB unit strings (Kilogramme, Litre, Cuillere a soupe, Piece, etc.)
- PIECE_WEIGHTS lookup for 33 French ingredients with accent-stripping and French plural singularization
- Recipe macro calculator computes per-serving and total macros with confidence scoring
- 54 comprehensive tests covering units, piece lookups, accents, plurals, edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unit conversion module with tests** - `eeca658` (feat)
2. **Task 2: Create recipe macros calculator with tests** - `c28379b` (feat)

## Files Created/Modified
- `src/lib/nutrition/unit-conversion.ts` - convertToGrams function with UNIT_TO_GRAMS and PIECE_WEIGHTS tables
- `src/lib/nutrition/recipe-macros.ts` - calculateRecipeMacros function with confidence scoring
- `src/lib/nutrition/__tests__/unit-conversion.test.ts` - 39 tests for unit conversion
- `src/lib/nutrition/__tests__/recipe-macros.test.ts` - 15 tests for recipe macros

## Decisions Made
- **Naive French singularization:** Strip trailing 's' from each word to handle plurals (e.g. "tomates cerises" -> "tomate cerise"). Simple but effective for the ingredient names in the DB.
- **Dual accent storage in UNIT_TO_GRAMS:** Both "Cuillere a soupe" and "Cuillere a soupe" stored as keys for O(1) direct lookup, plus fallback accent-stripping loop for unexpected variants.
- **Import RecipeMacrosResult from types.ts:** Plan 05-01 already created the type; no need for local definition.
- **Longest-key-first PIECE_WEIGHTS sorting:** Prevents "citron" from matching before "citron vert" or "tomate" before "tomate cerise".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added French plural singularization for PIECE_WEIGHTS matching**
- **Found during:** Task 1 (unit conversion tests)
- **Issue:** "Tomates cerises" did not match PIECE_WEIGHTS key "tomate cerise" because substring matching fails when plurals add 's' (e.g. "tomates " does not contain "tomate c")
- **Fix:** Added `singularize()` helper that strips trailing 's' from each word, applied to ingredient name before PIECE_WEIGHTS lookup
- **Files modified:** src/lib/nutrition/unit-conversion.ts
- **Verification:** Test "Tomates cerises" -> 45g (3 * 15) now passes
- **Committed in:** eeca658 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for correct plural ingredient matching. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- convertToGrams and calculateRecipeMacros ready for integration in plan 05-03 (barrel index)
- All 18 DB unit strings verified against live database query
- Confidence scoring ready for plan 05-04 (integration with real recipe data)

---
*Phase: 05-macro-calculation-engine*
*Completed: 2026-02-09*
