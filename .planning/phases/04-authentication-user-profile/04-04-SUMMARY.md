---
phase: 04-authentication-user-profile
plan: 04
subsystem: user-profile
tags: [onboarding, wizard, react-hook-form, zod, server-actions, sonner]
dependency-graph:
  requires: ["04-02", "04-03"]
  provides: ["onboarding-wizard", "settings-profile-page", "profile-redirect"]
  affects: ["05-xx", "06-xx"]
tech-stack:
  added: ["sonner"]
  patterns: ["multi-step-wizard", "server-actions", "react-hook-form-zod"]
key-files:
  created:
    - src/components/onboarding/wizard.tsx
    - src/components/onboarding/step-physical.tsx
    - src/components/onboarding/step-goal.tsx
    - src/components/onboarding/step-dietary.tsx
    - src/components/onboarding/step-sport.tsx
    - src/components/onboarding/progress-indicator.tsx
    - src/app/actions/profile.ts
    - src/app/(authenticated)/onboarding/page.tsx
    - src/app/(authenticated)/settings/profile/page.tsx
    - src/components/ui/checkbox.tsx
  modified:
    - src/app/(authenticated)/layout.tsx
    - src/components/header.tsx
    - src/proxy.ts
    - src/app/layout.tsx
    - package.json
decisions:
  - id: sonner-toasts
    choice: "Sonner for toast notifications"
    reason: "Lightweight, works well with server actions, simple API"
  - id: x-pathname-header
    choice: "Proxy forwards x-pathname header for server-side path detection in layout"
    reason: "Next.js 16 server layouts cannot access pathname directly; middleware header forwarding is the standard pattern"
metrics:
  duration: "13min"
  completed: "2026-02-08"
---

# Phase 04 Plan 04: Onboarding Wizard + Settings Page Summary

**4-step onboarding wizard with react-hook-form + zod validation, server action persistence, onboarding redirect for new users, settings page for profile editing**

## What Was Built

### Task 1: Onboarding wizard components + server action
- **ProgressIndicator**: Horizontal step indicator with circles, connecting lines, and French labels (Physique, Objectif, Alimentation, Sport)
- **StepPhysical**: Weight (kg), height (cm), age, sex radio group, activity level select with all French labels from schema
- **StepGoal**: 4 visual goal selection cards (Seche, Maintien, Prise de masse, Recomposition) with icons + household size number input
- **StepDietary**: 7 dietary preference checkboxes (vegetarien, vegan, sans_gluten, etc.) with explanation text
- **StepSport**: Dynamic list with activity type select + weekly frequency + remove button; prevents duplicate types
- **OnboardingWizard**: Main container with react-hook-form + zodResolver, per-step field validation on "Suivant", FormProvider wrapping all steps, mode prop for onboarding vs settings
- **saveProfile server action**: Validates with Zod, gets session, calls upsertUserProfile + setUserDietaryPreferences + setUserSportActivities
- **Dependencies**: Added sonner (toast), shadcn checkbox component

### Task 2: Pages + redirect + header link
- **/onboarding**: Server component, redirects away if profile already complete
- **/settings/profile**: Server component, loads full profile and passes as defaultValues to wizard
- **Layout redirect**: Checks isProfileComplete; if false and not on /onboarding, redirects to /onboarding
- **Proxy x-pathname**: Middleware forwards pathname via custom header for server-side detection
- **Header "Mon profil"**: Added User icon + link to /settings/profile in dropdown menu

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Toast library | Sonner | Lightweight, works with server actions, simple API |
| Path detection in layout | x-pathname header from proxy | Next.js 16 server layouts cannot access pathname; middleware header forwarding is standard |
| Form library integration | react-hook-form + zodResolver per step | Already installed, shadcn Form components built on it, step-level trigger() for partial validation |

## Deviations from Plan

### Auto-added Missing Functionality

**1. [Rule 3 - Blocking] Installed shadcn checkbox component**
- **Found during:** Task 1 (step-dietary needs Checkbox)
- **Issue:** Checkbox component not installed despite being listed as available
- **Fix:** Ran `npx shadcn@latest add checkbox`
- **Files created:** src/components/ui/checkbox.tsx

**2. [Rule 2 - Missing Critical] Added Sonner Toaster to root layout**
- **Found during:** Task 1 (wizard uses toast())
- **Issue:** Sonner requires a Toaster provider in the layout tree
- **Fix:** Added `<Toaster richColors />` to src/app/layout.tsx
- **Files modified:** src/app/layout.tsx

## Verification

- `pnpm build` succeeds with routes: /onboarding, /settings/profile, /recipes, /recipes/[id]
- `pnpm check` passes (no lint/format errors)
- All wizard step components render through the build without errors
- Server action connects to existing query layer (upsertUserProfile, setUserDietaryPreferences, setUserSportActivities)

## Commits

| Hash | Message |
|------|---------|
| 6aba286 | feat(04-04): onboarding wizard components + server action |
| e08535b | feat(04-04): onboarding page, settings page, profile redirect |
