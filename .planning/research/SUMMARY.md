# Project Research Summary

**Project:** Meal Prep / Recipe Recommendation SaaS
**Domain:** Macro-optimized meal planning with recipe scraping and automated weekly plan generation
**Researched:** 2026-02-08
**Confidence:** MEDIUM-HIGH (stack/architecture patterns verified; specific Jow.fr integration details need validation during implementation)

## Executive Summary

This is a macro-optimized meal planning SaaS that automatically generates weekly meal plans (lunch + dinner for 7 days) tailored to users' fitness goals. The core differentiator is combining algorithmic meal plan generation with recipes sourced from Jow.fr, which users can then order via Leclerc Drive. Unlike generic meal planners (Eat This Much) or simple recipe platforms (Jow), this product bridges macro-based fitness goals with real-world grocery ordering convenience.

The recommended technical approach is a monolithic Next.js 16 application on a self-hosted VPS with PostgreSQL, using a local scraping pipeline (Playwright + Claude Code enrichment) to build the recipe database. The architecture separates cleanly into: (1) local zone (scraping + enrichment), (2) server zone (API + meal plan algorithm + web frontend). The meal plan engine uses constraint-based selection rather than pure optimization to ensure variety and edibility while hitting macro targets.

Three critical risks dominate: (1) scraping pipeline fragility when Jow.fr changes structure, (2) nutritional data accuracy from LLM enrichment creating garbage-in-garbage-out, and (3) batch cooking portion math errors that break macro calculations. All three are mitigable with validation layers, ingredient database canonicalization, and careful data modeling. The product's success depends entirely on macro accuracy — users will forgive imperfect UX but not broken nutritional data.

## Key Findings

### Recommended Stack

**Core decision: Next.js 16 full-stack monolith on self-hosted VPS.** This eliminates the need for a separate API server (Server Actions handle mutations), supports both SSR and client-side interactivity (React Query), and deploys as a single Docker container. PostgreSQL 16+ is the constraint. Drizzle ORM over Prisma for lighter VPS footprint. Better Auth 1.4.x replaces deprecated Lucia for self-hosted authentication.

**Core technologies:**
- **Next.js 16.1.6 + React 19.2.4**: Full-stack framework with Server Components and Server Actions, eliminates dual-server architecture, self-hostable via Docker
- **PostgreSQL 16+ + Drizzle ORM 0.45.1**: Relational data (users, recipes, meal plans) with JSONB flexibility for macros/ingredients, SQL-like ORM for VPS resource efficiency
- **Better Auth 1.4.18**: Self-hosted auth (Lucia is deprecated), works with Postgres via Drizzle adapter, no external dependency
- **Playwright 1.58.2 (local scraper)**: Headless browser for Jow.fr scraping (modern SPA requires JS execution), also used for E2E testing
- **Tailwind CSS 4.1.18 + shadcn/ui 3.8.4**: Utility-first styling, pre-built accessible components for forms/tables/dashboards
- **Zod 3.x + next-safe-action**: Type-safe validation for API inputs, scraped data, and Server Actions (note: use Zod 3.x for ecosystem compatibility, defer v4 until libs catch up)

**Critical version notes:** Next.js 16 requires React 19 (not 18). Zod 4 is too new — start with Zod 3.x to avoid peer dependency conflicts with Better Auth and next-safe-action.

### Expected Features

**Must have (table stakes):**
- **Recipe catalog with search/filter** — users need to browse and trust the data source
- **Macronutrient display per recipe** — this is a macro-first product, protein/carbs/fats must be prominent
- **User profile with goals** — weight, height, age, sex, activity level, goal (cut/bulk/maintain) drives TDEE calculation
- **Weekly meal plan generation** — the core value: automated lunch + dinner for 7 days optimized for macro targets
- **Macro summary per plan** — daily and weekly totals vs targets with visual indicators (on target / over / under)
- **Dietary preference filtering** — vegetarian, vegan, gluten-free, lactose-free, no pork; applied during generation
- **Authentication and multi-user** — SaaS requires user accounts, data isolation
- **Portion sizing** — calculate real portions from macro data (Jow portions are unreliable per PROJECT.md)

**Should have (competitive differentiators):**
- **Batch cooking support (x2, x3)** — most competitors ignore this; calculate real portions when cooking double/triple with correct macro math
- **Sport schedule integration** — users input weekly sport sessions, system adjusts macro targets based on training load
- **Automated recipe selection** — eliminate choice fatigue; algorithm picks recipes, not the user
- **Macro-optimized algorithm** — not just calorie matching; actively optimize protein/carbs/fats distribution
- **Plan customization (lock/swap meals)** — lock good meals, regenerate bad ones without starting over
- **Shopping list generation** — aggregate ingredients across weekly plan with batch cooking awareness

**Defer (v2+):**
- **Training-day vs rest-day macro split** — weekly target is sufficient for v1
- **Custom recipe creation** — user-submitted recipes break the Jow ordering value prop
- **Mobile app** — responsive web app works in mobile browsers, PWA if needed
- **Social features** — massive scope increase, distracts from core value
- **Micronutrient tracking** — data availability is poor, adds UI complexity

### Architecture Approach

**Two-zone architecture with API boundary.** Local zone (developer machine) handles scraping and enrichment. Server zone (VPS) handles the web app, API, and meal plan engine. They communicate via a single upload API endpoint authenticated with bearer token.

**Major components:**
1. **Scraper (local)** — Playwright crawls Jow.fr, extracts structured recipe data (title, ingredients, portions, time, photo), stores as local JSON with duplicate detection
2. **Enrichment pipeline (local)** — Claude Code skill analyzes ingredients and estimates macros per portion, enriches local JSON, validates with sanity bounds
3. **Upload script (local)** — pushes enriched recipes to server API via HTTP POST, idempotent upsert by Jow recipe ID
4. **Server API (VPS)** — Next.js API Routes + Server Actions, handles auth, recipe CRUD, user profiles, sport schedules, meal plan generation
5. **Meal Plan Engine (server)** — constraint-based recipe selection algorithm, greedy heuristic optimizes for macro targets while enforcing variety/preferences/batch cooking
6. **Web Frontend (VPS)** — Next.js App Router SPA, recipe browsing, profile config, sport schedule input, meal plan display
7. **PostgreSQL (VPS)** — recipes, users, profiles, sport_sessions, meal_plans, meal_plan_items tables with proper indexes

**Key pattern: Pipeline architecture for data ingestion.** Each stage (scrape -> store -> enrich -> upload) is independently runnable and idempotent. Local JSON storage acts as checkpoint between stages. Manual orchestration (developer decides when to run each stage) is correct for v1 — recipe data changes infrequently, no real-time sync needed.

**Key pattern: Constraint-based meal planning (knapsack variant).** Given N recipes with known macros, select 14 meal slots (7 days x 2 meals) such that total macros approach weekly target. Greedy heuristic is sufficient for v1 (no need for linear programming). Add constraints incrementally: variety (no repeats), dietary preferences, cook time, batch cooking opportunities.

### Critical Pitfalls

1. **Brittle scraping with no change detection** — Jow.fr changes HTML/API structure, scraper silently produces garbage data. Prevention: schema validation on every scraped recipe (Zod contract), checksum page structure, separate scrape from upload, version scraper config not code. Address in Phase 1.

2. **Nutritional data accuracy garbage-in-garbage-out** — macro enrichment produces plausible but inaccurate data (LLM hallucination, ingredient ambiguity, portion parsing errors). Prevention: build verified ingredient-to-macro lookup table from CIQUAL (French national food composition database), separate enrichment into parsing + lookup steps, implement sanity checks (400-800 kcal per serving), track confidence scores. Address in Phase 2.

3. **Batch cooking portion math that silently breaks** — multiplying batch size corrupts per-serving macros or ingredient quantities. Prevention: store macros per-100g of each ingredient (not per-serving), derive per-serving dynamically, handle non-linear scaling (spices, fixed ingredients), display both per-serving and total batch macros. Address in Phase 2 (data model decision).

4. **Recommendation algorithm produces inedible plans** — perfectly hits macro targets but generates repetitive/absurd/impractical meal plans. Prevention: constraint-based selection not pure optimization, enforce variety rules explicitly (max 2 same protein/week), categorize recipes properly (meal_type, cuisine_type, prep_time, season_fit), use macro targets as range (+/-10%), implement user veto feedback. Address in Phase 3.

5. **Multi-tenant data leakage** — user A sees user B's meal plan. Prevention: Row-Level Security (RLS) in Postgres from day one, set session variable in API middleware, test with multiple users from start, separate shared data (recipes) from user data (meal plans). Address in Phase 4.

## Implications for Roadmap

Based on research, suggested phase structure with clear dependencies:

### Phase 1: Recipe Data Pipeline (Foundation)
**Rationale:** Without recipes with macros, nothing else works. This is the foundational data layer. The scraper, enrichment, and upload pipeline must be validated before building the recommendation engine.

**Delivers:**
- Local scraper crawling Jow.fr recipe pages
- Local JSON storage with duplicate detection
- Claude Code enrichment skill for macro estimation
- Upload script pushing to server API
- 50-100+ enriched recipes in local store
- Server API endpoint for recipe import (authenticated, idempotent upsert)

**Addresses features:**
- Recipe catalog (data source)
- Macronutrient display per recipe (enriched data)

**Avoids pitfalls:**
- Brittle scraping (schema validation, config-driven selectors)
- Anti-scraping exposure (rate limiting, respect robots.txt, store only factual data)

**Research flag:** Medium — requires inspecting Jow.fr structure to determine if Playwright is needed or if HTTP + Cheerio suffices. Test for client-side rendering.

---

### Phase 2: Server Core + Database Schema
**Rationale:** Establishes the server API and database schema. This phase locks in critical data model decisions (where macros are stored, how portions are calculated). Must get this right before building features that depend on it.

**Delivers:**
- PostgreSQL schema with migrations (recipes, users, profiles, sport_sessions, meal_plans, meal_plan_items)
- Recipe import endpoint with validation
- Recipe CRUD API (list, get, filter by dietary tags)
- Portion calculation logic (macros per-100g or per-serving)
- Docker Compose for local dev (Postgres + server)

**Uses stack:**
- PostgreSQL 16+ + Drizzle ORM + drizzle-kit for migrations
- Next.js API Routes
- Zod for validation

**Avoids pitfalls:**
- Batch cooking portion math (correct data model: macros per-100g or per-serving with clear normalization)
- Ingredient normalization gaps (canonical ingredient entries)

**Research flag:** Low — PostgreSQL schema design follows standard patterns for recipe/user/plan storage.

---

### Phase 3: Authentication + User System
**Rationale:** Multi-user isolation must be in place before building user-specific features (profiles, sport schedules, meal plans). Row-Level Security (RLS) is easier to implement on a fresh schema than retrofit later.

**Delivers:**
- Better Auth integration (email/password registration, login, sessions)
- Auth middleware protecting all user-scoped endpoints
- User profile CRUD (weight, height, age, sex, activity level, goal, dietary preferences)
- Sport schedule CRUD (weekly sessions with type, duration, intensity)
- Multi-tenant isolation via RLS policies
- TDEE and macro target calculation from profile + sport schedule

**Addresses features:**
- User profile with goals (table stakes)
- Sport schedule integration (differentiator)

**Avoids pitfalls:**
- Multi-tenant data leakage (RLS from day one, test with 2+ users)

**Research flag:** Low — Better Auth + Drizzle adapter follows documented patterns. TDEE calculation formulas (Mifflin-St Jeor, Harris-Benedict) are well-established.

---

### Phase 4: Meal Plan Generation Algorithm
**Rationale:** The core algorithmic heart of the product. Requires recipes in database, user profiles, and macro targets. This is the highest-risk phase technically — the algorithm must balance macro optimization with variety, preferences, and batch cooking.

**Delivers:**
- Macro calculator service (profile + sport -> weekly macro targets)
- Meal planner algorithm (constraint-based greedy selection)
- Batch cooking logic (assign same recipe to multiple slots)
- Meal plan storage (meal_plans + meal_plan_items tables)
- Plan generation API endpoint
- Plan regeneration (full plan refresh)
- Macro summary (daily + weekly totals vs targets)

**Addresses features:**
- Weekly meal plan generation (table stakes, core value)
- Macro summary per plan (table stakes)
- Automated recipe selection (differentiator)
- Macro-optimized algorithm (differentiator)

**Implements architecture:**
- Meal Plan Engine (constraint-based knapsack variant)

**Avoids pitfalls:**
- Inedible meal plans (variety constraints, recipe categorization, range-based targets)
- Algorithm performance (greedy heuristic, indexed queries)

**Research flag:** High — constraint satisfaction with batch cooking interactions is complex. May need phase-specific research for algorithm design patterns. Consider separating into two phases: (4a) basic algorithm without batch cooking, (4b) add batch cooking.

---

### Phase 5: Web Frontend (User Interface)
**Rationale:** Requires all API endpoints to exist (auth, recipes, profiles, sport schedules, meal plans). This is pure presentation layer — no business logic. Can be built in parallel with Phase 4 if API contracts are defined first.

**Delivers:**
- Auth pages (login, register, logout)
- Recipe browsing with search/filter
- Profile configuration form
- Sport schedule weekly input
- Meal plan generation trigger
- Weekly meal plan display (7 days x 2 meals grid)
- Macro summary visualization (progress bars, color coding)
- Recipe detail view with link to Jow

**Addresses features:**
- Recipe catalog with search/filter (table stakes)
- Macronutrient display per recipe (table stakes)
- Plan regeneration (table stakes)

**Uses stack:**
- Next.js App Router pages
- shadcn/ui components (forms, tables, cards)
- Recharts for macro visualizations
- Tailwind CSS 4

**Research flag:** Low — standard Next.js + React patterns for forms, data fetching, and state management.

---

### Phase 6: Plan Customization (Lock/Swap)
**Rationale:** v1.x enhancement. Users will request the ability to keep some meals and regenerate others. This requires partial regeneration with constraints (locked meals' macros count toward weekly budget).

**Delivers:**
- Lock/unlock individual meals in a plan
- Swap single meal (find replacement that keeps totals close to target)
- Partial plan regeneration

**Addresses features:**
- Plan customization (competitive differentiator)

**Research flag:** Medium — partial regeneration with budget constraints adds complexity to the algorithm.

---

### Phase 7: Shopping List + Plan History
**Rationale:** v1.x enhancements. Shopping list is user-requested but not core to validating the recommendation algorithm. Plan history enables variety constraints ("don't repeat last week's meals").

**Delivers:**
- Shopping list generation (aggregate ingredients across week)
- Ingredient unit normalization (200g + 300g = 500g)
- Batch cooking quantity scaling
- Plan history storage and display
- Variety constraint ("avoid recipes from last N weeks")

**Addresses features:**
- Shopping list generation (differentiator)
- Plan history (differentiator)

**Avoids pitfalls:**
- Shopping list aggregation (unit normalization, batch cooking awareness)

**Research flag:** Low — aggregation and unit conversion are standard data processing patterns.

---

### Phase 8: VPS Deployment + Production Hardening
**Rationale:** Final phase. Everything works locally, now deploy to VPS. Includes SSL, backups, monitoring, and production environment configuration.

**Delivers:**
- Docker Compose production config (nginx, server, postgres)
- Nginx reverse proxy with SSL (Caddy or certbot)
- PostgreSQL backup strategy (pg_dump cron or WAL archiving)
- Environment variable management
- GitHub Actions CI/CD (optional)
- Production monitoring (logs, uptime)

**Uses stack:**
- Docker + Docker Compose
- Caddy 2.x or Nginx
- PostgreSQL 16+

**Avoids pitfalls:**
- No automated backups (verify with restore test)

**Research flag:** Low — Docker Compose + VPS deployment is well-documented.

---

### Phase Ordering Rationale

**Dependency-driven order:**
- Phase 1 must come first (data pipeline is prerequisite for everything)
- Phase 2 before Phase 3 (schema must exist before adding auth tables)
- Phase 3 before Phase 4 (user profiles and macro targets required by meal planner)
- Phase 4 before Phase 5 (frontend needs API endpoints to exist)
- Phase 6-7 are independent enhancements (order flexible)
- Phase 8 is last (deployment requires complete app)

**Risk mitigation order:**
- Phase 1-2 address the highest-risk pitfalls (brittle scraping, macro accuracy, portion math)
- Phase 3 prevents multi-tenant leakage before user data accumulates
- Phase 4 is the core algorithm — isolate it from frontend complexity
- Phase 5-7 are lower-risk UX enhancements

**Value delivery order:**
- Phase 1-4 deliver the MVP: automated macro-optimized meal plans
- Phase 5 makes it user-facing
- Phase 6-7 add polish based on user feedback
- Phase 8 makes it production-ready

**Suggested split for batch cooking:**
Consider splitting Phase 4 into:
- **Phase 4a:** Basic meal plan generation (no batch cooking, simpler algorithm)
- **Phase 4b:** Add batch cooking support (more complex, can validate algorithm first)

This allows validating the core selection algorithm before adding batch cooking's combinatorial complexity.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1 (Scraping):** Inspect Jow.fr live to determine scraping approach (Playwright vs HTTP + Cheerio), identify API endpoints, test for anti-scraping measures
- **Phase 4 (Meal Plan Algorithm):** Constraint satisfaction with batch cooking is complex; may need phase-specific research on greedy heuristics, scoring functions, and variety constraint strategies

**Phases with standard patterns (skip phase research):**
- **Phase 2 (Server Core):** PostgreSQL schema design, Next.js API Routes, Drizzle migrations are well-documented
- **Phase 3 (Auth):** Better Auth + Drizzle integration follows documented patterns
- **Phase 5 (Frontend):** Next.js + React + shadcn/ui are standard web development patterns
- **Phase 7 (Shopping List):** Aggregation and unit conversion are standard data processing
- **Phase 8 (Deployment):** Docker Compose + VPS deployment is well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version numbers verified via npm registry 2026-02-08. Next.js + PostgreSQL + Drizzle + Better Auth are proven for this use case. Zod 3.x compatibility caveat noted. |
| Features | MEDIUM-HIGH | Table stakes and differentiators based on competitor analysis (Eat This Much, Mealime, Jow, MyFitnessPal) from training data. Specific Jow.fr features unverified (WebSearch unavailable). Feature dependencies are logical and HIGH confidence. |
| Architecture | HIGH | Monorepo structure, pipeline architecture, constraint-based algorithm, upsert pattern, and VPS deployment are all well-established patterns. Specific library APIs (Playwright, Drizzle) should be verified during implementation. |
| Pitfalls | HIGH | Scraping fragility, nutritional accuracy, portion math errors, and multi-tenant leakage are universally documented challenges in this domain. CIQUAL as French nutrition database is confirmed (table-ciqual.fr). Jow.fr-specific anti-scraping measures are LOW confidence (need live verification). |

**Overall confidence:** MEDIUM-HIGH

The technology stack, architectural patterns, and pitfall mitigation strategies are all HIGH confidence based on established best practices. The main uncertainties are Jow.fr-specific: scraping approach, API structure, anti-scraping measures, recipe data format. These can only be resolved by inspecting the live site during Phase 1 implementation.

### Gaps to Address

**During Phase 1 (Scraping):**
- **Jow.fr structure inspection:** Determine if Playwright is necessary or if HTTP + Cheerio suffices. Check for client-side rendering. Inspect network traffic for internal API endpoints. Verify recipe URL patterns and identifier stability.
- **Anti-scraping measures:** Test for rate limiting, Cloudflare challenges, bot detection. Document observed behavior.
- **Recipe data format:** Confirm ingredient list structure, portion/serving representation, available metadata (cook time, cuisine, dietary tags).

**During Phase 2 (Enrichment):**
- **CIQUAL integration:** Verify CIQUAL data format and access method (CSV download? API?). Build ingredient matching strategy (exact match, fuzzy match, embedding similarity).
- **Claude Code enrichment accuracy:** Benchmark enrichment against 10-20 manually verified recipes. Measure error margins. Tune prompts and validation rules based on results.
- **Portion normalization:** Establish canonical portion size (per-100g? per-serving?) and document conversion logic clearly.

**During Phase 4 (Algorithm):**
- **Batch cooking combinatorics:** Test algorithm performance with batch cooking enabled. Verify that variety constraints interact correctly with batch assignments (a x3 batch counts as 3 meal slots, should not repeat the same protein elsewhere).
- **Algorithm tuning:** Scoring function weights (how much to prioritize macro closeness vs variety vs prep time). This requires user feedback and iteration.

**Post-launch validation:**
- **Macro accuracy:** Compare generated meal plan totals against users' tracking apps (MyFitnessPal, MacroFactor). Collect feedback on accuracy perception.
- **Plan quality:** Track regeneration rate (how often users immediately regenerate plans). High regeneration = algorithm needs tuning.
- **Jow ordering conversion:** Track how many users actually order recipes via Jow links. This validates the core value proposition.

## Sources

### Primary (HIGH confidence)
- **npm registry (2026-02-08):** All version numbers verified (Next.js 16.1.6, React 19.2.4, Drizzle ORM 0.45.1, Better Auth 1.4.18, Playwright 1.58.2, Tailwind CSS 4.1.18, etc.)
- **Lucia Auth deprecation:** Confirmed via npm (DEPRECATED status), Better Auth confirmed as community-recommended successor
- **PostgreSQL Row-Level Security (RLS):** Postgres feature documentation, standard multi-tenancy pattern
- **TDEE calculation formulas:** Mifflin-St Jeor and Harris-Benedict are established nutritional science
- **CIQUAL:** French national food composition database (table-ciqual.fr), verified existence and purpose

### Secondary (MEDIUM confidence)
- **Competitor feature analysis:** Eat This Much, Mealime, Jow, MyFitnessPal, MacroFactor based on training data knowledge (not live-verified as of 2026-02-08, WebSearch unavailable)
- **Next.js architectural patterns:** Server Components + Server Actions for full-stack apps, established pattern in Next.js 13-16
- **Drizzle vs Prisma for VPS:** Community consensus that Drizzle is lighter (no engine binary), verified via multiple sources in training data
- **Scraping best practices:** Rate limiting, robots.txt compliance, copyright considerations for recipe data

### Tertiary (LOW confidence, needs validation)
- **Jow.fr specifics:** SPA architecture assumption (likely React/Next.js based on typical modern recipe platforms), API endpoint structure, anti-scraping measures, recipe data format — all require live inspection during Phase 1
- **French ingredient measurement conventions:** "c.a.s." = tablespoon, "verre" = cup — typical French cooking patterns but exact usage in Jow recipes needs verification

---
*Research completed: 2026-02-08*
*Ready for roadmap: yes*
