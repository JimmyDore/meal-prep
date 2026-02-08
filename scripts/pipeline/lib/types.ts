export interface ScrapedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  originalText: string;
}

export interface JowNutritionPerServing {
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  fiber: number;
}

export interface ScrapedRecipe {
  title: string;
  description: string;
  jowId: string;
  jowUrl: string;
  imageUrl: string | null;
  cookTimeMin: number | null;
  prepTimeMin: number | null;
  totalTimeMin: number | null;
  difficulty: string | null;
  instructions: string[];
  nutriScore: string | null;
  rating: number | null;
  ratingCount: number | null;
  cuisine: string | null;
  category: string | null;
  originalPortions: number | null;
  ingredients: ScrapedIngredient[];
  jowNutritionPerServing: JowNutritionPerServing | null;
}

export interface EnrichedIngredient {
  name: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  caloriesPer100g: number;
  confidence: "high" | "medium" | "low";
}

export interface EnrichedRecipe extends ScrapedRecipe {
  enrichedIngredients: EnrichedIngredient[];
}

export interface PipelineStats {
  success: number;
  skipped: number;
  failed: number;
  total: number;
}
