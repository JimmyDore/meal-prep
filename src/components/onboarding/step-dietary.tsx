"use client";

import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import type { ProfileFormData } from "@/lib/schemas/profile";
import { dietaryPreferenceLabels, dietaryPreferenceValues } from "@/lib/schemas/profile";

export function StepDietary() {
  const form = useFormContext<ProfileFormData>();

  return (
    <div className="space-y-6">
      <FormDescription>
        Selectionnez vos restrictions alimentaires. Ces preferences sont des exclusions strictes.
      </FormDescription>

      <div className="space-y-3">
        {dietaryPreferenceValues.map((value) => (
          <FormField
            key={value}
            control={form.control}
            name="dietaryPreferences"
            render={({ field }) => {
              const currentValues = field.value ?? [];
              return (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={currentValues.includes(value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...currentValues, value]);
                        } else {
                          field.onChange(currentValues.filter((v: string) => v !== value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    {dietaryPreferenceLabels[value]}
                  </FormLabel>
                </FormItem>
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
