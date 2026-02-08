import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: dotenv/config loads .env before this runs
    url: process.env.DATABASE_URL!,
  },
});
