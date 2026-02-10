# Phase 6: Basic Meal Plan Generation - Research

**Researched:** 2026-02-10
**Domain:** Meal plan generation algorithm + weekly planner UI (Next.js 16 App Router)
**Confidence:** HIGH

## Summary

This phase requires building a meal plan generation engine that selects 14 unique recipes (2 meals/day x 7 days) optimized to match a user's weekly macro targets, plus a weekly planner UI with macro analysis. The domain breaks into three core areas: (1) the optimization algorithm, (2) a new DB schema for meal plans, and (3) the weekly grid UI with macro visualization.

The algorithm problem is a variant of the multi-dimensional knapsack/subset selection problem: given a pool of recipes with known per-serving macros, select 14 that minimize the deviation from weekly macro targets. Research into academic literature and practical implementations shows that for a modest recipe pool (hundreds, not thousands), a **random-restart hill-climbing** approach with scoring is both effective and simple to implement -- avoiding the complexity of genetic algorithms or simulated annealing while producing good results within milliseconds. The key insight is that with ~100-300 recipes and only 14 to select, random sampling + scoring + local improvements converges quickly.

The existing codebase provides strong foundations: the nutrition module (`src/lib/nutrition/`) already computes per-serving macros via `calculateRecipeMacros`, macro targets via `calculateMacroTargets`, and the Drizzle ORM schema supports recipes with ingredients and per-100g macro data. The UI will follow existing patterns (shadcn/ui Card components, MacroBadge, MacroBar patterns from the dashboard).

**Primary recommendation:** Use a server action-based generation flow with a random-sampling-with-scoring algorithm (`src/lib/meal-plan/`), a new `meal_plans` + `meal_plan_slots` DB schema, and a 7-column CSS Grid layout at `/plan` with responsive mobile stacking.

## Standard Stack

This phase uses NO new external libraries. Everything needed is already in the project.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Actions, page routing | Already the project framework |
| React | 19.2.3 | `useTransition` for loading states, `useState` for plan state | Already installed |
| Drizzle ORM | 0.45.1 | New meal_plans/meal_plan_slots tables, queries | Already the project ORM |
| Zod | 3.25.76 | Validation of generation params, API responses | Already installed |
| shadcn/ui | 3.8.4 | Card, Button, Skeleton, Badge, Progress components | Already the project UI library |
| Tailwind CSS | 4.x | CSS Grid layout, responsive breakpoints | Already installed |
| Lucide React | 0.563.0 | Icons for UI (Calendar, RefreshCw, Save, etc.) | Already installed |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications for save/error feedback | On save success/failure |
| class-variance-authority | 0.7.1 | Variant styling for match badges | Color-coded match indicators |

### New shadcn Components to Add
| Component | Purpose | How to Add |
|-----------|---------|------------|
| `progress` | Weekly macro progress bars (actual vs target) | `pnpm dlx shadcn@latest add progress` |
| `collapsible` | Expandable recipe cards in the grid | `pnpm dlx shadcn@latest add collapsible` |
| `tooltip` | Hover details on match badges and macro deltas | `pnpm dlx shadcn@latest add tooltip` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom algorithm | npm `genetic-algorithm` or `simulated-annealing` | Overkill for 14-item selection from ~200 recipes; custom is simpler, faster, testable |
| Server Action for generation | API Route | Server Actions integrate better with Next.js 16 transitions/loading; no auth header management needed |
| `useTransition` | `useActionState` | `useTransition` is more flexible for non-form actions like "Generate Plan" button click; `useActionState` is better for form submissions |

**Installation:**
```bash
pnpm dlx shadcn@latest add progress collapsible tooltip
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── meal-plan/
│       ├── types.ts              # MealPlan, MealSlot, GenerationParams, PlanScore types
│       ├── score.ts              # Scoring function: plan vs targets -> percentage match
│       ├── generate.ts           # Core algorithm: select 14 recipes optimized for macros
│       ├── constants.ts          # Scoring weights, thresholds, iteration counts
│       └── __tests__/
│           ├── score.test.ts
│           └── generate.test.ts
├── db/
│   └── schema/
│       └── meal-plans.ts         # meal_plans + meal_plan_slots tables
│   └── queries/
│       └── meal-plans.ts         # CRUD for meal plans
├── app/
│   ├── actions/
│   │   └── meal-plan.ts          # Server actions: generatePlan, savePlan
│   └── (authenticated)/
│       └── plan/
│           ├── page.tsx           # Server component: load profile, targets, existing plan
│           ├── loading.tsx        # Skeleton loading state
│           └── plan-client.tsx    # Client component: grid, generation trigger, save
├── components/
│   ├── meal-plan/
│   │   ├── weekly-grid.tsx        # 7-column grid layout
│   │   ├── meal-slot-card.tsx     # Individual recipe card in grid (expandable)
│   │   ├── daily-summary.tsx      # Daily macro actual vs target row
│   │   ├── weekly-summary.tsx     # Weekly progress bars P/G/L
│   │   └── match-badge.tsx        # Color-coded match percentage badge
```

### Pattern 1: Random-Restart Hill-Climbing Algorithm
**What:** Generate multiple random candidate plans, score each against macro targets, keep the best. Then apply local improvements (swap one recipe for a better-fitting one) until convergence.
**When to use:** For the meal plan generation -- this is the core algorithm choice.

**Algorithm steps:**
1. Fetch all recipes with computed per-serving macros from DB
2. Calculate weekly macro targets (daily targets x 7)
3. For N iterations (e.g., 50):
   a. Randomly sample 14 unique recipes from the pool
   b. Score the plan against weekly macro targets
   c. If score > best score, keep as best plan
4. Local optimization on the best plan:
   a. For each slot, try swapping with unused recipes
   b. Keep the swap if it improves the overall score
   c. Repeat until no improvement found (max 3 passes)
5. Return the best plan with its score

**Why this approach:**
- With ~200 recipes and 14 slots, random sampling explores the space efficiently
- Local optimization polishes the result without complex GA/SA infrastructure
- Deterministic scoring makes it fully testable
- Runs in <100ms for typical recipe pools (no external API calls)
- Easy to add constraints (variety, cuisine diversity) as penalty terms in the score

```typescript
// Source: Custom design based on research
interface GenerationParams {
  weeklyTargets: WeeklyMacroTargets;
  recipePool: ScoredRecipe[];
  iterations?: number;       // default: 50
  maxLocalPasses?: number;   // default: 3
}

interface PlanResult {
  slots: MealSlot[];           // 14 slots: day 0-6, meal "midi"|"soir"
  score: PlanScore;
  warnings: string[];
}

interface PlanScore {
  overall: number;             // 0-100 percentage match
  protein: MacroScore;
  carbs: MacroScore;
  fat: MacroScore;
  calories: MacroScore;
  variety: number;             // 0-100 variety sub-score
}

interface MacroScore {
  target: number;
  actual: number;
  delta: number;               // actual - target (negative = deficit)
  percentage: number;          // 0-100 how close
}
```

### Pattern 2: Scoring Function Design
**What:** Weighted sum of per-macro deviation scores, normalized to 0-100%.
**When to use:** Everywhere a plan's quality is evaluated.

```typescript
// Source: Custom design
function scorePlan(
  slots: MealSlot[],
  weeklyTargets: WeeklyMacroTargets,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): PlanScore {
  // Sum per-serving macros across all 14 meals
  const actual = sumMacros(slots);

  // Per-macro score: 100 - (|delta| / target * 100), clamped to [0, 100]
  const proteinScore = macroScore(actual.protein, weeklyTargets.protein);
  const carbsScore = macroScore(actual.carbs, weeklyTargets.carbs);
  const fatScore = macroScore(actual.fat, weeklyTargets.fat);
  const caloriesScore = macroScore(actual.calories, weeklyTargets.calories);

  // Variety bonus: penalize if consecutive meals share cuisine
  const varietyScore = calculateVarietyScore(slots);

  // Weighted overall: macros take priority over variety
  const overall =
    proteinScore.percentage * weights.protein +
    carbsScore.percentage * weights.carbs +
    fatScore.percentage * weights.fat +
    caloriesScore.percentage * weights.calories +
    varietyScore * weights.variety;

  return { overall: Math.round(overall), ... };
}

// Recommended weights (macros take priority per CONTEXT.md):
const DEFAULT_WEIGHTS = {
  protein: 0.30,   // Most important for fitness goals
  calories: 0.25,
  carbs: 0.20,
  fat: 0.15,
  variety: 0.10,   // "macros take priority" per user decision
};
```

### Pattern 3: Server Action + useTransition for Generation
**What:** Use a server action called via `useTransition` to handle the generation flow with loading state.
**When to use:** For the "Generate Plan" button click flow.

```typescript
// src/app/actions/meal-plan.ts
"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateMealPlan } from "@/lib/meal-plan/generate";
import { getFullUserProfile } from "@/db/queries/profiles";
import { getAllRecipesWithMacros } from "@/db/queries/meal-plans";

export async function generatePlan(): Promise<GeneratePlanResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Non authentifie" };

  const { profile, sportActivities } = await getFullUserProfile(session.user.id);
  // ... compute macro targets ...
  const recipePool = await getAllRecipesWithMacros();
  const plan = generateMealPlan({ weeklyTargets, recipePool });
  return { success: true, plan };
}

// src/app/(authenticated)/plan/plan-client.tsx
"use client";

function PlanClient({ initialTargets }: Props) {
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generatePlan();
      if (result.success) setPlan(result.plan);
    });
  }

  return (
    <>
      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generation en cours..." : "Generer un plan"}
      </Button>
      {plan && <WeeklyGrid plan={plan} targets={initialTargets} />}
    </>
  );
}
```

### Pattern 4: DB Schema for Meal Plans
**What:** Two tables -- `meal_plans` (one per saved plan) and `meal_plan_slots` (14 rows per plan).
**When to use:** For persisting user-saved plans.

```typescript
// src/db/schema/meal-plans.ts
import { pgEnum, pgTable, integer, real, text, uuid, jsonb } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./common";
import { user } from "./auth";
import { recipes } from "./recipes";

export const mealTypeEnum = pgEnum("meal_type", ["midi", "soir"]);

export const mealPlans = pgTable("meal_plans", {
  ...idColumn,
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  weekStart: text().notNull(),         // ISO date string "2026-02-10"
  overallScore: real().notNull(),      // 0-100 match percentage
  macroSummary: jsonb().notNull(),     // { target: MacroTargets, actual: MacroTargets }
  ...timestamps,
});

export const mealPlanSlots = pgTable("meal_plan_slots", {
  ...idColumn,
  planId: uuid()
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  dayIndex: integer().notNull(),       // 0 (Mon) to 6 (Sun)
  mealType: mealTypeEnum().notNull(),  // "midi" or "soir"
  recipeId: uuid()
    .notNull()
    .references(() => recipes.id),
  macrosSnapshot: jsonb().notNull(),   // { calories, protein, carbs, fat } at generation time
  ...timestamps,
});
```

### Pattern 5: 7-Column Responsive Grid
**What:** CSS Grid with 7 equal columns for desktop, horizontal scroll or stacked cards for mobile.
**When to use:** The weekly planner layout on the `/plan` page.

```tsx
// Desktop: 7-column grid
// Tablet: horizontal scroll with snap
// Mobile: vertical stack (day-by-day cards)

<div className="hidden lg:grid lg:grid-cols-7 lg:gap-2">
  {/* Day columns */}
</div>

{/* Mobile: scrollable day cards */}
<div className="flex gap-4 overflow-x-auto snap-x snap-mandatory lg:hidden">
  {days.map((day) => (
    <div key={day} className="min-w-[280px] snap-center">
      {/* Day card with midi + soir */}
    </div>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Client-side algorithm execution:** The generation should run in a server action, not in the browser. The recipe pool query and macro computation are server-side concerns.
- **Fetching recipes one-by-one in the algorithm:** Batch-fetch ALL recipes with macros in a single query, then run the algorithm in-memory.
- **Storing computed macros in the plan without snapshot:** Always snapshot the macros at generation time into `meal_plan_slots.macrosSnapshot`. Recipe macro data could change (enrichment pipeline re-runs), but the saved plan should reflect what the user saw.
- **Hard-coding meal count:** Use a constant `MEALS_PER_DAY = 2` that can be changed in Phase 7, not the literal `2` scattered throughout.
- **Tight coupling between algorithm and UI:** The `src/lib/meal-plan/` module should be pure functions with no React/Next.js imports. The server action bridges algorithm and UI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bar UI | Custom div-based progress | shadcn `Progress` component | Accessible, animated, consistent with design system |
| Expandable cards | Custom toggle + height animation | shadcn `Collapsible` component | Handles animation, accessibility, keyboard nav |
| Tooltip for deltas | Custom hover popup | shadcn `Tooltip` component | Consistent positioning, accessible |
| Loading skeleton | Custom placeholder divs | shadcn `Skeleton` component (already used) | Consistent with existing loading patterns |
| Toast notifications | Custom notification system | `sonner` (already installed) | Already used in project, handles stacking/timing |
| Form/action state | Custom loading boolean | React `useTransition` | Built-in pending state, integrates with Suspense |
| Macro calculation | Re-implementing recipe macro logic | `calculateRecipeMacros` from `@/lib/nutrition` | Already exists, tested, handles edge cases |
| BMR/TDEE/targets | Re-computing from scratch | `calculateBMR`, `calculateTDEE`, `calculateMacroTargets` from `@/lib/nutrition` | Already exists, evidence-based constants |

**Key insight:** The only truly new code is the generation algorithm (`src/lib/meal-plan/`) and the DB schema/queries for plans. Everything else composes existing infrastructure.

## Common Pitfalls

### Pitfall 1: Recipe Pool Too Small
**What goes wrong:** If fewer than 14 recipes have reliable macro data (confidence "high" or "medium"), the algorithm cannot fill all 14 slots with quality data.
**Why it happens:** Some recipes have incomplete ingredient data or unconverted units, leading to "low" confidence macro calculations.
**How to avoid:** Pre-filter the recipe pool to only include recipes with macro confidence >= "medium". Show a warning if pool size < 30 (too few for meaningful optimization). If pool < 14, generate with available recipes and fill remaining slots with best-effort picks, flagging them.
**Warning signs:** Algorithm always produces similar plans (small pool = no variety).

### Pitfall 2: Overfitting to One Macro at Expense of Others
**What goes wrong:** Algorithm picks 14 high-protein recipes that blow the fat/calorie budget.
**Why it happens:** Scoring function weights one macro too heavily, or the scoring does not penalize going OVER target (only under).
**How to avoid:** Score BOTH over and under target equally. Use `Math.abs(actual - target) / target` as the deviation metric. Use balanced weights across macros. Test with edge cases (very high protein target, low-calorie target).
**Warning signs:** One macro consistently at 95%+ while others are at 60%.

### Pitfall 3: Generation Feels Slow Without Feedback
**What goes wrong:** User clicks "Generate" and sees nothing for 1-2 seconds (DB query + algorithm).
**Why it happens:** Server action round-trip includes DB fetch of all recipes with ingredients.
**How to avoid:** Use `useTransition` for `isPending` state. Show a skeleton grid or spinner immediately. Pre-compute recipe macros in the DB query (join ingredients, compute per-serving).
**Warning signs:** Users clicking "Generate" multiple times because they think it did not work.

### Pitfall 4: Macro Snapshot Drift
**What goes wrong:** User saves a plan, then the enrichment pipeline updates ingredient macros. Old saved plan now shows different macros than when it was generated.
**Why it happens:** Reading live recipe data instead of the snapshotted macros from generation time.
**How to avoid:** Store macros in `meal_plan_slots.macrosSnapshot` at generation time. When displaying a SAVED plan, read from snapshot. When displaying an UNSAVED plan, compute live (it was just generated).
**Warning signs:** Saved plan scores change without user action.

### Pitfall 5: N+1 Query in Recipe Pool Fetch
**What goes wrong:** Fetching recipes, then for each recipe fetching ingredients, then for each ingredient computing macros. This creates hundreds of DB queries.
**Why it happens:** Using ORM relations naively without batch loading.
**How to avoid:** Write a single Drizzle query that joins recipes with recipe_ingredients and ingredients, returning all data in one query. Then compute macros in-memory with `calculateRecipeMacros`.
**Warning signs:** Generation takes >2 seconds, DB connection pool exhaustion.

### Pitfall 6: Non-Deterministic Tests
**What goes wrong:** Algorithm tests are flaky because random sampling produces different results each run.
**Why it happens:** The algorithm uses `Math.random()` internally.
**How to avoid:** Accept a `random` function parameter (default: `Math.random`) in the generation function. In tests, pass a seeded PRNG (simple linear congruential generator). Test scoring functions separately (they are deterministic). For integration tests, assert on score ranges rather than exact recipes.
**Warning signs:** Tests pass locally but fail in CI intermittently.

### Pitfall 7: Mobile Grid Unusable
**What goes wrong:** 7-column grid is unreadable on mobile (tiny columns).
**Why it happens:** Forcing 7 columns at all breakpoints.
**How to avoid:** Use responsive breakpoints: `lg:grid-cols-7` for desktop, horizontal scroll with `snap-x` for tablet, vertical day cards for mobile. Test at 375px width.
**Warning signs:** Users cannot read recipe names or macro values on mobile.

## Code Examples

### Fetching All Recipes with Pre-Computed Macros
```typescript
// src/db/queries/meal-plans.ts
// Source: Existing Drizzle patterns from src/db/queries/recipes.ts

import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { recipeIngredients } from "@/db/schema/ingredients";
import { ingredients } from "@/db/schema/ingredients";
import { isNotNull } from "drizzle-orm";

export async function getAllRecipesWithIngredients() {
  // Single query: all recipes with their ingredients and macro data
  const rows = await db.query.recipes.findMany({
    with: {
      recipeIngredients: {
        with: {
          ingredient: true,
        },
      },
    },
  });

  return rows;
}
```

### Computing Weekly Targets from Daily
```typescript
// Source: Existing nutrition module types
import type { MacroTargets } from "@/lib/nutrition";

export interface WeeklyMacroTargets {
  calories: number;  // daily * 7
  protein: number;
  carbs: number;
  fat: number;
}

export function dailyToWeekly(daily: MacroTargets): WeeklyMacroTargets {
  return {
    calories: daily.calories * 7,
    protein: daily.protein * 7,
    carbs: daily.carbs * 7,
    fat: daily.fat * 7,
  };
}
```

### Per-Macro Score Calculation
```typescript
// Source: Custom design
export function macroScore(actual: number, target: number): MacroScore {
  if (target === 0) {
    return { target: 0, actual, delta: actual, percentage: actual === 0 ? 100 : 0 };
  }
  const delta = actual - target;
  const deviationRatio = Math.abs(delta) / target;
  // 0% deviation = 100 score, 20% deviation = 0 score (clamped)
  const percentage = Math.max(0, Math.min(100, Math.round((1 - deviationRatio / 0.2) * 100)));

  return { target, actual, delta: Math.round(delta), percentage };
}
```

### Match Badge Color Thresholds
```typescript
// Source: Custom design, consistent with existing MacroBadge patterns
export function matchColor(score: number): "green" | "yellow" | "red" {
  if (score >= 85) return "green";   // Good match
  if (score >= 65) return "yellow";  // Acceptable
  return "red";                       // Poor match
}

// In the UI:
// green  -> bg-green-100 text-green-700  (consistent with existing ConfidenceBadge "high")
// yellow -> bg-amber-100 text-amber-700  (consistent with existing MacroBar carbs color)
// red    -> bg-red-100 text-red-700      (consistent with existing MacroBadge)
```

### Server Action: Save Plan
```typescript
// src/app/actions/meal-plan.ts
"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mealPlans, mealPlanSlots } from "@/db/schema/meal-plans";

export async function savePlan(
  plan: PlanToSave,
): Promise<{ success: true; planId: string } | { error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Non authentifie" };

  const result = await db.transaction(async (tx) => {
    const [savedPlan] = await tx
      .insert(mealPlans)
      .values({
        userId: session.user.id,
        weekStart: plan.weekStart,
        overallScore: plan.score.overall,
        macroSummary: plan.macroSummary,
      })
      .returning();

    await tx.insert(mealPlanSlots).values(
      plan.slots.map((slot) => ({
        planId: savedPlan.id,
        dayIndex: slot.dayIndex,
        mealType: slot.mealType,
        recipeId: slot.recipeId,
        macrosSnapshot: slot.macros,
      })),
    );

    return savedPlan;
  });

  return { success: true, planId: result.id };
}
```

### Expandable Recipe Card in Grid
```typescript
// Source: Using shadcn Collapsible pattern
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function MealSlotCard({ slot, dailyTarget }: MealSlotCardProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <p className="text-xs font-medium line-clamp-2">{slot.recipe.title}</p>
            <MatchBadge score={slot.matchScore} />
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-2 text-xs space-y-1 border-t">
          <MacroBadge label="P" value={slot.macros.protein} unit="g" color="blue" />
          <MacroBadge label="G" value={slot.macros.carbs} unit="g" color="yellow" />
          <MacroBadge label="L" value={slot.macros.fat} unit="g" color="red" />
          <p className="text-muted-foreground">{slot.macros.calories} kcal</p>
          {/* Ingredient list */}
          <ul className="text-muted-foreground">
            {slot.recipe.ingredients.map((ing) => (
              <li key={ing.id}>{ing.name}</li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (Next 14) | `useActionState` (React 19 / Next 16) | React 19 (2024) | `useActionState` is the canonical way; `useFormState` deprecated |
| `startTransition` for mutations | Server Actions + `useTransition` | Next.js 15+ (2025) | Server Actions are stable; `useTransition` gives `isPending` |
| Client-side optimization | Server-side generation via Server Actions | Next.js 16 (2026) | Keep heavy computation server-side; send only results to client |

**Deprecated/outdated:**
- `useFormState`: Renamed to `useActionState` in React 19. The project uses React 19.2.3, so use `useActionState` if form-based, or `useTransition` for non-form actions.
- `experimental_useFormStatus`: Now stable as `useFormStatus` from `react-dom`.

## Algorithm Deep Dive (Claude's Discretion Resolution)

Per CONTEXT.md, the exact algorithm approach is Claude's discretion. After researching genetic algorithms, simulated annealing, constraint programming, and greedy approaches, the recommendation is:

### Recommended: Random-Restart Hill-Climbing with Weighted Scoring

**Why not genetic algorithms?**
- Overkill for 14-item selection from ~200 recipes
- Requires complex crossover/mutation operators
- Harder to test deterministically
- Convergence takes many more iterations

**Why not simulated annealing?**
- Temperature scheduling adds complexity without proportional benefit
- For this problem size, random restarts achieve similar exploration

**Why not pure greedy?**
- Greedy (pick best-fitting recipe for each slot sequentially) gets trapped: early slots take "perfect" recipes, leaving poor options for later slots
- Does not optimize at the weekly level as required

**Why random-restart hill-climbing?**
- Simple to implement (~100 lines of core logic)
- 50 random starts + local optimization = excellent coverage of solution space
- Runs in <50ms for 200 recipes (verified reasoning: 50 iterations x 14 selections x scoring = ~70K operations)
- Fully deterministic when seeded -- perfect for testing
- Easy to extend: add constraints as penalty terms in scoring
- Debuggable: log top-5 candidates and their scores

### Match Score Color Thresholds (Claude's Discretion Resolution)
| Score Range | Color | Label | Meaning |
|-------------|-------|-------|---------|
| 85-100 | Green | "Excellent" | Within ~3% of all macro targets |
| 65-84 | Amber/Yellow | "Bon" | Within ~7% of most macro targets |
| 0-64 | Red | "A ameliorer" | Significant gaps, user should be warned |

### Generation UX (Claude's Discretion Resolution)
Recommendation: **One-click generation with immediate preview.**
- User lands on `/plan` page, sees empty state with "Generer mon plan" CTA
- Click triggers server action via `useTransition` (shows skeleton grid during loading)
- Plan appears with score and macro analysis
- User can "Regenerer" (full reshuffle) or "Sauvegarder"
- No preview-then-save gate -- the generated plan IS the preview

### Mobile Layout (Claude's Discretion Resolution)
Recommendation: **Horizontal scroll with snap on mobile/tablet, 7-column grid on lg+.**
- `lg:` breakpoint (1024px+): 7-column CSS Grid
- Below lg: horizontally scrollable day cards with `snap-x snap-mandatory`
- Each day card shows day name + midi/soir stacked vertically
- Weekly summary always visible as a fixed/sticky section above the grid

### Dashboard Link (Claude's Discretion Resolution)
Recommendation: **Yes, add a link to /plan in the header nav.**
- Add a "Mon plan" link in the header dropdown menu (alongside "Mes macros" and "Mon profil")
- Uses `CalendarDays` icon from lucide-react

## Open Questions

1. **Recipe pool size in production**
   - What we know: The pipeline scrapes from Jow.fr and enriches with macros
   - What's unclear: How many recipes currently have reliable (high/medium confidence) macro data? This directly affects algorithm quality.
   - Recommendation: During implementation, add a diagnostic query to count recipes by macro confidence level. If < 30 with "high" confidence, the algorithm will produce mediocre results. Consider including "medium" confidence recipes in the pool.

2. **Per-serving macro accuracy**
   - What we know: `calculateRecipeMacros` computes per-serving from ingredients, but some ingredients have `null` macro data or unconvertible units
   - What's unclear: What percentage of recipes have all 4 macros (P/G/L/Cal) accurately computed?
   - Recommendation: Pre-compute and cache recipe macros in a materialized view or denormalized column rather than computing at generation time. This speeds up generation and makes it easier to filter by macro quality.

3. **Cuisine/category data coverage**
   - What we know: Recipe schema has `cuisine` and `category` fields
   - What's unclear: How many recipes have these fields populated? Variety scoring depends on this data.
   - Recommendation: If coverage is low, fall back to a simpler variety metric (avoid consecutive recipes with the same dominant ingredient type) rather than cuisine-based diversity.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** - `src/lib/nutrition/`, `src/db/schema/`, `src/db/queries/`, `src/components/` (direct inspection)
- **Drizzle ORM** v0.45.1 - Query patterns, schema definition, transaction support (verified from existing usage in codebase)
- **Next.js 16.1.6** - Server Actions, App Router, `useTransition` (verified from `package.json` and existing patterns in codebase)
- **React 19.2.3** - `useTransition`, `useState`, `useActionState` (verified from `package.json`)

### Secondary (MEDIUM confidence)
- [Next.js Server Actions Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions) - Patterns for `useActionState` and `useTransition` with loading states
- [Next.js official docs: Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) - Server Actions patterns
- [CSS Grid 7-column calendar layout](https://zellwk.com/blog/calendar-with-css-grid/) - Grid layout patterns for weekly views
- [CSS-Tricks: Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/) - Responsive grid strategies

### Tertiary (LOW confidence)
- [Genetic algorithm meal optimization (MATLAB)](https://github.com/AngelsGills/Meal-Recommendation-Optimization) - Confirmed GA is overkill for our scale
- [Frontiers in Nutrition: AI-based nutrition recommender (2025)](https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1546107/pdf) - Academic validation of recommendation approach
- [Springer: Automatic dietary menu planning (evolutionary algorithm)](https://www.researchgate.net/publication/278965698_Automatic_dietary_menu_planning_based_on_evolutionary_algorithm) - Confirmed multi-dimensional knapsack framing
- [PMC: Reinforcement Learning meal planning](https://pmc.ncbi.nlm.nih.gov/articles/PMC10857145/) - Too complex for our use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in the project; no new external dependencies needed
- Architecture: HIGH - Patterns directly derived from existing codebase conventions and established Next.js 16 patterns
- Algorithm: HIGH - Well-understood optimization technique (random-restart hill-climbing); problem size is small enough that simple approaches work well
- Pitfalls: HIGH - Based on direct codebase inspection (N+1 queries visible in existing code, macro data gaps known from schema)
- UI layout: MEDIUM - CSS Grid 7-column responsive pattern is well-documented but mobile adaptation needs real-device testing

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable -- no fast-moving dependencies)
