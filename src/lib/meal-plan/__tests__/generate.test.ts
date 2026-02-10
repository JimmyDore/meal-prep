import { describe, expect, it } from "vitest";
import { generateMealPlan } from "../generate";
import type { GenerationParams, ScoredRecipe, WeeklyMacroTargets } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a ScoredRecipe with given per-serving macros.
 */
function makeRecipe(
  id: string,
  macros: { calories: number; protein: number; carbs: number; fat: number },
  overrides: Partial<ScoredRecipe> = {},
): ScoredRecipe {
  return {
    id,
    title: `Recipe ${id}`,
    perServing: macros,
    confidence: overrides.confidence ?? "high",
    cuisine: overrides.cuisine ?? null,
    category: overrides.category ?? null,
  };
}

/**
 * Simple seeded PRNG (linear congruential generator) for deterministic tests.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Weekly targets: ~2000 kcal/day => 14000/week, 150g protein/day => 1050/week, etc.
 */
const weeklyTargets: WeeklyMacroTargets = {
  calories: 14000,
  protein: 1050,
  carbs: 2100,
  fat: 700,
};

/**
 * Generate a pool of N recipes with uniform macros close to target/14 per serving.
 */
function makePool(size: number): ScoredRecipe[] {
  return Array.from({ length: size }, (_, i) =>
    makeRecipe(`r${i}`, {
      calories: 1000 + i * 10,
      protein: 75 + i,
      carbs: 150 + i * 2,
      fat: 50 + i,
    }),
  );
}

/**
 * Generate a pool of N "perfect" recipes where each has exactly target/14 macros.
 */
function makePerfectPool(size: number, targets: WeeklyMacroTargets): ScoredRecipe[] {
  return Array.from({ length: size }, (_, i) =>
    makeRecipe(`p${i}`, {
      calories: targets.calories / 14,
      protein: targets.protein / 14,
      carbs: targets.carbs / 14,
      fat: targets.fat / 14,
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateMealPlan", () => {
  // -------------------------------------------------------------------------
  // Basic generation
  // -------------------------------------------------------------------------

  it("generates 14 slots with a pool of 20+ recipes", () => {
    const pool = makePool(25);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    expect(result.slots).toHaveLength(14);
  });

  it("all 14 recipes are unique (no duplicates)", () => {
    const pool = makePool(30);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    const ids = result.slots.map((s) => s.recipe.id);
    expect(new Set(ids).size).toBe(14);
  });

  // -------------------------------------------------------------------------
  // Slot assignment
  // -------------------------------------------------------------------------

  it("slot assignment: dayIndex 0-6 each appears exactly twice", () => {
    const pool = makePool(25);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    const dayCounts = new Map<number, number>();
    for (const slot of result.slots) {
      dayCounts.set(slot.dayIndex, (dayCounts.get(slot.dayIndex) ?? 0) + 1);
    }

    // 7 days, each with exactly 2 meals
    expect(dayCounts.size).toBe(7);
    for (let day = 0; day < 7; day++) {
      expect(dayCounts.get(day)).toBe(2);
    }
  });

  it("slot assignment: each day has one midi and one soir", () => {
    const pool = makePool(25);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    for (let day = 0; day < 7; day++) {
      const daySlots = result.slots.filter((s) => s.dayIndex === day);
      const types = daySlots.map((s) => s.mealType).sort();
      expect(types).toEqual(["midi", "soir"]);
    }
  });

  // -------------------------------------------------------------------------
  // Determinism
  // -------------------------------------------------------------------------

  it("deterministic with seeded random: same seed + same pool = same result", () => {
    const pool = makePool(30);
    const params: GenerationParams = {
      weeklyTargets,
      recipePool: pool,
      iterations: 20,
      random: seededRandom(123),
    };

    const result1 = generateMealPlan({ ...params, random: seededRandom(123) });
    const result2 = generateMealPlan({ ...params, random: seededRandom(123) });

    const ids1 = result1.slots.map((s) => s.recipe.id);
    const ids2 = result2.slots.map((s) => s.recipe.id);
    expect(ids1).toEqual(ids2);
    expect(result1.score.overall).toBe(result2.score.overall);
  });

  it("different seeds produce different plans", () => {
    const pool = makePool(30);
    const result1 = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      iterations: 20,
      random: seededRandom(1),
    });
    const result2 = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      iterations: 20,
      random: seededRandom(999),
    });

    const ids1 = result1.slots.map((s) => s.recipe.id);
    const ids2 = result2.slots.map((s) => s.recipe.id);
    // With 30 recipes and different seeds, plans should differ
    expect(ids1).not.toEqual(ids2);
  });

  // -------------------------------------------------------------------------
  // Score quality
  // -------------------------------------------------------------------------

  it("score is computed and overall > 0 for reasonable inputs", () => {
    const pool = makePool(25);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    expect(result.score.overall).toBeGreaterThan(0);
    expect(result.score.protein).toBeDefined();
    expect(result.score.carbs).toBeDefined();
    expect(result.score.fat).toBeDefined();
    expect(result.score.calories).toBeDefined();
    expect(result.score.variety).toBeDefined();
  });

  it("perfect match: 14 recipes with target/14 macros -> score near 100", () => {
    const pool = makePerfectPool(20, weeklyTargets);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    // With perfect recipes, any 14 should yield a near-perfect score
    expect(result.score.overall).toBeGreaterThanOrEqual(90);
  });

  // -------------------------------------------------------------------------
  // Edge cases: empty and small pools
  // -------------------------------------------------------------------------

  it("empty pool returns empty plan with warning", () => {
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: [],
      random: seededRandom(42),
    });

    expect(result.slots).toHaveLength(0);
    expect(result.score.overall).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("0"))).toBe(true);
  });

  it("pool of exactly 14 still works (no optimization room but no crash)", () => {
    const pool = makePool(14);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    expect(result.slots).toHaveLength(14);
    // All 14 must be used since pool == slots needed
    const ids = result.slots.map((s) => s.recipe.id);
    expect(new Set(ids).size).toBe(14);
  });

  it("small pool (< 14) generates partial plan with warning", () => {
    const pool = makePool(8);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    expect(result.slots).toHaveLength(8);
    expect(result.warnings.some((w) => w.includes("8"))).toBe(true);
  });

  it("pool < 30 produces a warning about limited variety", () => {
    const pool = makePool(20);
    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    expect(result.warnings.some((w) => w.toLowerCase().includes("variete"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Confidence filtering
  // -------------------------------------------------------------------------

  it("low confidence filtering: filters out low-confidence recipes", () => {
    // 10 high + 10 low confidence recipes = 20 total
    const highPool = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(`h${i}`, { calories: 1000, protein: 75, carbs: 150, fat: 50 }),
    );
    const lowPool = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(
        `l${i}`,
        { calories: 1000, protein: 75, carbs: 150, fat: 50 },
        { confidence: "low" },
      ),
    );
    const pool = [...highPool, ...lowPool];

    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    // Filtered pool has only 10 high-confidence (< 14), so should fall back to full pool
    // But still: algorithm should work without crash
    expect(result.slots.length).toBeGreaterThan(0);
  });

  it("falls back to full pool with warning when filtered pool < 14 but original >= 14", () => {
    // 10 high + 8 low = 18 total, filtered = 10 (< 14), so fallback
    const highPool = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(`h${i}`, { calories: 1000, protein: 75, carbs: 150, fat: 50 }),
    );
    const lowPool = Array.from({ length: 8 }, (_, i) =>
      makeRecipe(
        `l${i}`,
        { calories: 1000, protein: 75, carbs: 150, fat: 50 },
        { confidence: "low" },
      ),
    );
    const pool = [...highPool, ...lowPool];

    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    expect(result.slots).toHaveLength(14);
    expect(result.warnings.some((w) => w.toLowerCase().includes("fiable"))).toBe(true);
  });

  it("uses filtered pool when it has >= 14 high/medium confidence recipes", () => {
    // 16 high + 10 low = 26 total, filtered = 16 (>= 14), so uses filtered
    const highPool = Array.from({ length: 16 }, (_, i) =>
      makeRecipe(`h${i}`, { calories: 1000, protein: 75, carbs: 150, fat: 50 }),
    );
    const lowPool = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(
        `l${i}`,
        { calories: 900, protein: 60, carbs: 120, fat: 40 },
        { confidence: "low" },
      ),
    );
    const pool = [...highPool, ...lowPool];

    const result = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      random: seededRandom(42),
    });

    // All selected recipes should be high confidence (no low ones)
    for (const slot of result.slots) {
      expect(slot.recipe.confidence).not.toBe("low");
    }
  });

  // -------------------------------------------------------------------------
  // Local optimization
  // -------------------------------------------------------------------------

  it("local optimization improves score vs pure random", () => {
    // Create a pool with one clearly better recipe that initial random might miss
    const baseMacros = {
      calories: weeklyTargets.calories / 14,
      protein: weeklyTargets.protein / 14,
      carbs: weeklyTargets.carbs / 14,
      fat: weeklyTargets.fat / 14,
    };

    // 14 "okay" recipes with slightly off macros
    const okayPool = Array.from({ length: 14 }, (_, i) =>
      makeRecipe(`ok${i}`, {
        calories: baseMacros.calories * 1.15,
        protein: baseMacros.protein * 1.15,
        carbs: baseMacros.carbs * 1.15,
        fat: baseMacros.fat * 1.15,
      }),
    );

    // 6 "perfect" recipes -- optimizer should swap these in
    const perfectPool = Array.from({ length: 6 }, (_, i) => makeRecipe(`perf${i}`, baseMacros));

    const pool = [...okayPool, ...perfectPool];

    // With 0 local passes (pure random restart)
    const randomOnly = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      iterations: 10,
      maxLocalPasses: 0,
      random: seededRandom(42),
    });

    // With local optimization
    const withOptimization = generateMealPlan({
      weeklyTargets,
      recipePool: pool,
      iterations: 10,
      maxLocalPasses: 3,
      random: seededRandom(42),
    });

    // Optimization should produce equal or better score
    expect(withOptimization.score.overall).toBeGreaterThanOrEqual(randomOnly.score.overall);
  });
});
