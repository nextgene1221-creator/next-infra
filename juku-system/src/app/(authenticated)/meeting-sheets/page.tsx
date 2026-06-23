import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getNextMeetingInfo, hasSubmittedSheetSinceLastMeeting } from "@/lib/nextMeeting";
import { REMIND_DAYS_BEFORE } from "@/lib/meetingSheet";
import MeetingSheetList, { type SheetListItem } from "@/components/MeetingSheetList";

export const dynamic = "force-dynamic";

export default async function MeetingSheetsPage() {
  const session = await requireAuth(["student"]);

  const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
  if (!student) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark mb-6">面談シート</h1>
        <p className="text-dark/60 text-sm">生徒情報が見つかりません。</p>
      </div>
    );
  }

  const [rawSheets, next, submitted] = await Promise.all([
    prisma.meetingSheet.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    }),
    getNextMeetingInfo(student.id),
    hasSubmittedSheetSinceLastMeeting(student.id),
  ]);

  const sheets: SheetListItem[] = rawSheets.map((s) => ({
    id: s.id,
    status: s.status,
    forMeetingDate: s.forMeetingDate?.toISOString() ?? null,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  // 面談予定日の3日前から、未提出なら注意表示
  let daysUntil: number | null = null;
  if (next) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(next.date);
    target.setHours(0, 0, 0, 0);
    daysUntil = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  }
  const meetingDateLabel = next
    ? new Date(next.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
    : "";
  const showReminder =
    !!next && !submitted && daysUntil !== null && daysUntil >= 0 && daysUntil <= REMIND_DAYS_BEFORE;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">面談シート</h1>
      <MeetingSheetList
        initialSheets={sheets}
        reminder={{ show: showReminder, daysUntil, meetingDateLabel }}
      />
    </div>
  );
}
