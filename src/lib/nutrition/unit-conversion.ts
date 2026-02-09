/**
 * Unit-to-grams conversion for French cooking units.
 *
 * Converts ingredient quantities from French cooking units (as stored in the DB)
 * to grams, enabling macro calculation from per-100g nutritional data.
 *
 * DB unit strings include accented characters (e.g. "Cuillere a soupe", "Piece").
 * Both accented and unaccented lookups are supported via NFD normalization.
 */

/**
 * Maps French unit names (exact DB strings) to their gram equivalents.
 * Each unit maps to grams per 1 unit of that measurement.
 */
const UNIT_TO_GRAMS: Record<string, number> = {
  // Weight
  Kilogramme: 1000,
  // Volume (approximate: water density, adequate for cooking)
  Litre: 1000,
  // Spoons
  "Cuillere a soupe": 15,
  "Cuillère à soupe": 15,
  // Coffee spoon
  "Cuillere a cafe": 5,
  "Cuillère à café": 5,
  // Small units
  Gousse: 5,
  Bouquet: 25,
  Brin: 2,
  Pincee: 0.5,
  Pincée: 0.5,
  Noisette: 5,
  Poignee: 30,
  Poignée: 30,
  Tranche: 30,
  Boule: 60,
  // Misc
  Centimetre: 5,
  Centimètre: 5,
  Sachet: 10,
  Quartier: 30,
  Portion: 100,
  Leaf: 1,
};

/**
 * Maps lowercase accent-stripped ingredient name fragments to grams per piece.
 * Sorted by key length descending at lookup time to avoid partial matches
 * (e.g. "citron vert" must match before "citron").
 */
const PIECE_WEIGHTS_MAP: Record<string, number> = {
  // Eggs/dairy
  oeuf: 55,
  "petit suisse": 60,
  mozzarella: 125,
  yaourt: 125,
  // Vegetables
  oignon: 100,
  echalote: 25,
  "tomate cerise": 15,
  tomate: 130,
  "pomme de terre": 140,
  carotte: 125,
  courgette: 200,
  aubergine: 300,
  poivron: 150,
  concombre: 200,
  avocat: 200,
  ail: 5,
  // Fruits
  "citron vert": 100,
  citron: 120,
  pomme: 150,
  poire: 120,
  orange: 200,
  banane: 150,
  abricot: 45,
  peche: 150,
  kiwi: 100,
  mangue: 400,
  // Meat/other
  escalope: 150,
  filet: 150,
  saucisse: 100,
  tortilla: 50,
  galette: 50,
};

/**
 * Pre-sorted array of [key, weight] tuples sorted by key length descending.
 * This ensures longer keys match first (e.g. "citron vert" before "citron",
 * "tomate cerise" before "tomate", "pomme de terre" before "pomme").
 */
const PIECE_WEIGHTS: [string, number][] = Object.entries(PIECE_WEIGHTS_MAP).sort(
  (a, b) => b[0].length - a[0].length,
);

/**
 * Default weight in grams for a "Piece" when the ingredient is not recognized.
 */
export const DEFAULT_PIECE_WEIGHT = 100;

/**
 * Strips accents from a string via Unicode NFD decomposition.
 * "Echalote" -> "echalote", "Cuillere a soupe" -> "cuillere a soupe"
 */
function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Naive French singularization: strips trailing 's' from each word.
 * "tomates cerises" -> "tomate cerise", "pommes de terre" -> "pomme de terre"
 * This allows plural ingredient names to match singular PIECE_WEIGHTS keys.
 */
function singularize(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => (word.length > 1 && word.endsWith("s") ? word.slice(0, -1) : word))
    .join(" ");
}

/**
 * Converts an ingredient quantity+unit to grams.
 *
 * @param quantity - The numeric quantity (e.g. 0.15, 2, 3)
 * @param unit - The French unit string from DB (e.g. "Kilogramme", "Piece"), or null
 * @param ingredientName - The ingredient name, used for Piece lookups
 * @returns Weight in grams, or null if unit is null or unrecognized
 */
export function convertToGrams(
  quantity: number,
  unit: string | null,
  ingredientName: string,
): number | null {
  if (unit === null) {
    return null;
  }

  // Normalize unit for lookup: strip accents for comparison
  const normalizedUnit = stripAccents(unit);

  // Check if unit is "Piece" (accent-insensitive)
  if (normalizedUnit === "Piece") {
    const normalizedName = stripAccents(ingredientName).toLowerCase();
    const singularName = singularize(normalizedName);

    // Search through PIECE_WEIGHTS (sorted longest-first)
    // Try both original and singularized name to handle French plurals
    for (const [key, weight] of PIECE_WEIGHTS) {
      if (normalizedName.includes(key) || singularName.includes(key)) {
        return quantity * weight;
      }
    }

    // Fallback for unknown piece ingredients
    return quantity * DEFAULT_PIECE_WEIGHT;
  }

  // Look up unit in UNIT_TO_GRAMS (try both original and stripped)
  if (unit in UNIT_TO_GRAMS) {
    return quantity * UNIT_TO_GRAMS[unit];
  }

  // Try accent-stripped lookup against stripped keys
  for (const [key, factor] of Object.entries(UNIT_TO_GRAMS)) {
    if (stripAccents(key) === normalizedUnit) {
      return quantity * factor;
    }
  }

  // Unknown unit
  return null;
}
