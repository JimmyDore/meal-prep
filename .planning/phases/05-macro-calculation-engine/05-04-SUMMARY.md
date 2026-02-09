---
phase: 05-macro-calculation-engine
plan: 04
subsystem: ui
tags: [dashboard, macros, nutrition, react, server-components, client-components, confidence-scoring]

# Dependency graph
requires:
  - phase: 05-01
    provides: "types.ts (BMRResult, TDEEResult, MacroTargets), calculateBMR"
  - phase: 05-02
    provides: "calculateRecipeMacros with confidence scoring"
  - phase: 05-03
    provides: "calculateTDEE, calculateMacroTargets, index.ts barrel export"
  - phase: 04-03
    provides: "user_profiles, user_sport_activities tables, getFullUserProfile query"
provides:
  - "Macro dashboard page at /dashboard with daily calorie and P/G/L targets"
  - "Expandable calculation detail view (BMR, TDEE, sport, goal breakdown)"
  - "Recipe detail page computed macros per serving with confidence indicator"
  - "Header navigation link to macro dashboard"
affects: [06-meal-planning-algorithm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component page fetches profile + runs calculation chain, passes results to client components"
    - "Confidence indicator pattern: high/medium/low badge with color coding for data quality"
    - "Collapsible detail view for secondary information (useState toggle with chevron)"

key-files:
  created:
    - "src/app/(authenticated)/dashboard/page.tsx"
    - "src/components/macro-dashboard.tsx"
    - "src/components/macro-detail.tsx"
  modified:
    - "src/app/(authenticated)/recipes/[id]/page.tsx"
    - "src/components/header.tsx"

key-decisions:
  - "Server component dashboard page runs full calculation chain (BMR -> TDEE -> MacroTargets) server-side, client components handle display and interactivity only"
  - "Confidence indicator uses three levels: green for high (Donnees fiables), yellow for medium (Valeurs approchees), orange for low (Estimation partielle)"
  - "Both computed macros and Jow JSONB nutrition shown side-by-side on recipe detail for comparison"

patterns-established:
  - "Dashboard page pattern: server fetch + pure calculation + client display components"
  - "Confidence badge pattern: color-coded data quality indicator reusable across UI"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 5 Plan 4: Macro Dashboard and Recipe Macros UI Summary

**Macro dashboard at /dashboard with daily calorie/P/G/L targets and expandable BMR/TDEE breakdown, plus recipe detail computed macros per serving with confidence indicator**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T00:15:00Z
- **Completed:** 2026-02-10T00:20:00Z
- **Tasks:** 3 (2 code + 1 checkpoint)
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- Macro dashboard page showing personalized daily calorie target and P/G/L macro targets in grams with percentage breakdown
- Expandable detail view ("Comment c'est calcule ?") showing full BMR, activity TDEE, sport session calories per activity, goal adjustment chain
- Recipe detail page now shows computed per-serving macros from ingredient data alongside Jow JSONB nutrition, with confidence indicator (high/medium/low)
- Header navigation updated with "Mes macros" link to dashboard
- User-approved via checkpoint verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create macro dashboard page with summary and detail components** - `8460a1c` (feat)
2. **Task 2: Update recipe detail page with computed macros per serving** - `9226131` (feat)
3. **Task 3: Checkpoint human-verify** - approved by user, no commit needed

## Files Created/Modified
- `src/app/(authenticated)/dashboard/page.tsx` - Server component: session check, profile fetch, BMR/TDEE/MacroTargets calculation chain, renders MacroDashboard and MacroDetail
- `src/components/macro-dashboard.tsx` - Client component: daily calorie display, three macro bars (protein blue, carbs amber, fat pink) with grams and percentage
- `src/components/macro-detail.tsx` - Client component: collapsible calculation breakdown showing BMR inputs, activity multiplier, per-sport daily calories, goal adjustment, final distribution
- `src/app/(authenticated)/recipes/[id]/page.tsx` - Updated: added calculateRecipeMacros call with ingredient mapping, displays computed macros with confidence badge, side-by-side with Jow data
- `src/components/header.tsx` - Updated: added "Mes macros" navigation link to /dashboard

## Decisions Made
- Server component dashboard runs full calculation chain server-side for zero client-side computation overhead
- Confidence indicator uses color-coded badges (green/yellow/orange) matching data quality level from calculateRecipeMacros
- Both computed and Jow-sourced nutrition data displayed on recipe detail for transparency and comparison

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (Macro Calculation Engine) fully complete: all 4 plans delivered
- Full nutrition pipeline operational: BMR -> TDEE -> MacroTargets for user profiles, calculateRecipeMacros for recipe detail
- All 87 nutrition module unit tests passing, build clean
- Ready for Phase 6 (Meal Planning Algorithm) which will use these calculations to optimize weekly meal plans against user macro targets

---
*Phase: 05-macro-calculation-engine*
*Completed: 2026-02-10*
