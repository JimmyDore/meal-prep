import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, real, text } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";
import { recipeIngredients } from "./ingredients";
import { mealPlanSlots } from "./meal-plans";
import { recipeTags } from "./tags";

export const recipes = pgTable("recipes", {
  ...idColumn,
  jowId: text().unique().notNull(),
  title: text().notNull(),
  description: text(),
  imageUrl: text(),
  jowUrl: text().notNull(),
  cookTimeMin: integer(),
  prepTimeMin: integer(),
  totalTimeMin: integer(),
  difficulty: text(),
  instructions: jsonb(),
  nutriScore: text(),
  rating: real(),
  ratingCount: integer(),
  cuisine: text(),
  category: text(),
  originalPortions: integer(),
  jowNutritionPerServing: jsonb(),
  ...timestamps,
});

export const recipesRelations = relations(recipes, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
  recipeTags: many(recipeTags),
  mealPlanSlots: many(mealPlanSlots),
}));
