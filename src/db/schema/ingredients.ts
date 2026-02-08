import { relations } from "drizzle-orm";
import { pgTable, real, text, unique, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";
import { recipes } from "./recipes";

export const ingredients = pgTable("ingredients", {
  ...idColumn,
  name: text().notNull(),
  caloriesPer100g: real(),
  proteinPer100g: real(),
  carbsPer100g: real(),
  fatPer100g: real(),
  ...timestamps,
});

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    ...idColumn,
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id),
    ingredientId: uuid()
      .notNull()
      .references(() => ingredients.id),
    quantity: real(),
    unit: text(),
    originalText: text(),
    ...timestamps,
  },
  (t) => [unique().on(t.recipeId, t.ingredientId)],
);

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));
