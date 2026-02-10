# Phase 6: Basic Meal Plan Generation - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate a weekly meal plan (14 meals: midi + soir x 7 days) optimized for the user's macro targets, using unique recipes per slot (no batch cooking). User can view the plan, see macro fit analysis, regenerate, and save.

Batch cooking, lock/swap, and cooking frequency configuration are Phase 7/8.

</domain>

<decisions>
## Implementation Decisions

### Meal structure
- Fixed 2 meals per day (midi + soir) for Phase 6 — configurable meal count deferred
- No rigid per-meal macro budget — the algorithm optimizes at the weekly level
- Average macros per meal should track toward (daily target / number of meals), but weekly total is what matters
- Weekly target optimization: some days can be higher/lower as long as the week balances out
- 14 unique recipes per plan (no repeats) — batch cooking comes in Phase 7

### Algorithm behavior
- Best effort with match score — algorithm optimizes as close as possible to targets, shows a percentage score (e.g. "92% match")
- No hard failure if targets can't be met — generate the best plan possible and warn about gaps
- Balanced variety: some variety constraint (avoid same cuisine/type back-to-back) but macros take priority
- Dietary preference filtering: DEFERRED — current tag system unreliable, skip for Phase 6. Focus on macro optimization only.
- Regeneration: full reshuffle (completely new selection). Lock/swap comes in Phase 8.

### Plan display
- 7-column grid layout (Lun-Dim columns, 2 rows for midi/soir) — classic weekly planner
- Per-recipe match badge on each card: colored indicator showing how well the recipe fits macro targets
- Daily summary row below each day: actual vs target macros with delta
- Weekly macro summary: progress bars for P/G/L showing actual vs target (consistent with dashboard style)
- Recipe cards expandable in-place (click to show ingredients, macros inline — no navigation to detail page)
- Per-recipe and per-plan: show what's missing in macros (e.g. "-10g protein/jour", "+5g lipides/jour")

### Generation UX
- Dedicated `/plan` page (not on dashboard)
- Generation trigger: Claude's discretion (one-click or preview-then-save)
- Best effort + warning when not enough matching recipes
- Plan is NOT auto-saved — user clicks "Sauvegarder" to persist to DB
- Plan history comes in Phase 7

### Claude's Discretion
- Exact algorithm approach (greedy, constraint-based, random sampling with scoring — Claude researches and picks)
- Loading state design during generation
- Mobile responsive adaptation of the 7-column grid
- Exact match score formula and color thresholds
- Whether to show a dashboard link to /plan page

</decisions>

<specifics>
## Specific Ideas

- Each recipe in the plan should display a macro fit indicator showing how well it matches targets AND what's specifically missing (e.g. "missing 10g protein daily")
- The user wants transparency: not just "good/bad" but precise deltas per macro
- Progress bars for weekly summary (like the existing macro dashboard)
- Expandable cards in the grid — user can see recipe details without leaving the plan page

</specifics>

<deferred>
## Deferred Ideas

- **Cooking frequency configuration** — user decides how many times per week they want to cook, algorithm assigns portions accordingly (Phase 7: batch cooking)
- **Dietary preference filtering** — ingredient-level classification rather than tags, needs data pipeline work (add as todo)
- **Lock/swap meals** — keep selected meals and regenerate the rest (Phase 8: Plan Customization)
- **Configurable algorithm parameters** — user tweaks variety vs macro priority, tolerance thresholds (Phase 8: Plan Customization)
- **Configurable meals per day** — already has mealsPerDay field in profile, wire it up later

</deferred>

---

*Phase: 06-basic-meal-plan-generation*
*Context gathered: 2026-02-10*
