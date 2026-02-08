import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared before module import (vitest hoists vi.mock)
// ---------------------------------------------------------------------------

const mockExecSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockUnlinkSync = vi.fn();

vi.mock(import("node:child_process"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: { ...actual, execSync: (...args: unknown[]) => mockExecSync(...args) },
    execSync: (...args: unknown[]) => mockExecSync(...args),
  };
});

vi.mock(import("node:fs"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
      writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
      unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
    },
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  };
});

vi.mock(import("node:os"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: { ...actual, tmpdir: () => "/tmp" },
    tmpdir: () => "/tmp",
  };
});

vi.mock(import("node:crypto"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: { ...actual, randomUUID: () => "00000000-0000-0000-0000-mock-uuid-01" as const },
    randomUUID: () => "00000000-0000-0000-0000-mock-uuid-01" as const,
  };
});

import {
  enrichIngredientBatch,
  enrichIngredientBatchWithRetry,
  enrichRecipe,
  enrichRecipeWithRetry,
} from "../claude-enricher";
import type { ScrapedRecipe } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_RECIPE: ScrapedRecipe = {
  title: "Poulet Riz",
  description: "Simple",
  jowId: "jow-001",
  jowUrl: "https://jow.fr/recipes/poulet-riz",
  imageUrl: null,
  cookTimeMin: 20,
  prepTimeMin: 10,
  totalTimeMin: 30,
  difficulty: "Facile",
  instructions: ["Cuire"],
  nutriScore: null,
  rating: null,
  ratingCount: null,
  cuisine: null,
  category: null,
  originalPortions: 2,
  ingredients: [
    { name: "Poulet", quantity: 400, unit: "g", originalText: "400 g poulet" },
    { name: "Riz", quantity: 300, unit: "g", originalText: "300 g riz" },
  ],
  jowNutritionPerServing: null,
};

const VALID_CLAUDE_RESPONSE = JSON.stringify({
  type: "result",
  structured_output: {
    ingredients: [
      {
        name: "Poulet",
        proteinPer100g: 25,
        carbsPer100g: 0,
        fatPer100g: 3,
        caloriesPer100g: 130,
        confidence: "high",
      },
      {
        name: "Riz",
        proteinPer100g: 7,
        carbsPer100g: 80,
        fatPer100g: 1,
        caloriesPer100g: 360,
        confidence: "high",
      },
    ],
  },
});

// Response with aberrant values (total macros > 100g)
const ABERRANT_CLAUDE_RESPONSE = JSON.stringify({
  type: "result",
  structured_output: {
    ingredients: [
      {
        name: "Poulet",
        proteinPer100g: 50,
        carbsPer100g: 40,
        fatPer100g: 20,
        caloriesPer100g: 500,
        confidence: "high",
      },
      {
        name: "Riz",
        proteinPer100g: 7,
        carbsPer100g: 80,
        fatPer100g: 1,
        caloriesPer100g: 360,
        confidence: "high",
      },
    ],
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enrichRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock readFileSync for the prompt file
    mockReadFileSync.mockReturnValue("You are a nutrition expert...");
    // Mock writeFileSync for temp file creation (called multiple times)
    mockWriteFileSync.mockReturnValue(undefined);
    // Mock unlinkSync for cleanup
    mockUnlinkSync.mockReturnValue(undefined);
  });

  it("returns enriched ingredients on successful Claude CLI call", () => {
    mockExecSync.mockReturnValue(VALID_CLAUDE_RESPONSE);

    const result = enrichRecipe(MINIMAL_RECIPE);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Poulet");
    expect(result[0].proteinPer100g).toBe(25);
    expect(result[1].name).toBe("Riz");
    expect(result[1].carbsPer100g).toBe(80);
  });

  it("writes temp files and cleans up on success", () => {
    mockExecSync.mockReturnValue(VALID_CLAUDE_RESPONSE);

    enrichRecipe(MINIMAL_RECIPE);

    // readFileSync called for prompt file
    expect(mockReadFileSync).toHaveBeenCalledOnce();
    // writeFileSync called for: recipe temp, schema temp, prompt temp = 3 times
    expect(mockWriteFileSync).toHaveBeenCalledTimes(3);
    // unlinkSync called for cleanup of 3 temp files
    expect(mockUnlinkSync).toHaveBeenCalledTimes(3);
  });

  it("throws when execSync fails and still cleans up temp files", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Claude CLI not found");
    });

    expect(() => enrichRecipe(MINIMAL_RECIPE)).toThrow("Claude CLI not found");

    // Temp files should still be cleaned up (finally block)
    expect(mockUnlinkSync).toHaveBeenCalledTimes(3);
  });

  it("throws when Claude output has no ingredients", () => {
    mockExecSync.mockReturnValue(
      JSON.stringify({ type: "result", text: "No structured output" }),
    );

    expect(() => enrichRecipe(MINIMAL_RECIPE)).toThrow(
      "Claude output missing ingredients array",
    );
  });

  it("throws when ingredient fails Zod validation", () => {
    const invalidResponse = JSON.stringify({
      type: "result",
      structured_output: {
        ingredients: [
          {
            name: "Poulet",
            proteinPer100g: 150, // exceeds max of 100
            carbsPer100g: 0,
            fatPer100g: 3,
            caloriesPer100g: 130,
            confidence: "high",
          },
        ],
      },
    });
    mockExecSync.mockReturnValue(invalidResponse);

    expect(() => enrichRecipe(MINIMAL_RECIPE)).toThrow(/validation failed/i);
  });
});

describe("enrichRecipeWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue("You are a nutrition expert...");
    mockWriteFileSync.mockReturnValue(undefined);
    mockUnlinkSync.mockReturnValue(undefined);
  });

  it("returns unflagged result when first attempt passes bounds check", () => {
    mockExecSync.mockReturnValue(VALID_CLAUDE_RESPONSE);

    const result = enrichRecipeWithRetry(MINIMAL_RECIPE);

    expect(result.flagged).toBe(false);
    expect(result.ingredients).toHaveLength(2);
    // Should only call execSync once (no retry needed)
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it("retries and returns unflagged when retry passes bounds check", () => {
    // First call returns aberrant values, second call returns valid values
    mockExecSync
      .mockReturnValueOnce(ABERRANT_CLAUDE_RESPONSE)
      .mockReturnValueOnce(VALID_CLAUDE_RESPONSE);

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = enrichRecipeWithRetry(MINIMAL_RECIPE);

    expect(result.flagged).toBe(false);
    expect(result.ingredients).toHaveLength(2);
    // Should call execSync twice (first + retry)
    expect(mockExecSync).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("returns flagged result when retry also has aberrant values", () => {
    // Both attempts return aberrant values
    mockExecSync.mockReturnValue(ABERRANT_CLAUDE_RESPONSE);

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = enrichRecipeWithRetry(MINIMAL_RECIPE);

    expect(result.flagged).toBe(true);
    expect(result.ingredients).toHaveLength(2);
    expect(mockExecSync).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it("returns flagged first attempt when retry throws", () => {
    // First attempt: aberrant but valid Zod data
    // Retry: throws error
    mockExecSync
      .mockReturnValueOnce(ABERRANT_CLAUDE_RESPONSE)
      .mockImplementationOnce(() => {
        throw new Error("Network timeout");
      });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = enrichRecipeWithRetry(MINIMAL_RECIPE);

    expect(result.flagged).toBe(true);
    expect(result.ingredients).toHaveLength(2);

    consoleSpy.mockRestore();
  });
});

describe("enrichIngredientBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue("You are a nutrition expert...");
    mockWriteFileSync.mockReturnValue(undefined);
    mockUnlinkSync.mockReturnValue(undefined);
  });

  it("returns validated ingredients for a batch of names", () => {
    mockExecSync.mockReturnValue(VALID_CLAUDE_RESPONSE);

    const result = enrichIngredientBatch(["Poulet", "Riz"]);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Poulet");
    expect(result[1].name).toBe("Riz");
  });

  it("throws when returned count does not match input count", () => {
    // Response has 2 ingredients but we pass 3 names
    mockExecSync.mockReturnValue(VALID_CLAUDE_RESPONSE);

    expect(() => enrichIngredientBatch(["Poulet", "Riz", "Tomate"])).toThrow(
      /Expected 3 ingredients, got 2/,
    );
  });
});

describe("enrichIngredientBatchWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue("You are a nutrition expert...");
    mockWriteFileSync.mockReturnValue(undefined);
    mockUnlinkSync.mockReturnValue(undefined);
  });

  it("returns unflagged when first attempt passes", () => {
    mockExecSync.mockReturnValue(VALID_CLAUDE_RESPONSE);

    const result = enrichIngredientBatchWithRetry(["Poulet", "Riz"]);

    expect(result.flagged).toBe(false);
    expect(result.ingredients).toHaveLength(2);
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it("retries and flags when bounds check keeps failing", () => {
    mockExecSync.mockReturnValue(ABERRANT_CLAUDE_RESPONSE);

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = enrichIngredientBatchWithRetry(["Poulet", "Riz"]);

    expect(result.flagged).toBe(true);
    expect(mockExecSync).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });
});
