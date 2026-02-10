/**
 * Meal plan scoring module -- public API.
 *
 * Provides scoring functions to evaluate how well a set of recipes
 * matches weekly macro targets.
 *
 * Usage:
 *   import { scorePlan, dailyToWeekly, matchColor } from "@/lib/meal-plan";
 */

export {
  DAYS_PER_WEEK,
  DEFAULT_ITERATIONS,
  DEFAULT_MAX_LOCAL_PASSES,
  DEFAULT_WEIGHTS,
  DEVIATION_CEILING,
  MATCH_THRESHOLDS,
  MEALS_PER_DAY,
  TOTAL_MEALS,
} from "./constants";
export {
  calculateVarietyScore,
  dailyToWeekly,
  macroScore,
  matchColor,
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
