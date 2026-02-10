"use client";

import type { MealSlot } from "@/lib/meal-plan";
import type { MacroTargets } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

interface DailySummaryProps {
  slots: MealSlot[];
  dailyTarget: MacroTargets;
}

function macroColorClass(actual: number, target: number): string {
  if (target === 0) return "text-muted-foreground";
  const ratio = Math.abs(actual - target) / target;
  if (ratio <= 0.1) return "text-green-600";
  if (ratio <= 0.2) return "text-amber-600";
  return "text-red-600";
}

export function DailySummary({ slots, dailyTarget }: DailySummaryProps) {
  const actual = slots.reduce(
    (acc, slot) => ({
      calories: acc.calories + slot.recipe.perServing.calories,
      protein: acc.protein + slot.recipe.perServing.protein,
      carbs: acc.carbs + slot.recipe.perServing.carbs,
      fat: acc.fat + slot.recipe.perServing.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const items = [
    { label: "Cal", actual: actual.calories, target: dailyTarget.calories, unit: "" },
    { label: "P", actual: actual.protein, target: dailyTarget.protein, unit: "g" },
    { label: "G", actual: actual.carbs, target: dailyTarget.carbs, unit: "g" },
    { label: "L", actual: actual.fat, target: dailyTarget.fat, unit: "g" },
  ];

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {items.map((item) => (
        <span
          key={item.label}
          className={cn("whitespace-nowrap", macroColorClass(item.actual, item.target))}
        >
          {item.label}: {Math.round(item.actual)}/{Math.round(item.target)}
          {item.unit}
        </span>
      ))}
    </div>
  );
}
