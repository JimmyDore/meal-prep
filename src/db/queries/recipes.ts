import { and, asc, count, eq, exists, ilike, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { recipeTags, tags } from "@/db/schema/tags";

export type RecipeWithTags = typeof recipes.$inferSelect & {
  tags: Array<{ id: string; name: string; slug: string }>;
};

function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function getRecipes({
  page = 1,
  query,
  tagSlugs,
  pageSize = 12,
}: {
  page?: number;
  query?: string;
  tagSlugs?: string[];
  pageSize?: number;
} = {}) {
  const conditions: SQL[] = [];

  if (query?.trim()) {
    conditions.push(ilike(recipes.title, `%${escapeIlike(query.trim())}%`));
  }

  if (tagSlugs && tagSlugs.length > 0) {
    for (const slug of tagSlugs) {
      conditions.push(
        exists(
          db
            .select({ one: recipeTags.id })
            .from(recipeTags)
            .innerJoin(tags, eq(recipeTags.tagId, tags.id))
            .where(and(eq(recipeTags.recipeId, recipes.id), eq(tags.slug, slug))),
        ),
      );
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [recipeRows, countResult] = await Promise.all([
    db
      .select()
      .from(recipes)
      .where(whereClause)
      .orderBy(asc(recipes.title))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: count() }).from(recipes).where(whereClause),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  // Batch-fetch tags for all returned recipes
  let recipesWithTags: RecipeWithTags[];

  if (recipeRows.length === 0) {
    recipesWithTags = [];
  } else {
    const recipeIds = recipeRows.map((r) => r.id);
    const tagRows = await db
      .select({
        recipeId: recipeTags.recipeId,
        tagId: tags.id,
        tagName: tags.name,
        tagSlug: tags.slug,
      })
      .from(recipeTags)
      .innerJoin(tags, eq(recipeTags.tagId, tags.id))
      .where(inArray(recipeTags.recipeId, recipeIds));

    // Build a map: recipeId -> tags
    const tagsByRecipeId = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    for (const row of tagRows) {
      const existing = tagsByRecipeId.get(row.recipeId) ?? [];
      existing.push({ id: row.tagId, name: row.tagName, slug: row.tagSlug });
      tagsByRecipeId.set(row.recipeId, existing);
    }

    recipesWithTags = recipeRows.map((recipe) => ({
      ...recipe,
      tags: tagsByRecipeId.get(recipe.id) ?? [],
    }));
  }

  return {
    recipes: recipesWithTags,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
    pageSize,
  };
}

export async function getRecipeById(id: string) {
  return db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: {
      recipeIngredients: {
        with: {
          ingredient: true,
        },
      },
      recipeTags: {
        with: {
          tag: true,
        },
      },
    },
  });
}
