import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 対象シートへのアクセス可否（生徒は自分のぶんのみ）
async function loadAndAuthorize(
  sheetId: string,
  sessionUserId: string,
  role: string
): Promise<
  | { ok: true; studentId: string }
  | { ok: false; status: number; error: string }
> {
  const sheet = await prisma.meetingSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) return { ok: false, status: 404, error: "Not found" };
  if (role === "student") {
    const student = await prisma.student.findUnique({ where: { id: sheet.studentId } });
    if (!student || student.userId !== sessionUserId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }
  return { ok: true, studentId: sheet.studentId };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auth = await loadAndAuthorize(id, session.user.id, session.user.role);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sheet = await prisma.meetingSheet.findUnique({ where: { id } });
  return NextResponse.json(sheet);
}

// PUT /api/meeting-sheets/[id] -> 回答保存（下書き/提出）。提出後も修正可。
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auth = await loadAndAuthorize(id, session.user.id, session.user.role);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { answers, status } = body as { answers?: unknown; status?: string };

  const data: { answers?: string; status?: string; submittedAt?: Date } = {};
  if (answers !== undefined) {
    data.answers = typeof answers === "string" ? answers : JSON.stringify(answers);
  }
  if (status === "submitted" || status === "draft") {
    data.status = status;
    if (status === "submitted") data.submittedAt = new Date();
  }

  const updated = await prisma.meetingSheet.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auth = await loadAndAuthorize(id, session.user.id, session.user.role);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.meetingSheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
