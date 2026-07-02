import { NextRequest, NextResponse } from "next/server";
import { sendEveningNotifications } from "@/lib/lineNotify";

// 手動/テスト用エンドポイント。本番の定時実行は auto-checkout(22:00 JST) に相乗りして
// Hobbyプランの Cron 本数制限（2本）内に収める。
// Vercel Cron: Authorization: Bearer ${CRON_SECRET}
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendEveningNotifications();
  return NextResponse.json({ ok: true, kind: "evening", ...result });
}
