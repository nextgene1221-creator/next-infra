import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { campusByCode, getOrInitStudyRoomConfig } from "@/lib/studyRoom";
import { notFound } from "next/navigation";
import CheckInForm from "./CheckInForm";
import InRoomActions from "./InRoomActions";

export const dynamic = "force-dynamic";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string }>;
}) {
  const { campus } = await searchParams;
  if (!campus) notFound();

  // QR リーダーの内蔵ブラウザではログインセッションが引き継がれないことがある（B-10）。
  // 未ログインならログイン後にこの URL へ戻す。
  const session = await getSession();
  if (!session) {
    const back = `/study-room/check-in?campus=${encodeURIComponent(campus)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  const campusRec = await campusByCode(campus);
  if (!campusRec) notFound();

  const config = await getOrInitStudyRoomConfig(campus);
  const [boothUsed, tableUsed] = await Promise.all([
    prisma.studyRoomSession.count({ where: { campus, seatType: "booth", checkOutAt: null } }),
    prisma.studyRoomSession.count({ where: { campus, seatType: "table", checkOutAt: null } }),
  ]);

  let studentOpen: { campus: string; campusLabel: string; seatType: "booth" | "table" } | null = null;
  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const open = await prisma.studyRoomSession.findFirst({
        where: { studentId: student.id, checkOutAt: null },
      });
      if (open) {
        const openCampus = await campusByCode(open.campus);
        studentOpen = {
          campus: open.campus,
          campusLabel: openCampus?.label || open.campus,
          seatType: (open.seatType === "table" ? "table" : "booth") as "booth" | "table",
        };
      }
    }
  }

  // 入室中の校舎が「今表示している校舎」と一致するか
  const inThisCampus = studentOpen && studentOpen.campus === campus;

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
          <div className="mt-6 text-left">
            {inThisCampus && studentOpen ? (
              <InRoomActions
                campus={campus}
                campusLabel={campusRec.label}
                currentSeatType={studentOpen.seatType}
                boothAvailable={config.boothCapacity - boothUsed}
                tableAvailable={config.tableCapacity - tableUsed}
              />
            ) : studentOpen ? (
              <p className="text-orange-600 text-sm text-center">
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
