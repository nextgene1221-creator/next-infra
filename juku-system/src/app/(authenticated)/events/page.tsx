import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import EventsManager from "./EventsManager";

export default async function EventsPage() {
  await requireAuth(["admin", "teacher"]);

  const [schools, events] = await Promise.all([
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.schoolEvent.findMany({
      include: { school: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">学校イベント管理</h1>
      <EventsManager
        initialSchools={schools}
        initialEvents={events.map((e) => ({
          id: e.id,
          schoolId: e.schoolId,
          schoolName: e.school.name,
          title: e.title,
          description: e.description,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate ? e.endDate.toISOString() : null,
          eventType: e.eventType,
        }))}
      />
    </div>
  );
}
