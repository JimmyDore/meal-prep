"use client";

import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MealSlot } from "@/lib/meal-plan";
import { MEALS_PER_DAY } from "@/lib/meal-plan";
import type { MacroTargets } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import { MatchBadge } from "./match-badge";

interface MealSlotCardProps {
  slot: MealSlot;
  dailyTarget: MacroTargets;
}

function formatDelta(value: number, unit: string): { text: string; className: string } {
  const rounded = Math.round(value);
  if (rounded >= 0) {
    return { text: `+${rounded}${unit}`, className: "text-green-600" };
  }
  return { text: `${rounded}${unit}`, className: "text-red-600" };
}

export function MealSlotCard({ slot, dailyTarget }: MealSlotCardProps) {
  const { recipe } = slot;
  const perMealTarget = {
    calories: dailyTarget.calories / MEALS_PER_DAY,
    protein: dailyTarget.protein / MEALS_PER_DAY,
    carbs: dailyTarget.carbs / MEALS_PER_DAY,
    fat: dailyTarget.fat / MEALS_PER_DAY,
  };

  const deltas = {
    calories: formatDelta(recipe.perServing.calories - perMealTarget.calories, " kcal"),
    protein: formatDelta(recipe.perServing.protein - perMealTarget.protein, "g"),
    carbs: formatDelta(recipe.perServing.carbs - perMealTarget.carbs, "g"),
    fat: formatDelta(recipe.perServing.fat - perMealTarget.fat, "g"),
  };

  // Score for this individual recipe vs per-meal target
  const totalTarget =
    perMealTarget.calories + perMealTarget.protein + perMealTarget.carbs + perMealTarget.fat;
  const totalDelta =
    Math.abs(recipe.perServing.calories - perMealTarget.calories) +
    Math.abs(recipe.perServing.protein - perMealTarget.protein) +
    Math.abs(recipe.perServing.carbs - perMealTarget.carbs) +
    Math.abs(recipe.perServing.fat - perMealTarget.fat);
  const recipeScore =
    totalTarget > 0 ? Math.max(0, Math.round((1 - totalDelta / totalTarget) * 100)) : 0;

  return (
    <Collapsible>
      <Card className="gap-0 py-0 transition-shadow hover:shadow-md">
        <CollapsibleTrigger className="w-full cursor-pointer">
          <CardContent className="flex items-center gap-2 px-3 py-2">
            <p className="flex-1 text-left text-sm font-medium leading-tight line-clamp-2">
              {recipe.title}
            </p>
            <MatchBadge score={recipeScore} size="sm" />
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 py-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">P</span>
                      <span className="font-medium">{Math.round(recipe.perServing.protein)}g</span>
                      <span className={cn("text-[10px]", deltas.protein.className)}>
                        {deltas.protein.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">G</span>
                      <span className="font-medium">{Math.round(recipe.perServing.carbs)}g</span>
                      <span className={cn("text-[10px]", deltas.carbs.className)}>
                        {deltas.carbs.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">L</span>
                      <span className="font-medium">{Math.round(recipe.perServing.fat)}g</span>
                      <span className={cn("text-[10px]", deltas.fat.className)}>
                        {deltas.fat.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cal</span>
                      <span className="font-medium">{Math.round(recipe.perServing.calories)}</span>
                      <span className={cn("text-[10px]", deltas.calories.className)}>
                        {deltas.calories.text}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Ecart par rapport a la cible par repas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
