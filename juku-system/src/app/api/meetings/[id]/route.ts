import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const { date, durationMinutes, type, content, nextMeetingDate, status } = body;

  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      date: new Date(date),
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      type: type || null,
      status: status === "rescheduled" ? "rescheduled" : "conducted",
      content,
      nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
    },
    include: { teacher: { include: { user: true } } },
  });

  return NextResponse.json(meeting);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.meeting.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
