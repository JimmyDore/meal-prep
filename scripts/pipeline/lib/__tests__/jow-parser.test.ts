import { describe, expect, it } from "vitest";
import {
  extractJowId,
  extractRecipeSlug,
  parseIsoDuration,
  parseJsonLdRecipe,
  parseNextDataRecipe,
} from "../jow-parser";

// ---------------------------------------------------------------------------
// extractJowId
// ---------------------------------------------------------------------------
describe("extractJowId", () => {
  it("extracts the ID from a full Jow URL", () => {
    expect(
      extractJowId("https://jow.fr/recipes/poulet-au-curry-89y06dxjhfua0twu16x5"),
    ).toBe("89y06dxjhfua0twu16x5");
  });

  it("extracts the ID from a relative path", () => {
    expect(extractJowId("/recipes/poulet-au-curry-89y06dxjhfua0twu16x5")).toBe(
      "89y06dxjhfua0twu16x5",
    );
  });

  it("returns the full segment when there is no dash", () => {
    expect(extractJowId("/recipes/nodashsegment")).toBe("nodashsegment");
  });

  it("returns empty string for empty input", () => {
    expect(extractJowId("")).toBe("");
  });

  it("handles a URL with multiple path segments", () => {
    expect(
      extractJowId("https://jow.fr/fr/recipes/salade-nicoise-abc123def456gh"),
    ).toBe("abc123def456gh");
  });
});

// ---------------------------------------------------------------------------
// extractRecipeSlug
// ---------------------------------------------------------------------------
describe("extractRecipeSlug", () => {
  it("extracts slug without the trailing ID", () => {
    expect(
      extractRecipeSlug(
        "https://jow.fr/recipes/poulet-au-curry-89y06dxjhfua0twu16x5",
      ),
    ).toBe("poulet-au-curry");
  });

  it("extracts slug from relative path", () => {
    expect(
      extractRecipeSlug("/recipes/pates-carbonara-xyz789abc123de"),
    ).toBe("pates-carbonara");
  });

  it("returns the full segment when there is no dash", () => {
    expect(extractRecipeSlug("/recipes/nodashsegment")).toBe("nodashsegment");
  });

  it("handles single-word slug with ID", () => {
    expect(extractRecipeSlug("/recipes/salade-abc123def456gh")).toBe("salade");
  });
});

// ---------------------------------------------------------------------------
// parseIsoDuration
// ---------------------------------------------------------------------------
describe("parseIsoDuration", () => {
  it.each([
    ["PT30M", 30],
    ["PT1H15M", 75],
    ["PT1H", 60],
    ["PT2H30M", 150],
    ["PT45M", 45],
    ["PT0H30M", 30],
    ["PT1H0M", 60],
    ["pt30m", 30], // case insensitive
    ["PT1H30M30S", 91], // with seconds rounded
  ] as [string, number][])(
    "parses %s to %d minutes",
    (input, expected) => {
      expect(parseIsoDuration(input)).toBe(expected);
    },
  );

  it("returns null for empty string", () => {
    expect(parseIsoDuration("")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseIsoDuration("30 minutes")).toBeNull();
  });

  it("returns null for PT0M (0 total)", () => {
    expect(parseIsoDuration("PT0M")).toBeNull();
  });

  it("returns null for non-string input", () => {
    // @ts-expect-error testing runtime with invalid type
    expect(parseIsoDuration(null)).toBeNull();
    // @ts-expect-error testing runtime with invalid type
    expect(parseIsoDuration(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseNextDataRecipe
// ---------------------------------------------------------------------------
describe("parseNextDataRecipe", () => {
  const URL = "https://jow.fr/recipes/poulet-au-curry-89y06dxjhfua0twu16x5";

  function makeNextData(overrides: Record<string, unknown> = {}) {
    return {
      props: {
        pageProps: {
          recipe: {
            title: "Poulet au curry",
            description: "Un classique",
            constituents: [
              {
                name: "Poulet",
                quantityPerCover: 200,
                unit: { name: "g" },
              },
              {
                name: "Curry",
                quantityPerCover: 5,
                unit: { name: "g" },
              },
            ],
            directions: [{ label: "Couper le poulet" }, { label: "Ajouter le curry" }],
            nutritionalFacts: [
              { id: "ENERC", amount: 450 },
              { id: "FAT", amount: 15 },
              { id: "CHOAVL", amount: 30 },
              { id: "PRO", amount: 35 },
              { id: "FIBTG", amount: 2 },
            ],
            cookingTime: 20,
            preparationTime: 10,
            coversCount: 4,
            difficulty: 1,
            imageUrl: "https://img.jow.fr/poulet.jpg",
            nutriScore: "B",
            ...overrides,
          },
        },
      },
    };
  }

  it("extracts a complete recipe from __NEXT_DATA__", () => {
    const result = parseNextDataRecipe(makeNextData(), URL);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Poulet au curry");
    expect(result!.jowId).toBe("89y06dxjhfua0twu16x5");
    expect(result!.ingredients).toHaveLength(2);
    expect(result!.ingredients[0].name).toBe("Poulet");
    expect(result!.ingredients[0].quantity).toBe(200);
    expect(result!.ingredients[0].unit).toBe("g");
    expect(result!.instructions).toEqual(["Couper le poulet", "Ajouter le curry"]);
    expect(result!.cookTimeMin).toBe(20);
    expect(result!.prepTimeMin).toBe(10);
    expect(result!.totalTimeMin).toBe(30);
    expect(result!.originalPortions).toBe(4);
    expect(result!.difficulty).toBe("Facile");
    expect(result!.imageUrl).toBe("https://img.jow.fr/poulet.jpg");
    expect(result!.jowNutritionPerServing).toEqual({
      calories: 450,
      fat: 15,
      carbs: 30,
      protein: 35,
      fiber: 2,
    });
  });

  it("returns null when no title is present", () => {
    const data = makeNextData({ title: undefined, name: undefined });
    expect(parseNextDataRecipe(data, URL)).toBeNull();
  });

  it("returns null when no pageProps are present", () => {
    expect(parseNextDataRecipe({ props: {} }, URL)).toBeNull();
  });

  it("returns null when ingredients are empty", () => {
    const data = makeNextData({ constituents: [] });
    expect(parseNextDataRecipe(data, URL)).toBeNull();
  });

  it("handles missing nutritionalFacts gracefully", () => {
    const data = makeNextData({ nutritionalFacts: [] });
    const result = parseNextDataRecipe(data, URL);
    expect(result).not.toBeNull();
    expect(result!.jowNutritionPerServing).toBeNull();
  });

  it("handles missing timing gracefully", () => {
    const data = makeNextData({
      cookingTime: undefined,
      preparationTime: undefined,
    });
    const result = parseNextDataRecipe(data, URL);
    expect(result).not.toBeNull();
    expect(result!.cookTimeMin).toBeNull();
    expect(result!.prepTimeMin).toBeNull();
    expect(result!.totalTimeMin).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseJsonLdRecipe
// ---------------------------------------------------------------------------
describe("parseJsonLdRecipe", () => {
  const URL = "https://jow.fr/recipes/salade-composee-abcdef1234567890xy";

  function makeJsonLd(overrides: Record<string, unknown> = {}) {
    return {
      "@type": "Recipe",
      name: "Salade composee",
      description: "Fraiche et legere",
      recipeIngredient: ["200 g tomates", "100 g concombre", "50 g feta"],
      recipeInstructions: [
        { text: "Couper les legumes" },
        { text: "Melanger avec la feta" },
      ],
      nutrition: {
        calories: "350 kcal",
        proteinContent: "12 g",
        carbohydrateContent: "25 g",
        fatContent: "20 g",
        fiberContent: "5 g",
      },
      aggregateRating: {
        ratingValue: 4.5,
        ratingCount: 120,
      },
      recipeYield: "4 servings",
      image: "https://img.jow.fr/salade.jpg",
      cookTime: "PT15M",
      prepTime: "PT10M",
      totalTime: "PT25M",
      recipeCuisine: "Francaise",
      recipeCategory: "Salade",
      ...overrides,
    };
  }

  it("extracts a complete recipe from JSON-LD", () => {
    const result = parseJsonLdRecipe(makeJsonLd(), URL);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Salade composee");
    expect(result!.jowId).toBe("abcdef1234567890xy");
    expect(result!.ingredients).toHaveLength(3);
    expect(result!.ingredients[0].name).toBe("tomates");
    expect(result!.ingredients[0].quantity).toBe(200);
    expect(result!.ingredients[0].unit).toBe("g");
    expect(result!.instructions).toEqual([
      "Couper les legumes",
      "Melanger avec la feta",
    ]);
    expect(result!.cookTimeMin).toBe(15);
    expect(result!.prepTimeMin).toBe(10);
    expect(result!.totalTimeMin).toBe(25);
    expect(result!.rating).toBe(4.5);
    expect(result!.ratingCount).toBe(120);
    expect(result!.originalPortions).toBe(4);
    expect(result!.cuisine).toBe("Francaise");
    expect(result!.category).toBe("Salade");
    expect(result!.jowNutritionPerServing).toEqual({
      calories: 350,
      fat: 20,
      carbs: 25,
      protein: 12,
      fiber: 5,
    });
  });

  it("returns null when name is missing", () => {
    expect(parseJsonLdRecipe(makeJsonLd({ name: undefined }), URL)).toBeNull();
  });

  it("returns null when ingredients are empty", () => {
    expect(
      parseJsonLdRecipe(makeJsonLd({ recipeIngredient: [] }), URL),
    ).toBeNull();
  });

  it("handles missing nutrition gracefully", () => {
    const result = parseJsonLdRecipe(
      makeJsonLd({ nutrition: undefined }),
      URL,
    );
    expect(result).not.toBeNull();
    expect(result!.jowNutritionPerServing).toBeNull();
  });

  it("handles missing aggregateRating gracefully", () => {
    const result = parseJsonLdRecipe(
      makeJsonLd({ aggregateRating: undefined }),
      URL,
    );
    expect(result).not.toBeNull();
    expect(result!.rating).toBeNull();
    expect(result!.ratingCount).toBeNull();
  });

  it("parses recipeYield as number", () => {
    const result = parseJsonLdRecipe(makeJsonLd({ recipeYield: 6 }), URL);
    expect(result!.originalPortions).toBe(6);
  });

  it("parses recipeYield as array", () => {
    const result = parseJsonLdRecipe(
      makeJsonLd({ recipeYield: ["4 personnes"] }),
      URL,
    );
    expect(result!.originalPortions).toBe(4);
  });
});
