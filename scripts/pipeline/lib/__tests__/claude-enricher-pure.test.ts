import { describe, expect, it } from "vitest";
import {
  boundsCheck,
  crossValidateNutrition,
  parseClaudeOutput,
  validateIngredients,
} from "../claude-enricher";
import type { EnrichedIngredient, ScrapedRecipe } from "../types";

// ---------------------------------------------------------------------------
// parseClaudeOutput
// ---------------------------------------------------------------------------
describe("parseClaudeOutput", () => {
  it("parses structured_output.ingredients from Claude CLI JSON", () => {
    const raw = JSON.stringify({
      type: "result",
      structured_output: {
        ingredients: [
          {
            name: "Poulet",
            proteinPer100g: 25,
            carbsPer100g: 0,
            fatPer100g: 3,
            caloriesPer100g: 130,
            confidence: "high",
          },
        ],
      },
    });

    const result = parseClaudeOutput(raw);
    expect(result).not.toBeNull();
    expect(result!.ingredients).toHaveLength(1);
    expect(result!.ingredients[0].name).toBe("Poulet");
    expect(result!.ingredients[0].proteinPer100g).toBe(25);
  });

  it("parses result field containing JSON string", () => {
    const inner = JSON.stringify({
      ingredients: [
        {
          name: "Riz",
          proteinPer100g: 7,
          carbsPer100g: 80,
          fatPer100g: 1,
          caloriesPer100g: 360,
          confidence: "high",
        },
      ],
    });
    const raw = JSON.stringify({ result: inner });

    const result = parseClaudeOutput(raw);
    expect(result).not.toBeNull();
    expect(result!.ingredients[0].name).toBe("Riz");
  });

  it("parses root-level ingredients", () => {
    const raw = JSON.stringify({
      ingredients: [
        {
          name: "Tomate",
          proteinPer100g: 1,
          carbsPer100g: 4,
          fatPer100g: 0.2,
          caloriesPer100g: 18,
          confidence: "high",
        },
      ],
    });

    const result = parseClaudeOutput(raw);
    expect(result).not.toBeNull();
    expect(result!.ingredients[0].name).toBe("Tomate");
  });

  it("returns null when no ingredients key found", () => {
    const raw = JSON.stringify({ type: "result", text: "no ingredients here" });
    expect(parseClaudeOutput(raw)).toBeNull();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseClaudeOutput("not valid json")).toThrow();
  });

  it("returns null when result field is non-JSON string without ingredients", () => {
    const raw = JSON.stringify({ result: "plain text response" });
    expect(parseClaudeOutput(raw)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateIngredients
// ---------------------------------------------------------------------------
describe("validateIngredients", () => {
  it("validates a correct ingredient array", () => {
    const raw = [
      {
        name: "Poulet",
        proteinPer100g: 25,
        carbsPer100g: 0,
        fatPer100g: 3,
        caloriesPer100g: 130,
        confidence: "high",
      },
      {
        name: "Riz",
        proteinPer100g: 7,
        carbsPer100g: 80,
        fatPer100g: 1,
        caloriesPer100g: 360,
        confidence: "medium",
      },
    ];

    const result = validateIngredients(raw);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Poulet");
    expect(result[1].confidence).toBe("medium");
  });

  it("rejects protein > 100", () => {
    const raw = [
      {
        name: "Invalid",
        proteinPer100g: 101,
        carbsPer100g: 0,
        fatPer100g: 0,
        caloriesPer100g: 100,
        confidence: "high",
      },
    ];

    expect(() => validateIngredients(raw)).toThrow(/validation failed/i);
  });

  it("rejects negative calories", () => {
    const raw = [
      {
        name: "Invalid",
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 10,
        caloriesPer100g: -5,
        confidence: "high",
      },
    ];

    expect(() => validateIngredients(raw)).toThrow(/validation failed/i);
  });

  it("rejects calories > 900", () => {
    const raw = [
      {
        name: "Invalid",
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 10,
        caloriesPer100g: 901,
        confidence: "high",
      },
    ];

    expect(() => validateIngredients(raw)).toThrow(/validation failed/i);
  });

  it("rejects invalid confidence value", () => {
    const raw = [
      {
        name: "Invalid",
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 10,
        caloriesPer100g: 100,
        confidence: "invalid",
      },
    ];

    expect(() => validateIngredients(raw)).toThrow(/validation failed/i);
  });

  it("accepts boundary values (0 protein, 100 carbs, 0 fat, 900 calories)", () => {
    const raw = [
      {
        name: "Boundary",
        proteinPer100g: 0,
        carbsPer100g: 100,
        fatPer100g: 0,
        caloriesPer100g: 900,
        confidence: "low",
      },
    ];

    const result = validateIngredients(raw);
    expect(result).toHaveLength(1);
    expect(result[0].caloriesPer100g).toBe(900);
  });

  it("rejects missing name", () => {
    const raw = [
      {
        name: "",
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 10,
        caloriesPer100g: 100,
        confidence: "high",
      },
    ];

    expect(() => validateIngredients(raw)).toThrow(/validation failed/i);
  });
});

// ---------------------------------------------------------------------------
// boundsCheck
// ---------------------------------------------------------------------------
describe("boundsCheck", () => {
  it("returns empty array for valid ingredients", () => {
    const ingredients: EnrichedIngredient[] = [
      {
        name: "Poulet",
        proteinPer100g: 25,
        carbsPer100g: 0,
        fatPer100g: 3,
        caloriesPer100g: 130,
        confidence: "high",
      },
    ];

    expect(boundsCheck(ingredients)).toEqual([]);
  });

  it("detects when protein+carbs+fat > 100g", () => {
    const ingredients: EnrichedIngredient[] = [
      {
        name: "Overloaded",
        proteinPer100g: 50,
        carbsPer100g: 40,
        fatPer100g: 20,
        caloriesPer100g: 500,
        confidence: "high",
      },
    ];

    const errors = boundsCheck(ingredients);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Overloaded");
    expect(errors[0]).toContain("> 100g");
  });

  it("detects calorie divergence > 20%", () => {
    // Expected: 25*4 + 30*4 + 10*9 = 100+120+90 = 310
    // Actual: 500 => divergence = 190/310 = 61%
    const ingredients: EnrichedIngredient[] = [
      {
        name: "BadCalories",
        proteinPer100g: 25,
        carbsPer100g: 30,
        fatPer100g: 10,
        caloriesPer100g: 500,
        confidence: "high",
      },
    ];

    const errors = boundsCheck(ingredients);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.includes("diverges"))).toBe(true);
  });

  it("accepts exact boundary values (total macros = 100)", () => {
    // 30+30+40 = 100 (exactly at the limit)
    // Expected cal: 30*4+30*4+40*9 = 120+120+360 = 600
    const ingredients: EnrichedIngredient[] = [
      {
        name: "Exact100",
        proteinPer100g: 30,
        carbsPer100g: 30,
        fatPer100g: 40,
        caloriesPer100g: 600,
        confidence: "high",
      },
    ];

    expect(boundsCheck(ingredients)).toEqual([]);
  });

  it("returns multiple errors for multiple problematic ingredients", () => {
    const ingredients: EnrichedIngredient[] = [
      {
        name: "Bad1",
        proteinPer100g: 50,
        carbsPer100g: 30,
        fatPer100g: 25,
        caloriesPer100g: 500,
        confidence: "high",
      },
      {
        name: "Bad2",
        proteinPer100g: 60,
        carbsPer100g: 30,
        fatPer100g: 20,
        caloriesPer100g: 400,
        confidence: "medium",
      },
    ];

    const errors = boundsCheck(ingredients);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty ingredients array", () => {
    expect(boundsCheck([])).toEqual([]);
  });

  it("accepts calories within 20% of expected", () => {
    // Expected: 10*4 + 20*4 + 5*9 = 40+80+45 = 165
    // Actual: 180 => divergence = 15/165 = 9% (within 20%)
    const ingredients: EnrichedIngredient[] = [
      {
        name: "CloseEnough",
        proteinPer100g: 10,
        carbsPer100g: 20,
        fatPer100g: 5,
        caloriesPer100g: 180,
        confidence: "high",
      },
    ];

    expect(boundsCheck(ingredients)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// crossValidateNutrition
// ---------------------------------------------------------------------------
describe("crossValidateNutrition", () => {
  function makeRecipe(overrides: Partial<ScrapedRecipe> = {}): ScrapedRecipe {
    return {
      title: "Test Recipe",
      description: "",
      jowId: "testid1234567890",
      jowUrl: "https://jow.fr/recipes/test-testid1234567890",
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
      originalPortions: 2,
      ingredients: [
        { name: "poulet", quantity: 200, unit: "g", originalText: "200 g poulet" },
        { name: "riz", quantity: 300, unit: "g", originalText: "300 g riz" },
      ],
      jowNutritionPerServing: {
        calories: 400,
        protein: 30,
        carbs: 50,
        fat: 10,
        fiber: 3,
      },
      ...overrides,
    };
  }

  const ENRICHED: EnrichedIngredient[] = [
    {
      name: "poulet",
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 3,
      caloriesPer100g: 130,
      confidence: "high",
    },
    {
      name: "riz",
      proteinPer100g: 7,
      carbsPer100g: 80,
      fatPer100g: 1,
      caloriesPer100g: 360,
      confidence: "high",
    },
  ];

  it("returns valid when no Jow nutrition data available", () => {
    const recipe = makeRecipe({ jowNutritionPerServing: null });
    const result = crossValidateNutrition(ENRICHED, recipe);
    expect(result.valid).toBe(true);
    expect(result.divergence).toBe(0);
  });

  it("returns valid when ingredient units are not grams", () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: "poulet", quantity: 2, unit: "pieces", originalText: "2 pieces poulet" },
      ],
    });
    const result = crossValidateNutrition(ENRICHED, recipe);
    expect(result.valid).toBe(true);
    expect(result.divergence).toBe(0);
  });

  it("returns valid when ingredient quantities are null", () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: "poulet", quantity: null, unit: null, originalText: "poulet" },
      ],
    });
    const result = crossValidateNutrition(ENRICHED, recipe);
    expect(result.valid).toBe(true);
    expect(result.divergence).toBe(0);
  });

  it("validates with close estimates (divergence < 30%)", () => {
    // With portions=2: poulet 200g => factor=200/100/2=1, riz 300g => factor=300/100/2=1.5
    // Estimated calories: 130*1 + 360*1.5 = 130+540 = 670
    // Jow says: 400 => divergence = 270/400 = 67.5% => should FAIL
    // Let's adjust Jow to be closer
    const recipe = makeRecipe({
      jowNutritionPerServing: {
        calories: 670,
        protein: 35.5,
        carbs: 120,
        fat: 4.5,
        fiber: 0,
      },
    });

    const result = crossValidateNutrition(ENRICHED, recipe);
    expect(result.valid).toBe(true);
    expect(result.divergence).toBeLessThan(0.3);
  });

  it("detects significant divergence (> 30%)", () => {
    // Estimated values will differ significantly from Jow
    const recipe = makeRecipe({
      jowNutritionPerServing: {
        calories: 50, // very low compared to estimate
        protein: 5,
        carbs: 5,
        fat: 1,
        fiber: 0,
      },
    });

    const result = crossValidateNutrition(ENRICHED, recipe);
    expect(result.valid).toBe(false);
    expect(result.divergence).toBeGreaterThan(0.3);
  });

  it("handles enriched ingredient not matching recipe ingredient name", () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: "unknown", quantity: 200, unit: "g", originalText: "200 g unknown" },
      ],
    });

    // enrichedMap won't find "unknown" -> hasAllGrams becomes false
    const result = crossValidateNutrition(ENRICHED, recipe);
    expect(result.valid).toBe(true);
    expect(result.divergence).toBe(0);
  });
});
