---
status: complete
phase: 04-authentication-user-profile
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-02-08T21:00:00Z
updated: 2026-02-08T21:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Register a new account
expected: Go to /auth. Two tabs visible: "Connexion" and "Inscription". Click "Inscription", fill email/password/confirm, submit. Redirected to /onboarding after registration.
result: pass

### 2. Login with existing account
expected: Log out first (avatar dropdown > logout). You're redirected to /auth. Login tab is active. Enter email/password, submit. Redirected back into the app (onboarding or recipes depending on profile status).
result: pass

### 3. Route protection (unauthenticated access)
expected: Open a private/incognito window and navigate to /recipes directly. You should be redirected to /auth instead of seeing recipes.
result: pass

### 4. Session persistence across page reload
expected: While logged in, refresh the page (F5). You should remain logged in — no redirect to /auth.
result: pass

### 5. Logout
expected: Click your avatar in the top-right header. A dropdown appears with your name, email, and a logout option. Click logout. You're redirected to /auth.
result: pass

### 6. Onboarding wizard - Full flow (Steps 1-4)
expected: After registering, land on /onboarding with 4-step wizard. Step 1: weight, height, age, sex, activity level. Step 2: goal cards + household size. Step 3: dietary checkboxes. Step 4: sport activities. Click "Terminer" to complete. Redirected to /recipes.
result: pass

### 7. Onboarding wizard - Step 2 (Objectif)
expected: Step 2 shows goal selection with visual cards: Sèche, Maintien, Prise de masse, Recomposition. Select one. Household size input. Click "Suivant".
result: pass

### 8. Onboarding wizard - Step 3 (Alimentation)
expected: Step 3 shows dietary preference checkboxes with French labels. Select any that apply (or none). Click "Suivant".
result: pass

### 9. Onboarding wizard - Step 4 (Sport)
expected: Step 4 lets you add sport activities with type dropdown and weekly frequency. Can add/remove activities. Click "Terminer".
result: pass

### 10. Onboarding completion redirect
expected: After completing the wizard, navigating back to /onboarding should redirect you away since your profile is now complete.
result: pass

### 11. Settings page with pre-populated data
expected: Click "Mon profil" in the header dropdown. Taken to /settings/profile. Wizard form appears pre-filled with values entered during onboarding.
result: pass

### 12. Edit profile via settings
expected: On /settings/profile, change one or more values. Submit. Success toast appears. Reload — changes are persisted.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
