---
phase: 02-recipe-data-pipeline
plan: 03
subsystem: pipeline
tags: [claude-cli, enrichment, macronutrients, zod, jsonl, structured-output]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Pipeline types (ScrapedRecipe, EnrichedIngredient), Zod schemas with macro bounds, JSONL utils, logger"
provides:
  - "Claude CLI enrichment wrapper with structured JSON output and Zod validation"
  - "Per-ingredient macro estimation (protein/carbs/fat/calories per 100g)"
  - "Cross-validation against Jow per-serving nutrition data"
  - "Resumable enrichment pipeline entry point with --limit cost control"
affects: [02-05, 05-macro-calculation, 06-meal-plan-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Claude CLI invocation via execSync with temp files for shell safety"
    - "Structured output via --json-schema + --output-format json (result in structured_output field)"
    - "--tools '' flag to prevent tool use and keep single-turn for cost control"
    - "Bounds check + retry pattern for LLM output validation"

key-files:
  created:
    - "scripts/pipeline/lib/claude-enricher.ts"
    - "scripts/pipeline/prompts/macro-enrichment.md"
    - "scripts/pipeline/enrich.ts"
  modified: []

key-decisions:
  - "Claude CLI --tools '' instead of --max-turns 1 (flag does not exist in claude v2.1.37) to prevent tool use and keep responses single-turn"
  - "structured_output field (not result) contains --json-schema output in --output-format json mode"
  - "Temp files for system prompt and JSON schema (not just recipe data) to avoid all shell expansion issues"
  - "--model sonnet for cost efficiency on nutritional estimation tasks"

patterns-established:
  - "Claude CLI wrapper: temp file for input, --json-schema for structure, parse structured_output from JSON output"
  - "Bounds check + retry: validate LLM output, retry once, flag for human review on persistent aberration"
  - "Cross-validation: compare LLM estimates against known reference data when available"
  - "Resumability: build Set of processed IDs from existing output file, skip already-processed items"

# Metrics
duration: 6min
completed: 2026-02-08
---

# Phase 2 Plan 3: Claude CLI Enrichment Summary

**Claude CLI macro enrichment with --json-schema structured output, Zod bounds validation (0-100g macros, 0-900 cal), retry on aberrant values, cross-validation against Jow nutrition, and resumable JSONL pipeline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T16:06:43Z
- **Completed:** 2026-02-08T16:12:50Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Claude CLI enrichment wrapper calls `claude -p` with `--json-schema` for per-ingredient macro estimation (protein/carbs/fat/calories per 100g)
- Zod validation enforces bounds (macros 0-100, calories 0-900), bounds check verifies macro sum <= 100g and calorie formula consistency
- Enrichment entry point supports `--limit N` for cost-controlled testing, `--no-delay` for automation, and full resumability via jowId set
- Cross-validation compares Claude estimates against Jow per-serving nutrition when available, flagging >30% divergence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Claude CLI enrichment wrapper and prompt** - `79000e9` (feat)
2. **Task 2: Create enrichment entry point script** - `393f180` (feat)

## Files Created/Modified

- `scripts/pipeline/prompts/macro-enrichment.md` - System prompt instructing Claude to estimate macros per 100g using USDA/CIQUAL references for French ingredients
- `scripts/pipeline/lib/claude-enricher.ts` - Claude CLI wrapper with enrichRecipe(), enrichRecipeWithRetry(), crossValidateNutrition()
- `scripts/pipeline/enrich.ts` - Main entry point with CLI flags, resumability, progress logging, and cost awareness delay

## Decisions Made

- **--tools "" instead of --max-turns 1:** The `--max-turns` flag does not exist in Claude CLI v2.1.37. Using `--tools ""` prevents tool use, keeping responses single-turn for cost control.
- **structured_output field:** Claude CLI `--output-format json` with `--json-schema` returns structured data in `structured_output` (not `result`). Parser handles both fields as fallback.
- **All dynamic content via temp files:** System prompt, JSON schema, and recipe data all written to temp files and read via `cat` / `$()` to eliminate shell expansion risks entirely.
- **--model sonnet:** Nutritional estimation is a knowledge task well-suited to Sonnet; Opus unnecessary for this use case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] --max-turns flag does not exist in Claude CLI v2.1.37**
- **Found during:** Task 1 (Claude CLI wrapper creation)
- **Issue:** Plan specifies `--max-turns 1` flag, but `claude --help` shows no such flag
- **Fix:** Used `--tools ""` to disable all tool use, preventing multi-turn interactions and achieving equivalent cost control
- **Files modified:** scripts/pipeline/lib/claude-enricher.ts
- **Verification:** Claude CLI call completes in single API round-trip
- **Committed in:** 79000e9 (Task 1 commit)

**2. [Rule 3 - Blocking] --system-prompt-file flag does not exist in Claude CLI v2.1.37**
- **Found during:** Task 1 (Claude CLI wrapper creation)
- **Issue:** Plan specifies `--system-prompt-file` but CLI only has `--system-prompt` (string)
- **Fix:** Write system prompt to temp file, read with `$(cat "tmpfile")` in command
- **Files modified:** scripts/pipeline/lib/claude-enricher.ts
- **Verification:** System prompt correctly passed to Claude CLI, enrichment returns valid results
- **Committed in:** 79000e9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking - CLI flag differences)
**Impact on plan:** Both fixes adapt to actual Claude CLI flags. Same functionality achieved. No scope creep.

## Issues Encountered

- Shell expansion of JSON schema curly braces in single quotes produced harmless warnings. Fixed by writing JSON schema to temp file instead of inline in command string.

## User Setup Required

None - no external service configuration required. Claude CLI must already be authenticated (standard dev environment).

## Next Phase Readiness

- Enrichment pipeline ready to process scraped recipes once 02-02 (scraper) populates `data/scraped/jow-recipes.jsonl`
- End-to-end integration test planned in 02-05
- The `_flags` field on enriched recipes enables downstream filtering of low-confidence data

---
*Phase: 02-recipe-data-pipeline*
*Completed: 2026-02-08*
