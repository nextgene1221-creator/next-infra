-- Add campus column to shifts and shift_template_days
ALTER TABLE "shifts" ADD COLUMN "campus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "shift_template_days" ADD COLUMN "campus" TEXT NOT NULL DEFAULT '';
