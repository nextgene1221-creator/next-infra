import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllCampuses } from "@/lib/studyRoom";
import { sendEveningNotifications } from "@/lib/lineNotify";
import { sendClockOutReminders, sendPendingPrintsReminder } from "@/lib/staffNotify";
import type { Prisma } from "@/generated/prisma/client";

// JST (UTC+9) の現在 HH:mm を返す
function nowJstHm(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const m = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// Vercel Cron: Authorization: Bearer ${CRON_SECRET}
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 夜通知(22:00 JST)を相乗り実行（Hobbyプランの Cron 2本制限内に収めるため）
  const line = await sendEveningNotifications().catch((e) => ({
    error: (e as Error).message,
  }));

  // 講師・管理者向けのプッシュも相乗り（退勤打刻の押し忘れ / 今日のプリント未完了）
  const staff = {
    clockOut: await sendClockOutReminders().catch((e) => ({ error: (e as Error).message })),
    prints: await sendPendingPrintsReminder().catch((e) => ({ error: (e as Error).message })),
  };

  const campuses = await getAllCampuses();
  const nowHm = nowJstHm();
  const now = new Date();

  const dueCampusCodes = campuses
    .filter((c) => c.closeTime && c.closeTime <= nowHm)
    .map((c) => c.code);

  if (dueCampusCodes.length === 0) {
    return NextResponse.json({ ok: true, closed: 0, nowHm, line, staff });
  }

  const open = await prisma.studyRoomSession.findMany({
    where: { checkOutAt: null, campus: { in: dueCampusCodes } },
    include: { student: true },
  });
  if (open.length === 0) {
    return NextResponse.json({ ok: true, closed: 0, nowHm, line, staff });
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const s of open) {
    ops.push(
      prisma.studyRoomSession.update({
        where: { id: s.id },
        data: { checkOutAt: now, autoCheckedOut: true, pointAwarded: true },
      })
    );
    ops.push(
      prisma.pointTransaction.create({
        data: { studentId: s.studentId, delta: 1, reason: "自習室自動退室" },
      })
    );
  }
  await prisma.$transaction(ops);
  return NextResponse.json({
    ok: true,
    closed: open.length,
    nowHm,
    campuses: dueCampusCodes,
    line,
    staff,
  });
}
