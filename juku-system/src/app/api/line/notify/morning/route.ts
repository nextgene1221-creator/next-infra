import { NextRequest, NextResponse } from "next/server";
import { sendMorningNotifications } from "@/lib/lineNotify";

// Vercel Cron: Authorization: Bearer ${CRON_SECRET}
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendMorningNotifications();
  return NextResponse.json({ ok: true, kind: "morning", ...result });
}
