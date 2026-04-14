import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CAMPUSES, campusLabel, getAllConfigs, seatLabel } from "@/lib/studyRoom";
import StudyRoomAdmin from "./StudyRoomAdmin";
import CapacityEditor from "./CapacityEditor";

export default async function StudyRoomPage() {
  await requireAuth(["admin", "teacher"]);

  const configs = await getAllConfigs();
  const [openSessions, recentHistory, students] = await Promise.all([
    prisma.studyRoomSession.findMany({
      where: { checkOutAt: null },
      include: { student: { include: { user: true } } },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.studyRoomSession.findMany({
      where: { checkOutAt: { not: null } },
      include: { student: { include: { user: true } } },
      orderBy: { checkInAt: "desc" },
      take: 50,
    }),
    prisma.student.findMany({
      where: { status: "active" },
      include: { user: true, pointTransactions: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const studentsWithPoints = students.map((s) => ({
    id: s.id,
    name: s.user.name,
    schoolName: s.schoolName,
    points: s.pointTransactions.reduce((sum, t) => sum + t.delta, 0),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">自習室管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {CAMPUSES.map((c) => {
          const cfg = configs.find((x) => x.campus === c.value)!;
          const boothUsed = openSessions.filter((s) => s.campus === c.value && s.seatType === "booth").length;
          const tableUsed = openSessions.filter((s) => s.campus === c.value && s.seatType === "table").length;
          return (
            <div key={c.value} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-baseline mb-3">
                <h2 className="text-lg font-semibold">{c.label}</h2>
              </div>

              <CapacityEditor
                campus={c.value}
                boothCapacity={cfg.boothCapacity}
                tableCapacity={cfg.tableCapacity}
              />

              <div className="grid grid-cols-2 gap-2 mt-4">
                <SeatBar label="ブース席" used={boothUsed} cap={cfg.boothCapacity} />
                <SeatBar label="テーブル席" used={tableUsed} cap={cfg.tableCapacity} />
              </div>

              <ul className="mt-3 divide-y divide-gray-100 text-sm">
                {openSessions.filter((s) => s.campus === c.value).map((s) => (
                  <li key={s.id} className="py-1 flex justify-between">
                    <span>
                      {s.student.user.name}
                      <span className="text-xs text-dark/50 ml-2">{seatLabel(s.seatType)}</span>
                    </span>
                    <span className="text-xs text-dark/60">
                      入室 {new Date(s.checkInAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
                {openSessions.filter((s) => s.campus === c.value).length === 0 && (
                  <li className="py-1 text-xs text-dark/50">入室者なし</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <StudyRoomAdmin
        studentsWithPoints={studentsWithPoints}
        history={recentHistory.map((s) => ({
          id: s.id,
          studentName: s.student.user.name,
          campus: s.campus,
          campusLabel: campusLabel(s.campus),
          seatType: s.seatType,
          seatLabel: seatLabel(s.seatType),
          checkInAt: s.checkInAt.toISOString(),
          checkOutAt: s.checkOutAt!.toISOString(),
          autoCheckedOut: s.autoCheckedOut,
          pointAwarded: s.pointAwarded,
        }))}
      />
    </div>
  );
}

function SeatBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-dark/70">{label}</span>
        <span className="text-dark/70"><span className="font-bold text-primary">{used}</span>/{cap}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-0.5">
        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
