/**
 * BMR (Basal Metabolic Rate) calculation using Mifflin-St Jeor equation.
 *
 * The Mifflin-St Jeor equation (1990) is recommended by the American Dietetic
 * Association as the most accurate predictive equation for BMR in healthy individuals.
 *
 * Formula:
 *   Men:   BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + 5
 *   Women: BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) - 161
 *
 * Source: Mifflin MD, St Jeor ST, et al. (1990). AJCN 51:241-247
 */

import type { BMRResult, UserProfile } from "./types";

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
 *
 * @param profile - User physical characteristics (weight, height, age, sex)
 * @returns BMRResult with bmr rounded to nearest integer (kcal/day)
 */
export function calculateBMR(
  profile: Pick<UserProfile, "weight" | "height" | "age" | "sex">,
): BMRResult {
  const { weight, height, age, sex } = profile;

  // Mifflin-St Jeor base: 10W + 6.25H - 5A
  const base = 10 * weight + 6.25 * height - 5 * age;

  // Sex-specific constant: +5 for men, -161 for women
  const bmr = sex === "homme" ? base + 5 : base - 161;

  return { bmr: Math.round(bmr) };
}
