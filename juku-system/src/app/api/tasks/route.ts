import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  const teacherId = teacher?.id || (await prisma.teacher.findFirst())?.id;
  if (!teacherId) {
    return NextResponse.json({ error: "No teacher available" }, { status: 400 });
  }

  const body = await req.json();
  const { studentId, subject, title, description, dueDate, type, meetingDateTime } = body;

  const task = await prisma.task.create({
    data: {
      studentId: studentId || null,
      teacherId,
      subject,
      title,
      description: description || "",
      dueDate: new Date(dueDate),
      type: type || "通常",
      meetingDateTime: meetingDateTime ? new Date(meetingDateTime) : null,
      status: "pending",
    },
  });

  return NextResponse.json(task, { status: 201 });
}
