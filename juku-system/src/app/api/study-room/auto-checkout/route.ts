import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllCampuses } from "@/lib/studyRoom";
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

  const campuses = await getAllCampuses();
  const nowHm = nowJstHm();
  const now = new Date();

  const dueCampusCodes = campuses
    .filter((c) => c.closeTime && c.closeTime <= nowHm)
    .map((c) => c.code);

  if (dueCampusCodes.length === 0) {
    return NextResponse.json({ ok: true, closed: 0, nowHm });
  }

  const open = await prisma.studyRoomSession.findMany({
    where: { checkOutAt: null, campus: { in: dueCampusCodes } },
    include: { student: true },
  });
  if (open.length === 0) {
    return NextResponse.json({ ok: true, closed: 0, nowHm });
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
  return NextResponse.json({ ok: true, closed: open.length, nowHm, campuses: dueCampusCodes });
}
