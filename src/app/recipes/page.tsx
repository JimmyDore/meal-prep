import type { Metadata } from "next";
import { PaginationControls } from "@/components/pagination-controls";
import { RecipeGrid } from "@/components/recipe-grid";
import { SearchBar } from "@/components/search-bar";
import { TagFilter } from "@/components/tag-filter";
import { getRecipes } from "@/db/queries/recipes";
import { getAllTags } from "@/db/queries/tags";

export const metadata: Metadata = {
  title: "Recettes | Meal Prep",
};

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tags?: string | string[] }>;
}) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q || "";
  const tagSlugs = params.tags ? (Array.isArray(params.tags) ? params.tags : [params.tags]) : [];

  const [recipesResult, allTags] = await Promise.all([
    getRecipes({ page, query, tagSlugs }),
    getAllTags(),
  ]);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 font-bold text-3xl">Recettes</h1>
      <div className="flex flex-col gap-6">
        <SearchBar defaultValue={query} />
        <TagFilter tags={allTags} activeSlugs={tagSlugs} />
        <p className="text-muted-foreground text-sm">
          {recipesResult.totalCount} recette{recipesResult.totalCount !== 1 ? "s" : ""}
        </p>
        <RecipeGrid recipes={recipesResult.recipes} />
        <PaginationControls
          currentPage={recipesResult.currentPage}
          totalPages={recipesResult.totalPages}
        />
      </div>
    </main>
  );
}
