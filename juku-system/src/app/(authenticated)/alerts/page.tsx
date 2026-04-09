import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AlertList from "./AlertList";

export default async function AlertsPage() {
  const session = await requireAuth();

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">アラート一覧</h1>
      <AlertList initialAlerts={alerts} />
    </div>
  );
}
