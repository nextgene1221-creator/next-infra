import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { campusByCode, getOrInitStudyRoomConfig } from "@/lib/studyRoom";
import { notFound } from "next/navigation";
import CheckInForm from "./CheckInForm";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const session = await requireAuth();
  const { campus } = await searchParams;
  if (!campus) notFound();

  const campusRec = await campusByCode(campus);
  if (!campusRec) notFound();

  const config = await getOrInitStudyRoomConfig(campus);
  const [boothUsed, tableUsed] = await Promise.all([
    prisma.studyRoomSession.count({ where: { campus, seatType: "booth", checkOutAt: null } }),
    prisma.studyRoomSession.count({ where: { campus, seatType: "table", checkOutAt: null } }),
  ]);

  let studentOpen: { campus: string; campusLabel: string } | null = null;
  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const open = await prisma.studyRoomSession.findFirst({
        where: { studentId: student.id, checkOutAt: null },
      });
      if (open) {
        const openCampus = await campusByCode(open.campus);
        studentOpen = { campus: open.campus, campusLabel: openCampus?.label || open.campus };
      }
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-xs text-dark/60">自習室 入室</p>
        <h1 className="text-2xl font-bold text-dark mt-1">{campusRec.label}</h1>
        <p className="text-xs text-dark/50 mt-1">自動退室 {campusRec.closeTime}</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-surface rounded p-3">
            <p className="text-xs text-dark/60">ブース席</p>
            <p className="text-lg font-bold text-primary">{boothUsed}/{config.boothCapacity}</p>
          </div>
          <div className="bg-surface rounded p-3">
            <p className="text-xs text-dark/60">テーブル席</p>
            <p className="text-lg font-bold text-primary">{tableUsed}/{config.tableCapacity}</p>
          </div>
        </div>

        {session.user.role === "student" ? (
          <div className="mt-6">
            {studentOpen ? (
              <p className="text-orange-600 text-sm">
                すでに {studentOpen.campusLabel} に入室中です。先に退室してください。
              </p>
            ) : (
              <CheckInForm
                campus={campus}
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
