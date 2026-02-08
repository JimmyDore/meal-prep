import { describe, expect, it, vi } from "vitest";
import type { ScrapedRecipe } from "../types";

// ---------------------------------------------------------------------------
// Mock readJsonl from ../jsonl
// ---------------------------------------------------------------------------

const mockRecipes: ScrapedRecipe[] = [];

vi.mock("../jsonl", () => ({
  readJsonl: async function* () {
    for (const recipe of mockRecipes) {
      yield recipe;
    }
  },
}));

import { extractUniqueIngredients } from "../ingredient-extractor";

// ---------------------------------------------------------------------------
// Helper to build minimal ScrapedRecipe
// ---------------------------------------------------------------------------

function makeRecipe(
  title: string,
  ingredientNames: string[],
): ScrapedRecipe {
  return {
    title,
    description: "",
    jowId: `jow-${title.toLowerCase().replace(/\s+/g, "-")}`,
    jowUrl: `https://jow.fr/recipes/${title.toLowerCase().replace(/\s+/g, "-")}`,
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
    ingredients: ingredientNames.map((name) => ({
      name,
      quantity: null,
      unit: null,
      originalText: name,
    })),
    jowNutritionPerServing: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractUniqueIngredients", () => {
  it("extracts and deduplicates ingredients from multiple recipes", async () => {
    mockRecipes.length = 0;
    mockRecipes.push(
      makeRecipe("Poulet Riz", ["Poulet", "Riz", "Sel"]),
      makeRecipe("Riz Saute", ["Riz", "Oignon", "Sel"]),
      makeRecipe("Salade", ["Tomate", "Oignon", "Laitue"]),
    );

    const result = await extractUniqueIngredients("/fake/scraped.jsonl");

    // Unique: Laitue, Oignon, Poulet, Riz, Sel, Tomate (sorted)
    expect(result).toHaveLength(6);
    expect(result).toEqual(["Laitue", "Oignon", "Poulet", "Riz", "Sel", "Tomate"]);
  });

  it("returns empty array for empty recipe file", async () => {
    mockRecipes.length = 0;

    const result = await extractUniqueIngredients("/fake/empty.jsonl");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("handles recipes with no ingredients gracefully", async () => {
    mockRecipes.length = 0;
    // Build a recipe with empty ingredients array manually
    const emptyRecipe: ScrapedRecipe = {
      ...makeRecipe("Empty", []),
      ingredients: [],
    };
    mockRecipes.push(emptyRecipe);

    const result = await extractUniqueIngredients("/fake/no-ingredients.jsonl");

    expect(result).toHaveLength(0);
  });

  it("returns sorted unique names for deterministic ordering", async () => {
    mockRecipes.length = 0;
    mockRecipes.push(makeRecipe("Test", ["Zucchini", "Artichaut", "Mangue"]));

    const result = await extractUniqueIngredients("/fake/sorted.jsonl");

    expect(result).toEqual(["Artichaut", "Mangue", "Zucchini"]);
  });

  it("handles single recipe with single ingredient", async () => {
    mockRecipes.length = 0;
    mockRecipes.push(makeRecipe("Simple", ["Eau"]));

    const result = await extractUniqueIngredients("/fake/single.jsonl");

    expect(result).toHaveLength(1);
    expect(result).toEqual(["Eau"]);
  });

  it("preserves exact ingredient names without normalization", async () => {
    mockRecipes.length = 0;
    mockRecipes.push(
      makeRecipe("Case Test", ["Creme fraiche", "creme fraiche"]),
    );

    const result = await extractUniqueIngredients("/fake/case.jsonl");

    // No case normalization -- both are unique entries
    expect(result).toHaveLength(2);
    expect(result).toContain("Creme fraiche");
    expect(result).toContain("creme fraiche");
  });
});
