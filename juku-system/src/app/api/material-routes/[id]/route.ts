import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROUTE_INCLUDE = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { material: { select: { id: true, name: true, subject: true, publisher: true } } },
  },
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    name?: string;
    subject?: string;
    targetLevel?: string;
    description?: string;
    active?: boolean;
  } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "ルート名は必須です" }, { status: 400 });
    data.name = name;
  }
  if (typeof body.subject === "string" && body.subject.trim()) data.subject = body.subject.trim();
  if (typeof body.targetLevel === "string") data.targetLevel = body.targetLevel.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.active === "boolean") data.active = body.active;

  // items が来たときはステップを総入れ替えする。
  // 並び順は配列の順序をそのまま 1..n として振り直す（部分更新より単純で、順序ズレが起きない）。
  const hasItems = Array.isArray(body.items);
  const items = hasItems
    ? (body.items as unknown[])
        .filter((x): x is { materialId: string; note?: string } =>
          !!x && typeof x === "object" && typeof (x as { materialId?: unknown }).materialId === "string",
        )
        .map((x) => ({ materialId: x.materialId, note: typeof x.note === "string" ? x.note : "" }))
    : [];

  const route = await prisma.$transaction(async (tx) => {
    await tx.materialRoute.update({ where: { id }, data });
    if (hasItems) {
      await tx.materialRouteItem.deleteMany({ where: { routeId: id } });
      if (items.length > 0) {
        await tx.materialRouteItem.createMany({
          data: items.map((it, i) => ({
            routeId: id,
            materialId: it.materialId,
            sortOrder: i + 1,
            note: it.note,
          })),
        });
      }
    }
    return tx.materialRoute.findUnique({ where: { id }, include: ROUTE_INCLUDE });
  });

  return NextResponse.json(route);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  // items は onDelete: Cascade で一緒に消える。教材そのものには影響しない。
  await prisma.materialRoute.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
