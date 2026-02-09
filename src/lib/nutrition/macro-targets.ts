/**
 * Daily macro target calculator per nutritional goal.
 *
 * Derives daily protein, fat, and carbohydrate targets from TDEE and user goal.
 *
 * Approach:
 *   1. Apply goal-based calorie adjustment to TDEE (deficit/surplus)
 *   2. Protein: evidence-based g/kg body weight (not flat percentage)
 *   3. Fat: percentage of target calories (minimum 25% for hormonal health)
 *   4. Carbs: fill remaining calories after protein and fat
 *   5. Safety: minimum 50g carbs enforced by reducing fat if needed
 *
 * Source: ISSN Position Stands on Protein (2017) and Diets & Body Composition (2017)
 */

import {
  GOAL_CALORIE_ADJUSTMENTS,
  GOAL_FAT_PERCENTAGE,
  GOAL_PROTEIN_PER_KG,
  KCAL_PER_GRAM,
  MIN_CARBS_GRAMS,
} from "./constants";
import type { MacroTargets, TDEEResult, UserProfile } from "./types";

/**
 * Calculate daily macro targets based on TDEE and user goal.
 *
 * @param tdeeResult - Result from calculateTDEE containing the total daily energy expenditure
 * @param profile - User weight and nutritional goal
 * @returns MacroTargets with calories, protein, fat, carbs rounded to nearest integer
 */
export function calculateMacroTargets(
  tdeeResult: TDEEResult,
  profile: Pick<UserProfile, "weight" | "goal">,
): MacroTargets {
  const { tdee } = tdeeResult;
  const { weight, goal } = profile;

  // Step 1: Apply goal-based calorie adjustment
  const targetCalories = tdee * (1 + GOAL_CALORIE_ADJUSTMENTS[goal]);

  // Step 2: Calculate protein from g/kg body weight
  const proteinGrams = GOAL_PROTEIN_PER_KG[goal] * weight;
  const proteinCalories = proteinGrams * KCAL_PER_GRAM.protein;

  // Step 3: Calculate fat as percentage of target calories
  let fatGrams = (targetCalories * GOAL_FAT_PERCENTAGE[goal]) / KCAL_PER_GRAM.fat;
  const fatCalories = fatGrams * KCAL_PER_GRAM.fat;

  // Step 4: Carbs fill remaining calories
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  let carbsGrams = remainingCalories / KCAL_PER_GRAM.carbs;

  // Step 5: Safety check -- minimum carbs threshold
  if (carbsGrams < MIN_CARBS_GRAMS) {
    const carbDeficit = MIN_CARBS_GRAMS - carbsGrams;
    const caloriesToReallocate = carbDeficit * KCAL_PER_GRAM.carbs;
    fatGrams -= caloriesToReallocate / KCAL_PER_GRAM.fat;
    carbsGrams = MIN_CARBS_GRAMS;
  }

  return {
    calories: Math.round(targetCalories),
    protein: Math.round(proteinGrams),
    fat: Math.round(fatGrams),
    carbs: Math.round(carbsGrams),
  };
}
