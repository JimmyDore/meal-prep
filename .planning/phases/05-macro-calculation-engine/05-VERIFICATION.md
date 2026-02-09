---
phase: 05-macro-calculation-engine
verified: 2026-02-10T00:21:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 5: Macro Calculation Engine Verification Report

**Phase Goal:** Le systeme calcule automatiquement les targets macros hebdomadaires et les macros reelles par portion de recette

**Verified:** 2026-02-10T00:21:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Le systeme calcule le TDEE de l'utilisateur a partir de son profil via la formule Mifflin-St Jeor et le resultat est affiche | ✓ VERIFIED | Dashboard page calculates BMR with Mifflin-St Jeor (bmr.ts:28-31), then TDEE (tdee.ts:34-70), displays result in macro-dashboard.tsx. All functions substantive and wired. |
| 2 | Le TDEE est ajuste en fonction des seances de sport saisies pour la semaine (plus de sport = plus de calories) | ✓ VERIFIED | calculateTDEE accepts sportSessions array (tdee.ts:46-56), uses MET values from constants (constants.ts:34-42), spreads weekly calories over 7 days. Dashboard fetches sportActivities via getFullUserProfile and passes to calculation chain. MacroDetail component displays per-sport breakdown. |
| 3 | Les targets macros hebdomadaires (proteines, glucides, lipides en grammes) sont calcules selon l'objectif (seche/masse/maintien) et affiches a l'utilisateur | ✓ VERIFIED | calculateMacroTargets applies goal-based adjustments (macro-targets.ts:40), protein from g/kg (line 43), fat percentage (line 47), carbs as remainder (line 52). Dashboard displays daily P/G/L targets with percentages in macro-dashboard.tsx. |
| 4 | Les macros reelles par portion de chaque recette sont calculees a partir des macros par ingredient/100g et des quantites dans la recette | ✓ VERIFIED | calculateRecipeMacros (recipe-macros.ts:43-121) converts units to grams via convertToGrams (unit-conversion.ts:131-174), applies per-100g macros, divides by portions. Recipe detail page (recipes/[id]/page.tsx:47-56) maps ingredients and displays computed macros with confidence indicator (lines 164-188). |

**Score:** 4/4 truths verified (100%)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/nutrition/types.ts` | 6 exported interfaces | ✓ VERIFIED | 89 lines, exports UserProfile, SportSession, BMRResult, TDEEResult, MacroTargets, RecipeMacrosResult. Imported by bmr.ts, tdee.ts, macro-targets.ts, recipe-macros.ts, index.ts. |
| `src/lib/nutrition/constants.ts` | 8 nutrition constants | ✓ VERIFIED | 121 lines, exports all 8 constants with evidence-based values from 2024 Compendium. Imported by tdee.ts, macro-targets.ts. No stubs. |
| `src/lib/nutrition/bmr.ts` | calculateBMR function | ✓ VERIFIED | 35 lines, implements Mifflin-St Jeor equation, exported via index.ts, imported by dashboard page. 10 tests pass. |
| `src/lib/nutrition/tdee.ts` | calculateTDEE function | ✓ VERIFIED | 71 lines, hybrid TDEE approach with MET sport addition, exported via index.ts, imported by dashboard page. 11 tests pass. |
| `src/lib/nutrition/macro-targets.ts` | calculateMacroTargets function | ✓ VERIFIED | 69 lines, goal-based macro derivation with 50g minimum carbs safety, exported via index.ts, imported by dashboard page. 12 tests pass. |
| `src/lib/nutrition/unit-conversion.ts` | convertToGrams function | ✓ VERIFIED | 175 lines, handles 18 French units + 33 piece weights, accent stripping, exported via index.ts, imported by recipe-macros.ts. 39 tests pass. |
| `src/lib/nutrition/recipe-macros.ts` | calculateRecipeMacros function | ✓ VERIFIED | 122 lines, per-serving calculation with confidence scoring, exported via index.ts, imported by recipe detail page. 15 tests pass. |
| `src/lib/nutrition/index.ts` | Barrel export | ✓ VERIFIED | 24 lines, re-exports all 5 functions + 6 types. Imported by dashboard page and recipe detail page. |
| `src/lib/nutrition/__tests__/bmr.test.ts` | BMR unit tests | ✓ VERIFIED | 86 lines, 10 tests covering male/female, edge cases, rounding. All pass. |
| `src/lib/nutrition/__tests__/tdee.test.ts` | TDEE unit tests | ✓ VERIFIED | 166 lines, 11 tests covering activity levels, sport sessions, MET calculations. All pass. |
| `src/lib/nutrition/__tests__/macro-targets.test.ts` | Macro targets tests | ✓ VERIFIED | 168 lines, 12 tests covering all 4 goals, minimum carbs safety. All pass. |
| `src/lib/nutrition/__tests__/unit-conversion.test.ts` | Unit conversion tests | ✓ VERIFIED | 174 lines, 39 tests covering all units, piece lookups, accents. All pass. |
| `src/lib/nutrition/__tests__/recipe-macros.test.ts` | Recipe macros tests | ✓ VERIFIED | 443 lines, 15 tests covering confidence scoring, missing data. All pass. |
| `src/app/(authenticated)/dashboard/page.tsx` | Macro dashboard page | ✓ VERIFIED | 102 lines, server component fetches profile + sportActivities, runs full BMR->TDEE->MacroTargets chain (lines 60-81), passes to MacroDashboard component. Imports from @/lib/nutrition (lines 8-15). |
| `src/components/macro-dashboard.tsx` | Macro summary card | ✓ VERIFIED | 137 lines, displays daily calories + P/G/L bars with percentages, color-coded (blue/amber/rose). No stubs. |
| `src/components/macro-detail.tsx` | Expandable detail view | ✓ VERIFIED | 198 lines, collapsible breakdown showing BMR, activity TDEE, sport calories per activity, goal adjustment, macro split. No stubs. |
| `src/app/(authenticated)/recipes/[id]/page.tsx` | Recipe detail with macros | ✓ VERIFIED | Modified to calculate + display computed macros (lines 47-56, 164-188), imports calculateRecipeMacros (line 11), shows confidence badge + missing ingredients. |

**All 17 artifacts:** EXISTS + SUBSTANTIVE + WIRED

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| dashboard/page.tsx | @/lib/nutrition | imports calculateBMR, calculateTDEE, calculateMacroTargets | ✓ WIRED | Line 8-15 imports, lines 60-81 call all three functions in chain |
| dashboard/page.tsx | db/queries/profiles | imports getFullUserProfile | ✓ WIRED | Line 6 import, line 28 fetches profile + sportActivities |
| recipes/[id]/page.tsx | @/lib/nutrition | imports calculateRecipeMacros | ✓ WIRED | Line 11 import, lines 47-56 map ingredients and calculate, lines 164-188 display result |
| tdee.ts | constants.ts | imports BASE_ACTIVITY_MULTIPLIERS, SPORT_MET_VALUES, DEFAULT_SESSION_DURATION_HOURS | ✓ WIRED | Lines 19-23 import, lines 43-55 use in calculation |
| macro-targets.ts | constants.ts | imports GOAL_CALORIE_ADJUSTMENTS, GOAL_PROTEIN_PER_KG, GOAL_FAT_PERCENTAGE, KCAL_PER_GRAM, MIN_CARBS_GRAMS | ✓ WIRED | Lines 16-22 import, lines 40-59 use in calculation |
| recipe-macros.ts | unit-conversion.ts | imports convertToGrams | ✓ WIRED | Line 13 import, line 72 calls to convert ingredient quantities |
| index.ts | All nutrition modules | re-exports calculateBMR, calculateTDEE, calculateMacroTargets, calculateRecipeMacros, convertToGrams | ✓ WIRED | Lines 11-23 export functions and types |

**All key links:** WIRED (7/7)

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MACRO-01: Systeme calcule le TDEE via Mifflin-St Jeor | ✓ SATISFIED | calculateBMR (bmr.ts) + calculateTDEE (tdee.ts) implemented, tested (21 tests), displayed in dashboard |
| MACRO-02: Systeme ajuste le TDEE avec seances de sport | ✓ SATISFIED | calculateTDEE accepts sportSessions, uses MET values, spreads weekly calories over 7 days (tdee.ts:46-60) |
| MACRO-03: Systeme calcule targets macros hebdomadaires selon objectif | ✓ SATISFIED | calculateMacroTargets implements goal-based adjustments, g/kg protein, fat %, carbs remainder (macro-targets.ts:32-68) |
| MACRO-04: Systeme calcule macros reelles par portion | ✓ SATISFIED | calculateRecipeMacros with unit conversion, confidence scoring (recipe-macros.ts:43-121), displayed on recipe detail page |

**All 4 requirements:** SATISFIED

### Anti-Patterns Found

**None detected.**

Scan results:
- No TODO/FIXME/XXX/HACK comments in nutrition module or UI components
- No placeholder content or empty implementations
- No console.log-only handlers
- All functions return substantive results, not null/empty stubs
- Build passes: `pnpm build` succeeds with no errors
- Tests pass: 87/87 nutrition tests passing

### Human Verification Required

None. All success criteria are verifiable programmatically and have been verified.

The calculation chain is deterministic (pure functions with tests), and the UI integration is server-side with type-safe props. Visual appearance and user flow can be verified via the checkpoint that was already approved in plan 05-04 (user confirmed dashboard displays correctly and recipe detail shows computed macros).

---

## Verification Details

### Calculation Chain Verified

**BMR -> TDEE -> MacroTargets:**
1. Dashboard page fetches user profile + sport activities via `getFullUserProfile(session.user.id)` (dashboard/page.tsx:28)
2. Checks all required fields are non-null (lines 31-39), redirects to profile completion if incomplete
3. Calculates BMR: `calculateBMR({ weight, height, age, sex })` (lines 60-65)
4. Calculates TDEE: `calculateTDEE(bmrResult, { weight, activityLevel }, sportSessions)` (lines 72-76)
   - sportSessions mapped from sportActivities (lines 67-70)
5. Calculates macro targets: `calculateMacroTargets(tdeeResult, { weight, goal })` (lines 78-81)
6. Passes all results to `MacroDashboard` component for display (lines 86-99)

**Recipe Macros:**
1. Recipe detail page fetches recipe via `getRecipeById(id)` (recipes/[id]/page.tsx:38)
2. Maps recipe ingredients to IngredientInput format (lines 47-55)
3. Calculates: `calculateRecipeMacros(ingredientInputs, recipe.originalPortions ?? 1)` (line 56)
4. Displays computed macros with confidence badge (lines 164-188)
5. Shows missing ingredients if any (lines 184-188)
6. Displays Jow original macros side-by-side for comparison (lines 192-202)

### Test Coverage

All 87 nutrition module tests passing:
- **bmr.test.ts:** 10 tests (male/female, edge cases, rounding)
- **tdee.test.ts:** 11 tests (activity levels, sport sessions, MET calculations)
- **macro-targets.test.ts:** 12 tests (all 4 goals, minimum carbs safety, integer outputs)
- **unit-conversion.test.ts:** 39 tests (all 18 units, 33 piece weights, accents, plurals)
- **recipe-macros.test.ts:** 15 tests (confidence scoring, missing data, edge cases)

Test execution: `pnpm test src/lib/nutrition/__tests__ --run` → 87 passed, duration 1.03s

### Build Verification

`pnpm build` succeeds with no type errors or build warnings.

Routes generated:
- `/dashboard` (ƒ Dynamic) — macro dashboard with calculated targets
- `/recipes/[id]` (ƒ Dynamic) — recipe detail with computed macros

TypeScript compilation clean, all imports resolve correctly via barrel export pattern.

---

_Verified: 2026-02-10T00:21:00Z_
_Verifier: Claude (gsd-verifier)_
