import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { campusByCode } from "@/lib/studyRoom";
import { notFound } from "next/navigation";
import CheckInOutButton from "../CheckInOutButton";

export default async function CheckOutPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const session = await requireAuth();
  const { campus } = await searchParams;
  if (!campus) notFound();
  const campusRec = await campusByCode(campus);
  if (!campusRec) notFound();

  let state: { inRoom: boolean; currentCampusLabel?: string; currentCampus?: string; checkInAt?: Date } = { inRoom: false };
  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const open = await prisma.studyRoomSession.findFirst({
        where: { studentId: student.id, checkOutAt: null },
      });
      if (open) {
        const openCampus = await campusByCode(open.campus);
        state = {
          inRoom: true,
          currentCampus: open.campus,
          currentCampusLabel: openCampus?.label || open.campus,
          checkInAt: open.checkInAt,
        };
      }
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-xs text-dark/60">自習室 退室</p>
        <h1 className="text-2xl font-bold text-dark mt-1">{campusRec.label}</h1>
        {session.user.role === "student" ? (
          <div className="mt-6">
            {!state.inRoom ? (
              <p className="text-orange-600 text-sm">入室記録がありません</p>
            ) : state.currentCampus !== campus ? (
              <p className="text-orange-600 text-sm">
                入室した校舎と異なります（入室: {state.currentCampusLabel}）。<br />
                正しい校舎のQRを読み込んでください。
              </p>
            ) : (
              <>
                <p className="text-sm text-dark/70">
                  入室時刻: {state.checkInAt!.toLocaleString("ja-JP")}
                </p>
                <p className="text-xs text-dark/60 mt-1">退室すると 1P 獲得します</p>
                <div className="mt-4">
                  <CheckInOutButton action="check-out" campus={campus} label="退室する (+1P)" />
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-dark/60 mt-6">このQRは生徒用です</p>
        )}
      </div>
    </div>
  );
}
