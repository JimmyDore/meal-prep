"use server";

import { headers } from "next/headers";
import {
  getAllRecipesWithIngredients,
  saveMealPlan as saveMealPlanDB,
} from "@/db/queries/meal-plans";
import { getFullUserProfile } from "@/db/queries/profiles";
import { auth } from "@/lib/auth";
import type { PlanResult, ScoredRecipe, WeeklyMacroTargets } from "@/lib/meal-plan";
import {
  dailyToWeekly,
  EXCLUDED_CATEGORIES,
  generateMealPlan,
  scaleDailyTargets,
} from "@/lib/meal-plan";
import type { MacroTargets } from "@/lib/nutrition";
import {
  calculateBMR,
  calculateMacroTargets,
  calculateRecipeMacros,
  calculateTDEE,
} from "@/lib/nutrition";

// ---------------------------------------------------------------------------
// generatePlan
// ---------------------------------------------------------------------------

export async function generatePlan(): Promise<
  | {
      success: true;
      plan: PlanResult;
      dailyTargets: MacroTargets;
      weeklyTargets: WeeklyMacroTargets;
    }
  | { error: string }
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return { error: "Non authentifie" };
    }

    const { profile, sportActivities } = await getFullUserProfile(session.user.id);

    if (
      !profile ||
      profile.weight === null ||
      profile.height === null ||
      profile.age === null ||
      profile.sex === null ||
      profile.activityLevel === null ||
      profile.goal === null
    ) {
      return { error: "Profil incomplet" };
    }

    const { weight, height, age, sex, activityLevel, goal } = profile;

    // Nutrition chain: BMR -> TDEE -> MacroTargets -> WeeklyTargets
    const bmr = calculateBMR({ weight, height, age, sex });

    const sportSessions = sportActivities.map((sa) => ({
      activityType: sa.activityType,
      weeklyFrequency: sa.weeklyFrequency,
    }));

    const tdee = calculateTDEE(bmr, { weight, activityLevel }, sportSessions);
    const fullDailyTargets = calculateMacroTargets(tdee, { weight, goal });

    // Scale targets to reflect only the planned meals (lunch + dinner = ~65% of daily intake)
    const dailyTargets = scaleDailyTargets(fullDailyTargets);
    const weeklyTargets = dailyToWeekly(dailyTargets);

    // Build recipe pool with computed macros, excluding non-meal categories
    const allRecipes = await getAllRecipesWithIngredients();

    const recipePool: ScoredRecipe[] = allRecipes
      .filter((recipe) => !recipe.category || !EXCLUDED_CATEGORIES.has(recipe.category))
      .map((recipe) => {
        const macros = calculateRecipeMacros(
          recipe.recipeIngredients.map((ri) => ({
            name: ri.ingredient.name,
            quantity: ri.quantity,
            unit: ri.unit,
            caloriesPer100g: ri.ingredient.caloriesPer100g,
            proteinPer100g: ri.ingredient.proteinPer100g,
            carbsPer100g: ri.ingredient.carbsPer100g,
            fatPer100g: ri.ingredient.fatPer100g,
          })),
          recipe.originalPortions ?? 1,
        );

        return {
          id: recipe.id,
          title: recipe.title,
          perServing: macros.perServing,
          confidence: macros.confidence,
          cuisine: recipe.cuisine,
          category: recipe.category,
        };
      });

    // Generate plan
    const plan = generateMealPlan({ weeklyTargets, recipePool });

    return { success: true, plan, dailyTargets, weeklyTargets };
  } catch (error) {
    console.error("Erreur lors de la generation du plan:", error);
    return { error: "Erreur lors de la generation du plan" };
  }
}

// ---------------------------------------------------------------------------
// savePlan
// ---------------------------------------------------------------------------

interface SavePlanInput {
  weekStart: string;
  overallScore: number;
  macroSummary: {
    target: WeeklyMacroTargets;
    actual: { calories: number; protein: number; carbs: number; fat: number };
  };
  slots: Array<{
    dayIndex: number;
    mealType: "midi" | "soir";
    recipeId: string;
    macrosSnapshot: { calories: number; protein: number; carbs: number; fat: number };
  }>;
}

export async function savePlan(
  planData: SavePlanInput,
): Promise<{ success: true; planId: string } | { error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return { error: "Non authentifie" };
    }

    const result = await saveMealPlanDB({
      userId: session.user.id,
      weekStart: planData.weekStart,
      overallScore: planData.overallScore,
      macroSummary: planData.macroSummary,
      slots: planData.slots.map((slot) => ({
        dayIndex: slot.dayIndex,
        mealType: slot.mealType,
        recipeId: slot.recipeId,
        macrosSnapshot: slot.macrosSnapshot,
      })),
    });

    return { success: true, planId: result.id };
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du plan:", error);
    return { error: "Erreur lors de la sauvegarde du plan" };
  }
}
