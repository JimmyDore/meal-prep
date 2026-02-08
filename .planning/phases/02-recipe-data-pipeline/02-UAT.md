---
status: complete
phase: 02-recipe-data-pipeline
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-02-08T18:00:00Z
updated: 2026-02-08T18:21:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Scraper discovers Jow recipe URLs
expected: `tsx scripts/pipeline/scrape.ts --dry-run` discovers recipe URLs from Jow.fr sitemaps (should report 3000+ URLs)
result: pass

### 2. Scraper produces valid recipe JSONL
expected: Scraper creates `data/scraped/jow-recipes.jsonl` with recipes containing title, ingredients, jowUrl, imageUrl, portions, and timing
result: pass
verified: 521+ recipes in JSONL, first recipe has all required fields (title, description, jowId, jowUrl, imageUrl, cookTimeMin, prepTimeMin, totalTimeMin, difficulty, instructions, ingredients with quantity/unit, jowNutritionPerServing)

### 3. Scraper skips already-scraped recipes on re-run
expected: Re-running the same scrape command skips recipes already in the JSONL (logs "skipping" or shows 0 new recipes scraped)
result: pass
verified: Log shows "Found 13 already-scraped recipes" and scraper continues appending only new recipes (479 -> 521 during test session)

### 4. Enricher adds macros per ingredient
expected: Enricher reads scraped JSONL, calls Claude CLI, outputs enriched JSONL at `data/enriched/` with per-ingredient macros (protein, carbs, fat, calories per 100g)
result: pass
verified: 5 enriched recipes in jow-recipes-enriched.jsonl, each with enrichedIngredients containing proteinPer100g, carbsPer100g, fatPer100g, caloriesPer100g, confidence level

### 5. Upload API rejects unauthenticated requests
expected: POST to /api/recipes/upload without bearer token returns 401 Unauthorized
result: pass
verified: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/recipes/upload -H "Content-Type: application/json" -d '{}'` returned 401

### 6. Upload persists recipes to database
expected: Upload script uploads enriched recipes to the local API and they appear in the database with jowId, ingredients with macros
result: pass
verified: 8 recipes in DB (3 seed + 5 pipeline), 30 ingredients with macro values (e.g. Poulet blanc: 31g protein, Parmesan: 38g protein), pipeline recipes have difficulty, cuisine, jow_nutrition_per_serving

### 7. Upload is idempotent (no duplicates)
expected: Re-running the same upload produces upserts (not duplicate rows) -- recipe count stays the same
result: pass
verified: Re-ran `tsx scripts/pipeline/upload.ts --limit 5`, all 5 uploaded successfully, DB count remained at 8 (same UUIDs returned)

### 8. Pipeline schema has all Jow columns
expected: The recipes table in Postgres has the extended columns: description, prep_time_min, total_time_min, difficulty, instructions, nutri_score, rating, rating_count, cuisine, category, jow_nutrition_per_serving
result: pass
verified: `\d recipes` shows all 20 columns including all 11 Jow extension columns (description, prep_time_min, total_time_min, difficulty, instructions, nutri_score, rating, rating_count, cuisine, category, jow_nutrition_per_serving)

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps
