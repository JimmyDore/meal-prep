/**
 * Meal plan module -- public API.
 *
 * Provides scoring and generation functions for weekly meal plans
 * optimized against macro nutrient targets.
 *
 * Usage:
 *   import { generateMealPlan, scorePlan, dailyToWeekly, matchColor } from "@/lib/meal-plan";
 */

export {
  DAILY_BALANCE_CEILING,
  DAYS_PER_WEEK,
  DEFAULT_ITERATIONS,
  DEFAULT_MAX_LOCAL_PASSES,
  DEFAULT_WEIGHTS,
  DEVIATION_CEILING,
  EXCLUDED_CATEGORIES,
  MATCH_THRESHOLDS,
  MEAL_COVERAGE_RATIO,
  MEALS_PER_DAY,
  TOTAL_MEALS,
} from "./constants";
export { generateMealPlan } from "./generate";
export {
  calculateDailyBalanceScore,
  calculateVarietyScore,
  dailyToWeekly,
  macroScore,
  matchColor,
  scaleDailyTargets,
  scorePlan,
  sumMacros,
} from "./score";

export type {
  GenerationParams,
  MacroScore,
  MatchColor,
  MealSlot,
  PlanResult,
  PlanScore,
  ScoredRecipe,
  ScoringWeights,
  WeeklyMacroTargets,
} from "./types";
