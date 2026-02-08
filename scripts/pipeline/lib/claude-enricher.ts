import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { enrichedIngredientSchema } from "./schemas";
import type { EnrichedIngredient, ScrapedRecipe } from "./types";

// JSON schema for Claude CLI --json-schema flag
const ENRICHMENT_JSON_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          proteinPer100g: { type: "number" },
          carbsPer100g: { type: "number" },
          fatPer100g: { type: "number" },
          caloriesPer100g: { type: "number" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: [
          "name",
          "proteinPer100g",
          "carbsPer100g",
          "fatPer100g",
          "caloriesPer100g",
          "confidence",
        ],
      },
    },
  },
  required: ["ingredients"],
});

const PROMPT_FILE_PATH = join(
  process.cwd(),
  "scripts/pipeline/prompts/macro-enrichment.md",
);

/**
 * Read the system prompt from the prompt file.
 */
function readSystemPrompt(): string {
  return readFileSync(PROMPT_FILE_PATH, "utf-8");
}

/**
 * Write recipe data to a temp file for safe stdin piping.
 * Returns the temp file path.
 */
function writeTempFile(data: unknown): string {
  const tmpPath = join(tmpdir(), `enrich-${randomUUID()}.json`);
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  return tmpPath;
}

/**
 * Parse Claude CLI JSON output and extract structured ingredients.
 * Handles both `structured_output` field and `result` field formats.
 */
export function parseClaudeOutput(
  rawOutput: string,
): { ingredients: EnrichedIngredient[] } | null {
  const parsed = JSON.parse(rawOutput);

  // Claude CLI --output-format json returns { type: "result", structured_output: {...} }
  if (parsed.structured_output?.ingredients) {
    return { ingredients: parsed.structured_output.ingredients };
  }

  // Fallback: result field may contain JSON string
  if (parsed.result) {
    try {
      const resultParsed = JSON.parse(parsed.result);
      if (resultParsed.ingredients) {
        return { ingredients: resultParsed.ingredients };
      }
    } catch {
      // result is not JSON, ignore
    }
  }

  // Fallback: root level ingredients
  if (parsed.ingredients) {
    return { ingredients: parsed.ingredients };
  }

  return null;
}

/**
 * Validate ingredients against Zod schema bounds.
 * Returns validated ingredients or throws on validation failure.
 */
export function validateIngredients(raw: unknown[]): EnrichedIngredient[] {
  return raw.map((item, index) => {
    const result = enrichedIngredientSchema.safeParse(item);
    if (!result.success) {
      throw new Error(
        `Ingredient ${index} validation failed: ${result.error.message}`,
      );
    }
    return result.data as EnrichedIngredient;
  });
}

/**
 * Check if ingredient macros are within reasonable bounds.
 * Returns an array of error messages (empty = all good).
 */
export function boundsCheck(ingredients: EnrichedIngredient[]): string[] {
  const errors: string[] = [];

  for (const ing of ingredients) {
    // Macros cannot exceed 100g total in 100g of food
    const totalMacros = ing.proteinPer100g + ing.carbsPer100g + ing.fatPer100g;
    if (totalMacros > 100) {
      errors.push(
        `${ing.name}: protein+carbs+fat=${totalMacros.toFixed(1)}g > 100g`,
      );
    }

    // No negative values (already enforced by Zod min(0), but double-check)
    if (
      ing.proteinPer100g < 0 ||
      ing.carbsPer100g < 0 ||
      ing.fatPer100g < 0 ||
      ing.caloriesPer100g < 0
    ) {
      errors.push(`${ing.name}: negative macro value detected`);
    }

    // Calorie sanity check: should be within 20% of protein*4 + carbs*4 + fat*9
    const expectedCalories =
      ing.proteinPer100g * 4 + ing.carbsPer100g * 4 + ing.fatPer100g * 9;
    if (expectedCalories > 0) {
      const divergence =
        Math.abs(ing.caloriesPer100g - expectedCalories) / expectedCalories;
      if (divergence > 0.2) {
        errors.push(
          `${ing.name}: calories ${ing.caloriesPer100g} diverges ${(divergence * 100).toFixed(0)}% from expected ${expectedCalories.toFixed(0)}`,
        );
      }
    }
  }

  return errors;
}

/**
 * Call Claude CLI to enrich a single recipe's ingredients with macro data.
 * Uses temp files for safe stdin piping and --json-schema for structured output.
 * All user-controlled data is passed via temp files to avoid shell injection.
 */
export function enrichRecipe(recipe: ScrapedRecipe): EnrichedIngredient[] {
  const systemPrompt = readSystemPrompt();
  const tmpRecipeFile = writeTempFile({
    title: recipe.title,
    ingredients: recipe.ingredients,
  });
  const tmpSchemaFile = writeTempFile(JSON.parse(ENRICHMENT_JSON_SCHEMA));
  const tmpPromptFile = join(tmpdir(), `prompt-${randomUUID()}.txt`);
  writeFileSync(tmpPromptFile, systemPrompt, "utf-8");

  try {
    // Build command: cat temp file | claude -p with structured output
    // Using --tools "" to prevent tool use for cost control (single-turn)
    // All dynamic content passed via temp files for shell safety
    const command = [
      `cat "${tmpRecipeFile}"`,
      "|",
      "claude -p",
      `--system-prompt "$(cat "${tmpPromptFile}")"`,
      "--output-format json",
      `--json-schema "$(cat "${tmpSchemaFile}")"`,
      "--no-session-persistence",
      "--model sonnet",
      '--tools ""',
    ].join(" ");

    const rawOutput = execSync(command, {
      encoding: "utf-8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: "/bin/bash",
    });

    const parsed = parseClaudeOutput(rawOutput);
    if (!parsed || !parsed.ingredients) {
      throw new Error("Claude output missing ingredients array");
    }

    return validateIngredients(parsed.ingredients);
  } finally {
    // Always clean up temp files
    for (const f of [tmpRecipeFile, tmpSchemaFile, tmpPromptFile]) {
      try {
        unlinkSync(f);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Enrich recipe with retry on aberrant values.
 * Retries once if bounds check fails, then flags for manual review.
 */
export function enrichRecipeWithRetry(recipe: ScrapedRecipe): {
  ingredients: EnrichedIngredient[];
  flagged: boolean;
} {
  // First attempt
  const ingredients = enrichRecipe(recipe);
  const errors = boundsCheck(ingredients);

  if (errors.length === 0) {
    return { ingredients, flagged: false };
  }

  // Bounds check failed -- retry once
  console.warn(
    `[enrich] Bounds check failed for "${recipe.title}", retrying: ${errors.join("; ")}`,
  );

  try {
    const retryIngredients = enrichRecipe(recipe);
    const retryErrors = boundsCheck(retryIngredients);

    if (retryErrors.length === 0) {
      return { ingredients: retryIngredients, flagged: false };
    }

    // Still failing after retry -- flag for review
    console.warn(
      `[enrich] Retry still has aberrant values for "${recipe.title}": ${retryErrors.join("; ")}`,
    );
    return { ingredients: retryIngredients, flagged: true };
  } catch (retryError) {
    // Retry itself failed -- return first attempt flagged
    console.warn(
      `[enrich] Retry failed for "${recipe.title}": ${retryError instanceof Error ? retryError.message : String(retryError)}`,
    );
    return { ingredients, flagged: true };
  }
}

/**
 * Call Claude CLI to enrich a batch of ingredient names with macro data.
 * Takes an array of ingredient name strings (batch of up to 20).
 * Uses the same Claude CLI invocation pattern as enrichRecipe().
 * Validates that the returned ingredient count matches the input count.
 */
export function enrichIngredientBatch(
  ingredientNames: string[],
): EnrichedIngredient[] {
  const systemPrompt = readSystemPrompt();
  const input = {
    ingredients: ingredientNames.map((name) => ({ name })),
  };
  const tmpInputFile = writeTempFile(input);
  const tmpSchemaFile = writeTempFile(JSON.parse(ENRICHMENT_JSON_SCHEMA));
  const tmpPromptFile = join(tmpdir(), `prompt-${randomUUID()}.txt`);
  writeFileSync(tmpPromptFile, systemPrompt, "utf-8");

  try {
    const command = [
      `cat "${tmpInputFile}"`,
      "|",
      "claude -p",
      `--system-prompt "$(cat "${tmpPromptFile}")"`,
      "--output-format json",
      `--json-schema "$(cat "${tmpSchemaFile}")"`,
      "--no-session-persistence",
      "--model sonnet",
      '--tools ""',
    ].join(" ");

    const rawOutput = execSync(command, {
      encoding: "utf-8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: "/bin/bash",
    });

    const parsed = parseClaudeOutput(rawOutput);
    if (!parsed || !parsed.ingredients) {
      throw new Error("Claude output missing ingredients array");
    }

    const validated = validateIngredients(parsed.ingredients);

    // Ensure Claude returned macros for every ingredient in the batch
    if (validated.length !== ingredientNames.length) {
      throw new Error(
        `Expected ${ingredientNames.length} ingredients, got ${validated.length}`,
      );
    }

    return validated;
  } finally {
    for (const f of [tmpInputFile, tmpSchemaFile, tmpPromptFile]) {
      try {
        unlinkSync(f);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Enrich ingredient batch with retry on aberrant values.
 * Retries once if bounds check fails, then flags for manual review.
 */
export function enrichIngredientBatchWithRetry(
  ingredientNames: string[],
): {
  ingredients: EnrichedIngredient[];
  flagged: boolean;
} {
  // First attempt
  const ingredients = enrichIngredientBatch(ingredientNames);
  const errors = boundsCheck(ingredients);

  if (errors.length === 0) {
    return { ingredients, flagged: false };
  }

  // Bounds check failed -- retry once
  console.warn(
    `[enrich] Bounds check failed for batch of ${ingredientNames.length} ingredients, retrying: ${errors.join("; ")}`,
  );

  try {
    const retryIngredients = enrichIngredientBatch(ingredientNames);
    const retryErrors = boundsCheck(retryIngredients);

    if (retryErrors.length === 0) {
      return { ingredients: retryIngredients, flagged: false };
    }

    // Still failing after retry -- flag for review
    console.warn(
      `[enrich] Retry still has aberrant values for batch: ${retryErrors.join("; ")}`,
    );
    return { ingredients: retryIngredients, flagged: true };
  } catch (retryError) {
    // Retry itself failed -- return first attempt flagged
    console.warn(
      `[enrich] Retry failed for batch: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
    );
    return { ingredients, flagged: true };
  }
}

/**
 * Cross-validate Claude's per-ingredient estimates against Jow's per-serving nutrition.
 * Best-effort validation: only runs when Jow nutrition data is available and
 * all ingredient quantities are in grams.
 */
export function crossValidateNutrition(
  enriched: EnrichedIngredient[],
  recipe: ScrapedRecipe,
): { valid: boolean; divergence: number } {
  const jowNutrition = recipe.jowNutritionPerServing;
  if (!jowNutrition) {
    return { valid: true, divergence: 0 };
  }

  const portions = recipe.originalPortions ?? 1;

  // Build a lookup map for enriched ingredients by name
  const enrichedMap = new Map<string, EnrichedIngredient>();
  for (const ing of enriched) {
    enrichedMap.set(ing.name.toLowerCase(), ing);
  }

  // Compute estimated per-serving totals from Claude's estimates
  let estimatedCalories = 0;
  let estimatedProtein = 0;
  let estimatedCarbs = 0;
  let estimatedFat = 0;
  let hasAllGrams = true;

  for (const scrapedIng of recipe.ingredients) {
    // Skip if quantity or unit missing
    if (scrapedIng.quantity === null || scrapedIng.unit === null) {
      hasAllGrams = false;
      break;
    }

    // Only validate when unit is grams (g, gr, gramme, grammes)
    const unitLower = scrapedIng.unit.toLowerCase();
    if (!["g", "gr", "gramme", "grammes"].includes(unitLower)) {
      hasAllGrams = false;
      break;
    }

    const enrichedIng = enrichedMap.get(scrapedIng.name.toLowerCase());
    if (!enrichedIng) {
      hasAllGrams = false;
      break;
    }

    const quantityG = scrapedIng.quantity;
    const factor = quantityG / 100 / portions;

    estimatedCalories += enrichedIng.caloriesPer100g * factor;
    estimatedProtein += enrichedIng.proteinPer100g * factor;
    estimatedCarbs += enrichedIng.carbsPer100g * factor;
    estimatedFat += enrichedIng.fatPer100g * factor;
  }

  // If not all ingredients have gram quantities, skip validation
  if (!hasAllGrams) {
    return { valid: true, divergence: 0 };
  }

  // Compare each macro with Jow's per-serving values
  const comparisons = [
    {
      name: "calories",
      estimated: estimatedCalories,
      jow: jowNutrition.calories,
    },
    {
      name: "protein",
      estimated: estimatedProtein,
      jow: jowNutrition.protein,
    },
    { name: "carbs", estimated: estimatedCarbs, jow: jowNutrition.carbs },
    { name: "fat", estimated: estimatedFat, jow: jowNutrition.fat },
  ];

  let maxDivergence = 0;
  let anyFailed = false;

  for (const comp of comparisons) {
    if (comp.jow === 0 && comp.estimated === 0) continue;
    const reference = Math.max(comp.jow, 1); // Avoid division by zero
    const divergence = Math.abs(comp.estimated - comp.jow) / reference;
    maxDivergence = Math.max(maxDivergence, divergence);

    if (divergence > 0.3) {
      anyFailed = true;
    }
  }

  return { valid: !anyFailed, divergence: maxDivergence };
}
