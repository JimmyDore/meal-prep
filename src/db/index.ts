import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL);

function createDb() {
  return drizzle(client, {
    schema,
    casing: "snake_case",
  });
}

type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as {
  db: Database | undefined;
};

export const db: Database = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
