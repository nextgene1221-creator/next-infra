import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { parseAnswers } from "@/lib/meetingSheet";
import MeetingSheetForm from "@/components/MeetingSheetForm";

export const dynamic = "force-dynamic";

export default async function MeetingSheetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth(["student"]);
  const { id } = await params;

  const student = await prisma.student.findFirst({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });
  if (!student) redirect("/dashboard");

  const sheet = await prisma.meetingSheet.findUnique({ where: { id } });
  if (!sheet || sheet.studentId !== student.id) notFound();

  const meetingDateLabel = sheet.forMeetingDate
    ? new Date(sheet.forMeetingDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
    : "";

  return (
    <div>
      <div className="mb-4">
        <Link href="/meeting-sheets" className="text-sm text-primary hover:underline">
          ← 面談シート一覧
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-dark mb-6">週次面談シート</h1>
      <MeetingSheetForm
        sheetId={sheet.id}
        studentName={student.user.name}
        meetingDateLabel={meetingDateLabel}
        initialStatus={sheet.status}
        initialAnswers={parseAnswers(sheet.answers)}
      />
    </div>
  );
}
