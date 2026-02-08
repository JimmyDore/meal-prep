import { z } from "zod";

// --- Enum value arrays (shared with DB schema pgEnums) ---

export const sexValues = ["homme", "femme"] as const;

export const activityLevelValues = [
  "sedentaire",
  "legerement_actif",
  "moderement_actif",
  "actif",
  "tres_actif",
] as const;

export const goalValues = ["seche", "maintien", "prise_de_masse", "recomposition"] as const;

export const dietaryPreferenceValues = [
  "vegetarien",
  "vegan",
  "sans_gluten",
  "sans_lactose",
  "sans_porc",
  "halal",
  "sans_fruits_de_mer",
] as const;

export const activityTypeValues = [
  "course",
  "musculation",
  "natation",
  "velo",
  "yoga",
  "marche",
  "sport_collectif",
] as const;

// --- Zod schemas per onboarding step ---

/** Step 1: Physical info */
export const physicalSchema = z.object({
  weight: z.number().min(30).max(300), // kg
  height: z.number().min(100).max(250), // cm
  age: z.number().int().min(14).max(100),
  sex: z.enum(sexValues),
  activityLevel: z.enum(activityLevelValues),
});

/** Step 2: Goal + household */
export const goalSchema = z.object({
  goal: z.enum(goalValues),
  householdSize: z.number().int().min(1).max(6),
});

/** Step 3: Dietary preferences (multi-select) */
export const dietarySchema = z.object({
  dietaryPreferences: z.array(z.enum(dietaryPreferenceValues)),
});

/** Step 4: Sport activities */
export const sportActivitySchema = z.object({
  activityType: z.enum(activityTypeValues),
  weeklyFrequency: z.number().int().min(1).max(7),
});

export const sportSchema = z.object({
  sportActivities: z.array(sportActivitySchema),
});

/** Full profile schema (all steps combined) */
export const profileSchema = physicalSchema
  .merge(goalSchema)
  .merge(dietarySchema)
  .merge(sportSchema);

export type ProfileFormData = z.infer<typeof profileSchema>;
export type SportActivity = z.infer<typeof sportActivitySchema>;

// --- French display labels ---

export const sexLabels: Record<(typeof sexValues)[number], string> = {
  homme: "Homme",
  femme: "Femme",
};

export const activityLevelLabels: Record<(typeof activityLevelValues)[number], string> = {
  sedentaire: "Sedentaire",
  legerement_actif: "Legerement actif",
  moderement_actif: "Moderement actif",
  actif: "Actif",
  tres_actif: "Tres actif",
};

export const goalLabels: Record<(typeof goalValues)[number], string> = {
  seche: "Seche",
  maintien: "Maintien",
  prise_de_masse: "Prise de masse",
  recomposition: "Recomposition",
};

export const dietaryPreferenceLabels: Record<(typeof dietaryPreferenceValues)[number], string> = {
  vegetarien: "Vegetarien",
  vegan: "Vegan",
  sans_gluten: "Sans gluten",
  sans_lactose: "Sans lactose",
  sans_porc: "Sans porc",
  halal: "Halal",
  sans_fruits_de_mer: "Sans fruits de mer",
};

export const activityTypeLabels: Record<(typeof activityTypeValues)[number], string> = {
  course: "Course / Running",
  musculation: "Musculation",
  natation: "Natation",
  velo: "Velo",
  yoga: "Yoga",
  marche: "Marche",
  sport_collectif: "Sport collectif",
};
