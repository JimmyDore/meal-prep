import type {
  JowNutritionPerServing,
  ScrapedIngredient,
  ScrapedRecipe,
} from "./types";

/**
 * Extract the Jow ID from a recipe URL.
 * Pattern: last segment after the final dash in the path.
 * Example: "/recipes/poulet-au-curry-89y06dxjhfua0twu16x5" -> "89y06dxjhfua0twu16x5"
 */
export function extractJowId(url: string): string {
  const path = new URL(url, "https://jow.fr").pathname;
  const lastSegment = path.split("/").pop() ?? "";
  const lastDashIndex = lastSegment.lastIndexOf("-");
  if (lastDashIndex === -1) return lastSegment;
  return lastSegment.slice(lastDashIndex + 1);
}

/**
 * Extract the recipe slug (without the trailing Jow ID) from a URL.
 * Jow publishes multiple variants of the same recipe (different portion sizes)
 * as separate URLs that share the same slug base but differ in their trailing ID.
 * Example: "/recipes/poulet-au-curry-89y06dxjhfua0twu16x5" -> "poulet-au-curry"
 */
export function extractRecipeSlug(url: string): string {
  const path = new URL(url, "https://jow.fr").pathname;
  const lastSegment = path.split("/").pop() ?? "";
  const lastDashIndex = lastSegment.lastIndexOf("-");
  if (lastDashIndex === -1) return lastSegment;
  return lastSegment.slice(0, lastDashIndex);
}

/**
 * Parse ISO 8601 duration to minutes.
 * Supports: PT30M, PT1H15M, PT1H, PT45M, PT2H30M
 * Returns null if unparseable.
 */
export function parseIsoDuration(iso: string): number | null {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  const total = hours * 60 + minutes + Math.round(seconds / 60);
  return total > 0 ? total : null;
}

/** Map Jow difficulty number to human-readable label */
const DIFFICULTY_MAP: Record<number, string> = {
  0: "Tres facile",
  1: "Facile",
  2: "Moyen",
  3: "Difficile",
};

/**
 * Parse a recipe from __NEXT_DATA__ JSON.
 * Navigates props.pageProps.recipe with the real Jow data structure:
 * - directions[].label for instructions
 * - nutritionalFacts[] array with {id, amount} for ENERC/FAT/CHOAVL/PRO/FIBTG
 * - cookingTime / preparationTime as direct minute numbers
 * - coversCount for portions
 * - difficulty as number (0-3)
 * - constituents[].name, constituents[].quantityPerCover, constituents[].unit.name
 */
export function parseNextDataRecipe(
  nextData: unknown,
  url: string,
): ScrapedRecipe | null {
  // biome-ignore lint/suspicious/noExplicitAny: __NEXT_DATA__ structure is unknown/dynamic
  const data = nextData as any;

  const pageProps = data?.props?.pageProps;
  if (!pageProps) {
    console.warn("[parser] __NEXT_DATA__: no props.pageProps found");
    return null;
  }

  const recipe = pageProps.recipe ?? pageProps.data?.recipe ?? pageProps;

  const title = recipe?.title ?? recipe?.name;
  if (!title) {
    console.warn("[parser] __NEXT_DATA__: no title found");
    return null;
  }

  const jowId = extractJowId(url);
  if (!jowId || jowId.length < 10) {
    console.warn(`[parser] __NEXT_DATA__: invalid jowId from URL: ${url}`);
    return null;
  }

  // Extract ingredients from constituents array
  const rawIngredients: unknown[] =
    recipe?.constituents ?? recipe?.ingredients ?? [];
  const ingredients: ScrapedIngredient[] = [];

  for (const raw of rawIngredients) {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic data
    const ing = raw as any;
    const name = ing?.name ?? ing?.label ?? ing?.ingredient?.name;
    if (!name) continue;

    // Build unit string from unit.name or first abbreviation label
    let unit: string | null = null;
    if (typeof ing?.unit?.name === "string") {
      unit = ing.unit.name;
    } else if (Array.isArray(ing?.unit?.abbreviations) && ing.unit.abbreviations.length > 0) {
      const abbr = ing.unit.abbreviations[0]?.label;
      if (typeof abbr === "string" && abbr.trim()) unit = abbr.trim();
    }

    const qty =
      typeof ing?.quantityPerCover === "number" ? ing.quantityPerCover : null;

    ingredients.push({
      name: String(name),
      quantity: qty,
      unit,
      originalText: `${qty ?? ""} ${unit ?? ""} ${name}`.trim(),
    });
  }

  // Extract nutrition from nutritionalFacts array [{id, amount}, ...]
  let jowNutritionPerServing: JowNutritionPerServing | null = null;
  const nutritionalFacts: unknown[] = recipe?.nutritionalFacts ?? [];
  if (Array.isArray(nutritionalFacts) && nutritionalFacts.length > 0) {
    const factsMap = new Map<string, number>();
    for (const fact of nutritionalFacts) {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic data
      const f = fact as any;
      if (typeof f?.id === "string" && typeof f?.amount === "number") {
        factsMap.set(f.id, f.amount);
      }
    }

    const calories = factsMap.get("ENERC") ?? null;
    const fat = factsMap.get("FAT") ?? null;
    const carbs = factsMap.get("CHOAVL") ?? null;
    const protein = factsMap.get("PRO") ?? null;
    const fiber = factsMap.get("FIBTG") ?? null;

    if (
      calories !== null &&
      fat !== null &&
      carbs !== null &&
      protein !== null
    ) {
      jowNutritionPerServing = {
        calories,
        fat,
        carbs,
        protein,
        fiber: fiber ?? 0,
      };
    }
  }

  // Extract instructions from directions[].label
  const rawDirections: unknown[] =
    recipe?.directions ?? recipe?.steps ?? recipe?.instructions ?? [];
  const instructions: string[] = [];
  for (const step of rawDirections) {
    if (typeof step === "string") {
      instructions.push(step);
    } else if (typeof step === "object" && step !== null) {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic step data
      const s = step as any;
      const text = s?.label ?? s?.description ?? s?.text ?? s?.content;
      if (typeof text === "string") instructions.push(text);
    }
  }

  // Convert difficulty number to string label
  const rawDifficulty = recipe?.difficulty;
  let difficulty: string | null = null;
  if (typeof rawDifficulty === "number") {
    difficulty = DIFFICULTY_MAP[rawDifficulty] ?? `Level ${rawDifficulty}`;
  } else if (typeof rawDifficulty === "string") {
    difficulty = rawDifficulty;
  }

  // Compute totalTimeMin from cookingTime + preparationTime if not directly available
  const cookTimeMin =
    typeof recipe?.cookingTime === "number" ? recipe.cookingTime : null;
  const prepTimeMin =
    typeof recipe?.preparationTime === "number"
      ? recipe.preparationTime
      : null;
  let totalTimeMin: number | null = null;
  if (cookTimeMin !== null && prepTimeMin !== null) {
    totalTimeMin = cookTimeMin + prepTimeMin;
  } else if (cookTimeMin !== null) {
    totalTimeMin = cookTimeMin;
  } else if (prepTimeMin !== null) {
    totalTimeMin = prepTimeMin;
  }

  // Build result
  const result: ScrapedRecipe = {
    title: String(title),
    description: String(recipe?.description ?? recipe?.composition ?? ""),
    jowId,
    jowUrl: url.startsWith("http") ? url : `https://jow.fr${url}`,
    imageUrl: recipe?.imageUrl ?? recipe?.imageUrlHD ?? null,
    cookTimeMin,
    prepTimeMin,
    totalTimeMin,
    difficulty,
    instructions,
    nutriScore: recipe?.nutriScore ?? recipe?.nutriScoreV2 ?? null,
    rating: null, // __NEXT_DATA__ aggregateRating is unreliable (-1 values); use JSON-LD
    ratingCount:
      typeof recipe?.totalFeedbacks === "number"
        ? recipe.totalFeedbacks
        : null,
    cuisine: null, // Not available in __NEXT_DATA__
    category: null, // Not available in __NEXT_DATA__
    originalPortions:
      typeof recipe?.coversCount === "number" ? recipe.coversCount : null,
    ingredients,
    jowNutritionPerServing,
  };

  // Warn about missing optional fields
  if (!result.imageUrl)
    console.warn(`[parser] __NEXT_DATA__: no imageUrl for "${title}"`);
  if (result.instructions.length === 0)
    console.warn(`[parser] __NEXT_DATA__: no instructions for "${title}"`);
  if (result.ingredients.length === 0) {
    console.warn(`[parser] __NEXT_DATA__: no ingredients for "${title}"`);
    return null;
  }

  return result;
}

/**
 * Parse a recipe from JSON-LD (Schema.org Recipe format).
 * Accepts a parsed JSON-LD object and the page URL for jowId extraction.
 */
export function parseJsonLdRecipe(
  jsonLd: unknown,
  url: string,
): ScrapedRecipe | null {
  // biome-ignore lint/suspicious/noExplicitAny: JSON-LD structure varies
  const data = jsonLd as any;

  const title = data?.name;
  if (!title) {
    console.warn("[parser] JSON-LD: no name found");
    return null;
  }

  const jowId = extractJowId(url);
  if (!jowId || jowId.length < 10) {
    console.warn(`[parser] JSON-LD: invalid jowId from URL: ${url}`);
    return null;
  }

  // Parse ingredients from text format
  const rawIngredients: string[] = data?.recipeIngredient ?? [];
  const ingredients: ScrapedIngredient[] = rawIngredients
    .filter((text: unknown) => typeof text === "string" && text.trim())
    .map((text: string) => parseIngredientText(text));

  // Parse instructions
  const rawInstructions = data?.recipeInstructions ?? [];
  const instructions: string[] = [];
  for (const item of rawInstructions) {
    if (typeof item === "string") {
      instructions.push(item);
    } else if (typeof item === "object" && item !== null) {
      const text = item?.text ?? item?.description;
      if (typeof text === "string") instructions.push(text);
    }
  }

  // Parse nutrition
  let jowNutritionPerServing: JowNutritionPerServing | null = null;
  const nutrition = data?.nutrition;
  if (nutrition) {
    const calories = parseNutritionValue(
      nutrition?.calories ?? nutrition?.energyContent,
    );
    const fat = parseNutritionValue(nutrition?.fatContent);
    const carbs = parseNutritionValue(nutrition?.carbohydrateContent);
    const protein = parseNutritionValue(nutrition?.proteinContent);
    const fiber = parseNutritionValue(nutrition?.fiberContent);

    if (
      calories !== null &&
      fat !== null &&
      carbs !== null &&
      protein !== null
    ) {
      jowNutritionPerServing = {
        calories,
        fat,
        carbs,
        protein,
        fiber: fiber ?? 0,
      };
    }
  }

  // Parse rating
  const aggregateRating = data?.aggregateRating;
  const rating =
    typeof aggregateRating?.ratingValue === "number"
      ? aggregateRating.ratingValue
      : typeof aggregateRating?.ratingValue === "string"
        ? Number.parseFloat(aggregateRating.ratingValue)
        : null;
  const ratingCount =
    typeof aggregateRating?.ratingCount === "number"
      ? aggregateRating.ratingCount
      : typeof aggregateRating?.ratingCount === "string"
        ? Number.parseInt(aggregateRating.ratingCount, 10)
        : null;

  // Parse yield/portions
  const yieldStr = data?.recipeYield;
  let originalPortions: number | null = null;
  if (typeof yieldStr === "number") {
    originalPortions = yieldStr;
  } else if (typeof yieldStr === "string") {
    const match = yieldStr.match(/(\d+)/);
    if (match) originalPortions = Number.parseInt(match[1], 10);
  } else if (Array.isArray(yieldStr) && yieldStr.length > 0) {
    const first = yieldStr[0];
    if (typeof first === "number") originalPortions = first;
    else if (typeof first === "string") {
      const match = first.match(/(\d+)/);
      if (match) originalPortions = Number.parseInt(match[1], 10);
    }
  }

  const result: ScrapedRecipe = {
    title: String(title),
    description: String(data?.description ?? ""),
    jowId,
    jowUrl: url.startsWith("http") ? url : `https://jow.fr${url}`,
    imageUrl:
      typeof data?.image === "string"
        ? data.image
        : Array.isArray(data?.image)
          ? data.image[0]
          : (data?.image?.url ?? null),
    cookTimeMin: parseIsoDuration(data?.cookTime) ?? null,
    prepTimeMin: parseIsoDuration(data?.prepTime) ?? null,
    totalTimeMin: parseIsoDuration(data?.totalTime) ?? null,
    difficulty: null, // JSON-LD does not typically include difficulty
    instructions,
    nutriScore: null, // JSON-LD does not typically include nutriScore
    rating: rating !== null && !Number.isNaN(rating) ? rating : null,
    ratingCount:
      ratingCount !== null && !Number.isNaN(ratingCount) ? ratingCount : null,
    cuisine:
      typeof data?.recipeCuisine === "string" ? data.recipeCuisine : null,
    category:
      typeof data?.recipeCategory === "string" ? data.recipeCategory : null,
    originalPortions,
    ingredients,
    jowNutritionPerServing,
  };

  if (result.ingredients.length === 0) {
    console.warn(`[parser] JSON-LD: no ingredients for "${title}"`);
    return null;
  }

  return result;
}

/**
 * Parse a nutrition value string like "250 kcal" or "15 g" to a number.
 */
function parseNutritionValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const match = value.match(/([\d.]+)/);
  if (!match) return null;
  const num = Number.parseFloat(match[1]);
  return Number.isNaN(num) ? null : num;
}

/**
 * Parse an ingredient text string like "200 g poulet" into ScrapedIngredient.
 * Simple heuristic: first number is quantity, next word is unit, rest is name.
 */
function parseIngredientText(text: string): ScrapedIngredient {
  const trimmed = text.trim();

  // Try to extract quantity + unit + name pattern
  const match = trimmed.match(
    /^([\d.,/]+)\s*(g|kg|ml|cl|l|cs|cc|pincee|sachet|tranche|feuille|botte|gousse|branche|brin|c\.\s*a\.\s*s\.|c\.\s*a\.\s*c\.|\w{1,15})?\s+(.+)$/i,
  );

  if (match) {
    const rawQty = match[1].replace(",", ".");
    const quantity = Number.parseFloat(rawQty);
    return {
      name: match[3].trim(),
      quantity: Number.isNaN(quantity) ? null : quantity,
      unit: match[2]?.trim() ?? null,
      originalText: trimmed,
    };
  }

  // No quantity pattern found -- entire text is the ingredient name
  return {
    name: trimmed,
    quantity: null,
    unit: null,
    originalText: trimmed,
  };
}
