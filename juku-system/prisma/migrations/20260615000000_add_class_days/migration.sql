-- Class days (specific-date based). Separate concept from self-study schedule.
CREATE TABLE "class_days" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "teacher_id" TEXT,
    "start_time" TEXT NOT NULL DEFAULT '',
    "end_time" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_days_student_id_date_idx" ON "class_days"("student_id", "date");

-- AddForeignKey
ALTER TABLE "class_days" ADD CONSTRAINT "class_days_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_days" ADD CONSTRAINT "class_days_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
