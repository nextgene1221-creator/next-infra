import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ルートの複製（新規依頼 B-6 の「フォーマット＝雛形として使い回す」部分）。
// 塾共通のルートを土台にして、少しだけ違う派生ルートを作るための機能。
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const src = await prisma.materialRoute.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!src) return NextResponse.json({ error: "ルートが見つかりません" }, { status: 404 });

  const copy = await prisma.materialRoute.create({
    data: {
      name: `${src.name} のコピー`,
      subject: src.subject,
      targetLevel: src.targetLevel,
      description: src.description,
      items: {
        create: src.items.map((it) => ({
          materialId: it.materialId,
          sortOrder: it.sortOrder,
          note: it.note,
        })),
      },
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { material: { select: { id: true, name: true, subject: true, publisher: true } } },
      },
    },
  });
  return NextResponse.json(copy);
}
