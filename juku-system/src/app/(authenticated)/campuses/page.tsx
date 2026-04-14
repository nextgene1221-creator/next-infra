import { requireAuth } from "@/lib/session";
import { getAllCampuses } from "@/lib/studyRoom";
import CampusesManager from "./CampusesManager";

export default async function CampusesPage() {
  const session = await requireAuth(["admin", "teacher"]);
  const campuses = await getAllCampuses();
  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">校舎管理</h1>
      <CampusesManager
        isAdmin={session.user.role === "admin"}
        initialCampuses={campuses.map((c) => ({
          id: c.id,
          code: c.code,
          label: c.label,
          closeTime: c.closeTime,
          sortOrder: c.sortOrder,
        }))}
      />
    </div>
  );
}
