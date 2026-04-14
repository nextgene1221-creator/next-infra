-- CreateTable
CREATE TABLE "mock_exam_results" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "exam_name" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "grade_level" TEXT NOT NULL,
    "overall_deviation" DOUBLE PRECISION,
    "overall_score" INTEGER,
    "school_rank" INTEGER,
    "judgment" TEXT NOT NULL DEFAULT '',
    "subjects" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_exam_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mock_exam_results" ADD CONSTRAINT "mock_exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
