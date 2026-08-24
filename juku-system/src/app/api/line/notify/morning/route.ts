import { NextRequest, NextResponse } from "next/server";
import { sendMorningNotifications } from "@/lib/lineNotify";
import { sendMorningStaffNotifications } from "@/lib/staffNotify";

// Vercel Cron: Authorization: Bearer ${CRON_SECRET}
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendMorningNotifications();
  // 講師・管理者向けの「今日の予定」プッシュも相乗り（Hobby プランの Cron 2 本制限内に収めるため）
  const staff = await sendMorningStaffNotifications().catch((e) => ({
    error: (e as Error).message,
  }));
  return NextResponse.json({ ok: true, kind: "morning", ...result, staff });
}
