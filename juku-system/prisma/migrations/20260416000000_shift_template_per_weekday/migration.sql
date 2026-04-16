-- CreateTable: per-weekday shift template
CREATE TABLE "shift_template_days" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_template_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_template_days_teacher_id_weekday_key"
  ON "shift_template_days"("teacher_id", "weekday");

-- AddForeignKey
ALTER TABLE "shift_template_days"
  ADD CONSTRAINT "shift_template_days_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing shift_templates into shift_template_days.
-- Each row's CSV weekdays (e.g. "1,3,5") is exploded into one row per weekday,
-- all sharing the legacy start_time / end_time.
INSERT INTO "shift_template_days" ("id", "teacher_id", "weekday", "start_time", "end_time", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  t."teacher_id",
  CAST(TRIM(wd) AS INTEGER) AS weekday,
  t."start_time",
  t."end_time",
  t."created_at",
  t."updated_at"
FROM "shift_templates" t,
     LATERAL unnest(string_to_array(t."weekdays", ',')) AS wd
WHERE TRIM(wd) <> '';

-- DropTable: legacy shift_templates
ALTER TABLE "shift_templates" DROP CONSTRAINT IF EXISTS "shift_templates_teacher_id_fkey";
DROP TABLE "shift_templates";
