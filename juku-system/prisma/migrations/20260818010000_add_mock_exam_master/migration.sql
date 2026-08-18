-- 模試マスタ（新規依頼 B-7）。模試名の表記ゆれによる集計ミスを防ぐための選択元データ。
-- 追加のみ・既存データ非破壊。mock_exam_results.mock_exam_id は NULL 許容（既存行は未紐付けのまま）。

CREATE TABLE "mock_exams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "grade_levels" TEXT NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mock_exams_name_key" ON "mock_exams"("name");
CREATE INDEX "mock_exams_active_idx" ON "mock_exams"("active");

ALTER TABLE "mock_exam_results" ADD COLUMN "mock_exam_id" TEXT;
CREATE INDEX "mock_exam_results_mock_exam_id_idx" ON "mock_exam_results"("mock_exam_id");
ALTER TABLE "mock_exam_results" ADD CONSTRAINT "mock_exam_results_mock_exam_id_fkey"
    FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
