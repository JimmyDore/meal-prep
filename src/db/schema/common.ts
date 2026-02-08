import { timestamp, uuid } from "drizzle-orm/pg-core";

export const idColumn = {
  id: uuid().primaryKey().defaultRandom(),
};

export const timestamps = {
  createdAt: timestamp({ precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ precision: 3, withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp({ precision: 3, withTimezone: true }),
};
