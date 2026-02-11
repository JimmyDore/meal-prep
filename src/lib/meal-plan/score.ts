/**
 * Scoring functions for meal plan evaluation.
 *
 * All functions are pure, deterministic, and side-effect free.
 * The scoring system evaluates how well a set of MealSlots matches
 * weekly macro targets, producing a 0-100 percentage score.
 */

import type { MacroTargets } from "@/lib/nutrition";
import {
  DAILY_BALANCE_CEILING,
  DEFAULT_WEIGHTS,
  DEVIATION_CEILING,
  MATCH_THRESHOLDS,
  MEAL_COVERAGE_RATIO,
} from "./constants";
import type {
  MacroScore,
  MatchColor,
  MealSlot,
  PlanScore,
  ScoringWeights,
  WeeklyMacroTargets,
} from "./types";

// ---------------------------------------------------------------------------
// scaleDailyTargets
// ---------------------------------------------------------------------------

/**
 * Scale full-day macro targets to reflect only the planned meals.
 *
 * The meal plan covers lunch + dinner (2 meals), not breakfast/snacks.
 * This scales the TDEE-based daily targets by MEAL_COVERAGE_RATIO so the
 * algorithm and UI compare against what these 2 meals should realistically
 * deliver (~65% of total daily intake).
 *
 * @param daily - Full-day macro targets from TDEE calculation
 * @param ratio - Fraction of daily intake covered (defaults to MEAL_COVERAGE_RATIO)
 * @returns Scaled daily targets rounded to nearest integer
 */
export function scaleDailyTargets(
  daily: MacroTargets,
  ratio: number = MEAL_COVERAGE_RATIO,
): MacroTargets {
  return {
    calories: Math.round(daily.calories * ratio),
    protein: Math.round(daily.protein * ratio),
    carbs: Math.round(daily.carbs * ratio),
    fat: Math.round(daily.fat * ratio),
  };
}

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
// calculateDailyBalanceScore
// ---------------------------------------------------------------------------

/**
 * Calculate a 0-100 score for how close each day's calories are to the daily target.
 *
 * Uses the mean absolute percentage error (MAPE) of per-day calorie totals
 * relative to the daily calorie target. This measures both evenness AND
 * absolute level — "all days equally under-target" scores poorly, unlike
 * a pure evenness metric (CV) which would give it 100.
 *
 * Days with no meals (e.g., incomplete plans with < 14 slots) are excluded
 * from the calculation to avoid penalizing partial plans for empty days.
 *
 * @param slots - All meal slots in the plan
 * @param dailyCalorieTarget - Target calories per day (e.g., weeklyTarget / 7)
 * @param ceiling - MAPE at which score hits 0 (default: DAILY_BALANCE_CEILING)
 * @returns Score from 0 to 100
 */
export function calculateDailyBalanceScore(
  slots: MealSlot[],
  dailyCalorieTarget: number,
  ceiling: number = DAILY_BALANCE_CEILING,
): number {
  if (slots.length === 0) return 100;
  if (dailyCalorieTarget === 0) return 100;

  // Sum calories per day
  const dailyCals = new Map<number, number>();
  for (const slot of slots) {
    dailyCals.set(
      slot.dayIndex,
      (dailyCals.get(slot.dayIndex) ?? 0) + slot.recipe.perServing.calories,
    );
  }

  const values = [...dailyCals.values()];
  if (values.length <= 1) return 100;

  // Mean absolute percentage error from daily target
  const mape =
    values.reduce((sum, v) => sum + Math.abs(v - dailyCalorieTarget) / dailyCalorieTarget, 0) /
    values.length;

  // Linear score: MAPE=0 -> 100, MAPE>=ceiling -> 0
  const raw = (1 - mape / ceiling) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ---------------------------------------------------------------------------
// scorePlan
// ---------------------------------------------------------------------------

/**
 * Score a complete meal plan against weekly macro targets.
 *
 * Returns an overall weighted score (0-100) combining individual macro scores,
 * variety score, and daily calorie balance score.
 * Uses DEFAULT_WEIGHTS if custom weights not provided.
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
  const dailyCalorieTarget = weeklyTargets.calories / 7;
  const dailyBalance = calculateDailyBalanceScore(slots, dailyCalorieTarget);

  const overall = Math.round(
    proteinScore.percentage * weights.protein +
      caloriesScore.percentage * weights.calories +
      carbsScore.percentage * weights.carbs +
      fatScore.percentage * weights.fat +
      variety * weights.variety +
      dailyBalance * weights.dailyBalance,
  );

  return {
    overall,
    protein: proteinScore,
    carbs: carbsScore,
    fat: fatScore,
    calories: caloriesScore,
    variety,
    dailyBalance,
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
