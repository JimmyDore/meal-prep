---
phase: 03-recipe-catalogue
plan: 03
subsystem: ui
tags: [next-app-router, dynamic-routes, server-components, lucide-icons, jsonb-parsing, not-found]

# Dependency graph
requires:
  - phase: 03-recipe-catalogue
    provides: getRecipeById query with nested ingredients/tags, MacroBadge component, shadcn/ui components
provides:
  - /recipes/[id] detail page with image, macros, ingredients, Jow link
  - NutritionPerServing interface for jowNutritionPerServing JSONB
  - Custom not-found page for invalid recipe IDs
  - Loading skeleton for detail page
affects: [05-04, 06-03, 08-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [Dynamic route with Promise params (Next.js 16), generateMetadata for dynamic page titles, JSONB typed casting for nutrition data, notFound() for missing resources]

key-files:
  created:
    - src/app/recipes/[id]/page.tsx
    - src/app/recipes/[id]/loading.tsx
    - src/app/recipes/[id]/not-found.tsx

key-decisions:
  - "NutritionPerServing interface defined in page file (typed cast of JSONB)"
  - "generateMetadata for dynamic recipe titles in browser tab"
  - "Ingredient macros shown as muted text below each ingredient name"
  - "Responsive layout: side-by-side on lg, stacked on mobile"

patterns-established:
  - "Dynamic route detail page pattern: await params, fetch by ID, notFound() if missing"
  - "JSONB typed casting pattern: define interface, cast as Type | null, conditional render"
  - "generateMetadata pattern: async function that fetches data for dynamic page title"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 3 Plan 3: Recipe Detail Page Summary

**Recipe detail at /recipes/[id] with image, macros per serving from JSONB, ingredient list with per-100g macros, and Jow external link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T17:55:00Z
- **Completed:** 2026-02-08T18:04:33Z
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 3

## Accomplishments
- Built recipe detail Server Component with all recipe data: image, title, tags, time/difficulty/servings, macros, ingredients, description
- Parsed jowNutritionPerServing JSONB as typed NutritionPerServing interface for macro display
- Ingredient list with quantities and per-100g macro values in muted text
- "Voir sur Jow" external link opens in new tab
- Custom not-found page for invalid recipe IDs
- Loading skeleton matching detail page structure
- generateMetadata for dynamic page titles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create recipe detail page with ingredients, macros, and Jow link** - `ca953fb` (feat)
2. **Task 2: Visual verification** - checkpoint approved by user

## Files Created/Modified
- `src/app/recipes/[id]/page.tsx` - Recipe detail Server Component with image, macros, ingredients, Jow link
- `src/app/recipes/[id]/loading.tsx` - Skeleton loading state for detail page
- `src/app/recipes/[id]/not-found.tsx` - Custom 404 with "Retour au catalogue" link

## Decisions Made
- NutritionPerServing interface for JSONB typed casting (fat, carbs, fiber, protein, calories)
- generateMetadata for dynamic recipe titles in browser tab
- Ingredient per-100g macros displayed as muted helper text
- Responsive: image + meta side-by-side on lg, stacked on mobile

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Recipe catalogue (browse + detail) complete
- Foundation ready for future macro calculation features (Phase 5)
- Recipe detail page can be extended with favorites (Phase 8)

---
*Phase: 03-recipe-catalogue*
*Completed: 2026-02-08*
