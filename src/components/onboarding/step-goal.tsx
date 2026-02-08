"use client";

import { RefreshCw, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ProfileFormData } from "@/lib/schemas/profile";
import { goalValues } from "@/lib/schemas/profile";
import { cn } from "@/lib/utils";

const goalConfig = {
  seche: {
    label: "Seche",
    description: "Perdre du gras tout en preservant le muscle",
    icon: TrendingDown,
  },
  maintien: {
    label: "Maintien",
    description: "Maintenir votre poids et composition actuelle",
    icon: Scale,
  },
  prise_de_masse: {
    label: "Prise de masse",
    description: "Gagner du muscle avec un surplus calorique",
    icon: TrendingUp,
  },
  recomposition: {
    label: "Recomposition",
    description: "Perdre du gras et gagner du muscle simultanement",
    icon: RefreshCw,
  },
} as const;

export function StepGoal() {
  const form = useFormContext<ProfileFormData>();

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="goal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Objectif</FormLabel>
            <FormControl>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {goalValues.map((value) => {
                  const config = goalConfig[value];
                  const Icon = config.icon;
                  const isSelected = field.value === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-6",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="font-medium text-sm">{config.label}</span>
                      <span className="text-muted-foreground text-xs">{config.description}</span>
                    </button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="householdSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre de personnes</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="1"
                min={1}
                max={6}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : Number(val));
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
