import { z } from "zod";

// --- Scraped data schemas ---

export const scrapedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  originalText: z.string().min(1),
});

export type ScrapedIngredientSchema = z.infer<typeof scrapedIngredientSchema>;

export const jowNutritionPerServingSchema = z.object({
  calories: z.number().min(0),
  fat: z.number().min(0),
  carbs: z.number().min(0),
  protein: z.number().min(0),
  fiber: z.number().min(0),
});

export type JowNutritionPerServingSchema = z.infer<typeof jowNutritionPerServingSchema>;

export const scrapedRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  jowId: z.string().min(1),
  jowUrl: z.string().url(),
  imageUrl: z.string().url().nullable(),
  cookTimeMin: z.number().int().min(0).nullable(),
  prepTimeMin: z.number().int().min(0).nullable(),
  totalTimeMin: z.number().int().min(0).nullable(),
  difficulty: z.string().nullable(),
  instructions: z.array(z.string()),
  nutriScore: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  ratingCount: z.number().int().min(0).nullable(),
  cuisine: z.string().nullable(),
  category: z.string().nullable(),
  originalPortions: z.number().int().min(1).nullable(),
  ingredients: z.array(scrapedIngredientSchema).min(1),
  jowNutritionPerServing: jowNutritionPerServingSchema.nullable(),
});

export type ScrapedRecipeSchema = z.infer<typeof scrapedRecipeSchema>;

// --- Enriched data schemas ---

export const enrichedIngredientSchema = z.object({
  name: z.string().min(1),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  caloriesPer100g: z.number().min(0).max(900),
  confidence: z.enum(["high", "medium", "low"]),
});

export type EnrichedIngredientSchema = z.infer<typeof enrichedIngredientSchema>;

/**
 * Zod schema for standalone ingredient macro validation.
 * Used when validating entries in the ingredient-macros.jsonl reference file.
 * Same bounds as enrichedIngredientSchema: protein/carbs/fat 0-100, calories 0-900.
 */
export const ingredientMacroSchema = z.object({
  name: z.string().min(1),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  caloriesPer100g: z.number().min(0).max(900),
  confidence: z.enum(["high", "medium", "low"]),
});

export type IngredientMacroSchema = z.infer<typeof ingredientMacroSchema>;

export const enrichedRecipeSchema = scrapedRecipeSchema.extend({
  enrichedIngredients: z.array(enrichedIngredientSchema).min(1),
});

export type EnrichedRecipeSchema = z.infer<typeof enrichedRecipeSchema>;
