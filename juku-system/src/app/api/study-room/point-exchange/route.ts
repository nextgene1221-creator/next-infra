import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { studentId, points, reason } = await req.json();
  if (!studentId || !points || points <= 0) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  const agg = await prisma.pointTransaction.aggregate({
    where: { studentId },
    _sum: { delta: true },
  });
  const current = agg._sum.delta || 0;
  if (current < points) {
    return NextResponse.json({ error: `ポイントが不足しています（現在 ${current}P）` }, { status: 400 });
  }
  const tx = await prisma.pointTransaction.create({
    data: { studentId, delta: -points, reason: reason || "お菓子交換" },
  });
  return NextResponse.json({ ok: true, txId: tx.id });
}
