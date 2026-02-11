import { describe, expect, it } from "vitest";
import {
  calculateDailyBalanceScore,
  calculateVarietyScore,
  dailyToWeekly,
  macroScore,
  matchColor,
  scaleDailyTargets,
  scorePlan,
  sumMacros,
} from "../score";
import type { MealSlot, ScoredRecipe, ScoringWeights, WeeklyMacroTargets } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecipe(overrides: Partial<ScoredRecipe> = {}): ScoredRecipe {
  return {
    id: overrides.id ?? "r1",
    title: overrides.title ?? "Test Recipe",
    perServing: overrides.perServing ?? { calories: 500, protein: 30, carbs: 60, fat: 20 },
    confidence: overrides.confidence ?? "high",
    cuisine: "cuisine" in overrides ? (overrides.cuisine as string | null) : "francaise",
    category: "category" in overrides ? (overrides.category as string | null) : "plat",
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

  it("returns 80 for 10% over target", () => {
    // deviationRatio = 70/700 = 0.10
    // (1 - 0.10/0.5) * 100 = 80
    const result = macroScore(770, 700);
    expect(result.delta).toBe(70);
    expect(result.percentage).toBe(80);
  });

  it("returns 80 for 10% under target (symmetric)", () => {
    const result = macroScore(630, 700);
    expect(result.delta).toBe(-70);
    expect(result.percentage).toBe(80);
  });

  it("returns 60 for 20% over target", () => {
    // deviationRatio = 140/700 = 0.20
    // (1 - 0.20/0.5) * 100 = 60
    const result = macroScore(840, 700);
    expect(result.delta).toBe(140);
    expect(result.percentage).toBe(60);
  });

  it("returns 60 for 20% under target", () => {
    const result = macroScore(560, 700);
    expect(result.delta).toBe(-140);
    expect(result.percentage).toBe(60);
  });

  it("returns 0 for deviation at ceiling (50%)", () => {
    // 50% over: 1050, deviation = 350/700 = 0.50
    const result = macroScore(1050, 700);
    expect(result.percentage).toBe(0);
  });

  it("returns 0 for deviation beyond ceiling (> 50%)", () => {
    const result = macroScore(1200, 700);
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

  it("returns 90 for 5% deviation", () => {
    // deviationRatio = 35/700 = 0.05
    // (1 - 0.05/0.5) * 100 = 90
    const result = macroScore(735, 700);
    expect(result.percentage).toBe(90);
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
// scaleDailyTargets
// ---------------------------------------------------------------------------

describe("scaleDailyTargets", () => {
  it("scales daily targets by default MEAL_COVERAGE_RATIO (0.65)", () => {
    const result = scaleDailyTargets({ calories: 2551, protein: 178, carbs: 300, fat: 71 });
    expect(result).toEqual({
      calories: Math.round(2551 * 0.65),
      protein: Math.round(178 * 0.65),
      carbs: Math.round(300 * 0.65),
      fat: Math.round(71 * 0.65),
    });
  });

  it("accepts custom ratio", () => {
    const result = scaleDailyTargets({ calories: 2000, protein: 150, carbs: 250, fat: 60 }, 0.5);
    expect(result).toEqual({ calories: 1000, protein: 75, carbs: 125, fat: 30 });
  });

  it("handles ratio of 1.0 (full day)", () => {
    const daily = { calories: 2500, protein: 150, carbs: 300, fat: 80 };
    const result = scaleDailyTargets(daily, 1.0);
    expect(result).toEqual(daily);
  });

  it("rounds to nearest integer", () => {
    const result = scaleDailyTargets({ calories: 100, protein: 100, carbs: 100, fat: 100 }, 0.33);
    expect(result).toEqual({ calories: 33, protein: 33, carbs: 33, fat: 33 });
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
// calculateDailyBalanceScore
// ---------------------------------------------------------------------------

describe("calculateDailyBalanceScore", () => {
  it("returns 100 when all days hit the daily target exactly", () => {
    // All 7 days have same total calories (500 + 600 = 1100 each), target = 1100
    const slots: MealSlot[] = [];
    for (let d = 0; d < 7; d++) {
      slots.push(
        makeSlot(d, "midi", { perServing: { calories: 500, protein: 30, carbs: 60, fat: 20 } }),
      );
      slots.push(
        makeSlot(d, "soir", { perServing: { calories: 600, protein: 40, carbs: 70, fat: 25 } }),
      );
    }
    expect(calculateDailyBalanceScore(slots, 1100)).toBe(100);
  });

  it("returns 0 when days deviate from target by ceiling amount", () => {
    // Day 0: 1500 kcal, Day 1: 500 kcal, target = 1000
    // MAPE = (|1500-1000|/1000 + |500-1000|/1000) / 2 = (0.5 + 0.5) / 2 = 0.5
    // score = (1 - 0.5/0.5) * 100 = 0
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { perServing: { calories: 800, protein: 30, carbs: 60, fat: 20 } }),
      makeSlot(0, "soir", { perServing: { calories: 700, protein: 40, carbs: 70, fat: 25 } }),
      makeSlot(1, "midi", { perServing: { calories: 200, protein: 10, carbs: 30, fat: 10 } }),
      makeSlot(1, "soir", { perServing: { calories: 300, protein: 15, carbs: 35, fat: 12 } }),
    ];
    expect(calculateDailyBalanceScore(slots, 1000)).toBe(0);
  });

  it("penalizes consistently under-target days (not just unevenness)", () => {
    // Both days at 600 kcal, target = 1000 -> evenly distributed but far from target
    // MAPE = (|600-1000|/1000 + |600-1000|/1000) / 2 = (0.4 + 0.4) / 2 = 0.4
    // score = (1 - 0.4/0.5) * 100 = 20
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { perServing: { calories: 300, protein: 20, carbs: 40, fat: 15 } }),
      makeSlot(0, "soir", { perServing: { calories: 300, protein: 20, carbs: 40, fat: 15 } }),
      makeSlot(1, "midi", { perServing: { calories: 300, protein: 20, carbs: 40, fat: 15 } }),
      makeSlot(1, "soir", { perServing: { calories: 300, protein: 20, carbs: 40, fat: 15 } }),
    ];
    expect(calculateDailyBalanceScore(slots, 1000)).toBe(20);
  });

  it("returns intermediate score for moderate deviation from target", () => {
    // Day 0: 1200 kcal, Day 1: 800 kcal, target = 1000
    // MAPE = (|1200-1000|/1000 + |800-1000|/1000) / 2 = (0.2 + 0.2) / 2 = 0.2
    // score = (1 - 0.2/0.5) * 100 = 60
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { perServing: { calories: 600, protein: 30, carbs: 60, fat: 20 } }),
      makeSlot(0, "soir", { perServing: { calories: 600, protein: 40, carbs: 70, fat: 25 } }),
      makeSlot(1, "midi", { perServing: { calories: 400, protein: 20, carbs: 40, fat: 15 } }),
      makeSlot(1, "soir", { perServing: { calories: 400, protein: 25, carbs: 45, fat: 18 } }),
    ];
    expect(calculateDailyBalanceScore(slots, 1000)).toBe(60);
  });

  it("returns 100 for empty slots", () => {
    expect(calculateDailyBalanceScore([], 1000)).toBe(100);
  });

  it("returns 100 for single slot (single day)", () => {
    const slots: MealSlot[] = [makeSlot(0, "midi")];
    expect(calculateDailyBalanceScore(slots, 1000)).toBe(100);
  });

  it("returns 100 for single day with two meals", () => {
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { perServing: { calories: 500, protein: 30, carbs: 60, fat: 20 } }),
      makeSlot(0, "soir", { perServing: { calories: 700, protein: 40, carbs: 70, fat: 25 } }),
    ];
    // Only one day -> not enough days to compute meaningful balance
    expect(calculateDailyBalanceScore(slots, 1200)).toBe(100);
  });

  it("accepts custom ceiling parameter", () => {
    // Day 0: 1200, Day 1: 800, target = 1000
    // MAPE = 0.2, custom ceiling = 0.4
    // score = (1 - 0.2/0.4) * 100 = 50
    const slots: MealSlot[] = [
      makeSlot(0, "midi", { perServing: { calories: 600, protein: 30, carbs: 60, fat: 20 } }),
      makeSlot(0, "soir", { perServing: { calories: 600, protein: 40, carbs: 70, fat: 25 } }),
      makeSlot(1, "midi", { perServing: { calories: 400, protein: 20, carbs: 40, fat: 15 } }),
      makeSlot(1, "soir", { perServing: { calories: 400, protein: 25, carbs: 45, fat: 18 } }),
    ];
    expect(calculateDailyBalanceScore(slots, 1000, 0.4)).toBe(50);
  });

  it("returns 100 for zero daily target", () => {
    const slots: MealSlot[] = [makeSlot(0, "midi")];
    expect(calculateDailyBalanceScore(slots, 0)).toBe(100);
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

  it("returns 100 for perfect macro match with all-different variety and even days", () => {
    // Each slot: 550 cal, 35p, 65c, 22.5f -> 14 slots = 7700, 490, 910, 315
    // All days have identical calories (2*550=1100) -> dailyBalance = 100
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
    expect(result.dailyBalance).toBe(100);
  });

  it("returns weighted score for 10% deviation on all macros", () => {
    // 10% deviation -> macroScore = 80 for each (with DEVIATION_CEILING 0.5)
    // variety = 100 (all different)
    // dailyBalance: daily target = 7700/7 = 1100, actual = 2*605 = 1210/day
    //   MAPE = |1210-1100|/1100 = 0.1 -> (1 - 0.1/0.5) * 100 = 80
    // Weights: protein=0.25, calories=0.25, carbs=0.15, fat=0.1, variety=0.1, dailyBalance=0.15
    // weighted = 0.25*80 + 0.25*80 + 0.15*80 + 0.1*80 + 0.1*100 + 0.15*80
    // = 20 + 20 + 12 + 8 + 10 + 12 = 82
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
    expect(result.protein.percentage).toBe(80);
    expect(result.calories.percentage).toBe(80);
    expect(result.carbs.percentage).toBe(80);
    expect(result.fat.percentage).toBe(80);
    expect(result.variety).toBe(100);
    expect(result.dailyBalance).toBe(80);
    expect(result.overall).toBe(82);
  });

  it("uses custom weights when provided", () => {
    // All macros exact match -> 100 each, variety = 100, dailyBalance = 100
    // Custom weights: all macros 0.2, variety 0.1, dailyBalance 0.1
    // overall = 0.2*100 + 0.2*100 + 0.2*100 + 0.2*100 + 0.1*100 + 0.1*100 = 100
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
    const customWeights: ScoringWeights = {
      protein: 0.2,
      calories: 0.2,
      carbs: 0.2,
      fat: 0.2,
      variety: 0.1,
      dailyBalance: 0.1,
    };
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
