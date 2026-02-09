"use client";

import { MacroDetail } from "@/components/macro-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BMRResult, MacroTargets, TDEEResult } from "@/lib/nutrition";

interface MacroDashboardProps {
  macroTargets: MacroTargets;
  tdeeResult: TDEEResult;
  bmrResult: BMRResult;
  profile: {
    weight: number;
    height: number;
    age: number;
    sex: string;
    activityLevel: string;
    goal: string;
  };
  sportActivities: Array<{
    activityType: string;
    weeklyFrequency: number;
  }>;
}

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

function macroPercentage(grams: number, kcalPerGram: number, totalCalories: number): number {
  if (totalCalories === 0) return 0;
  return Math.round((grams * kcalPerGram * 100) / totalCalories);
}

export function MacroDashboard({
  macroTargets,
  tdeeResult,
  bmrResult,
  profile,
  sportActivities,
}: MacroDashboardProps) {
  const proteinPct = macroPercentage(
    macroTargets.protein,
    KCAL_PER_GRAM.protein,
    macroTargets.calories,
  );
  const carbsPct = macroPercentage(macroTargets.carbs, KCAL_PER_GRAM.carbs, macroTargets.calories);
  const fatPct = macroPercentage(macroTargets.fat, KCAL_PER_GRAM.fat, macroTargets.calories);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Objectif journalier</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Calories - prominent */}
          <div className="mb-6 text-center">
            <span className="text-4xl font-bold">{macroTargets.calories}</span>
            <span className="ml-1 text-lg text-muted-foreground">kcal / jour</span>
          </div>

          {/* Macro bars */}
          <div className="space-y-3">
            {/* Protein */}
            <MacroBar
              label="Proteines"
              grams={macroTargets.protein}
              percentage={proteinPct}
              color="bg-blue-500"
              bgColor="bg-blue-100"
              maxGrams={Math.max(macroTargets.protein, macroTargets.carbs, macroTargets.fat)}
            />

            {/* Carbs */}
            <MacroBar
              label="Glucides"
              grams={macroTargets.carbs}
              percentage={carbsPct}
              color="bg-amber-500"
              bgColor="bg-amber-100"
              maxGrams={Math.max(macroTargets.protein, macroTargets.carbs, macroTargets.fat)}
            />

            {/* Fat */}
            <MacroBar
              label="Lipides"
              grams={macroTargets.fat}
              percentage={fatPct}
              color="bg-rose-500"
              bgColor="bg-rose-100"
              maxGrams={Math.max(macroTargets.protein, macroTargets.carbs, macroTargets.fat)}
            />
          </div>
        </CardContent>
      </Card>

      <MacroDetail
        bmrResult={bmrResult}
        tdeeResult={tdeeResult}
        macroTargets={macroTargets}
        profile={profile}
        sportActivities={sportActivities}
      />
    </div>
  );
}

function MacroBar({
  label,
  grams,
  percentage,
  color,
  bgColor,
  maxGrams,
}: {
  label: string;
  grams: number;
  percentage: number;
  color: string;
  bgColor: string;
  maxGrams: number;
}) {
  const barWidth = maxGrams > 0 ? (grams / maxGrams) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {grams}g ({percentage}%)
        </span>
      </div>
      <div className={`h-2.5 w-full rounded-full ${bgColor}`}>
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}
