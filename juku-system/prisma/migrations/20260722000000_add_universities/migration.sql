-- 受験支援クラスタ: 大学マスタ⑤ + 出願戦略②の基盤。追加のみ・既存データ非破壊。

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universities_name_key" ON "universities"("name");

-- CreateTable
CREATE TABLE "university_admissions" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "faculty" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL DEFAULT '',
    "target_year" INTEGER,
    "exam_date" TEXT NOT NULL DEFAULT '',
    "application_period" TEXT NOT NULL DEFAULT '',
    "subjects" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER,
    "deviation_target" TEXT NOT NULL DEFAULT '',
    "exam_fee" INTEGER,
    "source_url" TEXT NOT NULL DEFAULT '',
    "content_hash" TEXT NOT NULL DEFAULT '',
    "last_crawled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "university_admissions_university_id_idx" ON "university_admissions"("university_id");

-- CreateTable
CREATE TABLE "admission_revisions" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL DEFAULT '',
    "diff" TEXT NOT NULL DEFAULT '',
    "source_url" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "admission_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admission_revisions_admission_id_changed_at_idx" ON "admission_revisions"("admission_id", "changed_at");

-- AddForeignKey
ALTER TABLE "university_admissions" ADD CONSTRAINT "university_admissions_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_revisions" ADD CONSTRAINT "admission_revisions_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "university_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
