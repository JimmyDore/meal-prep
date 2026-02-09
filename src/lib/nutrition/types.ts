/**
 * Shared types for the nutrition calculation module.
 *
 * These types align with the database schema enums defined in:
 * - src/db/schema/profiles.ts (sexEnum, activityLevelEnum, goalEnum)
 * - src/db/schema/sport-activities.ts (activityTypeEnum)
 */

export interface UserProfile {
  /** Weight in kilograms */
  weight: number;
  /** Height in centimeters */
  height: number;
  /** Age in years */
  age: number;
  /** Biological sex -- matches DB sexEnum */
  sex: "homme" | "femme";
  /** Daily activity level excluding sport -- matches DB activityLevelEnum */
  activityLevel: "sedentaire" | "legerement_actif" | "moderement_actif" | "actif" | "tres_actif";
  /** Nutritional goal -- matches DB goalEnum */
  goal: "seche" | "maintien" | "prise_de_masse" | "recomposition";
}

export interface SportSession {
  /** Type of sport activity -- matches DB activityTypeEnum */
  activityType:
    | "course"
    | "musculation"
    | "natation"
    | "velo"
    | "yoga"
    | "marche"
    | "sport_collectif";
  /** Number of sessions per week */
  weeklyFrequency: number;
}

export interface BMRResult {
  /** Basal Metabolic Rate in kcal/day, rounded to nearest integer */
  bmr: number;
}

export interface TDEEResult {
  /** Base BMR in kcal/day */
  bmr: number;
  /** BMR * activity multiplier (lifestyle only, no sport) */
  activityTDEE: number;
  /** Daily average sport calories (weekly total / 7) */
  sportCalories: number;
  /** Final Total Daily Energy Expenditure in kcal/day */
  tdee: number;
}

export interface MacroTargets {
  /** Target calories in kcal/day */
  calories: number;
  /** Target protein in grams/day */
  protein: number;
  /** Target fat in grams/day */
  fat: number;
  /** Target carbohydrates in grams/day */
  carbs: number;
}

export interface RecipeMacrosResult {
  /** Macronutrients per single serving */
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Total macronutrients for the entire recipe */
  totalRecipe: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Confidence level based on ingredient conversion coverage */
  confidence: "high" | "medium" | "low";
  /** Number of ingredients successfully converted to grams */
  convertedCount: number;
  /** Total number of ingredients in the recipe */
  totalCount: number;
  /** Names of ingredients that could not be converted or lacked macro data */
  missingIngredients: string[];
}
