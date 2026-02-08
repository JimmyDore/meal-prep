import { relations } from "drizzle-orm";
import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";
import { recipes } from "./recipes";

export const tags = pgTable("tags", {
  ...idColumn,
  name: text().unique().notNull(),
  slug: text().unique().notNull(),
  ...timestamps,
});

export const recipeTags = pgTable(
  "recipe_tags",
  {
    ...idColumn,
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id),
    tagId: uuid()
      .notNull()
      .references(() => tags.id),
    ...timestamps,
  },
  (t) => [unique().on(t.recipeId, t.tagId)],
);

export const tagsRelations = relations(tags, ({ many }) => ({
  recipeTags: many(recipeTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
}));
