import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 参考書ルート（新規依頼 B-6）。塾共通のテンプレートとして登録し、複製して使い回す。
// 参照は admin / teacher、更新は admin のみ（教材マスタと同じ方針）。

type ItemInput = { materialId: string; note?: string };

function parseItems(raw: unknown): ItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { materialId: string; note?: string } =>
      !!x && typeof x === "object" && typeof (x as { materialId?: unknown }).materialId === "string",
    )
    .map((x) => ({ materialId: x.materialId, note: typeof x.note === "string" ? x.note : "" }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const routes = await prisma.materialRoute.findMany({
    orderBy: [{ subject: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { material: { select: { id: true, name: true, subject: true, publisher: true } } },
      },
    },
  });
  return NextResponse.json(routes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!name || !subject) {
    return NextResponse.json({ error: "ルート名と科目は必須です" }, { status: 400 });
  }

  const items = parseItems(body.items);

  const route = await prisma.materialRoute.create({
    data: {
      name,
      subject,
      targetLevel: typeof body.targetLevel === "string" ? body.targetLevel.trim() : "",
      description: typeof body.description === "string" ? body.description.trim() : "",
      items: {
        create: items.map((it, i) => ({
          materialId: it.materialId,
          sortOrder: i + 1,
          note: it.note ?? "",
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
  return NextResponse.json(route);
}
