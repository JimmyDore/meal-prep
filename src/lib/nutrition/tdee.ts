/**
 * TDEE (Total Daily Energy Expenditure) calculation using hybrid approach.
 *
 * Combines a base lifestyle activity multiplier with MET-based sport calorie
 * additions, spread across 7 days as a weekly average.
 *
 * Hybrid approach rationale:
 *   - Base activity multiplier captures NEAT (Non-Exercise Activity Thermogenesis)
 *   - Sport sessions are added separately via MET values for precision
 *   - MET calculation subtracts 1 MET to avoid double-counting the resting
 *     component already captured in the activity multiplier
 *
 * Formula:
 *   activityTDEE = BMR * BASE_ACTIVITY_MULTIPLIERS[activityLevel]
 *   sportCalories = sum((MET - 1) * weight * duration_hours * frequency) / 7
 *   TDEE = activityTDEE + sportCalories
 */

import {
  BASE_ACTIVITY_MULTIPLIERS,
  DEFAULT_SESSION_DURATION_HOURS,
  SPORT_MET_VALUES,
} from "./constants";
import type { BMRResult, SportSession, TDEEResult, UserProfile } from "./types";

/**
 * Calculate Total Daily Energy Expenditure using hybrid approach.
 *
 * @param bmrResult - Result from calculateBMR containing the basal metabolic rate
 * @param profile - User weight and activity level (excluding sport)
 * @param sportSessions - Array of sport sessions with type and weekly frequency
 * @returns TDEEResult with all intermediate values rounded to nearest integer
 */
export function calculateTDEE(
  bmrResult: BMRResult,
  profile: Pick<UserProfile, "weight" | "activityLevel">,
  sportSessions: SportSession[],
): TDEEResult {
  const { bmr } = bmrResult;
  const { weight, activityLevel } = profile;

  // Step 1: Apply base lifestyle multiplier (NEAT only, no sport)
  const activityTDEE = bmr * BASE_ACTIVITY_MULTIPLIERS[activityLevel];

  // Step 2: Calculate net sport calories per week
  let weeklySpotCalories = 0;
  for (const session of sportSessions) {
    const met = SPORT_MET_VALUES[session.activityType];
    const durationHours = DEFAULT_SESSION_DURATION_HOURS[session.activityType];

    // Subtract 1 MET to remove resting component (already counted in activityTDEE)
    const netMet = met - 1;

    // Calories per session * weekly frequency
    weeklySpotCalories += netMet * weight * durationHours * session.weeklyFrequency;
  }

  // Step 3: Spread weekly sport calories evenly across 7 days
  const dailySportCalories = weeklySpotCalories / 7;

  // Step 4: Final TDEE = lifestyle TDEE + daily sport average
  const tdee = activityTDEE + dailySportCalories;

  return {
    bmr: Math.round(bmr),
    activityTDEE: Math.round(activityTDEE),
    sportCalories: Math.round(dailySportCalories),
    tdee: Math.round(tdee),
  };
}
