import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  recipes,
  ingredients,
  recipeIngredients,
  tags,
  recipeTags,
} from "@/db/schema";
import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// Zod schemas for upload payload
// ---------------------------------------------------------------------------

const ingredientUploadSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  originalText: z.string().nullable(),
  proteinPer100g: z.number().min(0).max(100).nullable(),
  carbsPer100g: z.number().min(0).max(100).nullable(),
  fatPer100g: z.number().min(0).max(100).nullable(),
  caloriesPer100g: z.number().min(0).max(900).nullable(),
  confidence: z.enum(["high", "medium", "low"]).nullable(),
});

const recipeUploadSchema = z.object({
  jowId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  jowUrl: z.string().url(),
  cookTimeMin: z.number().int().nullable().optional(),
  prepTimeMin: z.number().int().nullable().optional(),
  totalTimeMin: z.number().int().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  instructions: z.array(z.string()).nullable().optional(),
  nutriScore: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  ratingCount: z.number().int().nullable().optional(),
  cuisine: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  originalPortions: z.number().int().nullable().optional(),
  jowNutritionPerServing: z.record(z.number()).nullable().optional(),
  ingredients: z.array(ingredientUploadSchema).min(1),
  tags: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// POST /api/recipes/upload
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // --- Bearer token auth ---
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);
  if (token !== env.PIPELINE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse & validate body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Validation failed", details: { message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const result = recipeUploadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const data = result.data;

  // --- Database upsert within transaction ---
  try {
    const recipeId = await db.transaction(async (tx) => {
      // a) Upsert recipe
      const [recipe] = await tx
        .insert(recipes)
        .values({
          jowId: data.jowId,
          title: data.title,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          jowUrl: data.jowUrl,
          cookTimeMin: data.cookTimeMin ?? null,
          prepTimeMin: data.prepTimeMin ?? null,
          totalTimeMin: data.totalTimeMin ?? null,
          difficulty: data.difficulty ?? null,
          instructions: data.instructions ?? null,
          nutriScore: data.nutriScore ?? null,
          rating: data.rating ?? null,
          ratingCount: data.ratingCount ?? null,
          cuisine: data.cuisine ?? null,
          category: data.category ?? null,
          originalPortions: data.originalPortions ?? null,
          jowNutritionPerServing: data.jowNutritionPerServing ?? null,
        })
        .onConflictDoUpdate({
          target: recipes.jowId,
          set: {
            title: data.title,
            description: data.description ?? null,
            imageUrl: data.imageUrl ?? null,
            cookTimeMin: data.cookTimeMin ?? null,
            prepTimeMin: data.prepTimeMin ?? null,
            totalTimeMin: data.totalTimeMin ?? null,
            difficulty: data.difficulty ?? null,
            instructions: data.instructions ?? null,
            nutriScore: data.nutriScore ?? null,
            rating: data.rating ?? null,
            ratingCount: data.ratingCount ?? null,
            cuisine: data.cuisine ?? null,
            category: data.category ?? null,
            originalPortions: data.originalPortions ?? null,
            jowNutritionPerServing: data.jowNutritionPerServing ?? null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: recipes.id });

      // b) Upsert ingredients & link to recipe
      for (const ing of data.ingredients) {
        const [ingredient] = await tx
          .insert(ingredients)
          .values({
            name: ing.name,
            proteinPer100g: ing.proteinPer100g,
            carbsPer100g: ing.carbsPer100g,
            fatPer100g: ing.fatPer100g,
            caloriesPer100g: ing.caloriesPer100g,
          })
          .onConflictDoUpdate({
            target: ingredients.name,
            set: {
              proteinPer100g: ing.proteinPer100g,
              carbsPer100g: ing.carbsPer100g,
              fatPer100g: ing.fatPer100g,
              caloriesPer100g: ing.caloriesPer100g,
              updatedAt: new Date(),
            },
          })
          .returning({ id: ingredients.id });

        // c) Link recipe-ingredient
        await tx
          .insert(recipeIngredients)
          .values({
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: ing.quantity,
            unit: ing.unit,
            originalText: ing.originalText,
          })
          .onConflictDoUpdate({
            target: [recipeIngredients.recipeId, recipeIngredients.ingredientId],
            set: {
              quantity: ing.quantity,
              unit: ing.unit,
              originalText: ing.originalText,
              updatedAt: new Date(),
            },
          });
      }

      // d) Upsert tags & link to recipe
      for (const tagName of data.tags) {
        const [tag] = await tx
          .insert(tags)
          .values({ name: tagName, slug: slugify(tagName) })
          .onConflictDoUpdate({
            target: tags.slug,
            set: { name: tagName, updatedAt: new Date() },
          })
          .returning({ id: tags.id });

        await tx
          .insert(recipeTags)
          .values({ recipeId: recipe.id, tagId: tag.id })
          .onConflictDoUpdate({
            target: [recipeTags.recipeId, recipeTags.tagId],
            set: { updatedAt: new Date() },
          });
      }

      return recipe.id;
    });

    return NextResponse.json({ id: recipeId }, { status: 201 });
  } catch (error) {
    console.error("Recipe upload failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
