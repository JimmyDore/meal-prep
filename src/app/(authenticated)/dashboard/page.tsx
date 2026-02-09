import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MacroDashboard } from "@/components/macro-dashboard";
import { getFullUserProfile } from "@/db/queries/profiles";
import { auth } from "@/lib/auth";
import {
  type BMRResult,
  calculateBMR,
  calculateMacroTargets,
  calculateTDEE,
  type MacroTargets,
  type TDEEResult,
} from "@/lib/nutrition";

export const metadata: Metadata = {
  title: "Mes macros | Meal Prep",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth");
  }

  const { profile, sportActivities } = await getFullUserProfile(session.user.id);

  // Check if profile has all required fields for calculation
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
        <h1 className="mb-4 text-2xl font-bold">Mes macros</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="mb-2 text-amber-800">
            Votre profil est incomplet. Pour calculer vos macros, nous avons besoin de vos
            informations physiques et de votre objectif.
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

  // All fields are guaranteed non-null at this point
  const bmrResult: BMRResult = calculateBMR({
    weight: profile.weight,
    height: profile.height,
    age: profile.age,
    sex: profile.sex,
  });

  const sportSessions = sportActivities.map((sa) => ({
    activityType: sa.activityType,
    weeklyFrequency: sa.weeklyFrequency,
  }));

  const tdeeResult: TDEEResult = calculateTDEE(
    bmrResult,
    { weight: profile.weight, activityLevel: profile.activityLevel },
    sportSessions,
  );

  const macroTargets: MacroTargets = calculateMacroTargets(tdeeResult, {
    weight: profile.weight,
    goal: profile.goal,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Mes macros</h1>
      <MacroDashboard
        macroTargets={macroTargets}
        tdeeResult={tdeeResult}
        bmrResult={bmrResult}
        profile={{
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          sex: profile.sex,
          activityLevel: profile.activityLevel,
          goal: profile.goal,
        }}
        sportActivities={sportSessions}
      />
    </div>
  );
}
