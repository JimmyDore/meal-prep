"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { BMRResult, MacroTargets, TDEEResult } from "@/lib/nutrition";

interface MacroDetailProps {
  bmrResult: BMRResult;
  tdeeResult: TDEEResult;
  macroTargets: MacroTargets;
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

const ACTIVITY_LABELS: Record<string, string> = {
  sedentaire: "Sedentaire",
  legerement_actif: "Legerement actif",
  moderement_actif: "Moderement actif",
  actif: "Actif",
  tres_actif: "Tres actif",
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentaire: 1.2,
  legerement_actif: 1.3,
  moderement_actif: 1.4,
  actif: 1.5,
  tres_actif: 1.6,
};

const GOAL_LABELS: Record<string, string> = {
  seche: "Seche",
  maintien: "Maintien",
  prise_de_masse: "Prise de masse",
  recomposition: "Recomposition",
};

const GOAL_ADJUSTMENTS: Record<string, string> = {
  seche: "-20%",
  maintien: "0%",
  prise_de_masse: "+10%",
  recomposition: "-10%",
};

const SPORT_LABELS: Record<string, string> = {
  course: "Course",
  musculation: "Musculation",
  natation: "Natation",
  velo: "Velo",
  yoga: "Yoga",
  marche: "Marche",
  sport_collectif: "Sport collectif",
};

const SPORT_MET: Record<string, number> = {
  course: 9.0,
  musculation: 5.0,
  natation: 5.8,
  velo: 7.0,
  yoga: 2.5,
  marche: 4.3,
  sport_collectif: 7.5,
};

const SESSION_HOURS: Record<string, number> = {
  course: 1.0,
  musculation: 1.0,
  natation: 1.0,
  velo: 1.5,
  yoga: 1.0,
  marche: 1.0,
  sport_collectif: 1.5,
};

function computeSportDailyCalories(
  activityType: string,
  weeklyFrequency: number,
  weight: number,
): number {
  const met = SPORT_MET[activityType] ?? 5.0;
  const hours = SESSION_HOURS[activityType] ?? 1.0;
  const netMet = met - 1;
  return Math.round((netMet * weight * hours * weeklyFrequency) / 7);
}

export function MacroDetail({
  bmrResult,
  tdeeResult,
  macroTargets,
  profile,
  sportActivities,
}: MacroDetailProps) {
  const [expanded, setExpanded] = useState(false);

  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] ?? 1.2;
  const sexLabel = profile.sex === "homme" ? "Homme" : "Femme";

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>Comment c&apos;est calcule ?</span>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="space-y-3 text-sm text-muted-foreground">
            {/* BMR */}
            <div>
              <p className="font-medium text-foreground">Metabolisme de base (BMR)</p>
              <p>{bmrResult.bmr} kcal/jour (Mifflin-St Jeor)</p>
              <p className="text-xs">
                {profile.weight}kg, {profile.height}cm, {profile.age} ans, {sexLabel}
              </p>
            </div>

            {/* Activity TDEE */}
            <div>
              <p className="font-medium text-foreground">TDEE activite</p>
              <p>
                {tdeeResult.activityTDEE} kcal (BMR x {multiplier} pour &quot;
                {ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel}&quot;)
              </p>
            </div>

            {/* Sport */}
            <div>
              <p className="font-medium text-foreground">Sport</p>
              {sportActivities.length > 0 ? (
                <>
                  <p>
                    +{tdeeResult.sportCalories} kcal/jour ({sportActivities.length} activite
                    {sportActivities.length > 1 ? "s" : ""})
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {sportActivities.map((sa) => {
                      const dailyCal = computeSportDailyCalories(
                        sa.activityType,
                        sa.weeklyFrequency,
                        profile.weight,
                      );
                      return (
                        <li key={sa.activityType}>
                          {SPORT_LABELS[sa.activityType] ?? sa.activityType}: {sa.weeklyFrequency}
                          x/sem = +{dailyCal} kcal/jour
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p>Aucune activite sportive configuree</p>
              )}
            </div>

            {/* Total TDEE */}
            <div>
              <p className="font-medium text-foreground">TDEE total</p>
              <p>{tdeeResult.tdee} kcal/jour</p>
            </div>

            {/* Goal adjustment */}
            <div>
              <p className="font-medium text-foreground">Objectif</p>
              <p>
                {GOAL_LABELS[profile.goal] ?? profile.goal} (
                {GOAL_ADJUSTMENTS[profile.goal] ?? "0%"}) = {macroTargets.calories} kcal/jour
              </p>
            </div>

            {/* Macro split */}
            <div>
              <p className="font-medium text-foreground">Repartition</p>
              <p>
                P {macroTargets.protein}g, G {macroTargets.carbs}g, L {macroTargets.fat}g
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
