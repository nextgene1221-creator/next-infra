-- CreateTable
CREATE TABLE "study_room_sessions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "check_in_at" TIMESTAMP(3) NOT NULL,
    "check_out_at" TIMESTAMP(3),
    "auto_checked_out" BOOLEAN NOT NULL DEFAULT false,
    "point_awarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_room_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_room_sessions_student_id_check_out_at_idx" ON "study_room_sessions"("student_id", "check_out_at");

-- CreateIndex
CREATE INDEX "study_room_sessions_campus_check_out_at_idx" ON "study_room_sessions"("campus", "check_out_at");

-- CreateIndex
CREATE INDEX "point_transactions_student_id_idx" ON "point_transactions"("student_id");

-- AddForeignKey
ALTER TABLE "study_room_sessions" ADD CONSTRAINT "study_room_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
