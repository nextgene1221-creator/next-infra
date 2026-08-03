-- 担当講師(teacher_id)を任意(nullable)にする。管理者が作成した記録が自動で「最初の講師(佐藤駿)」に
-- 割り当てられていた不具合の修正に伴い、担当なし(null)を許容する。既存データ非破壊（NOT NULL制約の解除のみ）。

ALTER TABLE "progress_records" ALTER COLUMN "teacher_id" DROP NOT NULL;
ALTER TABLE "meetings" ALTER COLUMN "teacher_id" DROP NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "teacher_id" DROP NOT NULL;
