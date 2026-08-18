import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { type MaterialView } from "./MaterialsManager";
import { type RouteView, type RouteMaterial } from "./MaterialRoutesManager";
import MaterialsTabs from "./MaterialsTabs";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const session = await requireAuth(["admin", "teacher"]);

  const [materials, routes] = await Promise.all([
    prisma.material.findMany({ orderBy: [{ subject: "asc" }, { name: "asc" }] }),
    prisma.materialRoute.findMany({
      orderBy: [{ subject: "asc" }, { name: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { material: { select: { id: true, name: true, subject: true, publisher: true } } },
        },
      },
    }),
  ]);

  const initial: MaterialView[] = materials.map((m) => ({
    id: m.id,
    subject: m.subject,
    name: m.name,
    publisher: m.publisher,
    totalPages: m.totalPages,
    level: m.level,
    active: m.active,
  }));

  // ルートのステップに選べるのは有効な教材のみ
  const routeMaterials: RouteMaterial[] = materials
    .filter((m) => m.active)
    .map((m) => ({ id: m.id, name: m.name, subject: m.subject, publisher: m.publisher }));

  const routeViews: RouteView[] = routes.map((r) => ({
    id: r.id,
    name: r.name,
    subject: r.subject,
    targetLevel: r.targetLevel,
    description: r.description,
    active: r.active,
    items: r.items.map((it) => ({
      id: it.id,
      materialId: it.materialId,
      note: it.note,
      material: it.material,
    })),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">教材マスタ</h1>
      <MaterialsTabs
        isAdmin={session.user.role === "admin"}
        materials={initial}
        routes={routeViews}
        routeMaterials={routeMaterials}
      />
    </div>
  );
}
