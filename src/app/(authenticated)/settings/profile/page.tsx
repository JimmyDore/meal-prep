import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { getFullUserProfile } from "@/db/queries/profiles";
import { auth } from "@/lib/auth";
import type { ProfileFormData } from "@/lib/schemas/profile";

export const metadata: Metadata = {
  title: "Modifier votre profil | Meal Prep",
};

export default async function SettingsProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth");
  }

  const { profile, dietaryPreferences, sportActivities } = await getFullUserProfile(
    session.user.id,
  );

  const defaultValues: Partial<ProfileFormData> = {
    weight: profile?.weight ?? undefined,
    height: profile?.height ?? undefined,
    age: profile?.age ?? undefined,
    sex: profile?.sex ?? undefined,
    activityLevel: profile?.activityLevel ?? undefined,
    goal: profile?.goal ?? undefined,
    householdSize: profile?.householdSize ?? 1,
    dietaryPreferences: dietaryPreferences.map((d) => d.preference),
    sportActivities: sportActivities.map((s) => ({
      activityType: s.activityType,
      weeklyFrequency: s.weeklyFrequency,
    })),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-center font-bold text-2xl">Modifier votre profil</h1>
      <OnboardingWizard mode="settings" defaultValues={defaultValues} />
    </main>
  );
}
