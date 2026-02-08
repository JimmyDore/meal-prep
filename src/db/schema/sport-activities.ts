import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { idColumn, timestamps } from "./common";

export const activityTypeEnum = pgEnum("activity_type", [
  "course",
  "musculation",
  "natation",
  "velo",
  "yoga",
  "marche",
  "sport_collectif",
]);

export const userSportActivities = pgTable(
  "user_sport_activities",
  {
    ...idColumn,
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activityType: activityTypeEnum().notNull(),
    weeklyFrequency: integer().notNull(),
    ...timestamps,
  },
  (table) => [unique().on(table.userId, table.activityType)],
);

export const userSportActivitiesRelations = relations(userSportActivities, ({ one }) => ({
  user: one(user, {
    fields: [userSportActivities.userId],
    references: [user.id],
  }),
}));
