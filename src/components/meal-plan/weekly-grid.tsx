"use client";

import type { PlanResult, WeeklyMacroTargets } from "@/lib/meal-plan";
import type { MacroTargets } from "@/lib/nutrition";
import { DailySummary } from "./daily-summary";
import { MealSlotCard } from "./meal-slot-card";

interface WeeklyGridProps {
  plan: PlanResult;
  dailyTargets: MacroTargets;
  weeklyTargets: WeeklyMacroTargets;
}

const DAY_LABELS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_LABELS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function WeeklyGrid({ plan, dailyTargets }: WeeklyGridProps) {
  const dayIndices = [0, 1, 2, 3, 4, 5, 6];

  function slotsForDay(dayIndex: number) {
    return plan.slots.filter((s) => s.dayIndex === dayIndex);
  }

  function slotForDayMeal(dayIndex: number, mealType: "midi" | "soir") {
    return plan.slots.find((s) => s.dayIndex === dayIndex && s.mealType === mealType) ?? null;
  }

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-7 gap-2">
          {/* Row 1: Day headers */}
          {dayIndices.map((dayIdx) => (
            <div key={`header-${dayIdx}`} className="py-2 text-center text-sm font-bold">
              {DAY_LABELS_SHORT[dayIdx]}
            </div>
          ))}

          {/* Row 2: Midi slots */}
          {dayIndices.map((dayIdx) => {
            const slot = slotForDayMeal(dayIdx, "midi");
            return (
              <div key={`midi-${dayIdx}`}>
                {dayIdx === 0 && (
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Midi</p>
                )}
                {slot ? (
                  <MealSlotCard slot={slot} dailyTarget={dailyTargets} />
                ) : (
                  <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    --
                  </div>
                )}
              </div>
            );
          })}

          {/* Row 3: Soir slots */}
          {dayIndices.map((dayIdx) => {
            const slot = slotForDayMeal(dayIdx, "soir");
            return (
              <div key={`soir-${dayIdx}`}>
                {dayIdx === 0 && (
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Soir</p>
                )}
                {slot ? (
                  <MealSlotCard slot={slot} dailyTarget={dailyTargets} />
                ) : (
                  <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    --
                  </div>
                )}
              </div>
            );
          })}

          {/* Row 4: Daily summaries */}
          {dayIndices.map((dayIdx) => (
            <div key={`summary-${dayIdx}`} className="rounded-md bg-muted/50 px-2 py-1.5">
              <DailySummary slots={slotsForDay(dayIdx)} dailyTarget={dailyTargets} />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:hidden">
        {dayIndices.map((dayIdx) => {
          const midiSlot = slotForDayMeal(dayIdx, "midi");
          const soirSlot = slotForDayMeal(dayIdx, "soir");

          return (
            <div
              key={`mobile-${dayIdx}`}
              className="min-w-[280px] snap-center space-y-3 rounded-lg border p-4"
            >
              <h3 className="text-sm font-bold">{DAY_LABELS_FULL[dayIdx]}</h3>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Midi</p>
                {midiSlot ? (
                  <MealSlotCard slot={midiSlot} dailyTarget={dailyTargets} />
                ) : (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    --
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Soir</p>
                {soirSlot ? (
                  <MealSlotCard slot={soirSlot} dailyTarget={dailyTargets} />
                ) : (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    --
                  </div>
                )}
              </div>

              <div className="rounded-md bg-muted/50 px-2 py-1.5">
                <DailySummary slots={slotsForDay(dayIdx)} dailyTarget={dailyTargets} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
