"use server";

import { headers } from "next/headers";
import {
  setUserDietaryPreferences,
  setUserSportActivities,
  upsertUserProfile,
} from "@/db/queries/profiles";
import { auth } from "@/lib/auth";
import type { ProfileFormData } from "@/lib/schemas/profile";
import { profileSchema } from "@/lib/schemas/profile";

export async function saveProfile(
  data: ProfileFormData,
): Promise<{ success: true } | { error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return { error: "Non authentifie" };
    }

    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Donnees invalides" };
    }

    const { weight, height, age, sex, activityLevel, goal, householdSize } = parsed.data;
    const userId = session.user.id;

    await upsertUserProfile(userId, {
      weight,
      height,
      age,
      sex,
      activityLevel,
      goal,
      householdSize,
      mealsPerDay: 2,
    });

    await setUserDietaryPreferences(userId, parsed.data.dietaryPreferences);

    await setUserSportActivities(
      userId,
      parsed.data.sportActivities.map((a) => ({
        activityType: a.activityType,
        weeklyFrequency: a.weeklyFrequency,
      })),
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to save profile:", error);
    return { error: "Erreur lors de la sauvegarde du profil" };
  }
}
