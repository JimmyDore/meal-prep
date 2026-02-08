# Phase 4: Authentication + User Profile - Research

**Researched:** 2026-02-08
**Domain:** Authentication, session management, user profile, multi-tenant data isolation
**Confidence:** HIGH

## Summary

This phase adds email/password authentication, user profiles (physical info, goals, dietary preferences, sport schedule), an onboarding wizard, and multi-tenant data isolation. The research investigated the auth library ecosystem for Next.js 16 + Drizzle ORM, the new proxy.ts paradigm replacing middleware.ts, multi-step form patterns with shadcn/ui, and RLS strategies for user data isolation.

Better Auth is the clear winner for the auth library. The Auth.js team joined Better Auth in September 2025, making it the recommended choice for new Next.js projects. It has a native Drizzle adapter, built-in email/password support, cookie-based session management, and a CLI that generates Drizzle schema files. Next.js 16 replaces `middleware.ts` with `proxy.ts` and recommends auth checks in layouts rather than proxy for full validation.

For multi-tenant isolation, the recommended approach is application-level filtering (WHERE userId = ?) rather than Postgres-native RLS. This is simpler, fully supported by Drizzle ORM, avoids session variable complexity, and is sufficient for a single-app scenario. Postgres RLS adds complexity with no meaningful benefit when all queries go through one application layer.

**Primary recommendation:** Use Better Auth 1.4.x with Drizzle adapter for auth, proxy.ts for optimistic cookie checks, layout-level session validation for route protection, and application-level userId filtering for data isolation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | ^1.4.18 | Authentication framework | Auth.js team merged into Better Auth (Sept 2025). Native Drizzle adapter, email/password, session management |
| react-hook-form | ^7.x | Form state management | Standard for complex forms, shadcn/ui recommends it |
| @hookform/resolvers | ^3.x | Zod integration for RHF | Bridges react-hook-form and Zod validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.25 (already installed) | Schema validation | Validate form inputs, auth payloads |
| drizzle-orm | ^0.45 (already installed) | Database ORM | User profile tables, queries |
| lucide-react | ^0.563 (already installed) | Icons | Wizard steps, form UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js v5 | Auth.js is in maintenance mode since team joined Better Auth |
| Better Auth | Lucia Auth | Lucia Auth was deprecated in March 2025, recommends Better Auth |
| Application-level filtering | Postgres RLS | RLS adds complexity (session variables, role management) with no benefit for single-app |
| react-hook-form | Server Actions only | Multi-step wizard needs client-side state; RHF handles step validation cleanly |

**Installation:**
```bash
pnpm add better-auth react-hook-form @hookform/resolvers
```

**shadcn/ui components to add:**
```bash
pnpm dlx shadcn@latest add form label select radio-group tabs avatar dropdown-menu
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    api/auth/[...all]/
      route.ts              # Better Auth API handler
    auth/
      page.tsx              # Login/Register tabs (single page)
    (authenticated)/
      layout.tsx            # Auth guard layout (redirects to /auth if no session)
      recipes/              # Move existing recipe pages here
      onboarding/
        page.tsx            # Multi-step wizard
      settings/
        profile/
          page.tsx          # Edit profile (reuses wizard components)
  lib/
    auth.ts                 # Better Auth server config
    auth-client.ts          # Better Auth client instance
  db/
    schema/
      auth.ts               # Better Auth tables (user, session, account, verification)
      profiles.ts           # User profile (physical info, goal, household)
      dietary-preferences.ts # Dietary preference selections
      sport-activities.ts   # Sport schedule entries
  components/
    auth/
      login-form.tsx        # Email + password login
      register-form.tsx     # Email + password registration
    onboarding/
      wizard.tsx            # Multi-step wizard container
      step-physical.tsx     # Poids, taille, age, sexe, activity level
      step-goal.tsx         # Nutritional goal cards
      step-dietary.tsx      # Dietary preferences checkboxes
      step-sport.tsx        # Sport activities (type + frequency)
proxy.ts                    # Optimistic cookie check (at project root or src/)
```

### Pattern 1: Route Group with Auth Guard Layout
**What:** Use Next.js route group `(authenticated)` with a layout that validates session
**When to use:** All pages requiring authentication (everything except /auth)
**Example:**
```typescript
// src/app/(authenticated)/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth");
  }

  return <>{children}</>;
}
```

### Pattern 2: Proxy.ts for Optimistic Cookie Check
**What:** Fast cookie-existence check in proxy.ts, with full validation in layout
**When to use:** Prevents rendering authenticated pages before layout redirect
**Example:**
```typescript
// proxy.ts (project root or src/)
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth page and API routes
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Optimistic cookie check (does NOT validate session)
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
```

### Pattern 3: Better Auth Server Configuration
**What:** Central auth config with Drizzle adapter, email/password, and nextCookies plugin
**When to use:** Single source of truth for auth setup
**Example:**
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // Renew daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cache to reduce DB hits
    },
  },
  plugins: [nextCookies()],
});
```

### Pattern 4: Better Auth Client
**What:** Client-side auth instance for hooks and actions
**Example:**
```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
```

### Pattern 5: Multi-step Wizard with React Hook Form
**What:** Shared form state across wizard steps, validate per-step
**When to use:** Onboarding wizard with 4 steps
**Example:**
```typescript
// src/components/onboarding/wizard.tsx
"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/schemas/profile";

const STEPS = ["Informations physiques", "Objectif", "Preferences", "Sport"] as const;

export function OnboardingWizard({ defaultValues }: { defaultValues?: Partial<ProfileFormData> }) {
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultValues ?? {
      weight: undefined,
      height: undefined,
      age: undefined,
      sex: undefined,
      activityLevel: undefined,
      goal: undefined,
      householdSize: 1,
      dietaryPreferences: [],
      sportActivities: [],
    },
    mode: "onChange",
  });

  const nextStep = async () => {
    // Validate only current step fields
    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  async function onSubmit(data: ProfileFormData) {
    // Server action to save profile
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Step indicator */}
        {/* Current step component */}
        {/* Navigation buttons */}
      </form>
    </FormProvider>
  );
}
```

### Pattern 6: Application-Level Data Isolation
**What:** All user-specific queries filter by userId, enforced in the data access layer
**When to use:** Every query for user-owned data (profiles, preferences, sport activities)
**Example:**
```typescript
// src/db/queries/profiles.ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/profiles";

export async function getUserProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  return profile ?? null;
}

export async function upsertUserProfile(userId: string, data: ProfileInput) {
  return db
    .insert(userProfiles)
    .values({ ...data, userId })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...data, updatedAt: new Date() },
    });
}
```

### Anti-Patterns to Avoid
- **Auth check only in proxy.ts:** Proxy only checks cookie existence, not validity. Always validate session in layout or server component.
- **Storing profile data in Better Auth user table:** Better Auth manages its own user table. Store application-specific profile data in separate tables linked by userId.
- **Client-side auth state as source of truth:** Always verify session server-side for mutations and data access. Client state is for UI rendering only.
- **Hand-rolling password hashing:** Better Auth uses scrypt by default. Do not implement custom password hashing.
- **Using middleware.ts:** Next.js 16 renames middleware.ts to proxy.ts. Use proxy.ts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt/argon2 | Better Auth built-in scrypt | Timing attacks, salt management, algorithm selection |
| Session tokens | Custom JWT/cookie logic | Better Auth session management | Token rotation, expiry, secure cookie settings |
| CSRF protection | Custom CSRF tokens | Better Auth built-in CSRF | Framework handles cookie SameSite + token validation |
| Auth API routes | Custom login/register endpoints | Better Auth `toNextJsHandler` | Sign up, sign in, sign out, session handled automatically |
| Cookie management | Manual `cookies().set()` | Better Auth `nextCookies` plugin | Handles cookie sync between server actions and responses |
| Form state across wizard steps | Custom useState/context | react-hook-form FormProvider | Validation, dirty tracking, error handling, performance |

**Key insight:** Authentication has an enormous attack surface (timing attacks, credential stuffing, session fixation, CSRF, XSS). Better Auth handles all of these. Profile forms look simple but multi-step validation state is surprisingly complex -- react-hook-form's FormProvider + per-step trigger() solves this cleanly.

## Common Pitfalls

### Pitfall 1: Forgetting nextCookies Plugin
**What goes wrong:** Server actions that call `signInEmail` or `signUpEmail` fail to set cookies, leaving users unauthenticated after successful login.
**Why it happens:** Server Actions cannot set cookies directly in the response. The nextCookies plugin patches this.
**How to avoid:** Always include `nextCookies()` in Better Auth plugins array.
**Warning signs:** Login appears successful but user is not authenticated on next page load.

### Pitfall 2: Using middleware.ts Instead of proxy.ts
**What goes wrong:** Next.js 16 deprecates middleware.ts. It may still work but runs on Edge runtime, limiting access to Node.js APIs.
**Why it happens:** Migration from earlier Next.js versions or following outdated tutorials.
**How to avoid:** Use `proxy.ts` at project root or `src/` directory. Export `proxy` function (not `middleware`).
**Warning signs:** File named middleware.ts, deprecation warnings in console.

### Pitfall 3: Full Session Validation in Proxy
**What goes wrong:** Proxy runs on every matched request. Full DB-backed session validation adds latency to every navigation.
**Why it happens:** Treating proxy.ts as the only auth check.
**How to avoid:** Use `getSessionCookie()` for optimistic check in proxy. Full validation in layout via `auth.api.getSession()`.
**Warning signs:** Slow page transitions, high DB query count per navigation.

### Pitfall 4: Not Adding BETTER_AUTH_SECRET to Environment
**What goes wrong:** Auth fails silently or throws cryptic errors at runtime.
**Why it happens:** Forgetting to generate and add the secret to `.env`.
**How to avoid:** Generate with `openssl rand -base64 32`, add to `.env` and `env.ts` validation.
**Warning signs:** 500 errors on auth routes, "missing secret" in logs.

### Pitfall 5: Better Auth Schema Out of Sync with Drizzle
**What goes wrong:** Auth operations fail because tables/columns don't exist in the database.
**Why it happens:** Running `@better-auth/cli generate` but forgetting to run `drizzle-kit push` or `drizzle-kit migrate` afterward.
**How to avoid:** After generating auth schema, always push to DB: `pnpm dlx @better-auth/cli@latest generate --output ./src/db/schema/auth.ts && pnpm db:push`.
**Warning signs:** "relation does not exist" or "column does not exist" errors.

### Pitfall 6: Wizard Form Losing State on Navigation
**What goes wrong:** User navigates away from wizard, returns, and all progress is lost.
**Why it happens:** Form state lives only in React state (unmounted = lost).
**How to avoid:** Save partial progress to DB on each step completion (not just final submit). Or use sessionStorage as a fallback.
**Warning signs:** Users complaining about lost onboarding progress.

### Pitfall 7: Not Protecting /auth Page for Already-Authenticated Users
**What goes wrong:** Logged-in users can access /auth page and create duplicate accounts or confusion.
**Why it happens:** Only protecting authenticated routes, not preventing re-auth.
**How to avoid:** In /auth page, check session and redirect to /recipes if already logged in.
**Warning signs:** Logged-in users seeing login form.

## Code Examples

### Better Auth API Route Handler
```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Login Form Component
```typescript
// src/components/auth/login-form.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caracteres minimum"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError(error.message ?? "Erreur de connexion");
      return;
    }

    router.push("/recipes");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields using shadcn/ui Controller pattern */}
    </form>
  );
}
```

### Register Form Component
```typescript
// src/components/auth/register-form.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// Similar pattern to LoginForm, calling:
const { data, error } = await authClient.signUp.email({
  name: data.name,
  email: data.email,
  password: data.password,
});
```

### Server-Side Session Access (Data Access Layer)
```typescript
// src/lib/dal.ts
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session) {
    redirect("/auth");
  }
  return session;
});
```

### Sign Out Button
```typescript
// src/components/auth/sign-out-button.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/auth");
              router.refresh();
            },
          },
        });
      }}
    >
      Deconnexion
    </button>
  );
}
```

### User Profile Schema (Drizzle)
```typescript
// src/db/schema/profiles.ts
import { pgTable, text, integer, real, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";

export const userProfiles = pgTable("user_profiles", {
  ...idColumn,
  userId: text().notNull().unique(), // References Better Auth user.id
  weight: real().notNull(),          // kg
  height: integer().notNull(),       // cm
  age: integer().notNull(),
  sex: text({ enum: ["male", "female"] }).notNull(),
  activityLevel: text({
    enum: ["sedentary", "light", "moderate", "active", "very_active"],
  }).notNull(),
  goal: text({
    enum: ["cutting", "maintenance", "bulking", "recomposition"],
  }).notNull(),
  householdSize: integer().notNull().default(1), // 1-6
  onboardingCompleted: integer({ mode: "boolean" }).default(0),
  ...timestamps,
});

export const dietaryPreferences = pgTable("dietary_preferences", {
  ...idColumn,
  userId: text().notNull(),
  preference: text({
    enum: [
      "vegetarian", "vegan", "gluten_free", "lactose_free",
      "no_pork", "halal", "no_seafood",
    ],
  }).notNull(),
  ...timestamps,
});

export const sportActivities = pgTable("sport_activities", {
  ...idColumn,
  userId: text().notNull(),
  activityType: text({
    enum: [
      "running", "weight_training", "swimming",
      "cycling", "yoga", "walking", "team_sport",
    ],
  }).notNull(),
  frequencyPerWeek: integer().notNull(), // 1-7
  ...timestamps,
});
```

### Environment Variables Update
```typescript
// src/lib/env.ts (updated)
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PIPELINE_TOKEN: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    PIPELINE_TOKEN: process.env.PIPELINE_TOKEN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js / Auth.js | Better Auth | Sept 2025 (team merge) | Better Auth is now the recommended auth library for new Next.js projects |
| middleware.ts | proxy.ts | Next.js 16 (2026) | Must use proxy.ts; middleware.ts is deprecated |
| Edge runtime middleware | Node.js runtime proxy | Next.js 16 | proxy.ts runs on Node.js, full access to Node APIs |
| Auth checks in middleware only | Auth checks in layouts + proxy | Next.js 16 best practice | Layered auth: proxy for optimistic check, layout for full validation |
| Lucia Auth | Better Auth | March 2025 (deprecated) | Lucia recommended Better Auth as successor |

**Deprecated/outdated:**
- **middleware.ts**: Renamed to proxy.ts in Next.js 16. Still works but deprecated.
- **Auth.js v5**: In maintenance mode. Security patches only. Use Better Auth for new projects.
- **Lucia Auth**: Deprecated March 2025. Recommends Better Auth.
- **next-auth**: Predecessor to Auth.js. Fully superseded.

## Database Schema Design Decisions

### Better Auth Tables (auto-generated)
Better Auth creates 4 core tables: `user`, `session`, `account`, `verification`. The CLI generates the Drizzle schema file. These tables use Better Auth's conventions (string IDs, specific column names). The `user` table includes: id, name, email, emailVerified, image, createdAt, updatedAt.

### Application Profile Tables (manually created)
Application-specific data lives in separate tables linked via `userId` (string FK to Better Auth user.id):
- `user_profiles`: Physical info, goal, household size, onboarding status
- `dietary_preferences`: One row per selected preference per user
- `sport_activities`: One row per activity (type + frequency) per user

### Why Separate Tables
- Better Auth manages its own schema -- adding columns to its user table requires `additionalFields` config and can break on upgrades
- Profile data is application-specific and will evolve independently
- Dietary preferences and sport activities are naturally one-to-many relationships
- Clear separation of concerns: auth vs. application data

### Session Configuration Recommendation
- **Session duration:** 30 days (generous for a personal meal prep app)
- **Update age:** 1 day (renew session token daily on active use)
- **Cookie cache:** Enabled with 5-minute TTL (reduces DB queries for session validation)
- **No "remember me" toggle:** Sessions are always 30 days. Simplifies UX for a personal-use app.

### Activity Level Options
Five levels for the physical profile:
1. **Sedentaire** (sedentary) -- Travail de bureau, peu d'exercice
2. **Legerement actif** (light) -- Exercice leger 1-3 jours/semaine
3. **Moderement actif** (moderate) -- Exercice modere 3-5 jours/semaine
4. **Actif** (active) -- Exercice intense 6-7 jours/semaine
5. **Tres actif** (very active) -- Exercice tres intense, travail physique

## Open Questions

1. **Better Auth ID format vs existing UUID pattern**
   - What we know: Better Auth generates string UUIDs by default for PostgreSQL. The existing project uses `uuid().defaultRandom()` from Drizzle.
   - What's unclear: Whether Better Auth's auto-generated schema uses the same UUID type or plain `text()` for IDs.
   - Recommendation: After running the CLI generate, inspect the output. If it uses `text()`, keep profile tables using `text()` for userId FK to match. The existing recipe tables use `uuid()` and are unrelated to auth.

2. **Onboarding completion detection**
   - What we know: Need to redirect new users to onboarding wizard after first login.
   - What's unclear: Best place to check onboarding status (layout? separate middleware?).
   - Recommendation: In the `(authenticated)/layout.tsx`, after validating session, query `userProfiles` for the user. If no profile or `onboardingCompleted` is false and path is not `/onboarding`, redirect to `/onboarding`.

3. **Pipeline API auth coexistence**
   - What we know: The existing `/api/recipes` route uses Bearer token auth via `PIPELINE_TOKEN`. Better Auth adds `/api/auth/[...all]`.
   - What's unclear: Whether Better Auth intercepts all `/api/` routes or only `/api/auth/`.
   - Recommendation: Better Auth only handles routes matching `/api/auth/*`. Pipeline routes are unaffected. Verify during implementation.

## Sources

### Primary (HIGH confidence)
- Better Auth official docs - Next.js integration: https://www.better-auth.com/docs/integrations/next
- Better Auth official docs - Email/password authentication: https://www.better-auth.com/docs/authentication/email-password
- Better Auth official docs - Session management: https://www.better-auth.com/docs/concepts/session-management
- Better Auth official docs - Database concepts: https://www.better-auth.com/docs/concepts/database
- Better Auth official docs - Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
- Better Auth official docs - CLI: https://www.better-auth.com/docs/concepts/cli
- Better Auth official docs - Installation: https://www.better-auth.com/docs/installation
- Next.js 16 official docs - Proxy: https://nextjs.org/docs/app/getting-started/proxy
- Next.js official docs - Authentication guide: https://nextjs.org/docs/app/guides/authentication
- Drizzle ORM official docs - RLS: https://orm.drizzle.team/docs/rls
- shadcn/ui official docs - React Hook Form: https://ui.shadcn.com/docs/forms/react-hook-form

### Secondary (MEDIUM confidence)
- Auth.js team joining Better Auth announcement (Sept 2025) - confirmed via multiple sources (WorkOS blog, dev.to articles)
- Next.js 16 middleware-to-proxy migration - confirmed via official Next.js docs
- better-auth npm version 1.4.18 - verified via `npm view better-auth version`

### Tertiary (LOW confidence)
- None. All findings verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Better Auth is verified as the current standard, with official Drizzle adapter documentation
- Architecture: HIGH -- Next.js 16 proxy.ts and layout-based auth patterns are from official Next.js docs
- Pitfalls: HIGH -- Identified from official Better Auth docs (nextCookies requirement, cookie-only check caveat)
- Database schema: MEDIUM -- Profile table design is based on requirements, not an external standard. Better Auth schema from CLI needs to be inspected after generation.
- Wizard UX: MEDIUM -- Multi-step form pattern is well-established but specific step validation approach should be validated

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days -- stable libraries, no major releases expected)
