ALTER TABLE "recipes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "prep_time_min" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "total_time_min" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "difficulty" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "instructions" jsonb;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutri_score" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "rating" real;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "rating_count" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "cuisine" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "jow_nutrition_per_serving" jsonb;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_name_unique" UNIQUE("name");