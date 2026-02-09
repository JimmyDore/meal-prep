# Phase 5: Macro Calculation Engine - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Calculate TDEE from user profile (weight, height, age, sex, activity level, sport sessions), derive weekly/daily macro targets (proteins, carbs, fats) adjusted for the user's goal (sèche/masse/maintien), and compute real macros per serving for each recipe. Display targets to the user. Recipe selection/plan generation is Phase 6.

</domain>

<decisions>
## Implementation Decisions

### TDEE & sport adjustment
- Weekly average model — same daily calorie target every day (no day-by-day variation)
- Sport sessions contribute to a weekly activity multiplier, spread evenly across 7 days
- Aligns with meal prep use case: consistent portions, same meals can repeat
- **Research needed:** Mifflin-St Jeor vs Harris-Benedict, sport type MET values, activity multiplier calculation

### Macro split strategy
- Default ratios per goal BUT ratios vary based on user profile (not flat percentages)
- Example: protein target in g/kg of body weight (e.g. 1.8g/kg for sèche vs 1.2g/kg for maintien), not just "40% protein"
- User can override the computed defaults in settings
- **Research needed:** Evidence-based P/G/L ratios by goal and body composition, protein per kg recommendations

### Display
- Simple summary card: daily calories + P/G/L in grams — clean and minimal
- Expandable "how was this calculated?" detail view explaining the formula, inputs, and intermediate values (TDEE base, sport adjustment, goal modifier)
- Scientific transparency without cluttering the main view

### Per-serving macro calculation
- Compute real macros per portion from ingredient macros/100g and recipe quantities
- **Research needed:** How ingredient quantities map to grams (unit conversion), handling partial/missing data

### Claude's Discretion
- Data quality indicators for recipes with missing/approximate ingredient macros
- Exact formula choice (Mifflin-St Jeor vs alternatives) based on research
- Rounding strategy for displayed values
- Detail view layout and information hierarchy

</decisions>

<specifics>
## Specific Ideas

- "You need to do heavy research on the web on how to compute all of this" — the user expects evidence-based formulas, not arbitrary ratios
- Default macro ratios should feel personalized (vary by profile), not one-size-fits-all per goal
- The computation feeds directly into Phase 6 recipe selection — targets must be in a format the algorithm can match against

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-macro-calculation-engine*
*Context gathered: 2026-02-09*
