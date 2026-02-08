# CLAUDE.md — Project Memory for Claude Code

## Database

**Dev DB** (docker-compose service `db`):
```bash
docker compose exec -T db psql -U mealprep -d mealprep
# Connection: postgresql://mealprep:mealprep_dev@localhost:5433/mealprep
```

**Test DB** (docker-compose service `db-test`, tmpfs — data is ephemeral):
```bash
docker compose exec -T db-test psql -U mealprep_test -d mealprep_test
# Connection: postgresql://mealprep_test:mealprep_test@localhost:5434/mealprep_test
```

> **Never use `postgres` as the user** — it does not exist in these containers. Dev user is `mealprep`, test user is `mealprep_test`.

## Common Commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Start prod | `pnpm start` |
| Lint (CI check) | `pnpm lint` |
| Format | `pnpm format` |
| Check + autofix | `pnpm check` |
| Tests | `pnpm test` |
| Generate migrations | `pnpm db:generate` |
| Run migrations | `pnpm db:migrate` |
| Push schema to DB | `pnpm db:push` |
| Drizzle Studio | `pnpm db:studio` |
| Seed DB | `pnpm db:seed` |
| Start containers | `docker compose up -d` |
| Stop containers | `docker compose down` |

### Data Pipeline

```bash
# Scrape recipes from Jow.fr
pnpm tsx scripts/pipeline/scrape.ts [--dry-run] [--limit N]

# Enrich with macros via Claude CLI
pnpm tsx scripts/pipeline/enrich.ts [--limit N] [--no-delay]

# Upload to DB via API
pnpm tsx scripts/pipeline/upload.ts [--limit N]
```

Pipeline flow: `data/scraped/` → enrich → `data/enriched/` → upload API → Postgres DB.
All three stages are resumable (skip already-processed items) and idempotent.

## Project Conventions

### Formatting (Biome — not ESLint/Prettier)
- Double quotes, semicolons always
- 2-space indent, 100-char line width
- Run `pnpm check` to lint + format in one pass

### Drizzle ORM
- Config: `drizzle.config.ts`, schema: `src/db/schema/`
- DB columns: `snake_case` (via `casing: "snake_case"`)
- TypeScript fields: `camelCase`
- Migrations output: `./drizzle/`
- **After ANY schema change in `src/db/schema/`**, run `pnpm db:generate` to create a migration. Production only applies migrations from `./drizzle/` — schema changes without a migration will break prod.

### TypeScript
- Path alias: `@/*` → `./src/*`
- Strict mode, target ES2017

### API Authentication
- Pipeline/upload routes use Bearer token auth
- Token from `PIPELINE_TOKEN` env var
- Example: `Authorization: Bearer $PIPELINE_TOKEN`

### Tests
- Vitest with jsdom environment, globals enabled
- Pattern: `src/**/*.test.{ts,tsx}` + `scripts/**/*.test.ts`
- Setup file: `src/test/setup.ts` (includes `@testing-library/jest-dom`)
- **Every new feature/module MUST include unit tests** — no code ships without tests
- Pure functions: test directly with boundary values and edge cases
- External calls (Playwright, Claude CLI, fetch, filesystem): mock with `vi.mock()`
- DB queries: integration tests with test DB (`docker compose up -d db-test`)
- React components: test with `@testing-library/react`, mock `next/navigation` and `authClient`
- CI runs unit tests only (excludes DB integration tests via `--exclude 'src/db/**'`)

## Architecture

- **Framework**: Next.js 16 App Router, standalone output (Docker-ready)
- **Database**: PostgreSQL 16 (Alpine), managed via Drizzle ORM
- **Adapter pattern for recipe sources**: `RecipeSource` interface in `src/sources/types.ts`
  - Each source implements `fetchRecipes()` and `fetchRecipeById(id)`
  - Returns `RawRecipe` objects (sourceId, sourceName, title, ingredients, etc.)
- **Data pipeline**: `scripts/pipeline/` — scrape → enrich → upload
  - Zod validation on nutrition data (0–100g macros, 0–900 calories)
  - Upload API upserts by `jowId` (no duplicates)

### Deployment
- Production secrets are managed via **GitHub Secrets** (not `.env` on VPS)
- Deploy workflow: `.github/workflows/deploy.yml` — CI checks, SSH deploy, smoke test
- New env vars must be added in 3 places: GitHub Secrets, `docker-compose.prod.yml` environment, and `deploy.yml` (env + envs)
- `NEXT_PUBLIC_*` vars are **baked at build time** — they must be passed as Docker build args in `Dockerfile` (ARG + ENV), not just runtime env vars in compose
- Pre-commit hook: `biome check --write` via lint-staged on `*.{ts,tsx}`
- Pre-push hook: `tsc --noEmit`

## Learnings

<!--
  INSTRUCTION FOR CLAUDE: When you discover a new project-specific fact that would
  prevent future mistakes (wrong commands, gotchas, env quirks, schema constraints),
  append it to this section. Keep entries concise (one line each). Date each entry.
  Format: - YYYY-MM-DD: <learning>
-->
- 2026-02-08: Schema changes in `src/db/schema/` require `pnpm db:generate` — prod only runs SQL migrations from `./drizzle/`, not schema push
- 2026-02-08: `NEXT_PUBLIC_*` env vars must be Docker build args (not just runtime) — they get inlined by `next build`
- 2026-02-08: All prod env vars flow through GitHub Secrets → deploy.yml → SSH → docker-compose.prod.yml
