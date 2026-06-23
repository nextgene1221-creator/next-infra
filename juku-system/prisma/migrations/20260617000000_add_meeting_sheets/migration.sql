-- Weekly meeting sheets (filled by students before a meeting). No fixed week boundary.
CREATE TABLE "meeting_sheets" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "for_meeting_date" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "answers" TEXT NOT NULL DEFAULT '{}',
    "meeting_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_sheets_student_id_created_at_idx" ON "meeting_sheets"("student_id", "created_at");

-- AddForeignKey
ALTER TABLE "meeting_sheets" ADD CONSTRAINT "meeting_sheets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
