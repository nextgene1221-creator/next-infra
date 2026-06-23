import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextMeetingInfo } from "@/lib/nextMeeting";

// ログイン中のセッションから対象 studentId を解決
async function resolveStudentId(
  sessionUserId: string,
  role: string,
  paramStudentId: string | null
): Promise<{ ok: true; studentId: string } | { ok: false; status: number; error: string }> {
  if (role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: sessionUserId } });
    if (!student) return { ok: false, status: 403, error: "Student record not found" };
    return { ok: true, studentId: student.id };
  }
  if (!paramStudentId) return { ok: false, status: 400, error: "studentId is required" };
  return { ok: true, studentId: paramStudentId };
}

// GET /api/meeting-sheets?studentId=xxx -> シート一覧
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveStudentId(
    session.user.id,
    session.user.role,
    req.nextUrl.searchParams.get("studentId")
  );
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

  const sheets = await prisma.meetingSheet.findMany({
    where: { studentId: resolved.studentId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sheets);
}

// POST /api/meeting-sheets -> 「今週分」を生成（draft）。
// 直近面談以降に未提出(draft)シートがあればそれを返す（重複生成しない）。
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const resolved = await resolveStudentId(session.user.id, session.user.role, body.studentId ?? null);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const studentId = resolved.studentId;

  // 直近面談以降の既存 draft を探す
  const lastMeeting = await prisma.meeting.findFirst({
    where: { studentId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const since = lastMeeting?.date ?? new Date(0);
  const existingDraft = await prisma.meetingSheet.findFirst({
    where: { studentId, status: "draft", createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
  });
  if (existingDraft) return NextResponse.json(existingDraft, { status: 200 });

  const next = await getNextMeetingInfo(studentId);
  const created = await prisma.meetingSheet.create({
    data: {
      studentId,
      status: "draft",
      forMeetingDate: next?.date ?? null,
      answers: "{}",
    },
  });
  return NextResponse.json(created, { status: 201 });
}
