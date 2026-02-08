import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userDietaryPreferences } from "@/db/schema/dietary-preferences";
import { userProfiles } from "@/db/schema/profiles";
import { userSportActivities } from "@/db/schema/sport-activities";

// --- Profile ---

export async function getUserProfile(userId: string) {
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return rows[0] ?? null;
}

export async function upsertUserProfile(
  userId: string,
  data: {
    weight?: number | null;
    height?: number | null;
    age?: number | null;
    sex?: "homme" | "femme" | null;
    activityLevel?:
      | "sedentaire"
      | "legerement_actif"
      | "moderement_actif"
      | "actif"
      | "tres_actif"
      | null;
    goal?: "seche" | "maintien" | "prise_de_masse" | "recomposition" | null;
    householdSize?: number | null;
    mealsPerDay?: number | null;
  },
) {
  const rows = await db
    .insert(userProfiles)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();

  // biome-ignore lint/style/noNonNullAssertion: INSERT ... RETURNING always returns the row
  return rows[0]!;
}

// --- Dietary Preferences ---

export async function getUserDietaryPreferences(userId: string) {
  return db.select().from(userDietaryPreferences).where(eq(userDietaryPreferences.userId, userId));
}

export async function setUserDietaryPreferences(userId: string, preferences: string[]) {
  return db.transaction(async (tx) => {
    // Delete all existing preferences for this user
    await tx.delete(userDietaryPreferences).where(eq(userDietaryPreferences.userId, userId));

    if (preferences.length === 0) return [];

    // Insert new preferences
    const rows = await tx
      .insert(userDietaryPreferences)
      .values(
        preferences.map((preference) => ({
          userId,
          preference: preference as (typeof userDietaryPreferences.$inferInsert)["preference"],
        })),
      )
      .returning();

    return rows;
  });
}

// --- Sport Activities ---

export async function getUserSportActivities(userId: string) {
  return db.select().from(userSportActivities).where(eq(userSportActivities.userId, userId));
}

export async function setUserSportActivities(
  userId: string,
  activities: Array<{
    activityType: string;
    weeklyFrequency: number;
  }>,
) {
  return db.transaction(async (tx) => {
    // Delete all existing activities for this user
    await tx.delete(userSportActivities).where(eq(userSportActivities.userId, userId));

    if (activities.length === 0) return [];

    // Insert new activities
    const rows = await tx
      .insert(userSportActivities)
      .values(
        activities.map((activity) => ({
          userId,
          activityType:
            activity.activityType as (typeof userSportActivities.$inferInsert)["activityType"],
          weeklyFrequency: activity.weeklyFrequency,
        })),
      )
      .returning();

    return rows;
  });
}

// --- Composite queries ---

export async function getFullUserProfile(userId: string) {
  const [profile, dietaryPreferences, sportActivities] = await Promise.all([
    getUserProfile(userId),
    getUserDietaryPreferences(userId),
    getUserSportActivities(userId),
  ]);

  return {
    profile,
    dietaryPreferences,
    sportActivities,
  };
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);

  if (!profile) return false;

  // All required physical fields must be non-null
  return (
    profile.weight !== null &&
    profile.height !== null &&
    profile.age !== null &&
    profile.sex !== null &&
    profile.activityLevel !== null &&
    profile.goal !== null
  );
}
