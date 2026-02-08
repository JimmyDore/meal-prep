import "dotenv/config";
import { existsSync } from "node:fs";
import { createApiClient } from "./lib/api-client";
import { readJsonl } from "./lib/jsonl";
import { createLogger } from "./lib/logger";
import type { EnrichedRecipe } from "./lib/types";

// --- CLI argument parsing ---

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

const inputPath =
  getArg("input") ?? "data/enriched/jow-recipes-enriched.jsonl";
const baseUrl = getArg("url") ?? "http://localhost:3000";
const limitArg = getArg("limit");
const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;

// --- Main upload pipeline ---

async function main(): Promise<void> {
  const log = createLogger("upload");

  // Validate PIPELINE_TOKEN
  const token = process.env.PIPELINE_TOKEN;
  if (!token) {
    log.error("PIPELINE_TOKEN env var is required. Set it in .env or export it.");
    process.exit(1);
  }

  // Check input file exists
  if (!existsSync(inputPath)) {
    log.info(`No enriched recipes found at ${inputPath}. Nothing to upload.`);
    log.summary({ success: 0, skipped: 0, failed: 0, total: 0 });
    return;
  }

  // Read enriched recipes
  const recipes: EnrichedRecipe[] = [];
  for await (const recipe of readJsonl<EnrichedRecipe>(inputPath)) {
    recipes.push(recipe);
  }

  const toProcess = limit !== undefined ? recipes.slice(0, limit) : recipes;

  log.info(
    `Found ${recipes.length} enriched recipes, uploading ${toProcess.length} to ${baseUrl}`,
  );

  if (toProcess.length === 0) {
    log.info("No recipes to upload.");
    log.summary({ success: 0, skipped: 0, failed: 0, total: 0 });
    return;
  }

  // Create API client
  const apiClient = createApiClient(baseUrl, token);

  // Processing loop
  let success = 0;
  let failed = 0;
  const PROGRESS_INTERVAL = 25;

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i];

    const result = await apiClient.uploadRecipe(recipe);

    if ("id" in result) {
      success++;
      log.info(`Uploaded "${recipe.title}" (id: ${result.id})`);
    } else {
      failed++;
      log.error(`Failed to upload "${recipe.title}": ${result.error}`);
    }

    // Progress logging every N recipes
    const processed = i + 1;
    if (processed % PROGRESS_INTERVAL === 0 || processed === toProcess.length) {
      log.info(
        `Progress: ${processed}/${toProcess.length} (${success} success, ${failed} failed)`,
      );
    }
  }

  // Final summary
  log.summary({
    success,
    skipped: 0,
    failed,
    total: toProcess.length,
  });

  log.info(`Upload complete. ${success} recipes uploaded to ${baseUrl}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
