import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 時給の設定（新規依頼 B-9）。管理者のみ。
// 履歴として積み、effectiveFrom 以降に適用される。過去日付も設定可（遡及計算のため / B-9(g)）。

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const wages = await prisma.hourlyWage.findMany({
    orderBy: [{ userId: "asc" }, { effectiveFrom: "desc" }],
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  return NextResponse.json(wages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const hourlyYen = Math.floor(Number(body.hourlyYen));
  const effectiveFrom = typeof body.effectiveFrom === "string" ? body.effectiveFrom : "";

  if (!userId || !effectiveFrom) {
    return NextResponse.json({ error: "対象者と適用開始日は必須です" }, { status: 400 });
  }
  if (!Number.isFinite(hourlyYen) || hourlyYen <= 0) {
    return NextResponse.json({ error: "時給は 1 円以上で入力してください" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "対象者が見つかりません" }, { status: 404 });
  if (target.role === "student") {
    return NextResponse.json({ error: "生徒には時給を設定できません" }, { status: 400 });
  }

  // 適用開始日は JST の日付として扱う（UTC の 15:00 = JST 翌 00:00）
  const [y, m, d] = effectiveFrom.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, d) - 9 * 60 * 60 * 1000);

  const wage = await prisma.hourlyWage.create({
    data: {
      userId,
      hourlyYen,
      effectiveFrom: from,
      note: typeof body.note === "string" ? body.note.trim() : "",
    },
  });
  return NextResponse.json(wage);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await prisma.hourlyWage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
