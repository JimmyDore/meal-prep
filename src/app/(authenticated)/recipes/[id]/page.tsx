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
import { calculateRecipeMacros } from "@/lib/nutrition";

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

  // Compute macros from ingredient data
  const ingredientInputs = recipe.recipeIngredients.map((ri) => ({
    name: ri.ingredient.name,
    quantity: ri.quantity,
    unit: ri.unit,
    caloriesPer100g: ri.ingredient.caloriesPer100g,
    proteinPer100g: ri.ingredient.proteinPer100g,
    carbsPer100g: ri.ingredient.carbsPer100g,
    fatPer100g: ri.ingredient.fatPer100g,
  }));
  const computedMacros = calculateRecipeMacros(ingredientInputs, recipe.originalPortions ?? 1);

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

      {/* Computed macros per serving section */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Macros par portion (calcul)</h2>
          <ConfidenceBadge
            confidence={computedMacros.confidence}
            convertedCount={computedMacros.convertedCount}
            totalCount={computedMacros.totalCount}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <MacroBadge
            label="Cal"
            value={computedMacros.perServing.calories}
            unit="kcal"
            color="green"
          />
          <MacroBadge label="P" value={computedMacros.perServing.protein} unit="g" color="red" />
          <MacroBadge label="G" value={computedMacros.perServing.carbs} unit="g" color="blue" />
          <MacroBadge label="L" value={computedMacros.perServing.fat} unit="g" color="yellow" />
        </div>
        {computedMacros.missingIngredients.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ingredients non convertis : {computedMacros.missingIngredients.join(", ")}
          </p>
        )}
      </section>

      {/* Jow original macros (if available) */}
      {nutrition && (
        <>
          <Separator className="my-6" />
          <section>
            <h2 className="mb-3 text-xl font-semibold">Macros Jow (original)</h2>
            <div className="flex flex-wrap gap-2">
              <MacroBadge label="Cal" value={nutrition.calories} unit="kcal" color="green" />
              <MacroBadge label="P" value={nutrition.protein} unit="g" color="red" />
              <MacroBadge label="G" value={nutrition.carbs} unit="g" color="blue" />
              <MacroBadge label="L" value={nutrition.fat} unit="g" color="yellow" />
            </div>
          </section>
        </>
      )}

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

const CONFIDENCE_CONFIG = {
  high: { label: "Donnees fiables", className: "bg-green-100 text-green-700" },
  medium: { label: "Valeurs approchees", className: "bg-yellow-100 text-yellow-700" },
  low: { label: "Estimation partielle", className: "bg-orange-100 text-orange-700" },
} as const;

function ConfidenceBadge({
  confidence,
  convertedCount,
  totalCount,
}: {
  confidence: "high" | "medium" | "low";
  convertedCount: number;
  totalCount: number;
}) {
  const config = CONFIDENCE_CONFIG[confidence];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
      title={
        confidence === "low" ? `${convertedCount}/${totalCount} ingredients convertis` : undefined
      }
    >
      {config.label}
    </span>
  );
}
