import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel Cron: Authorization: Bearer ${CRON_SECRET}
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const open = await prisma.studyRoomSession.findMany({
    where: { checkOutAt: null },
  });
  const now = new Date();
  await prisma.$transaction(
    open.map((s) =>
      prisma.studyRoomSession.update({
        where: { id: s.id },
        data: { checkOutAt: now, autoCheckedOut: true },
      })
    )
  );
  return NextResponse.json({ ok: true, closed: open.length });
}
