import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AlertList from "./AlertList";
import AdminAlertForm from "./AdminAlertForm";

export default async function AlertsPage() {
  const session = await requireAuth();

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">アラート一覧</h1>
        {session.user.role === "admin" && <AdminAlertForm />}
      </div>
      <AlertList initialAlerts={alerts} />
    </div>
  );
}
