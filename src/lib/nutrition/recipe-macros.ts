/**
 * Per-serving recipe macro calculator.
 *
 * Computes total and per-serving macronutrients for a recipe by:
 * 1. Converting each ingredient's quantity+unit to grams via unit-conversion
 * 2. Applying per-100g macro data to get absolute macros per ingredient
 * 3. Summing totals and dividing by number of portions
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
 * @param ingredients - Array of ingredient inputs with quantity, unit, and per-100g macros
 * @param originalPortions - Number of servings the recipe yields (clamped to min 1)
 * @returns RecipeMacrosResult with perServing, totalRecipe, confidence, and missingIngredients
 */
export function calculateRecipeMacros(
  ingredients: IngredientInput[],
  originalPortions: number,
): RecipeMacrosResult {
  const portions = originalPortions > 0 ? originalPortions : 1;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

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
    const factor = grams / 100;
    totalCalories += factor * ingredient.caloriesPer100g;
    totalProtein += factor * (ingredient.proteinPer100g ?? 0);
    totalCarbs += factor * (ingredient.carbsPer100g ?? 0);
    totalFat += factor * (ingredient.fatPer100g ?? 0);

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
    perServing: {
      calories: Math.round(totalCalories / portions),
      protein: Math.round(totalProtein / portions),
      carbs: Math.round(totalCarbs / portions),
      fat: Math.round(totalFat / portions),
    },
    totalRecipe: {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
    },
    confidence,
    convertedCount,
    totalCount,
    missingIngredients,
  };
}
