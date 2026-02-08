import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { isProfileComplete } from "@/db/queries/profiles";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Configurez votre profil | Meal Prep",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth");
  }

  const complete = await isProfileComplete(session.user.id);
  if (complete) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-center font-bold text-2xl">Configurez votre profil</h1>
      <OnboardingWizard mode="onboarding" />
    </main>
  );
}
