# Architecture Research

**Domain:** Meal prep / recipe recommendation SaaS
**Researched:** 2026-02-08
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; based on established architectural patterns for scraping pipelines, recommendation systems, and multi-tenant SaaS. Specific library versions should be verified during implementation.)

## Standard Architecture

### System Overview

The system has two distinct operational zones connected by an API boundary:

```
LOCAL ZONE (Developer Machine)                  SERVER ZONE (VPS - Hetzner/OVH)
================================                ========================================

  ┌─────────────┐                                ┌─────────────────────────────────┐
  │   Scraper    │                                │          Web Frontend           │
  │  (Jow.fr)   │                                │     (SPA - React/Next.js)       │
  └──────┬──────┘                                └──────────────┬────────────────┘
         │ raw recipes                                          │ HTTP
         v                                                      v
  ┌─────────────┐                                ┌─────────────────────────────────┐
  │  Local JSON  │                                │          Server API             │
  │   Storage    │                                │   ┌───────────┬──────────┐     │
  └──────┬──────┘                                │   │   Auth    │  Recipe  │     │
         │                                        │   │  Module   │  CRUD   │     │
         v                                        │   ├───────────┼──────────┤     │
  ┌─────────────┐                                │   │  User     │  Meal   │     │
  │ Claude Code  │                                │   │  Profile  │  Plan   │     │
  │ Enrichment   │                                │   ├───────────┤ Engine  │     │
  │   (macros)   │                                │   │  Sport    │         │     │
  └──────┬──────┘                                │   │ Schedule  │         │     │
         │ enriched recipes                       │   └───────────┴──────────┘     │
         v                                        └──────────────┬────────────────┘
  ┌─────────────┐         HTTP POST                              │
  │   Upload     │ ─────────────────────────────>                │
  │   Script     │         /api/recipes/import                    v
  └─────────────┘                                ┌─────────────────────────────────┐
                                                  │       PostgreSQL Database        │
                                                  │  ┌────────┐ ┌────────┐          │
                                                  │  │recipes │ │ users  │          │
                                                  │  ├────────┤ ├────────┤          │
                                                  │  │ingredi-│ │profiles│          │
                                                  │  │  ents  │ │        │          │
                                                  │  ├────────┤ ├────────┤          │
                                                  │  │ macros │ │meal_   │          │
                                                  │  │        │ │plans   │          │
                                                  │  ├────────┤ ├────────┤          │
                                                  │  │        │ │sport_  │          │
                                                  │  │        │ │schedule│          │
                                                  │  └────────┘ └────────┘          │
                                                  └─────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Scraper** | Crawl Jow.fr recipe pages, extract structured data (title, ingredients, portions, time, photo URL), detect duplicates against local store | Node.js/TypeScript script using Playwright or Cheerio |
| **Local JSON Storage** | Store raw scraped recipes as JSON files on disk, serve as source of truth for what has been scraped, enable duplicate detection by URL or recipe ID | File system: one JSON file per recipe or a single `recipes.json` array |
| **Claude Code Enrichment** | Manual trigger to analyze recipe ingredients and estimate macronutrients (protein, carbs, fat per portion), enrich the local JSON with macro data | Claude Code skill (custom command) that reads local JSON, calls Claude to estimate macros, writes back |
| **Upload Script** | Push enriched recipes from local storage to the server API, handle idempotency (upsert by Jow recipe ID) | Node.js/TypeScript script making HTTP POST/PUT to server API |
| **Server API** | Serve the web app, handle auth, recipe CRUD, user profiles, sport schedules, meal plan generation, recipe upload ingestion | Node.js with Express/Fastify or full-stack framework (Next.js API routes) |
| **Auth Module** | User registration, login, session management, protect all user-specific endpoints | JWT or session-based auth. Simple email/password for v1 |
| **Recipe CRUD** | Store, query, filter, paginate recipes. Admin import endpoint for upload script | REST endpoints with Postgres queries |
| **User Profile** | Weight, height, fitness goal, dietary preferences per user | CRUD endpoints writing to `profiles` table |
| **Sport Schedule** | Weekly sport sessions (type, duration, intensity) per user | CRUD endpoints writing to `sport_schedules` table |
| **Meal Plan Engine** | Core algorithm: calculate weekly macro targets from profile + sport, select recipes to fill lunch + dinner slots that match targets, handle batch cooking multipliers | Server-side algorithm operating on recipe macro data in Postgres |
| **Web Frontend** | User-facing SPA: login, browse recipes, configure profile, enter sport schedule, view/regenerate meal plans | React or Next.js SPA with API calls |
| **PostgreSQL** | Persistent storage for all server data: recipes, users, profiles, meal plans, sport schedules | Single Postgres instance on VPS |

## Recommended Project Structure

This project naturally splits into a monorepo with three packages:

```
meal-prep/
├── packages/
│   ├── scraper/              # LOCAL ZONE: scraping + enrichment + upload
│   │   ├── src/
│   │   │   ├── scrape.ts          # Jow.fr crawler
│   │   │   ├── store.ts           # Local JSON read/write + dedup
│   │   │   ├── upload.ts          # Push to server API
│   │   │   └── types.ts           # Shared recipe types
│   │   ├── data/
│   │   │   └── recipes.json       # Local recipe store (gitignored)
│   │   ├── skills/
│   │   │   └── enrich-macros.md   # Claude Code skill definition
│   │   └── package.json
│   │
│   ├── server/               # SERVER ZONE: API + business logic
│   │   ├── src/
│   │   │   ├── index.ts           # App entry, server startup
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # Register, login, logout
│   │   │   │   ├── recipes.ts     # CRUD + import endpoint
│   │   │   │   ├── profiles.ts    # User profile CRUD
│   │   │   │   ├── sport.ts       # Sport schedule CRUD
│   │   │   │   └── meal-plans.ts  # Generate + retrieve meal plans
│   │   │   ├── services/
│   │   │   │   ├── macro-calculator.ts  # Weekly target calculation
│   │   │   │   ├── meal-planner.ts      # Recipe selection algorithm
│   │   │   │   └── batch-cooking.ts     # Portion multiplication logic
│   │   │   ├── db/
│   │   │   │   ├── schema.ts      # Drizzle/Prisma schema
│   │   │   │   ├── migrations/    # DB migrations
│   │   │   │   └── queries.ts     # Reusable query functions
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # Auth middleware
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── web/                  # SERVER ZONE: Frontend
│       ├── src/
│       │   ├── pages/             # or app/ for Next.js App Router
│       │   ├── components/
│       │   │   ├── recipes/       # Recipe browsing components
│       │   │   ├── meal-plan/     # Meal plan display
│       │   │   ├── profile/       # Profile configuration
│       │   │   └── sport/         # Sport schedule input
│       │   ├── hooks/             # Custom hooks (useAuth, useRecipes...)
│       │   ├── lib/               # API client, helpers
│       │   └── types.ts
│       └── package.json
│
├── package.json              # Monorepo root (workspaces)
├── tsconfig.base.json        # Shared TypeScript config
└── docker-compose.yml        # Local dev: Postgres + server
```

### Structure Rationale

- **packages/scraper/:** Completely isolated from the server. Runs only on the developer's machine. Has its own dependencies (Playwright/Cheerio). Never deployed to VPS. This separation enforces the "local zone vs server zone" boundary.
- **packages/server/:** All server-side logic in one deployable unit. Monolith architecture is correct for this scale. Services are separated by file, not by deployment boundary.
- **packages/web/:** Frontend SPA. Could be bundled and served by the server (single deployment), or deployed separately on the VPS behind Nginx. Both approaches work.
- **Monorepo with workspaces:** Allows sharing TypeScript types between scraper, server, and web (especially the `Recipe` type) without publishing packages. npm/pnpm workspaces handle this natively.

### Alternative: Single Full-Stack Framework

An alternative to the monorepo is using **Next.js** for both server and web (API routes + pages), with the scraper as a separate package. This reduces the number of deployment targets but couples the API to Next.js conventions. For a SaaS that may need to serve a mobile API later, a standalone API server (Express/Fastify) is more flexible.

**Recommendation:** Monorepo with separate server + web packages. The slight extra setup cost is repaid with cleaner boundaries and future flexibility.

## Architectural Patterns

### Pattern 1: Pipeline Architecture for Data Ingestion

**What:** The scraping-enrichment-upload chain operates as a sequential pipeline where each stage transforms data and passes it to the next. Each stage is independently runnable and idempotent.

**When to use:** Whenever data is acquired from external sources and needs transformation before entering the main system.

**Trade-offs:**
- (+) Each stage can be re-run independently (re-scrape without re-enriching, re-upload without re-scraping)
- (+) Local JSON storage acts as a checkpoint between stages
- (+) Easy to debug: inspect intermediate JSON at each stage
- (-) Manual orchestration (user decides when to run each stage)
- (-) No real-time sync (acceptable for recipe data that changes infrequently)

**Example:**
```typescript
// scrape.ts - Stage 1: Acquire
async function scrapeJow(): Promise<RawRecipe[]> {
  const browser = await playwright.chromium.launch();
  // ... crawl recipe pages
  return rawRecipes;
}

// store.ts - Stage 2: Deduplicate and persist locally
function storeRecipes(raw: RawRecipe[]): { added: number; skipped: number } {
  const existing = loadLocalStore();
  const newRecipes = raw.filter(r => !existing.find(e => e.jowId === r.jowId));
  saveLocalStore([...existing, ...newRecipes]);
  return { added: newRecipes.length, skipped: raw.length - newRecipes.length };
}

// upload.ts - Stage 3: Push to server
async function uploadEnriched(serverUrl: string, apiKey: string): Promise<void> {
  const enriched = loadLocalStore().filter(r => r.macros !== null);
  for (const recipe of enriched) {
    await fetch(`${serverUrl}/api/recipes/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
  }
}
```

### Pattern 2: Constraint-Based Meal Planning (Knapsack Variant)

**What:** The meal plan generation is fundamentally a constrained optimization problem. Given N recipes with known macros, select 14 meal slots (7 days x 2 meals) such that total macros approach the weekly target. Batch cooking (x2, x3) means some recipes fill multiple slots.

**When to use:** This is the core algorithm of the product.

**Trade-offs:**
- (+) Greedy heuristic is fast and good enough for v1 (no need for linear programming)
- (+) Can add constraints incrementally (variety, cooking time, preferences)
- (-) Optimal solution is NP-hard (but optimal is unnecessary; "good" is sufficient)
- (-) Batch cooking adds combinatorial complexity

**Example:**
```typescript
// meal-planner.ts
interface MealPlanRequest {
  weeklyTargets: { protein: number; carbs: number; fat: number }; // grams
  slotsToFill: number; // 14 for lunch+dinner x 7 days
  maxBatchSize: number; // 2 or 3
  availableRecipes: RecipeWithMacros[];
  preferences: { excludeIngredients: string[]; maxCookTimeMinutes: number };
}

interface MealPlanResult {
  assignments: Array<{
    day: number;        // 1-7
    meal: 'lunch' | 'dinner';
    recipe: RecipeWithMacros;
    portions: number;   // how many portions to eat (1)
    batchSize: number;  // how many total portions to cook (1, 2, or 3)
  }>;
  totalMacros: { protein: number; carbs: number; fat: number };
  targetDelta: { protein: number; carbs: number; fat: number }; // how close
}

function generateMealPlan(request: MealPlanRequest): MealPlanResult {
  // Greedy approach for v1:
  // 1. Filter recipes by preferences
  // 2. Score each recipe by how well it fills remaining macro gap
  // 3. Pick top recipe, assign to batch of slots (x2 or x3)
  // 4. Subtract from remaining target
  // 5. Repeat until all slots filled
  // 6. Return plan with delta showing how close to targets
}
```

### Pattern 3: Upsert-Based Recipe Import

**What:** The upload API endpoint uses upsert semantics (insert-or-update) keyed on the Jow recipe ID. This makes the upload script idempotent: running it multiple times has no side effects.

**When to use:** Any data import from external sources where the same record may be pushed multiple times.

**Trade-offs:**
- (+) Idempotent: safe to re-run upload at any time
- (+) Naturally handles recipe updates (if Jow changes a recipe, re-scraping and re-uploading updates it)
- (+) No complex sync protocol needed
- (-) Requires a stable external ID (Jow recipe ID or URL slug)

**Example:**
```typescript
// server/routes/recipes.ts
router.post('/api/recipes/import', authMiddleware, adminOnly, async (req, res) => {
  const recipe = validateRecipeImport(req.body);

  const result = await db
    .insert(recipes)
    .values({
      jowId: recipe.jowId,
      title: recipe.title,
      ingredients: recipe.ingredients,
      macrosPerPortion: recipe.macros,
      cookTime: recipe.cookTime,
      imageUrl: recipe.imageUrl,
      jowUrl: recipe.jowUrl,
      // ...
    })
    .onConflictDoUpdate({
      target: recipes.jowId,
      set: {
        title: recipe.title,
        ingredients: recipe.ingredients,
        macrosPerPortion: recipe.macros,
        updatedAt: new Date(),
      },
    });

  res.json({ status: 'ok', action: result.rowCount > 0 ? 'upserted' : 'no-op' });
});
```

## Data Flow

### Flow 1: Recipe Acquisition Pipeline (Local, Manual)

```
[Developer triggers]
        |
        v
[1. Scraper crawls Jow.fr]
        |
        | raw recipe JSON (title, ingredients, portions, time, photo, jowUrl)
        v
[2. Local Store deduplicates and saves]
        |
        | recipes.json on disk (some without macros)
        v
[3. Developer triggers Claude Code enrichment skill]
        |
        | Claude analyzes ingredients, estimates macros per portion
        v
[4. Local Store updated with macros]
        |
        | enriched recipes.json on disk (with macros)
        v
[5. Upload script sends to server]
        |
        | HTTP POST /api/recipes/import (one per recipe, or batched)
        v
[6. Server upserts into Postgres]
```

**Key characteristic:** This pipeline is not automated. The developer runs each step manually. This is intentional: scraping + enrichment are offline processes that do not need to run in real time. The recipe catalog grows incrementally.

### Flow 2: Meal Plan Generation (Server, User-Triggered)

```
[User clicks "Generate Meal Plan"]
        |
        v
[1. Frontend sends POST /api/meal-plans/generate]
        |
        | { weekStartDate, preferences }
        v
[2. Server loads user profile + sport schedule for that week]
        |
        | { weight, height, goal, sportSessions[] }
        v
[3. Macro Calculator computes weekly targets]
        |
        | { protein: 980g, carbs: 2100g, fat: 560g } (weekly totals)
        v
[4. Meal Planner queries available recipes with macros]
        |
        | SELECT * FROM recipes WHERE macros IS NOT NULL
        v
[5. Meal Planner runs selection algorithm]
        |
        | Greedy/heuristic assignment of recipes to 14 slots
        | Considers batch cooking (same recipe across 2-3 meals)
        v
[6. Result stored in meal_plans + meal_plan_items tables]
        |
        v
[7. Response returned to frontend]
        |
        | { weekPlan: [ { day, meal, recipe, portions, batchSize, macros } ] }
        v
[8. Frontend renders weekly meal plan with macro breakdown]
```

### Flow 3: User Session (Server, Standard Auth Flow)

```
[User visits site]
        |
        v
[Login/Register] --> [Server validates credentials] --> [JWT issued]
        |
        v
[Authenticated requests with JWT in header]
        |
        v
[All endpoints scoped to user_id from JWT]
```

### Key Data Flows

1. **Recipe acquisition:** Local scraper -> local JSON -> Claude Code enrichment -> local JSON -> upload script -> server API -> Postgres. One-directional, batch, manual.
2. **Meal plan generation:** User trigger -> server loads profile + sport + recipes -> algorithm computes plan -> stored in DB -> returned to frontend. Synchronous request-response.
3. **User configuration:** Frontend forms -> API CRUD -> Postgres. Standard CRUD, scoped by user.

## Database Schema Considerations

### Core Tables

```sql
-- Recipes (populated by upload pipeline)
CREATE TABLE recipes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jow_id          TEXT UNIQUE NOT NULL,          -- Jow's own identifier (URL slug or ID)
    title           TEXT NOT NULL,
    image_url       TEXT,
    jow_url         TEXT NOT NULL,                 -- Link back to Jow recipe page
    cook_time_min   INTEGER,
    original_portions INTEGER,                     -- Jow's stated portions
    ingredients     JSONB NOT NULL,                -- Array of { name, quantity, unit }
    macros_per_portion JSONB,                      -- { protein_g, carbs_g, fat_g, calories } or NULL if not enriched
    tags            TEXT[],                         -- e.g., ['batch-friendly', 'quick', 'high-protein']
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (1:1 with users)
CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    weight_kg       DECIMAL(5,1),
    height_cm       INTEGER,
    age             INTEGER,
    sex             TEXT CHECK (sex IN ('male', 'female')),
    activity_level  TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    goal            TEXT CHECK (goal IN ('lose_weight', 'maintain', 'gain_muscle', 'performance')),
    excluded_ingredients TEXT[],                    -- Allergies, dislikes
    max_cook_time_min INTEGER,                     -- Preference
    max_batch_size  INTEGER DEFAULT 2,             -- x2 or x3
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sport schedule (per user, per week)
CREATE TABLE sport_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,                 -- Monday of the week
    day_of_week     INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
    sport_type      TEXT NOT NULL,                  -- 'running', 'strength', 'cycling', etc.
    duration_min    INTEGER NOT NULL,
    intensity       TEXT CHECK (intensity IN ('low', 'medium', 'high')),
    estimated_calories_burned INTEGER,             -- Calculated from type + duration + intensity
    UNIQUE(user_id, week_start, day_of_week, sport_type)
);

-- Meal plans (per user, per week)
CREATE TABLE meal_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    target_macros   JSONB NOT NULL,                -- { protein_g, carbs_g, fat_g }
    actual_macros   JSONB NOT NULL,                -- What the plan actually delivers
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Meal plan items (individual meal assignments)
CREATE TABLE meal_plan_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id    UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id       UUID REFERENCES recipes(id),
    day_of_week     INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
    meal_type       TEXT CHECK (meal_type IN ('lunch', 'dinner')),
    portions_to_eat DECIMAL(3,1) DEFAULT 1,        -- Portions for this meal
    batch_size      INTEGER DEFAULT 1,             -- Total portions cooked (for batch cooking)
    macros_this_meal JSONB NOT NULL,               -- Actual macros for this serving
    UNIQUE(meal_plan_id, day_of_week, meal_type)
);
```

### Schema Design Notes

1. **JSONB for macros and ingredients:** Flexible structure, avoidance of excessive normalization for read-heavy data. Postgres JSONB supports indexing if needed later.
2. **`jow_id` as unique key:** Essential for the upsert pattern in recipe import. This must be a stable identifier extracted from Jow.
3. **`macros_per_portion` nullable:** Recipes may exist without macros if they have been scraped but not yet enriched. The meal planner should only use recipes where macros are not null.
4. **`week_start` as DATE:** Anchors sport sessions and meal plans to a specific week. Always store as Monday of the week for consistency.
5. **`meal_plan_items` separate from `meal_plans`:** Allows querying individual meals and supports the batch cooking pattern (same recipe_id appears multiple times with the same batch_size).
6. **`batch_size` on meal_plan_items:** When a recipe is batch-cooked x3, three `meal_plan_items` rows reference the same recipe with `batch_size = 3`. The user cooks once, eats three times. This makes it clear in the UI which meals are batch-cooked together.

### Index Strategy

```sql
-- Recipes: frequently filtered by macros availability
CREATE INDEX idx_recipes_has_macros ON recipes ((macros_per_portion IS NOT NULL));
CREATE INDEX idx_recipes_jow_id ON recipes (jow_id);

-- Meal plans: always queried by user + week
CREATE INDEX idx_meal_plans_user_week ON meal_plans (user_id, week_start);

-- Sport sessions: queried by user + week
CREATE INDEX idx_sport_sessions_user_week ON sport_sessions (user_id, week_start);
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Monolith is perfect. Single Postgres instance. Server + frontend on one VPS. No caching needed. Focus on correctness of the meal plan algorithm. |
| 100-1k users | Still monolith. Add connection pooling if not already present. Consider caching recipe list (changes infrequently). Meal plan generation may take 100-500ms which is acceptable. |
| 1k-10k users | Potentially add Redis for session storage and recipe caching. Meal plan generation is CPU-bound but not concurrent (users generate plans infrequently). Still no need to split services. |
| 10k+ users | Only at this scale consider separating the meal plan engine if generation time becomes an issue. But realistically, a meal prep SaaS is unlikely to reach this scale in v1. |

### Scaling Priorities

1. **First bottleneck:** Database queries for recipe filtering during meal plan generation. Prevention: proper indexes on `recipes.macros_per_portion` and `recipes.tags`. At low scale this is a non-issue.
2. **Second bottleneck:** Concurrent meal plan generation requests during peak hours (Sunday evening when users plan their week). Prevention: meal plan generation is stateless and fast (greedy algorithm on pre-loaded data). Single-threaded Node.js handles this fine for hundreds of concurrent users.
3. **Non-bottleneck:** Recipe scraping and upload. This is a batch process run by the developer, not by users. Scale is irrelevant.

## Anti-Patterns

### Anti-Pattern 1: Shared Database Between Local and Server

**What people do:** Connect the local scraper directly to the remote Postgres database to insert recipes, bypassing the API.

**Why it's wrong:** Exposes database credentials on the developer machine. Couples the scraper to the database schema (any migration breaks the scraper). Makes it impossible to add validation, rate limiting, or logging on recipe imports. Prevents ever having multiple data sources or contributors.

**Do this instead:** Always go through the API. The upload script calls `POST /api/recipes/import` with an auth token. The server validates and upserts. The scraper never touches the database directly.

### Anti-Pattern 2: Over-Engineering the Recommendation Algorithm

**What people do:** Start with linear programming, machine learning, or collaborative filtering for recipe selection.

**Why it's wrong:** The problem is a constrained selection problem with at most a few hundred recipes and 14 slots. A simple greedy heuristic (pick recipe that best fills remaining macro gap) produces good-enough results. ML-based recommendation requires user feedback data that does not exist yet.

**Do this instead:** Start with a greedy algorithm. Score each candidate recipe by how well it reduces the gap between current totals and weekly targets. Add variety constraints (do not repeat the same recipe more than batch_size allows). Iterate on the algorithm based on real user feedback, not theoretical optimality.

### Anti-Pattern 3: Real-Time Scraping

**What people do:** Build the scraper as a server-side cron job or on-demand feature.

**Why it's wrong:** Scraping Jow.fr from a server creates legal/ToS risk. It couples the server's uptime to Jow's availability. Scraping failures become production incidents. The recipe catalog does not need real-time updates.

**Do this instead:** Keep scraping local and manual. The developer controls when to scrape, can handle CAPTCHAs or layout changes manually, and pushes to the server only after verification. The server is insulated from scraping problems.

### Anti-Pattern 4: Storing Macros Only at Recipe Level

**What people do:** Store macros per recipe and calculate per-portion on the fly.

**Why it's wrong:** The Jow portions may be unreliable (stated in project context). If macros are stored per-recipe without a clear per-portion basis, every calculation becomes ambiguous. Does "20g protein" mean per portion? Per recipe? Per Jow's stated portions?

**Do this instead:** Always store `macros_per_portion` with explicit per-portion values. The enrichment step must normalize macros to a single standard portion. The batch cooking multiplier then multiplies portions, and the math stays clean: `total_protein = macros_per_portion.protein * portions_to_eat`.

### Anti-Pattern 5: Premature Multi-Tenancy Complexity

**What people do:** Build complex tenant isolation, role-based access, org hierarchies from day one.

**Why it's wrong:** For v1 SaaS, multi-user means "each user has their own data, isolated by user_id." That is achieved by a simple `WHERE user_id = ?` on every query. Building admin panels, team features, or complex RBAC before validating the core product wastes effort.

**Do this instead:** Every table that holds user data has a `user_id` foreign key. Every query filters by the authenticated user's ID. Recipes are shared (no user_id) since they come from the global Jow catalog. That is sufficient multi-tenancy for v1.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Jow.fr** | Local scraper (Playwright headless browser or HTTP + Cheerio) | Jow likely uses client-side rendering; verify if Playwright is needed or if API endpoints are available. Scraping frequency: low (weekly or less). Respect robots.txt. |
| **Claude Code (enrichment)** | Local Claude Code skill triggered manually by developer | Not an API integration. The developer runs a skill that reads local JSON, uses Claude to estimate macros, writes back to JSON. No server involvement. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Scraper -> Server | HTTP REST (upload script -> `/api/recipes/import`) | Auth via API key or admin JWT. Batch upload (array of recipes) recommended over one-by-one for efficiency. |
| Frontend -> Server API | HTTP REST (fetch/axios) | Standard JSON API. JWT in Authorization header. |
| Server API -> Postgres | Direct connection (connection pool) | Use a query builder or ORM (Drizzle recommended). Connection pool size: 5-10 for VPS scale. |
| Server -> Frontend | Static file serving (or reverse proxy) | Nginx serves frontend static files and proxies `/api/*` to Node.js. Single VPS deployment. |

## Deployment Architecture

### VPS Layout (Single Server)

```
VPS (Hetzner/OVH)
├── Nginx (reverse proxy + static files)
│   ├── / -> serves frontend build (static HTML/JS/CSS)
│   └── /api/* -> proxy to Node.js (localhost:3000)
├── Node.js server (port 3000)
│   └── Express/Fastify app
├── PostgreSQL (port 5432, localhost only)
└── (Optional) Redis (port 6379, for sessions later)
```

### Deployment Strategy

For v1, keep deployment simple:
- **Option A (recommended): Docker Compose** on VPS. Three containers: `nginx`, `server` (Node.js), `postgres`. Simple, reproducible, easy to update.
- **Option B: Bare metal** with systemd services. More manual but fewer layers. Fine if comfortable with server administration.

**Recommendation:** Docker Compose. It provides reproducibility (same setup in dev and prod), easy postgres version management, and simple `docker compose up -d` deployments.

```yaml
# docker-compose.yml (production sketch)
services:
  postgres:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: mealprep
      POSTGRES_USER: mealprep
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: unless-stopped

  server:
    build: ./packages/server
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://mealprep:${DB_PASSWORD}@postgres:5432/mealprep
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./packages/web/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certbot:/etc/letsencrypt  # SSL certs
    depends_on:
      - server
    restart: unless-stopped

volumes:
  pgdata:
```

## Build Order Implications

Based on component dependencies, the recommended build order is:

### Phase 1: Data Foundation
Build the scraper and local storage first. Without recipes, nothing else works.
- Scraper (Jow.fr crawling)
- Local JSON storage with dedup
- Claude Code enrichment skill
- **Output:** A local JSON file with 20-50+ enriched recipes

### Phase 2: Server Core
Build the API server with database and recipe import.
- Postgres schema + migrations
- Server API skeleton (Express/Fastify)
- Recipe import endpoint (POST /api/recipes/import)
- Upload script (local -> server)
- **Output:** Recipes stored in Postgres, accessible via API

### Phase 3: User System
Add authentication and user profiles.
- Auth endpoints (register, login)
- User profile CRUD
- Sport schedule CRUD
- Auth middleware protecting all endpoints
- **Output:** Multi-user system with profiles

### Phase 4: Meal Plan Engine
The core algorithm. Requires recipes in DB + user profiles.
- Macro calculator (profile + sport -> weekly targets)
- Meal planner algorithm (greedy selection)
- Batch cooking logic
- Meal plan storage and retrieval
- **Output:** Working meal plan generation via API

### Phase 5: Frontend
Build the web interface. Requires all API endpoints to exist.
- Auth pages (login, register)
- Recipe browsing
- Profile configuration
- Sport schedule input
- Meal plan generation and display
- **Output:** Complete user-facing application

### Phase 6: Deployment
Deploy to VPS. Requires everything above.
- Docker Compose configuration
- Nginx setup with SSL
- Production environment variables
- Backup strategy for Postgres

**Rationale for this order:** Each phase produces a testable artifact. Phase 1 can be tested locally by inspecting JSON. Phase 2 can be tested with curl. Phase 3-4 can be tested with API tools (Postman/httpie). Phase 5 brings everything together visually. Phase 6 makes it live.

## Sources

- Architecture patterns based on established Node.js monolith patterns, RESTful API design, and PostgreSQL schema design conventions.
- Constraint-based meal planning draws from well-known knapsack/bin-packing algorithm patterns.
- Docker Compose deployment pattern is standard for single-VPS Node.js + Postgres deployments.
- **Confidence note:** WebSearch and WebFetch were unavailable during this research. Specific library versions (Playwright, Drizzle, Express, etc.) should be verified with current documentation during implementation phases. The architectural patterns themselves are well-established and HIGH confidence, but specific API details are MEDIUM confidence.

---
*Architecture research for: Meal prep / recipe recommendation SaaS*
*Researched: 2026-02-08*
