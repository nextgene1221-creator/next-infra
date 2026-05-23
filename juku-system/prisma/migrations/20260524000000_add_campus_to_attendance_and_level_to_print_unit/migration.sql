-- Add campus to attendances
ALTER TABLE "attendances" ADD COLUMN "campus" TEXT NOT NULL DEFAULT '';

-- Add level to print_units (existing rows become 'textbook')
ALTER TABLE "print_units" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'textbook';
