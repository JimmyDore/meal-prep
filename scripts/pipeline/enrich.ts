import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  crossValidateNutrition,
  enrichRecipeWithRetry,
} from "./lib/claude-enricher";
import { appendJsonl, readJsonl } from "./lib/jsonl";
import { createLogger } from "./lib/logger";
import type { EnrichedRecipe, ScrapedRecipe } from "./lib/types";

// --- CLI argument parsing ---

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const inputPath = getArg("input") ?? "data/scraped/jow-recipes.jsonl";
const outputPath = getArg("output") ?? "data/enriched/jow-recipes-enriched.jsonl";
const limitArg = getArg("limit");
const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
const noDelay = hasFlag("no-delay");

// --- Main enrichment pipeline ---

async function main(): Promise<void> {
  const log = createLogger("enrich");

  // Check input file exists
  if (!existsSync(inputPath)) {
    log.info(`No scraped recipes found at ${inputPath}. Nothing to enrich.`);
    log.summary({ success: 0, skipped: 0, failed: 0, total: 0 });
    return;
  }

  // Ensure output directory exists
  const outDir = dirname(outputPath);
  mkdirSync(outDir, { recursive: true });

  // Build set of already-enriched jowIds for resumability
  const enrichedIds = new Set<string>();
  if (existsSync(outputPath)) {
    for await (const line of readJsonl<EnrichedRecipe>(outputPath)) {
      enrichedIds.add(line.jowId);
    }
    log.info(`Found ${enrichedIds.size} already-enriched recipes (resumability)`);
  }

  // Read all scraped recipes to determine total count
  const recipes: ScrapedRecipe[] = [];
  for await (const recipe of readJsonl<ScrapedRecipe>(inputPath)) {
    recipes.push(recipe);
  }

  const toEnrich = recipes.filter((r) => !enrichedIds.has(r.jowId));
  const toProcess = limit !== undefined ? toEnrich.slice(0, limit) : toEnrich;
  const skippedCount = recipes.length - toEnrich.length;

  log.info(
    `Found ${recipes.length} scraped recipes, ${skippedCount} already enriched, ${toProcess.length} to process`,
  );

  if (toProcess.length === 0) {
    log.info("No new recipes to enrich.");
    log.summary({
      success: 0,
      skipped: skippedCount,
      failed: 0,
      total: recipes.length,
    });
    return;
  }

  // Cost awareness delay
  if (!noDelay) {
    log.warn(
      `This will call Claude CLI for ${toProcess.length} recipes. Estimated time: ~${toProcess.length * 30}s. Press Ctrl+C to cancel.`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Processing loop
  let success = 0;
  let flagged = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i];

    try {
      // Enrich with retry
      const result = enrichRecipeWithRetry(recipe);

      // Cross-validate against Jow nutrition
      const crossCheck = crossValidateNutrition(result.ingredients, recipe);

      // Build flags array
      const flags: string[] = [];
      if (result.flagged) flags.push("aberrant_macros");
      if (!crossCheck.valid) flags.push("cross_validation_failed");

      // Construct enriched recipe
      const enrichedRecipe: EnrichedRecipe & { _flags?: string[] } = {
        ...recipe,
        enrichedIngredients: result.ingredients,
      };
      if (flags.length > 0) {
        enrichedRecipe._flags = flags;
      }

      // Append to output JSONL
      await appendJsonl(outputPath, enrichedRecipe);

      if (flags.length > 0) {
        flagged++;
        log.warn(
          `Recipe "${recipe.title}" flagged: ${flags.join(", ")}`,
        );
      }

      success++;
    } catch (error) {
      failed++;
      log.error(
        `Failed to enrich "${recipe.title}": ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue to next recipe -- don't abort pipeline
    }

    // Progress logging every 10 recipes
    const processed = i + 1;
    if (processed % 10 === 0 || processed === toProcess.length) {
      log.info(
        `Enriched ${processed}/${toProcess.length} (${skippedCount} skipped, ${flagged} flagged, ${failed} failed)`,
      );
    }
  }

  // Final summary
  log.summary({
    success,
    skipped: skippedCount,
    failed,
    total: recipes.length,
  });

  log.info(
    `Enrichment complete. Output: ${outputPath} (${success + enrichedIds.size} total enriched recipes)`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
