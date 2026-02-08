import { type Mock, vi } from "vitest";

// --- Mocks (must be before route import) ---

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    PIPELINE_TOKEN: "test-pipeline-token",
  },
}));

vi.mock("@/db/schema", () => ({
  recipes: { id: "id", jowId: "jow_id" },
  ingredients: { id: "id", name: "name" },
  recipeIngredients: { recipeId: "recipe_id", ingredientId: "ingredient_id" },
  tags: { id: "id", slug: "slug" },
  recipeTags: { recipeId: "recipe_id", tagId: "tag_id" },
}));

import { db } from "@/db";
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/recipes/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validRecipe = {
  jowId: "jow-123",
  title: "Poulet Basquaise",
  jowUrl: "https://jow.fr/recipes/poulet-basquaise",
  ingredients: [
    {
      name: "Poulet",
      quantity: 500,
      unit: "g",
      originalText: "500g de poulet",
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      caloriesPer100g: 150,
      confidence: "high" as const,
    },
  ],
  tags: ["rapide"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/recipes/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth tests ---

  describe("authentication", () => {
    it("returns 401 when no Authorization header", async () => {
      const req = makeRequest(validRecipe);
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 401 when Authorization header is not Bearer format", async () => {
      const req = makeRequest(validRecipe, {
        Authorization: "Basic dXNlcjpwYXNz",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 401 when bearer token does not match PIPELINE_TOKEN", async () => {
      const req = makeRequest(validRecipe, {
        Authorization: "Bearer wrong-token",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  // --- Validation tests ---

  describe("validation", () => {
    it("returns 400 when body is empty object", async () => {
      const req = makeRequest(
        {},
        { Authorization: "Bearer test-pipeline-token" },
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });

    it("returns 400 when required fields are missing", async () => {
      const req = makeRequest(
        { title: "Missing fields" },
        { Authorization: "Bearer test-pipeline-token" },
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
      expect(json.details).toBeDefined();
    });

    it("returns 400 when ingredients array is empty", async () => {
      const req = makeRequest(
        {
          jowId: "jow-123",
          title: "No Ingredients",
          jowUrl: "https://jow.fr/recipes/no-ingredients",
          ingredients: [],
        },
        { Authorization: "Bearer test-pipeline-token" },
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });

    it("returns 400 when macro values exceed bounds", async () => {
      const req = makeRequest(
        {
          ...validRecipe,
          ingredients: [
            {
              name: "Invalid Macros",
              quantity: 100,
              unit: "g",
              originalText: "100g invalid",
              proteinPer100g: 999, // max is 100
              carbsPer100g: 0,
              fatPer100g: 0,
              caloriesPer100g: 0,
              confidence: "high",
            },
          ],
        },
        { Authorization: "Bearer test-pipeline-token" },
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });

    it("returns 400 when calories exceed max bound (900)", async () => {
      const req = makeRequest(
        {
          ...validRecipe,
          ingredients: [
            {
              name: "High Cal",
              quantity: 100,
              unit: "g",
              originalText: "100g",
              proteinPer100g: 10,
              carbsPer100g: 10,
              fatPer100g: 10,
              caloriesPer100g: 999, // max is 900
              confidence: "high",
            },
          ],
        },
        { Authorization: "Bearer test-pipeline-token" },
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new Request("http://localhost/api/recipes/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-pipeline-token",
        },
        body: "not valid json{{{",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
      expect(json.details.message).toBe("Invalid JSON");
    });
  });

  // --- Success test ---

  describe("success", () => {
    it("returns 201 with recipe ID on valid request", async () => {
      const fakeRecipeId = "550e8400-e29b-41d4-a716-446655440000";

      // Mock db.transaction to simulate successful upsert
      (db.transaction as Mock).mockImplementation(
        async (callback: (tx: unknown) => Promise<string>) => {
          // Create a minimal tx mock that the transaction callback can use
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                onConflictDoUpdate: vi.fn().mockReturnValue({
                  returning: vi
                    .fn()
                    .mockResolvedValueOnce([{ id: fakeRecipeId }]) // recipe insert
                    .mockResolvedValueOnce([{ id: "ing-1" }]), // ingredient insert
                }),
              }),
            }),
          };

          // Also mock the recipe-ingredient link insert (no returning)
          const linkInsert = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
            }),
          });

          // And tag insert
          const tagInsert = vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: "tag-1" }]),
              }),
            }),
          });

          // The route calls tx.insert multiple times; we simulate via callback result
          return callback({
            insert: vi.fn().mockImplementation(() => ({
              values: vi.fn().mockReturnValue({
                onConflictDoUpdate: vi.fn().mockReturnValue({
                  returning: vi
                    .fn()
                    .mockResolvedValueOnce([{ id: fakeRecipeId }])
                    .mockResolvedValueOnce([{ id: "ing-1" }])
                    .mockResolvedValueOnce([{ id: "tag-1" }]),
                  // For link inserts without .returning()
                  set: undefined,
                }),
              }),
            })),
          });
        },
      );

      const req = makeRequest(validRecipe, {
        Authorization: "Bearer test-pipeline-token",
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(fakeRecipeId);
    });
  });

  // --- Error handling ---

  describe("error handling", () => {
    it("returns 500 when database transaction throws", async () => {
      (db.transaction as Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const req = makeRequest(validRecipe, {
        Authorization: "Bearer test-pipeline-token",
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Internal server error");
    });
  });
});
