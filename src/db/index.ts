import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

const client = postgres(env.DATABASE_URL);

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle>;
};

export const db =
  globalForDb.db ||
  drizzle(client, {
    casing: "snake_case",
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
