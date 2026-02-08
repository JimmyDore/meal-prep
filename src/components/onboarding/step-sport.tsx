"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileFormData } from "@/lib/schemas/profile";
import { activityTypeLabels, activityTypeValues } from "@/lib/schemas/profile";

export function StepSport() {
  const form = useFormContext<ProfileFormData>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sportActivities",
  });

  const selectedTypes = form.watch("sportActivities")?.map((a) => a.activityType) ?? [];

  return (
    <div className="space-y-6">
      {fields.length === 0 && (
        <p className="text-center text-muted-foreground text-sm">
          Aucune activite sportive ajoutee
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-3">
          <FormField
            control={form.control}
            name={`sportActivities.${index}.activityType`}
            render={({ field: activityField }) => (
              <FormItem className="flex-1">
                {index === 0 && <FormLabel>Activite</FormLabel>}
                <Select onValueChange={activityField.onChange} value={activityField.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Type d'activite" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activityTypeValues.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        disabled={selectedTypes.includes(type) && activityField.value !== type}
                      >
                        {activityTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`sportActivities.${index}.weeklyFrequency`}
            render={({ field: freqField }) => (
              <FormItem className="w-28">
                {index === 0 && <FormLabel>Fois/sem.</FormLabel>}
                <FormControl>
                  <Input
                    type="number"
                    placeholder="3"
                    min={1}
                    max={7}
                    {...freqField}
                    value={freqField.value ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      freqField.onChange(val === "" ? undefined : Number(val));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            className="shrink-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            activityType: "" as ProfileFormData["sportActivities"][number]["activityType"],
            weeklyFrequency: 3,
          })
        }
        disabled={fields.length >= activityTypeValues.length}
        className="w-full"
      >
        <Plus className="mr-2 size-4" />
        Ajouter une activite
      </Button>
    </div>
  );
}
