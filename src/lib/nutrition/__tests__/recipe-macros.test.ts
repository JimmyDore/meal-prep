import { describe, expect, it } from "vitest";
import { calculateRecipeMacros } from "../recipe-macros";

describe("calculateRecipeMacros", () => {
  describe("basic recipe calculation", () => {
    it("calculates per-serving macros for a 2-ingredient, 4-portion recipe", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Poulet",
            quantity: 0.5,
            unit: "Kilogramme",
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
          },
          {
            name: "Riz basmati",
            quantity: 0.3,
            unit: "Kilogramme",
            caloriesPer100g: 130,
            proteinPer100g: 2.7,
            carbsPer100g: 28,
            fatPer100g: 0.3,
          },
        ],
        4,
      );

      // Quantities are per-cover (per person) from Jow:
      // 500g chicken (factor 5) + 300g rice (factor 3) = 1 serving
      // Per serving (= sum of per-cover ingredients):
      // Calories: 5*165 + 3*130 = 825 + 390 = 1215
      // Protein: 5*31 + 3*2.7 = 155 + 8.1 = 163.1
      // Carbs: 5*0 + 3*28 = 84
      // Fat: 5*3.6 + 3*0.3 = 18 + 0.9 = 18.9
      expect(result.perServing).toEqual({
        calories: 1215,
        protein: 163,
        carbs: 84,
        fat: 19,
      });

      // Total recipe = perServing * 4 portions
      expect(result.totalRecipe).toEqual({
        calories: 4860,
        protein: 652,
        carbs: 336,
        fat: 76,
      });

      expect(result.confidence).toBe("high");
      expect(result.convertedCount).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.missingIngredients).toEqual([]);
    });

    it("handles single ingredient with 1 portion", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Oeuf",
            quantity: 2,
            unit: "Pi\u00e8ce",
            caloriesPer100g: 155,
            proteinPer100g: 13,
            carbsPer100g: 1.1,
            fatPer100g: 11,
          },
        ],
        1,
      );

      // 2 eggs = 110g (2 * 55), factor = 1.1
      // Calories: 1.1 * 155 = 170.5 -> 171
      // Protein: 1.1 * 13 = 14.3 -> 14
      // Carbs: 1.1 * 1.1 = 1.21 -> 1
      // Fat: 1.1 * 11 = 12.1 -> 12
      expect(result.perServing).toEqual({
        calories: 171,
        protein: 14,
        carbs: 1,
        fat: 12,
      });
      expect(result.totalRecipe).toEqual(result.perServing);
    });
  });

  describe("missing ingredient macro data", () => {
    it("skips ingredient with null caloriesPer100g and tracks as missing", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Poulet",
            quantity: 0.5,
            unit: "Kilogramme",
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
          },
          {
            name: "Mystere",
            quantity: 1,
            unit: "Kilogramme",
            caloriesPer100g: null,
            proteinPer100g: null,
            carbsPer100g: null,
            fatPer100g: null,
          },
          {
            name: "Riz",
            quantity: 0.3,
            unit: "Kilogramme",
            caloriesPer100g: 130,
            proteinPer100g: 2.7,
            carbsPer100g: 28,
            fatPer100g: 0.3,
          },
        ],
        2,
      );

      expect(result.convertedCount).toBe(2);
      expect(result.totalCount).toBe(3);
      expect(result.missingIngredients).toEqual(["Mystere"]);
      // Confidence: 2/3 = 0.667 < 0.7 -> low
      expect(result.confidence).toBe("low");
    });
  });

  describe("unknown unit", () => {
    it("adds ingredient with unknown unit to missingIngredients", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Poulet",
            quantity: 0.5,
            unit: "Kilogramme",
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
          },
          {
            name: "Epice magique",
            quantity: 1,
            unit: "SomeWeirdUnit",
            caloriesPer100g: 300,
            proteinPer100g: 10,
            carbsPer100g: 60,
            fatPer100g: 5,
          },
        ],
        1,
      );

      expect(result.convertedCount).toBe(1);
      expect(result.totalCount).toBe(2);
      expect(result.missingIngredients).toEqual(["Epice magique"]);
    });
  });

  describe("null quantity", () => {
    it("skips ingredient with null quantity", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Poulet",
            quantity: 0.5,
            unit: "Kilogramme",
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
          },
          {
            name: "Sel",
            quantity: null,
            unit: "Pinc\u00e9e",
            caloriesPer100g: 0,
            proteinPer100g: 0,
            carbsPer100g: 0,
            fatPer100g: 0,
          },
        ],
        1,
      );

      expect(result.convertedCount).toBe(1);
      expect(result.totalCount).toBe(2);
      expect(result.missingIngredients).toEqual(["Sel"]);
    });
  });

  describe("zero and negative portions", () => {
    it("treats 0 portions as 1", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Poulet",
            quantity: 0.5,
            unit: "Kilogramme",
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
          },
        ],
        0,
      );

      // Should be same as total (divided by 1)
      expect(result.perServing).toEqual(result.totalRecipe);
    });

    it("treats negative portions as 1", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Riz",
            quantity: 0.3,
            unit: "Kilogramme",
            caloriesPer100g: 130,
            proteinPer100g: 2.7,
            carbsPer100g: 28,
            fatPer100g: 0.3,
          },
        ],
        -2,
      );

      expect(result.perServing).toEqual(result.totalRecipe);
    });
  });

  describe("confidence thresholds", () => {
    it("returns high confidence when all ingredients convert (10/10)", () => {
      const ingredients = Array.from({ length: 10 }, (_, i) => ({
        name: `Ingredient ${i}`,
        quantity: 0.1,
        unit: "Kilogramme",
        caloriesPer100g: 100,
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 5,
      }));

      const result = calculateRecipeMacros(ingredients, 1);
      expect(result.confidence).toBe("high");
      expect(result.convertedCount).toBe(10);
    });

    it("returns high confidence at exactly 90% (9/10)", () => {
      const ingredients = Array.from({ length: 9 }, (_, i) => ({
        name: `Ingredient ${i}`,
        quantity: 0.1,
        unit: "Kilogramme",
        caloriesPer100g: 100,
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 5,
      }));
      ingredients.push({
        name: "Missing",
        quantity: 1,
        unit: "Kilogramme",
        caloriesPer100g: null as unknown as number,
        proteinPer100g: null as unknown as number,
        carbsPer100g: null as unknown as number,
        fatPer100g: null as unknown as number,
      });

      const result = calculateRecipeMacros(ingredients, 1);
      expect(result.confidence).toBe("high");
      expect(result.convertedCount).toBe(9);
    });

    it("returns medium confidence at 80% (8/10)", () => {
      const good = Array.from({ length: 8 }, (_, i) => ({
        name: `Ingredient ${i}`,
        quantity: 0.1,
        unit: "Kilogramme",
        caloriesPer100g: 100,
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 5,
      }));
      const bad = Array.from({ length: 2 }, (_, i) => ({
        name: `Missing ${i}`,
        quantity: 1,
        unit: "Kilogramme",
        caloriesPer100g: null as unknown as number,
        proteinPer100g: null as unknown as number,
        carbsPer100g: null as unknown as number,
        fatPer100g: null as unknown as number,
      }));

      const result = calculateRecipeMacros([...good, ...bad], 1);
      expect(result.confidence).toBe("medium");
      expect(result.convertedCount).toBe(8);
    });

    it("returns medium confidence at exactly 70% (7/10)", () => {
      const good = Array.from({ length: 7 }, (_, i) => ({
        name: `Ingredient ${i}`,
        quantity: 0.1,
        unit: "Kilogramme",
        caloriesPer100g: 100,
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 5,
      }));
      const bad = Array.from({ length: 3 }, (_, i) => ({
        name: `Missing ${i}`,
        quantity: 1,
        unit: "Kilogramme",
        caloriesPer100g: null as unknown as number,
        proteinPer100g: null as unknown as number,
        carbsPer100g: null as unknown as number,
        fatPer100g: null as unknown as number,
      }));

      const result = calculateRecipeMacros([...good, ...bad], 1);
      expect(result.confidence).toBe("medium");
      expect(result.convertedCount).toBe(7);
    });

    it("returns low confidence at 50% (5/10)", () => {
      const good = Array.from({ length: 5 }, (_, i) => ({
        name: `Ingredient ${i}`,
        quantity: 0.1,
        unit: "Kilogramme",
        caloriesPer100g: 100,
        proteinPer100g: 10,
        carbsPer100g: 10,
        fatPer100g: 5,
      }));
      const bad = Array.from({ length: 5 }, (_, i) => ({
        name: `Missing ${i}`,
        quantity: 1,
        unit: "Kilogramme",
        caloriesPer100g: null as unknown as number,
        proteinPer100g: null as unknown as number,
        carbsPer100g: null as unknown as number,
        fatPer100g: null as unknown as number,
      }));

      const result = calculateRecipeMacros([...good, ...bad], 1);
      expect(result.confidence).toBe("low");
      expect(result.convertedCount).toBe(5);
    });
  });

  describe("empty ingredients", () => {
    it("returns all zeros and low confidence for empty array", () => {
      const result = calculateRecipeMacros([], 4);

      expect(result.perServing).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
      expect(result.totalRecipe).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
      expect(result.confidence).toBe("low");
      expect(result.convertedCount).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.missingIngredients).toEqual([]);
    });
  });

  describe("rounding behavior", () => {
    it("rounds macro values to nearest integer", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Poulet",
            quantity: 0.15,
            unit: "Kilogramme",
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0.4,
            fatPer100g: 3.6,
          },
        ],
        1,
      );

      // 150g, factor 1.5
      // Calories: 1.5 * 165 = 247.5 -> 248
      // Protein: 1.5 * 31 = 46.5 -> 47 (rounds up at .5)
      // Carbs: 1.5 * 0.4 = 0.6 -> 1
      // Fat: 1.5 * 3.6 = 5.4 -> 5
      expect(result.totalRecipe).toEqual({
        calories: 248,
        protein: 47,
        carbs: 1,
        fat: 5,
      });
    });
  });

  describe("null sub-macros with non-null calories", () => {
    it("treats null protein/carbs/fat as 0 when calories are present", () => {
      const result = calculateRecipeMacros(
        [
          {
            name: "Huile",
            quantity: 2,
            unit: "Cuill\u00e8re \u00e0 soupe",
            caloriesPer100g: 884,
            proteinPer100g: null,
            carbsPer100g: null,
            fatPer100g: 99.9,
          },
        ],
        1,
      );

      // 2 * 15g = 30g, factor 0.3
      // Calories: 0.3 * 884 = 265.2 -> 265
      // Protein: 0 (null treated as 0)
      // Carbs: 0 (null treated as 0)
      // Fat: 0.3 * 99.9 = 29.97 -> 30
      expect(result.totalRecipe).toEqual({
        calories: 265,
        protein: 0,
        carbs: 0,
        fat: 30,
      });
      expect(result.convertedCount).toBe(1);
    });
  });
});
