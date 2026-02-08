import { RecipeCard } from "@/components/recipe-card";
import type { RecipeWithTags } from "@/db/queries/recipes";

interface RecipeGridProps {
  recipes: RecipeWithTags[];
}

export function RecipeGrid({ recipes }: RecipeGridProps) {
  if (recipes.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">Aucune recette trouvee</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
