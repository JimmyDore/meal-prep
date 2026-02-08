"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import type { ProfileFormData } from "@/lib/schemas/profile";
import { profileSchema } from "@/lib/schemas/profile";
import { ProgressIndicator } from "./progress-indicator";
import { StepDietary } from "./step-dietary";
import { StepGoal } from "./step-goal";
import { StepPhysical } from "./step-physical";
import { StepSport } from "./step-sport";

const STEPS = ["Physique", "Objectif", "Alimentation", "Sport"];

const STEP_FIELDS: (keyof ProfileFormData | `sportActivities.${number}.${string}`)[][] = [
  ["weight", "height", "age", "sex", "activityLevel"],
  ["goal", "householdSize"],
  ["dietaryPreferences"],
  ["sportActivities"],
];

interface OnboardingWizardProps {
  defaultValues?: Partial<ProfileFormData>;
  mode: "onboarding" | "settings";
}

export function OnboardingWizard({ defaultValues, mode }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      weight: defaultValues?.weight ?? undefined,
      height: defaultValues?.height ?? undefined,
      age: defaultValues?.age ?? undefined,
      sex: defaultValues?.sex ?? undefined,
      activityLevel: defaultValues?.activityLevel ?? undefined,
      goal: defaultValues?.goal ?? undefined,
      householdSize: defaultValues?.householdSize ?? 1,
      dietaryPreferences: defaultValues?.dietaryPreferences ?? [],
      sportActivities: defaultValues?.sportActivities ?? [],
    },
    mode: "onTouched",
  });

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep];
    const isValid = await form.trigger(fields as (keyof ProfileFormData)[]);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  }

  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function onSubmit(data: ProfileFormData) {
    startTransition(async () => {
      const result = await saveProfile(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if (mode === "onboarding") {
        router.push("/");
      } else {
        toast.success("Profil mis a jour avec succes");
        router.refresh();
      }
    });
  }

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="space-y-8">
      <ProgressIndicator steps={STEPS} currentStep={currentStep} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="min-h-[300px]">
            {currentStep === 0 && <StepPhysical />}
            {currentStep === 1 && <StepGoal />}
            {currentStep === 2 && <StepDietary />}
            {currentStep === 3 && <StepSport />}
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-1 size-4" />
              Precedent
            </Button>

            {isLastStep ? (
              <Button key="submit" type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Terminer
              </Button>
            ) : (
              <Button key="next" type="button" onClick={handleNext}>
                Suivant
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
