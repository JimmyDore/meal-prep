---
phase: 02-recipe-data-pipeline
plan: 02
subsystem: pipeline, scraping
tags: [playwright, cheerio, scraping, jow, sitemap, jsonl, rate-limiting]

# Dependency graph
requires:
  - phase: 02-recipe-data-pipeline
    provides: "Pipeline shared library (types, schemas, JSONL utils, logger)"
provides:
  - "Jow.fr sitemap-based recipe URL discovery (3,214 recipes across 26 letter pages)"
  - "Playwright-based recipe detail scraper with __NEXT_DATA__ + JSON-LD merge"
  - "JSONL output at data/scraped/jow-recipes.jsonl with resumability"
  - "Parser module for Jow data extraction (parseNextDataRecipe, parseJsonLdRecipe)"
  - "CLI entry point with --dry-run and --limit flags"
affects: [02-03-enricher, 02-05-uploader]

# Tech tracking
tech-stack:
  added: [playwright 1.58.2, cheerio 1.2.0]
  patterns:
    - "Dual-source scraping: __NEXT_DATA__ primary, JSON-LD secondary, merge for maximum coverage"
    - "Sitemap-first discovery then detail scraping (2-phase approach)"
    - "Append-only JSONL for crash-safe resumability"
    - "Rate limiting with 1.5s delay between all requests"

key-files:
  created:
    - "scripts/pipeline/scrape.ts"
    - "scripts/pipeline/lib/jow-scraper.ts"
    - "scripts/pipeline/lib/jow-parser.ts"
  modified:
    - "package.json"
    - "pnpm-lock.yaml"

key-decisions:
  - "[02-02]: Merge __NEXT_DATA__ and JSON-LD data sources -- __NEXT_DATA__ provides difficulty, direct image URLs, nutrition from nutritionalFacts array; JSON-LD provides rating, cuisine, category"
  - "[02-02]: Difficulty mapped from Jow numbers to labels: 0=Tres facile, 1=Facile, 2=Moyen, 3=Difficile"
  - "[02-02]: Real Jow __NEXT_DATA__ structure: directions[].label for steps, nutritionalFacts[] with {id,amount} for ENERC/FAT/CHOAVL/PRO/FIBTG, cookingTime/preparationTime as direct minute numbers, coversCount for portions, constituents[].name/quantityPerCover/unit.name for ingredients"

patterns-established:
  - "Dual-source data extraction with merge strategy for web scraping"
  - "CLI flags via simple process.argv parsing (no dependency needed)"
  - "Sitemap pagination via letter-based pages for Jow discovery"

# Metrics
duration: 13min
completed: 2026-02-08
---

# Phase 2 Plan 2: Jow Scraper Summary

**Playwright scraper discovers 3,214 Jow.fr recipes via sitemap, extracts rich data by merging __NEXT_DATA__ and JSON-LD sources, and writes resumable JSONL output with 1.5s rate limiting**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-08T16:05:35Z
- **Completed:** 2026-02-08T16:18:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built complete Jow.fr scraper discovering all 3,214 recipes from 26 sitemap letter pages
- Implemented dual-source extraction merging __NEXT_DATA__ (difficulty, image, nutrition, instructions) with JSON-LD (rating, cuisine, category) for maximum data coverage
- Achieved resumable scraping via append-only JSONL pattern -- re-runs skip already-scraped recipes by jowId
- Rich data extracted per recipe: title, description, imageUrl, difficulty, cookTime/prepTime/totalTime, ingredients with quantities/units, step-by-step instructions, nutrition per serving, rating, cuisine, category

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Playwright + Cheerio and create parser module** - `2282cb6` (feat)
2. **Task 2: Create Playwright scraper and scrape entry point** - `b5beea3` (feat)

## Files Created/Modified
- `scripts/pipeline/lib/jow-parser.ts` - Parser module with extractJowId, parseIsoDuration, parseNextDataRecipe (real Jow __NEXT_DATA__ structure), parseJsonLdRecipe (Schema.org fallback)
- `scripts/pipeline/lib/jow-scraper.ts` - Playwright scraping logic: createBrowser, discoverRecipeUrls (sitemap a-z), scrapeRecipeDetail (dual-source merge), delay utility
- `scripts/pipeline/scrape.ts` - Main entry point with Phase 1 (discovery) and Phase 2 (detail scraping), resumability via JSONL jowId check, --dry-run and --limit CLI flags
- `package.json` - Added playwright 1.58.2 and cheerio 1.2.0 dependencies
- `pnpm-lock.yaml` - Lock file updated

## Decisions Made
- Merged __NEXT_DATA__ and JSON-LD data instead of using one as fallback -- __NEXT_DATA__ has unique fields (difficulty, better imageUrl, nutritionalFacts array) while JSON-LD has unique fields (rating, cuisine, category). The merge strategy gives maximum data coverage per recipe.
- Mapped Jow's numeric difficulty to French labels (0=Tres facile, 1=Facile, 2=Moyen, 3=Difficile) since the Zod schema expects string type.
- Documented the real Jow __NEXT_DATA__ structure discovered during implementation: `recipe.directions[].label` for instructions, `recipe.nutritionalFacts[{id,amount}]` for nutrition (ENERC, FAT, CHOAVL, PRO, FIBTG), `recipe.cookingTime`/`preparationTime` as integers (minutes), `recipe.coversCount` for portions, `recipe.constituents[].name` for ingredient names.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parser to match real Jow __NEXT_DATA__ structure**
- **Found during:** Task 2 (initial scrape test)
- **Issue:** The plan assumed `recipe.steps`, `recipe.nutritionalComposition`, `recipe.portions` paths, but real data uses `recipe.directions`, `recipe.nutritionalFacts`, `recipe.coversCount`. Also `difficulty` is a number (not string), causing Zod validation failure.
- **Fix:** Rewrote parseNextDataRecipe to use actual field paths discovered from live data. Added DIFFICULTY_MAP to convert numeric difficulty to string labels. Updated nutrition extraction to handle `nutritionalFacts` array format with `{id, amount}` entries.
- **Files modified:** scripts/pipeline/lib/jow-parser.ts
- **Verification:** 5 recipes scraped successfully with all fields populated
- **Committed in:** b5beea3 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added dual-source merge strategy for scrapeRecipeDetail**
- **Found during:** Task 2 (testing scraped data quality)
- **Issue:** Pure __NEXT_DATA__ extraction missed rating, cuisine, and category fields. Pure JSON-LD missed difficulty, proper imageUrl, and nutriScore. Neither source alone provided complete data.
- **Fix:** Updated scrapeRecipeDetail to extract from both sources and merge: __NEXT_DATA__ as primary with JSON-LD supplementing missing fields (rating, cuisine, category, timing data).
- **Files modified:** scripts/pipeline/lib/jow-scraper.ts
- **Verification:** Merged recipes have difficulty from __NEXT_DATA__ AND rating/cuisine from JSON-LD
- **Committed in:** b5beea3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correct and complete data extraction. The plan acknowledged that "the parser will likely need iteration after seeing real data -- this is expected". No scope creep.

## Issues Encountered
- The exact __NEXT_DATA__ field paths were unknown before implementation (as anticipated in the plan). The first scrape run with debug logging revealed the real structure, which required updating the parser. This was expected and documented in the plan as an iterative process.
- JSON-LD image URLs use a composite `_merge_` pattern that produces background-pattern-merged images rather than clean recipe photos. The __NEXT_DATA__ `imageUrl` field provides the actual recipe image URL directly.

## User Setup Required

None - no external service configuration required. Playwright Chromium browser is installed locally.

## Next Phase Readiness
- Scraper is ready for full 3,214-recipe scrape run (estimated ~80 min at 1.5s/recipe)
- JSONL output at `data/scraped/jow-recipes.jsonl` is ready for enrichment step (02-03)
- Resumability ensures interrupted runs can be continued without re-scraping
- Data quality verified: all required fields present (jowId, title, jowUrl, ingredients, nutrition, instructions)

---
*Phase: 02-recipe-data-pipeline*
*Completed: 2026-02-08*
