# Stack Research

**Domain:** Meal prep / recipe recommendation SaaS (web app)
**Researched:** 2026-02-08
**Confidence:** HIGH (versions verified via npm registry; architectural rationale from established patterns)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | Full-stack web framework | Industry standard for React SSR/SSG. Server Components + Server Actions eliminate the need for a separate API layer for the web app. App Router is mature at v16. Self-hostable via `next start` in Docker on VPS. |
| React | 19.2.4 | UI library | Required by Next.js 16. Server Components reduce client bundle. Stable, massive ecosystem. |
| TypeScript | 5.9.3 | Type safety | Non-negotiable for a multi-component system (web app + scraper + API). Catches entire classes of bugs at compile time. |
| PostgreSQL | 16+ | Primary database | Already chosen constraint. Excellent for structured recipe/nutrition data, relational queries (user -> meal plan -> recipes -> ingredients), and JSONB for flexible recipe metadata. |
| Drizzle ORM | 0.45.1 | Database ORM | SQL-like syntax means you think in SQL not abstractions. Lighter than Prisma (no engine binary), better for VPS resource constraints. Type-safe schema-as-code. Excellent PostgreSQL support. |
| Better Auth | 1.4.18 | Authentication | The successor to Lucia (which is officially deprecated). Framework-agnostic, self-hosted, works with any database including Postgres via Drizzle adapter. Supports email/password, OAuth, 2FA. No external auth service dependency -- critical for VPS self-hosting. |
| Tailwind CSS | 4.1.18 | Styling | Utility-first CSS, co-located with components. v4 uses CSS-first configuration (no tailwind.config.js). Pairs with shadcn/ui for pre-built accessible components. |
| Playwright | 1.58.2 | Recipe scraping (local scripts) | Headless browser automation for scraping Jow.fr. Handles JavaScript-rendered content, cookie consent dialogs, and dynamic loading. More reliable than HTTP-only scrapers for modern SPAs. |

### Database & Data Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| drizzle-kit | 0.31.8 | Schema migrations | Companion to Drizzle ORM. Generates SQL migrations from schema changes. `drizzle-kit push` for dev, `drizzle-kit migrate` for production. |
| postgres (pg driver) | 3.4.8 | PostgreSQL driver | `postgres` (porsager/postgres) is a modern, fast PostgreSQL driver for Node.js. Drizzle integrates natively. Preferred over `pg` for new projects due to better TypeScript support and performance. |
| Zod | 4.3.6 | Schema validation | Runtime validation for API inputs, form data, scraped recipe data, and environment variables. v4 is the latest major -- ensure compatibility with Drizzle and Better Auth. |

### UI Components

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn/ui | 3.8.4 (CLI) | Component library | Not a dependency -- copies accessible, customizable components into your project. Built on Radix UI primitives. Perfect for dashboards, forms, data tables needed in meal prep apps. |
| Radix UI | 1.2.4+ | Accessible primitives | Underlying primitives for shadcn/ui. Handles focus management, keyboard navigation, ARIA attributes. |
| Recharts | 3.7.0 | Charts/graphs | For macro-nutrient visualizations (protein/carbs/fat breakdowns, weekly intake graphs). Built on D3, React-native API. |
| @tanstack/react-table | 8.21.3 | Data tables | Headless table logic for recipe lists, meal plan views, ingredient tables. Pairs with shadcn/ui table components. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.90.20 | Server state management | Client-side data fetching and caching for interactive features (real-time meal plan updates, recipe browsing). Use alongside Server Components for the best of both worlds. |
| date-fns | 4.1.0 | Date manipulation | Weekly meal plan date logic, sport schedule handling. Tree-shakeable, no global mutation (unlike Moment.js). |
| next-safe-action | 8.0.11 | Type-safe Server Actions | Wraps Next.js Server Actions with Zod validation, error handling, and middleware. Eliminates boilerplate for form submissions and mutations. |
| next-intl | 4.8.2 | Internationalization | French market primary, but i18n-ready from day one costs almost nothing with next-intl. Server Component support built in. |
| @t3-oss/env-nextjs | 0.13.10 | Env variable validation | Type-safe environment variables with Zod schemas. Catches missing env vars at build time, not runtime. |
| Resend | 6.9.1 (SDK) | Transactional email | For auth emails (verification, password reset). Simple API, good free tier. Self-hosted alternative: SMTP directly, but Resend is simpler. |
| react-email | 5.2.8 | Email templates | React components for email templates. Pairs with Resend. |
| Cheerio | 1.2.0 | HTML parsing | Lightweight HTML parsing for scraping simpler pages or post-processing Playwright-captured HTML. Faster than running a full browser when JS rendering isn't needed. |

### Scraping Stack (Local Scripts)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Playwright | 1.58.2 | Browser automation | Jow.fr is a modern SPA -- needs JavaScript execution. Playwright handles this reliably. Run headless on local machine. |
| Cheerio | 1.2.0 | HTML parsing | For extracting structured data from captured page HTML. Faster than Playwright selectors for bulk extraction. |
| Zod | 4.3.6 | Data validation | Validate scraped recipe data against a schema before upload. Catch malformed data early. |
| @anthropic-ai/sdk | 0.74.0 | Claude API | For macro-nutrient enrichment via Claude (programmatic alternative to Claude Code manual process). |

### Infrastructure & Deployment

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Docker | 23.0+ | Containerization | Reproducible builds, easy VPS deployment. Multi-stage builds for small images. |
| Docker Compose | 2.x | Multi-service orchestration | Run Next.js app + PostgreSQL + (optional) Redis in one command. Perfect for single-VPS deployment. |
| Caddy | 2.x | Reverse proxy + TLS | Automatic HTTPS via Let's Encrypt. Simpler than Nginx for this use case. Zero-config TLS renewal. |
| GitHub Actions | - | CI/CD | Build Docker image, run tests, push to registry, deploy to VPS via SSH. Free for public repos. |
| pnpm | 10.29.1 | Package manager | Faster than npm, strict dependency resolution, disk-efficient. Monorepo-friendly if scraper becomes a separate package. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| ESLint | 10.0.0 | Linting | v10 is flat config only. Next.js 16 provides built-in ESLint config. |
| Prettier | 3.8.1 | Code formatting | Consistent code style. Use prettier-plugin-tailwindcss for class sorting. |
| Vitest | 4.0.18 | Unit/integration testing | Fast, ESM-native, compatible with Next.js. Preferred over Jest for new projects. |
| Playwright Test | 1.58.2 | E2E testing | Same tool used for scraping, also handles E2E tests. One dependency, two purposes. |

## Installation

```bash
# Initialize project
pnpm create next-app@latest meal-prep --typescript --tailwind --eslint --app --src-dir

# Core dependencies
pnpm add drizzle-orm postgres better-auth zod @tanstack/react-query date-fns next-safe-action next-intl @t3-oss/env-nextjs recharts

# UI (shadcn/ui is installed via CLI, not npm)
pnpm dlx shadcn@latest init

# Email
pnpm add resend react-email

# Scraping (can be in a separate workspace or scripts/ directory)
pnpm add playwright cheerio @anthropic-ai/sdk

# Dev dependencies
pnpm add -D drizzle-kit typescript @types/node vitest prettier eslint-config-prettier prettier-plugin-tailwindcss
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Framework | Next.js 16 | Nuxt 4 (v4.3.1) | If team prefers Vue over React. Nuxt 4 is excellent but smaller ecosystem for component libraries (no shadcn/ui equivalent as mature). |
| Framework | Next.js 16 | SvelteKit | If team knows Svelte. Smaller ecosystem, fewer ready-made UI components for dashboards. |
| ORM | Drizzle | Prisma 7 (v7.3.0) | If team already knows Prisma. Prisma 7 has improved but still heavier (engine binary), slower cold starts. Drizzle is better for VPS with limited resources. |
| Auth | Better Auth | NextAuth/Auth.js (v4.24.13) | If only OAuth social login is needed. Auth.js has wider adoption but more complex self-hosted setup. Better Auth is newer but actively developed, built for self-hosting. |
| Auth | Better Auth | Clerk/Auth0 | Never for this project -- external SaaS auth services add cost, external dependency, and latency. VPS self-hosting means own your auth. |
| Scraping | Playwright | Puppeteer | If Chrome-only is fine. Playwright supports Firefox/WebKit too, better API, better maintained by Microsoft. |
| Scraping | Playwright | HTTP + Cheerio only | If Jow.fr serves full HTML without JS rendering. Test first -- if it works, skip the browser overhead. |
| Reverse proxy | Caddy | Nginx | If team has Nginx experience. Nginx is more configurable but requires manual cert management (certbot). Caddy is simpler for single-app deployments. |
| Reverse proxy | Caddy | Traefik | If running multiple apps/services with Docker. Traefik auto-discovers Docker containers. Overkill for a single app. |
| Email | Resend | Nodemailer + SMTP | If budget is zero. Use Nodemailer with a free SMTP provider (Brevo/Sendinblue). More setup, less polished. |
| Charts | Recharts | Chart.js / react-chartjs-2 | If simpler charts needed. Recharts has better React integration and is more declarative. |
| Package manager | pnpm | npm | If simplicity matters more than speed. npm works fine, just slower installs and more disk usage. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Lucia Auth | **Officially deprecated** (checked npm: `DEPRECATED`). Author recommends migrating away. | Better Auth 1.4.x |
| Moment.js | Abandoned, massive bundle size (330KB), mutates dates. | date-fns 4.x (tree-shakeable, immutable) |
| Express.js (for the web app) | Unnecessary -- Next.js Server Actions and API Routes handle all server needs. Adding Express creates a dual-server architecture with no benefit. | Next.js API Routes + Server Actions |
| Sequelize | Legacy ORM, poor TypeScript support, heavy. | Drizzle ORM |
| TypeORM | Decorator-heavy, buggy TypeScript support, abandoned patterns. | Drizzle ORM |
| MongoDB | Wrong database for this domain. Recipes have relational data (ingredients, nutrients, meal plans, users). Postgres handles JSONB for flexible fields while keeping relational integrity. | PostgreSQL |
| Vercel (for hosting) | Adds cost and vendor lock-in when you already have a VPS. `next start` works perfectly in Docker on a VPS. | Self-hosted Docker on Hetzner/OVH |
| Firebase/Supabase Auth | External dependency, potential cost at scale, less control. Self-hosting means owning your auth stack. | Better Auth (self-hosted) |
| Puppeteer | Chrome-only, slower development compared to Playwright, less maintained. | Playwright |
| styled-components / CSS Modules | Slower DX than Tailwind for this type of app (dashboards, forms, tables). CSS-in-JS has runtime cost. | Tailwind CSS 4 |
| tRPC | Adds complexity without benefit when using Server Actions. tRPC shines in separate client/server architectures. With Next.js App Router, Server Actions provide the same type safety with less setup. | next-safe-action + Server Actions |

## Stack Patterns by Variant

**If Jow.fr pages are static HTML (no JavaScript rendering needed):**
- Skip Playwright for scraping, use `fetch` + Cheerio only
- Much faster scraping, no browser overhead
- Test with `curl https://jow.fr/recipes/...` to check if content is in initial HTML

**If you need real-time meal plan collaboration (future):**
- Add PostgreSQL LISTEN/NOTIFY or WebSockets
- Consider adding Redis for pub/sub
- This is a post-MVP concern

**If scraping becomes a background job (future SaaS feature):**
- Add BullMQ + Redis for job queues
- Move scraping to a worker process
- Keep it simple (local scripts) for MVP

**If you want a mobile app later:**
- The Next.js API Routes serve as your REST API
- Or add tRPC/Hono API layer at that point
- Don't over-architect for mobile now

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.1.6 | React 19.2.x | Next 16 requires React 19. Do NOT use React 18. |
| Drizzle ORM 0.45.1 | drizzle-kit 0.31.8 | Always keep ORM and kit versions in sync (update together). |
| Drizzle ORM 0.45.1 | postgres 3.4.x | Use `drizzle-orm/postgres-js` adapter. |
| Better Auth 1.4.18 | Drizzle ORM 0.45.x | Better Auth has a built-in Drizzle adapter. Generates auth tables in your Drizzle schema. |
| Tailwind CSS 4.1.18 | Next.js 16.x | Tailwind v4 uses `@import "tailwindcss"` in CSS, no config file needed. Next.js 16 supports this natively. |
| shadcn/ui 3.8.4 | Tailwind CSS 4.x | shadcn/ui v3+ supports Tailwind v4. Ensure you run `pnpm dlx shadcn@latest init` (not old v0.x CLI). |
| ESLint 10.0.0 | Next.js 16.x | Next.js 16 ships with ESLint 10 flat config support. |
| Zod 4.3.6 | Better Auth 1.4.x | Verify Better Auth's Zod peer dependency -- it may still expect Zod 3.x. If so, use Zod 3.x until Better Auth updates. |
| Zod 4.3.6 | next-safe-action 8.x | next-safe-action 8.x may expect Zod 3.x. Check peer dependencies at install time. |

**IMPORTANT Zod version note:** Zod 4 is relatively new (major release). Several ecosystem libraries (Better Auth, next-safe-action, @t3-oss/env-nextjs) may still pin Zod 3.x as a peer dependency. **Start with Zod 3.x** (latest 3.x) and upgrade to Zod 4 once the ecosystem catches up. This avoids peer dependency conflicts.

```bash
# Safe initial Zod install (use v3 until ecosystem is ready for v4)
pnpm add zod@3
```

## API Design for Scraper Upload

The scraper runs locally and needs to upload enriched recipe data to the server. Design:

**Approach: Next.js API Routes with API key authentication**

```
POST /api/v1/recipes/import
Authorization: Bearer <API_KEY>
Content-Type: application/json

Body: { recipes: Recipe[] }
```

- Use a simple API key (stored in env vars) for the scraper-to-server auth
- Zod schema validates the recipe payload on the server
- No need for a separate API framework (Express, Hono) -- Next.js API Routes handle this

**Why not a separate API server:**
- One codebase, one deployment, one Docker container
- Next.js API Routes support streaming, middleware, and all HTTP methods
- The scraper is a simple client that POSTs data -- no complex API needed

## Sources

- npm registry (verified 2026-02-08) -- all version numbers verified via `npm view <package> version`
- Lucia Auth deprecation -- confirmed via `npm info lucia` showing DEPRECATED status
- Better Auth -- confirmed as active, v1.4.18, described as "most comprehensive authentication framework for TypeScript"
- Next.js 16.1.6 -- confirmed as latest stable via `npm view next dist-tags`
- Nuxt 4.3.1 -- confirmed as latest stable via `npm view nuxt dist-tags`
- Drizzle ORM 0.45.1 -- confirmed via npm registry
- Node.js -- local machine running v23.7.0, npm registry shows v25.6.0 available (use LTS v22.x for production stability)

**Confidence notes:**
- All version numbers: **HIGH** (verified via npm registry on 2026-02-08)
- Architectural recommendations (Next.js for full-stack, Drizzle over Prisma for VPS): **HIGH** (established patterns, well-documented tradeoffs)
- Better Auth as Lucia replacement: **HIGH** (Lucia is confirmed deprecated, Better Auth is the community-recommended successor)
- Zod 3 vs 4 compatibility warning: **MEDIUM** (based on typical ecosystem lag after major versions; verify peer deps at install time)
- Caddy vs Nginx for VPS: **MEDIUM** (both work well; Caddy recommendation based on simplicity for single-app deployments)

---
*Stack research for: Meal prep / recipe recommendation SaaS*
*Researched: 2026-02-08*
