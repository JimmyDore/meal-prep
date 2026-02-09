import { calculateBMR } from "../bmr";

describe("calculateBMR", () => {
  it("calculates correct BMR for a standard male profile", () => {
    // 80kg, 180cm, 30yo male
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    const result = calculateBMR({ weight: 80, height: 180, age: 30, sex: "homme" });
    expect(result.bmr).toBe(1780);
  });

  it("calculates correct BMR for a standard female profile", () => {
    // 60kg, 165cm, 25yo female
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    const result = calculateBMR({ weight: 60, height: 165, age: 25, sex: "femme" });
    expect(result.bmr).toBe(1345);
  });

  it("handles edge case: very light person", () => {
    // 45kg, 150cm, 18yo female
    // BMR = 10*45 + 6.25*150 - 5*18 - 161 = 450 + 937.5 - 90 - 161 = 1136.5 -> 1137
    const result = calculateBMR({ weight: 45, height: 150, age: 18, sex: "femme" });
    expect(result.bmr).toBe(1137);
  });

  it("handles edge case: heavy person", () => {
    // 120kg, 195cm, 50yo male
    // BMR = 10*120 + 6.25*195 - 5*50 + 5 = 1200 + 1218.75 - 250 + 5 = 2173.75 -> 2174
    const result = calculateBMR({ weight: 120, height: 195, age: 50, sex: "homme" });
    expect(result.bmr).toBe(2174);
  });

  it("handles edge case: elderly person with positive BMR", () => {
    // 70kg, 170cm, 80yo male
    // BMR = 10*70 + 6.25*170 - 5*80 + 5 = 700 + 1062.5 - 400 + 5 = 1367.5 -> 1368
    const result = calculateBMR({ weight: 70, height: 170, age: 80, sex: "homme" });
    expect(result.bmr).toBe(1368);
    expect(result.bmr).toBeGreaterThan(0);
  });

  it("always returns an integer (rounding)", () => {
    // 60kg, 165cm, 25yo female -> 1345.25, rounds to 1345
    const result = calculateBMR({ weight: 60, height: 165, age: 25, sex: "femme" });
    expect(Number.isInteger(result.bmr)).toBe(true);
  });

  it("produces a difference of exactly 166 between male and female with same profile", () => {
    // The only difference between male and female formulas is +5 vs -161
    // Difference = 5 - (-161) = 166
    const maleProfile = { weight: 75, height: 175, age: 35, sex: "homme" as const };
    const femaleProfile = { weight: 75, height: 175, age: 35, sex: "femme" as const };

    const maleResult = calculateBMR(maleProfile);
    const femaleResult = calculateBMR(femaleProfile);

    expect(maleResult.bmr - femaleResult.bmr).toBe(166);
  });

  it("returns higher BMR for heavier weight with same other params", () => {
    const light = calculateBMR({ weight: 60, height: 170, age: 30, sex: "homme" });
    const heavy = calculateBMR({ weight: 90, height: 170, age: 30, sex: "homme" });

    // Each additional kg adds 10 kcal: (90-60)*10 = 300
    expect(heavy.bmr - light.bmr).toBe(300);
    expect(heavy.bmr).toBeGreaterThan(light.bmr);
  });

  it("returns lower BMR for older age with same other params", () => {
    const young = calculateBMR({ weight: 70, height: 170, age: 20, sex: "homme" });
    const old = calculateBMR({ weight: 70, height: 170, age: 50, sex: "homme" });

    // Each additional year subtracts 5 kcal: (50-20)*5 = 150
    expect(young.bmr - old.bmr).toBe(150);
    expect(young.bmr).toBeGreaterThan(old.bmr);
  });

  it("returns higher BMR for taller height with same other params", () => {
    const short = calculateBMR({ weight: 70, height: 160, age: 30, sex: "homme" });
    const tall = calculateBMR({ weight: 70, height: 190, age: 30, sex: "homme" });

    // Each additional cm adds 6.25 kcal: (190-160)*6.25 = 187.5 -> rounded individually
    expect(tall.bmr).toBeGreaterThan(short.bmr);
    // Both should be integers
    expect(Number.isInteger(short.bmr)).toBe(true);
    expect(Number.isInteger(tall.bmr)).toBe(true);
  });
});
