import { describe, expect, it } from "vitest";
import {
  activityLevelValues,
  activityTypeValues,
  dietaryPreferenceValues,
  dietarySchema,
  goalSchema,
  goalValues,
  physicalSchema,
  profileSchema,
  sexValues,
  sportActivitySchema,
  sportSchema,
} from "../profile";

// --- Helpers ---

function validPhysical() {
  return {
    weight: 75,
    height: 180,
    age: 30,
    sex: "homme" as const,
    activityLevel: "moderement_actif" as const,
  };
}

function validGoal() {
  return {
    goal: "maintien" as const,
    householdSize: 2,
  };
}

function validDietary() {
  return {
    dietaryPreferences: ["sans_gluten"] as const,
  };
}

function validSport() {
  return {
    sportActivities: [
      { activityType: "musculation" as const, weeklyFrequency: 3 },
    ],
  };
}

function validProfile() {
  return {
    ...validPhysical(),
    ...validGoal(),
    ...validDietary(),
    ...validSport(),
  };
}

// --- physicalSchema ---

describe("physicalSchema", () => {
  it("accepts valid physical data", () => {
    const result = physicalSchema.safeParse(validPhysical());
    expect(result.success).toBe(true);
  });

  it("accepts lower bounds (weight=30, height=100, age=14)", () => {
    const result = physicalSchema.safeParse({
      weight: 30,
      height: 100,
      age: 14,
      sex: "femme",
      activityLevel: "sedentaire",
    });
    expect(result.success).toBe(true);
  });

  it("accepts upper bounds (weight=300, height=250, age=100)", () => {
    const result = physicalSchema.safeParse({
      weight: 300,
      height: 250,
      age: 100,
      sex: "homme",
      activityLevel: "tres_actif",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid sex values", () => {
    for (const sex of sexValues) {
      const result = physicalSchema.safeParse({ ...validPhysical(), sex });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid activityLevel values", () => {
    for (const activityLevel of activityLevelValues) {
      const result = physicalSchema.safeParse({
        ...validPhysical(),
        activityLevel,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects weight below 30", () => {
    const result = physicalSchema.safeParse({
      ...validPhysical(),
      weight: 29,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight above 300", () => {
    const result = physicalSchema.safeParse({
      ...validPhysical(),
      weight: 301,
    });
    expect(result.success).toBe(false);
  });

  it("rejects height below 100", () => {
    const result = physicalSchema.safeParse({
      ...validPhysical(),
      height: 99,
    });
    expect(result.success).toBe(false);
  });

  it("rejects height above 250", () => {
    const result = physicalSchema.safeParse({
      ...validPhysical(),
      height: 251,
    });
    expect(result.success).toBe(false);
  });

  it("rejects age below 14", () => {
    const result = physicalSchema.safeParse({ ...validPhysical(), age: 13 });
    expect(result.success).toBe(false);
  });

  it("rejects age above 100", () => {
    const result = physicalSchema.safeParse({ ...validPhysical(), age: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sex value", () => {
    const result = physicalSchema.safeParse({
      ...validPhysical(),
      sex: "autre",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid activityLevel value", () => {
    const result = physicalSchema.safeParse({
      ...validPhysical(),
      activityLevel: "extreme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required field (weight)", () => {
    const { weight: _, ...noWeight } = validPhysical();
    const result = physicalSchema.safeParse(noWeight);
    expect(result.success).toBe(false);
  });

  it("rejects missing required field (sex)", () => {
    const { sex: _, ...noSex } = validPhysical();
    const result = physicalSchema.safeParse(noSex);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer age", () => {
    const result = physicalSchema.safeParse({ ...validPhysical(), age: 30.5 });
    expect(result.success).toBe(false);
  });
});

// --- goalSchema ---

describe("goalSchema", () => {
  it("accepts all valid goal values", () => {
    for (const goal of goalValues) {
      const result = goalSchema.safeParse({ goal, householdSize: 1 });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid goal value", () => {
    const result = goalSchema.safeParse({
      goal: "perte_de_poids",
      householdSize: 2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts householdSize at bounds (1 and 6)", () => {
    expect(
      goalSchema.safeParse({ goal: "maintien", householdSize: 1 }).success,
    ).toBe(true);
    expect(
      goalSchema.safeParse({ goal: "maintien", householdSize: 6 }).success,
    ).toBe(true);
  });

  it("rejects householdSize below 1", () => {
    const result = goalSchema.safeParse({
      goal: "maintien",
      householdSize: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects householdSize above 6", () => {
    const result = goalSchema.safeParse({
      goal: "maintien",
      householdSize: 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer householdSize", () => {
    const result = goalSchema.safeParse({
      goal: "seche",
      householdSize: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

// --- dietarySchema ---

describe("dietarySchema", () => {
  it("accepts empty preferences array", () => {
    const result = dietarySchema.safeParse({ dietaryPreferences: [] });
    expect(result.success).toBe(true);
  });

  it("accepts all valid dietary preference values", () => {
    const result = dietarySchema.safeParse({
      dietaryPreferences: [...dietaryPreferenceValues],
    });
    expect(result.success).toBe(true);
  });

  it("accepts single valid preference", () => {
    const result = dietarySchema.safeParse({
      dietaryPreferences: ["vegetarien"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid preference value in array", () => {
    const result = dietarySchema.safeParse({
      dietaryPreferences: ["vegetarien", "sans_sucre"],
    });
    expect(result.success).toBe(false);
  });
});

// --- sportActivitySchema ---

describe("sportActivitySchema", () => {
  it("accepts all valid activity types", () => {
    for (const activityType of activityTypeValues) {
      const result = sportActivitySchema.safeParse({
        activityType,
        weeklyFrequency: 3,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts weeklyFrequency at bounds (1 and 7)", () => {
    expect(
      sportActivitySchema.safeParse({
        activityType: "course",
        weeklyFrequency: 1,
      }).success,
    ).toBe(true);
    expect(
      sportActivitySchema.safeParse({
        activityType: "course",
        weeklyFrequency: 7,
      }).success,
    ).toBe(true);
  });

  it("rejects weeklyFrequency below 1", () => {
    const result = sportActivitySchema.safeParse({
      activityType: "course",
      weeklyFrequency: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weeklyFrequency above 7", () => {
    const result = sportActivitySchema.safeParse({
      activityType: "course",
      weeklyFrequency: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid activity type", () => {
    const result = sportActivitySchema.safeParse({
      activityType: "escalade",
      weeklyFrequency: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer weeklyFrequency", () => {
    const result = sportActivitySchema.safeParse({
      activityType: "yoga",
      weeklyFrequency: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

// --- sportSchema ---

describe("sportSchema", () => {
  it("accepts empty sport activities array", () => {
    const result = sportSchema.safeParse({ sportActivities: [] });
    expect(result.success).toBe(true);
  });

  it("accepts multiple valid sport activities", () => {
    const result = sportSchema.safeParse({
      sportActivities: [
        { activityType: "musculation", weeklyFrequency: 4 },
        { activityType: "course", weeklyFrequency: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// --- profileSchema (composite) ---

describe("profileSchema", () => {
  it("accepts full valid profile", () => {
    const result = profileSchema.safeParse(validProfile());
    expect(result.success).toBe(true);
  });

  it("accepts profile with empty optional arrays", () => {
    const result = profileSchema.safeParse({
      ...validPhysical(),
      ...validGoal(),
      dietaryPreferences: [],
      sportActivities: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects profile with invalid physical data", () => {
    const result = profileSchema.safeParse({
      ...validProfile(),
      weight: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects profile with invalid goal", () => {
    const result = profileSchema.safeParse({
      ...validProfile(),
      goal: "invalid_goal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects profile with invalid dietary preference", () => {
    const result = profileSchema.safeParse({
      ...validProfile(),
      dietaryPreferences: ["unknown"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects profile with invalid sport activity", () => {
    const result = profileSchema.safeParse({
      ...validProfile(),
      sportActivities: [{ activityType: "invalid", weeklyFrequency: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects profile missing physical fields", () => {
    const { weight: _, ...missingWeight } = validProfile();
    const result = profileSchema.safeParse(missingWeight);
    expect(result.success).toBe(false);
  });

  it("rejects profile missing goal", () => {
    const { goal: _, ...missingGoal } = validProfile();
    const result = profileSchema.safeParse(missingGoal);
    expect(result.success).toBe(false);
  });
});
