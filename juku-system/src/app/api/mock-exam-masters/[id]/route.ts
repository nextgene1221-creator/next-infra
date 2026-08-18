import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 模試マスタの更新・削除。管理者のみ。

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    name?: string;
    provider?: string;
    gradeLevels?: string;
    sortOrder?: number;
    active?: boolean;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "模試名は必須です" }, { status: 400 });
    const dup = await prisma.mockExam.findUnique({ where: { name } });
    if (dup && dup.id !== id) {
      return NextResponse.json({ error: "同名の模試が既に登録されています" }, { status: 409 });
    }
    data.name = name;
  }
  if (typeof body.provider === "string") data.provider = body.provider.trim();
  if (Array.isArray(body.gradeLevels)) data.gradeLevels = JSON.stringify(body.gradeLevels);
  if (Number.isFinite(Number(body.sortOrder))) data.sortOrder = Math.floor(Number(body.sortOrder));
  if (typeof body.active === "boolean") data.active = body.active;

  const exam = await prisma.mockExam.update({ where: { id }, data });
  return NextResponse.json(exam);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // 既存の模試結果から参照されている場合は削除させない（集計が壊れるため）。
  // 使わなくなったものは active=false での無効化を推奨する（Material と同じ方針）。
  const used = await prisma.mockExamResult.count({ where: { mockExamId: id } });
  if (used > 0) {
    return NextResponse.json(
      { error: `この模試は ${used} 件の模試結果から参照されています。削除ではなく「無効化」してください。` },
      { status: 409 },
    );
  }

  await prisma.mockExam.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
