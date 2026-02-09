/**
 * Nutrition calculation constants.
 *
 * All values are evidence-based with sources documented inline.
 * These constants are used by bmr.ts, tdee.ts, macro-targets.ts, and recipe-macros.ts.
 */

import type { SportSession, UserProfile } from "./types";

/**
 * Base activity multipliers for lifestyle NEAT (Non-Exercise Activity Thermogenesis).
 *
 * These are intentionally LOWER than standard Harris-Benedict multipliers (1.2-1.9)
 * because sport sessions are calculated separately via MET values. Using standard
 * multipliers AND adding sport would double-count exercise.
 *
 * Source: Derived from FAO/WHO PAL values with exercise component removed.
 * See 05-RESEARCH.md "Activity Level Multipliers" section.
 */
export const BASE_ACTIVITY_MULTIPLIERS: Record<UserProfile["activityLevel"], number> = {
  sedentaire: 1.2, // Desk job, minimal movement
  legerement_actif: 1.3, // Some walking, light daily activity
  moderement_actif: 1.4, // On feet part of day, moderate daily movement
  actif: 1.5, // Physical job, significant daily movement
  tres_actif: 1.6, // Very physical job (construction, farming)
} as const;

/**
 * MET (Metabolic Equivalent of Task) values per sport type.
 *
 * Source: 2024 Adult Compendium of Physical Activities (pacompendium.com)
 * Values represent average recreational-level effort for each activity.
 */
export const SPORT_MET_VALUES: Record<SportSession["activityType"], number> = {
  course: 9.0, // Running ~8 km/h, recreational jogging (Compendium 12045)
  musculation: 5.0, // Weight training, moderate effort (Compendium 02052)
  natation: 5.8, // Swimming laps, freestyle, recreational (Compendium 18240)
  velo: 7.0, // Cycling, moderate pace ~15-20 km/h (Compendium 01016/01030)
  yoga: 2.5, // Hatha yoga (Compendium 02150/02175)
  marche: 4.3, // Brisk walking ~5.5 km/h (Compendium 17200)
  sport_collectif: 7.5, // Team sports average: soccer 7.0, basketball 7.5 (Compendium 15055/15610)
} as const;

/**
 * Default session duration in hours per sport type.
 *
 * Used when the user does not specify a custom duration.
 * Most sports default to 1 hour; cycling and team sports default to 1.5 hours
 * as they typically involve longer sessions.
 */
export const DEFAULT_SESSION_DURATION_HOURS: Record<SportSession["activityType"], number> = {
  course: 1.0,
  musculation: 1.0,
  natation: 1.0,
  velo: 1.5,
  yoga: 1.0,
  marche: 1.0,
  sport_collectif: 1.5,
} as const;

/**
 * Calorie adjustment factors per nutritional goal.
 *
 * Applied as a multiplier: targetCalories = TDEE * (1 + adjustment).
 * Source: Evidence-based sports nutrition recommendations.
 */
export const GOAL_CALORIE_ADJUSTMENTS: Record<UserProfile["goal"], number> = {
  seche: -0.2, // 20% deficit for sustainable fat loss
  maintien: 0, // No adjustment -- maintenance
  prise_de_masse: 0.1, // 10% surplus for lean muscle gain
  recomposition: -0.1, // 10% deficit with high protein
} as const;

/**
 * Protein targets in grams per kilogram of body weight per day, by goal.
 *
 * Source: ISSN Position Stand on Protein and Exercise (2017)
 * - Cutting: 2.3-3.1 g/kg recommended; 2.0 g/kg practical for non-athletes
 * - Maintenance: 1.4-2.0 g/kg sufficient for exercising individuals
 * - Bulking: 1.4-2.0 g/kg, higher end for muscle gain
 * - Recomp: Up to 2.4 g/kg evidence for body recomposition
 */
export const GOAL_PROTEIN_PER_KG: Record<UserProfile["goal"], number> = {
  seche: 2.0,
  maintien: 1.4,
  prise_de_masse: 1.8,
  recomposition: 2.2,
} as const;

/**
 * Fat allocation as a percentage of total target calories, by goal.
 *
 * Source: ISSN Position Stand on Diets and Body Composition (2017)
 * Minimum 20% fat recommended for hormonal health.
 */
export const GOAL_FAT_PERCENTAGE: Record<UserProfile["goal"], number> = {
  seche: 0.25, // 25% -- minimum viable for hormonal health during deficit
  maintien: 0.3, // 30% -- mid-range for balanced health
  prise_de_masse: 0.25, // 25% -- lower to leave room for carbs (training fuel)
  recomposition: 0.25, // 25% -- similar to cutting, prioritize protein
} as const;

/**
 * Caloric density per gram of each macronutrient.
 *
 * These are the standard Atwater factors used in nutrition science.
 */
export const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

/**
 * Minimum carbohydrate intake in grams per day.
 *
 * Below this threshold, cognitive function and athletic performance degrade.
 * If the macro calculation yields carbs below this, fat is reduced to compensate.
 */
export const MIN_CARBS_GRAMS = 50 as const;
