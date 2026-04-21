import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 指定月の scheduled シフトを一括 confirmed に
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { month } = body; // "YYYY-MM"
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const monthStart = new Date(year, m - 1, 1);
  const monthEnd = new Date(year, m, 0, 23, 59, 59, 999);

  const result = await prisma.shift.updateMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      status: "scheduled",
    },
    data: { status: "confirmed" },
  });

  return NextResponse.json({ ok: true, confirmed: result.count });
}
