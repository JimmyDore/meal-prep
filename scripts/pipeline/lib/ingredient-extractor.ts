import { readJsonl } from "./jsonl";
import type { ScrapedRecipe } from "./types";

/**
 * Extract unique ingredient names from a scraped JSONL file.
 * Reads all recipes and collects ingredient names into a Set for deduplication.
 * Returns sorted unique names for deterministic ordering.
 *
 * Jow ingredient names are consistent (no case-only duplicates confirmed in research),
 * so exact string matching is sufficient -- no normalization needed.
 */
export async function extractUniqueIngredients(
  scrapedPath: string,
): Promise<string[]> {
  const names = new Set<string>();

  for await (const recipe of readJsonl<ScrapedRecipe>(scrapedPath)) {
    for (const ing of recipe.ingredients) {
      names.add(ing.name);
    }
  }

  return Array.from(names).sort();
}
