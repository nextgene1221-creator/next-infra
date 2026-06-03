-- Add weekdays to routine_tasks (JSON array [0..6], empty [] means "every day")
ALTER TABLE "routine_tasks" ADD COLUMN "weekdays" TEXT NOT NULL DEFAULT '[]';
