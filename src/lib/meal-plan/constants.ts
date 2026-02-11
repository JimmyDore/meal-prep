/**
 * Constants for the meal plan scoring and generation module.
 */

import type { ScoringWeights } from "./types";

// ---------------------------------------------------------------------------
// Plan structure
// ---------------------------------------------------------------------------

/** Number of days in a meal plan week. */
export const DAYS_PER_WEEK = 7;

/** Number of meals per day (midi + soir). Extractable constant for Phase 7. */
export const MEALS_PER_DAY = 2;

/** Total meal slots in a weekly plan. */
export const TOTAL_MEALS = DAYS_PER_WEEK * MEALS_PER_DAY;

// ---------------------------------------------------------------------------
// Meal coverage
// ---------------------------------------------------------------------------

/**
 * Fraction of total daily energy expenditure covered by the planned meals.
 *
 * The meal plan only generates lunch (midi) and dinner (soir) -- two meals.
 * Breakfast, snacks, and other eating occasions are NOT planned.
 * Standard nutritional guidance: lunch ~35% + dinner ~30% = ~65% of daily intake.
 *
 * This ratio scales the full-day TDEE macro targets down to what the 2 planned
 * meals should collectively deliver. Without this scaling, the algorithm targets
 * 100% of daily needs with only 2 meals, making targets structurally unreachable
 * (median recipe is ~470 kcal/serving, so 14 meals = ~6600 kcal vs ~18000 target).
 */
export const MEAL_COVERAGE_RATIO = 0.65;

// ---------------------------------------------------------------------------
// Recipe filtering
// ---------------------------------------------------------------------------

/**
 * Recipe categories excluded from meal plan generation.
 *
 * The meal plan generates lunch and dinner -- proper meals.
 * These categories are snacks, appetizers, drinks, desserts, condiments,
 * or side dishes that should not appear as standalone main meals.
 */
export const EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set([
  "Snacks",
  "Cocktail",
  "Dessert sans cuisson",
  "Gâteau",
  "Dips",
  "Planches/assemblage",
  "Apéro à partager",
  "Boisson chaude",
  "Boisson mixée",
  "Condiment salé",
  "Condiment sucré",
  "Pâte",
  "Accompagnement légumes",
  "Accompagnement féculents",
  "Cookie",
  "Brownie/Bar",
  "Soupe froide",
  "Crêpes/Pancakes/Gaufres",
  "Tarte/Crumble",
  "Cake salés",
]);

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

/**
 * Default scoring weights (must sum to 1.0).
 *
 * Protein and calories are co-prioritized (25% each) as the most important
 * targets to hit. Daily balance (15%) ensures calories are spread evenly
 * across days while not dominating the macro accuracy signals.
 * Variety (10%) encourages diverse cuisine/category selection.
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  protein: 0.25,
  calories: 0.25,
  carbs: 0.15,
  fat: 0.1,
  variety: 0.1,
  dailyBalance: 0.15,
};

// ---------------------------------------------------------------------------
// Generation defaults
// ---------------------------------------------------------------------------

/** Default number of random restart iterations. */
export const DEFAULT_ITERATIONS = 50;

/** Default maximum local improvement passes per iteration. */
export const DEFAULT_MAX_LOCAL_PASSES = 3;

// ---------------------------------------------------------------------------
// Score thresholds
// ---------------------------------------------------------------------------

/**
 * Match color thresholds.
 * green >= 85, yellow >= 65, red < 65.
 */
export const MATCH_THRESHOLDS = {
  green: 85,
  yellow: 65,
} as const;

/**
 * Deviation ceiling: 50% deviation from target = score of 0.
 *
 * A wide ceiling ensures the optimizer has gradient even when far from target.
 * With a tight ceiling (e.g. 0.3), recipes 35% off score the same as 60% off
 * (both 0), giving the hill-climber no signal to improve.
 *
 * Scoring curve:
 *   0% deviation = 100, 25% = 50, 50%+ = 0
 */
export const DEVIATION_CEILING = 0.5;

/**
 * Daily balance ceiling: coefficient of variation at which balance score = 0.
 *
 * The daily balance score measures how evenly daily calories are distributed.
 * It uses the coefficient of variation (CV = stddev / mean) of per-day calorie
 * totals. A CV of 0 means perfectly even distribution (score = 100).
 *
 * Scoring curve (linear):
 *   CV = 0.0 -> 100, CV = 0.25 -> 50, CV = 0.5+ -> 0
 *
 * For context: a target of ~1100 kcal/day with CV=0.5 means stddev of 550 kcal,
 * so one day could be 550 kcal and another 1650 kcal. That's clearly unacceptable.
 */
export const DAILY_BALANCE_CEILING = 0.5;
