# Phase 5: Macro Calculation Engine - Research

**Researched:** 2026-02-09
**Domain:** Nutrition science (TDEE, macronutrient planning), unit conversion, computational nutrition
**Confidence:** HIGH

## Summary

This phase requires implementing four core calculations: (1) BMR via Mifflin-St Jeor, (2) TDEE adjustment via MET-based sport session integration, (3) macro target derivation per goal using evidence-based g/kg recommendations, and (4) per-serving macro computation from ingredient data. The research confirms Mifflin-St Jeor as the gold standard for BMR prediction (recommended by the American Dietetic Association), with well-documented formulas and activity multipliers. MET values from the 2024 Adult Compendium of Physical Activities provide authoritative sport-specific energy costs. Protein recommendations are anchored to ISSN position stands using g/kg body weight rather than flat percentages.

The existing database schema already stores ingredient macros per 100g (930/931 ingredients covered) and recipe quantities with units. The main challenge is unit-to-gram conversion for non-kilogram units (Piece, Cuillere a soupe, Cuillere a cafe, Bouquet, Tranche, etc.), which requires a static lookup table of average weights.

**Primary recommendation:** Use Mifflin-St Jeor for BMR, a hybrid TDEE approach (base activity multiplier + MET-based sport calorie addition), and g/kg-anchored macro targets per goal. All formulas should be pure functions in a shared `src/lib/nutrition/` module, fully unit-testable.

## Standard Stack

### Core

No additional libraries needed. This is pure computation using TypeScript functions.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (existing) | All computation logic | Pure functions, type-safe, testable |
| Zod | (existing) | Input validation for profile data | Already used in pipeline for nutrition validation |
| Vitest | (existing) | Unit testing all formulas | Already configured in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | All computation is arithmetic -- no external dependencies required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom formulas | nutrition-calculator npm packages | Custom is better here: formulas are simple arithmetic, external packages add unnecessary dependency and may use different constants |
| Server-side only | Shared lib (server + client) | Shared is better: allows instant client-side recalculation when user changes profile inputs |

## Architecture Patterns

### Recommended Project Structure

```
src/lib/nutrition/
  bmr.ts               # Mifflin-St Jeor BMR calculation
  tdee.ts              # TDEE from BMR + activity + sport sessions
  macro-targets.ts     # Daily macro targets (P/G/L in grams) per goal
  recipe-macros.ts     # Per-serving macro calculation for recipes
  unit-conversion.ts   # Unit-to-grams conversion table
  constants.ts         # MET values, activity multipliers, macro ratios
  types.ts             # Shared types (MacroTargets, TDEEResult, etc.)
  index.ts             # Public API
  __tests__/
    bmr.test.ts
    tdee.test.ts
    macro-targets.test.ts
    recipe-macros.test.ts
    unit-conversion.test.ts
```

### Pattern 1: Pure Function Pipeline

**What:** Each calculation step is a pure function taking typed inputs and returning typed outputs. Functions compose: BMR -> TDEE -> MacroTargets.

**When to use:** Always. This is the core pattern for the entire module.

**Example:**
```typescript
// types.ts
interface UserProfile {
  weight: number;      // kg
  height: number;      // cm
  age: number;         // years
  sex: "homme" | "femme";
  activityLevel: "sedentaire" | "legerement_actif" | "moderement_actif" | "actif" | "tres_actif";
  goal: "seche" | "maintien" | "prise_de_masse" | "recomposition";
}

interface SportSession {
  activityType: "course" | "musculation" | "natation" | "velo" | "yoga" | "marche" | "sport_collectif";
  weeklyFrequency: number;  // sessions per week
}

interface BMRResult {
  bmr: number;  // kcal/day
}

interface TDEEResult {
  bmr: number;           // base BMR
  activityTDEE: number;  // BMR * activity multiplier (without sport)
  sportCalories: number; // weekly sport calories / 7 (daily average)
  tdee: number;          // final daily TDEE
}

interface MacroTargets {
  calories: number;   // kcal/day (TDEE adjusted for goal)
  protein: number;    // grams/day
  fat: number;        // grams/day
  carbs: number;      // grams/day
}

interface RecipeMacrosPerServing {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "high" | "medium" | "low";
  missingIngredients: string[];
  totalIngredients: number;
}

// bmr.ts
function calculateBMR(profile: UserProfile): BMRResult { ... }

// tdee.ts
function calculateTDEE(bmr: BMRResult, profile: UserProfile, sportSessions: SportSession[]): TDEEResult { ... }

// macro-targets.ts
function calculateMacroTargets(tdee: TDEEResult, profile: UserProfile): MacroTargets { ... }
```

### Pattern 2: Hybrid TDEE Approach (Base Activity + Sport MET Addition)

**What:** Instead of using a single activity multiplier that tries to capture everything, use a two-part approach:
1. Base activity multiplier captures daily lifestyle (NEAT, work, commuting) -- uses a LOWER multiplier since sport is separated out
2. Sport sessions are calculated separately using MET values and added on top

**When to use:** This is the recommended approach because the user's sport sessions are stored explicitly in the DB, and the activity level enum captures lifestyle (not sport).

**Why:** The standard activity multipliers (1.2, 1.375, 1.55, etc.) were designed to include exercise. Since we track sport sessions separately, using the full multiplier AND adding sport would double-count. The solution: use reduced base multipliers for lifestyle-only NEAT, then add sport calories via MET.

**Example:**
```typescript
// constants.ts

// BASE activity multipliers (lifestyle NEAT only, exercise excluded)
// These are intentionally lower than standard multipliers because
// sport sessions are calculated separately via MET values
const BASE_ACTIVITY_MULTIPLIERS = {
  sedentaire: 1.2,          // Desk job, minimal movement
  legerement_actif: 1.3,    // Some walking, light daily activity
  moderement_actif: 1.4,    // On feet part of day, moderate daily movement
  actif: 1.5,               // Physical job, lots of daily movement
  tres_actif: 1.6,          // Very physical job (construction, farming)
} as const;

// MET values per sport type (average for typical recreational session)
// Source: 2024 Adult Compendium of Physical Activities
const SPORT_MET_VALUES = {
  course: 9.0,           // Running, ~8 km/h average recreational jogging
  musculation: 5.0,      // Weight training, moderate effort (Compendium 02052)
  natation: 5.8,         // Swimming laps, freestyle, slow/recreational (18240)
  velo: 7.0,             // Cycling, moderate pace ~15-20 km/h (01016/01030)
  yoga: 2.5,             // Hatha yoga (02150/02175)
  marche: 4.3,           // Brisk walking ~5.5 km/h (17200)
  sport_collectif: 7.5,  // Team sports average (soccer casual 7.0, basketball 7.5)
} as const;

// Default session duration in hours per sport type
const DEFAULT_SESSION_DURATION_HOURS = {
  course: 1.0,
  musculation: 1.0,
  natation: 1.0,
  velo: 1.5,
  yoga: 1.0,
  marche: 1.0,
  sport_collectif: 1.5,
} as const;

// tdee.ts
function calculateTDEE(
  bmrResult: BMRResult,
  profile: UserProfile,
  sportSessions: SportSession[],
): TDEEResult {
  const { bmr } = bmrResult;

  // Step 1: Base lifestyle TDEE (no sport)
  const activityMultiplier = BASE_ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const activityTDEE = bmr * activityMultiplier;

  // Step 2: Weekly sport calories via MET
  // Formula: calories = MET * weight(kg) * duration(hours) * frequency
  // Note: MET already includes 1 MET of resting, but since activityTDEE
  // covers resting, we subtract 1 MET to avoid double-counting rest
  let weeklySportCalories = 0;
  for (const session of sportSessions) {
    const met = SPORT_MET_VALUES[session.activityType];
    const duration = DEFAULT_SESSION_DURATION_HOURS[session.activityType];
    const netMET = met - 1; // subtract resting component (already in activityTDEE)
    weeklySportCalories += netMET * profile.weight * duration * session.weeklyFrequency;
  }

  // Step 3: Spread weekly sport calories evenly across 7 days
  const dailySportCalories = weeklySportCalories / 7;

  // Step 4: Final TDEE
  const tdee = activityTDEE + dailySportCalories;

  return {
    bmr,
    activityTDEE,
    sportCalories: dailySportCalories,
    tdee: Math.round(tdee),
  };
}
```

### Pattern 3: Goal-Based Calorie Adjustment

**What:** Apply a caloric surplus or deficit based on the user's goal before computing macro split.

**Example:**
```typescript
// constants.ts

// Calorie adjustment factors per goal
// Source: Evidence-based recommendations from sports nutrition research
const GOAL_CALORIE_ADJUSTMENTS = {
  seche: -0.20,            // 20% deficit (evidence: 20-25% for sustainable fat loss)
  maintien: 0,             // Maintenance -- no adjustment
  prise_de_masse: +0.10,   // 10% surplus (evidence: 5-10% for lean muscle gain)
  recomposition: -0.10,    // 10% deficit (slight deficit with high protein)
} as const;
```

### Anti-Patterns to Avoid

- **Flat percentage macros for all profiles:** "40/30/30" ignores body weight. A 60kg woman and a 100kg man need wildly different protein amounts. Always anchor protein to g/kg.
- **Using standard activity multipliers AND adding sport calories:** This double-counts exercise. The standard multipliers (1.375 for "lightly active") already assume 1-3 days/week of exercise.
- **Storing computed macros in the database:** These are derived values. Recompute on access. If the user changes their weight, all targets should update instantly.
- **Hard-coding a single MET per sport with no explanation:** Document sources, use Compendium values.

## Formulas Reference (Evidence-Based)

### 1. Mifflin-St Jeor BMR (1990, validated)

**Confidence: HIGH** -- Recommended by the American Dietetic Association as the most accurate predictive equation for BMR.

```
Men:    BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + 5
Women:  BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) - 161
```

- Accuracy: Predicts within 10% of measured BMR in ~82% of cases (non-obese), ~70% (obese)
- Superior to Harris-Benedict (1919, revised 1984) which tends to overestimate by 5%
- Limitation: Developed on white American population; may be less accurate for other ethnic groups
- Source: Mifflin MD, St Jeor ST, et al. (1990). AJCN 51:241-247

### 2. MET-Based Sport Calorie Calculation

**Confidence: HIGH** -- Based on 2024 Adult Compendium of Physical Activities (1114 activities measured).

```
Calories_per_session = MET * weight_kg * duration_hours
Net_calories = (MET - 1) * weight_kg * duration_hours  // subtract resting component
```

MET values for the app's sport types (from 2024 Compendium):

| Sport Type (DB enum) | MET Value | Compendium Reference | Notes |
|----------------------|-----------|---------------------|-------|
| course | 9.0 | 12045: Running 5.5-5.8 mph | Average recreational jogging |
| musculation | 5.0 | 02052: Resistance training squats/deadlifts | Moderate effort, varied exercises |
| natation | 5.8 | 18240: Swimming laps freestyle slow | Recreational lap swimming |
| velo | 7.0 | 01016: Cycling self-selected moderate pace | ~15-20 km/h recreational |
| yoga | 2.5 | 02150/02175: Hatha/general yoga | Low intensity mind-body |
| marche | 4.3 | 17200: Walking 3.5-3.9 mph brisk | Brisk walking for exercise |
| sport_collectif | 7.5 | 15055/15610: Basketball/soccer general | Average across team sports |

### 3. Activity Level Multipliers (Base Lifestyle, Sport Excluded)

**Confidence: MEDIUM** -- Standard multipliers are well-documented but the reduced values for "sport excluded" are derived by analysis, not directly from a single study.

| Activity Level (DB enum) | Multiplier | Description |
|--------------------------|-----------|-------------|
| sedentaire | 1.2 | Desk job, drives everywhere, minimal movement |
| legerement_actif | 1.3 | Some walking (commute, errands), mostly seated work |
| moderement_actif | 1.4 | On feet part of day, moderate physical activity at work |
| actif | 1.5 | Active job, significant daily movement |
| tres_actif | 1.6 | Very physical job (construction, agriculture, etc.) |

**Rationale for reduced values:** Standard multipliers (1.2/1.375/1.55/1.725/1.9) include exercise. Since we calculate sport separately via MET, the base multiplier must only capture NEAT (Non-Exercise Activity Thermogenesis). The difference between sedentary (1.2) and lightly active (1.375) in standard scales is ~0.175, which roughly corresponds to 1-3 exercise sessions. We remove that sport component and compress the scale to 1.2-1.6 for lifestyle-only activity.

### 4. Macro Targets by Goal

**Confidence: HIGH for protein (ISSN position stand), MEDIUM for carbs/fat splits**

#### Protein (g/kg body weight/day)

| Goal | Protein (g/kg) | Source |
|------|---------------|--------|
| seche (cutting) | 2.0 | ISSN: 2.3-3.1 g/kg during hypocaloric periods; 2.0 is practical for non-athletes |
| maintien (maintenance) | 1.4 | ISSN: 1.4-2.0 g/kg sufficient for exercising individuals |
| prise_de_masse (bulking) | 1.8 | ISSN: 1.4-2.0 g/kg, higher end for muscle gain |
| recomposition | 2.2 | Evidence suggests higher protein (up to 2.4 g/kg) for recomp |

#### Fat (percentage of total calories)

| Goal | Fat % of Calories | Rationale |
|------|-------------------|-----------|
| seche | 25% | Minimum 20% (ISSN), slightly higher for hormonal health during deficit |
| maintien | 30% | Mid-range (ISSN 20-35%), balanced for health |
| prise_de_masse | 25% | Lower to leave room for carbs (fuel for training) |
| recomposition | 25% | Similar to cutting, prioritize protein |

#### Carbs (remainder)

Carbs fill the remaining calories after protein and fat are allocated:

```
carbs_grams = (target_calories - (protein_grams * 4) - (fat_grams * 9)) / 4
```

Constants: Protein = 4 kcal/g, Fat = 9 kcal/g, Carbs = 4 kcal/g

#### Full Calculation Example

80kg male, maintenance, TDEE = 2500 kcal:
- Protein: 1.4 * 80 = 112g (448 kcal)
- Fat: 0.30 * 2500 = 750 kcal -> 83g
- Carbs: (2500 - 448 - 750) / 4 = 325g

Same person, seche (cutting), TDEE adjusted = 2000 kcal:
- Protein: 2.0 * 80 = 160g (640 kcal)
- Fat: 0.25 * 2000 = 500 kcal -> 56g
- Carbs: (2000 - 640 - 500) / 4 = 215g

### 5. Per-Serving Macro Calculation

**Confidence: HIGH for methodology, MEDIUM for unit conversion accuracy**

```
For each ingredient in recipe:
  1. Convert quantity + unit to grams (via unit conversion table)
  2. Calculate macros: (quantity_grams / 100) * macros_per_100g
  3. Sum all ingredients
  4. Divide by originalPortions to get per-serving values
```

## Unit Conversion Table

The database stores quantities in various French cooking units. Here is the conversion table needed:

### Direct Weight Units
| Unit | Conversion | Notes |
|------|-----------|-------|
| Kilogramme | quantity * 1000 | Already in grams. 0.15 kg = 150g |
| Litre | quantity * 1000 | Assumes water-like density (~1g/ml). Acceptable for most liquids |

### Volume-Based Units (Approximate Gram Equivalents)
| Unit | Grams per Unit | Source | Notes |
|------|---------------|--------|-------|
| Cuillere a soupe | 15 | Standard French measure (1 CaS = 15ml) | Varies by ingredient density but 15g is standard |
| Cuillere a cafe | 5 | Standard French measure (1 CaC = 5ml) | Same density caveat |

### Count-Based Units (Require Ingredient-Specific Weights)
| Unit | Strategy | Notes |
|------|----------|-------|
| Piece | Ingredient-specific average weight lookup table | Most common non-kg unit (3873 rows) |
| Tranche | ~30g default for cheese/bread, ~15g for ham | Context-dependent |
| Gousse | ~5g (garlic clove) | Almost exclusively garlic in this dataset |
| Quartier | ~25-50g depending on fruit | Segment of citrus etc. |
| Boule | ~60g (ice cream scoop) | Used for ice cream in dataset |
| Sachet | ~10-20g | Varies (vanilla sugar sachet = 7.5g, baking powder = 10g) |

### Negligible-Impact Units
| Unit | Strategy | Notes |
|------|----------|-------|
| Bouquet | ~25g per full bouquet (herbs) | Quantities are 0.1-0.25 bouquet = 2.5-6g. Negligible macro impact |
| Brin | ~2g (herb sprig) | Negligible |
| Pincee | ~0.5g (pinch of salt/spice) | Negligible |
| Noisette | ~5g (hazelnut-sized knob of butter) | Very small amounts |
| Poignee | ~30g (handful) | Used for nuts, herbs, greens |
| Centimetre | ~5g (cm of ginger, etc.) | Very small amounts |
| Portion | ~100g default | Rarely used (14 rows), context-dependent |
| Leaf | ~1g | Single occurrence |

### Common "Piece" Weights (French Average Weights)

For the `Piece` unit, the gram equivalent depends on the ingredient. Common lookup values:

| Ingredient Pattern | Grams per Piece | Source |
|-------------------|----------------|--------|
| Oeuf / Egg | 55 | Standard French medium egg |
| Oignon jaune | 100 | Average onion |
| Oignon rouge | 100 | Average onion |
| Echalote | 25 | Small bulb |
| Tomate | 130 | Medium tomato |
| Tomate cerise | 15 | Cherry tomato |
| Pomme de terre | 140 | Medium potato |
| Carotte | 125 | Medium carrot |
| Courgette | 200 | Medium zucchini |
| Aubergine | 300 | Medium eggplant |
| Poivron | 150 | Medium bell pepper |
| Concombre | 200 | Half cucumber (typical piece) |
| Citron | 120 | Lemon |
| Citron vert | 100 | Lime |
| Pomme | 150 | Apple |
| Poire | 120 | Pear |
| Orange | 200 | Orange |
| Banane | 150 | Banana (with peel, ~120g edible) |
| Avocat | 200 | Avocado |
| Abricot (frais) | 45 | Apricot |
| Peche | 150 | Peach |
| Petit suisse | 60 | Standard petit suisse pot |
| Mozzarella | 125 | Standard ball |
| Escalope / Filet (meat) | 150 | Standard portion |
| Saucisse | 100 | Standard sausage |
| Tortilla / Galette | 50 | Wrap/tortilla |

**Strategy for unknown pieces:** Use a default of 100g and flag as low confidence.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BMR calculation | Custom unvalidated formula | Mifflin-St Jeor exactly as published | 30+ years of validation, specific coefficients matter |
| Activity multipliers | Made-up numbers | Published PAL values from WHO/FAO | Well-studied, reproducible |
| MET values | Guessed calorie burns | 2024 Compendium of Physical Activities | Largest evidence base (1114 activities measured) |
| Macro ratios | Arbitrary percentages | ISSN position stand g/kg values | Peer-reviewed, specific to goal type |
| Unit conversion | Regex parsing of free text | Static lookup table keyed on unit + ingredient name | Parsing is fragile; lookup is deterministic and testable |
| Calorie/macro rounding | Inconsistent rounding | Consistent strategy: round calories to nearest 10, macros to nearest 1g | Standard in nutrition apps, avoids false precision |

## Common Pitfalls

### Pitfall 1: Double-Counting Exercise in TDEE

**What goes wrong:** Using standard activity multipliers (which include exercise) AND adding MET-based sport calories results in overestimated TDEE by 200-500+ kcal/day.
**Why it happens:** Standard multipliers like 1.55 for "moderately active" already assume 3-5 days of exercise.
**How to avoid:** Use reduced base multipliers for lifestyle-only NEAT (1.2-1.6 range), then add sport via MET separately.
**Warning signs:** TDEE seems unreasonably high for the person's profile.

### Pitfall 2: Protein Exceeds Calorie Budget

**What goes wrong:** At high protein g/kg (e.g., 2.2 g/kg for recomp) plus 25% fat, there may not be enough calories left for carbs, especially in a deficit.
**Why it happens:** Protein is anchored to body weight, not calories. A heavy person in a deficit can have protein + fat exceed total calories.
**How to avoid:** After computing protein and fat, calculate remaining carbs. If carbs < 50g (a reasonable minimum), cap protein at a level that leaves room for carbs and increase fat percentage slightly.
**Warning signs:** Negative or very low carb values in the output.

### Pitfall 3: Quantity + Unit = 0 Grams

**What goes wrong:** Unknown units or missing quantity data lead to ingredients contributing 0g, underestimating recipe macros.
**Why it happens:** The `Piece` unit requires ingredient-specific weight lookup. If the ingredient is not in the lookup table, the conversion fails silently.
**How to avoid:** Track which ingredients could not be converted. Use a reasonable default (100g for unknown pieces). Calculate a confidence score based on % of ingredients successfully converted.
**Warning signs:** Recipe macros per serving seem unrealistically low.

### Pitfall 4: Missing Ingredient Macros

**What goes wrong:** 1 out of 931 ingredients has no macro data. Some recipe ingredients may reference ingredients with null macros.
**Why it happens:** Enrichment pipeline may have gaps.
**How to avoid:** Skip ingredients with null macros but count them. If >30% of a recipe's total weight has missing macros, mark the recipe as "low confidence".
**Warning signs:** Ingredient with null `caloriesPer100g`.

### Pitfall 5: Division by Zero / Null originalPortions

**What goes wrong:** Dividing total recipe macros by `originalPortions` when it's 0 or null.
**Why it happens:** Data quality issue.
**How to avoid:** All 2747 recipes currently have non-null `originalPortions`, but guard against it anyway. Default to 1 if missing.

### Pitfall 6: Displaying False Precision

**What goes wrong:** Showing "Your daily protein target is 142.37g" implies impossible precision.
**Why it happens:** Raw arithmetic produces decimals.
**How to avoid:** Round calories to nearest 5 or 10 kcal, macros to nearest 1g. The formulas themselves have ~10% error margin.

## Code Examples

### BMR Calculation
```typescript
// src/lib/nutrition/bmr.ts
interface BMRInput {
  weight: number;  // kg
  height: number;  // cm
  age: number;     // years
  sex: "homme" | "femme";
}

interface BMRResult {
  bmr: number;  // kcal/day, rounded to nearest integer
}

export function calculateBMR(input: BMRInput): BMRResult {
  const { weight, height, age, sex } = input;

  // Mifflin-St Jeor Equation (1990)
  // Men:   BMR = 10W + 6.25H - 5A + 5
  // Women: BMR = 10W + 6.25H - 5A - 161
  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = sex === "homme" ? base + 5 : base - 161;

  return { bmr: Math.round(bmr) };
}
```

### TDEE Calculation
```typescript
// src/lib/nutrition/tdee.ts
import { BASE_ACTIVITY_MULTIPLIERS, DEFAULT_SESSION_DURATION_HOURS, SPORT_MET_VALUES } from "./constants";
import type { BMRResult, SportSession, TDEEResult, UserProfile } from "./types";

export function calculateTDEE(
  bmrResult: BMRResult,
  profile: Pick<UserProfile, "weight" | "activityLevel">,
  sportSessions: SportSession[],
): TDEEResult {
  const { bmr } = bmrResult;

  // Step 1: Base lifestyle TDEE
  const activityMultiplier = BASE_ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const activityTDEE = bmr * activityMultiplier;

  // Step 2: Weekly sport calories via MET
  let weeklySportCalories = 0;
  for (const session of sportSessions) {
    const met = SPORT_MET_VALUES[session.activityType];
    const duration = DEFAULT_SESSION_DURATION_HOURS[session.activityType];
    // Subtract 1 MET to avoid double-counting the resting component
    // already captured in activityTDEE
    const netMET = met - 1;
    weeklySportCalories += netMET * profile.weight * duration * session.weeklyFrequency;
  }

  // Step 3: Spread evenly across 7 days (weekly average model)
  const sportCalories = weeklySportCalories / 7;

  // Step 4: Final TDEE
  const tdee = activityTDEE + sportCalories;

  return {
    bmr,
    activityTDEE: Math.round(activityTDEE),
    sportCalories: Math.round(sportCalories),
    tdee: Math.round(tdee),
  };
}
```

### Macro Targets Calculation
```typescript
// src/lib/nutrition/macro-targets.ts
import {
  GOAL_CALORIE_ADJUSTMENTS,
  GOAL_FAT_PERCENTAGE,
  GOAL_PROTEIN_PER_KG,
  KCAL_PER_GRAM,
  MIN_CARBS_GRAMS,
} from "./constants";
import type { MacroTargets, TDEEResult, UserProfile } from "./types";

export function calculateMacroTargets(
  tdeeResult: TDEEResult,
  profile: Pick<UserProfile, "weight" | "goal">,
): MacroTargets {
  const { tdee } = tdeeResult;
  const { weight, goal } = profile;

  // Step 1: Adjust calories for goal
  const calorieAdjustment = GOAL_CALORIE_ADJUSTMENTS[goal];
  const targetCalories = Math.round(tdee * (1 + calorieAdjustment));

  // Step 2: Protein from g/kg body weight
  const proteinPerKg = GOAL_PROTEIN_PER_KG[goal];
  const protein = Math.round(proteinPerKg * weight);

  // Step 3: Fat from percentage of target calories
  const fatPercentage = GOAL_FAT_PERCENTAGE[goal];
  let fat = Math.round((targetCalories * fatPercentage) / KCAL_PER_GRAM.fat);

  // Step 4: Carbs from remaining calories
  const proteinCalories = protein * KCAL_PER_GRAM.protein;
  const fatCalories = fat * KCAL_PER_GRAM.fat;
  let carbs = Math.round((targetCalories - proteinCalories - fatCalories) / KCAL_PER_GRAM.carbs);

  // Step 5: Safety check -- ensure minimum carbs
  if (carbs < MIN_CARBS_GRAMS) {
    // Reduce fat to make room for minimum carbs
    const carbDeficit = MIN_CARBS_GRAMS - carbs;
    const caloriesToReallocate = carbDeficit * KCAL_PER_GRAM.carbs;
    fat = Math.round(fat - caloriesToReallocate / KCAL_PER_GRAM.fat);
    carbs = MIN_CARBS_GRAMS;
  }

  return {
    calories: targetCalories,
    protein,
    fat,
    carbs,
  };
}
```

### Per-Serving Recipe Macro Calculation
```typescript
// src/lib/nutrition/recipe-macros.ts
import { convertToGrams } from "./unit-conversion";

interface IngredientInput {
  name: string;
  quantity: number | null;
  unit: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

interface RecipeMacrosResult {
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  totalRecipe: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  confidence: "high" | "medium" | "low";
  convertedCount: number;
  totalCount: number;
  missingIngredients: string[];
}

export function calculateRecipeMacros(
  ingredients: IngredientInput[],
  originalPortions: number,
): RecipeMacrosResult {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let convertedCount = 0;
  const missingIngredients: string[] = [];

  for (const ing of ingredients) {
    // Skip if no quantity or no macro data
    if (
      ing.quantity == null ||
      ing.caloriesPer100g == null ||
      ing.proteinPer100g == null
    ) {
      missingIngredients.push(ing.name);
      continue;
    }

    // Convert quantity + unit to grams
    const grams = convertToGrams(ing.quantity, ing.unit, ing.name);
    if (grams === null) {
      missingIngredients.push(ing.name);
      continue;
    }

    // Calculate macros from grams
    const factor = grams / 100;
    totalCalories += factor * (ing.caloriesPer100g ?? 0);
    totalProtein += factor * (ing.proteinPer100g ?? 0);
    totalCarbs += factor * (ing.carbsPer100g ?? 0);
    totalFat += factor * (ing.fatPer100g ?? 0);
    convertedCount++;
  }

  const portions = originalPortions > 0 ? originalPortions : 1;
  const ratio = convertedCount / ingredients.length;
  const confidence = ratio >= 0.9 ? "high" : ratio >= 0.7 ? "medium" : "low";

  return {
    perServing: {
      calories: Math.round(totalCalories / portions),
      protein: Math.round(totalProtein / portions),
      carbs: Math.round(totalCarbs / portions),
      fat: Math.round(totalFat / portions),
    },
    totalRecipe: {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
    },
    confidence,
    convertedCount,
    totalCount: ingredients.length,
    missingIngredients,
  };
}
```

### Unit Conversion
```typescript
// src/lib/nutrition/unit-conversion.ts

// Average weight in grams per piece for common ingredients
// Sources: French culinary references (basesdelacuisine.com, culture-crunch.com)
const PIECE_WEIGHTS: Record<string, number> = {
  // Eggs & dairy
  "oeuf": 55,
  "petit suisse": 60,
  "mozzarella": 125,
  "yaourt": 125,

  // Vegetables
  "oignon jaune": 100,
  "oignon rouge": 100,
  "echalote": 25,
  "tomate": 130,
  "tomates cerises": 15,
  "pomme de terre": 140,
  "carotte": 125,
  "courgette": 200,
  "aubergine": 300,
  "poivron": 150,
  "concombre": 200,
  "avocat": 200,

  // Fruits
  "citron": 120,
  "citron vert": 100,
  "pomme": 150,
  "poire": 120,
  "orange": 200,
  "banane": 150,
  "abricot": 45,
  "peche": 150,
  "kiwi": 100,
  "mangue": 400,
  // ... extend as needed
};

const DEFAULT_PIECE_WEIGHT = 100; // grams, for unknown items

// Conversion factors: unit -> grams (for non-piece, non-kg units)
const UNIT_TO_GRAMS: Record<string, number> = {
  "Kilogramme": 1000,
  "Litre": 1000,
  "Cuillère à soupe": 15,
  "Cuillère à café": 5,
  "Gousse": 5,         // garlic clove
  "Bouquet": 25,       // herb bunch
  "Brin": 2,           // herb sprig
  "Pincée": 0.5,       // pinch
  "Noisette": 5,       // hazelnut-sized knob
  "Poignée": 30,       // handful
  "Tranche": 30,       // slice (bread, cheese)
  "Boule": 60,         // scoop (ice cream)
  "Centimètre": 5,     // cm of ginger etc.
  "Sachet": 10,        // packet
  "Quartier": 30,      // fruit segment
  "Portion": 100,      // generic portion
  "Leaf": 1,           // single leaf
};

export function convertToGrams(
  quantity: number,
  unit: string | null,
  ingredientName: string,
): number | null {
  if (unit == null) return null;

  // Direct unit conversion (weight/volume/misc)
  if (unit !== "Pièce") {
    const factor = UNIT_TO_GRAMS[unit];
    if (factor == null) return null;
    return quantity * factor;
  }

  // Piece conversion: look up ingredient-specific weight
  const normalizedName = ingredientName.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents

  // Try exact match first, then partial matches
  for (const [key, weight] of Object.entries(PIECE_WEIGHTS)) {
    if (normalizedName.includes(key)) {
      return quantity * weight;
    }
  }

  // Fallback: default piece weight
  return quantity * DEFAULT_PIECE_WEIGHT;
}
```

## Data Quality Indicators (Claude's Discretion)

Recommended confidence scoring system for recipes:

| Confidence | Criteria | Display |
|------------|----------|---------|
| HIGH | >= 90% of ingredients by weight successfully converted and have macro data | Green indicator, no warning |
| MEDIUM | 70-89% coverage | Yellow indicator, "Approximate values" note |
| LOW | < 70% coverage | Orange indicator, "Estimated values -- some ingredients missing" |

**Rounding strategy (Claude's Discretion):**
- Calories: round to nearest 5 kcal (e.g., 2135 -> 2135, or nearest 10 for targets: 2140)
- Macro grams: round to nearest 1g for targets, nearest 0.1g for per-serving
- Display: always show integer grams for daily targets (cleaner), allow 1 decimal for per-serving recipe macros

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Harris-Benedict (1919/1984) | Mifflin-St Jeor (1990) | Recommended since ~2005 by ADA | ~5% more accurate for most populations |
| Flat macro percentages (40/30/30) | g/kg body weight for protein | ISSN 2017 position stand | Personalized targets instead of one-size-fits-all |
| 2011 Compendium of Physical Activities | 2024 Compendium update | January 2024 | 1114 activities (vs ~821), more precise MET values |
| Single activity multiplier for everything | Hybrid: lifestyle multiplier + MET sport addition | Current best practice in fitness apps | More accurate when sport data is available |

**Deprecated/outdated:**
- Harris-Benedict original (1919): significantly overestimates BMR
- Katch-McArdle formula: requires lean body mass (body fat %), which we don't collect
- "Calories in, calories out" without macro consideration: oversimplified, ignores body composition effects

## Open Questions

1. **Session duration variability**
   - What we know: MET calculation requires duration. We store only sport type + frequency.
   - What's unclear: Should the app assume default durations per sport, or should we add a `durationMinutes` field to `userSportActivities`?
   - Recommendation: Use sensible defaults (1h for most sports, 1.5h for cycling/team sports) in v1. Consider adding duration to the schema in a future iteration if users request precision. The default approach is simpler and 80/20 accurate.

2. **Ingredient "Piece" weight coverage**
   - What we know: 3873 recipe_ingredients use "Piece" unit across many ingredient names. A static lookup table covers the most common ones.
   - What's unclear: How many unique ingredient names use "Piece" and what % are covered by the initial lookup table?
   - Recommendation: Build the lookup table with top-50 ingredients by frequency. Log uncovered ingredients to identify gaps. The 100g default fallback is reasonable for most items.

3. **Thermic Effect of Food (TEF)**
   - What we know: TEF accounts for ~10% of TDEE (energy cost of digestion). Higher protein diets have higher TEF.
   - What's unclear: Should we explicitly model TEF or is it implicitly captured in the activity multiplier?
   - Recommendation: Do not model TEF separately. The activity multipliers already implicitly include TEF. Adding it would add complexity without meaningful accuracy gain given the ~10% error margin of BMR prediction itself.

4. **User-overridden macro targets storage**
   - What we know: Context says "User can override the computed defaults in settings."
   - What's unclear: Where to store overrides -- in the profile table, a separate table, or client-side?
   - Recommendation: Add optional `customProtein`, `customFat`, `customCarbs`, `customCalories` columns to `userProfiles` (all nullable real). If set, they override computed values. If null, computed values are used.

## Sources

### Primary (HIGH confidence)
- Mifflin MD, St Jeor ST, et al. "A new predictive equation for resting energy expenditure in healthy individuals." Am J Clin Nutr. 1990;51:241-247.
- [2024 Adult Compendium of Physical Activities](https://pacompendium.com/) -- MET values for all sport types
- [ISSN Position Stand: Protein and Exercise (2017)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/) -- Protein g/kg recommendations
- [ISSN Position Stand: Diets and Body Composition (2017)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5470183/) -- Fat intake minimums, diet composition
- [ADA Systematic Review: Predictive Equations for RMR (2005)](https://pubmed.ncbi.nlm.nih.gov/15883556/) -- Mifflin-St Jeor recommended as most accurate

### Secondary (MEDIUM confidence)
- [FAO/WHO Human Energy Requirements](https://www.fao.org/4/y5686e/y5686e07.htm) -- PAL (Physical Activity Level) multipliers
- [Nutrium: Mifflin-St Jeor for Nutrition Professionals](https://nutrium.com/blog/mifflin-st-jeor-for-nutrition-professionals/) -- Practical application guide
- [French culinary weight references](https://www.basesdelacuisine.com/Cadre1/z1/pp80.htm) -- Poids moyen des fruits et legumes
- [French cooking unit conversions](https://www.cuisine-et-mets.com/mesures_conversions/) -- Cuillere conversions

### Tertiary (LOW confidence)
- Activity multiplier reduction for "sport excluded" base values -- derived from analysis of standard multipliers, not directly from a single published study. Cross-referenced with NEAT research showing NEAT accounts for 6-10% of TDEE in sedentary and up to 50% in highly active.

## Metadata

**Confidence breakdown:**
- BMR Formula (Mifflin-St Jeor): HIGH -- 30+ years of validation, ADA recommended
- MET Values: HIGH -- 2024 Compendium, gold standard in exercise science
- Protein g/kg targets: HIGH -- ISSN position stand (peer-reviewed)
- Fat/carb split: MEDIUM -- Evidence-based ranges but exact percentages are practical choices
- Base activity multipliers (sport-excluded): MEDIUM -- Derived from standard values, not a single authoritative source
- Unit conversion weights: MEDIUM -- French culinary references, but individual items vary
- Piece-to-grams lookup: MEDIUM -- Based on average weights, actual items vary by size

**Research date:** 2026-02-09
**Valid until:** 2026-05-09 (formulas are stable; Compendium updated ~every 10 years; ISSN positions updated ~every 5 years)
