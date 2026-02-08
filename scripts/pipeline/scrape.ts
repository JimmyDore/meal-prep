import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { appendJsonl, readJsonl } from "./lib/jsonl";
import {
  createBrowser,
  delay,
  discoverRecipeUrls,
  scrapeRecipeDetail,
} from "./lib/jow-scraper";
import { extractJowId, extractRecipeSlug } from "./lib/jow-parser";
import { createLogger } from "./lib/logger";
import type { ScrapedRecipe } from "./lib/types";

const JSONL_DIR = join(process.cwd(), "data", "scraped");
const JSONL_PATH = join(JSONL_DIR, "jow-recipes.jsonl");
const RATE_LIMIT_MS = 1500;
const PROGRESS_INTERVAL = 50;

// Parse CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIndex = args.indexOf("--limit");
const limit =
  limitIndex !== -1 && args[limitIndex + 1]
    ? Number.parseInt(args[limitIndex + 1], 10)
    : null;

async function main(): Promise<void> {
  const logger = createLogger("scrape");
  logger.info(
    `Starting scrape${dryRun ? " (dry run)" : ""}${limit !== null ? ` (limit: ${limit})` : ""}`,
  );

  // Ensure output directory exists
  mkdirSync(JSONL_DIR, { recursive: true });

  const { browser, context } = await createBrowser();

  try {
    // Phase 1: Discovery
    logger.info("Phase 1: Discovering recipe URLs from sitemap...");
    const allUrls = await discoverRecipeUrls(context, logger);

    // Deduplicate recipe variants: Jow publishes multiple URLs for the same
    // recipe (different portion sizes) that share the same slug but have
    // different trailing IDs. Keep only the first URL per slug.
    const seenSlugs = new Set<string>();
    const uniqueUrls: string[] = [];
    for (const url of allUrls) {
      const slug = extractRecipeSlug(url);
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        uniqueUrls.push(url);
      }
    }
    const variantsDeduplicated = allUrls.length - uniqueUrls.length;
    if (variantsDeduplicated > 0) {
      logger.info(
        `Deduplicated ${variantsDeduplicated} recipe variants (${allUrls.length} -> ${uniqueUrls.length} unique recipes)`,
      );
    }

    if (dryRun) {
      logger.info(
        `Dry run complete. Discovered ${allUrls.length} recipe URLs (${uniqueUrls.length} unique after dedup).`,
      );
      logger.summary({
        success: 0,
        skipped: 0,
        failed: 0,
        total: uniqueUrls.length,
      });
      return;
    }

    // Resumability: load already-scraped jowIds AND slugs
    // We track both because the sitemap may reorder variants between runs,
    // causing the slug dedup above to pick a different jowId for the same slug.
    const existingIds = new Set<string>();
    const existingSlugs = new Set<string>();
    if (existsSync(JSONL_PATH)) {
      for await (const recipe of readJsonl<ScrapedRecipe>(JSONL_PATH)) {
        if (recipe.jowId) {
          existingIds.add(recipe.jowId);
        }
        if (recipe.jowUrl) {
          existingSlugs.add(extractRecipeSlug(recipe.jowUrl));
        }
      }
      logger.info(`Found ${existingIds.size} already-scraped recipes`);
    }

    // Filter out already-scraped URLs (by jowId or slug)
    const urlsToScrape = uniqueUrls.filter((url) => {
      const id = extractJowId(url);
      const slug = extractRecipeSlug(url);
      return !existingIds.has(id) && !existingSlugs.has(slug);
    });

    const skipped = uniqueUrls.length - urlsToScrape.length;
    const toProcess = limit !== null ? urlsToScrape.slice(0, limit) : urlsToScrape;

    logger.info(
      `Phase 2: Scraping ${toProcess.length} recipes (${skipped} skipped, ${uniqueUrls.length} unique discovered)`,
    );

    // Phase 2: Detail scraping
    let success = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const url = toProcess[i];
      const page = await context.newPage();

      try {
        const recipe = await scrapeRecipeDetail(
          page,
          url,
          logger,
          i === 0 && existingIds.size === 0, // Log first payload for debugging
        );

        if (recipe) {
          await appendJsonl(JSONL_PATH, recipe);
          success++;
        } else {
          failed++;
        }
      } catch (err) {
        logger.error(
          `Unexpected error on ${url}: ${err instanceof Error ? err.message : String(err)}`,
        );
        failed++;
      } finally {
        await page.close();
      }

      // Progress logging
      const processed = i + 1;
      if (processed % PROGRESS_INTERVAL === 0 || processed === toProcess.length) {
        logger.info(
          `Progress: ${processed}/${toProcess.length} (${success} success, ${skipped} skipped, ${failed} failed)`,
        );
      }

      // Rate limit between recipes (skip on last)
      if (i < toProcess.length - 1) {
        await delay(RATE_LIMIT_MS);
      }
    }

    // Final summary
    logger.summary({
      success,
      skipped,
      failed,
      total: uniqueUrls.length,
    });
  } finally {
    await browser.close();
    logger.info("Browser closed.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
