import { describe, expect, it } from "vitest";
import type { EnrichedIngredient, ScrapedRecipe } from "../types";
import { assembleEnrichedRecipe } from "../recipe-assembler";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeScrapedRecipe(
  overrides: Partial<ScrapedRecipe> = {},
): ScrapedRecipe {
  return {
    title: "Poulet au curry",
    description: "Un classique",
    jowId: "89y06dxjhfua0twu16x5",
    jowUrl: "https://jow.fr/recipes/poulet-au-curry-89y06dxjhfua0twu16x5",
    imageUrl: "https://img.jow.fr/poulet.jpg",
    cookTimeMin: 20,
    prepTimeMin: 10,
    totalTimeMin: 30,
    difficulty: "Facile",
    instructions: ["Couper le poulet", "Ajouter le curry"],
    nutriScore: "B",
    rating: 4.2,
    ratingCount: 50,
    cuisine: null,
    category: null,
    originalPortions: 4,
    ingredients: [
      { name: "Poulet", quantity: 200, unit: "g", originalText: "200 g Poulet" },
      { name: "Curry", quantity: 5, unit: "g", originalText: "5 g Curry" },
      { name: "Riz", quantity: 300, unit: "g", originalText: "300 g Riz" },
    ],
    jowNutritionPerServing: null,
    ...overrides,
  };
}

function makeMacroLookup(
  entries: EnrichedIngredient[],
): Map<string, EnrichedIngredient> {
  const map = new Map<string, EnrichedIngredient>();
  for (const e of entries) {
    map.set(e.name, e);
  }
  return map;
}

const POULET_MACRO: EnrichedIngredient = {
  name: "Poulet",
  proteinPer100g: 25,
  carbsPer100g: 0,
  fatPer100g: 3,
  caloriesPer100g: 130,
  confidence: "high",
};

const CURRY_MACRO: EnrichedIngredient = {
  name: "Curry",
  proteinPer100g: 12,
  carbsPer100g: 58,
  fatPer100g: 14,
  caloriesPer100g: 325,
  confidence: "medium",
};

const RIZ_MACRO: EnrichedIngredient = {
  name: "Riz",
  proteinPer100g: 7,
  carbsPer100g: 80,
  fatPer100g: 1,
  caloriesPer100g: 360,
  confidence: "high",
};

// ---------------------------------------------------------------------------
// assembleEnrichedRecipe
// ---------------------------------------------------------------------------
describe("assembleEnrichedRecipe", () => {
  it("returns enriched recipe with all ingredients matched", () => {
    const recipe = makeScrapedRecipe();
    const lookup = makeMacroLookup([POULET_MACRO, CURRY_MACRO, RIZ_MACRO]);

    const result = assembleEnrichedRecipe(recipe, lookup);

    expect(result).not.toBeNull();
    expect(result!.enriched.title).toBe("Poulet au curry");
    expect(result!.enriched.enrichedIngredients).toHaveLength(3);
    expect(result!.enriched.enrichedIngredients[0].name).toBe("Poulet");
    expect(result!.enriched.enrichedIngredients[0].proteinPer100g).toBe(25);
    expect(result!.missingIngredients).toHaveLength(0);
  });

  it("returns partial enriched recipe when some ingredients are missing", () => {
    const recipe = makeScrapedRecipe();
    // Only Poulet in lookup, Curry and Riz missing
    const lookup = makeMacroLookup([POULET_MACRO]);

    const result = assembleEnrichedRecipe(recipe, lookup);

    expect(result).not.toBeNull();
    expect(result!.enriched.enrichedIngredients).toHaveLength(1);
    expect(result!.enriched.enrichedIngredients[0].name).toBe("Poulet");
    expect(result!.missingIngredients).toEqual(["Curry", "Riz"]);
  });

  it("returns null when all ingredients are missing (empty lookup)", () => {
    const recipe = makeScrapedRecipe();
    const lookup = makeMacroLookup([]);

    const result = assembleEnrichedRecipe(recipe, lookup);

    expect(result).toBeNull();
  });

  it("returns null when lookup has entries but none match recipe ingredients", () => {
    const recipe = makeScrapedRecipe();
    const unrelated: EnrichedIngredient = {
      name: "Tomate",
      proteinPer100g: 1,
      carbsPer100g: 4,
      fatPer100g: 0.2,
      caloriesPer100g: 18,
      confidence: "high",
    };
    const lookup = makeMacroLookup([unrelated]);

    const result = assembleEnrichedRecipe(recipe, lookup);

    expect(result).toBeNull();
  });

  it("preserves original recipe fields in enriched recipe", () => {
    const recipe = makeScrapedRecipe();
    const lookup = makeMacroLookup([POULET_MACRO, CURRY_MACRO, RIZ_MACRO]);

    const result = assembleEnrichedRecipe(recipe, lookup)!;

    expect(result.enriched.jowId).toBe("89y06dxjhfua0twu16x5");
    expect(result.enriched.ingredients).toHaveLength(3);
    expect(result.enriched.instructions).toEqual([
      "Couper le poulet",
      "Ajouter le curry",
    ]);
    expect(result.enriched.cookTimeMin).toBe(20);
    expect(result.enriched.originalPortions).toBe(4);
  });

  it("handles recipe with single ingredient", () => {
    const recipe = makeScrapedRecipe({
      ingredients: [
        { name: "Poulet", quantity: 500, unit: "g", originalText: "500 g Poulet" },
      ],
    });
    const lookup = makeMacroLookup([POULET_MACRO]);

    const result = assembleEnrichedRecipe(recipe, lookup);

    expect(result).not.toBeNull();
    expect(result!.enriched.enrichedIngredients).toHaveLength(1);
    expect(result!.missingIngredients).toHaveLength(0);
  });
});
