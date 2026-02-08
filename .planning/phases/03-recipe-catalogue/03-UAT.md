---
status: diagnosed
phase: 03-recipe-catalogue
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md
started: 2026-02-08T19:00:00Z
updated: 2026-02-08T19:22:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Recipe Catalogue Grid
expected: Navigate to /recipes. You see a responsive grid of recipe cards with images, titles, cooking time, difficulty, and tag badges. Pagination controls appear at the bottom.
result: pass

### 2. Search Bar
expected: Type a recipe name in the search bar. Results filter in real-time (with ~300ms debounce). Clear the search to see all recipes again.
result: pass

### 3. Tag Filtering
expected: Click one or more tag badges to filter recipes. Only recipes matching ALL selected tags appear. Click again to deselect. Page resets to 1 on filter change.
result: pass

### 4. Pagination
expected: Navigate between pages using pagination controls. Page number updates in URL. Search/filter state is preserved when changing pages.
result: pass

### 5. Recipe Detail Page
expected: Click a recipe card. You see the detail page with: large image, title, tags, time/difficulty/servings, macros per serving (protein, carbs, fat, calories), ingredient list with per-100g macros, and a "Voir sur Jow" link.
result: pass

### 6. Jow External Link
expected: On a recipe detail page, click the "Voir sur Jow" link. It opens the original Jow recipe page in a new browser tab.
result: pass

### 7. Recipe Not Found
expected: Navigate to /recipes/99999 (a non-existent ID). You see a custom 404 page with a "Retour au catalogue" link that navigates back to /recipes.
result: pass

### 8. Home Page Redirect
expected: Navigate to /. You are automatically redirected to /recipes.
result: pass

### 9. Loading Skeleton
expected: On a slow connection or hard refresh of /recipes, you briefly see a skeleton loading state with 12 placeholder cards before content loads.
result: pass

### 10. Code Pushed to Remote
expected: All Phase 3 commits are pushed to the remote main branch and visible on GitHub.
result: pass

### 11. CI/CD Pipeline Passes
expected: After push, GitHub Actions CI/CD pipeline runs successfully (lint, type-check, build, deploy). Check via `gh run list`.
result: pass

### 12. Production Deployment Live
expected: The recipe catalogue is accessible on mealprep.jimmydore.fr/recipes in production with HTTPS. Recipe cards display with images from Jow CDN.
result: issue
reported: "mealprep.jimmydore.fr/recipes returns 500 Internal Server Error. Production DB likely missing Phase 2 schema migrations and has no recipe data uploaded."
severity: blocker

### 13. Production Recipe Detail
expected: Click a recipe on mealprep.jimmydore.fr/recipes. The detail page loads with image, macros, ingredients, and Jow link.
result: skipped
reason: Blocked by Test 12 — production catalogue returns 500

## Summary

total: 13
passed: 11
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Recipe catalogue is accessible on mealprep.jimmydore.fr/recipes in production with HTTPS"
  status: failed
  reason: "User reported: mealprep.jimmydore.fr/recipes returns 500 Internal Server Error. Production DB likely missing Phase 2 schema migrations and has no recipe data uploaded."
  severity: blocker
  test: 12
  root_cause: "3 cascading issues: (1) PIPELINE_TOKEN env var missing from docker-compose.prod.yml app service — createEnv() throws on every request at import time. (2) Migration 0001_crazy_husk.sql never applied to prod DB — 11 columns missing from recipes table. (3) No recipe data in prod DB — pipeline only ran locally."
  artifacts:
    - path: "docker-compose.prod.yml"
      issue: "app environment missing PIPELINE_TOKEN"
    - path: "src/lib/env.ts"
      issue: "PIPELINE_TOKEN validated as required z.string().min(1) at import time"
    - path: ".github/workflows/deploy.yml"
      issue: "no migration step in deploy script"
    - path: "drizzle/0001_crazy_husk.sql"
      issue: "migration never applied to production DB"
  missing:
    - "Add PIPELINE_TOKEN to docker-compose.prod.yml environment"
    - "Create PIPELINE_TOKEN in .env on VPS"
    - "Apply migration 0001_crazy_husk.sql on production DB"
    - "Add migration step to CI/CD deploy script"
    - "Run pipeline against production or seed prod DB"
  debug_session: ".planning/debug/prod-500-recipes.md"
