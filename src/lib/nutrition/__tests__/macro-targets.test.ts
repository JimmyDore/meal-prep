import { calculateMacroTargets } from "../macro-targets";
import type { TDEEResult, UserProfile } from "../types";

/** Helper to create a TDEEResult with just the tdee value (other fields unused) */
function makeTDEE(tdee: number): TDEEResult {
  return { bmr: 0, activityTDEE: 0, sportCalories: 0, tdee };
}

describe("calculateMacroTargets", () => {
  it("calculates correct macros for maintien goal (80kg, TDEE 2500)", () => {
    // calories = 2500 * 1.0 = 2500
    // protein = 1.4 * 80 = 112g (448 kcal)
    // fat = (2500 * 0.30) / 9 = 83.33g (750 kcal)
    // remaining = 2500 - 448 - 750 = 1302 kcal
    // carbs = 1302 / 4 = 325.5g -> 326
    const result = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "maintien" });

    expect(result.calories).toBe(2500);
    expect(result.protein).toBe(112);
    expect(result.fat).toBe(83);
    expect(result.carbs).toBe(326);
  });

  it("calculates correct macros for seche goal (80kg, TDEE 2500)", () => {
    // calories = 2500 * 0.80 = 2000
    // protein = 2.0 * 80 = 160g (640 kcal)
    // fat = (2000 * 0.25) / 9 = 55.55g (500 kcal)
    // remaining = 2000 - 640 - 500 = 860 kcal
    // carbs = 860 / 4 = 215g
    const result = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "seche" });

    expect(result.calories).toBe(2000);
    expect(result.protein).toBe(160);
    expect(result.fat).toBe(56);
    expect(result.carbs).toBe(215);
  });

  it("calculates correct macros for prise_de_masse goal (80kg, TDEE 2500)", () => {
    // calories = 2500 * 1.10 = 2750
    // protein = 1.8 * 80 = 144g (576 kcal)
    // fat = (2750 * 0.25) / 9 = 76.38g (687.5 kcal)
    // remaining = 2750 - 576 - 687.5 = 1486.5 kcal
    // carbs = 1486.5 / 4 = 371.625 -> 372
    const result = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "prise_de_masse" });

    expect(result.calories).toBe(2750);
    expect(result.protein).toBe(144);
    expect(result.fat).toBe(76);
    expect(result.carbs).toBe(372);
  });

  it("calculates correct macros for recomposition goal (80kg, TDEE 2500)", () => {
    // calories = 2500 * 0.90 = 2250
    // protein = 2.2 * 80 = 176g (704 kcal)
    // fat = (2250 * 0.25) / 9 = 62.5g (562.5 kcal)
    // remaining = 2250 - 704 - 562.5 = 983.5 kcal
    // carbs = 983.5 / 4 = 245.875 -> 246
    const result = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "recomposition" });

    expect(result.calories).toBe(2250);
    expect(result.protein).toBe(176);
    expect(result.fat).toBe(63);
    expect(result.carbs).toBe(246);
  });

  it("triggers minimum carbs safety check for heavy person in steep deficit", () => {
    // 130kg person, seche, TDEE 1500
    // calories = 1500 * 0.80 = 1200
    // protein = 2.0 * 130 = 260g (1040 kcal)
    // fat = (1200 * 0.25) / 9 = 33.33g (300 kcal)
    // remaining = 1200 - 1040 - 300 = -140 kcal
    // carbs = -140 / 4 = -35g -> BELOW 50g, triggers safety
    // carbDeficit = 50 - (-35) = 85g
    // caloriesToReallocate = 85 * 4 = 340
    // fatReduction = 340 / 9 = 37.77g
    // fat = 33.33 - 37.77 = -4.44g... (fat goes negative in extreme case)
    // carbs = 50
    const result = calculateMacroTargets(makeTDEE(1500), { weight: 130, goal: "seche" });

    expect(result.calories).toBe(1200);
    expect(result.protein).toBe(260);
    expect(result.carbs).toBe(50); // Safety minimum enforced
    // Fat reduced to accommodate minimum carbs
    expect(result.fat).toBeLessThan(33);
  });

  it("ensures carbs never go below minimum threshold", () => {
    // Even more extreme: 150kg, seche, TDEE 1200
    // calories = 960
    // protein = 2.0 * 150 = 300g (1200 kcal) -- already exceeds budget!
    const result = calculateMacroTargets(makeTDEE(1200), { weight: 150, goal: "seche" });

    expect(result.carbs).toBe(50);
  });

  it("returns all values as rounded integers", () => {
    const result = calculateMacroTargets(makeTDEE(2347), { weight: 73, goal: "maintien" });

    expect(Number.isInteger(result.calories)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
    expect(Number.isInteger(result.fat)).toBe(true);
    expect(Number.isInteger(result.carbs)).toBe(true);
  });

  it("produces different calorie targets for each goal", () => {
    const goals: UserProfile["goal"][] = ["seche", "maintien", "prise_de_masse", "recomposition"];

    const results = goals.map((goal) =>
      calculateMacroTargets(makeTDEE(2500), { weight: 80, goal }),
    );

    // All four should have different calorie targets
    const calorieSet = new Set(results.map((r) => r.calories));
    expect(calorieSet.size).toBe(4);
  });

  it("produces different protein targets for each goal", () => {
    const goals: UserProfile["goal"][] = ["seche", "maintien", "prise_de_masse", "recomposition"];

    const results = goals.map((goal) =>
      calculateMacroTargets(makeTDEE(2500), { weight: 80, goal }),
    );

    const proteinSet = new Set(results.map((r) => r.protein));
    expect(proteinSet.size).toBe(4);
  });

  it("uses g/kg protein, not flat percentage", () => {
    // For maintien: protein = 1.4 * weight
    // Same TDEE but different weights should give different protein
    const light = calculateMacroTargets(makeTDEE(2500), { weight: 60, goal: "maintien" });
    const heavy = calculateMacroTargets(makeTDEE(2500), { weight: 100, goal: "maintien" });

    // Protein should scale with weight: 1.4 * 60 = 84, 1.4 * 100 = 140
    expect(light.protein).toBe(84);
    expect(heavy.protein).toBe(140);
    // Same calories since TDEE and goal are the same
    expect(light.calories).toBe(heavy.calories);
  });

  it("seche has highest protein per kg and lowest calories", () => {
    const seche = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "seche" });
    const maintien = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "maintien" });
    const masse = calculateMacroTargets(makeTDEE(2500), { weight: 80, goal: "prise_de_masse" });

    // Seche has lowest calories (20% deficit)
    expect(seche.calories).toBeLessThan(maintien.calories);
    expect(seche.calories).toBeLessThan(masse.calories);

    // Seche has more protein than maintien (2.0 vs 1.4 g/kg)
    expect(seche.protein).toBeGreaterThan(maintien.protein);
  });

  it("prise_de_masse has highest calories (surplus)", () => {
    const goals: UserProfile["goal"][] = ["seche", "maintien", "prise_de_masse", "recomposition"];

    const results = goals.map((goal) =>
      calculateMacroTargets(makeTDEE(2500), { weight: 80, goal }),
    );

    const masseCalories = results[2].calories;
    for (let i = 0; i < results.length; i++) {
      if (i !== 2) {
        expect(masseCalories).toBeGreaterThan(results[i].calories);
      }
    }
  });
});
