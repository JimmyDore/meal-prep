import { describe, expect, it } from "vitest";
import {
  enrichedIngredientSchema,
  enrichedRecipeSchema,
  ingredientMacroSchema,
  scrapedRecipeSchema,
} from "../schemas";

// --- Helpers ---

function validIngredient() {
  return {
    name: "Poulet",
    proteinPer100g: 25,
    carbsPer100g: 0,
    fatPer100g: 3,
    caloriesPer100g: 130,
    confidence: "high" as const,
  };
}

function validScrapedIngredient() {
  return {
    name: "Poulet",
    quantity: 200,
    unit: "g",
    originalText: "200g de poulet",
  };
}

function validScrapedRecipe() {
  return {
    title: "Poulet roti",
    description: "Un poulet roti classique",
    jowId: "abc123",
    jowUrl: "https://jow.fr/recipes/abc123",
    imageUrl: null,
    cookTimeMin: 45,
    prepTimeMin: 10,
    totalTimeMin: 55,
    difficulty: "Facile",
    instructions: ["Prechauffer le four", "Enfourner le poulet"],
    nutriScore: "A" as const,
    rating: 4.5,
    ratingCount: 120,
    cuisine: "Francaise",
    category: "Plat principal",
    originalPortions: 4,
    ingredients: [validScrapedIngredient()],
    jowNutritionPerServing: {
      calories: 350,
      fat: 12,
      carbs: 20,
      protein: 35,
      fiber: 2,
    },
  };
}

// --- enrichedIngredientSchema ---

describe("enrichedIngredientSchema", () => {
  it("accepts valid ingredient at lower bounds (all zeros)", () => {
    const result = enrichedIngredientSchema.safeParse({
      name: "Eau",
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      caloriesPer100g: 0,
      confidence: "high",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid ingredient at upper bounds", () => {
    const result = enrichedIngredientSchema.safeParse({
      name: "Huile pure",
      proteinPer100g: 100,
      carbsPer100g: 100,
      fatPer100g: 100,
      caloriesPer100g: 900,
      confidence: "low",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid confidence values", () => {
    for (const confidence of ["low", "medium", "high"]) {
      const result = enrichedIngredientSchema.safeParse({
        ...validIngredient(),
        confidence,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects proteinPer100g above 100", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      proteinPer100g: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects proteinPer100g below 0", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      proteinPer100g: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects carbsPer100g above 100", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      carbsPer100g: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects fatPer100g above 100", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      fatPer100g: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects caloriesPer100g above 900", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      caloriesPer100g: 901,
    });
    expect(result.success).toBe(false);
  });

  it("rejects caloriesPer100g below 0", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      caloriesPer100g: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name: _, ...noName } = validIngredient();
    const result = enrichedIngredientSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid confidence value", () => {
    const result = enrichedIngredientSchema.safeParse({
      ...validIngredient(),
      confidence: "very_high",
    });
    expect(result.success).toBe(false);
  });
});

// --- ingredientMacroSchema (same bounds, separate type) ---

describe("ingredientMacroSchema", () => {
  it("accepts valid ingredient at boundaries", () => {
    const lower = ingredientMacroSchema.safeParse({
      name: "Eau",
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      caloriesPer100g: 0,
      confidence: "medium",
    });
    expect(lower.success).toBe(true);

    const upper = ingredientMacroSchema.safeParse({
      name: "Concentre",
      proteinPer100g: 100,
      carbsPer100g: 100,
      fatPer100g: 100,
      caloriesPer100g: 900,
      confidence: "high",
    });
    expect(upper.success).toBe(true);
  });

  it("rejects values outside bounds", () => {
    const overProtein = ingredientMacroSchema.safeParse({
      ...validIngredient(),
      proteinPer100g: 101,
    });
    expect(overProtein.success).toBe(false);

    const negativeCalories = ingredientMacroSchema.safeParse({
      ...validIngredient(),
      caloriesPer100g: -1,
    });
    expect(negativeCalories.success).toBe(false);
  });
});

// --- scrapedRecipeSchema ---

describe("scrapedRecipeSchema", () => {
  it("accepts a minimal valid scraped recipe", () => {
    const result = scrapedRecipeSchema.safeParse(validScrapedRecipe());
    expect(result.success).toBe(true);
  });

  it("accepts recipe with all nullable fields set to null", () => {
    const result = scrapedRecipeSchema.safeParse({
      title: "Salade",
      description: "",
      jowId: "xyz789",
      jowUrl: "https://jow.fr/recipes/xyz789",
      imageUrl: null,
      cookTimeMin: null,
      prepTimeMin: null,
      totalTimeMin: null,
      difficulty: null,
      instructions: [],
      nutriScore: null,
      rating: null,
      ratingCount: null,
      cuisine: null,
      category: null,
      originalPortions: null,
      ingredients: [validScrapedIngredient()],
      jowNutritionPerServing: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const { title: _, ...noTitle } = validScrapedRecipe();
    const result = scrapedRecipeSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = scrapedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing jowId", () => {
    const { jowId: _, ...noId } = validScrapedRecipe();
    const result = scrapedRecipeSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it("rejects empty ingredients array", () => {
    const result = scrapedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      ingredients: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid jowUrl (not a URL)", () => {
    const result = scrapedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      jowUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid nutriScore value", () => {
    const result = scrapedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      nutriScore: "F",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid nutriScore values", () => {
    for (const score of ["A", "B", "C", "D", "E"]) {
      const result = scrapedRecipeSchema.safeParse({
        ...validScrapedRecipe(),
        nutriScore: score,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects rating above 5", () => {
    const result = scrapedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      rating: 5.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative cookTimeMin", () => {
    const result = scrapedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      cookTimeMin: -1,
    });
    expect(result.success).toBe(false);
  });
});

// --- enrichedRecipeSchema ---

describe("enrichedRecipeSchema", () => {
  it("accepts valid enriched recipe", () => {
    const result = enrichedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      enrichedIngredients: [validIngredient()],
    });
    expect(result.success).toBe(true);
  });

  it("rejects enriched recipe with empty enrichedIngredients", () => {
    const result = enrichedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      enrichedIngredients: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects enriched recipe with invalid ingredient macros", () => {
    const result = enrichedRecipeSchema.safeParse({
      ...validScrapedRecipe(),
      enrichedIngredients: [{ ...validIngredient(), proteinPer100g: 200 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects enriched recipe missing enrichedIngredients field", () => {
    const result = enrichedRecipeSchema.safeParse(validScrapedRecipe());
    expect(result.success).toBe(false);
  });
});
