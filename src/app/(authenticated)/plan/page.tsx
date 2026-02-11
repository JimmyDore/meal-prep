import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFullUserProfile } from "@/db/queries/profiles";
import { auth } from "@/lib/auth";
import { dailyToWeekly, scaleDailyTargets } from "@/lib/meal-plan";
import { calculateBMR, calculateMacroTargets, calculateTDEE } from "@/lib/nutrition";
import { PlanClient } from "./plan-client";

export const metadata: Metadata = {
  title: "Mon plan | Meal Prep",
};

export default async function PlanPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth");
  }

  const { profile, sportActivities } = await getFullUserProfile(session.user.id);

  if (
    !profile ||
    profile.weight === null ||
    profile.height === null ||
    profile.age === null ||
    profile.sex === null ||
    profile.activityLevel === null ||
    profile.goal === null
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Mon plan</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="mb-2 text-amber-800">
            Votre profil est incomplet. Pour generer un plan, nous avons besoin de vos informations
            physiques et de votre objectif.
          </p>
          <Link
            href="/settings/profile"
            className="inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Completer mon profil
          </Link>
        </div>
      </div>
    );
  }

  const bmr = calculateBMR({
    weight: profile.weight,
    height: profile.height,
    age: profile.age,
    sex: profile.sex,
  });

  const sportSessions = sportActivities.map((sa) => ({
    activityType: sa.activityType,
    weeklyFrequency: sa.weeklyFrequency,
  }));

  const tdee = calculateTDEE(
    bmr,
    { weight: profile.weight, activityLevel: profile.activityLevel },
    sportSessions,
  );
  const fullDailyTargets = calculateMacroTargets(tdee, {
    weight: profile.weight,
    goal: profile.goal,
  });

  // Scale targets to reflect only the planned meals (lunch + dinner = ~65% of daily intake)
  const dailyTargets = scaleDailyTargets(fullDailyTargets);
  const weeklyTargets = dailyToWeekly(dailyTargets);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Mon plan de la semaine</h1>
      <PlanClient dailyTargets={dailyTargets} weeklyTargets={weeklyTargets} />
    </div>
  );
}
