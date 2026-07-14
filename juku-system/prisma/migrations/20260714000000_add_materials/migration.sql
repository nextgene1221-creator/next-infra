-- Material master (教材マスタ). 進捗・目標・面談記録の教材選択の元データ。追加のみ・既存データ非破壊。
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "total_pages" INTEGER,
    "level" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materials_subject_idx" ON "materials"("subject");

-- CreateIndex
CREATE INDEX "materials_active_idx" ON "materials"("active");
