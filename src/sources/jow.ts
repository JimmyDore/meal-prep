import type { RawRecipe, RecipeSource } from "./types";

export class JowRecipeSource implements RecipeSource {
  readonly name = "jow";

  async fetchRecipes(): Promise<RawRecipe[]> {
    // Phase 2: Playwright scraping implementation
    throw new Error("Not implemented - see Phase 2");
  }

  async fetchRecipeById(_id: string): Promise<RawRecipe | null> {
    // Phase 2: Playwright scraping implementation
    throw new Error("Not implemented - see Phase 2");
  }
}
