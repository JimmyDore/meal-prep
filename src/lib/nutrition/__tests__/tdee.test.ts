import { calculateTDEE } from "../tdee";
import type { SportSession, UserProfile } from "../types";

describe("calculateTDEE", () => {
  it("calculates correct TDEE for sedentary person with no sport", () => {
    // BMR 1780, sedentaire (1.2), 80kg, no sport
    // activityTDEE = 1780 * 1.2 = 2136
    // sportCalories = 0
    // tdee = 2136
    const result = calculateTDEE({ bmr: 1780 }, { weight: 80, activityLevel: "sedentaire" }, []);

    expect(result.bmr).toBe(1780);
    expect(result.activityTDEE).toBe(2136);
    expect(result.sportCalories).toBe(0);
    expect(result.tdee).toBe(2136);
  });

  it("calculates correct TDEE for active person with multiple sport sessions", () => {
    // BMR 1780, legerement_actif (1.3), 80kg
    // Course 3x/week: (9.0 - 1) * 80 * 1.0 * 3 = 1920 kcal/week
    // Musculation 2x/week: (5.0 - 1) * 80 * 1.0 * 2 = 640 kcal/week
    // Total weekly: 2560, daily: 2560/7 = 365.71... -> 366
    // activityTDEE = 1780 * 1.3 = 2314
    // tdee = 2314 + 365.71... = 2679.71... -> 2680
    const sportSessions: SportSession[] = [
      { activityType: "course", weeklyFrequency: 3 },
      { activityType: "musculation", weeklyFrequency: 2 },
    ];

    const result = calculateTDEE(
      { bmr: 1780 },
      { weight: 80, activityLevel: "legerement_actif" },
      sportSessions,
    );

    expect(result.bmr).toBe(1780);
    expect(result.activityTDEE).toBe(2314);
    expect(result.sportCalories).toBe(366);
    expect(result.tdee).toBe(2680);
  });

  it("handles empty sport sessions array with zero sport calories", () => {
    const result = calculateTDEE(
      { bmr: 1600 },
      { weight: 65, activityLevel: "moderement_actif" },
      [],
    );

    expect(result.sportCalories).toBe(0);
    expect(result.tdee).toBe(result.activityTDEE);
  });

  it("handles single sport with high frequency (velo 5x/week)", () => {
    // BMR 1700, sedentaire (1.2), 80kg
    // Velo 5x/week: (7.0 - 1) * 80 * 1.5 * 5 = 3600 kcal/week, daily = 3600/7 = 514.28... -> 514
    // activityTDEE = 1700 * 1.2 = 2040
    // tdee = 2040 + 514.28... = 2554.28... -> 2554
    const result = calculateTDEE({ bmr: 1700 }, { weight: 80, activityLevel: "sedentaire" }, [
      { activityType: "velo", weeklyFrequency: 5 },
    ]);

    expect(result.activityTDEE).toBe(2040);
    expect(result.sportCalories).toBe(514);
    expect(result.tdee).toBe(2554);
  });

  it("produces increasing TDEE across activity levels (no sport)", () => {
    const levels = [
      "sedentaire",
      "legerement_actif",
      "moderement_actif",
      "actif",
      "tres_actif",
    ] as const;

    const results = levels.map((level) =>
      calculateTDEE({ bmr: 1780 }, { weight: 80, activityLevel: level }, []),
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i].tdee).toBeGreaterThan(results[i - 1].tdee);
      expect(results[i].activityTDEE).toBeGreaterThan(results[i - 1].activityTDEE);
    }
  });

  it("returns all values as rounded integers", () => {
    // Use values that produce fractional intermediate results
    const sportSessions: SportSession[] = [
      { activityType: "course", weeklyFrequency: 3 },
      { activityType: "yoga", weeklyFrequency: 2 },
    ];

    const result = calculateTDEE(
      { bmr: 1780 },
      { weight: 73, activityLevel: "legerement_actif" },
      sportSessions,
    );

    expect(Number.isInteger(result.bmr)).toBe(true);
    expect(Number.isInteger(result.activityTDEE)).toBe(true);
    expect(Number.isInteger(result.sportCalories)).toBe(true);
    expect(Number.isInteger(result.tdee)).toBe(true);
  });

  it("correctly subtracts 1 MET to avoid double-counting rest", () => {
    // Yoga has MET 2.5 -- net MET should be 1.5
    // 1 session/week, 80kg, 1.0h duration
    // Sport calories per week = 1.5 * 80 * 1.0 * 1 = 120
    // Daily = 120 / 7 = 17.14... -> 17
    const result = calculateTDEE({ bmr: 1780 }, { weight: 80, activityLevel: "sedentaire" }, [
      { activityType: "yoga", weeklyFrequency: 1 },
    ]);

    expect(result.sportCalories).toBe(17);
  });

  it("handles sport_collectif with 1.5h default duration", () => {
    // sport_collectif: MET 7.5, duration 1.5h
    // Net MET = 6.5
    // 2x/week, 80kg: 6.5 * 80 * 1.5 * 2 = 1560 kcal/week
    // Daily = 1560 / 7 = 222.85... -> 223
    const result = calculateTDEE({ bmr: 1700 }, { weight: 80, activityLevel: "sedentaire" }, [
      { activityType: "sport_collectif", weeklyFrequency: 2 },
    ]);

    expect(result.sportCalories).toBe(223);
  });

  it("sums multiple sport types correctly", () => {
    // Natation 2x: (5.8 - 1) * 60 * 1.0 * 2 = 576 /week
    // Marche 5x: (4.3 - 1) * 60 * 1.0 * 5 = 990 /week
    // Total weekly: 1566, daily = 1566/7 = 223.71... -> 224
    const result = calculateTDEE({ bmr: 1400 }, { weight: 60, activityLevel: "sedentaire" }, [
      { activityType: "natation", weeklyFrequency: 2 },
      { activityType: "marche", weeklyFrequency: 5 },
    ]);

    expect(result.sportCalories).toBe(224);
  });

  it("preserves BMR value in result", () => {
    const result = calculateTDEE({ bmr: 1500 }, { weight: 70, activityLevel: "actif" }, []);

    expect(result.bmr).toBe(1500);
  });

  it("calculates activityTDEE correctly for each multiplier", () => {
    // Verify exact multiplier values
    const expected: Record<string, number> = {
      sedentaire: Math.round(2000 * 1.2), // 2400
      legerement_actif: Math.round(2000 * 1.3), // 2600
      moderement_actif: Math.round(2000 * 1.4), // 2800
      actif: Math.round(2000 * 1.5), // 3000
      tres_actif: Math.round(2000 * 1.6), // 3200
    };

    for (const [level, expectedTDEE] of Object.entries(expected)) {
      const result = calculateTDEE(
        { bmr: 2000 },
        { weight: 80, activityLevel: level as UserProfile["activityLevel"] },
        [],
      );
      expect(result.activityTDEE).toBe(expectedTDEE);
    }
  });
});
