import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { idColumn, timestamps } from "./common";

export const dietaryPreferenceEnum = pgEnum("dietary_preference", [
  "vegetarien",
  "vegan",
  "sans_gluten",
  "sans_lactose",
  "sans_porc",
  "halal",
  "sans_fruits_de_mer",
]);

export const userDietaryPreferences = pgTable(
  "user_dietary_preferences",
  {
    ...idColumn,
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    preference: dietaryPreferenceEnum().notNull(),
    ...timestamps,
  },
  (table) => [unique().on(table.userId, table.preference)],
);

export const userDietaryPreferencesRelations = relations(userDietaryPreferences, ({ one }) => ({
  user: one(user, {
    fields: [userDietaryPreferences.userId],
    references: [user.id],
  }),
}));
