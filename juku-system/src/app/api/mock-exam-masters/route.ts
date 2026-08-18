import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 模試マスタ（新規依頼 B-7）。模試「結果」の API は /api/mock-exams なので別パスにしている。
// 参照は認証済み全ロール（入力プルダウンで使う）、更新は管理者のみ。

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exams = await prisma.mockExam.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(exams);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "模試名は必須です" }, { status: 400 });

  const existing = await prisma.mockExam.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "同名の模試が既に登録されています" }, { status: 409 });
  }

  const exam = await prisma.mockExam.create({
    data: {
      name,
      provider: typeof body.provider === "string" ? body.provider.trim() : "",
      gradeLevels: JSON.stringify(Array.isArray(body.gradeLevels) ? body.gradeLevels : []),
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.floor(Number(body.sortOrder)) : 0,
    },
  });
  return NextResponse.json(exam);
}
