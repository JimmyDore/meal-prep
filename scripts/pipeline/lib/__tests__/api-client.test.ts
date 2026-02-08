import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../api-client";
import type { EnrichedRecipe } from "../types";

// ---------------------------------------------------------------------------
// Fixture: minimal enriched recipe for upload payload
// ---------------------------------------------------------------------------

const MINIMAL_RECIPE: EnrichedRecipe = {
  title: "Poulet Riz",
  description: "Simple et bon",
  jowId: "jow-recipe-001",
  jowUrl: "https://jow.fr/recipes/poulet-riz",
  imageUrl: "https://img.jow.fr/poulet.jpg",
  cookTimeMin: 20,
  prepTimeMin: 10,
  totalTimeMin: 30,
  difficulty: "Facile",
  instructions: ["Cuire le riz", "Griller le poulet"],
  nutriScore: "A",
  rating: 4.5,
  ratingCount: 120,
  cuisine: "Francais",
  category: "Plat principal",
  originalPortions: 4,
  jowNutritionPerServing: {
    calories: 450,
    protein: 35,
    carbs: 50,
    fat: 12,
    fiber: 3,
  },
  ingredients: [
    { name: "Poulet", quantity: 400, unit: "g", originalText: "400 g poulet" },
    { name: "Riz", quantity: 300, unit: "g", originalText: "300 g riz" },
  ],
  enrichedIngredients: [
    {
      name: "Poulet",
      proteinPer100g: 25,
      carbsPer100g: 0,
      fatPer100g: 3,
      caloriesPer100g: 130,
      confidence: "high" as const,
    },
    {
      name: "Riz",
      proteinPer100g: 7,
      carbsPer100g: 80,
      fatPer100g: 1,
      caloriesPer100g: 360,
      confidence: "high" as const,
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createApiClient - uploadRecipe", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns success result on 201 response", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      status: 201,
      json: async () => ({ id: "uuid-123" }),
    });

    const client = createApiClient("http://localhost:3000", "test-token");
    const result = await client.uploadRecipe(MINIMAL_RECIPE);

    expect(result).toEqual({ id: "uuid-123" });

    // Verify fetch was called with correct endpoint and headers
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/recipes/upload");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("returns error on 400 validation error", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      status: 400,
      json: async () => ({ error: "Invalid recipe data" }),
    });

    const client = createApiClient("http://localhost:3000", "test-token");
    const result = await client.uploadRecipe(MINIMAL_RECIPE);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("HTTP 400");
    expect((result as { error: string }).error).toContain("Invalid recipe data");
  });

  it("returns error on 401 auth failure", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    const client = createApiClient("http://localhost:3000", "bad-token");
    const result = await client.uploadRecipe(MINIMAL_RECIPE);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("HTTP 401");
  });

  it("handles network failure gracefully", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const client = createApiClient("http://localhost:3000", "test-token");
    const result = await client.uploadRecipe(MINIMAL_RECIPE);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Network error");
    expect((result as { error: string }).error).toContain("ECONNREFUSED");
  });

  it("returns error on 500 server error", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    const client = createApiClient("http://localhost:3000", "test-token");
    const result = await client.uploadRecipe(MINIMAL_RECIPE);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("HTTP 500");
  });

  it("sends correct payload structure with mapped ingredients", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      status: 201,
      json: async () => ({ id: "uuid-456" }),
    });

    const client = createApiClient("http://localhost:3000", "test-token");
    await client.uploadRecipe(MINIMAL_RECIPE);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.jowId).toBe("jow-recipe-001");
    expect(body.title).toBe("Poulet Riz");
    expect(body.ingredients).toHaveLength(2);
    // Verify ingredient mapping merges scraped + enriched data
    expect(body.ingredients[0].name).toBe("Poulet");
    expect(body.ingredients[0].proteinPer100g).toBe(25);
    expect(body.ingredients[0].quantity).toBe(400);
    expect(body.ingredients[0].originalText).toBe("400 g poulet");
  });

  it("handles non-Error thrown by fetch", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue("string error");

    const client = createApiClient("http://localhost:3000", "test-token");
    const result = await client.uploadRecipe(MINIMAL_RECIPE);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Network error");
    expect((result as { error: string }).error).toContain("string error");
  });
});
