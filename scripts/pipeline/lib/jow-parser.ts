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

/**
 * Parse a recipe from __NEXT_DATA__ JSON.
 * Navigates props.pageProps to find the recipe object.
 * Designed defensively with optional chaining -- exact paths may need adjustment
 * after inspecting real data.
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

  // The recipe object may be at different paths -- try common patterns
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

  // Extract ingredients
  const rawIngredients: unknown[] =
    recipe?.constituents ?? recipe?.ingredients ?? [];
  const ingredients: ScrapedIngredient[] = [];

  for (const raw of rawIngredients) {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic data
    const ing = raw as any;
    const ingredient = ing?.ingredient ?? ing;
    const name =
      ingredient?.name ??
      ingredient?.label ??
      ingredient?.title ??
      ing?.name ??
      ing?.label;
    if (!name) continue;

    ingredients.push({
      name: String(name),
      quantity: typeof ing?.quantity === "number" ? ing.quantity : null,
      unit: ing?.unit?.abbreviation ?? ing?.unit?.name ?? ing?.unit ?? null,
      originalText:
        ing?.originalText ??
        `${ing?.quantity ?? ""} ${ing?.unit?.abbreviation ?? ""} ${name}`.trim(),
    });
  }

  // Extract nutrition
  let jowNutritionPerServing: JowNutritionPerServing | null = null;
  const nutrition =
    recipe?.nutritionalComposition ??
    recipe?.nutrition ??
    recipe?.nutritionalInfo;
  if (nutrition) {
    const calories =
      nutrition?.calories ??
      nutrition?.energy ??
      nutrition?.energyKcal ??
      null;
    const fat = nutrition?.fat ?? nutrition?.lipid ?? null;
    const carbs =
      nutrition?.carbs ?? nutrition?.carbohydrate ?? nutrition?.glucide ?? null;
    const protein = nutrition?.protein ?? nutrition?.proteine ?? null;
    const fiber = nutrition?.fiber ?? nutrition?.fibre ?? null;

    if (
      typeof calories === "number" &&
      typeof fat === "number" &&
      typeof carbs === "number" &&
      typeof protein === "number"
    ) {
      jowNutritionPerServing = {
        calories,
        fat,
        carbs,
        protein,
        fiber: typeof fiber === "number" ? fiber : 0,
      };
    }
  }

  // Extract instructions
  const rawSteps: unknown[] =
    recipe?.steps ?? recipe?.instructions ?? recipe?.preparationSteps ?? [];
  const instructions: string[] = [];
  for (const step of rawSteps) {
    if (typeof step === "string") {
      instructions.push(step);
    } else if (typeof step === "object" && step !== null) {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic step data
      const s = step as any;
      const text = s?.description ?? s?.text ?? s?.content ?? s?.label;
      if (typeof text === "string") instructions.push(text);
    }
  }

  // Build result
  const result: ScrapedRecipe = {
    title: String(title),
    description: String(recipe?.description ?? recipe?.subtitle ?? ""),
    jowId,
    jowUrl: url.startsWith("http") ? url : `https://jow.fr${url}`,
    imageUrl: recipe?.imageUrl ?? recipe?.image?.url ?? recipe?.image ?? null,
    cookTimeMin:
      typeof recipe?.cookingTimeMin === "number"
        ? recipe.cookingTimeMin
        : typeof recipe?.cookTime === "number"
          ? recipe.cookTime
          : null,
    prepTimeMin:
      typeof recipe?.preparationTimeMin === "number"
        ? recipe.preparationTimeMin
        : typeof recipe?.prepTime === "number"
          ? recipe.prepTime
          : null,
    totalTimeMin:
      typeof recipe?.totalTimeMin === "number"
        ? recipe.totalTimeMin
        : typeof recipe?.totalTime === "number"
          ? recipe.totalTime
          : null,
    difficulty: recipe?.difficulty ?? recipe?.difficultyLevel ?? null,
    instructions,
    nutriScore: recipe?.nutriScore ?? recipe?.nutriScoreV2 ?? null,
    rating:
      typeof recipe?.rating === "number"
        ? recipe.rating
        : typeof recipe?.averageRating === "number"
          ? recipe.averageRating
          : null,
    ratingCount:
      typeof recipe?.ratingCount === "number"
        ? recipe.ratingCount
        : typeof recipe?.ratingsCount === "number"
          ? recipe.ratingsCount
          : null,
    cuisine: recipe?.cuisine ?? recipe?.cuisineType ?? null,
    category: recipe?.category ?? recipe?.recipeCategory ?? null,
    originalPortions:
      typeof recipe?.portions === "number"
        ? recipe.portions
        : typeof recipe?.yield === "number"
          ? recipe.yield
          : null,
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
