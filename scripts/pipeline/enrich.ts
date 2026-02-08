import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  crossValidateNutrition,
  enrichIngredientBatchWithRetry,
} from "./lib/claude-enricher";
import { extractUniqueIngredients } from "./lib/ingredient-extractor";
import { appendJsonl, readJsonl } from "./lib/jsonl";
import { createLogger } from "./lib/logger";
import {
  assembleEnrichedRecipe,
  loadMacroLookup,
} from "./lib/recipe-assembler";
import type { EnrichedIngredient, EnrichedRecipe, ScrapedRecipe } from "./lib/types";

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
const macrosPath = getArg("macros") ?? "data/enriched/ingredient-macros.jsonl";
const limitArg = getArg("limit");
const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
const batchSizeArg = getArg("batch-size");
const batchSize = batchSizeArg ? Number.parseInt(batchSizeArg, 10) : 20;
const noDelay = hasFlag("no-delay");
const stageArg = getArg("stage");

// --- Stage 1: Enrich Unique Ingredients ---

async function runStage1(
  log: ReturnType<typeof createLogger>,
): Promise<void> {
  log.info("[Stage 1] Starting ingredient enrichment...");

  // Check input file exists
  if (!existsSync(inputPath)) {
    log.info(`[Stage 1] No scraped recipes found at ${inputPath}. Nothing to enrich.`);
    return;
  }

  // Ensure output directory exists
  mkdirSync(dirname(macrosPath), { recursive: true });

  // Extract unique ingredient names
  const allNames = await extractUniqueIngredients(inputPath);
  log.info(`[Stage 1] Found ${allNames.length} unique ingredients in scraped data`);

  // Load already-enriched ingredient names for resumability
  const enrichedNames = new Set<string>();
  if (existsSync(macrosPath)) {
    for await (const entry of readJsonl<EnrichedIngredient>(macrosPath)) {
      enrichedNames.add(entry.name);
    }
    log.info(
      `[Stage 1] Found ${enrichedNames.size} already-enriched ingredients (resumability)`,
    );
  }

  // Filter out already-enriched
  let remaining = allNames.filter((name) => !enrichedNames.has(name));
  log.info(`[Stage 1] ${remaining.length} ingredients to enrich`);

  // Apply limit
  if (limit !== undefined) {
    remaining = remaining.slice(0, limit);
    log.info(`[Stage 1] Limited to ${remaining.length} ingredients (--limit ${limit})`);
  }

  if (remaining.length === 0) {
    log.info("[Stage 1] No new ingredients to enrich.");
    log.summary({
      success: enrichedNames.size,
      skipped: enrichedNames.size,
      failed: 0,
      total: allNames.length,
    });
    return;
  }

  // Batch the remaining ingredients
  const batches: string[][] = [];
  for (let i = 0; i < remaining.length; i += batchSize) {
    batches.push(remaining.slice(i, i + batchSize));
  }

  // Cost awareness
  log.info(
    `[Stage 1] This will call Claude CLI for ${batches.length} batches of up to ${batchSize} ingredients (${remaining.length} total)`,
  );

  if (!noDelay) {
    log.warn(
      `[Stage 1] Estimated time: ~${batches.length * 30}s. Press Ctrl+C to cancel.`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Processing loop
  let success = 0;
  let flagged = 0;
  let failed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    log.info(
      `[Stage 1] [batch ${i + 1}/${batches.length}] Enriching ${batch.length} ingredients...`,
    );

    try {
      const result = enrichIngredientBatchWithRetry(batch);

      // Append each ingredient to the reference file
      for (const ingredient of result.ingredients) {
        await appendJsonl(macrosPath, ingredient);
      }

      if (result.flagged) {
        flagged++;
        log.warn(
          `[Stage 1] Batch ${i + 1} flagged for aberrant values`,
        );
      }

      success += batch.length;
    } catch (error) {
      failed += batch.length;
      log.error(
        `[Stage 1] Batch ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue to next batch -- don't abort pipeline
    }

    // Progress every 5 batches or at the end
    const processed = i + 1;
    if (processed % 5 === 0 || processed === batches.length) {
      log.info(
        `[Stage 1] Progress: ${processed}/${batches.length} batches done (${success} ok, ${flagged} flagged batches, ${failed} failed)`,
      );
    }
  }

  // Final summary
  log.summary({
    success,
    skipped: enrichedNames.size,
    failed,
    total: allNames.length,
  });

  log.info(
    `[Stage 1] Complete. Reference file: ${macrosPath} (${success + enrichedNames.size} total ingredients)`,
  );
}

// --- Stage 2: Assemble Enriched Recipes ---

async function runStage2(
  log: ReturnType<typeof createLogger>,
): Promise<void> {
  log.info("[Stage 2] Starting recipe assembly...");

  // Check input file exists
  if (!existsSync(inputPath)) {
    log.info(`[Stage 2] No scraped recipes found at ${inputPath}. Nothing to assemble.`);
    return;
  }

  // Check reference file exists
  if (!existsSync(macrosPath)) {
    log.error(
      `[Stage 2] No ingredient reference file at ${macrosPath}. Run Stage 1 first.`,
    );
    return;
  }

  // Ensure output directory exists
  mkdirSync(dirname(outputPath), { recursive: true });

  // Load macro lookup
  const macroLookup = await loadMacroLookup(macrosPath);
  log.info(`[Stage 2] Loaded ${macroLookup.size} ingredient macros from reference file`);

  // Build resumability set from existing enriched output
  const assembledIds = new Set<string>();
  if (existsSync(outputPath)) {
    for await (const entry of readJsonl<EnrichedRecipe>(outputPath)) {
      assembledIds.add(entry.jowId);
    }
    log.info(
      `[Stage 2] Found ${assembledIds.size} already-assembled recipes (resumability)`,
    );
  }

  // Read all scraped recipes
  const recipes: ScrapedRecipe[] = [];
  for await (const recipe of readJsonl<ScrapedRecipe>(inputPath)) {
    recipes.push(recipe);
  }

  const toAssemble = recipes.filter((r) => !assembledIds.has(r.jowId));
  const skippedCount = recipes.length - toAssemble.length;

  log.info(
    `[Stage 2] Found ${recipes.length} scraped recipes, ${skippedCount} already assembled, ${toAssemble.length} to process`,
  );

  if (toAssemble.length === 0) {
    log.info("[Stage 2] No new recipes to assemble.");
    log.summary({
      success: 0,
      skipped: skippedCount,
      failed: 0,
      total: recipes.length,
    });
    return;
  }

  // Processing loop
  let success = 0;
  let incomplete = 0;
  let flagged = 0;
  let failed = 0;

  for (let i = 0; i < toAssemble.length; i++) {
    const recipe = toAssemble[i];

    const result = assembleEnrichedRecipe(recipe, macroLookup);

    if (result === null) {
      // All ingredients missing
      failed++;
      log.error(
        `[Stage 2] [${i + 1}/${toAssemble.length}] "${recipe.title}" -- all ingredients missing from reference`,
      );
      continue;
    }

    const { enriched, missingIngredients } = result;

    if (missingIngredients.length > 0) {
      incomplete++;
      log.warn(
        `[Stage 2] [${i + 1}/${toAssemble.length}] "${recipe.title}" -- missing ${missingIngredients.length} ingredients: ${missingIngredients.join(", ")}`,
      );
    }

    // Cross-validate against Jow nutrition
    const crossCheck = crossValidateNutrition(enriched.enrichedIngredients, recipe);

    // Build flags
    const flags: string[] = [];
    if (!crossCheck.valid) flags.push("cross_validation_failed");
    if (missingIngredients.length > 0) flags.push("incomplete_ingredients");

    // Attach flags if any
    const output: EnrichedRecipe & { _flags?: string[] } = enriched;
    if (flags.length > 0) {
      output._flags = flags;
      flagged++;
    }

    // Append to output JSONL
    await appendJsonl(outputPath, output);
    success++;

    // Progress every 500 recipes or at the end
    const processed = i + 1;
    if (processed % 500 === 0 || processed === toAssemble.length) {
      log.info(
        `[Stage 2] Progress: ${processed}/${toAssemble.length} done (${success} ok, ${incomplete} incomplete, ${flagged} flagged, ${failed} failed)`,
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

  const completeCount = success - incomplete;
  log.info(
    `[Stage 2] Complete. Output: ${outputPath} (${success + assembledIds.size} total enriched recipes)`,
  );
  log.info(
    `[Stage 2] Completeness: ${completeCount} full, ${incomplete} partial, ${failed} failed`,
  );
}

// --- Main ---

async function main(): Promise<void> {
  const log = createLogger("enrich");

  log.info("Pipeline enrichment -- two-stage orchestrator");
  log.info(`  Input:      ${inputPath}`);
  log.info(`  Output:     ${outputPath}`);
  log.info(`  Macros:     ${macrosPath}`);
  log.info(`  Batch size: ${batchSize}`);
  if (limit !== undefined) log.info(`  Limit:      ${limit}`);
  if (stageArg) log.info(`  Stage:      ${stageArg}`);

  if (!stageArg || stageArg === "1") {
    await runStage1(log);
  }

  if (!stageArg || stageArg === "2") {
    await runStage2(log);
  }

  log.info("Done.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
