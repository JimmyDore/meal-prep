# Phase 3: Recipe Catalogue - Research

**Researched:** 2026-02-08
**Domain:** Next.js App Router (Server Components, searchParams), Drizzle ORM (pagination, full-text search, many-to-many filtering), shadcn/ui (catalogue UI)
**Confidence:** HIGH

## Summary

Phase 3 builds a recipe catalogue with pagination, full-text search, tag filtering, and a recipe detail page. The existing stack (Next.js 16 App Router, Drizzle ORM 0.45, PostgreSQL, shadcn/ui with Tailwind 4) provides everything needed -- no new dependencies are required beyond adding shadcn/ui components via the CLI.

The architecture follows the Next.js App Router pattern: Server Components fetch data directly from the database via Drizzle ORM, using URL search params for pagination, search, and filter state. This avoids building a separate API layer for the frontend. The only API routes needed are GET endpoints if we want to keep the option open for external consumers or client-side fetching, but for this catalogue, Server Components with direct DB access is the standard approach.

Full-text search uses PostgreSQL's native `to_tsvector`/`to_tsquery` with the `'french'` configuration (since recipe data is in French). For simple name search, `ilike` with `%query%` is also viable and simpler to implement. Tag filtering uses a many-to-many join through the `recipe_tags` junction table with `EXISTS` subqueries.

**Primary recommendation:** Use Server Components with direct Drizzle ORM queries, URL search params for all filter/pagination state, and PostgreSQL `ilike` for recipe name search (upgrade to full-text search later if needed).

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, routing | Already in project |
| Drizzle ORM | 0.45.1 | Database queries, pagination, filtering | Already in project |
| postgres.js | 3.4.8 | PostgreSQL driver | Already in project |
| React | 19.2.3 | UI rendering | Already in project |
| Tailwind CSS | 4 | Styling | Already in project |
| radix-ui | 1.4.3 | Accessible primitives | Already in project |
| shadcn/ui | 3.8.4 | UI components (installed via CLI) | Already configured |
| Lucide React | 0.563.0 | Icons | Already in project |
| Zod | 3.25.76 | Schema validation for search params | Already in project |

### shadcn/ui Components to Add
| Component | Purpose | Installation |
|-----------|---------|-------------|
| Card | Recipe cards in catalogue grid | `pnpm dlx shadcn@latest add card` |
| Badge | Tag display on recipe cards | `pnpm dlx shadcn@latest add badge` |
| Input | Search bar | `pnpm dlx shadcn@latest add input` |
| Button | Pagination controls, filter toggles | `pnpm dlx shadcn@latest add button` |
| Pagination | Page navigation | `pnpm dlx shadcn@latest add pagination` |
| Skeleton | Loading states | `pnpm dlx shadcn@latest add skeleton` |
| Separator | Visual dividers in detail page | `pnpm dlx shadcn@latest add separator` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Component direct DB | API Route + client fetch | Adds unnecessary API layer, slower, more code -- only needed for external consumers |
| `ilike` search | PostgreSQL full-text search (`to_tsvector`) | Full-text is more powerful (stemming, ranking) but more complex setup; `ilike` sufficient for name search on ~700 recipes |
| URL search params | Client state (useState) | URL params enable shareable links, browser back/forward, SSR -- strictly better for catalogue |
| Offset/limit pagination | Cursor-based pagination | Cursor is better for infinite scroll / large datasets; offset is simpler and standard for page-number navigation on ~700 recipes |

**Installation:**
```bash
pnpm dlx shadcn@latest add card badge input button pagination skeleton separator
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx                    # Root layout (existing)
│   ├── page.tsx                      # Redirect or home (existing, repurpose)
│   ├── recipes/
│   │   ├── page.tsx                  # Catalogue page (Server Component)
│   │   ├── loading.tsx               # Catalogue loading skeleton
│   │   └── [id]/
│   │       ├── page.tsx              # Recipe detail page (Server Component)
│   │       └── loading.tsx           # Detail loading skeleton
│   └── api/
│       └── recipes/
│           ├── route.ts              # GET /api/recipes (list with pagination, search, filter)
│           └── upload/
│               └── route.ts          # POST /api/recipes/upload (existing)
├── components/
│   ├── ui/                           # shadcn/ui components (auto-generated)
│   ├── recipe-card.tsx               # Recipe card component
│   ├── recipe-grid.tsx               # Grid of recipe cards
│   ├── search-bar.tsx                # Search input with debounce
│   ├── tag-filter.tsx                # Tag filter badges
│   ├── pagination-controls.tsx       # Pagination wrapper
│   └── macro-badge.tsx               # Macro nutrient display
├── db/
│   ├── schema/                       # Existing schema
│   └── queries/
│       └── recipes.ts                # Recipe query functions (reusable)
└── lib/
    ├── env.ts                        # Existing
    └── utils.ts                      # Existing (cn helper)
```

### Pattern 1: Server Component with searchParams
**What:** Page Server Components receive `searchParams` as a Promise (Next.js 16), await it, then query the DB directly.
**When to use:** Every catalogue/list page that needs filtering, search, pagination.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page
// src/app/recipes/page.tsx

import { db } from "@/db";
import { recipes } from "@/db/schema";

type SearchParams = Promise<{
  page?: string;
  q?: string;
  tags?: string | string[];
}>;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q || "";
  const tagSlugs = typeof params.tags === "string"
    ? [params.tags]
    : params.tags || [];

  const { recipes, totalCount } = await getRecipes({ page, query, tagSlugs });

  return (
    <div>
      <SearchBar defaultValue={query} />
      <TagFilter activeTags={tagSlugs} />
      <RecipeGrid recipes={recipes} />
      <PaginationControls currentPage={page} totalCount={totalCount} />
    </div>
  );
}
```

### Pattern 2: Reusable Query Functions with Drizzle
**What:** Extract DB queries into dedicated functions in `src/db/queries/` for reuse between Server Components and API routes.
**When to use:** Any database query that might be called from multiple places.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/limit-offset-pagination
// src/db/queries/recipes.ts

import { and, asc, count, eq, exists, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeTags, tags } from "@/db/schema";

const PAGE_SIZE = 12;

export async function getRecipes({
  page = 1,
  query = "",
  tagSlugs = [] as string[],
}) {
  // Build WHERE conditions dynamically
  const conditions = [];

  if (query) {
    conditions.push(ilike(recipes.title, `%${query}%`));
  }

  // Filter by tags: recipe must have ALL specified tags
  for (const slug of tagSlugs) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(recipeTags)
          .innerJoin(tags, eq(tags.id, recipeTags.tagId))
          .where(
            and(
              eq(recipeTags.recipeId, recipes.id),
              eq(tags.slug, slug),
            ),
          ),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Parallel: get page data and total count
  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(recipes)
      .where(whereClause)
      .orderBy(asc(recipes.title))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(recipes)
      .where(whereClause),
  ]);

  return {
    recipes: data,
    totalCount: total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    currentPage: page,
  };
}
```

### Pattern 3: Client-Side Search with URL Params
**What:** Search input updates URL search params with debouncing; page re-renders server-side.
**When to use:** Search bar, filter toggles, pagination controls.
**Example:**
```typescript
// src/components/search-bar.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";

export function SearchBar({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }
      params.delete("page"); // Reset to page 1
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <Input
      type="search"
      placeholder="Rechercher une recette..."
      defaultValue={defaultValue}
      onChange={(e) => updateSearch(e.target.value)}
      className={isPending ? "opacity-50" : ""}
    />
  );
}
```

### Pattern 4: Recipe Detail with Relational Query
**What:** Fetch single recipe with all relations (ingredients, tags) using Drizzle relational query API.
**When to use:** Detail pages that need nested/related data.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/rqb
// src/db/queries/recipes.ts

export async function getRecipeById(id: string) {
  return db.query.recipes.findFirst({
    where: (recipes, { eq }) => eq(recipes.id, id),
    with: {
      recipeIngredients: {
        with: {
          ingredient: true,
        },
      },
      recipeTags: {
        with: {
          tag: true,
        },
      },
    },
  });
}
```

### Pattern 5: API Route for GET with Query Parameters
**What:** Route Handler for GET /api/recipes that parses search params and returns paginated JSON.
**When to use:** When you want a reusable API endpoint (for potential future mobile app, or client-side fetching).
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/route-handlers
// src/app/api/recipes/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { getRecipes } from "@/db/queries/recipes";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const query = searchParams.get("q") || "";
  const tagSlugs = searchParams.getAll("tags");

  const result = await getRecipes({ page, query, tagSlugs });

  return NextResponse.json(result);
}
```

### Anti-Patterns to Avoid
- **Fetching from API routes in Server Components:** Don't call your own API from a Server Component. Query the DB directly instead. API routes are for external consumers or client components.
- **Client-side state for pagination/search:** Don't use `useState` for page/search/filters. Use URL search params so state is shareable, bookmarkable, and SSR-compatible.
- **N+1 queries for tags on cards:** Don't fetch tags per-recipe in a loop. Use a single query with joins or relational queries to get all recipes with their tags.
- **Building custom pagination components:** Use shadcn/ui Pagination component. It handles accessibility and ARIA labels.
- **Storing search state in global state (Redux/Zustand):** URL search params are the source of truth for catalogue state. No global state needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination UI | Custom prev/next buttons | `shadcn/ui Pagination` | Handles ellipsis, ARIA labels, keyboard navigation |
| Search debouncing | Custom debounce hook | `useTransition` + direct URL update | React 19's `useTransition` handles pending states natively; 300ms debounce via `setTimeout` in onChange is fine |
| Tag toggle UI | Custom checkbox/toggle group | `shadcn/ui Badge` as toggle buttons | Consistent styling, accessible |
| Recipe card layout | Custom card divs | `shadcn/ui Card` | Consistent border radius, shadow, hover states |
| Loading skeletons | Custom shimmer divs | `shadcn/ui Skeleton` + Next.js `loading.tsx` | Built-in Suspense integration |
| Image optimization | `<img>` tags | Next.js `<Image>` component | Automatic lazy loading, responsive sizing, format optimization |
| URL param parsing | Manual string parsing | `URLSearchParams` / `searchParams` prop | Standard Web API, handles arrays, encoding |

**Key insight:** The entire catalogue is achievable with Server Components + URL search params + Drizzle queries + shadcn/ui components. There is no need for client state management, SWR/React Query, or a separate API layer for the frontend.

## Common Pitfalls

### Pitfall 1: Next.js 16 searchParams is a Promise
**What goes wrong:** Accessing `searchParams.page` synchronously crashes in Next.js 15+.
**Why it happens:** Since Next.js 15, the `searchParams` page prop is a `Promise` that must be awaited.
**How to avoid:** Always `await searchParams` before accessing properties.
**Warning signs:** Runtime error "Cannot read properties of Promise".
```typescript
// WRONG
export default function Page({ searchParams }: { searchParams: { page: string } }) {
  const page = searchParams.page; // Crashes!
}

// CORRECT
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams;
  const page = params.page;
}
```

### Pitfall 2: French Accented Characters in Search
**What goes wrong:** Searching "pate" doesn't find "Pates Bolognaise" but "pâte" would require exact accent matching.
**Why it happens:** PostgreSQL `ILIKE` is case-insensitive but accent-sensitive by default.
**How to avoid:** Two options: (1) Use `unaccent()` function with the PostgreSQL `unaccent` extension, or (2) since the actual data (from Jow scraping) appears to already be unaccented in titles (e.g., "Pates Bolognaise" not "Pâtes"), `ilike` should work fine as-is. Verify with actual data.
**Warning signs:** Search returns no results for common French words.

### Pitfall 3: SQL Injection via ilike
**What goes wrong:** User input with `%` or `_` characters acts as wildcards in `ILIKE`.
**Why it happens:** These are PostgreSQL pattern characters.
**How to avoid:** Escape user input before passing to `ilike`. Replace `%` with `\%` and `_` with `\_`.
**Warning signs:** Unexpected search results when searching for special characters.
```typescript
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

// Usage
ilike(recipes.title, `%${escapeIlike(query)}%`)
```

### Pitfall 4: N+1 Queries for Recipe Tags in List View
**What goes wrong:** Fetching tags separately for each recipe in a loop creates N+1 queries.
**Why it happens:** Naive implementation fetches recipe list, then tags per recipe.
**How to avoid:** Either (a) use Drizzle relational queries with `with: { recipeTags: { with: { tag: true } } }` or (b) use a single SQL query with joins and aggregate tags in application code.
**Warning signs:** Slow page load, many database queries visible in logs.

### Pitfall 5: Missing next.config.ts Image Domain
**What goes wrong:** `<Image>` component throws "hostname not configured" error for Jow recipe images.
**Why it happens:** Next.js requires explicit allowlisting of external image domains.
**How to avoid:** Add `static.jow.fr` (and `img.jow.fr` for seed data) to `remotePatterns` in `next.config.ts`.
**Warning signs:** Broken images, console error about unconfigured hostname.
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.jow.fr",
      },
      {
        protocol: "https",
        hostname: "img.jow.fr",
      },
    ],
  },
};
```

### Pitfall 6: Pagination Off-by-One and Empty Pages
**What goes wrong:** Page 0 or negative pages, or navigating past the last page shows empty results.
**Why it happens:** Missing input validation on page parameter.
**How to avoid:** Clamp page to `Math.max(1, page)` and `Math.min(page, totalPages)`. Return 404 or redirect if page > totalPages.
**Warning signs:** Empty recipe grid on valid-looking URLs.

### Pitfall 7: Tag Filter State Lost on Search
**What goes wrong:** Typing in search bar clears active tag filters (or vice versa).
**Why it happens:** URL param updates replace all params instead of merging.
**How to avoid:** Always read existing `URLSearchParams`, modify only the relevant param, then push.
**Warning signs:** Filters reset when searching, or search resets when toggling a tag.

## Code Examples

### Recipe List Query with Pagination, Search, and Tag Filtering
```typescript
// Source: Drizzle ORM docs (limit-offset-pagination, select, operators)
// src/db/queries/recipes.ts

import { and, asc, count, eq, exists, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { recipes, recipeTags, tags } from "@/db/schema";

const PAGE_SIZE = 12;

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

interface GetRecipesParams {
  page?: number;
  query?: string;
  tagSlugs?: string[];
  pageSize?: number;
}

export async function getRecipes({
  page = 1,
  query = "",
  tagSlugs = [],
  pageSize = PAGE_SIZE,
}: GetRecipesParams) {
  const conditions = [];

  // Search by title (case-insensitive)
  if (query.trim()) {
    conditions.push(ilike(recipes.title, `%${escapeIlike(query.trim())}%`));
  }

  // Filter by tags: recipe must have ALL specified tags (AND logic)
  for (const slug of tagSlugs) {
    conditions.push(
      exists(
        db.select({ x: sql`1` })
          .from(recipeTags)
          .innerJoin(tags, eq(tags.id, recipeTags.tagId))
          .where(
            and(
              eq(recipeTags.recipeId, recipes.id),
              eq(tags.slug, slug),
            ),
          ),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(recipes)
      .where(whereClause)
      .orderBy(asc(recipes.title))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(recipes)
      .where(whereClause),
  ]);

  return {
    recipes: data,
    totalCount: total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
    pageSize,
  };
}
```

### Recipe Detail Query with Relations
```typescript
// Source: Drizzle ORM docs (rqb - relational queries)
// src/db/queries/recipes.ts

export async function getRecipeById(id: string) {
  return db.query.recipes.findFirst({
    where: (recipes, { eq }) => eq(recipes.id, id),
    with: {
      recipeIngredients: {
        with: {
          ingredient: true,
        },
      },
      recipeTags: {
        with: {
          tag: true,
        },
      },
    },
  });
}
```

### All Tags Query (for filter sidebar)
```typescript
// src/db/queries/tags.ts

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";

export async function getAllTags() {
  return db.select().from(tags).orderBy(asc(tags.name));
}
```

### Next.js Image with Jow Remote Pattern
```typescript
// Source: https://nextjs.org/docs/app/api-reference/components/image
import Image from "next/image";

<Image
  src={recipe.imageUrl || "/placeholder-recipe.png"}
  alt={recipe.title}
  width={304}
  height={304}
  className="aspect-square w-full object-cover"
/>
```

### Catalogue Page Server Component
```typescript
// src/app/recipes/page.tsx
import { Suspense } from "react";
import { getRecipes } from "@/db/queries/recipes";
import { getAllTags } from "@/db/queries/tags";

type SearchParams = Promise<{
  page?: string;
  q?: string;
  tags?: string | string[];
}>;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q || "";
  const tagSlugs = Array.isArray(params.tags)
    ? params.tags
    : params.tags
      ? [params.tags]
      : [];

  const [recipesResult, allTags] = await Promise.all([
    getRecipes({ page, query, tagSlugs }),
    getAllTags(),
  ]);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Recettes</h1>
      <SearchBar defaultValue={query} />
      <TagFilter tags={allTags} activeSlugs={tagSlugs} />
      <RecipeGrid recipes={recipesResult.recipes} />
      <PaginationControls
        currentPage={recipesResult.currentPage}
        totalPages={recipesResult.totalPages}
      />
    </main>
  );
}
```

### Recipe Detail Page Server Component
```typescript
// src/app/recipes/[id]/page.tsx
import { notFound } from "next/navigation";
import { getRecipeById } from "@/db/queries/recipes";

type Params = Promise<{ id: string }>;

export default async function RecipeDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const recipe = await getRecipeById(id);

  if (!recipe) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Recipe header, image, macros, ingredients, etc. */}
    </main>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` as sync object | `searchParams` as `Promise` (must await) | Next.js 15 (2024) | Page components must be `async`, `await searchParams` |
| `params` as sync object | `params` as `Promise` | Next.js 15 (2024) | Dynamic route params must be awaited |
| `getServerSideProps` | Server Components with direct data fetching | Next.js 13+ App Router | No special functions, just async components |
| `pages/api/` routes | `app/api/*/route.ts` Route Handlers | Next.js 13+ App Router | Web API Request/Response instead of Express-style |
| SWR/React Query for server data | Server Components + `use()` for streaming | React 19 / Next.js 15+ | Client-side fetching libraries unnecessary for SSR data |
| Drizzle relational queries v1 (`db._query`) | v2 API available (`db.query`) | Drizzle 0.45+ | Both APIs work; v1 is stable and well-documented |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: replaced by Server Components in App Router
- Synchronous `searchParams` / `params` access: deprecated since Next.js 15, will be removed
- `next/image` `domains` config: replaced by `remotePatterns` (more secure)

## Open Questions

1. **Full-text search vs ilike**
   - What we know: The dataset has ~700 recipes with French titles. `ilike` works for simple substring matching. PostgreSQL FTS with `'french'` config provides stemming (e.g., "poulet" matches "poulets").
   - What's unclear: Whether users will need stemming/fuzzy matching, or if substring search is sufficient.
   - Recommendation: Start with `ilike` (simpler, zero migration needed). Add a `tsvector` generated column + GIN index later if search quality is insufficient. The query abstraction in `getRecipes()` makes this a drop-in swap.

2. **Tag data completeness**
   - What we know: The upload endpoint accepts tags, and the scraper/enricher produces tag data. Seed data has 4 tags (Volaille, Rapide, Salade, Pates).
   - What's unclear: How many tags exist in the actual scraped dataset, and whether the dietary tags (vegetarien, sans gluten, sans porc) from requirements are present.
   - Recommendation: Query the actual database to check tag data before building the filter UI. If dietary tags are missing, they may need to be added via the enrichment pipeline or manual tagging.

3. **Image fallback strategy**
   - What we know: Scraped recipes use `static.jow.fr` URLs (`https://static.jow.fr/304x304/recipes/*.png`). Seed data uses `img.jow.fr`. Some recipes may have `null` imageUrl.
   - What's unclear: Whether `static.jow.fr` images are always available, or if some URLs are broken.
   - Recommendation: Use Next.js `<Image>` with a fallback placeholder for missing/broken images. Whitelist both `static.jow.fr` and `img.jow.fr` in next.config.ts.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - Limit/Offset Pagination](https://orm.drizzle.team/docs/guides/limit-offset-pagination) - pagination patterns
- [Drizzle ORM - PostgreSQL Full-Text Search](https://orm.drizzle.team/docs/guides/postgresql-full-text-search) - tsvector, GIN index, to_tsquery
- [Drizzle ORM - Full-Text Search with Generated Columns](https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns) - generated column pattern for search
- [Drizzle ORM - Select](https://orm.drizzle.team/docs/select) - WHERE, AND/OR, count()
- [Drizzle ORM - Joins](https://orm.drizzle.team/docs/joins) - innerJoin, leftJoin patterns
- [Drizzle ORM - Filters](https://orm.drizzle.team/docs/operators) - ilike, inArray, exists
- [Drizzle ORM - Dynamic Query Building](https://orm.drizzle.team/docs/dynamic-query-building) - $dynamic(), composable queries
- [Drizzle ORM - Relational Queries](https://orm.drizzle.team/docs/rqb) - findMany/findFirst with `with` clause
- [Drizzle ORM - Select Parent with Child Rows](https://orm.drizzle.team/docs/guides/select-parent-rows-with-at-least-one-related-child-row) - exists() subquery
- [Next.js - Page searchParams](https://nextjs.org/docs/app/api-reference/file-conventions/page) - Promise-based searchParams
- [Next.js - Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) - Server Component patterns
- [Next.js - Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) - API GET endpoints
- [Next.js - Image Component](https://nextjs.org/docs/app/api-reference/components/image) - remotePatterns config
- [shadcn/ui - Pagination](https://ui.shadcn.com/docs/components/radix/pagination) - pagination component
- [PostgreSQL - unaccent extension](https://www.postgresql.org/docs/current/unaccent.html) - accent-insensitive search

### Secondary (MEDIUM confidence)
- [Next.js Learn - Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - official tutorial pattern
- [Next.js - Data Fetching Best Practices Discussion](https://github.com/vercel/next.js/discussions/72919) - Server Components vs API routes

### Tertiary (LOW confidence)
- [Stop Next.js 16 Crashes: searchParams](https://www.buildwithmatija.com/blog/stop-nextjs-16-from-crashing-on-searchparams) - Next.js 16 specific searchParams changes (could not verify, 429 error)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, verified via package.json and official docs
- Architecture: HIGH - Patterns verified against official Next.js 16 and Drizzle ORM 0.45 documentation
- Search/filter implementation: HIGH - Drizzle `ilike`, `exists`, `count`, `limit/offset` verified against official docs
- Pitfalls: HIGH - searchParams Promise pattern verified against Next.js docs; ilike escaping is standard SQL knowledge
- shadcn/ui components: HIGH - Components exist in registry, installation via CLI is documented

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable stack, no fast-moving dependencies)
