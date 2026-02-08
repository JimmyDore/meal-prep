# Feature Research

**Domain:** Meal prep / recipe recommendation SaaS with macro-based optimization
**Researched:** 2026-02-08
**Confidence:** MEDIUM (based on training data knowledge of established domain; WebSearch/WebFetch unavailable for live verification)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Recipe catalog with search/filter | Users need to find and browse recipes. Every food app has this. Without it, the product feels like a black box. | MEDIUM | Filters by cuisine, cook time, ingredients, dietary tags. Full-text search on title + ingredients. For v1, catalog is Jow-sourced so scope is bounded. |
| Macronutrient display per recipe | This is a macro-first product. Users who care about macros will immediately look for protein/carbs/fats per serving. | LOW | Per-serving and per-recipe totals. Display prominently on recipe cards, not buried. Already planned via Claude Code enrichment. |
| User profile with goals | Users need to set their body stats (weight, height, age, sex) and goals (cut, bulk, maintain) to get personalized plans. | MEDIUM | TDEE calculation (Mifflin-St Jeor or Harris-Benedict formula). Activity level selector. Goal-based macro ratio presets (e.g., 40/30/30 for cut). |
| Weekly meal plan generation | The core value proposition. Users expect to press a button and get a full week of lunch + dinner. | HIGH | This is the algorithmic heart. Must optimize for macro targets while respecting user preferences and constraints. |
| Macro summary per plan | Users need to see how well their generated plan hits their targets. Total macros, daily breakdown, deviation from target. | LOW | Aggregation of per-recipe macros. Show daily and weekly totals vs targets with visual indicators (on target / over / under). |
| Dietary preference filtering | Vegetarian, vegan, gluten-free, lactose-free, no pork, etc. Users expect to exclude foods they cannot or will not eat. | MEDIUM | Tag-based filtering. Must be applied during plan generation, not just browsing. Critical for user trust -- one wrong suggestion and trust is broken. |
| Authentication and multi-user | SaaS product requires user accounts. Each user has their own profile, plans, preferences. | MEDIUM | Standard auth (email/password). Session management. Each user's data is isolated. |
| Portion sizing | Users cooking for 1, 2, or 4 people need correct quantities. Portions must scale ingredients and macros proportionally. | MEDIUM | Jow portions are unreliable (noted in PROJECT.md). Must recalculate from ingredient quantities and macro data. This is harder than it looks -- see Pitfalls. |
| Recipe detail view | Users need to see full recipe: ingredients, steps, cook time, photo, macros, link to original Jow page. | LOW | Straightforward display. Link to Jow for the actual cooking instructions. Photo from Jow scrape. |
| Plan regeneration / refresh | Users will dislike some suggestions. They need to regenerate the plan or swap individual meals. | MEDIUM | Full regenerate is easy. Individual meal swap requires the algorithm to find a replacement that keeps macro totals close to target. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Batch cooking support (x2, x3) with real macro math | Most meal planners ignore batch cooking. This product calculates real portions when you cook double/triple, accounting for actual macro content per batch portion. This is the user's stated need and competitors handle it poorly. | HIGH | Must adjust shopping quantities, recalculate per-portion macros, and update the plan to show which meals are leftovers. Jow's multipliers are unreliable -- the product must compute from ingredient-level data. |
| Sport schedule integration for macro targets | Users input their weekly sport sessions (type, intensity, duration). The system adjusts weekly macro targets based on training load. No competitor does this well at the meal planning level. | HIGH | Requires mapping sport types to caloric expenditure estimates. Adjust protein targets on training vs rest days (or weekly average for v1). Bridges the gap between fitness tracking and meal planning that MyFitnessPal/MacroFactor leave open. |
| Automated recipe selection (eliminate choice fatigue) | The core differentiator per PROJECT.md. Users don't pick recipes -- the algorithm picks for them based on macro optimization. Eat This Much does this but with a generic recipe database. This product does it with Jow recipes the user can actually order. | HIGH | Constraint satisfaction / optimization problem. Must balance: macro targets, variety (no repeats), user preferences, cook time constraints, batch cooking opportunities. |
| Macro-optimized plan algorithm | Not just random recipes that fit calories. The algorithm actively optimizes protein/carbs/fats distribution to hit specific targets, like a nutrition-aware constraint solver. | HIGH | Linear programming or greedy optimization. Must handle real-world constraints: limited recipe pool, batch cooking interactions, preference exclusions. This is the technical moat. |
| Jow integration (link to source for ordering) | Users already use Jow to order groceries via Leclerc Drive. The plan links back to Jow recipes so users can add them to their Jow cart manually. Reduces friction in the existing workflow. | LOW | Deep links to jow.fr recipe pages. Not automated ordering (out of scope), but the bridge between plan and action. |
| Weekly plan history | Users want to see past weeks' plans to avoid repeating the same meals and to track if they followed through. | LOW | Store generated plans with timestamps. Simple list view of past plans. Enables "don't repeat last week's meals" as a constraint. |
| Plan customization (lock meals, swap one) | User likes Monday's lunch but hates Tuesday's dinner. Lock the good ones, regenerate the bad ones. Granular control without starting over. | MEDIUM | Partial regeneration with constraints. The algorithm re-optimizes remaining slots while keeping locked meals' macros in the budget. |
| Shopping list generation from plan | Aggregate ingredients across all meals in the weekly plan into a consolidated shopping list. Group by category (produce, dairy, meat, pantry). | MEDIUM | Ingredient aggregation with unit normalization (200g + 300g = 500g, but 1 can + 2 cans = 3 cans). Must handle batch cooking quantities. Very useful but not core to the macro optimization value prop. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately do NOT build these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Calorie counting and detailed calorie tracking | Users from MyFitnessPal expect calorie fields everywhere | Scope creep -- calories are derivable from macros (protein*4 + carbs*4 + fat*9). Adding calories as a first-class concept duplicates data, creates confusion about whether to optimize macros or calories, and pulls the product toward being another calorie counter instead of a macro optimizer. | Display calories as a computed field where useful, but do not make it a target or optimization input. Macros are the primary abstraction. |
| Automated Jow/Leclerc Drive ordering | Users will want a "buy all this" button that orders groceries automatically | Extremely complex (browser automation, auth delegation, cart API reverse-engineering), fragile (breaks on Jow UI changes), potential legal/ToS issues with Jow. PROJECT.md already marks this out of scope. | Link to Jow recipe pages. User adds to cart manually. Possibly generate a shopping list they can reference while ordering. |
| Day-by-day macro adjustment based on sport schedule | "I lift heavy on Monday, rest on Tuesday, adjust my macros daily" | Over-optimization for v1. Massively increases algorithm complexity (7 different daily targets instead of 1 weekly target). Most users won't actually follow day-by-day precision. Creates meal prep problems (batch cooking assumes consistent portions). | Weekly macro target based on total weekly sport load. Maybe v2 adds training-day vs rest-day split (2 targets instead of 7). |
| Social features (share plans, follow friends, community recipes) | "I want to share my plan with my partner" or "community-driven recipes" | Massive scope increase. Requires content moderation, social graph, privacy controls. Distracts from the core value (automated macro-optimized planning). Social features are a product in themselves. | Focus on single-user excellence. Share via export (PDF/link) if needed. No social graph. |
| Full recipe editor / user-submitted recipes | Users want to add their own recipes or modify existing ones | Requires a full recipe creation UX, nutritional data entry/validation, ingredient database. Undermines the "Jow recipes you can actually order" value prop. User-submitted recipes won't have Jow ordering links. | Keep recipe source as Jow-only for v1. If users want custom recipes, that's a v2+ feature with careful UX. |
| Mobile app | "I want this on my phone" | Doubles the development surface. Web app works on mobile browsers. Native app is a massive investment for a solo/small team. No unique native capability needed (no camera, GPS, etc.). | Responsive web app. Works in mobile browser. PWA if needed for home screen icon. |
| Micronutrient tracking (vitamins, minerals, fiber) | Nutrition-conscious users want the full picture | Data availability is poor (Jow does not provide micronutrients, Claude enrichment for micros is unreliable). Adds complexity to the UI and algorithm without reliable data. | Stick to macros (protein, carbs, fats). Mention that a balanced variety of recipes naturally covers micronutrients. |
| Meal logging / food diary | "Did I actually eat what was planned?" | Turns the product into a food tracker (MyFitnessPal territory). Different product category, different UX patterns, different user behavior. Plan generation and plan tracking are different problems. | The plan IS the intent. If users want to track actual intake, they use MyFitnessPal alongside. Don't compete on tracking. |

## Feature Dependencies

```
[User Profile + Goals]
    |
    +--requires--> [TDEE/Macro Target Calculation]
    |                   |
    |                   +--requires--> [Weekly Plan Generation Algorithm]
    |                                       |
    |                                       +--requires--> [Recipe Catalog with Macros]
    |                                       |
    |                                       +--enhances--> [Macro Summary per Plan]
    |                                       |
    |                                       +--enhances--> [Shopping List Generation]
    |
    +--enhances--> [Sport Schedule Integration]
                        |
                        +--feeds-into--> [TDEE/Macro Target Calculation]

[Recipe Catalog with Macros]
    |
    +--requires--> [Recipe Scraping (Jow)]
    |
    +--requires--> [Macro Enrichment (Claude Code)]
    |
    +--requires--> [API Upload to Server]
    |
    +--enhances--> [Search/Filter]
    |
    +--enhances--> [Dietary Preference Filtering]

[Batch Cooking Support]
    |
    +--requires--> [Recipe Catalog with Macros]
    |
    +--requires--> [Portion Calculation Logic]
    |
    +--modifies--> [Weekly Plan Generation Algorithm]
    |
    +--modifies--> [Shopping List Generation]

[Plan Customization (lock/swap)]
    |
    +--requires--> [Weekly Plan Generation Algorithm]

[Authentication]
    |
    +--requires--> [User Profile + Goals] (multi-user isolation)

[Plan History]
    |
    +--requires--> [Weekly Plan Generation Algorithm]
    |
    +--requires--> [Authentication] (user-scoped)
```

### Dependency Notes

- **Weekly Plan Generation requires Recipe Catalog with Macros:** The algorithm cannot optimize without a pool of recipes that have macro data. The data pipeline (scrape -> enrich -> upload) must work before plan generation can begin.
- **Weekly Plan Generation requires TDEE/Macro Target Calculation:** The algorithm needs to know WHAT to optimize toward. User profile + goals must be configurable first.
- **Batch Cooking modifies Plan Generation:** Batch cooking is not a separate feature -- it changes how the algorithm selects and assigns recipes. A x2 batch means one cooking session covers two meal slots. The algorithm must account for this during selection, not as a post-processing step.
- **Sport Schedule enhances Macro Targets:** Sport schedule adjusts the weekly macro target upward. Without it, the product still works (manual TDEE input). With it, the product becomes smarter.
- **Shopping List requires Plan + Batch Cooking:** Shopping quantities depend on both what's in the plan and what's being batch-cooked (ingredients scale with batch multiplier).
- **Authentication is a prerequisite for multi-user:** Without auth, the product works for a single user. Auth is needed for SaaS but can be deferred to after the core algorithm works.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the core value proposition: "automated macro-optimized weekly meal plans from Jow recipes."

- [ ] **Recipe data pipeline** (scrape + enrich + upload) -- Without recipes with macros, nothing works
- [ ] **Recipe catalog with search/filter** -- Users need to see what's available and trust the data
- [ ] **Macronutrient display per recipe** -- Core to the value prop, must be visible and accurate
- [ ] **User profile with goals** -- Weight, height, age, sex, activity level, goal (cut/bulk/maintain)
- [ ] **TDEE and macro target calculation** -- Derived from profile, drives the algorithm
- [ ] **Weekly plan generation algorithm** -- The core feature. Generate lunch + dinner for 7 days optimized for macro targets
- [ ] **Macro summary per plan** -- Show how well the plan hits targets (daily + weekly totals vs goals)
- [ ] **Dietary preference filtering** -- Exclude recipes by dietary tags during generation
- [ ] **Plan regeneration** -- Full plan regenerate with one click
- [ ] **Authentication** -- Email/password, multi-user data isolation
- [ ] **Portion sizing** -- Calculate real portions from macro data (Jow portions are unreliable)

### Add After Validation (v1.x)

Features to add once core is working and users confirm the value prop.

- [ ] **Batch cooking support (x2, x3)** -- Add when users ask "can I cook once and eat twice?" This is complex and should not block initial launch, but is a key differentiator
- [ ] **Sport schedule integration** -- Add when users want smarter macro targets. Start with weekly target adjustment; day-by-day is v2+
- [ ] **Plan customization (lock/swap individual meals)** -- Add when users complain about having to regenerate the entire plan when they dislike one meal
- [ ] **Shopping list generation** -- Add when users ask "what do I need to buy?" Useful but not core to validating the recommendation algorithm
- [ ] **Plan history** -- Add when users want to reference past weeks or avoid repeats
- [ ] **Jow deep links on recipes** -- Add for convenience once the plan generation flow is validated

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Training-day vs rest-day macro split** -- Only after weekly targets are validated and users demand more granularity
- [ ] **Multiple recipe sources** -- Beyond Jow. Requires new scrapers, data normalization, loss of Jow ordering convenience
- [ ] **Custom recipe creation** -- Users add their own recipes with macro data. Requires full recipe editor UX
- [ ] **PDF/email export of plans** -- Sharing and offline access
- [ ] **Progressive Web App (PWA)** -- Home screen install, offline caching of plans
- [ ] **Recipe ratings and favorites** -- User signals to improve future recommendations
- [ ] **Ingredient substitution** -- "I don't have X, what can I use instead?" AI-powered substitution
- [ ] **Cost optimization** -- Minimize grocery cost while hitting macro targets (requires price data)
- [ ] **Multi-person household support** -- Generate plans for a family with different macro targets

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Recipe data pipeline (scrape/enrich/upload) | HIGH | MEDIUM | P1 |
| Recipe catalog with search/filter | HIGH | MEDIUM | P1 |
| Macronutrient display per recipe | HIGH | LOW | P1 |
| User profile with goals | HIGH | MEDIUM | P1 |
| TDEE and macro target calculation | HIGH | LOW | P1 |
| Weekly plan generation algorithm | HIGH | HIGH | P1 |
| Macro summary per plan | HIGH | LOW | P1 |
| Dietary preference filtering | HIGH | MEDIUM | P1 |
| Plan regeneration | MEDIUM | LOW | P1 |
| Authentication (multi-user) | HIGH | MEDIUM | P1 |
| Portion sizing (real calculation) | HIGH | MEDIUM | P1 |
| Batch cooking support (x2, x3) | HIGH | HIGH | P2 |
| Sport schedule integration | MEDIUM | HIGH | P2 |
| Plan customization (lock/swap) | MEDIUM | MEDIUM | P2 |
| Shopping list generation | MEDIUM | MEDIUM | P2 |
| Plan history | LOW | LOW | P2 |
| Jow deep links | MEDIUM | LOW | P2 |
| Training-day vs rest-day split | LOW | HIGH | P3 |
| Recipe ratings/favorites | MEDIUM | LOW | P3 |
| Custom recipe creation | LOW | HIGH | P3 |
| PDF/email export | LOW | MEDIUM | P3 |
| Cost optimization | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- validates the core value proposition
- P2: Should have, add when core is validated -- high-value enhancements
- P3: Nice to have, future consideration -- only after product-market fit

## Competitor Feature Analysis

| Feature | Eat This Much | Mealime | Jow | MyFitnessPal | Our Approach |
|---------|--------------|---------|-----|--------------|--------------|
| Auto meal plan generation | Yes, macro-based | Yes, preference-based | Yes, simple suggestions | No (tracking only) | Yes, macro-optimized from Jow recipes. Core differentiator: uses recipes you can actually order from Jow/Leclerc. |
| Macro tracking | Yes, per meal + daily | No | No | Yes, comprehensive | Yes, per recipe + daily + weekly summary. Focus on plan-level macros, not food logging. |
| Dietary preferences | Yes, extensive | Yes, extensive | Yes, basic | Yes, via food logging | Yes, tag-based filtering applied during generation. |
| Batch cooking | No | Limited ("leftovers" tag) | No | No | Yes, first-class support with real portion calculation and macro adjustment. Key differentiator. |
| Shopping list | Yes | Yes (excellent UX) | Yes (integrated with delivery) | No | Yes (v1.x), aggregated from plan with batch cooking awareness. |
| Sport/fitness integration | Basic (activity level) | No | No | Yes (exercise logging) | Yes, sport schedule adjusts macro targets. Bridges fitness and meal planning. |
| Recipe source | Generic database | Curated in-house | Jow's own recipes | User-logged foods | Jow recipes (scraped + enriched). Advantage: recipes tied to real grocery ordering. |
| Grocery ordering | No | No | Yes (Leclerc, Carrefour, etc.) | No | Link to Jow for manual ordering. Not automated. |
| Portion accuracy | Standard scaling | Standard scaling | Unreliable multipliers | N/A | Calculated from ingredient-level macro data. More accurate than Jow's own multipliers. |
| Price | $9/mo (premium) | Free (basic), $6/mo (pro) | Free | Free (basic), $20/yr (premium) | TBD -- SaaS pricing. Value prop justifies premium for serious meal preppers. |

### Competitive Positioning

This product occupies a unique niche: **macro-optimized meal planning using recipes you can actually order from Jow/Leclerc Drive**. No competitor combines:
1. Macro-based optimization (Eat This Much does this but with generic recipes)
2. Jow recipe integration (Jow does this but without macro optimization)
3. Batch cooking with real portion math (nobody does this well)
4. Sport schedule integration at the meal planning level (nobody does this well)

The closest competitor is **Eat This Much**, which auto-generates macro-targeted meal plans. The key differentiator is that Eat This Much uses a generic recipe database, while this product uses Jow recipes the user can order from Leclerc Drive -- closing the gap between "what should I eat" and "what do I actually buy."

## Sources

- Competitor analysis based on training data knowledge of: Eat This Much, Mealime, Jow, MyFitnessPal, MacroFactor, PlateJoy, MealPrepPro (MEDIUM confidence -- verified against training data from established products, but not live-verified as of 2026-02-08)
- PROJECT.md from this repository (HIGH confidence -- direct source)
- Domain knowledge of nutritional science (TDEE formulas, macro ratios) (HIGH confidence -- well-established science)
- Note: WebSearch and WebFetch were unavailable during this research session. Competitor features should be re-verified against current product pages if critical decisions depend on them.

---
*Feature research for: Meal prep / recipe recommendation SaaS*
*Researched: 2026-02-08*
