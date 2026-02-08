export interface RawIngredient {
  name: string;
  quantity?: number;
  unit?: string;
}

export interface RawRecipe {
  sourceId: string; // Unique ID from the source (e.g., Jow recipe slug)
  sourceName: string; // "jow", "marmiton", etc.
  sourceUrl: string; // Original URL on source site
  title: string;
  imageUrl?: string;
  cookTimeMin?: number;
  originalPortions?: number;
  ingredients: RawIngredient[];
}

export interface RecipeSource {
  readonly name: string;
  fetchRecipes(): Promise<RawRecipe[]>;
  fetchRecipeById(id: string): Promise<RawRecipe | null>;
}
