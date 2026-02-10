/**
 * Scoring functions for meal plan evaluation.
 *
 * All functions are pure, deterministic, and side-effect free.
 * The scoring system evaluates how well a set of MealSlots matches
 * weekly macro targets, producing a 0-100 percentage score.
 */

import type { MacroTargets } from "@/lib/nutrition";
import { DEFAULT_WEIGHTS, DEVIATION_CEILING, MATCH_THRESHOLDS } from "./constants";
import type {
  MacroScore,
  MatchColor,
  MealSlot,
  PlanScore,
  ScoringWeights,
  WeeklyMacroTargets,
} from "./types";

// ---------------------------------------------------------------------------
// dailyToWeekly
// ---------------------------------------------------------------------------

/**
 * Convert daily macro targets to weekly totals by multiplying each field by 7.
 */
export function dailyToWeekly(daily: MacroTargets): WeeklyMacroTargets {
  return {
    calories: daily.calories * 7,
    protein: daily.protein * 7,
    carbs: daily.carbs * 7,
    fat: daily.fat * 7,
  };
}

// ---------------------------------------------------------------------------
// macroScore
// ---------------------------------------------------------------------------

/**
 * Compute a 0-100 score for a single macro nutrient.
 *
 * The score penalizes both over and under target equally (symmetric deviation).
 * - 0% deviation = 100
 * - 10% deviation = 50
 * - 20%+ deviation = 0
 */
export function macroScore(actual: number, target: number): MacroScore {
  if (target === 0) {
    return {
      target: 0,
      actual,
      delta: actual,
      percentage: actual === 0 ? 100 : 0,
    };
  }

  const delta = actual - target;
  const deviationRatio = Math.abs(delta) / target;
  const percentage = Math.max(
    0,
    Math.min(100, Math.round((1 - deviationRatio / DEVIATION_CEILING) * 100)),
  );

  return { target, actual, delta, percentage };
}

// ---------------------------------------------------------------------------
// sumMacros
// ---------------------------------------------------------------------------

/**
 * Sum per-serving macros across all meal slots.
 */
export function sumMacros(slots: MealSlot[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const slot of slots) {
    calories += slot.recipe.perServing.calories;
    protein += slot.recipe.perServing.protein;
    carbs += slot.recipe.perServing.carbs;
    fat += slot.recipe.perServing.fat;
  }

  return { calories, protein, carbs, fat };
}

// ---------------------------------------------------------------------------
// calculateVarietyScore
// ---------------------------------------------------------------------------

/**
 * Calculate a 0-100 variety score for the plan.
 *
 * Penalizes consecutive slots (sorted by dayIndex then mealType) that share
 * the same cuisine or category. If cuisine/category is null, skip that
 * comparison (no penalty).
 *
 * Score = 100 - (duplicateCount / (totalSlots - 1)) * 100, clamped to 0-100.
 */
export function calculateVarietyScore(slots: MealSlot[]): number {
  if (slots.length <= 1) {
    return 100;
  }

  // Sort by dayIndex, then mealType ("midi" < "soir" alphabetically)
  const sorted = [...slots].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.mealType.localeCompare(b.mealType);
  });

  let duplicateCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].recipe;
    const curr = sorted[i].recipe;

    const sameCuisine =
      prev.cuisine !== null && curr.cuisine !== null && prev.cuisine === curr.cuisine;
    const sameCategory =
      prev.category !== null && curr.category !== null && prev.category === curr.category;

    if (sameCuisine || sameCategory) {
      duplicateCount++;
    }
  }

  const raw = 100 - (duplicateCount / (sorted.length - 1)) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ---------------------------------------------------------------------------
// scorePlan
// ---------------------------------------------------------------------------

/**
 * Score a complete meal plan against weekly macro targets.
 *
 * Returns an overall weighted score (0-100) combining individual macro scores
 * and variety score. Uses DEFAULT_WEIGHTS if custom weights not provided.
 */
export function scorePlan(
  slots: MealSlot[],
  weeklyTargets: WeeklyMacroTargets,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): PlanScore {
  const totals = sumMacros(slots);

  const proteinScore = macroScore(totals.protein, weeklyTargets.protein);
  const caloriesScore = macroScore(totals.calories, weeklyTargets.calories);
  const carbsScore = macroScore(totals.carbs, weeklyTargets.carbs);
  const fatScore = macroScore(totals.fat, weeklyTargets.fat);
  const variety = calculateVarietyScore(slots);

  const overall = Math.round(
    proteinScore.percentage * weights.protein +
      caloriesScore.percentage * weights.calories +
      carbsScore.percentage * weights.carbs +
      fatScore.percentage * weights.fat +
      variety * weights.variety,
  );

  return {
    overall,
    protein: proteinScore,
    carbs: carbsScore,
    fat: fatScore,
    calories: caloriesScore,
    variety,
  };
}

// ---------------------------------------------------------------------------
// matchColor
// ---------------------------------------------------------------------------

/**
 * Map a score (0-100) to a color classification.
 * green >= 85, yellow >= 65, red < 65.
 */
export function matchColor(score: number): MatchColor {
  if (score >= MATCH_THRESHOLDS.green) return "green";
  if (score >= MATCH_THRESHOLDS.yellow) return "yellow";
  return "red";
}
