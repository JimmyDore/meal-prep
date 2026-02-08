# Phase 2: Recipe Data Pipeline - Research

**Researched:** 2026-02-08
**Domain:** Web scraping, data enrichment via Claude CLI, API upload, pipeline orchestration
**Confidence:** HIGH

## Summary

This phase builds a local pipeline that scrapes Jow.fr recipes, enriches them with per-ingredient macros via Claude CLI, and uploads them to the server via a bearer-token-protected API endpoint. Research covered four domains: (1) Jow.fr website structure and scraping strategy, (2) Claude CLI for structured macro enrichment, (3) Drizzle ORM upsert patterns for the API endpoint, and (4) pipeline orchestration with JSONL intermediate storage.

Key discovery: Jow.fr is a Next.js application that server-renders recipe data in `__NEXT_DATA__` JSON and `application/ld+json` (JSON-LD) script tags. This means recipe data is accessible via simple HTTP requests without Playwright -- a significant simplification. However, Playwright remains necessary as a fallback because (a) Jow may use React Server Components/flight data on some pages, and (b) Playwright handles JavaScript-heavy pages, anti-bot measures, and dynamic content loading that simple HTTP cannot. The sitemap pages at `/site-map/recipes/letter-{a-z}` provide a complete index of all 3,214 recipes with their URL slugs and Jow IDs.

The existing schema (recipes, ingredients, recipe_ingredients, tags, recipe_tags) from Phase 1 maps well to Jow's data structure. The `jowId` column on the recipes table serves as the natural deduplication key. The `RawRecipe`/`RecipeSource` interface from Phase 1 needs extension to accommodate the richer data available from Jow (instructions, tips, categories, difficulty, nutritional data, ratings).

**Primary recommendation:** Use Playwright for scraping (reliable against JS-rendered content), JSONL for intermediate storage between pipeline steps, Claude CLI with `--json-schema` for structured macro enrichment, and Drizzle `onConflictDoUpdate` for idempotent upserts via a bearer-token-protected Next.js route handler.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | 1.58.x | Browser automation for scraping Jow.fr | Handles JS-rendered Next.js pages, SSR data extraction, rate limiting, robust selectors |
| claude CLI | latest | Macro enrichment via structured output | Project decision: Claude CLI called as external process with `--json-schema` for validated output |
| zod | 3.25.x (already installed) | Schema validation for enrichment output and API input | Already in project, works with Drizzle and Next.js |
| drizzle-orm | 0.45.x (already installed) | Database operations for upsert endpoint | Already in project, supports `onConflictDoUpdate` |
| cheerio | 1.2.x | HTML/JSON-LD parsing from HTTP responses | Fast, jQuery-like API for extracting `__NEXT_DATA__` and JSON-LD from pre-rendered HTML |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | 4.21.x (already installed) | Run TypeScript pipeline scripts directly | Execute pipeline scripts via `tsx scripts/scrape.ts` |
| dotenv | 17.x (already installed) | Environment variable loading | Pipeline scripts need DATABASE_URL and PIPELINE_TOKEN |
| postgres | 3.4.x (already installed) | PostgreSQL client | Direct DB connection from pipeline scripts (like seed.ts pattern) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | HTTP fetch + Cheerio only | Faster but fragile -- breaks if Jow switches to RSC/flight data or adds anti-bot |
| JSONL files | SQLite intermediate DB | Overkill for ~3200 recipes, JSONL is simpler and human-readable |
| Claude CLI | Anthropic API directly | Requires API key management, billing setup; CLI uses existing Claude Code auth |

**Installation:**
```bash
pnpm add playwright cheerio
npx playwright install chromium
```

Note: `zod`, `drizzle-orm`, `postgres`, `tsx`, `dotenv` are already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  pipeline/
    scrape.ts              # Step 1: Scrape Jow recipes to JSONL
    enrich.ts              # Step 2: Enrich recipes with macros via Claude CLI
    upload.ts              # Step 3: Upload enriched recipes to API
    lib/
      jow-scraper.ts       # Playwright scraping logic
      jow-parser.ts        # Parse __NEXT_DATA__ / JSON-LD from HTML
      claude-enricher.ts   # Claude CLI invocation wrapper
      api-client.ts        # HTTP client for upload endpoint
      schemas.ts           # Zod schemas for pipeline data validation
      types.ts             # Pipeline-specific types
    prompts/
      macro-enrichment.md  # Claude prompt for macro estimation
data/
  scraped/                 # JSONL output from scrape step
    jow-recipes.jsonl
  enriched/                # JSONL output from enrich step
    jow-recipes-enriched.jsonl
src/
  app/api/
    recipes/
      upload/
        route.ts           # POST endpoint for recipe upload
  sources/
    types.ts               # Extended RawRecipe interface
    jow.ts                 # Updated JowRecipeSource implementation
```

### Pattern 1: JSONL Intermediate Storage
**What:** Each pipeline step reads from and writes to JSONL files (one JSON object per line). This enables resumability, inspection, and independent step execution.
**When to use:** Between every pipeline step (scrape -> enrich -> upload).
**Example:**
```typescript
// Writing JSONL
import { createWriteStream } from "node:fs";

const stream = createWriteStream("data/scraped/jow-recipes.jsonl", { flags: "a" });
for (const recipe of recipes) {
  stream.write(JSON.stringify(recipe) + "\n");
}
stream.end();

// Reading JSONL
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

async function* readJsonl<T>(path: string): AsyncGenerator<T> {
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line) as T;
  }
}
```

### Pattern 2: Sitemap-First Discovery + Detail Scraping
**What:** First scrape the sitemap pages to get all recipe URLs, then scrape individual recipe pages for full data. Two-phase approach avoids missing recipes.
**When to use:** For the scrape step.
**Example:**
```typescript
// Phase 1: Discover all recipe URLs from sitemap
const letters = "abcdefghijklmnopqrstuvwxyz".split("");
const recipeUrls: string[] = [];

for (const letter of letters) {
  const page = await context.newPage();
  await page.goto(`https://jow.fr/site-map/recipes/letter-${letter}`);
  // Extract recipe paths from __NEXT_DATA__ or DOM
  const data = await page.evaluate(() => {
    const el = document.querySelector("#__NEXT_DATA__");
    return el ? JSON.parse(el.textContent!) : null;
  });
  // Parse groupRecipes array from data
  if (data?.props?.pageProps?.groupRecipes) {
    for (const r of data.props.pageProps.groupRecipes) {
      recipeUrls.push(r.path);
    }
  }
  await page.close();
  await delay(1500); // Rate limiting
}

// Phase 2: Scrape each recipe detail page
for (const url of recipeUrls) {
  await scrapeRecipeDetail(browser, `https://jow.fr${url}`);
  await delay(1500); // Rate limiting
}
```

### Pattern 3: Claude CLI Structured Enrichment
**What:** Call `claude -p` with a system prompt and recipe JSON piped via stdin, using `--json-schema` for validated structured output.
**When to use:** For the enrich step -- one call per recipe.
**Example:**
```typescript
import { execSync } from "node:child_process";

const schema = JSON.stringify({
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
        required: ["name", "proteinPer100g", "carbsPer100g", "fatPer100g", "caloriesPer100g", "confidence"],
      },
    },
  },
  required: ["ingredients"],
});

const prompt = `Estimate macronutrients per 100g for each ingredient in this recipe.
Use standard nutritional databases (USDA, CIQUAL) as reference.
Return protein, carbs, fat, and calories per 100g for each ingredient.`;

const result = execSync(
  `echo '${JSON.stringify(recipe)}' | claude -p "${prompt}" --output-format json --json-schema '${schema}' --max-turns 1 --no-session-persistence`,
  { encoding: "utf-8", timeout: 60000 }
);

const parsed = JSON.parse(result);
const macros = parsed.structured_output;
```

### Pattern 4: Bearer Token API Authentication
**What:** Simple shared secret in env var, checked in route handler middleware.
**When to use:** For the upload API endpoint.
**Example:**
```typescript
// src/app/api/recipes/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

function validateBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.PIPELINE_TOKEN;
}

export async function POST(request: NextRequest) {
  if (!validateBearerToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = recipeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Upsert recipe...
  return NextResponse.json({ id: recipe.id }, { status: 201 });
}
```

### Pattern 5: Drizzle Upsert with onConflictDoUpdate
**What:** Use Drizzle's `onConflictDoUpdate` targeting the `jowId` unique column for idempotent recipe insertion.
**When to use:** In the upload API endpoint.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/upsert
import { eq } from "drizzle-orm";

const [recipe] = await db
  .insert(recipes)
  .values({
    jowId: data.jowId,
    title: data.title,
    imageUrl: data.imageUrl,
    jowUrl: data.jowUrl,
    cookTimeMin: data.cookTimeMin,
    originalPortions: data.originalPortions,
  })
  .onConflictDoUpdate({
    target: recipes.jowId,
    set: {
      title: data.title,
      imageUrl: data.imageUrl,
      cookTimeMin: data.cookTimeMin,
      originalPortions: data.originalPortions,
      updatedAt: new Date(),
    },
  })
  .returning({ id: recipes.id });
```

### Anti-Patterns to Avoid
- **Scraping without rate limiting:** Will get IP-banned or cause service issues. Always use 1-2 second delays between requests.
- **Storing intermediate data only in memory:** A crash at recipe 500/3214 loses all progress. Use JSONL files for resumability.
- **Calling Claude API directly instead of CLI:** The user decided on CLI invocation, not SDK. The CLI handles auth, retries, and model selection automatically.
- **Single monolithic pipeline script:** Makes debugging and partial re-runs impossible. Keep scrape/enrich/upload as separate commands.
- **Using `onConflictDoNothing` for upsert:** This skips updates to existing recipes. Use `onConflictDoUpdate` to refresh stale data while avoiding duplicates.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Regex-based extraction | Cheerio for HTML, `JSON.parse` for `__NEXT_DATA__` | HTML is not regular; nested structures break regex |
| Rate limiting | Custom setTimeout loops | Simple `await delay(ms)` utility + sequential processing | Over-engineering; 3214 recipes at 1.5s = ~80 min total |
| JSON Schema validation | Manual field checks | Zod schema with `.safeParse()` | Type inference, error messages, composability |
| Browser automation | Fetch + custom cookie/session management | Playwright | Handles cookies, JS rendering, navigation, selectors |
| Upsert logic | SELECT-then-INSERT/UPDATE | Drizzle `onConflictDoUpdate` | Race conditions, atomicity, single query |
| CLI process invocation | Raw `child_process.exec` with string interpolation | `execFileSync` with array args or `execSync` with proper escaping | Shell injection, encoding issues |
| JSONL parsing | `fs.readFileSync` + `split("\n")` + `JSON.parse` | `readline.createInterface` with async generator | Memory efficiency for large files, handles edge cases |

**Key insight:** The pipeline processes ~3200 recipes through 3 steps. Each step is I/O bound (network or Claude CLI), not CPU bound. Simplicity and reliability beat performance optimization. The whole pipeline will take hours regardless (Claude enrichment is the bottleneck at ~30s/recipe), so focus on resumability, not speed.

## Common Pitfalls

### Pitfall 1: Jow Page Structure Changes
**What goes wrong:** Jow updates their Next.js version or page structure, breaking `__NEXT_DATA__` extraction.
**Why it happens:** Newer Next.js versions use React Server Components with flight data format (`self.__next_f.push()`) instead of `__NEXT_DATA__`.
**How to avoid:** Use Playwright to render the page fully, then extract from the rendered DOM. Also extract from JSON-LD (`application/ld+json`) as a fallback -- this is a stable SEO format that Jow is unlikely to remove. Design the parser with a fallback chain: try `__NEXT_DATA__` first, then JSON-LD, then DOM selectors.
**Warning signs:** Empty or missing `__NEXT_DATA__` script tag; recipe fields coming back as undefined.

### Pitfall 2: Claude CLI Output Parsing Failures
**What goes wrong:** Claude returns malformed JSON, times out, or returns unexpected structure despite `--json-schema`.
**Why it happens:** `--json-schema` enforces structure but Claude may still fail on complex inputs, hit rate limits, or timeout.
**How to avoid:** (1) Use `--max-turns 1` to prevent runaway agent loops. (2) Wrap in try/catch with timeout. (3) Validate output with Zod after parsing. (4) Implement retry logic (max 1 retry with "your previous response was invalid" context). (5) Log failures to a separate file for manual review.
**Warning signs:** JSON parse errors, timeout exceptions, Zod validation failures.

### Pitfall 3: Ingredient Name Normalization
**What goes wrong:** The same ingredient appears multiple times in the DB with slightly different names ("Poulet", "Blanc de poulet", "Poulet (escalope)", "Escalope de poulet").
**Why it happens:** Different Jow recipes use different names for the same base ingredient.
**How to avoid:** This is a known hard problem. For Phase 2, accept some duplication -- exact match by name is sufficient. Normalization and deduplication can be improved later. Store `originalText` in `recipe_ingredients` to preserve the original Jow text for future cleanup.
**Warning signs:** Ingredient count growing faster than expected; same ingredient with multiple spelling variants.

### Pitfall 4: Shell Injection in Claude CLI Calls
**What goes wrong:** Recipe titles or ingredient names containing quotes, backticks, or dollar signs break the shell command.
**Why it happens:** String interpolation into shell commands with `execSync`.
**How to avoid:** Pipe the recipe JSON via stdin instead of passing as argument. Use `execFileSync` or write to a temp file. Never interpolate user-controlled data into shell command strings.
**Warning signs:** `execSync` errors with unexpected token, truncated output.

### Pitfall 5: Schema Migration Needed Before API Endpoint
**What goes wrong:** The recipes table lacks columns for data Jow provides (instructions, difficulty, prep time, ratings, categories/tags).
**Why it happens:** Phase 1 schema was designed as a minimal foundation. Jow provides much richer data than the current schema supports.
**How to avoid:** Plan a schema migration to add new columns before implementing the upload endpoint. The current schema has: `jowId`, `title`, `imageUrl`, `jowUrl`, `cookTimeMin`, `originalPortions`. Missing: `description`, `difficulty`, `prepTimeMin`, `totalTimeMin`, `instructions` (jsonb), `nutriScore`, `rating`, `ratingCount`, `cuisine`, `category`. The existing `jowId` unique constraint is already correct for deduplication.
**Warning signs:** Upload endpoint silently discarding scraped data fields that have no column.

### Pitfall 6: Enrichment Costs and Token Usage
**What goes wrong:** Enriching 3200 recipes via Claude CLI uses significant API credits. Re-running the full enrichment wastes money.
**Why it happens:** Each Claude call costs tokens. Full re-enrichment of already-processed recipes is wasteful.
**How to avoid:** (1) Check if recipe already has enrichment data in the JSONL before calling Claude. (2) Use `--max-turns 1` to limit token usage per call. (3) Track enrichment status in the JSONL output (enriched: true/false). (4) Consider using a smaller/cheaper model via `--model sonnet` for macro estimation.
**Warning signs:** Unexpectedly high token usage, duplicate enrichment calls.

### Pitfall 7: Jow Already Provides Nutritional Data
**What goes wrong:** Duplicating effort by having Claude estimate macros that Jow already provides per-serving.
**Why it happens:** The JSON-LD on Jow recipe pages includes per-serving nutrition (calories, fat, carbs, protein, fiber). However, the user requirement is per-ingredient macros per 100g, not per-serving totals.
**How to avoid:** Scrape Jow's per-serving nutrition as a cross-validation baseline. Claude estimates per-ingredient per-100g macros. Compare: sum of Claude's per-ingredient estimates (adjusted for recipe quantities and portions) should approximate Jow's per-serving totals. Flag significant divergences (>20%) for review. This satisfies the cross-validation requirement from the context.
**Warning signs:** Large systematic divergence between Claude estimates and Jow totals.

## Code Examples

Verified patterns from official sources:

### Drizzle Upsert with Composite Relations
```typescript
// Source: https://orm.drizzle.team/docs/guides/upsert
// Upsert recipe, then upsert ingredients and relations
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, recipeIngredients } from "@/db/schema";

async function upsertRecipe(data: RecipeUploadPayload) {
  return await db.transaction(async (tx) => {
    // 1. Upsert the recipe
    const [recipe] = await tx
      .insert(recipes)
      .values({
        jowId: data.jowId,
        title: data.title,
        imageUrl: data.imageUrl,
        jowUrl: data.jowUrl,
        cookTimeMin: data.cookTimeMin,
        originalPortions: data.originalPortions,
      })
      .onConflictDoUpdate({
        target: recipes.jowId,
        set: {
          title: data.title,
          imageUrl: data.imageUrl,
          cookTimeMin: data.cookTimeMin,
          originalPortions: data.originalPortions,
          updatedAt: new Date(),
        },
      })
      .returning({ id: recipes.id });

    // 2. Upsert each ingredient
    for (const ing of data.ingredients) {
      const [ingredient] = await tx
        .insert(ingredients)
        .values({
          name: ing.name,
          proteinPer100g: ing.proteinPer100g,
          carbsPer100g: ing.carbsPer100g,
          fatPer100g: ing.fatPer100g,
          caloriesPer100g: ing.caloriesPer100g,
        })
        .onConflictDoUpdate({
          target: ingredients.name, // needs unique constraint on name
          set: {
            proteinPer100g: ing.proteinPer100g,
            carbsPer100g: ing.carbsPer100g,
            fatPer100g: ing.fatPer100g,
            caloriesPer100g: ing.caloriesPer100g,
            updatedAt: new Date(),
          },
        })
        .returning({ id: ingredients.id });

      // 3. Link recipe-ingredient
      await tx
        .insert(recipeIngredients)
        .values({
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          quantity: ing.quantity,
          unit: ing.unit,
          originalText: ing.originalText,
        })
        .onConflictDoUpdate({
          target: [recipeIngredients.recipeId, recipeIngredients.ingredientId],
          set: {
            quantity: ing.quantity,
            unit: ing.unit,
            originalText: ing.originalText,
            updatedAt: new Date(),
          },
        });
    }

    return recipe;
  });
}
```

### Playwright Scraping with Rate Limiting
```typescript
// Source: https://playwright.dev/docs/library
import { chromium, type Browser, type Page } from "playwright";

async function createScraper() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "MealPrepBot/1.0 (personal project)",
  });
  return { browser, context };
}

async function scrapeRecipePage(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Strategy 1: Extract from __NEXT_DATA__
  const nextData = await page.evaluate(() => {
    const el = document.querySelector("#__NEXT_DATA__");
    return el?.textContent ? JSON.parse(el.textContent) : null;
  });

  if (nextData?.props?.pageProps) {
    return parseNextDataRecipe(nextData.props.pageProps);
  }

  // Strategy 2: Extract from JSON-LD
  const jsonLd = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      const data = JSON.parse(s.textContent!);
      if (data["@type"] === "Recipe") return data;
    }
    return null;
  });

  if (jsonLd) {
    return parseJsonLdRecipe(jsonLd);
  }

  throw new Error(`Could not extract recipe data from ${url}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Claude CLI Invocation with Stdin
```typescript
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function enrichRecipeWithClaude(recipe: ScrapedRecipe): EnrichmentResult {
  // Write recipe to temp file to avoid shell escaping issues
  const tmpFile = join(tmpdir(), `recipe-${recipe.jowId}.json`);
  writeFileSync(tmpFile, JSON.stringify(recipe));

  const schema = JSON.stringify({
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
          },
          required: ["name", "proteinPer100g", "carbsPer100g", "fatPer100g", "caloriesPer100g"],
        },
      },
    },
    required: ["ingredients"],
  });

  try {
    const result = execSync(
      `cat "${tmpFile}" | claude -p --system-prompt-file scripts/pipeline/prompts/macro-enrichment.md --output-format json --json-schema '${schema}' --max-turns 1 --no-session-persistence --tools ""`,
      { encoding: "utf-8", timeout: 120000 }
    );

    const parsed = JSON.parse(result);
    return parsed.structured_output;
  } finally {
    unlinkSync(tmpFile);
  }
}
```

### Next.js Route Handler with Bearer Auth and Zod Validation
```typescript
// src/app/api/recipes/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { recipes } from "@/db/schema";

const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  originalText: z.string().nullable(),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  caloriesPer100g: z.number().min(0).max(900),
});

const recipeUploadSchema = z.object({
  jowId: z.string().min(1),
  title: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  jowUrl: z.string().url(),
  cookTimeMin: z.number().int().positive().nullable(),
  originalPortions: z.number().int().positive().nullable(),
  ingredients: z.array(ingredientSchema).min(1),
  tags: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== process.env.PIPELINE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate body
  const body = await request.json();
  const result = recipeUploadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  // Upsert (see upsert pattern above)
  const recipe = await upsertRecipe(result.data);
  return NextResponse.json({ id: recipe.id }, { status: 201 });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for scraping | Playwright | 2023+ | Playwright has better auto-wait, multi-browser support, maintained by Microsoft |
| `__NEXT_DATA__` extraction (pages router) | RSC flight data (app router) | Next.js 13+ | Jow still uses `__NEXT_DATA__` as of Feb 2026, but may migrate -- need fallback |
| Claude API with prompt engineering for JSON | Claude CLI `--json-schema` for guaranteed structure | 2025-2026 | Eliminates JSON parsing failures, validates output against schema |
| Manual HTTP + cookie management | Playwright browser context | Ongoing | Handles auth, cookies, JS rendering automatically |
| JSON files for pipeline data | JSONL streaming | Standard practice | Line-by-line processing, better resumability, lower memory |

**Deprecated/outdated:**
- Puppeteer: Still works but Playwright is the modern standard with better DX
- `@types/cheerio`: No longer needed, Cheerio 1.x includes TypeScript types natively
- Claude "skills" (Claude Code custom commands): The user decided against this -- use CLI invocation instead

## Jow.fr Data Structure

### Available Data from Jow Recipe Pages (HIGH confidence -- verified via WebFetch)

**From JSON-LD (`application/ld+json`):**
- Recipe name, description
- Author name
- Prep time, cook time, total time (ISO 8601 durations)
- Yield (portions)
- Ingredients list (text format with quantities)
- Instructions (step-by-step)
- Nutritional info per serving: calories, fat, carbs, protein, fiber
- Aggregate rating (score + count)
- Keywords (pork-free, gluten-free, etc.)
- Cuisine type, recipe category
- Image URL

**From `__NEXT_DATA__`:**
- Full recipe object with internal Jow IDs
- Enriched ingredient objects with alternatives and unit conversions
- Author details with profile image
- Nutri-score and green-score ratings
- Difficulty level
- Equipment list

**Recipe URL format:** `/recipes/{slug}-{16-char-alphanumeric-id}`
Example: `/recipes/poulet-au-curry-89y06dxjhfua0twu16x5`

**Jow ID format:** The 16-character alphanumeric suffix in the URL (e.g., `89y06dxjhfua0twu16x5`) serves as the unique recipe identifier. This is the value to use for `jowId` in the database.

### Sitemap Structure for Recipe Discovery
- Index: `https://jow.fr/site-map/recipes` -- lists letter groups with recipe counts
- Per letter: `https://jow.fr/site-map/recipes/letter-{a-z}` -- lists all recipes for that letter
- Total recipes: ~3,214 as of February 2026
- Data format: `groupRecipes` array with `{ path, title }` objects

## Schema Migration Notes

The current recipes table schema needs extension. These new columns should be added:

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| description | text | JSON-LD | Recipe description text |
| prepTimeMin | integer | JSON-LD | Separate from cookTimeMin |
| totalTimeMin | integer | JSON-LD | May differ from prep+cook |
| difficulty | text | `__NEXT_DATA__` | "Tres facile", "Facile", etc. |
| instructions | jsonb | JSON-LD | Array of step objects |
| nutriScore | text | `__NEXT_DATA__` | A, B, C, D, E |
| rating | real | JSON-LD | Aggregate rating value |
| ratingCount | integer | JSON-LD | Number of reviews |
| cuisine | text | JSON-LD | "Indienne", "Francaise", etc. |
| category | text | JSON-LD | "Proteines Animales + Feculent", etc. |
| jowNutritionPerServing | jsonb | JSON-LD | Original Jow nutrition data for cross-validation |

The `ingredients` table also needs a unique constraint on `name` for upsert to work (currently has no unique constraint beyond `id`).

## Claude's Discretion Recommendations

### 1. Intermediate Storage Format: JSONL
**Recommendation:** Use JSONL (JSON Lines) format for data between pipeline steps.
**Reasoning:** Each recipe is one line, enabling: (a) `wc -l` to count progress, (b) `tail -n +N` for resumability, (c) append-only writes during scraping, (d) streaming reads during enrichment. JSON arrays would require loading the entire file into memory and rewriting on each update.

### 2. Deduplication Key: Jow URL Suffix ID
**Recommendation:** Use the 16-character alphanumeric ID from the Jow URL as `jowId`.
**Reasoning:** The URL suffix (e.g., `89y06dxjhfua0twu16x5`) is already stored as `jowId` in the schema and has a unique constraint. It is stable across URL slug changes (the slug is the human-readable part, the ID is the stable part). Using the full URL would break if Jow changes their domain or URL structure. The internal MongoDB-style IDs visible in `__NEXT_DATA__` are less accessible than the URL-based ID.

### 3. Scraping Method: Playwright with Cheerio Fallback
**Recommendation:** Use Playwright as the primary scraping method.
**Reasoning:** While Jow currently embeds `__NEXT_DATA__` in SSR HTML (accessible via simple HTTP), this is fragile:
- Jow uses Next.js and may migrate to React Server Components at any time
- Anti-bot measures could block non-browser HTTP clients
- Playwright handles JavaScript rendering, cookies, and dynamic content
- Playwright can still extract `__NEXT_DATA__` and JSON-LD from the rendered page
- For the sitemap pages (which are simpler), HTTP+Cheerio could be used as an optimization, but Playwright is safer for consistency

## Open Questions

Things that couldn't be fully resolved:

1. **Exact `__NEXT_DATA__` structure for recipe detail pages**
   - What we know: The data includes recipe object, ingredients, nutrition, and metadata
   - What's unclear: The exact nested JSON path to all fields (e.g., `props.pageProps.recipe.ingredients[].name`)
   - Recommendation: During implementation, `console.log` the first scraped `__NEXT_DATA__` and map all fields. Design the parser after inspecting real data.

2. **Jow rate limiting and anti-bot measures**
   - What we know: The site is public and SEO-optimized (has JSON-LD, sitemap). No evidence of aggressive anti-bot.
   - What's unclear: Whether 3200+ requests with 1.5s delays will trigger blocks
   - Recommendation: Start with polite scraping (1.5s delays, proper user-agent). If blocked, increase delays or add random jitter. The sitemap discovery phase is only 26 requests.

3. **Claude CLI cost for 3200 enrichment calls**
   - What we know: Each call uses Claude with `--max-turns 1`. Cost depends on model and token usage.
   - What's unclear: Exact per-call cost, whether Sonnet is sufficient for macro estimation
   - Recommendation: Start with `--model sonnet` for cost efficiency. Test with 10 recipes first. Log token usage from the JSON output. Estimate total cost before running full enrichment.

4. **Ingredient name matching across recipes**
   - What we know: Jow uses varied ingredient names. The current schema has no unique constraint on ingredient name.
   - What's unclear: How many unique ingredients exist vs. how many variants of the same ingredient
   - Recommendation: Add a unique constraint on `ingredients.name` in the schema migration. Accept some duplication initially. Track ingredient count as a quality metric.

## Sources

### Primary (HIGH confidence)
- Jow.fr recipe page (WebFetch) -- verified JSON-LD structure with nutrition, ingredients, ratings, instructions
- Jow.fr sitemap pages (WebFetch) -- verified recipe URL discovery with 3214 recipes across letter indices
- Playwright official docs (https://playwright.dev/docs/library) -- library API for scraping
- Drizzle ORM upsert guide (https://orm.drizzle.team/docs/guides/upsert) -- `onConflictDoUpdate` patterns
- Claude Code CLI reference (https://code.claude.com/docs/en/cli-reference) -- `--json-schema`, `-p`, `--output-format json`
- Claude Code headless docs (https://code.claude.com/docs/en/headless) -- programmatic usage patterns

### Secondary (MEDIUM confidence)
- Cheerio npm (https://www.npmjs.com/package/cheerio) -- v1.2.0, TypeScript types built-in
- Trickster Dev article on Next.js scraping -- `__NEXT_DATA__` accessible via HTTP, RSC flight data as alternative
- jow-api PyPI package -- confirms Jow has publicly accessible recipe data APIs
- BrowserStack Playwright guide -- rate limiting and ethical scraping best practices

### Tertiary (LOW confidence)
- Exact `__NEXT_DATA__` JSON paths for recipe detail pages -- inferred from WebFetch but not fully mapped
- Jow anti-bot behavior -- no direct evidence either way, assumed permissive based on SEO investment
- Claude CLI token costs per enrichment call -- depends on model selection and recipe complexity

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Playwright, Cheerio, Zod, Drizzle all verified via official docs
- Architecture: HIGH -- Pipeline pattern is well-established, JSONL is standard for data processing
- Jow data structure: HIGH -- Verified via WebFetch on actual recipe and sitemap pages
- Claude CLI integration: HIGH -- Verified `--json-schema` flag and structured output via official docs
- Pitfalls: MEDIUM -- Based on experience patterns and community knowledge, some site-specific unknowns
- Schema migration needs: HIGH -- Compared existing schema against verified Jow data fields

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (Jow site structure could change; libraries are stable)
