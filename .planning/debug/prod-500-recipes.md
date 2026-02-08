---
status: diagnosed
trigger: "Production 500 Error on /recipes after Phase 3 deployment"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED -- Missing PIPELINE_TOKEN env var crashes app at module load time via @t3-oss/env-nextjs validation
test: Traced import chain from /recipes page to env.ts validation
expecting: N/A -- root cause confirmed
next_action: Report findings and recommended fix steps

## Symptoms

expected: /recipes page renders recipe catalogue with search, filters, pagination
actual: 500 Internal Server Error on production at https://mealprep.jimmydore.fr/recipes
errors: 500 (no server logs available directly, but root cause is @t3-oss/env-nextjs throwing on missing PIPELINE_TOKEN)
reproduction: Visit https://mealprep.jimmydore.fr/recipes
started: After Phase 3 deployment via CI/CD (Phase 2 added PIPELINE_TOKEN requirement)

## Eliminated

- hypothesis: Code bug in recipes page or query layer
  evidence: Code is correct -- page.tsx, queries/recipes.ts, queries/tags.ts all have valid logic. Local tests pass. The 500 occurs before any query runs.
  timestamp: 2026-02-08T00:01:00Z

- hypothesis: Docker/networking misconfiguration
  evidence: docker-compose.prod.yml correctly wires DATABASE_URL to app container via internal network, depends_on with healthcheck. Container structure is sound.
  timestamp: 2026-02-08T00:01:00Z

## Evidence

- timestamp: 2026-02-08T00:00:10Z
  checked: src/lib/env.ts (env validation)
  found: PIPELINE_TOKEN is required (z.string().min(1)) with no default. skipValidation only activates when SKIP_ENV_VALIDATION env var is set. Production runtime does NOT set SKIP_ENV_VALIDATION.
  implication: If PIPELINE_TOKEN is missing from the container environment, createEnv() throws immediately at import time.

- timestamp: 2026-02-08T00:00:20Z
  checked: docker-compose.prod.yml (app service environment)
  found: Only DATABASE_URL and NODE_ENV are passed to the app container. PIPELINE_TOKEN is NOT listed. No env_file directive exists.
  implication: PIPELINE_TOKEN is guaranteed to be missing inside the production container.

- timestamp: 2026-02-08T00:00:30Z
  checked: Import chain from /recipes page to env validation
  found: |
    /recipes page.tsx
      -> imports getRecipes from @/db/queries/recipes
        -> imports db from @/db
          -> imports env from @/lib/env
            -> calls createEnv() which validates PIPELINE_TOKEN
    This chain means ANY page that touches the database will crash at module load time.
  implication: The 500 is not a query error or missing data -- it's a startup crash. Every DB-dependent page fails.

- timestamp: 2026-02-08T00:00:40Z
  checked: .github/workflows/deploy.yml (deploy script)
  found: Deploy script does: git pull -> docker compose build -> docker compose up -d -> docker image prune. No migration step. No env var setup.
  implication: Even if PIPELINE_TOKEN is fixed, migration 0001_crazy_husk.sql (11 new recipe columns) has likely never been applied to production DB.

- timestamp: 2026-02-08T00:00:50Z
  checked: drizzle/0001_crazy_husk.sql (Phase 2 migration)
  found: Adds 11 columns to recipes table (description, prep_time_min, total_time_min, difficulty, instructions, nutri_score, rating, rating_count, cuisine, category, jow_nutrition_per_serving) + unique constraint on ingredients.name.
  implication: If migration is not applied, Drizzle ORM queries will reference columns that don't exist -> additional SQL errors beyond the env crash.

- timestamp: 2026-02-08T00:00:55Z
  checked: .planning/STATE.md pending todos
  found: Explicit todo item #2: "Set PIPELINE_TOKEN on production VPS (deployment) - before pipeline goes live". This was never done.
  implication: Confirms PIPELINE_TOKEN was known to be missing on production, but the deployment happened before this todo was addressed.

- timestamp: 2026-02-08T00:00:58Z
  checked: src/app/ for error boundaries
  found: No error.tsx or global-error.tsx exists in the app directory.
  implication: Unhandled errors surface as raw 500 responses with no user-friendly error page.

## Resolution

root_cause: |
  PRIMARY: The production app container crashes at module load time because PIPELINE_TOKEN
  is missing from the container environment. The env validation in src/lib/env.ts
  (via @t3-oss/env-nextjs createEnv) requires PIPELINE_TOKEN as z.string().min(1)
  with no default value. Since docker-compose.prod.yml only passes DATABASE_URL and
  NODE_ENV to the app service, PIPELINE_TOKEN is undefined, causing createEnv() to throw.

  This affects ALL database-dependent pages because the import chain is:
    page -> db/queries/* -> db/index.ts -> lib/env.ts -> createEnv() THROWS

  SECONDARY: Migration 0001_crazy_husk.sql has never been applied to the production database.
  Even after fixing the env var, Drizzle ORM will generate SQL referencing 11 columns
  (description, prep_time_min, total_time_min, difficulty, instructions, nutri_score,
  rating, rating_count, cuisine, category, jow_nutrition_per_serving) and the
  ingredients.name unique constraint that don't exist yet. This would cause query-level errors.

  TERTIARY: No recipe data exists in production DB (pipeline never run against production).
  This wouldn't cause a 500 (empty results are handled), but the page would show 0 recipes.

fix: |
  Three steps required, in order:

  STEP 1 -- Add PIPELINE_TOKEN to docker-compose.prod.yml:
    In the app service environment section, add:
      PIPELINE_TOKEN: ${PIPELINE_TOKEN}
    Then set PIPELINE_TOKEN in the production .env file (or export it) on the VPS:
      echo "PIPELINE_TOKEN=$(openssl rand -hex 32)" >> /home/jimmydore/meal-prep/.env

  STEP 2 -- Apply pending migration on production:
    SSH to VPS, then:
      cd /home/jimmydore/meal-prep
      docker compose -f docker-compose.prod.yml exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB < drizzle/0001_crazy_husk.sql

  STEP 3 -- Restart the app container:
      docker compose -f docker-compose.prod.yml up -d

  OPTIONAL STEP 4 -- Run pipeline against production to populate data:
      PIPELINE_TOKEN=<token> pnpm tsx scripts/pipeline/upload.ts --url https://mealprep.jimmydore.fr

verification: |
  After all steps:
  1. docker compose -f docker-compose.prod.yml logs app -- should show no PIPELINE_TOKEN errors
  2. Visit https://mealprep.jimmydore.fr/recipes -- should return 200 (may show 0 recipes if pipeline not run)
  3. Check DB schema: docker compose -f docker-compose.prod.yml exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\d recipes" -- should show all 11 new columns

files_changed:
  - docker-compose.prod.yml (add PIPELINE_TOKEN to app environment)
  - VPS .env file (add PIPELINE_TOKEN value)
  - Production DB (apply migration 0001_crazy_husk.sql)
