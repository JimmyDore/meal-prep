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
// Scoring weights
// ---------------------------------------------------------------------------

/**
 * Default scoring weights.
 * Protein is prioritized (30%) as the hardest macro to hit consistently.
 * Variety has lowest weight (10%) -- nice-to-have, not critical.
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  protein: 0.3,
  calories: 0.25,
  carbs: 0.2,
  fat: 0.15,
  variety: 0.1,
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
 * Deviation ceiling: 20% deviation from target = score of 0.
 * Deliberately aggressive to push the algorithm toward close matches.
 */
export const DEVIATION_CEILING = 0.2;
