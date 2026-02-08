import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, real, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { idColumn, timestamps } from "./common";

export const sexEnum = pgEnum("sex", ["homme", "femme"]);

export const activityLevelEnum = pgEnum("activity_level", [
  "sedentaire",
  "legerement_actif",
  "moderement_actif",
  "actif",
  "tres_actif",
]);

export const goalEnum = pgEnum("goal", ["seche", "maintien", "prise_de_masse", "recomposition"]);

export const userProfiles = pgTable("user_profiles", {
  ...idColumn,
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  weight: real(),
  height: real(),
  age: integer(),
  sex: sexEnum(),
  activityLevel: activityLevelEnum(),
  goal: goalEnum(),
  householdSize: integer().default(1),
  mealsPerDay: integer().default(2),
  ...timestamps,
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(user, {
    fields: [userProfiles.userId],
    references: [user.id],
  }),
}));
