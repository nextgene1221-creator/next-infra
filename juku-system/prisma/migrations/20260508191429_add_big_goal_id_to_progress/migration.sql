-- AlterTable
ALTER TABLE "progress_records" ADD COLUMN "big_goal_id" TEXT;

-- AddForeignKey
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_big_goal_id_fkey"
  FOREIGN KEY ("big_goal_id") REFERENCES "big_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
