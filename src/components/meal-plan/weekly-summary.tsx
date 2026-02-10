"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PlanScore, WeeklyMacroTargets } from "@/lib/meal-plan";
import { matchColor } from "@/lib/meal-plan";
import { cn } from "@/lib/utils";
import { MatchBadge } from "./match-badge";

interface WeeklySummaryProps {
  score: PlanScore;
  weeklyTargets: WeeklyMacroTargets;
  warnings: string[];
}

interface MacroBarProps {
  label: string;
  actual: number;
  target: number;
  percentage: number;
  unit: string;
}

const progressColorClasses: Record<ReturnType<typeof matchColor>, string> = {
  green: "[&>[data-slot=progress-indicator]]:bg-green-500",
  yellow: "[&>[data-slot=progress-indicator]]:bg-amber-500",
  red: "[&>[data-slot=progress-indicator]]:bg-red-500",
};

function MacroBar({ label, actual, target, percentage, unit }: MacroBarProps) {
  const delta = Math.round(actual - target);
  const deltaText = delta >= 0 ? `+${delta}${unit}` : `${delta}${unit}`;
  const color = matchColor(percentage);
  const progressValue = Math.min(100, target > 0 ? (actual / target) * 100 : 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {Math.round(actual)}/{Math.round(target)}
            {unit}
          </span>
          <span
            className={cn("text-xs font-medium", delta >= 0 ? "text-green-600" : "text-red-600")}
          >
            {deltaText}
          </span>
        </div>
      </div>
      <Progress value={progressValue} className={cn("h-2", progressColorClasses[color])} />
    </div>
  );
}

export function WeeklySummary({ score, weeklyTargets, warnings }: WeeklySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Resume hebdomadaire</CardTitle>
          <MatchBadge score={score.overall} size="md" />
          <span className="text-sm text-muted-foreground">
            {Math.round(score.overall)}% de correspondance
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MacroBar
          label="Proteines"
          actual={score.protein.actual}
          target={weeklyTargets.protein}
          percentage={score.protein.percentage}
          unit="g"
        />
        <MacroBar
          label="Glucides"
          actual={score.carbs.actual}
          target={weeklyTargets.carbs}
          percentage={score.carbs.percentage}
          unit="g"
        />
        <MacroBar
          label="Lipides"
          actual={score.fat.actual}
          target={weeklyTargets.fat}
          percentage={score.fat.percentage}
          unit="g"
        />
        <MacroBar
          label="Calories"
          actual={score.calories.actual}
          target={weeklyTargets.calories}
          percentage={score.calories.percentage}
          unit=" kcal"
        />

        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <ul className="space-y-1 text-sm text-amber-800">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
