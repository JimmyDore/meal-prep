import {
  type Browser,
  type BrowserContext,
  type Page,
  chromium,
} from "playwright";
import { scrapedRecipeSchema } from "./schemas";
import type { ScrapedRecipe } from "./types";
import { parseJsonLdRecipe, parseNextDataRecipe } from "./jow-parser";
import type { Logger } from "./logger";

const BASE_URL = "https://jow.fr";
const USER_AGENT = "MealPrepBot/1.0 (personal project, polite scraping)";
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * Simple delay utility for rate limiting.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a Playwright browser and context for scraping.
 * Launches Chromium in headless mode with a polite user agent.
 */
export async function createBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
  });
  return { browser, context };
}

/**
 * Discover all recipe URLs from Jow sitemap letter pages.
 * Iterates a-z, extracting recipe paths from __NEXT_DATA__.
 * Rate limits at 1.5s between pages.
 */
export async function discoverRecipeUrls(
  context: BrowserContext,
  logger: Logger,
): Promise<string[]> {
  const allUrls: string[] = [];

  for (const letter of LETTERS) {
    const sitemapUrl = `${BASE_URL}/site-map/recipes/letter-${letter}`;
    const page = await context.newPage();

    try {
      await page.goto(sitemapUrl, { waitUntil: "domcontentloaded" });

      // Extract __NEXT_DATA__ to get recipe paths
      const nextData = await page.evaluate(() => {
        const el = document.querySelector("#__NEXT_DATA__");
        return el?.textContent ? JSON.parse(el.textContent) : null;
      });

      const groupRecipes =
        nextData?.props?.pageProps?.groupRecipes ??
        nextData?.props?.pageProps?.recipes ??
        [];

      let count = 0;
      for (const recipe of groupRecipes) {
        const path = recipe?.path ?? recipe?.url ?? recipe?.slug;
        if (typeof path === "string") {
          const fullUrl = path.startsWith("http")
            ? path
            : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
          allUrls.push(fullUrl);
          count++;
        }
      }

      logger.info(`Discovered ${count} recipes from letter ${letter}`);
    } catch (err) {
      logger.warn(
        `Failed to scrape sitemap letter ${letter}: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      await page.close();
    }

    // Rate limit between sitemap pages
    if (letter !== "z") {
      await delay(1500);
    }
  }

  logger.info(`Total discovered: ${allUrls.length} recipe URLs`);
  return allUrls;
}

/**
 * Scrape a single recipe detail page.
 * Extracts from both __NEXT_DATA__ and JSON-LD, then merges:
 * - __NEXT_DATA__ provides: difficulty, imageUrl, nutrition, instructions, portions
 * - JSON-LD provides: rating, cuisine, category, cookTime/prepTime/totalTime
 * Falls back to JSON-LD alone if __NEXT_DATA__ fails.
 * Validates result against Zod schema.
 * Returns null on failure (logs error, does not throw).
 */
export async function scrapeRecipeDetail(
  page: Page,
  url: string,
  logger: Logger,
  logFirstPayload = false,
): Promise<ScrapedRecipe | null> {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Extract both data sources from the page
    const { nextData, jsonLd } = await page.evaluate(() => {
      // __NEXT_DATA__
      const nextEl = document.querySelector("#__NEXT_DATA__");
      const nd = nextEl?.textContent ? JSON.parse(nextEl.textContent) : null;

      // JSON-LD
      let jl = null;
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent ?? "");
          if (data?.["@type"] === "Recipe") {
            jl = data;
            break;
          }
          if (Array.isArray(data?.["@graph"])) {
            for (const item of data["@graph"]) {
              if (item?.["@type"] === "Recipe") {
                jl = item;
                break;
              }
            }
            if (jl) break;
          }
        } catch {
          // Skip malformed JSON-LD blocks
        }
      }

      return { nextData: nd, jsonLd: jl };
    });

    if (logFirstPayload && nextData) {
      console.log(
        "[debug] First __NEXT_DATA__ payload:",
        JSON.stringify(nextData, null, 2).slice(0, 3000),
      );
    }

    // Try __NEXT_DATA__ as primary source
    let nextDataRecipe: ScrapedRecipe | null = null;
    if (nextData) {
      const parsed = parseNextDataRecipe(nextData, url);
      if (parsed) {
        const validated = scrapedRecipeSchema.safeParse(parsed);
        if (validated.success) {
          nextDataRecipe = validated.data as ScrapedRecipe;
        } else {
          logger.warn(
            `__NEXT_DATA__ validation failed for ${url}: ${validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
          );
        }
      }
    }

    // Try JSON-LD as secondary source
    let jsonLdRecipe: ScrapedRecipe | null = null;
    if (jsonLd) {
      const parsed = parseJsonLdRecipe(jsonLd, url);
      if (parsed) {
        const validated = scrapedRecipeSchema.safeParse(parsed);
        if (validated.success) {
          jsonLdRecipe = validated.data as ScrapedRecipe;
        } else {
          logger.warn(
            `JSON-LD validation failed for ${url}: ${validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
          );
        }
      }
    }

    // Merge: __NEXT_DATA__ primary, JSON-LD supplements missing fields
    if (nextDataRecipe && jsonLdRecipe) {
      const merged: ScrapedRecipe = {
        ...nextDataRecipe,
        // Supplement from JSON-LD where __NEXT_DATA__ lacks data
        rating: nextDataRecipe.rating ?? jsonLdRecipe.rating,
        ratingCount: nextDataRecipe.ratingCount ?? jsonLdRecipe.ratingCount,
        cuisine: nextDataRecipe.cuisine ?? jsonLdRecipe.cuisine,
        category: nextDataRecipe.category ?? jsonLdRecipe.category,
        cookTimeMin: nextDataRecipe.cookTimeMin ?? jsonLdRecipe.cookTimeMin,
        prepTimeMin: nextDataRecipe.prepTimeMin ?? jsonLdRecipe.prepTimeMin,
        totalTimeMin: nextDataRecipe.totalTimeMin ?? jsonLdRecipe.totalTimeMin,
      };
      return merged;
    }

    // Use whichever source succeeded
    if (nextDataRecipe) return nextDataRecipe;
    if (jsonLdRecipe) return jsonLdRecipe;

    logger.warn(`Could not extract recipe data from ${url}`);
    return null;
  } catch (err) {
    logger.warn(
      `Error scraping ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
