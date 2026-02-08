# Phase 1: Project Foundation + Database + Deployment - Research

**Researched:** 2026-02-08
**Domain:** Next.js full-stack scaffolding, PostgreSQL schema with Drizzle ORM, Docker containerization, VPS deployment with Nginx/SSL, CI/CD, test infrastructure
**Confidence:** HIGH

## Summary

This phase establishes the complete technical foundation: a Next.js App Router project with Drizzle ORM connected to PostgreSQL, containerized with Docker Compose for both dev and production, deployed to the user's existing VPS behind their existing Nginx + Certbot setup, with automated deployment via GitHub Actions and a test infrastructure using Vitest. A Hello World frontend that queries the DB proves the full stack works end-to-end.

The research covers all locked decisions (pnpm, Next.js App Router, Drizzle ORM, Biome, Vitest, Docker Compose, Nginx, GitHub Actions SSH deploy) and makes prescriptive recommendations for Claude's discretion areas (Node.js version, migration strategy, Docker networking, GitHub Actions workflow, Vitest configuration, Biome rules). The adapter pattern for recipe sources is a straightforward TypeScript interface pattern.

Key finding: the prior domain research (STACK.md) recommended Caddy as reverse proxy, but the user has explicitly decided on Nginx + Certbot (already running on VPS for other sites). The production Docker Compose must NOT include Nginx -- Nginx runs on the host, not in Docker. The Docker Compose only contains the Next.js app and PostgreSQL.

**Primary recommendation:** Use `drizzle-kit generate` + `drizzle-kit migrate` for versioned migrations (not `push`), the `postgres` driver (postgres.js by porsager) with `drizzle-orm/postgres-js`, Drizzle's built-in `casing: 'snake_case'` option to auto-map camelCase TypeScript to snake_case Postgres, and a 3-stage Docker multi-stage build with Next.js standalone output for production images under 200MB.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Full-stack React framework with App Router | Latest stable LTS. Server Components, Server Actions, standalone Docker output. Verified via npm registry 2026-02-08. |
| React | 19.x | UI library (required by Next.js 16) | Peer dependency of Next.js 16. Server Components reduce client bundle. |
| TypeScript | 5.9.x | Type safety | Ships with Next.js 16 scaffolding. Non-negotiable for multi-component system. |
| Node.js | 22.x LTS | Runtime | Active LTS until April 2027. Node 24 is newest LTS but ecosystem compatibility is wider on 22. Use `node:22-alpine` for Docker. |
| Drizzle ORM | 0.45.x | SQL-like TypeScript ORM | Lighter than Prisma (no engine binary), SQL-native syntax, excellent PostgreSQL support, type-safe schema-as-code. |
| drizzle-kit | 0.31.x | Migration generation and management | Companion to Drizzle ORM. Generates versioned SQL migrations from schema diffs. |
| postgres (postgres.js) | 3.4.x | PostgreSQL driver | Fastest full-featured PG driver for Node.js. Native Drizzle integration via `drizzle-orm/postgres-js`. |
| PostgreSQL | 16 | Relational database | Mature, relational, JSONB support. Dockerized for both dev and prod. |
| Tailwind CSS | 4.x | Utility-first CSS | Ships with Next.js 16 scaffolding. v4 uses CSS-first config (no tailwind.config.js). |
| shadcn/ui | latest CLI | Accessible component library | Not a dependency -- copies components into project. Built on Radix UI. |
| Biome | 2.x | Linter + formatter (replaces ESLint + Prettier) | Single Rust binary, 10-25x faster, one config file. User decision: replaces ESLint + Prettier. |
| Vitest | 4.x | Test runner | Fast, ESM-native, Vite-based. Jest-compatible API. Official Next.js integration. |
| pnpm | 10.x | Package manager | Faster installs, strict deps, disk-efficient. User decision. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | latest | Vitest React plugin | Required for Vitest with React components |
| @testing-library/react | latest | Component testing utilities | Testing React components in Vitest |
| @testing-library/dom | latest | DOM testing utilities | Peer dependency of @testing-library/react |
| vite-tsconfig-paths | latest | Path alias resolution in Vitest | Required so Vitest resolves `@/` imports |
| @t3-oss/env-nextjs | 0.13.x | Type-safe env variable validation | Validates env vars at build time with Zod schemas |
| zod | 3.x | Runtime schema validation | Required by @t3-oss/env-nextjs and Drizzle schema validation. Start with v3 -- v4 ecosystem not ready. |
| dotenv | latest | Env file loading | Used in drizzle.config.ts and scripts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| postgres (postgres.js) | pg (node-postgres) | pg is more established, has pg-native for 10% speed boost. postgres.js is faster by default, modern API. Either works with Drizzle. |
| Biome | ESLint + Prettier | More ecosystem plugins with ESLint, but 2 tools + 4+ config files vs 1 tool + 1 config. User chose Biome. |
| Vitest | Jest | Jest is more established but slower, CJS-native. Vitest is faster, ESM-native. User chose Vitest. |
| Zod 3.x | Zod 4.x | Zod 4 has better API but ecosystem libs (@t3-oss/env-nextjs, etc.) may not support it yet. Start with 3.x. |

**Installation:**
```bash
# Scaffold Next.js (includes React, TypeScript, Tailwind CSS)
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --use-pnpm

# Core database
pnpm add drizzle-orm postgres zod@3 dotenv
pnpm add -D drizzle-kit

# Environment validation
pnpm add @t3-oss/env-nextjs

# Testing
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths jsdom

# Linting/formatting (Biome replaces ESLint + Prettier)
pnpm add -D -E @biomejs/biome

# shadcn/ui (CLI copies components, not an npm dependency)
pnpm dlx shadcn@latest init
```

**Post-scaffold cleanup:** Remove ESLint config that Next.js scaffolding creates (if any). Biome replaces it entirely.

## Architecture Patterns

### Recommended Project Structure

```
meal-prep/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (Hello World)
│   │   └── globals.css         # Tailwind imports
│   ├── components/
│   │   └── ui/                 # shadcn/ui components
│   ├── db/
│   │   ├── index.ts            # Drizzle client instance
│   │   ├── schema/
│   │   │   ├── recipes.ts      # recipes table
│   │   │   ├── ingredients.ts  # ingredients table
│   │   │   ├── tags.ts         # tags table + recipe_tags junction
│   │   │   └── common.ts       # Reusable columns (timestamps, UUID)
│   │   └── seed.ts             # Seed data script
│   ├── lib/
│   │   ├── env.ts              # @t3-oss/env-nextjs config
│   │   └── utils.ts            # shadcn/ui utility (cn function)
│   └── sources/
│       ├── types.ts            # RecipeSource interface
│       └── jow.ts              # Jow implementation (stub for Phase 1)
├── scripts/                    # Scraper and tools (Phase 2+)
├── drizzle/                    # Generated migration files
├── drizzle.config.ts           # Drizzle Kit configuration
├── vitest.config.mts           # Vitest configuration
├── biome.json                  # Biome linter/formatter config
├── docker-compose.yml          # Dev: Postgres + app
├── docker-compose.prod.yml     # Prod: Postgres + app
├── Dockerfile                  # Multi-stage Next.js build
├── .env.example                # Environment variable template
├── .env                        # Local env (gitignored)
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD pipeline
```

### Pattern 1: Reusable Schema Columns with Drizzle

**What:** Extract common columns (id, timestamps, soft delete) into a reusable object spread across all tables.
**When to use:** Every table in this project.
**Example:**
```typescript
// src/db/schema/common.ts
// Source: https://orm.drizzle.team/docs/sql-schema-declaration
import { timestamp, uuid } from "drizzle-orm/pg-core";

export const idColumn = {
  id: uuid().primaryKey().defaultRandom(),
};

export const timestamps = {
  createdAt: timestamp({ precision: 3, withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp({ precision: 3, withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp({ precision: 3, withTimezone: true }),
};
```

```typescript
// src/db/schema/recipes.ts
import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";

export const recipes = pgTable("recipes", {
  ...idColumn,
  jowId: text().unique().notNull(),
  title: text().notNull(),
  imageUrl: text(),
  jowUrl: text().notNull(),
  cookTimeMin: integer(),
  originalPortions: integer(),
  ...timestamps,
});
```

**Key: the `casing: 'snake_case'` option** on the Drizzle client and in drizzle.config.ts automatically converts `camelCase` TypeScript keys (e.g., `jowId`, `cookTimeMin`, `createdAt`) to `snake_case` database columns (`jow_id`, `cook_time_min`, `created_at`). No need to manually specify column names.

### Pattern 2: Drizzle Client Singleton

**What:** Single Drizzle instance with connection pooling, casing config, and schema binding.
**When to use:** All server-side database access.
**Example:**
```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, {
  schema,
  casing: "snake_case",
});
```

```typescript
// drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Pattern 3: Adapter Pattern for Recipe Sources

**What:** TypeScript interface defining the contract for recipe data sources. Jow is the first implementation. Future sources implement the same interface.
**When to use:** Recipe data acquisition.
**Example:**
```typescript
// src/sources/types.ts
export interface RawRecipe {
  sourceId: string;       // Unique ID from the source (e.g., Jow slug)
  sourceName: string;     // "jow"
  sourceUrl: string;      // Original URL
  title: string;
  imageUrl?: string;
  cookTimeMin?: number;
  originalPortions?: number;
  ingredients: RawIngredient[];
}

export interface RawIngredient {
  name: string;
  quantity?: number;
  unit?: string;
}

export interface RecipeSource {
  readonly name: string;
  fetchRecipes(): Promise<RawRecipe[]>;
  fetchRecipeById(id: string): Promise<RawRecipe | null>;
}
```

```typescript
// src/sources/jow.ts
import type { RecipeSource, RawRecipe } from "./types";

export class JowRecipeSource implements RecipeSource {
  readonly name = "jow";

  async fetchRecipes(): Promise<RawRecipe[]> {
    // Phase 2: Playwright scraping implementation
    throw new Error("Not implemented - see Phase 2");
  }

  async fetchRecipeById(id: string): Promise<RawRecipe | null> {
    // Phase 2: Playwright scraping implementation
    throw new Error("Not implemented - see Phase 2");
  }
}
```

### Pattern 4: Soft Delete with Drizzle Views

**What:** All queries on soft-deletable tables filter by `deletedAt IS NULL`. Create views or helper functions to avoid repetitive filters.
**When to use:** Every query on tables with soft delete.
**Example:**
```typescript
// Querying active records
import { isNull } from "drizzle-orm";
import { recipes } from "./schema/recipes";

// Always filter soft-deleted records
const activeRecipes = await db
  .select()
  .from(recipes)
  .where(isNull(recipes.deletedAt));

// Soft delete (not hard delete)
await db
  .update(recipes)
  .set({ deletedAt: new Date() })
  .where(eq(recipes.id, recipeId));
```

### Pattern 5: Next.js Standalone Docker Build

**What:** 3-stage Dockerfile producing a ~200MB image with only the standalone output.
**When to use:** Production deployment.
**Example:**
```dockerfile
# Dockerfile
FROM node:22-alpine AS base

FROM base AS builder
RUN corepack enable
USER node
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Requires `output: "standalone"` in next.config.mjs.**

### Anti-Patterns to Avoid

- **Nginx inside Docker Compose in production:** The user already has Nginx on the host VPS managing multiple sites. Do NOT add Nginx to Docker Compose. The app container exposes port 3000, and the host Nginx reverse-proxies to it.
- **Using `drizzle-kit push` in production:** Push is for rapid prototyping. Production must use `generate` + `migrate` for versioned, reviewable SQL migrations.
- **Storing the Drizzle `casing` config in only one place:** It must be set in BOTH the `drizzle()` call AND `drizzle.config.ts`. Forgetting one causes column name mismatches.
- **Hardcoding database URLs:** Always use environment variables. Use `@t3-oss/env-nextjs` with Zod for validation.
- **Using `serial` for IDs:** PostgreSQL now recommends identity columns or UUIDs. This project uses UUID v4 via `uuid().defaultRandom()`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom UUID functions | `uuid().defaultRandom()` in Drizzle | Uses Postgres `gen_random_uuid()`, no app-level code needed |
| Timestamp management | Manual `new Date()` on every insert/update | Reusable `timestamps` object with `$onUpdateFn` | Ensures consistency, `defaultNow()` handles inserts, `$onUpdateFn` handles updates |
| Env variable validation | Manual `process.env.X \|\| throw` | `@t3-oss/env-nextjs` with Zod | Catches missing vars at build time, not runtime crashes in production |
| CSS utility functions | Custom `classnames` helper | `cn()` from shadcn/ui (uses `clsx` + `tailwind-merge`) | Handles Tailwind class conflicts correctly |
| Linting + formatting | ESLint config + Prettier config + plugins | Biome single binary | One tool, one config file, 10-25x faster |
| Docker standalone output | Custom Node.js server | Next.js `output: "standalone"` | Bundles only needed deps, ~200MB image vs ~1.5GB |
| SSL certificate management | Manual cert generation | Certbot on host VPS (already running) | Auto-renewal, already configured for other sites |
| Migration file management | Manual SQL scripts | `drizzle-kit generate` + `drizzle-kit migrate` | Version-controlled, diff-based, handles renames with prompts |

**Key insight:** This phase is infrastructure-heavy. Almost every component has a well-established tool. The value is in correct configuration and integration, not custom code.

## Common Pitfalls

### Pitfall 1: Drizzle Casing Mismatch

**What goes wrong:** TypeScript schema uses camelCase (`createdAt`) but database has snake_case (`created_at`). Queries fail silently or return wrong columns.
**Why it happens:** `casing: 'snake_case'` is set in `drizzle()` but not in `drizzle.config.ts`, or vice versa.
**How to avoid:** Set `casing: 'snake_case'` in BOTH places: the `drizzle()` client initialization AND the `drizzle.config.ts` file. Verify by running `drizzle-kit generate` and inspecting the generated SQL.
**Warning signs:** Generated SQL has camelCase column names, or queries return empty objects.

### Pitfall 2: Docker Compose Port Conflicts

**What goes wrong:** Port 5432 already in use by a local PostgreSQL installation, or port 3000 conflicts with another dev server.
**Why it happens:** Default ports collide with existing services.
**How to avoid:** Map to non-standard host ports in docker-compose.yml (e.g., `5433:5432` for Postgres dev, `5434:5432` for Postgres test). Document port mappings in `.env.example`.
**Warning signs:** "port already allocated" errors on `docker compose up`.

### Pitfall 3: Next.js Standalone Missing Public/Static

**What goes wrong:** Favicon, robots.txt, or static assets return 404 in production.
**Why it happens:** Standalone build does not include `/public` or `.next/static` by default. Must copy them manually in Dockerfile.
**How to avoid:** Dockerfile must have 3 COPY commands from builder: `public/`, `.next/standalone/`, `.next/static/`.
**Warning signs:** Missing favicon, broken CSS, 404 on static assets.

### Pitfall 4: Nginx Configuration Conflicting with Existing Sites

**What goes wrong:** Adding a new server block breaks existing sites on the VPS, or SSL cert renewal fails.
**Why it happens:** Incorrect Nginx configuration or Certbot command that overwrites existing configs.
**How to avoid:** Use a separate Nginx config file per site (e.g., `/etc/nginx/sites-available/mealprep`). Use `certbot --nginx -d subdomain.domain.com` which adds SSL to the specific server block. Test with `nginx -t` before reloading.
**Warning signs:** Other sites go down, SSL errors, `nginx -t` fails.

### Pitfall 5: SSH Deploy Key Permissions

**What goes wrong:** GitHub Actions SSH connection fails or hangs.
**Why it happens:** Wrong key format, wrong permissions on `~/.ssh/authorized_keys`, or firewall blocks SSH from GitHub Actions IPs.
**How to avoid:** Use Ed25519 keys (`ssh-keygen -t ed25519`). Store private key in GitHub Secrets. Ensure the deploy user has no password set. Test SSH from a different machine first.
**Warning signs:** "Permission denied (publickey)" errors in CI logs.

### Pitfall 6: $onUpdateFn is Runtime Only

**What goes wrong:** `updatedAt` column is not updated when using raw SQL or database tools.
**Why it happens:** `$onUpdateFn` is a Drizzle ORM runtime feature, not a database trigger. It only works when updates go through the Drizzle client.
**How to avoid:** Understand this is intentional. For consistency, always use the Drizzle client for updates. If raw SQL is needed, manually set `updated_at = NOW()`.
**Warning signs:** `updated_at` stays at creation time after manual DB edits.

### Pitfall 7: Zod Version Conflict

**What goes wrong:** Peer dependency warnings or runtime errors with `@t3-oss/env-nextjs` or other libraries.
**Why it happens:** Installing Zod 4.x when ecosystem libraries still expect Zod 3.x.
**How to avoid:** Install `zod@3` explicitly. Upgrade to v4 only when all dependencies support it.
**Warning signs:** npm/pnpm peer dependency warnings mentioning Zod version.

### Pitfall 8: postgres.js Prepared Statements in Dev

**What goes wrong:** Hot module reload creates multiple connections, hitting prepared statement limits.
**Why it happens:** postgres.js uses prepared statements by default. Each new connection during HMR creates duplicate prepared statements.
**How to avoid:** Use a global singleton pattern for the Drizzle client in development (store on `globalThis`). Add `prepare: false` for development connections if issues arise.
**Warning signs:** "prepared statement already exists" errors during development.

## Code Examples

Verified patterns from official sources:

### Docker Compose for Development

```yaml
# docker-compose.yml (development)
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: mealprep
      POSTGRES_USER: mealprep
      POSTGRES_PASSWORD: mealprep_dev
    ports:
      - "5433:5432"
    volumes:
      - pgdata_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mealprep"]
      interval: 5s
      timeout: 5s
      retries: 5

  db-test:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: mealprep_test
      POSTGRES_USER: mealprep_test
      POSTGRES_PASSWORD: mealprep_test
    ports:
      - "5434:5432"
    tmpfs:
      - /var/lib/postgresql/data  # RAM-based for speed
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mealprep_test"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder  # Use builder stage for dev (has all deps)
    command: pnpm dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://mealprep:mealprep_dev@db:5432/mealprep
    volumes:
      - .:/app
      - /app/node_modules  # Prevent host node_modules from overriding
      - /app/.next          # Prevent .next from being shared
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata_dev:
```

### Docker Compose for Production

```yaml
# docker-compose.prod.yml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata_prod:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"  # Only localhost, Nginx proxies
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

volumes:
  pgdata_prod:

networks:
  internal:
    driver: bridge
```

**Note:** No Nginx in production Docker Compose. Nginx runs on the host VPS.

### Nginx Server Block for VPS

```nginx
# /etc/nginx/sites-available/mealprep
server {
    server_name mealprep.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
# After: sudo certbot --nginx -d mealprep.example.com
# Certbot auto-adds SSL config to this file
```

### Vitest Configuration

```typescript
// vitest.config.mts
// Source: https://nextjs.org/docs/app/guides/testing/vitest
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // Database integration tests use a separate project
    // to avoid polluting unit test environment
  },
});
```

### Biome Configuration

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "include": ["src/**/*.ts", "src/**/*.tsx", "*.config.ts", "*.config.mts"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

### GitHub Actions CI/CD Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - run: pnpm biome ci .
        name: Lint & format check

      - run: pnpm tsc --noEmit
        name: Type check

      - run: pnpm test run
        name: Run tests

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.2.4
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/mealprep
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
```

### Environment Variable Configuration

```typescript
// src/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    // NEXT_PUBLIC_ variables go here
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

### Hello World Server Component with DB Query

```typescript
// src/app/page.tsx
import { db } from "@/db";
import { sql } from "drizzle-orm";

export default async function HomePage() {
  // Verify DB connection
  const result = await db.execute(sql`SELECT NOW() as current_time`);
  const dbTime = result[0]?.current_time;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Meal Prep</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Database connected successfully
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Server time: {String(dbTime)}
      </p>
    </main>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serial` for IDs | `uuid().defaultRandom()` or identity columns | PostgreSQL 10+ | UUIDs prevent ID enumeration, safe for distributed systems |
| ESLint + Prettier (2 tools) | Biome (1 tool) | Biome 1.0 (2023), v2 (2025) | 10-25x faster, single config, fewer deps |
| `tailwind.config.js` | CSS-first config with `@import "tailwindcss"` | Tailwind CSS v4 (2024) | No JS config file needed |
| Express.js + React SPA | Next.js App Router with Server Components | Next.js 13+ (2023), mature at 16 | Single framework for full-stack, no separate API server |
| Prisma ORM | Drizzle ORM | Drizzle gaining adoption 2023-2025 | No engine binary, SQL-native, lighter for VPS |
| Manual migration SQL | `drizzle-kit generate` + `migrate` | Drizzle Kit stable 2024 | Schema-as-code, automatic diff detection |
| Caddy (from initial research) | Nginx (user decision) | N/A | User already runs Nginx + Certbot on VPS. Coexist with existing sites. |

**Deprecated/outdated:**
- **Lucia Auth:** Officially deprecated on npm. Use Better Auth (but not in Phase 1 -- auth is Phase 4).
- **Moment.js:** Abandoned. Use date-fns if needed.
- **Pages Router:** Legacy Next.js approach. Use App Router exclusively.
- **`next.config.js`:** Next.js 16 uses `next.config.mjs` or `next.config.ts` by default.

## Drizzle Migration Strategy (Claude's Discretion)

**Recommendation:** Use `drizzle-kit generate` + `drizzle-kit migrate` (not `push`).

**Rationale:**
- `push` is great for rapid prototyping but provides no migration history
- `generate` creates versioned SQL files that go into version control
- `migrate` applies them in order, tracking which have been applied
- This supports production deployment (run migrations on deploy before starting app)
- Team collaboration (migration files show schema evolution)

**Workflow:**
1. Modify TypeScript schema files
2. Run `pnpm drizzle-kit generate` -- creates timestamped SQL migration file in `./drizzle/`
3. Review generated SQL
4. Commit migration files to git
5. On deploy: `pnpm drizzle-kit migrate` runs before app starts
6. For dev: can use `push` for rapid iteration, but `generate`+`migrate` is also fine

**Production migration in Docker:** Run migrations as part of the entrypoint or as a separate step in the deploy script before starting the app.

## Open Questions

Things that couldn't be fully resolved:

1. **VPS hostname and subdomain**
   - What we know: User has a VPS with Nginx + Certbot already running for other sites
   - What's unclear: The exact subdomain and domain name to configure
   - Recommendation: Use placeholder `mealprep.example.com` in configs. User provides actual domain during plan execution.

2. **VPS deployment path and user**
   - What we know: Deploy via SSH, Docker Compose on VPS
   - What's unclear: Which user, which directory (e.g., `/opt/mealprep` or `/home/deploy/mealprep`)
   - Recommendation: Plan should include a task where user provides VPS details. Use `/opt/mealprep` as default.

3. **Dev environment: Docker for app or local?**
   - What we know: Docker Compose for Postgres is confirmed. Full stack in Docker is a decision.
   - What's unclear: Whether to run Next.js inside Docker in dev (slower HMR) or locally with only Postgres in Docker
   - Recommendation: Provide Docker Compose with both options. Default: Postgres-only in Docker, Next.js runs locally with `pnpm dev`. Full-stack Docker available but optional. This is faster for development (native HMR).

4. **Drizzle ORM v1 beta status**
   - What we know: Drizzle ORM has a v1.0.0-beta branch in development
   - What's unclear: Whether v1 will be stable by the time Phase 1 executes
   - Recommendation: Use current stable (0.45.x). Migration path to v1 should be smooth.

5. **next.config format: .mjs vs .ts**
   - What we know: Next.js 16 supports both `next.config.mjs` and `next.config.ts`
   - What's unclear: Which the `create-next-app` scaffolding defaults to in 16.1.6
   - Recommendation: Use whichever the scaffolding generates. Both work. `.ts` is preferred if available.

## Sources

### Primary (HIGH confidence)
- [Next.js 16.1 official blog](https://nextjs.org/blog/next-16-1) - Version 16.1.6, App Router, standalone output
- [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest) - Official Vitest configuration
- [Drizzle ORM schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration) - casing option, reusable columns, pgTable
- [Drizzle ORM PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) - uuid, timestamp, text, jsonb
- [Drizzle ORM migrations](https://orm.drizzle.team/docs/migrations) - generate vs push vs migrate
- [Drizzle Kit config](https://orm.drizzle.team/docs/drizzle-config-file) - drizzle.config.ts options
- [Drizzle Kit push](https://orm.drizzle.team/docs/drizzle-kit-push) - push command documentation
- [Drizzle PostgreSQL getting started](https://orm.drizzle.team/docs/get-started/postgresql-new) - Driver setup
- [Biome v2 blog post](https://biomejs.dev/blog/biome-v2/) - v2 migration, new features
- [Biome getting started](https://biomejs.dev/guides/getting-started/) - Installation, configuration
- [npm registry](https://www.npmjs.com/) - All version numbers verified 2026-02-08

### Secondary (MEDIUM confidence)
- [Drizzle ORM PostgreSQL Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Reusable patterns, identity columns, timestamps
- [Soft delete with Drizzle ORM](https://subtopik.com/@if-loop/guides/implementing-soft-deletions-with-drizzle-orm-and-postgresql-s2qauA) - Partial indexes, view abstraction
- [Next.js Docker self-hosting guide](https://eastondev.com/blog/en/posts/dev/20251220-nextjs-docker-self-hosting/) - Multi-stage Dockerfile, standalone output
- [Next.js standalone Docker with pnpm](https://htalbot.dev/posts/build-nextjs-standalone-docker) - Corepack, pnpm, 200MB images
- [GitHub Actions SSH deploy](https://github.com/appleboy/ssh-action) - appleboy/ssh-action v1.2.4
- [GitHub Actions Docker Compose SSH](https://docs.servicestack.net/ssh-docker-compose-deploment) - Full deployment pattern
- [Biome + Husky + Next.js 2026 guide](https://dev.to/imkarmakar/how-to-set-up-husky-biome-in-a-nextjs-project-2026-guide-9jh)

### Tertiary (LOW confidence)
- [Vitest with Testcontainers](https://nikolamilovic.com/posts/2025-4-15-integration-testing-node-vitest-testcontainers/) - Database integration testing patterns. Approach verified but specific Drizzle integration not confirmed.
- [Biome v2.3.14](https://www.npmjs.com/package/@biomejs/biome) - Version from npm, exact config schema for v2.3 not fully verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry and official docs
- Architecture: HIGH - Patterns from official Drizzle/Next.js docs, well-established Docker patterns
- Pitfalls: HIGH - Based on official docs (casing, standalone output) and common community issues
- Deployment: MEDIUM - Nginx config pattern is standard, but specifics depend on user's VPS setup
- CI/CD: MEDIUM - appleboy/ssh-action is well-established, but exact workflow depends on VPS details

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days -- stable ecosystem, no major releases expected)
