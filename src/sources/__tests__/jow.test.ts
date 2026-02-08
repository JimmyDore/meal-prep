import { describe, expect, it } from "vitest";
import { JowRecipeSource } from "../jow";
import type { RecipeSource } from "../types";

describe("JowRecipeSource", () => {
  it("should be instantiable", () => {
    const source = new JowRecipeSource();
    expect(source).toBeInstanceOf(JowRecipeSource);
  });

  it('should have name "jow"', () => {
    const source = new JowRecipeSource();
    expect(source.name).toBe("jow");
  });

  it("should satisfy RecipeSource interface", () => {
    const source: RecipeSource = new JowRecipeSource();
    expect(source.name).toBe("jow");
    expect(typeof source.fetchRecipes).toBe("function");
    expect(typeof source.fetchRecipeById).toBe("function");
  });

  it('should throw "Not implemented" from fetchRecipes()', async () => {
    const source = new JowRecipeSource();
    await expect(source.fetchRecipes()).rejects.toThrow("Not implemented");
  });

  it('should throw "Not implemented" from fetchRecipeById()', async () => {
    const source = new JowRecipeSource();
    await expect(source.fetchRecipeById("any-id")).rejects.toThrow("Not implemented");
  });
});
