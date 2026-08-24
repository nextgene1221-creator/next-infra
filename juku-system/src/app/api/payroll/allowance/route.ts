import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 交通費（出勤1日あたりの単価）の設定。管理者のみ。
// 講師・管理者の編集画面と給与計算画面の両方から呼ばれる。
// 単価そのものは履歴を持たない（変更後に明細を再生成すると、その月全体が新単価で再計算される）。

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const yen = Math.floor(Number(body.transportAllowanceYen));

  if (!userId) {
    return NextResponse.json({ error: "対象者は必須です" }, { status: 400 });
  }
  if (!Number.isFinite(yen) || yen < 0) {
    return NextResponse.json({ error: "交通費は 0 円以上で入力してください" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "対象者が見つかりません" }, { status: 404 });
  if (target.role === "student") {
    return NextResponse.json({ error: "生徒には交通費を設定できません" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { transportAllowanceYen: yen },
    select: { id: true, name: true, transportAllowanceYen: true },
  });
  return NextResponse.json(user);
}
