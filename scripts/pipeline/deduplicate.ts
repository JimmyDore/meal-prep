import "dotenv/config";
import { existsSync, renameSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { extractRecipeSlug } from "./lib/jow-parser";
import { readJsonl } from "./lib/jsonl";
import { createLogger } from "./lib/logger";
import type { EnrichedRecipe, ScrapedRecipe } from "./lib/types";

/**
 * Deduplicate recipe data:
 * 1. Clean JSONL data files (scraped + enriched) — keep one entry per recipe slug
 * 2. Clean the database — remove duplicate-title recipes, keeping the oldest per title
 *
 * Jow publishes multiple recipe variants (portion sizes) under the same title
 * with different IDs. This script keeps only one variant per recipe concept.
 *
 * Usage: pnpm tsx scripts/pipeline/deduplicate.ts [--dry-run]
 */

const SCRAPED_PATH = "data/scraped/jow-recipes.jsonl";
const ENRICHED_PATH = "data/enriched/jow-recipes-enriched.jsonl";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

async function deduplicateJsonl<T extends { jowId: string; jowUrl?: string }>(
  path: string,
  log: ReturnType<typeof createLogger>,
  label: string,
): Promise<Set<string>> {
  const removedJowIds = new Set<string>();

  if (!existsSync(path)) {
    log.info(`[${label}] File not found: ${path} — skipping`);
    return removedJowIds;
  }

  // Read all entries
  const entries: T[] = [];
  for await (const entry of readJsonl<T>(path)) {
    entries.push(entry);
  }

  log.info(`[${label}] Read ${entries.length} entries from ${path}`);

  // Group by slug, keep first per slug
  const seenSlugs = new Set<string>();
  const kept: T[] = [];

  for (const entry of entries) {
    const url = (entry as unknown as { jowUrl: string }).jowUrl ?? "";
    const slug = extractRecipeSlug(url);

    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      kept.push(entry);
    } else {
      removedJowIds.add(entry.jowId);
    }
  }

  const removed = entries.length - kept.length;
  log.info(
    `[${label}] Deduplication: ${entries.length} -> ${kept.length} (${removed} variants removed)`,
  );

  if (removed > 0 && !dryRun) {
    // Back up original file
    const backupPath = `${path}.bak`;
    renameSync(path, backupPath);
    log.info(`[${label}] Backed up original to ${backupPath}`);

    // Write deduplicated file
    const lines = kept.map((entry) => JSON.stringify(entry));
    writeFileSync(path, `${lines.join("\n")}\n`);
    log.info(`[${label}] Wrote ${kept.length} entries to ${path}`);
  }

  return removedJowIds;
}

async function deduplicateDatabase(
  log: ReturnType<typeof createLogger>,
): Promise<void> {
  log.info("[DB] Starting database deduplication...");

  // Use psql via docker compose to avoid env/ORM complexity
  const psqlCmd = 'docker compose exec -T db psql -U mealprep -d mealprep -c';

  // Count duplicates before
  const countBefore = execSync(
    `${psqlCmd} "SELECT count(*) FROM recipes;"`,
    { encoding: "utf-8" },
  );
  log.info(`[DB] Recipes before: ${countBefore.trim().split("\n")[2]?.trim()}`);

  const dupCount = execSync(
    `${psqlCmd} "SELECT count(*) FROM (SELECT title FROM recipes GROUP BY title HAVING count(*) > 1) sub;"`,
    { encoding: "utf-8" },
  );
  log.info(`[DB] Titles with duplicates: ${dupCount.trim().split("\n")[2]?.trim()}`);

  if (dryRun) {
    log.info("[DB] Dry run — skipping database changes");
    return;
  }

  // Delete duplicate recipes, keeping the oldest (earliest created_at) per title.
  // Must delete child rows first due to FK constraints without CASCADE.
  const deduplicateSql = `
    WITH duplicates AS (
      SELECT id
      FROM recipes
      WHERE id NOT IN (
        SELECT DISTINCT ON (title) id
        FROM recipes
        ORDER BY title, created_at ASC
      )
    )
    DELETE FROM recipe_tags WHERE recipe_id IN (SELECT id FROM duplicates);

    WITH duplicates AS (
      SELECT id
      FROM recipes
      WHERE id NOT IN (
        SELECT DISTINCT ON (title) id
        FROM recipes
        ORDER BY title, created_at ASC
      )
    )
    DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM duplicates);

    WITH duplicates AS (
      SELECT id
      FROM recipes
      WHERE id NOT IN (
        SELECT DISTINCT ON (title) id
        FROM recipes
        ORDER BY title, created_at ASC
      )
    )
    DELETE FROM recipes WHERE id IN (SELECT id FROM duplicates);
  `;

  const result = execSync(`${psqlCmd} "${deduplicateSql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
  });
  log.info(`[DB] Deduplication result:\n${result.trim()}`);

  // Count after
  const countAfter = execSync(
    `${psqlCmd} "SELECT count(*) FROM recipes;"`,
    { encoding: "utf-8" },
  );
  log.info(`[DB] Recipes after: ${countAfter.trim().split("\n")[2]?.trim()}`);

  // Verify no duplicate titles remain
  const dupAfter = execSync(
    `${psqlCmd} "SELECT count(*) FROM (SELECT title FROM recipes GROUP BY title HAVING count(*) > 1) sub;"`,
    { encoding: "utf-8" },
  );
  log.info(`[DB] Duplicate titles remaining: ${dupAfter.trim().split("\n")[2]?.trim()}`);
}

async function main(): Promise<void> {
  const log = createLogger("deduplicate");

  log.info(`Starting deduplication${dryRun ? " (dry run)" : ""}`);

  // Step 1: Deduplicate JSONL files
  await deduplicateJsonl<ScrapedRecipe>(SCRAPED_PATH, log, "scraped");
  await deduplicateJsonl<EnrichedRecipe>(ENRICHED_PATH, log, "enriched");

  // Step 2: Deduplicate database
  await deduplicateDatabase(log);

  log.info("Done.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
