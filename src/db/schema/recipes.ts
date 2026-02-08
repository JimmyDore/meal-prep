import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";
import { recipeIngredients } from "./ingredients";
import { recipeTags } from "./tags";

export const recipes = pgTable("recipes", {
  ...idColumn,
  jowId: text().unique().notNull(),
  title: text().notNull(),
  imageUrl: text(),
  jowUrl: text().notNull(),
  cookTimeMin: integer(),
  originalPortions: integer(),
  ...timestamps,
});

export const recipesRelations = relations(recipes, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
  recipeTags: many(recipeTags),
}));
