// Requires: docker compose up -d db-test
import { cleanupTestDb, closeTestDb, setupTestDb, testDb } from "@/test/db-setup";

vi.mock("@/db", () => ({ db: testDb }));

import { ingredients, recipeIngredients, recipes, recipeTags, tags } from "@/db/schema";
import { getRecipeById, getRecipes } from "@/db/queries/recipes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertRecipe(data: {
  jowId: string;
  title: string;
  jowUrl?: string;
}) {
  const [row] = await testDb
    .insert(recipes)
    .values({
      jowId: data.jowId,
      title: data.title,
      jowUrl: data.jowUrl ?? `https://jow.fr/recipes/${data.jowId}`,
    })
    .returning();
  return row;
}

async function insertIngredient(name: string) {
  const [row] = await testDb
    .insert(ingredients)
    .values({
      name,
      proteinPer100g: 10,
      carbsPer100g: 5,
      fatPer100g: 3,
      caloriesPer100g: 100,
    })
    .returning();
  return row;
}

async function insertTag(name: string, slug: string) {
  const [row] = await testDb
    .insert(tags)
    .values({ name, slug })
    .returning();
  return row;
}

async function linkRecipeIngredient(recipeId: string, ingredientId: string) {
  await testDb.insert(recipeIngredients).values({
    recipeId,
    ingredientId,
    quantity: 100,
    unit: "g",
    originalText: "100g",
  });
}

async function linkRecipeTag(recipeId: string, tagId: string) {
  await testDb.insert(recipeTags).values({ recipeId, tagId });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DB Queries: recipes", () => {
  beforeAll(() => {
    setupTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // --- getRecipes ---

  describe("getRecipes", () => {
    it("returns empty array and totalCount=0 for empty database", async () => {
      const result = await getRecipes();

      expect(result.recipes).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.currentPage).toBe(1);
    });

    it("returns all recipes with correct pagination metadata", async () => {
      await insertRecipe({ jowId: "r1", title: "Poulet Basquaise" });
      await insertRecipe({ jowId: "r2", title: "Ratatouille" });
      await insertRecipe({ jowId: "r3", title: "Salade Nicoise" });

      const result = await getRecipes();

      expect(result.recipes).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it("paginates correctly with custom pageSize", async () => {
      await insertRecipe({ jowId: "r1", title: "Aligot" });
      await insertRecipe({ jowId: "r2", title: "Boeuf Bourguignon" });
      await insertRecipe({ jowId: "r3", title: "Couscous" });

      const page1 = await getRecipes({ page: 1, pageSize: 2 });

      expect(page1.recipes).toHaveLength(2);
      expect(page1.totalCount).toBe(3);
      expect(page1.totalPages).toBe(2);
      expect(page1.currentPage).toBe(1);
      // Ordered by title ASC
      expect(page1.recipes[0].title).toBe("Aligot");
      expect(page1.recipes[1].title).toBe("Boeuf Bourguignon");

      const page2 = await getRecipes({ page: 2, pageSize: 2 });

      expect(page2.recipes).toHaveLength(1);
      expect(page2.recipes[0].title).toBe("Couscous");
      expect(page2.currentPage).toBe(2);
    });

    it("filters recipes by search query (case-insensitive)", async () => {
      await insertRecipe({ jowId: "r1", title: "Poulet Basquaise" });
      await insertRecipe({ jowId: "r2", title: "Ratatouille" });
      await insertRecipe({ jowId: "r3", title: "Poulet Roti" });

      const result = await getRecipes({ query: "poulet" });

      expect(result.recipes).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.recipes.every((r) => r.title.toLowerCase().includes("poulet"))).toBe(true);
    });

    it("returns empty results for non-matching search query", async () => {
      await insertRecipe({ jowId: "r1", title: "Poulet Basquaise" });

      const result = await getRecipes({ query: "pizza" });

      expect(result.recipes).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("filters recipes by tag slugs (AND logic)", async () => {
      const r1 = await insertRecipe({ jowId: "r1", title: "Quick Chicken" });
      const r2 = await insertRecipe({ jowId: "r2", title: "Slow Beef" });
      const r3 = await insertRecipe({ jowId: "r3", title: "Quick Veggie" });

      const tagRapide = await insertTag("Rapide", "rapide");
      const tagFacile = await insertTag("Facile", "facile");

      // r1 has both tags
      await linkRecipeTag(r1.id, tagRapide.id);
      await linkRecipeTag(r1.id, tagFacile.id);
      // r2 has no tags
      // r3 has only "rapide"
      await linkRecipeTag(r3.id, tagRapide.id);

      // Single tag filter
      const rapideOnly = await getRecipes({ tagSlugs: ["rapide"] });
      expect(rapideOnly.recipes).toHaveLength(2);
      expect(rapideOnly.totalCount).toBe(2);

      // AND filter: both "rapide" AND "facile"
      const both = await getRecipes({ tagSlugs: ["rapide", "facile"] });
      expect(both.recipes).toHaveLength(1);
      expect(both.recipes[0].title).toBe("Quick Chicken");
    });

    it("attaches tags to returned recipes", async () => {
      const r1 = await insertRecipe({ jowId: "r1", title: "Tagged Recipe" });
      const tag = await insertTag("Rapide", "rapide");
      await linkRecipeTag(r1.id, tag.id);

      const result = await getRecipes();

      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].tags).toHaveLength(1);
      expect(result.recipes[0].tags[0].slug).toBe("rapide");
      expect(result.recipes[0].tags[0].name).toBe("Rapide");
    });
  });

  // --- getRecipeById ---

  describe("getRecipeById", () => {
    it("returns recipe with ingredients and tags for valid UUID", async () => {
      const recipe = await insertRecipe({ jowId: "r1", title: "Poulet Roti" });
      const ing = await insertIngredient("Poulet entier");
      await linkRecipeIngredient(recipe.id, ing.id);
      const tag = await insertTag("Rapide", "rapide");
      await linkRecipeTag(recipe.id, tag.id);

      const result = await getRecipeById(recipe.id);

      expect(result).toBeDefined();
      expect(result!.title).toBe("Poulet Roti");
      expect(result!.recipeIngredients).toHaveLength(1);
      expect(result!.recipeIngredients[0].ingredient.name).toBe("Poulet entier");
      expect(result!.recipeTags).toHaveLength(1);
      expect(result!.recipeTags[0].tag.name).toBe("Rapide");
    });

    it("returns undefined for non-existent UUID", async () => {
      const result = await getRecipeById("00000000-0000-0000-0000-000000000000");

      expect(result).toBeUndefined();
    });

    it("returns undefined for invalid UUID string (no crash)", async () => {
      const result = await getRecipeById("not-a-uuid");

      expect(result).toBeUndefined();
    });

    it("returns undefined for empty string", async () => {
      const result = await getRecipeById("");

      expect(result).toBeUndefined();
    });
  });
});
