import { describe, expect, it } from "vitest";
import {
  calculateVarietyScore,
  dailyToWeekly,
  macroScore,
  matchColor,
  scorePlan,
  sumMacros,
} from "../score";
import type { MealSlot, ScoredRecipe, WeeklyMacroTargets } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecipe(overrides: Partial<ScoredRecipe> = {}): ScoredRecipe {
  return {
    id: overrides.id ?? "r1",
    title: overrides.title ?? "Test Recipe",
    perServing: overrides.perServing ?? { calories: 500, protein: 30, carbs: 60, fat: 20 },
    confidence: overrides.confidence ?? "high",
    cuisine: overrides.cuisine ?? "francaise",
    category: overrides.category ?? "plat",
  };
}

function makeSlot(
  dayIndex: number,
  mealType: "midi" | "soir",
  recipe: Partial<ScoredRecipe> = {},
): MealSlot {
  return { dayIndex, mealType, recipe: makeRecipe(recipe) };
}

// ---------------------------------------------------------------------------
// macroScore
// ---------------------------------------------------------------------------

describe("macroScore", () => {
  it("returns 100 for exact match", () => {
    const result = macroScore(700, 700);
    expect(result).toEqual({ target: 700, actual: 700, delta: 0, percentage: 100 });
  });

  it("returns 50 for 10% over target", () => {
    const result = macroScore(770, 700);
    expect(result.delta).toBe(70);
    expect(result.percentage).toBe(50);
  });

  it("returns 50 for 10% under target (symmetric)", () => {
    const result = macroScore(630, 700);
    expect(result.delta).toBe(-70);
    expect(result.percentage).toBe(50);
  });

  it("returns 0 for 20% over target (ceiling)", () => {
    const result = macroScore(840, 700);
    expect(result.delta).toBe(140);
    expect(result.percentage).toBe(0);
  });

  it("returns 0 for 20% under target (ceiling)", () => {
    const result = macroScore(560, 700);
    expect(result.delta).toBe(-140);
    expect(result.percentage).toBe(0);
  });

  it("returns 0 for deviation beyond ceiling (> 20%)", () => {
    const result = macroScore(1000, 700);
    expect(result.percentage).toBe(0);
  });

  it("handles target of 0 with actual of 0 -> 100", () => {
    const result = macroScore(0, 0);
    expect(result).toEqual({ target: 0, actual: 0, delta: 0, percentage: 100 });
  });

  it("handles target of 0 with actual > 0 -> 0", () => {
    const result = macroScore(50, 0);
    expect(result).toEqual({ target: 0, actual: 50, delta: 50, percentage: 0 });
  });

  it("returns 75 for 5% deviation", () => {
    // deviationRatio = 35/700 = 0.05
    // (1 - 0.05/0.2) * 100 = 75
    const result = macroScore(735, 700);
    expect(result.percentage).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// dailyToWeekly
// ---------------------------------------------------------------------------

describe("dailyToWeekly", () => {
  it("multiplies each macro field by 7", () => {
    const result = dailyToWeekly({ calories: 2500, protein: 150, carbs: 300, fat: 80 });
    expect(result).toEqual({ calories: 17500, protein: 1050, carbs: 2100, fat: 560 });
  });

  it("handles zeros", () => {
    const result = dailyToWeekly({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

// ---------------------------------------------------------------------------
// sumMacros
// ---------------------------------------------------------------------------

describe("sumMacros", () => {
  it("sums macros across two slots", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { perServing: { calories: 500, protein: 30, carbs: 60, fat: 20 } }),
      makeSlot(0, "soir", { perServing: { calories: 600, protein: 40, carbs: 70, fat: 25 } }),
    ];
    const result = sumMacros(slots);
    expect(result).toEqual({ calories: 1100, protein: 70, carbs: 130, fat: 45 });
  });

  it("returns all zeros for empty array", () => {
    const result = sumMacros([]);
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("sums all 14 slots correctly", () => {
    const slots: MealSlot[] = [];
    for (let d = 0; d < 7; d++) {
      slots.push(
        makeSlot(d, "midi", { perServing: { calories: 500, protein: 30, carbs: 60, fat: 20 } }),
      );
      slots.push(
        makeSlot(d, "soir", { perServing: { calories: 600, protein: 40, carbs: 70, fat: 25 } }),
      );
    }
    expect(slots).toHaveLength(14);
    const result = sumMacros(slots);
    expect(result).toEqual({
      calories: 7 * (500 + 600),
      protein: 7 * (30 + 40),
      carbs: 7 * (60 + 70),
      fat: 7 * (20 + 25),
    });
  });
});

// ---------------------------------------------------------------------------
// calculateVarietyScore
// ---------------------------------------------------------------------------

describe("calculateVarietyScore", () => {
  it("returns 100 when no consecutive duplicates", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { cuisine: "francaise", category: "plat" }),
      makeSlot(0, "soir", { cuisine: "italienne", category: "soupe" }),
      makeSlot(1, "midi", { cuisine: "asiatique", category: "salade" }),
      makeSlot(1, "soir", { cuisine: "mexicaine", category: "dessert" }),
    ];
    expect(calculateVarietyScore(slots)).toBe(100);
  });

  it("returns low score when all same cuisine and category", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { cuisine: "francaise", category: "plat" }),
      makeSlot(0, "soir", { cuisine: "francaise", category: "plat" }),
      makeSlot(1, "midi", { cuisine: "francaise", category: "plat" }),
      makeSlot(1, "soir", { cuisine: "francaise", category: "plat" }),
    ];
    // 3 consecutive pairs, all duplicates on both cuisine and category
    // duplicateCount = 3 (each consecutive pair shares cuisine or category)
    // score = 100 - (3 / 3) * 100 = 0
    expect(calculateVarietyScore(slots)).toBe(0);
  });

  it("does not penalize null cuisines", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { cuisine: null, category: "plat" }),
      makeSlot(0, "soir", { cuisine: null, category: "soupe" }),
      makeSlot(1, "midi", { cuisine: null, category: "salade" }),
    ];
    // cuisine is null -> no cuisine penalty
    // categories all different -> no category penalty
    expect(calculateVarietyScore(slots)).toBe(100);
  });

  it("does not penalize null categories", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { cuisine: "francaise", category: null }),
      makeSlot(0, "soir", { cuisine: "italienne", category: null }),
    ];
    expect(calculateVarietyScore(slots)).toBe(100);
  });

  it("penalizes consecutive same cuisine even if category differs", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { cuisine: "francaise", category: "plat" }),
      makeSlot(0, "soir", { cuisine: "francaise", category: "soupe" }),
      makeSlot(1, "midi", { cuisine: "italienne", category: "plat" }),
    ];
    // pair 0-1: same cuisine -> duplicate
    // pair 1-2: different cuisine, different category -> no duplicate
    // duplicateCount = 1, totalSlots-1 = 2
    // score = 100 - (1/2)*100 = 50
    expect(calculateVarietyScore(slots)).toBe(50);
  });

  it("returns 100 for single slot", () => {
    const slots: MealSlot[] = [makeSlot(0, "midi")];
    expect(calculateVarietyScore(slots)).toBe(100);
  });

  it("returns 100 for empty slots", () => {
    expect(calculateVarietyScore([])).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// scorePlan
// ---------------------------------------------------------------------------

describe("scorePlan", () => {
  const perfectTargets: WeeklyMacroTargets = {
    calories: 7700,
    protein: 490,
    carbs: 910,
    fat: 315,
  };

  it("returns 100 for perfect macro match with all-different variety", () => {
    // Each slot: 550 cal, 35p, 65c, 22.5f -> 14 slots = 7700, 490, 910, 315
    const slots: MealSlot[] = [];
    const cuisines = [
      "francaise",
      "italienne",
      "asiatique",
      "mexicaine",
      "indienne",
      "libanaise",
      "japonaise",
      "thai",
      "marocaine",
      "espagnole",
      "grecque",
      "coree",
      "vietnamienne",
      "bresilienne",
    ];
    for (let d = 0; d < 7; d++) {
      slots.push(
        makeSlot(d, "midi", {
          id: `r${d * 2}`,
          perServing: { calories: 550, protein: 35, carbs: 65, fat: 22.5 },
          cuisine: cuisines[d * 2],
          category: `cat${d * 2}`,
        }),
      );
      slots.push(
        makeSlot(d, "soir", {
          id: `r${d * 2 + 1}`,
          perServing: { calories: 550, protein: 35, carbs: 65, fat: 22.5 },
          cuisine: cuisines[d * 2 + 1],
          category: `cat${d * 2 + 1}`,
        }),
      );
    }
    const result = scorePlan(slots, perfectTargets);
    expect(result.overall).toBe(100);
    expect(result.protein.percentage).toBe(100);
    expect(result.calories.percentage).toBe(100);
    expect(result.carbs.percentage).toBe(100);
    expect(result.fat.percentage).toBe(100);
    expect(result.variety).toBe(100);
  });

  it("returns weighted score for 10% deviation on all macros", () => {
    // 10% deviation -> macroScore = 50 for each
    // variety = 100 (all different)
    // weighted = 0.30*50 + 0.25*50 + 0.20*50 + 0.15*50 + 0.10*100
    // = 15 + 12.5 + 10 + 7.5 + 10 = 55
    const slots: MealSlot[] = [];
    // Target weekly: 7700 cal, 490p, 910c, 315f
    // 10% over: 8470, 539, 1001, 346.5
    // per slot (14 slots): 605, 38.5, 71.5, 24.75
    const cuisines = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
    for (let d = 0; d < 7; d++) {
      slots.push(
        makeSlot(d, "midi", {
          id: `r${d * 2}`,
          perServing: { calories: 605, protein: 38.5, carbs: 71.5, fat: 24.75 },
          cuisine: cuisines[d * 2],
          category: `cat${d * 2}`,
        }),
      );
      slots.push(
        makeSlot(d, "soir", {
          id: `r${d * 2 + 1}`,
          perServing: { calories: 605, protein: 38.5, carbs: 71.5, fat: 24.75 },
          cuisine: cuisines[d * 2 + 1],
          category: `cat${d * 2 + 1}`,
        }),
      );
    }
    const result = scorePlan(slots, perfectTargets);
    expect(result.protein.percentage).toBe(50);
    expect(result.calories.percentage).toBe(50);
    expect(result.carbs.percentage).toBe(50);
    expect(result.fat.percentage).toBe(50);
    expect(result.variety).toBe(100);
    expect(result.overall).toBe(55);
  });

  it("uses custom weights when provided", () => {
    // All macros exact match -> 100 each, variety = 100
    // Custom weights: all macros 0.25, variety 0
    // overall = 0.25*100 + 0.25*100 + 0.25*100 + 0.25*100 + 0*100 = 100
    const slots: MealSlot[] = [];
    for (let d = 0; d < 7; d++) {
      slots.push(
        makeSlot(d, "midi", {
          id: `r${d * 2}`,
          perServing: { calories: 550, protein: 35, carbs: 65, fat: 22.5 },
          cuisine: `c${d * 2}`,
          category: `cat${d * 2}`,
        }),
      );
      slots.push(
        makeSlot(d, "soir", {
          id: `r${d * 2 + 1}`,
          perServing: { calories: 550, protein: 35, carbs: 65, fat: 22.5 },
          cuisine: `c${d * 2 + 1}`,
          category: `cat${d * 2 + 1}`,
        }),
      );
    }
    const customWeights = { protein: 0.25, calories: 0.25, carbs: 0.25, fat: 0.25, variety: 0 };
    const result = scorePlan(slots, perfectTargets, customWeights);
    expect(result.overall).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// matchColor
// ---------------------------------------------------------------------------

describe("matchColor", () => {
  it('returns "green" for score >= 85', () => {
    expect(matchColor(85)).toBe("green");
    expect(matchColor(90)).toBe("green");
    expect(matchColor(100)).toBe("green");
  });

  it('returns "yellow" for score >= 65 and < 85', () => {
    expect(matchColor(65)).toBe("yellow");
    expect(matchColor(70)).toBe("yellow");
    expect(matchColor(84)).toBe("yellow");
  });

  it('returns "red" for score < 65', () => {
    expect(matchColor(0)).toBe("red");
    expect(matchColor(50)).toBe("red");
    expect(matchColor(64)).toBe("red");
  });
});
