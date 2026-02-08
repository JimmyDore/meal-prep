---
phase: 04-authentication-user-profile
plan: 01
subsystem: auth
tags: [better-auth, drizzle, proxy, session, email-password, nextjs-16]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Drizzle ORM setup, PostgreSQL connection, env validation"
provides:
  - "Better Auth server config with Drizzle adapter (src/lib/auth.ts)"
  - "Better Auth client instance for React (src/lib/auth-client.ts)"
  - "Auth schema tables: user, session, account, verification"
  - "API route handler at /api/auth/[...all]"
  - "Proxy.ts route protection (redirects unauthenticated to /auth)"
  - "BETTER_AUTH_SECRET and NEXT_PUBLIC_APP_URL env vars"
  - "shadcn/ui components: form, label, select, radio-group, tabs, avatar, dropdown-menu"
affects:
  - 04-02 (auth UI pages need auth-client and API route)
  - 04-03 (onboarding needs session validation in layout)
  - 04-04 (profile schema uses text() userId FK matching Better Auth user.id)
  - 05 (macro calculator needs authenticated user context)

# Tech tracking
tech-stack:
  added: [better-auth@1.4.18, react-hook-form@7.71.1, "@hookform/resolvers@5.2.2"]
  patterns: [proxy-based route protection, Better Auth with Drizzle adapter, nextCookies plugin for server actions]

key-files:
  created:
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/db/schema/auth.ts
    - src/app/api/auth/[...all]/route.ts
    - src/proxy.ts
    - src/components/ui/form.tsx
    - src/components/ui/label.tsx
    - src/components/ui/select.tsx
    - src/components/ui/radio-group.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/avatar.tsx
    - src/components/ui/dropdown-menu.tsx
  modified:
    - src/lib/env.ts
    - src/db/schema/index.ts
    - package.json

key-decisions:
  - "proxy.ts must be at src/proxy.ts (not project root) for Next.js 16 App Router detection"
  - "Better Auth CLI generates auth schema with text() IDs and explicit column name mappings"
  - "baseURL added to Better Auth server config to suppress base URL warning"
  - "shadcn/ui form components pre-installed for Plans 02-04"

patterns-established:
  - "Proxy pattern: src/proxy.ts with getSessionCookie for optimistic auth check"
  - "Auth API pattern: catch-all route via toNextJsHandler(auth)"
  - "Auth client pattern: createAuthClient with NEXT_PUBLIC_APP_URL"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 04 Plan 01: Auth Foundation Summary

**Better Auth 1.4.18 with Drizzle adapter, 4 auth tables, proxy.ts route protection, and 7 shadcn/ui components for auth/profile UI**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T20:04:40Z
- **Completed:** 2026-02-08T20:12:25Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Better Auth server configured with emailAndPassword, 30-day sessions, 5-min cookie cache, and nextCookies plugin
- Auth schema (user, session, account, verification) generated via Better Auth CLI and pushed to dev + test databases
- API route handler mounted at /api/auth/[...all] responding to all Better Auth endpoints
- Proxy.ts at src/ redirects unauthenticated users to /auth, allows /api/* and /auth paths through
- 7 shadcn/ui components pre-installed for auth UI and onboarding wizard

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and add shadcn/ui components** - `dad3923` (chore)
2. **Task 2: Configure Better Auth server + client + schema + API route + proxy** - `322fb06` (feat)

## Files Created/Modified
- `src/lib/auth.ts` - Better Auth server config with Drizzle adapter, session settings, nextCookies
- `src/lib/auth-client.ts` - Client-side auth instance for React hooks/actions
- `src/db/schema/auth.ts` - 4 Better Auth tables (user, session, account, verification) with relations and indexes
- `src/db/schema/index.ts` - Added auth schema export
- `src/app/api/auth/[...all]/route.ts` - Catch-all API route via toNextJsHandler
- `src/proxy.ts` - Optimistic cookie check, redirect to /auth if no session
- `src/lib/env.ts` - Added BETTER_AUTH_SECRET and NEXT_PUBLIC_APP_URL validation
- `src/components/ui/form.tsx` - shadcn/ui Form component (react-hook-form integration)
- `src/components/ui/label.tsx` - shadcn/ui Label component
- `src/components/ui/select.tsx` - shadcn/ui Select component
- `src/components/ui/radio-group.tsx` - shadcn/ui RadioGroup component
- `src/components/ui/tabs.tsx` - shadcn/ui Tabs component
- `src/components/ui/avatar.tsx` - shadcn/ui Avatar component
- `src/components/ui/dropdown-menu.tsx` - shadcn/ui DropdownMenu component
- `package.json` - Added better-auth, react-hook-form, @hookform/resolvers

## Decisions Made
- **proxy.ts location:** Must be `src/proxy.ts` (not project root) for Next.js 16.1.6 App Router projects. The dev bundler's `getPossibleMiddlewareFilenames` resolves from `path.join(appDir, '..')` which is `src/`.
- **Better Auth CLI for schema generation:** Used `@better-auth/cli generate` to produce the auth schema with correct column names, indexes, and relations. Better Auth manages these tables -- no customization of the generated schema.
- **baseURL in auth config:** Added `baseURL: process.env.NEXT_PUBLIC_APP_URL` to Better Auth server config to suppress the "Base URL could not be determined" warning during build/runtime.
- **Pre-install shadcn/ui components:** Installed form, label, select, radio-group, tabs, avatar, dropdown-menu now to avoid repeated installs across Plans 02-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] proxy.ts location correction**
- **Found during:** Task 2 (proxy.ts creation)
- **Issue:** Plan specified `proxy.ts` at project root. Next.js 16.1.6 with App Router in `src/app/` only watches `src/proxy.ts` (not root `proxy.ts`). The `getPossibleMiddlewareFilenames` function resolves from `path.join(appDir, '..')`.
- **Fix:** Created proxy at `src/proxy.ts` instead of project root
- **Files modified:** src/proxy.ts (created at correct location)
- **Verification:** `pnpm build` shows "Proxy (Middleware)" in output. `curl` to /recipes returns 307 redirect to /auth.
- **Committed in:** 322fb06

**2. [Rule 2 - Missing Critical] Added baseURL to Better Auth config**
- **Found during:** Task 2 (build verification)
- **Issue:** Better Auth warned "Base URL could not be determined" during build, which could cause callback/redirect failures
- **Fix:** Added `baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"` to auth config
- **Files modified:** src/lib/auth.ts
- **Verification:** Build warning eliminated
- **Committed in:** 322fb06

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered
- Better Auth CLI (`better-auth generate`) failed because the package has no binary. Correct CLI is `@better-auth/cli` (scoped package). Required piping `y` to confirm interactive prompt.
- Biome auto-fixed import ordering in 12 files (cosmetic only).

## User Setup Required
None - `.env` updated with generated BETTER_AUTH_SECRET and NEXT_PUBLIC_APP_URL locally. Production deployment will need these env vars set.

## Next Phase Readiness
- Auth backend fully operational: `/api/auth/ok` returns `{"ok":true}`
- Ready for Plan 02: Auth UI (login/register page at /auth)
- Ready for Plan 03: Authenticated layout with session validation
- All shadcn/ui components needed for auth UI and onboarding are installed
- Profile tables (Plan 04) should use `text()` for userId FK to match Better Auth user.id

---
*Phase: 04-authentication-user-profile*
*Completed: 2026-02-08*
