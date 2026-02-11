/**
 * Meal plan generation algorithm using random-restart hill-climbing
 * with local optimization.
 *
 * All functions are pure (no DB, no React, no side effects).
 * The `random` parameter enables deterministic testing via seeded PRNG.
 */

import {
  DEFAULT_ITERATIONS,
  DEFAULT_MAX_LOCAL_PASSES,
  MEALS_PER_DAY,
  TOTAL_MEALS,
} from "./constants";
import { scorePlan } from "./score";
import type { GenerationParams, MealSlot, PlanResult, PlanScore, ScoredRecipe } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sample `count` unique elements from `array` using the provided random function.
 * Uses Fisher-Yates partial shuffle for O(count) performance.
 */
function sampleUnique<T>(array: T[], count: number, random: () => number): T[] {
  const copy = [...array];
  const result: T[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    // Clamp index to valid range (handles random() returning exactly 1.0)
    const idx = Math.min(Math.floor(random() * copy.length), copy.length - 1);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Assign recipes to meal slots: dayIndex 0-6, mealType alternating midi/soir.
 * Slot i: dayIndex = floor(i / MEALS_PER_DAY), mealType = midi if i%2==0 else soir.
 */
function assignSlots(recipes: ScoredRecipe[]): MealSlot[] {
  return recipes.map((recipe, i) => ({
    dayIndex: Math.floor(i / MEALS_PER_DAY),
    mealType: (i % MEALS_PER_DAY === 0 ? "midi" : "soir") as "midi" | "soir",
    recipe,
  }));
}

/** Score representing zero match -- used for empty plans and as initial best. */
const ZERO_SCORE: PlanScore = {
  overall: 0,
  protein: { target: 0, actual: 0, delta: 0, percentage: 0 },
  carbs: { target: 0, actual: 0, delta: 0, percentage: 0 },
  fat: { target: 0, actual: 0, delta: 0, percentage: 0 },
  calories: { target: 0, actual: 0, delta: 0, percentage: 0 },
  variety: 0,
  dailyBalance: 0,
};

/**
 * Return an empty PlanResult with score 0, used for edge cases.
 */
function emptyResult(warnings: string[]): PlanResult {
  return { slots: [], score: ZERO_SCORE, warnings };
}

// ---------------------------------------------------------------------------
// Main algorithm
// ---------------------------------------------------------------------------

/**
 * Generate a meal plan using random-restart hill-climbing with local optimization.
 *
 * Algorithm:
 * 1. Validate inputs and produce warnings for edge cases
 * 2. Pre-filter recipe pool (exclude low confidence macros)
 * 3. Random restart phase: generate N random candidate plans, keep best
 * 4. Local optimization phase: try single-swaps to improve the best plan
 * 5. Return result with slots, score, and warnings
 */
export function generateMealPlan(params: GenerationParams): PlanResult {
  const {
    weeklyTargets,
    recipePool,
    iterations = DEFAULT_ITERATIONS,
    maxLocalPasses = DEFAULT_MAX_LOCAL_PASSES,
    random = Math.random,
  } = params;

  const warnings: string[] = [];

  // -------------------------------------------------------------------------
  // Step 1: Validate inputs
  // -------------------------------------------------------------------------

  if (recipePool.length === 0) {
    warnings.push("Seulement 0 recettes disponibles, le plan sera incomplet");
    return emptyResult(warnings);
  }

  if (recipePool.length < 14) {
    warnings.push(`Seulement ${recipePool.length} recettes disponibles, le plan sera incomplet`);
  }

  if (recipePool.length < 30) {
    warnings.push("Moins de 30 recettes disponibles, la variete sera limitee");
  }

  // -------------------------------------------------------------------------
  // Step 2: Pre-filter by confidence
  // -------------------------------------------------------------------------

  const filtered = recipePool.filter((r) => r.confidence !== "low");
  let pool: ScoredRecipe[];

  if (filtered.length < TOTAL_MEALS && recipePool.length >= TOTAL_MEALS) {
    // Filtered pool too small but original has enough -- fall back with warning
    pool = recipePool;
    warnings.push("Certaines recettes ont des macros peu fiables");
  } else if (filtered.length >= TOTAL_MEALS) {
    // Enough high/medium confidence recipes
    pool = filtered;
  } else {
    // Both filtered and original are small -- use whatever we have
    pool = recipePool;
  }

  const sampleSize = Math.min(TOTAL_MEALS, pool.length);

  // -------------------------------------------------------------------------
  // Step 3: Random restart phase
  // -------------------------------------------------------------------------

  let bestSlots: MealSlot[] = [];
  let bestScore: PlanScore = ZERO_SCORE;

  for (let i = 0; i < iterations; i++) {
    const sampled = sampleUnique(pool, sampleSize, random);
    const slots = assignSlots(sampled);
    const score = scorePlan(slots, weeklyTargets);

    if (score.overall > bestScore.overall) {
      bestSlots = slots;
      bestScore = score;
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Local optimization phase (single-swap hill climbing)
  // -------------------------------------------------------------------------

  for (let pass = 0; pass < maxLocalPasses; pass++) {
    let improved = false;

    for (let slotIdx = 0; slotIdx < bestSlots.length; slotIdx++) {
      const usedIds = new Set(bestSlots.map((s) => s.recipe.id));

      for (const candidate of pool) {
        if (usedIds.has(candidate.id)) continue;

        // Try swapping
        const newSlots = bestSlots.map((s, j) => (j === slotIdx ? { ...s, recipe: candidate } : s));
        const newScore = scorePlan(newSlots, weeklyTargets);

        if (newScore.overall > bestScore.overall) {
          bestSlots = newSlots;
          bestScore = newScore;
          improved = true;
          break; // Move to next slot after first improvement
        }
      }
    }

    if (!improved) break; // No improvement in this pass -- stop early
  }

  // -------------------------------------------------------------------------
  // Step 5: Build result
  // -------------------------------------------------------------------------

  return {
    slots: bestSlots,
    score: bestScore,
    warnings,
  };
}
