import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { campusLabel, STUDY_ROOM_CAPACITY } from "@/lib/studyRoom";
import CheckInOutButton from "../CheckInOutButton";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const session = await requireAuth();
  const { campus } = await searchParams;
  const campusValue = campus || "shuri";

  // 生徒の現在状態
  let state: { inRoom: boolean; currentCampus?: string; studentId?: string } = { inRoom: false };
  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const open = await prisma.studyRoomSession.findFirst({
        where: { studentId: student.id, checkOutAt: null },
      });
      state = { inRoom: !!open, currentCampus: open?.campus, studentId: student.id };
    }
  }

  // 現在の在室人数
  const occupancy = await prisma.studyRoomSession.count({
    where: { campus: campusValue, checkOutAt: null },
  });

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-xs text-dark/60">自習室 入室</p>
        <h1 className="text-2xl font-bold text-dark mt-1">{campusLabel(campusValue)}</h1>
        <p className="text-sm text-dark/70 mt-2">
          現在 <span className="font-bold text-primary">{occupancy}</span> / {STUDY_ROOM_CAPACITY} 席
        </p>
        {session.user.role === "student" ? (
          <div className="mt-6">
            {state.inRoom ? (
              <p className="text-orange-600 text-sm">
                すでに {campusLabel(state.currentCampus!)} に入室中です。まず退室してください。
              </p>
            ) : (
              <CheckInOutButton action="check-in" campus={campusValue} label="入室する" />
            )}
          </div>
        ) : (
          <p className="text-sm text-dark/60 mt-6">このQRは生徒用です</p>
        )}
      </div>
    </div>
  );
}
