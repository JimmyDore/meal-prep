import { relations } from "drizzle-orm";
import { integer, jsonb, pgEnum, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { idColumn, timestamps } from "./common";
import { recipes } from "./recipes";

export const mealTypeEnum = pgEnum("meal_type", ["midi", "soir"]);

export const mealPlans = pgTable("meal_plans", {
  ...idColumn,
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  weekStart: text().notNull(),
  overallScore: real().notNull(),
  macroSummary: jsonb().notNull(),
  ...timestamps,
});

export const mealPlanSlots = pgTable("meal_plan_slots", {
  ...idColumn,
  planId: uuid()
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  dayIndex: integer().notNull(),
  mealType: mealTypeEnum().notNull(),
  recipeId: uuid()
    .notNull()
    .references(() => recipes.id),
  macrosSnapshot: jsonb().notNull(),
  ...timestamps,
});

export const mealPlansRelations = relations(mealPlans, ({ many }) => ({
  mealPlanSlots: many(mealPlanSlots),
}));

export const mealPlanSlotsRelations = relations(mealPlanSlots, ({ one }) => ({
  plan: one(mealPlans, {
    fields: [mealPlanSlots.planId],
    references: [mealPlans.id],
  }),
  recipe: one(recipes, {
    fields: [mealPlanSlots.recipeId],
    references: [recipes.id],
  }),
}));
