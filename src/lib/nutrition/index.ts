/**
 * Nutrition calculation module -- public API.
 *
 * Full calculation chain: BMR -> TDEE -> MacroTargets
 * Plus recipe-level macro calculation with unit conversion.
 *
 * Usage:
 *   import { calculateBMR, calculateTDEE, calculateMacroTargets } from "@/lib/nutrition";
 */

export { calculateBMR } from "./bmr";
export { calculateMacroTargets } from "./macro-targets";
export { calculateRecipeMacros } from "./recipe-macros";
export { calculateTDEE } from "./tdee";
export type {
  BMRResult,
  MacroTargets,
  RecipeMacrosResult,
  SportSession,
  TDEEResult,
  UserProfile,
} from "./types";
export { convertToGrams } from "./unit-conversion";
