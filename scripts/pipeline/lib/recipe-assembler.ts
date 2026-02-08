import { readJsonl } from "./jsonl";
import type { EnrichedIngredient, EnrichedRecipe, ScrapedRecipe } from "./types";

/**
 * Load ingredient macros from the reference JSONL file into a Map.
 * Keys are exact ingredient names (no normalization -- Jow names are consistent,
 * research confirmed 0 case-only duplicates).
 */
export async function loadMacroLookup(
  macrosPath: string,
): Promise<Map<string, EnrichedIngredient>> {
  const lookup = new Map<string, EnrichedIngredient>();

  for await (const entry of readJsonl<EnrichedIngredient>(macrosPath)) {
    lookup.set(entry.name, entry);
  }

  return lookup;
}

/**
 * Assemble an enriched recipe by joining ingredient macros from the lookup.
 *
 * - If ALL ingredients are missing from lookup, returns null (recipe cannot be assembled).
 * - If SOME ingredients are missing, assembles with the available subset and returns
 *   the list of missing ingredient names for logging. The original `recipe.ingredients`
 *   array is preserved as-is in the EnrichedRecipe spread; only `enrichedIngredients`
 *   reflects the subset that had macros available.
 * - If all ingredients are found, returns the complete enriched recipe.
 */
export function assembleEnrichedRecipe(
  recipe: ScrapedRecipe,
  macroLookup: Map<string, EnrichedIngredient>,
): { enriched: EnrichedRecipe; missingIngredients: string[] } | null {
  const enrichedIngredients: EnrichedIngredient[] = [];
  const missingIngredients: string[] = [];

  for (const ing of recipe.ingredients) {
    const macros = macroLookup.get(ing.name);
    if (macros) {
      enrichedIngredients.push(macros);
    } else {
      missingIngredients.push(ing.name);
    }
  }

  // All ingredients missing -- cannot assemble
  if (enrichedIngredients.length === 0) {
    return null;
  }

  const enriched: EnrichedRecipe = {
    ...recipe,
    enrichedIngredients,
  };

  return { enriched, missingIngredients };
}
