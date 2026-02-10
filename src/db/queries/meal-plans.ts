import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealPlanSlots, mealPlans } from "@/db/schema/meal-plans";

export async function getAllRecipesWithIngredients() {
  return db.query.recipes.findMany({
    with: {
      recipeIngredients: {
        with: {
          ingredient: true,
        },
      },
    },
  });
}

export async function saveMealPlan(data: {
  userId: string;
  weekStart: string;
  overallScore: number;
  macroSummary: unknown;
  slots: Array<{
    dayIndex: number;
    mealType: "midi" | "soir";
    recipeId: string;
    macrosSnapshot: unknown;
  }>;
}) {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(mealPlans)
      .values({
        userId: data.userId,
        weekStart: data.weekStart,
        overallScore: data.overallScore,
        macroSummary: data.macroSummary,
      })
      .returning();

    if (data.slots.length > 0) {
      await tx.insert(mealPlanSlots).values(
        data.slots.map((slot) => ({
          planId: plan.id,
          dayIndex: slot.dayIndex,
          mealType: slot.mealType,
          recipeId: slot.recipeId,
          macrosSnapshot: slot.macrosSnapshot,
        })),
      );
    }

    return plan;
  });
}

export async function getUserMealPlan(userId: string) {
  return db.query.mealPlans.findFirst({
    where: eq(mealPlans.userId, userId),
    orderBy: desc(mealPlans.createdAt),
    with: {
      mealPlanSlots: {
        with: {
          recipe: true,
        },
      },
    },
  });
}
