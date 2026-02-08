---
phase: 04-authentication-user-profile
plan: 03
subsystem: profile-data
tags: [drizzle, pgEnum, zod, user-profile, dietary-preferences, sport-activities]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Drizzle ORM setup, PostgreSQL connection, common schema helpers"
  - phase: 04-01
    provides: "Better Auth user table with text() IDs, auth schema in auth.ts"
provides:
  - "3 DB tables: user_profiles, user_dietary_preferences, user_sport_activities"
  - "5 pgEnum types: sex, activity_level, goal, dietary_preference, activity_type"
  - "Zod validation schemas for onboarding wizard (per-step + combined)"
  - "French display labels for all enum values"
  - "Query layer: CRUD for profiles, preferences, activities with userId isolation"
  - "Composite queries: getFullUserProfile, isProfileComplete"
affects:
  - 04-04 (onboarding wizard uses Zod schemas for form validation, query layer for persistence)
  - 05 (macro calculator reads profile data via getFullUserProfile)
  - 06 (meal plan algorithm uses dietary preferences and sport activities for scoring)

# Tech tracking
tech-stack:
  added: []
  patterns: [pgEnum for DB-level value constraints, transactional delete+insert for set operations, upsert via onConflictDoUpdate]

key-files:
  created:
    - src/db/schema/profiles.ts
    - src/db/schema/dietary-preferences.ts
    - src/db/schema/sport-activities.ts
    - src/lib/schemas/profile.ts
    - src/db/queries/profiles.ts
  modified:
    - src/db/schema/auth.ts
    - src/db/schema/index.ts

decisions:
  - "pgEnum for all constrained values (sex, activity_level, goal, dietary_preference, activity_type) -- DB-level enforcement"
  - "userId as text FK (not uuid) matching Better Auth user.id type"
  - "Transactional delete+insert for set operations (dietary preferences, sport activities) -- simpler than diff-based upsert"
  - "userRelations in auth.ts extended with profile/preferences/activities relations for Drizzle relational queries"
  - "isProfileComplete checks 6 required fields (weight, height, age, sex, activityLevel, goal)"

metrics:
  duration: 4min
  completed: 2026-02-08
---

# Phase 04 Plan 03: Profile Data Layer Summary

**Database schema + Zod validation + query layer for user profiles, dietary preferences, and sport activities with pgEnum constraints and transactional set operations.**

## What Was Done

### Task 1: Profile, dietary preferences, and sport activities schemas
*Note: Schema files were already created during 04-02 plan execution (commit d6c9210). Task 1 verified they match the specification and pushed to dev DB.*

- **user_profiles** table: weight, height, age, sex (pgEnum), activityLevel (pgEnum), goal (pgEnum), householdSize, mealsPerDay. Unique on userId, FK to user with cascade delete.
- **user_dietary_preferences** table: userId + preference (pgEnum). Unique constraint on (userId, preference) to prevent duplicates.
- **user_sport_activities** table: userId + activityType (pgEnum) + weeklyFrequency. Unique constraint on (userId, activityType).
- 5 pgEnum types created: `sex`, `activity_level`, `goal`, `dietary_preference`, `activity_type`.
- Updated `userRelations` in auth.ts with profile, dietaryPreferences, sportActivities relations.
- Schema pushed to dev DB and verified with `\dt` and `\dT+`.

### Task 2: Zod validation schemas + DB query functions (commit 45cdf75)

**Zod schemas** (`src/lib/schemas/profile.ts`):
- Per-step schemas: `physicalSchema`, `goalSchema`, `dietarySchema`, `sportSchema`
- Combined: `profileSchema` (merge of all steps)
- Types: `ProfileFormData`, `SportActivity`
- French display labels for all 5 enum types

**Query layer** (`src/db/queries/profiles.ts`):
- `getUserProfile(userId)` -- SELECT with null fallback
- `upsertUserProfile(userId, data)` -- INSERT ON CONFLICT UPDATE
- `getUserDietaryPreferences(userId)` -- SELECT all for user
- `setUserDietaryPreferences(userId, preferences[])` -- transactional delete + insert
- `getUserSportActivities(userId)` -- SELECT all for user
- `setUserSportActivities(userId, activities[])` -- transactional delete + insert
- `getFullUserProfile(userId)` -- parallel fetch of all 3 tables
- `isProfileComplete(userId)` -- boolean check on 6 required fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused import in profiles.ts**
- **Found during:** Task 2 (lint check)
- **Issue:** `unique` imported from drizzle-orm/pg-core but not used (unique constraint applied via `.unique()` method)
- **Fix:** Removed unused import
- **Files modified:** src/db/schema/profiles.ts
- **Commit:** 45cdf75

**2. [Deviation] Schema files already committed in 04-02**
- The 3 schema files and auth.ts/index.ts updates were already committed in the 04-02 plan (d6c9210). Task 1 verified they match the specification and pushed schema to dev DB. No duplicate commit was needed.

## Verification Results

- 3 new tables confirmed in Postgres: user_profiles, user_dietary_preferences, user_sport_activities
- 5 pgEnum types confirmed: sex, activity_level, goal, dietary_preference, activity_type
- FK constraints and unique constraints verified via `\d` output
- `pnpm build` passes with no type errors
- `pnpm lint` passes with only pre-existing warnings (seed.ts)

## Next Phase Readiness

Plan 04-04 (Onboarding Wizard UI) can proceed:
- Zod schemas ready for react-hook-form integration via @hookform/resolvers
- Query layer ready for server actions to persist onboarding data
- French labels ready for form display
- isProfileComplete ready for redirect logic (onboarding vs dashboard)
