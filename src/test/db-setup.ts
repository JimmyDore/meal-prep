import { execSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const TEST_DATABASE_URL =
  process.env.DATABASE_TEST_URL ||
  "postgresql://mealprep_test:mealprep_test@localhost:5434/mealprep_test";

/**
 * Raw postgres.js client for the test database (port 5434).
 * Completely isolated from the dev database (port 5433).
 */
export const testClient = postgres(TEST_DATABASE_URL);

/**
 * Drizzle ORM instance bound to the test database with schema and snake_case casing.
 */
export const testDb = drizzle(testClient, {
  schema,
  casing: "snake_case",
});

/**
 * Push the current Drizzle schema to the test database.
 * Uses `drizzle-kit push` CLI with the test database URL.
 * Call this in beforeAll of integration tests that need tables.
 */
export function setupTestDb(): void {
  execSync("pnpm drizzle-kit push --force", {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

/**
 * Truncate all tables in the test database (cascade).
 * Use in beforeEach or afterEach to ensure test isolation.
 */
export async function cleanupTestDb(): Promise<void> {
  const tables = await testDb.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );

  for (const { tablename } of tables) {
    await testDb.execute(sql.raw(`TRUNCATE TABLE "${tablename}" CASCADE`));
  }
}

/**
 * Close the postgres.js connection to the test database.
 * Call in afterAll to prevent open handles.
 */
export async function closeTestDb(): Promise<void> {
  await testClient.end();
}
