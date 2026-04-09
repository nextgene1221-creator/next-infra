-- Add alert tracking flags
ALTER TABLE "tasks" ADD COLUMN "overdue_alerted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shifts" ADD COLUMN "no_show_alerted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shifts" ADD COLUMN "forgot_clock_out_alerted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "learning_goals" ADD COLUMN "pace_alerted" BOOLEAN NOT NULL DEFAULT false;
