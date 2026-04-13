-- AlterTable
ALTER TABLE "students" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "campus" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "consider_recommendation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "desired_faculty" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "eiken_plan" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "exam_subjects" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "first_choice_school" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "furigana" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "gender" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mobile_phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postal_code" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "referrer" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "track" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "department" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "emergency_contact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "exam_subjects_taken" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "graduation_year" INTEGER,
ADD COLUMN     "university_club" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "university_faculty" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "student_assignments" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_assignments_teacher_id_student_id_key" ON "student_assignments"("teacher_id", "student_id");

-- AddForeignKey
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
