/**
 * Per-serving recipe macro calculator.
 *
 * Computes per-serving and total macronutrients for a recipe by:
 * 1. Converting each ingredient's quantity+unit to grams via unit-conversion
 * 2. Applying per-100g macro data to get absolute macros per ingredient
 * 3. Summing to get per-serving macros (quantities are already per-cover from Jow)
 * 4. Multiplying by portions to get total recipe macros
 *
 * IMPORTANT: Jow stores ingredient quantities as `quantityPerCover` (per person).
 * The sum of converted ingredient macros already represents ONE serving.
 * totalRecipe = perServing * originalPortions (the whole batch for all covers).
 *
 * Tracks conversion confidence and missing ingredients for data quality reporting.
 */

import type { RecipeMacrosResult } from "./types";
import { convertToGrams } from "./unit-conversion";

/**
 * Input data for a single ingredient in a recipe.
 * Aligns with the DB schema (recipeIngredients + ingredients tables).
 */
interface IngredientInput {
  /** Ingredient name (e.g. "Poulet", "Riz basmati") */
  name: string;
  /** Quantity in the recipe (e.g. 0.5, 3) -- null if unspecified */
  quantity: number | null;
  /** Unit string from DB (e.g. "Kilogramme", "Piece") -- null if unspecified */
  unit: string | null;
  /** Calories per 100g of this ingredient -- null if unknown */
  caloriesPer100g: number | null;
  /** Protein per 100g of this ingredient -- null if unknown */
  proteinPer100g: number | null;
  /** Carbs per 100g of this ingredient -- null if unknown */
  carbsPer100g: number | null;
  /** Fat per 100g of this ingredient -- null if unknown */
  fatPer100g: number | null;
}

/**
 * Calculates per-serving and total macronutrients for a recipe.
 *
 * Ingredient quantities from Jow are `quantityPerCover` (already per-person).
 * The sum of ingredient macros = one serving. Total recipe = perServing * portions.
 *
 * @param ingredients - Array of ingredient inputs with quantity, unit, and per-100g macros
 * @param originalPortions - Number of servings/covers the recipe yields (clamped to min 1)
 * @returns RecipeMacrosResult with perServing, totalRecipe, confidence, and missingIngredients
 */
export function calculateRecipeMacros(
  ingredients: IngredientInput[],
  originalPortions: number,
): RecipeMacrosResult {
  const portions = originalPortions > 0 ? originalPortions : 1;

  let servingCalories = 0;
  let servingProtein = 0;
  let servingCarbs = 0;
  let servingFat = 0;

  let convertedCount = 0;
  const totalCount = ingredients.length;
  const missingIngredients: string[] = [];

  for (const ingredient of ingredients) {
    // Skip if quantity is null
    if (ingredient.quantity === null) {
      missingIngredients.push(ingredient.name);
      continue;
    }

    // Skip if macro data is missing
    if (ingredient.caloriesPer100g === null) {
      missingIngredients.push(ingredient.name);
      continue;
    }

    // Convert to grams
    const grams = convertToGrams(ingredient.quantity, ingredient.unit, ingredient.name);
    if (grams === null) {
      missingIngredients.push(ingredient.name);
      continue;
    }

    // Calculate macros: factor = grams / 100
    // Quantities are per-cover (per person), so this gives per-serving macros directly
    const factor = grams / 100;
    servingCalories += factor * ingredient.caloriesPer100g;
    servingProtein += factor * (ingredient.proteinPer100g ?? 0);
    servingCarbs += factor * (ingredient.carbsPer100g ?? 0);
    servingFat += factor * (ingredient.fatPer100g ?? 0);

    convertedCount++;
  }

  // Determine confidence based on conversion ratio
  let confidence: "high" | "medium" | "low";
  if (totalCount === 0) {
    confidence = "low";
  } else {
    const ratio = convertedCount / totalCount;
    if (ratio >= 0.9) {
      confidence = "high";
    } else if (ratio >= 0.7) {
      confidence = "medium";
    } else {
      confidence = "low";
    }
  }

  return {
    // Quantities are already per-cover — sum IS the per-serving value
    perServing: {
      calories: Math.round(servingCalories),
      protein: Math.round(servingProtein),
      carbs: Math.round(servingCarbs),
      fat: Math.round(servingFat),
    },
    // Total recipe = per-serving * number of covers
    totalRecipe: {
      calories: Math.round(servingCalories * portions),
      protein: Math.round(servingProtein * portions),
      carbs: Math.round(servingCarbs * portions),
      fat: Math.round(servingFat * portions),
    },
    confidence,
    convertedCount,
    totalCount,
    missingIngredients,
  };
}
