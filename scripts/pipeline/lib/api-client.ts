import type { EnrichedIngredient, EnrichedRecipe } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadSuccess {
  id: string;
}

export interface UploadError {
  error: string;
}

export type UploadResult = UploadSuccess | UploadError;

export interface ApiClient {
  uploadRecipe(recipe: EnrichedRecipe): Promise<UploadResult>;
}

// ---------------------------------------------------------------------------
// Payload mapping
// ---------------------------------------------------------------------------

interface IngredientPayload {
  name: string;
  quantity: number | null;
  unit: string | null;
  originalText: string | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  caloriesPer100g: number | null;
  confidence: "high" | "medium" | "low" | null;
}

function mapIngredient(
  scraped: { name: string; quantity: number | null; unit: string | null; originalText: string },
  enriched: EnrichedIngredient | undefined,
): IngredientPayload {
  return {
    name: scraped.name,
    quantity: scraped.quantity,
    unit: scraped.unit,
    originalText: scraped.originalText,
    proteinPer100g: enriched?.proteinPer100g ?? null,
    carbsPer100g: enriched?.carbsPer100g ?? null,
    fatPer100g: enriched?.fatPer100g ?? null,
    caloriesPer100g: enriched?.caloriesPer100g ?? null,
    confidence: enriched?.confidence ?? null,
  };
}

function buildUploadPayload(recipe: EnrichedRecipe) {
  // Build a lookup of enriched data by ingredient name
  const enrichedByName = new Map<string, EnrichedIngredient>();
  for (const ei of recipe.enrichedIngredients) {
    enrichedByName.set(ei.name, ei);
  }

  // Map scraped ingredients, merging enriched macro data
  const ingredients = recipe.ingredients.map((scraped) =>
    mapIngredient(scraped, enrichedByName.get(scraped.name)),
  );

  return {
    jowId: recipe.jowId,
    title: recipe.title,
    description: recipe.description || null,
    imageUrl: recipe.imageUrl,
    jowUrl: recipe.jowUrl,
    cookTimeMin: recipe.cookTimeMin,
    prepTimeMin: recipe.prepTimeMin,
    totalTimeMin: recipe.totalTimeMin,
    difficulty: recipe.difficulty,
    instructions: recipe.instructions,
    nutriScore: recipe.nutriScore,
    rating: recipe.rating,
    ratingCount: recipe.ratingCount,
    cuisine: recipe.cuisine || null,
    category: recipe.category || null,
    originalPortions: recipe.originalPortions,
    jowNutritionPerServing: recipe.jowNutritionPerServing,
    ingredients,
    tags: [] as string[],
  };
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

/**
 * Create an API client for the recipe upload endpoint.
 *
 * @param baseUrl - Base URL of the server (e.g. http://localhost:3000)
 * @param token - Bearer token for authentication (PIPELINE_TOKEN)
 */
export function createApiClient(baseUrl: string, token: string): ApiClient {
  const endpoint = `${baseUrl}/api/recipes/upload`;

  return {
    async uploadRecipe(recipe: EnrichedRecipe): Promise<UploadResult> {
      const payload = buildUploadPayload(recipe);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const body = await response.json();

        if (response.status === 201) {
          return { id: body.id as string };
        }

        return {
          error: `HTTP ${response.status}: ${JSON.stringify(body)}`,
        };
      } catch (err) {
        return {
          error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
