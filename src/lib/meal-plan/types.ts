/**
 * Types for the meal plan scoring and generation module.
 *
 * These types define the data structures used to evaluate how well
 * a set of recipes matches weekly macro targets.
 */

// ---------------------------------------------------------------------------
// Macro targets (weekly)
// ---------------------------------------------------------------------------

/** Weekly macro nutrient targets (all values are weekly totals). */
export interface WeeklyMacroTargets {
  /** Target calories for the entire week (kcal) */
  calories: number;
  /** Target protein for the entire week (grams) */
  protein: number;
  /** Target carbohydrates for the entire week (grams) */
  carbs: number;
  /** Target fat for the entire week (grams) */
  fat: number;
}

// ---------------------------------------------------------------------------
// Recipe representation for scoring
// ---------------------------------------------------------------------------

/** A recipe with per-serving macros, ready for scoring. */
export interface ScoredRecipe {
  /** Unique recipe identifier */
  id: string;
  /** Recipe title */
  title: string;
  /** Macronutrients per single serving */
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Confidence level of macro data */
  confidence: "high" | "medium" | "low";
  /** Cuisine type (e.g. "francaise", "italienne") -- null if unknown */
  cuisine: string | null;
  /** Category (e.g. "plat", "soupe", "salade") -- null if unknown */
  category: string | null;
}

// ---------------------------------------------------------------------------
// Meal plan structure
// ---------------------------------------------------------------------------

/** A single meal slot in the weekly plan. */
export interface MealSlot {
  /** Day of the week (0 = Monday, 6 = Sunday) */
  dayIndex: number;
  /** Meal type: lunch or dinner */
  mealType: "midi" | "soir";
  /** The recipe assigned to this slot */
  recipe: ScoredRecipe;
}

// ---------------------------------------------------------------------------
// Scoring results
// ---------------------------------------------------------------------------

/** Score for a single macro nutrient. */
export interface MacroScore {
  /** Target value (weekly total) */
  target: number;
  /** Actual value (sum of all slots) */
  actual: number;
  /** Difference: actual - target (positive = over, negative = under) */
  delta: number;
  /** Score as 0-100 percentage (100 = perfect match) */
  percentage: number;
}

/** Overall plan score with per-macro breakdowns. */
export interface PlanScore {
  /** Weighted overall score (0-100) */
  overall: number;
  /** Protein score */
  protein: MacroScore;
  /** Carbohydrate score */
  carbs: MacroScore;
  /** Fat score */
  fat: MacroScore;
  /** Calorie score */
  calories: MacroScore;
  /** Variety score (0-100) */
  variety: number;
  /** Daily calorie balance score (0-100): 100 = perfectly even across days */
  dailyBalance: number;
}

/** Complete plan result with slots, score, and warnings. */
export interface PlanResult {
  /** All meal slots in the plan */
  slots: MealSlot[];
  /** Computed plan score */
  score: PlanScore;
  /** Any warnings generated during scoring/generation */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Weights for each scoring component (must sum to 1.0). */
export interface ScoringWeights {
  /** Weight for protein score */
  protein: number;
  /** Weight for calorie score */
  calories: number;
  /** Weight for carbohydrate score */
  carbs: number;
  /** Weight for fat score */
  fat: number;
  /** Weight for variety score */
  variety: number;
  /** Weight for daily calorie balance score */
  dailyBalance: number;
}

/** Parameters for the meal plan generation algorithm. */
export interface GenerationParams {
  /** Weekly macro targets */
  weeklyTargets: WeeklyMacroTargets;
  /** Pool of recipes to choose from */
  recipePool: ScoredRecipe[];
  /** Number of random restarts (default: DEFAULT_ITERATIONS) */
  iterations?: number;
  /** Max local improvement passes per iteration (default: DEFAULT_MAX_LOCAL_PASSES) */
  maxLocalPasses?: number;
  /** Custom random function for deterministic testing (default: Math.random) */
  random?: () => number;
}

/** Color classification for a score. */
export type MatchColor = "green" | "yellow" | "red";
