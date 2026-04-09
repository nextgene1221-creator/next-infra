import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(task);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { studentId, teacherId, subject, title, description, dueDate, status, type, meetingDateTime } = body;

  // 面談日時が変わったらアラート再送可能にするためフラグリセット
  const existing = await prisma.task.findUnique({ where: { id } });
  const meetingChanged =
    existing &&
    meetingDateTime &&
    (!existing.meetingDateTime ||
      new Date(meetingDateTime).getTime() !== existing.meetingDateTime.getTime());

  const task = await prisma.task.update({
    where: { id },
    data: {
      studentId: studentId || null,
      ...(teacherId ? { teacherId } : {}),
      subject,
      title,
      description: description || "",
      dueDate: new Date(dueDate),
      status,
      type: type || "通常",
      meetingDateTime: meetingDateTime ? new Date(meetingDateTime) : null,
      ...(meetingChanged ? { meetingAlerted: false } : {}),
    },
  });

  return NextResponse.json(task);
}
