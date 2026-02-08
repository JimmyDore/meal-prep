// Requires: docker compose up -d db-test
import { cleanupTestDb, closeTestDb, setupTestDb, testDb } from "@/test/db-setup";

vi.mock("@/db", () => ({ db: testDb }));

import {
  getUserDietaryPreferences,
  getUserProfile,
  isProfileComplete,
  setUserDietaryPreferences,
  upsertUserProfile,
} from "@/db/queries/profiles";
import { user } from "@/db/schema/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let userCounter = 0;

async function insertTestUser(name?: string) {
  userCounter++;
  const id = `test-user-${userCounter}-${Date.now()}`;
  await testDb.insert(user).values({
    id,
    name: name ?? `Test User ${userCounter}`,
    email: `test${userCounter}-${Date.now()}@example.com`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DB Queries: profiles", () => {
  beforeAll(() => {
    setupTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    userCounter = 0;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // --- getUserProfile ---

  describe("getUserProfile", () => {
    it("returns null for non-existent user", async () => {
      const result = await getUserProfile("non-existent-user-id");

      expect(result).toBeNull();
    });

    it("returns profile for existing user", async () => {
      const userId = await insertTestUser();
      await upsertUserProfile(userId, { weight: 80, height: 180 });

      const result = await getUserProfile(userId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.weight).toBe(80);
      expect(result?.height).toBe(180);
    });
  });

  // --- upsertUserProfile ---

  describe("upsertUserProfile", () => {
    it("creates a new profile", async () => {
      const userId = await insertTestUser();

      const profile = await upsertUserProfile(userId, {
        weight: 75,
        height: 175,
        age: 30,
        sex: "homme",
        activityLevel: "moderement_actif",
        goal: "maintien",
      });

      expect(profile.userId).toBe(userId);
      expect(profile.weight).toBe(75);
      expect(profile.height).toBe(175);
      expect(profile.age).toBe(30);
      expect(profile.sex).toBe("homme");
      expect(profile.activityLevel).toBe("moderement_actif");
      expect(profile.goal).toBe("maintien");
    });

    it("updates an existing profile (upsert)", async () => {
      const userId = await insertTestUser();

      // Create initial profile
      await upsertUserProfile(userId, { weight: 75, height: 175 });

      // Update it
      const updated = await upsertUserProfile(userId, { weight: 80, age: 31 });

      expect(updated.userId).toBe(userId);
      expect(updated.weight).toBe(80);
      expect(updated.age).toBe(31);

      // Verify only one profile exists
      const fetched = await getUserProfile(userId);
      expect(fetched?.weight).toBe(80);
    });
  });

  // --- isProfileComplete ---

  describe("isProfileComplete", () => {
    it("returns false for non-existent user", async () => {
      const result = await isProfileComplete("non-existent-user-id");

      expect(result).toBe(false);
    });

    it("returns false when required fields are missing", async () => {
      const userId = await insertTestUser();
      await upsertUserProfile(userId, {
        weight: 75,
        height: 175,
        // missing age, sex, activityLevel, goal
      });

      const result = await isProfileComplete(userId);

      expect(result).toBe(false);
    });

    it("returns false when only some required fields are set", async () => {
      const userId = await insertTestUser();
      await upsertUserProfile(userId, {
        weight: 75,
        height: 175,
        age: 30,
        sex: "homme",
        // missing activityLevel, goal
      });

      const result = await isProfileComplete(userId);

      expect(result).toBe(false);
    });

    it("returns true when all 6 required fields are set", async () => {
      const userId = await insertTestUser();
      await upsertUserProfile(userId, {
        weight: 75,
        height: 175,
        age: 30,
        sex: "homme",
        activityLevel: "moderement_actif",
        goal: "maintien",
      });

      const result = await isProfileComplete(userId);

      expect(result).toBe(true);
    });
  });

  // --- setUserDietaryPreferences ---

  describe("setUserDietaryPreferences", () => {
    it("sets dietary preferences for a user", async () => {
      const userId = await insertTestUser();

      const result = await setUserDietaryPreferences(userId, ["vegetarien", "sans_gluten"]);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.preference).sort()).toEqual(["sans_gluten", "vegetarien"]);
    });

    it("replaces existing preferences (not append)", async () => {
      const userId = await insertTestUser();

      // Set initial preferences
      await setUserDietaryPreferences(userId, ["vegetarien", "sans_gluten"]);

      // Replace with new preferences
      const result = await setUserDietaryPreferences(userId, ["vegan"]);

      expect(result).toHaveLength(1);
      expect(result[0].preference).toBe("vegan");

      // Verify via get
      const fetched = await getUserDietaryPreferences(userId);
      expect(fetched).toHaveLength(1);
      expect(fetched[0].preference).toBe("vegan");
    });

    it("clears all preferences when given empty array", async () => {
      const userId = await insertTestUser();

      await setUserDietaryPreferences(userId, ["vegetarien"]);
      const result = await setUserDietaryPreferences(userId, []);

      expect(result).toEqual([]);

      const fetched = await getUserDietaryPreferences(userId);
      expect(fetched).toHaveLength(0);
    });
  });

  // --- getUserDietaryPreferences ---

  describe("getUserDietaryPreferences", () => {
    it("returns empty array for user with no preferences", async () => {
      const userId = await insertTestUser();

      const result = await getUserDietaryPreferences(userId);

      expect(result).toEqual([]);
    });

    it("returns all preferences for user", async () => {
      const userId = await insertTestUser();
      await setUserDietaryPreferences(userId, ["halal", "sans_porc"]);

      const result = await getUserDietaryPreferences(userId);

      expect(result).toHaveLength(2);
      const preferences = result.map((r) => r.preference).sort();
      expect(preferences).toEqual(["halal", "sans_porc"]);
    });
  });
});
