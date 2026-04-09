import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");

  const where: Record<string, unknown> = {};
  if (teacherId) where.teacherId = teacherId;

  const routines = await prisma.routineTask.findMany({
    where,
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(routines);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, studentId, subject, title, description, type } = body;

  const routine = await prisma.routineTask.create({
    data: {
      teacherId,
      studentId: studentId || null,
      subject,
      title,
      description: description || "",
      type: type || "通常",
    },
  });

  return NextResponse.json(routine, { status: 201 });
}
