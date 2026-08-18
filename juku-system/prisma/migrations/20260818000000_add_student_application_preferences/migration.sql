-- 生徒に「出願思考」と「志望校立地」の希望を追加（新規依頼 B-1 / B-2）。
-- 追加のみ・既存データ非破壊（DEFAULT '' = 未設定）。
-- application_policy : public_only / prefer_public / either / prefer_private / private_only
-- location_preference: urban_only / prefer_urban / any / prefer_rural / rural_only / okinawa_only

ALTER TABLE "students" ADD COLUMN "application_policy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "students" ADD COLUMN "location_preference" TEXT NOT NULL DEFAULT '';
