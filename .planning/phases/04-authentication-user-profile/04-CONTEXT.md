# Phase 4: Authentication + User Profile - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Comptes utilisateurs (email/password), profil sportif, preferences alimentaires, sport schedule. L'utilisateur peut creer un compte, se connecter, et configurer toutes les donnees necessaires au calcul de ses macros et a la generation de plans. Multi-tenant via RLS.

</domain>

<decisions>
## Implementation Decisions

### Auth flow & sessions
- Email + password only (no social login, no magic link)
- No password recovery flow for v1
- Single /auth page with Login/Register tabs (not separate pages, not modal)
- All pages require authentication — non-logged-in users redirect to /auth
- Recipe catalogue (/recipes) is also protected

### Profile form design
- Onboarding wizard on first login, then accessible as settings page for edits
- Wizard steps: physical info -> goal -> dietary preferences -> sport schedule
- All physical fields mandatory: poids, taille, age, sexe, niveau d'activite
- 4 nutritional goals: Seche / Maintien / Prise de masse / Recomposition (visual cards)
- Household size field: nombre de personnes (1-6) for portion scaling

### Sport schedule input
- Activity type + frequency per week (no duration, no intensity, no day mapping)
- Predefined activity list (Course/running, Musculation, Natation, Velo, Yoga, Marche, Sport collectif)
- No custom activity option
- Multiple activities allowed (no cap) — e.g., Running x3 + Musculation x2

### Dietary preferences
- Curated list (not tag-based from DB): Vegetarien, Vegan, Sans gluten, Sans lactose, Sans porc, Halal, Sans fruits de mer
- All preferences are strict exclusions (hard constraints, never soft)
- Fixed at 2 meals per day (lunch + dinner) — not configurable

### Claude's Discretion
- Session duration and "remember me" behavior
- Exact wizard step UI (progress indicator style, transitions)
- Activity level options for physical profile (sedentary/light/moderate/active/very active)
- RLS implementation approach
- Auth library choice (Better Auth or alternative)

</decisions>

<specifics>
## Specific Ideas

- "Je cuisine seul mais je cuisine souvent 1 repas que je mange 3 fois" — household size captures cooking-for-N, batch cooking logic is Phase 7
- Recomposition goal added because simple seche/masse/maintien doesn't cover real cases like high cardio (30km running) + muscle gain (2 sessions/week) + fat loss

</specifics>

<deferred>
## Deferred Ideas

- Google OAuth login — future enhancement
- Password recovery (forgot password email reset) — future enhancement
- Custom activity types (user-defined sports) — future enhancement if predefined list proves insufficient
- Breakfast as 3rd meal option — currently fixed at 2 meals/day

</deferred>

---

*Phase: 04-authentication-user-profile*
*Context gathered: 2026-02-08*
