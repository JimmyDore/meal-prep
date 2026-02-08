import { ArrowLeft, ChefHat, Clock, ExternalLink, Flame, Timer, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MacroBadge } from "@/components/macro-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getRecipeById } from "@/db/queries/recipes";

interface NutritionPerServing {
  fat: number;
  carbs: number;
  fiber: number;
  protein: number;
  calories: number;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipeById(id);

  if (!recipe) {
    return { title: "Recette introuvable" };
  }

  return { title: recipe.title };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const recipe = await getRecipeById(id);

  if (!recipe) {
    notFound();
  }

  const nutrition = recipe.jowNutritionPerServing as NutritionPerServing | null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header section */}
      <div className="mb-6">
        <Link
          href="/recipes"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux recettes
        </Link>
        <h1 className="text-3xl font-bold">{recipe.title}</h1>
        {recipe.recipeTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.recipeTags.map((rt) => (
              <Badge key={rt.tag.id} variant="secondary">
                {rt.tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Image + Meta section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left: Image */}
        {recipe.imageUrl ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-lg">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              width={500}
              height={500}
              className="size-full rounded-lg object-cover"
              priority
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
            <span className="text-muted-foreground">Pas d&apos;image</span>
          </div>
        )}

        {/* Right: Meta info */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">Informations</h2>
            <div className="flex flex-col gap-3">
              {recipe.prepTimeMin != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="size-4 text-muted-foreground" />
                  <span>
                    Preparation : <strong>{recipe.prepTimeMin} min</strong>
                  </span>
                </div>
              )}
              {recipe.cookTimeMin != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Flame className="size-4 text-muted-foreground" />
                  <span>
                    Cuisson : <strong>{recipe.cookTimeMin} min</strong>
                  </span>
                </div>
              )}
              {recipe.totalTimeMin != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>
                    Temps total : <strong>{recipe.totalTimeMin} min</strong>
                  </span>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex items-center gap-2 text-sm">
                  <ChefHat className="size-4 text-muted-foreground" />
                  <span>
                    Difficulte : <strong>{recipe.difficulty}</strong>
                  </span>
                </div>
              )}
              {recipe.originalPortions != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-muted-foreground" />
                  <span>
                    Portions : <strong>{recipe.originalPortions}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Jow link */}
          <Button variant="outline" asChild>
            <a href={recipe.jowUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Voir sur Jow
            </a>
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Macros per serving section */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Macros par portion</h2>
        {nutrition ? (
          <div className="flex flex-wrap gap-2">
            <MacroBadge label="Cal" value={nutrition.calories} unit="kcal" color="green" />
            <MacroBadge label="P" value={nutrition.protein} unit="g" color="red" />
            <MacroBadge label="G" value={nutrition.carbs} unit="g" color="blue" />
            <MacroBadge label="L" value={nutrition.fat} unit="g" color="yellow" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Macros non disponibles</p>
        )}
      </section>

      <Separator className="my-6" />

      {/* Ingredients section */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Ingredients ({recipe.recipeIngredients.length})
        </h2>
        <ul className="divide-y">
          {recipe.recipeIngredients.map((ri) => (
            <li key={ri.id} className="py-3">
              <div className="text-sm">
                {ri.quantity != null ? (
                  <span>
                    <strong>
                      {ri.quantity}
                      {ri.unit ? ` ${ri.unit}` : ""}
                    </strong>{" "}
                    {ri.ingredient.name}
                  </span>
                ) : (
                  <span>{ri.ingredient.name}</span>
                )}
              </div>
              {(ri.ingredient.caloriesPer100g != null ||
                ri.ingredient.proteinPer100g != null ||
                ri.ingredient.carbsPer100g != null ||
                ri.ingredient.fatPer100g != null) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pour 100g :{" "}
                  {[
                    ri.ingredient.caloriesPer100g != null &&
                      `${Math.round(ri.ingredient.caloriesPer100g)} kcal`,
                    ri.ingredient.proteinPer100g != null &&
                      `${Math.round(ri.ingredient.proteinPer100g)}g prot`,
                    ri.ingredient.carbsPer100g != null &&
                      `${Math.round(ri.ingredient.carbsPer100g)}g gluc`,
                    ri.ingredient.fatPer100g != null &&
                      `${Math.round(ri.ingredient.fatPer100g)}g lip`,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Description section */}
      {recipe.description && (
        <>
          <Separator className="my-6" />
          <section>
            <h2 className="mb-3 text-xl font-semibold">Description</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{recipe.description}</p>
          </section>
        </>
      )}
    </div>
  );
}
