"use client";

import { RefreshCw, Save, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generatePlan, savePlan } from "@/app/actions/meal-plan";
import { WeeklyGrid } from "@/components/meal-plan/weekly-grid";
import { WeeklySummary } from "@/components/meal-plan/weekly-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlanResult, WeeklyMacroTargets } from "@/lib/meal-plan";
import type { MacroTargets } from "@/lib/nutrition";

interface PlanClientProps {
  dailyTargets: MacroTargets;
  weeklyTargets: WeeklyMacroTargets;
}

export function PlanClient({ dailyTargets, weeklyTargets }: PlanClientProps) {
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isSaved, setIsSaved] = useState(false);

  function handleGenerate() {
    setIsSaved(false);
    startGenerate(async () => {
      const result = await generatePlan();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPlan(result.plan);
    });
  }

  function handleSave() {
    if (!plan) return;
    startSave(async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      // Calculate next Monday: Sunday=0 -> 1 day, Monday=1 -> 0 days (today), else 8 - dayOfWeek
      const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      const weekStart = nextMonday.toISOString().split("T")[0];

      const actual = plan.slots.reduce(
        (acc, slot) => ({
          calories: acc.calories + slot.recipe.perServing.calories,
          protein: acc.protein + slot.recipe.perServing.protein,
          carbs: acc.carbs + slot.recipe.perServing.carbs,
          fat: acc.fat + slot.recipe.perServing.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      const result = await savePlan({
        weekStart,
        overallScore: plan.score.overall,
        macroSummary: { target: weeklyTargets, actual },
        slots: plan.slots.map((slot) => ({
          dayIndex: slot.dayIndex,
          mealType: slot.mealType,
          recipeId: slot.recipe.id,
          macrosSnapshot: slot.recipe.perServing,
        })),
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Plan sauvegarde !");
        setIsSaved(true);
      }
    });
  }

  // Empty state: no plan generated yet
  if (!plan && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-20">
        <Sparkles className="mb-4 size-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">Aucun plan genere</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Generez un plan de repas optimise pour vos objectifs macros
        </p>
        <Button onClick={handleGenerate} size="lg">
          <Sparkles className="size-4" />
          Generer mon plan
        </Button>
      </div>
    );
  }

  // Loading state: generating plan
  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          Generation en cours...
        </div>
        <div className="hidden lg:grid lg:grid-cols-7 lg:gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <Skeleton key={`gen-skeleton-${i}`} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto lg:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
            <Skeleton key={`gen-mobile-${i}`} className="h-48 min-w-[280px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Plan generated: show grid + actions
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGenerate} variant="outline" disabled={isGenerating}>
          <RefreshCw className="size-4" />
          Regenerer
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isSaved}>
          <Save className="size-4" />
          {isSaved ? "Sauvegarde" : isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
      {plan && (
        <WeeklySummary score={plan.score} weeklyTargets={weeklyTargets} warnings={plan.warnings} />
      )}
      {plan && <WeeklyGrid plan={plan} dailyTargets={dailyTargets} weeklyTargets={weeklyTargets} />}
    </div>
  );
}
