// Requires: docker compose up -d db-test
import { sql } from "drizzle-orm";
import { cleanupTestDb, closeTestDb, setupTestDb, testDb } from "@/test/db-setup";

describe("Database Connection", () => {
  beforeAll(() => {
    setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("should connect and execute SELECT NOW()", async () => {
    const result = await testDb.execute<{ now: Date }>(sql`SELECT NOW()`);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].now).toBeDefined();
  });

  it("should have the recipes table", async () => {
    const tables = await testDb.execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes'`,
    );
    expect(tables.length).toBe(1);
    expect(tables[0].tablename).toBe("recipes");
  });

  it("should have all expected tables", async () => {
    const tables = await testDb.execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tableNames = tables.map((t) => t.tablename);
    expect(tableNames).toContain("recipes");
    expect(tableNames).toContain("ingredients");
    expect(tableNames).toContain("recipe_ingredients");
    expect(tableNames).toContain("tags");
    expect(tableNames).toContain("recipe_tags");
  });

  it("should truncate tables via cleanupTestDb", async () => {
    await cleanupTestDb();
    const result = await testDb.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text AS count FROM recipes`,
    );
    expect(result[0].count).toBe("0");
  });
});
