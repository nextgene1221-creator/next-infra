import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MaterialsManager, { type MaterialView } from "./MaterialsManager";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const session = await requireAuth(["admin", "teacher"]);
  const materials = await prisma.material.findMany({
    orderBy: [{ subject: "asc" }, { name: "asc" }],
  });

  const initial: MaterialView[] = materials.map((m) => ({
    id: m.id,
    subject: m.subject,
    name: m.name,
    publisher: m.publisher,
    totalPages: m.totalPages,
    level: m.level,
    active: m.active,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">教材マスタ</h1>
      <p className="text-sm text-dark/60 mb-4">
        進捗・学習目標・面談記録で選択する教材を登録します。無効化した教材は新規選択肢から除外されますが、既存の記録はそのまま残ります。
      </p>
      <MaterialsManager isAdmin={session.user.role === "admin"} initialMaterials={initial} />
    </div>
  );
}
