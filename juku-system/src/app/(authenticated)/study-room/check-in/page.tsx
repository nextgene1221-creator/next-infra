import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { campusLabel, getOrInitConfig } from "@/lib/studyRoom";
import CheckInForm from "./CheckInForm";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const session = await requireAuth();
  const { campus } = await searchParams;
  const campusValue = campus || "shuri";

  const config = await getOrInitConfig(campusValue);
  const [boothUsed, tableUsed] = await Promise.all([
    prisma.studyRoomSession.count({ where: { campus: campusValue, seatType: "booth", checkOutAt: null } }),
    prisma.studyRoomSession.count({ where: { campus: campusValue, seatType: "table", checkOutAt: null } }),
  ]);

  let studentOpen: { campus: string } | null = null;
  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const open = await prisma.studyRoomSession.findFirst({
        where: { studentId: student.id, checkOutAt: null },
      });
      if (open) studentOpen = { campus: open.campus };
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-xs text-dark/60">自習室 入室</p>
        <h1 className="text-2xl font-bold text-dark mt-1">{campusLabel(campusValue)}</h1>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-surface rounded p-3">
            <p className="text-xs text-dark/60">ブース席</p>
            <p className="text-lg font-bold text-primary">
              {boothUsed}/{config.boothCapacity}
            </p>
          </div>
          <div className="bg-surface rounded p-3">
            <p className="text-xs text-dark/60">テーブル席</p>
            <p className="text-lg font-bold text-primary">
              {tableUsed}/{config.tableCapacity}
            </p>
          </div>
        </div>

        {session.user.role === "student" ? (
          <div className="mt-6">
            {studentOpen ? (
              <p className="text-orange-600 text-sm">
                すでに {campusLabel(studentOpen.campus)} に入室中です。先に退室してください。
              </p>
            ) : (
              <CheckInForm
                campus={campusValue}
                boothAvailable={config.boothCapacity - boothUsed}
                tableAvailable={config.tableCapacity - tableUsed}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-dark/60 mt-6">このQRは生徒用です</p>
        )}
      </div>
    </div>
  );
}
