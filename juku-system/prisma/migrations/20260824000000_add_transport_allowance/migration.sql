-- 交通費（2026-08-24 依頼）。出勤1日あたり既定 200 円を講師・管理者の給与に加算する。
-- 単価は人ごとに変更できるよう users に持たせる。追加のみ・既存データ非破壊。

ALTER TABLE "users" ADD COLUMN "transport_allowance_yen" INTEGER NOT NULL DEFAULT 200;

-- 既存の明細も再生成すれば交通費が入るよう、集計結果の保存先を追加する。
ALTER TABLE "payslips" ADD COLUMN "work_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payslips" ADD COLUMN "transport_yen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payslip_items" ADD COLUMN "transport_yen" INTEGER NOT NULL DEFAULT 0;
