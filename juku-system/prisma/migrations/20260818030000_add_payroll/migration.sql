-- 給与計算（新規依頼 B-9）。時給は User に紐づける（管理者は Teacher レコードを持たない場合があるため）。
-- 追加のみ・既存データ非破壊。

CREATE TABLE "hourly_wages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hourly_yen" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hourly_wages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hourly_wages_user_id_effective_from_idx" ON "hourly_wages"("user_id", "effective_from");
ALTER TABLE "hourly_wages" ADD CONSTRAINT "hourly_wages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year_month" TEXT NOT NULL,
    "total_minutes" INTEGER NOT NULL,
    "base_yen" INTEGER NOT NULL,
    "adjustment_yen" INTEGER NOT NULL DEFAULT 0,
    "adjustment_note" TEXT NOT NULL DEFAULT '',
    "total_yen" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confirmed_at" TIMESTAMP(3),
    "warnings" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payslips_user_id_year_month_key" ON "payslips"("user_id", "year_month");
CREATE INDEX "payslips_year_month_idx" ON "payslips"("year_month");
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payslip_items" (
    "id" TEXT NOT NULL,
    "payslip_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "hourly_yen" INTEGER NOT NULL,
    "amount_yen" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "payslip_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payslip_items_payslip_id_idx" ON "payslip_items"("payslip_id");
ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_payslip_id_fkey"
    FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
